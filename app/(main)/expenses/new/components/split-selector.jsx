"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

export function SplitSelector({
  type = "equal",
  amount = 0,
  participants = [],
  paidByUserId,
  onSplitsChange,
}) {
  const { user } = useUser();
  const [splits, setSplits] = useState([]);
  const [totalPercentage, setTotalPercentage] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);

  // Initialize splits whenever type, total amount, or participants change
  useEffect(() => {
    const parsedAmount = Number(amount) || 0;
    if (parsedAmount <= 0 || !participants || participants.length === 0) {
      setSplits([]);
      setTotalAmount(0);
      setTotalPercentage(0);
      if (onSplitsChange) onSplitsChange([]);
      return;
    }

    let newSplits = [];
    const count = participants.length;

    if (type === "equal") {
      const shareAmount = Number((parsedAmount / count).toFixed(2));
      const totalAllocated = shareAmount * (count - 1);
      const remainder = Number((parsedAmount - totalAllocated).toFixed(2));

      newSplits = participants.map((participant, index) => ({
        userId: participant.id || participant._id,
        name: participant.name,
        email: participant.email,
        imageUrl: participant.imageUrl,
        amount: index === 0 ? remainder : shareAmount,
        percentage: Number((100 / count).toFixed(2)),
        paid: (participant.id || participant._id) === paidByUserId,
      }));
    } else if (type === "percentage") {
      const evenPercentage = Number((100 / count).toFixed(2));
      newSplits = participants.map((participant) => ({
        userId: participant.id || participant._id,
        name: participant.name,
        email: participant.email,
        imageUrl: participant.imageUrl,
        amount: Number(((parsedAmount * evenPercentage) / 100).toFixed(2)),
        percentage: evenPercentage,
        paid: (participant.id || participant._id) === paidByUserId,
      }));
    } else if (type === "exact") {
      const evenAmount = Number((parsedAmount / count).toFixed(2));
      newSplits = participants.map((participant) => ({
        userId: participant.id || participant._id,
        name: participant.name,
        email: participant.email,
        imageUrl: participant.imageUrl,
        amount: evenAmount,
        percentage:
          parsedAmount > 0
            ? Number(((evenAmount / parsedAmount) * 100).toFixed(2))
            : 0,
        paid: (participant.id || participant._id) === paidByUserId,
      }));
    }

    setSplits(newSplits);

    const calculatedTotalAmount = newSplits.reduce(
      (sum, s) => sum + (Number(s.amount) || 0),
      0
    );
    const calculatedTotalPercentage = newSplits.reduce(
      (sum, s) => sum + (Number(s.percentage) || 0),
      0
    );

    setTotalAmount(calculatedTotalAmount);
    setTotalPercentage(calculatedTotalPercentage);

    if (onSplitsChange) {
      onSplitsChange(newSplits);
    }
  }, [type, amount, participants, paidByUserId]);

  // Update percentage splits
  const updatePercentageSplit = (userId, newPercentage) => {
    const parsedPercent = parseFloat(newPercentage) || 0;
    const parsedAmount = Number(amount) || 0;

    const updatedSplits = splits.map((split) => {
      if (split.userId === userId) {
        return {
          ...split,
          percentage: parsedPercent,
          amount: Number(((parsedAmount * parsedPercent) / 100).toFixed(2)),
        };
      }
      return split;
    });

    setSplits(updatedSplits);

    const newTotalAmount = updatedSplits.reduce(
      (sum, s) => sum + (Number(s.amount) || 0),
      0
    );
    const newTotalPercentage = updatedSplits.reduce(
      (sum, s) => sum + (Number(s.percentage) || 0),
      0
    );

    setTotalAmount(newTotalAmount);
    setTotalPercentage(newTotalPercentage);

    if (onSplitsChange) {
      onSplitsChange(updatedSplits);
    }
  };

  // Update exact amount splits
  const updateExactSplit = (userId, newAmount) => {
    const parsedAmt = parseFloat(newAmount) || 0;
    const parsedTotalAmount = Number(amount) || 0;

    const updatedSplits = splits.map((split) => {
      if (split.userId === userId) {
        return {
          ...split,
          amount: parsedAmt,
          percentage:
            parsedTotalAmount > 0
              ? Number(((parsedAmt / parsedTotalAmount) * 100).toFixed(2))
              : 0,
        };
      }
      return split;
    });

    setSplits(updatedSplits);

    const newTotalAmount = updatedSplits.reduce(
      (sum, s) => sum + (Number(s.amount) || 0),
      0
    );
    const newTotalPercentage = updatedSplits.reduce(
      (sum, s) => sum + (Number(s.percentage) || 0),
      0
    );

    setTotalAmount(newTotalAmount);
    setTotalPercentage(newTotalPercentage);

    if (onSplitsChange) {
      onSplitsChange(updatedSplits);
    }
  };

  // Tolerant floating-point validation
  const parsedTotal = Number(amount) || 0;
  const isPercentageValid = Math.abs(totalPercentage - 100) < 0.05;
  const isAmountValid = Math.abs(totalAmount - parsedTotal) < 0.05;

  if (!participants || participants.length === 0) {
    return (
      <p className="text-sm text-muted-foreground mt-2">
        Add participants above to configure splits.
      </p>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {splits.map((split) => (
        <div
          key={split.userId}
          className="flex items-center justify-between gap-4 p-2 rounded-lg border bg-muted/20"
        >
          <div className="flex items-center gap-2 min-w-30">
            <Avatar className="h-7 w-7">
              <AvatarImage src={split.imageUrl} />
              <AvatarFallback>{split.name?.charAt(0) || "?"}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {split.userId === user?.id ? "You" : split.name || split.email}
            </span>
          </div>

          {type === "equal" && (
            <div className="text-right text-sm font-medium">
              ${split.amount?.toFixed(2)} ({split.percentage?.toFixed(1)}%)
            </div>
          )}

          {type === "percentage" && (
            <div className="flex items-center gap-4 flex-1">
              <Slider
                value={[split.percentage || 0]}
                min={0}
                max={100}
                step={1}
                onValueChange={(values) =>
                  updatePercentageSplit(split.userId, values[0])
                }
                className="flex-1"
              />
              <div className="flex gap-1 items-center min-w-30 justify-end">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={split.percentage ?? 0}
                  onChange={(e) =>
                    updatePercentageSplit(split.userId, e.target.value)
                  }
                  className="w-16 h-8 text-right"
                />
                <span className="text-xs text-muted-foreground">%</span>
                <span className="text-xs text-muted-foreground ml-1">
                  (${split.amount?.toFixed(2)})
                </span>
              </div>
            </div>
          )}

          {type === "exact" && (
            <div className="flex items-center gap-2 flex-1 justify-end">
              <div className="flex gap-1 items-center">
                <span className="text-sm text-muted-foreground">$</span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={split.amount ?? 0}
                  onChange={(e) =>
                    updateExactSplit(split.userId, e.target.value)
                  }
                  className="w-24 h-8 text-right"
                />
                <span className="text-xs text-muted-foreground ml-1">
                  ({split.percentage?.toFixed(1)}%)
                </span>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Total row */}
      <div className="flex justify-between border-t pt-3 mt-3">
        <span className="font-medium text-sm">Total</span>
        <div className="text-right">
          <span
            className={`font-semibold text-sm ${
              !isAmountValid ? "text-amber-600" : "text-foreground"
            }`}
          >
            ${totalAmount.toFixed(2)}
          </span>
          {type !== "equal" && (
            <span
              className={`text-xs ml-2 ${
                !isPercentageValid ? "text-amber-600" : "text-muted-foreground"
              }`}
            >
              ({totalPercentage.toFixed(1)}%)
            </span>
          )}
        </div>
      </div>

      {/* Validation warnings */}
      {type === "percentage" && !isPercentageValid && (
        <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900">
          Percentages must add up to 100% (currently {totalPercentage.toFixed(1)}%).
        </div>
      )}

      {type === "exact" && !isAmountValid && (
        <div className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-900">
          The sum of splits (${totalAmount.toFixed(2)}) must match the total expense (${parsedTotal.toFixed(2)}).
        </div>
      )}
    </div>
  );
}

export default SplitSelector;