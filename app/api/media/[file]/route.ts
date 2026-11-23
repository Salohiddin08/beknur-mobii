import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import path from 'node:path';
export const runtime='nodejs';
type Context={params:Promise<{file:string}>};
async function serve(request:Request,{params}:Context){
 const {file}=await params;
 if(!/^[\w-]+\.(mp4|jpg|png|webp)$/.test(file))return new Response(null,{status:404});
 const location=path.join(process.env.MEDIA_DIR||path.join(process.cwd(),'.local/media'),file);
 let size:number;
 try{const info=await stat(location);if(!info.isFile())return new Response(null,{status:404});size=info.size;}catch{return new Response(null,{status:404});}
 const ext=file.split('.').pop();
 const headers=new Headers({'Content-Type':ext==='mp4'?'video/mp4':`image/${ext==='jpg'?'jpeg':ext}`,'Accept-Ranges':'bytes','Cache-Control':'public,max-age=86400','X-Content-Type-Options':'nosniff'});
 let start=0,end=size-1,status=200;
 const range=request.headers.get('range');
 if(range){
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
  end=match[1]&&match[2]?Math.min(Number(match[2]),size-1):size-1;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}});
  status=206;headers.set('Content-Range',`bytes ${start}-${end}/${size}`);
 }
 headers.set('Content-Length',String(Math.max(0,end-start+1)));
 if(request.method==='HEAD'||size===0)return new Response(null,{status,headers});
 const stream=createReadStream(location,{start,end});
 const abort=()=>stream.destroy();request.signal.addEventListener('abort',abort,{once:true});
 stream.once('close',()=>request.signal.removeEventListener('abort',abort));
 return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>,{status,headers});
}
export {serve as GET,serve as HEAD};
