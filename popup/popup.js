// popup/popup.js

const STATUS_LABELS = { saved:'Saved', applied:'Applied', interview:'Interview', offer:'Offer', rejected:'Rejected' }

document.addEventListener('DOMContentLoaded', async () => {
  const data = await chrome.storage.local.get('jobs')
  const jobs = data.jobs || []

  // Stats
  document.getElementById('total-count').textContent     = jobs.length
  document.getElementById('applied-count').textContent   = jobs.filter(j => j.status === 'applied').length
  document.getElementById('interview-count').textContent = jobs.filter(j => j.status === 'interview' || j.status === 'offer').length
  document.getElementById('naukri-count').textContent      = jobs.filter(j => j.platform === 'naukri').length
  document.getElementById('linkedin-count').textContent    = jobs.filter(j => j.platform === 'linkedin').length
  document.getElementById('internshala-count').textContent = jobs.filter(j => j.platform === 'internshala').length

  // Recent
  const recentSection = document.getElementById('recent-section')
  const recent = jobs.slice(0, 3)
  if (recent.length > 0) {
    recentSection.innerHTML = `
      <div class="section-label" style="padding-top:12px">Recent</div>
      <div class="recent">
        ${recent.map(j => `
          <div class="recent-item">
            <div class="recent-info">
              <div class="recent-title">${esc(j.title)}</div>
              <div class="recent-company">${esc(j.company)}</div>
            </div>
            <span class="status-pill status-${j.status}">${STATUS_LABELS[j.status] || j.status}</span>
          </div>`).join('')}
      </div>`
  } else {
    recentSection.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🎯</div>
        Browse a job listing and click<br><strong>Save to ApplyRadar</strong> on the page.
      </div>`
  }

  // ── Detect current tab ────────────────────────────────────────────────────
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const tabUrl = tab?.url || ''

  const isLinkedIn    = /linkedin\.com\/jobs\/view\/\d+/.test(tabUrl)
  const isNaukri      = /naukri\.com/.test(tabUrl) && /\/job-listings-|\d{6,}/.test(tabUrl)
  const isInternshala = /internshala\.com\/(internship|jobs)\/detail/.test(tabUrl)
  const isSupportedPage = isLinkedIn || isNaukri || isInternshala

  const qs = document.getElementById('quick-save-section')
  if (!qs) return

  if (!isSupportedPage) {
    qs.innerHTML = ''
    document.getElementById('open-dashboard').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') })
      window.close()
    })
    return
  }

  const platform = isLinkedIn ? 'linkedin' : isNaukri ? 'naukri' : 'internshala'
  const cleanTabUrl = tabUrl.split('?')[0]
  const alreadySaved = jobs.find(j => j.url && j.url.split('?')[0] === cleanTabUrl)

  if (alreadySaved) {
    qs.innerHTML = `
      <div class="quick-save-box saved">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span>Already tracked as <strong>${STATUS_LABELS[alreadySaved.status]}</strong></span>
      </div>`
  } else {
    qs.innerHTML = `
      <div class="quick-save-box">
        <div class="quick-save-label">Current page detected</div>
        <button class="btn-save-from-popup" id="popup-save-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save this job to ApplyRadar
        </button>
        <div class="quick-save-tip">Works even if the page button isn't visible</div>
      </div>`

    document.getElementById('popup-save-btn').addEventListener('click', async () => {
      const btn = document.getElementById('popup-save-btn')
      btn.innerHTML = `<span>Reading page…</span>`
      btn.disabled = true

      try {
        // Inject extraction function into the live tab
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: extractJobData,
          args: [platform, tabUrl]
        })

        const job = results?.[0]?.result

        if (!job) {
          btn.innerHTML = `⚠ Could not read page`
          btn.disabled = false
          // Show debug info
          qs.querySelector('.quick-save-tip').textContent = 'Try: scroll down on the job page, then click again'
          return
        }

        if (!job.title || !job.company) {
          btn.innerHTML = `⚠ Title or company not found`
          btn.disabled = false
          qs.querySelector('.quick-save-tip').textContent = `Got: title="${job.title}" company="${job.company}"`
          return
        }

        const response = await chrome.runtime.sendMessage({ type: 'SAVE_JOB', job })

        if (response?.ok) {
          qs.innerHTML = `
            <div class="quick-save-box saved">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span><strong>${esc(job.title)}</strong> saved!</span>
            </div>`
        } else if (response?.duplicate) {
          qs.innerHTML = `
            <div class="quick-save-box saved">
              <span>⚠ Already tracked (${esc(response.existingPlatform || '')})</span>
            </div>`
        } else {
          btn.innerHTML = `⚠ Save failed — try again`
          btn.disabled = false
        }
      } catch(err) {
        btn.innerHTML = `⚠ Error: ${err.message?.substring(0, 40) || 'unknown'}`
        btn.disabled = false
      }
    })
  }

  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') })
    window.close()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// This runs INSIDE the job tab via scripting.executeScript.
// MUST be completely self-contained — no references to popup scope.
// Returns a job object or null.
// ─────────────────────────────────────────────────────────────────────────────

function extractJobData(platform, originalUrl) {
  function cl(s) { return (s || '').replace(/\s+/g, ' ').trim() }

  const pageUrl = window.location.href.split('?')[0]

  try {
    // ── LinkedIn ──────────────────────────────────────────────────────────
    if (platform === 'linkedin') {
      function cl2(s) { return (s||'').replace(/\s+/g,' ').trim() }

      // Title: LinkedIn puts title in a <p> containing the #verified-medium SVG
      let title = ''
      const verifiedSvg = document.querySelector('#verified-medium')
      if (verifiedSvg) {
        const titleEl = verifiedSvg.closest('p') || verifiedSvg.closest('h1') || verifiedSvg.closest('h2')
        if (titleEl) {
          title = cl2(
            Array.from(titleEl.childNodes)
              .filter(n => n.nodeType === 3 || (n.nodeType === 1 && n.tagName === 'SPAN' && !n.querySelector('svg')))
              .map(n => n.textContent).join(' ')
          )
        }
      }
      // Fallback
      if (!title) title = cl2(document.querySelector('h1')?.textContent || '').replace(/\s*\(verified job\)/i,'').trim()

      // Company: first /company/ link in main content
      const mainEl = document.querySelector('main') || document.querySelector('[role="main"]') || document.body
      let company = ''
      let companyEl = null
      for (const a of Array.from(mainEl.querySelectorAll('a[href]'))) {
        const href = a.getAttribute('href') || ''
        const txt = cl2(a.textContent)
        if (href.includes('/company/') && txt.length > 0 && txt.length < 80) {
          company = txt; companyEl = a; break
        }
      }

      // Location
      let jobLocation = ''
      if (companyEl) {
        let ancestor = companyEl.parentElement
        for (let d = 0; d < 6 && ancestor && !jobLocation; d++) {
          for (const el of Array.from(ancestor.querySelectorAll('span,div'))) {
            if (el.children.length > 3) continue
            const txt = cl2(el.textContent)
            if (txt.length > 3 && txt.length < 80 &&
                !txt.match(/applicant|Easy Apply|Save|Promoted|hirer|Premium|actively|Repost|weeks|days|month/i) &&
                (txt.includes(',') || /remote|hybrid|on.?site|bengaluru|mumbai|delhi|india|bangalore|karnataka/i.test(txt))) {
              jobLocation = txt.split('·')[0].split('\n')[0].trim(); break
            }
          }
          ancestor = ancestor.parentElement
        }
      }

      return { title, company, location: jobLocation, platform: 'linkedin', url: pageUrl }
    }


    // ── Naukri ────────────────────────────────────────────────────────────
    if (platform === 'naukri') {
      const title = cl(
        document.querySelector('.jd-header-title')?.textContent ||
        document.querySelector('h1')?.textContent || ''
      )
      const company = cl(
        document.querySelector('.jd-header-comp-name a')?.textContent ||
        document.querySelector('[class="comp-name"]')?.textContent ||
        document.querySelector('a[href*="/company-details/"]')?.textContent || ''
      )
      const locationEl = document.querySelector('[class="location"] a, [class*="loc"] a, [class*="jobLocation"]')
      const jobLocation = cl(locationEl?.textContent || '')

      let salary = ''
      const salEl = document.querySelector('[class="salary"] span, [class*="salary-wrap"] span, [class="other-info-item salary"] span')
      if (salEl) {
        salary = cl(salEl.textContent)
      }

      return { title, company, location: jobLocation, salary, platform: 'naukri', url: pageUrl }
    }

    // ── Internshala ───────────────────────────────────────────────────────
    if (platform === 'internshala') {
      const title = cl(
        document.querySelector('.profile h1')?.textContent ||
        document.querySelector('h1')?.textContent || ''
      )
      const company = cl(
        document.querySelector('.company-name a')?.textContent ||
        document.querySelector('#company_name')?.textContent || ''
      )
      const jobLocation = cl(
        document.querySelector('.location_link')?.textContent ||
        document.querySelector('.location')?.textContent || ''
      )
      const salary = cl(
        document.querySelector('.stipend_salary')?.textContent ||
        document.querySelector('#stipend span')?.textContent || ''
      )
      const deadline = cl(
        document.querySelector('#last_date span')?.textContent ||
        document.querySelector('.apply_by')?.textContent || ''
      )
      const isJob = /\/jobs\/details\//.test(window.location.pathname)

      return { title, company, location: jobLocation, salary, deadline, type: isJob ? 'job' : 'internship', platform: 'internshala', url: pageUrl }
    }

  } catch(e) {
    // Return error info so we can debug
    return { _error: e.message, title: '', company: '', platform, url: pageUrl }
  }

  return null
}

function esc(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
