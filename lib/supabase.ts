import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase.types';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
// 직접 import하지 않고 필요할 때 동적으로 가져오도록 수정
// import { cookies } from 'next/headers';

// env.ts에서 환경변수 가져오기
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY } from '@/lib/env';

// ✅ Supabase 클라이언트 옵션
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
};

// ✅ 싱글톤 인스턴스 관리용 변수들 (브라우저용 단일 인스턴스)
let browserClientInstance: SupabaseClient<Database> | null = null;
let adminSupabaseInstance: SupabaseClient<Database> | null = null;
let initAttempted = false;

/**
 * 브라우저에서 사용하기 위한 Supabase 클라이언트를 생성합니다.
 * 싱글톤 패턴으로 단일 인스턴스만 생성하여 PKCE 플로우 충돌을 방지합니다.
 */
export function createBrowserClient(): SupabaseClient<Database> {
  // 브라우저 환경이 아니면 서버 클라이언트 반환
  if (typeof window === 'undefined') {
    console.warn('브라우저 환경이 아닙니다. 서버 클라이언트를 반환합니다.');
    return createLegacyServerClient();
  }
  
  // 환경 변수가 없는 경우 더미 클라이언트 반환
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Supabase] 브라우저에서 환경 변수가 설정되지 않았습니다. 더미 클라이언트를 반환합니다.');
    return createClient<Database>(
      'https://dummy.supabase.co',
      'dummy-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }
  
  // ✅ 이미 생성된 인스턴스가 있으면 재사용 (중복 생성 방지)
  if (browserClientInstance) {
    console.log('🔄 기존 브라우저 클라이언트 인스턴스 재사용');
    return browserClientInstance;
  }
  
  try {
    console.log('✅ 브라우저 클라이언트 생성 (싱글톤 패턴)');
    
    // 🔧 PKCE 플로우를 위한 일반 createClient 사용
    browserClientInstance = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',           // ✅ PKCE 플로우 강제 활성화
        storage: window.localStorage, // ✅ localStorage 명시적 지정
        storageKey: 'sb-auth-token', // ✅ 스토리지 키 명시적 지정
      },
      global: {
        headers: {
          'X-Client-Info': 'easyticket-browser-singleton'
        }
      }
    });
    
    console.log('✅ 브라우저 클라이언트 생성 성공 (PKCE 인증 흐름 활성화)');
    
    // 🔧 PKCE 설정 확인 로그
    console.log('🔧 [PKCE] localStorage 접근 가능:', typeof window.localStorage !== 'undefined');
    console.log('🔧 [PKCE] 현재 도메인:', window.location.origin);
    console.log('🔧 [PKCE] 스토리지 키:', 'sb-auth-token');
    
    // 세션 확인 테스트
    browserClientInstance.auth.getSession().then(({ data }) => {
      console.log("✅ 브라우저 클라이언트 세션 확인:", data.session ? "세션 있음" : "세션 없음");
      
      // 세션이 있으면 세션 정보 출력
      if (data.session) {
        const expiresAt = data.session.expires_at;
        const expiresDate = expiresAt ? new Date(expiresAt * 1000).toLocaleString() : '알 수 없음';
        console.log(`✅ 세션 만료: ${expiresDate} (${data.session.user.email})`);
      }
    });
    
    return browserClientInstance;
  } catch (error) {
    console.error('브라우저 클라이언트 생성 오류:', error);
    // 오류 발생 시 null로 초기화하여 재시도 가능하게 함
    browserClientInstance = null;
    throw error;
  }
}

// ✅ 통합된 클라이언트 생성 함수 (싱글톤 패턴)
const createSupabaseInstance = (): SupabaseClient<Database> => {
  if (initAttempted) {
    console.warn('[Supabase] 이전 초기화 시도가 있었습니다.');
  }
  
  initAttempted = true;
  
  try {
    // 브라우저 환경에서는 createBrowserClient 사용 (싱글톤)
    if (typeof window !== 'undefined') {
      return createBrowserClient();
    }
    
    // 서버 환경에서는 새 인스턴스 생성
    const serverInstance = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
    
    console.log('✅ 서버 Supabase 클라이언트 초기화 완료');
    
    return serverInstance;
  } catch (error) {
    console.error('[Supabase] 클라이언트 생성 오류:', error);
    throw error;
  }
};

