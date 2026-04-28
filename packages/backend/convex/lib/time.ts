export function toMinutes(time: string) {
  const [hours, minutes] = time.split(":").map((value) => Number.parseInt(value, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Invalid time format: ${time}`);
  }
  return hours * 60 + minutes;
}

export function rangesOverlap(startA: string, endA: string, startB: string, endB: string) {
  const aStart = toMinutes(startA);
  const aEnd = toMinutes(endA);
  const bStart = toMinutes(startB);
  const bEnd = toMinutes(endB);

  if (aEnd <= aStart || bEnd <= bStart) {
    throw new Error("End time must be after start time");
  }

  return aStart < bEnd && bStart < aEnd;
}
