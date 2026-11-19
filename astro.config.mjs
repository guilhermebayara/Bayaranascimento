import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://memorias.bayara.com.br',
  // Toda página é montada no servidor para a pessoa que está logada:
  // é isso que permite esconder o que é restrito a um núcleo.
  output: 'server',
  adapter: cloudflare({
    // Sem o serviço de imagens do Cloudflare, que é cobrado à parte
    imageService: 'passthrough',
    // No computador nada fala com o Cloudflare de verdade: com o Workers AI no wrangler.jsonc, o servidor
    // local tentava abrir uma conexão remota e não subia sem login. Lá, a transcrição fica sem o modelo.
    remoteBindings: false,
  }),
  // Não usamos sessões do Astro: quem cuida do login é o Cloudflare Access
  session: false,
});
