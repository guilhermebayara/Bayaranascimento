// O sistema visual inteiro, na ordem certa (docs/visual.md, "Sistema"). Todo esqueleto de página
// importa este arquivo e mais nada de estilo; cada tela soma o CSS dela, de src/visual/telas/.
// Nada aqui vem de src/styles/global.css.
//
// As três combinações de fontes entram juntas enquanto a escolha não sai: o navegador só baixa
// os arquivos das fontes que a página usa. Depois da escolha, as outras duas saem daqui e de
// fontes.css. Qual está em uso é uma linha: FONTES_DO_SITE, em src/lib/visual.ts.

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
// C · De cartaz
import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource-variable/dm-sans/wght.css';
import '@fontsource/dm-mono/400.css';
import '@fontsource/dm-mono/500.css';
import '@fontsource/nothing-you-could-do/400.css';

import './tokens.css';
import './fontes.css';
import './base.css';
import './pecas.css';
import './estrutura.css';
