import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Forces this route to always render dynamically instead of Next attempting
// to statically optimize it at build time. Without this, `next build` tries
// to prerender the route once, hits createClient()'s cookies() call, and
// Next throws its internal DynamicServerError to signal "bail out to
// dynamic rendering" - but this route's own try/catch below was catching
// that internal signal like any other error and logging/returning it as a
// fake 500 ("❌ Supabase test error: Dynamic server usage..."), even
// though nothing was actually broken. Declaring this up front means Next
// never attempts static rendering here in the first place, so that signal
// never fires.
export const dynamic = 'force-dynamic';

export async function GET() {
  
  try {
    const supabase = createClient();
    
    // Try to query categories
    const { data, error } = await supabase
      .from('categories')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase query error:', error.message);
      return NextResponse.json({
        status: 'error',
        message: 'Supabase query failed',
        error: error.message
      }, { status: 500 });
    }
    
    return NextResponse.json({
      status: 'success',
      message: 'Supabase connection working!',
      data: data
    });
  } catch (error: any) {
    console.error('❌ Supabase test error:', error.message);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to Supabase',
      error: error.message
    }, { status: 500 });
  }
}
