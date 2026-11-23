import { spawn } from 'node:child_process';
import { once } from 'node:events';
import net from 'node:net';
import dotenv from 'dotenv';
const run=(args)=>spawn(process.execPath,args,{stdio:'inherit',windowsHide:true});
const setup=run(['scripts/setup.mjs']);await once(setup,'exit');dotenv.config({path:'.env.local',quiet:true});
const children=[];const dbPort=Number(new URL(process.env.DATABASE_URL).port||5432);
const check=()=>new Promise(resolve=>{const s=net.connect(dbPort,'127.0.0.1');s.on('connect',()=>{s.destroy();resolve(true);});s.on('error',()=>resolve(false));});
if(!await check()){children.push(run(['scripts/database.mjs']));for(let i=0;i<60&&!await check();i++)await new Promise(r=>setTimeout(r,1000));}
if(!await check())throw new Error('PostgreSQL did not start');
const seed=run(['--env-file=.env.local','--experimental-strip-types','scripts/seed.ts']);const [code]=await once(seed,'exit');if(code!==0)process.exit(Number(code)||1);
children.push(run(['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1']));children.push(run(['--env-file=.env.local','--experimental-strip-types','scripts/bot.ts']));
process.on('SIGINT',()=>{children.forEach(c=>c.kill('SIGTERM'));});process.on('SIGTERM',()=>{children.forEach(c=>c.kill('SIGTERM'));});
