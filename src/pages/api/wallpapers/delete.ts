import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const DELETE: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return new Response(JSON.stringify({ success: false, error: 'ID requerido' }), { status: 400 });
  }

  // 1. Obtén el registro para saber la URL de la imagen y la miniatura
  const { data: wallpaper, error: fetchError } = await supabaseAdmin
    .from('wallpapers')
    .select('image_url, thumbnail_url')
    .eq('id', id)
    .single();

  if (fetchError) {
    return new Response(JSON.stringify({ success: false, error: fetchError.message }), { status: 500 });
  }

  // 2. Elimina el registro de la base de datos
  const { error } = await supabaseAdmin.from('wallpapers').delete().eq('id', id);

  if (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
  }

  // 3. Elimina la imagen principal y la miniatura del storage si existen
  let warnings = [];
  for (const key of ['image_url', 'thumbnail_url']) {
    if (wallpaper && wallpaper[key]) {
      const match = wallpaper[key].match(/\/object\/public\/([^/]+)\/(.+)$/);
      if (match) {
        const bucket = match[1];
        const filePath = match[2];
        const { error: storageError } = await supabaseAdmin.storage.from(bucket).remove([filePath]);
        if (storageError) {
          warnings.push(`Error eliminando ${key}: ${storageError.message}`);
        }
      }
    }
  }

  if (warnings.length > 0) {
    return new Response(JSON.stringify({ success: true, warning: warnings.join('; ') }), { status: 200 });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}; 