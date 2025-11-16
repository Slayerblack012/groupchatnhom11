
"use client";

import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import type { Message as MessageType, UserProfile, Group } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import Image from "next/image";
import { File, MoreHorizontal, Pencil, Trash2, Pin, Smile } from "lucide-react";
import { useLanguage } from "@/providers/language-provider";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { doc, updateDoc, serverTimestamp, deleteDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from '@/providers/auth-provider';

interface MessageProps {
  message: MessageType;
  group: Group;
  currentUserId: string;
  senderProfile?: UserProfile;
}

const renderContent = (message: MessageType, t: (key: string) => string) => {
    switch (message.contentType) {
        case 'image':
            return (
                 <Dialog>
                    <DialogTrigger asChild>
                        <Image
                            src={message.fileUrl!}
                            alt="Uploaded image"
                            width={300}
                            height={300}
                            className="mt-2 rounded-lg cursor-pointer"
                        />
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl p-0">
                        <Image
                            src={message.fileUrl!}
                            alt="Uploaded image"
                            width={1000}
                            height={1000}
                            className="w-full h-auto rounded-lg"
                        />
                    </DialogContent>
                 </Dialog>
            );
        case 'video':
            return (
                <video
                    src={message.fileUrl!}
                    controls
                    className="mt-2 rounded-lg max-w-sm"
                />
            );
        case 'file':
             return (
                <a
                    href={message.fileUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center gap-2 rounded-lg bg-background/20 p-3 text-sm font-medium hover:bg-background/30"
                >
                    <File className="h-6 w-6 flex-shrink-0" />
                    <span className="truncate">{message.fileName || t('message.downloadFile')}</span>
                </a>
            );
        case 'text':
        default:
            return message.text ? <p className="whitespace-pre-wrap text-sm">{message.text}</p> : null;
    }
};

const COMMON_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export default function Message({ message, group, currentUserId, senderProfile }: MessageProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isCurrentUser = message.senderId === currentUserId;
  const senderName = senderProfile?.displayName || message.senderName;
  const senderPhotoURL = senderProfile?.photoURL || message.senderPhotoURL;
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text || "");


  const handleEditSave = async () => {
    if (editedText.trim() === message.text) {
        setIsEditing(false);
        return;
    }
    const messageRef = doc(db, "groups", message.groupId, "messages", message.id);

    const updateData = {
        text: editedText,
        editedAt: serverTimestamp(),
    }

    updateDoc(messageRef, updateData)
        .then(() => {
            setIsEditing(false);
        }).catch(error => {
            const permissionError = new FirestorePermissionError({
                path: messageRef.path,
                operation: 'update',
                requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handleDeleteMessage = async () => {
    const messageRef = doc(db, "groups", message.groupId, "messages", message.id);
    
    deleteDoc(messageRef)
        .catch(error => {
            const permissionError = new FirestorePermissionError({
                path: messageRef.path,
                operation: 'delete',
            });
            errorEmitter.emit('permission-error', permissionError);
        });
  };

  const handlePinMessage = async () => {
    const groupRef = doc(db, "groups", group.id);
    const updateData = {
      pinnedMessage: {
        id: message.id,
        text: message.text,
        contentType: message.contentType,
        senderId: message.senderId,
        senderName: senderName,
      },
    };
    updateDoc(groupRef, updateData)
      .catch(error => {
        const permissionError = new FirestorePermissionError({
          path: groupRef.path,
          operation: 'update',
          requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleReaction = (emoji: string) => {
    if (!user) return;

    const messageRef = doc(db, "groups", message.groupId, "messages", message.id);
    const reactionKey = `reactions.${emoji}`;
    const userHasReacted = message.reactions?.[emoji]?.includes(user.uid);

    let updateData;
    if (userHasReacted) {
      // User is removing their reaction
      updateData = { [reactionKey]: arrayRemove(user.uid) };
    } else {
      // User is adding their reaction
      updateData = { [reactionKey]: arrayUnion(user.uid) };
    }

    updateDoc(messageRef, updateData)
      .catch(error => {
        const permissionError = new FirestorePermissionError({
            path: messageRef.path,
            operation: 'update',
            requestResourceData: updateData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };


  return (
    <div
      className={cn(
        "group flex animate-message-in items-start gap-3",
        isCurrentUser ? "flex-row-reverse" : "flex-row"
      )}
      id={`message-${message.id}`}
    >
        <Avatar className="h-8 w-8">
            <AvatarImage src={senderPhotoURL || undefined} alt={senderName || undefined} />
            <AvatarFallback>
            {senderName?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
        </Avatar>
        <div
            className={cn(
            "flex max-w-[80%] flex-col gap-1 sm:max-w-sm",
            isCurrentUser ? "items-end" : "items-start"
            )}
        >
            <div className={cn("flex items-center gap-2", isCurrentUser ? "flex-row-reverse" : "flex-row")}>
                 <Card
                    className={cn(
                        "rounded-2xl relative",
                        isCurrentUser
                        ? "rounded-tr-none bg-primary text-primary-foreground"
                        : "rounded-tl-none bg-muted"
                    )}
                    >
                    <CardContent className={cn("p-3 break-words", message.contentType === 'image' && "p-1")}>
                         {isEditing ? (
                            <div className="space-y-2">
                                <Input 
                                    value={editedText}
                                    onChange={(e) => setEditedText(e.target.value)}
                                    className="text-sm bg-background/20 border-0"
                                />
                                <div className="flex justify-end gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>{t('message.cancelEdit')}</Button>
                                    <Button size="sm" onClick={handleEditSave}>{t('message.saveEdit')}</Button>
                                </div>
                            </div>
                        ) : (
                            renderContent(message, t)
                        )}
                    </CardContent>
                    {message.reactions && Object.keys(message.reactions).length > 0 && (
                        <div className={cn(
                            "absolute -bottom-4 flex gap-1",
                            isCurrentUser ? "right-2" : "left-2"
                        )}>
                            {Object.entries(message.reactions).filter(([, uids]) => uids.length > 0).map(([emoji, uids]) => (
                                <button
                                    key={emoji}
                                    onClick={() => handleReaction(emoji)}
                                    className={cn(
                                        "rounded-full border bg-background px-2 py-0.5 text-xs shadow-sm flex items-center gap-1",
                                        uids.includes(currentUserId) ? "border-primary bg-primary/10" : "border-border"
                                    )}
                                >
                                    <span>{emoji}</span>
                                    <span>{uids.length}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </Card>
                
                <div className="opacity-0 group-hover:opacity-100 flex items-center">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <Smile className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-1">
                            <div className="flex gap-1">
                                {COMMON_REACTIONS.map(emoji => (
                                    <Button
                                        key={emoji}
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleReaction(emoji)}
                                        className="text-lg"
                                    >
                                        {emoji}
                                    </Button>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                        <DropdownMenuItem onClick={handlePinMessage}>
                                <Pin className="mr-2 h-4 w-4" />
                                <span>{t('message.pin')}</span>
                            </DropdownMenuItem>
                            {isCurrentUser && (
                            <>
                                <DropdownMenuSeparator />
                                {message.contentType === 'text' && (
                                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        <span>{t('message.edit')}</span>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={handleDeleteMessage} className="text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>{t('message.delete')}</span>
                                </DropdownMenuItem>
                            </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
           
            <div className={cn("pt-5 text-xs text-muted-foreground", message.reactions && Object.keys(message.reactions).length > 0 ? "pt-5" : "pt-1")}>
            <span className="font-medium">
                {isCurrentUser ? t('message.you') : senderName}
            </span>
            {" · "}
            {message.createdAt
                ? format(message.createdAt.toDate(), "p")
                : t('message.sending')}
             {message.editedAt && <span className="text-muted-foreground/80"> ({t('message.edited')})</span>}
            </div>
        </div>
    </div>
  );
}
