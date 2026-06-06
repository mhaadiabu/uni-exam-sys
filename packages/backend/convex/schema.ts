import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const roleValidator = v.union(
  v.literal("super_admin"),
  v.literal("university_admin"),
  v.literal("lecturer"),
  v.literal("student"),
  v.literal("invigilator"),
  v.literal("finance"),
);

const attendanceStatusValidator = v.union(
  v.literal("present"),
  v.literal("absent"),
  v.literal("late"),
  v.literal("excused"),
);

const complaintStatusValidator = v.union(
  v.literal("open"),
  v.literal("in_review"),
  v.literal("resolved"),
  v.literal("rejected"),
);

const complaintCategoryValidator = v.union(
  v.literal("wrong_seat"),
  v.literal("wrong_timetable"),
  v.literal("wrong_details"),
  v.literal("payment_issue"),
  v.literal("id_verification_issue"),
  v.literal("attendance_system_issue"),
  v.literal("schedule_conflict"),
  v.literal("room_issue"),
  v.literal("other"),
);

const feeStatusValidator = v.union(v.literal("cleared"), v.literal("outstanding"));

const roomTypeValidator = v.union(
  v.literal("hall"),
  v.literal("lab"),
  v.literal("small_class"),
  v.literal("special_needs"),
);

const scheduleStatusValidator = v.union(
  v.literal("draft"),
  v.literal("published"),
  v.literal("ongoing"),
  v.literal("completed"),
);

const seatingModeValidator = v.union(v.literal("sequential"), v.literal("shuffled"));

const registerStatusValidator = v.union(v.literal("draft"), v.literal("finalized"));

const idCardStatusValidator = v.union(
  v.literal("generated"),
  v.literal("ready"),
  v.literal("printed"),
  v.literal("reprint_requested"),
);

const notificationScopeValidator = v.union(
  v.literal("all"),
  v.literal("admin"),
  v.literal("lecturer"),
  v.literal("student"),
  v.literal("invigilator"),
  v.literal("finance"),
  v.literal("super_admin"),
);

