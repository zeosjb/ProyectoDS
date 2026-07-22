export type Difficulty = "easy" | "medium" | "hard";

export function pairsForDifficulty(difficulty: Difficulty) {
  return difficulty === "easy" ? 6 : difficulty === "medium" ? 8 : 10;
}

export function calculateScore(difficulty: Difficulty, moves: number, durationSeconds: number) {
  const pairs = pairsForDifficulty(difficulty);
  return Math.max(0, pairs * 1000 - moves * 15 - durationSeconds * 5);
}

export function validateGameResult(difficulty: Difficulty, moves: number, durationSeconds: number, pairsFound: number) {
  const pairs = pairsForDifficulty(difficulty);
  return pairsFound === pairs && moves >= pairs && durationSeconds >= pairs * 2;
}
