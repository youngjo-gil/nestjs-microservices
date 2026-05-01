# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# nest-microservices

NestJS RabbitMQ 마이크로서비스 학습 프로젝트.  
API Gateway + RabbitMQ 기반 마이크로서비스 아키텍처로 구성됨.

## 프로젝트 목표

- 도메인별 독립 앱 구성 (auth-service, users-service, orders-service)
- API Gateway를 통한 HTTP 진입점
- RabbitMQ 메시지 브로커로 서비스 간 통신
- PostgreSQL Database-per-Service 패턴 적용

## Architecture

```
                     ┌──────────────────────────────────────────────┐
                     │            Kubernetes (minikube)             │
                     │            namespace: nest-ms                │
                     │                                              │
  HTTP Client        │  api-gateway(:3000)                         │
  curl/Postman ──────┼──► UsersController.getUser()                │
                     │      │ usersClient.send(GET_USER, {id})      │
                     │      ▼                                       │
                     │  RabbitMQ                                    │
                     │  ├── auth_queue  → auth-service              │
                     │  ├── users_queue → users-service             │
                     │  ├── orders_queue → orders-service           │
                     │  └── notifications_queue → notifications-svc │
                     └──────────────────────────────────────────────┘
```

### 서비스 구성

| 서비스 | 역할 | 큐 이름 |
|---|---|---|
| **api-gateway** | HTTP 진입점, 라우팅 | - |
| **auth-service** | JWT 인증 | auth_queue |
| **users-service** | 유저 CRUD | users_queue |
| **orders-service** | 주문 관리 | orders_queue |
| **notifications-service** | 이메일/SMS 목업 | notifications_queue |
| **libs/shared** | 공유 DTOs, patterns, RmqModule | - |

### 메시지 흐름 (예: GET /users/42)

```
Client
  ↓
api-gateway: GET /users/42
  ↓ send(USERS_PATTERNS.GET_USER, { id: '42' })
RabbitMQ [users_queue]
  ↓
users-service: @MessagePattern('get_user')
  ├ rmqService.ack(context)
  └ return User
  ↓
RabbitMQ [reply-to queue]
  ↓
api-gateway: lastValueFrom(observable)
  ↓
Client: HTTP 200 { "id": "42", "name": "Alice", ... }
```

## 현재 상태 (2026-05-01)

**구현 완료:**
- ✅ 모노레포 구조 (api-gateway, auth-service, users-service, orders-service)
- ✅ RabbitMQ 인프라 (docker-compose에 포함)
- ✅ PostgreSQL Database-per-Service 패턴
  - auth_db → users 테이블
  - users_db → user_profiles 테이블
  - orders_db → orders + order_items 테이블
- ✅ TypeOrmModule 설정 (각 서비스의 모듈에 연결)

**진행 중:**
- 마이크로서비스 핵심 로직 구현 (CRUD, RabbitMQ 통신)

## 개발 환경 설정 및 실행

### 패키지 설치

```bash
pnpm install
```

### 로컬 개발 (권장: 로컬 실행 + Docker 인프라)

**Step 1: 인프라 시작 (docker-compose)**
```bash
# PostgreSQL + RabbitMQ만 Docker에서 실행
docker compose up -d

# 3개 DB 생성 확인
docker exec -it nest-ms-postgres psql -U postgres -c "\l"
```

**Step 2: 각 서비스를 로컬에서 별도 터미널로 기동 (HMR 활성화)**
```bash
# 터미널 1: API Gateway
pnpm run start:dev --project api-gateway

# 터미널 2: Auth Service
pnpm run start:dev --project auth-service

# 터미널 3: Users Service
pnpm run start:dev --project users-service

# 터미널 4: Orders Service
pnpm run start:dev --project orders-service
```

**왜 로컬 실행인가?**
- ✅ HMR (Hot Module Replacement): 파일 저장 시 즉시 재로드
- ✅ IDE 통합: 디버거, 타입 체킹, 자동완성
- ✅ 빠른 피드백: 모든 코드 변경이 즉시 반영
- ✅ 로그 직시: 터미널에서 직접 서비스 로그 확인

### 개발 중 유용한 명령어

```bash
# Health check
curl http://localhost:3000/health

# RabbitMQ 관리 UI
open http://localhost:15672  # guest/guest

# PostgreSQL 접속
docker exec -it nest-ms-postgres psql -U postgres -d auth_db

# 컨테이너 종료
docker compose down

# 로그 확인
docker compose logs -f postgres  # PostgreSQL 로그
docker compose logs -f rabbitmq  # RabbitMQ 로그
```

