declare namespace Cloudflare {
  interface Env {
    FOTOS: R2Bucket;
    DB: D1Database;
    /** Banco e bucket da homologação, ligados só às prévias (ver lib/servidor/ambiente.ts) */
    DB_HOMOLOGA?: D1Database;
    FOTOS_HOMOLOGA?: R2Bucket;
    ACCESS_TEAM_DOMAIN: string;
    ACCESS_AUD: string;
    /** "producao" exige login. "previa" e "desenvolvimento" usam dados de teste. A homologação é decidida pelo endereço. */
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

// AsyncLocalStorage vem do nodejs_compat do Workers (ver lib/servidor/ambiente.ts)
declare module 'node:async_hooks' {
  export class AsyncLocalStorage<T> {
    run<R>(store: T, tratar: () => R): R;
    getStore(): T | undefined;
  }
}
