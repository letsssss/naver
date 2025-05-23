// CommonJS 모듈에서 dotenv 사용
require('dotenv').config({ path: '.env.local' }); // 환경변수 로딩

// 환경 변수 디버깅
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');

// 환경 변수가 없으면 로컬 개발용 하드코딩된 값 사용
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://jdubrjcqjqvjqjqjqjqj.supabase.co';
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkdWJyamNxanF2anFqcWpxanFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0MjU0NzQsImV4cCI6MjA1MDAwMTQ3NH0.dummy-key-for-local-development';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: true,
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    KAKAO_REST_API_KEY: process.env.KAKAO_REST_API_KEY,
    KAKAO_ADMIN_KEY: process.env.KAKAO_ADMIN_KEY,
    KAKAO_JAVASCRIPT_KEY: process.env.KAKAO_JAVASCRIPT_KEY,
    KAKAO_NATIVE_APP_KEY: process.env.KAKAO_NATIVE_APP_KEY,
    KAKAO_CLIENT_SECRET: process.env.KAKAO_CLIENT_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    INICIS_MID: process.env.INICIS_MID,
    INICIS_SIGNKEY: process.env.INICIS_SIGNKEY,
    INICIS_API_KEY: process.env.INICIS_API_KEY,
    INICIS_IV: process.env.INICIS_IV,
    NEXT_PUBLIC_INICIS_MID: process.env.NEXT_PUBLIC_INICIS_MID,
    NEXT_PUBLIC_INICIS_API_KEY: process.env.NEXT_PUBLIC_INICIS_API_KEY,
    NEXT_PUBLIC_KAKAO_REST_API_KEY: process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY,
    NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY: process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY,
    NEXT_PUBLIC_KAKAO_NATIVE_APP_KEY: process.env.NEXT_PUBLIC_KAKAO_NATIVE_APP_KEY,
    NEXT_PUBLIC_KAKAO_CLIENT_SECRET: process.env.NEXT_PUBLIC_KAKAO_CLIENT_SECRET,
    NEXT_PUBLIC_KAKAO_ADMIN_KEY: process.env.NEXT_PUBLIC_KAKAO_ADMIN_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_VERCEL_URL: process.env.NEXT_PUBLIC_VERCEL_URL,
    NEXT_PUBLIC_VERCEL_ENV: process.env.NEXT_PUBLIC_VERCEL_ENV,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_MESSAGE,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_NAME,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_AUTHOR_LOGIN,
    NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG: process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG,
    NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER: process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER,
    NEXT_PUBLIC_VERCEL_GIT_REPO_ID: process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_ID,
    NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF,
    NEXT_PUBLIC_VERCEL_BRANCH_URL: process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL,
    NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
  },
};

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return;
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      };
    } else {
      nextConfig[key] = userConfig[key];
    }
  }
}

// userConfig 가져오기 시도
let userConfig = undefined;
try {
  userConfig = require('./v0-user-next.config');
} catch (e) {
  // ignore error
  console.log('사용자 설정 로드 실패 (무시됨):', e.message);
}

if (userConfig) {
  mergeConfig(nextConfig, userConfig);
}

module.exports = nextConfig; 