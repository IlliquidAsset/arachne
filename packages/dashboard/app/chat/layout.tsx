"use client";
import type { ReactNode } from "react";
import { VoiceButton } from "@/app/components/voice-button";

export default function ChatLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex relative">
      {children}
      <VoiceButton />
    </div>
  );
}
