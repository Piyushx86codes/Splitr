import { ConvexHttpClient } from "convex/browser";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { inngest } from "./client";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Initialize Gemini with gemini-3.6-flash
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

export const spendingInsights = inngest.createFunction(
  { 
    id: "generate-spending-insights", 
    name: "Generate Spending Insights",
    cron: "0 8 1 * *" 
  },
  async ({ step }) => {
    // 1. Fetch users with expenses
    const users = await step.run("Fetch users with expenses", async () => {
      return await convex.query(api.inngest.getUsersWithExpenses);
    });

    const results = [];

    // 2. Process each user
    for (const user of users) {
      const expenses = await step.run(`Expenses ${user._id}`, () =>
        convex.query(api.inngest.getUsersMonthlyExpenses, { userId: user._id })
      );

      if (!expenses?.length) continue;

      const expenseData = JSON.stringify({
        expenses,
        totalSpent: expenses.reduce((sum, e) => sum + e.amount, 0),
        categories: expenses.reduce((cats, e) => {
          const cat = e.category ?? "uncategorised";
          cats[cat] = (cats[cat] ?? 0) + e.amount;
          return cats;
        }, {}),
      });

      const prompt = `
        As a financial analyst, review this user's spending data for the past month and provide insightful observations and suggestions.
        Focus on spending patterns, category breakdowns, and actionable advice for better financial management.
        Use a friendly, encouraging tone. Format your response in HTML for an email.

        User spending data:
        ${expenseData}

        Provide your analysis in these sections:
        1. Monthly Overview
        2. Top Spending Categories
        3. Unusual Spending Patterns (if any)
        4. Saving Opportunities
        5. Recommendations for Next Month
      `.trim();

      try {
        // AI execution wrapped in Inngest step
        const aiResponse = await step.ai.wrap(
          "gemini-generate-content",
          async (p) => model.generateContent(p),
          prompt
        );

        const htmlBody = aiResponse.response.text() ?? "";

        // Send email step
        await step.run(`Email ${user._id}`, async () => {
          return await convex.action(api.email.sendEmail, {
            to: user.email,
            subject: "Your Monthly Spending Insights",
            html: `
              <h1>Your Monthly Financial Insights</h1>
              <p>Hi ${user.name || "there"},</p>
              <p>Here's your personalised spending analysis for the past Month:</p>
              ${htmlBody}
            `,
            apiKey: process.env.RESEND_API_KEY,
          });
        });

        results.push({ userId: user._id, success: true });
      } catch (error) {
        results.push({
          userId: user._id,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      processed: results.length,
      success: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };
  }
);