"use client";

import React, { ReactNode } from "react";
import { NostrProvider } from "~/providers/nostr-provider"; // Adjust path if needed
import { FeedProvider, useFeedContext } from "./FeedContext"; // Corrected path
import Feed from "./feed";
import LeftSidebar from "./leftsidebar";
import { Plus } from "lucide-react";

interface LayoutShellProps {
  children: ReactNode;
}

export default function LayoutShell({ children }: LayoutShellProps) {
  return (
    <NostrProvider>
      <FeedProvider>
        <ShellContent>{children}</ShellContent>
      </FeedProvider>
    </NostrProvider>
  );
}

function ShellContent({ children }: LayoutShellProps) {
  const { addPost } = useFeedContext(); // Use useFeedContext for type safety

  const handlePost = () => {
    const txt = prompt("What’s on your mind?");
    if (txt) addPost(txt);
  };

  return (
    <div className="flex flex-col md:flex-row h-full w-full">
      {/* ─── LEFT NAV ─── */}
      <aside className="hidden md:flex flex-none w-64 bg-background border-r border-border">
        <LeftSidebar />
      </aside>

      {/* ─── CENTER SPLIT ─── */}
      <div className="flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Feed Pane */}
        <aside className="flex flex-col flex-1 bg-muted border-r border-border">
          <div className="sticky top-0 z-10 flex items-center justify-between bg-muted px-4 py-3 border-b border-border">
            <h2 className="text-2xl font-bold text-foreground">Feed</h2>
            <button
              onClick={handlePost}
              aria-label="New post"
              className="p-2 bg-accent text-foreground rounded-full hover:opacity-90 transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <Feed />
          </div>
        </aside>

        {/* Blocks Workspace */}
        <main className="flex-1 bg-background p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}