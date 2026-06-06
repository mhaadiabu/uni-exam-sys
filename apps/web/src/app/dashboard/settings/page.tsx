"use client";

import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Globe, Loader2, Palette, Save, Settings as SettingsIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/dashboard/kpi";
import { useMe } from "@/components/dashboard/dashboard-layout-shell";

import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@uni-exam-sys/ui/components/card";
import { Input } from "@uni-exam-sys/ui/components/input";
import { Label } from "@uni-exam-sys/ui/components/label";
import { Separator } from "@uni-exam-sys/ui/components/separator";

type Branding = {
  _id: string;
  universityId: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  idCardTemplate?: string;
  attendanceReportTemplate?: string;
  updatedAt: number;
};

export default function SettingsPage() {
  const me = useMe();

  if (me.role !== "university_admin" && me.role !== "super_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        Only university admins can manage settings.
      </div>
    );
  }

  if (!me.universityId && me.role !== "super_admin") {
    return (
      <div className="rounded-md border bg-card p-6 text-sm text-muted-foreground">
        No university linked to your account.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        description="Branding, identity, and policy configuration for this university."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <SettingsIcon className="size-4 text-primary" />
              <CardTitle className="text-sm">Workspace</CardTitle>
            </div>
            <CardDescription>University identity and contact details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <p className="text-[11px] uppercase text-muted-foreground">Name</p>
              <p className="text-sm font-medium">{me.university?.name ?? "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase text-muted-foreground">Code</p>
              <Badge variant="outline" className="font-mono text-[10px]">
                {me.university?.code ?? "—"}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-[11px] uppercase text-muted-foreground">Active</p>
              <Badge
                variant={me.university?.isActive ? "default" : "destructive"}
                className="text-[10px] capitalize"
              >
                {me.university?.isActive ? "active" : "disabled"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <BrandingPanel />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-primary" />
            <CardTitle className="text-sm">Email policies</CardTitle>
          </div>
          <CardDescription>
            Allowed email domains are managed from the Universities page (super admin) or the
            admin section of your university. Settings here only affect branding and report
            templates.
          </CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </div>
  );
}

function BrandingPanel() {
  const me = useMe();
  const branding = useQuery(
    api.tenants.getBranding,
    me.universityId ? { universityId: me.universityId } : "skip",
  ) as Branding | null | undefined;
  const updateBranding = useMutation(api.tenants.updateBranding);

  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0f172a");
  const [secondaryColor, setSecondaryColor] = useState("#0b4fd8");
  const [idCardTemplate, setIdCardTemplate] = useState("default-v1");
  const [attendanceReportTemplate, setAttendanceReportTemplate] = useState("default-v1");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!branding) return;
    setLogoUrl(branding.logoUrl ?? "");
    setPrimaryColor(branding.primaryColor ?? "#0f172a");
    setSecondaryColor(branding.secondaryColor ?? "#0b4fd8");
    setIdCardTemplate(branding.idCardTemplate ?? "default-v1");
    setAttendanceReportTemplate(branding.attendanceReportTemplate ?? "default-v1");
  }, [branding]);

  async function save() {
    if (!me.universityId) return;
    setSaving(true);
    try {
      await updateBranding({
        universityId: me.universityId,
        logoUrl: logoUrl.trim() || undefined,
        primaryColor: primaryColor.trim() || undefined,
        secondaryColor: secondaryColor.trim() || undefined,
        idCardTemplate: idCardTemplate.trim() || undefined,
        attendanceReportTemplate: attendanceReportTemplate.trim() || undefined,
      });
      toast.success("Branding updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-primary" />
          <CardTitle className="text-sm">Branding</CardTitle>
        </div>
        <CardDescription>
          Logo, colors, and report templates used on student ID cards and attendance sheets.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {branding === undefined ? (
          <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
            <Loader2 className="size-3.5 animate-spin" /> Loading branding…
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Logo URL</Label>
                <Input
                  value={logoUrl}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLogoUrl(e.target.value)}
                  placeholder="https://…/logo.png"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Primary color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrimaryColor(e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded-md border bg-background"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPrimaryColor(e.target.value)}
                    className="h-9 flex-1 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Secondary color</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecondaryColor(e.target.value)}
                    className="h-9 w-10 cursor-pointer rounded-md border bg-background"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecondaryColor(e.target.value)}
                    className="h-9 flex-1 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>ID card template</Label>
                <Input
                  value={idCardTemplate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdCardTemplate(e.target.value)}
                  placeholder="default-v1"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Attendance report template</Label>
                <Input
                  value={attendanceReportTemplate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAttendanceReportTemplate(e.target.value)}
                  placeholder="default-v1"
                  className="h-9 text-xs"
                />
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] text-muted-foreground">
                Last updated:{" "}
                {branding?.updatedAt
                  ? new Date(branding.updatedAt).toLocaleString()
                  : "never"}
              </p>
              <Button size="sm" className="h-8 text-xs" onClick={() => void save()} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-1 size-3 animate-spin" /> Saving
                  </>
                ) : (
                  <>
                    <Save className="mr-1 size-3" /> Save branding
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
