"use client";

import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Welcome from "@/components/chat/Welcome";
import ChatView from "@/components/chat/ChatView";
import SettingsView from "@/components/settings/SettingsView";

export type View = 'chat' | 'settings' | 'welcome';

export default function AppLayout() {
  const [currentView, setCurrentView] = useState<View>('welcome');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const handleSelectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setCurrentView('chat');
  };

  const handleSelectSettings = () => {
    setSelectedGroupId(null);
    setCurrentView('settings');
  };

  const handleGroupLeft = () => {
    setSelectedGroupId(null);
    setCurrentView('welcome');
  }

  const renderContent = () => {
    switch (currentView) {
      case 'chat':
        return selectedGroupId ? <ChatView key={selectedGroupId} groupId={selectedGroupId} onGroupLeft={handleGroupLeft} /> : <Welcome />;
      case 'settings':
        return <SettingsView />;
      case 'welcome':
      default:
        return <Welcome />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <Sidebar 
        onSelectGroup={handleSelectGroup} 
        selectedGroupId={selectedGroupId}
        onSelectSettings={handleSelectSettings} 
      />
      <main className="flex flex-1 flex-col">
        {renderContent()}
      </main>
    </div>
  );
}
