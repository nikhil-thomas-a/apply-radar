// dashboard.js v1.1

const COLS=[{id:'saved',label:'Saved',color:'var(--saved)'},{id:'applied',label:'Applied',color:'var(--applied)'},{id:'interview',label:'Interview',color:'var(--interview)'},{id:'offer',label:'Offer',color:'var(--offer)'},{id:'rejected',label:'Rejected',color:'var(--rejected)'}]
const PLAT={naukri:'Naukri',linkedin:'LinkedIn',internshala:'Internshala'}
const SL={saved:'Saved',applied:'Applied',interview:'Interview',offer:'Offer',rejected:'Rejected'}
let allJobs=[],filteredJobs=[],activeStatus='all',activePlatform='all',activeSearch='',openJobId=null,draggedId=null

// ── Theme ─────────────────────────────────────────────────────────────────────
function initTheme(){setTheme(localStorage.getItem('ar-theme')||'light')}
function setTheme(t){
  document.documentElement.setAttribute('data-theme',t)
  localStorage.setItem('ar-theme',t)
  const btn=document.getElementById('theme-toggle')
  if(btn) btn.innerHTML=t==='dark'
    ?`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
    :`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
function initTabs(){
  document.querySelectorAll('.nav-tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.nav-tab').forEach(b=>b.classList.remove('active'))
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'))
      btn.classList.add('active')
      document.getElementById('page-'+btn.dataset.page).classList.add('active')
      // Sidebar only on kanban
      document.getElementById('sidebar').classList.toggle('hidden', btn.dataset.page!=='kanban')
      // Refresh dropdowns when switching to ATS or JD match
      if(btn.dataset.page==='ats'||btn.dataset.page==='jdmatch') refreshDropdowns()
    })
  })
}

// ── Load ─────────────────────────────────────────────────────────────────────
async function loadJobs(){
  const d=await chrome.storage.local.get('jobs')
  allJobs=d.jobs||[]
  detectDups();applyFilters();updateSidebar()
}
function detectDups(){
  const seen={}
  allJobs.forEach(j=>{const k=`${j.title.toLowerCase().trim()}__${j.company.toLowerCase().trim()}`;if(!seen[k])seen[k]=[];seen[k].push(j.id)})
  allJobs.forEach(j=>{const k=`${j.title.toLowerCase().trim()}__${j.company.toLowerCase().trim()}`;j._isDup=seen[k].length>1})
}
function applyFilters(){
  filteredJobs=allJobs.filter(j=>{
    if(activeStatus!=='all'&&j.status!==activeStatus) return false
    if(activePlatform!=='all'&&j.platform!==activePlatform) return false
    if(activeSearch){const q=activeSearch.toLowerCase();if(!j.title.toLowerCase().includes(q)&&!j.company.toLowerCase().includes(q)) return false}
    return true
  })
  renderKanban()
}
function updateSidebar(){
  const c=s=>allJobs.filter(j=>j.status===s).length
  const p=pl=>allJobs.filter(j=>j.platform===pl).length
  document.getElementById('count-all').textContent=allJobs.length
  document.getElementById('count-saved').textContent=c('saved')
  document.getElementById('count-applied').textContent=c('applied')
  document.getElementById('count-interview').textContent=c('interview')
  document.getElementById('count-offer').textContent=c('offer')
  document.getElementById('count-rejected').textContent=c('rejected')
  document.getElementById('pcount-all').textContent=allJobs.length
  document.getElementById('pcount-naukri').textContent=p('naukri')
  document.getElementById('pcount-linkedin').textContent=p('linkedin')
  document.getElementById('pcount-internshala').textContent=p('internshala')
  document.getElementById('hdr-total').textContent=allJobs.length
  document.getElementById('stat-total').textContent=allJobs.length
  document.getElementById('stat-applied').textContent=c('applied')
  document.getElementById('stat-interview').textContent=c('interview')
  document.getElementById('stat-offer').textContent=c('offer')
  const dups=Math.floor(allJobs.filter(j=>j._isDup).length/2)
  const dw=document.getElementById('hdr-dup-wrap')
  dw.style.display=dups>0?'flex':'none'
  if(dups>0) document.getElementById('hdr-dups').textContent=dups
}

