# 최종 마이크로서비스 아키텍처 (2026-05-02)

## 📐 완전한 시스템 다이어그램

```mermaid
graph TB
    Client["🖥️ Client<br/>(Postman/curl)"]
    
    subgraph "🌐 API Gateway"
        GW["HTTP Server<br/>Port 3000"]
        HC["HealthController"]
        UC["UsersController"]
        AC["AuthController"]
        OC["OrdersController"]
    end
    
    subgraph "🐰 RabbitMQ"
        UQ["users_queue"]
        AQ["auth_queue"]
        OQ["orders_queue"]
        NQ["notifications_queue"]
    end
    
    subgraph "⚙️ Microservices"
        US["Users Service<br/>@MessagePattern<br/>users_db"]
        AS["Auth Service<br/>@MessagePattern<br/>auth_db"]
        OS["Orders Service<br/>@MessagePattern<br/>@emit()<br/>orders_db"]
        NS["Notifications Service<br/>@EventPattern<br/>No DB"]
    end
    
    subgraph "💾 Databases"
        UsersDB[(users_db<br/>UserProfile)]
        AuthDB[(auth_db<br/>User)]
        OrdersDB[(orders_db<br/>Order<br/>OrderItem)]
    end
    
    Client -->|HTTP Request| GW
    GW --> HC
    GW --> UC
    GW --> AC
    GW --> OC
    
    UC -->|send()<br/>GET_USER| UQ
    AC -->|send()<br/>LOGIN| AQ
    OC -->|send()<br/>CREATE_ORDER| OQ
    
    UQ -->|@MessagePattern| US
    AQ -->|@MessagePattern| AS
    OQ -->|@MessagePattern| OS
    
    OS -->|emit()<br/>order.created| NQ
    
    NQ -->|@EventPattern| NS
    
    US --> UsersDB
    AS --> AuthDB
    OS --> OrdersDB
    
    US -->|return| UQ
    AS -->|return| AQ
    OS -->|return| OQ
    
    UQ -->|Observable| UC
    AQ -->|Observable| AC
    OQ -->|Observable| OC
    
    UC -->|HTTP 200| Client
    AC -->|HTTP 200| Client
    OC -->|HTTP 201| Client
    
    style Client fill:#e1f5ff
    style GW fill:#fff3e0
    style US fill:#f3e5f5
    style AS fill:#f3e5f5
    style OS fill:#f3e5f5
    style NS fill:#c8e6c9
    style UsersDB fill:#fce4ec
    style AuthDB fill:#fce4ec
    style OrdersDB fill:#fce4ec
```

---

## 🔄 메시지 흐름: 예시 - POST /orders

```
1️⃣ 클라이언트가 HTTP POST 요청 전송
   POST http://localhost:3000/orders
   Body: { userId: '123', items: [...] }

2️⃣ API Gateway: OrdersController 수신
   ordersClient.send(ORDERS_PATTERNS.CREATE_ORDER, data)
   ↓ send(): 응답 대기 (Request-Reply)

3️⃣ RabbitMQ: orders_queue 라우팅
   ↓

4️⃣ Orders Service: @MessagePattern 핸들러
   @MessagePattern(ORDERS_PATTERNS.CREATE_ORDER)
   ├─ channel.ack(message)           [수동 확인]
   ├─ createOrder(data)              [DB 저장]
   │  └─ INSERT INTO orders, order_items
   ├─ emit(ORDER_EVENTS.CREATED, {}) [fire-and-forget]
   │  └─ RabbitMQ: notifications_queue로 발행
   └─ return newOrder                [API Gateway에 응답]
   
5️⃣ RabbitMQ: 응답 전달
   ↓ reply queue → API Gateway

6️⃣ API Gateway: lastValueFrom() 대기 종료
   HTTP 201 응답 반환
   ↓

7️⃣ 클라이언트 수신
   { id: 'order-uuid', userId: '123', status: 'pending', items: [...] }
   
   [동시에]
   
8️⃣ Notifications Service: @EventPattern 핸들러
   @EventPattern(ORDER_EVENTS.CREATED)
   ├─ Receive event from notifications_queue
   ├─ sendOrderNotification()
   │  └─ Logger.log() [목업 구현]
   └─ No response (fire-and-forget)
```

