import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/lib/supabase";
import { verifyAccessToken, getTokenFromHeaders } from "@/lib/auth";

export async function GET(request: NextRequest) {
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

    const supabase = getSupabaseClient();
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get('roomId');

    if (roomId) {
      // 특정 채팅방 정보 조회
      const { data: room, error } = await supabase
        .from('rooms')
        .select(`*,
          room_participants (user:users (id, name, profile_image)),
          messages (id, content, created_at, sender:users (id, name, profile_image))
        `)
        .eq('id', roomId)
        .single();

      if (error) {
        console.error("채팅방 조회 오류:", error);
        return NextResponse.json({ error: "채팅방을 찾을 수 없습니다." }, { status: 404 });
      }

      return NextResponse.json({ room });
    } else {
      // 사용자가 참여한 모든 채팅방 목록 조회
      const { data: rooms, error } = await supabase
        .from('room_participants')
        .select(`
          room:rooms (
            id, name, type, created_at,
            messages (id, content, created_at, sender:users (id, name, profile_image))
          )
        `)
        .eq('user_id', decoded.userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error("채팅방 목록 조회 오류:", error);
        return NextResponse.json({ error: "채팅방 목록을 가져올 수 없습니다." }, { status: 500 });
      }

      return NextResponse.json({ rooms: rooms?.map(r => r.room) || [] });
    }
  } catch (error) {
    console.error("채팅 API 오류:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
}

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

    const { roomId, content, type = 'text' } = await request.json();

    if (!roomId || !content) {
      return NextResponse.json({ error: "채팅방 ID와 메시지 내용이 필요합니다." }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 메시지 저장
    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        room_id: roomId,
        sender_id: decoded.userId,
        content,
        type
      })
      .select(`
        id, content, type, created_at,
        sender:users (id, name, profile_image)
      `)
      .single();

    if (error) {
      console.error("메시지 저장 오류:", error);
      return NextResponse.json({ error: "메시지를 저장할 수 없습니다." }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    console.error("메시지 전송 오류:", error);
    return NextResponse.json({ error: "메시지 전송 중 오류가 발생했습니다." }, { status: 500 });
  }
} 