export const recipient='contact@motospatial.com';
export function compose({site,name,email,company,topic,message}) {
 const clean=s=>String(s||'').replace(/[\r\n]+/g,' ').trim();
 const subject='[Motospatial｜'+clean(site)+'] '+clean(topic);
 const body=['網站：'+clean(site),'姓名：'+clean(name),'回覆信箱：'+clean(email),'公司／單位：'+clean(company),'','洽詢內容：',String(message||'').trim()].join('\n');
 return {subject,body,mailto:'mailto:'+recipient+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body),gmail:'https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(recipient)+'&su='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)};
}
