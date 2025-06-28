import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import sharp from 'sharp';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Si es formData (edición con imagen), procesa el archivo
    if (request.headers.get('content-type')?.includes('multipart/form-data')) {
      const formData = await request.formData();
      const id = formData.get('id') as string;
      const title = formData.get('title') as string;
      const categoryId = formData.get('categoryId') as string;
      const file = formData.get('file') as File | null;
      if (!id || !title) {
        return new Response(JSON.stringify({ error: 'ID y título requeridos' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      // Si hay archivo, elimina los antiguos y sube los nuevos
      if (file) {
        // 1. Obtén las URLs antiguas
        const { data: oldWallpaper, error: fetchError } = await supabaseAdmin
          .from('wallpapers')
          .select('image_url, thumbnail_url')
          .eq('id', id)
          .single();
        if (fetchError) {
          return new Response(JSON.stringify({ error: fetchError.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        // 2. Elimina del storage las imágenes antiguas
        for (const key of ['image_url', 'thumbnail_url']) {
          if (oldWallpaper && oldWallpaper[key]) {
            const match = oldWallpaper[key].match(/\/object\/public\/([^/]+)\/(.+)$/);
            if (match) {
              const bucket = match[1];
              const filePath = match[2];
              await supabaseAdmin.storage.from(bucket).remove([filePath]);
            }
          }
        }
        // 3. Sube la nueva imagen y miniatura
        const buffer = Buffer.from(await file.arrayBuffer());
        const fileExtension = file.name.split('.').pop() || 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
        const webpBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();
        const webpFileName = fileName.replace(/\.[a-zA-Z]+$/, '.webp');
        // Sube original
        const { error: uploadError } = await supabaseAdmin.storage
          .from('wallpapers')
          .upload(fileName, buffer, {
            contentType: file.type,
            cacheControl: '3600',
            upsert: false
          });
        if (uploadError) {
          return new Response(JSON.stringify({ error: `Upload failed: ${uploadError.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        // Sube webp
        const { error: webpError } = await supabaseAdmin.storage
          .from('wallpapers')
          .upload(webpFileName, webpBuffer, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: false
          });
        if (webpError) {
          // Limpia original si falla webp
          await supabaseAdmin.storage.from('wallpapers').remove([fileName]);
          return new Response(JSON.stringify({ error: `WebP upload failed: ${webpError.message}` }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        // URLs públicas
        const { data: urlData } = supabaseAdmin.storage.from('wallpapers').getPublicUrl(fileName);
        const { data: webpUrlData } = supabaseAdmin.storage.from('wallpapers').getPublicUrl(webpFileName);
        if (!urlData.publicUrl || !webpUrlData.publicUrl) {
          await supabaseAdmin.storage.from('wallpapers').remove([fileName, webpFileName]);
          return new Response(JSON.stringify({ error: 'Failed to get public URL' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        // Actualiza registro
        const { error } = await supabaseAdmin
          .from('wallpapers')
          .update({
            title: title.trim(),
            category_id: categoryId || null,
            image_url: urlData.publicUrl,
            thumbnail_url: webpUrlData.publicUrl
          })
          .eq('id', id);
        if (error) {
          await supabaseAdmin.storage.from('wallpapers').remove([fileName, webpFileName]);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        // Solo actualiza título/categoría
        const { error } = await supabaseAdmin
          .from('wallpapers')
          .update({
            title: title.trim(),
            category_id: categoryId || null
          })
          .eq('id', id);
        if (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else {
      // JSON: solo título/categoría
      const { id, title, categoryId } = await request.json();
      if (!id || !title) {
        return new Response(JSON.stringify({ error: 'ID y título requeridos' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      const { error } = await supabaseAdmin
        .from('wallpapers')
        .update({
          title: title.trim(),
          category_id: categoryId || null
        })
        .eq('id', id);
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error al editar wallpaper' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}; 