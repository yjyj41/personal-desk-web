export function dateKey(date=new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function validDate(value) {
  return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(new Date(value+'T12:00:00'))===value;
}
export function shiftDay(value,amount) {const d=new Date(value+'T12:00:00');d.setDate(d.getDate()+amount);return dateKey(d);}
export function mondayOf(value) {const d=new Date(value+'T12:00:00');d.setDate(d.getDate()-(d.getDay()+6)%7);return dateKey(d);}
