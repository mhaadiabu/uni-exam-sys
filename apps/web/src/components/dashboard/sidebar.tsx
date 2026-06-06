"use client";

import {
  BookOpen,
  Building2,
  CalendarClock,
  type LucideIcon,
  ClipboardCheck,
  CreditCard,
  FileCheck,
  FileText,
  GraduationCap,
  Home,
  IdCard,
  LayoutGrid,
  Lock,
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

import { useClerk } from "@clerk/nextjs";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import { ScrollArea } from "@uni-exam-sys/ui/components/scroll-area";
import { Separator } from "@uni-exam-sys/ui/components/separator";
import { cn } from "@uni-exam-sys/ui/lib/utils";

import { roleLabel } from "@/lib/utils";

import {
  type AppRole,
  type SectionDef,
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

export function Sidebar({
  role,
  userName,
  userEmail,
}: {
  role: AppRole;
  userName?: string;
  userEmail?: string;
}) {
  const clerk = useClerk();
  const pathname = usePathname();
  const sections = SECTIONS_BY_ROLE[role];
  const grouped = sections.reduce<Record<string, SectionDef[]>>(
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
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r bg-card/40 backdrop-blur-sm lg:flex">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="size-4" />
          </span>
          <span className="font-serif text-sm font-medium">AcademeX</span>
        </Link>
        <Badge variant="secondary" className="ml-auto text-[10px] uppercase tracking-wider">
          {roleLabel(role)}
        </Badge>
      </div>
      <ScrollArea className="flex-1 px-2 py-3">
        {groupOrder.map((group) => {
          const list = grouped[group];
          if (!list || list.length === 0) return null;
          return (
            <div key={group} className="mb-4">
              <p className="px-3 pb-1.5 pt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
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
                      className={cn(
                        "flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-xs transition-colors",
                        isActive
                          ? "bg-primary/10 font-medium text-primary"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <Icon className="mt-0.5 size-3.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{section.label}</p>
                        {section.description ? (
                          <p className="truncate text-[10px] font-normal text-muted-foreground">
                            {section.description}
                          </p>
                        ) : null}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </ScrollArea>
      <Separator />
      <div className="p-3">
        {userName ? (
          <p className="truncate px-2 text-xs font-medium">{userName}</p>
        ) : null}
        {userEmail ? (
          <p className="truncate px-2 text-[10px] text-muted-foreground">{userEmail}</p>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-xs"
            render={<Link href={"/dashboard/profile" as Route} />}
          >
            <UserCog className="mr-1 size-3" />
            Profile
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-xs"
            onClick={() => void clerk.signOut()}
          >
            <Lock className="mr-1 size-3" />
            Sign out
          </Button>
        </div>
      </div>
    </aside>
  );
}
