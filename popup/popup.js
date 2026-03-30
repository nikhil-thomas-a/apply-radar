// popup.js v1.1

const PLAT_COLOR = { naukri:'#e85d25', linkedin:'#0077b5', internshala:'#0096cc' }
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

  // Recent jobs (top 4)
  const recentSection = document.getElementById('recent-section')
  const recent = jobs.slice(0, 4)
  if (recent.length > 0) {
    recentSection.innerHTML = `
      <div class="recent-header">Recent</div>
      <div class="recent-list">
        ${recent.map(j => `
          <div class="recent-item" data-url="${esc(j.url||'')}">
            <span class="recent-plat" style="background:${PLAT_COLOR[j.platform]||'#999'}"></span>
            <div class="recent-info">
              <div class="recent-title">${esc(j.title)}</div>
              <div class="recent-company">${esc(j.company)}</div>
            </div>
            <span class="status-pill s-${j.status}">${STATUS_LABELS[j.status]||j.status}</span>
          </div>`).join('')}
      </div>`
    // Click recent item → open dashboard
    recentSection.querySelectorAll('.recent-item').forEach(item => {
      item.addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') })
        window.close()
      })
    })
  } else {
    recentSection.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🎯</div>
        No applications yet.<br>Browse a job listing and save it.
      </div>`
  }

  // Detect current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const tabUrl = tab?.url || ''
  const isLinkedIn    = /linkedin\.com\/jobs\/view\/\d+/.test(tabUrl)
  const isNaukri      = /naukri\.com/.test(tabUrl) && /\/job-listings-|\d{6,}/.test(tabUrl)
  const isInternshala = /internshala\.com\/(internship|jobs)\/detail/.test(tabUrl)
  const isSupportedPage = isLinkedIn || isNaukri || isInternshala
  const platform = isLinkedIn ? 'linkedin' : isNaukri ? 'naukri' : 'internshala'
  const qs = document.getElementById('quick-save-section')

  if (!isSupportedPage) {
    qs.style.display = 'none'
  } else {
    const cleanUrl = tabUrl.split('?')[0]
    const alreadySaved = jobs.find(j => j.url && j.url.split('?')[0] === cleanUrl)

    if (alreadySaved) {
      qs.innerHTML = `
        <div class="qs-label">Current page</div>
        <div class="qs-saved">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Already tracked as <strong>${STATUS_LABELS[alreadySaved.status]}</strong>
        </div>`
    } else {
      qs.innerHTML = `
        <div class="qs-label">Job page detected</div>
        <button class="btn-save" id="popup-save-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
          Save this job to ApplyRadar
        </button>
        <div class="qs-tip">Use this if the page button isn't visible</div>`

      document.getElementById('popup-save-btn').addEventListener('click', async () => {
        const btn = document.getElementById('popup-save-btn')
        btn.textContent = 'Reading page…'
        btn.disabled = true
        try {
          const results = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractJobData, args: [platform, tabUrl] })
          const job = results?.[0]?.result
          if (!job || !job.title) {
            btn.textContent = '⚠ Could not read — try scrolling down first'
            btn.disabled = false
            return
          }
          const response = await chrome.runtime.sendMessage({ type: 'SAVE_JOB', job })
          if (response?.ok) {
            qs.innerHTML = `
              <div class="qs-label">Current page</div>
              <div class="qs-saved">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <strong>${esc(job.title)}</strong> saved!
              </div>`
          } else if (response?.duplicate) {
            qs.innerHTML = `
              <div class="qs-label">Current page</div>
              <div class="qs-saved">⚠ Already tracked from ${esc(response.existingPlatform||'')}</div>`
          } else {
            btn.textContent = '⚠ Save failed — try again'; btn.disabled = false
          }
        } catch(e) {
          btn.textContent = `⚠ ${e.message?.substring(0,40)||'Error'}`; btn.disabled = false
        }
      })
    }
  }

  // Dashboard button
  document.getElementById('open-dashboard').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') })
    window.close()
  })
})

// Runs in the tab via scripting.executeScript — must be self-contained
function extractJobData(platform, originalUrl) {
  function cl(s){ return (s||'').replace(/\s+/g,' ').trim() }
  const pageUrl = window.location.href.split('?')[0]
  try {
    if (platform === 'linkedin') {
      let title = ''
      const svg = document.querySelector('#verified-medium')
      if (svg) {
        const p = svg.closest('p') || svg.closest('h1')
        if (p) title = cl(Array.from(p.childNodes).filter(n=>n.nodeType===3||(n.nodeType===1&&n.tagName==='SPAN'&&!n.querySelector('svg'))).map(n=>n.textContent).join(' '))
      }
      if (!title) title = cl(document.querySelector('h1')?.textContent||'').replace(/\s*\(verified job\)/i,'').trim()
      const main = document.querySelector('main')||document.body
      let company='', companyEl=null
      for(const a of Array.from(main.querySelectorAll('a[href]'))){
        const href=a.getAttribute('href')||'',txt=cl(a.textContent)
        if(href.includes('/company/')&&txt.length>0&&txt.length<80){company=txt;companyEl=a;break}
      }
      let jobLocation=''
      if(companyEl){let anc=companyEl.parentElement;for(let d=0;d<6&&anc&&!jobLocation;d++){for(const el of Array.from(anc.querySelectorAll('span,div'))){if(el.children.length>3)continue;const txt=cl(el.textContent);if(txt.length>3&&txt.length<80&&!txt.match(/applicant|Easy Apply|Save|Promoted|hirer|Premium|actively|Repost|weeks|days|month/i)&&(txt.includes(',')||/remote|hybrid|on.?site|bengaluru|mumbai|delhi|india|bangalore|karnataka/i.test(txt))){jobLocation=txt.split('·')[0].split('\n')[0].trim();break}}anc=anc.parentElement}}
      return {title,company,location:jobLocation,platform:'linkedin',url:pageUrl}
    }
    if (platform === 'naukri') {
      const title=cl(document.querySelector('.jd-header-title,h1')?.textContent||'')
      const company=cl(document.querySelector('.jd-header-comp-name a,[class="comp-name"],a[href*="/company-details/"]')?.textContent||'')
      const loc=cl(document.querySelector('[class="location"] a,[class*="loc"] a,[class*="jobLocation"]')?.textContent||'')
      const salEl=document.querySelector('[class="salary"] span,[class*="salary-wrap"] span')
      const salary=salEl?cl(salEl.textContent):''
      return {title,company,location:loc,salary,platform:'naukri',url:pageUrl}
    }
    if (platform === 'internshala') {
      const title=cl(document.querySelector('.profile h1,h1')?.textContent||'')
      const company=cl(document.querySelector('.company-name a,#company_name')?.textContent||'')
      const loc=cl(document.querySelector('.location_link,.location')?.textContent||'')
      const salary=cl(document.querySelector('.stipend_salary,#stipend span')?.textContent||'')
      const deadline=cl(document.querySelector('#last_date span,.apply_by')?.textContent||'')
      const isJob=/\/jobs\/details\//.test(window.location.pathname)
      return {title,company,location:loc,salary,deadline,type:isJob?'job':'internship',platform:'internshala',url:pageUrl}
    }
  } catch(e){ return {_error:e.message,title:'',company:'',platform,url:pageUrl} }
  return null
}

function esc(s){ return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }
