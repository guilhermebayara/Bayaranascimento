declare namespace Cloudflare {
  interface Env {
    FOTOS: R2Bucket;
    DB: D1Database;
    ACCESS_TEAM_DOMAIN: string;
    ACCESS_AUD: string;
    /** "producao" exige login. "previa" e "desenvolvimento" usam dados de teste. */
    AMBIENTE: 'producao' | 'previa' | 'desenvolvimento';
    ACESSOS: string;
  }
}

declare module 'cloudflare:workers' {
  export const env: Cloudflare.Env;
}

declare namespace App {
  interface Locals {
    usuario: import('./lib/servidor/permissoes').Usuario;
  }
}
