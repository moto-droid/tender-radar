// Tender outline recognition and institution intelligence.
const intelligenceToday=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Taipei'});
const intelligencePatterns={
 cleaning:{label:'清潔維護',keywords:['清潔','清洗','環境維護','環境清潔','病媒','消毒','廢棄物','垃圾','清運','housekeeping','cleaning','janitorial','waste','sanitation']},
 airport:{label:'機場／航空站',keywords:['機場','航空站','航空','民航','桃園國際機場','airport','changi','airfield','terminal','cag']},
 transit:{label:'公共交通設施',keywords:['交通部','交通局','旅運','捷運','台鐵','臺鐵','高鐵','港務','公車','客運','車站','停車','metro','railway','transit','transport authority','port authority']},
 special:{label:'醫院／特殊機構',keywords:['醫院','醫療','衛生福利部','監獄','看守所','矯正署','矯正機關','國防部','陸軍','海軍','空軍','軍備','軍方','prison','correction','military','hospital']}
};
function intelligenceText(t){return [t.title,t.agency,t.category,t.docType].filter(Boolean).join(' ').toLowerCase()}
function classifyTender(t){const text=intelligenceText(t),types=[];for(const [key,def] of Object.entries(intelligencePatterns))if(def.keywords.some(k=>text.includes(k.toLowerCase())))types.push(key);return types}
function sameToday(t){return t.date===intelligenceToday}
function agencyList(items){return [...new Set(items.map(t=>t.agency).filter(Boolean))]}
function summaryFor(type,todayItems,allItems){const agencies=agencyList(todayItems);if(agencies.length)return agencies.slice(0,2).join('、')+(agencies.length>2?` 等 ${agencies.length} 個機構`:'');const recent=allItems.filter(t=>classifyTender(t).includes(type)).length;return recent?`今日 0 筆 · 目前追蹤 ${recent} 筆`:'今日尚無符合案件'}
function renderIntelligence(){
 const todayItems=tenders.filter(sameToday);$('#recognitionCoverage').textContent=`已分析 ${tenders.length} 筆 · 今日 ${todayItems.length} 筆`;
 for(const type of Object.keys(intelligencePatterns)){const matched=todayItems.filter(t=>classifyTender(t).includes(type));$(`#${type}Count`).textContent=matched.length;$(`#${type}Summary`).textContent=summaryFor(type,matched,tenders)}
 const groups=[['機場／航空站','airport'],['公共交通設施','transit'],['醫院與特殊機構','special']];
 $('#agencyGroups').innerHTML=groups.map(([label,type])=>{const today=agencyList(todayItems.filter(t=>classifyTender(t).includes(type))),recent=agencyList(tenders.filter(t=>classifyTender(t).includes(type)));const names=today.length?today:recent;return `<div class="agency-group"><b>${label}${today.length?' · 今日發布':' · 目前追蹤'}</b><p>${names.length?names.map(x=>`<span>${escapeHtml(x)}</span>`).join(''):'尚未辨識到發布機構'}</p></div>`}).join('')
}

const intelligenceBaseTenderRow=tenderRow;
tenderRow=function(t,full=false){return intelligenceBaseTenderRow(t,full).replace('<span class="tag ',`<button class="outline-action" data-outline="${t.id}">⌘ 大綱辨識</button><span class="tag `)};

