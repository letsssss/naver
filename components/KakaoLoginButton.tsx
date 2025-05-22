import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/supabase.types';
import { toast } from 'sonner';

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
      
      // 기존 PKCE 인증 정보 정리 (이전 인증 시도에서 남아있는 데이터 제거)
      if (typeof window !== 'undefined') {
        console.log("🧹 [OAuth 시작] 기존 PKCE 데이터 정리");
        localStorage.removeItem('supabase.auth.code_verifier');
        localStorage.removeItem('supabase.auth.url');
        
        // Supabase 관련 키를 좀 더 폭넓게 찾아서 정리
        const keysToRemove = Object.keys(localStorage).filter(key => 
          key.includes('supabase') && (key.includes('code_verifier') || key.includes('url'))
        );
        
        keysToRemove.forEach(key => {
          console.log(`  🗑️ 삭제: ${key}`);
          localStorage.removeItem(key);
        });
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
      
      // 카카오 OAuth 요청 - redirectTo 추가
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: 'https://www.easyticket82.com/auth/callback',
          scopes: 'profile_nickname profile_image account_email', // email 스코프 추가
          queryParams: {
            'single_account': 'true' // 하나의 계정만 허용하도록 플래그 추가
          }
        }
      });

      console.log("🔑 [OAuth 시작] data:", data)
      console.log("❗ [OAuth 시작] error:", error)

      if (error) {
        console.error('카카오 인증 에러:', error.message);
        toast.error('카카오 인증 중 오류가 발생했습니다.');
        return;
      }

      if (data?.url) {
        console.log('카카오 인증 페이지로 리디렉션:', data.url);
        
        // 카카오 인증 페이지로 리디렉션하기 전에 로컬 스토리지에 모드 저장
        if (typeof window !== 'undefined') {
          localStorage.setItem('kakao_auth_mode', mode);
          
          // PKCE 디버깅을 위한 확인 로그
          const allKeys = Object.keys(localStorage);
          const pkceKeys = allKeys.filter(key => key.includes('code_verifier'));
          console.log("✅ [PKCE 디버깅] localStorage 키:", allKeys);
          console.log("✅ [PKCE 디버깅] code_verifier 키:", pkceKeys);
        }
        
        window.location.href = data.url;
      } else {
        console.error('카카오 인증 URL이 없습니다.');
        toast.error('카카오 인증 처리 중 오류가 발생했습니다.');
      }
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('인증 처리 중 오류 발생:', err);
      toast.error('카카오 인증 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button 
      onClick={handleKakaoAuth}
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