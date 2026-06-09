"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Inbox, Mail, Megaphone, Send, User } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import { Input } from "@uni-exam-sys/ui/components/input";
import { ScrollArea } from "@uni-exam-sys/ui/components/scroll-area";
import { Separator } from "@uni-exam-sys/ui/components/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@uni-exam-sys/ui/components/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@uni-exam-sys/ui/components/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@uni-exam-sys/ui/components/table";

import { formatDateTime, roleLabel } from "@/lib/utils";

type RoleScope = "all" | "admin" | "lecturer" | "student" | "invigilator" | "finance" | "super_admin";

const RECIPIENT_COUNT_CACHE: Record<RoleScope, string> = {
  all: "Everyone in this university",
  admin: "University admins",
  lecturer: "Lecturers",
  student: "Students",
  invigilator: "Invigilators",
  finance: "Finance officers",
  super_admin: "Super admins",
};

export default function MessagesPage() {
  const me = useMe();
  const [recipientId, setRecipientId] = useState<Id<"users"> | "">("");
  const [recipientRole, setRecipientRole] = useState<RoleScope>("student");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState<"direct" | "broadcast" | null>(null);

  const messages = useQuery(
    api.communications.listMessages,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];
  const notifications = useQuery(
    api.communications.listNotifications,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) ?? [];

  const users = useQuery(api.users.listUsers, me.universityId ? { universityId: me.universityId } : "skip") ?? [];

  const sendDirect = useMutation(api.communications.sendDirectMessage);
  const broadcast = useMutation(api.communications.broadcastMessage);

  const { direct, broadcasts } = useMemo(() => {
    return {
      direct: messages.filter((m) => m.type === "direct"),
      broadcasts: messages.filter((m) => m.type === "broadcast"),
    };
  }, [messages]);

  const recipientCount = useMemo(() => {
    if (recipientRole === "all") return users.length;
    const roleKey =
      recipientRole === "admin" ? "university_admin" : recipientRole;
    return users.filter((u) => u.role === roleKey).length;
  }, [users, recipientRole]);

  const subjectBodyReady = subject.trim().length > 0 && body.trim().length > 0;
  const pickedRecipient = recipientId
    ? users.find((u) => u._id === recipientId)?.fullName ?? "Recipient"
    : null;

  async function sendDirectMessage() {
    if (!me.universityId) return;
    if (!subjectBodyReady) {
      toast.error("Subject and body are required.");
      return;
    }
    if (!recipientId) {
      toast.error("Pick a recipient first.");
      return;
    }
    setBusy("direct");
    try {
      await sendDirect({
        universityId: me.universityId,
        recipientUserId: recipientId,
        subject: subject.trim(),
        body: body.trim(),
      });
      toast.success(`Message sent to ${pickedRecipient}.`);
      setSubject("");
      setBody("");
      setRecipientId("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message.");
    } finally {
      setBusy(null);
    }
  }

  async function sendBroadcast() {
    if (!me.universityId) return;
    if (!subjectBodyReady) {
      toast.error("Subject and body are required.");
      return;
    }
    if (recipientCount === 0) {
      toast.error(`No recipients found for ${RECIPIENT_COUNT_CACHE[recipientRole]}.`);
      return;
    }
    setBusy("broadcast");
    try {
      await broadcast({
        universityId: me.universityId,
        roleScope: recipientRole,
        subject: subject.trim(),
        body: body.trim(),
      });
      const audience =
        recipientRole === "all"
          ? "everyone in this university"
          : `${recipientCount} ${RECIPIENT_COUNT_CACHE[recipientRole].toLowerCase()}`;
      toast.success(`Broadcast sent to ${audience}.`);
      setSubject("");
      setBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send broadcast.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Messages"
        description={
          me.role === "university_admin" || me.role === "super_admin"
            ? "Send direct messages or broadcast announcements."
            : "Your messages and broadcasts."
        }
      />

      <Tabs defaultValue="inbox">
        <TabsList>
          <TabsTrigger value="inbox">
            <Inbox className="mr-1 size-3" /> Inbox ({direct.length})
          </TabsTrigger>
          <TabsTrigger value="broadcasts">
            <Megaphone className="mr-1 size-3" /> Broadcasts ({broadcasts.length})
          </TabsTrigger>
          {me.role === "university_admin" || me.role === "super_admin" ? (
            <TabsTrigger value="compose">
              <Send className="mr-1 size-3" /> Compose
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="notifications">
            <Mail className="mr-1 size-3" /> Notifications ({notifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox">
          <div className="rounded-md border bg-card">
            <ScrollArea className="max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Body</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {direct.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-xs text-muted-foreground">
                        No direct messages yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    direct.map((m) => (
                      <TableRow key={m._id}>
                        <TableCell className="text-[11px]">
                          {users.find((u) => u._id === m.senderUserId)?.fullName ?? m.senderUserId.slice(-6)}
                        </TableCell>
                        <TableCell className="text-[11px]">
                          {users.find((u) => u._id === m.recipientUserId)?.fullName ?? m.recipientUserId?.slice(-6) ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs font-medium">{m.subject}</TableCell>
                        <TableCell className="max-w-md truncate text-[11px] text-muted-foreground">
                          {m.body}
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">
                          {formatDateTime(m.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </TabsContent>

        <TabsContent value="broadcasts">
          <div className="rounded-md border bg-card">
            <ScrollArea className="max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>From</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Body</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {broadcasts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-xs text-muted-foreground">
                        No broadcasts yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    broadcasts.map((m) => (
                      <TableRow key={m._id}>
                        <TableCell className="text-[11px]">
                          {users.find((u) => u._id === m.senderUserId)?.fullName ?? m.senderUserId.slice(-6)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-[10px]">
                            {m.recipientRole ? roleLabel(m.recipientRole) : "Everyone"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-medium">{m.subject}</TableCell>
                        <TableCell className="max-w-md truncate text-[11px] text-muted-foreground">
                          {m.body}
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">
                          {formatDateTime(m.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </TabsContent>

        {me.role === "university_admin" || me.role === "super_admin" ? (
          <TabsContent value="compose">
            <div className="space-y-3">
              <div className="rounded-md border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <User className="size-3.5 text-primary" />
                  <h2 className="text-sm font-semibold">Direct message</h2>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium">Recipient</label>
                    <Select
                      value={recipientId || "none"}
                      onValueChange={(v) => setRecipientId(v === "none" ? "" : ((v as Id<"users">) ?? ""))}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Pick a recipient">
                          {recipientId
                            ? users.find((u) => u._id === recipientId)?.fullName ?? "Recipient"
                            : "Pick a recipient"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Pick a recipient</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u._id} value={u._id}>
                            {u.fullName} · {roleLabel(u.role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    value={subject}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
                    placeholder="Subject"
                    className="h-9 text-xs"
                  />
                  <textarea
                    value={body}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
                    placeholder="Message body"
                    rows={5}
                    className="w-full rounded-md border bg-background px-3 py-2 text-xs"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs"
                      onClick={() => void sendDirectMessage()}
                      disabled={busy !== null || !recipientId || !subjectBodyReady}
                    >
                      <Send className="mr-1 size-3" /> Send direct message
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-md border bg-card p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Megaphone className="size-3.5 text-primary" />
                  <h2 className="text-sm font-semibold">Broadcast announcement</h2>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium">Audience</label>
                    <Select
                      value={recipientRole}
                      onValueChange={(v) => setRecipientRole((v as RoleScope) ?? "student")}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue>{roleLabel(recipientRole)}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(
                          ["all", "admin", "lecturer", "student", "invigilator", "finance", "super_admin"] as const
                        ).map((r) => (
                          <SelectItem key={r} value={r}>
                            {r === "all" ? "Everyone" : roleLabel(r)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-[10px] text-muted-foreground">
                      Will reach <span className="font-medium text-foreground">{recipientCount}</span>{" "}
                      {recipientCount === 1 ? "person" : "people"} in this university.
                    </p>
                  </div>
                  <Input
                    value={subject}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
                    placeholder="Subject"
                    className="h-9 text-xs"
                  />
                  <textarea
                    value={body}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
                    placeholder="Broadcast body"
                    rows={5}
                    className="w-full rounded-md border bg-background px-3 py-2 text-xs"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => void sendBroadcast()}
                      disabled={busy !== null || recipientCount === 0 || !subjectBodyReady}
                    >
                      <Megaphone className="mr-1 size-3" /> Send broadcast
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        ) : null}

        <TabsContent value="notifications">
          <div className="rounded-md border bg-card">
            <ScrollArea className="max-h-[60vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Body</TableHead>
                    <TableHead>Scope</TableHead>
                    <TableHead>When</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {notifications.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-xs text-muted-foreground">
                        No notifications.
                      </TableCell>
                    </TableRow>
                  ) : (
                    notifications.map((n) => (
                      <TableRow key={n._id}>
                        <TableCell className="text-xs font-medium">{n.title}</TableCell>
                        <TableCell className="max-w-md text-[11px] text-muted-foreground">
                          {n.body}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {n.roleScope === "all" ? "Everyone" : roleLabel(n.roleScope)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground">
                          {formatDateTime(n.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
