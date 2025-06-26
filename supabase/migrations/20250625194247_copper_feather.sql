/*
  # Wallpapers Landing Schema

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `slug` (text, unique)
      - `color` (text)
      - `created_at` (timestamp)
    
    - `wallpapers`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text, optional)
      - `image_url` (text)
      - `thumbnail_url` (text)
      - `category_id` (uuid, foreign key)
      - `tags` (text array)
      - `download_count` (integer, default 0)
      - `width` (integer)
      - `height` (integer)
      - `file_size` (bigint)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Public read access for wallpapers and categories
    - Admin-only write access (for now, can be extended later)

  3. Indexes
    - Category slug index for fast filtering
    - Wallpaper title search index
    - Download count index for popular sorting
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  color text DEFAULT '#6366f1',
  created_at timestamptz DEFAULT now()
);

-- Create wallpapers table
CREATE TABLE IF NOT EXISTS wallpapers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  image_url text NOT NULL,
  thumbnail_url text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  tags text[] DEFAULT ARRAY[]::text[],
  download_count integer DEFAULT 0,
  width integer NOT NULL,
  height integer NOT NULL,
  file_size bigint DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallpapers ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Categories are publicly readable"
  ON categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Wallpapers are publicly readable"
  ON wallpapers
  FOR SELECT
  TO public
  USING (true);

-- Create policies for admin write access (using service role)
CREATE POLICY "Admin can insert categories"
  ON categories
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Admin can update categories"
  ON categories
  FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Admin can insert wallpapers"
  ON wallpapers
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Admin can update wallpapers"
  ON wallpapers
  FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Admin can delete wallpapers"
  ON wallpapers
  FOR DELETE
  TO service_role
  USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
CREATE INDEX IF NOT EXISTS idx_wallpapers_category ON wallpapers(category_id);
CREATE INDEX IF NOT EXISTS idx_wallpapers_downloads ON wallpapers(download_count DESC);
CREATE INDEX IF NOT EXISTS idx_wallpapers_created ON wallpapers(created_at DESC);

-- Insert default categories
INSERT INTO categories (name, slug, color) VALUES
  ('Naturaleza', 'naturaleza', '#10b981'),
  ('Abstracto', 'abstracto', '#8b5cf6'),
  ('Tecnología', 'tecnologia', '#3b82f6'),
  ('Arquitectura', 'arquitectura', '#6b7280'),
  ('Espacio', 'espacio', '#1e1b4b'),
  ('Animales', 'animales', '#f59e0b'),
  ('Ciudades', 'ciudades', '#ef4444'),
  ('Minimalista', 'minimalista', '#000000')
ON CONFLICT (slug) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for wallpapers updated_at
CREATE TRIGGER update_wallpapers_updated_at
  BEFORE UPDATE ON wallpapers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();