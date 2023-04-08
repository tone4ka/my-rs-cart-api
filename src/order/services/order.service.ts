import { Injectable } from '@nestjs/common';
import { v4 } from 'uuid';

import { Order } from '../models';
import { Client, ClientConfig } from 'pg';

const DEFAULT_USER_ID = "8c60144a-7572-41a6-bbda-cee188679124";

const {  PG_HOST, PG_PORT, PG_DATABASE, PG_USERNAME, PG_PASSWORD } = process.env;
const options: ClientConfig = {
  host: PG_HOST,
  port: +PG_PORT,
  database: PG_DATABASE,
  user: PG_USERNAME,
  password: PG_PASSWORD,
  connectionTimeoutMillis: 5000,
};

@Injectable()
export class OrderService {
  private orders: Record<string, Order> = {}

  findById(orderId: string): Order {
    return this.orders[ orderId ];
  }

  async create(data: any) {
    const client = new Client(options);
    try {
      await client.connect();
   
      const queryCartsText = `select * from carts where user_id = '${DEFAULT_USER_ID}'`;
      const result = await client.query(queryCartsText);
      const cart = result.rows[0];

      const queryItemsText = `select * from cart_items where cart_id = '${cart.id}'`;
      const items = (await client.query(queryItemsText)).rows;
  
      const columns = "user_id, status, cart_id, payment, delivery, comments, total";
      const someJsonObject = JSON.stringify({});
      const text = "Some comment text";
      const total = items.length
  
      const values = `'${DEFAULT_USER_ID}', 'inProgress', '${cart.id}', '${someJsonObject}', '${someJsonObject}', '${text}', '${total}'`;
      
      const queryOrdersText = `INSERT INTO orders(${columns}) VALUES(${values}) RETURNING *`;

      const creationResult = await client.query(queryOrdersText);
  
      return creationResult;
    } catch(e) {
      console.log(e);
    } finally {
      await client.end();
    }
  }

  update(orderId, data) {
    const order = this.findById(orderId);

    if (!order) {
      throw new Error('Order does not exist.');
    }

    this.orders[ orderId ] = {
      ...data,
      id: orderId,
    }
  }
}
