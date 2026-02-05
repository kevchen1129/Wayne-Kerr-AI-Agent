"use client";

import { ReactNode } from "react";
import { Sidebar, ToolOption } from "@/components/Sidebar";
import { Thread } from "@/lib/types";

export type ChatLayoutProps = {
  tools: ToolOption[];
  activeToolId: ToolOption["id"];
  onSelectTool: (id: ToolOption["id"]) => void;
  brand: {
    name: string;
    subtitle?: string;
    logoSrc: string;
  };
  labels: {
    coreWorkflows: string;
    newChat: string;
    recentChats: string;
    updated: string;
    prototypeNote: string;
  };
  threads: Thread[];
  activeThreadId: string;
  sidebarOpen: boolean;
  onCloseSidebar: () => void;
  onNewThread: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
  children: ReactNode;
};

export function ChatLayout({
  tools,
  activeToolId,
  onSelectTool,
  brand,
  labels,
  threads,
  activeThreadId,
  sidebarOpen,
  onCloseSidebar,
  onNewThread,
  onSelectThread,
  onDeleteThread,
  children
}: ChatLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      <Sidebar
        tools={tools}
        activeToolId={activeToolId}
        onSelectTool={onSelectTool}
        brand={brand}
        labels={labels}
        threads={threads}
        activeThreadId={activeThreadId}
        isOpen={sidebarOpen}
        onClose={onCloseSidebar}
        onNewThread={onNewThread}
        onSelectThread={onSelectThread}
        onDeleteThread={onDeleteThread}
      />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
