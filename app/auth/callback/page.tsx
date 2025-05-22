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
        console.log("🔍 [Callback 페이지] 전체 URL:", window.location.href);
        const supabase = createBrowserClient();
        
        // 현재 URL 상태 확인 (해시와 쿼리 파라미터 모두 확인)
        const hasHashParams = window.location.hash && window.location.hash.length > 1;
        const hasQueryParams = window.location.search && window.location.search.length > 1;
        
        console.log("🔍 [Callback 페이지] URL 해시 존재:", hasHashParams);
        console.log("🔍 [Callback 페이지] URL 쿼리파라미터 존재:", hasQueryParams);
        
        // 1. 해시 파라미터 처리 (implicit flow)
        if (hasHashParams) {
          console.log("📦 [Callback 페이지] 해시 문자열:", window.location.hash);
          
          // 해시에서 토큰 파라미터 추출
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');
          
          console.log("🔑 [Callback 페이지] 토큰 존재:", 
            accessToken ? "✅ 액세스 토큰 있음" : "❌ 액세스 토큰 없음",
            refreshToken ? "✅ 리프레시 토큰 있음" : "❌ 리프레시 토큰 없음",
            "타입:", type || "없음"
          );
          
          if (accessToken && refreshToken) {
            // 토큰으로 세션 설정
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            console.log("📦 [Callback 페이지] 세션 수동 설정 결과:", data?.session ? "성공" : "실패", error || "");
            
            if (data?.session) {
              console.log("✅ [Callback 페이지] 세션 설정 성공:", {
                userId: data.session.user.id,
                email: data.session.user.email,
                expiresAt: new Date(data.session.expires_at! * 1000).toLocaleString()
              });
              
              handleSuccessfulAuth();
              return;
            } else {
              console.warn("⚠️ [Callback 페이지] 세션 설정 실패:", error);
            }
          } else {
            console.warn("⚠️ [Callback 페이지] 해시에서 토큰을 찾을 수 없음");
          }
        } 
        // 2. 쿼리 파라미터 처리 (authorization code flow with PKCE)
        else if (hasQueryParams) {
          console.log("📦 [Callback 페이지] 쿼리 파라미터:", window.location.search);
          
          // 쿼리 파라미터에서 인증 코드 추출
          const queryParams = new URLSearchParams(window.location.search);
          const code = queryParams.get('code');
          const error = queryParams.get('error');
          const errorDescription = queryParams.get('error_description');
          
          if (error) {
            console.error("❌ [Callback 페이지] 인증 오류:", error, errorDescription);
            router.push('/login');
            return;
          }
          
          if (code) {
            console.log("✅ [Callback 페이지] 인증 코드 발견:", code);
            
            try {
              // Supabase가 쿼리 파라미터에서 자동으로 인증 코드 처리
              // getSession()을 호출해 현재 세션 상태 확인
              const { data, error } = await supabase.auth.getSession();
              
              console.log("📦 [Callback 페이지] 세션 확인 결과:", 
                data?.session ? "세션 있음" : "세션 없음", 
                error ? `오류: ${error.message}` : "오류 없음"
              );
              
              if (data?.session) {
                console.log("✅ [Callback 페이지] 세션 확인 성공:", {
                  userId: data.session.user.id,
                  email: data.session.user.email,
                  expiresAt: new Date(data.session.expires_at! * 1000).toLocaleString()
                });
                
                handleSuccessfulAuth();
                return;
              } else {
                // getSession() 후에도 세션이 없으면 exchangeCodeForSession 시도
                console.log("🔄 [Callback 페이지] 코드를 세션으로 교환 시도...");
                
                // 이 단계는 Supabase v2에서 내부적으로 처리되므로 필요 없을 수 있음
                // 그러나 문제 해결을 위해 포함
                
                // window.location.href를 새로고침하여 Supabase가 다시 처리하도록 함
                window.location.href = window.location.href;
                return;
              }
            } catch (codeError) {
              console.error("❌ [Callback 페이지] 인증 코드 처리 오류:", codeError);
            }
          } else {
            console.warn("⚠️ [Callback 페이지] 쿼리 파라미터에서 인증 코드를 찾을 수 없음");
          }
        }
        
        // 3. 다른 모든 방법 실패 시 세션 확인
        console.log("🔍 [Callback 페이지] 세션 확인 중...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log("✅ [Callback 페이지] 기존 세션 발견");
          handleSuccessfulAuth();
        } else {
          console.warn("⚠️ [Callback 페이지] 세션 없음, 로그인 페이지로 이동");
          router.push('/login');
        }
      } catch (error) {
        console.error("❌ [Callback 페이지] 오류 발생:", error);
        router.push('/login');
      }
    };
    
    // 인증 성공 처리 함수
    const handleSuccessfulAuth = () => {
      // Supabase가 쿠키와 localStorage를 설정할 시간을 주기 위한 지연
      setTimeout(() => {
        // URL의 해시와 쿼리 파라미터 제거
        window.history.replaceState(
          {}, 
          document.title, 
          window.location.pathname
        );
        
        // 홈으로 리디렉션
        router.push('/');
      }, 500);
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