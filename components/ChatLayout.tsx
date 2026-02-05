"use client";

import { ReactNode } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Thread } from "@/lib/types";

export type ChatLayoutProps = {
  brand: {
    name: string;
    subtitle?: string;
    logoSrc: string;
  };
  labels: {
    newChat: string;
    recentChats: string;
    updated: string;
    prototypeNote: string;
    searchChats: string;
    share: string;
    rename: string;
    delete: string;
    save: string;
    cancel: string;
    renamePlaceholder: string;
  };
  threads: Thread[];
  activeThreadId: string;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
  onSelectThread: (id: string) => void;
  onNewChat: () => void;
  onDeleteThread: (id: string) => void;
  onRenameThread: (id: string, title: string) => void;
  onShareThread: (id: string) => void;
  children: ReactNode;
};

export function ChatLayout({
  brand,
  labels,
  threads,
  activeThreadId,
  sidebarOpen,
  onCloseSidebar,
  onSelectThread,
  onNewChat,
  onDeleteThread,
  onRenameThread,
  onShareThread,
  children
}: ChatLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        brand={brand}
        labels={labels}
        threads={threads}
        activeThreadId={activeThreadId}
        isOpen={sidebarOpen}
        onClose={onCloseSidebar}
        onSelectThread={onSelectThread}
        onNewChat={onNewChat}
        onDeleteThread={onDeleteThread}
        onRenameThread={onRenameThread}
        onShareThread={onShareThread}
      />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
