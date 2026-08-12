import React from 'react';
import { useConvexMutation, useConvexQuery } from '@/hooks/use-convex-query';
import { api } from '@/convex/_generated/api';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCategoryById, getCategoryIcon } from '@/lib/expense-categories';
import { Trash } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns'; // Added date-fns import

const Expenselist = ({
    expenses,
    showOtherPerson = true,
    isGroupExpense = false,
    otherpersonId = null,
    userLookupMap = {}, // Fixed typo (userLookUpmap -> userLookupMap)
}) => {
    const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);
    const deleteExpense = useConvexMutation(api.expenses.deleteExpenses);

    // ✅ FIXED: Only return early if expenses is empty or missing
    if (!expenses || expenses.length === 0) {
        return (
            <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                    No Expense Found
                </CardContent>
            </Card>
        );
    }
    
    const getUserDetails = (userId) => {
        return {
            name: userId === currentUser?._id
                ? "You"
                : userLookupMap[userId]?.name || "Other User",
            id: userId,
        };
    };

    const canDeleteExpense = (expense) => {
        if (!currentUser) return false;
        return (
            expense.createdBy === currentUser._id ||
            expense.paidByUserId === currentUser._id
        );
    };

    const handleDeleteExpense = async (expense) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this expense? This cannot be undone."
        );
        if (!confirmed) return;

        try {
            await deleteExpense.mutate({ expenseId: expense._id });
            toast.success("Expense deleted successfully");
        } catch (error) {
            toast.error("Failed to delete expense: " + error.message);
        }
    };

    return (
        <div className='flex flex-col gap-4'>
            {expenses.map((expense) => {
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
                                                {/* Ensure date field exists (fall back to _creationTime if needed) */}
                                                {format(new Date(expense.date || expense._creationTime), "MMM d, yyyy")}
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
                                            className="h-8 w-8 rounded-full text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDeleteExpense(expense)}
                                        >
                                            <Trash className="h-4 w-4" />
                                            <span className="sr-only">Delete Expense</span>
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="mt-3 text-sm flex gap-2 flex-wrap">
                                {expense.splits?.map((split, idx) => {
                                    const splitUser = getUserDetails(split.userId);
                                    const isCurrentUser = split.userId === currentUser?._id;

                                    return (
                                        <Badge 
                                            key={idx}
                                            variant={split.paid ? "outline" : "secondary"}
                                            className='flex items-center gap-1'
                                        >
                                            <Avatar className="h-4 w-4">
                                                <AvatarImage />
                                                <AvatarFallback className="text-[10px]">
                                                    {splitUser.name?.charAt(0) || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span>
                                                {isCurrentUser ? "You" : splitUser.name} : ${split.amount.toFixed(2)}
                                            </span>
                                        </Badge>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
};

export default Expenselist;