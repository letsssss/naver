'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  
  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log("🔍 [Callback 페이지] 실행됨");
        const supabase = createBrowserClient();
        
        // 현재 URL 상태 확인
        const hasHashParams = window.location.hash && window.location.hash.length > 1;
        console.log("🔍 [Callback 페이지] URL 해시 존재:", hasHashParams);
        
        if (hasHashParams) {
          console.log("📦 [Callback 페이지] 해시 문자열:", window.location.hash);
          
          // 해시에서 토큰 파라미터 추출
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          
          console.log("🔑 [Callback 페이지] 토큰 존재:", 
            accessToken ? "✅ 액세스 토큰 있음" : "❌ 액세스 토큰 없음",
            refreshToken ? "✅ 리프레시 토큰 있음" : "❌ 리프레시 토큰 없음"
          );
          
          if (accessToken && refreshToken) {
            // 토큰으로 세션 설정
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            console.log("📦 [Callback 페이지] 세션 설정 결과:", data?.session ? "성공" : "실패", error || "");
            
            if (data?.session) {
              console.log("✅ [Callback 페이지] 세션 설정 성공:", {
                userId: data.session.user.id,
                email: data.session.user.email,
                expiresAt: new Date(data.session.expires_at! * 1000).toLocaleString()
              });
              
              // Supabase가 쿠키와 localStorage를 설정할 시간을 주기 위한 지연
              setTimeout(() => {
                // URL의 해시 부분 제거
                window.history.replaceState(
                  {}, 
                  document.title, 
                  window.location.pathname
                );
                
                // 홈으로 리디렉션
                router.push('/');
              }, 500);
              
              return;
            } else {
              console.warn("⚠️ [Callback 페이지] 세션 설정 실패:", error);
            }
          } else {
            console.warn("⚠️ [Callback 페이지] 토큰을 찾을 수 없음");
          }
        }
        
        // 해시 파라미터가 없거나 세션 설정에 실패한 경우 API 경로 활용
        console.log("🔍 [Callback 페이지] 세션 확인 중...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log("✅ [Callback 페이지] 기존 세션 발견");
          router.push('/');
        } else {
          console.warn("⚠️ [Callback 페이지] 세션 없음, 로그인 페이지로 이동");
          router.push('/login');
        }
      } catch (error) {
        console.error("❌ [Callback 페이지] 오류 발생:", error);
        router.push('/login');
      }
    };
    
    handleCallback();
  }, [router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center p-8 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">로그인 처리 중...</h1>
        <p className="mb-8 text-gray-600">잠시만 기다려 주세요.</p>
        <div className="w-12 h-12 border-4 border-t-blue-500 border-gray-200 rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );
} 