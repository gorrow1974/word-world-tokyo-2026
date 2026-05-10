var WORDS=[];
var DEFAULT_BANNER="assets/images/default-banner.jpg";;
var KEY="cles_flash_single_v06";var THEME_KEY="cles_flash_theme_v06";var UI_KEY="cles_flash_ui_v09";
var DEFAULT_ADVENT="assets/images/default-advent.png";;
var attempts=[],sessions=[],queue=[],idx=0,session=null,shownAt=null,shownPerf=0,timer=null,raf=null,limitMs=3000,answering=false,voices=[],selectedPreset="all_100";
var SEED_ATTEMPTS=[];
function id(x){return document.getElementById(x)}function uuid(){return"id-"+Date.now()+"-"+Math.random().toString(16).slice(2)}
function tokyoISO(){var d=new Date(),fmt=new Intl.DateTimeFormat("sv-SE",{timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}),parts=fmt.formatToParts(d),p={};for(var i=0;i<parts.length;i++)p[parts[i].type]=parts[i].value;return p.year+"-"+p.month+"-"+p.day+"T"+p.hour+":"+p.minute+":"+p.second+"+09:00"}
function ms(x){return new Date(x).getTime()}function today(){return tokyoISO().slice(0,10)}
function save(){try{localStorage.setItem(KEY,JSON.stringify({attempts:attempts,sessions:sessions}))}catch(e){toast("保存できません: "+e.message)}}
function load(){try{var x=JSON.parse(localStorage.getItem(KEY)||"{}");attempts=x.attempts||[];sessions=x.sessions||[];if(attempts.length===0&&SEED_ATTEMPTS&&SEED_ATTEMPTS.length){attempts=SEED_ATTEMPTS.slice();save();}}catch(e){attempts=[];sessions=[];if(SEED_ATTEMPTS&&SEED_ATTEMPTS.length)attempts=SEED_ATTEMPTS.slice();}}
function toast(m){var t=id("toast");t.textContent=m;t.style.display="block";clearTimeout(t._t);t._t=setTimeout(function(){t.style.display="none"},1600)}
function switchTab(tab){["study","routine","advent","dashboard","review","manage"].forEach(function(t){id(t).classList.toggle("active",t===tab)});var b=document.querySelectorAll(".tab-btn");for(var i=0;i<b.length;i++)b[i].classList.toggle("active",b[i].getAttribute("data-tab")===tab);if(tab==="advent")renderAdvent();if(tab==="advent")renderAdvent();if(tab==="dashboard")renderDashboard();if(tab==="review")renderReview();if(tab==="manage")renderKpi();renderDashboard();renderAdvent();applyHowToState();enhanceTouchControls()}
function enterFlash(){document.body.classList.add("flash-lock");id("normalArea").style.display="none";id("flashArea").classList.add("active")}function exitFlash(){clearTimers();document.body.classList.remove("flash-lock");id("flashArea").classList.remove("active");id("normalArea").style.display="block";renderKpi();renderDashboard();renderAdvent();applyHowToState();enhanceTouchControls()}
function initSections(){var h="";for(var i=1;i<=19;i++)h+='<label><input type="checkbox" value="'+i+'"> Section '+i+'</label>';id("sectionPicker").innerHTML=h;var o='<option value="">Section全て</option>';for(var j=1;j<=19;j++)o+='<option value="'+j+'">Section '+j+'</option>';id("fSection").innerHTML=o}
function compareMap(){
  var m={};
  WORDS.forEach(function(w){
    m[w.word_id]={
      first_ms:"",second_ms:"",delta_ms:"",trend:"",
      recent1_ms:"",recent2_ms:"",recent3_ms:"",
      recent_delta_1_2:"",recent_delta_2_3:"",
      recent_trend:"",recent_results:"",recent_seen_count:0
    };
  });
  var sorted=attempts.slice().sort(function(a,b){
    return String(a.shown_at).localeCompare(String(b.shown_at));
  });
  var by={};
  sorted.forEach(function(a){
    if(!by[a.word_id])by[a.word_id]=[];
    by[a.word_id].push(a);
  });
  Object.keys(by).forEach(function(k){
    var arr=by[k], c=m[k];
    if(arr[0])c.first_ms=arr[0].reaction_ms;
    if(arr[1]){
      c.second_ms=arr[1].reaction_ms;
      c.delta_ms=arr[1].reaction_ms-arr[0].reaction_ms;
      c.trend=c.delta_ms<0?"改善":(c.delta_ms>0?"悪化":"同じ");
    }
    var last3=arr.slice(-3);
    c.recent_seen_count=last3.length;
    if(last3[0])c.recent1_ms=last3[0].reaction_ms;
    if(last3[1])c.recent2_ms=last3[1].reaction_ms;
    if(last3[2])c.recent3_ms=last3[2].reaction_ms;
    if(last3[0]&&last3[1])c.recent_delta_1_2=last3[1].reaction_ms-last3[0].reaction_ms;
    if(last3[1]&&last3[2])c.recent_delta_2_3=last3[2].reaction_ms-last3[1].reaction_ms;
    c.recent_results=last3.map(function(a){return a.result}).join(" → ");
    if(last3.length>=2){
      var diff=last3[last3.length-1].reaction_ms-last3[0].reaction_ms;
      c.recent_trend=diff<0?"直近改善":(diff>0?"直近悪化":"横ばい");
    }
  });
  return m;
}
function statsMap(){var cm=compareMap(),m={};WORDS.forEach(function(w){m[w.word_id]={word_id:w.word_id,word:w.word,meaning:w.meaning,part_id:w.part_id,section_id:w.section_id,known:0,unknown:0,timeout:0,seen:0,rsum:0,rcount:0,last_seen:"",first_ms:cm[w.word_id].first_ms,second_ms:cm[w.word_id].second_ms,delta_ms:cm[w.word_id].delta_ms,trend:cm[w.word_id].trend,recent1_ms:cm[w.word_id].recent1_ms,recent2_ms:cm[w.word_id].recent2_ms,recent3_ms:cm[w.word_id].recent3_ms,recent_delta_1_2:cm[w.word_id].recent_delta_1_2,recent_delta_2_3:cm[w.word_id].recent_delta_2_3,recent_trend:cm[w.word_id].recent_trend,recent_results:cm[w.word_id].recent_results,recent_seen_count:cm[w.word_id].recent_seen_count}});attempts.forEach(function(a){var s=m[a.word_id];if(!s)return;s.seen++;if(a.result==="known")s.known++;if(a.result==="unknown")s.unknown++;if(a.result==="timeout")s.timeout++;s.rsum+=a.reaction_ms||0;s.rcount++;if(!s.last_seen||a.shown_at>s.last_seen)s.last_seen=a.shown_at});Object.keys(m).forEach(function(k){var s=m[k];s.avg=s.rcount?Math.round(s.rsum/s.rcount):""});return m}
function getPool(){var scope=id("scope").value,arr=WORDS.slice();if(scope==="p1")arr=arr.filter(function(w){return w.part_id===1});if(scope==="p2")arr=arr.filter(function(w){return w.part_id===2});if(scope==="p3")arr=arr.filter(function(w){return w.part_id===3});if(scope==="p12")arr=arr.filter(function(w){return w.part_id===1||w.part_id===2});if(scope==="sections"){var inputs=id("sectionPicker").querySelectorAll("input:checked"),checked=[];for(var i=0;i<inputs.length;i++)checked.push(Number(inputs[i].value));arr=checked.length?arr.filter(function(w){return checked.indexOf(w.section_id)>=0}):[]}return arr}
function shuffle(a){var b=a.slice();for(var i=b.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1)),t=b[i];b[i]=b[j];b[j]=t}return b}
function buildQueue(){var arr=getPool(),mode=id("mode").value,n=Number(id("count").value);if(mode==="random")arr=shuffle(arr);if(mode==="sequential")arr=arr.sort(function(a,b){return a.word_id-b.word_id});if(mode==="unknown"){var sm=statsMap();arr=arr.sort(function(a,b){var A=sm[a.word_id],B=sm[b.word_id],sa=A.unknown*3+A.timeout*5-A.known+(A.seen?0:10),sb=B.unknown*3+B.timeout*5-B.known+(B.seen?0:10);return sb-sa||a.word_id-b.word_id})}return arr.slice(0,Math.min(n,arr.length))}
function applyPreset(preset){selectedPreset=preset;var p={scope:"all",count:"100",mode:"random",limit:"3000"};if(preset==="p1_100")p={scope:"p1",count:"100",mode:"random",limit:"3000"};if(preset==="p12_100")p={scope:"p12",count:"100",mode:"random",limit:"3000"};if(preset==="weak_100")p={scope:"all",count:"100",mode:"unknown",limit:"3000"};if(preset==="p1_200")p={scope:"p1",count:"200",mode:"random",limit:"3000"};if(preset==="all_300")p={scope:"all",count:"300",mode:"random",limit:"3000"};id("scope").value=p.scope;id("count").value=p.count;id("mode").value=p.mode;id("limit").value=p.limit;id("sectionPicker").classList.add("hidden");var cards=document.querySelectorAll(".preset-card");for(var i=0;i<cards.length;i++)cards[i].classList.toggle("active",cards[i].getAttribute("data-preset")===preset)}
function start(){queue=buildQueue();if(!queue.length){toast("出題対象がありません");return}idx=0;limitMs=3000;if(id("limit"))id("limit").value="3000";session={session_id:uuid(),session_started_at:tokyoISO(),date_key:today(),known_count:0,unknown_count:0,timeout_count:0,scope:{question_count:queue.length,mode:id("mode").value,time_limit_ms:3000,preset:selectedPreset,scope:id("scope").value,absolute_time_limit:true}};enterFlash();showWord()}
function clearTimers(){if(timer){clearTimeout(timer);timer=null}if(raf){cancelAnimationFrame(raf);raf=null}answering=false}
function showWord(){clearTimers();answering=false;var w=queue[idx];if(!w){finish();return}id("progress").textContent=(idx+1)+"/"+queue.length;id("partsection").textContent="Part "+w.part_id+" / Section "+w.section_id;id("flashWord").textContent=w.word;id("flashMeaning").textContent=w.meaning;id("flashMeaning").classList.toggle("hidden",!id("showMeaning").checked);shownAt=tokyoISO();shownPerf=performance.now();if(id("autoSpeak").checked)setTimeout(function(){speak(w.word)},100);animateBar();timer=setTimeout(function(){answer("timeout")},3000)}
function animateBar(){var st=performance.now(),bar=id("bar");function tick(t){var r=Math.max(0,1-(t-st)/3000);bar.style.transform="scaleX("+r+")";if(r>0)raf=requestAnimationFrame(tick)}bar.style.transform="scaleX(1)";raf=requestAnimationFrame(tick)}
function timeBucket(h){if(h>=5&&h<9)return"morning";if(h>=9&&h<12)return"forenoon";if(h>=12&&h<15)return"afternoon";if(h>=15&&h<18)return"evening";if(h>=18&&h<22)return"night";return"late_night"}
function answer(result){if(answering)return;var elapsed=Math.max(0,Math.round(performance.now()-shownPerf));if(elapsed>=3000)result="timeout";answering=true;var w=queue[idx];if(!w)return;if(timer){clearTimeout(timer);timer=null}if(raf){cancelAnimationFrame(raf);raf=null}var ansAt=tokyoISO(),react=result==="timeout"?3000:Math.min(2999,elapsed);attempts.push({attempt_id:uuid(),session_id:session.session_id,word_id:w.word_id,word:w.word,meaning:w.meaning,part_id:w.part_id,section_id:w.section_id,level:1,mode:session.scope.mode,preset:session.scope.preset,shown_at:shownAt,answered_at:ansAt,date_key:shownAt.slice(0,10),hour:Number(shownAt.slice(11,13)),time_bucket:timeBucket(Number(shownAt.slice(11,13))),reaction_ms:react,result:result,absolute_time_limit_ms:3000});if(result==="known")session.known_count++;if(result==="unknown")session.unknown_count++;if(result==="timeout")session.timeout_count++;save();idx++;setTimeout(function(){if(idx>=queue.length)finish();else showWord()},50)}
function finish(){clearTimers();var end=tokyoISO();session.session_ended_at=end;session.session_duration_sec=Math.round((ms(end)-ms(session.session_started_at))/1000);sessions.push(session);save();toast("完了: known "+session.known_count+" / timeout "+session.timeout_count);session=null;exitFlash();switchTab("manage")}
function card(k,v){return '<div class="stat"><span>'+k+'</span><br><b>'+v+'</b></div>'}function esc(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
function renderReview(){
  var rows=Object.values(statsMap()),fp=id("fPart").value,fs=id("fSection").value,fr=id("fResult").value,sort=id("fSort").value;
  if(fp)rows=rows.filter(function(r){return String(r.part_id)===fp});
  if(fs)rows=rows.filter(function(r){return String(r.section_id)===fs});
  if(fr==="unknown")rows=rows.filter(function(r){return r.unknown>0});
  if(fr==="timeout")rows=rows.filter(function(r){return r.timeout>0});
  if(fr==="unseen")rows=rows.filter(function(r){return r.seen===0});
  rows.sort(function(a,b){
    if(sort==="unknown")return b.unknown-a.unknown||a.word_id-b.word_id;
    if(sort==="timeout")return b.timeout-a.timeout||a.word_id-b.word_id;
    if(sort==="reaction")return(b.avg||0)-(a.avg||0);
    if(sort==="compare")return (a.recent_delta_2_3===""?999999:a.recent_delta_2_3)-(b.recent_delta_2_3===""?999999:b.recent_delta_2_3);
    if(sort==="last")return String(a.last_seen||"").localeCompare(String(b.last_seen||""));
    return a.word_id-b.word_id;
  });
  id("reviewTable").innerHTML='<table><thead><tr><th>ID</th><th>word</th><th>meaning</th><th>Part</th><th>Section</th><th>seen</th><th>unknown</th><th>timeout</th><th>avg</th><th>直近1</th><th>直近2</th><th>直近3</th><th>Δ1→2</th><th>Δ2→3</th><th>直近傾向</th><th>直近結果</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td>'+r.word_id+'</td><td>'+esc(r.word)+'</td><td>'+esc(r.meaning)+'</td><td>'+r.part_id+'</td><td>'+r.section_id+'</td><td>'+r.seen+'</td><td>'+r.unknown+'</td><td>'+r.timeout+'</td><td>'+r.avg+'</td><td>'+r.recent1_ms+'</td><td>'+r.recent2_ms+'</td><td>'+r.recent3_ms+'</td><td>'+r.recent_delta_1_2+'</td><td>'+r.recent_delta_2_3+'</td><td>'+r.recent_trend+'</td><td>'+r.recent_results+'</td></tr>'}).join("")+'</tbody></table>'
}
function aggregate(rows,keyFn){var g={};rows.forEach(function(a){var k=keyFn(a)||"(blank)";if(!g[k])g[k]={key:k,attempt:0,known:0,unknown:0,timeout:0,reaction_sum:0,reaction_count:0};var x=g[k];x.attempt++;if(a.result==="known")x.known++;if(a.result==="unknown")x.unknown++;if(a.result==="timeout")x.timeout++;x.reaction_sum+=a.reaction_ms||0;x.reaction_count++});Object.keys(g).forEach(function(k){var x=g[k];x.avg_ms=x.reaction_count?Math.round(x.reaction_sum/x.reaction_count):0;x.known_rate=x.attempt?Math.round(x.known/x.attempt*100):0;x.timeout_rate=x.attempt?Math.round(x.timeout/x.attempt*100):0;x.efficiency_score=Math.round(x.known_rate*1.2-x.timeout_rate*1.5-Math.min(x.avg_ms/100,50))});return Object.values(g)}
function kpiTable(rows,cols){return '<div class="table-wrap"><table><thead><tr>'+cols.map(function(c){return '<th>'+c.label+'</th>'}).join("")+'</tr></thead><tbody>'+rows.map(function(r){return '<tr>'+cols.map(function(c){return '<td>'+esc(typeof c.value==="function"?c.value(r):r[c.value])+'</td>'}).join("")+'</tr>'}).join("")+'</tbody></table></div>'}
function renderKpi(){var rows=attempts,total=rows.length,known=rows.filter(function(a){return a.result==="known"}).length,timeout=rows.filter(function(a){return a.result==="timeout"}).length,avg=total?Math.round(rows.reduce(function(s,a){return s+(a.reaction_ms||0)},0)/total):0;var uw={};rows.forEach(function(a){uw[a.word_id]=true});id("kpiOverall").innerHTML=card("総attempt",total)+card("接触単語",Object.keys(uw).length)+card("未接触",WORDS.length-Object.keys(uw).length)+card("known率",total?Math.round(known/total*100)+"%":"0%")+card("timeout率",total?Math.round(timeout/total*100)+"%":"0%")+card("平均ms",avg);
var cm=Object.values(statsMap()).filter(function(r){return r.recent_seen_count>=2}).sort(function(a,b){
  return (a.recent_delta_2_3===""?999999:a.recent_delta_2_3)-(b.recent_delta_2_3===""?999999:b.recent_delta_2_3);
}).slice(0,50);
id("kpiReactionCompare").innerHTML=kpiTable(cm,[
  {label:"ID",value:"word_id"},
  {label:"word",value:"word"},
  {label:"Part",value:"part_id"},
  {label:"Section",value:"section_id"},
  {label:"直近1ms",value:"recent1_ms"},
  {label:"直近2ms",value:"recent2_ms"},
  {label:"直近3ms",value:"recent3_ms"},
  {label:"Δ1→2",value:"recent_delta_1_2"},
  {label:"Δ2→3",value:"recent_delta_2_3"},
  {label:"直近傾向",value:"recent_trend"},
  {label:"直近結果",value:"recent_results"}
]);
var timeAgg=aggregate(rows,function(a){return a.time_bucket}).sort(function(a,b){return b.efficiency_score-a.efficiency_score});id("kpiBestTime").innerHTML=kpiTable(timeAgg,[{label:"時間帯",value:"key"},{label:"attempt",value:"attempt"},{label:"known率",value:function(r){return r.known_rate+"%"}},{label:"timeout率",value:function(r){return r.timeout_rate+"%"}},{label:"平均ms",value:"avg_ms"},{label:"効果score",value:"efficiency_score"}]);
var daily=aggregate(rows,function(a){return a.date_key}).sort(function(a,b){return String(a.key).localeCompare(String(b.key))});id("kpiDaily").innerHTML=kpiTable(daily,[{label:"日付",value:"key"},{label:"attempt",value:"attempt"},{label:"known",value:"known"},{label:"unknown",value:"unknown"},{label:"timeout",value:"timeout"},{label:"平均ms",value:"avg_ms"},{label:"known率",value:function(r){return r.known_rate+"%"}}]);
var partAgg=aggregate(rows,function(a){return "Part "+a.part_id});var secAgg=aggregate(rows,function(a){return "Section "+a.section_id}).sort(function(a,b){return Number(String(a.key).replace("Section ",""))-Number(String(b.key).replace("Section ",""))});id("kpiPartSection").innerHTML='<h3>Part</h3>'+kpiTable(partAgg,[{label:"part",value:"key"},{label:"attempt",value:"attempt"},{label:"known率",value:function(r){return r.known_rate+"%"}},{label:"timeout率",value:function(r){return r.timeout_rate+"%"}},{label:"平均ms",value:"avg_ms"}])+'<h3>Section</h3>'+kpiTable(secAgg,[{label:"section",value:"key"},{label:"attempt",value:"attempt"},{label:"known率",value:function(r){return r.known_rate+"%"}},{label:"timeout率",value:function(r){return r.timeout_rate+"%"}},{label:"平均ms",value:"avg_ms"}]);
var sm=Object.values(statsMap()).map(function(r){r.weak_score=(r.unknown*3)+(r.timeout*5)+(r.avg?Math.round(r.avg/1000):0)-r.known;return r}).sort(function(a,b){return b.weak_score-a.weak_score||a.word_id-b.word_id}).slice(0,50);id("kpiWord").innerHTML=kpiTable(sm,[{label:"ID",value:"word_id"},{label:"word",value:"word"},{label:"Part",value:"part_id"},{label:"Section",value:"section_id"},{label:"seen",value:"seen"},{label:"unknown",value:"unknown"},{label:"timeout",value:"timeout"},{label:"avg",value:"avg"},{label:"weak_score",value:"weak_score"}])}
function download(name,content,type){var blob=new Blob([content],{type:type}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=name;a.click();URL.revokeObjectURL(url)}
function exportCsv(){var rows=Object.values(statsMap()),head=["word_id","word","meaning","part_id","section_id","known","unknown","timeout","avg","first_ms","second_ms","delta_ms","trend","recent1_ms","recent2_ms","recent3_ms","recent_delta_1_2","recent_delta_2_3","recent_trend","recent_results","last_seen"];var lines=[head.join(",")].concat(rows.map(function(r){return head.map(function(k){return '"'+String(r[k]||"").replace(/"/g,'""')+'"'}).join(",")}));download("cles_review_"+today()+".csv",lines.join("\n"),"text/csv;charset=utf-8")}
function exportJson(){download("cles_data_"+today()+".json",JSON.stringify({attempts:attempts,sessions:sessions},null,2),"application/json")}
function loadVoices(){if(!("speechSynthesis" in window))return;voices=speechSynthesis.getVoices().filter(function(v){return v.lang&&v.lang.toLowerCase().indexOf("en")===0})}
function speak(text){if(!("speechSynthesis" in window)){toast("TTS非対応");return}if(!voices.length)loadVoices();var u=new SpeechSynthesisUtterance(text),v=voices.filter(function(v){return v.lang.toLowerCase()==="en-us"})[0]||voices[0];if(v){u.voice=v;u.lang=v.lang}else u.lang="en-US";u.rate=.86;speechSynthesis.cancel();speechSynthesis.speak(u)}
function loadTheme(){try{return JSON.parse(localStorage.getItem(THEME_KEY)||"{}")}catch(e){return {}}}
function applyTheme(theme){theme=theme||loadTheme();var bT=theme.bannerTitle||"3秒で、知ってるかだけ。",bS=theme.bannerSubtitle||"Partは3区分、Sectionは100語単位。";id("bannerTitle").textContent=bT;id("bannerSubtitle").textContent=bS;id("bannerTitleInput").value=bT;id("bannerSubtitleInput").value=bS;id("bannerOpacity").value=theme.bannerOpacity||"1";id("bannerEnabled").checked=theme.bannerEnabled!==false;var banner=theme.bannerData||DEFAULT_BANNER;if(banner&&theme.bannerEnabled!==false){document.body.style.setProperty("--banner-img","url("+banner+")");id("bannerPreview").style.backgroundImage="url("+banner+")"}else{document.body.style.setProperty("--banner-img","none");id("bannerPreview").style.backgroundImage="none"}document.body.style.setProperty("--banner-opacity",theme.bannerOpacity||"1")}
function saveTheme(bannerData){var old=loadTheme(),theme={bannerTitle:id("bannerTitleInput").value||"3秒で、知ってるかだけ。",bannerSubtitle:id("bannerSubtitleInput").value||"Partは3区分、Sectionは100語単位。",bannerOpacity:id("bannerOpacity").value,bannerEnabled:id("bannerEnabled").checked,bannerData:bannerData||old.bannerData||DEFAULT_BANNER};try{localStorage.setItem(THEME_KEY,JSON.stringify(theme));applyTheme(theme);toast("見た目を保存しました")}catch(e){toast("画像が大きすぎて保存できません")}}


function getDailyAttemptCounts(){
  var by={};
  attempts.forEach(function(a){
    var d=a.date_key || String(a.shown_at||"").slice(0,10);
    if(!d)return;
    if(!by[d])by[d]=0;
    by[d]++;
  });
  return by;
}
function getCompletedDays(){
  var by=getDailyAttemptCounts();
  return Object.keys(by).filter(function(d){return by[d]>=100}).sort();
}
function renderAdvent(){
  document.body.style.setProperty("--advent-img","url("+DEFAULT_ADVENT+")");
  var completed=getCompletedDays();
  var unlocked=Math.min(30,completed.length);
  var grid=id("adventGrid");
  if(!grid)return;
  id("adventUnlocked").textContent=unlocked;
  id("adventDays").textContent=completed.length;
  var todayKey=today();
  var by=getDailyAttemptCounts();
  var todayCount=by[todayKey]||0;
  id("adventNext").textContent=todayCount>=100 ? "解放済" : (100-todayCount)+"語";
  var out="";
  for(var i=1;i<=30;i++){
    var cls=i<=unlocked ? "advent-tile unlocked" : "advent-tile locked";
    if(i===unlocked+1 && todayCount<100) cls += " today";
    out += '<div class="'+cls+'"><span>'+i+'</span></div>';
  }
  grid.innerHTML=out;
}


var reviewPeriod="week";
function dashDateKey(a){return a.date_key || ((a.shown_at||"").slice(0,10));}
function dashPad(n){return String(n).padStart(2,"0")}
function dashWeekKey(d){var dt=new Date(d+"T00:00:00");var day=dt.getDay()||7;dt.setDate(dt.getDate()-day+1);return dt.getFullYear()+"-"+dashPad(dt.getMonth()+1)+"-"+dashPad(dt.getDate())+"週"}
function dashMonthKey(d){return d.slice(0,7)}
function dashSumm(rows){var total=rows.length,known=rows.filter(function(a){return a.result==="known"}).length,unknown=rows.filter(function(a){return a.result==="unknown"}).length,timeout=rows.filter(function(a){return a.result==="timeout"}).length;var rts=rows.map(function(a){return a.reaction_ms}).filter(function(v){return typeof v==="number"&&v>0});var avg=rts.length?Math.round(rts.reduce(function(a,b){return a+b},0)/rts.length):0;return{total:total,known:known,unknown:unknown,timeout:timeout,avg:avg,rate:total?Math.round(known/total*100):0}}
function dashGroups(type){var m={};attempts.forEach(function(a){var d=dashDateKey(a),k="all";if(type==="day")k=d;if(type==="week")k=dashWeekKey(d);if(type==="month")k=dashMonthKey(d);if(!m[k])m[k]=[];m[k].push(a)});return Object.keys(m).sort().reverse().map(function(k){return [k,m[k]]})}
function dashFile(type,key){if(type==="day")return "review_"+key.replaceAll("-","")+"_index.html";if(type==="week")return "week_"+key.replaceAll("-","").replace("週","")+"_index.html";if(type==="month")return "month_"+key.replace("-","")+"_index.html";return "index.html"}
function setReviewPeriod(p){reviewPeriod=p;var bs=document.querySelectorAll(".period-btn");for(var i=0;i<bs.length;i++)bs[i].classList.toggle("active",bs[i].getAttribute("data-period")===p);renderDashboard()}
function renderDashboard(){if(!id("dashSummary"))return;var label={day:"日単位レビュー",week:"週単位レビュー",month:"月単位レビュー",all:"全体レビュー"}[reviewPeriod]||"週単位レビュー";id("dashScopeTitle").textContent=label;var groups=reviewPeriod==="all"?[["all",attempts]]:dashGroups(reviewPeriod);var allRows=[];groups.forEach(function(g){allRows=allRows.concat(g[1])});var s=dashSumm(allRows);id("dashSummary").innerHTML='<div class="stat"><span>Attempts</span><br><b>'+s.total+'</b></div><div class="stat"><span>Known</span><br><b>'+s.known+'</b></div><div class="stat"><span>Unknown/Timeout</span><br><b>'+(s.unknown+s.timeout)+'</b></div><div class="stat"><span>Avg Reaction</span><br><b>'+(s.avg?(s.avg/1000).toFixed(1)+"s":"-")+'</b></div>';var base=location.origin+location.pathname.replace(/[^\/]*$/,"");id("dashLinks").innerHTML=groups.map(function(g){var k=g[0],ss=dashSumm(g[1]),file=dashFile(reviewPeriod,k),name=reviewPeriod==="all"?"CLES Flash Home":k;return '<div class="link-card"><div><b>'+name+'</b><div class="metric-mini">'+label+'</div></div><div><a href="./'+file+'">'+file+'</a><div class="url-mini">'+base+file+'</div></div><div class="metric-mini"><b>'+ss.total+'</b><br>attempts</div><div class="metric-mini"><b>'+ss.rate+'%</b><br>known</div></div>'}).join("");renderDashWeak()}
function renderDashWeak(){var map={};attempts.forEach(function(a){var idd=a.word_id||a.word;if(!map[idd])map[idd]={word:a.word,meaning:a.meaning,unknown:0,timeout:0,known:0,rt:[],count:0};var r=map[idd];r.count++;if(a.result==="known")r.known++;if(a.result==="unknown")r.unknown++;if(a.result==="timeout")r.timeout++;if(a.reaction_ms>0)r.rt.push(a.reaction_ms)});var rows=Object.values(map).map(function(r){r.avg=r.rt.length?Math.round(r.rt.reduce(function(a,b){return a+b},0)/r.rt.length):0;r.score=r.unknown*2+r.timeout*3+r.avg/1000;return r}).sort(function(a,b){return b.score-a.score}).slice(0,20);id("dashWeak").innerHTML='<table><thead><tr><th>word</th><th>meaning</th><th>U/T</th><th>avg</th></tr></thead><tbody>'+rows.map(function(r){return '<tr><td><b>'+esc(r.word)+'</b></td><td>'+esc(r.meaning)+'</td><td>'+r.unknown+'/'+r.timeout+'</td><td>'+(r.avg?(r.avg/1000).toFixed(1)+"s":"-")+'</td></tr>'}).join("")+'</tbody></table>'}

function bindTap(el, handler){
  if(!el || el.__tapBound)return;
  el.__tapBound=true;
  var last=0;
  function run(e){
    var now=Date.now();
    if(now-last<350)return;
    last=now;
    handler(e);
  }
  el.addEventListener("touchend",run,{passive:false});
  el.addEventListener("pointerup",function(e){
    if(e.pointerType==="touch")run(e);
  },{passive:false});
}
function enhanceTouchControls(){
  bindTap(id("knownBtn"),function(){answer("known")});
  bindTap(id("unknownBtn"),function(){answer("unknown")});
  bindTap(id("startPresetBtn"),function(){start()});
  bindTap(id("startBtn"),function(){selectedPreset="custom";start()});
  bindTap(id("speakBtn"),function(){var w=queue[idx];if(w)speak(w.word)});
  bindTap(id("exitFlashBtn"),function(){exitFlash()});
  var tabs=document.querySelectorAll(".tab-btn");
  for(var i=0;i<tabs.length;i++){
    bindTap(tabs[i],function(e){
      var target=e.currentTarget || this;
      switchTab(target.getAttribute("data-tab"));
    });
  }
  var cards=document.querySelectorAll(".preset-card");
  for(var j=0;j<cards.length;j++){
    bindTap(cards[j],function(e){
      var target=e.currentTarget || this;
      applyPreset(target.getAttribute("data-preset"));
    });
  }
}

function bind(){var tabs=document.querySelectorAll(".tab-btn");for(var i=0;i<tabs.length;i++)tabs[i].onclick=function(){switchTab(this.getAttribute("data-tab"))};id("exitFlashBtn").onclick=function(){exitFlash()};id("resetBtn").onclick=function(){if(confirm("履歴をリセットしますか？")){attempts=[];sessions=[];save();toast("リセットしました");id("status").textContent=WORDS.length+"語 内蔵済み。履歴0件。";renderKpi();renderDashboard();renderAdvent();applyHowToState();enhanceTouchControls()}};id("scope").onchange=function(){id("sectionPicker").classList.toggle("hidden",id("scope").value!=="sections")};id("startBtn").onclick=function(){selectedPreset="custom";start()};id("startPresetBtn").onclick=function(){start()};var cards=document.querySelectorAll(".preset-card");for(var j=0;j<cards.length;j++)cards[j].onclick=function(){applyPreset(this.getAttribute("data-preset"))};id("knownBtn").onclick=function(){answer("known")};id("unknownBtn").onclick=function(){answer("unknown")};id("speakBtn").onclick=function(){var w=queue[idx];if(w)speak(w.word)};["fPart","fSection","fResult","fSort"].forEach(function(x){id(x).onchange=renderReview});id("exportCsv").onclick=exportCsv;id("exportJson").onclick=exportJson;id("saveThemeBtn").onclick=function(){var file=id("bannerInput").files[0];if(file){var r=new FileReader();r.onload=function(e){saveTheme(e.target.result)};r.readAsDataURL(file)}else saveTheme()};id("resetThemeBtn").onclick=function(){localStorage.removeItem(THEME_KEY);applyTheme({bannerData:DEFAULT_BANNER});toast("見た目をリセットしました")};id("bannerOpacity").onchange=function(){saveTheme()};id("bannerEnabled").onchange=function(){saveTheme()};document.addEventListener("keydown",function(e){if(!id("flashArea").classList.contains("active"))return;if(e.key==="ArrowRight")answer("known");if(e.key==="ArrowLeft")answer("unknown");if(e.key===" "){e.preventDefault();var w=queue[idx];if(w)speak(w.word)}})}
function init(){load();initSections();bind();applyPreset("all_100");applyTheme();id("status").textContent=WORDS.length+"語 読み込み済み。履歴 "+attempts.length+" 件。3秒絶対判定ON。";loadVoices();if("speechSynthesis" in window)speechSynthesis.onvoiceschanged=loadVoices;renderKpi();renderAdvent();applyHowToState();enhanceTouchControls()}
async function bootClesApp(){
  try{
    if(window.loadClesData){
      var loaded = await window.loadClesData();
      if(loaded.words) WORDS = loaded.words;
      if(loaded.seedAttempts) SEED_ATTEMPTS = loaded.seedAttempts;
    }
    init();
  }catch(e){
    console.error(e);
    var st=document.getElementById("status");
    if(st)st.textContent="起動に失敗しました: "+e.message;
  }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bootClesApp);else bootClesApp();