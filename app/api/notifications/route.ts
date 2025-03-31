import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken, getTokenFromHeaders, getTokenFromCookies, isDevelopment } from '@/lib/auth';
import { cors } from '@/lib/cors';
import { supabase, createServerSupabaseClient } from '@/lib/supabase';

// OPTIONS 요청 처리
export async function OPTIONS(request: Request) {
  return new NextResponse(null, { 
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// 알림 목록 조회
export async function GET(req: Request) {
  try {
    console.log('알림 API 호출됨');
    
    // JWT 토큰 확인
    const token = getTokenFromHeaders(req.headers) || getTokenFromCookies(req);
    console.log('토큰 정보:', token ? '토큰 있음' : '토큰 없음');
    
    // 개발 환경에서 토큰 검증 우회 옵션
    let userId = 0;
    
    if (token) {
      try {
        // Supabase 서버 클라이언트 생성 시도
        try {
          const supabaseServerClient = createServerSupabaseClient(token);
          const { data: { user }, error } = await supabaseServerClient.auth.getUser();
          
          if (error) {
            console.error('Supabase 토큰 검증 실패:', error.message);
            console.log('Supabase 토큰 검증 실패: Supabase 설정 누락');
          } else if (user) {
            console.log('Supabase 인증 성공, 사용자 ID:', user.id);
            // Supabase의 사용자 ID를 숫자로 변환 (필요한 경우)
            userId = parseInt(user.id, 10) || 3; // 기본값 3은 개발용
            return await getNotificationsForUser(userId);
          }
        } catch (supabaseError) {
          console.error('Supabase 서버 클라이언트 생성 실패:', supabaseError);
          console.log('Supabase 서버 클라이언트 생성 실패: 환경 변수 누락');
        }
        
        // JWT 토큰 검증 시도
        console.log('JWT 토큰 검증 시도...');
        console.log('JWT 토큰 검증 시도', token.substring(0, 10) + '...');
        
        try {
          const decoded = verifyToken(token);
          if (!decoded || !decoded.userId) {
            console.log('JWT 토큰도 유효하지 않음');
            
            // 개발 환경에서는 인증 에러를 무시하고 기본 사용자 ID(3)로 진행
            if (isDevelopment) {
              console.log('개발 환경에서 인증 우회, 기본 사용자 ID: 3 사용');
              userId = 3;
              return await getNotificationsForUser(userId);
            }
            
            throw new Error('유효하지 않은 인증 정보');
          }
          
          userId = decoded.userId;
          console.log('JWT 인증 성공, 사용자 ID:', userId);
          return await getNotificationsForUser(userId);
        } catch (jwtError) {
          console.log('JWT 토큰 검증 실패:', jwtError);
          
          // 개발 환경에서는 인증 에러를 무시하고 기본 사용자 ID(3)로 진행
          if (isDevelopment) {
            console.log('개발 환경에서 인증 우회, 기본 사용자 ID: 3 사용');
            userId = 3;
            return await getNotificationsForUser(userId);
          }
          
          throw new Error('모든 인증 방식 실패: ' + jwtError);
        }
      } catch (tokenError) {
        console.error('토큰 검증 중 오류:', tokenError);
        
        // 개발 환경에서는 인증 에러를 무시하고 기본 사용자 ID(3)로 진행
        if (isDevelopment) {
          console.log('개발 환경에서 인증 우회, 기본 사용자 ID: 3 사용');
          userId = 3;
          return await getNotificationsForUser(userId);
        }
        
        return new NextResponse(
          JSON.stringify({ 
            error: '인증에 실패했습니다.', 
            code: 'AUTH_ERROR',
            details: isDevelopment ? String(tokenError) : undefined
          }),
          { 
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
          }
        );
      }
    } else {
      // 토큰이 없는 경우
      if (isDevelopment) {
        console.log('개발 환경에서 인증 우회, 기본 사용자 ID: 3 사용');
        userId = 3; // 개발 환경에서 기본 사용자 ID
        return await getNotificationsForUser(userId);
      }
      
      return new NextResponse(
        JSON.stringify({ 
          error: '로그인이 필요합니다.', 
          code: 'AUTH_ERROR' 
        }),
        { 
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }
        }
      );
    }
  } catch (error) {
    console.error('알림 API 전역 오류:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: '서버에서 오류가 발생했습니다.', 
        code: 'SERVER_ERROR',
        details: isDevelopment ? String(error) : undefined
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  }
}

// 사용자의 알림을 조회하는 핵심 함수 (코드 재사용을 위해 분리)
async function getNotificationsForUser(userId: number) {
  try {
    console.log('알림 데이터 조회 시도...');
    console.log('조회 조건:', { userId });
    
    // Prisma 폴백으로 알림 데이터 조회...
    console.log('Prisma 폴백으로 알림 데이터 조회...');
    
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    console.log('조회된 알림 수:', notifications.length);
    console.log('원본 알림 데이터:', notifications);

    // 날짜를 상대적 시간으로 포맷팅하는 함수
    const formatDateToRelative = (dateStr: string): string => {
      try {
        if (!dateStr) return "방금 전";

        // Date 객체 생성
        const date = new Date(dateStr);
        
        // 유효하지 않은 날짜인 경우
        if (isNaN(date.getTime())) {
          return "방금 전";
        }
        
        const now = new Date();
        
        // 미래 시간인 경우 - 서버/클라이언트 시간 차이를 고려해 10분까지는 허용
        if (date > now) {
          const diffMs = date.getTime() - now.getTime();
          if (diffMs <= 10 * 60 * 1000) { // 10분 이내
            return "방금 전";
          }
          // 심각한 미래 시간인 경우 
          return "최근";
        }
        
        // 시간 차이 계산
        const diffMs = now.getTime() - date.getTime();
        const seconds = Math.floor(diffMs / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        // 상대적 시간 표시
        if (days > 30) {
          // 절대 날짜 형식으로 표시 (1달 이상 지난 경우)
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}.${month}.${day}`;
        } else if (days > 0) {
          return `${days}일 전`;
        } else if (hours > 0) {
          return `${hours}시간 전`;
        } else if (minutes > 0) {
          return `${minutes}분 전`;
        } else {
          return "방금 전";
        }
      } catch (error) {
        console.error("날짜 변환 오류:", error);
        return "방금 전";
      }
    };

    const formattedNotifications = notifications.map(notification => ({
      id: notification.id,
      title: notification.type === 'TICKET_REQUEST' 
        ? '티켓 구매 신청' 
        : notification.type === 'PURCHASE_STATUS'
        ? '시스템 알림'
        : notification.type === 'PURCHASE_COMPLETE'
        ? '구매 완료 알림'
        : '시스템 알림',
      message: notification.message,
      link: notification.postId ? `/posts/${notification.postId}` : '/mypage',
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      type: notification.type,
      formattedDate: formatDateToRelative(notification.createdAt.toString())
    }));

    console.log('포맷된 알림 데이터:', formattedNotifications);
    
    return new NextResponse(
      JSON.stringify({ notifications: formattedNotifications }),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  } catch (dbError) {
    console.error('데이터베이스 쿼리 오류:', dbError);
    return new NextResponse(
      JSON.stringify({ 
        error: '알림 데이터 조회 중 오류가 발생했습니다.', 
        code: 'DB_ERROR',
        details: isDevelopment ? String(dbError) : undefined
      }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
      }
    );
  }
}

// 알림 생성
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, postId, message, type = 'SYSTEM' } = body;

    if (!userId || !message) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
    }

    // 알림 생성 - Supabase 시도, 실패하면 Prisma로 폴백
    try {
      console.log('Supabase로 알림 생성 시도...');
      
      // Supabase 데이터 형식으로 변환
      const notificationData = {
        user_id: userId,
        post_id: postId,
        message,
        type,
        is_read: false
      };
      
      const { data: supabaseNotification, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();
      
      if (error) {
        console.error('Supabase 알림 생성 오류:', error);
        throw error; // Prisma 폴백으로 이동
      }
      
      console.log('Supabase로 알림 생성 성공:', supabaseNotification);
      
      // Supabase 응답 형식을 앱 형식으로 변환
      const notification = {
        id: supabaseNotification.id,
        userId: supabaseNotification.user_id,
        postId: supabaseNotification.post_id,
        message: supabaseNotification.message,
        type: supabaseNotification.type,
        isRead: supabaseNotification.is_read,
        createdAt: new Date(supabaseNotification.created_at)
      };
      
      return NextResponse.json({ notification }, 
        { status: 201, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
      
    } catch (supabaseError) {
      console.log('Supabase 알림 생성 실패, Prisma 폴백 사용:', supabaseError);
      
      // Prisma 폴백
      try {
        const notification = await prisma.notification.create({
          data: {
            userId,
            postId,
            message,
            type,
          },
        });

        return NextResponse.json({ notification }, 
          { status: 201, headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }}
        );
      } catch (prismaError) {
        console.error('Prisma 알림 생성 오류:', prismaError);
        throw prismaError;
      }
    }
  } catch (error) {
    console.error('알림 생성 중 오류 발생:', error);
    return NextResponse.json(
      { error: '알림을 생성하는 중 오류가 발생했습니다.' },
      { status: 500, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }}
    );
  }
}

// 알림 읽음 상태 변경
export async function PATCH(req: Request) {
  try {
    // 요청 본문 파싱
    const body = await req.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: '알림 ID가 필요합니다.' },
        { status: 400, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
    }

    // 토큰 확인
    const token = getTokenFromHeaders(req.headers) || getTokenFromCookies(req);
    if (!token) {
      return NextResponse.json(
        { error: '인증이 필요합니다.' },
        { status: 401, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
    }

    // JWT 토큰 검증만 사용하도록 수정
    let userId: number | null = null;

    try {
      // JWT 토큰 검증
      console.log('JWT 토큰 검증 시도...');
      const decoded = verifyToken(token);
      if (!decoded || !decoded.userId) {
        console.log('JWT 토큰이 유효하지 않음');
        throw new Error('유효하지 않은 인증 정보');
      }
      userId = decoded.userId;
      console.log('JWT 인증 성공, 사용자 ID:', userId);
    } catch (authError) {
      console.error('인증 실패:', authError);
      return NextResponse.json(
        { error: '유효하지 않은 인증 정보입니다.' },
        { status: 401, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
    }

    // Supabase로 알림 소유자 확인 및 업데이트 시도
    try {
      console.log('Supabase로 알림 확인 및 업데이트 시도...');
      
      // 알림 소유자 확인
      const { data: notification, error: fetchError } = await supabase
        .from('notifications')
        .select('user_id')
        .eq('id', notificationId)
        .single();
      
      if (fetchError) {
        console.error('Supabase 알림 조회 오류:', fetchError);
        throw fetchError; // Prisma 폴백으로 이동
      }
      
      if (!notification) {
        return NextResponse.json(
          { error: '알림을 찾을 수 없습니다.' },
          { status: 404, headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }}
        );
      }

      if (notification.user_id !== userId) {
        return NextResponse.json(
          { error: '이 알림에 대한 권한이 없습니다.' },
          { status: 403, headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }}
        );
      }

      // 읽음 상태 업데이트
      const { data: updatedNotification, error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .select()
        .single();
      
      if (updateError) {
        console.error('Supabase 알림 업데이트 오류:', updateError);
        throw updateError; // Prisma 폴백으로 이동
      }
      
      // Supabase 응답 형식을 앱 형식으로 변환
      const formattedNotification = {
        id: updatedNotification.id,
        userId: updatedNotification.user_id,
        postId: updatedNotification.post_id,
        message: updatedNotification.message,
        type: updatedNotification.type,
        isRead: updatedNotification.is_read,
        createdAt: new Date(updatedNotification.created_at)
      };
      
      return NextResponse.json(
        { success: true, notification: formattedNotification },
        { status: 200, headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }}
      );
      
    } catch (supabaseError) {
      console.log('Supabase 알림 업데이트 실패, Prisma 폴백 사용:', supabaseError);
      
      // Prisma 폴백
      try {
        // 알림 소유자 확인
        const notification = await prisma.notification.findUnique({
          where: { id: notificationId },
          select: { userId: true }
        });

        if (!notification) {
          return NextResponse.json(
            { error: '알림을 찾을 수 없습니다.' },
            { status: 404, headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }}
          );
        }

        if (notification.userId !== userId) {
          return NextResponse.json(
            { error: '이 알림에 대한 권한이 없습니다.' },
            { status: 403, headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }}
          );
        }

        // 읽음 상태 업데이트
        const updatedNotification = await prisma.notification.update({
          where: { id: notificationId },
          data: { isRead: true }
        });

        return NextResponse.json(
          { success: true, notification: updatedNotification },
          { status: 200, headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          }}
        );
      } catch (prismaError) {
        console.error('Prisma 알림 업데이트 오류:', prismaError);
        throw prismaError;
      }
    }
  } catch (error) {
    console.error('알림 업데이트 오류:', error);
    return NextResponse.json(
      { error: '알림 업데이트 중 오류가 발생했습니다.', details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status: 500, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      }}
    );
  }
} 