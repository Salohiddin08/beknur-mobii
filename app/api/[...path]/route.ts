import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { query } from '@/lib/db';
import { apiError,ApiError,assertOrigin,digest,getUser,ipKey,jsonBody,rateLimit,requireUser,verifyPassword,hashPassword } from '@/lib/security';
import { createOrder,orderReceipt,changeStatus } from '@/lib/orders';
import { deliverOrders } from '@/lib/telegram';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{path:string[]}>};
const media=z.string().max(2000).refine(s=>!s||/^\/(?:portfolio|api\/media)\/[\w.\-]+$/.test(s)||/^https:\/\//.test(s));
const contentSchema=z.object({id:z.uuid().optional(),kind:z.enum(['portfolio','review','service']),title_uz:z.string().trim().min(1).max(200),title_ru:z.string().trim().min(1).max(200),body_uz:z.string().max(4000).default(''),body_ru:z.string().max(4000).default(''),category:z.string().max(80).default('Reels'),video_url:media.default(''),poster_url:media.default(''),published:z.boolean().default(true)});
async function route(req:Request,ctx:Ctx){try{
 const segments=(await ctx.params).path;const endpoint=segments.join('/');const url=new URL(req.url);const method=req.method;
 if(method!=='GET')assertOrigin(req);
 if(method==='GET'&&endpoint==='public'){
  const [packages,content]=await Promise.all([query('SELECT * FROM packages WHERE active=true ORDER BY price'),query('SELECT * FROM content WHERE published=true ORDER BY position DESC,created_at DESC')]);
  return Response.json({packages:packages.rows,content:content.rows});
 }
 if(method==='POST'&&endpoint==='orders'){
  await rateLimit('orders:'+ipKey(req),15,600);const order=await createOrder(await jsonBody(req));await deliverOrders(1);
  const {rows}=await query('SELECT id,number,delivery_status FROM orders WHERE id=$1',[order.id]);return Response.json(rows[0],{status:201});
 }
 if(method==='GET'&&segments[0]==='receipt'){
  if(!z.uuid().safeParse(segments[1]).success)throw new ApiError('NOT_FOUND',404);
  return Response.json(await orderReceipt(segments[1],req.headers.get('x-order-receipt')||''));
 }
 if(method==='GET'&&endpoint==='auth'){return Response.json({user:await getUser(req)});}
 if(method==='POST'&&endpoint==='auth/login'){
  await rateLimit('login:'+ipKey(req),12,900);const data=z.object({username:z.string().min(1).max(80),password:z.string().min(1).max(200)}).parse(await jsonBody(req));
  const {rows}=await query('SELECT * FROM users WHERE username=$1',[data.username]);const dummy='00000000000000000000000000000000:'+ '00'.repeat(64);
  if(!verifyPassword(data.password,rows[0]?.password_hash||dummy)||!rows[0])throw new ApiError('INVALID_LOGIN',401);
  const token=randomBytes(32).toString('hex');await query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '12 hours')",[digest(token),rows[0].id]);
  return Response.json({ok:true},{headers:{'Set-Cookie':`bm_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${process.env.NODE_ENV==='production'&&process.env.APP_ORIGIN?.startsWith('https:')?'; Secure':''}`}});
 }
 if(method==='POST'&&endpoint==='auth/logout'){
  const token=req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('bm_session='))?.slice(11);
  if(token)await query('DELETE FROM sessions WHERE token_hash=$1',[digest(token)]);
  return Response.json({ok:true},{headers:{'Set-Cookie':'bm_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'}});
 }
 if(method==='POST'&&endpoint==='auth/password'){
  const user=await requireUser(req);const data=z.object({current:z.string().max(200),password:z.string().min(12).max(200)}).parse(await jsonBody(req));const {rows}=await query('SELECT password_hash FROM users WHERE id=$1',[user.id]);
  if(!verifyPassword(data.current,rows[0].password_hash))throw new ApiError('INVALID_LOGIN',401);
  await query('UPDATE users SET password_hash=$2 WHERE id=$1',[user.id,hashPassword(data.password)]);await query('DELETE FROM sessions WHERE user_id=$1',[user.id]);return Response.json({ok:true});
 }
 if(segments[0]==='admin'){
  const user=await requireUser(req,['content','packages','upload'].includes(segments[1]));
  if(method==='GET'&&endpoint==='admin/dashboard'){
   const [stats,customers]=await Promise.all([query("SELECT count(*)::int as total,count(*) FILTER(WHERE status='new')::int as new,count(*) FILTER(WHERE status='progress')::int as progress,count(*) FILTER(WHERE status='completed')::int as completed,count(*) FILTER(WHERE delivery_status='pending')::int as pending,coalesce(sum(price) FILTER(WHERE status='completed'),0)::int as completed_value FROM orders"),query('SELECT count(*)::int AS total FROM customers')]);
   return Response.json({stats:stats.rows[0],customers:customers.rows[0].total,telegramConfigured:!!(process.env.TELEGRAM_BOT_TOKEN&&process.env.TELEGRAM_CHAT_ID)});
  }
  if(method==='GET'&&endpoint==='admin/orders'){
   const search=(url.searchParams.get('q')||'').slice(0,100);const status=url.searchParams.get('status')||'';const customer=url.searchParams.get('customer')||'';
   const {rows}=await query(`SELECT * FROM orders WHERE ($1='' OR name ILIKE $2 OR phone ILIKE $2 OR business ILIKE $2 OR ('MBK-'||lpad(number::text,4,'0')) ILIKE $2) AND ($3='' OR status=$3) AND ($4='' OR customer_id::text=$4) ORDER BY created_at DESC LIMIT 500`,[search,`%${search}%`,status,customer]);return Response.json({orders:rows});
  }
  if(method==='PATCH'&&segments[1]==='orders'){
   const data=z.object({status:z.string()}).parse(await jsonBody(req));return Response.json(await changeStatus(z.uuid().parse(segments[2]),data.status,`admin:${user.username}`));
  }
  if(method==='POST'&&segments[1]==='retry'){
   await query("UPDATE orders SET next_attempt_at=now() WHERE id=$1 AND delivery_status='pending'",[z.uuid().parse(segments[2])]);await deliverOrders(10);return Response.json({ok:true});
  }
  if(method==='GET'&&endpoint==='admin/customers'){
   const search=(url.searchParams.get('q')||'').slice(0,100);const {rows}=await query(`SELECT c.*,count(o.id)::int as orders FROM customers c LEFT JOIN orders o ON o.customer_id=c.id WHERE c.name ILIKE $1 OR c.phone ILIKE $1 OR c.business ILIKE $1 GROUP BY c.id ORDER BY c.created_at DESC LIMIT 500`,[`%${search}%`]);return Response.json({customers:rows});
  }
  if(method==='PATCH'&&segments[1]==='customers'){
   const data=z.object({name:z.string().min(2).max(100),business:z.string().min(2).max(160),telegram:z.string().max(100),instagram:z.string().max(100)}).parse(await jsonBody(req));
   await query('UPDATE customers SET name=$2,business=$3,telegram=$4,instagram=$5 WHERE id=$1',[Number(segments[2]),data.name,data.business,data.telegram,data.instagram]);return Response.json({ok:true});
  }
  if(method==='GET'&&endpoint==='admin/packages'){return Response.json({packages:(await query('SELECT * FROM packages ORDER BY price')).rows});}
  if(method==='PATCH'&&segments[1]==='packages'){
   const p=z.object({price:z.number().int().min(1).max(1000000),videos:z.string().min(1).max(30),description_uz:z.string().max(500),description_ru:z.string().max(500),active:z.boolean(),features_uz:z.array(z.string().max(500)).max(30),features_ru:z.array(z.string().max(500)).max(30),note_uz:z.string().max(500),note_ru:z.string().max(500)}).parse(await jsonBody(req));
   await query('UPDATE packages SET price=$2,videos=$3,description_uz=$4,description_ru=$5,active=$6,features_uz=$7,features_ru=$8,note_uz=$9,note_ru=$10 WHERE id=$1',[segments[2],p.price,p.videos,p.description_uz,p.description_ru,p.active,JSON.stringify(p.features_uz),JSON.stringify(p.features_ru),p.note_uz,p.note_ru]);return Response.json({ok:true});
  }
  if(method==='GET'&&endpoint==='admin/content'){return Response.json({content:(await query('SELECT * FROM content ORDER BY created_at DESC')).rows});}
  if(method==='POST'&&endpoint==='admin/content'){
   const d=contentSchema.parse(await jsonBody(req));const id=d.id||randomUUID();await query(`INSERT INTO content(id,kind,title_uz,title_ru,body_uz,body_ru,category,video_url,poster_url,published) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO UPDATE SET title_uz=excluded.title_uz,title_ru=excluded.title_ru,body_uz=excluded.body_uz,body_ru=excluded.body_ru,category=excluded.category,video_url=excluded.video_url,poster_url=excluded.poster_url,published=excluded.published`,[id,d.kind,d.title_uz,d.title_ru,d.body_uz,d.body_ru,d.category,d.video_url,d.poster_url,d.published]);return Response.json({ok:true,id});
  }
  if(method==='DELETE'&&segments[1]==='content'){
   const removed=await query('DELETE FROM content WHERE id=$1 RETURNING video_url,poster_url',[z.uuid().parse(segments[2])]);
   for(const item of removed.rows){for(const url of [item.video_url,item.poster_url]){
    if(!/^\/api\/media\/[\w-]+\.(mp4|jpg|png|webp)$/.test(url))continue;
    const used=await query('SELECT 1 FROM content WHERE video_url=$1 OR poster_url=$1 LIMIT 1',[url]);
    if(!used.rowCount)await unlink(path.join(process.cwd(),'.local/media',path.basename(url))).catch(()=>console.warn('Unused media cleanup deferred'));
   }}
   return Response.json({ok:true});
  }
  if(method==='POST'&&endpoint==='admin/upload'){
   if(Number(req.headers.get('content-length'))>160*1024*1024)throw new ApiError('FILE_TOO_LARGE',413);
   const form=await req.formData();const file=form.get('file');if(!(file instanceof File)||file.size>150*1024*1024)throw new ApiError('FILE_TOO_LARGE',413);
   const buffer=Buffer.from(await file.arrayBuffer());let ext='';
   if(buffer.subarray(4,8).toString()==='ftyp')ext='mp4';else if(buffer.subarray(0,3).toString('hex')==='ffd8ff')ext='jpg';else if(buffer.subarray(0,8).toString('hex')==='89504e470d0a1a0a')ext='png';else if(buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP')ext='webp';
   if(!ext)throw new ApiError('UNSUPPORTED_FILE');const name=`${randomUUID()}.${ext}`;await mkdir(path.join(process.cwd(),'.local/media'),{recursive:true});await writeFile(path.join(process.cwd(),'.local/media',name),buffer);return Response.json({url:`/api/media/${name}`});
  }
 }
 throw new ApiError('NOT_FOUND',404);
}catch(e){return apiError(e);}}
export {route as GET,route as POST,route as PATCH,route as DELETE};
