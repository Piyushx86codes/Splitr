import { v } from "convex/values";
import { action } from "./_generated/server";
import { Resend } from "resend";

export const sendEmail = action({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
    text: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is missing.");
    }

    const resend = new Resend(apiKey);

    try {
      const { data, error } = await resend.emails.send({
        from: process.env.EMAIL_FROM || "Splitr <onboarding@resend.dev>",
        to: args.to,
        subject: args.subject,
        html: args.html,
        text: args.text,
      });

      if (error) {
        console.error("Resend API Error:", error.message);
        return { success: false, error: error.message };
      }

      return { success: true, id: data?.id };
    } catch (err) {
      const message = err.message || "Unknown error";
      console.error("Failed to send email action:", message);
      return { success: false, error: message };
    }
  },
});