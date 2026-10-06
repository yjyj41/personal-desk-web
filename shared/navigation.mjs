export const journalViews={daily:'Daily',weekly:'Weekly',monthly:'Monthly',future:'Future',habit:'Tracker',journal:'Journal',index:'Index',key:'Key'};
export function parseRoute(hash){
 const [candidate,tab]=hash.replace(/^#/,'').split('/');
 const view=['today','journal','routine','spending','settings'].includes(candidate)?candidate:'today';
 return {view,tab:view==='journal'&&Object.hasOwn(journalViews,tab)?tab:'daily'};
}
