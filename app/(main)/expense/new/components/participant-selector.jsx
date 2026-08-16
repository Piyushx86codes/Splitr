"use client";

import { useState } from "react";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, X, Check, User } from "lucide-react";

export function ParticipantSelector({ participants = [], onParticipantsChange }) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: users, isLoading } = useConvexQuery(
  api.users.searchUsers,
  { query: searchQuery }
);

  const handleAddParticipant = (user) => {
    const userId = user._id || user.id;
    if (participants.some((p) => p.id === userId || p._id === userId)) {
      return;
    }

    onParticipantsChange([
      ...participants,
      {
        id: userId,
        name: user.name || user.email,
        email: user.email,
        imageUrl: user.imageUrl,
      },
    ]);
    setOpen(false);
    setSearchQuery("");
  };

  const handleRemoveParticipant = (userId) => {
    onParticipantsChange(
      participants.filter((p) => (p.id || p._id) !== userId)
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {participants.map((p, index) => {
          const id = p.id || p._id;
          return (
            <Badge
              key={id || index}
              variant="secondary"
              className="flex items-center gap-1.5 py-1 px-2.5 text-sm"
            >
              <Avatar className="h-5 w-5">
                <AvatarImage src={p.imageUrl} alt={p.name} />
                <AvatarFallback className="text-[10px]">
                  {p.name ? p.name.charAt(0).toUpperCase() : <User className="h-3 w-3" />}
                </AvatarFallback>
              </Avatar>
              <span>{p.name || p.email}</span>
              {index !== 0 && (
                <button
                  type="button"
                  onClick={() => handleRemoveParticipant(id)}
                  className="rounded-full hover:bg-muted p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          );
        })}

        {/* Popover trigger styled directly to avoid nested <button> tags */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            type="button"
            className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Participant
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-2">
              <Input
                placeholder="Search user by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="max-h-48 overflow-y-auto space-y-1">
                {isLoading && (
                  <p className="text-xs text-muted-foreground p-2">Searching...</p>
                )}
                {!isLoading && users?.length === 0 && (
                  <p className="text-xs text-muted-foreground p-2">No users found</p>
                )}
                {users?.map((user) => {
                  const id = user._id || user.id;
                  const isSelected = participants.some(
                    (p) => (p.id || p._id) === id
                  );

                  return (
                    <button
                      key={id}
                      type="button"
                      disabled={isSelected}
                      onClick={() => handleAddParticipant(user)}
                      className="w-full flex items-center justify-between p-1.5 text-xs rounded hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={user.imageUrl} />
                          <AvatarFallback className="text-[10px]">
                            {user.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium leading-none">{user.name}</p>
                          <p className="text-[10px] text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export default ParticipantSelector;