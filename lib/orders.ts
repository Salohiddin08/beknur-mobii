import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { pool, ready, query } from './db.ts';
import { digest, ApiError } from './security.ts';
export const statuses=['new','reviewing','contacted','confirmed','progress','completed','cancelled'] as const;
export const statusLabels:Record<string,string>={new:'Yangi',reviewing:'Ko‘rib chiqilmoqda',contacted:'Bog‘lanildi',confirmed:'Tasdiqlandi',progress:'Jarayonda',completed:'Yakunlandi',cancelled:'Bekor qilindi'};
const optional=z.string().trim().max(100).optional().default('');
export const orderSchema=z.object({
 name:z.string().trim().min(2).max(100), phone:z.string().transform(s=>s.replace(/[\s()\-]/g,'')).pipe(z.string().regex(/^\+\d{9,15}$/)),business:z.string().trim().min(2).max(160),
 packageId:z.string().max(30),telegram:optional,instagram:optional,industry:optional,note:z.string().trim().max(1500).optional().default(''),
 idempotencyKey:z.uuid(),receipt:z.string().min(32).max(100),website:z.string().max(0).optional()
});
export async function createOrder(raw:unknown) {
 const input=orderSchema.parse(raw);const {idempotencyKey,receipt,website,...data}=input;void website;
 const payloadHash=digest(JSON.stringify(data));await ready();const c=await pool.connect();
 try { await c.query('BEGIN');await c.query('SELECT pg_advisory_xact_lock(hashtext($1))',[idempotencyKey]);
  const existing=await c.query('SELECT * FROM orders WHERE idempotency_key=$1',[idempotencyKey]);
  if(existing.rowCount){if(existing.rows[0].payload_hash!==payloadHash||existing.rows[0].receipt_hash!==digest(receipt))throw new ApiError('IDEMPOTENCY_CONFLICT',409);await c.query('COMMIT');return existing.rows[0];}
  const {rows:p}=await c.query('SELECT * FROM packages WHERE id=$1 AND active=true FOR SHARE',[data.packageId]);if(!p[0])throw new ApiError('PACKAGE_NOT_FOUND');
  const {rows:customer}=await c.query(`INSERT INTO customers(phone,name,business,telegram,instagram) VALUES($1,$2,$3,$4,$5) ON CONFLICT(phone) DO UPDATE SET name=excluded.name,business=excluded.business,telegram=excluded.telegram,instagram=excluded.instagram RETURNING id`,[data.phone,data.name,data.business,data.telegram,data.instagram]);
  const {rows}=await c.query(`INSERT INTO orders(id,customer_id,name,phone,business,telegram,instagram,industry,note,package_id,package_name,price,videos,idempotency_key,payload_hash,receipt_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,[randomUUID(),customer[0].id,data.name,data.phone,data.business,data.telegram,data.instagram,data.industry,data.note,p[0].id,p[0].name,p[0].price,p[0].videos,idempotencyKey,payloadHash,digest(receipt)]);
  const packageDetails=[...(p[0].features_uz||[]),p[0].note_uz||''].filter(Boolean).join('\n');await c.query('UPDATE orders SET package_details=$2 WHERE id=$1',[rows[0].id,packageDetails]);
  await c.query('INSERT INTO order_events(order_id,actor,status) VALUES($1,$2,$3)',[rows[0].id,'website','new']);await c.query('COMMIT');return rows[0];
 } catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export async function changeStatus(id:string,status:string,actor:string) {
 if(!statuses.includes(status as typeof statuses[number]))throw new ApiError('INVALID_STATUS');
 await ready();const c=await pool.connect();try{await c.query('BEGIN');const result=await c.query('UPDATE orders SET status=$2,updated_at=now() WHERE id=$1 RETURNING *',[id,status]);if(!result.rowCount)throw new ApiError('NOT_FOUND',404);await c.query('INSERT INTO order_events(order_id,actor,status) VALUES($1,$2,$3)',[id,actor,status]);await c.query('COMMIT');return result.rows[0];}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}
}
export const orderNumber=(n:number|string)=>`MBK-${String(n).padStart(4,'0')}`;
export async function orderReceipt(id:string,receipt:string){const {rows}=await query('SELECT id,number,delivery_status FROM orders WHERE id=$1 AND receipt_hash=$2',[id,digest(receipt)]);if(!rows[0])throw new ApiError('NOT_FOUND',404);return rows[0];}
