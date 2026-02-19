"use client";

import { useState } from "react";
import { useGetIdentity, useLogout } from "@refinedev/core";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { VoiceButton } from "./components/voice-button";

const NAV_ITEMS = [
  { path: "/dashboard", label: "Dashboard", adminOnly: false },
  { path: "/tasks", label: "Tasks", adminOnly: false },
  { path: "/skills", label: "Skills", adminOnly: false },
  { path: "/settings", label: "Settings", adminOnly: true },
] as const;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: identity } = useGetIdentity<{
    id: string;
    name: string;
    role: string;
  }>();
  const { mutate: logout } = useLogout();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = (identity?.role as "admin" | "viewer") || "viewer";
  const visibleItems =
    role === "admin"
      ? NAV_ITEMS
      : NAV_ITEMS.filter((item) => !item.adminOnly);

  function NavContent() {
    return (
      <nav className="flex flex-col gap-1 p-4">
        {visibleItems.map((item) => (
          <Link
            key={item.path}
            href={item.path}
            className={`px-3 py-2 rounded-md text-sm transition-colors ${
              pathname === item.path
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            onClick={() => setSidebarOpen(false)}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 hidden lg:flex h-full w-56 flex-col border-r border-border bg-card">
        <div className="p-4 font-semibold text-lg text-foreground">
          Arachne
        </div>
        <Separator />
        <NavContent />
      </aside>

      {/* Main area offset by sidebar on desktop */}
      <div className="lg:pl-56">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-card/80 backdrop-blur px-4">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                data-testid="hamburger"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                >
                  <title>Menu</title>
                  <path
                    d="M3 5h14M3 10h14M3 15h14"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-56 p-0 bg-card">
              <div className="p-4 font-semibold text-lg">Arachne</div>
              <Separator />
              <NavContent />
            </SheetContent>
          </Sheet>

          <span className="font-semibold lg:hidden">Arachne</span>
          <div className="flex-1" />

          {identity && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{role}</Badge>
              <Button variant="ghost" size="sm" onClick={() => logout()}>
                Logout
              </Button>
            </div>
          )}
        </header>

        {/* Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>

      <VoiceButton />
    </div>
  );
}
