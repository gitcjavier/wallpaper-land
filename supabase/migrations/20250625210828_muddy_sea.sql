/*
  # Add new entertainment categories

  1. New Categories
    - `anime` - Para contenido de anime y manga
    - `peliculas` - Para wallpapers de películas
    - `series-tv` - Para series de televisión
    - `deportes` - Para contenido deportivo

  2. Changes
    - Insert new categories with appropriate colors
    - Categories will be available immediately for filtering
*/

-- Insert new entertainment categories
INSERT INTO categories (name, slug, color) VALUES
  ('Anime', 'anime', '#ff6b6b'),
  ('Películas', 'peliculas', '#4ecdc4'),
  ('Series TV', 'series-tv', '#45b7d1'),
  ('Deportes', 'deportes', '#96ceb4')
ON CONFLICT (slug) DO NOTHING;