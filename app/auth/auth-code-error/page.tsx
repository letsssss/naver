export default function AuthCodeErrorPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center p-8 max-w-md mx-auto">
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">로그인 실패</h1>
          <p className="text-gray-600 mb-6">
            카카오 로그인 중 오류가 발생했습니다.<br />
            다시 시도해 주세요.
          </p>
        </div>
        
        <div className="space-y-3">
          <a 
            href="/login" 
            className="block w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            다시 로그인하기
          </a>
          <a 
            href="/" 
            className="block w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-md font-medium hover:bg-gray-200 transition-colors"
          >
            홈으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
} 