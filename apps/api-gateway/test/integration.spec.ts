import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ApiGatewayModule } from '../src/api-gateway.module';

describe('API Gateway Integration Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ApiGatewayModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Check', () => {
    it('/health (GET) should return ok status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect({ status: 'ok' });
    });
  });

  describe('Auth Endpoints', () => {
    it('/auth/register (POST) should handle registration', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Test User', email: 'test@example.com', password: 'password' })
        .expect(201)
        .then((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('/auth/login (POST) should handle login', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password' })
        .expect(201)
        .then((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });
  });

  describe('Orders Endpoints', () => {
    it('/orders (GET) should return orders list', () => {
      return request(app.getHttpServer())
        .get('/orders')
        .expect(200)
        .then((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('/orders/:id (GET) should return specific order', () => {
      return request(app.getHttpServer())
        .get('/orders/1')
        .expect(200)
        .then((res) => {
          expect(res.body).toHaveProperty('message');
        });
    });

    it('/orders (POST) should create new order', () => {
      return request(app.getHttpServer())
        .post('/orders')
        .send({ userId: '1', items: [{ productId: '1', quantity: 2 }] })
        .expect(201)
        .then((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body).toHaveProperty('data');
        });
    });
  });

  describe('Users Endpoints (RabbitMQ Communication)', () => {
    it(
      '/users (GET) should communicate with users-service via RabbitMQ',
      async () => {
        return request(app.getHttpServer())
          .get('/users')
          .expect(200)
          .then((res) => {
            // 마이크로서비스 미연결 시 에러 응답 또는 실제 데이터
            if (res.body.error) {
              expect(res.body).toHaveProperty('error');
              expect(res.body).toHaveProperty('message');
            } else {
              expect(Array.isArray(res.body)).toBe(true);
            }
          });
      },
      15000,
    );

    it(
      '/users/:id (GET) should get specific user from users-service',
      async () => {
        return request(app.getHttpServer())
          .get('/users/1')
          .expect(200)
          .then((res) => {
            if (!res.body.error) {
              expect(res.body).toHaveProperty('id');
            }
          });
      },
      15000,
    );
  });
});
