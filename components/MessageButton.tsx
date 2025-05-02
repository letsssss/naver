'use client';

import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

interface MessageButtonProps {
  orderNumber?: string;
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  debug?: boolean;
}

export default function MessageButton({ 
  orderNumber, 
  onClick, 
  disabled = false, 
  isLoading = false,
  className = "text-sm flex items-center gap-2 border-2 border-pink-400 bg-pink-50 text-pink-700 hover:bg-pink-100 transition-colors font-medium",
  debug = false
}: MessageButtonProps) {
  // 읽지 않은 메시지 개수 가져오기
  const { unreadCount, isLoading: loadingMessages, error } = useUnreadMessages(orderNumber);
  
  // 디버깅: unreadCount 값 콘솔에 출력
  useEffect(() => {
    if (debug) {
      console.log(`🔔 MessageButton - orderNumber: ${orderNumber}`);
      console.log(`🔔 읽지 않은 메시지 수: ${unreadCount}`);
      console.log(`🔔 로딩 상태: ${loadingMessages}`);
      console.log(`🔔 에러: ${error?.message || 'none'}`);
      
      // localStorage에 있는 토큰 확인
      const token = localStorage.getItem('token') || 
                    localStorage.getItem('sb-jdubrjczdyqqtsppojgu-auth-token');
      console.log(`🔑 토큰 존재 여부: ${!!token}`);
      
      // 토큰이 있으면 앞부분만 표시
      if (token) {
        console.log(`🔑 토큰 미리보기: ${token.substring(0, 20)}...`);
      }
    }
  }, [orderNumber, unreadCount, loadingMessages, error, debug]);

  return (
    <Button
      variant="outline"
      className={className}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      <div className="relative">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      {isLoading ? "로딩 중..." : "메시지"}
      
      {/* NEW 배지 대신 숫자 배지를 사용하므로 이 부분은 주석 처리 */}
      {/* {unreadCount > 0 && (
        <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-md font-bold">
          NEW
        </span>
      )} */}
    </Button>
  );
} 