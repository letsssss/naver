import { supabaseServer } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  console.log('🔄 [CALLBACK] OAuth 콜백 처리 시작');
  console.log('📝 [CALLBACK] Code:', code ? '존재함' : '없음');
  console.log('📍 [CALLBACK] Next:', next);

  const supabase = supabaseServer();

  if (code) {
    console.log('🔑 [CALLBACK] 코드를 세션으로 교환 중...');
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      console.log('✅ [CALLBACK] 세션 교환 성공');
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}${next}`);
    } else {
      console.error('❌ [CALLBACK] 세션 교환 실패:', error.message);
    }
  } else {
    console.error('❌ [CALLBACK] 인증 코드가 없음');
  }

  console.log('🚨 [CALLBACK] 인증 오류 페이지로 리디렉션');
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/auth/auth-code-error`);
} 