// ✅ 서버 환경에서는 null, 브라우저 환경에서는 지연 생성
const supabase = typeof window === 'undefined' 
  ? null // 서버 환경에서는 null로 설정
  : null; // 브라우저 환경에서는 null로 설정

/**
 * 현재 클라이언트나 서버 환경에 맞는 Supabase 클라이언트를 반환합니다.
 * 싱글톤 패턴으로 중복 인스턴스 생성을 방지합니다.
 */
export function getSupabaseClient(): SupabaseClient<Database> {
  // 환경 변수가 없는 경우 (빌드 시간 등) 더미 클라이언트 반환
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Supabase] 환경 변수가 설정되지 않았습니다. 더미 클라이언트를 반환합니다.');
    // 더미 클라이언트 생성 (빌드 시간에 사용)
    return createClient<Database>(
      'https://dummy.supabase.co',
      'dummy-key',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  // 브라우저 환경에서는 createBrowserClient 사용 (싱글톤)
  if (typeof window !== 'undefined') {
    return createBrowserClient();
  }
  
  // 서버 환경에서는 매번 새 인스턴스 생성 (상태 공유 방지)
  return createSupabaseInstance();
}

/**
 * Next.js 서버 컴포넌트에서 사용하기 위한 Supabase 클라이언트를 생성합니다.
 * 이 함수는 App Router(/app)에서만 사용해야 합니다.
 */
export const createServerSupabaseClient = () => {
  try {
    // 동적으로 cookies 가져오기
    const { cookies } = require('next/headers');
    
    // createServerComponentClient 사용
    try {
      // 기본 호출 시도
      return createServerComponentClient({ cookies });
    } catch (e) {
      console.error('기본 서버 컴포넌트 클라이언트 생성 실패:', e);
      
      // 대체: 싱글톤 인스턴스 반환
      return getSupabaseClient();
    }
  } catch (error) {
    console.error('[Supabase] 서버 컴포넌트 클라이언트 생성 오류:', error);
    // Pages Router에서는 대체 메서드 사용
    return createLegacyServerClient();
  }
};

/**
 * 서버 사이드에서 사용하기 위한 Supabase 클라이언트를 생성합니다.
 * 이 함수는 Pages Router(/pages)와 App Router 모두에서 사용 가능합니다.
 * @deprecated createServerSupabaseClient 함수를 대신 사용하세요.
 */
