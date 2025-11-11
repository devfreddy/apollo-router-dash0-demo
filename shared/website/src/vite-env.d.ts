/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAPHQL_URL: string
  readonly VITE_ENVIRONMENT: string
  readonly VITE_DASH0_ENDPOINT: string
  readonly VITE_DASH0_AUTH_TOKEN: string
  readonly VITE_DASH0_DATASET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
