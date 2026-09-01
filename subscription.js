// Daily digest subscription UI and recommendation preparation checklist.
const subscriptionKey='tender-daily-subscription-v1';
let subscription=JSON.parse(localStorage.getItem(subscriptionKey)||'null')||{enabled:false,emailEnabled:true,lineEnabled:false,email:'',lineUserId:'',lineLinked:false,time:'08:30',timezone:'Asia/Taipei',limit:5,includePrep:true,includeOutline:true,includeDeadlines:true,onlyHighMatch:false};
let serverLineLinked=false;

function recommendedPrep(t){
 const types=classifyTender(t),text=intelligenceText(t),items=[];
 items.push('確認投標資格、採購方式與應備證明');
 if(daysLeft(t.deadline)<=7)items.push(`建立倒數時程，${daysLeft(t.deadline)} 天內完成內部審核與送件`);else items.push('下載完整標書並整理疑義與詢問期限');
 if(types.includes('cleaning'))items.push('盤點清潔頻率、人力班表、機具耗材與廢棄物處理');
 if(types.includes('airport'))items.push('確認機場通行證、保安規範、禁區施工與保險要求');
 if(types.includes('transit'))items.push('規劃營運不中斷、夜間作業及交通安全維持方案');
 if(types.includes('special'))items.push('確認背景查核、保密、感染管制或戒護區進出規定');
 if(text.includes('system')||text.includes('cloud')||text.includes('平台'))items.push('準備技術架構、資安、SLA、導入及維運計畫');
 if(!t.budget)items.push('進行市場詢價與成本試算，建立預算假設');else items.push('拆分人力、設備、管理費及風險準備金');
 return [...new Set(items)].slice(0,4)
}
function recommendedTenders(){return tenders.filter(t=>!subscription.onlyHighMatch||t.match>=85).sort((a,b)=>b.match-a.match||daysLeft(a.deadline)-daysLeft(b.deadline)).slice(0,Number(subscription.limit)||5)}
function renderDailyPrep(){const data=recommendedTenders().slice(0,2);$('#dailyPrepList').innerHTML=data.length?data.map(t=>`<article class="daily-prep-item"><header><h3>${escapeHtml(t.title)}</h3><em>${t.match}%</em></header><ul>${recommendedPrep(t).slice(0,2).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></article>`).join(''):'<div class="daily-prep-empty">目前沒有建議準備標案</div>'}
function renderDigestPreview(){
 const data=recommendedTenders().slice(0,Math.min(Number(subscription.limit)||5,3));$('#previewCount').textContent=data.length;$('#previewChannel').textContent=subscription.lineEnabled&&!subscription.emailEnabled?'LINE PREVIEW':'EMAIL PREVIEW';$('#previewDate').textContent=`每日 ${subscription.time}`;
 $('#digestPreviewList').innerHTML=data.map(t=>`<article class="preview-tender"><h3>${escapeHtml(t.title)}</h3><p>${escapeHtml(t.agency)} · ${t.match}% 相符 · ${daysLeft(t.deadline)} 天後截止</p>${subscription.includePrep?`<ul>${recommendedPrep(t).slice(0,2).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:''}</article>`).join('')
}
function syncSubscriptionForm(){
 $('#emailEnabled').checked=subscription.emailEnabled;$('#lineEnabled').checked=subscription.lineEnabled;$('#subscriberEmail').value=subscription.email||'';$('#lineUserId').value=subscription.lineUserId||'';$('#digestTime').value=subscription.time;$('#digestTimezone').value=subscription.timezone;$('#digestLimit').value=String(subscription.limit);$('#includePrep').checked=subscription.includePrep;$('#includeOutline').checked=subscription.includeOutline;$('#includeDeadlines').checked=subscription.includeDeadlines;$('#onlyHighMatch').checked=subscription.onlyHighMatch;$('#emailFields').hidden=!subscription.emailEnabled;$('#lineFields').hidden=!subscription.lineEnabled;$('#lineConnectTitle').textContent=subscription.lineLinked?'LINE 帳號已連結':'連結 LINE 帳號';const state=$('#subscriptionState');state.classList.toggle('active',subscription.enabled);state.innerHTML=subscription.enabled?`<i></i> 已啟用 · 每日 ${subscription.time}`:'<i></i> 尚未啟用';renderDigestPreview()
}
function readSubscriptionForm(){return {...subscription,emailEnabled:$('#emailEnabled').checked,lineEnabled:$('#lineEnabled').checked,email:$('#subscriberEmail').value.trim(),lineUserId:$('#lineUserId').value.trim(),time:$('#digestTime').value||'08:30',timezone:$('#digestTimezone').value,limit:Number($('#digestLimit').value),includePrep:$('#includePrep').checked,includeOutline:$('#includeOutline').checked,includeDeadlines:$('#includeDeadlines').checked,onlyHighMatch:$('#onlyHighMatch').checked}}
function validateSubscription(s){if(!s.emailEnabled&&!s.lineEnabled)return '請至少選擇一種推播方式';if(s.emailEnabled&&!/^\S+@\S+\.\S+$/.test(s.email))return '請輸入有效的電子信箱';if(s.lineEnabled&&!serverLineLinked&&!/^U[a-zA-Z0-9]{20,}$/.test(s.lineUserId))return '請先加入 LINE 官方帳號並傳送「訂閱標案」';return ''}
async function saveSubscription(){const next=readSubscriptionForm(),error=validateSubscription(next);if(error){toast(error);return}next.enabled=true;next.lineLinked=next.lineEnabled&&!!next.lineUserId;subscription=next;localStorage.setItem(subscriptionKey,JSON.stringify(subscription));try{const res=await fetch('/api/subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(subscription)});if(!res.ok)throw new Error()}catch(e){/* Static preview keeps the configuration locally. */}syncSubscriptionForm();toast(`每日 ${subscription.time} 推播已啟用`)}
async function sendTest(){const draft=readSubscriptionForm(),error=validateSubscription(draft);if(error){toast(error);return}const btn=$('#sendTestBtn');btn.disabled=true;btn.textContent='傳送中…';const payload={subscription:draft,subject:'標案雷達｜每日建議標案',message:buildDigestText(draft)};try{const res=await fetch('/api/subscriptions/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!res.ok)throw new Error();const result=await res.json();toast(result.sent?`測試摘要已透過 ${result.channels.join('、')} 傳送`:'測試摘要已產生；伺服器尚未設定推播金鑰')}catch(e){toast('靜態預覽已完成；啟動 server.py 後可測試推播')}finally{btn.disabled=false;btn.textContent='傳送測試摘要'}}
function buildDigestText(s=subscription){const data=tenders.filter(t=>!s.onlyHighMatch||t.match>=85).sort((a,b)=>b.match-a.match).slice(0,Number(s.limit)||5);return `標案雷達每日精選｜${intelligenceToday}\n\n`+data.map((t,i)=>`${i+1}. ${t.title}\n${t.agency}｜${t.match}% 相符｜${daysLeft(t.deadline)} 天後截止\n建議準備：${recommendedPrep(t).slice(0,2).join('；')}`).join('\n\n')+'\n\n辨識結果僅供快速閱讀，請以原始招標文件為準。'}

['emailEnabled','lineEnabled','subscriberEmail','lineUserId','digestTime','digestTimezone','digestLimit','includePrep','includeOutline','includeDeadlines','onlyHighMatch'].forEach(id=>$('#'+id).addEventListener('input',()=>{subscription=readSubscriptionForm();$('#emailFields').hidden=!subscription.emailEnabled;$('#lineFields').hidden=!subscription.lineEnabled;renderDigestPreview()}));
async function refreshLineStatus(){try{const r=await fetch('/api/subscriptions/status',{cache:'no-store'});if(!r.ok)return;const s=await r.json();serverLineLinked=!!s.lineLinked;if(serverLineLinked){subscription.lineLinked=true;$('#lineConnectTitle').textContent=`LINE 帳號已連結 ${s.maskedLineUserId||''}`;$('#connectLineBtn').textContent='重新檢查';toast('LINE 帳號連結成功')}}catch(e){}}
$('#connectLineBtn').onclick=async()=>{toast('請加入 LINE 官方帳號並傳送「訂閱標案」，再回來按一次檢查');await refreshLineStatus();if(!serverLineLinked){const details=$('#lineFields details');details.open=true}};$('#saveSubscriptionBtn').onclick=saveSubscription;$('#sendTestBtn').onclick=sendTest;
syncSubscriptionForm();renderDailyPrep();refreshLineStatus();
if(new URLSearchParams(location.search).get('view')==='settings')showView('settings');
