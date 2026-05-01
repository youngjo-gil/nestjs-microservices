# RabbitMQ 통신 패턴 비교

## 1️⃣ Request-Reply Pattern (송수신 필수)

**사용 케이스:** 응답이 필요한 작업 (조회, 검증, CRUD)

### API Gateway 측
```typescript
@Get('users/:id')
async getUser(@Param('id') id: string) {
  // ✅ send() 사용: 응답을 반드시 받아야 함
  return await lastValueFrom(
    this.usersClient
      .send(USERS_PATTERNS.GET_USER, { id })
      .pipe(timeout(5000))
  );
}
```

### Microservice 측
```typescript
@MessagePattern(USERS_PATTERNS.GET_USER)
async getUser(@Payload() data: any, @Ctx() ctx: RmqContext) {
  // ✅ @MessagePattern: 요청-응답 패턴
  
  // 메시지 처리 완료 표시 (ACK)
  const channel = ctx.getChannelRef();
  channel.ack(ctx.getMessage());
  
  // 비즈니스 로직 실행
  const user = await this.usersService.getUser(data.id);
  
  // ✅ 반드시 return (API Gateway가 대기 중)
  return user;
}
```

---

## 2️⃣ Event-Driven Pattern (발행만 필요)

**사용 케이스:** 응답이 불필요한 비동기 작업 (알림, 로깅, 분석)

### Microservice 측 (발행자)
```typescript
@MessagePattern(ORDERS_PATTERNS.CREATE_ORDER)
async createOrder(@Payload() data: any, @Ctx() ctx: RmqContext) {
  // 1️⃣ 요청-응답: 주문 생성
  const newOrder = await this.ordersService.createOrder(data);
  
  // 2️⃣ 이벤트 발행: 알림 서비스에 통지 (fire-and-forget)
  this.notificationClient.emit(ORDER_EVENTS.CREATED, {
    orderId: newOrder.id,
    userId: newOrder.userId,
  });
  // ⚠️ await 하지 않음! (응답 불필요)
  
  // 3️⃣ 클라이언트에게 즉시 응답
  return newOrder;
}
```

### Microservice 측 (수신자)
```typescript
@EventPattern(ORDER_EVENTS.CREATED)
async onOrderCreated(@Payload() data: any) {
  // ✅ @EventPattern: 이벤트 수신만 (요청-응답 아님)
  
  // 비즈니스 로직 실행
  await this.notificationService.sendEmail(
    data.email,
    `Your order #${data.orderId} has been created!`
  );
  
  // ⚠️ return은 무시됨 (응답 불필요)
  // 따라서 return 문을 쓸 필요 없음
}
```

---

## 📊 비교 표

| 구분 | Request-Reply | Event-Driven |
|---|---|---|
| **클라이언트 메서드** | `send()` | `emit()` |
| **마이크로서비스 데코레이터** | `@MessagePattern` | `@EventPattern` |
| **응답 필요** | ✅ 필수 (return) | ❌ 불필요 |
| **응답 대기** | ✅ await 필수 | ❌ await 없음 |
| **타임아웃** | ✅ timeout() 사용 | ❌ 사용 안 함 |
| **수동 ACK** | ✅ channel.ack() | ⚠️ 선택사항 |
| **사용 예시** | 조회, CRUD, 검증 | 알림, 로깅, 분석 |

---

## 🔄 메시지 흐름 다이어그램

### Request-Reply
```
API Gateway
  │
  ├─ send(pattern, data)
  │  │
  │  ↓
  RabbitMQ: 요청 큐
  │  │
  │  ├─ @MessagePattern 핸들러
  │  ├─ 비즈니스 로직
  │  ├─ return 결과
  │  │
  │  ↓
  RabbitMQ: 응답 큐
  │  │
  │  ├─ lastValueFrom() 대기 [BLOCKING]
  │  │
  │  ↓
  HTTP 200 { 결과 }
```

### Event-Driven
```
Microservice A
  │
  ├─ emit(event, data) [NO WAIT]
  │  │
  │  ↓
  RabbitMQ: 이벤트 큐
  │  │
  │  ├─ Microservice B @EventPattern
  │  ├─ 비즈니스 로직
  │  ├─ [응답 없음]
  │  │
  │  ↓ [백그라운드 처리]
  │
  return 결과 [즉시 반환]
```

---

## 💡 실전 예시

### 시나리오: 전자상거래 주문 처리

```typescript
// 1️⃣ API Gateway: POST /orders
POST /orders { userId, items }
  ↓

// 2️⃣ Orders Service: 주문 생성 (Request-Reply)
@MessagePattern(ORDERS_PATTERNS.CREATE_ORDER)
  ├─ DB 저장
  ├─ emit(ORDER_EVENTS.CREATED) [fire-and-forget]
  └─ return newOrder
  ↓

// 3️⃣ API Gateway: 즉시 응답
HTTP 201 { orderId: '123', status: 'pending' }
  ↓

// 4️⃣ [동시에 백그라운드]
Notifications Service: @EventPattern(ORDER_EVENTS.CREATED)
  ├─ 이메일 발송
  ├─ SMS 발송
  └─ 로그 기록
  ↓
(응답 없음)
```

**결과:**
- ✅ 클라이언트: 빠른 응답 (~ 100ms)
- ✅ 시스템: 완벽한 일관성 (모든 단계 실행)
- ✅ 확장성: 알림 서비스 다운 시에도 주문은 성공

---

## ⚠️ 일반적인 실수

### ❌ 잘못된 예 1: emit()을 await
```typescript
// 이렇게 하지 마세요!
await this.notificationClient.emit(ORDER_EVENTS.CREATED, data);
// → 불필요한 대기 (emit은 fire-and-forget)
```

### ❌ 잘못된 예 2: @EventPattern에서 return 필수
```typescript
// 이렇게 할 필요 없습니다
@EventPattern(ORDER_EVENTS.CREATED)
async onOrderCreated(@Payload() data: any) {
  await this.service.sendEmail(data.email);
  return { success: true };  // ← 무시됨
}
```

### ❌ 잘못된 예 3: @MessagePattern에서 return 없음
```typescript
// 이렇게 하면 안 됩니다!
@MessagePattern(USERS_PATTERNS.GET_USER)
async getUser(@Payload() data: any) {
  const user = await this.service.getUser(data.id);
  // return 빠짐! → 클라이언트가 무한 대기
}
```

---

## 🎯 패턴 선택 가이드

### Request-Reply를 선택하는 경우
- 응답 데이터가 필요함 (조회, 생성 결과 등)
- 동기 처리가 필수 (사용자가 결과를 즉시 봐야 함)
- 에러 처리가 중요 (실패 시 응답 코드 반환)

### Event-Driven을 선택하는 경우
- 응답이 불필요 (알림, 로깅, 분석)
- 비동기 처리 가능 (사용자 대기 시간 늘어나도 됨)
- 독립적 처리 (실패해도 다른 작업은 계속)

---

**참고:** 두 패턴 모두 RabbitMQ를 통하므로 메시지 안정성과 순서 보장은 동일합니다.
