import type { Doc } from "../_generated/dataModel";

type AttendanceStatus = Doc<"examAttendance">["status"];

const presentLike = new Set<AttendanceStatus>(["present", "late", "excused"]);

export function computeAttendanceCounters(
  rows: Array<Pick<Doc<"examAttendance">, "status">>,
  totalRegistered: number,
) {
  let present = 0;
  let absent = 0;
  let late = 0;
  let excused = 0;

  for (const row of rows) {
    if (row.status === "present") {
      present += 1;
    } else if (row.status === "absent") {
      absent += 1;
    } else if (row.status === "late") {
      late += 1;
    } else if (row.status === "excused") {
      excused += 1;
    }
  }

  const attendancePresentEquivalent = rows.filter((row) => presentLike.has(row.status)).length;
  const completionPercent = totalRegistered === 0 ? 0 : (rows.length / totalRegistered) * 100;

  return {
    present,
    absent,
    late,
    excused,
    completionPercent: Number(completionPercent.toFixed(2)),
    presentEquivalent: attendancePresentEquivalent,
  };
}