### 빌드 및 테스트

```bash
# 특정 서비스 빌드
pnpm run build auth-service

# 모든 서비스 빌드
pnpm run build

# 테스트
pnpm run test
pnpm run test:watch
pnpm run test:cov

# 린트 및 포맷팅
pnpm run lint
pnpm run format
```

---

## 구현 계획

### Phase 1 — 모노레포 구조 (완료)

**완료 항목:**
- ✅ `nest-cli.json` — monorepo: true, api-gateway, auth-service, users-service, orders-service 등록
- ✅ `tsconfig.json` — `@app/shared` 경로 alias 설정
- ✅ 각 앱: `apps/<name>/tsconfig.app.json` 생성
- ✅ `libs/shared/tsconfig.lib.json` 생성
- ✅ `docker-compose.yml` — PostgreSQL + RabbitMQ 통합

### Phase 2 — PostgreSQL 및 ORM 설정 (완료)

**완료 항목:**
- ✅ PostgreSQL docker-compose 추가
- ✅ `@nestjs/typeorm`, `typeorm`, `pg` 패키지 추가
- ✅ Database-per-Service 패턴 설정
  - auth-service: auth_db
  - users-service: users_db
  - orders-service: orders_db
- ✅ 각 서비스 모듈에 `TypeOrmModule.forRootAsync()` 연결
- ✅ 엔티티 정의 (User, UserProfile, Order, OrderItem)

**핵심 설계:**
- 서비스별 자체 DB 소유 (독립 배포 가능)
- MSA 원칙: 크로스 서비스 FK 금지 (RabbitMQ로만 통신)
- ConfigService로 환경 변수 주입 (각 서비스 격리)

### Phase 3 — 마이크로서비스 기본 구조 (진행 중)

**예정 구현:**
- RabbitMQ 메시지 패턴 정의 (libs/shared/src/patterns/)
- 각 서비스 Controller 구현 (@MessagePattern, @EventPattern)
- RmqService.ack() 기반 메시지 확인

**마이크로서비스 간 통신:**
- `send()` + `@MessagePattern` — 응답 필수 (auth, users, orders)
- `emit()` + `@EventPattern` — fire-and-forget (notifications)

### Phase 4 — API Gateway (진행 예정)

API Gateway는 HTTP 전용 (NestFactory.create() 사용).

**예정 구현:**
- ClientProxy로 각 마이크로서비스 클라이언트 주입
- `lastValueFrom()` + `timeout()` 패턴으로 RPC 호출
- Health check 엔드포인트

### Phase 5 — Docker (진행 중)

**현황:**
- ✅ 각 서비스별 Dockerfile (development 스테이지) 생성
- ✅ docker-compose.yml에 모든 서비스 통합

**예정 개선:**
- production 멀티스테이지 Dockerfile (최적화)
- `nest-cli.json`에 각 앱별 `webpack: true` 설정

### Phase 6 — Kubernetes (minikube) (계획)

```bash
minikube start --driver=docker --cpus=4 --memory=4096
eval $(minikube docker-env)  # 로컬 Docker 이미지를 minikube에 직접 빌드
docker build -f apps/users-service/Dockerfile -t nest-ms/users-service:latest .
```

**K8s 매니페스트:**
```
k8s/
├── namespace.yaml
├── configmap.yaml              # 환경 변수
├── kustomization.yaml
├── rabbitmq/rabbitmq.yaml      # StatefulSet (상태 있음)
├── api-gateway/deployment.yaml # NodePort 30000
└── {auth,users,orders,notifications}-service/deployment.yaml
```

**배포:**
```bash
kubectl apply -k k8s/
kubectl wait --for=condition=ready pod --all -n nest-ms --timeout=120s
minikube service api-gateway-svc -n nest-ms --url
```

## 환경 변수

| 변수 | 기본값 | 사용처 |
|---|---|---|
| **PostgreSQL** |
| DB_HOST | localhost | 모든 서비스 |
| DB_PORT | 5432 | 모든 서비스 |
| DB_USER | postgres | 모든 서비스 |
| DB_PASSWORD | password | 모든 서비스 |
| AUTH_DB_NAME | auth_db | auth-service |
| USERS_DB_NAME | users_db | users-service |
| ORDERS_DB_NAME | orders_db | orders-service |
| **RabbitMQ** |
| RABBITMQ_URI | amqp://guest:guest@localhost:5672 | 모든 서비스 |
| **기타** |
| NODE_ENV | development | 모든 서비스 |
| PORT | 3000 | api-gateway |

