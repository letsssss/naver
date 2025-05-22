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
      
      // 핵심: Supabase v2에서는 URL 해시에서 직접 세션 정보 추출 및 설정
      try {
        console.log("📦 [Callback] 해시 문자열:", window.location.hash);
        
        // 해시에서 Supabase 세션 설정 (이 부분이 getSessionFromUrl()의 역할)
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
          console.log("🔐 [Callback] 현재 세션 확인:", currentSession ? "있음" : "없음");
          
          // URL 해시 파라미터에서 직접 엑세스 토큰 추출
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const expiresIn = hashParams.get('expires_in');
          const tokenType = hashParams.get('token_type');
          
          console.log("🔑 [Callback] 토큰 존재:", 
            accessToken ? "✅ 액세스 토큰 있음" : "❌ 액세스 토큰 없음",
            refreshToken ? "✅ 리프레시 토큰 있음" : "❌ 리프레시 토큰 없음"
          );
          
          if (accessToken && refreshToken) {
            // 수동으로 세션 설정 (getSessionFromUrl 대체)
            supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            }).then(({ data, error }) => {
              console.log("📦 [Callback] 세션 수동 설정 결과:", data.session ? "성공" : "실패", error || "");
              
              if (data.session) {
                console.log("✅ [Callback] 세션 설정 성공:", {
                  userId: data.session.user.id,
                  email: data.session.user.email,
                  expiresAt: new Date(data.session.expires_at! * 1000).toLocaleString()
                });
                
                // 세션이 복원된 후 메인 페이지로 이동 전에 상태 업데이트
                // Supabase가 쿠키와 localStorage를 설정할 시간을 주기 위한 지연
                setTimeout(() => {
                  // URL의 해시 부분 제거
                  window.history.replaceState(
                    {}, 
                    document.title, 
                    window.location.pathname + window.location.search
                  );
                  
                  router.refresh(); // 먼저 페이지 리프레시 (Next.js 내부 상태 갱신)
                  router.replace("/");
                }, 500);
              } else {
                console.warn("⚠️ [Callback] 세션 설정 실패:", error);
              }
            });
          } else {
            console.warn("⚠️ [Callback] 해시에서 토큰을 찾을 수 없음");
          }
        });
        
        // 인증 상태 변화 리스너 등록 (위에서 설정한 세션 반영 감지)
        const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
          console.log("🔄 [Callback] 인증 상태 변경:", event, session ? "세션 있음" : "세션 없음");
        });
        
        // 컴포넌트가 언마운트되면 리스너 해제
        return () => {
          listener.subscription.unsubscribe();
        };
      } catch (error) {
        console.error("❌ [Callback] 오류 발생:", error);
      }
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

