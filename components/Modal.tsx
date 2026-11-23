'use client';
import {useEffect,useRef} from 'react';
import {X} from 'lucide-react';
export default function Modal({children,onClose,label,wide=false}:{children:React.ReactNode;onClose:()=>void;label:string;wide?:boolean}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const d=ref.current;const old=document.body.style.overflow;d?.showModal();document.body.style.overflow='hidden';return()=>{d?.close();document.body.style.overflow=old;};},[]);return <dialog ref={ref} className={`modal ${wide?'wide':''}`} aria-label={label} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===ref.current)onClose();}}><button className="modal-close icon-btn" aria-label="Close" onClick={onClose}><X size={21}/></button>{children}</dialog>;}
