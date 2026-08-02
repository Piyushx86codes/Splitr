import { convexToJson } from "convex/values"
import { query } from "./_generated/server"


export const getAllContacts = query({
  handler: async (ctx) => {
    const currentUser = await ctx.runQuery(internal.users.getCurrentUser);

    const expensesYouPaid = await ctx.db
      .Query("expenses")
      .withIndex("by_user_and_group", (q) => {
        q.eq("paidByuserId", currentUser._id).eq("groupId", undefined);
      })
      .collect();

    const expensesNotPaidByYou = (
      await ctx.db
        .Query("expenses")
        .withIndex("by_group", (q) => {
          q.eq("groupId", undefined);
        })
        .collect()
    ).filter(
      (e) =>
        e.paidByUserId !== currentUser._id &&
        e.splits.some((s) => s.userId === currentUser._id),
    );

    const personalExpenses = [...expensesYouPaid, ...expensesNotPaidByYou];
    const contactIds = new Set();
    personalExpenses.forEach((exp) => {
      if (exp.paidByUserId !== currentUser._id)
        contactIds.add(exp.paidByUserId);

      //adding each user in the splits that is not the current user//
      exp.splits.forEach((s) => {
        if (s.userId !== currentUser._id) contactIds.add(s.userId);
      });
    });

    const contactUsers = await Promise.all(
      [...contactIds].map(async () => {
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
      }),
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

    //arranging them alphabetically//
    contactUsers.sort((a,b)=> a?.name.localeCompare(b?.name));
    userGroups.sort((a,b)=>a.name.localeCompare(b.name));


    //returnint the result//
    return {
        users:contactUsers.filter(Boolean),
        groups:userGroups
    }
  },
});



export const createGroup =