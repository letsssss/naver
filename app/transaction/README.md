# 거래 상세 페이지 (Transaction Details)

## URL 구조

거래 상세 페이지는 **주문번호(orderNumber)**를 사용하여 접근해야 합니다:

```
/transaction/[orderNumber]
```

예시:
```
/transaction/XJ2HF85VVGH4
```

## 주의사항

- POST ID(`postId`) 또는 기타 ID로 접근하면 404 오류가 발생합니다
- 거래 상세 정보는 해당 거래의 구매자와 판매자만 조회할 수 있습니다
- 인증되지 않은 사용자는 401 오류가 발생합니다

## 데이터 구조

트랜잭션 페이지에서는 다음과 같은 정보를 확인할 수 있습니다:

- 거래 상태 및 단계
- 티켓 정보 (제목, 날짜, 장소, 좌석, 이미지)
- 판매자 정보
- 구매자 정보
- 결제 정보
- 채팅 (구매자-판매자 간 메시지)

## 개발 가이드라인

- 트랜잭션 페이지 접근 시 항상 주문번호(`orderNumber`)를 사용합니다
- 다른 페이지에서 링크를 생성할 때 `postId` 대신 `orderNumber`를 사용하세요
- 백엔드 API는 주문번호 또는 구매 ID로만 거래 정보를 조회합니다 