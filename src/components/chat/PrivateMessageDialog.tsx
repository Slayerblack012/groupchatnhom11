
'use client';

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../ui/dialog";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { UserProfile } from "@/types";
import { useAuth } from "@/providers/auth-provider";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";

interface PrivateMessageDialogProps {
  groupId: string;
  onSelect: (recipients: UserProfile[]) => void;
  children: React.ReactNode;
}

export function PrivateMessageDialog({ groupId, onSelect, children }: PrivateMessageDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchMembers = async () => {
      if (!open || !user) return;
      const groupDoc = await getDoc(doc(db, "groups", groupId));
      if (!groupDoc.exists()) return;

      const memberIds = groupDoc.data().members as string[];
      if (memberIds.length === 0) return;
      
      const usersRef = collection(db, "users");
      const q = query(usersRef, where('uid', 'in', memberIds));
      const snapshot = await getDocs(q);
      const memberProfiles = snapshot.docs.map(doc => doc.data() as UserProfile)
        .filter(member => member.uid !== user.uid); // Exclude current user
      setMembers(memberProfiles);
    };

    fetchMembers();
  }, [open, groupId, user]);

  const handleSelect = () => {
    const recipients = members.filter(member => selectedMembers[member.uid]);
    onSelect(recipients);
    setOpen(false);
  };

  const handleCheckedChange = (uid: string, checked: boolean | 'indeterminate') => {
    setSelectedMembers(prev => ({ ...prev, [uid]: checked === true }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send a Private Message</DialogTitle>
          <DialogDescription>Select who can see this message. Only you and the selected members will be able to view it.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-64">
            <div className="space-y-4 pr-4">
                {members.map(member => (
                    <div key={member.uid} className="flex items-center space-x-3 rounded-md border p-3">
                        <Checkbox 
                            id={member.uid} 
                            onCheckedChange={(checked) => handleCheckedChange(member.uid, checked)}
                            checked={selectedMembers[member.uid]}
                        />
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.photoURL || ''} />
                          <AvatarFallback>{member.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Label htmlFor={member.uid} className="flex-1 cursor-pointer">{member.displayName}</Label>
                    </div>
                ))}
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSelect}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
