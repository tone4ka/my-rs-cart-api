import { Injectable } from '@nestjs/common';

import { v4 } from 'uuid';

import { Cart } from '../models';
import { Client, ClientConfig } from 'pg';

const DEFAULT_USER_ID = "8c60144a-7572-41a6-bbda-cee188679124";

const {  PG_HOST, PG_PORT, PG_DATABASE, PG_USERNAME, PG_PASSWORD } = process.env;
const options: ClientConfig = {
  host: PG_HOST,
  port: +PG_PORT,
  database: PG_DATABASE,
  user: PG_USERNAME,
  password: PG_PASSWORD,
  connectionTimeoutMillis: 15000,
};

export enum CartStatuses {
  OPEN = 'OPENED',
  ORDERED = "ORDERED",
}

@Injectable()
export class CartService {
  // private client: Client;

  // async constructor() {
  //   this.client = new Client(options); 
  //   await this.client.connect();
  // };

  async findByUserId(userId: string): Promise<Cart> {
    const id = userId || DEFAULT_USER_ID;
    const client = new Client(options);

    try{
      await client.connect();

      const queryCartsText = `select * from carts where user_id = '${id}'`;
      const result = await client.query(queryCartsText);
      const cart = result.rows[0];

      const queryItemsText = `select * from cart_items where cart_id = '${cart.id}'`;
      const items = (await client.query(queryItemsText)).rows;
    
      cart.items = items.map((item) => {
        item.product = {
          id: item.product_id
        }
        return item;
      });

      return cart;

    } catch(e) {
      console.log(e);
    } finally {
      await client.end();
    }
  }

  async createByUserId(userId: string): Promise<Cart> {
    const id = userId || DEFAULT_USER_ID;
    const now = new Date();

    const columns = "user_id, created_at, updated_at, status";
    const values = `'${id}', '${now}', '${now}', '${CartStatuses.OPEN}'`;
    const queryText = `INSERT INTO carts(${columns}) VALUES(${values}) RETURNING *`;


    const client = new Client(options);

    try {
      await client.connect();

      const result = await client.query(queryText);
  
      return result.rows[0] as Cart;
    } catch(e) {
      console.log(e);
    } finally {
      await client.end();
    }

  }

  async findOrCreateByUserId(userId: string): Promise<Cart> {
    const userCart = await this.findByUserId(userId || DEFAULT_USER_ID);

    if (userCart) {
      return userCart;
    }

    const result = await this.createByUserId(userId);

    return result;
  }

  async updateByUserId(userId: string, req): Promise<Cart> {
    const { items } = JSON.parse(req.toString()); 
    const client = new Client(options);
    await client.connect();

    const { id, ...rest } = await this.findOrCreateByUserId(userId);

    const updatedCart = {
      id,
      ...rest,
      items: [ ...items, ...rest.items ],
    }

    try {
      await Promise.all(items.map((item) => {
        const values = `'${id}', '${item.count}', '${item.product.id}'`;
        const queryText = `insert into cart_items (cart_id, count, product_id) values(${values})`;
        return client.query(queryText);
      }));

      return { ...updatedCart };
    } catch(e) {
      console.log(e);
    } finally {
      await client.end();
    }
  }

  async checkoutByUserId(userId): Promise<void> {
    const client = new Client(options);

    try {
      await client.connect();

      const queryText = `UPDATE carts SET status = 'ORDERED' WHERE user_id = '${DEFAULT_USER_ID}';`
      await client.query(queryText);
    } catch(e) {
      console.log(e);
    } finally {
      await client.end();
    }
  }

  async removeByUserId(userId): Promise<void> {
    const client = new Client(options);

    try {
      await client.connect();

      const { id } = await this.findOrCreateByUserId(DEFAULT_USER_ID);

      const queryText = `DELETE FROM cart_items WHERE cart_id = '${id}'`
       await client.query(queryText);
    } catch(e) {
      console.log(e);
    } finally {
      await client.end();
    }
  }
}
