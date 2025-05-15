"use client";

import PortOne from '@portone/browser-sdk/v2';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface KakaoPayProps {
  amount: number;
  orderName: string;
  customerName?: string;
  ticketInfo?: string;
  phoneNumber: string;
  selectedSeats?: string[];
  userId: string;
  postId: string;
  onSuccess?: (paymentId: string) => void;
  onFail?: (error: any) => void;
  disabled?: boolean;
}

export default function KakaoPay({
  amount,
  orderName,
  customerName = '고객',
  ticketInfo = '',
  phoneNumber,
  selectedSeats = [],
  userId,
  postId,
  onSuccess,
  onFail,
  disabled = false
}: KakaoPayProps) {
  const [isWaitingPayment, setWaitingPayment] = useState(false);
  
  const STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID || '';
  const CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || '';

  // 결제 시도를 DB에 기록하는 함수
  const initiatePayment = async () => {
    try {
      // ✅ 변경: 직접 만든 API 사용
      const paymentId = `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      const response = await fetch("/api/payment/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          userId,
          postId,
          amount,
          selectedSeats
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '결제 초기화 실패');
      }

      const data = await response.json();
      console.log('✅ 결제 초기화 성공:', data);
      return data.paymentId;
    } catch (error: any) {
      console.error('❌ 결제 초기화 중 오류:', error);
      toast.error('결제 초기화 중 오류가 발생했습니다.');
      return null;
    }
  };

  // ✅ 새로 추가: 결제 상태 폴링 함수
  const pollPaymentStatus = async (paymentId: string, maxAttempts = 10): Promise<string | null> => {
    console.log(`🔍 결제 상태 확인 시작: ${paymentId}`);
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/payment/status?payment_id=${paymentId}`);
        const data = await response.json();
        
        console.log(`📊 결제 상태 폴링 (${attempts + 1}/${maxAttempts}):`, data);
        
        if (data.success && data.status === 'DONE') {
          console.log('✅ 결제 성공 확인됨!');
          return 'DONE';
        } else if (data.success && (data.status === 'FAILED' || data.status === 'CANCELLED')) {
          console.log('❌ 결제 실패/취소 확인됨:', data.status);
          return data.status;
        }
        
        // 1.5초 대기
        await new Promise(resolve => setTimeout(resolve, 1500));
        attempts++;
      } catch (error) {
        console.error('폴링 중 오류:', error);
        attempts++;
      }
    }
    
    console.log('⚠️ 폴링 시간 초과: 결제 상태 확인 불가');
    return null;
  };

  const isValidPhoneNumber = (phone: string) => {
    return /^(\d{10,11}|\d{3}-\d{3,4}-\d{4}|\d{2,3}-\d{3,4}-\d{4})$/.test(phone);
  };

  const handlePayment = async () => {
    if (!selectedSeats || selectedSeats.length === 0) {
      toast.error("좌석을 하나 이상 선택해주세요.");
      return;
    }

    if (!phoneNumber || phoneNumber.trim() === '') {
      toast.error("연락처를 입력해주세요.");
      return;
    }

    if (!isValidPhoneNumber(phoneNumber)) {
      toast.error("유효한 전화번호 형식이 아닙니다. (예: 010-1234-5678)");
      return;
    }

    if (!STORE_ID || !CHANNEL_KEY) {
      console.error('❌ PortOne 설정 누락');
      alert('결제 설정 오류입니다. 관리자에게 문의하세요.');
      return;
    }

    setWaitingPayment(true);
    
    // 서버에서 paymentId 생성 (DB에 결제 시도 기록)
    const paymentId = await initiatePayment();
    if (!paymentId) {
      setWaitingPayment(false);
      return;
    }
    
    const paymentAmount = amount <= 0 ? 110 : amount;

    try {
      console.log('🔄 카카오페이 결제 요청:', { STORE_ID, paymentId, amount, paymentAmount });
      
      // PortOne SDK로 결제창 호출
      const response = await PortOne.requestPayment({
        storeId: STORE_ID,
        paymentId,
        orderName,
        totalAmount: paymentAmount,
        currency: 'CURRENCY_KRW',
        channelKey: CHANNEL_KEY,
        payMethod: 'EASY_PAY',
        easyPay: { easyPayProvider: 'EASY_PAY_PROVIDER_KAKAOPAY' },
        customer: {
          fullName: customerName,
          phoneNumber
        },
        bypass: { 
          kakaopay: { 
            custom_message: ticketInfo || '티켓 구매' 
          } 
        },
        noticeUrls: [window.location.origin + '/api/payment/webhook'],
      });

      console.log('✅ PortOne 응답 (결제 흐름만 판단):', response);

      // ✅ 변경: SDK 응답만으로 판단하지 않고 폴링 상태 확인
      toast.info("결제 상태 확인 중입니다...");
      const finalStatus = await pollPaymentStatus(paymentId);
      
      if (finalStatus === 'DONE') {
        console.log('🎉 백엔드 결제 검증 성공:', { paymentId, finalStatus });
        toast.success("결제가 완료되었습니다!");
        if (onSuccess) onSuccess(paymentId);
      } else {
        console.warn('⚠️ 백엔드 결제 검증 실패 또는 시간 초과:', { paymentId, finalStatus });
        
        toast.warning(finalStatus === 'CANCELLED' 
          ? "결제가 취소되었습니다." 
          : "결제가 완료되지 않았습니다.");
        
        if (onFail) onFail({
          code: finalStatus || 'TIMEOUT',
          message: finalStatus === 'CANCELLED' 
            ? '결제가 취소되었습니다.' 
            : '결제 확인 시간이 초과되었습니다.',
          isCancelled: finalStatus === 'CANCELLED'
        });
      }

    } catch (error: any) {
      console.error('❌ 결제 중 오류 발생:', error);

      if (error.code === 'PO_SDK_CLOSE_WINDOW' || error.code === 'USER_CANCEL') {
        toast.info("결제가 취소되었습니다.");
        if (onFail) onFail({
          code: error.code,
          message: "사용자가 결제를 취소했습니다.",
          isCancelled: true
        });
      } else {
        toast.error("결제 처리 중 오류가 발생했습니다.");
        if (onFail) onFail(error);
      }

    } finally {
      setWaitingPayment(false);
    }
  };

  return (
    <Button 
      onClick={handlePayment} 
      disabled={isWaitingPayment || disabled}
      size="lg"
      className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-medium"
    >
      {isWaitingPayment ? (
        <div className="flex items-center gap-2">
          <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></span>
          <span>결제 진행 중...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
            <path d="M12.5 7H11V13L16.2 16.2L17 14.9L12.5 12.2V7Z" fill="currentColor"/>
          </svg>
          <span>카카오페이로 결제하기</span>
        </div>
      )}
    </Button>
  );
} 