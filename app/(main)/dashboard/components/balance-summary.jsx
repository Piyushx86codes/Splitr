import React from 'react';
import Link from 'next/link';
import { ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const BalanceSummary = ({ balances }) => {
  // Debug log - check your browser console (F12) to see exact object keys
  console.log("BalanceSummary balances prop:", balances);

  if (!balances) {
    return (
      <div className="text-center py-4 text-xs text-muted-foreground">
        Loading balances...
      </div>
    );
  }

  const oweDetails = balances?.oweDetails || balances || {};

  // Flexibly check all possible property naming variations
  const youAreOwedList = 
    oweDetails?.youAreOwed || 
    oweDetails?.youareOwed || 
    oweDetails?.youareOwedBy || 
    oweDetails?.youAreOwedBy || 
    [];

  const youOweList = 
    oweDetails?.youOwe || 
    oweDetails?.youowe || 
    oweDetails?.youOweTo || 
    [];

  const hasOwed = youAreOwedList.length > 0;
  const hasOwing = youOweList.length > 0;

  return (
    <div className="space-y-4">
      {/* Settled Up State */}
      {!hasOwed && !hasOwing && (
        <div className="text-center py-6">
          <p className="text-sm text-muted-foreground">You are all settled up!</p>
        </div>
      )}

      {/* Owed To You Section */}
      {hasOwed && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center mb-2 text-emerald-600">
            <ArrowUpCircle className="h-4 w-4 text-emerald-500 mr-2 shrink-0" />
            Owed To You
          </h3>
          <div className="space-y-2">
            {youAreOwedList.map((item, index) => {
              // Extract name, image, and amount across different backend formats
              const name = item?.name || item?.user?.name || item?.userName || "Member";
              const imageUrl = item?.imageUrl || item?.user?.imageUrl || item?.avatar;
              const userId = item?.userId || item?.user?._id || item?._id || item?.id || index;
              const amount = item?.amount ?? item?.balance ?? 0;

              return (
                <Link
                  key={userId}
                  href={`/person/${userId}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={imageUrl} alt={name} />
                      <AvatarFallback>
                        {name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">
                      {name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">
                    +${Number(amount).toFixed(2)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* You Owe Section */}
      {hasOwing && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium flex items-center mb-2 text-rose-600">
            <ArrowDownCircle className="h-4 w-4 text-rose-500 mr-2 shrink-0" />
            You Owe
          </h3>
          <div className="space-y-2">
            {youOweList.map((item, index) => {
              const name = item?.name || item?.user?.name || item?.userName || "Member";
              const imageUrl = item?.imageUrl || item?.user?.imageUrl || item?.avatar;
              const userId = item?.userId || item?.user?._id || item?._id || item?.id || index;
              const amount = item?.amount ?? item?.balance ?? 0;

              return (
                <Link
                  key={userId}
                  href={`/person/${userId}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={imageUrl} alt={name} />
                      <AvatarFallback>
                        {name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium text-foreground">
                      {name}
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-rose-600">
                    -${Math.abs(Number(amount)).toFixed(2)}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default BalanceSummary;