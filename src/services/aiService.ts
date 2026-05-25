import { db } from "@/lib/db";
import crypto from "crypto";
import { getSystemInstructions, validateAndSanitizePrompt } from "./promptEngine";

export interface MessagePayload {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

/**
 * Helper to compute prompt hash for caching
 */
function getPromptHash(prompt: string, context = ""): string {
  return crypto.createHash("sha256").update(prompt + "|||" + context).digest("hex");
}

/**
 * Mock generator for development or fallback when no credentials exist
 */
function generateMockResponse(prompt: string): string {
  const query = prompt.toLowerCase();
  
  if (query.includes("normalization") || query.includes("dbms")) {
    return `### 📚 DBMS Normalization Explained Simply
Normalization is the process of organizing data in a database to reduce redundancy and improve data integrity.

*   **1NF (First Normal Form):** Ensure every cell contains atomic (single-valued) values, and there are no repeating groups.
*   **2NF (Second Normal Form):** Must be in 1NF, and all non-key attributes must be fully functionally dependent on the primary key (no partial dependency).
*   **3NF (Third Normal Form):** Must be in 2NF, and no non-key attribute transitively depends on the primary key (no transitive dependency).
*   **BCNF (Boyce-Codd Normal Form):** A stronger definition where for every dependency $X \\rightarrow Y$, $X$ must be a super key.

**Revision Tip:** Try practice questions in the **DBMS Study Hub** or attempt the upcoming *Normal Forms quiz*!`;
  }
  
  if (query.includes("study today") || query.includes("what should i study")) {
    return `### 📅 Recommended Study Routine for Today
Based on your current subjects and performance, here is your target schedule:

1.  **Revise weak chapters:** You have lower accuracy metrics in some subject components. Focus on revision sheets.
2.  **Attempt custom quizzes:** Solving a 10-question practice set will boost your streak score.
3.  **Check Room Announcements:** Jump to your **Study Rooms** to check pinned syllabus resources.

Stay consistent to protect your streak! 🚀`;
  }

  if (query.includes("python") || query.includes("code") || query.includes("practice")) {
    return `### 🐍 Python Programming Practice
Here is a fast practice question to test your knowledge:

\`\`\`python
# Question: Write a list comprehension that filters even numbers squared
numbers = [1, 2, 3, 4, 5, 6]
squared_evens = [x**2 for x in numbers if x % 2 == 0]
print(squared_evens) # Output: [4, 16, 36]
\`\`\`

**Try this:** Implement a function that checks if a string is a palindrome using slicing: \`s == s[::-1]\`. Let me know if you want me to explain it step-by-step!`;
  }

  return `### Hello! I am your AuraAcademy AI Academic Copilot.
I can help you review weak subjects, plan your exam preparations, explain complex engineering concepts, or summarize chat discussions.

Here are a few things you can ask me:
*   *"Explain DBMS normalization simply"*
*   *"What should I study today?"*
*   *"Generate Python practice questions"*

Let's crush your IITM academic goals today! 🎓`;
}

/**
 * Executes a call directly to Google Gemini API
 */
async function callGeminiApi(prompt: string, systemInstruction: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is not configured");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${systemInstruction}\n\nUser Query:\n${prompt}` }]
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error: Status ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Invalid structure returned from Gemini API");

  return text;
}

/**
 * Executes a call directly to OpenAI API
 */
async function callOpenAiApi(prompt: string, systemInstruction: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI API key is not configured");

  const url = "https://api.openai.com/v1/chat/completions";
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API error: Status ${response.status} - ${errorBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Invalid structure returned from OpenAI API");

  return text;
}

/**
 * Orchestrates AI response generation with provider fallback and caching.
 */
export async function generateAiResponse(
  userId: string,
  prompt: string,
  options: {
    systemContext?: string;
    bypassCache?: boolean;
  } = {}
): Promise<{ success: boolean; text: string; source: string }> {
  try {
    // 1. Sanitize & check prompt safety layer
    const validation = validateAndSanitizePrompt(prompt);
    if (!validation.isValid) {
      return { success: false, text: validation.reason || "Invalid input prompt.", source: "safety_layer" };
    }

    const sanitizedPrompt = validation.sanitizedPrompt;
    const systemInstruction = `${getSystemInstructions()}\n\n${options.systemContext || ""}`;
    const hash = getPromptHash(sanitizedPrompt, systemInstruction);

    // 2. Cache check
    if (!options.bypassCache) {
      const cached = await db.aiCache.findUnique({
        where: { promptHash: hash }
      });

      if (cached && cached.expiresAt > new Date()) {
        return { success: true, text: cached.response, source: "cache" };
      }
    }

    // 3. Provider Configuration
    const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
    const useOpenAI = provider === "openai";
    let textResult = "";
    let finalProvider = "mock";

    try {
      if (useOpenAI) {
        try {
          textResult = await callOpenAiApi(sanitizedPrompt, systemInstruction);
          finalProvider = "openai";
        } catch (e) {
          console.warn("OpenAI API call failed, trying fallback to Gemini...", e);
          textResult = await callGeminiApi(sanitizedPrompt, systemInstruction);
          finalProvider = "gemini";
        }
      } else {
        try {
          textResult = await callGeminiApi(sanitizedPrompt, systemInstruction);
          finalProvider = "gemini";
        } catch (e) {
          console.warn("Gemini API call failed, trying fallback to OpenAI...", e);
          textResult = await callOpenAiApi(sanitizedPrompt, systemInstruction);
          finalProvider = "openai";
        }
      }
    } catch (fallbackError) {
      console.warn("All configured AI providers failed or are unconfigured. Falling back to Mock generator.", fallbackError);
      textResult = generateMockResponse(sanitizedPrompt);
      finalProvider = "mock_fallback";
    }

    // 4. Save response to cache (1 hour expiration)
    if (finalProvider !== "mock" && finalProvider !== "mock_fallback") {
      await db.aiCache.upsert({
        where: { promptHash: hash },
        update: {
          response: textResult,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        },
        create: {
          promptHash: hash,
          response: textResult,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000)
        }
      });
    }

    return { success: true, text: textResult, source: finalProvider };
  } catch (error: any) {
    console.error("generateAiResponse error:", error);
    return { success: false, text: error.message || "Failed to generate response.", source: "error" };
  }
}

/**
 * Special ingestion service runner that bypasses standard chat validation length limits,
 * supports high token budgets, and formats structured outputs.
 */
export async function generateIngestionResponse(
  prompt: string,
  systemInstruction: string
): Promise<string> {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  const useOpenAI = provider === "openai";

  try {
    if (useOpenAI) {
      try {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("OpenAI key missing");
        
        const url = "https://api.openai.com/v1/chat/completions";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 4000
          })
        });

