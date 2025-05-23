import { getSupabaseClient } from './supabase';

/**
 * 알림톡 발송 타입 정의
 */
type KakaoMessageType = 'NEW_MESSAGE' | 'PURCHASE' | 'TICKET';

interface RateLimitResult {
  allowed: boolean;
  remainingCount?: number;
  resetTime?: Date;
  message?: string;
}

/**
 * 특정 전화번호/메시지 타입 조합에 대해 카카오 알림톡을 발송할 수 있는지 확인
 * @param phoneNumber 전화번호
 * @param messageType 메시지 타입
 * @returns 발송 가능 여부
 */
export async function canSendKakao(phoneNumber: string, messageType: KakaoMessageType): Promise<boolean> {
  try {
    // 하이픈 제거된 번호 사용
    const cleanPhone = phoneNumber.replace(/-/g, '');
    
    // 1시간 전 시간 계산
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    // 최근 로그 조회
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('kakao_send_logs')
      .select('*')
      .eq('phone_number', cleanPhone)
      .eq('message_type', messageType)
      .gt('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('❌ 카카오 발송 로그 조회 오류:', error);
      // 오류 발생 시 안전하게 false 반환 (발송 제한)
      return false;
    }
    
    // 최근 1시간 내 발송 기록이 없으면 true, 있으면 false
    return data.length === 0;
  } catch (error) {
    console.error('❌ 카카오 발송 제한 검사 중 오류:', error);
    // 오류 발생 시 안전하게 false 반환 (발송 제한)
    return false;
  }
}

/**
 * 카카오 알림톡 발송 로그 업데이트
 * @param phoneNumber 전화번호
 * @param messageType 메시지 타입
 */
export async function updateKakaoSendLog(phoneNumber: string, messageType: KakaoMessageType): Promise<void> {
  try {
    // 하이픈 제거된 번호 사용
    const cleanPhone = phoneNumber.replace(/-/g, '');
    
    // 발송 로그 저장
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('kakao_send_logs')
      .insert({
        phone_number: cleanPhone,
        message_type: messageType,
      });
    
    if (error) {
      console.error('❌ 카카오 발송 로그 저장 오류:', error);
    } else {
      console.log(`✅ 카카오 발송 로그 저장 완료: ${cleanPhone} (${messageType})`);
    }
  } catch (error) {
    console.error('❌ 카카오 발송 로그 업데이트 중 오류:', error);
  }
}

export async function checkRateLimit(phoneNumber: string, messageType: 'auth' | 'notification' = 'auth'): Promise<RateLimitResult> {
  const supabase = getSupabaseClient();
  
  try {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    const now = new Date();
    const oneHour = new Date(now.getTime() - 60 * 60 * 1000);
    
    // 최근 로그 조회
    const { data, error } = await supabase
      .from('kakao_send_logs')
      .select('*')
      .eq('phone_number', cleanPhone)
      .eq('message_type', messageType)
      .gte('created_at', oneHour.toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ 카카오 발송 로그 조회 중 오류:', error);
      return { allowed: false, message: '로그 조회 중 오류가 발생했습니다.' };
    }

    const hourlyLimit = messageType === 'auth' ? 5 : 10;
    const currentCount = data?.length || 0;

    if (currentCount >= hourlyLimit) {
      return {
        allowed: false,
        remainingCount: 0,
        resetTime: new Date(now.getTime() + 60 * 60 * 1000),
        message: `시간당 ${hourlyLimit}회 제한을 초과했습니다.`
      };
    }

    return {
      allowed: true,
      remainingCount: hourlyLimit - currentCount,
      resetTime: new Date(now.getTime() + 60 * 60 * 1000)
    };
  } catch (error) {
    console.error('❌ 카카오 발송 제한 확인 중 오류:', error);
    return { allowed: false, message: '제한 확인 중 오류가 발생했습니다.' };
  }
}

export async function logKakaoSend(phoneNumber: string, messageType: 'auth' | 'notification' = 'auth', success: boolean = true): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('kakao_send_logs')
      .insert({
        phone_number: phoneNumber.replace(/[^0-9]/g, ''),
        message_type: messageType,
        success,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('❌ 카카오 발송 로그 저장 중 오류:', error);
    }
  } catch (error) {
    console.error('❌ 카카오 발송 로그 저장 중 오류:', error);
  }
}

export async function updateKakaoSendStatus(logId: string, success: boolean): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('kakao_send_logs')
      .update({ success, updated_at: new Date().toISOString() })
      .eq('id', logId);

    if (error) {
      console.error('❌ 카카오 발송 로그 업데이트 중 오류:', error);
    }
  } catch (error) {
    console.error('❌ 카카오 발송 로그 업데이트 중 오류:', error);
  }
} 