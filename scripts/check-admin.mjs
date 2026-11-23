import {readFile,unlink} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3000';
const credentials=await readFile('.local/admin-accounts.txt','utf8');
async function login(username){const password=credentials.split(/\r?\n/).find(l=>l.startsWith(username+': '))?.slice(username.length+2);assert(password);const r=await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:base,'content-type':'application/json'},body:JSON.stringify({username,password})});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0];}
const owner=await login('owner'),manager=await login('manager');let id;let upload;
async function request(path,method='GET',body,cookie=owner){const r=await fetch(base+'/api/'+path,{method,headers:{origin:base,cookie,...(body instanceof FormData?{}:{'content-type':'application/json'})},body:body?body instanceof FormData?body:JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
try{
 assert.equal((await request('admin/content','GET',undefined,manager)).status,403);
 assert.equal((await request('admin/orders','GET',undefined,manager)).status,200);
 const form=new FormData();form.set('file',new Blob([await readFile('public/beknur.png')],{type:'image/png'}),'qa.png');const uploaded=await request('admin/upload','POST',form);assert.equal(uploaded.status,200);upload=uploaded.data.url;
 assert.equal((await fetch(base+upload)).status,200);
 let item={kind:'portfolio',title_uz:'QA temporary portfolio',title_ru:'QA temporary portfolio',body_uz:'',body_ru:'',category:'Reels',video_url:'/portfolio/130.mp4',poster_url:upload,published:false};
 const created=await request('admin/content','POST',item);assert.equal(created.status,200);id=created.data.id;item={...item,id};
 assert(!(await request('public')).data.content.some(c=>c.id===id));
 assert.equal((await request('admin/content','POST',{...item,published:true,title_uz:'QA edited'})).status,200);
 const visible=(await request('public')).data.content.find(c=>c.id===id);assert.equal(visible.title_uz,'QA edited');
 assert.equal((await request('admin/content','POST',{...item,published:false})).status,200);
 assert(!(await request('public')).data.content.some(c=>c.id===id));
 assert.equal((await request('admin/content/'+id,'DELETE')).status,200);id=undefined;
 console.log('PASS: owner login, manager permissions, real image upload, media serving, portfolio create/edit/publish/hide/delete.');
}finally{if(id)await request('admin/content/'+id,'DELETE');if(upload&&/^\/api\/media\/[\w-]+\.png$/.test(upload))await unlink('.local/media/'+upload.split('/').pop());await request('auth/logout','POST',undefined,owner);await request('auth/logout','POST',undefined,manager);}
