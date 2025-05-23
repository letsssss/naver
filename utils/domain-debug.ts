/**
 * 도메인 디버깅을 위한 유틸리티 함수들
 * PKCE 플로우에서 localStorage 손실 문제 진단용
 */

export interface DomainInfo {
  href: string;
  protocol: string;
  host: string;
  hostname: string;
  pathname: string;
  origin: string;
  port: string;
}

export interface DomainComparison {
  current: DomainInfo;
  target: DomainInfo;
  isMatch: boolean;
  issues: string[];
}

/**
 * 현재 페이지의 도메인 정보를 가져옵니다
 */
export function getCurrentDomainInfo(): DomainInfo {
  if (typeof window === 'undefined') {
    throw new Error('이 함수는 브라우저 환경에서만 사용할 수 있습니다.');
  }

  return {
    href: window.location.href,
    protocol: window.location.protocol,
    host: window.location.host,
    hostname: window.location.hostname,
    pathname: window.location.pathname,
    origin: window.location.origin,
    port: window.location.port
  };
}

/**
 * URL 문자열에서 도메인 정보를 추출합니다
 */
export function parseDomainInfo(url: string): DomainInfo {
  const urlObj = new URL(url);
  
  return {
    href: urlObj.href,
    protocol: urlObj.protocol,
    host: urlObj.host,
    hostname: urlObj.hostname,
    pathname: urlObj.pathname,
    origin: urlObj.origin,
    port: urlObj.port
  };
}

/**
 * 두 도메인을 비교하고 차이점을 분석합니다
 */
export function compareDomains(currentUrl: string, targetUrl: string): DomainComparison {
  const current = typeof window !== 'undefined' 
    ? getCurrentDomainInfo() 
    : parseDomainInfo(currentUrl);
  const target = parseDomainInfo(targetUrl);
  
  const issues: string[] = [];
  
  // 프로토콜 비교
  if (current.protocol !== target.protocol) {
    issues.push(`프로토콜 불일치: ${current.protocol} vs ${target.protocol}`);
  }
  
  // 호스트명 비교
  if (current.hostname !== target.hostname) {
    issues.push(`호스트명 불일치: ${current.hostname} vs ${target.hostname}`);
  }
  
  // 포트 비교
  if (current.port !== target.port) {
    issues.push(`포트 불일치: ${current.port || '기본'} vs ${target.port || '기본'}`);
  }
  
  const isMatch = current.origin === target.origin;
  
  return {
    current,
    target,
    isMatch,
    issues
  };
}

/**
 * 도메인 정보를 콘솔에 출력합니다 (디버깅용)
 */
export function logDomainInfo(prefix: string = ''): void {
  if (typeof window === 'undefined') {
    console.warn('브라우저 환경이 아니므로 도메인 정보를 출력할 수 없습니다.');
    return;
  }

  const info = getCurrentDomainInfo();
  
  console.log(`🔍 ${prefix} 현재 도메인 정보:`);
  console.log(`🌐 ${prefix} 전체 URL:`, info.href);
  console.log(`🔑 ${prefix} 프로토콜:`, info.protocol);
  console.log(`📍 ${prefix} 호스트 (도메인:포트):`, info.host);
  console.log(`🏠 ${prefix} 호스트명 (도메인):`, info.hostname);
  console.log(`📄 ${prefix} 경로:`, info.pathname);
  console.log(`🔗 ${prefix} Origin:`, info.origin);
  if (info.port) {
    console.log(`🚪 ${prefix} 포트:`, info.port);
  }
}

/**
 * 도메인 비교 결과를 콘솔에 출력합니다 (디버깅용)
 */
export function logDomainComparison(targetUrl: string, prefix: string = ''): DomainComparison {
  const comparison = compareDomains('', targetUrl);
  
  console.log(`🔄 ${prefix} 도메인 비교:`);
  console.log(`  📤 ${prefix} 현재 Origin:`, comparison.current.origin);
  console.log(`  📥 ${prefix} 대상 Origin:`, comparison.target.origin);
  console.log(`  ✅ ${prefix} 도메인 일치:`, comparison.isMatch ? "예" : "❌ 불일치!");
  
  if (!comparison.isMatch && comparison.issues.length > 0) {
    console.warn(`⚠️ ${prefix} 도메인 불일치 문제:`);
    comparison.issues.forEach(issue => {
      console.warn(`  - ${issue}`);
    });
    console.warn(`⚠️ ${prefix} localStorage가 리디렉션 중 손실될 수 있습니다!`);
  }
  
  return comparison;
}

/**
 * 개발 환경에 맞는 redirectTo URL을 생성합니다
 */
export function getRedirectUrl(prodUrl: string, devPath: string = '/auth/callback'): string {
  if (typeof window === 'undefined') {
    return prodUrl; // 서버사이드에서는 프로덕션 URL 사용
  }
  
  const isDev = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' ||
                window.location.hostname.includes('.local');
  
  if (isDev) {
    return `${window.location.origin}${devPath}`;
  }
  
  return prodUrl;
} 