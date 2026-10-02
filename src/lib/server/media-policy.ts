export function validManagedStoragePath(path:string):boolean{return /^[a-f0-9-]{36}\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp|gif)$/.test(path);}
