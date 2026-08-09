/// <reference types="vite/client" />

import type { Api } from '../shared/ipc'

declare global {
  interface Window {
    /** Bridge exposed by electron/preload.ts via contextBridge. */
    api: Api
  }
}

export {}
