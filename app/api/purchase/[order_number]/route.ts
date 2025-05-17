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

  // 명시적으로 관계 지정해서 join (중복 관계 오류 해결)
  const { data, error } = await supabase
    .from("purchases")
    .select("*, post:posts(*), buyer:users!purchases_buyer_id_fkey(*)")
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
    const { status: updatedStatus } = body

    if (!updatedStatus) {
      return NextResponse.json({ error: "상태가 제공되지 않았습니다." }, { status: 400 })
    }

    // 유효한 상태값 검증
    const validStatuses = ['PENDING', 'PROCESSING', 'COMPLETED', 'CONFIRMED', 'CANCELLED']
    if (!validStatuses.includes(updatedStatus)) {
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
    if (purchase.status === updatedStatus) {
      return NextResponse.json({ 
        message: "상태가 이미 동일합니다.",
        purchase
      })
    }

    // 상태 업데이트
    const { data: updatedPurchase, error: updateError } = await supabase
      .from("purchases")
      .update({ 
        status: updatedStatus,
        updated_at: new Date().toISOString()
      })
      .eq("order_number", order_number)
      .select()
      .single()

    if (updateError) {
      console.error("상태 업데이트 오류:", updateError)
      return NextResponse.json({ error: "상태 업데이트에 실패했습니다." }, { status: 500 })
    }

    // 구매 확정(CONFIRMED) 상태일 때 수수료 정보 업데이트
    if (updatedStatus === 'CONFIRMED') {
      try {
        console.log("\n===== 간소화된 수수료 계산 시작 (테스트) =====");
        console.log("✅ 구매확정 요청 → 수수료 계산 시작");
        
        // 1. purchaseId 검증 (필수)
        const purchaseId = purchase.id;
        if (!purchaseId) {
          console.error("❌ purchaseId가 없습니다:", purchaseId);
          throw new Error("purchaseId 없음");
        }
        
        console.log("📌 purchaseId:", purchaseId);
        console.log("📌 order_number:", order_number);
        
        // 2. 단순화된 데이터 조회
        const { data: purchaseData, error: fetchError } = await supabase
          .from('purchases')
          .select('id, total_price')
          .eq('id', purchaseId)
          .single();
        
        if (fetchError) {
          console.error("❌ 데이터 조회 실패:", fetchError);
          throw new Error("데이터 조회 실패");
        }
        
        if (!purchaseData) {
          console.error("❌ 조회 결과 없음");
          throw new Error("조회 결과 없음");
        }
        
        // 3. 간단한 수수료 계산
        const totalPrice = purchaseData.total_price || 0;
        const feeAmount = Math.floor(totalPrice * 0.1);
        
        console.log("📌 총 가격(total_price):", totalPrice);
        console.log("📌 계산된 수수료(fee_amount):", feeAmount);
        
        if (totalPrice <= 0) {
          console.warn("⚠️ 가격이 0 이하입니다:", totalPrice);
        }
        
        // 4. 수수료 정보 업데이트
        const feeDueAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
        
        const { error: updateError } = await supabase
          .from('purchases')
          .update({
            fee_amount: feeAmount,
            fee_due_at: feeDueAt.toISOString(),
            update_test: "수수료계산테스트_" + new Date().toISOString().substring(0, 19)
          })
          .eq('id', purchaseId);
        
        if (updateError) {
          console.error("❌ 수수료 업데이트 실패:", updateError);
          throw new Error("수수료 업데이트 실패");
        }
        
        // 5. 업데이트 확인
        const { data: verifyResult } = await supabase
          .from('purchases')
          .select('id, fee_amount, fee_due_at, update_test')
          .eq('id', purchaseId)
          .single();
        
        console.log("✅ 수수료 업데이트 성공:", verifyResult);
        console.log("===== 수수료 계산 완료 =====\n");
        
      } catch (error) {
        console.error("❌❌❌ 수수료 처리 중 오류:", error);
        console.log("🔍 디버깅 정보:", {
          purchaseId: purchase?.id,
          totalPrice: purchase?.total_price,
          order_number
        });
      }
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
