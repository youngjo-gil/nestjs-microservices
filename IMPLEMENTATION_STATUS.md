# 마이크로서비스 구현 현황 (2026-05-02)

## ✅ Event-Driven 패턴 완전 구현

### 1️⃣ 새로운 서비스: Notifications Service 추가

**위치:** `apps/notifications-service/`

```
apps/notifications-service/
├── src/
│   ├── main.ts                              ← RabbitMQ 마이크로서비스 부트스트랩
│   ├── notifications-service.module.ts      ← 모듈 정의 (DB 불필요)
│   ├── notifications-service.controller.ts  ← @EventPattern 핸들러
│   └── notifications-service.service.ts     ← 이메일/SMS 목업 구현
├── Dockerfile
└── tsconfig.app.json
```

**큐:** `notifications_queue`  
**패턴:** RabbitMQ 마이크로서비스 (MicroserviceOptions, noAck: false)

### 2️⃣ Orders Service 마이크로서비스 변환

**변경사항:**

| 파일 | 변경 내용 |
|---|---|
| `main.ts` | `NestFactory.create()` → `createMicroservice()` |
| `controller.ts` | `@Get/@Post` → `@MessagePattern` + emit() |
| `module.ts` | NOTIFICATIONS_SERVICE ClientProxy 등록 |
| `service.ts` | 스텁 → 완전한 CRUD 구현 |

```typescript
// Orders Service에서 이벤트 발행
@MessagePattern(ORDERS_PATTERNS.CREATE_ORDER)
async createOrder(@Payload() data: any, @Ctx() ctx: RmqContext) {
  const newOrder = await this.ordersServiceService.createOrder(data);

  // 🔥 emit() = fire-and-forget (응답 없음)
  this.notificationClient.emit(ORDER_EVENTS.CREATED, {
    orderId: newOrder.id,
    userId: newOrder.userId,
    status: newOrder.status,
    createdAt: newOrder.createdAt,
  });

  return newOrder;  // API Gateway에 반환
}
```

### 3️⃣ Notifications Service 이벤트 핸들러

```typescript
// Notifications Service에서 이벤트 수신
@EventPattern(ORDER_EVENTS.CREATED)
async onOrderCreated(@Payload() data: any) {
  // 1️⃣ 이벤트 수신
  // 2️⃣ 이메일/SMS 전송 (목업)
  // 3️⃣ 응답 없음 (return 불필요)
  await this.notificationService.sendOrderNotification(
    data,
    'Order Created',
    `Your order #${data.orderId} has been created!`,
  );
}
```

### 4️⃣ 메시지 패턴 추가

**파일:** `libs/shared/src/patterns/index.ts`

```typescript
// 이벤트 기반 패턴 (emit/EventPattern)
export const ORDER_EVENTS = {
  CREATED: 'order.created',
  UPDATED: 'order.updated',
  SHIPPED: 'order.shipped',
  DELIVERED: 'order.delivered',
};

export const USER_EVENTS = {
  REGISTERED: 'user.registered',
  DELETED: 'user.deleted',
};
```

### 5️⃣ API Gateway 업데이트

**변경사항:**

| 파일 | 변경 내용 |
|---|---|
| `api-gateway.module.ts` | NOTIFICATIONS_SERVICE ClientProxy 등록 |
| `orders/orders.controller.ts` | HTTP 스텁 → ClientProxy.send() 구현 |

```typescript
@Post()
async createOrder(@Body() body: any) {
  // 1️⃣ Orders Service에 메시지 전송 (응답 대기)
  return await lastValueFrom(
    this.ordersClient.send(ORDERS_PATTERNS.CREATE_ORDER, body).pipe(
      timeout(5000),
    ),
  );
  // 2️⃣ Orders Service가 order.created 이벤트 발행
  // 3️⃣ Notifications Service가 비동기로 수신 처리
}
```

### 6️⃣ 프로젝트 구성 업데이트

- `nest-cli.json` - notifications-service 프로젝트 등록
- `.env` - RABBITMQ_URI, DB 설정값 포함

---

## 📊 전체 아키텍처 현황

### 통신 패턴 체크리스트

| 패턴 | 설명 | 상태 |
|---|---|---|
| **Request-Reply** | send() + @MessagePattern | ✅ 완료 |
| **Event-Driven** | emit() + @EventPattern | ✅ 완료 |
| **Timeout** | lastValueFrom() + timeout(5000) | ✅ 완료 |
| **수동 ACK** | channel.ack(message) | ✅ 완료 |
| **Database-per-Service** | 각 서비스 전담 DB | ✅ 완료 |

### 서비스 구성

```
API Gateway (HTTP Server)
├── /health                    → 헬스체크
├── /users → Users Service RPC
├── /auth → Auth Service RPC
└── /orders → Orders Service RPC
    ↓
