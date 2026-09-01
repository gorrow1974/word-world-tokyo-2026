const APP_VERSION='1.5.3',QUESTION_BANK_VERSION='cles-v1-53-balanced',PROFILE_KEY='cles.activeProfile.v1',PROFILE_SET_KEY='cles.profileConfigured.v1',NAME_KEY='cles.learnerName.v1';
let pendingSettingsProfile='',DATA={items:[],groups:[]},WEEKLY={weeks:[]},TODAY={days:{},default:{}},allItems=[],groups=[],currentPack=[],currentIndex=0,currentWeekId='',answerLocked=false,timer,t0=0,limit=10,hintLevel=0,hintTimes=[],activeProfile=localStorage.getItem(PROFILE_KEY)||'';
const E=id=>document.getElementById(id);
async function loadJsonSafe(path,fallback){
 try{
   const sep=path.includes('?')?'&':'?';
   const response=await fetch(path+sep+'v='+encodeURIComponent(APP_VERSION),{cache:'no-store'});
   if(!response.ok)throw new Error(path+' HTTP '+response.status);
   return await response.json();
 }catch(err){
   console.warn('CLES load failed:',path,err);
   return fallback;
 }
}
function japanDateKey(){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const month=parts.find(x=>x.type==='month')?.value||'01';
 const day=parts.find(x=>x.type==='day')?.value||'01';
 return month+'-'+day;
}
async function boot(){
 bind();
 ensureProfileSelected();
 syncProfileUI();
 renderTodayFallback();

 const dataPromise=loadJsonSafe('data.json',{items:[],groups:[]});
 const weeklyPromise=loadJsonSafe('weekly.json',{weeks:[]});
 const todayPromise=loadJsonSafe('today.json',{days:{},default:{}});

 DATA=await dataPromise;
 allItems=Array.isArray(DATA.items)?DATA.items:[];
 groups=Array.isArray(DATA.groups)?DATA.groups:[];
 renderProgress();
 renderReview();

 WEEKLY=await weeklyPromise;
 renderWeeks();

 TODAY=await todayPromise;
 renderToday();

 updateLogStatus();
}
function bind(){
 document.querySelectorAll('[data-screen]').forEach(b=>b.onclick=()=>showScreen(b.dataset.screen));
 E('startReviewQueue').onclick=startReviewQueue;E('startNextTen').onclick=startAdaptiveNextTen;E('quitLearning').onclick=()=>finishSession();E('nextQuestion').onclick=nextQuestion;E('previousQuestion').onclick=previousQuestion;
 E('openSettings').onclick=()=>{loadSettingsForm();showScreen('settingsScreen')};
 E('saveSettings').onclick=saveSettings;
 E('backupLogs').onclick=backupLogs;
 E('restoreLogs').onclick=()=>E('restoreFile').click();
 E('restoreFile').onchange=restoreLogs;E('archiveLogs').onclick=archiveLogs;E('showLogStats').onclick=showLogStats;
 E('clearTestLogs').onclick=()=>clearLogsByMode('test');
 E('clearLearnerLogs').onclick=()=>clearLogsByMode('learning');
 E('hint1Btn').onclick=()=>showHint(1);
 E('hint2Btn').onclick=()=>showHint(2);
 document.querySelectorAll('[data-settings-profile]').forEach(b=>b.onclick=()=>selectSettingsProfile(b.dataset.settingsProfile));
 document.querySelectorAll('[data-gate-profile]').forEach(b=>b.onclick=()=>completeInitialProfile(b.dataset.gateProfile));
}
function setProfile(p){activeProfile=p;localStorage.setItem(PROFILE_KEY,p);syncProfileUI();renderProgress();renderReview()}
function syncProfileUI(){
 const learner=activeProfile==='learner';
 const learnerName=(localStorage.getItem(NAME_KEY)||'学習者').trim()||'学習者';
 E('activeUserChip').textContent=learner?learnerName:'管理者';
 E('modeChip').textContent=learner?'学習者モード':'管理・確認モード';
 document.querySelectorAll('[data-settings-profile]').forEach(b=>b.classList.toggle('active',b.dataset.settingsProfile===activeProfile));
}
function showScreen(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));E(id).classList.add('active');if(id==='progressScreen')renderProgress();if(id==='reviewScreen')renderReview();if(id==='reviewQueueScreen')renderQueue();if(id==='settingsScreen')updateLogStatus()}
function logs(){return (CLESStorage.load().logs||[])}function learnerLogs(){return logs().filter(l=>l.user_profile?l.user_profile==='learner':(l.mode!=='test'&&l.app_mode!=='test'))}
function ensureProfileSelected(){
 const configured=localStorage.getItem(PROFILE_SET_KEY)==='true';
 const valid=activeProfile==='learner'||activeProfile==='developer';
 if(!configured||!valid){
   E('roleGate').classList.add('show');
 }else{
   E('roleGate').classList.remove('show');
 }
}
function completeInitialProfile(profile){
 if(profile!=='learner'&&profile!=='developer')return;
 activeProfile=profile;
 localStorage.setItem(PROFILE_KEY,profile);
 localStorage.setItem(PROFILE_SET_KEY,'true');
 if(!localStorage.getItem(NAME_KEY))localStorage.setItem(NAME_KEY,'学習者');
 E('roleGate').classList.remove('show');
 syncProfileUI();
 renderProgress();
 renderReview();
}
function loadSettingsForm(){
 pendingSettingsProfile=activeProfile||'learner';
 E('learnerName').value=localStorage.getItem(NAME_KEY)||'学習者';
 document.querySelectorAll('[data-settings-profile]').forEach(b=>b.classList.toggle('active',b.dataset.settingsProfile===pendingSettingsProfile));
}
function selectSettingsProfile(profile){
 if(profile!=='learner'&&profile!=='developer')return;
 pendingSettingsProfile=profile;
 document.querySelectorAll('[data-settings-profile]').forEach(b=>b.classList.toggle('active',b.dataset.settingsProfile===profile));
}
function saveSettings(){
 const name=(E('learnerName').value||'学習者').trim()||'学習者';
 const profile=pendingSettingsProfile||activeProfile||'learner';
 localStorage.setItem(NAME_KEY,name);
 localStorage.setItem(PROFILE_KEY,profile);
 localStorage.setItem(PROFILE_SET_KEY,'true');
 activeProfile=profile;
 syncProfileUI();
 renderProgress();
 renderReview();
 showScreen('homeScreen');
 alert('設定を保存しました。');
}
function renderTodayFallback(){
 const fallback={
   title:'今日は、新しい構造を一つ見つける日。',
   message:'正解を急ぐより、英文全体が何をしているかを一度見渡してみよう。',
   cles_message:'今日も10問。速く、でも決めつけずに。'
 };
 E('todayTitle').textContent=fallback.title;
 E('todayMessage').textContent=fallback.message;
 E('todayClesMessage').textContent=fallback.cles_message;
}
function renderToday(){
 const fallback={
   title:'今日は、新しい構造を一つ見つける日。',
   message:'正解を急ぐより、英文全体が何をしているかを一度見渡してみよう。',
   cles_message:'今日も10問。速く、でも決めつけずに。'
 };
 const key=japanDateKey();
 const d=(TODAY&&TODAY.days&&TODAY.days[key])||(TODAY&&TODAY.default)||fallback;
 E('todayTitle').textContent=d.title||fallback.title;
 E('todayMessage').textContent=d.message||fallback.message;
 E('todayClesMessage').textContent=d.cles_message||fallback.cles_message;
}

