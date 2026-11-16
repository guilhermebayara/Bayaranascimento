// O monograma: o M de Memórias, tirado da serifa dos títulos e desenhado em SVG (docs/visual.md).
//
//   npm run monograma
//
// Lê o M de cada uma das três serifas do sistema, direto dos arquivos do Fontsource, e grava:
//   src/visual/monograma.ts            o desenho de cada serifa, em dois cortes (normal e pequeno)
//   src/visual/medidas-das-serifas.ts  a largura de cada letra, para a assinatura caber na página
//   public/icones/<serifa>/            o ícone do site de cada serifa (SVG e PNG)
//
// O resultado fica versionado: só rode de novo se uma serifa mudar ou entrar outra. As cores dos
// ícones saem de src/visual/tokens.css, que continua sendo o único lugar onde cor é escrita.
//
// Usa o fontkitten e o sharp, que já vêm instalados com o Astro. O fontkitten não aplica os eixos
// de uma fonte variável lida de um arquivo woff2, então, para a Fraunces, o script pega os pontos
// do glifo e pede as variações ponto a ponto (ver "pontosDoGlifo").
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { create } from 'fontkitten';
import sharp from 'sharp';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const arquivo = (caminho) => readFileSync(join(raiz, 'node_modules', caminho));

// As serifas das três combinações (src/visual/fontes.css). "normal" é o desenho de título; "pequeno"
// é o mesmo M engrossado para ler em 16 px: na Fraunces, o desenho ótico de texto e um peso acima;
// nas outras, que não têm eixos, um contorno por fora das hastes finas.
const SERIFAS = [
  {
    id: 'a',
    nome: 'Fraunces',
    arquivo: '@fontsource-variable/fraunces/files/fraunces-latin-full-normal.woff2',
    normal: { eixos: { opsz: 144, wght: 400, SOFT: 100, WONK: 0 } },
    pequeno: { eixos: { opsz: 9, wght: 560, SOFT: 100, WONK: 0 } },
  },
  {
    id: 'b',
    nome: 'Instrument Serif',
    arquivo: '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2',
    normal: {},
    pequeno: { engrossa: 0.034 },
  },
  {
    id: 'c',
    nome: 'DM Serif Display',
    arquivo: '@fontsource/dm-serif-display/files/dm-serif-display-latin-400-normal.woff2',
    normal: {},
    pequeno: { engrossa: 0.022 },
  },
];

// As letras que um sobrenome pode ter, mais o "&", a vírgula, o hífen e o espaço
const LETRAS = [...' &,-\'’ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁÀÂÃÄÇÉÊÍÓÔÕÖÚÜÑáàâãäçéêíóôõöúüñ'];

/** Os pontos do contorno de um glifo simples, com os eixos aplicados quando a fonte é variável. */
function pontosDoGlifo(fonte, buffer, codigo, eixos) {
  const base = fonte.glyphForCodePoint(codigo);
  if (!eixos) return { caminho: base.path.toSVG(), avanco: base.advanceWidth, caixa: base.bbox };

  if (!fonte._transformedGlyphs) fonte._transformGlyfTable();
  const glifo = fonte._transformedGlyphs[base.id];
  if (!glifo?.points) throw new Error('O M desta fonte é um glifo composto: o script só lê glifo simples.');
  const coordenadas = fonte.fvar.axis.map((eixo) => {
    const nome = eixo.axisTag.trim();
    return nome in eixos ? Math.max(eixo.minValue, Math.min(eixo.maxValue, eixos[nome])) : eixo.defaultValue;
  });
  const Fluxo = fonte.stream.constructor;
  const instancia = new fonte.constructor(new Fluxo(new Uint8Array(buffer)), coordenadas);
  const pontos = glifo.points.map((p) => p.copy());
  // Os quatro pontos fantasmas do TrueType: a origem e o avanço entram nas variações com o contorno
  const Ponto = glifo.points[0].constructor;
  const fantasmas = [0, base.advanceWidth, 0, 0].map((x) => new Ponto(true, true, x, 0));
  const todos = [...pontos, ...fantasmas];
  instancia._variationProcessor.transformPoints(base.id, todos);
  const origem = fantasmas[0].x;
  for (const p of pontos) p.x -= origem;
  const xs = pontos.map((p) => p.x);
  const ys = pontos.map((p) => p.y);
  return {
    caminho: caminhoDosPontos(pontos),
    avanco: fantasmas[1].x - origem,
    caixa: { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) },
  };
}

