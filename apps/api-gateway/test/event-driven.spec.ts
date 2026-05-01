import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ApiGatewayModule } from '../src/api-gateway.module';

describe('Event-Driven Pattern (Orders → Notifications)', () => {
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

  describe('POST /orders (emit event to notifications)', () => {
    it('should create an order and emit order.created event to notifications queue', async () => {
      const orderPayload = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        items: [
          {
            name: 'Product 1',
            quantity: 2,
            price: 29.99,
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post('/orders')
        .send(orderPayload)
        .expect(201);

      expect(response.body).toBeDefined();
      expect(response.body.id).toBeDefined();
      expect(response.body.userId).toBe(orderPayload.userId);
      expect(response.body.status).toBe('pending');
      expect(response.body.items).toBeDefined();

      // In a real test, we would verify that the event was received
      // by the notifications service. For now, we verify the response.
    }, 15000);
  });

  describe('GET /orders', () => {
    it('should retrieve all orders from orders-service', async () => {
      const response = await request(app.getHttpServer())
        .get('/orders')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
    }, 10000);
  });

  describe('GET /orders/:id', () => {
    it('should retrieve a specific order from orders-service', async () => {
      // First create an order
      const createResponse = await request(app.getHttpServer())
        .post('/orders')
        .send({
          userId: '123e4567-e89b-12d3-a456-426614174000',
          items: [{ name: 'Test Product', quantity: 1, price: 99.99 }],
        })
        .expect(201);

      const orderId = createResponse.body.id;

      // Then retrieve it
      const getResponse = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .expect(200);

      expect(getResponse.body).toBeDefined();
      expect(getResponse.body.id).toBe(orderId);
    }, 15000);
  });
});
