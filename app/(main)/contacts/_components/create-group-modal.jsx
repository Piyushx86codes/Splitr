import React, { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useForm } from 'react-hook-form';
import { zodResolver } from "@hookform/resolvers/zod";
import z from 'zod';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useConvexMutation, useConvexQuery } from '@/hooks/use-convex-query';
import { api } from '@/convex/_generated/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { PopoverTrigger, Popover, PopoverContent } from '@/components/ui/popover';
import { UserPlus, X } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from 'sonner';

const groupSchema = z.object({
  name: z.string().min(1, "Group name is required"),
  description: z.string().optional(),
});

const CreateGroupModal = ({ isOpen, onClose, onSuccess }) => {
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);

  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);
  const { data: searchResults, isLoading: isSearching } = useConvexQuery(api.users.searchUsers, { query: searchQuery });

  const createGroup = useConvexMutation(api.contacts.createGroup);


  const addMember = (user) => {
  if (!selectedMembers.some((m) => m._id === user._id) && user._id !== currentUser?._id) {
    setSelectedMembers((prev) => [...prev, user]);
  }
  setCommandOpen(false);
  setSearchQuery("");
};

  const removeMember = (userId) => {
  setSelectedMembers((prev) => prev.filter((m) => m._id !== userId));
  };

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: "", description: "" }
  });

  const onSubmit = async (data) => {
  try {
    // 1. Extract member _ids and include current user if logged in
    const memberIds = [
      ...(currentUser ? [currentUser._id] : []),
      ...selectedMembers.map((member) => member._id),
    ].filter(Boolean);
    const groupId = await createGroup.mutate({
      name: data.name,
      description: data.description || "",
      members: memberIds,
    });

    toast.success("Group created successfully");
    handleClose();
    if (onSuccess) onSuccess(groupId);
  } catch (error) {
    toast.error("Failed to create group: " + error.message);
  }
};

  const handleClose = (open) => {
    if (!open) {
      reset();
      setSelectedMembers([]);
      onClose?.();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
        </DialogHeader>

        {/* Form is placed directly under DialogContent to prevent invalid DOM nesting */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <input
              id="name"
              placeholder="Enter group name"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Enter group description"
              {...register("description")}
            />
          </div>

          <div className="space-y-2">
            <Label>Members</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {currentUser && (
                <Badge variant="secondary" className="px-3 py-1">
                  <Avatar className="h-5 w-5 mr-2">
                    <AvatarImage src={currentUser.imageUrl} />
                    <AvatarFallback>
                      {currentUser.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span>{currentUser.name} (You)</span>
                </Badge>
              )}

              {/* selected members */}
              {selectedMembers.map((member) => (
                <Badge
                  key={member._id || member.id}
                  variant="secondary"
                  className="px-3 py-1 flex items-center"
                >
                  <Avatar className="h-5 w-5 mr-2">
                    <AvatarImage src={member.imageUrl} />
                    <AvatarFallback>
                      {member.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span>{member.name}</span>
                  <button
                    type="button"
                    onClick={() => removeMember(member._id)}
                    className="ml-2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}

              <Popover open={commandOpen} onOpenChange={setCommandOpen}>
                <PopoverTrigger
                  type="button"
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: "h-8 gap-1 text-xs",
                  })}
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add Member
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start" side="bottom">
                  <Command className="max-w-sm rounded-lg border">
                    <CommandInput
                      placeholder="Search by name or email"
                      value={searchQuery}
                      onValueChange={setSearchQuery}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {searchQuery.length < 2 ? (
                          <p className="py-3 px-2 text-xs text-muted-foreground text-center">
                            Type at least 2 characters to search
                          </p>
                        ) : isSearching ? (
                          <p className="py-3 px-2 text-xs text-muted-foreground text-center">
                            Searching...
                          </p>
                        ) : (
                          <p className="py-3 px-2 text-xs text-muted-foreground text-center">
                            No users Found
                          </p>
                        )}
                      </CommandEmpty>
                      <CommandGroup heading="Users">
                        {searchResults?.map((user) => (
                          <CommandItem
                            key={user.id}
                            value={user.name + user.email}
                            onSelect={() => addMember(user)}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={user.imageUrl} />
                                <AvatarFallback>
                                  {user.name?.charAt(0) || "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col">
                                <span className="text-sm">{user.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {user.email}
                                </span>
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            {selectedMembers.length === 0 && (
              <p className="text-sm text-amber-600">
                Add atleast one person to the group
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || selectedMembers.length === 0}
            >
              {isSubmitting ? "Creating" : "create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateGroupModal;