declare namespace Cloudflare {
  interface Env {
    FOTOS: R2Bucket;
    DB: D1Database;
    ACCESS_TEAM_DOMAIN: string;
    ACCESS_AUD: string;
    /** "producao" exige login. "previa" e "desenvolvimento" usam dados de teste. */
    AMBIENTE: 'producao' | 'previa' | 'desenvolvimento';
    ACESSOS: string;
    /** Client ID do token de serviço do Access usado pela cópia mensal no Google Drive. */
    COPIA_CLIENT_ID?: string;
  }
}

declare module 'cloudflare:workers' {
  export const env: Cloudflare.Env;
}

declare namespace App {
  interface Locals {
    usuario: import('./lib/servidor/permissoes').Usuario;
    /** tipos de momento, lidos uma vez por pedido */
    tipos: import('./lib/tipos').Tipo[];
  }
}
