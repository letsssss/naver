import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { verifyAccessToken, getTokenFromHeaders } from '@/lib/auth';

// 메시지 읽음 상태 업데이트 API 핸들러
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

    const { roomId } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: "채팅방 ID가 필요합니다." }, { status: 400 });
    }

    const roomIdInt = parseInt(roomId, 10);
    if (isNaN(roomIdInt)) {
      return NextResponse.json({ error: "유효하지 않은 채팅방 ID입니다." }, { status: 400 });
    }

    const requestUserId = decoded.userId;
    const supabase = getSupabaseClient();

    // 방 존재 여부 확인 및 사용자가 해당 방의 참여자인지 확인
    const { data: participant, error: participantError } = await supabase
      .from('room_participants')
      .select('id')
      .eq('room_id', roomIdInt)
      .eq('user_id', requestUserId)
      .maybeSingle();

    if (participantError) {
      console.error("참여자 확인 오류:", participantError);
      return NextResponse.json({ error: "참여자 확인 중 오류가 발생했습니다." }, { status: 500 });
    }

    if (!participant) {
      return NextResponse.json({ error: "해당 채팅방에 참여하지 않았습니다." }, { status: 403 });
    }

    // 해당 방의 모든 메시지를 읽음 처리
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .eq('room_id', roomIdInt);

    if (messagesError) {
      console.error("메시지 조회 오류:", messagesError);
      return NextResponse.json({ error: "메시지 조회 중 오류가 발생했습니다." }, { status: 500 });
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ message: "읽을 메시지가 없습니다." });
    }

    // 읽음 상태 일괄 업데이트
    const readStatusData = messages.map(message => ({
      message_id: message.id,
      user_id: requestUserId,
      read_at: new Date().toISOString()
    }));

    const { error: readError } = await supabase
      .from('message_read_status')
      .upsert(readStatusData);

    if (readError) {
      console.error("읽음 상태 업데이트 오류:", readError);
      return NextResponse.json({ error: "읽음 상태 업데이트 중 오류가 발생했습니다." }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `${messages.length}개의 메시지를 읽음 처리했습니다.`,
      count: messages.length
    });
  } catch (error) {
    console.error("메시지 읽음 처리 오류:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
} 