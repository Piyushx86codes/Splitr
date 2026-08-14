import { internal } from "./_generated/api";
import { query } from "./_generated/server";
import { v } from "convex/values";

export const getGroupExpenses = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser);
    if (!currentUser) throw new Error("Unauthenticated");

    const group = await ctx.db.get(groupId);
    if (!group) throw new Error("Group Not Found");

    if (!group.members.some((m) => m.userId === currentUser._id)) {
      throw new Error("You are not a member of this group");
    }

    const expenses = await ctx.db
      .query("expenses")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    const settlements = await ctx.db
      .query("settlements")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();

    // Fetch member details safely
    const memberDetailsRaw = await Promise.all(
      group.members.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        if (!u) return null;
        return {
          id: u._id,
          name: u.name || "Unknown User",
          imageUrl: u.imageUrl,
          role: m.role,
        };
      })
    );

    const memberDetails = memberDetailsRaw.filter(Boolean);
    const ids = memberDetails.map((m) => m.id);

    // Calculating balance totals
    const totals = Object.fromEntries(ids.map((id) => [id, 0]));

    // Creating a 2d-ledger to track who owes whom
    const ledger = {};
    ids.forEach((a) => {
      ledger[a] = {};
      ids.forEach((b) => {
        if (a !== b) ledger[a][b] = 0;
      });
    });

    // Applying expenses to balances
    for (const exp of expenses) {
      const payer = exp.paidByUserId;

      for (const split of exp.splits || []) {
        if (split.userId === payer || split.paid) continue;
        const debtor = split.userId;
        const amt = split.amount || 0;

        if (totals[payer] !== undefined) totals[payer] += amt;
        if (totals[debtor] !== undefined) totals[debtor] -= amt;

        if (ledger[debtor] && ledger[debtor][payer] !== undefined) {
          ledger[debtor][payer] += amt;
        }
      }
    }

    // Applying settlements safely
    for (const s of settlements) {
      const payer = s.paidByUserId;
      const receiver = s.receivedByUserId;
      const amt = s.amount || 0;

      if (totals[payer] !== undefined) totals[payer] += amt;
      if (totals[receiver] !== undefined) totals[receiver] -= amt;

      if (ledger[payer] && ledger[payer][receiver] !== undefined) {
        ledger[payer][receiver] -= amt;
      }
    }

    // Format response data
    const balances = memberDetails.map((m) => ({
      ...m,
      totalBalance: totals[m.id] || 0,
      owes: Object.entries(ledger[m.id] || {})
        .filter(([, v]) => v > 0)
        .map(([toUserId, amount]) => ({ to: toUserId, amount })),
      owedBy: ids
        .filter((other) => ledger[other] && ledger[other][m.id] > 0)
        .map((other) => ({ from: other, amount: ledger[other][m.id] })),
    }));

    // Create lookup map
    const userLookupMap = {};
    memberDetails.forEach((member) => {
      userLookupMap[member.id] = member;
    });

    return {
      group: {
        id: group._id,
        name: group.name,
        description: group.description,
      },
      members: memberDetails, 
      expenses,
      settlements,
      balances,
      userLookupMap,          
    };
  },
});

export const getGroupOrMembers = query({
   args:{
     groupId:v.optional(v.id("groups")),
   },
   handler:async(ctx)=>{
      const currentUser = await ctx.runQuery(internal.users.getCurrentUser);
      //fecthing all groups where userr is a member//
      const allGroups = await ctx.db.query("groups").collect();
      const userGroups = allGroups.filter((group)=>
        group.members.some((member)=>member.userId === currentUser._id)
      )
      
      if(args.groupId){
        const selectedGroup = userGroups.find(
          (group)=>group._id === args.groupId
        );
        if(!selectedGroup){
          throw new Error("Group not Found or Your are not a member")
        }
        const memberDetails = await Promise.all(
          selectedGroup.members.map(async(member)=>{
            const user = await ctx.db.get(member.userId);
            if(!user) return null;

            return {
              id:user._id,
              name:user.name,
              email:user.email,
              imageUrl:user.imageUrl,
              role: member.role,
            }
          })
        );
        const validmembers = memberDetails.filter((member)=>member !== null);
        return {
          selectedGroup:{
            id:selectedGroup._id,
            name:selectedGroup.name,
            description:selectedGroup.description,
            createdBy:selectedGroup.createdBy,
            members:validmembers,
          },
          groups:userGroups.map((group)=>({
            id:group._id,
            name:group.name,
            description:group.description,
            memberCount:group.members.length,
          }))
        }
      }else{
        return {
          selectedGroup:null,
          groups:userGroups.map((group)=>({
            id:group._id,
            name:group.name,
            description:group.description,
            memberCount:group.members.length,
          }))
        }
      }
   }
})