// dashboard/dashboard.js

const COLUMNS = [
  { id: 'saved',     label: 'Saved',     color: 'var(--saved)' },
  { id: 'applied',   label: 'Applied',   color: 'var(--applied)' },
  { id: 'interview', label: 'Interview', color: 'var(--interview)' },
  { id: 'offer',     label: 'Offer',     color: 'var(--offer)' },
  { id: 'rejected',  label: 'Rejected',  color: 'var(--rejected)' },
]

const PLATFORM_LABELS = { naukri: 'Naukri', linkedin: 'LinkedIn', internshala: 'Internshala' }

let allJobs = []
let filteredJobs = []
let activeStatus = 'all'
let activePlatform = 'all'
let activeSearch = ''
let openJobId = null
let draggedId = null

// ── Theme ─────────────────────────────────────────────────────────────────────

function initTheme() {
  const saved = localStorage.getItem('ar-theme') || 'light'
  setTheme(saved)
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('ar-theme', theme)
  const btn = document.getElementById('theme-toggle')
  if (btn) btn.innerHTML = theme === 'dark' ? sunIcon() : moonIcon()
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme') || 'light'
  setTheme(cur === 'dark' ? 'light' : 'dark')
}

function sunIcon() {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
}

function moonIcon() {
  return `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`
}

// ── Load & init ───────────────────────────────────────────────────────────────

async function loadJobs() {
  const data = await chrome.storage.local.get('jobs')
  allJobs = data.jobs || []
  detectDuplicates()
  applyFilters()
  updateSidebar()
}

function detectDuplicates() {
  const seen = {}
  allJobs.forEach(j => {
    const key = `${j.title.toLowerCase().trim()}__${j.company.toLowerCase().trim()}`
    if (!seen[key]) seen[key] = []
    seen[key].push(j.id)
  })
  allJobs.forEach(j => {
    const key = `${j.title.toLowerCase().trim()}__${j.company.toLowerCase().trim()}`
    j._isDuplicate = seen[key].length > 1
  })
}

function applyFilters() {
  filteredJobs = allJobs.filter(j => {
    if (activeStatus !== 'all' && j.status !== activeStatus) return false
    if (activePlatform !== 'all' && j.platform !== activePlatform) return false
    if (activeSearch) {
      const q = activeSearch.toLowerCase()
      if (!j.title.toLowerCase().includes(q) && !j.company.toLowerCase().includes(q)) return false
    }
    return true
  })
  renderKanban()
}

function updateSidebar() {
  document.getElementById('count-all').textContent       = allJobs.length
  document.getElementById('count-saved').textContent     = allJobs.filter(j => j.status === 'saved').length
  document.getElementById('count-applied').textContent   = allJobs.filter(j => j.status === 'applied').length
  document.getElementById('count-interview').textContent = allJobs.filter(j => j.status === 'interview').length
  document.getElementById('count-offer').textContent     = allJobs.filter(j => j.status === 'offer').length
  document.getElementById('count-rejected').textContent  = allJobs.filter(j => j.status === 'rejected').length

  document.getElementById('pcount-all').textContent         = allJobs.length
  document.getElementById('pcount-naukri').textContent      = allJobs.filter(j => j.platform === 'naukri').length
  document.getElementById('pcount-linkedin').textContent    = allJobs.filter(j => j.platform === 'linkedin').length
  document.getElementById('pcount-internshala').textContent = allJobs.filter(j => j.platform === 'internshala').length

  const dupCount = Math.floor(allJobs.filter(j => j._isDuplicate).length / 2)
  document.getElementById('hdr-total').textContent     = allJobs.length
  document.getElementById('stat-total').textContent    = allJobs.length
  document.getElementById('stat-applied').textContent  = allJobs.filter(j => j.status === 'applied').length
  document.getElementById('stat-interview').textContent= allJobs.filter(j => j.status === 'interview').length
  document.getElementById('stat-offer').textContent    = allJobs.filter(j => j.status === 'offer').length

  const dupWrap = document.getElementById('hdr-dup-wrap')
  if (dupCount > 0) {
    dupWrap.style.display = 'flex'
    document.getElementById('hdr-dups').textContent = dupCount
  } else {
    dupWrap.style.display = 'none'
  }
}

