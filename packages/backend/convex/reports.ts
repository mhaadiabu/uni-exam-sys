import { query } from "./_generated/server";
import { v } from "convex/values";

import { computeAttendanceCounters } from "./lib/attendance";
import { getScopedUniversityId, requireSessionUser, requireUniversityScope } from "./lib/auth";

function csvEscape(value: string | number | boolean | undefined | null) {
  const raw = value === undefined || value === null ? "" : String(value);
  if (raw.includes(",") || raw.includes("\n") || raw.includes('"')) {
    return `"${raw.replaceAll('"', '""')}"`;
  }
  return raw;
}

function toCsv(headers: string[], rows: Array<Array<string | number | boolean | undefined | null>>) {
  const headerLine = headers.map(csvEscape).join(",");
  const body = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  return `${headerLine}\n${body}`;
}

export const attendanceRegisterReport = query({
  args: {
    registerId: v.id("attendanceRegisters"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const register = await ctx.db.get(args.registerId);
    if (!register) {
      throw new Error("Attendance register not found");
    }

    requireUniversityScope(session.user, register.universityId);

    const [schedule, room, invigilator, attendanceRows] = await Promise.all([
      ctx.db.get(register.examScheduleId),
      ctx.db.get(register.roomId),
      ctx.db.get(register.invigilatorId),
      ctx.db
        .query("examAttendance")
        .withIndex("by_register", (q) => q.eq("registerId", register._id))
        .collect(),
    ]);

    if (!schedule) {
      throw new Error("Schedule not found");
    }

    const course = await ctx.db.get(schedule.courseId);
    const counters = computeAttendanceCounters(attendanceRows, attendanceRows.length || 1);

    const rows = await Promise.all(
      attendanceRows.map(async (row) => {
        const student = await ctx.db.get(row.studentId);
        return {
          studentId: student?.studentId ?? "Unknown",
          fullName: student?.fullName ?? "Unknown",
          indexNumber: student?.indexNumber ?? "Unknown",
          status: row.status,
          note: row.note,
        };
      }),
    );

    const presentList = rows.filter((row) => row.status === "present" || row.status === "late" || row.status === "excused");
    const absentList = rows.filter((row) => row.status === "absent");

    return {
      header: {
        room: room?.name ?? "Unknown Room",
        roomCode: room?.code ?? "N/A",
        examDate: schedule.examDate,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        courseName: course?.name ?? "Unknown Course",
        courseCode: course?.code ?? "Unknown",
        invigilator: invigilator?.fullName ?? "Unknown Invigilator",
        totalRegistered: rows.length,
        totalPresent: counters.presentEquivalent,
        totalAbsent: counters.absent,
        generatedAt: Date.now(),
      },
      counters,
      rows,
      presentList,
      absentList,
    };
  },
});

export const attendanceSummaryByUniversity = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const registers = await ctx.db
      .query("attendanceRegisters")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    const rows = await Promise.all(
      registers.map(async (register) => {
        const attendanceRows = await ctx.db
          .query("examAttendance")
          .withIndex("by_register", (q) => q.eq("registerId", register._id))
          .collect();
        const counters = computeAttendanceCounters(attendanceRows, attendanceRows.length || 1);
        const room = await ctx.db.get(register.roomId);
        return {
          registerId: register._id,
          roomName: room?.name ?? "Unknown Room",
          status: register.status,
          ...counters,
        };
      }),
    );

    return rows;
  },
});

