// As combinações de fontes A e B, só para comparar com a C, a do site (causa 7 da medição M1,
// docs/desempenho/2026-11-22-medicao.md). Antes iam no CSS de toda página. Agora só as páginas que
// comparam as três importam este arquivo: a do sistema (src/pages/sistema.astro) e a das fontes
// (src/pages/conceito/sobre.astro). Nas outras, a escolha A ou B da faixa de teste das prévias cai nas
// fontes de reserva do aparelho.

// A · Macia
import '@fontsource-variable/fraunces/full.css';
import '@fontsource-variable/fraunces/full-italic.css';
import '@fontsource-variable/geist/wght.css';
import '@fontsource-variable/geist-mono/wght.css';
import '@fontsource/oooh-baby/400.css';
// B · Editorial
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';
import '@fontsource-variable/instrument-sans/wght.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/reenie-beanie/400.css';
