"use client";

import { cn } from "@/lib/utils";
import type { Message as MessageType } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import Image from "next/image";
import { File } from "lucide-react";

interface MessageProps {
  message: MessageType;
  currentUserId: string;
}

export default function Message({ message, currentUserId }: MessageProps) {
  const isCurrentUser = message.senderId === currentUserId;

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
        <Card
          className={cn(
            "rounded-2xl",
            isCurrentUser
              ? "rounded-tr-none bg-primary text-primary-foreground"
              : "rounded-tl-none bg-muted"
          )}
        >
          <CardContent className="p-3">
            {message.text && <p className="text-sm">{message.text}</p>}
            {message.imageUrl && (
              <Image
                src={message.imageUrl}
                alt="Uploaded image"
                width={300}
                height={300}
                className="mt-2 rounded-lg"
              />
            )}
            {message.fileUrl && (
              <a
                href={message.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex items-center gap-2 text-sm font-medium text-blue-500 hover:underline"
              >
                <File className="h-4 w-4" />
                <span>{message.fileName || "Download File"}</span>
              </a>
            )}
          </CardContent>
        </Card>
        <div className="text-xs text-muted-foreground">
          <span className="font-medium">
            {isCurrentUser ? "You" : message.senderName}
          </span>
          {" · "}
          {message.createdAt
            ? format(message.createdAt.toDate(), "p")
            : "sending..."}
        </div>
      </div>
    </div>
  );
}
