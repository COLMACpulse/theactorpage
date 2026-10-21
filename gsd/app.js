const STORE_KEY = 'gsd_v1_1_tasks';
const LEGACY_KEY = 'gsd_v1_tasks';
const LANES_KEY = 'gsd_lanes';
let tasks = loadTasks();
let recognition = null;
const MIC_READY = 'Tap the mic and say it. Chrome sends what you say to Google, Safari to Apple. Typing always works.';

const els = {
  taskInput: document.getElementById('taskInput'),
  horizonSelect: document.getElementById('horizonSelect'),
  categorySelect: document.getElementById('categorySelect'),
  importanceInput: document.getElementById('importanceInput'),
  urgencyInput: document.getElementById('urgencyInput'),
  severityEnabled: document.getElementById('severityEnabled'),
  severityInput: document.getElementById('severityInput'),
  timeboundEnabled: document.getElementById('timeboundEnabled'),
  dueAtInput: document.getElementById('dueAtInput'),
  addBtn: document.getElementById('addBtn'),
  micBtn: document.getElementById('micBtn'),
  speechStatus: document.getElementById('speechStatus'),
  output: document.getElementById('output'),
  globalPressure: document.getElementById('globalPressure')
};

document.getElementById('addBtn').addEventListener('click', () => addFromInput());
document.getElementById('dailyReceiptBtn').addEventListener('click', () => dailyReceipt());
document.getElementById('reminderBtn').addEventListener('click', () => reminder());
document.getElementById('exportBtn').addEventListener('click', () => exportJSON());
document.getElementById('clearDoneBtn').addEventListener('click', () => { tasks = tasks.filter(t => t.status !== 'done'); save(); render(); });
els.micBtn.addEventListener('click', () => toggleMic());
els.severityEnabled.addEventListener('change', () => els.severityInput.disabled = !els.severityEnabled.checked);
els.timeboundEnabled.addEventListener('change', () => els.dueAtInput.disabled = !els.timeboundEnabled.checked);
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', e => { const f=e.target.files[0]; e.target.value=''; if(f) importJSON(f); });
document.getElementById('lanesBtn').addEventListener('click', () => editLanes());
function drawLanes(){ const cur=els.categorySelect.value; els.categorySelect.innerHTML=LANES.map(l=>'<option>'+escapeHtml(l)+'</option>').join(''); if(LANES.includes(cur)) els.categorySelect.value=cur; }
function editLanes(){ const v=prompt('Your lanes, with commas. Anything you do: Work, Home, Craft, Goals, Personal, Band, Shop...', LANES.join(', ')); if(v==null) return; const L=v.split(',').map(x=>x.trim()).filter(Boolean); if(!L.length) return; LANES=[...new Set(L)]; try{ localStorage.setItem(LANES_KEY,JSON.stringify(LANES)); }catch(e){} drawLanes(); output('Lanes: '+LANES.join(', ')+'.'); }
function importJSON(f){ const rd=new FileReader(); rd.onload=()=>{ try{ const d=JSON.parse(rd.result); const list=(Array.isArray(d)?d:d.tasks)||[]; const have=new Set(tasks.map(t=>t.id)); let n=0; list.map(normalizeTask).forEach(t=>{ if(!have.has(t.id)){ tasks.push(t); n++; } }); save(); render(); output('Imported '+n+' task(s). '+(list.length-n)+' already here.'); }catch(e){ output('That file is not a GSD export.'); } }; rd.readAsText(f); }

