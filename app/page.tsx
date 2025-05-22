'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';

export default function Page() {
  const router = useRouter();
  
  useEffect(() => {
    // 사용자가 로그인 중인지 확인 (URL 해시에 access_token이 있는지 확인)
    const isAuthCallback = window.location.hash.includes('access_token');
    
    console.log("🔍 [메인 페이지] URL 해시 확인:", isAuthCallback ? "인증 콜백 감지됨" : "일반 접근");
    
    if (isAuthCallback) {
      console.log("📦 [Callback] 인증 콜백 URL 감지됨");
      const supabase = createBrowserClient();
      
      // URL 해시에서 수동으로 세션 정보 처리
      // Supabase v2에서는 getSessionFromUrl() 대신 다음 방식 사용
      supabase.auth.onAuthStateChange((event, session) => {
        console.log("📦 [Callback] 인증 상태 변경:", event);
        console.log("🔐 [Callback] 세션 데이터:", session ? "있음" : "없음");
        
        if (event === 'SIGNED_IN' && session) {
          console.log("✅ [Callback] 세션 설정 성공:", {
            userId: session.user.id,
            email: session.user.email,
            expiresAt: new Date(session.expires_at! * 1000).toLocaleString()
          });
          
          // URL의 해시 부분 제거 후 홈페이지로 리다이렉트
          window.history.replaceState(
            {}, 
            document.title, 
            window.location.pathname + window.location.search
          );
          
          // 세션이 복원된 후 메인 페이지로 이동
          router.refresh(); // 먼저 페이지 리프레시 (Next.js 내부 상태 갱신)
          setTimeout(() => {
            router.replace("/");
          }, 500); // 약간의 지연 후 리다이렉트
        } else if (event === 'INITIAL_SESSION') {
          console.log("✅ [Callback] 초기 세션 로드됨");
          if (session) {
            console.log("✅ [Callback] 유효한 세션 있음");
            router.replace("/");
          } else {
            console.warn("⚠️ [Callback] 세션 없음");
          }
        } else {
          console.warn("⚠️ [Callback] 세션 설정 실패 또는 다른 이벤트:", event);
        }
      });
    } else {
      // 인증 콜백이 아닌 경우에만 리디렉션
      router.push('/ticket-cancellation');
    }
  }, [router]);
  
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-4">이지티켓에 오신 것을 환영합니다</h1>
      <p className="mb-4">안전하고 빠른 티켓 거래 서비스를 이용해 보세요.</p>
    </div>
  );
}

