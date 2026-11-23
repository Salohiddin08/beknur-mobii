import {query} from '../lib/db.ts';
import {telegram,deliverOrders,handleUpdate} from '../lib/telegram.ts';
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
if(!process.env.TELEGRAM_BOT_TOKEN||!process.env.TELEGRAM_CHAT_ID){console.log('Telegram not configured. Orders remain safely queued in PostgreSQL.');process.exit(0);}
console.log('Telegram worker started for configured team group.');
await telegram('deleteWebhook',{drop_pending_updates:false});
while(true){try{await deliverOrders(10);const {rows}=await query("SELECT value FROM app_state WHERE key='telegram_offset'");let offset=Number(rows[0]?.value||0);const updates=await telegram('getUpdates',{offset,timeout:20,allowed_updates:['message','callback_query']});for(const update of updates){try{await handleUpdate(update);}catch{console.error('Update handling failed; subsequent updates will continue.');}offset=update.update_id+1;await query("INSERT INTO app_state(key,value) VALUES('telegram_offset',$1) ON CONFLICT(key) DO UPDATE SET value=excluded.value",[String(offset)]);}}catch{console.error('Telegram temporarily unavailable; retrying in 15 seconds.');await sleep(15000);}}
