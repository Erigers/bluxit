const CHECK_MS = 15 * 60 * 1000
const STAMP = 'v'

type ReadyListener = (ready: boolean) => void

let updateReady = false
const readyListeners = new Set<ReadyListener>()

function stripReloadStamp() {
  const url = new URL(window.location.href)
  if (!url.searchParams.has(STAMP)) return
  url.searchParams.delete(STAMP)
  const search = url.searchParams.toString()
  window.history.replaceState(null, '', `${url.pathname}${search ? `?${search}` : ''}${url.hash}`)
}

function setUpdateReady() {
  if (updateReady) return
  updateReady = true
  readyListeners.forEach((listener) => listener(true))
}

export function isAppleHandheld() {
  const ua = navigator.userAgent
  if (/iPhone|iPad|iPod/i.test(ua)) return true
  return /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1
}

export function subscribeAppleUpdate(listener: ReadyListener) {
  readyListeners.add(listener)
  listener(updateReady)
  return () => {
    readyListeners.delete(listener)
  }
}

export function watchPwaUpdates() {
  stripReloadStamp()
  if (!('serviceWorker' in navigator)) return

  const apple = isAppleHandheld()
  let reloading = false
  const showNewVersion = () => {
    if (apple || reloading) return
    reloading = true
    const url = new URL(window.location.href)
    url.searchParams.set(STAMP, String(Date.now()))
    window.location.replace(`${url.pathname}?${url.searchParams.toString()}${url.hash}`)
  }

  if (!apple) {
    navigator.serviceWorker.addEventListener('controllerchange', showNewVersion)
  }

  void navigator.serviceWorker.ready.then((registration) => {
    const check = () => {
      void registration.update()
    }
    check()
    window.setInterval(check, CHECK_MS)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check()
    })

    const takeNewWorker = (worker: ServiceWorker | null) => {
      if (!worker || !navigator.serviceWorker.controller) return
      worker.postMessage({ type: 'SKIP_WAITING' })
      if (apple) setUpdateReady()
      else showNewVersion()
    }

    takeNewWorker(registration.waiting)

    registration.addEventListener('updatefound', () => {
      const worker = registration.installing
      if (!worker) return
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') takeNewWorker(worker)
      })
    })
  })
}
