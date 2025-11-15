"use client";

import { useAuth } from "@/providers/auth-provider";
import type { Group } from "@/types";
import { Users, LogOut, X } from "lucide-react";
import MemberManagementSheet from "./MemberManagementSheet";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { doc, updateDoc, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useToast } from "@/hooks/use-toast";

interface ChatHeaderProps {
  group: Group;
  onGroupLeft: () => void;
}

export default function ChatHeader({ group, onGroupLeft }: ChatHeaderProps) {
  const { user } = useAuth();
  const isAdmin = user?.uid === group.admin;

  return (
    <div className="flex items-center justify-between border-b p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{group.name}</h2>
          <p className="text-xs text-muted-foreground">
            {group.members.length} member
            {group.members.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isAdmin && <MemberManagementSheet group={group} />}
        <LeaveGroupDialog group={group} onLeave={onGroupLeft} />
      </div>
    </div>
  );
}


function LeaveGroupDialog({group, onLeave}: {group: Group, onLeave: () => void}) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [open, setOpen] = useState(false);

    const handleLeaveGroup = async () => {
        if (!user) return;

        if (user.uid === group.admin) {
            toast({
                variant: "destructive",
                title: "Action not allowed",
                description: "Admins cannot leave the group. Please transfer ownership to another member first.",
            });
            return;
        }

        const groupRef = doc(db, "groups", group.id);
        try {
            await updateDoc(groupRef, {
                members: arrayRemove(user.uid),
            });
            toast({
                title: "Success",
                description: `You have left the group: ${group.name}`,
            });
            onLeave();
            setOpen(false);
        } catch (error) {
            console.error("Error leaving group:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "Failed to leave group.",
            });
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Leave Group</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Are you absolutely sure?</DialogTitle>
                    <DialogDescription>
                        You are about to leave the group "{group.name}". You will no longer be able to see messages or participate in this group. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button variant="destructive" onClick={handleLeaveGroup}>Leave Group</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
