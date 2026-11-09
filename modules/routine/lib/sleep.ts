export type SleepInterval={start:number;end:number};
export function mergeSleep(ranges:SleepInterval[]):SleepInterval[]{const sorted=ranges.map(r=>({...r})).sort((a,b)=>a.start-b.start);const out:SleepInterval[]=[];for(const r of sorted){if(!Number.isInteger(r.start)||!Number.isInteger(r.end)||r.start<0||r.end>900||r.end<=r.start)throw Error('수면 구간은 전날 20:00부터 당일 11:00 사이여야 합니다.');const last=out.at(-1);if(last&&r.start<=last.end)last.end=Math.max(last.end,r.end);else out.push(r)}return out}
export function sleepClock(offset:number){const m=(1200+offset)%1440;return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}
export function sleepOffset(clock:string){if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))return NaN;let m=Number(clock.slice(0,2))*60+Number(clock.slice(3));if(m<1200)m+=1440;return m-1200}
export function sleepHours(_date:string,ranges:SleepInterval[]){return mergeSleep(ranges).reduce((n,r)=>n+(r.end-r.start)/60,0)}

