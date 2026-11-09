import {mkdir, readdir, copyFile, writeFile} from 'node:fs/promises';
import {resolve, dirname, extname, relative, isAbsolute} from 'node:path';

// Publish browser assets only; keep source docs, tests and local data private.
const target=process.argv[2];
if(!target) throw new Error('Usage: node scripts/export-static.mjs <empty-output-directory>');
const source=resolve('dist'), output=resolve(target);
const fromSource=relative(source,output);
if(!fromSource || (!fromSource.startsWith('..')&&!isAbsolute(fromSource))) throw new Error('Choose a separate output directory');
await mkdir(output,{recursive:true});
if((await readdir(output)).some(name=>name!=='.git')) throw new Error('Output directory must be empty apart from Git metadata');
const allowed=new Set(['.html','.css','.js','.mjs','.svg','.ttf','.woff2']);
let count=0;
async function copy(relative=''){
 for(const entry of await readdir(resolve(source,relative),{withFileTypes:true})){
  const name=relative ? relative+'/'+entry.name : entry.name;
  if(entry.isDirectory()){if(!['tests','.openai'].includes(entry.name))await copy(name);continue;}
  if(!entry.isFile())throw new Error('Only regular files may be published');
  const license=/license/i.test(entry.name);
  const publicConfig=['modules/routine/firebase-config.json','modules/journal/terrain-style.json'].includes(name);
  if(!allowed.has(extname(name))&&!license&&!publicConfig)continue;
  if(/\.test\./.test(name))continue;
  const dest=resolve(output,name);await mkdir(dirname(dest),{recursive:true});await copyFile(resolve(source,name),dest);count++;
 }
}
await copy();
await writeFile(resolve(output,'.nojekyll'),'');
await writeFile(resolve(output,'README.md'),'# Personal desk\n\nStatic deployment for [Personal desk](https://yjyj41.github.io/personal-desk-web/).\n\nJournal and routines. Sign in with your existing Google account for cloud records.\n\nThis repository contains browser assets only. Personal records and backups are not included.\n');
console.log(`Exported ${count} browser assets to ${output}`);
