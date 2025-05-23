import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, getAuthenticatedUser } from '@/lib/auth';
import { getSupabaseClient } from '@/lib/supabase';

// verifyToken 반환 타입 정의
interface DecodedToken {
  userId: string | number;
  name?: string;
  email?: string;
}

// CORS 헤더 추가 함수
const addCorsHeaders = (response: NextResponse) => {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
};

// OPTIONS 요청 처리 (CORS preflight)
export async function OPTIONS() {
  return addCorsHeaders(
    NextResponse.json({}, { status: 200 })
  );
}

/**
 * 현재 로그인한 사용자 정보를 조회하는 API
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 사용자입니다.' }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // 사용자 정보 조회
    const userId = user.id;
    
    // Supabase에서 사용자 정보 조회
    const { data: userData, error } = await supabase
      .from('users')
      .select('id, email, name, role, profileImage, phoneNumber, createdAt')
      .eq('id', Number(userId))
      .single();

    // 오류가 있거나 사용자 정보가 없으면 404 에러
    if (error || !userData) {
      console.error('사용자 조회 실패:', error);
      return NextResponse.json(
        { error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    // 사용자 정보 반환
    return NextResponse.json({
      user: {
        ...userData,
        // createdAt이 이미 문자열일 수 있으므로 타입 체크
        createdAt: typeof userData.createdAt === 'string' 
          ? userData.createdAt 
          : new Date(userData.createdAt).toISOString()
      }
    });
  } catch (error: any) {
    // 서버 에러 처리
    console.error('사용자 정보 조회 오류:', error);
    return NextResponse.json(
      { error: '사용자 정보를 조회하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 