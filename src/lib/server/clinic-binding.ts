import { AppError } from './errors';
const blocked=['aaevrjkhfgazbudipjgb','kohuycbqadlnhkbbqcir'];
export function assertClinicTarget(target:string,requireBinding=false):void {
 if(blocked.some(ref=>target.toLowerCase().includes(ref)))throw new AppError(503,'clinic_binding','Este projeto não pertence à clínica. Use um Supabase exclusivo da Benchimol.');
 let parsed:URL;try{parsed=new URL(target);}catch{throw new AppError(503,'clinic_binding','Destino de banco inválido.');}
 if(['localhost','127.0.0.1'].includes(parsed.hostname))return;
 const binding=process.env.SUPABASE_CLINIC_PROJECT_REF;
 if(requireBinding&&(!binding||!/^[a-z0-9]{20}$/.test(binding)))throw new AppError(503,'clinic_binding','Defina o projeto Supabase exclusivo da clínica antes de executar a operação.');
 if(binding){
  const direct=parsed.hostname===`${binding}.supabase.co`||parsed.hostname===`db.${binding}.supabase.co`;
  const pooled=/\.pooler\.supabase\.com$/.test(parsed.hostname)&&decodeURIComponent(parsed.username)===`postgres.${binding}`;
  if(blocked.includes(binding)||!direct&&!pooled)throw new AppError(503,'clinic_binding','O destino não corresponde ao projeto autorizado da clínica.');
 }
}
