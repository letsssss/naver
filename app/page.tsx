'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';

export default function Page() {
  const router = useRouter();
  
  useEffect(() => {
    // 더 명확한 PKCE와 Implicit 플로우 감지
    const currentUrl = window.location.href;
    const hasCodeParam = window.location.search.includes('code=');
    const hasAccessToken = window.location.hash.includes('access_token');
    const isOAuthCallback = hasCodeParam || hasAccessToken;
    
    console.log("🔍 [메인 페이지] 현재 URL:", currentUrl);
    console.log("🔍 [메인 페이지] PKCE 코드 파라미터 존재:", hasCodeParam);
    console.log("🔍 [메인 페이지] Implicit 액세스 토큰 존재:", hasAccessToken);
    console.log("🔍 [메인 페이지] OAuth 콜백 여부:", isOAuthCallback ? "예" : "아님");
    
    if (isOAuthCallback) {
      console.log("✅ [메인 페이지] 인증 콜백 감지됨 → 리디렉션 하지 않음");
      console.log("✅ [메인 페이지] 홈페이지에 머물러서 인증 처리 대기");
      return; // 인증 콜백이면 아무 것도 안 함 (리디렉션 금지)
    }
    
    // 일반 진입 시 → 티켓취소 안내 페이지로 이동
    console.log("🏠 [메인 페이지] 일반 접근 감지 → 티켓취소 페이지로 리디렉션 시작");
    router.push('/ticket-cancellation');
  }, [router]);
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">이지티켓에 오신 것을 환영합니다</h1>
      <p className="mb-4">안전하고 빠른 티켓 거래 서비스를 이용해 보세요.</p>
    </div>
  );
}

