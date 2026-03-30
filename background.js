// background.js — ApplyRadar service worker v1.1

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_JOB') {
    saveJob(message.job).then(r => sendResponse(r)); return true
  }
  if (message.type === 'GET_JOBS') {
    getJobs().then(jobs => sendResponse({ jobs })); return true
  }
  if (message.type === 'UPDATE_JOB') {
    updateJob(message.id, message.updates).then(r => sendResponse(r)); return true
  }
  if (message.type === 'DELETE_JOB') {
    deleteJob(message.id).then(r => sendResponse(r)); return true
  }
  if (message.type === 'OPEN_DASHBOARD') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') })
    sendResponse({ ok: true }); return true
  }
  if (message.type === 'SET_FOLLOWUP') {
    setFollowUp(message.id, message.date).then(r => sendResponse(r)); return true
  }
})

// ── Alarm handler — fires follow-up reminders ────────────────────────────────
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith('followup_')) return
  const jobId = alarm.name.replace('followup_', '')
  const jobs = await getJobs()
  const job = jobs.find(j => j.id === jobId)
  if (!job) return
  chrome.notifications.create(`notif_${jobId}`, {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'ApplyRadar — Follow-up reminder',
    message: `Time to follow up on: ${job.title} at ${job.company}`,
    buttons: [{ title: 'Open Dashboard' }],
    priority: 2,
  })
})

chrome.notifications.onButtonClicked.addListener((notifId) => {
  if (notifId.startsWith('notif_')) {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') })
  }
})

// ── Storage helpers ───────────────────────────────────────────────────────────

async function getJobs() {
  const data = await chrome.storage.local.get('jobs')
  return data.jobs || []
}

async function saveJob(job) {
  const jobs = await getJobs()
  const titleNorm   = job.title.toLowerCase().trim()
  const companyNorm = job.company.toLowerCase().trim()
  const duplicate = jobs.find(j =>
    j.title.toLowerCase().trim() === titleNorm &&
    j.company.toLowerCase().trim() === companyNorm
  )
  if (duplicate) {
    return { ok: false, duplicate: true, existingId: duplicate.id, existingPlatform: duplicate.platform, message: `Already saved from ${duplicate.platform}` }
  }
  const newJob = {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2,7)}`,
    ...job,
    status: 'saved',
    savedAt: new Date().toISOString(),
    notes: '',
    followUpDate: null,
  }
  await chrome.storage.local.set({ jobs: [newJob, ...jobs] })
  return { ok: true, job: newJob }
}

async function updateJob(id, updates) {
  const jobs = await getJobs()
  const idx = jobs.findIndex(j => j.id === id)
  if (idx === -1) return { ok: false }
  jobs[idx] = { ...jobs[idx], ...updates, updatedAt: new Date().toISOString() }
  await chrome.storage.local.set({ jobs })
  return { ok: true, job: jobs[idx] }
}

async function deleteJob(id) {
  const jobs = await getJobs()
  // Clear any alarm
  chrome.alarms.clear(`followup_${id}`)
  await chrome.storage.local.set({ jobs: jobs.filter(j => j.id !== id) })
  return { ok: true }
}

async function setFollowUp(id, date) {
  const jobs = await getJobs()
  const idx = jobs.findIndex(j => j.id === id)
  if (idx === -1) return { ok: false }

  jobs[idx].followUpDate = date
  jobs[idx].updatedAt = new Date().toISOString()
  await chrome.storage.local.set({ jobs })

  // Clear existing alarm then set new one
  await chrome.alarms.clear(`followup_${id}`)
  if (date) {
    const ts = new Date(date).getTime()
    if (ts > Date.now()) {
      chrome.alarms.create(`followup_${id}`, { when: ts })
    }
  }
  return { ok: true }
}
