import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';

type KakaoLoginButtonProps = {
  mode?: 'login' | 'signup';
  text?: string;
  onSuccess?: () => void;
};

export default function KakaoLoginButton({ 
  mode = 'login', 
  text,
  onSuccess 
}: KakaoLoginButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  
  const buttonText = text || (mode === 'login' ? '카카오로 로그인' : '카카오로 회원가입');

  const signInWithKakao = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    console.log('🔥 [TEST] 카카오 버튼 클릭됨!');
    
    try {
      console.log('🚀 [KAKAO] 표준 OAuth 시작');
      console.log('🌐 [KAKAO] 현재 URL:', window.location.href);
      
      // 🔧 localStorage 상태 확인 (OAuth 시작 전)
      console.log('📦 [KAKAO] OAuth 시작 전 localStorage 상태:');
      const allKeys = Object.keys(localStorage);
      const supabaseKeys = allKeys.filter(key => key.includes('supabase') || key.includes('sb-') || key.includes('code_verifier'));
      console.log('  - Supabase 관련 키들:', supabaseKeys);
      supabaseKeys.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`  - ${key}:`, value ? `${value.substring(0, 50)}...` : 'null');
      });
      
      // 🔧 동적 redirectTo URL 생성
      const getRedirectUrl = () => {
        const currentOrigin = window.location.origin;
        const isProduction = currentOrigin.includes('easyticket82.com');
        
        if (isProduction) {
          return 'https://www.easyticket82.com/auth/callback';
        } else {
          // 개발 환경에서는 현재 도메인 사용
          return `${currentOrigin}/auth/callback`;
        }
      };
      
      const redirectUrl = getRedirectUrl();
      console.log('🔗 [KAKAO] Redirect URL:', redirectUrl);
      
      const supabase = createBrowserClient();
      console.log('✅ [KAKAO] Supabase 클라이언트 생성 완료');
      
      console.log('🔄 [KAKAO] signInWithOAuth 호출 중...');
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: redirectUrl,
        },
      });

      console.log('📊 [KAKAO] OAuth 응답 데이터:', data);
      console.log('📊 [KAKAO] OAuth 응답 오류:', error);
      
      // 🔧 localStorage 상태 확인 (OAuth 호출 후)
      console.log('📦 [KAKAO] OAuth 호출 후 localStorage 상태:');
      const allKeysAfter = Object.keys(localStorage);
      const supabaseKeysAfter = allKeysAfter.filter(key => key.includes('supabase') || key.includes('sb-') || key.includes('code_verifier'));
      console.log('  - Supabase 관련 키들:', supabaseKeysAfter);
      supabaseKeysAfter.forEach(key => {
        const value = localStorage.getItem(key);
        console.log(`  - ${key}:`, value ? `${value.substring(0, 50)}...` : 'null');
      });
      
      if (data?.url) {
        console.log('🔗 [KAKAO] 실제 리디렉션 URL:', data.url);
        console.log('🔗 [KAKAO] URL 파싱:', new URL(data.url));
      }

      if (error) {
        console.error('❌ [KAKAO] OAuth 오류:', error.message);
        console.error('❌ [KAKAO] OAuth 오류 상세:', error);
        throw error;
      }

      console.log('✅ [KAKAO] OAuth 요청 성공');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('❌ [KAKAO] 인증 오류:', err);
      console.error('❌ [KAKAO] 인증 오류 상세:', JSON.stringify(err, null, 2));
      alert('카카오 인증 중 오류가 발생했습니다: ' + (err as Error).message);
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={signInWithKakao}
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