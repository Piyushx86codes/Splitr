"use client";

import React, { useState } from "react";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { BarLoader } from "react-spinners";
import { ArrowLeft, ArrowLeftRight, PlusCircle, Receipt, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AvatarFallback, AvatarImage, Avatar } from "@/components/ui/avatar";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const PersonPage = () => {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("expenses");

  // Guard: Extract id safely
  const userId = params?.id;

  // Query expenses and settlements between users
  const { data, isLoading } = useConvexQuery(
    api.expenses.getExpensesBetweenUsers,
    userId ? { userId } : "skip"
  );

  if (isLoading || !userId) {
    return (
      <div className="container mx-auto py-12">
        <BarLoader width={"100%"} color="#36d7b7" />
      </div>
    );
  }

  const otherUser = data?.otherUser;
  const expenses = data?.expenses || [];
  const settlements = data?.settlements || [];
  const balance = data?.balance || 0;

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          className="mb-4"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

       
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-xl bg-card">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border">
              <AvatarImage src={otherUser?.imageUrl} alt={otherUser?.name || "User"} />
              <AvatarFallback className="text-lg font-semibold">
                {otherUser?.name?.charAt(0).toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold gradient-title">
                {otherUser?.name || "User Details"}
              </h1>
              <p className="text-sm text-muted-foreground">{otherUser?.email}</p>

            
              <div className="mt-2">
                {balance === 0 ? (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Settled up
                  </Badge>
                ) : balance > 0 ? (
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20">
                    Owes you ${balance.toFixed(2)}
                  </Badge>
                ) : (
                  <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/20">
                    You owe ${Math.abs(balance).toFixed(2)}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href={`/settlements/user/${userId}`}>
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Settle Up
              </Link>
            </Button>

            <Button asChild>
              <Link href="/expenses/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Expense
              </Link>
            </Button>
          </div>
        </div>
      </div>

     
      <Tabs
        defaultValue="expenses"
        className="space-y-4"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Expenses ({expenses.length})
          </TabsTrigger>
          <TabsTrigger value="settlements" className="flex items-center gap-2">
            <HandCoins className="h-4 w-4" />
            Settlements ({settlements.length})
          </TabsTrigger>
        </TabsList>

       
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Shared Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No expenses found between you and {otherUser?.name || "this user"}.
                </p>
              ) : (
                <div className="divide-y rounded-md border">
                  {expenses.map((expense) => (
                    <div
                      key={expense._id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-base">
                          {expense.description || "Untitled Expense"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {expense._creationTime
                            ? new Date(expense._creationTime).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "Recent"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg">
                          ${typeof expense.amount === "number" ? expense.amount.toFixed(2) : "0.00"}
                        </p>
                        {expense.category && (
                          <span className="text-xs text-muted-foreground capitalize">
                            {expense.category}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

      
        <TabsContent value="settlements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Settlement History</CardTitle>
            </CardHeader>
            <CardContent>
              {settlements.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No settlements recorded yet.
                </p>
              ) : (
                <div className="divide-y rounded-md border">
                  {settlements.map((settlement) => (
                    <div
                      key={settlement._id}
                      className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-base flex items-center gap-2">
                          <HandCoins className="h-4 w-4 text-emerald-500" />
                          Payment Settlement
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {settlement._creationTime
                            ? new Date(settlement._creationTime).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "Recent"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-lg text-emerald-600">
                          ${typeof settlement.amount === "number" ? settlement.amount.toFixed(2) : "0.00"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PersonPage;