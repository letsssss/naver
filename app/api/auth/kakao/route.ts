import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { mode } = await request.json();
    
    console.log('🚀 [SERVER] 카카오 인증 요청 받음:', mode);
    
    // 서버 사이드 Supabase 클라이언트 생성
    const supabase = createServerSupabaseClient();
    
    // 리디렉션 URL 설정
    const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.easyticket82.com'}/auth/callback`;
    
    console.log('🔗 [SERVER] 리디렉션 URL:', redirectTo);
    
    // 서버에서 OAuth URL 생성
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo,
        scopes: 'profile_nickname profile_image account_email',
        queryParams: {
          'single_account': 'true'
        }
      }
    });
    
    if (error) {
      console.error('❌ [SERVER] OAuth URL 생성 실패:', error.message);
      return NextResponse.json(
        { error: '카카오 인증 URL 생성에 실패했습니다.' },
        { status: 500 }
      );
    }
    
    if (!data.url) {
      console.error('❌ [SERVER] OAuth URL이 생성되지 않음');
      return NextResponse.json(
        { error: '인증 URL을 생성할 수 없습니다.' },
        { status: 500 }
      );
    }
    
    console.log('✅ [SERVER] OAuth URL 생성 성공');
    
    return NextResponse.json({
      success: true,
      authUrl: data.url,
      mode
    });
    
  } catch (error) {
    console.error('❌ [SERVER] 카카오 인증 처리 중 오류:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 