// ── Kanban render ─────────────────────────────────────────────────────────────

function renderKanban() {
  const kanban = document.getElementById('kanban')
  const cols = activeStatus === 'all' ? COLUMNS : COLUMNS.filter(c => c.id === activeStatus)
  kanban.innerHTML = ''

  if (allJobs.length === 0) {
    kanban.innerHTML = `
      <div class="empty-state fade-in" style="width:100%">
        <div class="empty-state-icon">🎯</div>
        <h2>No applications yet</h2>
        <p>Browse any job on Naukri, LinkedIn, or Internshala and click <strong>Save to ApplyRadar</strong> on the detail page.</p>
        <div class="platform-chips">
          <span class="platform-chip" style="color:var(--naukri);border-color:var(--naukri)44">Naukri</span>
          <span class="platform-chip" style="color:var(--linkedin);border-color:var(--linkedin)44">LinkedIn</span>
          <span class="platform-chip" style="color:var(--internshala);border-color:var(--internshala)44">Internshala</span>
        </div>
      </div>`
    return
  }

  cols.forEach(col => {
    const jobs = filteredJobs.filter(j => j.status === col.id)
    const colEl = document.createElement('div')
    colEl.className = 'column'
    colEl.dataset.colId = col.id
    colEl.innerHTML = `
      <div class="col-header">
        <div class="col-title">
          <span class="col-dot" style="background:${col.color}"></span>
          ${col.label}
        </div>
        <span class="col-badge">${jobs.length}</span>
      </div>
      <div class="col-cards" id="col-${col.id}" data-status="${col.id}">
        ${jobs.length === 0
          ? `<div class="col-empty" data-status="${col.id}">Drop here</div>`
          : jobs.map(renderCard).join('')}
      </div>`
    kanban.appendChild(colEl)
  })

  // Card click → drawer
  kanban.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('.icon-btn')) return
      openDrawer(card.dataset.id)
    })
  })

  // Delete buttons
  kanban.querySelectorAll('.icon-btn.delete').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); deleteJob(btn.dataset.id) })
  })

  // Open link buttons
  kanban.querySelectorAll('.icon-btn.open-link').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); window.open(btn.dataset.url, '_blank') })
  })

  // Drag events
  initDragAndDrop()
}

