import puppeteer from 'puppeteer-core';
export const URL0=process.env.PRAYER_E2E_URL || 'http://127.0.0.1:1420/';
export async function launch(){ return puppeteer.launch({executablePath:'/usr/bin/google-chrome', headless:'new', args:['--no-sandbox'], env:{...process.env, TZ:'Asia/Dhaka'}}); }
// at: 'YYYY-MM-DDTHH:MM:00+06:00'
export async function open(b,{lang='en',w=1280,h=720,at=null,data={},scale=1,pending=null}={}){
  const p=await b.newPage(); await p.setViewport({width:w,height:h,deviceScaleFactor:scale});
  p.errs=[]; p.on('pageerror',e=>p.errs.push('PE '+e.message)); p.on('console',m=>{if(m.type()==='error')p.errs.push('CE '+m.text())});
  const off = at ? new Date(at).getTime()-Date.now() : 0;
  await p.evaluateOnNewDocument((lang,off,data,pending)=>{
    if(!sessionStorage.getItem('init')){ sessionStorage.setItem('init','1'); localStorage.setItem('prayer-times-data', JSON.stringify({lat:23.8103,lon:90.4125,place:'Dhaka',language:lang,...data})); if(pending) localStorage.setItem('prayer-times-pending', JSON.stringify(pending)); else localStorage.removeItem('prayer-times-pending'); }
    if(off){ const RD=Date; window.Date=class extends RD{constructor(...a){ if(a.length) super(...a); else super(RD.now()+off);} static now(){return RD.now()+off;}}; }
  },lang,off,data,pending);
  await p.goto(URL0,{waitUntil:'networkidle0',timeout:90000}); /* [v3.0.6 L] every page now also reads the 31 MB kernel: longer navigation timeout */ await new Promise(r=>setTimeout(r,900));
  return p;
}
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function latin(p){
  return p.evaluate(()=>{
    const out=new Set();
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(w.nextNode()){const n=w.currentNode; const pe=n.parentElement; if(!pe||['SCRIPT','STYLE'].includes(pe.tagName)) continue; const t=n.nodeValue.trim(); if(/[A-Za-z]{2,}/.test(t)) out.add(t);}
    for(const e of document.querySelectorAll('[title],[aria-label],[placeholder]')){ for(const a of ['title','aria-label','placeholder']){const v=e.getAttribute(a); if(v&&/[A-Za-z]{2,}/.test(v)) out.add('@'+a+': '+v);} }
    return [...out];
  });
}
