# 🔍 Code Verifier 디버깅 가이드

## 📋 목표
`code_verifier`가 생성되어 localStorage에 저장되었는지 확인하고, 언제 삭제되거나 접근 불가 상태가 되었는지 추적합니다.

## 🔧 추가된 디버깅 로그 단계

### ✅ 1단계: signInWithOAuth() 호출 직전
```typescript
console.log("🚀 [OAuth 시작] signInWithOAuth 호출 직전");
console.log("📦 [OAuth 시작 직전] localStorage 상태:", JSON.stringify(localStorage));
```

**확인 사항:**
- localStorage에 기존 `code_verifier`가 있는지
- 다른 supabase 관련 키들의 상태

### ✅ 2단계: signInWithOAuth() 호출 직후  
```typescript
console.log("✅ [OAuth 결과] data:", data);
console.log("❗ [OAuth 결과] error:", error);
console.log("📦 [OAuth 직후] localStorage 상태:", JSON.stringify(localStorage));
```

**확인 사항:**
- `code_verifier`가 새로 생성되었는지
- Supabase가 PKCE 플로우를 시작했는지

### ✅ 3단계: waitForCodeVerifierAndRedirect() 함수 내부
```typescript
while (waited < maxWait) {
  const verifier = localStorage.getItem('supabase.auth.code_verifier');
  console.log(`🕒 [PKCE 체크] ${waited}ms 경과 - code_verifier:`, verifier);
  // ...
}
```

**확인 사항:**
- `code_verifier`가 언제 생성되는지 (몇 ms 후)
- 생성되지 않으면 타임아웃까지 대기

### ✅ 4단계: 콜백 페이지(/auth/callback) 진입 직후
```typescript
console.log("📥 [Callback] 페이지 진입");
console.log("📦 [Callback] localStorage 전체 키:", Object.keys(localStorage));
console.log("📦 [Callback] code_verifier 값:", localStorage.getItem('supabase.auth.code_verifier'));
```

**확인 사항:**
- 리디렉션 후에도 `code_verifier`가 보존되었는지
- 브라우저 설정이나 도메인 문제로 localStorage가 초기화되었는지

## 📌 분석 시나리오

### 🟢 정상 케이스
1. **1단계**: `code_verifier` 없음 (정상)
2. **2단계**: `code_verifier` 생성됨 ✅
3. **3단계**: 100-200ms 내에 감지됨 ✅  
4. **4단계**: 콜백 페이지에서도 존재함 ✅

### 🔴 문제 케이스 A: Supabase 내부 저장 실패
1. **1단계**: `code_verifier` 없음
2. **2단계**: `code_verifier` 여전히 없음 ❌
3. **3단계**: 3초 타임아웃까지 없음 ❌
4. **4단계**: 당연히 없음 ❌

**원인**: Supabase SDK 버그 또는 브라우저 호환성 문제

### 🔴 문제 케이스 B: 리디렉션 중 localStorage 손실
1. **1단계**: `code_verifier` 없음
2. **2단계**: `code_verifier` 생성됨 ✅
3. **3단계**: 정상 감지됨 ✅
4. **4단계**: 콜백 페이지에서 사라짐 ❌

**원인**: 
- 브라우저 설정 (쿠키/localStorage 차단)
- 도메인 불일치 (localhost vs 실제 도메인)
- 시크릿 모드 또는 보안 정책

### 🔴 문제 케이스 C: 너무 빠른 리디렉션
1. **1단계**: `code_verifier` 없음
2. **2단계**: `code_verifier` 없음 (아직)
3. **3단계**: 50ms 후 생성되지만 이미 리디렉션됨 ❌
4. **4단계**: 없음 ❌

**원인**: 네트워크 지연 또는 Supabase 비동기 처리 지연

## 🛠️ 테스트 방법

1. **브라우저 개발자 도구** 콘솔 열기
2. **카카오 로그인** 버튼 클릭
3. **로그 순서** 확인:
   ```
   🚀 [OAuth 시작] signInWithOAuth 호출 직전
   📦 [OAuth 시작 직전] localStorage 상태: {...}
   ✅ [OAuth 결과] data: {...}
   📦 [OAuth 직후] localStorage 상태: {...}
   🕒 [PKCE 체크] 0ms 경과 - code_verifier: null
   🕒 [PKCE 체크] 100ms 경과 - code_verifier: "abc123..."
   ✅ [PKCE] code_verifier 최종 확인됨: abc123...
   📥 [Callback] 페이지 진입
   📦 [Callback] code_verifier 값: abc123...
   ```

## 🔧 문제 해결 방법

### Case A: Supabase 저장 실패
- Supabase 클라이언트 재생성
- 브라우저 새로고침 후 재시도
- 다른 브라우저에서 테스트

### Case B: localStorage 손실  
- 브라우저 설정 확인 (쿠키/localStorage 허용)
- 시크릿 모드 해제
- 도메인 일치 확인

### Case C: 타이밍 문제
- `maxWait` 시간 증가 (3초 → 5초)
- `interval` 감소 (100ms → 50ms)
- 네트워크 상태 확인

## 📊 로그 분석 체크리스트

- [ ] 1단계: OAuth 시작 전 상태 확인
- [ ] 2단계: OAuth 직후 code_verifier 생성 여부
- [ ] 3단계: 대기 중 code_verifier 감지 시점
- [ ] 4단계: 콜백 페이지에서 code_verifier 보존 여부
- [ ] 에러 메시지나 예외 발생 여부
- [ ] 네트워크 탭에서 OAuth 요청/응답 확인 