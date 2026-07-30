/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENAI_PLANNER_MODEL?: string;
  readonly VITE_OPENAI_IMAGE_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
