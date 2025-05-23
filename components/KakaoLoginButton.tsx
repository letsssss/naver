import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient, createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase.types';
import { toast } from 'sonner';
import { logDomainInfo, logDomainComparison, getRedirectUrl } from '../utils/domain-debug';

type KakaoLoginButtonProps = {
  mode?: 'login' | 'signup'; // 'login' 또는 'signup' 모드 선택
  text?: string; // 버튼에 표시될 텍스트 (옵션)
  onSuccess?: () => void; // 성공 시 호출될 콜백 (옵션)
};

export default function KakaoLoginButton({ 
  mode = 'login', 
  text,
  onSuccess 
}: KakaoLoginButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  // 버튼 텍스트 결정
  const buttonText = text || (mode === 'login' ? '카카오로 로그인' : '카카오로 회원가입');

  const handleKakaoAuth = async () => {
    try {
      setIsLoading(true);
      
      // 환경에 맞는 redirectTo URL 생성 (엣지 브라우저 대응)
      const redirectTo = window.location.origin + '/auth/callback'; // 정확히 현재 도메인과 동일
      
      // 로그인 시작 시점의 전체 localStorage 상태 확인
      if (typeof window !== 'undefined') {
        // 🔍 도메인 정보 확인 (PKCE 플로우 디버깅용)
        logDomainInfo('[KAKAO AUTH]');
        
        // redirectTo URL과 현재 도메인 비교
        logDomainComparison(redirectTo, '[KAKAO AUTH]');
        
        // 🧪 엣지 브라우저 localStorage 테스트
        console.log("🧪 [EDGE DEBUG] 브라우저 정보:", navigator.userAgent);
        console.log("🧪 [EDGE DEBUG] 현재 Origin:", window.location.origin);
        console.log("🧪 [EDGE DEBUG] redirectTo:", redirectTo);
        console.log("🧪 [EDGE DEBUG] Origin 일치:", window.location.origin === redirectTo.replace('/auth/callback', ''));
        
        // localStorage 크로스탭 공유 테스트
        const testKey = 'pkce_test_' + Date.now();
        localStorage.setItem(testKey, 'edge_test_value');
        console.log("🧪 [EDGE DEBUG] localStorage 테스트 키 설정:", testKey);
        console.log("🧪 [EDGE DEBUG] localStorage 테스트 값:", localStorage.getItem(testKey));
        
        console.log("🧪 [DEBUG] 인증 시작 전 localStorage 전체 키:", Object.keys(localStorage));
        console.log("🗂️ [DEBUG] localStorage 전체 값들:");
        Object.entries(localStorage).forEach(([key, val]) => {
          console.log(`  🔑 ${key}:`, val);
        });
      }
      
      // 기존 PKCE 인증 정보 정리 (code_verifier는 반드시 유지)
      if (typeof window !== 'undefined') {
        console.log("🧹 [OAuth 시작] 불필요한 로컬 스토리지 정리");
        
        // 🔒 PKCE 인증에 필요한 code_verifier는 절대 삭제하지 않음
        // URL만 안전하게 정리
        localStorage.removeItem('supabase.auth.url');
        
        // 디버깅용 로그
        console.log("✅ [OAuth 시작] code_verifier 보존됨");
      }
      
      // 회원가입 모드이고 단순 리디렉션을 원하는 경우
      if (mode === 'signup' && !text) {
        router.push('/signup');
        return;
      }
      
      // 실제 카카오 로그인 처리
      console.log(`카카오 ${mode === 'login' ? '로그인' : '회원가입'} 시작...`);
      
      // PKCE 지원을 위해 createPagesBrowserClient를 직접 생성하여 사용
      const supabase = createPagesBrowserClient<Database>();
      
      // signInWithOAuth 직전 Supabase 관련 키 상태 확인
      if (typeof window !== 'undefined') {
        const supabaseKeys = Object.keys(localStorage).filter(k => k.includes('supabase'));
        console.log("🕵️‍♂️ [DEBUG] OAuth 요청 전 supabase.* 관련 localStorage:", supabaseKeys);
        supabaseKeys.forEach(k => console.log(`  🔑 ${k}:`, localStorage.getItem(k)));
        
        // PKCE 관련 키의 정확한 값 출력
        const codeVerifier = localStorage.getItem('supabase.auth.code_verifier');
        console.log("🔍 [PKCE DEBUG] code_verifier:", codeVerifier);
      }
      
      // ✅ ① signInWithOAuth() 호출 직전 - 정밀 디버깅
      console.log("🚀 [OAuth 시작] signInWithOAuth 호출 직전");
      console.log("📦 [OAuth 시작 직전] localStorage 상태:", JSON.stringify(localStorage));
      console.log("🧪 [OAuth 직전] localStorage 키 목록:", Object.keys(localStorage));
      console.log("🧪 [OAuth 직전] code_verifier:", localStorage.getItem('supabase.auth.code_verifier'));
      
      // 모든 supabase 관련 키 상세 확인
      const allSupabaseKeys = Object.keys(localStorage).filter(k => k.includes('supabase'));
      console.log("🔍 [OAuth 직전] supabase 관련 키들:", allSupabaseKeys);
      allSupabaseKeys.forEach(k => {
        console.log(`  🔑 [OAuth 직전] ${k}:`, localStorage.getItem(k));
      });
      
      // 카카오 인증 모드 저장 (리디렉션 전에)
      if (typeof window !== 'undefined') {
        localStorage.setItem('kakao_auth_mode', mode);
        console.log("💾 [OAuth] 인증 모드 저장:", mode);
      }
      
      // ✅ 카카오 OAuth 요청 - Supabase가 자동으로 리디렉션 처리 (엣지 브라우저 대응)
      console.log("🚀 [CRITICAL] Supabase 자동 리디렉션 시작 (엣지 브라우저 대응)");
      console.log("🔗 [EDGE] 정확한 redirectTo URL:", redirectTo);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: redirectTo, // 정확히 현재 도메인과 동일
          scopes: 'profile_nickname profile_image account_email',
          queryParams: {
            'single_account': 'true'
          }
        }
      });

      // ✅ ② signInWithOAuth() 호출 직후 - 정밀 디버깅
      console.log("✅ [OAuth 결과] data:", data);
      console.log("❗ [OAuth 결과] error:", error);
      console.log("📦 [OAuth 직후] localStorage 상태:", JSON.stringify(localStorage));
      console.log("🧪 [OAuth 이후] code_verifier 상태:", localStorage.getItem('supabase.auth.code_verifier'));
      
      // OAuth 직후 모든 supabase 키 재확인
      const postOAuthSupabaseKeys = Object.keys(localStorage).filter(k => k.includes('supabase'));
      console.log("🔍 [OAuth 직후] supabase 관련 키들:", postOAuthSupabaseKeys);
      postOAuthSupabaseKeys.forEach(k => {
        console.log(`  🔑 [OAuth 직후] ${k}:`, localStorage.getItem(k));
      });

      if (error) {
        console.error('❌ [OAuth 오류]:', error.message);
        toast.error('카카오 인증 중 오류가 발생했습니다.');
        return;
      }

      // ✅ 중요: data.url을 수동으로 사용하지 않음! (엣지 브라우저 대응)
      // Supabase가 같은 탭에서 자동으로 리디렉션을 처리합니다.
      if (data?.url) {
        console.log("🌐 [INFO] Supabase가 생성한 OAuth URL:", data.url);
        console.log("✅ [INFO] Supabase가 같은 탭에서 자동으로 리디렉션을 처리합니다.");
        console.log("🚫 [EDGE] window.location.href 사용 안함 (localStorage 격리 방지)");
        console.log("🚫 [EDGE] window.open 사용 안함 (팝업 차단 방지)");
        // ❌ window.location.href = data.url; // 이렇게 하면 안됨!
        // ❌ window.open(data.url); // 이것도 안됨!
      } else {
        console.warn("⚠️ [OAuth] URL이 생성되지 않았습니다.");
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('❌ [OAuth 예외]:', err);
      toast.error('카카오 인증 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    try {
      // Step 0: 도메인 정보 확인 및 로깅
      console.log('🔍 [STEP 0] 카카오 로그인 시작 - 도메인 정보 확인');
      logDomainInfo('[KAKAO LOGIN]');
      
      // 환경에 맞는 redirectTo URL 생성
      const redirectTo = getRedirectUrl('https://www.easyticket82.com/auth/callback');
      console.log('🔗 [STEP 0] 생성된 redirectTo URL:', redirectTo);
      
      // 도메인 비교 및 잠재적 문제 확인
      logDomainComparison(redirectTo, '[KAKAO LOGIN]');

      await handleKakaoAuth();
    } catch (err) {
      console.error('인증 처리 중 오류 발생:', err);
      toast.error('카카오 인증 처리 중 오류가 발생했습니다.');
    }
  };

  return (
    <button 
      onClick={handleKakaoLogin}
      className="w-full flex items-center justify-center bg-yellow-400 text-black py-3 px-4 rounded-md font-medium shadow-sm"
      style={{ backgroundColor: '#FEE500' }}
      disabled={isLoading}
    >
      {isLoading ? (
        <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></span>
      ) : (
        <svg width="22" height="22" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-3">
          <path d="M9 0.5625C4.03125 0.5625 0 3.71875 0 7.59375C0 10.1562 1.67188 12.3906 4.21875 13.6094L3.15625 17.0156C3.09375 17.2344 3.375 17.4062 3.5625 17.2812L7.6875 14.5312C8.125 14.5938 8.5625 14.625 9 14.625C13.9688 14.625 18 11.4688 18 7.59375C18 3.71875 13.9688 0.5625 9 0.5625Z" fill="black"/>
        </svg>
      )}
      <span className="text-base">{buttonText}</span>
    </button>
  );
} 