RabbitMQ (Message Broker)
├── users_queue      → Users Service
├── auth_queue       → Auth Service
├── orders_queue     → Orders Service
└── notifications_queue → Notifications Service
    ↓
Services (RabbitMQ Listeners)
├── Users Service         (DB: users_db, @MessagePattern)
├── Auth Service          (DB: auth_db, @MessagePattern)
├── Orders Service        (DB: orders_db, @MessagePattern + emit())
└── Notifications Service (No DB, @EventPattern only)
```

### 메시지 흐름 예시: POST /orders

```
Client
  ↓ HTTP POST /orders { userId, items }
API Gateway: OrdersController
  ↓ send(ORDERS_PATTERNS.CREATE_ORDER, ...)
RabbitMQ: orders_queue
  ↓
Orders Service: @MessagePattern('create_order')
  ├─ createOrder(data) → DB 저장
  ├─ emit(ORDER_EVENTS.CREATED, ...) [fire-and-forget]
  └─ return newOrder
  ↓ (동시에)
RabbitMQ: notifications_queue
  ↓
Notifications Service: @EventPattern('order.created')
  └─ sendOrderNotification() [비동기, 응답 없음]
  ↓
Client: HTTP 201 { id, userId, status, items }
```

---

## 🔧 로컬 개발 실행 방법

### Step 1: 인프라 시작
```bash
docker compose up -d
```

### Step 2: 각 서비스를 별도 터미널에서 실행 (HMR 활성화)
```bash
# Terminal 1: API Gateway
pnpm run start:dev --project api-gateway

# Terminal 2: Users Service
pnpm run start:dev --project users-service

# Terminal 3: Auth Service
pnpm run start:dev --project auth-service

# Terminal 4: Orders Service
pnpm run start:dev --project orders-service

# Terminal 5: Notifications Service
pnpm run start:dev --project notifications-service
```

### Step 3: 테스트 (Postman/curl)
```bash
# 주문 생성 (Orders → Notifications 이벤트 발행)
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "items": [
      {"name": "Product 1", "quantity": 2, "price": 29.99}
    ]
  }'

# 주문 목록 조회
curl http://localhost:3000/orders

# 특정 주문 조회
curl http://localhost:3000/orders/{orderId}
```

---

## 📝 구현된 핵심 개념

### Event-Driven Pattern의 핵심

1. **emit() vs send()**
   - `send()`: 응답 대기 (Request-Reply)
   - `emit()`: 응답 불필요 (Fire-and-Forget)

2. **@EventPattern vs @MessagePattern**
   - `@MessagePattern`: 응답 반드시 return
   - `@EventPattern`: 응답 반환 불필요

3. **Stateless Event Handlers**
   - Notifications Service는 DB 없음
   - 순수 이벤트 처리만 담당
   - 수평 확장 가능

4. **비동기 이벤트 처리**
   - Orders Service가 즉시 응답
   - Notifications Service가 백그라운드에서 처리
   - 클라이언트는 waiting 없음

---

## 📋 테스트 파일

**새 테스트 추가:**
- `apps/api-gateway/test/event-driven.spec.ts` - Event-Driven 패턴 테스트

**기존 테스트:**
- `apps/api-gateway/test/integration.spec.ts` - Request-Reply 패턴 테스트 (8/8 ✅)

---

## 🚀 다음 단계

### Phase 3.1: Auth Service 완성
- [ ] JWT 토큰 생성/검증 로직
- [ ] @MessagePattern(AUTH_PATTERNS.REGISTER) 구현
- [ ] USER_EVENTS.REGISTERED 이벤트 발행
- [ ] Notifications Service에서 환영 이메일 발송

### Phase 3.2: 고급 기능
- [ ] Retry 로직 (catchError + retry())
- [ ] Dead Letter Queue (실패한 메시지 처리)
- [ ] Event Sourcing (감시 기록)
- [ ] Saga Pattern (분산 트랜잭션)

### Phase 4: API Gateway 미들웨어
- [ ] JWT 인증 미들웨어
- [ ] 요청 로깅
- [ ] 에러 필터

### Phase 5: Docker & Kubernetes
- [ ] 각 서비스 production Dockerfile
- [ ] docker-compose 최적화
- [ ] Kubernetes manifests (minikube)

---

**마지막 업데이트:** 2026-05-02  
**현재 진행률:** Request-Reply ✅ Event-Driven ✅ (2/2 핵심 패턴 완료)
