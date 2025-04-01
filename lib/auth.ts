import { compare, hash } from 'bcryptjs';
import { NextRequest } from "next/server";
import { NextAuthOptions } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import { getServerSession } from 'next-auth/next';
import * as jsonwebtoken from 'jsonwebtoken';
import { supabase } from '@/lib/supabase';

// 세션에 id 필드를 추가하기 위한 타입 확장
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
  }
}

// 개발 환경인지 확인하는 함수
export const isDevelopment = process.env.NODE_ENV === 'development';

// 환경 변수에서 JWT 시크릿 키 가져오기 (폴백으로 하드코딩된 값 사용)
const JWT_SECRET = process.env.JWT_SECRET || 'supabase-jwt-secret-key-for-development';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'supabase-refresh-secret-key-for-development';

// 디버깅을 위한 로그 추가
console.log('===== JWT ENV DEBUG =====');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('isDevelopment:', isDevelopment);
console.log('JWT_SECRET 설정:', !!JWT_SECRET);
console.log('JWT_SECRET 길이:', JWT_SECRET.length);
console.log('JWT_SECRET 출처:', process.env.JWT_SECRET ? '환경 변수' : '하드코딩된 값');
console.log('=========================');

// 기본 테스트 사용자 ID (개발 환경에서 사용)
const DEFAULT_TEST_USER_ID = 3;

// NextAuth 옵션 설정
export const authOptions: NextAuthOptions = {
  providers: [],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30일
  },
  secret: JWT_SECRET,
  callbacks: {
    async session({ session, token }) {
      if (token && token.sub) {
        session.user = {
          ...session.user,
          id: token.sub
        };
      }
      return session;
    },
  },
};

// 사용자 비밀번호를 해싱합니다.
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

// 해싱된 비밀번호와 일반 텍스트 비밀번호를 비교합니다.
export async function comparePassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return compare(plainPassword, hashedPassword);
}

// JWT 액세스 토큰 생성
export function generateAccessToken(userId: number, email: string, role: string): string {
  return jsonwebtoken.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: '24h' } // 24시간으로 연장
  );
}

// JWT 리프레시 토큰 생성
export function generateRefreshToken(userId: number): string {
  return jsonwebtoken.sign(
    { userId },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' } // 30일로 연장
  );
}

// JWT 토큰 검증 함수 - 안전하게 처리하도록 수정
export function verifyToken(token: string | null) {
  // 토큰이 없는 경우
  if (!token) {
    console.log("토큰이 제공되지 않았습니다.");
    
    // 개발 환경에서는 기본 사용자로 진행
    if (isDevelopment) {
      console.log(`개발 환경에서는 기본 사용자 ID(${DEFAULT_TEST_USER_ID})를 사용`);
      return { userId: DEFAULT_TEST_USER_ID, name: '개발 테스트 사용자' };
    }
    
    return null;
  }
  
  // 개발 환경 처리 - 항상 기본 사용자 ID 반환
  if (isDevelopment) {
    console.log(`개발 환경에서 토큰 검증 건너뛰고 기본 사용자 ID(${DEFAULT_TEST_USER_ID}) 반환`);
    return { userId: DEFAULT_TEST_USER_ID, name: '개발 테스트 사용자' };
  }
  
  // 프로덕션 환경에서 표준 JWT 검증
  try {
    console.log("JWT 토큰 검증 시도", token.substring(0, 10) + "...");
    
    // 표준 JWT 토큰 검증
    const decoded = jsonwebtoken.verify(token, JWT_SECRET) as { userId: number; name?: string };
    console.log("JWT 토큰 검증 성공", decoded);
    return decoded;
  } catch (error) {
    console.error("JWT 토큰 검증 실패:", error);
    return null;
  }
}

