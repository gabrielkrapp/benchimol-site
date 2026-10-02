export class AppError extends Error {
  constructor(public status:number, public code:string, message:string) { super(message); this.name='AppError'; }
}
export function databaseError(error:{code?:string; message?:string}|null):never {
  const message=error?.message || '';
  if (error?.code==='40001' || message.includes('version_conflict')) throw new AppError(409,'version_conflict','Este item foi alterado. Recarregue antes de salvar.');
  if (error?.code==='23505') throw new AppError(409,'slug_conflict','URL já utilizada ou reservada. Revise o slug.');
  if (message.includes('media_in_use')) throw new AppError(409,'media_in_use','A mídia está utilizada em conteúdo ou revisão.');
  if (error?.code==='P0002') throw new AppError(404,'not_found','Item não encontrado.');
  if (error?.code==='42501') throw new AppError(403,'forbidden','Acesso não autorizado.');
  if (error?.code==='22023') throw new AppError(422,'validation','Operação inválida. Revise os campos.');
  throw new AppError(503,'unavailable','O serviço está temporariamente indisponível. Tente novamente.');
}
