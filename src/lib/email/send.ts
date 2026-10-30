import "server-only";
import { Resend } from "resend";

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  attachments?: { filename: string; content: string; contentType?: string }[];
};

let client: Resend | null = null;

/**
 * Sends through Resend when RESEND_API_KEY is set; otherwise prints the email
 * to the console so the whole flow can be tried locally.
 * Never throws: a failed email must not undo a booking. Returns whether it went out.
 */
export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `\n──── email (not sent: RESEND_API_KEY unset) ────\nTo: ${msg.to}\nSubject: ${msg.subject}\n\n${msg.text}\n` +
        (msg.attachments?.length
          ? `Attachments: ${msg.attachments.map((a) => a.filename).join(", ")}\n`
          : "") +
        "────────────────────────────────────────────────\n",
    );
    return true;
  }

  client ??= new Resend(apiKey);
  try {
    const { error } = await client.emails.send({
      from: process.env.EMAIL_FROM || "Bookings <onboarding@resend.dev>",
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      attachments: msg.attachments?.map((a) => ({
        filename: a.filename,
        content: Buffer.from(a.content).toString("base64"),
        contentType: a.contentType,
      })),
    });
    if (error) {
      console.error("Email failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Email failed:", err);
    return false;
  }
}
