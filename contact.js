import {compose,recipient} from './contact-compose.js';
const form=document.querySelector('form'),status=document.querySelector('[role="status"]');
function draft(){if(!form.reportValidity())return null;const data=Object.fromEntries(new FormData(form));return compose({...data,site:document.body.dataset.site})}
form.addEventListener('submit',e=>{e.preventDefault();const d=draft();if(!d)return;window.location.href=d.mailto;status.textContent='已請求開啟郵件程式。請確認收件人與內容，按下寄出後才會送出。';});
document.querySelector('#gmail').addEventListener('click',()=>{const d=draft();if(!d)return;const a=document.createElement('a');a.href=d.gmail;a.target='_blank';a.rel='noopener noreferrer';a.click();status.textContent='已開啟 Gmail 撰寫頁，請在 Gmail 中確認並寄出。';});
document.querySelector('#copy').addEventListener('click',async()=>{const d=draft();if(!d)return;const text='收件人：'+recipient+'\n主旨：'+d.subject+'\n\n'+d.body;try{await navigator.clipboard.writeText(text);status.textContent='已複製信件內容。請貼到郵件程式後寄出。'}catch{const box=document.querySelector('#copy-text');box.hidden=false;box.value=text;box.focus();box.select();status.textContent='請手動複製下方信件內容。'}});
const topic=new URLSearchParams(location.search).get('topic');if(topic)form.elements.topic.value=topic.slice(0,100);

let lastDefaultTopic=form.elements.topic.value;
function localizeDefaultTopic(){if(topic||form.elements.topic.value!==lastDefaultTopic)return;lastDefaultTopic=window.MSPreferences?.translate("合作與方案洽詢")||lastDefaultTopic;form.elements.topic.value=lastDefaultTopic;}
window.addEventListener("ms-preferences",localizeDefaultTopic);localizeDefaultTopic();
