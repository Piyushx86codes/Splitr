"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/convex/_generated/api";
import { useConvexMutation, useConvexQuery } from "@/hooks/use-convex-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

const settlementSchema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
  note: z.string().optional(),
  paymentType: z.enum(["youPaid", "theyPaid"]),
});

export default function SettlementForm({ entityType, entityData, onSuccess }) {
  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);
  const createSettlement = useConvexMutation(api.settlements.createSettlement);
  const [selectedGroupMemberId, setSelectedGroupMemberId] = useState(null);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      amount: "",
      note: "",
      paymentType: "youPaid",
    },
  });

  // 1. Guard against unready data
  if (!currentUser || !entityData) {
    return (
      <div className="p-4 text-center text-sm text-muted-foreground">
        Loading settlement details...
      </div>
    );
  }

  // Safely extract balances array with a default empty list
  const balances = Array.isArray(entityData?.balances) ? entityData.balances : [];

  const onSubmit = async (data) => {
    const amount = parseFloat(data.amount);

    try {
      if (entityType === "user") {
        const otherUserId = entityData?.counterpart?.userId;
        if (!otherUserId) {
          toast.error("Invalid counterpart data");
          return;
        }

        await createSettlement.mutate({
          amount,
          note: data.note,
          paidByUserId:
            data.paymentType === "youPaid" ? currentUser._id : otherUserId,
          receivedByUserId:
            data.paymentType === "youPaid" ? otherUserId : currentUser._id,
        });
      } else if (entityType === "group") {
        if (!selectedGroupMemberId) {
          toast.error("Please select a group member to settle with");
          return;
        }

        const selectedUser = balances.find(
          (b) => b.userId === selectedGroupMemberId
        );

        if (!selectedUser) {
          toast.error("Selected user not found in group");
          return;
        }

        await createSettlement.mutate({
          amount,
          note: data.note,
          paidByUserId:
            data.paymentType === "youPaid"
              ? currentUser._id
              : selectedUser.userId,
          receivedByUserId:
            data.paymentType === "youPaid"
              ? selectedUser.userId
              : currentUser._id,
          groupId: entityData?.group?.id || entityData?.group?._id,
        });
      }

      toast.success("Settlement recorded successfully!");
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error(error.message || "Failed to record settlement");
    }
  };

  const renderPaymentTypeRadio = (targetUser) => (
    <div className="space-y-2">
      <Label>Who paid?</Label>
      <Controller
        name="paymentType"
        control={control}
        render={({ field }) => (
          <RadioGroup
            value={field.value}
            onValueChange={field.onChange}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2 border rounded-md p-3">
              <RadioGroupItem value="youPaid" id="youPaid" />
              <Label htmlFor="youPaid" className="grow cursor-pointer">
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={currentUser?.imageUrl} />
                    <AvatarFallback>
                      {currentUser?.name?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span>You paid {targetUser?.name || "Member"}</span>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 border rounded-md p-3">
              <RadioGroupItem value="theyPaid" id="theyPaid" />
              <Label htmlFor="theyPaid" className="grow cursor-pointer">
                <div className="flex items-center">
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={targetUser?.imageUrl} />
                    <AvatarFallback>
                      {targetUser?.name?.charAt(0) || "M"}
                    </AvatarFallback>
                  </Avatar>
                  <span>{targetUser?.name || "Member"} paid you</span>
                </div>
              </Label>
            </div>
          </RadioGroup>
        )}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {entityType === "user" && entityData?.counterpart && (
        <>
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="font-medium mb-2">Current balance</h3>
            {(entityData.netBalance ?? 0) === 0 ? (
              <p>You are all settled up with {entityData.counterpart.name}</p>
            ) : (entityData.netBalance ?? 0) > 0 ? (
              <div className="flex justify-between items-center">
                <p>
                  <span className="font-medium">
                    {entityData.counterpart.name}
                  </span>{" "}
                  owes you
                </p>
                <span className="text-xl font-bold text-green-600">
                  ${entityData.netBalance.toFixed(2)}
                </span>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <p>
                  You owe{" "}
                  <span className="font-medium">
                    {entityData.counterpart.name}
                  </span>
                </p>
                <span className="text-xl font-bold text-red-600">
                  ${Math.abs(entityData.netBalance).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {renderPaymentTypeRadio(entityData.counterpart)}
        </>
      )}

      {entityType === "group" && (
        <div className="space-y-2">
          <Label>Who are you settling with?</Label>
          <div className="space-y-2">
            {balances.length === 0 ? (
              <p className="text-sm text-muted-foreground p-3 border rounded-md">
                No group members available to settle with.
              </p>
            ) : (
              balances.map((member) => {
                const isSelected = selectedGroupMemberId === member.userId;
                const isOwing = (member.netBalance ?? 0) < 0;
                const isOwed = (member.netBalance ?? 0) > 0;

                return (
                  <div
                    key={member.userId}
                    className={`border rounded-md p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/50"
                    }`}
                    onClick={() => {
                      setSelectedGroupMemberId(member.userId);
                      setValue("paymentType", isOwed ? "youPaid" : "theyPaid");
                      if (member.netBalance && member.netBalance !== 0) {
                        setValue(
                          "amount",
                          Math.abs(member.netBalance).toFixed(2)
                        );
                      }
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.imageUrl} />
                          <AvatarFallback>
                            {member.name?.charAt(0) || "M"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{member.name}</span>
                      </div>
                      <div
                        className={`font-medium ${
                          isOwing
                            ? "text-green-600"
                            : isOwed
                              ? "text-red-600"
                              : ""
                        }`}
                      >
                        {isOwing
                          ? `They owe you $${Math.abs(member.netBalance).toFixed(2)}`
                          : isOwed
                            ? `You owe $${Math.abs(member.netBalance).toFixed(2)}`
                            : "Settled up"}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {!selectedGroupMemberId && balances.length > 0 && (
            <p className="text-sm text-amber-600">
              Please select a member to settle with
            </p>
          )}

          {selectedGroupMemberId &&
            renderPaymentTypeRadio(
              balances.find((m) => m.userId === selectedGroupMemberId) || {
                name: "User",
              }
            )}
        </div>
      )}

      {(entityType === "user" || selectedGroupMemberId) && (
        <>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5">$</span>
              <Input
                id="amount"
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0.01"
                className="pl-7"
                {...register("amount")}
              />
            </div>
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea
              id="note"
              placeholder="Dinner, rent, etc."
              {...register("note")}
            />
          </div>
        </>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={
          isSubmitting || (entityType === "group" && !selectedGroupMemberId)
        }
      >
        {isSubmitting ? "Recording..." : "Record settlement"}
      </Button>
    </form>
  );
}