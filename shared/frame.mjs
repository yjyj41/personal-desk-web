import {validDate} from './dates.mjs';
/** Only navigation and aggregate summaries cross the same-origin module boundary. */
export function installFrame(module) {
  const callbacks = new Set();
  const send = (type, detail={}) => {
    if (parent !== window) parent.postMessage({channel:'personal-desk',module,type,...detail},location.origin);
  };
  window.addEventListener('message', event => {
    if(event.origin!==location.origin || event.source!==parent || event.data?.channel!=='personal-desk') return;
    const ctx=event.data;
    if(ctx.type==='context' && validDate(ctx.date)) callbacks.forEach(fn=>fn(ctx));
  });
  // Measure content, never the iframe viewport: avoids a resize feedback loop.
  const measure=()=>send('height',{height:Math.ceil(document.body.getBoundingClientRect().height)+32});
  new ResizeObserver(measure).observe(document.body);
  window.addEventListener('load',measure);
  queueMicrotask(()=>send('ready'));
  return {send,onContext(fn){callbacks.add(fn);return()=>callbacks.delete(fn);}};
}
