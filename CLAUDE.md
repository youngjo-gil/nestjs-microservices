# nest-microservices

NestJS RabbitMQ 마이크로서비스 학습 프로젝트.  
단일 앱 아키텍처를 API Gateway + RabbitMQ 기반 마이크로서비스로 전환하는 학습을 목표로 함.

## 프로젝트 목표

- NestJS 모놀로식 → 완전한 마이크로서비스 아키텍처 전환
- 도메인별 독립 앱 (auth, users, orders, notifications)
- API Gateway를 통한 HTTP 진입점
- RabbitMQ 메시지 브로커로 서비스 간 통신
- 로컬 Kubernetes (minikube)에 배포 및 운영 테스트

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

## 현재 상태 (2026-04-29)

- 단일 앱 구조 (`src/` 폴더)
- `RmqModule` 인프라 기존 (Dynamic Module 패턴)
- `RmqService.ack()` 헬퍼 메서드 존재
- **버그**: `RmqService.getOptions(queue)` 파라미터 미사용 → 항상 `main_queue` 반환
- **버전 불일치**: `@nestjs/common@^10` vs `@nestjs/microservices@^11`
- 빈 도메인 모듈: `UsersModule`, `ProductsModule`

## 구현 계획

### Phase 0 — 사전 준비

```bash
brew install minikube
minikube version
```

### Phase 1 — 모노레포 전환

**수정할 파일:**
- `package.json` — 모든 `@nestjs/*` → `^10.4.0` 통일, `@nestjs/config` 추가
- `nest-cli.json` — `monorepo: true` 설정, 모든 프로젝트 등록
- `tsconfig.json` — `@app/shared` 경로 alias 추가
- 각 앱: `apps/<name>/tsconfig.app.json` 생성
- 라이브러리: `libs/shared/tsconfig.lib.json` 생성

**디렉토리 구조:**
```
apps/
├── api-gateway/src/
├── auth-service/src/
├── users-service/src/
├── orders-service/src/
└── notifications-service/src/

libs/shared/src/
├── rmq/ (src/config/rmq에서 이전)
├── patterns/
├── dto/
└── service-tokens.ts
```

### Phase 2 — Shared Library 구축

**핵심: RmqService 버그 수정**

기존 코드:
```typescript
getOptions(queue: string, noAck = false): RmqOptions {
  return {
    // ... 
    queue: 'main_queue',  // 버그: queue 파라미터 무시
  };
}
```

수정 코드:
```typescript
getOptions(queue: string, noAck = false): RmqOptions {
  return {
    transport: Transport.RMQ,
    options: {
      urls: [this.configService.get<string>('RABBITMQ_URI')],  // 설정 주입
      queue,  // 파라미터 실제 사용
      noAck,
      persistent: true,
      queueOptions: { durable: true },
    },
  };
}
```

**생성 파일:**
- `libs/shared/src/service-tokens.ts`
- `libs/shared/src/patterns/{users,auth,orders,notifications}.patterns.ts`
- `libs/shared/src/dto/{users,auth,orders}/*.dto.ts`
- `libs/shared/src/rmq/{rmq.module.ts,rmq.service.ts,index.ts}`
- `libs/shared/src/index.ts` (배럴 export)

### Phase 3 — 개별 마이크로서비스

각 서비스는 동일한 패턴 (users-service 기준):

**main.ts:**
```typescript
async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    UsersModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [process.env.RABBITMQ_URI ?? 'amqp://localhost:5672'],
        queue: process.env.USERS_QUEUE ?? 'users_queue',
        noAck: false,  // 수동 ack
        queueOptions: { durable: true },
      },
    },
  );
  await app.listen();
}
```

**controller.ts:**
```typescript
@Controller()
export class UsersController {
  @MessagePattern(USERS_PATTERNS.GET_USER)
  getUser(@Payload() data: GetUserDto, @Ctx() ctx: RmqContext) {
    this.rmqService.ack(ctx);  // 처리 전 ack
    return this.usersService.getUser(data.id);
  }
}
```

**특이사항:**
- **orders-service**: notifications-service를 클라이언트로 사용 (`emit()` 사용)
- **notifications-service**: `@EventPattern` 사용 (fire-and-forget)

### Phase 4 — API Gateway

HTTP 전용. `NestFactory.create()` 사용.

**users.controller.ts:**
```typescript
@Controller('users')
export class UsersController {
  constructor(
    @Inject(SERVICES.USERS_SERVICE)
    private readonly usersClient: ClientProxy,
  ) {}

  @Get(':id')
  async getUser(@Param('id') id: string) {
    return lastValueFrom(
      this.usersClient.send(USERS_PATTERNS.GET_USER, { id }).pipe(
        timeout(5000),  // 서비스 타임아웃
      ),
    );
  }
}
```

