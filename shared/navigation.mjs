export const journalViews={daily:'Daily',weekly:'Weekly',monthly:'Monthly',future:'Future',journal:'Journal',index:'Index',key:'Key'};
// Old links: the habit tracker now lives inside Monthly.
const aliases={habit:'monthly',tracker:'monthly'};
export function parseRoute(hash){
 const [candidate,raw]=hash.replace(/^#/,'').split('/');const tab=aliases[raw]||raw;
 const view=['today','journal','routine','settings'].includes(candidate)?candidate:'today';
 return {view,tab:view==='journal'&&Object.hasOwn(journalViews,tab)?tab:'daily'};
}