export const seatingReport = query({
  args: {
    examScheduleId: v.id("examSchedules"),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const schedule = await ctx.db.get(args.examScheduleId);
    if (!schedule) {
      throw new Error("Exam schedule not found");
    }

    requireUniversityScope(session.user, schedule.universityId);

    const [course, assignments] = await Promise.all([
      ctx.db.get(schedule.courseId),
      ctx.db
        .query("seatingAssignments")
        .withIndex("by_exam", (q) => q.eq("examScheduleId", args.examScheduleId))
        .collect(),
    ]);

    const rows = await Promise.all(
      assignments.map(async (assignment) => {
        const [student, room] = await Promise.all([
          ctx.db.get(assignment.studentId),
          ctx.db.get(assignment.roomId),
        ]);
        return {
          studentId: student?.studentId ?? "Unknown",
          studentName: student?.fullName ?? "Unknown",
          indexNumber: student?.indexNumber ?? "Unknown",
          roomName: room?.name ?? "Unknown Room",
          roomCode: room?.code ?? "N/A",
          seatNumber: assignment.seatNumber,
        };
      }),
    );

    return {
      examDate: schedule.examDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      courseName: course?.name ?? "Unknown Course",
      courseCode: course?.code ?? "Unknown",
      rows: rows.sort((a, b) => a.seatNumber.localeCompare(b.seatNumber)),
    };
  },
});

export const timetableReport = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const schedules = await ctx.db
      .query("examSchedules")
      .withIndex("by_university", (q) => q.eq("universityId", scoped))
      .collect();

    return await Promise.all(
      schedules.map(async (schedule) => {
        const [course, program, room, invigilator] = await Promise.all([
          ctx.db.get(schedule.courseId),
          ctx.db.get(schedule.programId),
          schedule.roomId ? ctx.db.get(schedule.roomId) : Promise.resolve(null),
          schedule.invigilatorId ? ctx.db.get(schedule.invigilatorId) : Promise.resolve(null),
        ]);

        return {
          scheduleId: schedule._id,
          examDate: schedule.examDate,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          courseCode: course?.code ?? "Unknown",
          courseName: course?.name ?? "Unknown",
          program: program?.name ?? "Unknown",
          room: room?.name ?? "Not assigned",
          invigilator: invigilator?.fullName ?? "Not assigned",
          status: schedule.status,
        };
      }),
    );
  },
});

export const exportCsvBundle = query({
  args: {
    universityId: v.optional(v.id("universities")),
  },
  handler: async (ctx, args) => {
    const session = await requireSessionUser(ctx);
    const scoped = getScopedUniversityId(session.user, args.universityId);

    const [students, rooms, schedules] = await Promise.all([
      ctx.db
        .query("students")
        .withIndex("by_university", (q) => q.eq("universityId", scoped))
        .collect(),
      ctx.db
        .query("rooms")
        .withIndex("by_university", (q) => q.eq("universityId", scoped))
        .collect(),
      ctx.db
        .query("examSchedules")
        .withIndex("by_university", (q) => q.eq("universityId", scoped))
        .collect(),
    ]);

    const studentsCsv = toCsv(
      [
        "studentId",
        "indexNumber",
        "fullName",
        "programId",
        "semester",
        "academicYear",
        "feeStatus",
        "outstandingBalance",
      ],
      students.map((student) => [
        student.studentId,
        student.indexNumber,
        student.fullName,
        student.programId,
        student.semester,
        student.academicYear,
        student.feeStatus,
        student.outstandingBalance,
      ]),
    );

    const roomsCsv = toCsv(
      ["name", "code", "roomType", "capacity", "specialNeedsSupport", "isActive"],
      rooms.map((room) => [
        room.name,
        room.code,
        room.roomType,
        room.capacity,
        room.specialNeedsSupport,
        room.isActive,
      ]),
    );

    const schedulesCsv = toCsv(
      ["examDate", "startTime", "endTime", "courseId", "programId", "roomId", "invigilatorId", "status"],
      schedules.map((schedule) => [
        schedule.examDate,
        schedule.startTime,
        schedule.endTime,
        schedule.courseId,
        schedule.programId,
        schedule.roomId,
        schedule.invigilatorId,
        schedule.status,
      ]),
    );

    return {
      studentsCsv,
      roomsCsv,
      schedulesCsv,
    };
  },
});
