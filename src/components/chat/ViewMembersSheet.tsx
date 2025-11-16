
"use client";

import { useState, useEffect } from "react";
import {
  doc,
  getDocs,
  collection,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Group, UserProfile } from "@/types";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { useLanguage } from "@/providers/language-provider";

interface ViewMembersSheetProps {
  group: Group;
}

export default function ViewMembersSheet({ group }: ViewMembersSheetProps) {
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    const fetchMembers = async () => {
      if (!group?.members || group.members.length === 0) {
        setMembers([]);
        setLoadingMembers(false);
        return;
      };
      setLoadingMembers(true);
      try {
        const usersRef = collection(db, 'users');
        // Firestore 'in' queries are limited to 30 items. 
        // If you expect more members, you'd need to chunk this array.
        const q = query(usersRef, where('uid', 'in', group.members));
        const querySnapshot = await getDocs(q);
        
        const memberProfiles = querySnapshot.docs.map(doc => doc.data() as UserProfile);

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


  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Users className="h-5 w-5" />
          <span className="sr-only">{t('memberManagement.viewMembers')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('memberManagement.membersListTitle')}</SheetTitle>
          <SheetDescription>
            {t('memberManagement.membersListDescription', { count: group.members.length, groupName: group.name })}
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-4 flex-1 flex flex-col min-h-0">
          <h3 className="mb-2 text-sm font-semibold">{t('memberManagement.currentMembers')}</h3>
          <ScrollArea className="flex-1">
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