function renderWeeks(){let g=E('weekGrid');g.innerHTML='';if(!WEEKLY||!Array.isArray(WEEKLY.weeks)||!WEEKLY.weeks.length){g.innerHTML='<div class="card">Weeklyデータを読み込めませんでした。ページを再読み込みしてください。</div>';return;}WEEKLY.weeks.forEach(w=>{let c=document.createElement('div');c.className='card';c.innerHTML=`<h3>${w.label}: ${w.title}</h3><div class="small">${w.item_ids.length}問 / 学習ログ ${learnerLogs().filter(l=>l.week_id===w.id).length}件</div><div class="weekActions"><button class="btn primary">開始</button><button class="btn outline">復習</button></div>`;let b=c.querySelectorAll('button');b[0].onclick=()=>startWeek(w.id,false);b[1].onclick=()=>startWeek(w.id,true);g.appendChild(c)})}
function mapItems(){return Object.fromEntries(allItems.map(x=>[x.id,x]))}function startWeek(id,review){let w=WEEKLY.weeks.find(x=>x.id===id),m=mapItems(),a=w.item_ids.map(x=>m[x]).filter(Boolean);currentPack=smartSort(a,review?weakTypes():{}).slice(0,10);currentIndex=0;currentWeekId=id;E('learnTitle').textContent=`${w.label}: ${w.title}`;showScreen('learnScreen');renderQuestion()}
function startReviewQueue(){currentPack=smartSort([...allItems],weakTypes()).slice(0,10);currentIndex=0;currentWeekId='review-queue';E('learnTitle').textContent='Review Queue';showScreen('learnScreen');renderQuestion()}
function startAdaptiveNextTen(){currentPack=smartSort([...allItems],weakTypes()).slice(0,10);currentIndex=0;currentWeekId='adaptive-next';E('learnTitle').textContent='次の10問';showScreen('learnScreen');renderQuestion()}
function weakTypes(){let out={};groups.forEach(g=>{let l=learnerLogs().filter(x=>(x.correct_answer||x.type)===g.id);if(!l.length){out[g.id]=.5;return}let acc=l.filter(x=>x.ok).length/l.length,mas=l.reduce((a,b)=>a+(+b.mastery_score||0),0)/l.length/100;out[g.id]=1-(acc+mas)/2});return out}
function smartSort(a,w){
 let recent=new Set(learnerLogs().slice(-8).map(x=>x.item_id));
 let ranked=a.map(it=>({it,score:Math.random()*20+(w[it.type]||0)*25-(recent.has(it.id)?15:0)})).sort((x,y)=>y.score-x.score);
 let picked=[],chunkCount={},typeCount={};
 // 1st pass: 同じキーワードは1回まで、同じFunctionは最大2問まで。
 for(const x of ranked){let it=x.it,k=(it.chunk||'').toLowerCase(),t=it.type;if((chunkCount[k]||0)>=1||(typeCount[t]||0)>=2)continue;picked.push(it);chunkCount[k]=(chunkCount[k]||0)+1;typeCount[t]=(typeCount[t]||0)+1;if(picked.length>=10)break}
 // 2nd pass: 10問に足りない場合のみFunction上限を3へ緩和。ただし同一キーワード連発はしない。
 if(picked.length<10)for(const x of ranked){let it=x.it,k=(it.chunk||'').toLowerCase(),t=it.type;if(picked.includes(it)||(chunkCount[k]||0)>=1||(typeCount[t]||0)>=3)continue;picked.push(it);chunkCount[k]=(chunkCount[k]||0)+1;typeCount[t]=(typeCount[t]||0)+1;if(picked.length>=10)break}
 return picked
}
function renderQuestion(){
 answerLocked=false;hintLevel=0;hintTimes=[];
 E('feedback').classList.add('hidden');
 E('hintPanel').classList.add('hidden');
 E('hint2Btn').classList.add('hidden');
 E('hint1Btn').disabled=false;E('hint2Btn').disabled=false;
 let it=currentPack[currentIndex];
 E('questionMeta').textContent=`${it.theme} / Functionを見抜く`;
 E('questionTitle').textContent=it.title;
 E('sentence').innerHTML=escapeHtml(it.sentence)+`<div class="jp">${escapeHtml(it.jp||'')}</div>`;
 E('questionCounter').textContent=`${currentIndex+1}/${currentPack.length}`;
 E('nextQuestion').textContent=currentIndex===currentPack.length-1?'レビューへ':'次へ';
 drawChoices();startTimer();
}
function escapeHtml(v){return String(v??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]))}
function splitAroundChunk(sentence,chunk){
 const source=String(sentence||''),needle=String(chunk||'');
 if(!needle)return {left:source,right:'',found:false};
 const i=source.toLowerCase().indexOf(needle.toLowerCase());
 if(i<0)return {left:source,right:'',found:false};
 return {left:source.slice(0,i),right:source.slice(i+needle.length),found:true};
}
function highlight(s,c){let e=String(c||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');return e?String(s||'').replace(new RegExp(e,'i'),m=>`<span class="keywordHighlight">${escapeHtml(m)}</span>`):escapeHtml(s)}
function showHint(level){
 if(answerLocked)return;
 const it=currentPack[currentIndex];
 hintLevel=Math.max(hintLevel,level);
 hintTimes.push({level,at_sec:+((Date.now()-t0)/1000).toFixed(2)});
 const panel=E('hintPanel');panel.classList.remove('hidden');
 if(level===1){
   const parts=splitAroundChunk(it.sentence,it.chunk);
   panel.innerHTML=`<b>ヒント1｜関係を見る</b><br>キーワードを当てにいく前に、左と右がどうつながるかを見てみよう。<div class="relationFrame"><span>${escapeHtml(parts.left.trim())}</span><strong>?</strong><span>${escapeHtml(parts.right.trim())}</span></div><div class="small">「左の内容を、右がどう受けている？」と考える。</div>`;
   E('hint1Btn').disabled=true;E('hint2Btn').classList.remove('hidden');
 }else{
   panel.innerHTML=`<b>ヒント2｜キーワードを見る</b><br>関係を考えたあとで、つなぎの語を確認しよう。`;
   E('sentence').innerHTML=highlight(it.sentence,it.chunk)+`<div class="jp">${escapeHtml(it.jp||'')}</div>`;
   E('hint1Btn').disabled=true;E('hint2Btn').disabled=true;
 }
}
function drawChoices(){let b=E('choices');b.innerHTML='';groups.forEach(g=>{let x=document.createElement('button');x.className='choice';x.innerHTML=`${g.label}<br><span class="small">${g.id}</span>`;x.onclick=()=>answer(g.id,x);b.appendChild(x)})}
function startTimer(){clearInterval(timer);t0=Date.now();timer=setInterval(()=>{let r=Math.max(0,limit-(Date.now()-t0)/1000);E('timeText').textContent=r.toFixed(1);E('timeBar').style.width=(r/limit*100)+'%';if(r<=0)clearInterval(timer)},100)}function elapsed(){clearInterval(timer);return +((Date.now()-t0)/1000).toFixed(2)}
function mastery(ok,t){let s=t<=3?42:t<=5?31:t<=8?18:t<=10?7:0;return ok?Math.min(100,44+s):Math.max(0,18+Math.round(s*.2)-(t<=6?12:0))}
function answer(ans,btn){if(answerLocked)return;answerLocked=true;let it=currentPack[currentIndex],t=elapsed(),ok=ans===it.type,m=mastery(ok,t);[...E('choices').children].forEach(b=>{b.disabled=true;if(b.textContent.includes(it.type))b.classList.add('correct')});btn.classList.add(ok?'correct':'wrong');let log={ts:new Date().toISOString(),session_id:`S${new Date().toISOString().slice(0,10).replaceAll('-','')}_${currentWeekId}_${activeProfile}`,item_index:currentIndex+1,item_id:it.id,type:it.type,theme:it.theme,title:it.title,chunk:it.chunk,answer:ans,correct_answer:it.type,ok,time_sec:t,timeout:t>limit,mastery_score:m,hint_level:hintLevel,hint_events:hintTimes,sentence:it.sentence,jp:it.jp,feedback:ok?`この読み方でOKです。${hintLevel?`ヒント${hintLevel}まで使って到達しました。次は一段少ないヒントで挑戦してみよう。`:`前後の関係から自力で到達できました。`}`:`今回は「${label(it.type)}」が一番自然です。まず前後の関係を見て、最後に「${it.chunk}」を確認しよう。`,user_profile:activeProfile,app_mode:activeProfile==='learner'?'learning':'test',app_version:APP_VERSION,question_bank_version:QUESTION_BANK_VERSION,week_id:currentWeekId,device_info:getDeviceInfo()};let d=CLESStorage.load();CLESStorage.save({logs:[...(d.logs||[]),log],state:d.state||{}});showFeedback(log)}
function label(id){return (groups.find(g=>g.id===id)||{}).label||id}function showFeedback(l){let f=E('feedback');f.classList.remove('hidden');f.className='feedback '+(l.ok?'ok':'ng');let s=l.ok&&l.time_sec<=3?'3秒以内で正解。構造がかなり速く見えています。':!l.ok&&l.time_sec<=6?'速く間違えています。根拠を1つ確認しましょう。':l.ok&&l.time_sec>=8?'正解ですが少し時間がかかっています。':'正誤だけでなく、どこを見たかを確認しましょう。';f.innerHTML=`<b>${l.ok?'正解':'惜しい'}</b><br>${l.feedback}<br><br>${s}`}
function nextQuestion(){if(!answerLocked)return;if(currentIndex>=currentPack.length-1){finishSession();return}currentIndex++;renderQuestion()}function previousQuestion(){if(currentIndex>0){currentIndex--;renderQuestion()}}
function finishSession(){clearInterval(timer);showScreen('reviewScreen');if(activeProfile==='learner'){renderReview(learnerLogs().filter(x=>x.session_id===`S${new Date().toISOString().slice(0,10).replaceAll('-','')}_${currentWeekId}_learner`))}else{E('reviewText').innerHTML='<b>管理・確認モードでの実行です。</b><br><br>この結果は学習者の理解度・成長データには反映されません。';E('reviewWarning').innerHTML='設定から学習者モードへ切り替えると、学習レビューを開始できます。';E('reviewNextActions').classList.add('hidden')}}
function aggregate(l){let n=l.length,ok=l.filter(x=>x.ok).length,avg=n?l.reduce((a,b)=>a+(+b.time_sec||0),0)/n:0,mas=n?l.reduce((a,b)=>a+(+b.mastery_score||0),0)/n:0;return{n,accuracy:n?Math.round(ok/n*100):0,avg:+avg.toFixed(1),mastery:Math.round(mas),fastWrong:l.filter(x=>!x.ok&&(+x.time_sec||99)<=6).length}}
function renderProgress(){if(!E('statsGrid')||!E('functionProgress'))return;let l=learnerLogs(),a=aggregate(l);E('statsGrid').innerHTML=[['問題数',a.n],['正答率',a.accuracy+'%'],['理解度',a.mastery+'%'],['平均時間',a.avg+'s']].map(x=>`<div class="stat"><b>${x[1]}</b><span>${x[0]}</span></div>`).join('');let p=E('functionProgress');p.innerHTML='';groups.forEach(g=>{let q=l.filter(x=>(x.correct_answer||x.type)===g.id),z=aggregate(q),sc=q.length?Math.round((z.accuracy+z.mastery)/2):0;p.innerHTML+=`<div class="progressRow"><div class="progressRowTop"><span>${g.label} / ${g.id}</span><span>${sc}%</span></div><div class="meter"><div class="fill" style="width:${sc}%"></div></div></div>`})}
function renderReview(src){if(!E('reviewText')||!E('reviewWarning'))return;let l=src&&src.length?src:learnerLogs().slice(-10),a=aggregate(l),by={};groups.forEach(g=>{let q=l.filter(x=>(x.correct_answer||x.type)===g.id);if(q.length)by[g.id]=aggregate(q)});let weak=Object.entries(by).sort((x,y)=>(x[1].accuracy+x[1].mastery)-(y[1].accuracy+y[1].mastery))[0],strong=Object.entries(by).sort((x,y)=>(y[1].accuracy+y[1].mastery)-(x[1].accuracy+x[1].mastery))[0];if(!l.length){E('reviewText').innerHTML='まだ学習ログがありません。今週号を10問だけ試してみましょう。';E('reviewWarning').innerHTML='管理・確認モードのログは学習レビューに入りません。';E('reviewNextActions').classList.add('hidden');return}else{E('reviewNextActions').classList.remove('hidden')}E('reviewText').innerHTML=`<b>直近${l.length}問のレビュー</b><br><br>正答率：${a.accuracy}%<br>理解度：${a.mastery}%<br>平均回答時間：${a.avg}秒<br><br>${strong?`得意：${label(strong[0])}<br>`:''}${weak?`次に見るポイント：${label(weak[0])}<br><br>`:''}${a.fastWrong?'速く間違えた問題があります。根拠を一つ確認しましょう。':'速さと正確さのバランスを確認しましょう。'}`;E('reviewWarning').innerHTML=`<b>次の10問への反映</b><br>${weak?label(weak[0])+'を少し多めにします。':''} 同じ型やキーワードばかりにはしません。`}
function renderQueue(){let t=Object.entries(weakTypes()).sort((a,b)=>b[1]-a[1]).slice(0,3);E('queueDescription').innerHTML=t.length?`現在の重点：${t.map(x=>label(x[0])).join(' / ')}。同じFunctionの別表現を混ぜます。`:'まずは今週号を解いてください。'}


function archiveLogs(){
 try{
   const data=CLESStorage.load();
   const all=Array.isArray(data.logs)?data.logs:[];
   if(!all.length){alert('アーカイブするログがありません。');return;}
   const period=prompt('アーカイブ名を入力してください。例：2026 Summer / 高2夏','2026 Summer');
   if(period===null)return;
   const archive={
     schema:'cles-learning-archive',
     schema_version:'1.0',
     archived_at:new Date().toISOString(),
     archive_name:(period||'CLES Archive').trim(),
     app_version:APP_VERSION,
     question_bank_version:QUESTION_BANK_VERSION,
     summary:buildArchiveSummary(all),
     logs:all
   };
   const safeName=(archive.archive_name||'cles_archive').replace(/[\\/:*?"<>|]/g,'_');
   downloadFile(safeName+'_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(archive,null,2));
 }catch(err){console.error(err);alert('アーカイブを作成できませんでした。');}
}
function buildArchiveSummary(all){
 const learner=all.filter(l=>l.user_profile==='learner'||(!l.user_profile&&l.app_mode!=='test'&&l.mode!=='test'));
 const test=all.filter(l=>l.user_profile==='developer'||l.app_mode==='test'||l.mode==='test');
 const calc=list=>{
   const n=list.length;
   const ok=list.filter(x=>x.ok===true).length;
   const avgTime=n?list.reduce((a,b)=>a+Number(b.time_sec||0),0)/n:0;
   const avgMastery=n?list.reduce((a,b)=>a+Number(b.mastery_score||0),0)/n:0;
   return {count:n,accuracy:n?Math.round(ok/n*100):0,average_time_sec:+avgTime.toFixed(2),average_mastery:Math.round(avgMastery)};
 };
 return {learner:calc(learner),developer_test:calc(test),total_count:all.length};
}
function showLogStats(){
 try{
   const all=logs();
   const learner=all.filter(l=>l.user_profile==='learner'||(!l.user_profile&&l.app_mode!=='test'&&l.mode!=='test'));
   const test=all.filter(l=>l.user_profile==='developer'||l.app_mode==='test'||l.mode==='test');
   const byType={};
   learner.forEach(l=>{
     const t=l.correct_answer||l.type||'UNKNOWN';
     byType[t]=byType[t]||{n:0,ok:0,time:0,mastery:0};
     byType[t].n++;
     if(l.ok===true)byType[t].ok++;
     byType[t].time+=Number(l.time_sec||0);
     byType[t].mastery+=Number(l.mastery_score||0);
   });
   const rows=Object.entries(byType).map(([k,v])=>{
     const acc=v.n?Math.round(v.ok/v.n*100):0;
     const mt=v.n?(v.time/v.n).toFixed(1):'0.0';
     const mm=v.n?Math.round(v.mastery/v.n):0;
     return `${k}: ${v.n}問 / 正答率${acc}% / 平均${mt}秒 / 理解度${mm}%`;
   }).join('\\n');
   alert(`ログ統計\\n\\n学習ログ: ${learner.length}件\\n管理・確認ログ: ${test.length}件\\n全体: ${all.length}件\\n\\n${rows||'Function別ログはまだありません。'}`);
 }catch(err){console.error(err);alert('ログ統計を表示できませんでした。');}
}
function updateLogStatus(){
 const el=E('logStatus');
 if(!el)return;
 try{
   const all=logs();
   const learner=all.filter(l=>l.user_profile==='learner'||(!l.user_profile&&l.app_mode!=='test'&&l.mode!=='test'));
   const test=all.filter(l=>l.user_profile==='developer'||l.app_mode==='test'||l.mode==='test');
   el.textContent=`全${all.length}件 / 学習${learner.length}件 / 管理・確認${test.length}件`;
 }catch(err){
   console.error(err);
   el.textContent='ログ件数を読み込めませんでした。';
 }
}
function downloadFile(name,text,type='application/json'){
 const blob=new Blob([text],{type});
 const a=document.createElement('a');
 a.href=URL.createObjectURL(blob);
 a.download=name;
 document.body.appendChild(a);
 a.click();
 a.remove();
 setTimeout(()=>URL.revokeObjectURL(a.href),500);
}
function backupLogs(){
 try{
   const bundle=CLESStorage.exportBundle({appVersion:APP_VERSION,questionBankVersion:QUESTION_BANK_VERSION});
   downloadFile('cles_user_data_backup_'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(bundle,null,2));
 }catch(err){
   console.error(err);
   alert('バックアップを作成できませんでした。');
 }
}
async function restoreLogs(ev){
 const file=ev.target.files&&ev.target.files[0];
 if(!file)return;
 try{
   const parsed=JSON.parse(await file.text());
   const result=CLESStorage.importBundle(parsed);
   updateLogStatus();
   renderProgress();
   renderReview();
   renderWeeks();
   alert('学習データを復元しました。現在のログ件数: '+result.logCount+'件');
 }catch(err){
   console.error(err);
   alert('復元できませんでした。CLESのJSONバックアップを選択してください。');
 }finally{
   ev.target.value='';
 }
}
function clearLogsByMode(mode){
 const isLearning=mode==='learning';
 const message=isLearning
   ?'学習ログを初期化します。元に戻せません。先にバックアップまたはアーカイブしてください。'
   :'管理・確認モードのログだけを消去します。';
 if(!confirm(message))return;
 if(isLearning){
   const word=prompt('学習ログを本当に初期化する場合は DELETE と入力してください。');
   if(word!=='DELETE')return;
 }
 try{
   const data=CLESStorage.load();
   const kept=(data.logs||[]).filter(l=>{
     const test=l.user_profile==='developer'||l.app_mode==='test'||l.mode==='test';
     return isLearning?test:!test;
   });
   CLESStorage.save({logs:kept,state:data.state||{}});
   updateLogStatus();
   renderProgress();
   renderReview();
   renderWeeks();
   alert(isLearning?'学習ログを消去しました。':'管理・確認ログを消去しました。');
 }catch(err){
   console.error(err);
   alert('ログを消去できませんでした。');
 }
}
function getDeviceInfo(){let ua=navigator.userAgent||'',os=/Android/i.test(ua)?'Android':(/iPhone|iPad|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))?'iOS/iPadOS':/Windows/i.test(ua)?'Windows':/Macintosh|Mac OS X/i.test(ua)?'macOS':'Other',browser=/Edg/i.test(ua)?'Edge':/CriOS|Chrome/i.test(ua)?'Chrome':/Safari/i.test(ua)?'Safari':'Other';return{device_id:getDeviceId(),os,browser,user_agent:ua,screen:`${screen.width}x${screen.height}`,touch_points:navigator.maxTouchPoints||0}}
function getDeviceId(){let id=localStorage.getItem('cles.deviceId.v1');if(!id){id='dev_'+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem('cles.deviceId.v1',id)}return id}boot().catch(err=>{
 console.error(err);
 renderTodayFallback();
 updateLogStatus();
});