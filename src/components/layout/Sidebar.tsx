
"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  arrayUnion,
} from "firebase/firestore";
import { useAuth } from "@/providers/auth-provider";
import { db } from "@/lib/firebase/config";
import type { Group } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  LogOut,
  Plus,
  Users,
  Copy,
  MessageSquare,
  LogIn,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/providers/language-provider";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";

export default function Sidebar({
  onSelectGroup,
  selectedGroupId,
  onSelectSettings,
}: {
  onSelectGroup: (groupId: string) => void;
  selectedGroupId: string | null;
  onSelectSettings: () => void;
}) {
  const { user, signOut } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (!user) return;

    setLoading(true);
    const q = query(
      collection(db, "groups"),
      where("members", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const userGroups = snapshot.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() } as Group)
        );
        setGroups(userGroups);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching groups:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: t('toasts.fetchGroupsError'),
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, toast, t]);

  return (
    <aside className="flex h-full w-full max-w-xs flex-col border-r bg-card/50">
      <div className="p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold">groupchat</h1>
        </div>
      </div>

      <div className="flex gap-2 p-2">
        <CreateGroupDialog />
        <JoinGroupDialog />
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="p-2 text-xs font-semibold text-muted-foreground">
          {t('sidebar.yourGroups')}
        </div>
        {loading ? (
          <div className="space-y-2 p-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <nav className="flex flex-col gap-1 p-2">
            {groups.map((group) => (
              <Button
                key={group.id}
                variant={selectedGroupId === group.id ? "secondary" : "ghost"}
                className={cn(
                  "justify-start",
                  selectedGroupId === group.id &&
                    "bg-primary/10 text-primary hover:bg-primary/20"
                )}
                onClick={() => onSelectGroup(group.id)}
              >
                <Users className="mr-2 h-4 w-4" />
                {group.name}
              </Button>
            ))}
          </nav>
        )}
      </ScrollArea>

      <div className="mt-auto border-t p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9">
              <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || "User"} />
              <AvatarFallback>
                {user?.displayName?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{user?.displayName}</span>
          </div>
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={onSelectSettings} aria-label={t('sidebar.settings')}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} aria-label={t('settings.logoutButton')}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}

function CreateGroupDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [groupName, setGroupName] = useState("");
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);

  const generateGroupId = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // remove special characters
      .replace(/\s+/g, '-') // replace spaces with hyphens
      .slice(0, 50); // limit length
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !user) return;
    setIsLoading(true);

    let finalGroupId = generateGroupId(groupName);
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      try {
        const groupRef = doc(db, 'groups', finalGroupId);
        const docSnap = await getDoc(groupRef);
        if (!docSnap.exists()) {
          isUnique = true;
        } else {
          finalGroupId = `${generateGroupId(groupName)}-${Math.floor(Math.random() * 1000)}`;
          attempts++;
        }
      } catch (error) {
        console.error("Error checking group ID uniqueness:", error);
        toast({ variant: "destructive", title: "Error", description: "Failed to check for group ID uniqueness." });
        setIsLoading(false);
        return;
      }
    }

    if (!isUnique) {
      toast({ variant: "destructive", title: "Error", description: "Could not create a unique group ID. Please try a different name." });
      setIsLoading(false);
      return;
    }

    const groupData = {
        id: finalGroupId,
        name: groupName,
        admin: user.uid,
        members: [user.uid],
        createdAt: new Date(),
    };
    const groupRef = doc(db, 'groups', finalGroupId);

    setDoc(groupRef, groupData).then(() => {
        setCreatedGroupId(finalGroupId);
    }).catch(error => {
        const permissionError = new FirestorePermissionError({
            path: `groups/${finalGroupId}`,
            operation: 'create',
            requestResourceData: groupData,
        });
        errorEmitter.emit('permission-error', permissionError);
        toast({
            variant: "destructive",
            title: "Error",
            description: t('toasts.groupCreateError'),
        });
    }).finally(() => {
        setIsLoading(false);
    });
  };

  const copyToClipboard = () => {
    if (!createdGroupId) return;
    navigator.clipboard.writeText(createdGroupId);
    toast({
      title: t('toasts.groupIdCopied'),
      description: `ID: ${createdGroupId}`,
    });
  };

  const closeAndReset = () => {
    setOpen(false);
    setGroupName('');
    setCreatedGroupId(null);
    setIsLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) {
            closeAndReset();
        }
        setOpen(isOpen);
    }}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="mr-2 h-4 w-4" /> {t('sidebar.createGroup')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {!createdGroupId ? (
          <>
            <DialogHeader>
              <DialogTitle>{t('createGroupDialog.title')}</DialogTitle>
              <DialogDescription>
                {t('createGroupDialog.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="group-name" className="text-right">
                  {t('createGroupDialog.groupNameLabel')}
                </Label>
                <Input
                  id="group-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="col-span-3"
                  placeholder={t('createGroupDialog.groupNamePlaceholder')}
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateGroup} disabled={!groupName.trim() || isLoading}>
                {isLoading ? "Creating..." : t('createGroupDialog.createButton')}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('createGroupDialog.createdTitle')}</DialogTitle>
              <DialogDescription>
                {t('createGroupDialog.createdDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2 pt-4">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="link" className="sr-only">
                  {t('joinGroupDialog.groupIdLabel')}
                </Label>
                <Input id="link" value={createdGroupId} readOnly />
              </div>
              <Button
                type="submit"
                size="sm"
                className="px-3"
                onClick={copyToClipboard}
              >
                <span className="sr-only">{t('createGroupDialog.copyButton')}</span>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={closeAndReset}>{t('createGroupDialog.doneButton')}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function JoinGroupDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const [groupId, setGroupId] = useState("");
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleJoinGroup = async () => {
    if (!groupId.trim() || !user) return;
    setIsLoading(true);

    const groupRef = doc(db, "groups", groupId.trim());
    try {
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: t('toasts.groupNotFound'),
        });
        setIsLoading(false);
        return;
      }

      const groupData = groupSnap.data() as Group;
      if (groupData.members.includes(user.uid)) {
        toast({
            description: t('toasts.alreadyMember'),
        });
        setOpen(false);
        setGroupId("");
        setIsLoading(false);
        return;
      }

      const updateData = { members: arrayUnion(user.uid) };
      updateDoc(groupRef, updateData).then(() => {
        toast({
            title: "Success!",
            description: t('toasts.joinSuccess', { groupName: groupSnap.data()?.name }),
        });
        setOpen(false);
        setGroupId("");
      }).catch(error => {
          const permissionError = new FirestorePermissionError({
              path: `groups/${groupId.trim()}`,
              operation: 'update',
              requestResourceData: { members: `arrayUnion(${user.uid})` },
          });
          errorEmitter.emit('permission-error', permissionError);
          toast({
              variant: "destructive",
              title: "Error",
              description: t('toasts.joinError'),
          });
      }).finally(() => {
          setIsLoading(false);
      });

    } catch (error) {
      console.error("Error fetching group document:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: t('toasts.joinError'),
      });
      setIsLoading(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <LogIn className="mr-2 h-4 w-4" /> {t('sidebar.joinGroup')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('joinGroupDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('joinGroupDialog.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="group-id" className="text-right">
              {t('joinGroupDialog.groupIdLabel')}
            </Label>
            <Input
              id="group-id"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="col-span-3"
              placeholder={t('joinGroupDialog.groupIdPlaceholder')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleJoinGroup} disabled={!groupId.trim() || isLoading}>
            {isLoading ? "Joining..." : t('joinGroupDialog.joinButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// This component is no longer used in the sidebar but kept for reference or future use.
// function LeaveGroupDialog({group, onLeave}: {group: Group, onLeave: () => void}) { ... }

    
