import { MessageSquare } from "lucide-react";

export default function Welcome() {
  return (
    <div className="flex h-full flex-col items-center justify-center bg-background p-8 text-center">
      <MessageSquare className="h-24 w-24 text-muted-foreground/50" />
      <h2 className="mt-6 text-2xl font-semibold">Welcome to groupchat</h2>
      <p className="mt-2 text-muted-foreground">
        Select a group from the sidebar to start chatting,
        <br />
        or create a new group to get started.
      </p>
    </div>
  );
}
