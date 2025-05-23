import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  console.log('🔄 [SERVER CALLBACK] OAuth 콜백 처리 시작');
  console.log('📝 [SERVER CALLBACK] Code:', code ? '존재함' : '없음');
  console.log('📍 [SERVER CALLBACK] Next:', next);
  console.log('🌐 [SERVER CALLBACK] Origin:', origin);

  if (code) {
    console.log('🔑 [SERVER CALLBACK] 코드를 세션으로 교환 중...');
    
    const supabase = supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      console.log('✅ [SERVER CALLBACK] 세션 교환 성공');
      return NextResponse.redirect(`${origin}${next}`);
    } else {
      console.error('❌ [SERVER CALLBACK] 세션 교환 실패:', error.message);
    }
  } else {
    console.error('❌ [SERVER CALLBACK] 인증 코드가 없음');
  }

  console.log('🚨 [SERVER CALLBACK] 인증 오류 페이지로 리디렉션');
  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
} 