// ── Kanban ────────────────────────────────────────────────────────────────────
function renderKanban(){
  const kanban=document.getElementById('kanban')
  const cols=activeStatus==='all'?COLS:COLS.filter(c=>c.id===activeStatus)
  kanban.innerHTML=''
  if(allJobs.length===0){
    kanban.innerHTML=`<div class="empty-state fade-in" style="width:100%">
      <div style="font-size:40px">🎯</div><h2>No applications yet</h2>
      <p>Browse any job on Naukri, LinkedIn, or Internshala and click <strong>Save to ApplyRadar</strong> on the detail page.</p>
      <div class="platform-chips">
        <span class="platform-chip" style="color:var(--naukri);border-color:var(--naukri)44">Naukri</span>
        <span class="platform-chip" style="color:var(--linkedin);border-color:var(--linkedin)44">LinkedIn</span>
        <span class="platform-chip" style="color:var(--internshala);border-color:var(--internshala)44">Internshala</span>
      </div></div>`
    return
  }
  cols.forEach(col=>{
    const jobs=filteredJobs.filter(j=>j.status===col.id)
    const el=document.createElement('div')
    el.className='column';el.dataset.colId=col.id
    el.innerHTML=`
      <div class="col-header"><div class="col-title"><span class="col-dot" style="background:${col.color}"></span>${col.label}</div><span class="col-badge">${jobs.length}</span></div>
      <div class="col-cards" id="col-${col.id}" data-status="${col.id}">
        ${jobs.length===0?`<div class="col-empty" data-status="${col.id}">Drop here</div>`:jobs.map(renderCard).join('')}
      </div>`
    kanban.appendChild(el)
  })
  kanban.querySelectorAll('.card').forEach(card=>{card.addEventListener('click',e=>{if(!e.target.closest('.icon-btn')) openDrawer(card.dataset.id)})})
  kanban.querySelectorAll('.icon-btn.delete').forEach(btn=>{btn.addEventListener('click',e=>{e.stopPropagation();deleteJob(btn.dataset.id)})})
  kanban.querySelectorAll('.icon-btn.open-link').forEach(btn=>{btn.addEventListener('click',e=>{e.stopPropagation();window.open(btn.dataset.url,'_blank')})})
  initDrag()
}

// Parse a deadline string into days remaining (positive = future, negative = past, null = unparseable)
function parseDeadline(str){
  if(!str) return null
  // Try "16 Apr '26", "16 Apr 2026", "16-Apr-2026", "Apr 16 2026"
  const clean=str.replace(/'/g,'20').replace(/[-,]/g,' ').trim()
  const d=new Date(clean)
  if(!isNaN(d)){
    const today=new Date();today.setHours(0,0,0,0);d.setHours(0,0,0,0)
    return Math.round((d-today)/(1000*60*60*24))
  }
  // Try "16 Apr" (assume current year)
  const m=clean.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)
  if(m){
    const d2=new Date(`${m[2]} ${m[1]} ${new Date().getFullYear()}`)
    if(!isNaN(d2)){
      const today=new Date();today.setHours(0,0,0,0);d2.setHours(0,0,0,0)
      return Math.round((d2-today)/(1000*60*60*24))
    }
  }
  return null
}

function renderCard(job){
  const dateStr=new Date(job.savedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})
  const today=new Date();today.setHours(0,0,0,0)
  const fuDate=job.followUpDate?new Date(job.followUpDate):null
  const fuOverdue=fuDate&&fuDate<today, fuToday=fuDate&&fuDate.toDateString()===today.toDateString()
  // Deadline urgency — parse deadline string into days remaining
  let deadlineTag = ''
  if(job.deadline){
    const dl=parseDeadline(job.deadline)
    if(dl!==null){
      if(dl<0) deadlineTag=`<span class="tag tag-urgent">⚠ Deadline passed</span>`
      else if(dl===0) deadlineTag=`<span class="tag tag-urgent">🔴 Due today!</span>`
      else if(dl<=3) deadlineTag=`<span class="tag tag-urgent">🔴 Due in ${dl}d</span>`
      else if(dl<=7) deadlineTag=`<span class="tag tag-warn">🟡 Due in ${dl}d</span>`
      else deadlineTag=`<span class="tag">⏰ Due ${esc(job.deadline)}</span>`
    } else {
      deadlineTag=`<span class="tag">⏰ Due ${esc(job.deadline)}</span>`
    }
  }
  const tags=[
    job.location&&`<span class="tag">📍 ${esc(job.location.substring(0,22))}</span>`,
    job.salary&&`<span class="tag">💰 ${esc(job.salary.substring(0,20))}</span>`,
    job.experience&&`<span class="tag">⏱ ${esc(job.experience.substring(0,18))}</span>`,
    job.jobType&&`<span class="tag">${esc(job.jobType)}</span>`,
    job.deadline&&deadlineTag,
    job.duration&&`<span class="tag">📅 ${esc(job.duration)}</span>`,
    job.type==='internship'&&`<span class="tag">Internship</span>`,
    fuDate&&`<span class="tag followup">${fuOverdue?'⚠ Overdue':fuToday?'📌 Follow up today':'📌 '+fuDate.toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</span>`,
  ].filter(Boolean).slice(0,3).join('')
  return `<div class="card ${job._isDup?'duplicate':''}" data-id="${job.id}" draggable="true">
    <div class="card-platform">
      <span class="platform-badge platform-${job.platform}">${PLAT[job.platform]||job.platform}</span>
      ${job._isDup?`<span class="dup-badge">⚠ Duplicate</span>`:''}
    </div>
    <div class="card-title">${esc(job.title)}</div>
    <div class="card-company">${esc(job.company)}</div>
    ${tags?`<div class="card-tags">${tags}</div>`:''}
    <div class="card-footer">
      <span class="card-date">${dateStr}</span>
      <div class="card-actions">
        ${job.url?`<button class="icon-btn open-link" data-url="${esc(job.url)}" title="Open listing"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg></button>`:''}
        <button class="icon-btn delete" data-id="${job.id}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
      </div>
    </div>
  </div>`
}

