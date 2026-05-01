// import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
// import { OrderItem } from './order-item.entity';

// @Entity('orders')
// export class Order {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column('uuid')
//   userId: string;

//   @Column({ default: 'pending' })
//   status: string;

//   @OneToMany(() => OrderItem, item => item.order, { cascade: true })
//   items: OrderItem[];

//   @CreateDateColumn()
//   createdAt: Date;
// }