/** Do contorno quadrático do TrueType para um caminho de SVG (ainda com o eixo y para cima). */
function caminhoDosPontos(pontos) {
  const contornos = [];
  let atual = [];
  for (const p of pontos) {
    atual.push(p);
    if (p.endContour) {
      contornos.push(atual);
      atual = [];
    }
  }
  const meio = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  let d = '';
  for (const contorno of contornos) {
    const n = contorno.length;
    // Começa num ponto da curva; se não houver nenhum, no meio de dois pontos de controle
    let inicio = contorno.findIndex((p) => p.onCurve);
    let primeiro;
    if (inicio < 0) {
      primeiro = meio(contorno[0], contorno[n - 1]);
      inicio = n - 1;
    } else primeiro = contorno[inicio];
    d += `M${primeiro.x} ${primeiro.y}`;
    let controle = null;
    for (let i = 1; i <= n; i++) {
      const p = contorno[(inicio + i) % n];
      if (p.onCurve) {
        d += controle ? `Q${controle.x} ${controle.y} ${p.x} ${p.y}` : `L${p.x} ${p.y}`;
        controle = null;
      } else {
        if (controle) {
          const m = meio(controle, p);
          d += `Q${controle.x} ${controle.y} ${m.x} ${m.y}`;
        }
        controle = p;
      }
    }
    if (controle) d += `Q${controle.x} ${controle.y} ${primeiro.x} ${primeiro.y}`;
    d += 'Z';
  }
  return d;
}

/**
 * Leva o caminho para uma caixa de altura 100, com o y para baixo e a origem no canto da letra.
 * Devolve o caminho e a largura. Os números saem com uma casa, o que basta até o tamanho de capa.
 */
function normalizar(caminho, caixa, folga = 0) {
  const escala = 100 / (caixa.maxY - caixa.minY);
  const n = (v) => String(Math.round(v * 10) / 10);
  const x = (v) => n((v - caixa.minX) * escala + folga);
  const y = (v) => n((caixa.maxY - v) * escala + folga);
  const d = caminho.replace(/([MLQCZ])([^MLQCZ]*)/g, (_, comando, numeros) => {
    const valores = numeros.trim().split(/[\s,]+/).filter(Boolean).map(Number);
    return comando + valores.map((v, i) => (i % 2 === 0 ? x(v) : y(v))).join(' ');
  });
  return { d, largura: Math.round(((caixa.maxX - caixa.minX) * escala + folga * 2) * 10) / 10, altura: 100 + folga * 2 };
}

const tokens = readFileSync(join(raiz, 'src/visual/tokens.css'), 'utf8');
const cor = (nome) => {
  const achado = new RegExp(`--${nome}:\\s*(#[0-9a-fA-F]{6});`).exec(tokens);
  if (!achado) throw new Error(`Não achei --${nome} em tokens.css`);
  return achado[1];
};
const TINTA = cor('tinta');
const PAPEL = cor('creme');

const monogramas = {};
const medidas = {};

