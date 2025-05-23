import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/supabase';
import { verifyAccessToken, getTokenFromHeaders } from '@/lib/auth';

// 메시지 읽음 상태 조회 API 핸들러
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const roomId = searchParams.get('roomId');
    const messageId = searchParams.get('messageId');
    
    // 인증 토큰 검증
    const token = getTokenFromHeaders(request.headers);
    if (!token) {
      return NextResponse.json(
        { error: '인증되지 않은 요청입니다.' },
        { status: 401 }
      );
    }
    
    const decoded = verifyAccessToken(token);
    
    if (!decoded || typeof decoded !== 'object' || !('userId' in decoded)) {
      return NextResponse.json(
        { error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      );
    }
    
    const userId = parseInt(decoded.userId.toString());
    
    // 특정 메시지 ID가 제공된 경우
    if (messageId) {
      const messageIdInt = parseInt(messageId);
      if (isNaN(messageIdInt)) {
        return NextResponse.json(
          { error: '유효하지 않은 메시지 ID입니다.' },
          { status: 400 }
        );
      }
      
      const supabase = getSupabaseClient();
      
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('*')
        .eq('id', messageIdInt)
        .maybeSingle();
      
      if (messageError) {
        console.error('메시지 조회 오류:', messageError);
        return NextResponse.json(
          { error: '메시지 조회 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
      
      if (!message) {
        return NextResponse.json(
          { error: '메시지를 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      // 메시지의 발신자만 읽음 상태를 확인할 수 있음
      if (message.sender_id !== userId) {
        return NextResponse.json(
          { error: '이 메시지의 읽음 상태를 확인할 권한이 없습니다.' },
          { status: 403 }
        );
      }
      
      return NextResponse.json({
        success: true,
        messageId: message.id,
        isRead: message.is_read,
        senderId: message.sender_id,
        receiverId: message.receiver_id,
        timestamp: message.created_at
      });
    }
    
    // 채팅방 ID가 제공된 경우
    if (roomId) {
      // roomId를 방 이름으로 사용하는 경우
      const supabase = getSupabaseClient();
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('order_number', roomId)
        .maybeSingle();
      
      if (roomError) {
        console.error('채팅방 조회 오류:', roomError);
        return NextResponse.json(
          { error: '채팅방 조회 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
      
      if (!room) {
        return NextResponse.json(
          { error: '채팅방을 찾을 수 없습니다.' },
          { status: 404 }
        );
      }
      
      // 사용자가 채팅방의 참여자인지 확인
      const { data: participant, error: participantError } = await supabase
        .from('room_participants')
        .select('id')
        .eq('room_id', room.id)
        .eq('user_id', userId)
        .maybeSingle();
      
      if (participantError) {
        console.error('참여자 확인 오류:', participantError);
        return NextResponse.json(
          { error: '채팅방 참여자 확인 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
      
      if (!participant) {
        return NextResponse.json(
          { error: '이 채팅방에 접근할 권한이 없습니다.' },
          { status: 403 }
        );
      }
      
      // 사용자가 보낸 메시지 중 읽음 상태 확인
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('id, content, is_read, created_at')
        .eq('room_id', room.id)
        .eq('sender_id', userId)
        .order('created_at', { ascending: false });
      
      if (messagesError) {
        console.error('메시지 조회 오류:', messagesError);
        return NextResponse.json(
          { error: '메시지 조회 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
      
      // 읽지 않은 메시지 개수
      const unreadCount = messages ? messages.filter(msg => !msg.is_read).length : 0;
      const totalMessages = messages ? messages.length : 0;
      
      return NextResponse.json({
        success: true,
        roomId: roomId,
        totalMessages: totalMessages,
        unreadCount,
        readCount: totalMessages - unreadCount,
        messages: messages ? messages.map(msg => ({
          id: msg.id,
          content: msg.content.substring(0, 30) + (msg.content.length > 30 ? '...' : ''),
          isRead: msg.is_read,
          timestamp: msg.created_at
        })) : []
      });
    }
    
    return NextResponse.json(
      { error: 'roomId 또는 messageId 파라미터가 필요합니다.' },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error('[API] 메시지 읽음 상태 조회 오류:', error);
    return NextResponse.json(
      { 
        error: '메시지 읽음 상태 조회 중 오류가 발생했습니다.',
        details: error.message
      },
      { status: 500 }
    );
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

    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json({ error: "메시지 ID가 필요합니다." }, { status: 400 });
    }

    const messageIdInt = parseInt(messageId, 10);
    if (isNaN(messageIdInt)) {
      return NextResponse.json({ error: "유효하지 않은 메시지 ID입니다." }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // 메시지 존재 확인
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageIdInt)
      .maybeSingle();

    if (messageError) {
      console.error("메시지 조회 오류:", messageError);
      return NextResponse.json({ error: "메시지 조회 중 오류가 발생했습니다." }, { status: 500 });
    }

    if (!message) {
      return NextResponse.json({ error: "메시지를 찾을 수 없습니다." }, { status: 404 });
    }

    // 읽음 상태 업데이트 또는 생성
    const { data: readStatus, error: readError } = await supabase
      .from('message_read_status')
      .upsert({
        message_id: messageIdInt,
        user_id: decoded.userId,
        read_at: new Date().toISOString()
      })
      .select()
      .single();

    if (readError) {
      console.error("읽음 상태 업데이트 오류:", readError);
      return NextResponse.json({ error: "읽음 상태 업데이트 중 오류가 발생했습니다." }, { status: 500 });
    }

    return NextResponse.json({ 
      message: "읽음 상태가 업데이트되었습니다.",
      readStatus 
    });
  } catch (error) {
    console.error("읽음 상태 업데이트 오류:", error);
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 });
  }
} 