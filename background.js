// background.js — ApplyRadar service worker

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SAVE_JOB') {
    saveJob(message.job).then(result => sendResponse(result))
    return true // keep channel open for async
  }
  if (message.type === 'GET_JOBS') {
    getJobs().then(jobs => sendResponse({ jobs }))
    return true
  }
  if (message.type === 'UPDATE_JOB') {
    updateJob(message.id, message.updates).then(result => sendResponse(result))
    return true
  }
  if (message.type === 'DELETE_JOB') {
    deleteJob(message.id).then(result => sendResponse(result))
    return true
  }
  if (message.type === 'OPEN_DASHBOARD') {
    chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/index.html') })
    sendResponse({ ok: true })
    return true
  }
})

async function getJobs() {
  const data = await chrome.storage.local.get('jobs')
  return data.jobs || []
}

async function saveJob(job) {
  const jobs = await getJobs()

  // Duplicate detection: same title + company (case-insensitive)
  const titleNorm = job.title.toLowerCase().trim()
  const companyNorm = job.company.toLowerCase().trim()

  const duplicate = jobs.find(j =>
    j.title.toLowerCase().trim() === titleNorm &&
    j.company.toLowerCase().trim() === companyNorm
  )

  if (duplicate) {
    return {
      ok: false,
      duplicate: true,
      existingId: duplicate.id,
      existingPlatform: duplicate.platform,
      message: `Already saved from ${duplicate.platform}`
    }
  }

  const newJob = {
    id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ...job,
    status: 'saved',      // saved | applied | interview | offer | rejected
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
  if (idx === -1) return { ok: false, message: 'Job not found' }
  jobs[idx] = { ...jobs[idx], ...updates, updatedAt: new Date().toISOString() }
  await chrome.storage.local.set({ jobs })
  return { ok: true, job: jobs[idx] }
}

async function deleteJob(id) {
  const jobs = await getJobs()
  await chrome.storage.local.set({ jobs: jobs.filter(j => j.id !== id) })
  return { ok: true }
}
