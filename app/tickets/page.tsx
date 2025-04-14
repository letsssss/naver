"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const categories = [
  { name: "콘서트", href: "/category/콘서트" },
  { name: "뮤지컬/연극", href: "/category/뮤지컬-연극" },
  { name: "스포츠", href: "/category/스포츠" },
  { name: "전시/행사", href: "/category/전시-행사" },
]

// 티켓 인터페이스 정의
interface Ticket {
  id: number;
  artist: string;
  date: string;
  venue: string;
}

// 구매 가능한 티켓 인터페이스
interface AvailableTicket {
  id: number;
  title: string;
  artist: string;
  date: string;
  time: string;
  venue: string;
  price: string;
  image: string;
  status: string;
}

export default function TicketsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [popularTickets, setPopularTickets] = useState<Ticket[]>([])
  const [availableTickets, setAvailableTickets] = useState<AvailableTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(true)
  const router = useRouter()
  const { user, isLoading: authLoading, logout } = useAuth()

  useEffect(() => {
    if (user && !isLoading && !authLoading) {
      console.log("티켓 구매/판매 페이지: 로그인된 사용자:", user.name);
      const welcomeShown = sessionStorage.getItem('welcome_shown_tickets');
      if (!welcomeShown) {
        toast.success(`${user.name}님 환영합니다!`);
        sessionStorage.setItem('welcome_shown_tickets', 'true');
      }
    }
  }, [user, isLoading, authLoading]);

  useEffect(() => {
    // 인기 티켓 가져오기
    setIsLoading(true)
    fetchPopularTickets().finally(() => setIsLoading(false))
    
    // 구매 가능한 티켓 가져오기
    setIsLoadingAvailable(true)
    fetchAvailableTickets().finally(() => setIsLoadingAvailable(false))
  }, [])

  const fetchPopularTickets = async () => {
    try {
      const response = await fetch("/api/popular-tickets")
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      setPopularTickets(data)
    } catch (error) {
      console.error("Error fetching popular tickets:", error)
      setPopularTickets([
        { id: 1, artist: "데이터 로딩 실패", date: "", venue: "다시 시도해 주세요" },
        { id: 2, artist: "데이터 로딩 실패", date: "", venue: "다시 시도해 주세요" },
        { id: 3, artist: "데이터 로딩 실패", date: "", venue: "다시 시도해 주세요" },
        { id: 4, artist: "데이터 로딩 실패", date: "", venue: "다시 시도해 주세요" },
      ])
    }
  }
  
  // 구매 가능한 티켓 가져오기
  const fetchAvailableTickets = async (skipCache = false) => {
    try {
      console.log("구매 가능한 티켓 가져오기 시도...");
      
      if (!skipCache) {
        // 로컬 스토리지에서 캐시된 데이터 확인
        const cachedData = localStorage.getItem('tickets_cache');
        if (cachedData) {
          try {
            const parsedCache = JSON.parse(cachedData);
            const cacheTime = parsedCache.timestamp || 0;
            const currentTime = Date.now();
            // 5분(300000ms) 이내의 캐시는 유효함
            if (currentTime - cacheTime < 300000) {
              console.log("캐시된 티켓 데이터 사용:", parsedCache.tickets.length, "개 항목");
              setAvailableTickets(parsedCache.tickets);
              // 사용자의 구매 내역 가져와서 추가 필터링
              filterAlreadyPurchasedTickets(parsedCache.tickets);
              return;
            } else {
              console.log("캐시가 만료되어 새로운 데이터를 가져옵니다");
            }
          } catch (cacheError) {
            console.error("캐시 파싱 오류, 새로운 데이터를 가져옵니다:", cacheError);
          }
        }
      }
      
      // 캐시 방지를 위한 타임스탬프 추가
      const timestamp = Date.now();
      const response = await fetch(`/api/available-posts?t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        cache: 'no-store', // Next.js 캐시 비활성화
        next: { revalidate: 0 } // 데이터 재검증 비활성화
      })
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log("구매 가능한 티켓 데이터:", data)
      
      if (!data.posts || !Array.isArray(data.posts)) {
        throw new Error("API 응답 형식이 올바르지 않습니다.")
      }
      
      // API 응답 데이터를 UI에 맞는 형식으로 변환
      const formattedTickets = data.posts.map((post: any) => ({
        id: post.id,
        title: post.title || post.event_name || "제목 없음",
        artist: post.event_name || post.title || "아티스트 정보 없음",
        date: post.event_date || new Date(post.created_at).toLocaleDateString(),
        time: "19:00", // 기본값
        venue: post.event_venue || "장소 정보 없음",
        price: post.ticket_price 
          ? `${Number(post.ticket_price).toLocaleString()}원` 
          : "가격 정보 없음",
        image: post.image_url || "/placeholder.svg",
        status: "판매중"
      }));
      
      console.log("변환된 티켓 데이터:", formattedTickets.length, "개 항목");
      
      // 캐시에 저장
      localStorage.setItem('tickets_cache', JSON.stringify({ 
        tickets: formattedTickets,
        timestamp: Date.now() 
      }));
      
      setAvailableTickets(formattedTickets);
      
      // 사용자의 구매 내역 가져와서 추가 필터링
      filterAlreadyPurchasedTickets(formattedTickets);
    } catch (error) {
      console.error("구매 가능한 티켓 가져오기 오류:", error)
      // 오류 발생 시 기본 데이터 사용 (실제 환경에서는 제거)
      setAvailableTickets([
        {
          id: 1,
          title: "세븐틴 'FOLLOW' TO SEOUL",
          artist: "세븐틴",
          date: "2024.03.20",
          time: "19:00",
          venue: "잠실종합운동장 주경기장",
          price: "110,000원",
          image: "/placeholder.svg",
          status: "판매중",
        },
        {
          id: 2,
          title: "방탄소년단 월드투어",
          artist: "BTS",
          date: "2024.04.15",
          time: "20:00",
          venue: "서울월드컵경기장",
          price: "132,000원",
          image: "/placeholder.svg",
          status: "판매중",
        }
      ])
    }
  }
  
  // 사용자의 구매 내역과 비교하여 이미 구매한 티켓 필터링
  const filterAlreadyPurchasedTickets = async (tickets: AvailableTicket[]) => {
    if (!user || !user.id) return;
    
    try {
      const timestamp = Date.now();
      const response = await fetch(`/api/purchase?userId=${user.id}&t=${timestamp}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        credentials: 'include',
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.error("구매 내역 조회 실패:", response.status);
        return;
      }
      
      const data = await response.json();
      if (!data || !data.purchases || !Array.isArray(data.purchases)) {
        console.error("구매 내역 데이터 형식이 올바르지 않습니다.");
        return;
      }
      
      // 사용자가 구매한 상품 ID 목록
      const purchasedIds = data.purchases
        .filter((purchase: any) => 
          purchase.status !== 'CANCELLED' && purchase.status !== 'FAILED')
        .map((purchase: any) => purchase.post_id || purchase.postId)
        .filter(Boolean);
      
      console.log("사용자가 구매한 상품 ID 목록:", purchasedIds);
      
      // 구매한 상품은 제외하고 표시
      if (purchasedIds.length > 0) {
        const filteredTickets = tickets.filter(ticket => !purchasedIds.includes(ticket.id));
        console.log(`이미 구매한 ${tickets.length - filteredTickets.length}개 상품을 필터링했습니다.`);
        setAvailableTickets(filteredTickets);
      }
    } catch (error) {
      console.error("구매 내역 필터링 오류:", error);
    }
  }

  const handleTicketSaleClick = () => {
    if (user) {
      router.push("/sell")
    } else {
      router.push("/login?callbackUrl=/sell")
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push(`/search?query=${encodeURIComponent(searchQuery)}`)
  }

  const handleLogout = async () => {
    await logout();
    toast.success("로그아웃 되었습니다");
    router.push("/");
  }

  return (
    <div className="min-h-screen">
      <header className="w-full bg-white shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-6">
              <Link href="/" className="text-2xl font-bold text-[#0061FF]">
                이지티켓
              </Link>
              <Link
                href="/proxy-ticketing"
                className="text-gray-700 hover:text-[#0061FF] transition-colors border-r pr-6"
              >
                대리티켓팅
              </Link>
              <Link
                href="/ticket-cancellation"
                className="text-gray-700 hover:text-[#0061FF] transition-colors border-r pr-6"
              >
                취켓팅
              </Link>
              <Link href="/tickets" className="text-[#0061FF] font-medium transition-colors">
                티켓 구매/판매
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              {user ? (
                <>
                  <span className="text-[#0061FF] font-medium">{user.name}님</span>
                  <button onClick={handleLogout} className="text-gray-700 hover:text-[#0061FF] transition-colors">
                    로그아웃
                  </button>
                  <Link href="/mypage" className="text-gray-700 hover:text-[#0061FF] transition-colors">
                    마이페이지
                  </Link>
                </>
              ) : (
                <Link href="/login" className="text-gray-700 hover:text-[#0061FF] transition-colors">
                  로그인
                </Link>
              )}
              <Link href="/cart" className="text-gray-700 hover:text-[#0061FF] transition-colors">
                장바구니
              </Link>
              <button
                onClick={handleTicketSaleClick}
                className="px-4 py-2 bg-[#0061FF] text-white rounded-md hover:bg-[#0052D6] transition-colors"
              >
                티켓 판매
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#0061FF] to-[#60A5FA]">
        <section className="flex flex-col items-center justify-center py-10 md:py-16 px-4">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center mb-4 leading-tight">
            티켓 구매/판매 서비스
          </h1>
          <p className="text-base md:text-lg text-white/90 text-center mb-8 max-w-xl">
            원하는 공연의 티켓을 안전하게 구매하거나 판매하세요.
          </p>
          <form onSubmit={handleSearch} className="w-full max-w-md flex flex-col sm:flex-row gap-2">
            <Input
              type="search"
              placeholder="이벤트, 아티스트, 팀 검색"
              className="flex-1 h-12 rounded-lg sm:rounded-r-none border-0 bg-white text-black placeholder:text-gray-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button
              type="submit"
              className="h-12 px-8 rounded-lg sm:rounded-l-none bg-[#FFD600] hover:bg-[#FFE600] text-black font-medium transition-colors"
            >
              <Search className="w-5 h-5 mr-2" />
              검색
            </Button>
          </form>
        </section>
      </div>

      {/* 카테고리 섹션 */}
      <section className="bg-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-center space-x-4">
            {categories.map((category) => (
              <Link
                key={category.name}
                href={category.href}
                className="px-4 py-2 text-gray-700 hover:text-[#0061FF] transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 인기 티켓 섹션 */}
      <section className="bg-white py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">
            오늘의 <span className="text-[#FF2F6E]">인기</span> 티켓
          </h2>
          {isLoading ? (
            <p>인기 티켓을 불러오는 중...</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {popularTickets.slice(0, 4).map((ticket) => (
                <Link href={`/ticket/${ticket.id}`} key={ticket.id}>
                  <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="p-4">
                      <h3 className="font-medium mb-1">{ticket.artist}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{ticket.date}</span>
                        {ticket.date && <span>•</span>}
                        <span>{ticket.venue}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 판매중인 티켓 섹션 */}
      <section className="bg-gray-100 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">
                판매중인 <span className="text-[#FF2F6E]">티켓</span>
              </h2>
              <p className="text-gray-600 mt-2">
                모든 티켓은 이미 구매된 항목이 자동으로 제외된 구매 가능한 티켓입니다
              </p>
            </div>
            <Button 
              onClick={() => {
                setIsLoadingAvailable(true);
                // 모든 캐시 비우기
                localStorage.removeItem('tickets_cache');
                // 새로운 데이터 로드 (캐시 사용하지 않음)
                fetchAvailableTickets(true).finally(() => setIsLoadingAvailable(false));
              }}
              variant="outline"
              className="flex items-center"
            >
              <span className="mr-2">최신 정보로 갱신</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
          
          {isLoadingAvailable ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF2F6E]"></div>
              <span className="ml-3 text-gray-600">구매 가능한 티켓을 불러오는 중...</span>
            </div>
          ) : availableTickets.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-xl text-gray-700 mb-4">현재 구매 가능한 티켓이 없습니다</p>
              <p className="text-gray-600 mb-6">나중에 다시 확인하거나 다른 카테고리를 살펴보세요</p>
              <Button
                onClick={handleTicketSaleClick}
                className="px-6 py-3 bg-[#0061FF] text-white rounded-md hover:bg-[#0052D6] transition-colors"
              >
                티켓 판매하기
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {availableTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <Image
                    src={ticket.image || "/placeholder.svg"}
                    alt={ticket.title}
                    width={400}
                    height={200}
                    className="w-full h-48 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-2">{ticket.title}</h3>
                    <p className="text-gray-600 mb-2">{ticket.artist}</p>
                    <div className="flex justify-between items-center text-sm text-gray-500 mb-2">
                      <span>
                        {ticket.date} {ticket.time}
                      </span>
                      <span>{ticket.venue}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-black">{ticket.price}</span>
                      <span
                        className={`px-2 py-1 rounded-full text-sm ${
                          ticket.status === "매진임박" ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                        }`}
                      >
                        {ticket.status}
                      </span>
                    </div>
                    <Link href={`/ticket/${ticket.id}`} className="mt-4 block">
                      <Button className="w-full">구매하기</Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

