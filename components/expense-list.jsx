import React from 'react'
import { useConvexMutation, useConvexQuery } from '@/hooks/use-convex-query';
import { api } from '@/convex/_generated/api';
import { CardContent } from './ui/card';
import { getCategoryById, getCategoryIcon } from '@/lib/expense-categories';
import { Badge, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { AvatarFallback, AvatarImage } from '@base-ui/react';

const Expenselist = ({
    expenses,
    showOtherPerson = true,
    isGroupExpense = false,
    otherpersonId = null,
    userLookUpmap = {},
}) => {
    const {data: currentUser} = useConvexQuery(api.users.getCurrentUser);
    const deleteExpense = useConvexMutation(api.expenses.deleteExpenses);

    if(!expenses || expenses.length){
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    No Expense Found
                </CardContent>
            </Card>
        )
    }
    
    const getUserDetails =(userId) =>{
        return {
            name:
             userId === currentUser?._id
             ? "You"
             : userLookUpmap[userId]?.name || "Other User",
            id: userId,
        }
    }

    const canDeleteExpense = (expense)=>{
        if(!currentUser) return false;
        return (
            expense.createdBy === currentUser._id ||
            expense.paidByUserId === currentUser._id
        )
    }

    const handleDeleteExpense = async(expense)=>{
        const confirmed = window.confirm(
        "Are you sure you want to delete this expense? This cannot be Undone"
        )
        if(!confirmed)return;

        try {
            await deleteExpense.mutate({expenseId:expense._id});
            toast.success("expense deleted Successfully")
        } catch (error) {
            toast.error("Failed to delete Expense",error.message);
        }
          
    }

    return <div className='flex flex-col gap-4'>
       {
        expenses.map((expense)=>{
            const payer = getUserDetails(expense.paidByUserId);
            const isCurrentUserPayer = expense.paidByUserId === currentUser?._id;
            const category = getCategoryById(expense.category);
            const CategoryIcon = getCategoryIcon(category.id);
            const showDeleteOption = canDeleteExpense(expense);
            
            return (
              <Card key={expense._id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <CategoryIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">{expense.description}</h3>

                        <div className="flex items-center text-sm text-muted-foreground gap-2">
                          <span>
                            {format(new Date(expense.data), "MMM d,yyyy")}
                          </span>
                          {showOtherPerson && (
                            <>
                              <span>•</span>
                              <span>
                                {isCurrentUserPayer ? "You" : payer.name} paid
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="font-medium">
                          ${expense.amount.toFixed(2)}
                        </div>
                        {isGroupExpense ? (
                          <Badge variant="outline" className="mt-1">
                            Group Expense
                          </Badge>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            {isCurrentUserPayer ? (
                              <span className="text-green-500">You paid</span>
                            ) : (
                              <span className="text-red-600">{payer.name}</span>
                            )}
                          </div>
                        )}
                      </div>
                      {showDeleteOption && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-1"
                          onClick={() => handleDeleteExpense()}
                        >
                          <Trash className="h-4 w-4" />
                          <span className="sr-only">Delete Expense</span>
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 text-sm flex gap-2 flex-wrap">
                    {expense.splits.map((split, idx) => {
                      const splitUser = getUserDetails(split.userId, expense);
                      const isCurrentUser = split.userId === currentUser?._id;

                      return (
                        <Badge 
                        key={idx}
                        variant={split.paid ? "outline" : "secondary"}
                        className='flex items-center'
                        >
                          <Avatar className="h-4 w-4">
                            <AvatarImage/>
                            <AvatarFallback>
                              {splitUser.name?.charAt(0) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <span>
                            {isCurrentUser ? "You" : splitUser.name} : $
                            {split.amount.toFixed(2)}
                          </span>
                        </Badge>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
        })
       }
    </div>
    
}

export default Expenselist