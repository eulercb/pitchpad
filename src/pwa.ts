// PWA glue: manual service-worker registration (registerType 'prompt' so we can
// show a non-intrusive update toast instead of silently reloading) + the
// beforeinstallprompt capture for a subtle Install affordance.
import { create } from 'zustand'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface PwaState {
  needRefresh: boolean
  offlineReady: boolean
  canInstall: boolean
  applyUpdate: () => void
  install: () => Promise<void>
  dismissUpdate: () => void
  dismissOfflineReady: () => void
}

export const usePwa = create<PwaState>((set) => ({
  needRefresh: false,
  offlineReady: false,
  canInstall: false,
  applyUpdate: () => {},
  install: async () => {},
  dismissUpdate: () => set({ needRefresh: false }),
  dismissOfflineReady: () => set({ offlineReady: false }),
}))

let deferredPrompt: BeforeInstallPromptEvent | null = null

export function initPwa(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    usePwa.setState({
      canInstall: true,
      install: async () => {
        if (!deferredPrompt) return
        try {
          await deferredPrompt.prompt()
          await deferredPrompt.userChoice
        } catch {
          /* user dismissed the native sheet */
        }
        deferredPrompt = null
        usePwa.setState({ canInstall: false })
      },
    })
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    usePwa.setState({ canInstall: false })
  })

  // The service worker only exists in the production build.
  if (import.meta.env.DEV) return
  void import('virtual:pwa-register').then(({ registerSW }) => {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        usePwa.setState({ needRefresh: true, applyUpdate: () => void updateSW(true) })
      },
      onOfflineReady() {
        usePwa.setState({ offlineReady: true })
        window.setTimeout(() => usePwa.setState({ offlineReady: false }), 4500)
      },
    })
  })
}