`.env.example` 참고.

---

## 코드 구조 및 주요 패턴

### 모노레포 레이아웃

```
apps/
├── api-gateway/          # HTTP 진입점, NestFactory.create()
│   ├── src/
│   │   ├── main.ts
│   │   ├── api-gateway.module.ts
│   │   └── [domain controllers]
│   ├── Dockerfile
│   └── tsconfig.app.json
├── auth-service/         # 인증 마이크로서비스, auth_db
│   ├── src/
│   │   ├── main.ts
│   │   ├── auth-service.module.ts (TypeOrmModule.forRootAsync)
│   │   ├── users/user.entity.ts
│   │   └── [auth controllers]
│   └── Dockerfile
├── users-service/        # 유저 프로필 마이크로서비스, users_db
├── orders-service/       # 주문 관리 마이크로서비스, orders_db
│   └── src/orders/
│       ├── order.entity.ts
│       └── order-item.entity.ts
└── [all have tsconfig.app.json, Dockerfile]

libs/shared/
├── src/
│   ├── index.ts          # 배럴 export
│   ├── database/         # DB 설정 (팩토리 함수)
│   │   └── database.config.ts (createDatabaseConfig)
│   ├── rmq/              # RabbitMQ 인프라
│   │   ├── rmq.module.ts
│   │   └── rmq.service.ts (ack() 헬퍼)
│   ├── patterns/         # 메시지 패턴 상수
│   ├── dto/              # 공유 DTOs
│   └── service-tokens.ts # 서비스 주입 토큰
└── tsconfig.lib.json

docker/
└── init-dbs.sql          # PostgreSQL 초기화 (auth_db, users_db, orders_db 생성)
```

### 서비스 모듈 패턴

각 마이크로서비스는 shared의 `createDatabaseConfig()` 팩토리 함수를 사용:

```typescript
// auth-service.module.ts
import { createDatabaseConfig } from '@app/shared';
import { User } from './users/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    createDatabaseConfig('AUTH_DB_NAME', [User]),
    TypeOrmModule.forFeature([User]),
  ],
  controllers: [AuthServiceController],
  providers: [AuthServiceService],
})
export class AuthServiceModule {}
```

**핵심:**
- `createDatabaseConfig(dbNameEnv, entities)` — DB 설정 반복 제거
- 각 서비스는 DB 이름과 엔티티만 지정
- ConfigService 의존성은 shared에서 처리

**shared 구현 (`libs/shared/src/database/database.config.ts`):**
```typescript
export function createDatabaseConfig(dbNameEnv: string, entities: any[]) {
  return TypeOrmModule.forRootAsync({
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      type: 'postgres',
      host: configService.get('DB_HOST', 'localhost'),
      database: configService.get(dbNameEnv),
      entities,
      synchronize: configService.get('NODE_ENV') !== 'production',
    }),
    inject: [ConfigService],
  });
}
```

### Database-per-Service 패턴

| 서비스 | DB 이름 | 엔티티 | 원칙 |
|---|---|---|---|
| auth-service | auth_db | User (id, email, password) | 인증 데이터 소유 |
| users-service | users_db | UserProfile (id, name, email) | auth 이벤트로 동기화 |
| orders-service | orders_db | Order, OrderItem | MSA: FK 없음 |

**중요 원칙:**
- 각 서비스는 자신의 DB만 조회 (독립 배포 가능)
- 크로스 서비스 데이터 접근은 RabbitMQ 메시지로만
- orders_db의 userId는 외래키 없음 (논리적 참조)

### RabbitMQ 통신 패턴

```typescript
// Microservice: Request-Reply
@MessagePattern('get_user')
getUser(@Payload() data: GetUserDto, @Ctx() ctx: RmqContext) {
  this.rmqService.ack(ctx);  // 즉시 ack
  return this.usersService.getUser(data.id);
}

// API Gateway: Client
this.usersClient.send(USERS_PATTERNS.GET_USER, { id }).pipe(
  timeout(5000),  // 5초 타임아웃
)
```

**설계 결정:**

### 1. noAck: false (수동 ack)

```typescript
{
  noAck: false,  // 수동 확인 필수
}
```

- 메시지 유실 방지
- 서비스 크래시 시 RabbitMQ가 자동으로 재큐잉
- `rmqService.ack(context)`로 명시적으로 처리 완료 표시

