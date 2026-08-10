import { internal } from "./_generated/api";
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getGroupExpenses = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser);
    const group = await ctx.db.get(groupId);
    if (!group) throw new Error("group Not Found");
    if (!group.members.some((m) => m.userId === currentUser._id))
      throw new Error("You are not a member of this group ");

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    const settlements = await ctx.db
      .query("settlements")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    //building a memeber map//
    const memberDetails = await Primise.all(
      group.members.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return {
          id: u._id,
          name: u.name,
          imageUrl: u.imageUrl,
          role: m.role,
        };
      }),
    );

    const ids = memberDetails.map((m) =>m.id);
    //calculating balance//
    const totals = Object.fromEntries(ids.map((id)=>[id,0]));
    //creating a 2d-ledger to track who owes whom
    const ledger ={};
    ids.forEach(a=>{
        ledger[a] ={};
        ids.forEach(b=>{
            if(a != b) ledger[a][b] = 0;
        });
    });
    //applying expenses to balances//
    for(const exp of expenses){
       const payer = exp.paidByUserId;

       for(const split of exp.splits){
        if(split.userId === payer || split.paid) continue;
          const debtor= split.userId;
          const amt = split.amount;

          //update totals:increase payer's balance, decrease debtor's balance//
          totals[payer] += amt;
          totals[debtor] -= amt;
          ledger[debtor][payer] += amt;
       }
    }


    //applying settlements//
    for(const s of settlements){
        totals[s.paidByUserId] += s.amount;
        totals[s.receivedByUserId] -= s.amount;

        ledger[s.paidByUserId][s.receivedByUserId] -= s.amount;
    }

    //format response data and creating a comprehensive balance Object for Each Member//
    const balances = memberDetails.map((m) =>({
        ...m,
        totalBalance:totals[m.id],
        owes:Object.entries(ledger[m.id])
        .filter(([,v])=> v > 0)
        .map(([totals,amount])=>({to,amount})),
        ownedBy:ids
        .filter((other)=> ledger[other][m.id] > 0)
        .map((other)=>({from:other ,amount:ledger[other][m.id]})),
    }));

    const userLookUpMap = {};
    memberDetails.forEach((member)=>{
        userLookUpMap[member.id] = member;
    });

    return {
        //group info//
        group:{
            id:group._id,
            name:group.name,
            description:group.description,
        },
        memberDetails:memberDetails,
        expenses,
        settlements,
        balances,
        userLookUpMap,
    }


  },
});