export default defineSchema({
  universities: defineTable({
    name: v.string(),
    code: v.string(),
    allowedEmailDomains: v.array(v.string()),
    isActive: v.boolean(),
    isPlatform: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_code", ["code"])
    .index("by_active", ["isActive"])
    .index("by_platform", ["isPlatform"]),

  brandingSettings: defineTable({
    universityId: v.id("universities"),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    idCardTemplate: v.optional(v.string()),
    attendanceReportTemplate: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_university", ["universityId"]),

  users: defineTable({
    externalId: v.string(),
    universityId: v.id("universities"),
    role: roleValidator,
    fullName: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    isActive: v.boolean(),
    failedLoginAttempts: v.number(),
    lockedUntil: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_email", ["email"])
    .index("by_university_role", ["universityId", "role"])
    .index("by_university", ["universityId"]),

  userSessions: defineTable({
    universityId: v.optional(v.id("universities")),
    userId: v.id("users"),
    expiresAt: v.number(),
    lastSeenAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    isActive: v.boolean(),
  })
    .index("by_user", ["userId"])
    .index("by_active", ["isActive"]),

  passwordResetTokens: defineTable({
    universityId: v.optional(v.id("universities")),
    userId: v.id("users"),
    tokenHash: v.string(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  programs: defineTable({
    universityId: v.id("universities"),
    code: v.string(),
    name: v.string(),
    durationSemesters: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_university_code", ["universityId", "code"]),

  courses: defineTable({
    universityId: v.id("universities"),
    programId: v.id("programs"),
    code: v.string(),
    name: v.string(),
    semester: v.number(),
    creditHours: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_program", ["programId"])
    .index("by_university_code", ["universityId", "code"]),

  students: defineTable({
    universityId: v.id("universities"),
    userId: v.optional(v.id("users")),
    studentId: v.string(),
    indexNumber: v.string(),
    fullName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    programId: v.id("programs"),
    semester: v.number(),
    academicYear: v.string(),
    feeStatus: feeStatusValidator,
    outstandingBalance: v.number(),
    lateRegistration: v.boolean(),
    photoUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_university_student_id", ["universityId", "studentId"])
    .index("by_university_index_number", ["universityId", "indexNumber"])
    .index("by_program", ["programId"]),

  invigilators: defineTable({
    universityId: v.id("universities"),
    userId: v.optional(v.id("users")),
    staffId: v.string(),
    fullName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    ratePerSession: v.number(),
    attendanceBonus: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_university_staff_id", ["universityId", "staffId"]),

  financeUsers: defineTable({
    universityId: v.id("universities"),
    userId: v.id("users"),
    employeeId: v.string(),
    fullName: v.string(),
    email: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_user", ["userId"]),

  lecturers: defineTable({
    universityId: v.id("universities"),
    userId: v.optional(v.id("users")),
    staffId: v.string(),
    fullName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    department: v.optional(v.string()),
    title: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_university_staff_id", ["universityId", "staffId"])
    .index("by_user", ["userId"]),

  courseLecturers: defineTable({
    universityId: v.id("universities"),
    courseId: v.id("courses"),
    lecturerId: v.id("lecturers"),
    academicYear: v.string(),
    semester: v.number(),
    role: v.union(
      v.literal("primary"),
      v.literal("co_lecturer"),
      v.literal("assistant"),
    ),
    createdAt: v.number(),
  })
    .index("by_course", ["courseId"])
    .index("by_lecturer", ["lecturerId"])
    .index("by_university", ["universityId"]),

  courseResults: defineTable({
    universityId: v.id("universities"),
    courseId: v.id("courses"),
    studentId: v.id("students"),
    lecturerId: v.id("lecturers"),
    examScheduleId: v.optional(v.id("examSchedules")),
    academicYear: v.string(),
    semester: v.number(),
    score: v.number(),
    maxScore: v.number(),
    grade: v.optional(v.string()),
    remarks: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    submittedAt: v.optional(v.number()),
    reviewedAt: v.optional(v.number()),
    reviewedByUserId: v.optional(v.id("users")),
    reviewerNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_course", ["courseId"])
    .index("by_student", ["studentId"])
    .index("by_lecturer", ["lecturerId"])
    .index("by_course_student", ["courseId", "studentId"])
    .index("by_university", ["universityId"])
    .index("by_status", ["status"]),

  rooms: defineTable({
    universityId: v.id("universities"),
    name: v.string(),
    code: v.string(),
    roomType: roomTypeValidator,
    capacity: v.number(),
    location: v.optional(v.string()),
    specialNeedsSupport: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_university_code", ["universityId", "code"]),

  seatMaps: defineTable({
    universityId: v.id("universities"),
    roomId: v.id("rooms"),
    mapJson: v.string(),
    updatedAt: v.number(),
  }).index("by_room", ["roomId"]),

  examSchedules: defineTable({
    universityId: v.id("universities"),
    courseId: v.id("courses"),
    programId: v.id("programs"),
    examDate: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    roomId: v.optional(v.id("rooms")),
    invigilatorId: v.optional(v.id("invigilators")),
    status: scheduleStatusValidator,
    frozenSeating: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_university_exam_date", ["universityId", "examDate"])
    .index("by_room_exam_date", ["roomId", "examDate"])
    .index("by_invigilator_exam_date", ["invigilatorId", "examDate"])
    .index("by_program", ["programId"]),

  examRoomAllocations: defineTable({
    universityId: v.id("universities"),
    examScheduleId: v.id("examSchedules"),
    roomId: v.id("rooms"),
    capacityUsed: v.number(),
    createdAt: v.number(),
  })
    .index("by_exam", ["examScheduleId"])
    .index("by_room", ["roomId"]),

  invigilatorAssignments: defineTable({
    universityId: v.id("universities"),
    examScheduleId: v.id("examSchedules"),
    invigilatorId: v.id("invigilators"),
    roomId: v.id("rooms"),
    assignmentDate: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_exam", ["examScheduleId"])
    .index("by_invigilator", ["invigilatorId"])
    .index("by_room", ["roomId"]),

  seatingArrangements: defineTable({
    universityId: v.id("universities"),
    examScheduleId: v.id("examSchedules"),
    mode: seatingModeValidator,
    seed: v.optional(v.number()),
    frozen: v.boolean(),
    version: v.number(),
    generatedByUserId: v.id("users"),
    generatedAt: v.number(),
  })
    .index("by_exam", ["examScheduleId"])
    .index("by_exam_version", ["examScheduleId", "version"]),

  seatingAssignments: defineTable({
    universityId: v.id("universities"),
    examScheduleId: v.id("examSchedules"),
    arrangementId: v.id("seatingArrangements"),
    roomId: v.id("rooms"),
    studentId: v.id("students"),
    seatNumber: v.string(),
    generatedAt: v.number(),
  })
    .index("by_exam", ["examScheduleId"])
    .index("by_exam_student", ["examScheduleId", "studentId"])
    .index("by_exam_room", ["examScheduleId", "roomId"]),

  attendanceRegisters: defineTable({
    universityId: v.id("universities"),
    examScheduleId: v.id("examSchedules"),
    roomId: v.id("rooms"),
    invigilatorId: v.id("invigilators"),
    status: registerStatusValidator,
    signature: v.optional(v.string()),
    finalizedAt: v.optional(v.number()),
    submittedToAdminAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_exam_room", ["examScheduleId", "roomId"])
    .index("by_invigilator", ["invigilatorId"])
    .index("by_university", ["universityId"]),

  examAttendance: defineTable({
    universityId: v.id("universities"),
    registerId: v.id("attendanceRegisters"),
    examScheduleId: v.id("examSchedules"),
    roomId: v.id("rooms"),
    studentId: v.id("students"),
    status: attendanceStatusValidator,
    note: v.optional(v.string()),
    markedAt: v.number(),
    markedByInvigilatorId: v.id("invigilators"),
  })
    .index("by_register", ["registerId"])
    .index("by_register_student", ["registerId", "studentId"])
    .index("by_exam_student", ["examScheduleId", "studentId"]),

  attendanceBulkActions: defineTable({
    universityId: v.id("universities"),
    registerId: v.id("attendanceRegisters"),
    actionType: v.string(),
    payload: v.string(),
    performedByUserId: v.id("users"),
    createdAt: v.number(),
  }).index("by_register", ["registerId"]),

  attendanceActionLogs: defineTable({
    universityId: v.id("universities"),
    registerId: v.id("attendanceRegisters"),
    studentId: v.id("students"),
    oldStatus: v.optional(attendanceStatusValidator),
    newStatus: attendanceStatusValidator,
    reason: v.optional(v.string()),
    actorUserId: v.id("users"),
    actorRole: roleValidator,
    createdAt: v.number(),
    isOverride: v.boolean(),
  })
    .index("by_register", ["registerId"])
    .index("by_student", ["studentId"]),

  attendanceSyncQueue: defineTable({
    universityId: v.id("universities"),
    registerId: v.id("attendanceRegisters"),
    invigilatorId: v.id("invigilators"),
    payload: v.string(),
    status: v.union(v.literal("pending"), v.literal("synced"), v.literal("conflict")),
    createdAt: v.number(),
    syncedAt: v.optional(v.number()),
  })
    .index("by_register", ["registerId"])
    .index("by_status", ["status"]),

  studentIdCards: defineTable({
    universityId: v.id("universities"),
    studentId: v.id("students"),
    validityStart: v.string(),
    validityEnd: v.string(),
    status: idCardStatusValidator,
    qrCodeValue: v.string(),
    generatedAt: v.number(),
    printedAt: v.optional(v.number()),
    updatedAt: v.number(),
  })
    .index("by_student", ["studentId"])
    .index("by_university", ["universityId"]),

  idVerificationLogs: defineTable({
    universityId: v.id("universities"),
    examScheduleId: v.optional(v.id("examSchedules")),
    invigilatorId: v.id("invigilators"),
    studentId: v.optional(v.id("students")),
    searchTerm: v.string(),
    reason: v.string(),
    penaltyApplied: v.boolean(),
    penaltyPoints: v.number(),
    timestamp: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_student", ["studentId"])
    .index("by_invigilator", ["invigilatorId"]),

  studentPenalties: defineTable({
    universityId: v.id("universities"),
    studentId: v.id("students"),
    semester: v.number(),
    academicYear: v.string(),
    totalPoints: v.number(),
    warningSent: v.boolean(),
    adminReviewTriggered: v.boolean(),
    disciplinaryFlag: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_student_term", ["studentId", "semester", "academicYear"])
    .index("by_university", ["universityId"]),

  complaints: defineTable({
    universityId: v.id("universities"),
    submittedByUserId: v.id("users"),
    complainantRole: roleValidator,
    category: complaintCategoryValidator,
    subject: v.string(),
    description: v.string(),
    status: complaintStatusValidator,
    resolutionNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_university", ["universityId"])
    .index("by_submitter", ["submittedByUserId"])
    .index("by_status", ["status"]),

  complaintComments: defineTable({
    universityId: v.id("universities"),
    complaintId: v.id("complaints"),
    authorUserId: v.id("users"),
    message: v.string(),
    createdAt: v.number(),
  })
    .index("by_complaint", ["complaintId"])
    .index("by_university", ["universityId"]),

  messageGroups: defineTable({
    universityId: v.id("universities"),
    name: v.string(),
    description: v.optional(v.string()),
    createdByUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_creator", ["createdByUserId"]),

  messages: defineTable({
    universityId: v.id("universities"),
    senderUserId: v.id("users"),
    recipientUserId: v.optional(v.id("users")),
    recipientRole: v.optional(roleValidator),
    groupId: v.optional(v.id("messageGroups")),
    type: v.union(v.literal("direct"), v.literal("broadcast"), v.literal("group")),
    subject: v.string(),
    body: v.string(),
    createdAt: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_recipient", ["recipientUserId"])
    .index("by_recipient_role", ["recipientRole"]),

  notifications: defineTable({
    universityId: v.optional(v.id("universities")),
    userId: v.optional(v.id("users")),
    roleScope: notificationScopeValidator,
    title: v.string(),
    body: v.string(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_university", ["universityId"]),

  notificationLogs: defineTable({
    universityId: v.optional(v.id("universities")),
    notificationId: v.id("notifications"),
    deliveredToUserId: v.optional(v.id("users")),
    deliveredAt: v.number(),
    channel: v.union(v.literal("in_app"), v.literal("web_push")),
    success: v.boolean(),
  })
    .index("by_notification", ["notificationId"])
    .index("by_user", ["deliveredToUserId"]),

  pushSubscriptions: defineTable({
    universityId: v.id("universities"),
    userId: v.id("users"),
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  paymentRecords: defineTable({
    universityId: v.id("universities"),
    studentId: v.optional(v.id("students")),
    invigilatorId: v.optional(v.id("invigilators")),
    type: v.union(
      v.literal("student_fee"),
      v.literal("course_reg_payment"),
      v.literal("invigilator_payment"),
      v.literal("attendance_bonus"),
      v.literal("penalty_fee"),
    ),
    amount: v.number(),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("paid")),
    reference: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_student", ["studentId"])
    .index("by_invigilator", ["invigilatorId"]),

  reportTemplates: defineTable({
    universityId: v.id("universities"),
    name: v.string(),
    type: v.string(),
    layoutJson: v.string(),
    isDefault: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_university_type", ["universityId", "type"]),

  emergencyAnnouncements: defineTable({
    universityId: v.id("universities"),
    message: v.string(),
    severity: v.union(v.literal("info"), v.literal("warning"), v.literal("critical")),
    activeFrom: v.number(),
    activeTo: v.number(),
    createdByUserId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_active_window", ["activeFrom", "activeTo"]),

  auditLogs: defineTable({
    universityId: v.optional(v.id("universities")),
    actorUserId: v.optional(v.id("users")),
    actorRole: v.optional(roleValidator),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    context: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_university", ["universityId"])
    .index("by_actor", ["actorUserId"])
    .index("by_action", ["action"]),
});