export function createLegacyServerClient(): SupabaseClient<Database> {
  console.log('[Supabase] 레거시 서버 클라이언트 생성');
  // 기존 인스턴스를 재사용하는 대신, 서버용 옵션이 필요한 경우에만 새 인스턴스 생성
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

/**
 * 권한 확인을 위한 인증 전용 클라이언트를 생성합니다.
 */
export function createAuthClient(): SupabaseClient<Database> {
  // 새 인스턴스를 생성하지 않고 기존 인스턴스 재사용
  return getSupabaseClient();
}

/**
 * 관리자 권한 Supabase 클라이언트를 생성합니다.
 * 이 클라이언트는 서버 측에서만 사용되어야 합니다.
 * 싱글톤 패턴으로 한 번만 생성됩니다.
 * @param cookieStore 선택적으로 쿠키 스토어를 전달하여 인증된 세션을 유지할 수 있습니다.
 */
export function createAdminClient(cookieStore?: any): SupabaseClient<Database> {
  // ❗ 클라이언트 환경에서 호출되면 중단
  if (typeof window !== 'undefined') {
    console.error('[createAdminClient] 이 함수는 클라이언트에서 호출되면 안 됩니다. 대신 createBrowserClient() 사용하세요.');
    return getSupabaseClient(); // 에러 대신 일반 클라이언트 반환 (기존 코드 깨지지 않도록)
  }
  
  // 쿠키가 제공된 경우 서버 컴포넌트 클라이언트 생성 시도
  if (cookieStore && typeof cookieStore === 'object') {
    try {
      const { createServerComponentClient } = require('@supabase/auth-helpers-nextjs');
      return createServerComponentClient({ cookies: () => cookieStore });
    } catch (error) {
      console.warn('[Supabase] 쿠키를 사용한 서버 컴포넌트 클라이언트 생성 실패:', error);
      // 실패 시 일반 관리자 클라이언트로 폴백
    }
  }
  
  // 이미 생성된 인스턴스가 있으면 재사용
  if (adminSupabaseInstance) {
    return adminSupabaseInstance;
  }
  
  console.log(`[Supabase] 관리자 클라이언트 생성 - URL: ${SUPABASE_URL.substring(0, 15)}...`);
  
  try {
    // 새 인스턴스 생성 및 저장
    adminSupabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    return adminSupabaseInstance;
  } catch (error) {
    console.error('[Supabase] 관리자 클라이언트 생성 오류:', error);
    throw error;
  }
}

/**
 * 관리자 권한의 Supabase 클라이언트 인스턴스 (서버에서만 사용)
 * 싱글톤 패턴으로 생성
 */
export const adminSupabase = typeof window === 'undefined' 
  ? createAdminClient() 
  : null; // 브라우저 환경에서는 null로 설정

/**
 * ID 값을 문자열로 변환합니다.
 * UUID 또는 숫자 ID를 항상 문자열로 처리합니다.
 */
export function formatUserId(id: string | number): string {
  return String(id);
}

/**
 * 인증 토큰으로 Supabase 클라이언트를 생성합니다.
 * 이 클라이언트는 RLS 정책에 따라 인증된 사용자로 작동합니다.
 * @param token JWT 형식의 인증 토큰
 * @returns 인증된 Supabase 클라이언트
 */
export function createAuthedClient(token: string) {
  if (!token) {
    console.warn("⚠️ 토큰이 제공되지 않았습니다. 익명 클라이언트를 반환합니다.");
    return getSupabaseClient();
  }
  
  console.log("✅ 인증된 Supabase 클라이언트 생성 - 토큰:", token.substring(0, 10) + "...");
  
  return createClient<Database>(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      }
    }
  );
}

/**
 * 데이터 변환 유틸리티
 */
export const transformers = {
  /**
   * snake_case에서 camelCase로 변환
   */
  snakeToCamel: (obj: Record<string, any>): Record<string, any> => {
    if (!obj || typeof obj !== 'object') return obj;
    
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      let value = obj[key];
      
      // 중첩 객체 재귀적 변환
      if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        value = transformers.snakeToCamel(value);
      } else if (Array.isArray(value)) {
        value = value.map(item => 
          typeof item === 'object' ? transformers.snakeToCamel(item) : item
        );
      }
      
      result[camelKey] = value;
      return result;
    }, {} as Record<string, any>);
  },
  
  /**
   * ISO 문자열을 Date 객체로 변환
   */
  parseDate: (dateString: string | null | undefined): Date | null => {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (e) {
      console.error('날짜 파싱 오류:', e);
      return null;
    }
  },
  
  /**
   * 날짜를 상대적인 시간 형식으로 변환
   */
  formatRelativeTime: (dateString: string | Date | null | undefined): string => {
    if (!dateString) return '방금 전';
    
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      if (isNaN(date.getTime())) return '방금 전';

      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSeconds = Math.floor(diffMs / 1000);
      
      // 미래 날짜인 경우 (서버 시간 차이 등으로 발생 가능)
      if (diffSeconds < 0) return '방금 전';
      
      if (diffSeconds < 60) return '방금 전';
      if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}분 전`;
      if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}시간 전`;
      if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}일 전`;
      
      // 1주일 이상인 경우 날짜 표시
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      console.error('날짜 변환 오류:', error);
      return '방금 전';
    }
  }
};

export function createTokenClient(token: string) {
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    }
  );
  return supabase;
}

// ✅ named + default export 둘 다 제공
export { getSupabaseClient as supabase };
export default getSupabaseClient; 