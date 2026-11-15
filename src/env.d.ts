declare namespace Cloudflare {
  interface Env {
    FOTOS: R2Bucket;
    ACCESS_TEAM_DOMAIN: string;
    ACCESS_AUD: string;
    GITHUB_REPO: string;
    GITHUB_BRANCH: string;
    ADMIN: string;
    GITHUB_TOKEN: string;
    ACESSOS: string;
    // Só em desenvolvimento
    GITHUB_API_URL?: string;
    DEV_PESSOA?: string;
  }
}

declare module 'cloudflare:workers' {
  export const env: Cloudflare.Env;
}
