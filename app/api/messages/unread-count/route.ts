import { NextResponse, NextRequest } from 'next/server';
// import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// 헤더 추가 (CORS 등)
const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OPTIONS 메서드 처리 (CORS preflight)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// GET 메서드 - 읽지 않은 메시지 개수 반환
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 unread-count API 호출됨');
    console.log(`📝 요청 URL: ${req.url}`);
    
    // URL에서 파라미터 추출
    const url = new URL(req.url);
    const orderNumber = url.searchParams.get('orderNumber');
    const userIdParam = url.searchParams.get('userId');
    
    console.log(`📝 요청 파라미터: orderNumber=${orderNumber || 'null'}, userId=${userIdParam || 'null'}`);
    
    // 다양한 방식으로 토큰 추출
    let token = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    // 쿠키에서도 토큰을 추출 시도
    const cookieStr = req.headers.get('cookie') || '';
    const cookieTokenMatch = cookieStr.match(/sb-[\w]+-auth-token=%5B%22([^%]+)%/);
    const cookieToken = cookieTokenMatch ? cookieTokenMatch[1] : null;
    
    if (!token && cookieToken) {
      token = cookieToken;
      console.log('🔑 쿠키에서 토큰 추출됨');
    }
    
    console.log('🔑 토큰 검증 시작');
    
    let userId = userIdParam;
    
    // 토큰이 있으면 검증
    if (token) {
      console.log(`🔑 토큰 길이: ${token.length}, 토큰 미리보기: ${token.substring(0, 20)}...`);
      
      try {
        const { id: tokenUserId, authenticated } = await verifyToken(token);
        console.log(`🔐 인증 결과: userId=${tokenUserId}, authenticated=${authenticated}`);
        
        // URL에서 받은 userId가 없으면 토큰에서 추출한 userId 사용
        if (!userId && authenticated && tokenUserId) {
          userId = tokenUserId;
          console.log(`👤 토큰에서 userId 추출: ${userId}`);
        }
      } catch (verifyError) {
        console.error('🚨 토큰 검증 오류:', verifyError);
        // 토큰 검증 실패 시 URL의 userId 파라미터를 계속 사용
      }
    }
    
    // userId 파라미터가 없으면 401 응답
    if (!userId) {
      console.log('❌ userId가 없어 인증 실패');
      return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401, headers: CORS_HEADERS });
    }
    
    console.log(`👤 최종 사용할 userId: ${userId}`);
    
    // Supabase 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let count = 0;
    let debugInfo = {};
    
    // 주문번호 파라미터가 있는 경우
    if (orderNumber) {
      console.log(`🔍 주문번호로 룸 조회: ${orderNumber}`);
      
      // 디버깅을 위해 원본 주문번호 쿼리 실행 및 결과 확인
      console.log(`📊 디버깅: 주문번호 ${orderNumber}에 대한 룸 데이터 조회 시작`);
      
      // 방법 1: or 조건으로 조회 (기존 로직)
      const { data: roomDataOr, error: roomErrorOr } = await supabase
        .from('rooms')
        .select('id')
        .or(`order_number.eq.${orderNumber},order_id.eq.${orderNumber}`)
        .maybeSingle();
      
      console.log(`📊 디버깅: OR 조건 조회 결과:`, roomDataOr || 'null', roomErrorOr ? `오류: ${roomErrorOr.message}` : '오류 없음');
      
      // 방법 2: 각 필드별로 개별 조회
      const { data: roomByOrderNumber, error: orderNumError } = await supabase
        .from('rooms')
        .select('id')
        .eq('order_number', orderNumber)
        .maybeSingle();
      
      console.log(`📊 디버깅: order_number 조회 결과:`, roomByOrderNumber || 'null', orderNumError ? `오류: ${orderNumError.message}` : '오류 없음');
      
      const { data: roomByOrderId, error: orderIdError } = await supabase
        .from('rooms')
        .select('id')
        .eq('order_id', orderNumber)
        .maybeSingle();
      
      console.log(`📊 디버깅: order_id 조회 결과:`, roomByOrderId || 'null', orderIdError ? `오류: ${orderIdError.message}` : '오류 없음');
      
      // 모든 가능한 room_id 수집
      const roomIds = [];
      
      if (roomDataOr?.id) {
        roomIds.push(roomDataOr.id);
      }
      
      if (roomByOrderNumber?.id && !roomIds.includes(roomByOrderNumber.id)) {
        roomIds.push(roomByOrderNumber.id);
      }
      
      if (roomByOrderId?.id && !roomIds.includes(roomByOrderId.id)) {
        roomIds.push(roomByOrderId.id);
      }
      
      console.log(`📊 수집된 room_id 목록:`, roomIds);
      
      // roomIds가 있는 경우, 해당 roomIds에 대한 안 읽은 메시지 카운트 조회
      if (roomIds.length > 0) {
        console.log(`🏠 ${roomIds.length}개의 룸이 발견됨`);
        
        // 찾은 모든 room_id에 대해 안 읽은 메시지 조회
        let messagesQuery = supabase
          .from('messages')
          .select('id', { count: 'exact' })
          .eq('receiver_id', userId)
          .eq('is_read', false)
          .in('room_id', roomIds);
        
        // 쿼리 실행
        const { count: messageCount, error: messageError, data: messageData } = await messagesQuery;
        
        if (messageError) {
          console.error('🚨 메시지 개수 조회 오류:', messageError);
          debugInfo = { ...debugInfo, messageError: messageError.message };
        } else {
          count = messageCount || 0;
          console.log(`✅ 룸 ${roomIds.join(', ')}에 대한 메시지 개수 조회 결과: ${count}`);
          
          // 추가 디버깅: 실제 메시지 데이터 확인 (최대 5개)
          if (count === 0) {
            const { data: detailMessages, error: detailError } = await supabase
              .from('messages')
              .select('id, content, is_read, room_id, created_at')
              .in('room_id', roomIds)
              .order('created_at', { ascending: false })
              .limit(5);
            
            console.log(`📊 디버깅: 최근 메시지 확인:`, detailMessages || 'null', detailError ? `오류: ${detailError.message}` : '오류 없음');
            
            debugInfo = { 
              ...debugInfo, 
              recentMessages: detailMessages,
              totalRooms: roomIds.length,
              roomIds
            };
          }
        }
      } else {
        console.log('⚠️ 해당 주문번호의 룸을 찾을 수 없음');
        count = 0;
        debugInfo = { noRoomFound: true, orderNumber };
      }
    } else {
      // 주문번호가 없는 경우 (전체 안 읽은 메시지 개수)
      console.log('📝 주문번호 없음: 전체 안 읽은 메시지 개수 조회');
      
      const { count: totalCount, error } = await supabase
        .from('messages')
        .select('id', { count: 'exact' })
        .eq('receiver_id', userId)
        .eq('is_read', false);
      
      if (error) {
        console.error('🚨 전체 메시지 개수 조회 오류:', error);
        debugInfo = { ...debugInfo, totalCountError: error.message };
      } else {
        count = totalCount || 0;
        console.log(`✅ 전체 안 읽은 메시지 개수 조회 결과: ${count}`);
      }
    }
    
    // 결과 반환
    return NextResponse.json({ 
      count,
      orderNumber: orderNumber || null,
      debug: debugInfo
    }, { headers: CORS_HEADERS });
    
  } catch (error: any) {
    console.error('🚨 메시지 개수 조회 중 오류 발생:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      details: error?.message || '알 수 없는 오류'
    }, { status: 500, headers: CORS_HEADERS });
  }
} 