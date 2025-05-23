import { getSupabaseClient } from './supabase';
import { User } from '@supabase/supabase-js';

// 사용자 회원가입
export async function signUp(email: string, password: string, name: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: 'USER',
        },
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('회원가입 에러:', error);
    throw error;
  }
}

// 사용자 로그인
export async function signIn(email: string, password: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('로그인 에러:', error);
    throw error;
  }
}

// 사용자 로그아웃
export async function signOut() {
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error('로그아웃 에러:', error);
    throw error;
  }
}

// 현재 사용자 정보 가져오기
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = getSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('사용자 정보 가져오기 에러:', error);
    return null;
  }
}

// 사용자 정보 업데이트
export async function updateUserProfile(userData: { name?: string, profileImage?: string, phoneNumber?: string }) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.updateUser({
      data: userData
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('사용자 정보 업데이트 에러:', error);
    throw error;
  }
}

// 비밀번호 재설정 이메일 전송
export async function resetPassword(email: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('비밀번호 재설정 이메일 전송 에러:', error);
    throw error;
  }
}

// 비밀번호 변경
export async function changePassword(newPassword: string) {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('비밀번호 변경 에러:', error);
    throw error;
  }
}

// 세션 정보 가져오기
export async function getSession() {
  try {
    const supabase = getSupabaseClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    return { session, error: null };
  } catch (error) {
    console.error('세션 정보 조회 오류:', error);
    return { session: null, error };
  }
} 