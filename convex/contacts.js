import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserHelper } from "./users";

export const getAllContacts = query({
  handler: async (ctx) => {
    // FIX 1: Replaced ctx.runQuery with direct JS helper
    const currentUser = await getUserHelper(ctx);
    if (!currentUser) return { users: [], groups: [] };

    // 1. Fetch expenses you paid directly
    const expensesYouPaid = await ctx.db
      .query("expenses")
      .withIndex("by_user_and_group", (q) =>
        q.eq("paidByUserId", currentUser._id).eq("groupId", undefined)
      )
      .collect();

    // 2. Fetch non-group expenses paid by others where you are in splits
    const expensesNotPaidByYou = (
      await ctx.db
        .query("expenses")
        .withIndex("by_group", (q) => q.eq("groupId", undefined))
        .collect()
    ).filter(
      (e) =>
        e.paidByUserId !== currentUser._id &&
        e.splits.some((s) => s.userId === currentUser._id)
    );

    const personalExpenses = [...expensesYouPaid, ...expensesNotPaidByYou];
    const contactIds = new Set();
    personalExpenses.forEach((exp) => {
      if (exp.paidByUserId !== currentUser._id) {
        contactIds.add(exp.paidByUserId);
      }

      exp.splits.forEach((s) => {
        if (s.userId !== currentUser._id) contactIds.add(s.userId);
      });
    });

    // 3. Resolve user details
    const contactUsers = await Promise.all(
      [...contactIds].map(async (id) => {
        const u = await ctx.db.get(id);

        return u
          ? {
              id: u._id,
              name: u.name,
              email: u.email,
              imageUrl: u.imageUrl,
              type: "user",
            }
          : null;
      })
    );

    const userGroups = (await ctx.db.query("groups").collect())
      .filter((g) => g.members.some((m) => m.userId === currentUser._id))
      .map((g) => ({
        id: g._id,
        name: g.name,
        description: g.description,
        memberCount: g.members.length,
        type: "group",
      }));

    const validUsers = contactUsers.filter(Boolean);

    // 4. Safe sorting
    validUsers.sort((a, b) =>
      (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? "")
    );
    userGroups.sort((a, b) => a.name.localeCompare(b.name));

    return {
      users: validUsers,
      groups: userGroups,
    };
  },
});

export const createGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    members: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    // FIX 2: Replaced ctx.runQuery with direct JS helper
    const currentUser = await getUserHelper(ctx);
    if (!currentUser) throw new Error("Unauthenticated");

    if (!args.name.trim()) throw new Error("Group name cannot be empty");

    const uniqueMembers = new Set(args.members);
    uniqueMembers.add(currentUser._id);

    for (const id of uniqueMembers) {
      if (!(await ctx.db.get(id))) {
        throw new Error(`User with Id ${id} not found`);
      }
    }

    return await ctx.db.insert("groups", {
      name: args.name.trim(),
      description: args.description?.trim() ?? "",
      createdBy: currentUser._id,
      members: [...uniqueMembers].map((id) => ({
        userId: id,
        role: id === currentUser._id ? "admin" : "member",
        joinedAt: Date.now(),
      })),
    });
  },
});