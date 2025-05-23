'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleOAuthCallback = async () => {
      console.log('🔄 [CLIENT CALLBACK] OAuth 콜백 처리 시작');
      
      const supabase = createBrowserClient();
      
      try {
        // URL에서 인증 코드 추출
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');

        if (error) {
          console.error('❌ [CLIENT CALLBACK] URL 오류:', error);
          router.push('/auth/auth-code-error');
          return;
        }

        if (code) {
          console.log('🔑 [CLIENT CALLBACK] 인증 코드 발견, 세션 교환 중...');
          
          // 인증 코드를 세션으로 교환
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('❌ [CLIENT CALLBACK] 세션 교환 실패:', exchangeError.message);
            router.push('/auth/auth-code-error');
          } else {
            console.log('✅ [CLIENT CALLBACK] 인증 성공');
            router.push('/');
          }
        } else {
          console.error('❌ [CLIENT CALLBACK] 인증 코드가 없음');
          router.push('/auth/auth-code-error');
        }
      } catch (err) {
        console.error('❌ [CLIENT CALLBACK] 예외 발생:', err);
        router.push('/auth/auth-code-error');
      }
    };

    handleOAuthCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">🔄 로그인 처리 중...</p>
      </div>
    </div>
  );
} 