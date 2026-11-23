import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { query } from '@/lib/db';
import Website from '@/components/Website';
import type {Lang} from '@/lib/types';
export const dynamic='force-dynamic';
type Props={params:Promise<{lang:string;slug?:string[]}>};
const titles:Record<string,string[]>={home:['Natija olib keladigan kontent','Контент, который приносит результат'],portfolio:['Portfolio','Портфолио'],services:['Xizmatlar','Услуги'],pricing:['Tariflar','Тарифы'],about:['Biz haqimizda','О нас'],contact:['Aloqa','Контакты']};
export async function generateMetadata({params}:Props):Promise<Metadata>{const p=await params;const page=p.slug?.[0]||'home';return {title:titles[page]?.[p.lang==='ru'?1:0],alternates:{languages:{uz:`/uz/${page==='home'?'':page}`,ru:`/ru/${page==='home'?'':page}`}}};}
export default async function Page({params}:Props){const {lang,slug}=await params;const page=slug?.[0]||'home';if(!['uz','ru'].includes(lang)||!titles[page]||(slug?.length||0)>1)notFound();const [packages,content]=await Promise.all([query('SELECT * FROM packages WHERE active=true ORDER BY price'),query('SELECT * FROM content WHERE published=true ORDER BY position DESC,created_at DESC')]);return <Website lang={lang as Lang} page={page} packages={packages.rows} content={content.rows}/>;}
