"use client";

import { useState, useEffect } from "react";
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  query,
  where,
  getDocs,
  getDoc,
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
import { Plus, Settings, Trash, UserX } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";

interface MemberManagementSheetProps {
  group: Group;
}

export default function MemberManagementSheet({ group }: MemberManagementSheetProps) {
  const { user: adminUser } = useAuth();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const fetchMembers = async () => {
      setLoadingMembers(true);
      const memberProfiles: UserProfile[] = [];
      for (const memberId of group.members) {
        const userRef = doc(db, "users", memberId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          memberProfiles.push(userSnap.data() as UserProfile);
        }
      }
      setMembers(memberProfiles);
      setLoadingMembers(false);
    };

    fetchMembers();
  }, [group.members]);

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;

    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("email", "==", newMemberEmail.trim()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        toast({ variant: "destructive", description: "User not found." });
        return;
      }

      const userToAdd = querySnapshot.docs[0].data() as UserProfile;
      if (group.members.includes(userToAdd.uid)) {
        toast({ description: "User is already in the group." });
        return;
      }
      
      const groupRef = doc(db, "groups", group.id);
      await updateDoc(groupRef, {
        members: arrayUnion(userToAdd.uid),
      });

      setMembers(prev => [...prev, userToAdd]);
      setNewMemberEmail("");
      toast({ title: "Success", description: `${userToAdd.displayName} added to the group.` });
    } catch (error) {
      console.error("Error adding member:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to add member." });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (memberId === group.admin) {
        toast({ variant: "destructive", description: "Cannot remove the group admin." });
        return;
    }

    try {
        const groupRef = doc(db, "groups", group.id);
        await updateDoc(groupRef, {
            members: arrayRemove(memberId),
        });

        setMembers(prev => prev.filter(m => m.uid !== memberId));
        toast({ title: "Success", description: "Member removed from the group." });

    } catch (error) {
        console.error("Error removing member:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to remove member." });
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">Manage Members</span>
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Manage Members</SheetTitle>
          <SheetDescription>
            Add or remove members from '{group.name}'.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <h3 className="mb-2 text-sm font-semibold">Add Member</h3>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="user@example.com"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
            />
            <Button onClick={handleAddMember} size="icon" variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="py-4">
          <h3 className="mb-2 text-sm font-semibold">Current Members</h3>
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {loadingMembers ? (
                 [...Array(3)].map((_,i) => <Skeleton key={i} className="h-12 w-full"/>)
              ) : (
                members.map((member) => (
                  <div key={member.uid} className="flex items-center justify-between rounded-md border p-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.photoURL || ""} />
                        <AvatarFallback>{member.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.displayName}</p>
                        <p className="text-xs text-muted-foreground">{member.uid === group.admin ? "Admin" : "Member"}</p>
                      </div>
                    </div>
                    {adminUser?.uid === group.admin && member.uid !== group.admin && (
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveMember(member.uid)}>
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
