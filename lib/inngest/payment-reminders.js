import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { inngest } from "./client";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

export const paymentReminders = inngest.createFunction(
  { 
    id: "send-payment-reminders",
    cron: "0 10 * * *" // daily at 10 AM UTC
  }, 
  async ({ step }) => {
    /* 1. Fetch all users that still owe money */
    const users = await step.run("fetch-debts", async () => {
      return await convex.query(api.inngest.getUsersWithOutstandingDebts);
    });

    if (!users || users.length === 0) {
      return { processed: 0, successes: 0, failures: 0 };
    }

    /* 2. Process & send emails per user */
    const results = [];

    for (const u of users) {
      const rows = u.debts
        ?.map(
          (d) => `
            <tr>
              <td style="padding:4px 8px;">${d.name}</td>
              <td style="padding:4px 8px;">$${Number(d.amount).toFixed(2)}</td>
            </tr>
          `
        )
        .join("");

      if (!rows) {
        results.push({ userId: u._id, skipped: true });
        continue;
      }

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 16px;">
          <h2>Splitr – Payment Reminder</h2>
          <p>Hi ${u.name}, you have the following outstanding balances:</p>
          <table cellspacing="0" cellpadding="0" border="1" style="border-collapse:collapse; width: 100%; max-width: 400px;">
            <thead>
              <tr style="background-color: #f2f2f2;">
                <th style="padding: 6px; text-align: left;">To</th>
                <th style="padding: 6px; text-align: left;">Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin-top: 16px;">Please settle up soon. Thanks!</p>
        </div>
      `;

      const result = await step.run(`send-email-${u._id}`, async () => {
        try {
          const res = await convex.action(api.email.sendEmail, {
            to: u.email,
            subject: "You have pending payments on Splitr",
            html,
          });
          return { userId: u._id, ...res };
        } catch (err) {
          const message = err.message || "Unknown error";
          return { userId: u._id, success: false, error: message };
        }
      });

      results.push(result);
    }

    return {
      processed: results.length,
      successes: results.filter((r) => r.success).length,
      failures: results.filter((r) => r.success === false).length,
      skipped: results.filter((r) => r.skipped).length,
    };
  }
);