import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { query } from './db.ts';
export const digest = (value:string) => createHash('sha256').update(value).digest('hex');
export function hashPassword(password:string) { const salt=randomBytes(16).toString('hex'); return `${salt}:${scryptSync(password,salt,64).toString('hex')}`; }
export function verifyPassword(password:string, stored:string) { try { const [salt,hash]=stored.split(':'); const expected=Buffer.from(hash,'hex'); const actual=scryptSync(password,salt,64); return expected.length===actual.length && timingSafeEqual(expected,actual); } catch { return false; } }
export class ApiError extends Error { status:number; constructor(message:string,status=400) {super(message);this.status=status;} }
export function assertOrigin(request:Request) {
  const origin=request.headers.get('origin'); const target=new URL(request.url).origin;
  const allowed=[target,process.env.APP_ORIGIN];
  if(process.env.APP_ORIGIN){const configured=new URL(process.env.APP_ORIGIN);if(['localhost','127.0.0.1'].includes(configured.hostname)){for(const hostname of ['localhost','127.0.0.1']){configured.hostname=hostname;allowed.push(configured.origin);}}}
  if (!origin || !allowed.includes(origin)) throw new ApiError('ORIGIN_DENIED',403);
}
export function ipKey(request:Request) { return process.env.TRUST_PROXY==='true' ? (request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown') : 'local'; }
export async function rateLimit(key:string,limit:number,seconds:number) {
  const {rows}=await query(`INSERT INTO rate_limits(key,hits,reset_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN rate_limits.reset_at<now() THEN 1 ELSE rate_limits.hits+1 END, reset_at=CASE WHEN rate_limits.reset_at<now() THEN now()+$2*interval '1 second' ELSE rate_limits.reset_at END RETURNING hits`,[digest(key),seconds]);
  if(rows[0].hits>limit) throw new ApiError('TOO_MANY_REQUESTS',429);
}
export type AuthUser={id:number;username:string;role:'developer'|'owner'|'manager'};
export async function getUser(request:Request):Promise<AuthUser|null> {
  const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('bm_session='))?.slice(11);
  if(!token) return null;
  const {rows}=await query('SELECT u.id,u.username,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()',[digest(token)]);
  return rows[0] || null;
}
export async function requireUser(request:Request,full=false) {const user=await getUser(request);if(!user) throw new ApiError('UNAUTHORIZED',401);if(full&&user.role==='manager') throw new ApiError('FORBIDDEN',403);return user;}
export async function jsonBody(request:Request) { if(Number(request.headers.get('content-length'))>20000)throw new ApiError('BODY_TOO_LARGE',413);const text=await request.text();if(text.length>20000)throw new ApiError('BODY_TOO_LARGE',413);try{return JSON.parse(text);}catch{throw new ApiError('INVALID_JSON');} }
export function apiError(error:unknown) { if(error instanceof ApiError)return Response.json({error:error.message},{status:error.status});if(error instanceof Error&&error.name==='ZodError')return Response.json({error:'VALIDATION_ERROR'},{status:400});console.error('API failure:',error instanceof Error?error.message.replace(/postgres(?:ql)?:\/\/[^\s]+/g,'[database]'):'unknown');return Response.json({error:'SERVER_UNAVAILABLE'},{status:503}); }
