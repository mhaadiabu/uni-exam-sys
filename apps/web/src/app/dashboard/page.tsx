"use client";

import { SignInButton, useClerk } from "@clerk/nextjs";
import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { Authenticated, AuthLoading, Unauthenticated, useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  BadgeCheck,
  Banknote,
  CalendarClock,
  ChartColumn,
  Check,
  CreditCard,
  FileDown,
  FileText,
  GraduationCap,
  IdCard,
  Landmark,
  LayoutGrid,
  Lock,
  Mail,
  Megaphone,
  MessageSquare,
  Pencil,
  School,
  Search,
  Send,
  Shield,
  Trash2,
  Upload,
  UserCog,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@uni-exam-sys/ui/components/alert";
import { Badge } from "@uni-exam-sys/ui/components/badge";
import { Button } from "@uni-exam-sys/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@uni-exam-sys/ui/components/dialog";
import { Input } from "@uni-exam-sys/ui/components/input";
import { Label } from "@uni-exam-sys/ui/components/label";
import { Progress, ProgressLabel, ProgressValue } from "@uni-exam-sys/ui/components/progress";
import { ScrollArea } from "@uni-exam-sys/ui/components/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@uni-exam-sys/ui/components/select";
import { Separator } from "@uni-exam-sys/ui/components/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@uni-exam-sys/ui/components/table";
import { Switch } from "@uni-exam-sys/ui/components/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@uni-exam-sys/ui/components/tabs";
import { Textarea } from "@uni-exam-sys/ui/components/textarea";

import { formatDate, formatDateTime, roleLabel } from "@/lib/utils";
import { downloadCsv, downloadPdf, type PdfTable } from "@/lib/reports";

function LoadingState() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <div className="grid min-h-[50vh] place-items-center">
        <div className="space-y-3 text-center">
          <div className="mx-auto size-8 animate-spin border-2 border-primary border-t-transparent" />
          <p className="text-sm font-medium">Loading examination workspace...</p>
          <p className="text-xs text-muted-foreground">
            Preparing your workspace...
          </p>
        </div>
      </div>
    </div>
  );
}

function SignInState() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <div className="grid min-h-[50vh] place-items-center">
        <div className="max-w-md space-y-6 border border-border bg-background p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center bg-primary/10 text-primary">
            <School className="size-5" />
          </div>
          <div>
            <h2 className="font-sans text-xl font-medium tracking-tight">Authentication Required</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with your institution account to access exam operations.
            </p>
          </div>
          <SignInButton>
            <Button size="lg" className="w-full uppercase tracking-widest text-xs">Sign in</Button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <>
      <Authenticated>
        <DashboardContent />
      </Authenticated>
      <Unauthenticated>
        <SignInState />
      </Unauthenticated>
      <AuthLoading>
        <LoadingState />
      </AuthLoading>
    </>
  );
}

