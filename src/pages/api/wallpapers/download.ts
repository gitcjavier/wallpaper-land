import type { APIRoute } from 'astro';
import { supabaseAdmin, sql } from '../../../lib/supabase';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { id } = await request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: 'Wallpaper ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Atomically increment download count using raw SQL
    const { error } = await supabaseAdmin
      .from('wallpapers')
      .update({ 
        download_count: sql`download_count + 1`
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating download count:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to update download count' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

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