function inferLocation(t){const text=intelligenceText(t);if(t.region==='Singapore'||text.includes('changi'))return '新加坡樟宜機場／依原始標案指定場域';if(text.includes('臺北')||text.includes('台北'))return '臺北地區';if(text.includes('新北'))return '新北市';if(text.includes('桃園'))return '桃園市';if(text.includes('高雄'))return '高雄市';if(text.includes('臺中')||text.includes('台中'))return '臺中市';return t.region&&t.region!=='台灣'?t.region:'依招標文件指定地點'}
function inferScope(t){const text=intelligenceText(t),items=[];if(classifyTender(t).includes('cleaning'))items.push('例行清潔與環境維護','人力、機具及耗材配置','品質巡檢與異常改善');if(text.includes('cloud')||text.includes('aws')||text.includes('grafana'))items.push('雲端服務或軟體授權','導入、維運與技術支援','資安及服務水準管理');if(text.includes('survey'))items.push('調查執行與樣本規劃','資料蒐集、整理及分析','成果報告與原始資料交付');if(text.includes('system')||text.includes('系統')||text.includes('平台'))items.push('系統建置或整合','測試、上線及教育訓練','保固維運與技術文件');if(text.includes('construction')||text.includes('工程'))items.push('設計、施工或現場監督','工安、品質與進度管理','驗收及竣工文件');return [...new Set(items)].slice(0,5)}
function institutionType(t){const types=classifyTender(t);if(types.includes('airport'))return '機場／航空站機構';if(types.includes('transit'))return '公共交通設施機構';if(types.includes('special')){const x=intelligenceText(t);if(x.includes('醫院')||x.includes('hospital'))return '醫院／醫療機構';if(x.includes('監獄')||x.includes('矯正')||x.includes('prison'))return '監獄／矯正機關';if(['國防部','陸軍','海軍','空軍','軍方','military'].some(k=>x.includes(k.toLowerCase())))return '軍方／國防機構';return '特殊機構'}return '一般政府或公營機構'}
function outlineItem(icon,title,content,wide=false){const body=Array.isArray(content)?(content.length?`<ul>${content.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:'<p class="unknown">摘要資訊不足，請查看完整招標文件。</p>'):`<p>${escapeHtml(content||'尚未辨識')}</p>`;return `<article class="outline-item ${wide?'wide':''}"><header><span>${icon}</span><h3>${title}</h3></header>${body}</article>`}
function openOutline(t){
 const types=classifyTender(t).map(x=>intelligencePatterns[x].label),scope=inferScope(t),remaining=daysLeft(t.deadline),unknown=[];if(!t.budget)unknown.push('預算金額未公開');if(!scope.length)unknown.push('工作範圍需由完整標書補充');
 $('#outlineTitle').textContent=t.title;$('#outlineMeta').textContent=`${t.agency} · ${t.code} · ${t.docType||t.category}`;$('#outlineConfidence').textContent=`辨識度 ${scope.length?92:76}%`;$('#outlineSourceText').textContent=`${t.title}。發布機關為 ${t.agency}，公告日期 ${t.date}，截止日期 ${t.deadline}。`;
 $('#outlineGrid').innerHTML=outlineItem('◎','採購目的',t.title,true)+outlineItem('▦','工作範圍',scope)+outlineItem('⌖','履約地點',inferLocation(t))+outlineItem('⌁','發布機構類型',institutionType(t))+outlineItem('◷','重要時程',[`公告：${t.date}`,`截止：${t.deadline}`,`距截止 ${remaining} 天`])+outlineItem('＄','預算資訊',t.budget?money(t.budget):'原始資料未公開預算')+outlineItem('✓','辨識標籤',types.length?types:['一般採購'],true);
 $('#outlineAlert').innerHTML=remaining<=3?`<b>截止提醒：</b>本案將於 ${remaining} 天內截止，建議優先取得完整標書並確認資格文件。`:unknown.length?`<b>待確認項目：</b>${unknown.join('；')}。辨識結果僅供快速閱讀，應以原始招標文件為準。`:'辨識結果僅供快速閱讀，投標內容仍應以原始招標文件為準。';
 $('#outlineSourceLink').href=sourceUrl(t);$('#outlineModal').hidden=false
}
document.addEventListener('click',e=>{
 const insight=e.target.closest('[data-insight]');if(insight){const type=insight.dataset.insight,isActive=insight.classList.contains('active');$$('.insight-card').forEach(x=>x.classList.remove('active'));if(isActive){$('#agencyGroups').classList.remove('show');renderDashboard();return}insight.classList.add('active');$('#agencyGroups').classList.add('show');const data=tenders.filter(t=>sameToday(t)&&classifyTender(t).includes(type));$('#dashboardTenderList').innerHTML=data.length?data.map(t=>tenderRow(t)).join(''):`<div class="empty"><b>今日沒有${intelligencePatterns[type].label}標案</b>目前追蹤資料中共有 ${tenders.filter(t=>classifyTender(t).includes(type)).length} 筆，可至標案清單查看。</div>`;$$('#quickFilters button').forEach(x=>x.classList.remove('active'))}
 const outline=e.target.closest('[data-outline]');if(outline)openOutline(tenders.find(t=>t.id===outline.dataset.outline));if(e.target.closest('[data-outline-close]'))$('#outlineModal').hidden=true;if(e.target.id==='syncSourcesBtn')setTimeout(renderIntelligence,1900)
});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#outlineModal').hidden=true});
renderIntelligence();renderDashboard();renderFull();renderFavorites();
