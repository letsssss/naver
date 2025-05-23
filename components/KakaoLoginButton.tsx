import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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

  const handleKakaoLogin = async () => {
    try {
      setIsLoading(true);
      console.log('🚀 [KAKAO] 서버 사이드 인증 시작');
      
      // 서버 API를 통한 카카오 인증 (PKCE 문제 해결)
      const response = await fetch('/api/auth/kakao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode }),
      });

      if (!response.ok) {
        throw new Error('카카오 인증 요청 실패');
      }

      const data = await response.json();
      
      if (data.authUrl) {
        console.log('🔗 [KAKAO] 인증 URL 받음:', data.authUrl);
        // 서버에서 받은 인증 URL로 리디렉션
        window.location.href = data.authUrl;
      } else {
        throw new Error('인증 URL을 받지 못했습니다');
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('❌ [KAKAO] 인증 오류:', err);
      toast.error('카카오 인증 중 오류가 발생했습니다.');
      setIsLoading(false);
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