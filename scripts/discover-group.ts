import {telegram} from '../lib/telegram.ts';
if(!process.env.TELEGRAM_BOT_TOKEN)throw new Error('Set the NEW token privately in .env.local first.');
const updates=await telegram('getUpdates',{timeout:0,allowed_updates:['message','my_chat_member']});const groups=new Map();for(const u of updates){const chat=u.message?.chat||u.my_chat_member?.chat;if(chat&&['group','supergroup'].includes(chat.type))groups.set(chat.id,chat.title);}console.log(groups.size?[...groups].map(([id,title])=>`${title}: ${id}`).join('\n'):'Guruhga /start yuboring, keyin ushbu buyruqni qayta bajaring.');