// ── Drag ─────────────────────────────────────────────────────────────────────
function initDrag(){
  document.querySelectorAll('.card[draggable]').forEach(card=>{
    card.addEventListener('dragstart',e=>{draggedId=card.dataset.id;card.classList.add('drag-ghost');e.dataTransfer.effectAllowed='move'})
    card.addEventListener('dragend',()=>{card.classList.remove('drag-ghost');draggedId=null;document.querySelectorAll('.col-cards').forEach(z=>z.classList.remove('drag-over'))})
  })
  document.querySelectorAll('.col-cards').forEach(zone=>{
    zone.addEventListener('dragover',e=>{e.preventDefault();e.dataTransfer.dropEffect='move';document.querySelectorAll('.col-cards').forEach(z=>z.classList.remove('drag-over'));zone.classList.add('drag-over')})
    zone.addEventListener('dragleave',e=>{if(!zone.contains(e.relatedTarget)) zone.classList.remove('drag-over')})
    zone.addEventListener('drop',async e=>{
      e.preventDefault();zone.classList.remove('drag-over')
      if(!draggedId) return
      const ns=zone.dataset.status, job=allJobs.find(j=>j.id===draggedId)
      if(!job||job.status===ns) return
      job.status=ns;job.updatedAt=new Date().toISOString()
      await chrome.storage.local.set({jobs:allJobs})
      detectDups();applyFilters();updateSidebar()
      toast(`Moved to ${SL[ns]}`)
    })
  })
}

// ── Drawer ────────────────────────────────────────────────────────────────────
function openDrawer(id){
  const job=allJobs.find(j=>j.id===id); if(!job) return
  openJobId=id
  document.getElementById('d-title').textContent=job.title
  document.getElementById('d-company').textContent=job.company
  const details=[
    job.location&&`<div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${esc(job.location)}</span></div>`,
    job.salary&&`<div class="detail-row"><span class="detail-label">Salary</span><span class="detail-value">${esc(job.salary)}</span></div>`,
    job.experience&&`<div class="detail-row"><span class="detail-label">Experience</span><span class="detail-value">${esc(job.experience)}</span></div>`,
    job.jobType&&`<div class="detail-row"><span class="detail-label">Work type</span><span class="detail-value">${esc(job.jobType)}</span></div>`,
    job.duration&&`<div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${esc(job.duration)}</span></div>`,
    job.deadline&&`<div class="detail-row"><span class="detail-label">Deadline</span><span class="detail-value">${esc(job.deadline)}</span></div>`,
    `<div class="detail-row"><span class="detail-label">Platform</span><span class="detail-value">${PLAT[job.platform]||job.platform}</span></div>`,
    `<div class="detail-row"><span class="detail-label">Saved</span><span class="detail-value">${new Date(job.savedAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</span></div>`,
    job.url&&`<div class="detail-row"><span class="detail-label">Link</span><a class="detail-link" href="${esc(job.url)}" target="_blank" rel="noopener">Open listing ↗</a></div>`,
  ].filter(Boolean).join('')
  document.getElementById('drawer-body').innerHTML=`
    <div><div class="drawer-section-label">Status</div>
      <select class="select-input" id="d-status">
        <option value="saved" ${job.status==='saved'?'selected':''}>Saved</option>
        <option value="applied" ${job.status==='applied'?'selected':''}>Applied</option>
        <option value="interview" ${job.status==='interview'?'selected':''}>Interview</option>
        <option value="offer" ${job.status==='offer'?'selected':''}>Offer 🎉</option>
        <option value="rejected" ${job.status==='rejected'?'selected':''}>Rejected</option>
      </select></div>
    <div><div class="drawer-section-label">Follow-up Date</div>
      <input type="date" class="date-input" id="d-followup" value="${job.followUpDate||''}">
      <div style="font-size:11px;color:var(--text-dim);margin-top:5px;font-family:'DM Mono',monospace">Browser notification on this date</div></div>
    <div><div class="drawer-section-label">Notes</div>
      <textarea class="notes-area" id="d-notes" placeholder="Interview feedback, recruiter name, follow-up details…">${esc(job.notes||'')}</textarea></div>
    <div><div class="drawer-section-label">Details</div>
      <div style="display:flex;flex-direction:column;gap:8px">${details}</div></div>`
  document.getElementById('drawer-overlay').classList.add('open')
  document.getElementById('drawer').classList.add('open')
}
function closeDrawer(){document.getElementById('drawer-overlay').classList.remove('open');document.getElementById('drawer').classList.remove('open');openJobId=null}
async function saveDrawer(){
  if(!openJobId) return
  const status=document.getElementById('d-status').value
  const notes=document.getElementById('d-notes').value
  const followUpDate=document.getElementById('d-followup').value||null
  const idx=allJobs.findIndex(j=>j.id===openJobId); if(idx===-1) return
  allJobs[idx]={...allJobs[idx],status,notes,updatedAt:new Date().toISOString()}
  if(followUpDate!==allJobs[idx].followUpDate){
    await chrome.runtime.sendMessage({type:'SET_FOLLOWUP',id:openJobId,date:followUpDate})
    allJobs[idx].followUpDate=followUpDate
  }
  await chrome.storage.local.set({jobs:allJobs})
  detectDups();applyFilters();updateSidebar();closeDrawer();toast('Changes saved')
}
async function deleteJob(id){
  allJobs=allJobs.filter(j=>j.id!==id)
  await chrome.storage.local.set({jobs:allJobs})
  chrome.runtime.sendMessage({type:'DELETE_JOB',id})
  detectDups();applyFilters();updateSidebar()
  if(openJobId===id) closeDrawer()
  toast('Deleted')
}