---

## 📋 서비스별 상세 정보

### 1. API Gateway (HTTP Server)

| 항목 | 값 |
|---|---|
| **포트** | 3000 |
| **부트스트랩** | `NestFactory.create()` |
| **역할** | HTTP 진입점, 라우팅 |
| **패턴** | Request-Reply (send) |
| **컨트롤러** | Health, Users, Auth, Orders |
| **ClientProxy** | USERS_SERVICE, AUTH_SERVICE, ORDERS_SERVICE, NOTIFICATIONS_SERVICE |

### 2. Users Service (마이크로서비스)

| 항목 | 값 |
|---|---|
| **큐** | users_queue |
| **부트스트랩** | `createMicroservice(Transport.RMQ)` |
| **DB** | users_db (UserProfile 엔티티) |
| **패턴** | @MessagePattern (Request-Reply) |
| **핸들러** | GET_USERS, GET_USER, CREATE_USER, UPDATE_USER, DELETE_USER |
| **ACK** | 수동 (channel.ack()) |

### 3. Auth Service (마이크로서비스)

| 항목 | 값 |
|---|---|
| **큐** | auth_queue |
| **부트스트랩** | `createMicroservice(Transport.RMQ)` |
| **DB** | auth_db (User 엔티티) |
| **패턴** | @MessagePattern (Request-Reply) |
| **핸들러** | LOGIN, REGISTER, VALIDATE_TOKEN |
| **ACK** | 수동 (channel.ack()) |

### 4. Orders Service (마이크로서비스)

| 항목 | 값 |
|---|---|
| **큐** | orders_queue |
| **부트스트랩** | `createMicroservice(Transport.RMQ)` |
| **DB** | orders_db (Order, OrderItem 엔티티) |
| **패턴** | @MessagePattern (Request-Reply) + emit() (Event-Driven) |
| **핸들러** | GET_ORDERS, GET_ORDER, CREATE_ORDER, UPDATE_ORDER, DELETE_ORDER |
| **이벤트** | CREATED, UPDATED, SHIPPED, DELIVERED |
| **ACK** | 수동 (channel.ack()) |

### 5. Notifications Service (마이크로서비스) ✨ NEW

| 항목 | 값 |
|---|---|
| **큐** | notifications_queue |
| **부트스트랩** | `createMicroservice(Transport.RMQ)` |
| **DB** | 없음 (Stateless) |
| **패턴** | @EventPattern (Event-Driven) |
| **핸들러** | ORDER_EVENTS (4개), USER_EVENTS (2개) |
| **응답** | 없음 (fire-and-forget) |
| **ACK** | 자동 또는 생략 가능 |

---

## 🏗️ 데이터베이스 구조

### PostgreSQL (3개 독립 DB)

```sql
-- 1️⃣ auth_db (Auth Service)
CREATE TABLE "user" (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  name VARCHAR,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- 2️⃣ users_db (Users Service)
CREATE TABLE "user_profile" (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  email VARCHAR NOT NULL,
  createdAt TIMESTAMP DEFAULT NOW()
);

-- 3️⃣ orders_db (Orders Service)
CREATE TABLE "order" (
  id UUID PRIMARY KEY,
  userId UUID NOT NULL,  -- ⚠️ FK 아님 (논리적 참조만)
  status VARCHAR DEFAULT 'pending',
  createdAt TIMESTAMP DEFAULT NOW()
);

CREATE TABLE "order_item" (
  id UUID PRIMARY KEY,
  orderId UUID NOT NULL,
  productId UUID NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (orderId) REFERENCES "order"(id)
);
```

