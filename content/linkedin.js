// content/linkedin.js — structural extraction, no class names
;(function () {
  if (!location.hostname.includes('linkedin.com')) return

  let lastUrl = location.href
  let injectTimeout = null
  let retryCount = 0
  const MAX_RETRIES = 20

  function isJobViewPage() {
    return /\/jobs\/view\/\d+/.test(location.pathname)
  }

  function extractJob() {
    const cl = (s) => (s || '').replace(/\s+/g, ' ').trim()

    // Title — h1 is always the job title on /jobs/view/ pages
    const title = cl(document.querySelector('h1')?.textContent || '')

    // Company — scoped to main content area to avoid nav links
    let company = ''
    const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body
    const links = Array.from(main.querySelectorAll('a[href]'))
    const companyLink = links.find(a => {
      const href = a.getAttribute('href') || ''
      const txt = a.textContent.trim()
      return (href.includes('/company/')) && txt.length > 0 && txt.length < 80
    })
    company = cl(companyLink?.textContent || '')

    // Location — find first text near the h1 that looks like a city
    let jobLocation = ''
    const h1 = document.querySelector('h1')
    if (h1) {
      const container = h1.closest('section') || h1.closest('div') || h1.parentElement
      const spans = Array.from(container?.querySelectorAll('span, div') || [])
      for (const el of spans) {
        if (el.querySelector('h1')) continue // skip container of h1 itself
        const txt = cl(el.textContent)
        if (
          txt.length > 3 && txt.length < 100 &&
          !txt.includes('applicant') && !txt.includes('Easy Apply') &&
          !txt.includes('Save') && !txt.includes('Promoted') &&
          !txt.includes('hirer') && !txt.includes('Premium') &&
          (txt.includes(',') || /remote|hybrid|on.?site|bengaluru|mumbai|delhi|india|karnataka|hyderabad|pune/i.test(txt))
        ) {
          jobLocation = txt.split('·')[0].split('\n')[0].trim()
          break
        }
      }
    }

    return { title, company, location: jobLocation, platform: 'linkedin', url: location.href.split('?')[0] }
  }

  function findAnchor() {
    // Find Apply button by text — stable across class name changes
    const applyBtn = Array.from(document.querySelectorAll('button')).find(b => {
      const txt = (b.textContent || '').toLowerCase().trim()
      return (txt.includes('easy apply') || txt === 'apply') && txt.length < 20
    })
    if (applyBtn) return applyBtn
    // Fallback to h1
    return document.querySelector('h1') || null
  }

  function tryInject() {
    if (!isJobViewPage()) return
    if (document.querySelector('.applyradar-btn')) return

    const job = extractJob()

    if (!job.title || !job.company) {
      if (retryCount < MAX_RETRIES) {
        retryCount++
        clearTimeout(injectTimeout)
        injectTimeout = setTimeout(tryInject, Math.min(300 * retryCount, 3000))
      }
      return
    }

    const anchor = findAnchor()
    if (!anchor) {
      if (retryCount < MAX_RETRIES) {
        retryCount++
        clearTimeout(injectTimeout)
        injectTimeout = setTimeout(tryInject, Math.min(300 * retryCount, 3000))
      }
      return
    }

    retryCount = 0
    const isBtn = anchor.tagName === 'BUTTON'
    if (window.ApplyRadar) {
      window.ApplyRadar.createSaveButton(job, anchor, isBtn ? 'beforebegin' : 'afterend')
    }
  }

  function scheduleInject(delay = 1500) {
    clearTimeout(injectTimeout)
    retryCount = 0
    injectTimeout = setTimeout(tryInject, delay)
  }

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href
      document.querySelector('.applyradar-btn')?.remove()
      if (isJobViewPage()) scheduleInject(1500)
    } else if (isJobViewPage() && !document.querySelector('.applyradar-btn')) {
      scheduleInject(800)
    }
  })

  observer.observe(document.body, { childList: true, subtree: true })
  if (isJobViewPage()) scheduleInject(1500)
})()
