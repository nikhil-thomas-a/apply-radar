// content/linkedin.js
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

    // ── Title ─────────────────────────────────────────────────────────────
    // LinkedIn puts the title in a <p> that contains the #verified-medium SVG.
    // Get text nodes only — skip the SVG/anchor children.
    let title = ''

    // Method 1: find the <p> containing the verified badge SVG
    const verifiedSvg = document.querySelector('#verified-medium')
    if (verifiedSvg) {
      const titleEl = verifiedSvg.closest('p') || verifiedSvg.closest('h1') || verifiedSvg.closest('h2')
      if (titleEl) {
        // Extract only direct text nodes — ignore child elements (SVG, anchors, spans)
        title = cl(
          Array.from(titleEl.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE || (n.nodeType === Node.ELEMENT_NODE && n.tagName === 'SPAN' && !n.querySelector('svg')))
            .map(n => n.textContent)
            .join(' ')
        )
      }
    }

    // Method 2: fallback — look for a <p> or heading whose direct text looks like a job title
    if (!title) {
      const candidates = document.querySelectorAll('p, h1, h2')
      for (const el of candidates) {
        const directText = cl(
          Array.from(el.childNodes)
            .filter(n => n.nodeType === Node.TEXT_NODE)
            .map(n => n.textContent)
            .join(' ')
        )
        if (
          directText.length >= 5 && directText.length <= 120 &&
          /[a-zA-Z]{3,}/.test(directText) &&
          !directText.match(/applicant|promoted|hirer|easy apply|premium|actively|ago/i)
        ) {
          title = directText
          break
        }
      }
    }

    // ── Company ───────────────────────────────────────────────────────────
    // Company link to /company/SLUG — scoped to main to avoid nav
    const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body
    let company = ''
    let companyEl = null
    for (const a of Array.from(main.querySelectorAll('a[href]'))) {
      const href = a.getAttribute('href') || ''
      const txt = cl(a.textContent)
      if (href.includes('/company/') && txt.length > 0 && txt.length < 80) {
        company = txt
        companyEl = a
        break
      }
    }

    // ── Location ──────────────────────────────────────────────────────────
    let jobLocation = ''
    // Location text appears near company element — "Bengaluru, Karnataka, India · X weeks ago"
    if (companyEl) {
      let ancestor = companyEl.parentElement
      for (let depth = 0; depth < 6 && ancestor && !jobLocation; depth++) {
        for (const el of Array.from(ancestor.querySelectorAll('span, div'))) {
          if (el.children.length > 3) continue
          const txt = cl(el.textContent)
          if (
            txt.length > 3 && txt.length < 80 &&
            !txt.match(/applicant|Easy Apply|Save|Promoted|hirer|Premium|actively|Repost|weeks|days|month/i) &&
            (txt.includes(',') || /remote|hybrid|on.?site|bengaluru|mumbai|delhi|india|bangalore|karnataka|hyderabad|pune/i.test(txt))
          ) {
            jobLocation = txt.split('·')[0].split('\n')[0].trim()
            break
          }
        }
        ancestor = ancestor.parentElement
      }
    }

    return {
      title,
      company,
      location: jobLocation,
      platform: 'linkedin',
      url: location.href.split('?')[0]
    }
  }

  function findAnchor() {
    // Prefer to inject before the Easy Apply / Apply button
    const applyBtn = Array.from(document.querySelectorAll('button')).find(b => {
      const txt = (b.textContent || '').toLowerCase().trim()
      return (txt.includes('easy apply') || txt === 'apply') && txt.length < 20
    })
    if (applyBtn) return applyBtn

    // Fallback: inject after the verified SVG's parent <p>
    const verifiedSvg = document.querySelector('#verified-medium')
    if (verifiedSvg) return verifiedSvg.closest('p') || verifiedSvg.closest('h1')

    const main = document.querySelector('main') || document.body
    const companyLink = Array.from(main.querySelectorAll('a[href]'))
      .find(a => a.getAttribute('href')?.includes('/company/') && a.textContent.trim().length > 0)
    return companyLink || document.querySelector('h1') || null
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