// ── Export ────────────────────────────────────────────────────────────────────
function exportCSV(){
  const rows=[['Title','Company','Platform','Status','Location','Salary','Experience','Job Type','Deadline','Duration','Follow-up Date','URL','Saved Date','Notes']]
  allJobs.forEach(j=>rows.push([j.title,j.company,j.platform,j.status,j.location||'',j.salary||'',j.experience||'',j.jobType||'',j.deadline||'',j.duration||'',j.followUpDate||'',j.url||'',new Date(j.savedAt).toLocaleDateString('en-IN'),(j.notes||'').replace(/\n/g,' ')]))
  const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download=`applyradar-${new Date().toISOString().slice(0,10)}.csv`;a.click()
  toast('CSV downloaded')
}

// ── Keyword extraction shared ─────────────────────────────────────────────────
function extractKeywords(text){
  // Comprehensive stop list: grammar words + cities + months + numbers-as-words + noise
  const stop=new Set([
    // Grammar
    'and','the','to','of','in','a','is','are','for','with','on','at','be','we','you','this','that','or','an','as','by',
    'our','your','will','have','has','can','from','their','all','it','its','not','but','was','were','been','they','who',
    'which','what','when','how','any','more','also','up','do','if','so','no','my','he','she','us','i','me','am','re',
    'did','does','being','had','would','could','should','may','might','must','shall','etc','per','via','vs','ie','eg',
    'about','after','before','between','during','into','through','under','over','above','below','within','without',
    'including','such','other','than','both','each','few','more','most','some','such','than','too','very','just','use',
    'using','used','work','working','role','position','team','company','job','apply','application','candidate','years',
    'year','month','months','day','days','time','good','strong','excellent','ability','knowledge','understanding',
    'experience','responsible','responsibilities','opportunity','provide','ensure','support','maintain','help','need',
    // Months
    'jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec',
    'january','february','march','april','june','july','august','september','october','november','december',
    // Indian cities (common in JDs/resumes but not skills)
    'bangalore','bengaluru','mumbai','delhi','hyderabad','chennai','pune','kolkata','ahmedabad','jaipur','noida','gurgaon',
    'gurugram','india','remote','hybrid','onsite',
    // Numbers as words + ordinals
    'one','two','three','four','five','six','seven','eight','nine','ten','first','second','third',
  ])
  return[...new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9+#.\s-]/g,' ')
      .split(/\s+/)
      .filter(w=>{
        if(w.length<3) return false          // too short
        if(stop.has(w)) return false          // stop word
        if(/^\d+$/.test(w)) return false     // pure numbers
        if(/^\d+(st|nd|rd|th)$/.test(w)) return false  // ordinals
        return true
      })
  )]
}

function renderScoreResults(containerId, jdText, resumeText, jobTitle){
  const jdKw=extractKeywords(jdText)
  const resumeKw=new Set(extractKeywords(resumeText))
  const matched=jdKw.filter(k=>resumeKw.has(k))
  const missed=jdKw.filter(k=>!resumeKw.has(k)).slice(0,30)
  const score=jdKw.length>0?Math.round((matched.length/jdKw.length)*100):0
  const color=score>=80?'var(--applied)':score>=60?'var(--interview)':'var(--rejected)'
  const verdict=score>=80?'Strong match — resume aligns well with this role.':score>=60?'Good match — consider adding the missing keywords where relevant.':'Weak match — resume is missing many key terms from this JD.'
  document.getElementById(containerId).innerHTML=`
    <div class="score-card">
      ${jobTitle?`<div style="font-size:11px;color:var(--text-2);font-family:'DM Mono',monospace;margin-bottom:4px">${esc(jobTitle)}</div>`:''}
      <div class="score-big">
        <div class="score-number" style="color:${color}">${score}%</div>
        <div class="score-sublabel">keyword match rate</div>
      </div>
      <div class="score-bar-wrap"><div class="score-bar" style="width:${score}%;background:${color}"></div></div>
      <div class="hint-box">${verdict}</div>
      ${matched.length>0?`<div class="kw-section">
        <div class="kw-label">✓ ${matched.length} keywords matched</div>
        <div class="kw-chips">${matched.slice(0,25).map(k=>`<span class="kw-chip kw-match">${esc(k)}</span>`).join('')}</div>
      </div>`:''}
      ${missed.length>0?`<div class="kw-section">
        <div class="kw-label">✗ ${missed.length} keywords to add to resume</div>
        <div class="kw-chips">${missed.slice(0,20).map(k=>`<span class="kw-chip kw-miss">${esc(k)}</span>`).join('')}</div>
        ${missed.length>20?`<div style="font-size:11px;color:var(--text-dim);margin-top:6px;font-family:'DM Mono',monospace">+${missed.length-20} more</div>`:''}
      </div>`:''}
    </div>`
}

// ── ATS Parse Check init ────────────────────────────────────────────────────
function initATSModes(){
  document.getElementById('ats-results').innerHTML=
    '<div class="hint-box">Paste or load your resume, then click <strong>Run ATS Check</strong>.<br><br>This simulates what an ATS or AI screening bot sees when it scans your resume — checking contact info, section structure, date formatting, action verbs, quantified achievements, and formatting issues.</div>'
}

