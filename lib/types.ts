export type Lang='uz'|'ru';
export type Package={id:string;name:string;price:number;videos:string;description_uz:string;description_ru:string;active:boolean;features_uz:string[];features_ru:string[];note_uz:string;note_ru:string};
export type Content={id:string;kind:'portfolio'|'review'|'service';title_uz:string;title_ru:string;body_uz:string;body_ru:string;category:string;video_url:string;poster_url:string;source_url?:string;published:boolean};
