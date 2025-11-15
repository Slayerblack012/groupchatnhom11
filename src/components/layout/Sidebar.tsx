"use client";

import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  arrayUnion,
  getDoc,
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
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import {
  LogOut,
  Plus,
  Users,
  Copy,
  MessageSquare,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function Sidebar({
  onSelectGroup,
  selectedGroupId,
}: {
  onSelectGroup: (groupId: string) => void;
  selectedGroupId: string | null;
}) {
  const { user, signOut } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
          description: "Could not fetch your groups.",
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, toast]);

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
          YOUR GROUPS
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
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={signOut}>
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
  const [groupName, setGroupName] = useState("");
  const [open, setOpen] = useState(false);
  const [createdGroupId, setCreatedGroupId] = useState<string | null>(null);

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !user) return;

    try {
      const docRef = await addDoc(collection(db, "groups"), {
        name: groupName,
        admin: user.uid,
        members: [user.uid],
        createdAt: serverTimestamp(),
      });
      setCreatedGroupId(docRef.id);
    } catch (error) {
      console.error("Error creating group:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create group. Please try again.",
      });
    }
  };

  const copyToClipboard = () => {
    if (!createdGroupId) return;
    navigator.clipboard.writeText(createdGroupId);
    toast({
      title: "Copied!",
      description: "Group ID copied to clipboard.",
    });
  };

  const closeAndReset = () => {
    setOpen(false);
    setGroupName('');
    setCreatedGroupId(null);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <Plus className="mr-2 h-4 w-4" /> Create Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        {!createdGroupId ? (
          <>
            <DialogHeader>
              <DialogTitle>Create a new group</DialogTitle>
              <DialogDescription>
                Enter a name for your new group. You can invite others later.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="group-name" className="text-right">
                  Group Name
                </Label>
                <Input
                  id="group-name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="col-span-3"
                  placeholder="e.g., Project Phoenix"
                />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleCreateGroup} disabled={!groupName.trim()}>
                Create
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Group Created!</DialogTitle>
              <DialogDescription>
                Share this ID with others to let them join your group.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2 pt-4">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="link" className="sr-only">
                  Group ID
                </Label>
                <Input id="link" value={createdGroupId} readOnly />
              </div>
              <Button
                type="submit"
                size="sm"
                className="px-3"
                onClick={copyToClipboard}
              >
                <span className="sr-only">Copy</span>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={closeAndReset}>Done</Button>
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
  const [groupId, setGroupId] = useState("");
  const [open, setOpen] = useState(false);

  const handleJoinGroup = async () => {
    if (!groupId.trim() || !user) return;

    const groupRef = doc(db, "groups", groupId.trim());
    try {
      const groupSnap = await getDoc(groupRef);
      if (!groupSnap.exists()) {
        toast({
          variant: "destructive",
          title: "Not Found",
          description: "No group exists with that ID.",
        });
        return;
      }

      await updateDoc(groupRef, {
        members: arrayUnion(user.uid),
      });

      toast({
        title: "Success!",
        description: `You have joined the group: ${groupSnap.data().name}`,
      });
      setOpen(false);
      setGroupId("");
    } catch (error) {
      console.error("Error joining group:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to join group. Please try again.",
      });
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <LogIn className="mr-2 h-4 w-4" /> Join Group
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Join an existing group</DialogTitle>
          <DialogDescription>
            Enter the Group ID you received to join the chat.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="group-id" className="text-right">
              Group ID
            </Label>
            <Input
              id="group-id"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="col-span-3"
              placeholder="Paste Group ID here"
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleJoinGroup} disabled={!groupId.trim()}>
            Join
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
