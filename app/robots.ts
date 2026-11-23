import type {MetadataRoute} from 'next';
import {siteOrigin,indexable} from '@/lib/seo';
export const dynamic='force-dynamic';
export default function robots():MetadataRoute.Robots{return {rules:indexable()?{userAgent:'*',allow:'/',disallow:['/admin','/api/']}:{userAgent:'*',disallow:'/'},sitemap:`${siteOrigin()}/sitemap.xml`};}
