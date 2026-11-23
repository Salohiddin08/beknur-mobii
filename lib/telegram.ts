import { pool, query, ready } from './db.ts';
import { orderNumber, statusLabels, changeStatus } from './orders.ts';
type Order=Record<string,any>;
export function orderMessage(o:Order) {return `🆕 BEKNUR MOBII — YANGI BUYURTMA\n\n🆔 ${orderNumber(o.number)}\n👤 ${o.name}\n📞 ${o.phone}\n✈️ Telegram: ${o.telegram||'—'}\n📸 Instagram: ${o.instagram||'—'}\n\n🏢 Biznes: ${o.business}\n📂 Yo‘nalish: ${o.industry||'—'}\n\n💎 ${o.package_name} — $${o.price}\n🎬 ${o.videos} ta video / 30 kun\n📝 ${o.note||'—'}\n\n📍 Holat: ${statusLabels[o.status]}\n🌐 BEKNUR MOBII WEBSITE`;}
export function keyboard(id:string){return {inline_keyboard:Object.entries(statusLabels).map(([key,label])=>[{text:label,callback_data:`s:${id}:${key}`}])};}
export async function telegram(method:string,body:unknown){
 const token=process.env.TELEGRAM_BOT_TOKEN;if(!token)throw new Error('TELEGRAM_NOT_CONFIGURED');
 const response=await fetch(`https://api.telegram.org/bot${token}/${method}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(method==='getUpdates'?35000:10000)});
 const data=await response.json();if(!data.ok)throw new Error(`TELEGRAM_${data.error_code||response.status}`);return data.result;
}
export async function deliverOrders(limit=5) {
 if(!process.env.TELEGRAM_BOT_TOKEN||!process.env.TELEGRAM_CHAT_ID)return 0;
 await ready();let delivered=0;
 for(let i=0;i<limit;i++) {const c=await pool.connect();try{await c.query('BEGIN');const {rows}=await c.query("SELECT * FROM orders WHERE delivery_status='pending' AND next_attempt_at<=now() ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1");const o=rows[0];if(!o){await c.query('COMMIT');break;}
  try{const sent=await telegram('sendMessage',{chat_id:process.env.TELEGRAM_CHAT_ID,text:orderMessage(o),reply_markup:keyboard(o.id)});await c.query("UPDATE orders SET delivery_status='sent',telegram_message_id=$2,delivery_attempts=delivery_attempts+1 WHERE id=$1",[o.id,sent.message_id]);delivered++;}
  catch{await c.query("UPDATE orders SET delivery_attempts=delivery_attempts+1,next_attempt_at=now()+LEAST(3600,30*power(2,LEAST(delivery_attempts,7))) * interval '1 second' WHERE id=$1",[o.id]);}
  await c.query('COMMIT');
 }catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 return delivered;
}
export async function handleUpdate(update:any){
 const chat=process.env.TELEGRAM_CHAT_ID; const msg=update.message;const cb=update.callback_query;
 if(cb){if(String(cb.message?.chat.id)!==chat||cb.from?.is_bot)return;const parts=String(cb.data).split(':');if(parts.length!==3||parts[0]!=='s')return;
  const member=await telegram('getChatMember',{chat_id:chat,user_id:cb.from.id});if(!['creator','administrator','member','restricted'].includes(member.status)||(member.status==='restricted'&&!member.is_member))return;
  const order=await changeStatus(parts[1],parts[2],`telegram:${cb.from.id}`);await telegram('answerCallbackQuery',{callback_query_id:cb.id,text:'Holat yangilandi'});
  await telegram('editMessageText',{chat_id:chat,message_id:cb.message.message_id,text:orderMessage(order),reply_markup:keyboard(order.id)});return;
 }
 if(!msg||String(msg.chat.id)!==chat||msg.from?.is_bot)return;
 const command=(msg.text||'').split(/\s/)[0].split('@')[0];
 if(command==='/start'||command==='/help'){await telegram('sendMessage',{chat_id:chat,text:'Beknur Mobii jamoa boshqaruvi\n/orders — oxirgi 20 buyurtma\n/new — yangi buyurtmalar\n/stats — statistika\nBuyurtma xabaridagi tugmalar holatni yangilaydi.'});}
 if(command==='/orders'||command==='/new'){const {rows}=await query(`SELECT * FROM orders ${command==='/new'?"WHERE status='new'":''} ORDER BY created_at DESC LIMIT 20`);await telegram('sendMessage',{chat_id:chat,text:rows.map(o=>`${orderNumber(o.number)} · ${o.name} · ${o.phone}\n${o.package_name} $${o.price} · ${statusLabels[o.status]}`).join('\n\n')||'Buyurtmalar yo‘q.'});}
 if(command==='/stats'){const {rows}=await query('SELECT status,count(*)::integer as total FROM orders GROUP BY status');await telegram('sendMessage',{chat_id:chat,text:'📊 Buyurtmalar\n'+(rows.map(o=>`${statusLabels[o.status]}: ${o.total}`).join('\n')||'Hozircha 0 ta')});}
}
