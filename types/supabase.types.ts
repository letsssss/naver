// Supabase 데이터베이스 타입 정의

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: number;
          name: string;
          purchase_id: number;
          created_at?: string;
          last_chat?: string;
          time_of_last_chat?: string;
        };
        Insert: {
          id?: number;
          name: string;
          purchase_id: number;
          created_at?: string;
          last_chat?: string;
          time_of_last_chat?: string;
        };
        Update: {
          id?: number;
          name?: string;
          purchase_id?: number;
          created_at?: string;
          last_chat?: string;
          time_of_last_chat?: string;
        };
      };
      messages: {
        Row: {
          id: number;
          room_id: number;
          user_id: string;
          content: string;
          created_at: string;
          read_at?: string;
        };
        Insert: {
          id?: number;
          room_id: number;
          user_id: string;
          content: string;
          created_at?: string;
          read_at?: string;
        };
        Update: {
          id?: number;
          room_id?: number;
          user_id?: string;
          content?: string;
          created_at?: string;
          read_at?: string;
        };
      };
      room_participants: {
        Row: {
          id: number;
          room_id: number;
          user_id: string;
          created_at?: string;
        };
        Insert: {
          id?: number;
          room_id: number;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          room_id?: number;
          user_id?: string;
          created_at?: string;
        };
      };
      purchases: {
        Row: {
          id: number;
          buyer_id: string;
          seller_id: string;
          order_number: string;
          created_at?: string;
        };
        Insert: {
          id?: number;
          buyer_id: string;
          seller_id: string;
          order_number: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          buyer_id?: string;
          seller_id?: string;
          order_number?: string;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
  };
};
