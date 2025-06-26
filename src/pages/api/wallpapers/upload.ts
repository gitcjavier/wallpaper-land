import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase';

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
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'File must be an image' }), {
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
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
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

    // Upload original image
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('wallpapers')
      .upload(fileName, buffer, {
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

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from('wallpapers')
      .getPublicUrl(fileName);

    if (!urlData.publicUrl) {
      return new Response(JSON.stringify({ error: 'Failed to get public URL' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const imageUrl = urlData.publicUrl;
    const thumbnailUrl = imageUrl; // In production, create a resized version

    // Parse tags
    const tags = tagsString ? tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];

    // Insert wallpaper record
    const { data: wallpaper, error: insertError } = await supabaseAdmin
      .from('wallpapers')
      .insert({
        title: title.trim(),
        description: description?.trim() || '',
        image_url: imageUrl,
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
      // Clean up uploaded file if database insert fails
      await supabaseAdmin.storage.from('wallpapers').remove([fileName]);
      
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
  // This is a simplified version - in production you'd use a proper image processing library
  // For now, return default dimensions based on common wallpaper sizes
  const uint8Array = new Uint8Array(buffer);
  
  // Try to detect if it's a JPEG and extract dimensions
  if (uint8Array[0] === 0xFF && uint8Array[1] === 0xD8) {
    // JPEG file - try to extract dimensions from EXIF
    // This is a very basic implementation
    for (let i = 2; i < uint8Array.length - 4; i++) {
      if (uint8Array[i] === 0xFF && uint8Array[i + 1] === 0xC0) {
        const height = (uint8Array[i + 5] << 8) | uint8Array[i + 6];
        const width = (uint8Array[i + 7] << 8) | uint8Array[i + 8];
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }
    }
  }
  
  // Default fallback dimensions
  return { width: 1920, height: 1080 };
}