function renderCard(job) {
  const dateStr = new Date(job.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const metaTags = [
    job.location && `<span class="meta-tag">📍 ${esc(job.location.substring(0, 22))}</span>`,
    job.salary   && `<span class="meta-tag">💰 ${esc(job.salary.substring(0, 18))}</span>`,
    job.deadline && `<span class="meta-tag">⏰ ${esc(job.deadline)}</span>`,
    job.type === 'internship' && `<span class="meta-tag">Internship</span>`,
  ].filter(Boolean).slice(0, 2).join('')

  return `
    <div class="card ${job._isDuplicate ? 'duplicate' : ''}" data-id="${job.id}" draggable="true">
      <div class="card-platform">
        <span class="platform-badge platform-${job.platform}">${PLATFORM_LABELS[job.platform] || job.platform}</span>
        ${job._isDuplicate ? `<span class="dup-badge">⚠ Duplicate</span>` : ''}
      </div>
      <div class="card-title">${esc(job.title)}</div>
      <div class="card-company">${esc(job.company)}</div>
      ${metaTags ? `<div class="card-meta">${metaTags}</div>` : ''}
      <div class="card-footer">
        <span class="card-date">${dateStr}</span>
        <div class="card-actions">
          ${job.url ? `<button class="icon-btn open-link" data-url="${esc(job.url)}" title="Open listing">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
              <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </button>` : ''}
          <button class="icon-btn delete" data-id="${job.id}" title="Delete">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>`
}

// ── Drag and Drop ─────────────────────────────────────────────────────────────

function initDragAndDrop() {
  const cards = document.querySelectorAll('.card[draggable="true"]')
  const dropZones = document.querySelectorAll('.col-cards')

  cards.forEach(card => {
    card.addEventListener('dragstart', e => {
      draggedId = card.dataset.id
      card.classList.add('dragging')
      e.dataTransfer.effectAllowed = 'move'
      // Slight delay so the ghost image renders before adding opacity
      setTimeout(() => card.classList.add('drag-ghost'), 0)
    })

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging', 'drag-ghost')
      draggedId = null
      document.querySelectorAll('.col-cards').forEach(z => z.classList.remove('drag-over'))
    })
  })

  dropZones.forEach(zone => {
    zone.addEventListener('dragover', e => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      document.querySelectorAll('.col-cards').forEach(z => z.classList.remove('drag-over'))
      zone.classList.add('drag-over')
    })

    zone.addEventListener('dragleave', e => {
      // Only remove if leaving the zone entirely (not entering a child)
      if (!zone.contains(e.relatedTarget)) {
        zone.classList.remove('drag-over')
      }
    })

    zone.addEventListener('drop', async e => {
      e.preventDefault()
      zone.classList.remove('drag-over')
      if (!draggedId) return

      const newStatus = zone.dataset.status
      const job = allJobs.find(j => j.id === draggedId)
      if (!job || job.status === newStatus) return

      job.status = newStatus
      job.updatedAt = new Date().toISOString()
      await chrome.storage.local.set({ jobs: allJobs })
      detectDuplicates()
      applyFilters()
      updateSidebar()
      toast(`Moved to ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}`)
    })
  })
}

// ── Drawer ────────────────────────────────────────────────────────────────────

function openDrawer(id) {
  const job = allJobs.find(j => j.id === id)
  if (!job) return
  openJobId = id

  document.getElementById('d-title').textContent   = job.title
  document.getElementById('d-company').textContent = job.company

  document.getElementById('drawer-body').innerHTML = `
    <div>
      <div class="drawer-section-label">Status</div>
      <select class="status-select" id="d-status">
        <option value="saved"     ${job.status==='saved'     ?'selected':''}>Saved</option>
        <option value="applied"   ${job.status==='applied'   ?'selected':''}>Applied</option>
        <option value="interview" ${job.status==='interview' ?'selected':''}>Interview</option>
        <option value="offer"     ${job.status==='offer'     ?'selected':''}>Offer 🎉</option>
        <option value="rejected"  ${job.status==='rejected'  ?'selected':''}>Rejected</option>
      </select>
    </div>
    <div>
      <div class="drawer-section-label">Notes</div>
      <textarea class="notes-area" id="d-notes" placeholder="Add notes, interview feedback, follow-up date…">${esc(job.notes||'')}</textarea>
    </div>
    <div>
      <div class="drawer-section-label">Details</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${job.location   ? `<div class="detail-row"><span class="detail-label">Location</span><span class="detail-value">${esc(job.location)}</span></div>` : ''}
        ${job.salary     ? `<div class="detail-row"><span class="detail-label">Salary</span><span class="detail-value">${esc(job.salary)}</span></div>` : ''}
        ${job.experience ? `<div class="detail-row"><span class="detail-label">Experience</span><span class="detail-value">${esc(job.experience)}</span></div>` : ''}
        ${job.duration   ? `<div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${esc(job.duration)}</span></div>` : ''}
        ${job.deadline   ? `<div class="detail-row"><span class="detail-label">Deadline</span><span class="detail-value">${esc(job.deadline)}</span></div>` : ''}
        <div class="detail-row"><span class="detail-label">Platform</span><span class="detail-value">${PLATFORM_LABELS[job.platform]||job.platform}</span></div>
        <div class="detail-row"><span class="detail-label">Saved on</span><span class="detail-value">${new Date(job.savedAt).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</span></div>
        ${job.url ? `<div class="detail-row"><span class="detail-label">Link</span><a class="detail-link" href="${esc(job.url)}" target="_blank" rel="noopener">Open listing ↗</a></div>` : ''}
      </div>
    </div>`

  document.getElementById('drawer-overlay').classList.add('open')
  document.getElementById('drawer').classList.add('open')
}

