import EmbeddedPostgres from 'embedded-postgres';
import dotenv from 'dotenv';
import { access } from 'node:fs/promises';
import pg from 'pg';
dotenv.config({path:'.env.local',quiet:true});
const url=new URL(process.env.DATABASE_URL);if(!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('Embedded database is local-only. Use your external PostgreSQL server directly.');
const database=new EmbeddedPostgres({databaseDir:'.local/postgres',user:url.username,password:url.password,port:Number(url.port),persistent:true,authMethod:'scram-sha-256',postgresFlags:['-h','127.0.0.1'],initdbFlags:['--encoding=UTF8','--locale=C'],onLog:()=>{},onError:message=>{if(String(message).includes('FATAL')||String(message).includes('ERROR'))console.error(String(message));}});
try{await access('.local/postgres/PG_VERSION');}catch{await database.initialise();}
await database.start();
const client=new pg.Client({connectionString:process.env.DATABASE_URL.replace(/\/beknur_mobii$/,'/postgres')});await client.connect();const exists=await client.query("SELECT 1 FROM pg_database WHERE datname='beknur_mobii'");if(!exists.rowCount)await client.query('CREATE DATABASE beknur_mobii');await client.end();console.log('PostgreSQL ready on 127.0.0.1:'+url.port);
let stopping=false;async function stop(){if(stopping)return;stopping=true;await database.stop();process.exit(0);}process.on('SIGINT',stop);process.on('SIGTERM',stop);setInterval(()=>{},60000);
