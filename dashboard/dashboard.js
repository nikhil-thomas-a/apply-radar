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

function renderCard(job){
  const dateStr=new Date(job.savedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'})
  const today=new Date();today.setHours(0,0,0,0)
  const fuDate=job.followUpDate?new Date(job.followUpDate):null
  const fuOverdue=fuDate&&fuDate<today, fuToday=fuDate&&fuDate.toDateString()===today.toDateString()
  const tags=[
    job.location&&`<span class="tag">📍 ${esc(job.location.substring(0,22))}</span>`,
    job.salary&&`<span class="tag">💰 ${esc(job.salary.substring(0,20))}</span>`,
    job.experience&&`<span class="tag">⏱ ${esc(job.experience.substring(0,18))}</span>`,
    job.jobType&&`<span class="tag">${esc(job.jobType)}</span>`,
    job.deadline&&`<span class="tag">⏰ Due ${esc(job.deadline)}</span>`,
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
  const stop=new Set(['and','the','to','of','in','a','is','are','for','with','on','at','be','we','you','this','that','or','an','as','by','our','your','will','have','has','can','from','their','all','it','its','not','but','was','were','been','they','who','which','what','when','how','any','more','also','up','do','if','so','no','my','he','she','us','i','me','am','re','do','did','does','been','being','had','would','could','should','may','might','must','shall','etc','per','via','vs','ie'])
  return[...new Set(text.toLowerCase().replace(/[^a-z0-9+#.\s-]/g,' ').split(/\s+/).filter(w=>w.length>=2&&!stop.has(w)))]
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
      ${jobTitle?`<div style="font-size:12px;color:var(--text-2);font-family:'DM Mono',monospace">${esc(jobTitle)}</div>`:''}
      <div class="score-big">
        <div class="score-number" style="color:${color}">${score}%</div>
        <div class="score-sublabel">keyword match rate</div>
      </div>
      <div class="score-bar-wrap"><div class="score-bar" style="width:${score}%;background:${color}"></div></div>
      <div class="hint-box">${verdict}</div>
      <div class="kw-section">
        <div class="kw-label">✓ ${matched.length} keywords matched</div>
        <div class="kw-chips">${matched.slice(0,25).map(k=>`<span class="kw-chip kw-match">${esc(k)}</span>`).join('')}</div>
      </div>
      ${missed.length>0?`<div class="kw-section">
        <div class="kw-label">✗ ${missed.length} keywords missing from resume</div>
        <div class="kw-chips">${missed.map(k=>`<span class="kw-chip kw-miss">${esc(k)}</span>`).join('')}</div>
      </div>`:''}
    </div>`
}

// ── ATS Scorer ───────────────────────────────────────────────────────────────
function scoreATS(){
  const jd=document.getElementById('ats-jd').value.trim()
  const resume=document.getElementById('ats-resume').value.trim()
  if(!jd||!resume){toast('Paste both job description and resume text first');return}
  renderScoreResults('ats-results',jd,resume,'')
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
  const jobId=document.getElementById('jdm-job-select').value
  const resumeId=document.getElementById('jdm-resume-select').value
  if(!jobId){toast('Select a job first');return}
  if(!resumeId){toast('Select a resume first');return}
  const job=allJobs.find(j=>j.id===jobId)
  const resume=getResumeById(resumeId)
  if(!job||!resume){toast('Could not find job or resume');return}
  // Build a pseudo-JD from available job metadata
  const pseudoJd=[job.title,job.company,job.location||'',job.salary||'',job.experience||'',job.jobType||'',job.deadline||'',job.duration||''].join(' ')
  renderScoreResults('jdm-results',pseudoJd,resume.text,`${job.title} @ ${job.company}`)
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
  {name:"Google Docs — Simple",desc:"Single column Google Doc template. Best for non-LaTeX users. Exports to PDF cleanly. Naukri and LinkedIn ATS-safe.",tags:["Google Docs","Beginner","ATS-safe","Free"],hi:true,url:"https://docs.google.com/document/d/1YZFLEpx5lY3X2mroXqGmF6xHq6QgN6KDY9ux3Gzw5kQ/edit",label:"Open in Google Docs"},
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

chrome.storage.onChanged.addListener(changes=>{if(changes.jobs){allJobs=changes.jobs.newValue||[];detectDups();applyFilters();updateSidebar()}})

// Init
initTheme();initTabs();initJdMatch();renderTemplates();renderResumeList();refreshDropdowns();loadJobs()
