import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { siteOrigin,indexable } from '@/lib/seo';
import './globals.css';
import './cinema.css';
export function generateMetadata():Metadata{return {metadataBase:new URL(siteOrigin()),title:{default:'Beknur Mobii — Farg‘onada mobilografiya',template:'%s | Beknur Mobii'},description:'Farg‘ona viloyatida biznes va shaxsiy brendlar uchun mobilografiya, Reels va reklama videolari.',icons:{icon:'/logo.svg'},robots:{index:indexable(),follow:indexable()},verification:{google:process.env.GOOGLE_SITE_VERIFICATION||undefined}};}
export default async function Layout({children}:{children:React.ReactNode}){const lang=(await headers()).get('x-site-lang')==='ru'?'ru':'uz';return <html lang={lang}><body>{children}</body></html>;}