function loadTasks(){
  try {
    const primary = localStorage.getItem(STORE_KEY);
    const legacy = localStorage.getItem(LEGACY_KEY);
    const raw = primary || legacy || '[]';
    return JSON.parse(raw).map(normalizeTask);
  } catch { return []; }
}
function normalizeTask(t){
  return {
    id: t.id || uid(),
    title: t.title || 'Untitled task',
    horizon: t.horizon || 'today',
    category: t.category || 'Personal',
    importance: clampNum(t.importance ?? 5, 1, 10),
    urgency: clampNum(t.urgency ?? 5, 1, 10),
    severityEnabled: !!t.severityEnabled,
    severity: clampNum(t.severity ?? 0, 0, 5),
    timeboundEnabled: !!t.timeboundEnabled,
    dueAt: t.dueAt || null,
    status: t.status || 'open',
    createdAt: t.createdAt || new Date().toISOString(),
    completedAt: t.completedAt || null
  };
}
function save(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(tasks)); }catch(e){ output('This browser would not save. Export now so nothing is lost.'); } }
function uid(){ return Math.random().toString(36).slice(2) + Date.now().toString(36); }
function clampNum(n,min,max){ return Math.max(min, Math.min(max, Number(n) || 0)); }
function daysOpen(t){ return Math.max(0, Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 86400000)); }
function horizonWindowHours(h){ return h === 'today' ? 24 : h === 'week' ? 168 : 720; }
function severityMultiplier(t){ return t.severityEnabled ? 1 + (clampNum(t.severity,0,5) / 5) : 1; }
function timeboundMultiplier(t){
  if(!t.timeboundEnabled || !t.dueAt) return 1;
  const due = new Date(t.dueAt).getTime();
  if(Number.isNaN(due)) return 1;
  const hoursLeft = (due - Date.now()) / 3600000;
  if(hoursLeft < 0){
    const hoursOverdue = Math.abs(hoursLeft);
    return 2 + Math.min(hoursOverdue / 24, 7) * 0.25;
  }
  const window = horizonWindowHours(t.horizon);
  const closeness = 1 - Math.min(Math.max(hoursLeft / window, 0), 1);
  return 1 + closeness;
}
function pressure(t){
  if(t.status === 'done' || t.status === 'killed') return 0;
  const base = t.importance * t.urgency * (1 + daysOpen(t));
  return Math.round(base * severityMultiplier(t) * timeboundMultiplier(t));
}
function pressureParts(t){
  return {
    base: Math.round(t.importance * t.urgency * (1 + daysOpen(t))),
    severityMultiplier: +severityMultiplier(t).toFixed(2),
    timeboundMultiplier: +timeboundMultiplier(t).toFixed(2),
    total: pressure(t)
  };
}
function dueLabel(t){
  if(!t.timeboundEnabled || !t.dueAt) return 'No deadline';
  const due = new Date(t.dueAt);
  const diff = due.getTime() - Date.now();
  const absHours = Math.abs(diff) / 3600000;
  const days = Math.floor(absHours / 24);
  const hours = Math.round(absHours % 24);
  const when = due.toLocaleString([], { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
  if(diff < 0) return `OVERDUE ${days}d ${hours}h • due ${when}`;
  return `due in ${days}d ${hours}h • ${when}`;
}
/* ---------- reading a dump ---------- */
/* the lead you say first: "Shit I need done today:", "Reminder, this shit needs to get done:", "Stuff I want to do this week" */
const LEAD=/^\s*(?:reminder\b[\s,:.\-]*)?(?:(?:this|the|some|all the|my)\s+)?(?:shit|stuff|things?|crap|work)\s+(?:(?:that\s+)?i\s+|that\s+)?(?:wants?|wanna|needs?|have|has|gotta|got|must)(?:\s+to)?(?:\s+(?:get|be))?(?:\s+(?:done|do|doing))?(?:\s+(today|tonight|this\s+week|next\s+week|this\s+month|next\s+month))?\s*[:,\-–—.]*\s*/i;
const HWORD=h=>/month/i.test(h)?'month':/week/i.test(h)?'week':'today';
/* the horizon: from the lead if it says one, else from whole words in the dump ("weekend" and "monthly" don't count) */
function inferHorizon(text, fallback){
  const m=String(text).match(LEAD); if(m&&m[1]) return HWORD(m[1]);
  const s=String(text).toLowerCase();
  if(/\b(this|next)\s+month\b|\bby the end of the month\b/.test(s)) return 'month';
  if(/\b(this|next)\s+week\b|\bby friday\b/.test(s)) return 'week';
  if(/\b(today|tonight)\b/.test(s)) return 'today';
  return fallback;
}
function cleanLead(text){ return String(text).replace(LEAD,''); }
/* words that start a new thing to do. "Bob and Sue" and "rock and roll" stay one; "tape it and send it" is two. */
const DOING='call|text|email|e-mail|send|buy|pay|fix|clean|book|finish|write|rewrite|tape|record|pick|drop|feed|get|go|make|take|file|submit|order|schedule|cancel|renew|read|learn|practice|rehearse|run|edit|shoot|cut|post|update|return|wash|mow|cook|plan|print|pack|mail|ship|check|answer|reply|sign|apply|meet|start|try|look|find|ask|tell|follow|set|move|clear|change|wrap|memorize|prep|research|watch|listen|draft|outline|upload|download|backup|back|organize|sort|invoice|charge|pitch|reach|contact|confirm|grab|put|bring|see|visit|walk|work';
const SPLIT_AND=new RegExp('\\s+(?:and\\s+then|then|and|plus)\\s+(?=(?:'+DOING+')\\b)','i');
function tidy(t){ return t.replace(/^[\s:;,.\-–—]+|[\s;,]+$/g,'').replace(/^(and\s+then|then|and|plus|also)\s+/i,'').replace(/\s+(today|tonight|this week|this month|next week|next month)\.?$/i,'').replace(/^(to|i need to|i have to|i want to|gotta|need to)\s+/i,'').trim(); }
function parseItems(text){
  const body=cleanLead(text);
  const parts=body.split(/\n|,|;|\s+\+\s+/);
  const out=[]; parts.forEach(p=>{ String(p).split(SPLIT_AND).forEach(x=>{ x=tidy(x); if(x.length>1) out.push(x); }); });
  return out;
}
/* lanes: yours to name (Settings). These words are only a first guess; you can move anything. */
const LANE_WORDS={
  Craft:/\b(audition|self-?tape|tape|sides|script|draft|rewrite|scene|shoot|edit|reel|headshot|casting|agent|manager|callback|vo|voice ?over|class|rehears\w*|lines|festival|pitch|monologue|résumé|resume|demo|set|shot ?list|treatment|logline|query)\b/i,
  Work:/\b(invoice|email|client|meeting|report|code|build|sell|package|deadline|proposal|boss|office|shift|payroll|quote)\b/i,
  Home:/\b(laundry|dish(es)?|trash|garage|house|clean|yard|lawn|mow|groceries|repair|fix|fence|gate|chores?|kitchen|car|oil)\b/i,
  Goals:/\b(learn|launch|save|train|goal|habit|course|finish the|start the|marathon|book)\b/i,
  Personal:/\b(doctor|dentist|gym|haircut|birthday|friend|mom|dad|kids?|school|wife|husband|partner|date|vet|dog|cat)\b/i
};
let LANES=loadLanes();
function loadLanes(){ try{ const l=JSON.parse(localStorage.getItem(LANES_KEY)||'null'); if(Array.isArray(l)&&l.length) return l; }catch(e){} return ['Work','Home','Craft','Goals','Personal']; }
function inferCategory(title, fallback){ for(const k of Object.keys(LANE_WORDS)){ if(LANES.includes(k)&&LANE_WORDS[k].test(title)) return k; } return fallback; }

function addFromInput(){
  const raw = els.taskInput.value.trim(); if(!raw) return;
  const horizon = inferHorizon(raw, els.horizonSelect.value);
  const items = parseItems(raw);
  const severityEnabled = els.severityEnabled.checked;
  const timeboundEnabled = els.timeboundEnabled.checked;
  const dueAt = timeboundEnabled && els.dueAtInput.value ? new Date(els.dueAtInput.value).toISOString() : null;
  items.forEach(title => tasks.push({
    id: uid(), title, horizon,
    category: inferCategory(title, els.categorySelect.value),
    importance: clampNum(els.importanceInput.value,1,10),
    urgency: clampNum(els.urgencyInput.value,1,10),
    severityEnabled,
    severity: severityEnabled ? clampNum(els.severityInput.value,0,5) : 0,
    timeboundEnabled,
    dueAt,
    status:'open', createdAt:new Date().toISOString(), completedAt:null
  }));
  els.taskInput.value=''; save(); render(); output(items.length?`Captured ${items.length} item(s) into ${horizon.toUpperCase()}:\n- ${items.join('\n- ')}`:'Nothing to capture in that.');
}

function setStatus(id,status){ const t=tasks.find(x=>x.id===id); if(!t) return; t.status=status; t.completedAt=status==='done'?new Date().toISOString():null; save(); render(); }
function move(id,horizon){ const t=tasks.find(x=>x.id===id); if(!t) return; t.horizon=horizon; save(); render(); }
function delTask(id){ const t=tasks.find(x=>x.id===id); if(!t||!confirm('Delete "'+t.title+'"? Gone for good. (KILL keeps a record.)')) return; tasks=tasks.filter(t=>t.id!==id); save(); render(); }
function bumpSeverity(id, delta){ const t=tasks.find(x=>x.id===id); if(!t) return; t.severityEnabled = true; t.severity = clampNum((t.severity || 0) + delta, 0, 5); save(); render(); }
function clearDue(id){ const t=tasks.find(x=>x.id===id); if(!t) return; t.timeboundEnabled=false; t.dueAt=null; save(); render(); }

function render(){
  ['today','week','month'].forEach(h => { const list=document.getElementById(`${h}List`); list.innerHTML=''; tasks.filter(t=>t.horizon===h).sort((a,b)=>pressure(b)-pressure(a)).forEach(t=>list.appendChild(card(t))); });
  els.globalPressure.textContent = tasks.reduce((sum,t)=>sum+pressure(t),0);
}
function card(t){
  const div=document.createElement('div'); div.className=`task-card ${t.status} ${t.timeboundEnabled ? 'timebound' : ''}`;
  const parts = pressureParts(t);
  const sev = t.severityEnabled ? ` • S${t.severity}/5 ×${parts.severityMultiplier}` : ' • S off';
  const tb = t.timeboundEnabled ? ` • TB ×${parts.timeboundMultiplier}` : ' • TB off';
  div.innerHTML=`<div class="task-head"><div class="task-title">${escapeHtml(t.title)}</div><div class="pressure">PS ${parts.total}</div></div><div class="task-meta">${t.category} • ${t.status.toUpperCase()} • age ${daysOpen(t)}d • I${t.importance}/U${t.urgency}${sev}${tb}</div><div class="task-due">${escapeHtml(dueLabel(t))}</div><div class="task-actions"><button data-act="open">Open</button><button data-act="working">Working</button><button data-act="done">Done</button><button data-act="killed">Kill</button><button data-act="sdown">S-</button><button data-act="sup">S+</button><button data-act="cleardue">Clear Due</button><button data-act="today">Today</button><button data-act="week">Week</button><button data-act="month">Month</button><button data-act="delete">Delete</button></div>`;
  div.querySelectorAll('button').forEach(b=>b.onclick=()=>{ const a=b.dataset.act; if(['open','working','done','killed'].includes(a)) setStatus(t.id,a); else if(['today','week','month'].includes(a)) move(t.id,a); else if(a==='sup') bumpSeverity(t.id,1); else if(a==='sdown') bumpSeverity(t.id,-1); else if(a==='cleardue') clearDue(t.id); else delTask(t.id); });
  return div;
}
function dailyReceipt(){
  const today = new Date().toDateString();
  const opened=tasks.length;
  const doneToday=tasks.filter(t=>t.status==='done'&&t.completedAt&&new Date(t.completedAt).toDateString()===today).length;
  const killed=tasks.filter(t=>t.status==='killed').length;
  const active=tasks.filter(t=>!['done','killed'].includes(t.status));
  const timebound=active.filter(t=>t.timeboundEnabled).length;
  const severe=active.filter(t=>t.severityEnabled && t.severity >= 4).length;
  const byCat = {}; tasks.forEach(t=>{ if(t.status==='done') byCat[t.category]=(byCat[t.category]||0)+1; });
  const top = active.sort((a,b)=>pressure(b)-pressure(a))[0];
  output(`DAILY RECEIPT\n\nOPENED TOTAL: ${opened}\nCOMPLETED TODAY: ${doneToday}\nKILLED: ${killed}\nOPEN: ${active.length}\nTIMEBOUND ACTIVE: ${timebound}\nHIGH SEVERITY ACTIVE: ${severe}\nCOMPLETION RATE: ${opened?Math.round((tasks.filter(t=>t.status==='done').length/opened)*100):0}%\n\nTOP PRESSURE\n${top ? `${top.title}\nPS ${pressure(top)} • ${top.category} • ${dueLabel(top)}` : 'None.'}\n\nDONE BY CATEGORY\n${Object.entries(byCat).map(([k,v])=>`${k}: ${v}`).join('\n') || 'None yet.'}`);
}
function reminder(){
  const active=tasks.filter(t=>!['done','killed'].includes(t.status)).sort((a,b)=>pressure(b)-pressure(a));
  if(!active.length) return output('All clear. No active shit remains.');
  const top=active[0]; const parts=pressureParts(top);
  output(`REMINDER\n\n${active.length} item(s) remain.\nHighest pressure: ${top.title}\nCategory: ${top.category}\nPressure Score: ${parts.total}\nBase: ${parts.base} • Severity ×${parts.severityMultiplier} • TIMEBOUND ×${parts.timeboundMultiplier}\n${dueLabel(top)}\n\nThis shit needs to get done.`);
}
function exportJSON(){ const blob=new Blob([JSON.stringify({ app:'GSD', version:'1.1', exportedAt:new Date().toISOString(), tasks },null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='GSD_v1_1_export.json'; a.click(); URL.revokeObjectURL(a.href); }
function output(text){ els.output.textContent=text; }
function escapeHtml(str){ return String(str).replace(/[&<>'"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }

function toggleMic(){
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRecognition){ output('Voice recognition is not supported in this browser. Use typed capture.'); return; }
  if(recognition){ recognition.stop(); recognition=null; els.micBtn.classList.remove('recording'); return; }
  recognition = new SpeechRecognition(); recognition.lang=(window.TapLang?TapLang.speech():((()=>{try{return localStorage.getItem('theactorpage_lang')}catch(e){}})()||navigator.language||'en-US')); recognition.interimResults=false; recognition.continuous=false;
  recognition.onstart=()=>{ els.micBtn.classList.add('recording'); els.speechStatus.textContent='Listening...'; };
  recognition.onresult=e=>{ els.taskInput.value = e.results[0][0].transcript; addFromInput(); };
  recognition.onerror=e=>output('Mic error: '+e.error+'. Typed fallback is ready.');
  recognition.onend=()=>{ els.micBtn.classList.remove('recording'); els.speechStatus.textContent=MIC_READY; recognition=null; };
  recognition.start();
}

drawLanes(); els.speechStatus.textContent=MIC_READY; render();
