import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth token
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const testType = formData.get('test_type') as string;
    const track = formData.get('track') as string;

    if (!file) {
      throw new Error('No file provided');
    }

    console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);

    // Read file content
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Convert to text - simplified version
    // In production, use proper PDF/Word/Excel parsing libraries
    const textDecoder = new TextDecoder('utf-8');
    let extractedText = '';
    
    try {
      extractedText = textDecoder.decode(uint8Array);
    } catch (e) {
      // If UTF-8 decoding fails, try to extract basic text
      extractedText = String.fromCharCode.apply(null, Array.from(uint8Array));
    }

    // Clean and process text
    const cleanedText = extractedText
      .replace(/[^\u0600-\u06FF\u0020-\u007E\n]/g, ' ') // Keep Arabic and English
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 10000); // Limit to 10k chars

    if (!cleanedText || cleanedText.length < 50) {
      throw new Error('Could not extract meaningful text from file. Please ensure the file contains readable text.');
    }

    console.log('Extracted text length:', cleanedText.length);

    // Extract topics from content
    const lines = cleanedText.split('\n').filter(l => l.trim()).slice(0, 10);
    const relatedTopics = [testType, track];
    
    // Extract keywords
    const keywords = ['الجبر', 'الهندسة', 'الإحصاء', 'كمي', 'لفظي', 'استيعاب', 'تناظر'];
    keywords.forEach(keyword => {
      if (cleanedText.includes(keyword)) {
        relatedTopics.push(keyword);
      }
    });

    // Split into chunks if content is large
    const chunkSize = 3000;
    const chunks = [];
    for (let i = 0; i < cleanedText.length; i += chunkSize) {
      chunks.push(cleanedText.substring(i, i + chunkSize));
    }

    console.log('Creating', chunks.length, 'knowledge base entries');

    // Insert into knowledge base
    const insertPromises = chunks.map((chunk, index) => {
      return supabase.from('knowledge_base').insert({
        title: `${file.name} - جزء ${index + 1}`,
        content: chunk,
        content_type: 'document',
        test_type: testType,
        track: track,
        related_topics: [...new Set(relatedTopics)],
        is_active: true,
        metadata: {
          source: 'file_upload',
          original_filename: file.name,
          file_type: file.type,
          chunk_index: index,
          total_chunks: chunks.length,
          uploaded_by: user.id,
          uploaded_at: new Date().toISOString()
        }
      });
    });

    const results = await Promise.all(insertPromises);
    
    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Insert errors:', errors);
      throw new Error('Failed to insert some content');
    }

    console.log('Successfully inserted', chunks.length, 'entries');

    return new Response(
      JSON.stringify({ 
        success: true, 
        chunks: chunks.length,
        message: `تم معالجة الملف وإضافة ${chunks.length} مقطع لقاعدة المعرفة`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in upload-knowledge-content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
