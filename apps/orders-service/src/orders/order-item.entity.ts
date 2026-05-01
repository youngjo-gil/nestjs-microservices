// import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
// import { Order } from './order.entity';

// @Entity('order_items')
// export class OrderItem {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @ManyToOne(() => Order, order => order.items)
//   order: Order;

//   @Column('uuid')
//   productId: string;

//   @Column('int')
//   quantity: number;

//   @Column('decimal', { precision: 10, scale: 2 })
//   price: number;
// }
