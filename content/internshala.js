// content/internshala.js — only runs on internshala.com
;(function () {
  if (!location.hostname.includes('internshala.com')) return

  let lastUrl = location.href
  let injectTimeout = null

  function isJobOrInternshipPage() {
    return (
      /\/internship\/detail\//.test(location.pathname) ||
      /\/jobs\/details\//.test(location.pathname) ||
      document.querySelector('.internship_details, .job_details, #internship_detail_call') !== null
    )
  }

  function extractJob() {
    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim()
    const isJob = /\/jobs\/details\//.test(location.pathname)
    const title = clean(
      document.querySelector('.profile h1')?.innerText ||
      document.querySelector('.heading_4_5')?.innerText ||
      document.querySelector('h1')?.innerText || ''
    )
    const company = clean(
      document.querySelector('.company-name a')?.innerText ||
      document.querySelector('.company_name a')?.innerText ||
      document.querySelector('#company_name')?.innerText ||
      document.querySelector('.heading_6')?.innerText || ''
    )
    const location_ = clean(
      document.querySelector('.location_link')?.innerText ||
      document.querySelector('[class*="location"] span')?.innerText ||
      document.querySelector('.location')?.innerText || 'Remote / Not specified'
    )
    const stipend = clean(
      document.querySelector('.stipend_salary')?.innerText ||
      document.querySelector('#stipend span')?.innerText ||
      document.querySelector('.salary')?.innerText || ''
    )
    const duration = clean(
      document.querySelector('#duration span')?.innerText ||
      document.querySelector('.duration')?.innerText || ''
    )
    const deadline = clean(
      document.querySelector('#last_date span')?.innerText ||
      document.querySelector('.apply_by')?.innerText || ''
    )
    return {
      title, company, location: location_, salary: stipend,
      duration, deadline, type: isJob ? 'job' : 'internship',
      platform: 'internshala', url: location.href.split('?')[0]
    }
  }

  function findAnchor() {
    return (
      document.querySelector('.apply_button_container') ||
      document.querySelector('#apply_now_btn') ||
      document.querySelector('.profile h1') ||
      document.querySelector('h1') ||
      null
    )
  }

  function tryInject() {
    if (!isJobOrInternshipPage()) return
    if (document.querySelector('.applyradar-btn')) return
    const job = extractJob()
    if (!job.title || !job.company) return
    const anchor = findAnchor()
    if (!anchor) return
    if (window.ApplyRadar) window.ApplyRadar.createSaveButton(job, anchor, 'afterend')
  }

  function scheduleInject() {
    clearTimeout(injectTimeout)
    injectTimeout = setTimeout(tryInject, 700)
  }

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) { lastUrl = location.href; scheduleInject() }
    else if (!document.querySelector('.applyradar-btn')) scheduleInject()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  scheduleInject()
})()
