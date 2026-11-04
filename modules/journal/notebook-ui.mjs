import {allNotes,setTag,replaceTag,tagUsage,links,visibleByTags} from './notebook.mjs';
const el=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const button=(text,fn)=>{const e=el('button',text);e.type='button';e.className='authbtn';e.onclick=fn;return e;};
export function installNotebook({getData,save,getDate,onDate,refresh,ready=()=>true}) {
  let query='',filter='',selected=null,base=null;
  const host=el('section');host.className='notebook';document.getElementById('journalText').after(host);
  const tools=el('div');tools.className='notebook-tools';
  const search=el('input');search.placeholder='제목·본문 검색';search.setAttribute('aria-label','노트 검색');
  const topics=el('select');topics.setAttribute('aria-label','주제별 보기');
  tools.append(search,topics,button('+ 글 쓰기',()=>edit()),button('태그 관리',()=>manage()));host.append(tools);
  const dayTags=el('div'),list=el('div');host.append(dayTags,list);
  const dialog=el('dialog');dialog.className='notebook-dialog';document.body.append(dialog);
  function error(message){alert(message);}
  function picker(host,values,onChange) {
    host.replaceChildren();const chosen=new Set(values||[]);
    const tags=Object.entries(getData().tags||{});if(!tags.length)host.append(el('p','태그 관리에서 사용할 태그를 먼저 만들어 주세요.'));
    for(const [id,t] of tags){const label=el('label'),input=el('input');input.type='checkbox';input.checked=chosen.has(id);input.onchange=()=>{input.checked?chosen.add(id):chosen.delete(id);onChange([...chosen]);};label.append(input,document.createTextNode(t.name));host.append(label);}
  }
  function options(select,value,blank) {select.replaceChildren(new Option(blank,''));for(const [id,t] of Object.entries(getData().tags||{}))select.add(new Option(t.name,id));select.value=value;}
  function render() {
    options(topics,filter,'모든 주제');
    dayTags.replaceChildren(el('p','하루 일기의 태그'));const p=el('div');p.className='tag-picks';dayTags.append(p);
    picker(p,getData().dayTags?.[getDate()]||[],tags=>{(getData().dayTags||={})[getDate()]=tags;save();render();});
    list.replaceChildren();const notes=allNotes(getData()),shown=notes.filter(n=>(query||filter||n.date===getDate())&&(!filter||n.tags.includes(filter))&&(!query||(n.title+' '+n.body).toLocaleLowerCase().includes(query.toLocaleLowerCase())));
    list.append(el('p',query||filter?`검색 결과 ${shown.length}개`:'이날의 글'));
    for(const note of shown){const card=el('article');card.className='note-card';
      card.append(button(note.date+' · '+note.title,()=>note.legacy?onDate(note.date):edit(note)),el('p',note.body.length>220?note.body.slice(0,220)+'…':note.body));
      const names=note.tags.map(id=>getData().tags?.[id]?.name).filter(Boolean);card.append(el('small',names.map(n=>'#'+n).join(' ')));
      const refs=links(note.body,notes);for(const ref of refs)for(const target of ref.matches)card.append(button('↗ '+target.title+' · '+target.date,()=>target.legacy?onDate(target.date):edit(target)));
      const incoming=notes.filter(n=>n.id!==note.id&&links(n.body,notes).some(ref=>ref.matches.some(m=>m.id===note.id)));
      if(incoming.length){card.append(el('p','이 글을 참조한 글'));for(const n of incoming)card.append(button(n.title+' · '+n.date,()=>n.legacy?onDate(n.date):edit(n)));}
      list.append(card);
    }
  }
  search.oninput=()=>{query=search.value;render();};topics.onchange=()=>{filter=topics.value;render();};
  function edit(note) {
    if(!ready()){error('먼저 로그인하고 기록 불러오기를 완료하세요.');return;}
    selected=note?.id||crypto.randomUUID();base=JSON.stringify(getData().entries?.[selected]);
    dialog.replaceChildren(el('h2',note?'글 편집':'새 글'));
    const title=el('input'),date=el('input'),body=el('textarea'),tagsHost=el('div'),linkSelect=el('select'),message=el('p');let tags=[...(note?.tags||[])];
    title.value=note?.title||'';title.placeholder='제목';title.setAttribute('aria-label','제목');date.type='date';date.value=note?.date||getDate();date.setAttribute('aria-label','날짜');body.value=note?.body||'';body.rows=12;body.placeholder='자유롭게 기록하세요. [[글 제목]]으로 다른 글을 연결할 수 있어요.';body.setAttribute('aria-label','본문');tagsHost.className='tag-picks';picker(tagsHost,tags,value=>tags=value);
    linkSelect.add(new Option('다른 글 연결…',''));for(const n of allNotes(getData()).filter(n=>n.id!==selected))linkSelect.add(new Option(n.date+' · '+n.title,n.id));
    linkSelect.onchange=()=>{if(linkSelect.value){body.setRangeText('[['+linkSelect.value+']]',body.selectionStart,body.selectionEnd,'end');body.focus();linkSelect.value='';}};
    const commit=()=>{if(JSON.stringify(getData().entries?.[selected])!==base){message.textContent='다른 곳에서 변경된 글이에요. 닫고 다시 열어 주세요.';return;}
      if(!date.value||!body.value.trim()){message.textContent='날짜와 본문을 입력하세요.';return;}
      if(tags.some(id=>!getData().tags?.[id])){message.textContent='태그가 변경됐어요. 닫고 다시 선택해 주세요.';return;}
      (getData().entries||={})[selected]={date:date.value,title:title.value.trim()||'제목 없는 글',body:body.value,tags};save();dialog.close();render();};
    dialog.append(title,date,tagsHost,linkSelect,body,message,button('저장',commit),button('취소',()=>dialog.close()));
    if(note)dialog.append(button('글 삭제',()=>{if(JSON.stringify(getData().entries?.[selected])!==base){message.textContent='글이 변경됐어요. 다시 열어 주세요.';return;}if(confirm('이 글을 삭제할까요?')){delete getData().entries[selected];save();dialog.close();render();}}));
    if(!dialog.open)dialog.showModal();
  }
  function manage() {
    if(!ready()){error('먼저 로그인하고 기록 불러오기를 완료하세요.');return;}
    dialog.replaceChildren(el('h2','태그 관리'),el('p','글과 일정에서 같은 태그를 사용합니다. 태그를 지워도 기록은 남습니다.'));
    const add=el('input');add.placeholder='새 태그 이름';add.setAttribute('aria-label','새 태그 이름');
    dialog.append(add,button('태그 만들기',()=>{try{setTag(getData(),crypto.randomUUID(),add.value);save();manage();render();refresh();}catch(e){error(e.message);}}));
    for(const [id,t] of Object.entries(getData().tags||{})) {
      const row=el('div');row.className='tag-manager-row';const name=el('input');name.value=t.name;name.setAttribute('aria-label','태그 이름');const target=el('select');options(target,'','병합 대상 선택');target.querySelector(`option[value="${id}"]`)?.remove();target.setAttribute('aria-label','병합 대상');
      row.append(name,el('small',tagUsage(getData(),id)+'개 기록'),button('이름 변경',()=>{try{setTag(getData(),id,name.value);save();manage();render();refresh();}catch(e){error(e.message);}}),target,
        button('병합',()=>{if(!target.value)return;if(confirm('이 태그를 선택한 태그로 합칠까요? 모든 연결이 함께 바뀝니다.')){replaceTag(getData(),id,target.value);filter='';save();manage();render();refresh();}}),
        button('태그 삭제',()=>{if(confirm('태그 연결만 제거할까요? 글과 일정은 남습니다.')){replaceTag(getData(),id);filter='';save();manage();render();refresh();}}));dialog.append(row);
    }
    dialog.append(button('닫기',()=>dialog.close()));if(!dialog.open)dialog.showModal();
  }
  function filterUI(host){const open=host.querySelector('details')?.open;host.replaceChildren();const details=el('details'),summary=el('summary','일정 태그 표시');details.open=!!open;details.append(summary);const view=getData().tagView||{hidden:[],hideUntagged:false};
    for(const [id,t] of [['',{name:'태그 없음'}],...Object.entries(getData().tags||{})]){const label=el('label'),check=el('input');check.type='checkbox';check.checked=id?!view.hidden.includes(id):!view.hideUntagged;check.onchange=()=>{const next=getData().tagView||={hidden:[],hideUntagged:false};if(id)next.hidden=check.checked?next.hidden.filter(x=>x!==id):[...new Set([...next.hidden,id])];else next.hideUntagged=!check.checked;save();refresh();};label.append(check,document.createTextNode(t.name));details.append(label);}
    details.append(button('태그 관리',manage));host.append(details);
  }
  return {render,picker,filterUI,manage,visible:ids=>visibleByTags(getData(),ids)};
}
