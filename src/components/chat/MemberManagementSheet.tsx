
"use client";

import { useState, useEffect, useRef } from "react";
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
  limit,
  startAt,
  endAt,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import {
    ref,
    uploadBytesResumable,
    getDownloadURL,
} from "firebase/storage";
import { db, storage } from "@/lib/firebase/config";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings, UserX, Copy, Camera } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { useLanguage } from "@/providers/language-provider";
import { Label } from "../ui/label";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { Separator } from "../ui/separator";
import { compressImage } from "@/lib/image-compression";

interface MemberManagementSheetProps {
  group: Group;
}

export default function MemberManagementSheet({ group: initialGroup }: MemberManagementSheetProps) {
  const { user: currentUser } = useAuth();
  const [group, setGroup] = useState(initialGroup);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [groupName, setGroupName] = useState(group.name);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openSheet, setOpenSheet] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();
  const isAdmin = currentUser?.uid === group.admin;

  useEffect(() => {
    setGroup(initialGroup);
    setGroupName(initialGroup.name);
  }, [initialGroup]);

  useEffect(() => {
    const fetchMembers = async () => {
      if (!group?.members) return;
      setLoadingMembers(true);
      try {
        const memberProfiles: UserProfile[] = [];
        const memberChunks: string[][] = [];
        for (let i = 0; i < group.members.length; i += 30) {
            memberChunks.push(group.members.slice(i, i + 30));
        }

        for (const chunk of memberChunks) {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("uid", "in", chunk));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                memberProfiles.push(doc.data() as UserProfile);
            });
        }
        setMembers(memberProfiles);
      } catch (error) {
          console.error("Error fetching members:", error);
          toast({ variant: "destructive", title: "Error", description: t('toasts.fetchMembersError') });
      } finally {
        setLoadingMembers(false);
      }
    };
    if (openSheet) {
      fetchMembers();
    }
  }, [group.members, toast, openSheet]);

  useEffect(() => {
    const searchUsers = async () => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const usersRef = collection(db, "users");
            const q = query(
                usersRef, 
                orderBy("email"), 
                startAt(searchQuery.toLowerCase()), 
                endAt(searchQuery.toLowerCase() + '\uf8ff'),
                limit(10)
            );
            const querySnapshot = await getDocs(q);
            const users = querySnapshot.docs.map(doc => doc.data() as UserProfile);
            setSearchResults(users.filter(u => u.uid !== currentUser?.uid));
        } catch (error) {
            console.error("Error searching users:", error);
            toast({ variant: "destructive", title: "Error", description: t('toasts.userSearchError') });
        } finally {
            setIsSearching(false);
        }
    };

    const debounceTimer = setTimeout(() => {
      if (openSheet) {
        searchUsers();
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
}, [searchQuery, currentUser?.uid, toast, openSheet]);


  const handleAddMember = async (userToAdd: UserProfile) => {
      if (group.members.includes(userToAdd.uid)) {
        toast({ description: t('toasts.userAlreadyInGroup') });
        return;
      }
      
      const groupRef = doc(db, "groups", group.id);
      const updateData = { members: arrayUnion(userToAdd.uid) };

      updateDoc(groupRef, updateData)
        .then(() => {
          setGroup(prev => ({ ...prev, members: [...prev.members, userToAdd.uid]}));
          setMembers(prev => [...prev, userToAdd]);
          setSearchQuery("");
          setSearchResults([]);
          toast({ title: t('toasts.success'), description: t('toasts.memberAdded', { displayName: userToAdd.displayName || 'user' }) });
        })
        .catch(error => {
          const permissionError = new FirestorePermissionError({
              path: `groups/${group.id}`,
              operation: 'update',
              requestResourceData: updateData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (memberId === group.admin) {
        toast({ variant: "destructive", description: t('toasts.cannotRemoveAdmin') });
        return;
    }

    const groupRef = doc(db, "groups", group.id);
    const updateData = { members: arrayRemove(memberId) };
    
    updateDoc(groupRef, updateData)
      .then(() => {
        setGroup(prev => ({ ...prev, members: prev.members.filter(id => id !== memberId)}));
        setMembers(prev => prev.filter(m => m.uid !== memberId));
        toast({ title: t('toasts.success'), description: t('toasts.memberRemoved') });
      })
      .catch(error => {
        const permissionError = new FirestorePermissionError({
            path: groupRef.path,
            operation: 'update',
            requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const copyGroupIdToClipboard = () => {
    navigator.clipboard.writeText(group.id);
    toast({
      title: t('toasts.groupIdCopied'),
      description: `ID: ${group.id}`,
    });
  };

  const handleGroupNameChange = async () => {
    if (groupName.trim() === group.name || !groupName.trim()) {
        return;
    }
    const groupRef = doc(db, "groups", group.id);
    const updateData = { name: groupName.trim() };
    try {
        await updateDoc(groupRef, updateData);
        toast({ title: t('toasts.success'), description: t('toasts.groupNameUpdated') });
    } catch (error) {
        console.error("Error updating group name:", error);
        const permissionError = new FirestorePermissionError({
            path: groupRef.path,
            operation: 'update',
            requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
        const compressedFile = await compressImage(file);
        const storageRef = ref(storage, `group_avatars/${group.id}/${file.name}`);
        const uploadTask = uploadBytesResumable(storageRef, compressedFile);

        uploadTask.on('state_changed', 
            null,
            (error) => {
                console.error("Upload failed:", error);
                toast({ variant: "destructive", title: t('toasts.uploadFailed') });
                setIsUploading(false);
            },
            async () => {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                const groupRef = doc(db, "groups", group.id);
                const updateData = { photoURL: downloadURL };
                updateDoc(groupRef, updateData)
                  .then(() => {
                    setGroup(prev => ({ ...prev, photoURL: downloadURL }));
                    toast({ title: t('toasts.success'), description: t('toasts.groupAvatarUpdated')});
                    setIsUploading(false);
                  }).catch(error => {
                     const permissionError = new FirestorePermissionError({
                        path: groupRef.path,
                        operation: 'update',
                        requestResourceData: updateData,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                    setIsUploading(false);
                  });
            }
        );
    } catch (error) {
        console.error("Error handling avatar change:", error);
        toast({ variant: "destructive", title: "Error", description: t('toasts.avatarUpdateError') });
        setIsUploading(false);
    }
  };

 const handleDeleteGroup = async () => {
    const groupRef = doc(db, "groups", group.id);
    try {
      await deleteDoc(groupRef);
      toast({
        title: t('toasts.success'),
        description: t('toasts.groupDeleted', { groupName: group.name }),
      });
      setOpenSheet(false);
      // The onGroupLeft prop will be triggered by ChatView's listener
    } catch (error) {
      console.error("Error deleting group:", error);
      const permissionError = new FirestorePermissionError({
        path: groupRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    }
  };


  return (
    <Sheet open={openSheet} onOpenChange={setOpenSheet}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
          <span className="sr-only">{t('memberManagement.title')}</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>{t('memberManagement.title')}</SheetTitle>
          <SheetDescription>
            {t('memberManagement.description', { groupName: group.name })}
          </SheetDescription>
        </SheetHeader>

        {isAdmin && (
          <>
            <div className="py-4 space-y-4">
                <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <AvatarImage src={group.photoURL} />
                        <AvatarFallback>
                            <Camera className="h-6 w-6"/>
                        </AvatarFallback>
                    </Avatar>
                    <Input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarChange}
                        className="hidden"
                        accept="image/*"
                        disabled={isUploading}
                    />
                    <Input 
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        onBlur={handleGroupNameChange}
                        className="text-lg font-semibold"
                        disabled={isUploading}
                    />
                </div>
            </div>
            <Separator />
          </>
        )}

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
        <Separator />
        {isAdmin && (
          <div className="py-4">
            <h3 className="mb-2 text-sm font-semibold">{t('memberManagement.addMember')}</h3>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={t('memberManagement.addMemberPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="mt-2 space-y-2">
                {isSearching && <Skeleton className="h-12 w-full"/>}
                {!isSearching && searchResults.map(user => (
                    <div key={user.uid} className="flex items-center justify-between rounded-md border p-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                              <AvatarImage src={user.photoURL || ""} alt={user.displayName || ""} />
                              <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                              <p className="text-sm font-medium">{user.displayName}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => handleAddMember(user)}>
                            <Plus className="h-4 w-4 mr-2"/> Add
                        </Button>
                    </div>
                ))}
                {!isSearching && searchResults.length === 0 && searchQuery && (
                    <p className="text-sm text-muted-foreground text-center py-2">{t('toasts.userNotFound')}</p>
                )}
            </div>
          </div>
        )}
        <Separator />
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
                    {isAdmin && currentUser?.uid !== member.uid && (
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

        {isAdmin && (
          <>
            <Separator />
            <div className="py-4">
              <h3 className="mb-2 text-sm font-semibold text-destructive">
                {t('memberManagement.dangerZone')}
              </h3>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full">
                    {t('memberManagement.deleteGroupButton')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('deleteGroupDialog.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('deleteGroupDialog.description', { groupName: group.name })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('deleteGroupDialog.cancelButton')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteGroup}>
                      {t('deleteGroupDialog.confirmButton')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

    