"use client";

import { useState, useEffect } from "react";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { BarLoader } from "react-spinners";
import { Users } from "lucide-react";
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue,} from "@/components/ui/select";

export function GroupSelector({ onChange }) {
  const [selectedGroupId, setSelectedGroupId] = useState("");

  // Fetch groups and the selected group's details/members
  const { data, isLoading } = useConvexQuery(
    api.groups.getGroupOrMembers,
    selectedGroupId ? { groupId: selectedGroupId } : {}
  );

  // Notify parent component when the selected group data loads
  useEffect(() => {
    if (data?.selectedGroup && onChange) {
      onChange(data.selectedGroup);
    }
  }, [data?.selectedGroup, onChange]);

  const handleGroupChange = (groupId) => {
    setSelectedGroupId(groupId);
  };

  // Only show the full-screen loader on initial data load
  if (isLoading && !data) {
    return <BarLoader width={"100%"} color="#36d7b7" />;
  }

  // Handle empty state
  if (!data?.groups || data.groups.length === 0) {
    return (
      <div className="text-sm text-amber-600 p-2 bg-amber-50 rounded-md border border-amber-200">
        You need to create a group first before adding a group expense.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Select value={selectedGroupId} onValueChange={handleGroupChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a group" />
        </SelectTrigger>
        <SelectContent>
          {data.groups.map((group) => {
            const groupId = group._id || group.id;
            return (
              <SelectItem key={groupId} value={groupId}>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 p-1 rounded-full">
                    <Users className="h-3 w-3 text-primary" />
                  </div>
                  <span>{group.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({group.memberCount ?? group.members?.length ?? 0} members)
                  </span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Subtle loader below the select when fetching members for the selected group */}
      {isLoading && selectedGroupId && (
        <div className="pt-1">
          <BarLoader width={"100%"} color="#36d7b7" />
        </div>
      )}
    </div>
  );
}

export default GroupSelector;