// O sistema visual inteiro, na ordem certa (docs/visual.md, "Sistema"). Todo esqueleto de página
// importa este arquivo e mais nada de estilo; cada tela soma o CSS dela, de src/visual/telas/.
// Nada aqui vem de src/styles/global.css.
//
// O site carrega só a combinação C, a que ele usa (decisão do Gui, 17/11/2026). As combinações A e B
// ficam em src/visual/fontes-para-comparar.ts, que só a página do sistema e a das fontes importam, para
// continuarem comparando as três (causa 7 da medição M1, docs/desempenho/). O navegador só baixa os
// arquivos das fontes que a página usa. Qual está em uso é uma linha: FONTES_DO_SITE, em src/lib/visual.ts.

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
