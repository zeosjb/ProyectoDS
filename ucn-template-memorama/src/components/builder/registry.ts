import type { RegisteredComponent } from "@builder.io/sdk-react-nextjs";
import { MemoryGame, DifficultySelector, GameResult, PlayerHistory, RankingTable } from "@/components/domain";

export const customComponents: RegisteredComponent[] = [
  {
    component: MemoryGame,
    name: "MemoryGame",
    inputs: [
      { name: "title", type: "string", defaultValue: "MemoryGame" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: DifficultySelector,
    name: "DifficultySelector",
    inputs: [
      { name: "title", type: "string", defaultValue: "DifficultySelector" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: GameResult,
    name: "GameResult",
    inputs: [
      { name: "title", type: "string", defaultValue: "GameResult" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: PlayerHistory,
    name: "PlayerHistory",
    inputs: [
      { name: "title", type: "string", defaultValue: "PlayerHistory" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  },
  {
    component: RankingTable,
    name: "RankingTable",
    inputs: [
      { name: "title", type: "string", defaultValue: "RankingTable" },
      { name: "description", type: "longText", defaultValue: "Texto editable para estudiantes." },
      { name: "variant", type: "string", enum: ["compact", "featured"], defaultValue: "compact" }
    ]
  }
];
