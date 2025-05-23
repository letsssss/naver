import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth';

// OPTIONS 메서드 처리
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    console.log("🔍 [DEBUG] 인증 상태 디버깅 시작");
    
    const supabase = getSupabaseClient();
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || 'all';
    const reset = url.searchParams.get('reset') === 'true';
  
    // 개발 환경 인증 초기화 요청 처리
    if (reset && process.env.NODE_ENV === 'development') {
      // 응답 객체 생성
      const response = NextResponse.json({
        status: "success",
        message: "개발 환경 인증 상태가 초기화되었습니다.",
      });
      
      // 모든 인증 관련 쿠키 제거
      response.cookies.set("auth-token", "", {
        expires: new Date(0), // 쿠키 즉시 만료
        path: "/",
      });
      
      response.cookies.set("auth-status", "", {
        expires: new Date(0),
        path: "/",
      });
      
      response.cookies.set("token", "", {
        expires: new Date(0),
        path: "/",
      });
      
      console.log("개발 환경 인증 상태 초기화 완료");
      return response;
    }
  
    // 환경 정보
    const env = {
      NODE_ENV: process.env.NODE_ENV || 'unknown',
      SERVER_TIME: new Date().toISOString(),
    };
    
    // 쿠키 정보 수집 (요청 헤더에서 쿠키 가져오기)
    const cookieHeader = request.headers.get('cookie') || '';
    const cookieInfo = cookieHeader.split(';').map(cookie => {
      const [name, value] = cookie.trim().split('=');
      return {
        name,
        value: name.includes('token') 
          ? `${decodeURIComponent(value || '').substring(0, 10)}...` 
          : `length:${value?.length || 0}`,
      };
    }).filter(c => c.name); // 빈 이름 제거
    
    // Supabase 세션 정보
    let supabaseSession = null;
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        supabaseSession = {
          userId: data.session.user.id,
          email: data.session.user.email,
          lastSignIn: data.session.user.last_sign_in_at,
          expiresAt: data.session.expires_at ? 
            new Date(data.session.expires_at * 1000).toISOString() : null,
        };
      }
    } catch (error) {
      supabaseSession = { error: "Supabase 세션 조회 실패" };
    }
    
    // 인증 관련 클라이언트 스크립트 (클라이언트에서 실행할 JavaScript)
    const clientScript = `
    (function() {
      // 로컬 인증 정보 검색
      const auth = {
        localStorage: {},
        sessionStorage: {},
        cookies: document.cookie.split('; ').map(c => {
          const [name, value] = c.split('=');
          return { name, value: name.includes('token') ? \`\${decodeURIComponent(value).substring(0, 10)}...\` : \`length:\${value.length}\` };
        }),
        tokenInfo: {}
      };
      
      // localStorage 검사
      try {
        auth.localStorage.token = localStorage.getItem('token') ? 
          \`\${localStorage.getItem('token').substring(0, 10)}...\` : null;
        
        // 토큰 종류 분석
        const token = localStorage.getItem('token');
        if (token) {
          auth.tokenInfo.isTestToken = token === 'test-token-dev' || token === 'dev-test-token';
          auth.tokenInfo.type = auth.tokenInfo.isTestToken ? '테스트 토큰' : '실제 토큰';
          
          // JWT 토큰인지 확인
          try {
            if (token.split('.').length === 3) {
              auth.tokenInfo.isJWT = true;
              // JWT 페이로드 디코딩 (중간 부분)
              const payload = JSON.parse(atob(token.split('.')[1]));
              auth.tokenInfo.payload = {
                exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
                sub: payload.sub,
                provider: payload.provider || '알 수 없음'
              };
            }
          } catch (e) {
            auth.tokenInfo.jwtError = e.message;
          }
        }
        
        auth.localStorage.user = localStorage.getItem('user') ? 
          JSON.parse(localStorage.getItem('user')) : null;
        
        // 사용자 정보 소스 확인
        if (auth.localStorage.user) {
          if (auth.localStorage.user.name === '테스트 사용자' || 
              auth.localStorage.user.email === 'test@example.com') {
            auth.userInfo = {
              source: '테스트 사용자',
              isReal: false
            };
          } else if (auth.localStorage.user.email && 
                    auth.localStorage.user.email.includes('kakao')) {
            auth.userInfo = {
              source: '카카오 로그인',
              isReal: true
            };
          } else {
            auth.userInfo = {
              source: '일반 로그인',
              isReal: true
            };
          }
        }
      } catch (e) {
        auth.localStorage.error = e.message;
      }
      
      // sessionStorage 검사
      try {
        auth.sessionStorage.token = sessionStorage.getItem('token') ? 
          \`\${sessionStorage.getItem('token').substring(0, 10)}...\` : null;
        auth.sessionStorage.user = sessionStorage.getItem('user') ? 
          JSON.parse(sessionStorage.getItem('user')) : null;
      } catch (e) {
        auth.sessionStorage.error = e.message;
      }
      
      // 결과 전송
      return JSON.stringify(auth);
    })()
    `;
    
    // 응답 데이터
    const responseData: any = {
      env,
      server: {
        cookies: cookieInfo,
      },
      supabase: supabaseSession,
    };
    
    // 클라이언트 스크립트를 포함한 HTML 응답
    if (mode === 'html') {
      const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>인증 디버깅</title>
        <style>
          body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          pre { background: #f5f5f5; padding: 15px; overflow: auto; border-radius: 5px; }
          h1, h2 { color: #333; }
          .card { border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
          button { background: #0061ff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; }
          button:hover { background: #0052d6; }
          .real-token { color: green; font-weight: bold; }
          .test-token { color: orange; font-weight: bold; }
          .info-box { margin-top: 10px; padding: 10px; background: #e6f7ff; border-radius: 5px; border-left: 4px solid #1890ff; }
        </style>
      </head>
      <body>
        <h1>인증 상태 디버깅</h1>
        
        <div class="card">
          <h2>환경 정보</h2>
          <pre id="env">${JSON.stringify(env, null, 2)}</pre>
          ${env.NODE_ENV === 'development' ? `
          <button id="resetAuth">개발 환경 인증 상태 초기화</button>
          ` : ''}
        </div>
        
        <div class="card">
          <h2>서버 쿠키</h2>
          <pre id="serverCookies">${JSON.stringify(cookieInfo, null, 2)}</pre>
        </div>
        
        <div class="card">
          <h2>Supabase 세션</h2>
          <pre id="supabaseSession">${JSON.stringify(supabaseSession, null, 2)}</pre>
        </div>
        
        <div class="card">
          <h2>브라우저 저장소</h2>
          <pre id="clientStorage">로딩 중...</pre>
          <div id="tokenInfo" class="info-box" style="display:none">
            <h3>토큰 정보</h3>
            <div id="tokenInfoContent"></div>
          </div>
        </div>
        
        <script>
          // 클라이언트 저장소 데이터 표시
          const clientData = ${clientScript};
          document.getElementById('clientStorage').textContent = 
            JSON.stringify(clientData, null, 2);
          
          // 토큰 정보 표시
          if (clientData.tokenInfo && Object.keys(clientData.tokenInfo).length > 0) {
            const tokenInfoDiv = document.getElementById('tokenInfo');
            const tokenInfoContent = document.getElementById('tokenInfoContent');
            
            tokenInfoDiv.style.display = 'block';
            let html = '';
            
            if (clientData.tokenInfo.isTestToken) {
              html += '<p><span class="test-token">테스트 토큰</span>이 사용 중입니다.</p>';
              html += '<p>카카오 로그인을 테스트하려면 먼저 아래의 "개발 환경 인증 상태 초기화" 버튼을 클릭한 후 로그인하세요.</p>';
            } else if (clientData.tokenInfo.type) {
              html += \`<p><span class="real-token">\${clientData.tokenInfo.type}</span>이 사용 중입니다.</p>\`;
            }
            
            if (clientData.userInfo) {
              html += \`<p>현재 로그인된 사용자: <strong>\${clientData.userInfo.source}</strong></p>\`;
            }
            
            tokenInfoContent.innerHTML = html;
          }
            
          // 개발 환경에서만 초기화 버튼 활성화
          const resetButton = document.getElementById('resetAuth');
          if (resetButton) {
            resetButton.addEventListener('click', async () => {
              if (confirm('정말 인증 상태를 초기화하시겠습니까?\\n로컬 스토리지와 쿠키가 모두 제거됩니다.')) {
                // 쿠키 및 로컬 스토리지 초기화
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                document.cookie = 'auth-status=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                document.cookie = 'token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                
                // 서버에도 초기화 요청
                await fetch('/api/auth/debug?reset=true');
                
                // 페이지 새로고침
                location.reload();
              }
            });
          }
        </script>
      </body>
      </html>
      `;
      
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }
    
    // JSON 응답
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error("디버깅 정보 수집 중 오류:", error);
    return NextResponse.json({ 
      error: "디버깅 정보 수집 중 오류가 발생했습니다.",
      message: error instanceof Error ? error.message : "알 수 없는 오류",
    }, { status: 500 });
  }
} 