"use client";

import { SignInButton, useClerk } from "@clerk/nextjs";
import { api } from "@uni-exam-sys/backend/convex/_generated/api";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import { Authenticated, AuthLoading, Unauthenticated, useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import {
  AlertCircle,
  BadgeCheck,
  Banknote,
  BookOpen,
  CalendarClock,
  ChartColumn,
  Check,
  ClipboardCheck,
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
import { Popover, PopoverContent, PopoverTrigger } from "@uni-exam-sys/ui/components/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@uni-exam-sys/ui/components/table";
import { Switch } from "@uni-exam-sys/ui/components/switch";
import { Textarea } from "@uni-exam-sys/ui/components/textarea";

import { formatDate, formatDateTime, roleLabel } from "@/lib/utils";
import { downloadCsv, downloadPdf, type PdfTable } from "@/lib/reports";
import { Sidebar } from "./_components/sidebar";
import { type SectionId, SECTIONS_BY_ROLE } from "./_components/section-defs";
import { SectionContent } from "./_sections";

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
  const [activeSection, setActiveSection] = useState<SectionId>("home");
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
  const [roleChangeNewRole, setRoleChangeNewRole] = useState<"super_admin" | "university_admin" | "lecturer" | "student" | "invigilator" | "finance">("student");
  const [userFilterRole, setUserFilterRole] = useState<"" | "super_admin" | "university_admin" | "lecturer" | "student" | "invigilator" | "finance">("");

  // Add user form state
  const [addUserRole, setAddUserRole] = useState<"" | "super_admin" | "university_admin" | "lecturer" | "invigilator" | "finance">("");
  const [addUserUniversityId, setAddUserUniversityId] = useState<Id<"universities"> | "">("");
  const [addUserExternalId, setAddUserExternalId] = useState("");
  const [addUserFullName, setAddUserFullName] = useState("");
  const [addUserEmail, setAddUserEmail] = useState("");
  const [addUserPhone, setAddUserPhone] = useState("");
  const [addUserStaffId, setAddUserStaffId] = useState("");
  const [addUserTitle, setAddUserTitle] = useState("");
  const [addUserDepartment, setAddUserDepartment] = useState("");
  const [addUserRatePerSession, setAddUserRatePerSession] = useState(0);
  const [addUserAttendanceBonus, setAddUserAttendanceBonus] = useState(0);
  const [addUserEmployeeId, setAddUserEmployeeId] = useState("");

  function resetAddUserForm() {
    setAddUserRole("");
    setAddUserUniversityId("");
    setAddUserExternalId("");
    setAddUserFullName("");
    setAddUserEmail("");
    setAddUserPhone("");
    setAddUserStaffId("");
    setAddUserTitle("");
    setAddUserDepartment("");
    setAddUserRatePerSession(0);
    setAddUserAttendanceBonus(0);
    setAddUserEmployeeId("");
  }

  // Lecturer management state
  const [lecturerStaffId, setLecturerStaffId] = useState("");
  const [lecturerDepartment, setLecturerDepartment] = useState("");
  const [lecturerTitle, setLecturerTitle] = useState("");
  const [lecturerEmail, setLecturerEmail] = useState("");
  const [lecturerFullName, setLecturerFullName] = useState("");
  const [lecturerPhone, setLecturerPhone] = useState("");
  const [lecturerExternalId, setLecturerExternalId] = useState("");
  const [assignLecturerId, setAssignLecturerId] = useState<Id<"lecturers"> | "">("");
  const [assignCourseId, setAssignCourseId] = useState<Id<"courses"> | "">("");
  const [assignAcademicYear, setAssignAcademicYear] = useState("2025/2026");
  const [assignSemester, setAssignSemester] = useState(1);
  const [assignRole, setAssignRole] = useState<"primary" | "co_lecturer" | "assistant">("primary");

  // Grading state
  const [gradingCourseId, setGradingCourseId] = useState<Id<"courses"> | "">("");
  const [gradingAcademicYear, setGradingAcademicYear] = useState("2025/2026");
  const [gradingSemester, setGradingSemester] = useState(1);
  const [gradingExamScheduleId, setGradingExamScheduleId] = useState<Id<"examSchedules"> | "">("");
  const [gradingMaxScore, setGradingMaxScore] = useState(100);
  const [gradingRemarks, setGradingRemarks] = useState("");
  const [gradingScores, setGradingScores] = useState<Record<string, string>>({});
  const [selectedResults, setSelectedResults] = useState<Id<"courseResults">[]>([]);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewResultId, setReviewResultId] = useState<Id<"courseResults"> | "">("");

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
  const [broadcastScope, setBroadcastScope] = useState<"all" | "admin" | "lecturer" | "student" | "invigilator" | "finance" | "super_admin">("all");
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

  const universities = useQuery(api.tenants.listUniversities, me ? {} : "skip");
  const activeUniversityId =
    me?.role === "super_admin"
      ? selectedUniversityId || (universities && universities.length > 0
        ? universities[0]?._id
        : undefined
      )
      : scopedUniversityId;
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
  const createUser = useMutation(api.users.createUser);
  const allUsersForPicker = useQuery(api.users.listUsers, {});
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
  const listLecturerProfiles = useQuery(
    api.lecturers.listLecturerProfiles,
    (me?.role === "super_admin" || me?.role === "university_admin") && activeUniversityId
      ? { universityId: activeUniversityId }
      : "skip",
  );
  const assignLecturerToCourse = useMutation(api.lecturers.assignLecturerToCourse);
  const removeLecturerAssignment = useMutation(api.lecturers.removeLecturerAssignment);
  const listCourseAssignments = useQuery(
    api.lecturers.listCourseAssignments,
    (me?.role === "super_admin" || me?.role === "university_admin") && activeUniversityId
      ? { universityId: activeUniversityId }
      : "skip",
  );
  const lecturerDashboard = useQuery(
    api.lecturers.lecturerDashboard,
    me?.role === "lecturer" && activeUniversityId ? { universityId: activeUniversityId } : "skip",
  );
  const myLecturerCourses = useQuery(
    api.lecturers.listMyCourses,
    me?.role === "lecturer" ? {} : "skip",
  );
  const courseStudents = useQuery(
    api.lecturers.listCourseStudents,
    me?.role === "lecturer" && gradingCourseId ? { courseId: gradingCourseId } : "skip",
  );
  const courseResults = useQuery(
    api.lecturers.listCourseResults,
    gradingCourseId
      ? { courseId: gradingCourseId, academicYear: gradingAcademicYear, semester: gradingSemester }
      : "skip",
  );
  const upsertCourseResult = useMutation(api.lecturers.upsertCourseResult);
  const submitCourseResults = useMutation(api.lecturers.submitCourseResults);
  const reviewCourseResult = useMutation(api.lecturers.reviewCourseResult);
  const pendingResults = useQuery(
    api.lecturers.listCourseResults,
    (me?.role === "super_admin" || me?.role === "university_admin") && activeUniversityId && gradingCourseId
      ? { courseId: gradingCourseId, academicYear: gradingAcademicYear, semester: gradingSemester }
      : "skip",
  );
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
    (me?.role === "student" || me?.role === "invigilator" || me?.role === "lecturer") && activeUniversityId
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

  async function handleAddUser() {
    if (!addUserRole) {
      toast.error("Pick a role for the new user");
      return;
    }

    if (!addUserExternalId || !addUserFullName || !addUserEmail) {
      toast.error("Clerk user ID, full name, and email are required");
      return;
    }

    const targetUniversityId =
      addUserRole === "super_admin"
        ? undefined
        : me?.role === "super_admin"
          ? (addUserUniversityId || undefined)
          : activeUniversityId;

    if (addUserRole !== "super_admin" && !targetUniversityId) {
      toast.error("Select a university for the new user");
      return;
    }

    try {
      await createUser({
        universityId: targetUniversityId,
        role: addUserRole,
        externalId: addUserExternalId,
        fullName: addUserFullName,
        email: addUserEmail,
        phone: addUserPhone || undefined,
        staffId: addUserStaffId || undefined,
        title: addUserRole === "lecturer" ? addUserTitle || undefined : undefined,
        department: addUserRole === "lecturer" ? addUserDepartment || undefined : undefined,
        ratePerSession: addUserRole === "invigilator" ? addUserRatePerSession : undefined,
        attendanceBonus: addUserRole === "invigilator" ? addUserAttendanceBonus : undefined,
        employeeId: addUserRole === "finance" ? addUserEmployeeId || undefined : undefined,
      });
      toast.success(`${roleLabel(addUserRole)} created`);
      resetAddUserForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create user");
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

  async function handleCreateLecturer() {
    if (!activeUniversityId || !lecturerExternalId || !lecturerFullName || !lecturerEmail) {
      toast.error("Staff ID, full name, email, and external ID are required");
      return;
    }

    try {
      await createUser({
        universityId: activeUniversityId,
        role: "lecturer",
        externalId: lecturerExternalId,
        fullName: lecturerFullName,
        email: lecturerEmail,
        phone: lecturerPhone || undefined,
        staffId: lecturerStaffId || lecturerExternalId,
        department: lecturerDepartment || undefined,
        title: lecturerTitle || undefined,
      });
      setLecturerExternalId("");
      setLecturerStaffId("");
      setLecturerFullName("");
      setLecturerEmail("");
      setLecturerPhone("");
      setLecturerDepartment("");
      setLecturerTitle("");
      toast.success("Lecturer created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create lecturer");
    }
  }

  async function handleAssignLecturerToCourse() {
    if (!activeUniversityId || !assignLecturerId || !assignCourseId) {
      toast.error("Lecturer and course are required");
      return;
    }

    try {
      await assignLecturerToCourse({
        universityId: activeUniversityId,
        lecturerId: assignLecturerId,
        courseId: assignCourseId,
        academicYear: assignAcademicYear,
        semester: assignSemester,
        role: assignRole,
      });
      toast.success("Lecturer assigned to course");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign lecturer");
    }
  }

  async function handleRemoveLecturerAssignment(assignmentId: Id<"courseLecturers">) {
    try {
      await removeLecturerAssignment({ assignmentId });
      toast.success("Assignment removed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove assignment");
    }
  }

  async function handleSaveResult(studentDocId: Id<"students">) {
    if (!gradingCourseId) {
      toast.error("Select a course first");
      return;
    }
    const raw = gradingScores[studentDocId];
    if (raw === undefined || raw === "") {
      toast.error("Enter a score for this student");
      return;
    }
    const score = Number(raw);
    if (Number.isNaN(score)) {
      toast.error("Score must be a number");
      return;
    }

    try {
      await upsertCourseResult({
        courseId: gradingCourseId,
        studentId: studentDocId,
        examScheduleId: gradingExamScheduleId || undefined,
        academicYear: gradingAcademicYear,
        semester: gradingSemester,
        score,
        maxScore: gradingMaxScore,
        remarks: gradingRemarks || undefined,
      });
      toast.success("Result saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save result");
    }
  }

  async function handleSubmitResults() {
    if (selectedResults.length === 0) {
      toast.error("Select at least one result to submit");
      return;
    }
    try {
      await submitCourseResults({ resultIds: selectedResults });
      setSelectedResults([]);
      toast.success("Results submitted for review");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit results");
    }
  }

  async function handleReviewResult(decision: "approved" | "rejected") {
    if (!reviewResultId) {
      toast.error("Select a result to review");
      return;
    }
    try {
      await reviewCourseResult({ resultId: reviewResultId, decision, note: reviewNote || undefined });
      setReviewResultId("");
      setReviewNote("");
      toast.success(`Result ${decision}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to review result");
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

  // Reset active section to home if the current section is not allowed for this role.
  useEffect(() => {
    if (!me) return;
    const allowed = SECTIONS_BY_ROLE[me.role].map((s) => s.id);
    if (!allowed.includes(activeSection)) {
      setActiveSection("home");
    }
  }, [me, activeSection]);


  // Auto-sync: if signed in but no user record (e.g. seeded superadmin
  // whose externalId is a placeholder), call syncCurrentUser to link
  // the Clerk identity via email.
  const { isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  const syncCurrentUser = useMutation(api.bootstrap.syncCurrentUser);
  const [syncState, setSyncState] = useState<
    "idle" | "syncing" | "failed"
  >("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncAttemptedRef = useRef(false);
  useEffect(() => {
    if (!isConvexAuthenticated) {
      setSyncState("idle");
      setSyncError(null);
      return;
    }
    if (me !== null && me !== undefined) {
      setSyncState("idle");
      setSyncError(null);
      return;
    }
    if (me === undefined) return;
    if (syncAttemptedRef.current) return;
    if (syncState === "syncing" || syncState === "failed") return;
    syncAttemptedRef.current = true;
    setSyncState("syncing");
    void (async () => {
      try {
        await syncCurrentUser({});
        setSyncState("idle");
      } catch (error) {
        syncAttemptedRef.current = false;
        setSyncState("failed");
        const message =
          error instanceof Error ? error.message : "Failed to sync account";
        setSyncError(message);
        toast.error(message);
      }
    })();
  }, [isConvexAuthenticated, me, syncCurrentUser, syncState]);

  if (me === undefined || (!me && syncState === "syncing")) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <Alert>
          <span className="size-4 animate-spin rounded-md border-2 border-primary border-t-transparent" />
          <AlertTitle>
            {me === undefined ? "Loading workspace" : "Linking your account"}
          </AlertTitle>
          <AlertDescription>
            {me === undefined
              ? "Preparing your examination workspace..."
              : "Verifying your identity with the platform. This usually takes a moment."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!me && syncState === "failed") {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>Account link failed</AlertTitle>
          <AlertDescription>
            {syncError ?? "We could not link your account. Please sign out and try again."}
          </AlertDescription>
          <div className="flex gap-2 pt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                syncAttemptedRef.current = false;
                setSyncState("idle");
                setSyncError(null);
              }}
            >
              Try again
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              Sign out
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

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
    <div className="mx-auto flex w-full max-w-7xl gap-4 px-4 py-6 sm:px-6">
      <Sidebar
        role={me.role}
        activeSection={activeSection}
        onSelect={setActiveSection}
        onSignOut={handleLogout}
        userName={me.fullName}
        userEmail={me.email ?? undefined}
      />
      <div className="min-w-0 flex-1 space-y-4">
        <SectionContent
          activeSection={activeSection}
          me={me}
          onSignOut={handleLogout}
          selectedUniversityId={selectedUniversityId}
          setSelectedUniversityId={setSelectedUniversityId}
        />

      {(me.role === "super_admin" || me.role === "university_admin" || me.role === "student" || me.role === "invigilator" || me.role === "lecturer") ? (
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="rounded-md border bg-background/60 p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{me.role === "student" || me.role === "invigilator" || me.role === "lecturer" ? "My Complaints" : "Complaints Queue"}</h2>
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

        {me.role === "student" || me.role === "invigilator" || me.role === "lecturer" ? (
           <div className="space-y-3 rounded-md border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-semibold">Submit Complaint</h2>
            <Separator />
            <Label htmlFor="complaint-category">Category</Label>
            <Select value={complaintCategory} onValueChange={(value) => setComplaintCategory(value as typeof complaintCategory)}>
              <SelectTrigger id="complaint-category">
                <SelectValue>
                  {complaintCategory === "wrong_seat" ? "Wrong seat" : complaintCategory === "wrong_timetable" ? "Wrong timetable" : complaintCategory === "wrong_details" ? "Wrong details" : complaintCategory === "payment_issue" ? "Payment issue" : complaintCategory === "id_verification_issue" ? "ID verification issue" : complaintCategory === "attendance_system_issue" ? "Attendance issue" : complaintCategory === "schedule_conflict" ? "Schedule conflict" : complaintCategory === "room_issue" ? "Room issue" : "Other"}
                </SelectValue>
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
                  <SelectValue placeholder="Select complaint">
                    {complaints?.find(c => c._id === complaintActionId)?.subject ?? "Select complaint"}
                  </SelectValue>
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
                  <SelectValue>
                    {complaintNewStatus === "open" ? "Open" : complaintNewStatus === "in_review" ? "In Review" : complaintNewStatus === "resolved" ? "Resolved" : "Rejected"}
                  </SelectValue>
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
  lecturerDashboard,
}: {
  role: string;
  adminDashboard: ReturnType<typeof useQuery<typeof api.dashboard.adminDashboard>>;
  studentDashboard: ReturnType<typeof useQuery<typeof api.dashboard.studentDashboard>>;
  invigilatorDashboard: ReturnType<typeof useQuery<typeof api.dashboard.invigilatorDashboard>>;
  financeDashboard: ReturnType<typeof useQuery<typeof api.dashboard.financeDashboard>>;
  superAdminDashboard: ReturnType<typeof useQuery<typeof api.dashboard.superAdminDashboard>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lecturerDashboard?: any;
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

  if (role === "lecturer") {
    return (
      <div className="grid gap-2 sm:grid-cols-3">
        <QuickMetric title="My Courses" value={lecturerDashboard?.coursesCount ?? 0} icon={BookOpen} />
        <QuickMetric
          title="Upcoming Exams"
          value={lecturerDashboard?.upcomingExams.length ?? 0}
          icon={CalendarClock}
        />
        <QuickMetric
          title="Pending Results"
          value={(lecturerDashboard?.resultCounts.draft ?? 0) + (lecturerDashboard?.resultCounts.submitted ?? 0)}
          icon={ClipboardCheck}
        />
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
                              <SelectTrigger className="h-7 text-xs"><SelectValue>{editState.editScheduleStatus === "draft" ? "Draft" : editState.editScheduleStatus === "published" ? "Published" : editState.editScheduleStatus === "ongoing" ? "Ongoing" : "Completed"}</SelectValue></SelectTrigger>
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

/* -------------------------------------------------------------------------- */
/*  ClerkUserPicker                                                           */
/* -------------------------------------------------------------------------- */

type ClerkUserOption = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  imageUrl: string | null;
};

function ClerkUserPicker({
  value,
  onSelect,
  existingExternalIds,
  disabled,
}: {
  value: string;
  onSelect: (user: ClerkUserOption) => void;
  existingExternalIds: Set<string>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selected, setSelected] = useState<ClerkUserOption | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handle);
  }, [search]);

  const listClerkUsers = useAction(api.clerkUsers.listClerkUsers);
  const [users, setUsers] = useState<ClerkUserOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listClerkUsers({
      limit: 50,
      query: debouncedSearch.length > 0 ? debouncedSearch : undefined,
    })
      .then((result) => {
        if (cancelled) return;
        setUsers(
          result.users.filter(
            (u) => !existingExternalIds.has(u.id),
          ) as ClerkUserOption[],
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load Clerk users");
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch, listClerkUsers, existingExternalIds]);

  if (selected || value) {
    const label = selected?.fullName ?? value;
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-md border bg-muted/30 px-3 py-2 text-xs">
          <p className="font-medium">{label}</p>
          {selected?.email ? (
            <p className="text-muted-foreground">{selected.email}</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setSelected(null);
            onSelect({
              id: "",
              firstName: null,
              lastName: null,
              fullName: "",
              email: null,
              phone: null,
              username: null,
              imageUrl: null,
            });
          }}
          disabled={disabled}
        >
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={(props) => (
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start text-xs font-normal"
              disabled={disabled}
              {...props}
            />
          )}
        >
          <Search className="mr-2 size-3.5" />
          Search Clerk users...
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="border-b p-2">
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, email, or ID"
              className="h-8 text-xs"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {loading ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                Loading Clerk users...
              </p>
            ) : error ? (
              <p className="px-2 py-3 text-center text-xs text-destructive">
                {error}
              </p>
            ) : users.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">
                {debouncedSearch
                  ? "No matching users"
                  : "No available Clerk users. Create users in Clerk first."}
              </p>
            ) : (
              users.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left text-xs hover:bg-muted"
                  onClick={() => {
                    setSelected(user);
                    setOpen(false);
                    onSelect(user);
                  }}
                >
                  <div className="mt-0.5 size-7 shrink-0 overflow-hidden rounded-full bg-muted">
                    {user.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.imageUrl}
                        alt=""
                        className="size-full object-cover"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-[10px] font-medium uppercase">
                        {(user.firstName?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{user.fullName}</p>
                    {user.email ? (
                      <p className="truncate text-muted-foreground">{user.email}</p>
                    ) : null}
                  </div>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