// ── ATS Scorer — parse only ──────────────────────────────────────────────────
function scoreATS(){
  const resume=document.getElementById('ats-resume').value.trim()
  if(!resume){toast('Paste or load your resume first');return}
  renderATSParseCheck('ats-results',resume)
}

// ── ATS Parse Check ──────────────────────────────────────────────────────────
function renderATSParseCheck(containerId, resumeText){
  const lines = resumeText.split('\n').map(l=>l.trim()).filter(Boolean)
  const text = resumeText.toLowerCase()
  const checks = []

  // 1. Contact info
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(resumeText)
  const hasPhone = /(\+91|91)?[\s-]?[6-9]\d{9}|(\+\d{1,3}[\s-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(resumeText)
  // Match linkedin.com/in/ with or without https:// or www.
  const hasLinkedIn = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(in|pub|profile)\/[\w-]/i.test(resumeText)
  checks.push({
    label:'Contact Information',
    pass: hasEmail && hasPhone,
    items:[
      {ok:hasEmail, text:'Email address found'},
      {ok:hasPhone, text:'Phone number found'},
      {ok:true, soft:!hasLinkedIn, text: hasLinkedIn ? 'LinkedIn profile URL detected ✓' : 'LinkedIn URL not found — add linkedin.com/in/your-profile (recommended)'},
    ]
  })

  // 2. Section headings — broad detection
  const hasExp = /\b(experience|work history|employment|worked at|working at|company|organisation|organization|intern|internship|trainee|associate|analyst|engineer|manager|developer|consultant|executive|officer|specialist|coordinator)\b/i.test(resumeText)
  const hasEdu = /\b(education|university|college|institute|school|b\.?tech|b\.?e\.|mba|m\.?tech|bca|bsc|msc|b\.?com|m\.?com|degree|graduate|graduation|pgdm|diploma|ssc|hsc)\b/i.test(resumeText)
  const hasSkills = /\b(skills|technologies|tools|technical|proficient|expertise|competencies|languages|frameworks|platforms|software|programming|certified|certification)\b/i.test(resumeText)
  checks.push({
    label:'Required Sections',
    pass: hasExp && hasEdu && hasSkills,
    items:[
      {ok:hasExp, text: hasExp ? 'Work experience content detected' : 'Experience section not found — add a clear "Experience" heading'},
      {ok:hasEdu, text: hasEdu ? 'Education content detected' : 'Education section not found — add degree, institution, and year'},
      {ok:hasSkills, text: hasSkills ? 'Skills/Technologies content detected' : 'Skills section not found — add a "Technical Skills" section'},
    ]
  })

  // 3. Date formats — comprehensive Indian resume patterns
  const hasDates = [
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z']*[. ]+\d{2,4}\b/i,
    /\b\d{4}\s*[-\u2013\u2014]+\s*(present|current|now|till date|ongoing|\d{2,4})\b/i,
    /\b(19|20)\d{2}\s*-\s*\d{2}\b/i,
    /\b\d{4}\s+to\s+(present|current|(19|20)\d{2})\b/i,
  ].some(r => r.test(resumeText))
  const hasPresent = /\b(present|current|till date|ongoing)\b/i.test(resumeText)
  checks.push({
    label:'Date Formatting',
    pass: hasDates,
    items:[
      {ok:hasDates, text: hasDates ? 'Employment date ranges detected' : 'No date ranges found — add start/end dates to each role (e.g. "Jun 2022 – Present")'},
      {ok:hasPresent, text: hasPresent ? 'Current role shows "Present" or equivalent ✓' : 'Tip: Mark your current role end date as "Present"'},
    ]
  })

  // 4. Action verbs
  const actionVerbs = ['managed','led','developed','designed','built','implemented','created','improved','increased','reduced','delivered','launched','coordinated','analysed','analyzed','optimised','optimized','collaborated','spearheaded','achieved','streamlined','automated','deployed','maintained','executed','oversaw','established','initiated','drove','scaled','mentored','trained','negotiated','resolved','generated','presented','reported','handled','conducted','facilitated','evaluated','monitored']
  const verbsFound = actionVerbs.filter(v => new RegExp('\\b'+v+'\\b','i').test(resumeText))
  const goodVerbs = verbsFound.length >= 4
  checks.push({
    label:'Action Verbs',
    pass: goodVerbs,
    items:[
      {ok:goodVerbs, text: `${verbsFound.length} strong action verbs detected (minimum 4)`},
      {ok:verbsFound.length>0, text: verbsFound.length>0 ? `Found: ${verbsFound.slice(0,5).join(', ')}${verbsFound.length>5?'…':''}` : 'None found — start bullets with: managed, developed, analysed, improved, delivered'},
    ]
  })

  // 5. Quantification
  const allNums = (resumeText.match(/\b\d{2,}\b/g)||[]).length
  const metricNums = (resumeText.match(/\d+\s*(%|x\b|lakh|crore|thousand|million|users|customers|team|members|projects)/gi)||[]).length
  const hasQuant = metricNums >= 1 || allNums >= 4
  checks.push({
    label:'Quantified Achievements',
    pass: hasQuant,
    items:[
      {ok:hasQuant, text: hasQuant ? 'Numerical metrics detected — good for ATS ranking' : 'No clear metrics — add numbers like "Improved efficiency by 30%", "Managed team of 5"'},
      {ok:allNums>=5, text: allNums>=5 ? `${allNums} numeric values in resume ✓` : 'Aim for 3–5 measurable achievements with specific numbers'},
    ]
  })

  // 6. Length
  const wordCount = resumeText.split(/\s+/).filter(Boolean).length
  const goodLength = wordCount >= 200 && wordCount <= 900
  checks.push({
    label:'Resume Length',
    pass: goodLength,
    items:[
      {ok:wordCount>=200, text: wordCount<200 ? `Only ${wordCount} words — too brief, add more detail` : `${wordCount} words total`},
      {ok:wordCount<=900, text: wordCount>900 ? `At ${wordCount} words, consider trimming for a clean 1-page resume` : 'Length is appropriate ✓'},
    ]
  })

  // 7. Formatting
  const hasTableChars = /\|{2,}|\+[-+]{3,}\+/.test(resumeText)
  const excessSpecial = (resumeText.match(/[\u2605\u2713\u2717\u25cf\u25a0\u25a1\u25b6\u25c6\u25ba]/g)||[]).length > 8
  const allCapsCount = resumeText.split('\n').filter(l=>l.trim().length>8&&l.trim()===l.trim().toUpperCase()).length
  checks.push({
    label:'ATS-Friendly Formatting',
    pass: !hasTableChars && !excessSpecial,
    items:[
      {ok:!hasTableChars, text: hasTableChars ? '⚠ Table structure detected — use plain text lines instead' : 'No table formatting detected ✓'},
      {ok:!excessSpecial, text: excessSpecial ? 'Too many special symbols — some ATS systems strip these' : 'Symbol usage looks clean ✓'},
      {ok:allCapsCount<=3, soft:allCapsCount>3, text: allCapsCount>3 ? `${allCapsCount} ALL-CAPS lines — use Title Case for headings` : 'Heading capitalisation looks fine ✓'},
    ]
  })

  // Calculate overall score
  const passCount = checks.filter(c=>c.pass).length
  const total = checks.length
  const score = Math.round((passCount/total)*100)
  const color = score>=80?'var(--applied)':score>=60?'var(--interview)':'var(--rejected)'
  const verdict = score>=80?'Your resume is well-optimised for ATS parsing.':score>=60?'Good structure — address the flagged items to improve your pass rate.':'Several issues detected — fix these before applying to roles that use ATS screening.'

  document.getElementById(containerId).innerHTML=`
    <div class="score-card">
      <div class="score-big">
        <div class="score-number" style="color:${color}">${score}%</div>
        <div class="score-sublabel">ATS compatibility score</div>
      </div>
      <div class="score-bar-wrap"><div class="score-bar" style="width:${score}%;background:${color}"></div></div>
      <div class="hint-box">${verdict}</div>
      ${checks.map(c=>`
        <div style="background:var(--surface);border:1px solid ${c.pass?'var(--applied)22':'var(--rejected)22'};border-radius:var(--r-sm);padding:12px 14px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:14px">${c.pass?'✅':'❌'}</span>
            <span style="font-size:12px;font-weight:700">${esc(c.label)}</span>
          </div>
          ${c.items.map(item=>`
            <div style="display:flex;align-items:flex-start;gap:7px;font-size:11px;color:${
              item.soft?'var(--text-dim)':item.ok?'var(--text-2)':'var(--rejected)'
            };margin-bottom:4px;font-family:'DM Mono',monospace">
              <span style="flex-shrink:0;color:${item.soft?'var(--text-dim)':item.ok?'var(--applied)':'var(--rejected)'}">${
                item.soft?'ℹ':item.ok?'✓':'!'
              }</span>
              <span>${esc(item.text)}</span>
            </div>`).join('')}
        </div>`).join('')}
    </div>`
}

// ── Resume Match (saved job + saved resume) ───────────────────────────────────
function initJdMatch(){
  document.getElementById('jdm-job-select').addEventListener('change',()=>{
    const jobId=document.getElementById('jdm-job-select').value
    const job=allJobs.find(j=>j.id===jobId)
    const preview=document.getElementById('jdm-job-preview')
    if(!job){preview.textContent='Select a job above to preview its details here.';return}
    preview.innerHTML=`<strong>${esc(job.title)}</strong><br><span style="color:var(--text-2)">${esc(job.company)}</span><br><br>${[job.location&&`📍 ${esc(job.location)}`,job.salary&&`💰 ${esc(job.salary)}`,job.experience&&`⏱ ${esc(job.experience)}`,job.deadline&&`⏰ Due ${esc(job.deadline)}`].filter(Boolean).join('<br>')}<br><br><span style="color:var(--text-dim);font-size:11px">Note: Job description text not available in tracker — scoring is based on job title + company name + metadata keywords.</span>`
  })
}

function scoreJdMatch(){
  // JD: prefer pasted text, fall back to saved job metadata
  const pastedJd = (document.getElementById('jdm-jd-text')?.value||'').trim()
  const jobId = document.getElementById('jdm-job-select').value
  const selectedJob = allJobs.find(j=>j.id===jobId)

  let jdText = pastedJd
  let jdLabel = 'Pasted JD'
  if(!pastedJd && selectedJob) {
    jdText = [selectedJob.title, selectedJob.company, selectedJob.location||'', selectedJob.experience||'', selectedJob.jobType||''].join(' ')
    jdLabel = `${selectedJob.title} @ ${selectedJob.company} (metadata only)`
  }
  if(!jdText){toast('Paste a job description or select a saved job');return}

  // Resume: prefer pasted text, fall back to saved resume
  const pastedResume = (document.getElementById('jdm-resume-text')?.value||'').trim()
  const resumeId = document.getElementById('jdm-resume-select').value
  const savedResume = getResumeById(resumeId)
  const resumeText = pastedResume || savedResume?.text || ''
  if(!resumeText){toast('Paste your resume or select a saved resume');return}

  const label = pastedJd
    ? jdLabel
    : `${jdLabel} — paste the full JD for a more accurate score`
  renderScoreResults('jdm-results', jdText, resumeText, label)
}

// ── Dropdowns for ATS + JD Match ─────────────────────────────────────────────
function refreshDropdowns(){
  const resumes=getResumes()
  // ATS scorer resume dropdown
  const atsSel=document.getElementById('ats-resume-select')
  if(atsSel){
    const cur=atsSel.value
    atsSel.innerHTML=`<option value="">— Load from saved resumes —</option>`+resumes.map(r=>`<option value="${r.id}" ${r.id===cur?'selected':''}>${esc(r.name)}</option>`).join('')
  }
  // ATS scorer no longer has a job dropdown (parse-only mode)
  // JD match job dropdown
  const jdJobSel=document.getElementById('jdm-job-select')
  if(jdJobSel){
    const cur=jdJobSel.value
    jdJobSel.innerHTML=`<option value="">— Pick a saved job —</option>`+allJobs.map(j=>`<option value="${j.id}" ${j.id===cur?'selected':''}>${esc(j.title)} — ${esc(j.company)}</option>`).join('')
  }
  // JD match resume dropdown
  const jdResSel=document.getElementById('jdm-resume-select')
  if(jdResSel){
    const cur=jdResSel.value
    jdResSel.innerHTML=`<option value="">— Pick a saved resume —</option>`+resumes.map(r=>`<option value="${r.id}" ${r.id===cur?'selected':''}>${esc(r.name)}</option>`).join('')
  }
}

// ── Resume storage (localStorage) ────────────────────────────────────────────
function getResumes(){return JSON.parse(localStorage.getItem('ar-resumes')||'[]')}
function saveResumes(r){localStorage.setItem('ar-resumes',JSON.stringify(r))}
function getResumeById(id){return getResumes().find(r=>r.id===id)||null}
let activeResumeId=null

function renderResumeList(){
  const resumes=getResumes()
  const list=document.getElementById('resume-list')
  if(resumes.length===0){list.innerHTML=`<div style="font-size:12px;color:var(--text-dim);text-align:center;padding:20px">No resumes yet. Click <strong>+ New Resume</strong>.</div>`;return}
  list.innerHTML=resumes.map(r=>`<div class="resume-item ${r.id===activeResumeId?'active':''}" data-rid="${r.id}"><div class="resume-item-name">${esc(r.name)}</div><div class="resume-item-meta">${r.text.length} chars · ${new Date(r.savedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})}</div></div>`).join('')
  list.querySelectorAll('.resume-item').forEach(el=>el.addEventListener('click',()=>selectResume(el.dataset.rid)))
}
function selectResume(id){
  activeResumeId=id;const r=getResumeById(id);if(!r) return
  document.getElementById('resume-editor').style.display='flex'
  document.getElementById('resume-empty').style.display='none'
  document.getElementById('resume-name').value=r.name
  document.getElementById('resume-text').value=r.text
  renderResumeList()
}
function saveCurrentResume(){
  const name=document.getElementById('resume-name').value.trim()
  const text=document.getElementById('resume-text').value.trim()
  if(!name){toast('Give your resume a name');return}
  if(!text){toast('Resume text is empty');return}
  const resumes=getResumes()
  if(activeResumeId){const idx=resumes.findIndex(r=>r.id===activeResumeId);if(idx!==-1) resumes[idx]={...resumes[idx],name,text,savedAt:new Date().toISOString()}}
  else{const nr={id:`resume_${Date.now()}`,name,text,savedAt:new Date().toISOString()};activeResumeId=nr.id;resumes.unshift(nr)}
  saveResumes(resumes);renderResumeList();refreshDropdowns();toast('Resume saved')
}
function deleteCurrentResume(){
  if(!activeResumeId) return
  saveResumes(getResumes().filter(r=>r.id!==activeResumeId))
  activeResumeId=null
  document.getElementById('resume-editor').style.display='none'
  document.getElementById('resume-empty').style.display='flex'
  renderResumeList();refreshDropdowns();toast('Resume deleted')
}

// ── Templates ─────────────────────────────────────────────────────────────────
const TEMPLATES=[
  {name:"Jake's Resume",desc:"The most ATS-tested single-column LaTeX template. Used by thousands of Indian engineers targeting product companies and startups. Clean, minimal, no tables.",tags:["LaTeX","Engineering","Startups","Free"],hi:true,url:"https://www.overleaf.com/latex/templates/jakes-resume/syzfjbzwjncs",label:"Open in Overleaf"},
  {name:"Deedy CV",desc:"Popular two-column template from a Google engineer. Works well for experienced candidates. Naukri parsers handle it well.",tags:["LaTeX","Experienced","Two-column","Free"],hi:false,url:"https://www.overleaf.com/latex/templates/deedy-cv/bjryvfsjdyxz",label:"Open in Overleaf"},
  {name:"AltaCV",desc:"Modern two-column template with good spacing. Works for non-technical roles. Clean enough for Internshala and LinkedIn applications.",tags:["LaTeX","Non-technical","Modern","Free"],hi:false,url:"https://www.overleaf.com/latex/templates/altacv-template/trgqjpwnmtgv",label:"Open in Overleaf"},
  {name:"Google Docs Templates",desc:"Google Docs' built-in resume templates. Choose Coral, Spearmint or Modern Writer — all single-column and ATS-safe. Free, no LaTeX needed, export to PDF directly.",tags:["Google Docs","Beginner","ATS-safe","Free"],hi:true,url:"https://docs.google.com/document/u/0/?ftv=1&tgif=d",label:"Browse Templates →"},
  {name:"Resumake",desc:"Open-source online resume builder with multiple clean templates. Export to PDF instantly. Good for freshers.",tags:["Online","Beginner","Open-source","Free"],hi:false,url:"https://resumake.io",label:"Open Resumake"},
  {name:"Flowcv",desc:"Web-based builder with ATS-optimised templates. Free tier covers most use cases. Popular with startup applicants.",tags:["Online","Modern","Freemium"],hi:false,url:"https://flowcv.com",label:"Open Flowcv"},
]
function renderTemplates(){
  document.getElementById('templates-grid').innerHTML=TEMPLATES.map(t=>`
    <div class="template-card">
      <div class="template-name">${esc(t.name)}</div>
      <div class="template-tags">${t.tags.map(tg=>`<span class="template-tag ${t.hi?'hi':''}">${esc(tg)}</span>`).join('')}</div>
      <div class="template-desc">${esc(t.desc)}</div>
      <div style="margin-top:auto;padding-top:8px">
        <a class="template-btn primary" href="${t.url}" target="_blank" rel="noopener">${esc(t.label)} ↗</a>
      </div>
    </div>`).join('')
}

// ── Toast ─────────────────────────────────────────────────────────────────────
let tt;function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');clearTimeout(tt);tt=setTimeout(()=>el.classList.remove('show'),2500)}
function esc(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

// ── Bindings ──────────────────────────────────────────────────────────────────
document.querySelectorAll('[data-filter]').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');activeStatus=btn.dataset.filter;document.getElementById('view-title').textContent=activeStatus==='all'?'All Applications':btn.querySelector('.filter-left').textContent.trim();applyFilters()})})
document.querySelectorAll('[data-platform]').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('[data-platform]').forEach(b=>b.classList.remove('active'));btn.classList.add('active');activePlatform=btn.dataset.platform;applyFilters()})})
document.getElementById('search').addEventListener('input',e=>{activeSearch=e.target.value.trim();applyFilters()})
document.getElementById('drawer-close').addEventListener('click',closeDrawer)
document.getElementById('drawer-overlay').addEventListener('click',closeDrawer)
document.getElementById('d-save-btn').addEventListener('click',saveDrawer)
document.getElementById('d-delete-btn').addEventListener('click',()=>{if(openJobId) deleteJob(openJobId)})
document.getElementById('export-btn').addEventListener('click',exportCSV)
document.getElementById('theme-toggle').addEventListener('click',()=>setTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark'))
document.getElementById('ats-score-btn').addEventListener('click',scoreATS)
document.getElementById('ats-resume-select').addEventListener('change',function(){const r=getResumeById(this.value);if(r) document.getElementById('ats-resume').value=r.text})
document.getElementById('jdm-score-btn').addEventListener('click',scoreJdMatch)
document.getElementById('new-resume-btn').addEventListener('click',()=>{activeResumeId=null;document.getElementById('resume-editor').style.display='flex';document.getElementById('resume-empty').style.display='none';document.getElementById('resume-name').value='';document.getElementById('resume-text').value='';renderResumeList()})
document.getElementById('resume-save-btn').addEventListener('click',saveCurrentResume)
document.getElementById('resume-delete-btn').addEventListener('click',deleteCurrentResume)

// Resume Match listeners
document.getElementById('jdm-resume-select')?.addEventListener('change',function(){
  const r=getResumeById(this.value)
  if(r) document.getElementById('jdm-resume-text').value=r.text
})
document.getElementById('jdm-job-select')?.addEventListener('change',function(){
  // Just update the dropdown value; scoreJdMatch reads it when Compare is clicked
})

chrome.storage.onChanged.addListener(changes=>{if(changes.jobs){allJobs=changes.jobs.newValue||[];detectDups();applyFilters();updateSidebar()}})

// Init
// Inject deadline tag styles
;(function(){
  const s=document.createElement('style')
  s.textContent='.tag-urgent{color:#dc2626!important;background:#fef2f2!important;border:1px solid #dc262633!important;font-weight:700}.tag-warn{color:#d97706!important;background:#fffbeb!important;border:1px solid #d9770633!important;font-weight:600}'
  document.head.appendChild(s)
})()
initTheme();initTabs();initJdMatch();initATSModes();renderTemplates();renderResumeList();refreshDropdowns();loadJobs()
