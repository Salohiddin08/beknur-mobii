import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
await mkdir('.local',{recursive:true});
try{await readFile('.env.local');console.log('Existing local configuration preserved.');}catch{const password=randomBytes(24).toString('hex');await writeFile('.env.local',`DATABASE_URL=postgresql://postgres:${password}@127.0.0.1:55432/beknur_mobii\nAPP_ORIGIN=http://localhost:3000\nTELEGRAM_BOT_TOKEN=\nTELEGRAM_CHAT_ID=\nTRUST_PROXY=false\n`,{mode:0o600});console.log('Local configuration created. No Telegram token configured.');}
