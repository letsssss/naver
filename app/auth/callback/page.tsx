'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('처리 중...')
  const [debugInfo, setDebugInfo] = useState<any>({})

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('🔄 [AUTH CALLBACK] OAuth 콜백 처리 시작')
        
        // URL 파라미터 전체 로깅
        const allParams = Object.fromEntries(searchParams.entries())
        console.log('📋 [AUTH CALLBACK] 모든 URL 파라미터:', allParams)
        setDebugInfo(prev => ({ ...prev, urlParams: allParams }))
        
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        const errorCode = searchParams.get('error_code')
        const state = searchParams.get('state')
        
        console.log('🔍 [AUTH CALLBACK] 파라미터 분석:')
        console.log('  - code:', code ? `${code.substring(0, 10)}...` : 'null')
        console.log('  - error:', error)
        console.log('  - error_description:', errorDescription)
        console.log('  - error_code:', errorCode)
        console.log('  - state:', state)
        
        setDebugInfo(prev => ({ 
          ...prev, 
          code: code ? `${code.substring(0, 10)}...` : null,
          error,
          errorDescription,
          errorCode,
          state
        }))

        // 에러가 있는 경우
        if (error) {
          console.error('❌ [AUTH CALLBACK] OAuth 에러 감지:', {
            error,
            errorDescription,
            errorCode
          })
          
          setStatus(`OAuth 에러: ${error}`)
          setDebugInfo(prev => ({ ...prev, status: 'error', errorDetails: { error, errorDescription, errorCode } }))
          
          // 에러 페이지로 리디렉션
          setTimeout(() => {
            router.push(`/auth/auth-code-error?error=${error}&description=${errorDescription || ''}`)
          }, 3000)
          return
        }

        // 코드가 없는 경우
        if (!code) {
          console.error('❌ [AUTH CALLBACK] Authorization code가 없습니다')
          setStatus('Authorization code가 없습니다')
          setDebugInfo(prev => ({ ...prev, status: 'no_code' }))
          
          setTimeout(() => {
            router.push('/auth/auth-code-error?error=no_code')
          }, 3000)
          return
        }

        console.log('✅ [AUTH CALLBACK] Authorization code 확인됨')
        setStatus('세션 생성 중...')
        
        const supabase = createBrowserClient()
        console.log('✅ [AUTH CALLBACK] Supabase 클라이언트 생성 완료')
        
        // 세션 교환 시도
        console.log('🔄 [AUTH CALLBACK] exchangeCodeForSession 호출 중...')
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
        
        console.log('📊 [AUTH CALLBACK] exchangeCodeForSession 결과:')
        console.log('  - data:', data)
        console.log('  - error:', sessionError)
        
        setDebugInfo(prev => ({ 
          ...prev, 
          sessionData: data ? 'session_created' : 'no_session',
          sessionError: sessionError?.message || null
        }))

        if (sessionError) {
          console.error('❌ [AUTH CALLBACK] 세션 생성 실패:', sessionError)
          setStatus(`세션 생성 실패: ${sessionError.message}`)
          setDebugInfo(prev => ({ ...prev, status: 'session_error' }))
          
          setTimeout(() => {
            router.push(`/auth/auth-code-error?error=session_error&description=${sessionError.message}`)
          }, 3000)
          return
        }

        if (data?.session) {
          console.log('✅ [AUTH CALLBACK] 세션 생성 성공')
          console.log('👤 [AUTH CALLBACK] 사용자 정보:', data.user?.email)
          setStatus('로그인 성공! 홈페이지로 이동 중...')
          setDebugInfo(prev => ({ 
            ...prev, 
            status: 'success',
            userEmail: data.user?.email,
            userId: data.user?.id
          }))
          
          // 홈페이지로 리디렉션
          setTimeout(() => {
            router.push('/')
          }, 1500)
        } else {
          console.error('❌ [AUTH CALLBACK] 세션이 생성되지 않았습니다')
          setStatus('세션이 생성되지 않았습니다')
          setDebugInfo(prev => ({ ...prev, status: 'no_session_created' }))
          
          setTimeout(() => {
            router.push('/auth/auth-code-error?error=no_session')
          }, 3000)
        }

      } catch (error) {
        console.error('❌ [AUTH CALLBACK] 예외 발생:', error)
        setStatus(`처리 중 오류 발생: ${(error as Error).message}`)
        setDebugInfo(prev => ({ 
          ...prev, 
          status: 'exception',
          exception: (error as Error).message
        }))
        
        setTimeout(() => {
          router.push(`/auth/auth-code-error?error=exception&description=${(error as Error).message}`)
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">카카오 로그인 처리 중</h2>
          <p className="text-gray-600 mb-4">{status}</p>
          
          {/* 디버깅 정보 표시 */}
          <details className="text-left text-sm bg-gray-100 p-3 rounded mt-4">
            <summary className="cursor-pointer font-medium">디버깅 정보</summary>
            <pre className="mt-2 text-xs overflow-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        </div>
      </div>
    </div>
  )
} 