### 데이터베이스 분리 원칙

✅ **Database-per-Service 패턴**
- 각 마이크로서비스는 자신의 DB 전담
- 다른 서비스의 DB에 직접 접근 금지
- RabbitMQ를 통해서만 데이터 공유

---

## 🚀 실행 명령어

### Infrastructure 시작
```bash
docker compose up -d
```

### 각 서비스 로컬 실행 (HMR 활성화)
```bash
# Terminal 1: API Gateway
pnpm run start:dev --project api-gateway

# Terminal 2: Users Service
pnpm run start:dev --project users-service

# Terminal 3: Auth Service
pnpm run start:dev --project auth-service

# Terminal 4: Orders Service
pnpm run start:dev --project orders-service

# Terminal 5: Notifications Service ✨ NEW
pnpm run start:dev --project notifications-service
```

---

## 🧪 테스트 엔드포인트

### Request-Reply 패턴
```bash
# Users Service 조회
curl http://localhost:3000/users
curl http://localhost:3000/users/{userId}

# Auth Service
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

### Event-Driven 패턴
```bash
# 주문 생성 (Orders → Notifications 이벤트 발행)
curl -X POST http://localhost:3000/orders \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "items": [
      {"productId": "prod-1", "quantity": 2, "price": 29.99}
    ]
  }'

# 주문 조회
curl http://localhost:3000/orders
curl http://localhost:3000/orders/{orderId}
```

### RabbitMQ 관리 UI
```
http://localhost:15672
Username: guest
Password: guest
```

---

## 📊 구현 완료도

| 기능 | 상태 | 설명 |
|---|---|---|
| **API Gateway** | ✅ 완료 | HTTP 서버 + ClientProxy |
| **Request-Reply** | ✅ 완료 | send() + @MessagePattern |
| **Event-Driven** | ✅ 완료 | emit() + @EventPattern |
| **Users Service** | ✅ 완료 | CRUD + @MessagePattern |
| **Auth Service** | ⏳ 진행 | 기본 구조 완료, JWT 로직 추가 필요 |
| **Orders Service** | ✅ 완료 | CRUD + emit() |
| **Notifications Service** | ✅ 완료 | @EventPattern + 목업 |
| **Database-per-Service** | ✅ 완료 | 3개 독립 DB |
| **TypeORM** | ✅ 완료 | 모든 엔티티 정의 |
| **Docker Compose** | ✅ 완료 | PostgreSQL + RabbitMQ |

---

## 🎯 핵심 설계 결정

| 결정사항 | 선택 | 이유 |
|---|---|---|
| **통신 방식** | RabbitMQ | 비동기, 신뢰성, 마이크로서비스 표준 |
| **부트스트랩** | NestFactory.createMicroservice() | RabbitMQ 네이티브 지원 |
| **메시지 확인** | 수동 ACK (noAck: false) | 메시지 유실 방지 |
| **데이터 분리** | Database-per-Service | 독립 배포, 확장성 |
| **API 진입** | API Gateway | 단일 진입점, 라우팅 중앙화 |
| **타임아웃** | 5초 | RPC 대기 시간 제한 |

---

## 📚 관련 문서

- **CLAUDE.md** - 프로젝트 개요 및 설정
- **MSA_RABBITMQ_GUIDE.md** - NestJS 공식 패턴과의 대비
- **COMMUNICATION_PATTERNS.md** - Request-Reply vs Event-Driven 상세 비교
- **IMPLEMENTATION_STATUS.md** - 현재 구현 상태 및 진행률
- **ARCHITECTURE.md** - Mermaid 다이어그램 (이전 버전)

---

**마지막 업데이트:** 2026-05-02  
**상태:** 핵심 패턴 2/2 완료 ✅  
**준비도:** 로컬 테스트 가능 🚀
