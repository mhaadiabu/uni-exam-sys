"use client";

import type { Doc } from "@uni-exam-sys/backend/convex/_generated/dataModel";
import type { Id } from "@uni-exam-sys/backend/convex/_generated/dataModel";

import { ProfileSection } from "./profile";
import { HomeSection } from "./home";
import { AuditSection } from "./audit";
import { EvaluateLecturersSection } from "./evaluate-lecturers";
import { LecturerEvalsSection } from "./lecturer-evals";
import { MyEvaluationsSection } from "./my-evaluations";
import { MyCoursesSection } from "./my-courses";
import { RegisterCoursesSection } from "./register-courses";
import { MySeatingSection } from "./my-seating";
import { MyResultsSection } from "./my-results";
import { MyTimetableSection } from "./my-timetable";
import { MyIdCardSection } from "./my-id-card";
import { MyPaymentsSection } from "./my-payments";
import { MyPaymentsInvSection } from "./my-payments-inv";
import { MyAssignmentsSection } from "./my-assignments";
import { MarkAttendanceSection } from "./mark-attendance";
import { VerifyStudentsSection } from "./verify-students";
import { UploadResultsSection } from "./upload-results";
import { SeatingSection } from "./seating";
import { AttendanceSection } from "./attendance";
import { IdCardsSection } from "./id-cards";
import { ResultsSection } from "./results";
import { FeePaymentsSection } from "./fee-payments";
import { CourseRegPaymentsSection } from "./course-reg-payments";
import { InvigilatorPaymentsSection } from "./invigilator-payments";
import { MessagesSection } from "./messages";
import { ComplaintsSection } from "./complaints";
import { SecuritySection } from "./security";
import { ReportsSection } from "./reports";
import { SettingsSection } from "./settings";
import { UniversitiesSection } from "./universities";
import { PeopleSection } from "./people";
import { SetupSection } from "./setup";
import { TimetableSection } from "./timetable";

import { type SectionId } from "../_components/section-defs";

type MeUser = Doc<"users"> & { university?: Doc<"universities"> | null };

export function SectionContent({
  activeSection,
  me,
  onSignOut,
  selectedUniversityId,
  setSelectedUniversityId,
}: {
  activeSection: SectionId;
  me: MeUser;
  onSignOut: () => void | Promise<void>;
  selectedUniversityId: Id<"universities"> | "";
  setSelectedUniversityId: (v: Id<"universities"> | "") => void;
}) {
  switch (activeSection) {
    case "home":
      return <HomeSection />;
    case "profile":
      return <ProfileSection me={me} onSignOut={onSignOut} />;
    case "universities":
      return (
        <UniversitiesSection
          me={me}
          selectedUniversityId={selectedUniversityId}
          setSelectedUniversityId={setSelectedUniversityId}
        />
      );
    case "audit":
      return <AuditSection />;
    case "people":
      return <PeopleSection me={me} />;
    case "setup":
      return <SetupSection me={me} selectedUniversityId={selectedUniversityId} />;
    case "timetable":
      return <TimetableSection me={me} selectedUniversityId={selectedUniversityId} />;
    case "seating":
      return <SeatingSection me={me} selectedUniversityId={selectedUniversityId} />;
    case "attendance":
      return <AttendanceSection me={me} selectedUniversityId={selectedUniversityId} />;
    case "mark-attendance":
      return <MarkAttendanceSection me={me} />;
    case "my-assignments":
      return <MyAssignmentsSection me={me} />;
    case "id-cards":
      return <IdCardsSection me={me} selectedUniversityId={selectedUniversityId} />;
    case "my-id-card":
      return <MyIdCardSection me={me} />;
    case "results":
      return <ResultsSection me={me} selectedUniversityId={selectedUniversityId} />;
    case "upload-results":
      return <UploadResultsSection me={me} />;
    case "my-results":
      return <MyResultsSection />;
    case "my-seating":
      return <MySeatingSection />;
    case "my-timetable":
      return <MyTimetableSection />;
    case "register-courses":
      return <RegisterCoursesSection />;
    case "messages":
      return <MessagesSection me={me} selectedUniversityId={selectedUniversityId} />;
    case "complaints":
      return <ComplaintsSection me={me} />;
    case "security":
      return <SecuritySection me={me} selectedUniversityId={selectedUniversityId} />;
    case "reports":
      return <ReportsSection me={me} selectedUniversityId={selectedUniversityId} />;
    case "settings":
      return <SettingsSection me={me} selectedUniversityId={selectedUniversityId} />;
    case "fee-payments":
      return <FeePaymentsSection me={me} selectedUniversityId={selectedUniversityId} />;
    case "course-reg-payments":
      return <CourseRegPaymentsSection me={me} selectedUniversityId={selectedUniversityId} />;
    case "invigilator-payments":
      return <InvigilatorPaymentsSection me={me} selectedUniversityId={selectedUniversityId} />;
    case "my-courses":
      return <MyCoursesSection />;
    case "evaluate-lecturers":
      return <EvaluateLecturersSection />;
    case "lecturer-evals":
      return <LecturerEvalsSection />;
    case "my-evaluations":
      return <MyEvaluationsSection />;
    case "my-payments":
      return <MyPaymentsSection me={me} />;
    case "my-payments-inv":
      return <MyPaymentsInvSection me={me} />;
    case "verify-students":
      return <VerifyStudentsSection me={me} />;
    default: {
      const _exhaustive: never = activeSection;
      void _exhaustive;
      return null;
    }
  }
}
