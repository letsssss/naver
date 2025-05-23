"use client"

import { useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase"

export default function SyncUser() {
  useEffect(() => {
    const sync = async () => {
      try {
        const supabase = getSupabaseClient()
        const { data } = await supabase.auth.getUser()
        const user = data.user

        if (!user) {
          console.log("🔍 로그인한 사용자가 없음")
          return
        }

        console.log("✅ 현재 로그인된 유저:", user)

        const { data: existingUser, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single()

        if (fetchError && fetchError.code !== "PGRST116") {
          console.error("❌ 사용자 조회 중 오류:", fetchError)
          return
        }

        if (!existingUser) {
          console.log("✅ users 테이블에 유저 자동 등록됨")
          const { error: insertError } = await supabase
            .from("users")
            .insert({
              id: user.id,
              email: user.email!,
              name: user.user_metadata?.name || user.email?.split("@")[0] || "Unknown",
              profile_image: user.user_metadata?.avatar_url || null,
              role: "USER"
            })

          if (insertError) {
            console.error("❌ 사용자 등록 중 오류:", insertError)
          } else {
            console.log("✅ User created successfully")
          }
        } else {
          console.log("✅ users 테이블에 이미 유저 있음")
        }
      } catch (error) {
        console.error("❌ 사용자 동기화 중 예외 발생:", error)
      }
    }

    sync()
  }, [])

  return null
} 