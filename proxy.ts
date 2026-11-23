import { NextRequest,NextResponse } from 'next/server';
export function proxy(request:NextRequest){
 const headers=new Headers(request.headers);
 headers.set('x-site-lang',request.nextUrl.pathname.split('/')[1]==='ru'?'ru':'uz');
 return NextResponse.next({request:{headers}});
}
export const config={matcher:['/uz/:path*','/ru/:path*','/admin/:path*','/']};
