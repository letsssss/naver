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
      const response = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          postId,
          amount,
          phoneNumber,
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

      console.log('✅ 결제 응답:', response);

      // 🛡️ 결제 성공 조건: KG이니시스 문서 기반으로 수정
      // 결제 성공 확인을 더 엄격하게 처리 (status, code 모두 확인)
      const isSuccess =
        response &&
        response.paymentId &&
        (response as any).status === 'DONE' && 
        (response as any).code !== 'FAILURE_TYPE_PG' &&
        (response as any).success === true;

      if (isSuccess) {
        console.log('🎉 결제 성공:', {
          paymentId: response.paymentId,
          status: (response as any).status,
          code: (response as any).code,
          transactionType: response.transactionType,
          success: (response as any).success
        });
        if (onSuccess) onSuccess(response.paymentId || paymentId);
      } else {
        console.warn('⚠️ 결제 실패 또는 미완료:', {
          paymentId: response?.paymentId,
          status: (response as any)?.status,
          code: (response as any)?.code,
          transactionType: response?.transactionType,
          success: (response as any)?.success
        });
        
        // 디버깅을 위한 전체 응답 로깅
        console.log("📌 응답 객체 전체 확인:", JSON.stringify(response, null, 2));
        
        toast.warning("결제가 완료되지 않았습니다.");
        if (onFail) onFail({
          code: (response as any)?.code || 'NOT_SUCCESS',
          message: '결제가 완료되지 않았습니다.',
          response
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