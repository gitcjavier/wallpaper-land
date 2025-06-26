import pkg from '@supabase/supabase-js';
const { createClient, sql } = pkg;

const supabaseUrl = import.meta.env.SUPABASE_URL;
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Public client for read operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for write operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Export sql helper for raw SQL expressions
export { sql };

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          color?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          color?: string;
          created_at?: string;
        };
      };
      wallpapers: {
        Row: {
          id: string;
          title: string;
          description: string;
          image_url: string;
          thumbnail_url: string;
          category_id: string | null;
          tags: string[];
          download_count: number;
          width: number;
          height: number;
          file_size: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string;
          image_url: string;
          thumbnail_url: string;
          category_id?: string | null;
          tags?: string[];
          download_count?: number;
          width: number;
          height: number;
          file_size?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string;
          image_url?: string;
          thumbnail_url?: string;
          category_id?: string | null;
          tags?: string[];
          download_count?: number;
          width?: number;
          height?: number;
          file_size?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};