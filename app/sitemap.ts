import type {MetadataRoute} from 'next';
import {pages,pageUrl} from '@/lib/seo';
export const dynamic='force-dynamic';
export default function sitemap():MetadataRoute.Sitemap{return ['uz','ru'].flatMap(lang=>pages.map(p=>({url:pageUrl(lang,p),alternates:{languages:{uz:pageUrl('uz',p),ru:pageUrl('ru',p),'x-default':pageUrl('uz',p)}},changeFrequency:'weekly' as const,priority:p?0.7:1})));}
