type SeatCandidate<StudentId extends string> = {
  studentId: StudentId;
  indexNumber: string;
};

type SeatRoom<RoomId extends string> = {
  roomId: RoomId;
  roomCode: string;
  capacity: number;
};

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function orderStudents<StudentId extends string>(
  students: SeatCandidate<StudentId>[],
  mode: "sequential" | "shuffled",
  seed?: number,
) {
  const next = [...students];

  if (mode === "sequential") {
    return next.sort((a, b) => a.indexNumber.localeCompare(b.indexNumber));
  }

  const random = createSeededRandom(seed ?? Date.now());
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j]!, next[i]!];
  }
  return next;
}

export function allocateSeats<StudentId extends string, RoomId extends string>(
  students: SeatCandidate<StudentId>[],
  rooms: SeatRoom<RoomId>[],
) {
  const totalCapacity = rooms.reduce((sum, room) => sum + room.capacity, 0);
  if (students.length > totalCapacity) {
    throw new Error("Insufficient room capacity for this exam");
  }

  const assignments: Array<{
    studentId: StudentId;
    roomId: RoomId;
    seatNumber: string;
  }> = [];

  let pointer = 0;
  for (const room of rooms) {
    for (let seat = 1; seat <= room.capacity; seat += 1) {
      const student = students[pointer];
      if (!student) {
        return assignments;
      }

      assignments.push({
        studentId: student.studentId,
        roomId: room.roomId,
        seatNumber: `${room.roomCode}-${seat}`,
      });
      pointer += 1;
    }
  }

  return assignments;
}
