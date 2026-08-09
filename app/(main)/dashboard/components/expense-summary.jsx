import React from 'react';
import {BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,} from 'recharts';
import {Card,CardContent,CardDescription,CardHeader,CardTitle,} from '@/components/ui/card';


const ExpenseSummary = ({ monthlySpending = [], totalSpent = 0 }) => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const currentYear = new Date().getFullYear();
  const currentMonthIndex = new Date().getMonth();

  // Map backend monthly spending into Recharts format
  const chartData =
    monthlySpending?.map((item) => {
      const date = new Date(item.month);
      const monthIndex = isNaN(date.getMonth()) ? 0 : date.getMonth();
      return {
        name: months[monthIndex],
        amount: item.total || 0,
      };
    }) || [];

  // Find spending matching the current month & year
  const currentMonthData = monthlySpending?.find((item) => {
    const date = new Date(item.month);
    return date.getMonth() === currentMonthIndex && date.getFullYear() === currentYear;
  });

  const currentMonthTotal = currentMonthData?.total ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Summary</CardTitle>
        <CardDescription>Monthly spending overview for {currentYear}</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Stat Cards Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 border rounded-lg p-4">
            <p className="text-sm font-medium text-muted-foreground">Total This Month</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">
              ${Number(currentMonthTotal).toFixed(2)}
            </h3>
          </div>

          <div className="bg-muted/50 border rounded-lg p-4">
            <p className="text-sm font-medium text-muted-foreground">Total This Year</p>
            <h3 className="text-2xl font-bold mt-1 text-foreground">
              ${Number(totalSpent || 0).toFixed(2)}
            </h3>
          </div>
        </div>

        {/* Responsive Recharts Container */}
        <div className="h-64 w-full mt-6">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
              <Tooltip
                formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Spent']}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Bar
                dataKey="amount"
                fill="#36d7b7"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <p className='text-xs text-muted-foreground text-center mt-2'>
          Monthly Spending for {currentYear}
        </p>
      </CardContent>
    </Card>
  );
};

export default ExpenseSummary;