for (const serifa of SERIFAS) {
  const buffer = arquivo(serifa.arquivo);
  const fonte = create(buffer);
  const cortes = {};
  for (const corte of ['normal', 'pequeno']) {
    const { eixos, engrossa = 0 } = serifa[corte];
    const glifo = pontosDoGlifo(fonte, buffer, 77, eixos);
    // O contorno que engrossa o corte pequeno fica metade para fora: a caixa ganha essa folga
    const traco = Math.round(engrossa * 100 * 10) / 10;
    cortes[corte] = { ...normalizar(glifo.caminho, glifo.caixa, traco / 2), traco };
  }
  monogramas[serifa.id] = cortes;

  // A largura de cada letra em em, no desenho padrão da fonte. Serve para comparar textos entre si
  // (quanto "Bayara, Bracarense & Silva" é mais largo que "Bayara & Bracarense"), e não para medir
  // com precisão: não leva o ajuste entre pares de letras.
  medidas[serifa.id] = Object.fromEntries(
    LETRAS.map((letra) => [letra, Math.round((fonte.glyphForCodePoint(letra.codePointAt(0)).advanceWidth / fonte.unitsPerEm) * 1000) / 1000]),
  );

  // Os ícones. O SVG é o M sozinho, numa cor só, que troca com o tema do navegador para não sumir
  // numa aba escura. Os PNG levam o papel por baixo: o do celular precisa de fundo cheio.
  const pasta = join(raiz, 'public/icones', serifa.id);
  mkdirSync(pasta, { recursive: true });
  const quadro = (m, tamanho, ocupa) => {
    const escala = (tamanho * ocupa) / Math.max(m.altura, m.largura);
    const dx = (tamanho - m.largura * escala) / 2;
    const dy = (tamanho - m.altura * escala) / 2;
    const traco = m.traco ? ` stroke="currentColor" stroke-width="${m.traco}" stroke-linejoin="round"` : '';
    return `<path transform="translate(${dx.toFixed(2)} ${dy.toFixed(2)}) scale(${escala.toFixed(4)})" d="${m.d}"${traco}/>`;
  };
  const svg = (m, tamanho, ocupa, fundo) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tamanho} ${tamanho}" width="${tamanho}" height="${tamanho}">${fundo}${quadro(m, tamanho, ocupa)}</svg>`;

  const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><style>g{color:${TINTA};fill:${TINTA}}@media (prefers-color-scheme:dark){g{color:${PAPEL};fill:${PAPEL}}}</style><g>${quadro(cortes.pequeno, 64, 0.8)}</g></svg>\n`;
  writeFileSync(join(pasta, 'favicon.svg'), favicon);

  const comPapel = (m, tamanho, ocupa, raio) =>
    svg(m, tamanho, ocupa, `<rect width="${tamanho}" height="${tamanho}" rx="${raio}" fill="${PAPEL}"/>`).replace('<path ', `<path fill="${TINTA}" color="${TINTA}" `);
  // Para o navegador que não lê ícone em SVG: 48 px, com o papel de cantos arredondados
  await sharp(Buffer.from(comPapel(cortes.pequeno, 192, 0.62, 40))).resize(48, 48).png().toFile(join(pasta, 'favicon-48.png'));
  // Para a tela inicial do celular: 180 px, fundo cheio (o aparelho arredonda os cantos)
  await sharp(Buffer.from(comPapel(cortes.normal, 720, 0.5, 0))).resize(180, 180).png().toFile(join(pasta, 'apple-touch-icon.png'));
  console.log(`${serifa.id} · ${serifa.nome}: M de ${cortes.normal.largura} por 100`);
}

const aviso = '// Gerado por "npm run monograma" (scripts/monograma.mjs). Não edite à mão.\n';
writeFileSync(
  join(raiz, 'src/visual/monograma.ts'),
  `${aviso}// O M de Memórias em cada serifa do sistema, numa caixa de altura 100. "normal" é o desenho de
// título; "pequeno" é o mesmo M engrossado para ler em 16 px ("traco" é o contorno que o engrossa).
export interface CorteDoMonograma {
  d: string;
  largura: number;
  altura: number;
  traco: number;
}

export const MONOGRAMAS: Record<'a' | 'b' | 'c', { normal: CorteDoMonograma; pequeno: CorteDoMonograma }> = ${JSON.stringify(monogramas, null, 2)};
`,
);
writeFileSync(
  join(raiz, 'src/visual/medidas-das-serifas.ts'),
  `${aviso}// A largura de cada letra, em em, em cada serifa do sistema. A assinatura usa para saber quanto uma
// linha de sobrenomes é mais larga que "Bayara & Bracarense" (src/lib/visual.ts, "encolheDaAssinatura").
export const LARGURAS_DAS_LETRAS: Record<'a' | 'b' | 'c', Record<string, number>> = ${JSON.stringify(medidas)};
`,
);
