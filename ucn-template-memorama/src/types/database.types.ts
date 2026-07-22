export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Row = Record<string, Json>;
type Table = {
  Row: Row;
  Insert: Row;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table;
      game_themes: Table;
      cards: Table;
      game_sessions: Table;
    };
    Views: Record<string, never>;
    Functions: {
      save_game_session_safe: { Args: { p_theme_id: string; p_difficulty: "easy" | "medium" | "hard"; p_moves: number; p_duration_seconds: number; p_pairs_found: number }; Returns: number };
      get_game_ranking: { Args: Record<string, never>; Returns: { player_name: string; score: number; difficulty: "easy" | "medium" | "hard"; created_at: string }[] };
    };
    Enums: {
      app_role: "user" | "admin";
      game_difficulty: "easy" | "medium" | "hard";
    };
    CompositeTypes: Record<string, never>;
  };
};
