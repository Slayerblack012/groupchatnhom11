"use client";

import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Welcome from "@/components/chat/Welcome";
import ChatView from "@/components/chat/ChatView";

export default function AppLayout() {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <Sidebar onSelectGroup={setSelectedGroupId} selectedGroupId={selectedGroupId} />
      <main className="flex flex-1 flex-col">
        {selectedGroupId ? (
          <ChatView key={selectedGroupId} groupId={selectedGroupId} />
        ) : (
          <Welcome />
        )}
      </main>
    </div>
  );
}
