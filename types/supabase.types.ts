// Supabase Database 타입 정의
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          created_at?: string;
          email: string;
          name?: string;
          avatar_url?: string;
        };
        Insert: {
          id: string;
          created_at?: string;
          email: string;
          name?: string;
          avatar_url?: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          email?: string;
          name?: string;
          avatar_url?: string;
        };
      };
      rooms: {
        Row: {
          id: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          order_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name: string;
          order_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          name?: string;
          order_id?: string;
        };
      };
      room_participants: {
        Row: {
          id: string;
          created_at?: string;
          room_id: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          room_id: string;
          user_id: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          room_id?: string;
          user_id?: string;
        };
      };
      purchases: {
        Row: {
          id: string;
          created_at?: string;
          user_id: string;
          order_id: string;
          product_id: string;
          status: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          order_id: string;
          product_id: string;
          status: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          user_id?: string;
          order_id?: string;
          product_id?: string;
          status?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          created_at?: string;
          room_id: string;
          user_id: string;
          content: string;
        };
        Insert: {
          id?: string;
          created_at?: string;
          room_id: string;
          user_id: string;
          content: string;
        };
        Update: {
          id?: string;
          created_at?: string;
          room_id?: string;
          user_id?: string;
          content?: string;
        };
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}
