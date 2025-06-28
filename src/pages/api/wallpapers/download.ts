import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id, format } = await request.json();
    const validFormats = ['webp', 'jpg', 'png'];
    const chosenFormat = validFormats.includes(format) ? format : 'jpg';

    if (!id) {
      return new Response(JSON.stringify({ error: 'Wallpaper ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get wallpaper data to get the image URLs and current download count
    const { data: wallpaper, error: fetchError } = await supabaseAdmin
      .from('wallpapers')
      .select('image_url, webp_url, title, download_count')
      .eq('id', id)
      .single();

    if (fetchError || !wallpaper) {
      return new Response(JSON.stringify({ error: 'Wallpaper not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Elegir la URL según el formato
    let imageUrl = wallpaper.image_url;
    let contentType = 'image/jpeg';
    let ext = 'jpg';
    if (chosenFormat === 'webp' && wallpaper.webp_url) {
      imageUrl = wallpaper.webp_url;
      contentType = 'image/webp';
      ext = 'webp';
    } else if (chosenFormat === 'png') {
      // Si tienes PNG, deberías guardar la url en la base de datos. Si no, convierte la imagen al vuelo (no recomendado en free tier).
      // Por ahora, simplemente sirve el JPG como fallback.
      contentType = 'image/png';
      ext = 'png';
    }

    // Intenta obtener la imagen
    try {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to fetch image');
      }
      const imageBuffer = await imageResponse.arrayBuffer();

      // Solo aquí cuenta la descarga
      const { error } = await supabaseAdmin
        .from('wallpapers')
        .update({ 
          download_count: (wallpaper.download_count || 0) + 1
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating download count:', error);
      }

      return new Response(imageBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${wallpaper.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${ext}"`,
          'Cache-Control': 'no-cache'
        }
      });
    } catch (imageError) {
      console.error('Error fetching image:', imageError);
      return new Response(JSON.stringify({ 
        error: 'No se pudo descargar la imagen en el formato solicitado.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error('Download tracking error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Failed to track download' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};