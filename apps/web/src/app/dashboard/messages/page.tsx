"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Inbox, Mail, Megaphone, Send } from "lucide-react";
import { useMemo, useState } from "react";

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

export default function MessagesPage() {
  const me = useMe();
  const [composeMode, setComposeMode] = useState<"direct" | "broadcast">("direct");
  const [recipientId, setRecipientId] = useState<Id<"users"> | "">("");
  const [recipientRole, setRecipientRole] = useState<RoleScope>("student");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

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

  async function send() {
    if (!me.universityId) return;
    if (!subject.trim() || !body.trim()) {
      setFeedback("Subject and body are required.");
      return;
    }
    if (composeMode === "direct") {
      if (!recipientId) {
        setFeedback("Pick a recipient first.");
        return;
      }
      await sendDirect({
        universityId: me.universityId,
        recipientUserId: recipientId,
        subject: subject.trim(),
        body: body.trim(),
      });
      setFeedback("Message sent.");
    } else {
      await broadcast({
        universityId: me.universityId,
        roleScope: recipientRole,
        subject: subject.trim(),
        body: body.trim(),
      });
      setFeedback(`Broadcast sent to ${recipientRole === "all" ? "everyone" : roleLabel(recipientRole)}.`);
    }
    setSubject("");
    setBody("");
    setRecipientId("");
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

      {feedback ? (
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">{feedback}</div>
      ) : null}

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
            <div className="rounded-md border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setComposeMode("direct")}
                  className={
                    "rounded-md border px-3 py-1.5 text-xs " +
                    (composeMode === "direct"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground")
                  }
                >
                  Direct message
                </button>
                <button
                  onClick={() => setComposeMode("broadcast")}
                  className={
                    "rounded-md border px-3 py-1.5 text-xs " +
                    (composeMode === "broadcast"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground")
                  }
                >
                  Broadcast
                </button>
              </div>
              <Separator className="my-3" />
              <div className="space-y-3">
                {composeMode === "direct" ? (
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
                ) : (
                  <Select
                    value={recipientRole}
                    onValueChange={(v) => setRecipientRole((v as RoleScope) ?? "student")}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue>{roleLabel(recipientRole)}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(["all", "admin", "lecturer", "student", "invigilator", "finance"] as const).map(
                        (r) => (
                          <SelectItem key={r} value={r}>
                            {r === "all" ? "Everyone" : roleLabel(r)}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                )}
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
                  rows={6}
                  className="w-full rounded-md border bg-background px-3 py-2 text-xs"
                />
                <div className="flex justify-end">
                  <Button size="sm" className="h-8 text-xs" onClick={send}>
                    <Send className="mr-1 size-3" /> Send
                  </Button>
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
