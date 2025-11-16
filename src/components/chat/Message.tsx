
"use client";

import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import type { Message as MessageType, UserProfile, Group } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import Image from "next/image";
import { File, MoreHorizontal, Pencil, Trash2, Pin } from "lucide-react";
import { useLanguage } from "@/providers/language-provider";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { doc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
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
            return message.text ? <p className="text-sm">{message.text}</p> : null;
    }
};

export default function Message({ message, group, currentUserId, senderProfile }: MessageProps) {
  const { t } = useLanguage();
  const isCurrentUser = message.senderId === currentUserId;
  const senderName = senderProfile?.displayName || message.senderName;
  const senderPhotoURL = senderProfile?.photoURL || message.senderPhotoURL;
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text || "");

  const canInteract = isCurrentUser;

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
            "flex max-w-sm flex-col gap-1",
            isCurrentUser ? "items-end" : "items-start"
            )}
        >
            <div className={cn("flex items-center gap-2", isCurrentUser ? "flex-row-reverse" : "flex-row")}>
                 <Card
                    className={cn(
                        "rounded-2xl",
                        isCurrentUser
                        ? "rounded-tr-none bg-primary text-primary-foreground"
                        : "rounded-tl-none bg-muted"
                    )}
                    >
                    <CardContent className={cn("p-3", message.contentType === 'image' && "p-1")}>
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
                </Card>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={handlePinMessage}>
                            <Pin className="mr-2 h-4 w-4" />
                            <span>{t('message.pin')}</span>
                        </DropdownMenuItem>
                        {canInteract && (
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
           
            <div className="text-xs text-muted-foreground">
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
