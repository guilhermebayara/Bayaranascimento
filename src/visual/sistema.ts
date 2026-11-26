// O sistema visual inteiro, na ordem certa (docs/visual.md, "Sistema"). Todo esqueleto de página
// importa este arquivo e mais nada de estilo; cada tela soma o CSS dela, de src/visual/telas/.
// Nada aqui vem de src/styles/global.css.
//
// O site carrega só a combinação C, a que ele usa (decisão do Gui, 17/11/2026). As combinações A e B
// saíram do pacote em 26/11/2026 (sessão AC1). Qual está em uso é uma linha: FONTES_DO_SITE, em
// src/lib/visual.ts.

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
