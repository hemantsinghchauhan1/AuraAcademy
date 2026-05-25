import * as pdfImport from "pdf-parse";
import mammoth from "mammoth";

const pdf = ((pdfImport as any).default || pdfImport) as any;

export interface ParserResult {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount?: number;
    charCount: number;
    isOcrSimulated?: boolean;
  };
}

/**
 * Extracts raw text from document buffer based on MIME type.
 * Supports PDF, DOCX, and TXT.
 * Prepares extensible stubs for OCR and handwritten processing.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<ParserResult> {
  const normalizedMime = mimeType.toLowerCase();

  if (normalizedMime === "application/pdf") {
    return await parsePdf(buffer);
  } else if (
    normalizedMime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    normalizedMime === "application/msword"
  ) {
    return await parseDocx(buffer);
  } else if (
    normalizedMime === "text/plain" ||
    normalizedMime.startsWith("text/")
  ) {
    return parseTxt(buffer);
  } else {
    throw new Error(`Unsupported document MIME type: ${mimeType}`);
  }
}

/**
 * Parses PDF documents using pdf-parse.
 * Includes fallback logic to simulate OCR for scanned PDFs if no text is found.
 */
async function parsePdf(buffer: Buffer): Promise<ParserResult> {
  try {
    const data = await pdf(buffer);
    let text = data.text ? data.text.trim() : "";

    let isOcrSimulated = false;
    // If the PDF contains very little or no readable text, simulate OCR pipeline
    if (text.length < 50) {
      text = await performOcrIfScanned(buffer);
      isOcrSimulated = true;
    }

    return {
      text,
      metadata: {
        pageCount: data.numpages || 1,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        charCount: text.length,
        isOcrSimulated,
      },
    };
  } catch (error: any) {
    console.error("PDF parsing failed, attempting OCR fallback:", error);
    const text = await performOcrIfScanned(buffer);
    return {
      text,
      metadata: {
        pageCount: 1,
        wordCount: text.split(/\s+/).filter(Boolean).length,
        charCount: text.length,
        isOcrSimulated: true,
      },
    };
  }
}

/**
 * Parses Microsoft Word DOCX documents using mammoth.
 */
async function parseDocx(buffer: Buffer): Promise<ParserResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value ? result.value.trim() : "";
    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).filter(Boolean).length,
        charCount: text.length,
      },
    };
  } catch (error: any) {
    throw new Error(`DOCX parsing failed: ${error.message}`);
  }
}

/**
 * Parses plain text files.
 */
function parseTxt(buffer: Buffer): Promise<ParserResult> {
  const text = buffer.toString("utf-8").trim();
  return Promise.resolve({
    text,
    metadata: {
      wordCount: text.split(/\s+/).filter(Boolean).length,
      charCount: text.length,
    },
  });
}

/**
 * Extensible modular stub for OCR scanned paper and image text extraction.
 * In a future step, this will interface with Tesseract OCR or Vision API.
 */
export async function performOcrIfScanned(buffer: Buffer): Promise<string> {
  console.log("[OCR PIPELINE] Scanned or low-text PDF detected. Simulating OCR extraction...");
  // Simulate OCR text extraction
  return `
[OCR SIMULATOR - EXTRACTED TEXT FROM SCANNED DOCUMENT]
Subject: DBMS (Database Management Systems)
Course Level: DIPLOMA
Topic: Normalization & Indexing
Questions:

1. MCQ: Which of the following normal forms deals with multi-valued dependency?
Options:
A. 2NF
B. 3NF
C. BCNF
D. 4NF
Correct Answer: D
Explanation: Fourth Normal Form (4NF) requires that a relation is in BCNF and has no non-trivial multi-valued dependencies.

2. MCQ: What is the primary purpose of a B+ Tree in database index structures?
Options:
A. To guarantee O(1) random key retrieval times
B. To support high-performance sequential scanning and range queries
C. To reduce total disk space usage by 50%
D. To eliminate need for transaction locking logs
Correct Answer: B
Explanation: B+ Trees keep keys in sorted order, with all data pointers stored in leaf nodes linked sequentially, which makes range queries and traversal extremely efficient.

3. MCQ: If database transaction T1 holds an exclusive lock on resource R, can T2 get a shared lock?
Options:
A. Yes, shared lock is compatible with exclusive lock
B. No, exclusive lock prevents other transactions from acquiring any locks
C. Only if transaction T2 has higher priority
D. Yes, if R is in BCNF normal form
Correct Answer: B
Explanation: An exclusive lock (X) is incompatible with any other locks (shared or exclusive).
`;
}
