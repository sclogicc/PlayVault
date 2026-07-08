/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MAIN_VITE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
