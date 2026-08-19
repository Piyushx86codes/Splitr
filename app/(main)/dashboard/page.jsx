"use client";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { api } from '@/convex/_generated/api';
import { useConvexQuery } from '@/hooks/use-convex-query';
import { ChevronRight, PlusCircle, Users } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { BarLoader } from 'react-spinners';
import ExpenseSummary from './components/expense-summary';
import BalanceSummary from './components/balance-summary';
import GroupList from './components/group-list';

const DashBoardPage = () => {
  const { data: balances, isLoading: balancesLoading } = useConvexQuery(api.dashbord.getUserbalances); 
  const { data: groups, isLoading: groupsLoading } = useConvexQuery(api.dashbord.getUsergroups);
  const { data: totalSpent, isLoading: totalSpentLoading } = useConvexQuery(api.dashbord.getTotalSpent);
  const { data: monthlySpending, isLoading: monthlySpendingLoading } = useConvexQuery(api.dashbord.getMonthlySpending);

  const isLoading = balancesLoading || groupsLoading || totalSpentLoading || monthlySpendingLoading;

  const totalBalance = balances?.totalbalance ?? 0;
  const youAreOwedAmount = balances?.youAreOwed ?? 0;
  const oweCount = balances?.oweDetails?.youAreOwed?.length ?? 0;

  return (
    <div className='container mx-auto py-6 space-y-6'>
      {isLoading ? (
        <div className="w-full py-12 flex justify-center">
          <BarLoader width={"100%"} color="#36d7b7" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-5xl gradient-title">DashBoard</h1>
            <Button asChild>
              <Link href="/expenses/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Expense
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Balance Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalBalance > 0 ? (
                    <span className="text-green-600">
                      +${totalBalance.toFixed(2)}
                    </span>
                  ) : totalBalance < 0 ? (
                    <span className="text-red-600">
                      -${Math.abs(totalBalance).toFixed(2)}
                    </span>
                  ) : (
                    <span>$0.00</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalBalance > 0
                    ? "You are owed Money"
                    : totalBalance < 0
                      ? "You owe Money"
                      : "All settled up!"}
                </p>
              </CardContent>
            </Card>

            {/* You Are Owed Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  You are Owed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${youAreOwedAmount.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  From {oweCount} {oweCount === 1 ? "person" : "people"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  You Owe
                </CardTitle>
              </CardHeader>
              <CardContent>
                {balances?.oweDetails?.youOwe.length > 0 ? (
                  <>
                    <div className="text-xs text-muted-foreground mt-1">
                      ${balances?.youOwe.toFixed(2)}
                    </div>
                    <p>To {balances?.oweDetails?.youOwe?.length || 0} people</p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">$0.00</div>
                    <p className="text-xs mt-1 text-muted-foreground">
                      You don't owe anyone
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Expense Summmary */}
              <ExpenseSummary
                monthlySpending={monthlySpending}
                totalSpent={totalSpent}
              />
            </div>

            {/* right column */}
            <div className="space-y-6">
              {/* Balance Details */}
              <Card>
                <CardHeader className="pb-3 flex justify-between items-center">
                  <CardTitle>Balance Details</CardTitle>
                  <Button variant="link" asChild className="p-0">
                    <Link href="/contacts">
                      View All
                      <ChevronRight className="m1-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <BalanceSummary balances={balances} />
                </CardContent>
              </Card>

              {/* group details */}
              <Card>
                <CardHeader className="pb-3 flex justify-between items-center">
                  <CardTitle>Your Groups</CardTitle>
                  <Button variant="link" asChild className="p-3">
                    <Link href="/contacts">
                      View All
                      <ChevronRight className="m1-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <GroupList groups={groups}/>
                </CardContent>
                <CardFooter>
                  <Button variant="link" asChild className="w-full">
                    <Link href="/contacts?createGroup=true">
                    <Users className="mr-2 h-4 w-4"/>
                       Create New Group
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashBoardPage;