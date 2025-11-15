
"use client";

import { useAuth } from "@/providers/auth-provider";
import type { Group } from "@/types";
import { Users, LogOut } from "lucide-react";
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
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/providers/language-provider";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface ChatHeaderProps {
  group: Group;
  onGroupLeft: () => void;
}

export default function ChatHeader({ group, onGroupLeft }: ChatHeaderProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isAdmin = user?.uid === group.admin;

  return (
    <div className="flex items-center justify-between border-b p-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={group.photoURL} />
          <AvatarFallback>
            <Users className="h-5 w-5 text-muted-foreground" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-lg font-semibold">{group.name}</h2>
          <p className="text-xs text-muted-foreground">
            {group.members.length}{" "}
            {group.members.length > 1
              ? t("chatHeader.members")
              : t("chatHeader.member")}
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
    const { t } = useLanguage();
    const [open, setOpen] = useState(false);

    const handleLeaveGroup = async () => {
        if (!user) return;

        if (user.uid === group.admin) {
            toast({
                variant: "destructive",
                title: t('toasts.adminLeaveError'),
                description: t('toasts.adminTransferOwnership'),
            });
            return;
        }

        const groupRef = doc(db, "groups", group.id);
        try {
            await updateDoc(groupRef, {
                members: group.members.filter(id => id !== user.uid)
            });
            toast({
                title: "Success",
                description: t('toasts.groupLeftSuccess', { groupName: group.name }),
            });
            onLeave();
            setOpen(false);
        } catch (error) {
            console.error("Error leaving group:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: t('toasts.leaveGroupError'),
            });
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">{t('chatHeader.leaveGroup')}</span>
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('leaveGroupDialog.confirmTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('leaveGroupDialog.confirmDescription', { groupName: group.name })}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>{t('leaveGroupDialog.cancelButton')}</Button>
                    <Button variant="destructive" onClick={handleLeaveGroup}>{t('leaveGroupDialog.leaveButton')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
