'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase.types';
import { logDomainInfo, logDomainComparison } from '../../../utils/domain-debug';

export default function AuthCallback() {
  const router = useRouter();
  
  useEffect(() => {
    const handleAuthCallback = async () => {
      // ✅ ④ 콜백 페이지 진입 시점 - 정밀 디버깅
      console.log("🎯 [콜백 페이지] 진입 시작");
      
      // 도메인 정보 확인
      logDomainInfo('[AUTH CALLBACK]');
      
      // 예상 도메인과 비교
      logDomainComparison('https://www.easyticket82.com', '[AUTH CALLBACK]');
      
      try {
        // ✅ ④ Callback 페이지 진입 시 - 정밀 디버깅
        console.log("📥 [Callback] 페이지 진입");
        
        // 🔍 콜백 페이지 도메인 정보 확인
        if (typeof window !== 'undefined') {
          console.log("🔍 [Callback] 현재 도메인 정보:");
          console.log("🌐 [Callback] 전체 URL:", window.location.href);
          console.log("🔑 [Callback] 프로토콜:", window.location.protocol);
          console.log("📍 [Callback] 호스트 (도메인:포트):", window.location.host);
          console.log("🏠 [Callback] 호스트명 (도메인):", window.location.hostname);
          console.log("📄 [Callback] 경로:", window.location.pathname);
          console.log("🔗 [Callback] Origin:", window.location.origin);
          
          // 예상 도메인과 비교
          const expectedOrigin = 'https://www.easyticket82.com';
          const currentOrigin = window.location.origin;
          
          console.log("🔄 [Callback] 도메인 검증:");
          console.log("  📤 [Callback] 현재 Origin:", currentOrigin);
          console.log("  📥 [Callback] 예상 Origin:", expectedOrigin);
          console.log("  ✅ [Callback] 도메인 일치:", currentOrigin === expectedOrigin ? "예" : "❌ 불일치!");
          
          if (currentOrigin !== expectedOrigin) {
            console.warn("⚠️ [Callback 도메인 경고] 예상과 다른 도메인에서 실행 중!");
            console.warn("⚠️ [Callback 도메인 경고] localStorage 접근에 문제가 있을 수 있습니다!");
          }
        }
        
        console.log("📦 [Callback] localStorage 전체 키:", Object.keys(localStorage));
        console.log("📦 [Callback] code_verifier 값:", localStorage.getItem('supabase.auth.code_verifier'));
        
        // localStorage 모든 키 출력 (콜백 페이지 진입 시점)
        if (typeof window !== 'undefined') {
          console.log("🗂️ [DEBUG] Callback 페이지 진입 시 localStorage 전체 키:", Object.keys(localStorage));
          console.log("🗂️ [DEBUG] Callback 페이지 진입 시 localStorage 값들:");
          Object.entries(localStorage).forEach(([key, val]) => {
            console.log(`  🔑 ${key}:`, val);
          });
          
          // PKCE 관련 키 특별 확인
          const codeVerifier = localStorage.getItem('supabase.auth.code_verifier');
          console.log("🔍 [PKCE DEBUG] 콜백 페이지 진입 시 code_verifier:", codeVerifier);
          
          // 모든 supabase 관련 키 확인
          const supabaseKeys = Object.keys(localStorage).filter(k => k.includes('supabase'));
          console.log("🔍 [Callback] supabase 관련 키들:", supabaseKeys);
          supabaseKeys.forEach(k => {
            console.log(`  🔑 [Callback] ${k}:`, localStorage.getItem(k));
          });
        }
      
        // 인증 관련 로컬 스토리지 키 정리 (PKCE용 code_verifier 유지)
        console.log("🧹 [Callback 페이지] 불필요한 로컬 스토리지 정리");
        localStorage.removeItem("supabase.auth.token");
        // PKCE 인증에 필요한 code_verifier는 삭제하면 안 됩니다!
        // localStorage.removeItem("supabase.auth.code_verifier");
        
        console.log("🔍 [Callback 페이지] 실행됨");
        console.log("🔍 [Callback 페이지] 전체 URL:", window.location.href);
        const supabase = createPagesBrowserClient();
        
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
            
            // PKCE 상태 확인 (code 발견 시점)
            if (typeof window !== 'undefined') {
              console.log("🔍 [PKCE] 인증 코드 발견 시점의 code_verifier 상태 확인");
              const codeVerifier = localStorage.getItem('supabase.auth.code_verifier');
              console.log("🔍 [PKCE DEBUG] 인증 코드 발견 시점의 code_verifier:", codeVerifier);
              
              if (!codeVerifier) {
                console.error("❌ [PKCE ERROR] 인증 코드는 있지만 code_verifier가 없음!");
                console.log("🔍 [PKCE ERROR] 현재 localStorage 전체:", Object.keys(localStorage));
              } else {
                console.log("✅ [PKCE SUCCESS] 인증 코드와 code_verifier 모두 존재");
              }
              
              const supabaseKeys = Object.keys(localStorage).filter(k => k.includes('supabase'));
              console.log("🕵️‍♂️ [DEBUG] 인증 코드 발견 시점의 supabase.* 관련 localStorage:", supabaseKeys);
              supabaseKeys.forEach(k => console.log(`  🔑 ${k}:`, localStorage.getItem(k)));
            }
            
            try {
              // Supabase가 쿼리 파라미터에서 자동으로 인증 코드 처리
              // getSession()을 호출해 현재 세션 상태 확인
              const { data, error } = await supabase.auth.getSession();
              
              // 디버깅을 위한 추가 로그
              console.log("📦 [Callback DEBUG] getSession 결과:", data);
              console.log("❗ [Callback DEBUG] getSession 오류:", error);
              
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
                
                // 세션 설정 성공 후 localStorage 상태 확인
                if (typeof window !== 'undefined') {
                  console.log("🗂️ [DEBUG] 세션 설정 성공 후 localStorage 키:", Object.keys(localStorage));
                  
                  // 세션 설정 후 code_verifier 상태 확인
                  const postSessionCodeVerifier = localStorage.getItem('supabase.auth.code_verifier');
                  console.log("🔍 [PKCE] 세션 설정 후 code_verifier:", postSessionCodeVerifier);
                  
                  if (!postSessionCodeVerifier) {
                    console.warn("⚠️ [PKCE] 세션 설정 후 code_verifier가 사라짐 (정상적인 동작일 수 있음)");
                  } else {
                    console.log("✅ [PKCE] 세션 설정 후에도 code_verifier 유지됨");
                  }
                  
                  // 모든 supabase 키 재확인
                  const postSessionSupabaseKeys = Object.keys(localStorage).filter(k => k.includes('supabase'));
                  console.log("🔍 [세션 후] supabase 관련 키들:", postSessionSupabaseKeys);
                  postSessionSupabaseKeys.forEach(k => {
                    const value = localStorage.getItem(k);
                    console.log(`  🔑 [세션 후] ${k}:`, value ? `${value.substring(0, 20)}...` : 'null');
                  });
                }
                
                handleSuccessfulAuth();
                return;
              } else {
                // getSession() 후에도 세션이 없으면 exchangeCodeForSession 시도
                console.log("🔄 [Callback 페이지] 코드를 세션으로 교환 시도...");
                
                // 이 단계는 Supabase v2에서 내부적으로 처리되므로 필요 없을 수 있음
                // 그러나 문제 해결을 위해 포함
                
                // 무한 새로고침 방지: 새로고침 대신 로그인 페이지로 리디렉션
                // window.location.href = window.location.href;
                console.error("❌ [Callback 페이지] 세션 교환 실패, 중단합니다.");
                router.push("/login");
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
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        // 디버깅을 위한 추가 로그
        console.log("📦 [Callback DEBUG] 최종 getSession 결과:", sessionData);
        console.log("❗ [Callback DEBUG] 최종 getSession 오류:", sessionError);
        
        if (sessionData.session) {
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
    
    handleAuthCallback();
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