**health.controller.ts:**
```typescript
@Controller('health')
export class HealthController {
  @Get() check() { return { status: 'ok' }; }  // K8s readiness probe용
}
```

### Phase 5 — Docker

**Multi-stage Dockerfile** (각 앱별):
```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@8
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:20-alpine AS build
RUN npm install -g pnpm@8
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec nest build users-service  # webpack: true로 인라인
RUN pnpm prune --prod

FROM node:20-alpine AS prod
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app/dist/apps/users-service ./dist
COPY --from=build /app/node_modules ./node_modules
CMD ["node", "dist/main"]
```

**중요:** `nest-cli.json`의 각 앱에 `"webpack": true` 필수  
→ `@app/shared` import가 dist에 인라인되어 런타임 경로 문제 해결

### Phase 6 — Kubernetes (minikube)

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
| RABBITMQ_URI | amqp://localhost:5672 | 모든 서비스 |
| PORT | 3000 | api-gateway |
| AUTH_QUEUE | auth_queue | auth-service, api-gateway |
| USERS_QUEUE | users_queue | users-service, api-gateway |
| ORDERS_QUEUE | orders_queue | orders-service, api-gateway |
| NOTIFICATIONS_QUEUE | notifications_queue | notifications-service |
| JWT_SECRET | (필수) | auth-service |

## 로컬 개발 실행

```bash
# RabbitMQ 시작
docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management

# 각 서비스 별도 터미널에서
pnpm run start:gateway
pnpm run start:auth
pnpm run start:users
pnpm run start:orders
pnpm run start:notifications

# 테스트
curl http://localhost:3000/users
curl http://localhost:3000/users/1
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com","password":"secret"}'

# RabbitMQ 관리 UI
open http://localhost:15672  # guest/guest
```

## Docker Compose 실행

```bash
docker compose build
docker compose up -d
curl http://localhost:3000/users
docker compose logs -f api-gateway
docker compose down
```

## 주요 설계 결정

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

## 검증 체크리스트

- [ ] Phase 0: minikube 설치
- [ ] Phase 1: monorepo 구조 전환 (`nest info` 확인)
- [ ] Phase 2: shared lib 빌드 (`nest build shared`)
- [ ] Phase 3: 로컬 RabbitMQ + 각 서비스 개별 기동
- [ ] Phase 3: `curl http://localhost:3000/users` 전체 메시지 흐름 확인
- [ ] Phase 5: `docker compose up -d` 컨테이너 환경 검증
- [ ] Phase 6: minikube 배포 (`kubectl apply -k k8s/`)
- [ ] Phase 6: `kubectl scale` + pod 삭제로 수평 확장/장애 복구 확인

## 참고: 모노레포 구조 최종 상태

```
nest-microservices/
├── apps/
│   ├── api-gateway/
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── users/
│   │   │   ├── auth/
│   │   │   ├── orders/
│   │   │   └── health/
│   │   └── tsconfig.app.json
│   ├── auth-service/src/
│   ├── users-service/src/
│   ├── orders-service/src/
│   └── notifications-service/src/
├── libs/
│   └── shared/src/
│       ├── index.ts
│       ├── service-tokens.ts
│       ├── rmq/
│       ├── patterns/
│       └── dto/
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── kustomization.yaml
│   ├── rabbitmq/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── users-service/
│   ├── orders-service/
│   └── notifications-service/
├── docker-compose.yml
├── package.json         (수정)
├── nest-cli.json        (수정)
├── tsconfig.json        (수정)
└── CLAUDE.md           (이 파일)
```

## 학습 포인트

1. **NestJS Monorepo**: `nest-cli.json`의 `monorepo: true`로 다중 앱 관리
2. **Dynamic Module Pattern**: `RmqModule.register()`로 재사용 가능한 설정
3. **RabbitMQ Request-Reply**: correlationId + replyTo로 비동기 요청-응답 구현
4. **ConfigService**: 환경 변수 주입으로 모든 앱 환경 분리
5. **Kubernetes StatefulSet**: 상태 저장 서비스(RabbitMQ) 운영
6. **Docker Multi-Stage Build**: 번들 크기 최적화
7. **Message Patterns**: send() vs emit() 구분으로 통신 패턴 명확화
8. **Path Aliases**: `@app/shared` alias로 깔끔한 import
9. **Health Checks**: K8s readiness probe로 자동 복구
10. **Scaling & Fault Recovery**: K8s 수평 확장 및 자동 복구 테스트

---

**상태**: 계획 수립 완료. Phase 1부터 순차적으로 구현 시작 준비 완료.
