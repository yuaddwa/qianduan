/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DONK_API_PREFIX?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
