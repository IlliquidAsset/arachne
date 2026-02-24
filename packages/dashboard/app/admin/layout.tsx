"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "General", icon: "⚙️" },
  { href: "/admin/security", label: "Security", icon: "🔒" },
  { href: "/admin/skills", label: "Skills", icon: "🧩" },
  { href: "/admin/workflows", label: "Workflows", icon: "⚡" },
  { href: "/admin/voice", label: "Voice", icon: "🎤" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full">
      <nav className="w-56 border-r border-border bg-muted/30 p-4 flex flex-col gap-1">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/chat" className="text-muted-foreground hover:text-foreground text-sm">&larr; Chat</Link>
        </div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2 px-2">Settings</h2>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <main className="flex-1 p-6 overflow-auto">{children}</main>
    </div>
  );
}