### 2. send() vs emit()

| 메서드 | 데코레이터 | 사용 |
|---|---|---|
| `send()` | `@MessagePattern` | 응답 필요 (users, auth, orders) |
| `emit()` | `@EventPattern` | fire-and-forget (notifications) |

### 3. lastValueFrom() + timeout()

```typescript
return lastValueFrom(
  this.usersClient.send(pattern, data).pipe(
    timeout(5000),  // 5초 타임아웃
  ),
);
```

- RxJS Observable → Promise 변환
- 서비스 다운 시 무한 대기 방지
- 기존 `toPromise()` (deprecated) 대신 사용

### 4. StatefulSet vs Deployment

- **RabbitMQ**: StatefulSet (상태 저장, 메시지 영속성)
- **마이크로서비스**: Deployment (stateless)
- **API Gateway**: Deployment (stateless)

### 5. webpack: true

```json
{
  "compilerOptions": {
    "webpack": true
  }
}
```

- TypeScript 컴파일 시 `@app/shared` 의존성을 번들에 인라인
- 런타임에 `tsconfig-paths` 불필요
- Docker 이미지 크기 감소

## API 엔드포인트

```
GET    /health              → 헬스체크
GET    /users               → 유저 목록
GET    /users/:id           → 유저 조회
POST   /users               → 유저 생성 { name, email, password }
POST   /auth/login          → 로그인 { email, password }
POST   /auth/register       → 회원가입 { name, email, password }
GET    /orders              → 주문 목록
POST   /orders              → 주문 생성 { userId, items }
```

## 일반적인 문제 해결

### "Cannot find module '@app/shared'" at runtime

**원인:** webpack 미설정  
**해결:** `nest-cli.json`의 각 앱 `compilerOptions`에 `"webpack": true` 추가

### K8s ImagePullBackOff

**원인:** 로컬 이미지를 Docker Hub에서 풀하려 시도  
**해결:** 매니페스트에 `imagePullPolicy: Never` 설정

### HTTP 5초 후 타임아웃

**원인:** 서비스 다운 또는 패턴 불일치  
**해결:** `timeout(5000)` 추가, 서비스 상태 확인

### 버전 불일치 에러

**원인:** `@nestjs/*` 패키지 버전 혼재  
**해결:** `package.json`에서 모두 v10으로 통일

### RabbitMQ에서 `main_queue`로만 메시지 들어옴

**원인:** RmqService의 queue 파라미터 미사용 (기존 버그)  
**해결:** Phase 2에서 버그 수정

---

## 디버깅 및 문제 해결

### "Cannot find module '@app/shared'" 오류

**증상:** NestJS 빌드 또는 실행 시 `@app/shared` 모듈을 찾지 못함  
**원인:** `nest-cli.json`에서 각 앱의 `compilerOptions`에 `webpack: true`가 없음  
**해결:**
```json
// nest-cli.json
"projects": {
  "auth-service": {
    "compilerOptions": { "webpack": true }
  }
}
```

### TypeORM "No DataSource found" 오류

**증상:** 서비스 시작 시 DataSource 못 찾음  
**원인:** `TypeOrmModule.forRootAsync`가 ConfigModule 이전에 로드됨  
**해결:**
```typescript
imports: [
  ConfigModule.forRoot({ isGlobal: true }),  // ← 먼저 로드
  TypeOrmModule.forRootAsync(...),            // ← 그 다음
]
```

### PostgreSQL 연결 거부

**증상:** `docker compose up` 후 서비스가 postgres 연결 못함  
**확인:**
```bash
docker compose logs postgres
docker exec -it nest-ms-postgres psql -U postgres -l  # DB 확인
```

### RabbitMQ 메시지 손실

**증상:** 메시지가 RabbitMQ에서 처리되지 않음  
**원인:** `noAck: true`로 설정되어 있거나, `rmqService.ack()`을 호출하지 않음  
**확인:**
```bash
docker exec -it nest-ms-rabbitmq rabbitmq-diagnostics queue_info
```

---

## 참고 자료

- `libs/shared/src/rmq/rmq.service.ts` — ack() 메서드 구현
- `apps/*/src/*-service.module.ts` — TypeOrmModule 설정 예시
- `.env.example` — 환경 변수 템플릿
- `docker-compose.yml` — PostgreSQL + RabbitMQ 구성

---

**최종 업데이트:** 2026-05-01  
**현황:** PostgreSQL 통합 완료, 마이크로서비스 로직 구현 진행 중
