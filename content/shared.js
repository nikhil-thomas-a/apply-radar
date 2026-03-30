// shared.js — injected before all platform scripts

window.ApplyRadar = {

  // Creates the save button, proactively checks if already saved
  async createSaveButton(job, anchorEl, position = 'afterend') {
    const existing = document.querySelector('.applyradar-btn')
    if (existing) existing.remove()

    // Check storage first — show correct state immediately
    const data = await chrome.storage.local.get('jobs')
    const jobs = data.jobs || []
    const cleanUrl = job.url.split('?')[0]
    const alreadySaved = jobs.find(j => j.url && j.url.split('?')[0] === cleanUrl)

    const btn = document.createElement('button')
    btn.className = 'applyradar-btn'

    const BASE_STYLE = `
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      font-family: -apple-system, 'Segoe UI', sans-serif;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
      z-index: 9999;
      position: relative;
      border: 1.5px solid;
    `

    const SAVE_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`
    const CHECK_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`

    if (alreadySaved) {
      // Already in tracker — show green saved state
      btn.innerHTML = `${CHECK_ICON}<span>Saved to ApplyRadar</span>`
      btn.style.cssText = BASE_STYLE + `
        background: #14532d18;
        color: #16a34a;
        border-color: #16a34a55;
      `
      btn.title = `Saved as "${alreadySaved.status}" — click to open dashboard`
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' })
      })
    } else {
      // Not yet saved — show save button
      btn.innerHTML = `${SAVE_ICON}<span>Save to ApplyRadar</span>`
      btn.style.cssText = BASE_STYLE + `
        background: #1a1a2e;
        color: #e8d5b7;
        border-color: #e8d5b733;
      `
      btn.addEventListener('mouseenter', () => {
        btn.style.background = '#e8d5b7'
        btn.style.color = '#1a1a2e'
        btn.style.borderColor = '#e8d5b7'
      })
      btn.addEventListener('mouseleave', () => {
        btn.style.background = '#1a1a2e'
        btn.style.color = '#e8d5b7'
        btn.style.borderColor = '#e8d5b733'
      })
      btn.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        window.ApplyRadar.saveJob(job, btn)
      })
    }

    anchorEl.insertAdjacentElement(position, btn)
    return btn
  },

  saveJob(job, btn) {
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round"
        style="animation:applyradar-spin 0.7s linear infinite">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
      <span>Saving…</span>`
    btn.style.cursor = 'default'

    if (!document.querySelector('#applyradar-keyframes')) {
      const s = document.createElement('style')
      s.id = 'applyradar-keyframes'
      s.textContent = `@keyframes applyradar-spin { to { transform: rotate(360deg); } }`
      document.head.appendChild(s)
    }

    chrome.runtime.sendMessage({ type: 'SAVE_JOB', job }, (response) => {
      if (!response) {
        btn.innerHTML = `<span style="color:#f87171">Error — try again</span>`
        btn.style.cursor = 'pointer'
        setTimeout(() => window.ApplyRadar._resetUnsaved(btn, job), 2500)
        return
      }
      if (response.duplicate || response.ok === false) {
        // Already tracked from another platform
        btn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <span style="color:#f59e0b">Already tracked (${response.existingPlatform || ''})</span>`
        btn.style.borderColor = '#f59e0b44'
        btn.style.cursor = 'default'
      } else if (response.ok) {
        btn.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span style="color:#16a34a">Saved!</span>`
        btn.style.background = '#14532d18'
        btn.style.borderColor = '#16a34a55'
        btn.style.cursor = 'default'
        // After 2s, convert to permanent "already saved" state
        setTimeout(() => {
          btn.innerHTML = `
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span style="color:#16a34a">Saved to ApplyRadar</span>`
          btn.title = 'Click to open dashboard'
          btn.style.cursor = 'pointer'
          btn.onclick = (e) => {
            e.preventDefault()
            e.stopPropagation()
            chrome.runtime.sendMessage({ type: 'OPEN_DASHBOARD' })
          }
        }, 2000)
      }
    })
  },

  _resetUnsaved(btn, job) {
    btn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/>
        <polyline points="7 3 7 8 15 8"/>
      </svg>
      <span>Save to ApplyRadar</span>`
    btn.style.background = '#1a1a2e'
    btn.style.color = '#e8d5b7'
    btn.style.borderColor = '#e8d5b733'
    btn.style.cursor = 'pointer'
  },

  clean: (s) => (s || '').replace(/\s+/g, ' ').trim(),
}
