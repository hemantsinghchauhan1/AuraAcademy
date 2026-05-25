"use server";

// Centralized Resend Email Service
// Mapped safely to fallback mock states to run cleanly in both local test boxes and production pipelines
export async function sendWelcomeEmail(studentEmail: string, studentName: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`
      ┌─────────────────────────────────────────────────────────┐
      │ 📧 [RESEND EMAIL MOCK SIMULATION] WELCOME MESSAGE      │
      ├─────────────────────────────────────────────────────────┤
      │ Recipient: ${studentEmail} (${studentName})
      │ Subject: Welcome to AuraAcademy! 🚀
      │ Content: Dynamic student workspace activated successfully.
      └─────────────────────────────────────────────────────────┘
    `);
    return { success: true, simulated: true };
  }

  try {
    // Dynamically post to Resend SMTP endpoint safely without hard requirements on dependencies
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "AuraAcademy <onboarding@resend.dev>",
        to: studentEmail,
        subject: "Welcome to AuraAcademy! 🚀",
        html: `
          <div style="font-family: sans-serif; background-color: #0b0a14; color: #ffffff; padding: 40px; border-radius: 16px; max-width: 600px; margin: auto; border: 1px solid rgba(255,255,255,0.05);">
            <h2 style="color: #a855f7; font-weight: 800; font-size: 24px; margin-bottom: 20px;">Welcome to AuraAcademy, ${studentName}!</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">
              Your high-fidelity student workspace is active! Solve timed quizzes, track microscopical weaknesses, and earn dynamic trophy accomplishments.
            </p>
            <div style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
              <a href="https://auraacademy.vercel.app/dashboard" style="background-color: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">Enter Student Workspace</a>
            </div>
          </div>
        `,
      }),
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (error: any) {
    console.error("Resend sendWelcomeEmail error:", error);
    return { success: false, error: error.message };
  }
}

export async function sendCertificateEmail(studentEmail: string, studentName: string, courseTitle: string, certificateCode: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log(`
      ┌─────────────────────────────────────────────────────────┐
      │ 📧 [RESEND EMAIL MOCK SIMULATION] CERTIFICATE ISSUANCE  │
      ├─────────────────────────────────────────────────────────┤
      │ Recipient: ${studentEmail} (${studentName})
      │ Subject: Dynamic Certificate Issued: ${courseTitle} 🎓
      │ Code: ${certificateCode}
      └─────────────────────────────────────────────────────────┘
    `);
    return { success: true, simulated: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "AuraAcademy <academic@resend.dev>",
        to: studentEmail,
        subject: `Verified Academic Certificate Issued! 🎓`,
        html: `
          <div style="font-family: sans-serif; background-color: #0b0a14; color: #ffffff; padding: 40px; border-radius: 16px; max-width: 600px; margin: auto; border: 1px solid rgba(255,255,255,0.05);">
            <h2 style="color: #d946ef; font-weight: 800; font-size: 24px; margin-bottom: 20px;">Congratulations, ${studentName}!</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #94a3b8;">
              You have successfully completed all lessons, assignments, and test assessments in <strong>${courseTitle}</strong>. 
            </p>
            <p style="font-size: 12px; color: #64748b; margin-top: 10px;">
              Your secure verification code is: <code style="color: #a855f7; font-weight: bold;">${certificateCode}</code>
            </p>
            <div style="margin-top: 30px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
              <a href="https://auraacademy.vercel.app/verify/${certificateCode}" style="background-color: #6366f1; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 13px; font-weight: bold; display: inline-block;">Verify & Showcase Certificate</a>
            </div>
          </div>
        `,
      }),
    });

    const data = await res.json();
    return { success: res.ok, data };
  } catch (error: any) {
    console.error("Resend sendCertificateEmail error:", error);
    return { success: false, error: error.message };
  }
}
