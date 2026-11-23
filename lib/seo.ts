export const siteOrigin=()=>new URL(process.env.APP_ORIGIN||'http://localhost:3000').origin;
export const indexable=()=>process.env.SITE_INDEXABLE==='true'&&siteOrigin().startsWith('https://');
export const pages=['','portfolio','services','pricing','about','contact'];
export const pageUrl=(lang:string,page='')=>`${siteOrigin()}/${lang}${page?'/'+page:''}`;