// JWT 토큰 유효성 검증
export function verifyAccessToken(token: string) {
  try {
    console.log("JWT 토큰 검증 시도");
    
    // 개발 환경에서는 항상 성공 처리
    if (isDevelopment) {
      console.log(`개발 환경에서 토큰 검증 건너뛰고 기본 사용자 ID(${DEFAULT_TEST_USER_ID}) 반환`);
      return { userId: DEFAULT_TEST_USER_ID };
    }
    
    // 프로덕션 환경에서 표준 검증
    const decoded = jsonwebtoken.verify(token, JWT_SECRET);
    console.log("JWT 토큰 검증 성공", decoded);
    return decoded;
  } catch (error) {
    console.error("JWT 토큰 처리 중 오류:", error);
    
    // 개발 환경에서는 기본값 사용
    if (isDevelopment) {
      console.log(`개발 환경에서는 기본 사용자 ID(${DEFAULT_TEST_USER_ID})로 처리`);
      return { userId: DEFAULT_TEST_USER_ID };
    }
    
    return null;
  }
}

// 리프레시 토큰 유효성 검증
export function verifyRefreshToken(token: string) {
  // 개발 환경에서는 항상 성공 처리
  if (isDevelopment) {
    console.log(`개발 환경에서 리프레시 토큰 검증 건너뛰고 기본 사용자 ID(${DEFAULT_TEST_USER_ID}) 반환`);
    return { userId: DEFAULT_TEST_USER_ID };
  }
  
  try {
    return jsonwebtoken.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

// 요청 헤더에서 인증 토큰을 가져오는 함수
export function getTokenFromHeaders(headers: Headers): string | null {
  const authHeader = headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
}

// 쿠키에서 인증 토큰을 가져오는 함수
export function getTokenFromCookies(request: Request): string | null {
  const cookies = request.headers.get('cookie');
  if (!cookies) return null;
  
  const tokenCookie = cookies.split(';').find(c => c.trim().startsWith('auth-token='));
  if (!tokenCookie) return null;
  
  return tokenCookie.split('=')[1].trim();
}

/**
 * 요청에서 인증된 사용자 정보를 가져오는 함수 (Supabase 버전)
 * @param request Next.js 요청 객체
 * @returns 인증된 사용자 객체 또는 null
 */
export async function getAuthenticatedUser(request: NextRequest) {
  try {
    // 개발 환경에서는 항상 기본 사용자 정보 반환
    if (isDevelopment) {
      console.log(`개발 환경에서 기본 사용자 ID(${DEFAULT_TEST_USER_ID}) 사용`);
      return {
        id: DEFAULT_TEST_USER_ID,
        name: '개발 테스트 사용자',
        email: 'test@example.com'
      };
    }
    
    // 1. JWT 토큰 확인 (쿠키 또는 헤더에서)
    const token = getTokenFromHeaders(request.headers) || getTokenFromCookies(request);
    
    if (token) {
      // JWT 토큰 검증
      const decoded = verifyToken(token);
      if (decoded && decoded.userId) {
        // Supabase에서 사용자 정보 조회
        const { data: user, error } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('id', decoded.userId)
          .single();
        
        if (user && !error) {
          console.log('JWT 토큰으로 인증된 사용자:', user);
          return user;
        }
      }
    }
    
    // 2. JWT 인증 실패 시 NextAuth 세션 확인
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      console.log('세션 또는 사용자 이메일이 없음');
      return null;
    }

    // Supabase에서 사용자 정보 조회
    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('email', session.user.email.toLowerCase())
      .single();
    
    if (!user || error) {
      console.log('사용자 정보를 찾을 수 없음:', session.user.email);
      return null;
    }
    
    console.log('세션에서 인증된 사용자:', user);
    return user;

  } catch (error) {
    console.error('사용자 인증 정보 가져오기 중 오류:', error);
    return null;
  }
}

// 임시 개발용 토큰 생성 함수
export function generateDevToken(userId: number, name: string = '개발 테스트 사용자'): string {
  if (!isDevelopment) {
    console.warn('개발 환경이 아닌 곳에서 개발용 토큰을 생성하려고 합니다. 보안상 위험할 수 있습니다.');
  }
  
  // JWT 토큰 생성
  try {
    const token = jsonwebtoken.sign(
      { userId, name, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 604800 },
      JWT_SECRET
    );
    return token;
  } catch (error) {
    console.error('개발용 토큰 생성 실패:', error);
    // 대체 토큰 방식 (보안에 취약하니 개발용으로만 사용)
    return `dev-jwt-${userId}-${Date.now()}`;
  }
} 