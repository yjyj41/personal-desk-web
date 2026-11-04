// Shared vocabulary: tags are created only in the manager, never by typing in a note.
export const tagName = value => String(value).normalize('NFKC').trim().replace(/^#+/,'').replace(/\s+/g,' ');
export function allNotes(data) {
  const legacy=Object.entries(data.journal||{}).filter(([,body])=>body.trim()).map(([date,body])=>({id:'day-'+date,date,title:'하루 일기',body,tags:data.dayTags?.[date]||[],legacy:true}));
  return [...legacy,...Object.entries(data.entries||{}).map(([id,n])=>({id,...n}))].sort((a,b)=>b.date.localeCompare(a.date)||a.id.localeCompare(b.id));
}
export function setTag(data,id,name) {
  name=tagName(name); if(!name||name.length>40)throw Error('태그 이름은 1–40자로 입력하세요.');
  const tags=data.tags||{};
  if(Object.entries(tags).some(([key,t])=>key!==id&&tagName(t.name).toLocaleLowerCase()===name.toLocaleLowerCase()))throw Error('같은 이름의 태그가 있어요. 기존 태그를 사용하거나 병합하세요.');
  (data.tags||={})[id]={...tags[id],name};
}
export function replaceTag(data,from,to=null) {
  if(to===from||!data.tags?.[from]||(to&&!data.tags[to]))throw Error('병합할 태그를 확인하세요.');
  const rewrite=ids=>[...new Set((ids||[]).flatMap(id=>id===from?(to?[to]:[]):[id]))];
  for(const n of Object.values(data.entries||{}))n.tags=rewrite(n.tags);
  for(const key of Object.keys(data.dayTags||{}))data.dayTags[key]=rewrite(data.dayTags[key]);
  for(const b of Object.values(data.sched||{}).flat())b.tags=rewrite(b.tags);
  for(const key of Object.keys(data.googleEventTags||{}))data.googleEventTags[key]=rewrite(data.googleEventTags[key]);
  if(data.tagView)data.tagView.hidden=rewrite(data.tagView.hidden);
  delete data.tags[from];
}
export function tagUsage(data,id) {
  return allNotes(data).filter(n=>n.tags.includes(id)).length+Object.values(data.sched||{}).flat().filter(b=>b.tags?.includes(id)).length+Object.values(data.googleEventTags||{}).filter(t=>t.includes(id)).length;
}
export function visibleByTags(data,ids=[]) {
  const hidden=new Set(data.tagView?.hidden||[]);
  return ids.length?ids.some(id=>!hidden.has(id)):!data.tagView?.hideUntagged;
}
export function links(body,notes) {
  return [...body.matchAll(/\[\[([^\]\n]+)\]\]/g)].map(m=>({label:m[1],matches:notes.filter(n=>n.id===m[1]||n.title===m[1])}));
}
export function validateNotebook(data) {
  const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x), ids=x=>Array.isArray(x)&&x.every(id=>typeof id==='string'&&/^[\w-]+$/.test(id));
  for(const key of ['tags','entries','dayTags','googleEventTags'])if(data[key]!==undefined&&!obj(data[key]))throw Error('노트/태그 형식 오류');
  for(const [id,t] of Object.entries(data.tags||{}))if(!ids([id])||!obj(t)||typeof t.name!=='string'||!tagName(t.name)||t.name.length>40)throw Error('태그 형식 오류');
  for(const [id,n] of Object.entries(data.entries||{}))if(!ids([id])||!obj(n)||!/^\d{4}-\d{2}-\d{2}$/.test(n.date)||typeof n.title!=='string'||typeof n.body!=='string'||!ids(n.tags))throw Error('글 형식 오류');
  for(const tags of [...Object.values(data.dayTags||{}),...Object.values(data.googleEventTags||{})])if(!ids(tags))throw Error('태그 연결 오류');
  for(const b of Object.values(data.sched||{}).flat())if(b.tags!==undefined&&!ids(b.tags))throw Error('일정 태그 오류');
  if(data.tagView!==undefined&&(!obj(data.tagView)||!ids(data.tagView.hidden)||typeof data.tagView.hideUntagged!=='boolean'))throw Error('태그 필터 오류');
}
