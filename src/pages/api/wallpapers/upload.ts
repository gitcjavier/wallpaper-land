import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';
import sharp from 'sharp';

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const categoryId = formData.get('categoryId') as string;
    const tagsString = formData.get('tags') as string;

    if (!file || !title) {
      return new Response(JSON.stringify({ error: 'File and title are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/webp', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: `Upload failed: mime type ${file.type} is not supported` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File size must be less than 10MB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get image dimensions
    const buffer = await file.arrayBuffer();
    const originalBuffer = Buffer.from(buffer);
    const dimensions = await getImageDimensions(buffer);

    // Generate unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;

    // Check if storage bucket exists and create if needed
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError);
      return new Response(JSON.stringify({ error: 'Storage configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const wallpapersBucket = buckets.find(bucket => bucket.name === 'wallpapers');
    
    if (!wallpapersBucket) {
      // Try to create the bucket
      const { error: createBucketError } = await supabaseAdmin.storage.createBucket('wallpapers', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        fileSizeLimit: 10485760 // 10MB
      });

      if (createBucketError) {
        console.error('Error creating bucket:', createBucketError);
        return new Response(JSON.stringify({ 
          error: 'Storage bucket not configured. Please create a "wallpapers" bucket in Supabase Storage.' 
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Convert to WebP
    const webpBuffer = await sharp(originalBuffer).webp({ quality: 80 }).toBuffer();
    const webpFileName = fileName.replace(/\.[a-zA-Z]+$/, '.webp');

    // Upload original image
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('wallpapers')
      .upload(fileName, originalBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ 
        error: `Upload failed: ${uploadError.message}` 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Upload WebP image
    const { data: webpData, error: webpError } = await supabaseAdmin.storage
      .from('wallpapers')
      .upload(webpFileName, webpBuffer, {
        contentType: 'image/webp',
        cacheControl: '3600',
        upsert: false
      });

    if (webpError) {
      // Clean up original if webp fails
      await supabaseAdmin.storage.from('wallpapers').remove([fileName]);
      console.error('WebP upload error:', webpError);
      return new Response(JSON.stringify({ 
        error: `WebP upload failed: ${webpError.message}` 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get public URLs
    const { data: urlData } = supabaseAdmin.storage.from('wallpapers').getPublicUrl(fileName);
    const { data: webpUrlData } = supabaseAdmin.storage.from('wallpapers').getPublicUrl(webpFileName);

    if (!urlData.publicUrl || !webpUrlData.publicUrl) {
      // Clean up both if any fails
      await supabaseAdmin.storage.from('wallpapers').remove([fileName, webpFileName]);
      return new Response(JSON.stringify({ error: 'Failed to get public URL' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const imageUrl = urlData.publicUrl;
    const webpUrl = webpUrlData.publicUrl;
    const thumbnailUrl = webpUrl; // Puedes usar la webp como thumbnail optimizado

    // Parse tags
    const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

    // Insert wallpaper record
    const { data: wallpaper, error: insertError } = await supabaseAdmin
      .from('wallpapers')
      .insert({
        title: title.trim(),
        description: description?.trim() || '',
        image_url: imageUrl,
        webp_url: webpUrl,
        thumbnail_url: thumbnailUrl,
        category_id: categoryId || null,
        tags,
        width: dimensions.width,
        height: dimensions.height,
        file_size: file.size
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);
      // Clean up uploaded files if database insert fails
      await supabaseAdmin.storage.from('wallpapers').remove([fileName, webpFileName]);
      return new Response(JSON.stringify({ 
        error: `Database error: ${insertError.message}` 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true, wallpaper }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Upload failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

async function getImageDimensions(buffer: ArrayBuffer): Promise<{ width: number; height: number }> {
  try {
    const imageBuffer = Buffer.from(buffer);
    const metadata = await sharp(imageBuffer).metadata();
    
    if (metadata.width && metadata.height) {
      return { width: metadata.width, height: metadata.height };
    }
    
    // Fallback si sharp no puede obtener las dimensiones
    console.warn('Could not get image dimensions with sharp, using fallback');
    return { width: 1920, height: 1080 };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    // Fallback en caso de error
    return { width: 1920, height: 1080 };
  }
}
