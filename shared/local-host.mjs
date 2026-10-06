// Both original Firebase projects already authorize localhost, but not 127.0.0.1.
// Never strand a local spending ledger or an unsynced journal draft on another origin.
export function hasLocalRecords(storage){
 for(let i=0;i<storage.length;i++){
  const key=storage.key(i);
  if(key==='personal_desk_spending_v1'||key?.startsWith('bujo_draft_v3:'))return true;
 }
 return false;
}
if(typeof window!=='undefined'&&window===window.top&&location.hostname==='127.0.0.1'){
 const target=new URL(location.href);target.hostname='localhost';
 let hasRecords=true;try{hasRecords=hasLocalRecords(localStorage);}catch{}
 if(!hasRecords)location.replace(target.href);
 else {
  const show=()=>{
   const banner=document.createElement('section');banner.className='host-notice';banner.setAttribute('role','alert');
   const text=document.createElement('p');text.textContent='Google sign-in works at localhost. This address has local records: export your Spending backup and sync any Journal drafts before switching. Records stay on this address until you restore them at localhost.';
   const backup=document.createElement('a');backup.href='#spending';backup.textContent='Open Spending backup';
   const open=document.createElement('a');open.href=target.href;open.target='_blank';open.rel='noopener';open.textContent='Open localhost ↗';
   banner.append(text,backup,open);document.querySelector('main')?.prepend(banner);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',show,{once:true});else show();
 }
}
