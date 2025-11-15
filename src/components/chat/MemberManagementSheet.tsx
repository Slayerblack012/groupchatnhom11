
"use client";

import { useState, useEffect } from "react";
import {
  doc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Group, UserProfile } from "@/types";
import { useAuth } from "@/providers/auth-provider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings, UserX, Copy } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { useLanguage } from "@/providers/language-provider";
import { Label } from "../ui/label";

interface MemberManagementSheetProps {
  group: Group;
}

export default function MemberManagementSheet({ group }: MemberManagementSheetProps) {
  const { user: adminUser } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchMembers = async () => {
      if (!group?.members) return;
      setLoadingMembers(true);
      try {
        const memberProfiles: UserProfile[] = [];
        for (const memberId of group.members) {
          const userRef = doc(db, "users", memberId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            memberProfiles.push(userSnap.data() as UserProfile);
          }
        }
        setMembers(memberProfiles);
      } catch (error) {
          console.error("Error fetching members:", error);
          toast({ variant: "destructive", title: "Error", description: "Failed to load group members." });
      } finally {
        setLoadingMembers(false);
      }
    };

    fetchMembers();
  }, [group.members, toast]);

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", newMemberEmail.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ variant: "destructive", description: t('toasts.userNotFound') });
        return;
      }

      const userToAdd = querySnapshot.docs[0].data() as UserProfile;
      if (group.members.includes(userToAdd.uid)) {
        toast({ description: t('toasts.userAlreadyInGroup') });
        return;
      }
      
      const groupRef = doc(db, "groups", group.id);
      await updateDoc(groupRef, {
        members: arrayUnion(userToAdd.uid),
      });

      // Optimistically update UI, but Firestore listener will correct it
      setMembers(prev => [...prev, userToAdd]);
      setNewMemberEmail("");
      toast({ title: "Success", description: t('toasts.memberAdded', { displayName: userToAdd.displayName || 'user' }) });
    } catch (error) {
      console.error("Error adding member:", error);
      toast({ variant: "destructive", title: "Error", description: t('toasts.addMemberError') });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (memberId === group.admin) {
        toast({ variant: "destructive", description: t('toasts.cannotRemoveAdmin') });
        return;
    }

    try {
        const groupRef = doc(db, "groups", group.id);
        await updateDoc(groupRef, {
            members: arrayRemove(memberId),
        });

        // Optimistically update UI
        setMembers(prev => prev.filter(m => m.uid !== memberId));
        toast({ title: "Success", description: t('toasts.memberRemoved') });

    } catch (error) {
        console.error("Error removing member:", error);
        toast({ variant: "destructive", title: "Error", description: t('toasts.removeMemberError') });
    }
  };

  const copyGroupIdToClipboard = () => {
    navigator.clipboard.writeText(group.id);
    toast({
      title: t('toasts.groupIdCopied'),
      description: `ID: ${group.id}`,
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">{t('memberManagement.title')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t('memberManagement.title')}</SheetTitle>
          <SheetDescription>
            {t('memberManagement.description', { groupName: group.name })}
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
            <Label className="text-sm font-semibold">{t('joinGroupDialog.groupIdLabel')}</Label>
            <div className="flex items-center space-x-2 pt-2">
                <Input value={group.id} readOnly />
                <Button size="icon" variant="outline" onClick={copyGroupIdToClipboard} className="px-3">
                    <span className="sr-only">{t('createGroupDialog.copyButton')}</span>
                    <Copy className="h-4 w-4" />
                </Button>
            </div>
        </div>
        <div className="py-4">
          <h3 className="mb-2 text-sm font-semibold">{t('memberManagement.addMember')}</h3>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder={t('memberManagement.addMemberPlaceholder')}
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
            />
            <Button onClick={handleAddMember} size="icon" variant="outline" aria-label="Add Member">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="py-4">
          <h3 className="mb-2 text-sm font-semibold">{t('memberManagement.currentMembers')}</h3>
          <ScrollArea className="h-72">
            <div className="space-y-2">
              {loadingMembers ? (
                 [...Array(3)].map((_,i) => <Skeleton key={i} className="h-12 w-full"/>)
              ) : (
                members.map((member) => (
                  <div key={member.uid} className="flex items-center justify-between rounded-md border p-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.photoURL || ""} alt={member.displayName || ""} />
                        <AvatarFallback>{member.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.displayName}</p>
                        <p className="text-xs text-muted-foreground">{member.uid === group.admin ? t('memberManagement.admin') : t('memberManagement.member')}</p>
                      </div>
                    </div>
                    {adminUser?.uid === group.admin && member.uid !== group.admin && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.uid)} aria-label={`Remove ${member.displayName}`}>
                            <UserX className="h-4 w-4 text-destructive" />
                        </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

    