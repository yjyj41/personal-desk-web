export function installFrame(module:string): {send(type:string,detail?:Record<string,unknown>):void;onContext(fn:(context:any)=>void):()=>boolean};
