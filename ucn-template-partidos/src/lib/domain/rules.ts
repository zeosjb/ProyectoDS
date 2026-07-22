export type MatchAvailability = "Disponible" | "Ultimos cupos" | "Completo";

export function getMatchAvailability(capacity: number, registered: number): MatchAvailability {
  const available = Math.max(capacity - registered, 0);
  if (available === 0) return "Completo";
  if (available <= 3) return "Ultimos cupos";
  return "Disponible";
}

export function canJoinMatch(capacity: number, registered: number, alreadyJoined: boolean) {
  return !alreadyJoined && getMatchAvailability(capacity, registered) !== "Completo";
}
