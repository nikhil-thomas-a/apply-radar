// content/naukri.js — Naukri job detail page
;(function () {
  if (!location.hostname.includes('naukri.com')) return

  let lastUrl = location.href
  let injectTimeout = null
  let retryCount = 0
  const MAX_RETRIES = 8

  function isJobPage() {
    return (
      /\/job-listings-/.test(location.pathname) ||
      /\d{6,}/.test(location.pathname) // Naukri job IDs are 6+ digits in URL
    )
  }

  function extractJob() {
    const clean = (s) => (s || '').replace(/\s+/g, ' ').trim()

    // ── Title ──────────────────────────────────────────────────────────────
    const title = clean(
      document.querySelector('.jd-header-title')?.innerText ||
      document.querySelector('[class="jd-header-title"]')?.innerText ||
      document.querySelector('h1.title')?.innerText ||
      document.querySelector('[class*="jobTitle"] h1')?.innerText ||
      document.querySelector('h1')?.innerText || ''
    )

    // ── Company ────────────────────────────────────────────────────────────
    const company = clean(
      document.querySelector('.jd-header-comp-name a')?.innerText ||
      document.querySelector('[class="comp-name"]')?.innerText ||
      document.querySelector('[class*="comp-name"] a')?.innerText ||
      document.querySelector('[class*="companyName"] a')?.innerText ||
      document.querySelector('a[href*="/company-details/"]')?.innerText || ''
    )

    // ── Location ───────────────────────────────────────────────────────────
    const location_ = clean(
      document.querySelector('[class="location"] a')?.innerText ||
      document.querySelector('[class*="jobLocation"]')?.innerText ||
      document.querySelector('[class="loc"] span')?.innerText ||
      document.querySelector('[class*="location"] a')?.innerText || ''
    )

    // ── Salary — be specific, avoid catching experience text ───────────────
    // Naukri salary is in elements with class "salary" or containing "salary"
    // but we must NOT pick up the experience element
    let salary = ''
    // Try the most specific selectors first
    const salaryEl =
      document.querySelector('[class="salary-container"] span') ||
      document.querySelector('[class="salary"] span') ||
      document.querySelector('[class*="salary-wrap"] span') ||
      document.querySelector('[class="other-info-item salary"] span')

    if (salaryEl) {
      salary = clean(salaryEl.innerText)
    } else {
      // Broader fallback — exclude elements that also contain experience keywords
      const candidates = document.querySelectorAll('[class*="salary"]')
      for (const el of candidates) {
        const text = clean(el.innerText)
        // Skip if it has "years" in it — that's the experience field
        if (text && !text.toLowerCase().includes('year') && !text.toLowerCase().includes('yr')) {
          salary = text
          break
        }
      }
    }

    // ── Experience — separate from salary ─────────────────────────────────
    const experience = clean(
      document.querySelector('[class="exp-wrap"] span')?.innerText ||
      document.querySelector('[class="exp"] span')?.innerText ||
      document.querySelector('[class*="exp-container"] span')?.innerText || ''
    )

    return { title, company, location: location_, salary, experience, platform: 'naukri', url: location.href }
  }

  function findAnchor() {
    return (
      document.querySelector('.apply-button-container') ||
      document.querySelector('[class*="applyBtn"]') ||
      document.querySelector('.jd-header-title') ||
      document.querySelector('h1.title') ||
      document.querySelector('h1') ||
      null
    )
  }

  function tryInject() {
    if (!isJobPage()) return
    if (document.querySelector('.applyradar-btn')) return

    const job = extractJob()
    if (!job.title || !job.company) {
      if (retryCount < MAX_RETRIES) {
        retryCount++
        injectTimeout = setTimeout(tryInject, 500 * retryCount)
      }
      return
    }

    const anchor = findAnchor()
    if (!anchor) {
      if (retryCount < MAX_RETRIES) {
        retryCount++
        injectTimeout = setTimeout(tryInject, 500 * retryCount)
      }
      return
    }

    retryCount = 0
    if (window.ApplyRadar) window.ApplyRadar.createSaveButton(job, anchor, 'afterend')
  }

  function scheduleInject() {
    clearTimeout(injectTimeout)
    retryCount = 0
    injectTimeout = setTimeout(tryInject, 800)
  }

  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) { lastUrl = location.href; scheduleInject() }
    else if (!document.querySelector('.applyradar-btn') && isJobPage()) scheduleInject()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  scheduleInject()
})()
