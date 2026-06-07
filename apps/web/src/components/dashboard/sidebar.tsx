"use client";

import {
  BookOpen,
  Building2,
  CalendarClock,
  type LucideIcon,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  FileCheck,
  FileText,
  GraduationCap,
  Home,
  IdCard,
  LayoutGrid,
  LogOut,
  Megaphone,
  MessageSquare,
  School,
  Search,
  Settings,
  Shield,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Route } from "next";

import { Button } from "@uni-exam-sys/ui/components/button";
import { ScrollArea } from "@uni-exam-sys/ui/components/scroll-area";
import { Separator } from "@uni-exam-sys/ui/components/separator";
import { cn } from "@uni-exam-sys/ui/lib/utils";

import {
  type AppRole,
  type SectionId,
  GROUP_LABELS,
  SECTIONS_BY_ROLE,
} from "./sections";

const ICONS: Record<SectionId, LucideIcon> = {
  home: Home,
  profile: UserCog,
  universities: Building2,
  audit: Shield,
  people: Users,
  setup: School,
  timetable: CalendarClock,
  seating: LayoutGrid,
  attendance: ClipboardCheck,
  "id-cards": IdCard,
  results: FileCheck,
  "lecturer-evals": MessageSquare,
  messages: Megaphone,
  complaints: MessageSquare,
  security: Shield,
  reports: FileText,
  settings: Settings,
  "my-id-card": IdCard,
  "my-timetable": CalendarClock,
  "my-seating": LayoutGrid,
  "my-results": FileCheck,
  "register-courses": BookOpen,
  "my-payments": Wallet,
  "evaluate-lecturers": MessageSquare,
  "my-assignments": CalendarClock,
  "mark-attendance": ClipboardCheck,
  "verify-students": Search,
  "my-payments-inv": Wallet,
  "fee-payments": CreditCard,
  "course-reg-payments": CreditCard,
  "invigilator-payments": Wallet,
  "my-courses": BookOpen,
  "upload-results": FileCheck,
  "my-evaluations": MessageSquare,
};

export function SidebarNav({
  role,
  userName,
  userEmail,
  collapsed,
  onToggleCollapse,
  onNavClick,
  modeToggle,
  avatar,
  onSignOut,
  mobile,
}: {
  role: AppRole;
  userName?: string;
  userEmail?: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavClick?: () => void;
  modeToggle: React.ReactNode;
  avatar: React.ReactNode;
  onSignOut: () => void;
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const sections = SECTIONS_BY_ROLE[role];
  const grouped = sections.reduce<Record<string, typeof sections>>(
    (acc, section) => {
      const list = acc[section.group] ?? (acc[section.group] = []);
      list.push(section);
      return acc;
    },
    {},
  );

  const groupOrder: Array<keyof typeof GROUP_LABELS> = [
    "overview",
    "manage",
    "operate",
    "personal",
  ];

  return (
    <>
      {/* Brand */}
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="size-4" />
          </span>
          <span
            className={cn(
              "text-sm font-semibold tracking-tight whitespace-nowrap transition-opacity",
              collapsed ? "opacity-0 w-0" : "opacity-100",
            )}
          >
            AcademeX
          </span>
        </Link>
        {!collapsed ? <div className="shrink-0">{modeToggle}</div> : null}
      </div>

      <ScrollArea className="flex-1 min-h-0 py-4">
        {groupOrder.map((group) => {
          const list = grouped[group];
          if (!list || list.length === 0) return null;
          return (
            <div key={group} className="mb-4 px-3">
              <p
                className={cn(
                  "pb-2 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/50 transition-opacity",
                  collapsed ? "opacity-0 h-0 overflow-hidden pb-0" : "opacity-100",
                )}
              >
                {GROUP_LABELS[group]}
              </p>
              <div className="space-y-0.5">
                {list.map((section) => {
                  const Icon = ICONS[section.id] ?? Home;
                  const isActive = pathname === section.href;
                  return (
                    <Link
                      key={section.id}
                      href={section.href as Route}
                      title={collapsed ? section.label : undefined}
                      onClick={onNavClick}
                      className={cn(
                        "flex items-center rounded-md px-2.5 py-2 text-xs transition-colors",
                        isActive
                          ? "bg-sidebar-primary/10 font-medium text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                        collapsed ? "justify-center" : "gap-2.5",
                      )}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span
                        className={cn(
                          "truncate whitespace-nowrap transition-opacity",
                          collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100 flex-1",
                        )}
                      >
                        {section.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </ScrollArea>

      <Separator />

      {/* Footer: user block + controls */}
      <div className="p-3">
        {/* Profile link: avatar + name + email */}
        <Link
          href={"/dashboard/profile" as Route}
          onClick={onNavClick}
          title={collapsed ? userName ?? "Profile" : undefined}
          aria-label="Open profile"
          className={cn(
            "flex items-center gap-2.5 rounded-md transition-colors hover:bg-sidebar-accent",
            collapsed ? "justify-center px-0 py-1.5" : "px-2 py-1.5",
          )}
        >
          {avatar}
          {userName || userEmail ? (
            <div
              className={cn(
                "min-w-0 flex-1 transition-opacity",
                collapsed ? "hidden opacity-0" : "opacity-100",
              )}
            >
              {userName ? (
                <p className="truncate text-xs font-medium">{userName}</p>
              ) : null}
              {userEmail ? (
                <p className="truncate text-[10px] text-muted-foreground">{userEmail}</p>
              ) : null}
            </div>
          ) : null}
        </Link>

        {/* Mode toggle (collapsed) + Sign out */}
        <div className={cn("mt-1 flex items-center gap-1", collapsed ? "flex-col" : "flex-row")}>
          {collapsed ? modeToggle : null}
          <Button
            variant="destructive"
            size={collapsed ? "icon-sm" : "sm"}
            onClick={onSignOut}
            title="Sign out"
            aria-label="Sign out"
            className={cn("w-full text-xs", collapsed ? "" : "justify-center")}
          >
            <LogOut className="size-3.5" />
            <span className={cn("ml-1.5", collapsed ? "hidden" : "inline")}>
              Sign out
            </span>
          </Button>
        </div>

        {/* Collapse / Expand toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "mt-1 w-full text-xs text-muted-foreground hover:text-foreground",
            collapsed && "px-0",
          )}
          onClick={onToggleCollapse}
          title={mobile ? "Close menu" : collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {mobile ? (
            <>
              <ChevronLeft className="size-4" />
              <span className={cn("ml-1.5", collapsed ? "hidden" : "inline")}>Close</span>
            </>
          ) : collapsed ? (
            <ChevronRight className="size-4" />
          ) : (
            <>
              <ChevronLeft className="size-4" />
              <span className="ml-1.5">Collapse</span>
            </>
          )}
        </Button>
      </div>
    </>
  );
}
