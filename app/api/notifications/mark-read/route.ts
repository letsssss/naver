import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAccessToken, getTokenFromHeaders, isDevelopment } from "@/lib/auth";

// verifyToken 반환 타입 정의
interface TokenPayload {
  userId: string | number;
  email?: string;
  role?: string;
}

// OPTIONS 요청 처리
export async function OPTIONS(request: Request) {
  return new NextResponse(null, { 
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// 단일 알림 읽음 표시
export async function POST(request: NextRequest) {
  try {
    // 토큰 검증
    const token = getTokenFromHeaders(request.headers);
    if (!token) {
      return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 });
    }

    const { notificationId } = await request.json();

    if (!notificationId) {
      return NextResponse.json({ error: "알림 ID가 필요합니다." }, { status: 400 });
    }

    const userId = decoded.userId;
    const supabase = getSupabaseClient();

    // 특정 알림을 읽음 처리
    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error("알림 읽음 처리 오류:", error);
      return NextResponse.json({ error: "알림 읽음 처리 중 오류가 발생했습니다." }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "알림을 찾을 수 없습니다." }, { status: 404 });
    }

    return NextResponse.json({ 
      message: "알림이 읽음 처리되었습니다.",
      notification: data 
    });
  } catch (error) {
    console.error("알림 읽음 처리 오류:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
} 