        if (!response.ok) throw new Error(`OpenAI Ingestion API error: status ${response.status}`);
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      } catch (e) {
        console.warn("OpenAI Ingestion failed, falling back to Gemini:", e);
        return await callGeminiApiForIngestion(prompt, systemInstruction);
      }
    } else {
      try {
        return await callGeminiApiForIngestion(prompt, systemInstruction);
      } catch (e) {
        console.warn("Gemini Ingestion failed, trying fallback to OpenAI:", e);
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error("OpenAI API key missing on fallback");
        
        const url = "https://api.openai.com/v1/chat/completions";
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 4000
          })
        });

        if (!response.ok) throw new Error(`OpenAI Ingestion fallback failed: status ${response.status}`);
        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
      }
    }
  } catch (error: any) {
    console.warn("All Ingestion APIs failed. Falling back to Mock Quiz Draft generator:", error);
    return generateMockIngestionDraft();
  }
}

async function callGeminiApiForIngestion(prompt: string, systemInstruction: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is not configured");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: `${systemInstruction}\n\nInput Document Text:\n${prompt}` }]
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4000
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API Ingestion error: Status ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Invalid structure returned from Gemini API");

  return text;
}

function generateMockIngestionDraft(): string {
  return JSON.stringify({
    title: "Database System Normalization & Indexing",
    description: "Extracted quiz to test your database structures, normal form rules, and index optimization theories.",
    detectedSubject: "Database Management Systems",
    detectedTrack: "BS_DATA_SCIENCE",
    detectedLevel: "DIPLOMA",
    questions: [
      {
        questionText: "Which of the following normal forms deals with multi-valued dependency?",
        type: "MCQ",
        options: [
          { label: "A", text: "2NF" },
          { label: "B", text: "3NF" },
          { label: "C", text: "BCNF" },
          { label: "D", text: "4NF" }
        ],
        correctAnswer: "D",
        explanation: "Fourth Normal Form (4NF) requires that a relation is in BCNF and has no non-trivial multi-valued dependencies.",
        difficulty: "MEDIUM",
        tags: ["dbms", "normalization", "dependencies"]
      },
      {
        questionText: "What is the primary purpose of a B+ Tree in database index structures?",
        type: "MCQ",
        options: [
          { label: "A", text: "To guarantee O(1) random key retrieval times" },
          { label: "B", text: "To support high-performance sequential scanning and range queries" },
          { label: "C", text: "To reduce total disk space usage by 50%" },
          { label: "D", text: "To eliminate need for transaction locking logs" }
        ],
        correctAnswer: "B",
        explanation: "B+ Trees keep keys in sorted order, with all data pointers stored in leaf nodes linked sequentially, which makes range queries and traversal extremely efficient.",
        difficulty: "MEDIUM",
        tags: ["dbms", "indexing", "b+ trees"]
      },
      {
        questionText: "If database transaction T1 holds an exclusive lock on resource R, can T2 get a shared lock?",
        type: "MCQ",
        options: [
          { label: "A", text: "Yes, shared lock is compatible with exclusive lock" },
          { label: "B", text: "No, exclusive lock prevents other transactions from acquiring any locks" },
          { label: "C", text: "Only if transaction T2 has higher priority" },
          { label: "D", text: "Yes, if R is in BCNF normal form" }
        ],
        correctAnswer: "B",
        explanation: "An exclusive lock (X) is incompatible with any other locks (shared or exclusive).",
        difficulty: "HARD",
        tags: ["dbms", "transactions", "locking"]
      }
    ]
  });
}