function closeDrawer() {
  document.getElementById('drawer-overlay').classList.remove('open')
  document.getElementById('drawer').classList.remove('open')
  openJobId = null
}

async function saveDrawer() {
  if (!openJobId) return
  const status = document.getElementById('d-status').value
  const notes  = document.getElementById('d-notes').value
  const idx = allJobs.findIndex(j => j.id === openJobId)
  if (idx === -1) return
  allJobs[idx] = { ...allJobs[idx], status, notes, updatedAt: new Date().toISOString() }
  await chrome.storage.local.set({ jobs: allJobs })
  detectDuplicates()
  applyFilters()
  updateSidebar()
  closeDrawer()
  toast('Changes saved')
}

// ── Delete ────────────────────────────────────────────────────────────────────

async function deleteJob(id) {
  allJobs = allJobs.filter(j => j.id !== id)
  await chrome.storage.local.set({ jobs: allJobs })
  detectDuplicates()
  applyFilters()
  updateSidebar()
  if (openJobId === id) closeDrawer()
  toast('Application deleted')
}

// ── Export CSV ────────────────────────────────────────────────────────────────

function exportCSV() {
  const rows = [['Title','Company','Platform','Status','Location','Salary','URL','Saved Date','Notes']]
  allJobs.forEach(j => rows.push([
    j.title, j.company, j.platform, j.status,
    j.location||'', j.salary||'', j.url||'',
    new Date(j.savedAt).toLocaleDateString('en-IN'),
    (j.notes||'').replace(/\n/g,' ')
  ]))
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `applyradar-${new Date().toISOString().slice(0,10)}.csv`
  a.click()
  toast('CSV downloaded')
}

// ── Toast ─────────────────────────────────────────────────────────────────────

let toastTimer
function toast(msg) {
  const el = document.getElementById('toast')
  el.textContent = msg
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500)
}

function esc(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ── Event bindings ────────────────────────────────────────────────────────────

document.querySelectorAll('[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    activeStatus = btn.dataset.filter
    document.getElementById('view-title').textContent =
      activeStatus === 'all' ? 'All Applications' : btn.querySelector('.filter-left').textContent.trim()
    applyFilters()
  })
})

document.querySelectorAll('[data-platform]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-platform]').forEach(b => b.classList.remove('active'))
    btn.classList.add('active')
    activePlatform = btn.dataset.platform
    applyFilters()
  })
})

document.getElementById('search').addEventListener('input', e => {
  activeSearch = e.target.value.trim()
  applyFilters()
})

document.getElementById('drawer-close').addEventListener('click', closeDrawer)
document.getElementById('drawer-overlay').addEventListener('click', closeDrawer)
document.getElementById('d-save-btn').addEventListener('click', saveDrawer)
document.getElementById('d-delete-btn').addEventListener('click', () => { if (openJobId) deleteJob(openJobId) })
document.getElementById('export-btn').addEventListener('click', exportCSV)
document.getElementById('theme-toggle').addEventListener('click', toggleTheme)

chrome.storage.onChanged.addListener(changes => {
  if (changes.jobs) {
    allJobs = changes.jobs.newValue || []
    detectDuplicates()
    applyFilters()
    updateSidebar()
  }
})

initTheme()
loadJobs()
