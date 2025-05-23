import { useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

interface NotificationData {
  id: number
  user_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export function useRealtime(userId: string | null, onNotification?: (notification: NotificationData) => void) {
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!userId) return

    const supabase = getSupabaseClient()

    const handleNotification = (payload: any) => {
      console.log('실시간 알림 수신:', payload)
      
      if (payload.eventType === 'INSERT' && payload.new) {
        const notification = payload.new as NotificationData
        
        // 현재 사용자에게 해당하는 알림인지 확인
        if (notification.user_id === userId) {
          onNotification?.(notification)
        }
      }
    }

    const setupRealtime = async () => {
      try {
        // 기존 채널이 있다면 정리
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current)
        }

        console.log('실시간 알림 채널 설정 시작...')

        try {
          // 커스텀 채널 생성 시도
          const customChannel = supabase.channel('custom-channel')
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'Notification' },
                handleNotification)
            .subscribe((status) => {
              console.log('커스텀 채널 상태:', status)
            })

          channelRef.current = customChannel
          console.log('커스텀 채널 설정 완료')

        } catch (customError) {
          console.warn('커스텀 채널 설정 실패, 기본 채널로 대체:', customError)

          // 기본 채널로 대체
          const defaultChannel = supabase.channel('notifications')
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'notifications' },
                handleNotification)
            .subscribe((status) => {
              console.log('기본 채널 상태:', status)
            })

          channelRef.current = defaultChannel
          console.log('기본 채널 설정 완료')
        }

      } catch (error) {
        console.error('실시간 채널 설정 오류:', error)
      }
    }

    setupRealtime()

    // 정리 함수
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [userId, onNotification])

  return null
} 