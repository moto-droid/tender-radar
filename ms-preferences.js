(()=>{
 if(window.MSPreferences)return;
 const LANG_KEY='motospatial-locale-v1',THEME_KEY='motospatial-theme-v1';
 const langs=['zh-TW','en','th'],themes=['light','dark'];
 const read=(k,d)=>{try{return localStorage.getItem(k)||d}catch{return d}};
 const query=new URLSearchParams(location.search);
 let lang=query.get('ms_lang')||read(LANG_KEY,'zh-TW'),theme=query.get('ms_theme')||read(THEME_KEY,'light');
 if(!langs.includes(lang))lang='zh-TW';if(!themes.includes(theme))theme='light';
 const persist=()=>{try{localStorage.setItem(LANG_KEY,lang);localStorage.setItem(THEME_KEY,theme)}catch{}};
 const dictionaries=window.MS_TRANSLATIONS||{en:{},th:{}};
 const reverse=new Map();for(const locale of ['en','th'])for(const [k,v]of Object.entries(dictionaries[locale]||{}))if(!reverse.has(v))reverse.set(v,k);
 const texts=new WeakMap(),attrs=new WeakMap();let host,observer,queued=false;
 const labels={ 'zh-TW':{day:'白天',night:'黑夜',theme:'切換顯示風格',language:'語言'},en:{day:'Day',night:'Night',theme:'Switch appearance',language:'Language'},th:{day:'กลางวัน',night:'กลางคืน',theme:'เปลี่ยนรูปแบบการแสดงผล',language:'ภาษา'}};
 function translate(value){
   const leading=value.match(/^\s*/)?.[0]||'',trailing=value.match(/\s*$/)?.[0]||'';let core=value.trim();
   const original=reverse.get(core)||core;let result=lang==='zh-TW'?original:(dictionaries[lang]?.[original]||original);
   if(result===original){const m=original.match(/^([←↗＋+◎▣▧▤✓▥◫□◇ⓘ↻⇩⌘☑☐\s]*)(.*?)([↗↓↑⌃→\s]*)$/);if(m&&m[2]!==original){const key=reverse.get(m[2])||m[2];result=m[1]+(lang==='zh-TW'?key:(dictionaries[lang]?.[key]||key))+m[3]}}
   if(lang!=='zh-TW'){
     result=result.replace(/^顯示 (\d+) 個工具$/,lang==='en'?'Showing $1 tools':'แสดงเครื่องมือ $1 รายการ').replace(/^共 (\d+) 位客戶$/,lang==='en'?'$1 customers':'ลูกค้า $1 ราย').replace(/^共 (\d+) 筆$/,lang==='en'?'$1 records':'$1 รายการ');
     result=result.replace(/^(\d{4})年(\d{1,2})月$/,(_,y,m)=>new Intl.DateTimeFormat(lang==='th'?'th-TH-u-ca-gregory':'en',{year:'numeric',month:'long'}).format(new Date(+y,+m-1,1)));
     result=result.replace(/^← 返回 /,lang==='en'?'← Back to ':'← กลับไปที่ ').replace('Motospatial 官網',lang==='en'?'Motospatial website':'เว็บไซต์ Motospatial');
     result=result.replace(/^(\d[\d,]*) 個站點$/,lang==='en'?'$1 sites':'$1 พื้นที่').replace(/^(\d[\d,]*) 個活躍端點$/,lang==='en'?'$1 active endpoints':'อุปกรณ์ที่ทำงาน $1 จุด').replace(/^每月 (\d[\d,]*) 萬筆定位事件$/,(_,n)=>lang==='en'?`${Number(n.replaceAll(',',''))*10000} location events/month`:`เหตุการณ์ตำแหน่ง ${Number(n.replaceAll(',',''))*10000} รายการต่อเดือน`).replace(/^導入費 NT\$([\d,]+) 起$/,lang==='en'?'Setup from NT$$$1':'ค่าติดตั้งเริ่มต้น NT$$$1').replace(/^(\d+) 天後截止 · (\d+)% 相符$/,lang==='en'?'Closes in $1 days · $2% match':'ปิดใน $1 วัน · ตรงกัน $2%');
   }
   return leading+result+trailing;
 }
 function walk(node){
   if(node.nodeType===3){if(!node.nodeValue.trim())return;const record=texts.get(node);let source=record&&node.nodeValue===record.last?record.source:node.nodeValue;const result=translate(source);texts.set(node,{source,last:result});if(node.nodeValue!==result)node.nodeValue=result;return}
   if(node.nodeType!==1&&node.nodeType!==11)return;
   if(node.nodeType===1){
     if(node.matches('script,style,noscript,code,pre,svg,ms-preferences,[contenteditable="true"],[translate="no"]'))return;
     // Designer has its own complete locale resources; preserve user-authored canvas labels.
     if(node.tagName.toLowerCase()==='x-dc')return;
     if(node.tagName==='OPTION'&&!node.hasAttribute('value'))node.setAttribute('value',node.value);
     const saved=attrs.get(node)||{};for(const a of ['placeholder','aria-label','title']){if(!node.hasAttribute(a))continue;const current=node.getAttribute(a),r=saved[a];const source=r&&current===r.last?r.source:current;const next=translate(source);saved[a]={source,last:next};if(current!==next)node.setAttribute(a,next)}attrs.set(node,saved);
     if(node.tagName==='TEXTAREA')return;
     if(node.shadowRoot)walk(node.shadowRoot);
   }
   for(const child of [...node.childNodes])walk(child);
 }
 const rgb=s=>{const o=s.match(/^oklch\(([\d.]+)(%)?\s+([\d.]+)/);if(o&&+o[3]<.05){const v=+o[1]*(o[2]?2.55:255);return [v,v,v,1]}const m=s.match(/^rgba?\((\d+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?/);return m?[+m[1],+m[2],+m[3],m[4]===undefined?1:+m[4]]:null};
 function recolor(){
   // Class overlays preserve original component styles and are completely removable.
   if(theme==='light'){document.querySelectorAll('[data-ms-surface],[data-ms-ink],[data-ms-border]').forEach(el=>{el.removeAttribute('data-ms-surface');el.removeAttribute('data-ms-ink');el.removeAttribute('data-ms-border')});return}
   const classify=(c)=>c&&c[3]>.4&&Math.max(...c.slice(0,3))-Math.min(...c.slice(0,3))<70;
   for(const el of document.body.querySelectorAll('*')){
     if(el.closest('ms-preferences,svg,canvas,.company-logo,.ms-company-logo')||['SCRIPT','STYLE','IMG','VIDEO'].includes(el.tagName))continue;
     const st=getComputedStyle(el),bg=rgb(st.backgroundColor),fg=rgb(st.color),bd=rgb(st.borderTopColor);
     if(classify(bg)&&Math.min(...bg.slice(0,3))>165)el.dataset.msSurface='true';
     const stops=(st.backgroundImage.match(/rgba?\([^)]+\)/g)||[]).map(rgb);if(stops.length&&stops.every(c=>classify(c)&&Math.min(...c.slice(0,3))>165))el.dataset.msSurface='true';
     if(classify(fg)&&Math.max(...fg.slice(0,3))<175)el.dataset.msInk='true';
     if(classify(bd)&&Math.min(...bd.slice(0,3))>130&&st.borderTopStyle!=='none')el.dataset.msBorder='true';
   }
 }
 function nativeDesigner(){
   for(const select of document.querySelectorAll('select')){
     if((select.getAttribute('onchange')||'').includes('{{'))continue;
     const values=[...select.options].map(o=>o.value);
     if(values.includes('zh-Hant')&&values.includes('en')&&values.includes('th')){select.dataset.msLegacy='true';const target=lang==='zh-TW'?'zh-Hant':lang;if(select.value!==target){select.value=target;select.dispatchEvent(new Event('change',{bubbles:true}))}}
   }
 }
 function decorate(){
   const own=/(^|\.)((labubutaiwan|toolkit-(dashboard|designer|esg|financial|markets|replicator|rtls))\.netlify\.app|motospatial\.com)$/;
   const visit=root=>{for(const a of root.querySelectorAll('a[href]')){try{const u=new URL(a.getAttribute('href'),location.href);if(!/^https?:$/.test(u.protocol))continue;if(u.origin!==location.origin&&!own.test(u.hostname)&&!(u.hostname==='127.0.0.1'&&/^87(20|3[1-7])$/.test(u.port)))continue;if(a.getAttribute('href').startsWith('#'))continue;u.searchParams.set('ms_lang',lang);u.searchParams.set('ms_theme',theme);if(a.href!==u.href)a.href=u.href}catch{}}};visit(document);document.querySelectorAll('ms-toolkit-shell').forEach(el=>{if(el.shadowRoot)visit(el.shadowRoot)})
 }
 function mount(){
   if(host?.isConnected)return;host=document.createElement('ms-preferences');document.body.append(host);const sh=host.attachShadow({mode:'open'});
   sh.innerHTML="<style>:host{position:fixed;right:24px;top:8px;z-index:10020;font:14px MiSans,sans-serif;color:#252c36}.controls{display:flex;gap:8px;align-items:center}button,.language{display:flex;gap:7px;align-items:center;min-height:46px;padding:0 12px;border:1px solid #dadddf;border-radius:10px;background:#f5f5f4;color:inherit;box-sizing:border-box}button,select{font:inherit;color:inherit;cursor:pointer}button{white-space:nowrap}select{border:0;background:transparent;min-height:44px;padding:0 2px;max-width:128px}svg{width:19px;height:19px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}button:focus-visible,select:focus-visible{outline:3px solid #758ca8;outline-offset:3px}:host-context(html[data-ms-theme=dark]){color:#eef0f3}:host-context(html[data-ms-theme=dark]) button,:host-context(html[data-ms-theme=dark]) .language{background:#222832;border-color:#414956}:host-context(html[data-ms-theme=dark]) option{background:#222832;color:#eef0f3}@media(max-width:600px){:host{right:12px;top:8px;font-size:13px}button,.language{padding:0 10px}.controls{gap:6px}}@media print{:host{display:none}}</style><div class=\"controls\"><button type=\"button\" id=\"theme\"></button><label class=\"language\"><svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z\"/></svg><select aria-label=\"Language / 語言 / ภาษา\"><option value=\"zh-TW\">繁體中文</option><option value=\"en\">English</option><option value=\"th\">ไทย</option></select></label></div>";
   sh.querySelector('#theme').onclick=()=>set({theme:theme==='dark'?'light':'dark'});sh.querySelector('select').onchange=e=>set({lang:e.target.value});
 }
 function refresh(){
   if(!document.body)return;observer?.disconnect();mount();const toolName=location.hostname.match(/^toolkit-([a-z]+)\./)?.[1]||({'8731':'dashboard','8732':'designer','8733':'esg','8734':'financial','8735':'markets','8736':'replicator','8737':'rtls'})[location.port];if(toolName)document.body.dataset.msTool=toolName;document.documentElement.dataset.msTheme=theme;document.documentElement.lang=lang==='zh-TW'?'zh-Hant':lang;
   const ui=labels[lang],button=host.shadowRoot.querySelector('#theme');button.innerHTML=(theme==='dark'?"<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><circle cx=\"12\" cy=\"12\" r=\"4\"/><path d=\"M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5\"/></svg>":"<svg aria-hidden=\"true\" viewBox=\"0 0 24 24\"><path d=\"M20.8 13A9 9 0 0 1 11 3.2 9 9 0 1 0 20.8 13Z\"/></svg>")+'<span>'+(theme==='dark'?ui.day:ui.night)+'</span>';button.setAttribute('aria-label',ui.theme);button.setAttribute('aria-pressed',String(theme==='dark'));host.shadowRoot.querySelector('select').value=lang;
   nativeDesigner();walk(document.body);recolor();decorate();
   document.querySelectorAll('.site-language-switcher,[aria-label="Switch Language"],[aria-label="Switch Theme"]').forEach(el=>el.dataset.msLegacy='true');
   document.querySelectorAll('.language-prefix').forEach(el=>{const button=el.closest('button');if(button)button.dataset.msLegacy='true'});
   observer?.observe(document,{subtree:true,childList:true,characterData:true});
 }
 function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;refresh()})}
 function set(prefs){if(langs.includes(prefs.lang))lang=prefs.lang;if(themes.includes(prefs.theme))theme=prefs.theme;persist();const u=new URL(location.href);u.searchParams.set('ms_lang',lang);u.searchParams.set('ms_theme',theme);history.replaceState(history.state,'',u);refresh();window.dispatchEvent(new CustomEvent('ms-preferences',{detail:{lang,theme}}))}
 window.MSPreferences={set,get:()=>({lang,theme}),translate};persist();
 function boot(){observer=new MutationObserver(schedule);refresh();window.dispatchEvent(new CustomEvent('ms-preferences',{detail:{lang,theme}}));document.addEventListener('change',schedule);window.addEventListener('storage',e=>{if(e.key===LANG_KEY||e.key===THEME_KEY){lang=read(LANG_KEY,'zh-TW');theme=read(THEME_KEY,'light');refresh()}})}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();


