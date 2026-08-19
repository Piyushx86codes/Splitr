import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const getExpensesBetweenUsers = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const me = await ctx.runQuery(internal.users.getCurrentUser);
    if (me._id === userId) throw new Error("cannot query yourself");

    // 1-1 expenses where either payee is user //
    const myPaid = await ctx.db
      .query("expenses")
      .withIndex("by_user_and_group", (q) =>
        q.eq("paidByUserId", me._id).eq("groupId", undefined),
      )
      .collect();

    const theirPaid = await ctx.db
      .query("expenses")
      .withIndex("by_user_and_group", (q) =>
        q.eq("paidByUserId", userId).eq("groupId", undefined),
      )
      .collect();

    const candidateExpenses = [...myPaid, ...theirPaid];

    //rows where both users are involved//
    const expenses = candidateExpenses.filter((e) => {
      const meInSplits = e.splits.some((s) => s.userId === me._id);
      const themInSplits = e.splits.some((s) => s.userId === userId);

      const meInvolved = e.paidByUserId === me._id || meInSplits;
      const themInvolved = e.paidByUserId === userId || themInSplits;

      return meInvolved && themInvolved;
    });

    expenses.sort((a, b) => b.date - a.date);

    //settlement between two persons//
    const settlements = await ctx.db
      .query("settlements")
      .filter((q) =>
        q.or(
          q.and(
            q.eq(q.field("paidByUserId"), me._id),
            q.eq(q.field("receivedByUserId"), userId),
          ),
          q.and(
            q.eq(q.field("paidByUserId"), userId),
            q.eq(q.field("receivedByUserId"), me._id),
          ),
        ),
      )
      .collect();

    settlements.sort((a, b) => b.date - a.date);

    //computing balance//
    let balance = 0;
    for await (const e of expenses) {
      if (e.paidByUserId === me._id) {
        const split = e.splits.find((s) => s.userId === userId && !s.paid);
        if (split) balance += split.amount;
      } else {
        const split = e.splits.find((s) => s.userId === me._id && !s.paid);
        if (split) balance -= split.amount;
      }
    }

    for (const s of settlements) {
      if (s.paidByUserId === me._id) {
        balance += s.amount;
      } else balance -= s.amount;
    }

    //   Return Payload //
    const other = await ctx.db.get(userId);
    if (!other) throw new Error("User not Found");

    return {
      expenses,
      settlements,
      otherUser: {
        id: other._id,
        name: other.name,
        email: other.email,
        imageUrl: other.imageUrl,
      },
      balance,
    };
  },
});

export const deleteExpenses = mutation({
  args: {
    expenseId: v.id("expenses"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.users.getCurrentUser);
    const expense = await ctx.db.get(args.expenseId);
    if (!expense) {
      throw new Error("Expense  not Found");
    }
    if (expense.createdBy !== user._id && expense.paidByUserId !== user._id) {
      throw new Error("You domt have permission to delete this expense");
    }
    await ctx.db.delete(args.expenseId);

    return { success: true };
  },
});

export const createExpense = mutation({
  args: {
    description: v.string(),
    amount: v.number(),
    category: v.optional(v.string()),
    date: v.number(),
    paidByUserId: v.id("users"),
    splitType: v.string(),
    splits: v.array(
      v.object({
        userId: v.id("users"),
        amount: v.number(),
        paid: v.boolean(),
      }),
    ),
    groupId: v.optional(v.id("groups")),
  },

  handler:async(ctx,args)=>{
    //use centralized getCurrentuser function//
    const user = await ctx.runQuery(internal.users.getCurrentUser);
    if(args.groupId){
      const group = await ctx.db.get(args.groupId);
      if(!group){
          throw new Error("Group Not Found")
      }
      //checking if member is parrt of the group//
      const isMember = group.members.some(
        (member)=> member.userId === user._id
      );
      if(!isMember){
        throw new Error("You are not a member of this group");
      }
    }
     
    //verifying splits add upto the total amount//
    const totalSplitAmount = args.splits.reduce(
      (sum,split) => sum + split.amount,
      0
    );
    const tolerance = 0.01;
    if(Math.abs(totalSplitAmount - args.amount) > tolerance){
      throw new Error("Split amounts must add  up to the total expense amount");
    }
     
    const expenseId = await ctx.db.insert("expense",{
      description:args.description,
      amount:args.amount,
      category:args.category || "Other",
      date:args.date,
      paidByUserId:args.paidByUserId,
      splitType:args.splitType,
      splits:args.splitType,
      groupId:args.groupId,
      createdBy:user._id,
    });

    return expenseId;
  }
});