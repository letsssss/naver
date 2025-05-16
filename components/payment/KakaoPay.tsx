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

  const initiatePayment = async () => {
    try {
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

  const pollPaymentStatus = async (paymentId: string, maxAttempts = 10): Promise<string | null> => {
    console.log(`🔍 결제 상태 확인 시작: ${paymentId}`);
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/payment/status?payment_id=${paymentId}`);
        const data = await response.json();
        
        console.log(`📊 결제 상태 폴링 (${attempts + 1}/${maxAttempts}):`, data);
        console.log(`💡 현재 상태: ${data?.status}`);
        
        if (data.status === 'DONE') {
          console.log('✅ 결제 성공 확인!');
          return 'DONE';
        } else if (data.status === 'FAILED') {
          console.log('❌ 결제 실패 확인!');
          return 'FAILED';
        } else if (data.status === 'CANCELLED') {
          console.log('⚠️ 결제 취소 확인!');
          return 'CANCELLED';
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
        attempts++;
      } catch (error) {
        console.error('폴링 중 오류:', error);
        attempts++;
      }
    }
    
    console.log('⚠️ 결제 상태 확인 시간 초과');
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
    
    const paymentId = await initiatePayment();
    if (!paymentId) {
      setWaitingPayment(false);
      return;
    }
    
    const paymentAmount = amount <= 0 ? 110 : amount;

    try {
      console.log('🔄 카카오페이 결제 요청:', { STORE_ID, paymentId, amount, paymentAmount });
      
      await PortOne.requestPayment({
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

      toast.info("결제 상태 확인 중입니다...");
      const finalStatus = await pollPaymentStatus(paymentId);
      
      if (finalStatus === 'DONE') {
        toast.success("결제가 완료되었습니다!");
        if (onSuccess) onSuccess(paymentId);
      } else if (finalStatus === 'CANCELLED') {
        toast.warning("결제가 취소되었습니다.");
        if (onFail) onFail({
          code: 'CANCELLED',
          message: '결제가 취소되었습니다.',
          isCancelled: true
        });
      } else {
        toast.warning("결제가 완료되지 않았습니다.");
        if (onFail) onFail({
          code: finalStatus || 'TIMEOUT',
          message: '결제 확인 시간이 초과되었습니다.',
          isCancelled: false
        });
      }

    } catch (error: any) {
      console.error('🛑 결제창 표시 중 오류:', error);
      
      if (error.code === 'PO_SDK_CLOSE_WINDOW' || error.code === 'USER_CANCEL') {
        console.log('사용자가 결제창을 닫았거나 취소한 것으로 보임');
        
        toast.info("결제 상태 확인 중입니다...");
        const finalStatus = await pollPaymentStatus(paymentId);
        
        if (finalStatus === 'DONE') {
          toast.success("결제가 완료되었습니다!");
          if (onSuccess) onSuccess(paymentId);
        } else {
          toast.warning("결제가 취소되었습니다.");
          if (onFail) onFail({
            code: error.code,
            message: "사용자가 결제를 취소했습니다.",
            isCancelled: true
          });
        }
      } else {
        toast.info("결제 상태 확인 중입니다...");
        const finalStatus = await pollPaymentStatus(paymentId);
        
        if (finalStatus === 'DONE') {
          toast.success("결제가 완료되었습니다!");
          if (onSuccess) onSuccess(paymentId);
        } else {
          toast.error("결제 처리 중 오류가 발생했습니다.");
          if (onFail) onFail({
            code: error.code || 'ERROR',
            message: error.message || "결제 처리 중 오류가 발생했습니다.",
            isCancelled: false,
            error
          });
        }
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
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z" fill="currentColor"/>
            <path d="M12.5 7H11V13L16.2 16.2L17 14.9L12.5 12.2V7Z" fill="currentColor"/>
          </svg>
          <span>카카오페이로 결제하기</span>
        </div>
      )}
    </Button>
  );
} 