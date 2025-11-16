
"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Message as MessageType, Group, UserProfile } from "@/types";
import { useAuth } from "@/providers/auth-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import Message from "@/components/chat/Message";
import MessageInput from "@/components/chat/MessageInput";
import ChatHeader from "@/components/chat/ChatHeader";
import TypingIndicator from "./TypingIndicator";
import { Timestamp } from "firebase/firestore";

interface TypingUser {
  name: string;
  uid: string;
}

export default function ChatView({ groupId, onGroupLeft }: { groupId: string, onGroupLeft: () => void; }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const groupRef = doc(db, "groups", groupId);
    const unsubscribeGroup = onSnapshot(groupRef, (docSnap) => {
      if (docSnap.exists()) {
        const groupData = { id: docSnap.id, ...docSnap.data() } as Group;
        // Check if user is still a member
        if (!groupData.members.includes(user.uid)) {
          onGroupLeft();
          setGroup(null);
        } else {
          setGroup(groupData);
        }
      } else {
        setGroup(null);
        onGroupLeft();
      }
    });

    const messagesQuery = query(
      collection(db, "groups", groupId, "messages"),
      orderBy("createdAt", "asc")
    );
    
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        const newMessages = snapshot.docs.map(
          (doc: any) => ({ id: doc.id, ...doc.data() } as MessageType)
        );
        setMessages(newMessages);
        setLoading(false);
    });

    // Typing indicator listener
    const typingRef = collection(db, "groups", groupId, "typing");
    const unsubscribeTyping = onSnapshot(typingRef, (snapshot) => {
        const now = Timestamp.now();
        const typing: TypingUser[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // User is typing if their timestamp is recent (within 3 seconds)
            if (data.timestamp && (now.seconds - data.timestamp.seconds < 3) && doc.id !== user.uid) {
                typing.push({ uid: doc.id, name: data.name });
            }
        });
        setTypingUsers(typing);
    });

    return () => {
        unsubscribeGroup();
        unsubscribeMessages();
        unsubscribeTyping();
    }
  }, [groupId, user, onGroupLeft]);

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            setTimeout(() => {
                viewport.scrollTop = viewport.scrollHeight;
            }, 100);
        }
    }
  }, [messages, loading]);
  
    useEffect(() => {
    const fetchMemberData = async () => {
        if (!group) return;
        const memberIds = group.members;
        const memberData: Record<string, UserProfile> = {};
        for(const id of memberIds){
            const userSnap = await getDoc(doc(db, 'users', id));
            if(userSnap.exists()){
                memberData[id] = userSnap.data() as UserProfile;
            }
        }
        setMembers(memberData);
    }
    fetchMemberData();
  }, [group]);


  if (loading || !user || !group) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center p-4 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="ml-4 space-y-2">
            <Skeleton className="h-4 w-[250px]" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-12 w-1/2 ml-auto" />
            <Skeleton className="h-12 w-2/3" />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen flex-col telegram-bg">
      <ChatHeader group={group} onGroupLeft={onGroupLeft}/>
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-4 space-y-4">
            {loading ? (
                <div className="space-y-4">
                    <Skeleton className="h-16 w-3/4" />
                    <Skeleton className="h-20 w-1/2 ml-auto" />
                    <Skeleton className="h-16 w-2/3" />
                </div>
            ) : (
                messages.map((message) => (
                    <Message key={message.id} message={message} currentUserId={user.uid} allMembers={members}/>
                ))
            )}
        </div>
      </ScrollArea>
      <div className="border-t p-4 bg-background">
        <MessageInput groupId={groupId} />
        <TypingIndicator users={typingUsers} />
      </div>
    </div>
  );
}
