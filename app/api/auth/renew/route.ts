import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { getTokenFromHeaders, verifyAccessToken, generateAccessToken, verifyRefreshToken } from "@/lib/auth";
import { getSupabaseClient } from "@/lib/supabase";

// OPTIONS 메서드 처리
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json({ error: "리프레시 토큰이 필요합니다." }, { status: 400 });
    }

    // 1. 리프레시 토큰 검증
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json({ error: "유효하지 않은 리프레시 토큰입니다." }, { status: 401 });
    }

    const supabase = getSupabaseClient();

    // 2. 사용자 정보 조회
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", decoded.userId)
      .single();

    if (userError || !user) {
      console.error("❌ 사용자 조회 오류:", userError);
      return NextResponse.json({ error: "사용자를 찾을 수 없습니다." }, { status: 404 });
    }

    // 3. 새로운 액세스 토큰 생성
    const newAccessToken = generateAccessToken(user.id, user.email, user.role || "USER");

    // 4. Supabase 세션 확인
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("❌ Supabase 세션 확인 오류:", sessionError);
      return NextResponse.json({ error: "세션 확인 중 오류가 발생했습니다." }, { status: 401 });
    }

    return NextResponse.json({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        profileImage: user.profile_image,
      },
    });
  } catch (error) {
    console.error("❌ 토큰 갱신 오류:", error);
    return NextResponse.json({ error: "토큰 갱신 중 오류가 발생했습니다." }, { status: 500 });
  }
} 