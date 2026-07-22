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
      categories: Table;
      equipment: Table;
      loan_requests: Table;
      loan_events: Table;
    };
    Views: Record<string, never>;
    Functions: {
      approve_loan_request_safe: { Args: { p_request_id: string; p_comment: string | null }; Returns: undefined };
      return_loan_request_safe: { Args: { p_request_id: string; p_comment: string | null }; Returns: undefined };
    };
    Enums: {
      app_role: "user" | "admin";
      loan_status: "pending" | "approved" | "rejected" | "delivered" | "returned" | "overdue" | "cancelled";
    };
    CompositeTypes: Record<string, never>;
  };
};
