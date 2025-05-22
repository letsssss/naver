import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/types/supabase.types';

export async function POST(req: Request) {
  const requestUrl = new URL(req.url);
  console.log("📦 [Callback] POST 요청 수신됨, URL:", requestUrl.toString());
  
  const supabase = createRouteHandlerClient<Database>({ cookies });

  try {
    const { event, session } = await req.json();
    
    console.log("📦 [Callback] 이벤트:", event);
    console.log("🔐 [Callback] 세션 존재 여부:", !!session);
    
    if (session) {
      console.log("🔐 [Callback] access_token 존재 여부:", !!session.access_token);
      console.log("🔐 [Callback] refresh_token 존재 여부:", !!session.refresh_token);
      console.log("🔐 [Callback] 사용자 ID:", session.user?.id);
    }

    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      console.log("✅ [Callback] 세션 설정 시도:", event);
      
      // Supabase auth-helpers가 자동으로 쿠키 설정해줌
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      
      console.log("✅ [Callback] 세션 설정 완료");
    }

    // 리다이렉트 대신 JSON 응답 반환
    return NextResponse.json({ 
      success: true, 
      message: "Session cookies updated" 
    });
  } catch (error) {
    console.error("❌ [Callback] 오류 발생:", error);
    return NextResponse.json({
      success: false,
      message: "Session update failed"
    }, { status: 500 });
  }
} 