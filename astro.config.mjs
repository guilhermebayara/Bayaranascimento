import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://memorias.bayara.com.br',
  // As páginas do acervo continuam estáticas. Só os formulários e as rotas
  // de /api e /fotos rodam no servidor (marcados com prerender = false).
  output: 'static',
  adapter: cloudflare({
    // Sem o serviço de imagens do Cloudflare, que é cobrado à parte
    imageService: 'passthrough',
  }),
  // Não usamos sessões do Astro: quem cuida do login é o Cloudflare Access
  session: false,
});
