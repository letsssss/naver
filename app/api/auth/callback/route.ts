import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { supabaseServer } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const next = searchParams.get("next") ?? "/";

  console.log('🔄 [SERVER CALLBACK] OAuth 콜백 처리 시작');
  console.log('📝 [SERVER CALLBACK] Code:', code ? '존재함' : '없음');
  console.log('📍 [SERVER CALLBACK] Next:', next);
  console.log('🌐 [SERVER CALLBACK] Origin:', origin);
  console.log('🔍 [SERVER CALLBACK] 전체 URL:', request.url);

  // URL 오류 체크
  if (error) {
    console.error('❌ [SERVER CALLBACK] URL 오류:', error);
    console.error('❌ [SERVER CALLBACK] 오류 설명:', errorDescription);
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  if (code) {
    console.log('🔑 [SERVER CALLBACK] 코드를 세션으로 교환 중...');
    
    try {
      const supabase = supabaseServer();
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error('❌ [SERVER CALLBACK] 세션 교환 실패:', exchangeError.message);
        console.error('❌ [SERVER CALLBACK] 오류 상세:', exchangeError);
        return NextResponse.redirect(`${origin}/auth/auth-code-error`);
      }

      if (data?.session) {
        console.log('✅ [SERVER CALLBACK] 세션 교환 성공');
        console.log('👤 [SERVER CALLBACK] 사용자 ID:', data.session.user.id);
        console.log('📧 [SERVER CALLBACK] 이메일:', data.session.user.email);
        
        // 성공적인 리디렉션
        const redirectUrl = `${origin}${next}`;
        console.log('🔄 [SERVER CALLBACK] 리디렉션 URL:', redirectUrl);
        return NextResponse.redirect(redirectUrl);
      } else {
        console.error('❌ [SERVER CALLBACK] 세션이 생성되지 않음');
        return NextResponse.redirect(`${origin}/auth/auth-code-error`);
      }
    } catch (err) {
      console.error('❌ [SERVER CALLBACK] 예외 발생:', err);
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }
  } else {
    console.error('❌ [SERVER CALLBACK] 인증 코드가 없음');
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }
} 