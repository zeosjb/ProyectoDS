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
      boards: Table;
      board_members: Table;
      tasks: Table;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      app_role: "user" | "admin";
      task_status: "pending" | "in_progress" | "completed";
      task_priority: "low" | "medium" | "high";
    };
    CompositeTypes: Record<string, never>;
  };
};
