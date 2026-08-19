"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { api } from "@/convex/_generated/api";
import { useConvexMutation, useConvexQuery } from "@/hooks/use-convex-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import  ParticipantSelector from "./participant-selector";
import  GroupSelector  from "./group-selector";
import  CategorySelector  from "./category-selector";
import  SplitSelector from "./split-selector";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { getAllCategories } from "@/lib/expense-categories";

// Form validation schema
const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
  category: z.string().optional(),
  date: z.date({ required_error: "Date is required" }),
  paidByUserId: z.string().min(1, "Payer is required"),
  splitType: z.enum(["equal", "percentage", "exact"]),
  groupId: z.string().optional(),
});

export function ExpenseForm({ type = "individual", onSuccess }) {
  const [participants, setParticipants] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [splits, setSplits] = useState([]);

  // Fetch current user and mutation
  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);
  const createExpense = useConvexMutation(api.expenses.createExpense);
  const categories = getAllCategories();

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: "",
      category: "",
      date: new Date(),
      paidByUserId: "",
      splitType: "equal",
      groupId: undefined,
    },
  });

  const amountValue = watch("amount");
  const paidByUserId = watch("paidByUserId");

  // Sync currentUser once loaded
  useEffect(() => {
    if (currentUser) {
      if (participants.length === 0) {
        setParticipants([
          {
            id: currentUser._id,
            name: currentUser.name || "You",
            email: currentUser.email,
            imageUrl: currentUser.imageUrl,
          },
        ]);
      }
      if (!paidByUserId) {
        setValue("paidByUserId", currentUser._id);
      }
    }
  }, [currentUser, participants.length, paidByUserId, setValue]);

  // Form submission handler
  const onSubmit = async (data) => {
    try {
      const parsedAmount = parseFloat(data.amount);

      // Structure splits for Convex
      const formattedSplits = splits.map((split) => ({
        userId: split.userId || split.id,
        amount: Number(split.amount),
        paid: (split.userId || split.id) === data.paidByUserId,
      }));

      // Validate that split total matches total amount
      const totalSplitAmount = formattedSplits.reduce(
        (sum, split) => sum + split.amount,
        0
      );
      const tolerance = 0.01;

      if (Math.abs(totalSplitAmount - parsedAmount) > tolerance) {
        toast.error("Split amounts must equal the total expense amount.");
        return;
      }

      const groupId = type === "individual" ? undefined : data.groupId;

      const mutationFn =
        createExpense.mutateAsync || createExpense.mutate || createExpense;

      await mutationFn({
        description: data.description,
        amount: parsedAmount,
        category: data.category || "Other",
        date: new Date(data.date).getTime(),
        paidByUserId: data.paidByUserId,
        splitType: data.splitType,
        splits: formattedSplits,
        groupId,
      });

      toast.success("Expense created successfully!");
      reset();

      const otherParticipant = participants.find(
        (p) => p.id !== currentUser?._id
      );
      const otherUserId = otherParticipant?.id;

      if (onSuccess) {
        onSuccess(type === "individual" ? otherUserId : groupId);
      }
    } catch (error) {
      toast.error(error.message || "Failed to create expense");
    }
  };

  if (!currentUser) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-4">
        {/* Description and Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Lunch, movie tickets, etc."
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              placeholder="0.00"
              type="number"
              step="0.01"
              min="0.01"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>
        </div>

        {/* Category and Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <CategorySelector
              categories={categories || []}
              onChange={(categoryId) => {
                setValue("category", categoryId || "");
              }}
            />
          </div>

          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              {/* Renders a single native trigger to prevent nested <button> hydration errors */}
              <PopoverTrigger
                type="button"
                className={cn(
                  "flex h-9 w-full items-center justify-start rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "PPP")
                ) : (
                  <span>Pick a date</span>
                )}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    if (date) {
                      setSelectedDate(date);
                      setValue("date", date);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Group Selector (for group expenses) */}
        {type === "group" && (
          <div className="space-y-2">
            <Label>Group</Label>
            <GroupSelector
              onChange={(group) => {
                if (!selectedGroup || selectedGroup.id !== group?.id) {
                  setSelectedGroup(group);
                  setValue("groupId", group?.id);

                  if (group?.members && Array.isArray(group.members)) {
                    const normalizedMembers = group.members.map((m) => ({
                      id: m.id || m._id || m.userId,
                      name: m.name,
                      email: m.email,
                      imageUrl: m.imageUrl,
                    }));
                    setParticipants(normalizedMembers);
                  }
                }
              }}
            />
            {!selectedGroup && (
              <p className="text-xs text-amber-600">
                Please select a group to continue
              </p>
            )}
          </div>
        )}

        {/* Participants (for individual expenses) */}
        {type === "individual" && (
          <div className="space-y-2">
            <Label>Participants</Label>
            <ParticipantSelector
              participants={participants}
              onParticipantsChange={setParticipants}
            />
            {participants.length <= 1 && (
              <p className="text-xs text-amber-600">
                Please add at least one other participant
              </p>
            )}
          </div>
        )}

        {/* Paid by Selector */}
        <div className="space-y-2">
          <Label htmlFor="paidByUserId">Paid by</Label>
          <select
            id="paidByUserId"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            {...register("paidByUserId")}
          >
            <option value="">Select who paid</option>
            {participants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.id === currentUser._id
                  ? "You"
                  : participant.name}
              </option>
            ))}
          </select>
          {errors.paidByUserId && (
            <p className="text-sm text-red-500">
              {errors.paidByUserId.message}
            </p>
          )}
        </div>

        {/* Split Type Tabs */}
        <div className="space-y-2">
          <Label>Split type</Label>
          <Tabs
            defaultValue="equal"
            onValueChange={(value) => setValue("splitType", value)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="equal">Equal</TabsTrigger>
              <TabsTrigger value="percentage">Percentage</TabsTrigger>
              <TabsTrigger value="exact">Exact Amounts</TabsTrigger>
            </TabsList>
            <TabsContent value="equal" className="pt-4">
              <SplitSelector
                type="equal"
                amount={parseFloat(amountValue) || 0}
                participants={participants}
                paidByUserId={paidByUserId}
                onSplitsChange={setSplits}
              />
            </TabsContent>
            <TabsContent value="percentage" className="pt-4">
              <SplitSelector
                type="percentage"
                amount={parseFloat(amountValue) || 0}
                participants={participants}
                paidByUserId={paidByUserId}
                onSplitsChange={setSplits}
              />
            </TabsContent>
            <TabsContent value="exact" className="pt-4">
              <SplitSelector
                type="exact"
                amount={parseFloat(amountValue) || 0}
                participants={participants}
                paidByUserId={paidByUserId}
                onSplitsChange={setSplits}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting || participants.length <= 1}
        >
          {isSubmitting ? "Creating..." : "Create Expense"}
        </Button>
      </div>
    </form>
  );
}