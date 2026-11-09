import {mkdir,cp,rm} from 'node:fs/promises';
import {build} from 'vite';
await rm('dist',{recursive:true,force:true});
await mkdir('dist',{recursive:true});
await build({configFile:'modules/routine/vite.desk.config.ts',configLoader:'native'});
for(const name of ['index.html','desk.css','desk.mjs','mark.svg','shared','assets'])await cp(name,'dist/'+name,{recursive:true});
for(const name of ['journal'])await cp('modules/'+name,'dist/modules/'+name,{recursive:true});
console.log('Built personal-desk → dist/');