function DashboardContent() {
  const me = useQuery(api.bootstrap.me);
  const clerk = useClerk();
  const onboardingUniversities = useQuery(api.bootstrap.listOnboardingUniversities, {});
  const scopedUniversityId = me?.universityId;
  const [tenantName, setTenantName] = useState("Nana K. University");
  const [tenantCode, setTenantCode] = useState("NKU");
  const [tenantDomains, setTenantDomains] = useState("nku.edu");
  const [seedStatus, setSeedStatus] = useState<"idle" | "running">("idle");
  const [selectedUniversityId, setSelectedUniversityId] = useState<Id<"universities"> | "">("");
  const [complaintCategory, setComplaintCategory] = useState<
    | "wrong_seat"
    | "wrong_timetable"
    | "wrong_details"
    | "payment_issue"
    | "id_verification_issue"
    | "attendance_system_issue"
    | "schedule_conflict"
    | "room_issue"
    | "other"
  >("other");
  const [complaintSubject, setComplaintSubject] = useState("");
  const [complaintDescription, setComplaintDescription] = useState("");
  const [reprintReason, setReprintReason] = useState("");
  const [programCode, setProgramCode] = useState("");
  const [programName, setProgramName] = useState("");
  const [programDuration, setProgramDuration] = useState(8);
  const [courseProgramId, setCourseProgramId] = useState<Id<"programs"> | "">("");
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseSemester, setCourseSemester] = useState(1);
  const [courseCreditHours, setCourseCreditHours] = useState(3);
  const [roomName, setRoomName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [roomCapacity, setRoomCapacity] = useState(100);
  const [roomLocation, setRoomLocation] = useState("");
  const [roomType, setRoomType] = useState<"hall" | "lab" | "small_class" | "special_needs">("hall");
  const [scheduleProgramId, setScheduleProgramId] = useState<Id<"programs"> | "">("");
  const [scheduleCourseId, setScheduleCourseId] = useState<Id<"courses"> | "">("");
  const [scheduleRoomId, setScheduleRoomId] = useState<Id<"rooms"> | "">("");
  const [scheduleInvigilatorId, setScheduleInvigilatorId] = useState<Id<"invigilators"> | "">("");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleStartTime, setScheduleStartTime] = useState("");
  const [scheduleEndTime, setScheduleEndTime] = useState("");
  const [assignmentScheduleId, setAssignmentScheduleId] = useState<Id<"examSchedules"> | "">("");
  const [assignmentInvigilatorId, setAssignmentInvigilatorId] = useState<Id<"invigilators"> | "">("");
  const [assignmentRoomId, setAssignmentRoomId] = useState<Id<"rooms"> | "">("");
  const [assignmentDate, setAssignmentDate] = useState("");
  const [seatingScheduleId, setSeatingScheduleId] = useState<Id<"examSchedules"> | "">("");
  const [selectedAttendanceAssignmentId, setSelectedAttendanceAssignmentId] = useState<Id<"invigilatorAssignments"> | "">("");
  const [attendanceSignature, setAttendanceSignature] = useState("");
  const [verificationSearch, setVerificationSearch] = useState("");
  const [selectedVerificationStudentId, setSelectedVerificationStudentId] = useState<Id<"students"> | "">("");
  const [verificationReason, setVerificationReason] = useState("");
  const [verificationPenaltyPoints, setVerificationPenaltyPoints] = useState(1);
  const [verificationApplyPenalty, setVerificationApplyPenalty] = useState(true);
  const [clearanceStudentId, setClearanceStudentId] = useState<Id<"students"> | "">("");
  const [clearanceFeeStatus, setClearanceFeeStatus] = useState<"cleared" | "outstanding">("cleared");
  const [clearanceOutstandingBalance, setClearanceOutstandingBalance] = useState(0);
  const [clearanceReference, setClearanceReference] = useState("");
  const [paymentInvigilatorId, setPaymentInvigilatorId] = useState<Id<"invigilators"> | "">("");
  const [paymentSessions, setPaymentSessions] = useState(1);
  const [paymentIncludeBonus, setPaymentIncludeBonus] = useState(true);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentRecordId, setPaymentRecordId] = useState<Id<"paymentRecords"> | "">("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "approved" | "paid">("approved");

  // User management state
  const [roleChangeUserId, setRoleChangeUserId] = useState<Id<"users"> | "">("");
  const [roleChangeNewRole, setRoleChangeNewRole] = useState<"super_admin" | "university_admin" | "student" | "invigilator" | "finance">("student");
  const [userFilterRole, setUserFilterRole] = useState<"" | "super_admin" | "university_admin" | "student" | "invigilator" | "finance">("");

  // Student management state
  const [newStudentId, setNewStudentId] = useState("");
  const [newStudentIndex, setNewStudentIndex] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [newStudentProgramId, setNewStudentProgramId] = useState<Id<"programs"> | "">("");
  const [newStudentSemester, setNewStudentSemester] = useState(1);
  const [newStudentAcademicYear, setNewStudentAcademicYear] = useState("2025/2026");
  const [newStudentFeeStatus, setNewStudentFeeStatus] = useState<"cleared" | "outstanding">("outstanding");
  const [newStudentBalance, setNewStudentBalance] = useState(0);
  const [newStudentLateReg, setNewStudentLateReg] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [csvProgramId, setCsvProgramId] = useState<Id<"programs"> | "">("");
  const [csvSemester, setCsvSemester] = useState(1);
  const [csvAcademicYear, setCsvAcademicYear] = useState("2025/2026");

  // Complaint management state
  const [complaintActionId, setComplaintActionId] = useState<Id<"complaints"> | "">("");
  const [complaintNewStatus, setComplaintNewStatus] = useState<"open" | "in_review" | "resolved" | "rejected">("in_review");
  const [complaintResolutionNote, setComplaintResolutionNote] = useState("");

  // Seating chart state
  const [seatingChartScheduleId, setSeatingChartScheduleId] = useState<Id<"examSchedules"> | "">("");

  // ID card state
  const [idCardStudentId, setIdCardStudentId] = useState<Id<"students"> | "">("");
  const [idCardValidityStart, setIdCardValidityStart] = useState("");
  const [idCardValidityEnd, setIdCardValidityEnd] = useState("");

  // Broadcast state
  const [broadcastScope, setBroadcastScope] = useState<"all" | "admin" | "student" | "invigilator" | "finance" | "super_admin">("all");
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");

  // Messages state
  const [dmRecipientId, setDmRecipientId] = useState<Id<"users"> | "">("");
  const [dmSubject, setDmSubject] = useState("");
  const [dmBody, setDmBody] = useState("");

  // Edit entity state
  const [editingProgramId, setEditingProgramId] = useState<Id<"programs"> | null>(null);
  const [editProgramCode, setEditProgramCode] = useState("");
  const [editProgramName, setEditProgramName] = useState("");
  const [editProgramDuration, setEditProgramDuration] = useState(8);

  const [editingCourseId, setEditingCourseId] = useState<Id<"courses"> | null>(null);
  const [editCourseCode, setEditCourseCode] = useState("");
  const [editCourseName, setEditCourseName] = useState("");
  const [editCourseSemester, setEditCourseSemester] = useState(1);
  const [editCourseCreditHours, setEditCourseCreditHours] = useState(3);

  const [editingRoomId, setEditingRoomId] = useState<Id<"rooms"> | null>(null);
  const [editRoomName, setEditRoomName] = useState("");
  const [editRoomCode, setEditRoomCode] = useState("");
  const [editRoomCapacity, setEditRoomCapacity] = useState(100);
  const [editRoomLocation, setEditRoomLocation] = useState("");

  const [editingScheduleId, setEditingScheduleId] = useState<Id<"examSchedules"> | null>(null);
  const [editScheduleDate, setEditScheduleDate] = useState("");
  const [editScheduleStartTime, setEditScheduleStartTime] = useState("");
  const [editScheduleEndTime, setEditScheduleEndTime] = useState("");
  const [editScheduleStatus, setEditScheduleStatus] = useState<"draft" | "published" | "ongoing" | "completed">("published");

  // Penalty reset state
  const [resetPenaltyReason, setResetPenaltyReason] = useState("");
  const [reportScheduleId, setReportScheduleId] = useState<Id<"examSchedules"> | "">("");
  const [reportSeatingScheduleId, setReportSeatingScheduleId] = useState<Id<"examSchedules"> | "">("");
  const [brandingLogoUrl, setBrandingLogoUrl] = useState("");
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState("#0f172a");
  const [brandingSecondaryColor, setBrandingSecondaryColor] = useState("#3b82f6");
  const [editingStudentId, setEditingStudentId] = useState<Id<"students"> | null>(null);
  const [editStudentName, setEditStudentName] = useState("");
  const [editStudentEmail, setEditStudentEmail] = useState("");
  const [editStudentPhone, setEditStudentPhone] = useState("");
  const [editStudentSemester, setEditStudentSemester] = useState(1);
  const [editStudentFeeStatus, setEditStudentFeeStatus] = useState<"cleared" | "outstanding">("cleared");
  const [editStudentBalance, setEditStudentBalance] = useState(0);
  const [editStudentLateReg, setEditStudentLateReg] = useState(false);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [announcementSeverity, setAnnouncementSeverity] = useState<"info" | "warning" | "critical">("info");
  const [announcementActiveTo, setAnnouncementActiveTo] = useState("");

  const createUniversity = useMutation(api.bootstrap.createUniversity);
  const createProgram = useMutation(api.academics.createProgram);
  const createCourse = useMutation(api.academics.createCourse);
  const createRoom = useMutation(api.rooms.createRoom);
  const createSchedule = useMutation(api.schedules.createSchedule);
  const createInvigilatorAssignment = useMutation(api.assignments.createInvigilatorAssignment);
  const generateSeating = useMutation(api.seating.generateSeating);
  const submitComplaint = useMutation(api.communications.submitComplaint);
  const verifyStudent = useMutation(api.verification.verifyStudent);
  const createRegister = useMutation(api.attendance.createRegister);
  const markAttendance = useMutation(api.attendance.markAttendance);
  const finalizeAttendance = useMutation(api.attendance.finalizeAttendance);
  const updateStudentClearance = useMutation(api.finance.updateStudentClearance);
  const createInvigilatorPayment = useMutation(api.finance.createInvigilatorPayment);
  const updatePaymentStatus = useMutation(api.finance.updatePaymentStatus);
  const getMyDigitalIdCard = useQuery(api.idCards.getMyDigitalIdCard, me?.role === "student" ? {} : "skip");
  const requestIdCardReprint = useMutation(api.idCards.requestIdCardReprint);
  const updateUserRole = useMutation(api.users.updateUserRole);
  const deactivateUser = useMutation(api.users.deactivateUser);
  const createStudent = useMutation(api.students.createStudent);
  const importStudentsCsv = useMutation(api.students.importStudentsCsv);
  const deleteStudent = useMutation(api.students.deleteStudent);
  const updateComplaintStatus = useMutation(api.communications.updateComplaintStatus);
  const freezeSeating = useMutation(api.seating.freezeSeating);
  const generateStudentIdCard = useMutation(api.idCards.generateStudentIdCard);
  const generateBulkIdCards = useMutation(api.idCards.generateBulkIdCards);
  const markIdCardPrinted = useMutation(api.idCards.markIdCardPrinted);
  const broadcastMessage = useMutation(api.communications.broadcastMessage);
  const sendDirectMessage = useMutation(api.communications.sendDirectMessage);
  const markNotificationRead = useMutation(api.communications.markNotificationRead);
  const updateProgram = useMutation(api.academics.updateProgram);
  const updateCourse = useMutation(api.academics.updateCourse);
  const updateRoom = useMutation(api.rooms.updateRoom);
  const deleteRoom = useMutation(api.rooms.deleteRoom);
  const updateSchedule = useMutation(api.schedules.updateSchedule);
  const deleteSchedule = useMutation(api.schedules.deleteSchedule);
  const deleteInvigilatorAssignment = useMutation(api.assignments.deleteInvigilatorAssignment);
  const updateStudentMutation = useMutation(api.students.updateStudent);
  const resetPenalty = useMutation(api.verification.resetPenalty);
  const universities = useQuery(api.tenants.listUniversities, me ? {} : "skip");
  const activeUniversityId =
    me?.role === "super_admin"
      ? selectedUniversityId || (universities && universities.length > 0
        ? universities[0]?._id
        : undefined
      )
      : scopedUniversityId;
  const getBranding = useQuery(api.tenants.getBranding, activeUniversityId ? { universityId: activeUniversityId } : "skip");
  const updateBranding = useMutation(api.tenants.updateBranding);
  const updateAllowedEmailDomains = useMutation(api.tenants.updateAllowedEmailDomains);
  const timetableReport = useQuery(api.reports.timetableReport, activeUniversityId ? { universityId: activeUniversityId } : "skip");
  const seatingReport = useQuery(api.reports.seatingReport, reportSeatingScheduleId ? { examScheduleId: reportSeatingScheduleId } : "skip");
  const createEmergencyAnnouncement = useMutation(api.announcements.createEmergencyAnnouncement);
  const listEmergencyAnnouncements = useQuery(api.announcements.listEmergencyAnnouncements, activeUniversityId ? { universityId: activeUniversityId } : "skip");
  const deleteEmergencyAnnouncement = useMutation(api.announcements.deleteEmergencyAnnouncement);

  const adminDashboard = useQuery(
    api.dashboard.adminDashboard,
    ((me?.role === "super_admin" || me?.role === "university_admin") && activeUniversityId)
      ? { universityId: activeUniversityId }
      : "skip",
  );

  const studentDashboard = useQuery(
    api.dashboard.studentDashboard,
    me?.role === "student" && activeUniversityId ? { universityId: activeUniversityId } : "skip",
  );

  const invigilatorDashboard = useQuery(
    api.dashboard.invigilatorDashboard,
    me?.role === "invigilator" && activeUniversityId
      ? {
          universityId: activeUniversityId,
          todayDate: new Date().toISOString().slice(0, 10),
        }
      : "skip",
  );
  const listInvigilatorAssignments = useQuery(
    api.assignments.listInvigilatorAssignments,
    me?.role === "invigilator" && activeUniversityId ? { universityId: activeUniversityId } : "skip",
  );

  const financeDashboard = useQuery(
    api.dashboard.financeDashboard,
    me?.role === "finance" && activeUniversityId ? { universityId: activeUniversityId } : "skip",
  );

  const superAdminDashboard = useQuery(
    api.dashboard.superAdminDashboard,
    me?.role === "super_admin" ? {} : "skip",
  );

  const notifications = useQuery(api.communications.listNotifications, me ? {} : "skip") ?? [];
  const complaints = useQuery(
    api.communications.listComplaints,
    activeUniversityId ? { universityId: activeUniversityId } : "skip",
  );
  const penalties = useQuery(
    api.verification.penaltyOverview,
    me && me.role !== "student" && activeUniversityId ? { universityId: activeUniversityId } : "skip",
  );
  const verificationMatches = useQuery(
    api.verification.searchStudentsForVerification,
    me?.role === "invigilator" && activeUniversityId && verificationSearch.trim().length > 1
      ? { universityId: activeUniversityId, searchTerm: verificationSearch.trim() }
      : "skip",
  );


  const reportsCsv = useQuery(
    api.reports.exportCsvBundle,
    me && me.role !== "student" && me.role !== "invigilator" && activeUniversityId
      ? { universityId: activeUniversityId }
      : "skip",
  );
  const programs = useQuery(
    api.academics.listPrograms,
    activeUniversityId ? { universityId: activeUniversityId } : "skip",
  );
  const courses = useQuery(
    api.academics.listCourses,
    activeUniversityId ? { universityId: activeUniversityId } : "skip",
  );
  const rooms = useQuery(api.rooms.listRooms, activeUniversityId ? { universityId: activeUniversityId } : "skip");
  const schedules = useQuery(
    api.schedules.listSchedules,
    activeUniversityId ? { universityId: activeUniversityId } : "skip",
  );
  const invigilatorProfiles = useQuery(
    api.assignments.listInvigilatorProfiles,
    activeUniversityId ? { universityId: activeUniversityId } : "skip",
  );
  const financeClearanceOverview = useQuery(
    api.finance.listClearanceOverview,
    (me?.role === "finance" || me?.role === "super_admin" || me?.role === "university_admin") && activeUniversityId ? { universityId: activeUniversityId } : "skip",
  );
  const financeReports = useQuery(
    api.finance.listFinanceReports,
    (me?.role === "finance" || me?.role === "super_admin" || me?.role === "university_admin") && activeUniversityId ? { universityId: activeUniversityId } : "skip",
  );

  const allUsers = useQuery(
    api.users.listUsers,
    (me?.role === "super_admin" || me?.role === "university_admin") && activeUniversityId
      ? { universityId: activeUniversityId, role: userFilterRole || undefined }
      : "skip",
  );

  const studentsList = useQuery(
    api.students.listStudents,
    (me?.role === "super_admin" || me?.role === "university_admin") && activeUniversityId
      ? { universityId: activeUniversityId }
      : "skip",
  );

  const seatingChart = useQuery(
    api.seating.getSeatingChart,
    seatingChartScheduleId ? { examScheduleId: seatingChartScheduleId } : "skip",
  );

  const idCardsList = useQuery(
    api.idCards.listIdCards,
    (me?.role === "super_admin" || me?.role === "university_admin") && activeUniversityId
      ? { universityId: activeUniversityId }
      : "skip",
  );

  const attendanceSummary = useQuery(
    api.attendance.attendanceSummary,
    (me?.role === "super_admin" || me?.role === "university_admin") && activeUniversityId
      ? { universityId: activeUniversityId }
      : "skip",
  );

  const messages = useQuery(
    api.communications.listMessages,
    activeUniversityId ? { universityId: activeUniversityId } : "skip",
  );

  const roleTimetable = useQuery(
    api.schedules.getRoleTimetable,
    (me?.role === "student" || me?.role === "invigilator") && activeUniversityId
      ? { universityId: activeUniversityId }
      : "skip",
  );

  const verificationHistory = useQuery(
    api.verification.verificationHistory,
    me && me.role !== "student" && me.role !== "finance" && activeUniversityId
      ? { universityId: activeUniversityId }
      : "skip",
  );

  const adminInvigilatorAssignments = useQuery(
    api.assignments.listInvigilatorAssignments,
    (me?.role === "super_admin" || me?.role === "university_admin") && activeUniversityId
      ? { universityId: activeUniversityId }
      : "skip",
  );
  const selectedAttendanceAssignment = (listInvigilatorAssignments ?? []).find(
    (assignment) => assignment._id === selectedAttendanceAssignmentId,
  );
  const attendanceRegister = useQuery(
    api.attendance.getRegisterForExamRoom,
    selectedAttendanceAssignment
      ? {
          examScheduleId: selectedAttendanceAssignment.examScheduleId,
          roomId: selectedAttendanceAssignment.roomId,
        }
      : "skip",
  );

  const unread = notifications.filter((item) => !item.readAt).length;

  const pendingComplaints = useMemo(
    () => (complaints ?? []).filter((item) => item.status !== "resolved").length,
    [complaints],
  );
  const matchedUniversity = onboardingUniversities && "matchedUniversity" in onboardingUniversities
    ? onboardingUniversities.matchedUniversity
    : null;
  const onboardingError = onboardingUniversities && "error" in onboardingUniversities
    ? onboardingUniversities.error
    : null;
  const onboardingEmailDomain = onboardingUniversities && "emailDomain" in onboardingUniversities
    ? onboardingUniversities.emailDomain
    : null;


  async function handleLogout() {
    await clerk.signOut();
  }

  async function handleSeedTenant() {
    setSeedStatus("running");
    try {
      await createUniversity({
        universityName: tenantName,
        universityCode: tenantCode.toUpperCase(),
        allowedEmailDomains: tenantDomains
          .split(",")
          .map((domain) => domain.trim().toLowerCase())
          .filter(Boolean),
      });
      toast.success("University created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create university");
    } finally {
      setSeedStatus("idle");
    }
  }

  async function handleSubmitComplaint() {
    if (!activeUniversityId || !complaintSubject || !complaintDescription) {
      toast.error("Complaint subject and description are required");
      return;
    }

    try {
      await submitComplaint({
        universityId: activeUniversityId,
        category: complaintCategory,
        subject: complaintSubject,
        description: complaintDescription,
      });
      setComplaintSubject("");
      setComplaintDescription("");
      setComplaintCategory("other");
      toast.success("Complaint submitted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit complaint");
    }
  }

  async function handleRequestReprint() {
    if (!getMyDigitalIdCard?.idCard?._id || !reprintReason) {
      toast.error("A reason is required for reprint requests");
      return;
    }

    try {
      await requestIdCardReprint({
        idCardId: getMyDigitalIdCard.idCard._id,
        reason: reprintReason,
      });
      setReprintReason("");
      toast.success("Reprint requested");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to request reprint");
    }
  }

  async function handleCreateProgram() {
    if (!activeUniversityId || !programCode || !programName) {
      toast.error("Program code and name are required");
      return;
    }

    try {
      await createProgram({
        universityId: activeUniversityId,
        code: programCode,
        name: programName,
        durationSemesters: programDuration,
      });
      setProgramCode("");
      setProgramName("");
      toast.success("Program created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create program");
    }
  }

  async function handleCreateCourse() {
    if (!activeUniversityId || !courseProgramId || !courseCode || !courseName) {
      toast.error("Program, course code, and name are required");
      return;
    }

    try {
      await createCourse({
        universityId: activeUniversityId,
        programId: courseProgramId,
        code: courseCode,
        name: courseName,
        semester: courseSemester,
        creditHours: courseCreditHours,
      });
      setCourseCode("");
      setCourseName("");
      toast.success("Course created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create course");
    }
  }

  async function handleCreateRoom() {
    if (!activeUniversityId || !roomName || !roomCode) {
      toast.error("Room name and code are required");
      return;
    }

    try {
      await createRoom({
        universityId: activeUniversityId,
        name: roomName,
        code: roomCode,
        roomType,
        capacity: roomCapacity,
        location: roomLocation || undefined,
        specialNeedsSupport: roomType === "special_needs",
      });
      setRoomName("");
      setRoomCode("");
      toast.success("Room created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create room");
    }
  }

  async function handleCreateSchedule() {
    if (!activeUniversityId || !scheduleProgramId || !scheduleCourseId || !scheduleDate || !scheduleStartTime || !scheduleEndTime) {
      toast.error("Complete the schedule fields first");
      return;
    }

    try {
      await createSchedule({
        universityId: activeUniversityId,
        programId: scheduleProgramId,
        courseId: scheduleCourseId,
        examDate: scheduleDate,
        startTime: scheduleStartTime,
        endTime: scheduleEndTime,
        roomId: scheduleRoomId || undefined,
        invigilatorId: scheduleInvigilatorId || undefined,
        status: "published",
      });
      toast.success("Schedule created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create schedule");
    }
  }

  async function handleAssignInvigilator() {
    if (!activeUniversityId || !assignmentScheduleId || !assignmentInvigilatorId || !assignmentRoomId || !assignmentDate) {
      toast.error("Assignment schedule, invigilator, room, and date are required");
      return;
    }

    try {
      await createInvigilatorAssignment({
        universityId: activeUniversityId,
        examScheduleId: assignmentScheduleId,
        invigilatorId: assignmentInvigilatorId,
        roomId: assignmentRoomId,
        assignmentDate,
      });
      toast.success("Invigilator assigned");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign invigilator");
    }
  }

  async function handleGenerateSeating() {
    if (!activeUniversityId || !seatingScheduleId) {
      toast.error("Select a schedule first");
      return;
    }

    try {
      await generateSeating({
        universityId: activeUniversityId,
        examScheduleId: seatingScheduleId,
        mode: "sequential",
      });
      toast.success("Seating generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate seating");
    }
  }

  async function handleCreateAttendanceRegister() {
    if (!activeUniversityId || !selectedAttendanceAssignment) {
      toast.error("Select an assignment first");
      return;
    }

    try {
      await createRegister({
        universityId: activeUniversityId,
        examScheduleId: selectedAttendanceAssignment.examScheduleId,
        roomId: selectedAttendanceAssignment.roomId,
        invigilatorId: selectedAttendanceAssignment.invigilatorId,
      });
      toast.success("Attendance register ready");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create register");
    }
  }

  async function handleMarkAttendance(studentId: Id<"students">, status: "present" | "absent" | "late" | "excused") {
    if (!attendanceRegister?.register?._id) {
      toast.error("Open a register first");
      return;
    }

    try {
      await markAttendance({
        registerId: attendanceRegister.register._id,
        studentId,
        status,
      });
      toast.success(`Marked ${status}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark attendance");
    }
  }

  async function handleFinalizeAttendance() {
    if (!attendanceRegister?.register?._id || !attendanceSignature) {
      toast.error("Signature is required before finalizing");
      return;
    }

    try {
      await finalizeAttendance({
        registerId: attendanceRegister.register._id,
        signature: attendanceSignature,
      });
      toast.success("Attendance finalized");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to finalize attendance");
    }
  }

  async function handleVerifyStudent() {
    if (!activeUniversityId || !selectedVerificationStudentId || !verificationReason || !verificationSearch.trim()) {
      toast.error("Search, select a student, and provide a reason");
      return;
    }

    try {
      await verifyStudent({
        universityId: activeUniversityId,
        studentDocId: selectedVerificationStudentId,
        searchTerm: verificationSearch.trim(),
        reason: verificationReason,
        applyPenalty: verificationApplyPenalty,
        penaltyPoints: verificationApplyPenalty ? verificationPenaltyPoints : undefined,
      });
      setVerificationReason("");
      setSelectedVerificationStudentId("");
      toast.success("Verification logged");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to verify student");
    }
  }

  async function handleUpdateClearance() {
    if (!activeUniversityId || !clearanceStudentId || !clearanceReference) {
      toast.error("Student and reference are required");
      return;
    }

    try {
      await updateStudentClearance({
        universityId: activeUniversityId,
        studentDocId: clearanceStudentId,
        feeStatus: clearanceFeeStatus,
        outstandingBalance: clearanceOutstandingBalance,
        reference: clearanceReference,
      });
      toast.success("Student clearance updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update clearance");
    }
  }

  async function handleCreatePayment() {
    if (!activeUniversityId || !paymentInvigilatorId || !paymentReference) {
      toast.error("Invigilator and reference are required");
      return;
    }

    try {
      await createInvigilatorPayment({
        universityId: activeUniversityId,
        invigilatorId: paymentInvigilatorId,
        sessions: paymentSessions,
        includeAttendanceBonus: paymentIncludeBonus,
        reference: paymentReference,
      });
      toast.success("Invigilator payment created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create payment");
    }
  }

  async function handleUpdatePaymentRecordStatus() {
    if (!paymentRecordId) {
      toast.error("Select a payment record first");
      return;
    }

    try {
      await updatePaymentStatus({
        paymentRecordId,
        status: paymentStatus,
      });
      toast.success("Payment status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update payment status");
    }
  }

  async function handleUpdateUserRole() {
    if (!roleChangeUserId || !roleChangeNewRole) {
      toast.error("Select a user and target role");
      return;
    }

    try {
      await updateUserRole({ userId: roleChangeUserId, newRole: roleChangeNewRole });
      setRoleChangeUserId("");
      toast.success("User role updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update user role");
    }
  }

  async function handleDeactivateUser(userId: Id<"users">) {
    try {
      await deactivateUser({ userId });
      toast.success("User deactivated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to deactivate user");
    }
  }

  async function handleCreateStudent() {
    if (!activeUniversityId || !newStudentId || !newStudentIndex || !newStudentName || !newStudentProgramId) {
      toast.error("Student ID, index, name, and program are required");
      return;
    }

    try {
      await createStudent({
        universityId: activeUniversityId,
        studentId: newStudentId,
        indexNumber: newStudentIndex,
        fullName: newStudentName,
        email: newStudentEmail || undefined,
        phone: newStudentPhone || undefined,
        programId: newStudentProgramId,
        semester: newStudentSemester,
        academicYear: newStudentAcademicYear,
        feeStatus: newStudentFeeStatus,
        outstandingBalance: newStudentBalance,
        lateRegistration: newStudentLateReg,
      });
      setNewStudentId("");
      setNewStudentIndex("");
      setNewStudentName("");
      setNewStudentEmail("");
      setNewStudentPhone("");
      toast.success("Student created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create student");
    }
  }

  async function handleImportStudentsCsv() {
    if (!activeUniversityId || !csvContent || !csvProgramId) {
      toast.error("CSV content and program are required");
      return;
    }

    try {
      const result = await importStudentsCsv({
        universityId: activeUniversityId,
        csvContent,
        defaultProgramId: csvProgramId,
        defaultSemester: csvSemester,
        defaultAcademicYear: csvAcademicYear,
      });
      setCsvContent("");
      toast.success(`Imported ${result.imported} students (${result.errors.length} errors)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import CSV");
    }
  }

  async function handleDeleteStudent(studentDocId: Id<"students">) {
    try {
      await deleteStudent({ studentDocId });
      toast.success("Student deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete student");
    }
  }

  async function handleUpdateComplaintStatus() {
    if (!complaintActionId) {
      toast.error("Select a complaint");
      return;
    }

    try {
      await updateComplaintStatus({
        complaintId: complaintActionId,
        status: complaintNewStatus,
        resolutionNote: complaintResolutionNote || undefined,
      });
      setComplaintActionId("");
      setComplaintResolutionNote("");
      toast.success("Complaint status updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update complaint");
    }
  }

  async function handleFreezeSeating(examScheduleId: Id<"examSchedules">, frozen: boolean) {
    try {
      await freezeSeating({ examScheduleId, frozen });
      toast.success(frozen ? "Seating frozen" : "Seating unfrozen");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to toggle freeze");
    }
  }

  async function handleGenerateIdCard() {
    if (!activeUniversityId || !idCardStudentId || !idCardValidityStart || !idCardValidityEnd) {
      toast.error("Student, validity start, and validity end are required");
      return;
    }

    try {
      await generateStudentIdCard({
        universityId: activeUniversityId,
        studentDocId: idCardStudentId,
        validityStart: idCardValidityStart,
        validityEnd: idCardValidityEnd,
      });
      setIdCardStudentId("");
      toast.success("ID card generated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate ID card");
    }
  }

  async function handleGenerateBulkIdCards() {
    if (!activeUniversityId || !idCardValidityStart || !idCardValidityEnd || !studentsList?.length) {
      toast.error("Validity dates and students are required");
      return;
    }

    try {
      const result = await generateBulkIdCards({
        universityId: activeUniversityId,
        studentDocIds: studentsList.map((student) => student._id),
        validityStart: idCardValidityStart,
        validityEnd: idCardValidityEnd,
      });
      toast.success(`Generated ${result.count} ID cards`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate bulk ID cards");
    }
  }

  async function handleMarkIdCardPrinted(idCardId: Id<"studentIdCards">) {
    try {
      await markIdCardPrinted({ idCardId });
      toast.success("ID card marked as printed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark as printed");
    }
  }

  async function handleBroadcastMessage() {
    if (!activeUniversityId || !broadcastSubject || !broadcastBody) {
      toast.error("Subject and body are required");
      return;
    }

    try {
      await broadcastMessage({
        universityId: activeUniversityId,
        roleScope: broadcastScope,
        subject: broadcastSubject,
        body: broadcastBody,
      });
      setBroadcastSubject("");
      setBroadcastBody("");
      toast.success("Broadcast message sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send broadcast");
    }
  }

  async function handleSendDirectMessage() {
    if (!activeUniversityId || !dmRecipientId || !dmSubject || !dmBody) {
      toast.error("Recipient, subject, and message are required");
      return;
    }

    try {
      await sendDirectMessage({
        universityId: activeUniversityId,
        recipientUserId: dmRecipientId,
        subject: dmSubject,
        body: dmBody,
      });
      setDmSubject("");
      setDmBody("");
      setDmRecipientId("");
      toast.success("Direct message sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    }
  }

  async function handleMarkNotificationRead(notificationId: Id<"notifications">) {
    try {
      await markNotificationRead({ notificationId });
      toast.success("Notification marked as read");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to mark as read");
    }
  }

  async function handleUpdateProgram() {
    if (!editingProgramId || !editProgramCode || !editProgramName) {
      toast.error("Program code and name are required");
      return;
    }

    try {
      await updateProgram({
        programId: editingProgramId,
        code: editProgramCode,
        name: editProgramName,
        durationSemesters: editProgramDuration,
      });
      setEditingProgramId(null);
      toast.success("Program updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update program");
    }
  }

  async function handleUpdateCourse() {
    if (!editingCourseId || !editCourseCode || !editCourseName) {
      toast.error("Course code and name are required");
      return;
    }

    try {
      await updateCourse({
        courseId: editingCourseId,
        code: editCourseCode,
        name: editCourseName,
        semester: editCourseSemester,
        creditHours: editCourseCreditHours,
      });
      setEditingCourseId(null);
      toast.success("Course updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update course");
    }
  }

  async function handleUpdateRoom() {
    if (!editingRoomId || !editRoomName || !editRoomCode) {
      toast.error("Room name and code are required");
      return;
    }

    try {
      await updateRoom({
        roomId: editingRoomId,
        name: editRoomName,
        code: editRoomCode,
        capacity: editRoomCapacity,
        location: editRoomLocation || undefined,
      });
      setEditingRoomId(null);
      toast.success("Room updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update room");
    }
  }

  async function handleDeleteRoom(roomId: Id<"rooms">) {
    try {
      await deleteRoom({ roomId });
      toast.success("Room deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete room");
    }
  }

  async function handleUpdateSchedule() {
    if (!editingScheduleId) {
      toast.error("Select a schedule");
      return;
    }

    try {
      await updateSchedule({
        scheduleId: editingScheduleId,
        examDate: editScheduleDate || undefined,
        startTime: editScheduleStartTime || undefined,
        endTime: editScheduleEndTime || undefined,
        status: editScheduleStatus,
      });
      setEditingScheduleId(null);
      toast.success("Schedule updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update schedule");
    }
  }

  async function handleDeleteSchedule(scheduleId: Id<"examSchedules">) {
    try {
      await deleteSchedule({ scheduleId });
      toast.success("Schedule deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete schedule");
    }
  }

  async function handleDeleteInvigilatorAssignment(assignmentId: Id<"invigilatorAssignments">) {
    try {
      await deleteInvigilatorAssignment({ assignmentId });
      toast.success("Assignment removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove assignment");
    }
  }

  async function handleResetPenalty(penaltyRecordId: Id<"studentPenalties">) {
    if (!resetPenaltyReason) {
      toast.error("A reason is required to reset a penalty");
      return;
    }

    try {
      await resetPenalty({ penaltyRecordId, reason: resetPenaltyReason });
      setResetPenaltyReason("");
      toast.success("Penalty reset");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reset penalty");
    }
  }

  function handleDownloadTimetablePdf() {
    if (!timetableReport?.length) {
      toast.error("No timetable data available");
      return;
    }
    const tables: PdfTable[] = [{
      title: "Exam Timetable Report",
      subtitle: `Generated: ${new Date().toLocaleDateString()} | University: ${me?.university?.name ?? "N/A"}`,
      columns: [
        { header: "Date", width: 80 },
        { header: "Time", width: 70 },
        { header: "Course", width: 100 },
        { header: "Program", width: 100 },
        { header: "Room", width: 70 },
        { header: "Invigilator", width: 80 },
        { header: "Status", width: 60 },
      ],
      rows: timetableReport.map((s) => [
        s.examDate,
        `${s.startTime ?? ""} - ${s.endTime ?? ""}`,
        `${s.courseCode ?? ""} ${s.courseName ?? ""}`,
        s.program ?? "",
        s.room ?? "",
        s.invigilator ?? "",
        s.status ?? "",
      ]),
    }];
    downloadPdf("timetable-report.pdf", tables);
  }

  function handleDownloadAttendancePdf() {
    if (!reportScheduleId) return;
    const schedule = schedules?.find((s) => s._id === reportScheduleId);
    const chart = seatingChartScheduleId === reportScheduleId ? seatingChart : null;
    const tables: PdfTable[] = [{
      title: "Attendance Register",
      subtitle: `${schedule?.examDate ?? ""} | ${schedule?.course?.code ?? ""} - ${schedule?.course?.name ?? ""} | ${schedule?.room?.name ?? ""}`,
      columns: [
        { header: "Seat", width: 60 },
        { header: "Student ID", width: 100 },
        { header: "Name", width: 150 },
        { header: "Index", width: 80 },
        { header: "Status", width: 80 },
      ],
      rows: (chart?.rows ?? []).map((r) => [
        r.seatNumber,
        r.studentId,
        r.studentName,
        r.indexNumber,
        "—",
      ]),
    }];
    downloadPdf("attendance-register.pdf", tables);
  }

  function handleDownloadSeatingPdf() {
    if (!seatingReport?.rows?.length) {
      toast.error("No seating data for this exam");
      return;
    }
    const tables: PdfTable[] = [{
      title: "Seating Chart",
      subtitle: `${seatingReport.examDate} | ${seatingReport.courseCode} - ${seatingReport.courseName}`,
      columns: [
        { header: "Seat", width: 60 },
        { header: "Student ID", width: 100 },
        { header: "Name", width: 150 },
        { header: "Index", width: 80 },
        { header: "Room", width: 100 },
      ],
      rows: seatingReport.rows.map((r) => [
        r.seatNumber,
        r.studentId,
        r.studentName,
        r.indexNumber,
        `${r.roomName} (${r.roomCode})`,
      ]),
    }];
    downloadPdf("seating-chart.pdf", tables);
  }

  function handleDownloadClearancePdf() {
    if (!financeClearanceOverview?.rows?.length) return;
    const tables: PdfTable[] = [{
      title: "Student Fee Clearance Report",
      subtitle: `Generated: ${new Date().toLocaleDateString()} | Total: ${financeClearanceOverview.totalStudents} | Cleared: ${financeClearanceOverview.cleared} | Outstanding: ${financeClearanceOverview.outstanding}`,
      columns: [
        { header: "Student ID", width: 100 },
        { header: "Name", width: 160 },
        { header: "Fee Status", width: 80 },
        { header: "Balance", width: 80 },
        { header: "Semester", width: 60 },
      ],
      rows: financeClearanceOverview.rows.map((r) => [
        r.studentId,
        r.fullName,
        r.feeStatus,
        r.outstandingBalance.toLocaleString(),
        String(r.semester),
      ]),
    }];
    downloadPdf("clearance-report.pdf", tables);
  }

  function handleDownloadPaymentsPdf() {
    const payments = financeReports?.payments ?? [];
    if (!payments.length) return;
    const tables: PdfTable[] = [{
      title: "Payment Records",
      subtitle: `Generated: ${new Date().toLocaleDateString()}`,
      columns: [
        { header: "Reference", width: 120 },
        { header: "Type", width: 100 },
        { header: "Amount", width: 80 },
        { header: "Status", width: 80 },
        { header: "Created", width: 100 },
      ],
      rows: payments.map((p) => [
        p.reference,
        roleLabel(p.type),
        p.amount.toLocaleString(),
        roleLabel(p.status),
        formatDate(p.createdAt),
      ]),
    }];
    downloadPdf("payment-records.pdf", tables);
  }

  async function handleUpdateBranding() {
    if (!activeUniversityId) return;
    try {
      await updateBranding({
        universityId: activeUniversityId,
        logoUrl: brandingLogoUrl || undefined,
        primaryColor: brandingPrimaryColor,
        secondaryColor: brandingSecondaryColor,
      });
      toast.success("Branding updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update branding");
    }
  }

  async function handleUpdateEmailDomains() {
    if (!activeUniversityId || !tenantDomains) {
      toast.error("Email domains are required");
      return;
    }
    try {
      const domains = tenantDomains.split(",").map((d) => d.trim()).filter(Boolean);
      await updateAllowedEmailDomains({
        universityId: activeUniversityId,
        allowedEmailDomains: domains,
      });
      toast.success("Email domains updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update domains");
    }
  }

  async function handleSaveStudent() {
    if (!editingStudentId) return;
    try {
      await updateStudentMutation({
        studentDocId: editingStudentId,
        fullName: editStudentName || undefined,
        email: editStudentEmail || undefined,
        phone: editStudentPhone || undefined,
        semester: editStudentSemester || undefined,
        feeStatus: editStudentFeeStatus || undefined,
        outstandingBalance: editStudentBalance,
        lateRegistration: editStudentLateReg,
      });
      setEditingStudentId(null);
      toast.success("Student updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update student");
    }
  }

  function startEditStudent(student: { _id: Id<"students">; fullName: string; email?: string | null; phone?: string | null; semester: number; feeStatus: string; outstandingBalance: number; lateRegistration: boolean }) {
    setEditingStudentId(student._id);
    setEditStudentName(student.fullName);
    setEditStudentEmail(student.email ?? "");
    setEditStudentPhone(student.phone ?? "");
    setEditStudentSemester(student.semester);
    setEditStudentFeeStatus(student.feeStatus as "cleared" | "outstanding");
    setEditStudentBalance(student.outstandingBalance);
    setEditStudentLateReg(student.lateRegistration);
  }

  async function handleCreateAnnouncement() {
    if (!activeUniversityId || !announcementMessage || !announcementActiveTo) {
      toast.error("Message and expiry date are required");
      return;
    }
    const activeTo = new Date(announcementActiveTo).getTime();
    if (activeTo <= Date.now()) {
      toast.error("Expiry date must be in the future");
      return;
    }
    try {
      await createEmergencyAnnouncement({
        universityId: activeUniversityId,
        message: announcementMessage,
        severity: announcementSeverity,
        activeFrom: Date.now(),
        activeTo,
      });
      setAnnouncementMessage("");
      toast.success("Announcement created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create announcement");
    }
  }

  async function handleDeleteAnnouncement(id: Id<"emergencyAnnouncements">) {
    try {
      await deleteEmergencyAnnouncement({ announcementId: id });
      toast.success("Announcement deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete");
    }
  }

  const activeAnnouncements = listEmergencyAnnouncements ?? [];

  const brandingLoaded = useRef(false);
  useEffect(() => {
    if (getBranding && !brandingLoaded.current) {
      setBrandingLogoUrl(getBranding.logoUrl ?? "");
      setBrandingPrimaryColor(getBranding.primaryColor ?? "#0f172a");
      setBrandingSecondaryColor(getBranding.secondaryColor ?? "#3b82f6");
      brandingLoaded.current = true;
    }
  }, [getBranding]);

  if (!me) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <Alert>
        <AlertCircle className="size-4" />
        <AlertTitle>Complete Initial Setup</AlertTitle>
        <AlertDescription>
          No application profile was found for your identity. Your email domain must match an
          active university before access is granted.
        </AlertDescription>
        <div className="space-y-3 pt-2">
          {matchedUniversity ? (
            <div className="max-w-sm space-y-1 rounded-md border bg-background/60 p-3 text-xs">
              <p className="font-medium">Automatic university match</p>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">University</span>
                <span>{matchedUniversity.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Email domain</span>
                <span>{onboardingEmailDomain}</span>
              </div>
            </div>
          ) : null}
          {onboardingError ? (
            <div className="max-w-sm space-y-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs">
              <p className="font-medium text-destructive">Access denied</p>
              <p>{onboardingError}</p>
              <Button variant="destructive" size="sm" onClick={handleLogout}>
                Sign out
              </Button>
            </div>
          ) : null}
          {!onboardingError ? (
            <div className="max-w-sm space-y-2 rounded-md border bg-background/60 p-3 text-xs">
              <p className="font-medium">Automatic profile setup</p>
              <p className="text-muted-foreground">
                Your profile is created automatically after signup. This usually takes a few seconds.
              </p>
            </div>
          ) : null}
        </div>
      </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 sm:px-6">
       <section className="grid gap-4 rounded-md border bg-card p-4 shadow-sm sm:grid-cols-[1.3fr_1fr]">
         <div className="space-y-3">
           <div className="flex items-center gap-2">
             <Badge variant="outline">{roleLabel(me.role)}</Badge>
             {me.university ? (
               <Badge>{me.university.code}</Badge>
              ) : (
                <Badge variant="secondary">Cross-university</Badge>
              )}
           </div>
           <div className="space-y-1">
             <h1 className="text-2xl font-semibold tracking-tight">Operations Command Console</h1>
             <p className="max-w-2xl text-xs text-muted-foreground">
                Schedules, seating, attendance, verification, and finance flows aligned to your university.
             </p>
           </div>
           <div className="grid gap-2 sm:grid-cols-3">
             {me.role !== "student" ? (
               <Kpi title="Unread alerts" value={unread} icon={Megaphone} />
             ) : null}
             {(me.role === "super_admin" || me.role === "university_admin") ? (
               <Kpi title="Pending complaints" value={pendingComplaints} icon={MessageSquare} />
             ) : null}
             {me.role === "super_admin" ? (
               <Kpi title="Universities" value={universities?.length ?? 0} icon={Landmark} />
             ) : null}
             {me.role === "university_admin" ? (
               <Kpi title="Students" value={adminDashboard?.metrics.totalStudents ?? 0} icon={Users} />
             ) : null}
             {me.role === "finance" ? (
               <Kpi title="Outstanding" value={financeDashboard?.clearance.outstanding ?? 0} icon={AlertCircle} />
             ) : null}
             {me.role === "student" ? (
               <Kpi title="My Exams" value={studentDashboard?.timetable.length ?? 0} icon={CalendarClock} />
             ) : null}
             {me.role === "invigilator" ? (
               <Kpi title="Today" value={invigilatorDashboard?.todayAssignments.length ?? 0} icon={LayoutGrid} />
             ) : null}
           </div>
         </div>

         <div className="grid gap-3 border bg-background/40 p-3 text-xs">
           {me.role === "super_admin" && (universities?.length ?? 0) > 0 ? (
             <div className="space-y-1">
                <Label htmlFor="tenantSelect">University</Label>
               <Select
                 value={selectedUniversityId || (universities?.[0]?._id ?? "")}
                 onValueChange={(value) => setSelectedUniversityId(value as Id<"universities">)}
               >
                  <SelectTrigger id="tenantSelect">
                    <SelectValue placeholder="Select university">
                      {universities?.find(u => u._id === selectedUniversityId)?.name}
                    </SelectValue>
                 </SelectTrigger>
                 <SelectContent>
                   {(universities ?? []).map((university) => (
                     <SelectItem key={university._id} value={university._id}>
                       {university.name}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           ) : null}
           <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Active university</span>
              <span className="font-medium">{me.university?.name ?? "Global Workspace"}</span>
           </div>
           <div className="flex items-center justify-between">
             <span className="text-muted-foreground">Workspace role</span>
             <span className="font-medium">{roleLabel(me.role)}</span>
           </div>
         </div>
       </section>

        <Tabs defaultValue="operations" className="w-full">
          <TabsList className="w-full flex-wrap justify-start gap-1 rounded-md border bg-card p-1 shadow-sm">
            <TabsTrigger value="operations">Operations</TabsTrigger>
            {me.role === "super_admin" || me.role === "university_admin" || me.role === "invigilator" ? (
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            ) : null}
            {me.role === "super_admin" || me.role === "university_admin" || me.role === "invigilator" ? (
              <TabsTrigger value="verification">Verification</TabsTrigger>
            ) : null}
            {me.role === "super_admin" || me.role === "university_admin" || me.role === "finance" ? (
              <TabsTrigger value="reports">Reports</TabsTrigger>
            ) : null}
            {me.role === "super_admin" || me.role === "university_admin" || me.role === "finance" ? (
              <TabsTrigger value="finance">Finance</TabsTrigger>
            ) : null}
            {me.role === "super_admin" || me.role === "university_admin" ? (
              <TabsTrigger value="users">Users</TabsTrigger>
            ) : null}
            {me.role === "super_admin" || me.role === "university_admin" ? (
              <TabsTrigger value="students">Students</TabsTrigger>
            ) : null}
            {me.role === "super_admin" || me.role === "university_admin" ? (
              <TabsTrigger value="seating">Seating</TabsTrigger>
            ) : null}
            {me.role === "super_admin" || me.role === "university_admin" ? (
              <TabsTrigger value="id-cards">ID Cards</TabsTrigger>
            ) : null}
            <TabsTrigger value="messages">Messages</TabsTrigger>
            {(me.role === "super_admin" || me.role === "university_admin") ? <TabsTrigger value="tenant">Universities</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="operations" className="space-y-4 pt-4">
            <RoleOperations
              role={me.role}
              adminDashboard={adminDashboard}
              studentDashboard={studentDashboard}
              invigilatorDashboard={invigilatorDashboard}
              financeDashboard={financeDashboard}
              superAdminDashboard={superAdminDashboard}
              notifications={notifications}
              complaints={complaints ?? []}
              universities={universities ?? []}
              programs={programs ?? []}
              courses={courses ?? []}
              rooms={rooms ?? []}
              schedules={schedules ?? []}
              invigilatorProfiles={invigilatorProfiles ?? []}
              activeUniversityId={activeUniversityId}
              roleTimetable={roleTimetable ?? []}
              adminInvigilatorAssignments={adminInvigilatorAssignments ?? []}
              studentsList={studentsList ?? []}
              editState={{
                editingProgramId, editProgramCode, editProgramName, editProgramDuration,
                editingCourseId, editCourseCode, editCourseName, editCourseSemester, editCourseCreditHours,
                editingRoomId, editRoomName, editRoomCode, editRoomCapacity, editRoomLocation,
                editingScheduleId, editScheduleDate, editScheduleStartTime, editScheduleEndTime, editScheduleStatus,
              }}
              editSetters={{
                setEditingProgramId, setEditProgramCode, setEditProgramName, setEditProgramDuration,
                setEditingCourseId, setEditCourseCode, setEditCourseName, setEditCourseSemester, setEditCourseCreditHours,
                setEditingRoomId, setEditRoomName, setEditRoomCode, setEditRoomCapacity, setEditRoomLocation,
                setEditingScheduleId, setEditScheduleDate, setEditScheduleStartTime, setEditScheduleEndTime, setEditScheduleStatus,
              }}
              editActions={{
                handleUpdateProgram, handleUpdateCourse, handleUpdateRoom, handleDeleteRoom,
                handleUpdateSchedule, handleDeleteSchedule, handleDeleteInvigilatorAssignment,
              }}
              formState={{
                programCode,
                programName,
                programDuration,
                courseProgramId,
                courseCode,
                courseName,
                courseSemester,
                courseCreditHours,
                roomName,
                roomCode,
                roomCapacity,
                roomLocation,
                roomType,
                scheduleProgramId,
                scheduleCourseId,
                scheduleRoomId,
                scheduleInvigilatorId,
                scheduleDate,
                scheduleStartTime,
                scheduleEndTime,
                assignmentScheduleId,
                assignmentInvigilatorId,
                assignmentRoomId,
                assignmentDate,
                seatingScheduleId,
              }}
              setters={{
                setProgramCode,
                setProgramName,
                setProgramDuration,
                setCourseProgramId,
                setCourseCode,
                setCourseName,
                setCourseSemester,
                setCourseCreditHours,
                setRoomName,
                setRoomCode,
                setRoomCapacity,
                setRoomLocation,
                setRoomType,
                setScheduleProgramId,
                setScheduleCourseId,
                setScheduleRoomId,
                setScheduleInvigilatorId,
                setScheduleDate,
                setScheduleStartTime,
                setScheduleEndTime,
                setAssignmentScheduleId,
                setAssignmentInvigilatorId,
                setAssignmentRoomId,
                setAssignmentDate,
                setSeatingScheduleId,
              }}
              actions={{
                handleCreateProgram,
                handleCreateCourse,
                handleCreateRoom,
                handleCreateSchedule,
                handleAssignInvigilator,
                handleGenerateSeating,
              }}
            />
          </TabsContent>

          {(me.role === "super_admin" || me.role === "university_admin" || me.role === "invigilator") ? (
          <TabsContent value="attendance" className="space-y-4 pt-4">
          {me.role === "invigilator" ? (
            <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
               <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Assigned Attendance Work</h2>
                  <Badge variant="secondary">{listInvigilatorAssignments?.length ?? 0} assignments</Badge>
                </div>
                <Separator />
                <Select value={selectedAttendanceAssignmentId || undefined} onValueChange={(value) => setSelectedAttendanceAssignmentId(value as Id<"invigilatorAssignments">)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select assignment" />
                  </SelectTrigger>
                  <SelectContent>
                    {(listInvigilatorAssignments ?? []).map((assignment) => (
                      <SelectItem key={assignment._id} value={assignment._id}>
                        {assignment.room?.name ?? "Room"} · {assignment.assignmentDate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button className="w-full" onClick={handleCreateAttendanceRegister} disabled={!selectedAttendanceAssignment}>
                  Create or open register
                </Button>
                {attendanceRegister ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <MiniStat title="Present" value={attendanceRegister.counters.present} />
                    <MiniStat title="Absent" value={attendanceRegister.counters.absent} />
                    <MiniStat title="Late" value={attendanceRegister.counters.late} />
                    <MiniStat title="Excused" value={attendanceRegister.counters.excused} />
                  </div>
          ) : null}
                <Label htmlFor="attendance-signature">Signature</Label>
                <Input
                  id="attendance-signature"
                  value={attendanceSignature}
                  onChange={(event) => setAttendanceSignature(event.target.value)}
                  placeholder="Typed signature"
                />
                <Button variant="outline" className="w-full" onClick={handleFinalizeAttendance} disabled={!attendanceRegister?.register?._id}>
                  Finalize attendance
                </Button>
              </div>

              <div className="rounded-md border bg-background/60 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Attendance Register</h2>
                  <Badge variant="outline">{attendanceRegister?.register.status ? roleLabel(attendanceRegister.register.status) : "Not started"}</Badge>
                </div>
                <Separator className="mb-3" />
                {attendanceRegister ? (
                  <ScrollArea className="h-[420px]">
                    <div className="p-2 space-y-2">
                      {attendanceRegister.students.map((student) => (
                        <div key={student.studentDocId} className="rounded-md border bg-background/60 p-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="font-medium">{student.fullName}</p>
                              <p className="text-muted-foreground">{student.studentId} · {student.indexNumber}</p>
                            </div>
                            <Badge variant="outline">{student.status}</Badge>
                          </div>
                          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                            <Button size="sm" variant="outline" onClick={() => handleMarkAttendance(student.studentDocId, "present")}>Present</Button>
                            <Button size="sm" variant="outline" onClick={() => handleMarkAttendance(student.studentDocId, "absent")}>Absent</Button>
                            <Button size="sm" variant="outline" onClick={() => handleMarkAttendance(student.studentDocId, "late")}>Late</Button>
                            <Button size="sm" variant="outline" onClick={() => handleMarkAttendance(student.studentDocId, "excused")}>Excused</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-xs text-muted-foreground">Select an assignment and open a register to start marking attendance.</p>
                )}
              </div>
            </section>
          ) : (
            <section className="rounded-md border bg-background/60 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Attendance Overview</h2>
                <Badge variant="secondary">{attendanceSummary?.rows.length ?? adminDashboard?.attendance.registers.length ?? 0} registers</Badge>
              </div>
              <Separator className="mb-3" />

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MiniStat title="Present" value={attendanceSummary?.totals.present ?? sumCounters(adminDashboard?.attendance.registers, "present")} />
                <MiniStat title="Absent" value={attendanceSummary?.totals.absent ?? sumCounters(adminDashboard?.attendance.registers, "absent")} />
                <MiniStat title="Late" value={attendanceSummary?.totals.late ?? sumCounters(adminDashboard?.attendance.registers, "late")} />
                <MiniStat title="Excused" value={attendanceSummary?.totals.excused ?? sumCounters(adminDashboard?.attendance.registers, "excused")} />
              </div>

              {attendanceSummary?.rows.length ? (
                <div className="mt-4">
                  <Separator className="mb-3" />
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Per-Room Breakdown</p>
                  <ScrollArea className="h-40">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Room</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Present</TableHead>
                          <TableHead>Absent</TableHead>
                          <TableHead>Late</TableHead>
                          <TableHead>Excused</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {attendanceSummary.rows.map((row) => (
                          <TableRow key={row.registerId}>
                            <TableCell className="text-xs">{row.roomName}</TableCell>
                            <TableCell><Badge variant={row.status === "finalized" ? "default" : "secondary"}>{row.status}</Badge></TableCell>
                            <TableCell className="text-xs">{row.counters.present}</TableCell>
                            <TableCell className="text-xs">{row.counters.absent}</TableCell>
                            <TableCell className="text-xs">{row.counters.late}</TableCell>
                            <TableCell className="text-xs">{row.counters.excused}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              ) : null}

              <div className="mt-4 space-y-2">
                <Progress value={Math.min(100, completionRate(adminDashboard?.attendance.registers))}>
                  <ProgressLabel>Register completion rate</ProgressLabel>
                  <ProgressValue />
                </Progress>
              </div>
            </section>
          )}
        </TabsContent>
        ) : null}

{/* ── Verification Tab ── */}
          {(me.role === "super_admin" || me.role === "university_admin" || me.role === "invigilator") ? (
          <TabsContent value="verification" className="space-y-4 pt-4">
          {me.role === "invigilator" ? (
            <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
               <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Verify Student</h2>
                  <Badge variant="outline">Assigned exams</Badge>
                </div>
                <Separator />
                <Label htmlFor="verification-search">Search</Label>
                <Input
                  id="verification-search"
                  value={verificationSearch}
                  onChange={(event) => setVerificationSearch(event.target.value)}
                  placeholder="Name, student ID, or index number"
                />
                <Label htmlFor="verification-student">Matched student</Label>
                <Select value={selectedVerificationStudentId || undefined} onValueChange={(value) => setSelectedVerificationStudentId(value as Id<"students">)}>
                  <SelectTrigger id="verification-student">
                    <SelectValue placeholder="Select matched student" />
                  </SelectTrigger>
                  <SelectContent>
                    {(verificationMatches ?? []).map((match) => (
                      <SelectItem key={match.student._id} value={match.student._id}>
                        {match.student.fullName} · {match.student.studentId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Label htmlFor="verification-reason">Reason</Label>
                <Textarea
                  id="verification-reason"
                  value={verificationReason}
                  onChange={(event) => setVerificationReason(event.target.value)}
                  placeholder="Describe why you are verifying this student"
                />
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="verification-apply-penalty">Apply penalty</Label>
                  <Switch checked={verificationApplyPenalty} onCheckedChange={(checked: boolean) => setVerificationApplyPenalty(checked)} />
                </div>
                {verificationApplyPenalty ? (
                  <>
                    <Label htmlFor="verification-points">Penalty points</Label>
                    <Input
                      id="verification-points"
                      type="number"
                      value={verificationPenaltyPoints}
                      onChange={(event) => setVerificationPenaltyPoints(Number(event.target.value || 0))}
                    />
                  </>
                ) : null}
                <Button className="w-full" onClick={handleVerifyStudent}>
                  Log verification
                </Button>
              </div>

              <div className="rounded-md border bg-background/60 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Verification Matches</h2>
                  <Badge variant="secondary">{verificationMatches?.length ?? 0} results</Badge>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-2 text-xs">
                  {(verificationMatches ?? []).map((match) => (
                    <div key={match.student._id} className="rounded-md border bg-background/60 p-2">
                      <p className="font-medium">{match.student.fullName}</p>
                      <p className="text-muted-foreground">{match.student.studentId} · {match.student.indexNumber}</p>
                      <p className="text-muted-foreground">Program: {match.program?.name ?? "Not assigned"}</p>
                      <p className="text-muted-foreground">Fee status: {match.student.feeStatus}</p>
                      <p className="text-muted-foreground">ID card: {match.idCard?.status ?? "Not generated"}</p>
                    </div>
                  ))}
                  {(verificationMatches?.length ?? 0) === 0 ? (
                    <p className="text-muted-foreground">Search for a student to verify identity details.</p>
                  ) : null}
                </div>
              </div>
            </section>
          ) : (
            <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <div className="rounded-md border bg-background/60 p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Penalty Threshold Monitor</h2>
                  <Badge variant="outline">Semester</Badge>
                </div>
                <Separator className="mb-3" />
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Warning</TableHead>
                      <TableHead>Admin Review</TableHead>
                      <TableHead>Disciplinary</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(penalties ?? []).slice(0, 8).map((row) => {
                      const student = studentsList?.find((s: { _id: string }) => s._id === row.studentId);
                      return (
                        <TableRow key={row._id}>
                          <TableCell className="text-xs">{student?.fullName ?? student?.studentId ?? "Unknown"}</TableCell>
                          <TableCell>{row.totalPoints}</TableCell>
                          <TableCell>{row.warningSent ? "Yes" : "No"}</TableCell>
                          <TableCell>{row.adminReviewTriggered ? "Yes" : "No"}</TableCell>
                          <TableCell>{row.disciplinaryFlag ? "Yes" : "No"}</TableCell>
                          <TableCell>
                            {row.totalPoints > 0 ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  className="h-7 w-28 text-xs"
                                  placeholder="Reset reason"
                                  value={resetPenaltyReason}
                                  onChange={(event) => setResetPenaltyReason(event.target.value)}
                                />
                                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleResetPenalty(row._id)}>
                                  Reset
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Clean</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-4">
                <div className="rounded-md border bg-background/60 p-4 shadow-sm">
                  <h2 className="mb-2 text-sm font-semibold">Verification Policy Safeguards</h2>
                  <Separator className="mb-3" />
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    <li className="flex gap-2">
                      <BadgeCheck className="mt-0.5 size-3.5 text-primary" />
                      Penalty is explicit, never silently applied.
                    </li>
                    <li className="flex gap-2">
                      <BadgeCheck className="mt-0.5 size-3.5 text-primary" />
                      Every verification captures reason and invigilator context.
                    </li>
                    <li className="flex gap-2">
                      <BadgeCheck className="mt-0.5 size-3.5 text-primary" />
                      Threshold transitions are tracked for warning, review, and disciplinary states.
                    </li>
                  </ul>
                </div>

                <div className="rounded-md border bg-background/60 p-4 shadow-sm">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold">Verification History</h2>
                    <Badge variant="outline">{verificationHistory?.length ?? 0} entries</Badge>
                  </div>
                  <Separator className="mb-3" />
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {(verificationHistory ?? []).slice(0, 20).map((entry) => (
                        <div key={entry._id} className="rounded-md border bg-background/40 p-2 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{entry.student?.fullName ?? "Unknown"}</span>
                            {entry.penaltyApplied ? (
                              <Badge variant="destructive" className="text-[10px]">{entry.penaltyPoints}pt</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">No penalty</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground">{entry.reason}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {formatDateTime(entry.timestamp)} · {entry.invigilator?.fullName ?? "System"}
                          </p>
                        </div>
                      ))}
                      {(verificationHistory?.length ?? 0) === 0 ? (
                        <p className="text-xs text-muted-foreground">No verification records yet.</p>
                      ) : null}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </section>
          )}
        </TabsContent>
        ) : null}

          {(me.role === "super_admin" || me.role === "university_admin" || me.role === "finance") ? (
          <TabsContent value="reports" className="space-y-4 pt-4">
            <section className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-md border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">Data Exports</h2>
                  <Badge variant="outline">CSV</Badge>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium">Students CSV</p>
                      <p className="text-[11px] text-muted-foreground">All student records with program and fee info</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => reportsCsv?.studentsCsv && downloadCsv("students.csv", reportsCsv.studentsCsv)} disabled={!reportsCsv?.studentsCsv}>
                      <FileDown className="mr-1 size-3.5" /> Download
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium">Rooms CSV</p>
                      <p className="text-[11px] text-muted-foreground">All room records with capacity and type</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => reportsCsv?.roomsCsv && downloadCsv("rooms.csv", reportsCsv.roomsCsv)} disabled={!reportsCsv?.roomsCsv}>
                      <FileDown className="mr-1 size-3.5" /> Download
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium">Schedules CSV</p>
                      <p className="text-[11px] text-muted-foreground">All exam schedules with date, time, and status</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => reportsCsv?.schedulesCsv && downloadCsv("schedules.csv", reportsCsv.schedulesCsv)} disabled={!reportsCsv?.schedulesCsv}>
                      <FileDown className="mr-1 size-3.5" /> Download
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-md border bg-card p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-semibold">PDF Reports</h2>
                  <Badge variant="outline">PDF</Badge>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium">Timetable Report</p>
                      <p className="text-[11px] text-muted-foreground">All exam schedules in printable format</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleDownloadTimetablePdf} disabled={!activeUniversityId || (schedules?.length ?? 0) === 0}>
                      <FileDown className="mr-1 size-3.5" /> Download
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium">Attendance Register</p>
                      <p className="text-[11px] text-muted-foreground">Attendance report for selected schedule</p>
                    </div>
                    <Select value={reportScheduleId || undefined} onValueChange={(v) => setReportScheduleId(v as Id<"examSchedules">)}>
                      <SelectTrigger className="h-7 w-[120px] text-xs">
                        <SelectValue placeholder="Select exam" />
                      </SelectTrigger>
                      <SelectContent>
                        {(schedules ?? []).map((s) => (
                          <SelectItem key={s._id} value={s._id}>{s.examDate} {s.course?.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleDownloadAttendancePdf} disabled={!reportScheduleId}>
                      <FileDown className="mr-1 size-3.5" /> Download
                    </Button>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium">Seating Chart</p>
                      <p className="text-[11px] text-muted-foreground">Seating assignments for selected exam</p>
                    </div>
                    <Select value={reportSeatingScheduleId || undefined} onValueChange={(v) => setReportSeatingScheduleId(v as Id<"examSchedules">)}>
                      <SelectTrigger className="h-7 w-[120px] text-xs">
                        <SelectValue placeholder="Select exam" />
                      </SelectTrigger>
                      <SelectContent>
                        {(schedules ?? []).map((s) => (
                          <SelectItem key={s._id} value={s._id}>{s.examDate} {s.course?.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm" onClick={handleDownloadSeatingPdf} disabled={!reportSeatingScheduleId}>
                      <FileDown className="mr-1 size-3.5" /> Download
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            {me.role === "super_admin" || me.role === "university_admin" ? (
            <section className="rounded-md border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Financial Reports</h2>
              </div>
              <Separator className="mb-3" />
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium">Clearance Summary</p>
                    <p className="text-[11px] text-muted-foreground">Student fee clearance overview</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadClearancePdf} disabled={!financeClearanceOverview?.rows?.length}>
                    <FileDown className="mr-1 size-3.5" /> Download
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium">Payment Records</p>
                    <p className="text-[11px] text-muted-foreground">All payment records including student fees and invigilator payments</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleDownloadPaymentsPdf} disabled={(financeReports?.payments?.length ?? 0) <= 0}>
                    <FileDown className="mr-1 size-3.5" /> Download
                  </Button>
                </div>
              </div>
            </section>
            ) : null}
          </TabsContent>
          ) : null}

        {/* ── User Management Tab ── */}
          {(me.role === "super_admin" || me.role === "university_admin") ? (
          <TabsContent value="users" className="space-y-4 pt-4">
          <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="rounded-md border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">User Directory</h2>
                <div className="flex items-center gap-2">
                  <Select value={userFilterRole} onValueChange={(value) => setUserFilterRole(value as typeof userFilterRole)}>
                    <SelectTrigger className="h-8 w-[140px]">
                      <SelectValue placeholder="All roles" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All roles</SelectItem>
                      <SelectItem value="super_admin">Super Admin</SelectItem>
                      <SelectItem value="university_admin">Uni Admin</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="invigilator">Invigilator</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="secondary">{allUsers?.length ?? 0}</Badge>
                </div>
              </div>
              <Separator className="mb-3" />
              <ScrollArea className="h-72">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(allUsers ?? []).map((user) => (
                      <TableRow key={user._id}>
                        <TableCell className="text-xs">{user.fullName}</TableCell>
                        <TableCell className="text-xs">{user.email}</TableCell>
                        <TableCell><Badge variant="outline">{roleLabel(user.role)}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? "default" : "secondary"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setRoleChangeUserId(user._id); setRoleChangeNewRole(user.role); }}
                            >
                              <UserCog className="mr-1 size-3" />
                              Role
                            </Button>
                            {user.isActive ? (
                              <Button variant="outline" size="sm" onClick={() => handleDeactivateUser(user._id)}>
                                Deactivate
                              </Button>
          ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="space-y-4">
               <div className="rounded-md border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Shield className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold">Change User Role</h2>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>User</Label>
                    <Select value={roleChangeUserId || undefined} onValueChange={(value) => setRoleChangeUserId(value as Id<"users">)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {(allUsers ?? []).map((user) => (
                          <SelectItem key={user._id} value={user._id}>
                            {user.fullName} ({roleLabel(user.role)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>New role</Label>
                    <Select value={roleChangeNewRole} onValueChange={(value) => setRoleChangeNewRole(value as typeof roleChangeNewRole)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {me.role === "super_admin" ? <SelectItem value="super_admin">Super Admin</SelectItem> : null}
                        <SelectItem value="university_admin">University Admin</SelectItem>
                        <SelectItem value="student">Student</SelectItem>
                        <SelectItem value="invigilator">Invigilator</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleUpdateUserRole} disabled={!roleChangeUserId}>
                    Update role
                  </Button>
                </div>
              </div>

               <div className="rounded-md border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Megaphone className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold">Broadcast Message</h2>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Audience</Label>
                    <Select value={broadcastScope} onValueChange={(value) => setBroadcastScope(value as typeof broadcastScope)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All users</SelectItem>
                        <SelectItem value="student">Students</SelectItem>
                        <SelectItem value="invigilator">Invigilators</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Subject</Label>
                    <Input value={broadcastSubject} onChange={(event) => setBroadcastSubject(event.target.value)} placeholder="Announcement subject" />
                  </div>
                  <div className="space-y-1">
                    <Label>Message</Label>
                    <Textarea value={broadcastBody} onChange={(event) => setBroadcastBody(event.target.value)} placeholder="Message body" />
                  </div>
                  <Button className="w-full" onClick={handleBroadcastMessage} disabled={!broadcastSubject || !broadcastBody}>
                    Send broadcast
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </TabsContent>
        ) : null}

        {/* ── Student Management Tab ── */}
          {(me.role === "super_admin" || me.role === "university_admin") ? (
          <TabsContent value="students" className="space-y-4 pt-4">
          <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
             <div className="rounded-md border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Student Registry</h2>
                <Badge variant="secondary">{studentsList?.length ?? 0} students</Badge>
              </div>
              <Separator className="mb-3" />
              <ScrollArea className="h-72">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Index</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Fee Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(studentsList ?? []).map((student) => (
                      <TableRow key={student._id}>
                        <TableCell className="text-xs font-mono">{student.studentId}</TableCell>
                        <TableCell className="text-xs">{student.fullName}</TableCell>
                        <TableCell className="text-xs font-mono">{student.indexNumber}</TableCell>
                        <TableCell className="text-xs">{student.semester}</TableCell>
                        <TableCell>
                          <Badge variant={student.feeStatus === "cleared" ? "default" : "secondary"}>
                            {student.feeStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="outline" size="sm" onClick={() => startEditStudent(student)}>
                              <Pencil className="mr-1 size-3" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteStudent(student._id)}>
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <Dialog open={editingStudentId !== null} onOpenChange={(open) => { if (!open) setEditingStudentId(null); }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Student</DialogTitle>
                    <DialogDescription>Update student details. Changes are saved immediately.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Full Name</Label>
                      <Input value={editStudentName} onChange={(e) => setEditStudentName(e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label>Email</Label>
                        <Input value={editStudentEmail} onChange={(e) => setEditStudentEmail(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label>Phone</Label>
                        <Input value={editStudentPhone} onChange={(e) => setEditStudentPhone(e.target.value)} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label>Semester</Label>
                        <Input type="number" value={editStudentSemester} onChange={(e) => setEditStudentSemester(Number(e.target.value))} />
                      </div>
                      <div className="space-y-1">
                        <Label>Fee Status</Label>
                        <Select value={editStudentFeeStatus} onValueChange={(v) => setEditStudentFeeStatus(v as typeof editStudentFeeStatus)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="cleared">Cleared</SelectItem>
                            <SelectItem value="outstanding">Outstanding</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label>Outstanding Balance</Label>
                        <Input type="number" value={editStudentBalance} onChange={(e) => setEditStudentBalance(Number(e.target.value))} />
                      </div>
                      <div className="flex items-center gap-2 pt-5">
                        <Switch checked={editStudentLateReg} onCheckedChange={(v) => setEditStudentLateReg(v)} />
                        <Label>Late Registration</Label>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1" onClick={handleSaveStudent}>Save Changes</Button>
                      <Button variant="outline" onClick={() => setEditingStudentId(null)}>Cancel</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-4">
               <div className="rounded-md border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <UserPlus className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold">Add Student</h2>
                </div>
                <Separator className="mb-3" />
                <div className="grid gap-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={newStudentId} onChange={(event) => setNewStudentId(event.target.value)} placeholder="Student ID" />
                    <Input value={newStudentIndex} onChange={(event) => setNewStudentIndex(event.target.value)} placeholder="Index number" />
                  </div>
                  <Input value={newStudentName} onChange={(event) => setNewStudentName(event.target.value)} placeholder="Full name" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={newStudentEmail} onChange={(event) => setNewStudentEmail(event.target.value)} placeholder="Email (optional)" />
                    <Input value={newStudentPhone} onChange={(event) => setNewStudentPhone(event.target.value)} placeholder="Phone (optional)" />
                  </div>
                  <Select value={newStudentProgramId || undefined} onValueChange={(value) => setNewStudentProgramId(value as Id<"programs">)}>
                    <SelectTrigger><SelectValue placeholder="Program" /></SelectTrigger>
                    <SelectContent>
                      {(programs ?? []).map((program) => (
                        <SelectItem key={program._id} value={program._id}>{program.code} - {program.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-3 gap-2">
                    <Input type="number" value={newStudentSemester} onChange={(event) => setNewStudentSemester(Number(event.target.value || 1))} placeholder="Semester" />
                    <Input value={newStudentAcademicYear} onChange={(event) => setNewStudentAcademicYear(event.target.value)} placeholder="Academic year" />
                    <Select value={newStudentFeeStatus} onValueChange={(value) => setNewStudentFeeStatus(value as "cleared" | "outstanding")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="outstanding">Outstanding</SelectItem>
                        <SelectItem value="cleared">Cleared</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button className="w-full" onClick={handleCreateStudent}>
                    <UserPlus className="mr-1 size-3.5" /> Create student
                  </Button>
                </div>
              </div>

               <div className="rounded-md border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Upload className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold">Import Students (CSV)</h2>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    Paste CSV with columns: Student ID, Index Number, Full Name, Email, Phone
                  </p>
                  <Textarea
                    value={csvContent}
                    onChange={(event) => setCsvContent(event.target.value)}
                    placeholder="Student ID,Index Number,Full Name,Email,Phone&#10;STU001,IDX001,Jane Doe,jane@uni.edu,+1234"
                    className="font-mono text-xs"
                    rows={5}
                  />
                  <Select value={csvProgramId || undefined} onValueChange={(value) => setCsvProgramId(value as Id<"programs">)}>
                    <SelectTrigger><SelectValue placeholder="Default program" /></SelectTrigger>
                    <SelectContent>
                      {(programs ?? []).map((program) => (
                        <SelectItem key={program._id} value={program._id}>{program.code} - {program.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <Input type="number" value={csvSemester} onChange={(event) => setCsvSemester(Number(event.target.value || 1))} placeholder="Semester" />
                    <Input value={csvAcademicYear} onChange={(event) => setCsvAcademicYear(event.target.value)} placeholder="Academic year" />
                  </div>
                  <Button className="w-full" onClick={handleImportStudentsCsv} disabled={!csvContent || !csvProgramId}>
                    <Upload className="mr-1 size-3.5" /> Import CSV
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </TabsContent>
          ) : null}

        {/* ── Seating Chart Tab ── */}
          {(me.role === "super_admin" || me.role === "university_admin") ? (
          <TabsContent value="seating" className="space-y-4 pt-4">
          <section className="space-y-4">
             <div className="rounded-md border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Seating Chart Viewer</h2>
                <div className="flex items-center gap-2">
                  <Select value={seatingChartScheduleId || undefined} onValueChange={(value) => setSeatingChartScheduleId(value as Id<"examSchedules">)}>
                    <SelectTrigger className="h-8 w-[200px]">
                      <SelectValue placeholder="Select exam schedule" />
                    </SelectTrigger>
                    <SelectContent>
                      {(schedules ?? []).map((schedule) => (
                        <SelectItem key={schedule._id} value={schedule._id}>
                          {schedule.examDate} · {schedule.course?.code ?? "Exam"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {seatingChart ? (
                    <Badge variant={seatingChart.frozen ? "default" : "secondary"}>
                      <Lock className="mr-1 size-3" />
                      {seatingChart.frozen ? "Frozen" : "Unfrozen"}
                    </Badge>
          ) : null}
                </div>
              </div>

              {seatingChartScheduleId && seatingChart ? (
                <>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {seatingChart.rows.length} seat assignments
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Freeze seating</span>
                      <Switch
                        checked={seatingChart.frozen ?? false}
                        onCheckedChange={(checked: boolean) => handleFreezeSeating(seatingChartScheduleId, checked)}
                      />
                    </div>
                  </div>
                  <Separator className="mb-3" />
                  <ScrollArea className="h-80">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Seat</TableHead>
                          <TableHead>Student ID</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Index</TableHead>
                          <TableHead>Room</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seatingChart.rows.map((row) => (
                          <TableRow key={row.assignmentId}>
                            <TableCell className="font-mono text-xs">{row.seatNumber}</TableCell>
                            <TableCell className="font-mono text-xs">{row.studentId}</TableCell>
                            <TableCell className="text-xs">{row.studentName}</TableCell>
                            <TableCell className="font-mono text-xs">{row.indexNumber}</TableCell>
                            <TableCell className="text-xs">{row.roomName} ({row.roomCode})</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </>
              ) : (
                <div className="grid h-32 place-items-center text-xs text-muted-foreground">
                  Select an exam schedule to view the seating chart
                </div>
              )}
            </div>
          </section>
        </TabsContent>
        ) : null}

        {/* ── ID Cards Tab ── */}
          {(me.role === "super_admin" || me.role === "university_admin") ? (
          <TabsContent value="id-cards" className="space-y-4 pt-4">
          <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
             <div className="rounded-md border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">ID Card Registry</h2>
                <Badge variant="secondary">{idCardsList?.length ?? 0} cards</Badge>
              </div>
              <Separator className="mb-3" />
              <ScrollArea className="h-72">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Valid Until</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(idCardsList ?? []).map((card) => (
                      <TableRow key={card._id}>
                        <TableCell className="text-xs">
                          {card.student?.fullName ?? "Unknown"} ({card.student?.studentId ?? "N/A"})
                        </TableCell>
                        <TableCell>
                          <Badge variant={card.status === "printed" ? "default" : "secondary"}>
                            {roleLabel(card.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{card.validityEnd}</TableCell>
                        <TableCell>
                          {card.status !== "printed" ? (
                            <Button variant="outline" size="sm" onClick={() => handleMarkIdCardPrinted(card._id)}>
                              Mark printed
                            </Button>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Printed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="space-y-4">
               <div className="rounded-md border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <IdCard className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold">Generate ID Card</h2>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <Select value={idCardStudentId || undefined} onValueChange={(value) => setIdCardStudentId(value as Id<"students">)}>
                    <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                    <SelectContent>
                      {(studentsList ?? []).map((student) => (
                        <SelectItem key={student._id} value={student._id}>
                          {student.fullName} · {student.studentId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Valid from</Label>
                      <Input type="date" value={idCardValidityStart} onChange={(event) => setIdCardValidityStart(event.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Valid until</Label>
                      <Input type="date" value={idCardValidityEnd} onChange={(event) => setIdCardValidityEnd(event.target.value)} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleGenerateIdCard} disabled={!idCardStudentId || !idCardValidityStart || !idCardValidityEnd}>
                    Generate ID card
                  </Button>
                </div>
              </div>

               <div className="rounded-md border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <GraduationCap className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold">Bulk Generate ID Cards</h2>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <p className="text-[11px] text-muted-foreground">
                    Generate ID cards for all {studentsList?.length ?? 0} registered students
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px]">Valid from</Label>
                      <Input type="date" value={idCardValidityStart} onChange={(event) => setIdCardValidityStart(event.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Valid until</Label>
                      <Input type="date" value={idCardValidityEnd} onChange={(event) => setIdCardValidityEnd(event.target.value)} />
                    </div>
                  </div>
                  <Button className="w-full" variant="outline" onClick={handleGenerateBulkIdCards} disabled={!idCardValidityStart || !idCardValidityEnd || !studentsList?.length}>
                    Generate all ({studentsList?.length ?? 0} students)
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </TabsContent>
          ) : null}

        {/* ── Finance Tab ── */}
          {(me.role === "super_admin" || me.role === "university_admin" || me.role === "finance") ? (
          <TabsContent value="finance" className="space-y-4 pt-4">
          <section className="grid gap-4 lg:grid-cols-4">
            <MiniStat title="Total Students" value={financeClearanceOverview?.totalStudents ?? 0} />
            <MiniStat title="Cleared" value={financeClearanceOverview?.cleared ?? 0} />
            <MiniStat title="Outstanding" value={financeClearanceOverview?.outstanding ?? 0} />
            <MiniStat title="Total Owed" value={financeClearanceOverview?.totalOutstanding ?? 0} />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
             <div className="rounded-md border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Clearance Overview</h2>
                <Badge variant="secondary">{financeClearanceOverview?.rows.length ?? 0} students</Badge>
              </div>
              <Separator className="mb-3" />
              <ScrollArea className="h-72">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Fee Status</TableHead>
                      <TableHead>Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(financeClearanceOverview?.rows ?? []).map((student) => (
                      <TableRow key={student._id}>
                        <TableCell className="font-mono text-xs">{student.studentId}</TableCell>
                        <TableCell className="text-xs">{student.fullName}</TableCell>
                        <TableCell>
                          <Badge variant={student.feeStatus === "cleared" ? "default" : "secondary"}>
                            {student.feeStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">{student.outstandingBalance.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="space-y-4">
             <div className="rounded-md border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Banknote className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold">Update Student Clearance</h2>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <Select value={clearanceStudentId || undefined} onValueChange={(value) => setClearanceStudentId(value as Id<"students">)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {(financeClearanceOverview?.rows ?? []).map((student) => (
                        <SelectItem key={student._id} value={student._id}>
                          {student.fullName} · {student.studentId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={clearanceFeeStatus} onValueChange={(value) => setClearanceFeeStatus(value as "cleared" | "outstanding")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cleared">Cleared</SelectItem>
                      <SelectItem value="outstanding">Outstanding</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="number" value={clearanceOutstandingBalance} onChange={(event) => setClearanceOutstandingBalance(Number(event.target.value || 0))} placeholder="Outstanding balance" />
                  <Input value={clearanceReference} onChange={(event) => setClearanceReference(event.target.value)} placeholder="Payment reference" />
                  <Button className="w-full" onClick={handleUpdateClearance} disabled={!clearanceStudentId || !clearanceReference}>
                    Update clearance
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
             <div className="rounded-md border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <CreditCard className="size-4 text-primary" />
                <h2 className="text-sm font-semibold">Create Invigilator Payment</h2>
              </div>
              <Separator className="mb-3" />
              <div className="space-y-3">
                <Select value={paymentInvigilatorId || undefined} onValueChange={(value) => setPaymentInvigilatorId(value as Id<"invigilators">)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select invigilator" />
                  </SelectTrigger>
                  <SelectContent>
                    {(invigilatorProfiles ?? []).map((invigilator) => (
                      <SelectItem key={invigilator._id} value={invigilator._id}>
                        {invigilator.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="number" value={paymentSessions} onChange={(event) => setPaymentSessions(Number(event.target.value || 0))} placeholder="Sessions" />
                  <Input value={paymentReference} onChange={(event) => setPaymentReference(event.target.value)} placeholder="Payment reference" />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={paymentIncludeBonus} onCheckedChange={(checked: boolean) => setPaymentIncludeBonus(checked)} />
                  <span className="text-xs text-muted-foreground">Include attendance bonus</span>
                </div>
                <Button className="w-full" onClick={handleCreatePayment} disabled={!paymentInvigilatorId || !paymentReference}>
                  Create payment
                </Button>
              </div>
            </div>

             <div className="rounded-md border bg-card p-4 shadow-sm">
              <div className="mb-2 flex items-center gap-2">
                <Banknote className="size-4 text-primary" />
                <h2 className="text-sm font-semibold">Payment Records</h2>
              </div>
              <Separator className="mb-3" />
              <ScrollArea className="h-48">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reference</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(financeReports?.payments ?? []).map((payment) => (
                      <TableRow key={payment._id}>
                        <TableCell className="text-xs">{payment.reference}</TableCell>
                        <TableCell className="text-xs">{roleLabel(payment.type)}</TableCell>
                        <TableCell className="text-xs">{payment.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "paid" ? "default" : "secondary"}>
                            {roleLabel(payment.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.status !== "paid" ? (
                            <Select
                              value={undefined}
                              onValueChange={async (value) => {
                                if (!value || (value !== "pending" && value !== "approved" && value !== "paid")) {
                                  return;
                                }
                                try {
                                  await updatePaymentStatus({ paymentRecordId: payment._id, status: value });
                                  toast.success("Payment status updated");
                                } catch (error) {
                                  toast.error(error instanceof Error ? error.message : "Failed to update");
                                }
                              }}
                            >
                              <SelectTrigger className="h-7 w-[90px]">
                                <SelectValue placeholder="Update" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                                <SelectItem value="paid">Paid</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Completed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              {(financeReports?.defaulterAttendance ?? []).length > 0 ? (
                <div className="mt-3">
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Fee Defaulters with Attendance</p>
                  <ScrollArea className="h-32">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead>Fee Status</TableHead>
                          <TableHead>Attendance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(financeReports?.defaulterAttendance ?? []).map((item, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-xs">{item.fullName} ({item.studentId})</TableCell>
                            <TableCell><Badge variant="secondary">{item.feeStatus}</Badge></TableCell>
                            <TableCell className="text-xs">{item.attendanceStatus}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
          ) : null}
            </div>
          </section>
        </TabsContent>
        ) : null}

        {/* ── Messages Tab ── */}
          <TabsContent value="messages" className="space-y-4 pt-4">
          <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
             <div className="rounded-md border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Messages</h2>
                <Badge variant="secondary">{messages?.length ?? 0}</Badge>
              </div>
              <Separator className="mb-3" />
              <ScrollArea className="h-80">
                <div className="space-y-2 p-2">
                  {(messages ?? []).map((msg) => (
                    <div key={msg._id} className="border bg-background p-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium">{msg.subject}</p>
                        <Badge variant={msg.type === "broadcast" ? "default" : "outline"}>
                          {msg.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{msg.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTime(msg.createdAt)}</p>
                    </div>
                  ))}
                  {(messages?.length ?? 0) === 0 ? (
                    <p className="text-xs text-muted-foreground">No messages yet.</p>
                  ) : null}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-4">
             <div className="rounded-md border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Send className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold">Send Direct Message</h2>
                </div>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <Select value={dmRecipientId || undefined} onValueChange={(value) => setDmRecipientId(value as Id<"users">)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select recipient" />
                    </SelectTrigger>
                    <SelectContent>
                      {(allUsers ?? []).map((user) => (
                        <SelectItem key={user._id} value={user._id}>
                          {user.fullName} ({roleLabel(user.role)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={dmSubject} onChange={(event) => setDmSubject(event.target.value)} placeholder="Subject" />
                  <Textarea value={dmBody} onChange={(event) => setDmBody(event.target.value)} placeholder="Message" />
                  <Button className="w-full" onClick={handleSendDirectMessage} disabled={!dmRecipientId || !dmSubject || !dmBody}>
                    <Send className="mr-1 size-3.5" /> Send message
                  </Button>
                </div>
              </div>

              <div className="rounded-md border bg-card p-4 shadow-sm">
                <div className="mb-2 flex items-center gap-2">
                  <Mail className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold">Notifications</h2>
                  <Badge variant="outline">{unread} unread</Badge>
                </div>
                <Separator className="mb-3" />
                <ScrollArea className="h-48">
                  <div className="space-y-2">
                    {notifications.map((notification) => (
                      <div key={notification._id} className="flex items-start justify-between gap-2 rounded-md border bg-background/60 p-2">
                        <div>
                          <p className={`text-xs font-medium ${!notification.readAt ? "text-primary" : ""}`}>{notification.title}</p>
                          <p className="text-xs text-muted-foreground">{notification.body}</p>
                          <p className="text-[11px] text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
                        </div>
                        {!notification.readAt ? (
                          <Button variant="outline" size="sm" onClick={() => handleMarkNotificationRead(notification._id as Id<"notifications">)}>
                            <Check className="size-3" />
                          </Button>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Read</span>
                        )}
                      </div>
                    ))}
                    {notifications.length === 0 ? <p className="text-xs text-muted-foreground">No notifications.</p> : null}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </section>
        </TabsContent>

{me.role === "super_admin" ? (
          <TabsContent value="tenant" className="space-y-4 pt-4">
            {activeAnnouncements.length > 0 ? (
              <div className="space-y-2">
                {activeAnnouncements.map((ann) => (
                  <div key={ann._id} className={`flex items-center justify-between gap-3 rounded-md border p-3 text-xs ${ann.severity === "critical" ? "border-destructive bg-destructive/10" : ann.severity === "warning" ? "border-yellow-500 bg-yellow-500/10" : "border-primary/30 bg-primary/5"}`}>
                    <div className="flex items-center gap-2">
                      <Badge variant={ann.severity === "critical" ? "destructive" : ann.severity === "warning" ? "secondary" : "outline"}>{ann.severity}</Badge>
                      <span className="font-medium">{ann.message}</span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => handleDeleteAnnouncement(ann._id)}>
                      <X className="size-3" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}

          <section className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
            <div className="rounded-md border bg-background/60 p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold">University Registry</h2>
              <Separator className="mb-3" />
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(universities ?? []).map((tenant) => (
                    <TableRow key={tenant._id}>
                      <TableCell>{tenant.name}</TableCell>
                      <TableCell>{tenant.code}</TableCell>
                      <TableCell>{tenant.isActive ? "Active" : "Disabled"}</TableCell>
                      <TableCell>{formatDateTime(tenant.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-4">
              <div className="rounded-md border bg-background/60 p-4 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold">University Creation</h2>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="tenantName">University name</Label>
                    <Input id="tenantName" value={tenantName} onChange={(event) => setTenantName(event.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tenantCode">University code</Label>
                    <Input id="tenantCode" value={tenantCode} onChange={(event) => setTenantCode(event.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="tenantDomains">Allowed email domains</Label>
                    <Input id="tenantDomains" value={tenantDomains} onChange={(event) => setTenantDomains(event.target.value)} placeholder="nku.edu,students.nku.edu" />
                  </div>
                  <Button onClick={handleSeedTenant} disabled={seedStatus === "running" || !tenantName || !tenantCode || !tenantDomains}>
                    {seedStatus === "running" ? "Creating..." : "Create university"}
                  </Button>
                </div>
              </div>

              {(me.role === "super_admin" || me.role === "university_admin") ? (
              <div className="rounded-md border bg-background/60 p-4 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold">Branding Settings</h2>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="brandingLogo">Logo URL</Label>
                    <Input id="brandingLogo" value={brandingLogoUrl} onChange={(event) => setBrandingLogoUrl(event.target.value)} placeholder="https://example.com/logo.png" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="brandingPrimary">Primary Color</Label>
                      <div className="flex items-center gap-2">
                        <Input type="color" value={brandingPrimaryColor} onChange={(event) => setBrandingPrimaryColor(event.target.value)} className="h-8 w-10 p-1" />
                        <Input value={brandingPrimaryColor} onChange={(event) => setBrandingPrimaryColor(event.target.value)} className="font-mono text-xs" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="brandingSecondary">Secondary Color</Label>
                      <div className="flex items-center gap-2">
                        <Input type="color" value={brandingSecondaryColor} onChange={(event) => setBrandingSecondaryColor(event.target.value)} className="h-8 w-10 p-1" />
                        <Input value={brandingSecondaryColor} onChange={(event) => setBrandingSecondaryColor(event.target.value)} className="font-mono text-xs" />
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleUpdateBranding} disabled={!activeUniversityId}>
                    Save branding
                  </Button>
                </div>
              </div>
              ) : null}

              <div className="rounded-md border bg-background/60 p-4 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold">Update Email Domains</h2>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="updateDomains">Allowed domains (comma separated)</Label>
                    <Input id="updateDomains" value={tenantDomains} onChange={(event) => setTenantDomains(event.target.value)} placeholder="domain.edu,students.domain.edu" />
                  </div>
                  <Button onClick={handleUpdateEmailDomains} disabled={!activeUniversityId}>
                    Update domains
                  </Button>
                </div>
              </div>

              <div className="rounded-md border bg-background/60 p-4 shadow-sm">
                <h2 className="mb-2 text-sm font-semibold">Emergency Announcement</h2>
                <Separator className="mb-3" />
                <div className="space-y-3">
                  <Textarea value={announcementMessage} onChange={(event) => setAnnouncementMessage(event.target.value)} placeholder="Announcement message..." rows={2} />
                  <Select value={announcementSeverity} onValueChange={(v) => setAnnouncementSeverity(v as typeof announcementSeverity)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info</SelectItem>
                      <SelectItem value="warning">Warning</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="datetime-local" value={announcementActiveTo} onChange={(event) => setAnnouncementActiveTo(event.target.value)} />
                  <Button onClick={handleCreateAnnouncement} disabled={!activeUniversityId || !announcementMessage || !announcementActiveTo}>
                    <Megaphone className="mr-1 size-3.5" /> Publish
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </TabsContent>
          ) : null}
      </Tabs>

      {(me.role === "super_admin" || me.role === "university_admin" || me.role === "student" || me.role === "invigilator") ? (
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-md border bg-background/60 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{me.role === "student" || me.role === "invigilator" ? "My Complaints" : "Complaints Queue"}</h2>
            <Badge>{complaints?.length ?? 0}</Badge>
          </div>
          <Separator className="mb-3" />
          <ScrollArea className="h-60">
            <div className="p-2">
              {(complaints ?? []).slice(0, 20).map((item) => (
                <div key={item._id} className="mb-2 border bg-background p-2 last:mb-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium">{item.subject}</p>
                    <Badge variant="outline">{roleLabel(item.status)}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatDateTime(item.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {me.role === "student" || me.role === "invigilator" ? (
           <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Submit Complaint</h2>
            <Separator />
            <Label htmlFor="complaint-category">Category</Label>
            <Select value={complaintCategory} onValueChange={(value) => setComplaintCategory(value as typeof complaintCategory)}>
              <SelectTrigger id="complaint-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wrong_seat">Wrong seat</SelectItem>
                <SelectItem value="wrong_timetable">Wrong timetable</SelectItem>
                <SelectItem value="wrong_details">Wrong details</SelectItem>
                <SelectItem value="payment_issue">Payment issue</SelectItem>
                <SelectItem value="id_verification_issue">ID verification issue</SelectItem>
                <SelectItem value="attendance_system_issue">Attendance issue</SelectItem>
                <SelectItem value="schedule_conflict">Schedule conflict</SelectItem>
                <SelectItem value="room_issue">Room issue</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Label htmlFor="complaint-subject">Subject</Label>
            <Input id="complaint-subject" value={complaintSubject} onChange={(event) => setComplaintSubject(event.target.value)} />

            <Label htmlFor="complaint-description">Description</Label>
            <Textarea
              id="complaint-description"
              value={complaintDescription}
              onChange={(event) => setComplaintDescription(event.target.value)}
              placeholder="Describe the issue clearly"
            />

            <Button className="w-full" onClick={handleSubmitComplaint}>
              Submit complaint
            </Button>

            {me.role === "student" ? (
              <div className="space-y-2 rounded-md border bg-background/60 p-3 text-xs">
                <p className="font-medium">Digital ID Card</p>
                {getMyDigitalIdCard === undefined ? (
                  <p className="text-muted-foreground">Loading profile...</p>
                ) : getMyDigitalIdCard === null ? (
                  <p className="text-muted-foreground">
                    Student profile is still syncing. This happens automatically after signup and can take a few seconds.
                  </p>
                ) : (
                  <>
                    <p>Student: {getMyDigitalIdCard.student.fullName}</p>
                    <p>Program: {getMyDigitalIdCard.program?.name ?? "Not assigned"}</p>
                    <p>Status: {getMyDigitalIdCard.idCard?.status ?? "Not generated"}</p>
                    {getMyDigitalIdCard.idCard ? (
                      <>
                        <Label htmlFor="reprint-reason">Reprint reason</Label>
                        <Textarea
                          id="reprint-reason"
                          value={reprintReason}
                          onChange={(event) => setReprintReason(event.target.value)}
                          placeholder="Reason for requesting a reprint"
                        />
                        <Button variant="outline" className="w-full" onClick={handleRequestReprint}>
                          Request ID reprint
                        </Button>
                      </>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
          </div>
        ) : (me.role === "super_admin" || me.role === "university_admin") ? (
           <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
            <div className="mb-1 flex items-center gap-2">
              <MessageSquare className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Manage Complaint Status</h2>
            </div>
            <Separator />
            <div className="space-y-3">
              <Select value={complaintActionId || undefined} onValueChange={(value) => setComplaintActionId(value as Id<"complaints">)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select complaint" />
                </SelectTrigger>
                <SelectContent>
                  {(complaints ?? []).filter((item) => item.status !== "resolved").map((item) => (
                    <SelectItem key={item._id} value={item._id}>
                      {item.subject} ({roleLabel(item.status)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={complaintNewStatus} onValueChange={(value) => setComplaintNewStatus(value as typeof complaintNewStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Textarea
                value={complaintResolutionNote}
                onChange={(event) => setComplaintResolutionNote(event.target.value)}
                placeholder="Resolution note (optional)"
              />
              <Button className="w-full" onClick={handleUpdateComplaintStatus} disabled={!complaintActionId}>
                Update complaint status
              </Button>
            </div>
          </div>
        ) : null}

      </section>
      ) : null}

      {(me.role === "super_admin" || me.role === "university_admin" || me.role === "finance") ? (
      <Dialog>
        <DialogTrigger
          render={<Button variant="outline" className="fixed bottom-6 right-6 gap-2" />}
        >
          <ChartColumn className="size-3.5" />
          Metrics snapshot
        </DialogTrigger>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Operational Snapshot</DialogTitle>
            <DialogDescription>
              Real-time status summary across attendance, seating, and issue resolution.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 text-xs">
            <div className="flex items-center justify-between rounded-md border bg-background/60 p-2">
              <span>Current role</span>
              <span className="font-medium">{roleLabel(me.role)}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-background/60 p-2">
              <span>Unread notifications</span>
              <span className="font-medium">{unread}</span>
            </div>
            <div className="flex items-center justify-between rounded-md border bg-background/60 p-2">
              <span>Universities</span>
              <span className="font-medium">{universities?.length ?? 0}</span>
            </div>
            {me.role !== "finance" ? (
              <div className="flex items-center justify-between rounded-md border bg-background/60 p-2">
                <span>Penalty records</span>
                <span className="font-medium">{penalties?.length ?? 0}</span>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      ) : null}
    </div>
  );
}

function RolePanels({
  role,
  adminDashboard,
  studentDashboard,
  invigilatorDashboard,
  financeDashboard,
  superAdminDashboard,
}: {
  role: string;
  adminDashboard: ReturnType<typeof useQuery<typeof api.dashboard.adminDashboard>>;
  studentDashboard: ReturnType<typeof useQuery<typeof api.dashboard.studentDashboard>>;
  invigilatorDashboard: ReturnType<typeof useQuery<typeof api.dashboard.invigilatorDashboard>>;
  financeDashboard: ReturnType<typeof useQuery<typeof api.dashboard.financeDashboard>>;
  superAdminDashboard: ReturnType<typeof useQuery<typeof api.dashboard.superAdminDashboard>>;
}) {
  if (role === "super_admin" && superAdminDashboard) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Global visibility and oversight across all universities.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          <QuickMetric
            title="Universities"
            value={superAdminDashboard.totalUniversities}
            icon={Landmark}
          />
          <QuickMetric title="Users" value={superAdminDashboard.totalUsers} icon={Users} />
          <QuickMetric
            title="Recent Audit"
            value={superAdminDashboard.latestAudit.length}
            icon={FileText}
          />
        </div>
      </div>
    );
  }

  if (role === "university_admin" && adminDashboard) {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <QuickMetric title="Students" value={adminDashboard.metrics.totalStudents} icon={Users} />
        <QuickMetric
          title="Invigilators"
          value={adminDashboard.metrics.totalInvigilators}
          icon={BadgeCheck}
        />
        <QuickMetric title="Rooms" value={adminDashboard.metrics.totalRooms} icon={LayoutGrid} />
      </div>
    );
  }

  if (role === "student" && studentDashboard) {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <QuickMetric
          title="Timetable Entries"
          value={studentDashboard.timetable.length}
          icon={CalendarClock}
        />
        <QuickMetric
          title="Outstanding"
          value={studentDashboard.feeStatus.outstandingBalance}
          icon={Landmark}
        />
        <QuickMetric
          title="Complaints"
          value={studentDashboard.complaints.length}
          icon={AlertCircle}
        />
      </div>
    );
  }

  if (role === "invigilator" && invigilatorDashboard) {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <QuickMetric
          title="Today"
          value={invigilatorDashboard.todayAssignments.length}
          icon={CalendarClock}
        />
        <QuickMetric
          title="Upcoming"
          value={invigilatorDashboard.upcomingAssignments.length}
          icon={LayoutGrid}
        />
        <QuickMetric title="History" value={invigilatorDashboard.history.length} icon={FileText} />
      </div>
    );
  }

  if (role === "finance" && financeDashboard) {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <QuickMetric title="Cleared" value={financeDashboard.clearance.cleared} icon={BadgeCheck} />
        <QuickMetric
          title="Outstanding"
          value={financeDashboard.clearance.outstanding}
          icon={AlertCircle}
        />
        <QuickMetric title="Payments" value={financeDashboard.payments.length} icon={Landmark} />
      </div>
    );
  }

  return <p className="text-xs text-muted-foreground">No metrics are available for this role yet.</p>;
}

function RoleOperations({
  role,
  adminDashboard,
  studentDashboard,
  invigilatorDashboard,
  financeDashboard,
  superAdminDashboard,
  notifications,
  complaints,
  universities,
  programs,
  courses,
  rooms,
  schedules,
  invigilatorProfiles,
  activeUniversityId,
  roleTimetable,
  adminInvigilatorAssignments,
  studentsList,
  editState,
  editSetters,
  editActions,
  formState,
  setters,
  actions,
}: {
  role: string;
  adminDashboard: ReturnType<typeof useQuery<typeof api.dashboard.adminDashboard>>;
  studentDashboard: ReturnType<typeof useQuery<typeof api.dashboard.studentDashboard>>;
  invigilatorDashboard: ReturnType<typeof useQuery<typeof api.dashboard.invigilatorDashboard>>;
  financeDashboard: ReturnType<typeof useQuery<typeof api.dashboard.financeDashboard>>;
  superAdminDashboard: ReturnType<typeof useQuery<typeof api.dashboard.superAdminDashboard>>;
  notifications: Array<{ _id: string; title: string; body: string; createdAt: number }>;
  complaints: Array<{ _id: string; subject: string; status: string; createdAt: number }>;
  universities: Array<{ _id: string; name: string; code: string; allowedEmailDomains?: string[] }>;
  programs: Array<{ _id: Id<"programs">; code: string; name: string; durationSemesters?: number; isActive?: boolean }>;
  courses: Array<{ _id: Id<"courses">; code: string; name: string; semester?: number; creditHours?: number }>;
  rooms: Array<{ _id: Id<"rooms">; code: string; name: string; capacity?: number; location?: string }>;
  schedules: Array<{ _id: Id<"examSchedules">; examDate: string; startTime?: string; endTime?: string; status?: string; course?: { code: string; name: string } | null; program?: { code: string; name: string } | null; room?: { code: string; name: string } | null; invigilator?: { fullName: string } | null }>;
  invigilatorProfiles: Array<{ _id: Id<"invigilators">; fullName: string }>;
  activeUniversityId: Id<"universities"> | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  roleTimetable: Array<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminInvigilatorAssignments: Array<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  studentsList: Array<any>;
  editState: {
    editingProgramId: Id<"programs"> | null;
    editProgramCode: string;
    editProgramName: string;
    editProgramDuration: number;
    editingCourseId: Id<"courses"> | null;
    editCourseCode: string;
    editCourseName: string;
    editCourseSemester: number;
    editCourseCreditHours: number;
    editingRoomId: Id<"rooms"> | null;
    editRoomName: string;
    editRoomCode: string;
    editRoomCapacity: number;
    editRoomLocation: string;
    editingScheduleId: Id<"examSchedules"> | null;
    editScheduleDate: string;
    editScheduleStartTime: string;
    editScheduleEndTime: string;
    editScheduleStatus: "draft" | "published" | "ongoing" | "completed";
  };
  editSetters: {
    setEditingProgramId: (value: Id<"programs"> | null) => void;
    setEditProgramCode: (value: string) => void;
    setEditProgramName: (value: string) => void;
    setEditProgramDuration: (value: number) => void;
    setEditingCourseId: (value: Id<"courses"> | null) => void;
    setEditCourseCode: (value: string) => void;
    setEditCourseName: (value: string) => void;
    setEditCourseSemester: (value: number) => void;
    setEditCourseCreditHours: (value: number) => void;
    setEditingRoomId: (value: Id<"rooms"> | null) => void;
    setEditRoomName: (value: string) => void;
    setEditRoomCode: (value: string) => void;
    setEditRoomCapacity: (value: number) => void;
    setEditRoomLocation: (value: string) => void;
    setEditingScheduleId: (value: Id<"examSchedules"> | null) => void;
    setEditScheduleDate: (value: string) => void;
    setEditScheduleStartTime: (value: string) => void;
    setEditScheduleEndTime: (value: string) => void;
    setEditScheduleStatus: (value: "draft" | "published" | "ongoing" | "completed") => void;
  };
  editActions: {
    handleUpdateProgram: () => Promise<void>;
    handleUpdateCourse: () => Promise<void>;
    handleUpdateRoom: () => Promise<void>;
    handleDeleteRoom: (roomId: Id<"rooms">) => Promise<void>;
    handleUpdateSchedule: () => Promise<void>;
    handleDeleteSchedule: (scheduleId: Id<"examSchedules">) => Promise<void>;
    handleDeleteInvigilatorAssignment: (assignmentId: Id<"invigilatorAssignments">) => Promise<void>;
  };
  formState: {
    programCode: string;
    programName: string;
    programDuration: number;
    courseProgramId: Id<"programs"> | "";
    courseCode: string;
    courseName: string;
    courseSemester: number;
    courseCreditHours: number;
    roomName: string;
    roomCode: string;
    roomCapacity: number;
    roomLocation: string;
    roomType: "hall" | "lab" | "small_class" | "special_needs";
    scheduleProgramId: Id<"programs"> | "";
    scheduleCourseId: Id<"courses"> | "";
    scheduleRoomId: Id<"rooms"> | "";
    scheduleInvigilatorId: Id<"invigilators"> | "";
    scheduleDate: string;
    scheduleStartTime: string;
    scheduleEndTime: string;
    assignmentScheduleId: Id<"examSchedules"> | "";
    assignmentInvigilatorId: Id<"invigilators"> | "";
    assignmentRoomId: Id<"rooms"> | "";
    assignmentDate: string;
    seatingScheduleId: Id<"examSchedules"> | "";
  };
  setters: {
    setProgramCode: (value: string) => void;
    setProgramName: (value: string) => void;
    setProgramDuration: (value: number) => void;
    setCourseProgramId: (value: Id<"programs"> | "") => void;
    setCourseCode: (value: string) => void;
    setCourseName: (value: string) => void;
    setCourseSemester: (value: number) => void;
    setCourseCreditHours: (value: number) => void;
    setRoomName: (value: string) => void;
    setRoomCode: (value: string) => void;
    setRoomCapacity: (value: number) => void;
    setRoomLocation: (value: string) => void;
    setRoomType: (value: "hall" | "lab" | "small_class" | "special_needs") => void;
    setScheduleProgramId: (value: Id<"programs"> | "") => void;
    setScheduleCourseId: (value: Id<"courses"> | "") => void;
    setScheduleRoomId: (value: Id<"rooms"> | "") => void;
    setScheduleInvigilatorId: (value: Id<"invigilators"> | "") => void;
    setScheduleDate: (value: string) => void;
    setScheduleStartTime: (value: string) => void;
    setScheduleEndTime: (value: string) => void;
    setAssignmentScheduleId: (value: Id<"examSchedules"> | "") => void;
    setAssignmentInvigilatorId: (value: Id<"invigilators"> | "") => void;
    setAssignmentRoomId: (value: Id<"rooms"> | "") => void;
    setAssignmentDate: (value: string) => void;
    setSeatingScheduleId: (value: Id<"examSchedules"> | "") => void;
  };
  actions: {
    handleCreateProgram: () => Promise<void>;
    handleCreateCourse: () => Promise<void>;
    handleCreateRoom: () => Promise<void>;
    handleCreateSchedule: () => Promise<void>;
    handleAssignInvigilator: () => Promise<void>;
    handleGenerateSeating: () => Promise<void>;
  };
}) {
  const [confirmDeleteRoomId, setConfirmDeleteRoomId] = useState<Id<"rooms"> | null>(null);
  const [confirmDeleteAssignmentId, setConfirmDeleteAssignmentId] = useState<Id<"invigilatorAssignments"> | null>(null);
  const [confirmDeleteScheduleId, setConfirmDeleteScheduleId] = useState<Id<"examSchedules"> | null>(null);

  if (role === "student") {
    return (
      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">My Exam Access</h2>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-3">
              <QuickMetric title="Timetable" value={studentDashboard?.timetable.length ?? 0} icon={CalendarClock} />
              <QuickMetric title="Complaints" value={studentDashboard?.complaints.length ?? 0} icon={AlertCircle} />
              <QuickMetric title="Outstanding" value={studentDashboard?.feeStatus.outstandingBalance ?? 0} icon={CreditCard} />
            </div>
          </div>
          <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <Separator />
            <div className="space-y-2 text-xs">
              {notifications.slice(0, 5).map((notification) => (
                <div key={notification._id} className="rounded-md border bg-background/60 p-2">
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-muted-foreground">{notification.body}</p>
                </div>
              ))}
              {notifications.length === 0 ? <p className="text-muted-foreground">No notifications yet.</p> : null}
            </div>
          </div>
        </div>

        {/* Student Exam Timetable */}
         <div className="rounded-md border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">My Exam Timetable</h2>
            <Badge variant="secondary">{roleTimetable.length} exams</Badge>
          </div>
          <Separator className="mb-3" />
          {roleTimetable.length > 0 ? (
            <ScrollArea className="max-h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleTimetable.map((entry: { _id: string; examDate: string; startTime: string; endTime: string; status: string; course?: { code: string; name: string } | null; program?: { code: string; name: string } | null; room?: { code: string; name: string } | null }) => (
                    <TableRow key={entry._id}>
                      <TableCell className="whitespace-nowrap text-xs">{entry.examDate}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{entry.startTime} - {entry.endTime}</TableCell>
                      <TableCell className="text-xs font-medium">{entry.course?.code ?? "—"} {entry.course?.name ? `· ${entry.course.name}` : ""}</TableCell>
                      <TableCell className="text-xs">{entry.program?.code ?? "—"}</TableCell>
                      <TableCell className="text-xs">{entry.room?.name ?? entry.room?.code ?? "TBA"}</TableCell>
                       <TableCell><Badge variant="outline" className="text-[10px]">{roleLabel(entry.status)}</Badge></TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </ScrollArea>
           ) : (
             <p className="text-xs text-muted-foreground">No exams scheduled for your program yet.</p>
          )}
        </div>
      </section>
    );
  }

  if (role === "invigilator") {
    return (
      <section className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
           <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Assignment Summary</h2>
            <Separator />
            <div className="grid gap-3 sm:grid-cols-3">
              <QuickMetric title="Today" value={invigilatorDashboard?.todayAssignments.length ?? 0} icon={CalendarClock} />
              <QuickMetric title="Upcoming" value={invigilatorDashboard?.upcomingAssignments.length ?? 0} icon={LayoutGrid} />
              <QuickMetric title="History" value={invigilatorDashboard?.history.length ?? 0} icon={FileText} />
            </div>
          </div>
           <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Notifications</h2>
            <Separator />
            <div className="space-y-2 text-xs">
              {notifications.slice(0, 5).map((notification) => (
                <div key={notification._id} className="rounded-md border bg-background/60 p-2">
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-muted-foreground">{notification.body}</p>
                </div>
              ))}
              {notifications.length === 0 ? <p className="text-muted-foreground">No notifications yet.</p> : null}
            </div>
          </div>
        </div>

        {/* Invigilator Exam Timetable */}
        <div className="rounded-md border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">My Assigned Exams</h2>
            <Badge variant="secondary">{roleTimetable.length} assignments</Badge>
          </div>
          <Separator className="mb-3" />
          {roleTimetable.length > 0 ? (
            <ScrollArea className="max-h-80">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roleTimetable.map((entry: { _id: string; examDate: string; startTime: string; endTime: string; status: string; course?: { code: string; name: string } | null; program?: { code: string; name: string } | null; room?: { code: string; name: string } | null }) => (
                    <TableRow key={entry._id}>
                      <TableCell className="whitespace-nowrap text-xs">{entry.examDate}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{entry.startTime} - {entry.endTime}</TableCell>
                      <TableCell className="text-xs font-medium">{entry.course?.code ?? "—"} {entry.course?.name ? `· ${entry.course.name}` : ""}</TableCell>
                      <TableCell className="text-xs">{entry.program?.code ?? "—"}</TableCell>
                      <TableCell className="text-xs">{entry.room?.name ?? entry.room?.code ?? "TBA"}</TableCell>
                       <TableCell><Badge variant="outline" className="text-[10px]">{roleLabel(entry.status)}</Badge></TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </ScrollArea>
           ) : (
             <p className="text-xs text-muted-foreground">No exam assignments found.</p>
          )}
        </div>
      </section>
    );
  }

  if (role === "finance") {
    return (
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
         <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Clearance Summary</h2>
          <Separator />
          <div className="grid gap-3 sm:grid-cols-3">
            <QuickMetric title="Total Students" value={financeDashboard?.clearance.totalStudents ?? 0} icon={Users} />
            <QuickMetric title="Cleared" value={financeDashboard?.clearance.cleared ?? 0} icon={BadgeCheck} />
            <QuickMetric title="Outstanding" value={financeDashboard?.clearance.outstanding ?? 0} icon={CreditCard} />
          </div>
        </div>
         <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Payment Records</h2>
          <Separator />
          <div className="space-y-2 text-xs">
            {(financeDashboard?.payments ?? []).slice(0, 5).map((payment) => (
              <div key={payment._id} className="rounded-md border bg-background/60 p-2">
                <p className="font-medium">{payment.reference ?? payment._id}</p>
                <p className="text-muted-foreground">Amount: {payment.amount}</p>
              </div>
            ))}
            {(financeDashboard?.payments.length ?? 0) === 0 ? <p className="text-muted-foreground">No payment records yet.</p> : null}
          </div>
        </div>
      </section>
    );
  }

  if (role === "super_admin") {
    return (
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
         <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Global Oversight</h2>
            <Badge variant="outline">Live</Badge>
          </div>
          <Separator />
          <RolePanels
            role={role}
            adminDashboard={adminDashboard}
            studentDashboard={studentDashboard}
            invigilatorDashboard={invigilatorDashboard}
            financeDashboard={financeDashboard}
            superAdminDashboard={superAdminDashboard}
          />
        </div>
         <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">University Domains</h2>
          <Separator />
          <div className="space-y-2 text-xs">
            {universities.slice(0, 5).map((university) => (
              <div key={university._id} className="rounded-md border bg-background/60 p-2">
                <p className="font-medium">{university.name}</p>
                <p className="text-muted-foreground">{(university.allowedEmailDomains ?? []).join(", ") || "No domains configured"}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {/* Top row: Admin overview + quick create */}
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
         <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Administrative Overview</h2>
            <Badge variant="outline">Live</Badge>
          </div>
          <Separator />
          <RolePanels
            role={role}
            adminDashboard={adminDashboard}
            studentDashboard={studentDashboard}
            invigilatorDashboard={invigilatorDashboard}
            financeDashboard={financeDashboard}
            superAdminDashboard={superAdminDashboard}
          />
        </div>
            <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold">Quick Create</h2>
              <Separator />
              {activeUniversityId ? (
                <div className="divide-y divide-border/60 text-xs">
                  <div className="grid gap-2 pb-4">
                    <p className="font-medium">Create Program</p>
                    <Input value={formState.programCode} onChange={(event) => setters.setProgramCode(event.target.value)} placeholder="Program code" />
                    <Input value={formState.programName} onChange={(event) => setters.setProgramName(event.target.value)} placeholder="Program name" />
                    <Input type="number" value={formState.programDuration} onChange={(event) => setters.setProgramDuration(Number(event.target.value || 0))} placeholder="Duration" />
                    <Button onClick={actions.handleCreateProgram}>Create program</Button>
                  </div>

                  <div className="grid gap-2 py-4">
                    <p className="font-medium">Create Course</p>
                    <Select value={formState.courseProgramId || undefined} onValueChange={(value) => setters.setCourseProgramId(value as Id<"programs">)}>
                      <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                      <SelectContent>
                        {programs.map((program) => <SelectItem key={program._id} value={program._id}>{program.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input value={formState.courseCode} onChange={(event) => setters.setCourseCode(event.target.value)} placeholder="Course code" />
                    <Input value={formState.courseName} onChange={(event) => setters.setCourseName(event.target.value)} placeholder="Course name" />
                    <Button onClick={actions.handleCreateCourse}>Create course</Button>
                  </div>

                  <div className="grid gap-2 py-4">
                    <p className="font-medium">Create Room</p>
                    <Input value={formState.roomName} onChange={(event) => setters.setRoomName(event.target.value)} placeholder="Room name" />
                    <Input value={formState.roomCode} onChange={(event) => setters.setRoomCode(event.target.value)} placeholder="Room code" />
                    <Input type="number" value={formState.roomCapacity} onChange={(event) => setters.setRoomCapacity(Number(event.target.value || 0))} placeholder="Capacity" />
                    <Input value={formState.roomLocation} onChange={(event) => setters.setRoomLocation(event.target.value)} placeholder="Location" />
                    <Button onClick={actions.handleCreateRoom}>Create room</Button>
                  </div>

                  <div className="grid gap-2 py-4">
                    <p className="font-medium">Create Schedule</p>
                    <Select value={formState.scheduleProgramId || undefined} onValueChange={(value) => setters.setScheduleProgramId(value as Id<"programs">)}>
                      <SelectTrigger><SelectValue placeholder="Program" /></SelectTrigger>
                      <SelectContent>
                        {programs.map((program) => <SelectItem key={program._id} value={program._id}>{program.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={formState.scheduleCourseId || undefined} onValueChange={(value) => setters.setScheduleCourseId(value as Id<"courses">)}>
                      <SelectTrigger><SelectValue placeholder="Course" /></SelectTrigger>
                      <SelectContent>
                        {courses.map((course) => <SelectItem key={course._id} value={course._id}>{course.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={formState.scheduleRoomId || undefined} onValueChange={(value) => setters.setScheduleRoomId(value as Id<"rooms">)}>
                      <SelectTrigger><SelectValue placeholder="Room" /></SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => <SelectItem key={room._id} value={room._id}>{room.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={formState.scheduleInvigilatorId || undefined} onValueChange={(value) => setters.setScheduleInvigilatorId(value as Id<"invigilators">)}>
                      <SelectTrigger><SelectValue placeholder="Invigilator" /></SelectTrigger>
                      <SelectContent>
                        {invigilatorProfiles.map((invigilator) => <SelectItem key={invigilator._id} value={invigilator._id}>{invigilator.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={formState.scheduleDate} onChange={(event) => setters.setScheduleDate(event.target.value)} />
                    <Input type="time" value={formState.scheduleStartTime} onChange={(event) => setters.setScheduleStartTime(event.target.value)} />
                    <Input type="time" value={formState.scheduleEndTime} onChange={(event) => setters.setScheduleEndTime(event.target.value)} />
                    <Button onClick={actions.handleCreateSchedule}>Create schedule</Button>
                  </div>

                  <div className="grid gap-2 py-4">
                    <p className="font-medium">Assign Invigilator</p>
                    <Select value={formState.assignmentScheduleId || undefined} onValueChange={(value) => setters.setAssignmentScheduleId(value as Id<"examSchedules">)}>
                      <SelectTrigger><SelectValue placeholder="Schedule" /></SelectTrigger>
                      <SelectContent>
                        {schedules.map((schedule) => <SelectItem key={schedule._id} value={schedule._id}>{schedule.course?.code ?? schedule.examDate}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={formState.assignmentInvigilatorId || undefined} onValueChange={(value) => setters.setAssignmentInvigilatorId(value as Id<"invigilators">)}>
                      <SelectTrigger><SelectValue placeholder="Invigilator" /></SelectTrigger>
                      <SelectContent>
                        {invigilatorProfiles.map((invigilator) => <SelectItem key={invigilator._id} value={invigilator._id}>{invigilator.fullName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={formState.assignmentRoomId || undefined} onValueChange={(value) => setters.setAssignmentRoomId(value as Id<"rooms">)}>
                      <SelectTrigger><SelectValue placeholder="Room" /></SelectTrigger>
                      <SelectContent>
                        {rooms.map((room) => <SelectItem key={room._id} value={room._id}>{room.code}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input type="date" value={formState.assignmentDate} onChange={(event) => setters.setAssignmentDate(event.target.value)} />
                    <Button onClick={actions.handleAssignInvigilator}>Assign invigilator</Button>
                  </div>

                  <div className="grid gap-2 pt-4">
                    <p className="font-medium">Generate Seating</p>
                    <Select value={formState.seatingScheduleId || undefined} onValueChange={(value) => setters.setSeatingScheduleId(value as Id<"examSchedules">)}>
                      <SelectTrigger><SelectValue placeholder="Schedule" /></SelectTrigger>
                      <SelectContent>
                        {schedules.map((schedule) => <SelectItem key={schedule._id} value={schedule._id}>{schedule.course?.code ?? schedule.examDate}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button onClick={actions.handleGenerateSeating}>Generate seating</Button>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Select a university first.</p>
              )}
            </div>
      </div>

      {/* Entity Management Tables */}
      {activeUniversityId ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Programs Table */}
           <div className="rounded-md border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Programs</h2>
              <Badge variant="secondary">{programs.length}</Badge>
            </div>
            <Separator className="mb-3" />
            <ScrollArea className="max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs.map((program) => (
                    <TableRow key={program._id}>
                      {editState.editingProgramId === program._id ? (
                        <>
                          <TableCell><Input className="h-7 text-xs" value={editState.editProgramCode} onChange={(e) => editSetters.setEditProgramCode(e.target.value)} /></TableCell>
                          <TableCell><Input className="h-7 text-xs" value={editState.editProgramName} onChange={(e) => editSetters.setEditProgramName(e.target.value)} /></TableCell>
                          <TableCell><Input className="h-7 w-16 text-xs" type="number" value={editState.editProgramDuration} onChange={(e) => editSetters.setEditProgramDuration(Number(e.target.value || 0))} /></TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={editActions.handleUpdateProgram} title="Save program">
                                <Check className="size-3" />
                                Save
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => editSetters.setEditingProgramId(null)} title="Cancel edit">
                                <X className="size-3" />
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-xs font-medium">{program.code}</TableCell>
                          <TableCell className="text-xs">{program.name}</TableCell>
                          <TableCell className="text-xs">{program.durationSemesters ?? "—"}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" title="Edit program" onClick={() => {
                              editSetters.setEditingProgramId(program._id);
                              editSetters.setEditProgramCode(program.code);
                              editSetters.setEditProgramName(program.name);
                              editSetters.setEditProgramDuration(program.durationSemesters ?? 8);
                            }}>
                              <Pencil className="size-3" />
                              Edit
                            </Button>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {programs.length === 0 ? <TableRow><TableCell colSpan={4} className="text-xs text-muted-foreground">No programs created yet.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Courses Table */}
           <div className="rounded-md border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Courses</h2>
              <Badge variant="secondary">{courses.length}</Badge>
            </div>
            <Separator className="mb-3" />
            <ScrollArea className="max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Sem</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((course) => (
                    <TableRow key={course._id}>
                      {editState.editingCourseId === course._id ? (
                        <>
                          <TableCell><Input className="h-7 text-xs" value={editState.editCourseCode} onChange={(e) => editSetters.setEditCourseCode(e.target.value)} /></TableCell>
                          <TableCell><Input className="h-7 text-xs" value={editState.editCourseName} onChange={(e) => editSetters.setEditCourseName(e.target.value)} /></TableCell>
                          <TableCell><Input className="h-7 w-14 text-xs" type="number" value={editState.editCourseSemester} onChange={(e) => editSetters.setEditCourseSemester(Number(e.target.value || 0))} /></TableCell>
                          <TableCell><Input className="h-7 w-14 text-xs" type="number" value={editState.editCourseCreditHours} onChange={(e) => editSetters.setEditCourseCreditHours(Number(e.target.value || 0))} /></TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={editActions.handleUpdateCourse} title="Save course">
                                <Check className="size-3" />
                                Save
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => editSetters.setEditingCourseId(null)} title="Cancel edit">
                                <X className="size-3" />
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-xs font-medium">{course.code}</TableCell>
                          <TableCell className="text-xs">{course.name}</TableCell>
                          <TableCell className="text-xs">{course.semester ?? "—"}</TableCell>
                          <TableCell className="text-xs">{course.creditHours ?? "—"}</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" title="Edit course" onClick={() => {
                              editSetters.setEditingCourseId(course._id);
                              editSetters.setEditCourseCode(course.code);
                              editSetters.setEditCourseName(course.name);
                              editSetters.setEditCourseSemester(course.semester ?? 1);
                              editSetters.setEditCourseCreditHours(course.creditHours ?? 3);
                            }}>
                              <Pencil className="size-3" />
                              Edit
                            </Button>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {courses.length === 0 ? <TableRow><TableCell colSpan={5} className="text-xs text-muted-foreground">No courses created yet.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Rooms Table */}
           <div className="rounded-md border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Rooms</h2>
              <Badge variant="secondary">{rooms.length}</Badge>
            </div>
            <Separator className="mb-3" />
            <ScrollArea className="max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.map((room) => (
                    <TableRow key={room._id}>
                      {editState.editingRoomId === room._id ? (
                        <>
                          <TableCell><Input className="h-7 text-xs" value={editState.editRoomCode} onChange={(e) => editSetters.setEditRoomCode(e.target.value)} /></TableCell>
                          <TableCell><Input className="h-7 text-xs" value={editState.editRoomName} onChange={(e) => editSetters.setEditRoomName(e.target.value)} /></TableCell>
                          <TableCell><Input className="h-7 w-16 text-xs" type="number" value={editState.editRoomCapacity} onChange={(e) => editSetters.setEditRoomCapacity(Number(e.target.value || 0))} /></TableCell>
                          <TableCell><Input className="h-7 text-xs" value={editState.editRoomLocation} onChange={(e) => editSetters.setEditRoomLocation(e.target.value)} /></TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={editActions.handleUpdateRoom} title="Save room">
                                <Check className="size-3" />
                                Save
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => editSetters.setEditingRoomId(null)} title="Cancel edit">
                                <X className="size-3" />
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="text-xs font-medium">{room.code}</TableCell>
                          <TableCell className="text-xs">{room.name}</TableCell>
                          <TableCell className="text-xs">{room.capacity ?? "—"}</TableCell>
                          <TableCell className="text-xs">{room.location ?? "—"}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" title="Edit room" onClick={() => {
                                editSetters.setEditingRoomId(room._id);
                                editSetters.setEditRoomCode(room.code);
                                editSetters.setEditRoomName(room.name);
                                editSetters.setEditRoomCapacity(room.capacity ?? 100);
                                editSetters.setEditRoomLocation(room.location ?? "");
                              }}>
                                <Pencil className="size-3" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs text-destructive"
                                title="Delete room"
                                onClick={() => setConfirmDeleteRoomId(room._id)}
                              >
                                <Trash2 className="size-3" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {rooms.length === 0 ? <TableRow><TableCell colSpan={5} className="text-xs text-muted-foreground">No rooms created yet.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Invigilator Assignments Table */}
           <div className="rounded-md border bg-card p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Invigilator Assignments</h2>
              <Badge variant="secondary">{adminInvigilatorAssignments.length}</Badge>
            </div>
            <Separator className="mb-3" />
            <ScrollArea className="max-h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invigilator</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminInvigilatorAssignments.map((assignment: { _id: Id<"invigilatorAssignments">; invigilator?: { fullName: string } | null; schedule?: { examDate: string; courseId?: string } | null; room?: { code: string } | null; assignmentDate: string }) => (
                    <TableRow key={assignment._id}>
                      <TableCell className="text-xs">{assignment.invigilator?.fullName ?? "—"}</TableCell>
                      <TableCell className="text-xs">{assignment.schedule?.examDate ?? "—"}</TableCell>
                      <TableCell className="text-xs">{assignment.room?.code ?? "—"}</TableCell>
                      <TableCell className="text-xs">{assignment.assignmentDate}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 gap-1 px-2 text-xs text-destructive"
                          title="Unassign invigilator"
                          onClick={() => setConfirmDeleteAssignmentId(assignment._id)}
                        >
                          <Trash2 className="size-3" />
                          Unassign
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {adminInvigilatorAssignments.length === 0 ? <TableRow><TableCell colSpan={5} className="text-xs text-muted-foreground">No assignments yet.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Schedules Table (full width) */}
           <div className="rounded-md border bg-card p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Exam Schedules</h2>
              <Badge variant="secondary">{schedules.length}</Badge>
            </div>
            <Separator className="mb-3" />
            <ScrollArea className="max-h-72">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Invigilator</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {schedules.map((schedule) => (
                    <TableRow key={schedule._id}>
                      {editState.editingScheduleId === schedule._id ? (
                        <>
                          <TableCell><Input className="h-7 text-xs" type="date" value={editState.editScheduleDate} onChange={(e) => editSetters.setEditScheduleDate(e.target.value)} /></TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Input className="h-7 w-20 text-xs" type="time" value={editState.editScheduleStartTime} onChange={(e) => editSetters.setEditScheduleStartTime(e.target.value)} />
                              <Input className="h-7 w-20 text-xs" type="time" value={editState.editScheduleEndTime} onChange={(e) => editSetters.setEditScheduleEndTime(e.target.value)} />
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{schedule.course?.code ?? "—"}</TableCell>
                          <TableCell className="text-xs">{schedule.program?.code ?? "—"}</TableCell>
                          <TableCell className="text-xs">{schedule.room?.code ?? "—"}</TableCell>
                          <TableCell className="text-xs">{schedule.invigilator?.fullName ?? "—"}</TableCell>
                          <TableCell>
                            <Select value={editState.editScheduleStatus} onValueChange={(value) => editSetters.setEditScheduleStatus(value as "draft" | "published" | "ongoing" | "completed")}>
                              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                                <SelectItem value="ongoing">Ongoing</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={editActions.handleUpdateSchedule} title="Save schedule">
                                <Check className="size-3" />
                                Save
                              </Button>
                              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => editSetters.setEditingScheduleId(null)} title="Cancel edit">
                                <X className="size-3" />
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell className="whitespace-nowrap text-xs">{schedule.examDate}</TableCell>
                          <TableCell className="whitespace-nowrap text-xs">{schedule.startTime ?? "—"} - {schedule.endTime ?? "—"}</TableCell>
                          <TableCell className="text-xs font-medium">{schedule.course?.code ?? "—"}</TableCell>
                          <TableCell className="text-xs">{schedule.program?.code ?? "—"}</TableCell>
                          <TableCell className="text-xs">{schedule.room?.code ?? "—"}</TableCell>
                          <TableCell className="text-xs">{schedule.invigilator?.fullName ?? "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px]">{roleLabel(schedule.status ?? "draft")}</Badge></TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-xs" title="Edit schedule" onClick={() => {
                                editSetters.setEditingScheduleId(schedule._id);
                                editSetters.setEditScheduleDate(schedule.examDate);
                                editSetters.setEditScheduleStartTime(schedule.startTime ?? "");
                                editSetters.setEditScheduleEndTime(schedule.endTime ?? "");
                                editSetters.setEditScheduleStatus((schedule.status as "draft" | "published" | "ongoing" | "completed") ?? "published");
                              }}>
                                <Pencil className="size-3" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 gap-1 px-2 text-xs text-destructive"
                                title="Delete schedule"
                                onClick={() => setConfirmDeleteScheduleId(schedule._id)}
                              >
                                <Trash2 className="size-3" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                  {schedules.length === 0 ? <TableRow><TableCell colSpan={8} className="text-xs text-muted-foreground">No schedules created yet.</TableCell></TableRow> : null}
                </TableBody>
              </Table>
            </ScrollArea>
          </div>
        </div>
      ) : null}

      <Dialog
        open={confirmDeleteRoomId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDeleteRoomId(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete room?</DialogTitle>
            <DialogDescription>
              This removes the room record. Deletion will fail if the room is referenced by existing schedules.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteRoomId(null)}>Cancel</Button>
            <Button
              variant="outline"
              className="text-destructive"
              onClick={async () => {
                if (!confirmDeleteRoomId) {
                  return;
                }
                await editActions.handleDeleteRoom(confirmDeleteRoomId);
                setConfirmDeleteRoomId(null);
              }}
            >
              Delete room
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDeleteAssignmentId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDeleteAssignmentId(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unassign invigilator?</DialogTitle>
            <DialogDescription>
              This removes the selected invigilator assignment from the schedule.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteAssignmentId(null)}>Cancel</Button>
            <Button
              variant="outline"
              className="text-destructive"
              onClick={async () => {
                if (!confirmDeleteAssignmentId) {
                  return;
                }
                await editActions.handleDeleteInvigilatorAssignment(confirmDeleteAssignmentId);
                setConfirmDeleteAssignmentId(null);
              }}
            >
              Unassign
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmDeleteScheduleId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmDeleteScheduleId(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete schedule?</DialogTitle>
            <DialogDescription>
              This permanently removes the selected exam schedule. Deletion will fail if seating assignments already exist.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmDeleteScheduleId(null)}>Cancel</Button>
            <Button
              variant="outline"
              className="text-destructive"
              onClick={async () => {
                if (!confirmDeleteScheduleId) {
                  return;
                }
                await editActions.handleDeleteSchedule(confirmDeleteScheduleId);
                setConfirmDeleteScheduleId(null);
              }}
            >
              Delete schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function Kpi({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-md border bg-background/60 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-1 text-lg font-semibold leading-none">{value.toLocaleString()}</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
      </div>
    </div>
  );
}

function QuickMetric({
  title,
  value,
  icon: Icon,
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-background/60 p-3 shadow-sm">
      <div>
        <p className="text-[11px] text-muted-foreground">{title}</p>
        <p className="text-sm font-semibold">{value.toLocaleString()}</p>
      </div>
      <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-3.5" />
      </div>
    </div>
  );
}

function MiniStat({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-md border bg-background/60 p-3 shadow-sm">
      <p className="text-[11px] text-muted-foreground">{title}</p>
      <p className="text-base font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

function ReportPane({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border bg-background/60 p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-medium">{title}</p>
        <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="size-3.5" />
        </div>
      </div>
      <p className="line-clamp-5 text-[11px] text-muted-foreground">{value}</p>
    </div>
  );
}

function sumCounters(
  rows:
    | Array<{ counters: { present: number; absent: number; late: number; excused: number } }>
    | undefined,
  key: "present" | "absent" | "late" | "excused",
) {
  if (!rows) {
    return 0;
  }
  return rows.reduce((sum, row) => sum + row.counters[key], 0);
}

function completionRate(rows: Array<{ counters: { completionPercent: number } }> | undefined) {
  if (!rows || rows.length === 0) {
    return 0;
  }
  const total = rows.reduce((sum, row) => sum + row.counters.completionPercent, 0);
  return Number((total / rows.length).toFixed(2));
}
