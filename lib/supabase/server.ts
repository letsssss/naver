import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase.types';
import { createClient } from '@supabase/supabase-js';

// Supabase 정보 (환경변수 우선, 폴백으로 하드코딩 값 사용)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jdubrjczdyqqtsppojgu.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdWJyamN6ZHlxcXRzcHBvamd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMwNTE5NzcsImV4cCI6MjA1ODYyNzk3N30.rnmejhT40bzQ2sFl-XbBrme_eSLnxNBGe2SSt-R_3Ww';

// App Router용 Supabase 클라이언트 생성 (cookies만 사용)
export const supabaseServer = () => {
  // 어떤 값이 사용되는지 로깅 (디버깅용)
  console.log(`[Supabase 서버] 환경변수 상태: NEXT_PUBLIC_SUPABASE_URL=${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅' : '❌'}, NEXT_PUBLIC_SUPABASE_ANON_KEY=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅' : '❌'}`);
  
  try {
    // App Router에서는 cookies()만 전달
    return createServerComponentClient<Database>({ cookies });
  } catch (error) {
    console.error('[Supabase 서버] createServerComponentClient 오류:', error);
    
    // 대체 방법: 직접 클라이언트 생성
    console.log(`[Supabase 서버] 대체 클라이언트 생성 URL: ${SUPABASE_URL.substring(0, 15)}...`);
    return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
      }
    });
  }
}; 