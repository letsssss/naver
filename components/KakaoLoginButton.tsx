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
    try {
      setIsLoading(true);
      console.log('🚀 [KAKAO] 표준 OAuth 시작');
      
      const supabase = createBrowserClient();
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.easyticket82.com'}/auth/callback`,
        },
      });

      if (error) {
        console.error('❌ [KAKAO] OAuth 오류:', error.message);
        throw error;
      }

      console.log('✅ [KAKAO] OAuth 요청 성공');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('❌ [KAKAO] 인증 오류:', err);
      alert('카카오 인증 중 오류가 발생했습니다.');
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