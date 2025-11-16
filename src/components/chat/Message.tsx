
"use client";

import React from 'react';
import { cn } from "@/lib/utils";
import type { Message as MessageType, UserProfile } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import Image from "next/image";
import { File, Video, Lock } from "lucide-react";
import { useLanguage } from "@/providers/language-provider";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface MessageProps {
  message: MessageType;
  currentUserId: string;
  allMembers: Record<string, UserProfile>;
}

const renderContent = (message: MessageType, t: (key: string) => string) => {
    const textWithMentions = message.text?.split(/(@\w+(\s\w+)*)/g).map((part, index) => {
        if (part.startsWith('@')) {
            return <strong key={index} className="text-blue-400">{part}</strong>;
        }
        return part;
    });

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
            return message.text ? <p className="text-sm">{textWithMentions}</p> : null;
    }
};

export default function Message({ message, currentUserId, allMembers }: MessageProps) {
  const { t } = useLanguage();
  const isCurrentUser = message.senderId === currentUserId;
  const isPrivate = !!message.visibleTo && message.visibleTo.length > 0;

  const getVisibilityText = () => {
    if (!isPrivate) return null;
    const recipientNames = message.visibleTo!
      .filter(uid => uid !== message.senderId)
      .map(uid => allMembers[uid]?.displayName || 'Unknown')
      .join(', ');
    return `Private to ${recipientNames}`;
  };

  return (
    <div
      className={cn(
        "flex animate-message-in items-start gap-3",
        isCurrentUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <Avatar className="h-8 w-8">
        <AvatarImage src={message.senderPhotoURL} alt={message.senderName} />
        <AvatarFallback>
          {message.senderName?.charAt(0).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "flex max-w-sm flex-col gap-1",
          isCurrentUser ? "items-end" : "items-start"
        )}
      >
        {isPrivate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Lock className="h-3 w-3" />
            <span>{getVisibilityText()}</span>
          </div>
        )}
        <Card
          className={cn(
            "rounded-2xl",
            isCurrentUser
              ? "rounded-tr-none bg-primary text-primary-foreground"
              : "rounded-tl-none bg-muted"
          )}
        >
          <CardContent className={cn("p-3", message.contentType === 'image' && "p-1")}>
            {renderContent(message, t)}
          </CardContent>
        </Card>
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">
            {isCurrentUser ? t('message.you') : message.senderName}
          </span>
          {" · "}
          {message.createdAt
            ? format(message.createdAt.toDate(), "p")
            : t('message.sending')}
        </div>
      </div>
    </div>
  );
}
