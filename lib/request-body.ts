// Count bytes while reading, including requests without Content-Length.
export class BodyLimitError extends Error {}
export async function boundedBody(request:Request,limit:number):Promise<Uint8Array>{
 if(Number(request.headers.get('content-length'))>limit)throw new BodyLimitError();
 const reader=request.body?.getReader();if(!reader)return new Uint8Array();
 const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new BodyLimitError();}chunks.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return bytes;
}
