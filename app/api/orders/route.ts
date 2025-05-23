import { NextRequest, NextResponse } from "next/server"
import { getSupabaseClient } from "@/lib/supabase"
import { createUniqueOrderNumber } from "@/utils/orderNumber"
import { verifyAccessToken, getTokenFromHeaders } from "@/lib/auth"

// Prisma 클라이언트 인스턴스 생성
// Prisma 클라이언트 제거됨, Supabase 사용

// 임시 주문 데이터베이스
const orders = [
  { id: 1, userId: 1, ticketId: 1, quantity: 2, totalPrice: 220000, status: "pending" },
  { id: 2, userId: 2, ticketId: 2, quantity: 1, totalPrice: 99000, status: "completed" },
]

export async function GET(request: NextRequest) {
  try {
    // 토큰 검증
    const token = getTokenFromHeaders(request.headers)
    if (!token) {
      return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 401 })
    }

    const data = verifyAccessToken(token)
    if (!data) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 })
    }

    const supabase = getSupabaseClient()

    // 사용자의 주문 목록 조회
    const { data: orders, error } = await supabase
      .from("purchases")
      .select(`
        *,
        product:products (*)
      `)
      .eq("buyer_id", data.userId)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("주문 목록 조회 오류:", error)
      return NextResponse.json({ error: "주문 목록 조회 중 오류가 발생했습니다." }, { status: 500 })
    }

    return NextResponse.json({
      orders: orders || [],
    })
  } catch (error) {
    console.error("주문 목록 조회 오류:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 토큰 검증
    const token = getTokenFromHeaders(request.headers)
    if (!token) {
      return NextResponse.json({ error: "인증 토큰이 필요합니다." }, { status: 401 })
    }

    const data = verifyAccessToken(token)
    if (!data) {
      return NextResponse.json({ error: "유효하지 않은 토큰입니다." }, { status: 401 })
    }

    const { productId, quantity = 1 } = await request.json()

    if (!productId) {
      return NextResponse.json({ error: "상품 ID가 필요합니다." }, { status: 400 })
    }

    const supabase = getSupabaseClient()

    // 주문 번호 생성
    const orderNumber = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    // Supabase를 사용하여 데이터베이스에 주문 생성
    const { data: newOrder, error } = await supabase
      .from("purchases")
      .insert({
        order_number: orderNumber,
        buyer_id: data.userId,
        product_id: productId,
        quantity,
        status: "pending",
        total_amount: 0, // 실제로는 상품 가격 * 수량으로 계산해야 함
      })
      .select()
      .single()

    if (error) {
      console.error("주문 생성 오류:", error)
      return NextResponse.json({ error: "주문 생성 중 오류가 발생했습니다." }, { status: 500 })
    }

    return NextResponse.json({
      message: "주문이 성공적으로 생성되었습니다.",
      order: newOrder,
    })
  } catch (error) {
    console.error("주문 처리 오류:", error)
    return NextResponse.json({ error: "서버 오류가 발생했습니다." }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const updatedOrder = await request.json()
  const index = orders.findIndex((o) => o.id === updatedOrder.id)
  if (index !== -1) {
    orders[index] = { ...orders[index], ...updatedOrder }
    return NextResponse.json(orders[index])
  }
  return NextResponse.json({ error: "Order not found" }, { status: 404 })
}

export async function DELETE(request: Request) {
  const { id } = await request.json()
  const index = orders.findIndex((o) => o.id === id)
  if (index !== -1) {
    orders.splice(index, 1)
    return NextResponse.json({ message: "Order deleted successfully" })
  }
  return NextResponse.json({ error: "Order not found" }, { status: 404 })
}

