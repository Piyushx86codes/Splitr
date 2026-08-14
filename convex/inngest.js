import { query } from "./_generated/server";
import { v } from "convex/values";

export const getusersWithOutstandingDebts = query({
    handler:async()=>{
      const users = await ctx.db.query("users").collect();
      const result =[];

      //getting the 1-to-1 expense//
      const expenses = await ctx.db
           .query("expenses")
           .filter((q)=> q.eq(q.field("groupId"),undefined))
           .collect();
      
           
     //getting the 1-to-1 settlemets//
     const settlements = await ctx.db
          .query("settlemets")
          .filter((q)=> q.eq(q.field("groupId"),undefined))
          .collect();
     

        const userCache = new Map();
        const getUser = async(id)=>{
            if(!userCache.has(id))userCache.set(id,await ctx.db.get(id));
            return userCache.get(id);
        };

        for(const user of users){
          const ledger = new Map();
          for (const exp of expenses) {
            //when somebody else has paid and user still appears in splits//
            if (exp.paidByUserId !== user._id) {
              const split = exp.splits.find(
                (s) => s.userId === user._id && !s.paid,
              );
              if (!split) continue;
              const entry = ledger.get(exp.paidByUserId) ?? {
                amount: 0,
                since: exp.date,
              };
              entry.amount += split.amount;
              entry.slice = Math.min(entry.since, exp.date);
              ledger.set(exp.paidByUserId, entry);
            } else {
              //user has paid and others appear in split//
              for (const s of exp.splits) {
                if (s.userId === user._id || s.paid) continue;
                const entry = ledger.get(s.userId) ?? {
                  amount: 0,
                  since: exp.date,
                };
                entry.amount -= s.amount;
                ledger.set(s.userId, entry);
              }
            }
          }

          for (const st of settlements) {
            //if user ahd paid to someone then we reduce the owed amount to him//
            if (st.paidByUserId === user._id) {
              const entry = ledger.get(st.recievedByUserId);
              if (entry) {
                entry.amount -= st.amount;
                if (entry.amount === 0) ledger.delete(st.recievedByUserId);
                else ledger.set(st.recievedByUserId, entry);
              }
            } else if (st.recievedByUserId === user._id) {
              const entry = ledger.get(st.paidByUserId);
              if (entry) {
                entry.amount += st.amount;
                if (entry.amount === 0) ledger.delete(st.paidByUserId);
                else ledger.set(st.paidByUserId, entry);
              }
            }
          }

          const debts = [];
          for (const [counterId, { amount, since }] of ledger) {
            if (amount > 0) {
              const counter = await getUser(counterId);
              debts.push({
                userId: counterId,
                name: counter?.name ?? "unknown",
                amount,
                since,
              });
            }
          }

          if (debts.length) {
            result.push({
              _id: user._id,
              name: user.name,
              email: user.email,
              debts,
            });
          }
        }
      return result; 
    },
})


//get users with expenses for ai insights//
export const getUsersWithExpenses = query({
  handler:async(ctx)=>{
    const users = await ctx.db.query("users").collect();
    const result = [];
    
    //get current month start//
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    const monthStart = oneMonthAgo.getTime();

    for (const user of users) {
      const paidExpenses = await ctx.db
        .query("expenses")
        .withIndex("by_date", (q) => q.gte("date", monthStart))
        .filter((q) => q.eq(q.field("paidByUserId"), user._id))
        .collect();

        //checking alll expenses to find ones where user is in splits//
        const allRecentExpenses = await ctx.db
              .query("expenses")
              .withIndex("by_date",(q) => q.gte("date",monthStart))
              .collect();

        //gettting the split expenses//
        const splitExpenses = allRecentExpenses.filter((expense)=>
          expense.splits.some((split)=>split.userId === user._id)
        );

        const userExpenses = [...new Set([...paidExpenses,...allRecentExpenses])];

        if(userExpenses.length > 0){
          result.push({
            _id:user._id,
            name:user.name,
            email:user.email,
          })
        }
    }
    return result;
  },
})


//getting monthly expense of the User//
export const getUsersMonthlyExpenses = query({
  args:{userId:v.id("users")},
  handler:async(ctx,args)=>{
    //get current month//
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    const monthStart = oneMonthAgo.getTime();
    

    //getting the expenses involving the user from the past month//
    const allExpenses = await ctx.db
          .query("expenses")
          .withIndex("by_date",(q)=>q.gte("date", monthStart))
          .collect()
    

    //filtering expense where user is involved//
    const userExpenses = allExpenses.filter((expense)=>{
      const isInvolved = 
            expense.paidByUserId === args.userId || 
            expense.splits.some((split)=> split.userId === args.userId);
        return isInvolved;
    });

    //formatting users for AI analysis//
    return userExpenses.map((expense)=>{
      const userSplit = expense.splits.find(
       (split) => split.userId === args.userId
      );
      return {
        description:expense.description,
        category:expense.category,
        date:expense.date,
        amount:userSplit ? userSplit.amount : 0,
        isPayer:expense.paidByUserId === args.userId,
        isGroup :expense.groupId !== undefined,
      }

      
    })
  }
});