/**
 * Retrieves AI conversation history for a specific student.
 */
export async function getAiConversation(userId: string): Promise<MessagePayload[]> {
  try {
    const convo = await db.aiConversation.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" }
    });

    if (!convo) return [];
    return JSON.parse(convo.messages) as MessagePayload[];
  } catch (error) {
    console.error("getAiConversation error:", error);
    return [];
  }
}

/**
 * Saves a new message to the AI conversation history database.
 */
export async function saveAiMessage(
  userId: string,
  role: "user" | "assistant",
  content: string
) {
  try {
    let convo = await db.aiConversation.findFirst({
      where: { userId }
    });

    let currentMessages: MessagePayload[] = [];
    if (convo) {
      try {
        currentMessages = JSON.parse(convo.messages);
      } catch (e) {
        currentMessages = [];
      }
    }

    // Append new message
    currentMessages.push({
      role,
      content,
      createdAt: new Date().toISOString()
    });

    // Enforce token/history window budgeting (keep last 30 messages max)
    if (currentMessages.length > 30) {
      currentMessages = currentMessages.slice(currentMessages.length - 30);
    }

    if (convo) {
      await db.aiConversation.update({
        where: { id: convo.id },
        data: {
          messages: JSON.stringify(currentMessages),
          updatedAt: new Date()
        }
      });
    } else {
      await db.aiConversation.create({
        data: {
          userId,
          title: "Copilot Chat Session",
          messages: JSON.stringify(currentMessages)
        }
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error("saveAiMessage error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Resets AI conversation history for a specific student.
 */
export async function clearAiConversation(userId: string) {
  try {
    await db.aiConversation.deleteMany({
      where: { userId }
    });
    return { success: true };
  } catch (error: any) {
    console.error("clearAiConversation error:", error);
    return { success: false, error: error.message };
  }
}
