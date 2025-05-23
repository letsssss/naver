'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { createBrowserClient } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleCallback = async () => {
      console.log('🔄 [CLIENT CALLBACK] OAuth 콜백 처리 시작')
      
      const supabase = createBrowserClient()
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const error = url.searchParams.get('error')

      console.log('📝 [CLIENT CALLBACK] Code:', code ? '존재함' : '없음')
      console.log('📝 [CLIENT CALLBACK] Error:', error)

      if (error) {
        console.error('❌ [CLIENT CALLBACK] URL 오류:', error)
        router.push('/auth/auth-code-error')
        return
      }

      if (code) {
        console.log('🔑 [CLIENT CALLBACK] 코드를 세션으로 교환 중...')
        
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('❌ [CLIENT CALLBACK] 세션 교환 실패:', exchangeError.message)
            router.push('/auth/auth-code-error')
          } else {
            console.log('✅ [CLIENT CALLBACK] 세션 교환 성공')
            console.log('👤 [CLIENT CALLBACK] 사용자 ID:', data.session?.user.id)
            console.log('📧 [CLIENT CALLBACK] 이메일:', data.session?.user.email)
            router.push('/')
          }
        } catch (err) {
          console.error('❌ [CLIENT CALLBACK] 예외 발생:', err)
          router.push('/auth/auth-code-error')
        }
      } else {
        console.error('❌ [CLIENT CALLBACK] 인증 코드가 없음')
        router.push('/auth/auth-code-error')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">🔄 로그인 처리 중...</p>
      </div>
    </div>
  )
} 