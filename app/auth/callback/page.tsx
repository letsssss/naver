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
        const { error } = await supabase.auth.getSessionFromUrl();

        if (error) {
          console.error('❌ [CLIENT CALLBACK] 인증 실패:', error.message);
          router.push('/auth/auth-code-error');
        } else {
          console.log('✅ [CLIENT CALLBACK] 인증 성공');
          router.push('/');
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