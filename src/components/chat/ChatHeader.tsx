"use client";

import { useAuth } from "@/providers/auth-provider";
import type { Group } from "@/types";
import { Users } from "lucide-react";
import MemberManagementSheet from "./MemberManagementSheet";

interface ChatHeaderProps {
  group: Group;
}

export default function ChatHeader({ group }: ChatHeaderProps) {
  const { user } = useAuth();
  const isAdmin = user?.uid === group.admin;

  return (
    <div className="flex items-center justify-between border-b p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <Users className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">{group.name}</h2>
          <p className="text-xs text-muted-foreground">
            {group.members.length} member
            {group.members.length > 1 ? "s" : ""}
          </p>
        </div>
      </div>
      {isAdmin && <MemberManagementSheet group={group} />}
    </div>
  );
}
