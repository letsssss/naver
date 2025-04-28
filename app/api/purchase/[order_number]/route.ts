import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase"

export async function GET(
  req: Request,
  { params }: { params: { order_number: string } }
) {
  const { order_number } = params
  
  if (!order_number) {
    return NextResponse.json({ error: "주문번호가 제공되지 않았습니다." }, { status: 400 })
  }
  
  // 환경변수 로그
  console.log('✅ SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 10))

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from("purchases")
    .select("*")
    .eq("order_number", order_number)
    .single()

  // 쿼리 결과 로그
  console.log('🧪 조회된 데이터:', data)
  console.log('❌ 에러 발생:', error)

  if (error || !data) {
    console.error("주문번호 조회 오류:", error || "데이터 없음")
    return NextResponse.json({ error: "해당 주문번호를 찾을 수 없습니다." }, { status: 404 })
  }
  
  return NextResponse.json(data)
} 

export async function POST(
  req: Request,
  { params }: { params: { order_number: string } }
) {
  const { order_number } = params
  
  if (!order_number) {
    return NextResponse.json({ error: "주문번호가 제공되지 않았습니다." }, { status: 400 })
  }

  try {
    const body = await req.json()
    const { status } = body

    if (!status) {
      return NextResponse.json({ error: "상태가 제공되지 않았습니다." }, { status: 400 })
    }

    // 유효한 상태값 검증
    const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'CONFIRMED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "유효하지 않은 상태값입니다." }, { status: 400 })
    }

    const supabase = createAdminClient()
    
    // 주문 정보 조회
    const { data: purchase, error: queryError } = await supabase
      .from("purchases")
      .select("*")
      .eq("order_number", order_number)
      .single()

    if (queryError || !purchase) {
      console.error("주문 조회 오류:", queryError)
      return NextResponse.json({ error: "해당 주문을 찾을 수 없습니다." }, { status: 404 })
    }

    // 현재 상태와 동일한 상태로 업데이트하려는 경우
    if (purchase.status === status) {
      return NextResponse.json({ 
        message: "상태가 이미 동일합니다.",
        purchase
      })
    }

    // 상태 업데이트
    const { data: updatedPurchase, error: updateError } = await supabase
      .from("purchases")
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq("order_number", order_number)
      .select()
      .single()

    if (updateError) {
      console.error("상태 업데이트 오류:", updateError)
      return NextResponse.json({ error: "상태 업데이트에 실패했습니다." }, { status: 500 })
    }

    return NextResponse.json({ 
      message: "상태가 성공적으로 업데이트되었습니다.",
      purchase: updatedPurchase
    })

  } catch (error) {
    console.error("요청 처리 오류:", error)
    return NextResponse.json({ error: "요청 처리 중 오류가 발생했습니다." }, { status: 500 })
  }
} 
