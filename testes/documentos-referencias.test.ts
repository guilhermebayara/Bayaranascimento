// Os documentos em uso (o CLAUDE.md, o README.md, docs/*.md, docs/regras/ e docs/briefs/) só citam o
// que existe: todo caminho e todo identificador entre crases existe no repositório, e todo link entre
// documentos chega a um arquivo e a um título que existem. O histórico (docs/historico/) e os relatórios
// (docs/desempenho/, docs/critica/, docs/visual/) ficam de fora: eles descrevem o que era.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ancorasDe } from './apoio/markdown';

const RAIZ = join(__dirname, '..');

function mds(pasta: string): string[] {
  return readdirSync(join(RAIZ, pasta))
    .filter((nome) => nome.endsWith('.md'))
    .map((nome) => `${pasta}/${nome}`);
}

const EM_USO = ['CLAUDE.md', 'README.md', ...mds('docs'), ...mds('docs/regras'), ...mds('docs/briefs')];

/** Os arquivos versionados (e os novos, ainda sem commit), com o caminho a partir da raiz. */
const ARQUIVOS: string[] = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], {
  cwd: RAIZ,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})
  .split('\n')
  .filter((caminho) => caminho && existsSync(join(RAIZ, caminho)));
const PASTAS = new Set<string>();
for (const caminho of ARQUIVOS) {
  const partes = caminho.split('/');
  for (let i = 1; i < partes.length; i++) PASTAS.add(partes.slice(0, i).join('/'));
}

/** O código onde um identificador citado precisa aparecer. */
const CODIGO = ARQUIVOS.filter(
  (caminho) =>
    /^(src|scripts|testes|\.github)\//.test(caminho) ||
    ['wrangler.jsonc', 'package.json', 'astro.config.mjs', '.dev.vars.exemplo'].includes(caminho),
)
  .filter((caminho) => /\.(ts|astro|mjs|js|css|gs|json|jsonc|yml|exemplo)$/.test(caminho))
  .map((caminho) => readFileSync(join(RAIZ, caminho), 'utf8'))
  .join('\n');

/** Nomes entre crases que não são do repositório, de propósito. */
const DE_FORA = new Map<string, string>([
  ['.dev.vars', 'o arquivo de segredo local, que nunca é versionado'],
  ['.env', 'o arquivo de segredo local, que nunca é versionado'],
  ['Código.gs', 'o arquivo do projeto no Google Apps Script'],
  ['.wrangler', 'a pasta do banco local, fora do repositório'],
  ['guilhermebayara/bayara', 'o repositório do bayara.design, a régua de qualidade'],
  ['guilhermebayara/absurda', 'o repositório do site da @bsurda, a régua de qualidade'],
  ['src/redesign/motion.js', 'um arquivo do repositório do bayara.design'],
  ['docs/visual/exploracao-e2/leia-me.md', 'o relatório da exploração E2, na branch tst-busca'],
  ['docs/visual/e4-feedback/leia-me.md', 'o relatório da exploração E4, na branch tst-feedback'],
  ['src/lib/cliente/estado.ts', 'o módulo da exploração E4, na branch tst-feedback, que a aplicação aproveita'],
]);

/** Pastas que uma sessão cria, citadas como destino do trabalho dela. */
const A_CRIAR = ['docs/ux/'];

/** Nomes da API do Node e do Playwright, citados nos cuidados. */
const DE_BIBLIOTECA = new Set(['ENOENT', 'recordVideo']);

const EXTENSOES = /\.(ts|astro|mjs|js|css|md|json|jsonc|gs|yml|sql|m4a|jpg|jpeg|png|webp|svg|html|patch|test\.ts)$/;

/** Um caminho com `*` vira expressão regular sobre o caminho inteiro. */
function deGlob(caminho: string): RegExp {
  const escapado = caminho.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
  return new RegExp(`(^|/)${escapado}$`);
}

function caminhoExiste(citado: string, documento: string): boolean {
  if (DE_FORA.has(citado) || A_CRIAR.some((pasta) => citado.startsWith(pasta))) return true;
  const semBarra = citado.replace(/\/$/, '');
  const pastaDoDocumento = dirname(documento);
  const candidatos = [semBarra, posix.join(pastaDoDocumento, semBarra), posix.join('docs', semBarra)].map((c) =>
    posix.normalize(c),
  );
  if (semBarra.includes('*')) {
    return candidatos.some((c) => ARQUIVOS.some((a) => deGlob(c).test(a)));
  }
  for (const c of candidatos) if (ARQUIVOS.includes(c) || PASTAS.has(c)) return true;
  // Um caminho parcial ("telas/tv.css") ou só o nome do arquivo ("banco.ts") vale se algum arquivo terminar nele.
  return ARQUIVOS.some((a) => a.endsWith(`/${semBarra}`)) || [...PASTAS].some((p) => p.endsWith(`/${semBarra}`));
}

/** O que, entre crases, é um caminho do repositório. */
function ehCaminho(citado: string): boolean {
  if (/[\s<>=?:()…'"{}]/.test(citado) || /AAAA|<|\.\.\./.test(citado)) return false;
  if (citado.startsWith('/') || citado.startsWith('http')) return false;
  if (citado.startsWith('-') || citado.startsWith('@') || /^\.\w+$/.test(citado)) return false;
  return citado.includes('/') ? /^[\w.@-]/.test(citado) : EXTENSOES.test(citado) || DE_FORA.has(citado);
}

/** O que, entre crases, é um identificador do código: camelCase, MAIÚSCULAS ou com sublinhado. */
function ehIdentificador(citado: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(citado) && citado.length >= 4 && /[A-Z_]/.test(citado.slice(1));
}

/** As crases e os links de um documento, fora dos blocos de código. */
function lerDocumento(documento: string) {
  const texto = readFileSync(join(RAIZ, documento), 'utf8');
  let emBloco = false;
  const linhas: string[] = [];
  for (const linha of texto.split('\n')) {
    if (linha.trimStart().startsWith('```')) {
      emBloco = !emBloco;
      continue;
    }
    if (!emBloco) linhas.push(linha);
  }
  const corrido = linhas.join('\n');
  const crases = [...corrido.matchAll(/`([^`\n]+)`/g)].map((m) => m[1]);
  const semCrases = corrido.replace(/`[^`\n]*`/g, '');
  const links = [...semCrases.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]);
  return { crases, links };
}

describe('referências dos documentos em uso', () => {
  it('a lista dos documentos em uso tem as regras, o índice e o CLAUDE.md', () => {
    expect(EM_USO).toContain('CLAUDE.md');
    expect(EM_USO).toContain('docs/decisoes.md');
    expect(EM_USO.filter((d) => d.startsWith('docs/regras/')).length).toBeGreaterThan(10);
    expect(EM_USO.some((d) => d.startsWith('docs/historico/'))).toBe(false);
  });

  it('a leitura separa caminho, identificador e o resto', () => {
    expect(ehCaminho('src/lib/explorar.ts')).toBe(true);
    expect(ehCaminho('banco.ts')).toBe(true);
    expect(ehCaminho('docs/regras/')).toBe(true);
    expect(ehCaminho('/explorar/palco')).toBe(false);
    expect(ehCaminho('exemplos/<nome>.m4a')).toBe(false);
    expect(ehCaminho('acervo-AAAA-MM-DD.json')).toBe(false);
    expect(ehCaminho('fotos.tamanho')).toBe(false);
    expect(ehIdentificador('podeVerMemoria')).toBe(true);
    expect(ehIdentificador('CENTROS_PADRAO')).toBe(true);
    expect(ehIdentificador('memoria_integrantes')).toBe(true);
    expect(ehIdentificador('tipo')).toBe(false);
    expect(caminhoExiste('telas/tv.css', 'docs/visual.md')).toBe(true);
    expect(caminhoExiste('testes/arvore-*.test.ts', 'CLAUDE.md')).toBe(true);
    expect(caminhoExiste('src/lib/nao-existe.ts', 'CLAUDE.md')).toBe(false);
  });

  for (const documento of EM_USO) {
    it(`${documento}: todo caminho e identificador entre crases existe`, () => {
      const faltam: string[] = [];
      for (const citado of lerDocumento(documento).crases) {
        if (ehCaminho(citado) && !caminhoExiste(citado, documento)) faltam.push(`caminho ${citado}`);
        else if (ehIdentificador(citado) && !DE_BIBLIOTECA.has(citado) && !CODIGO.includes(citado)) faltam.push(`identificador ${citado}`);
      }
      expect(faltam, `${documento} cita o que não existe`).toEqual([]);
    });

    it(`${documento}: todo link entre documentos chega a um arquivo e a um título que existem`, () => {
      const quebrados: string[] = [];
      for (const destino of lerDocumento(documento).links) {
        if (/^[a-z]+:/i.test(destino)) continue;
        const [caminho, titulo] = destino.split('#');
        const alvo = caminho ? posix.normalize(posix.join(dirname(documento), decodeURIComponent(caminho))) : documento;
        const absoluto = join(RAIZ, alvo);
        if (!existsSync(absoluto)) {
          quebrados.push(`${destino} (arquivo não existe)`);
          continue;
        }
        if (titulo === undefined || !alvo.endsWith('.md') || statSync(absoluto).isDirectory()) continue;
        if (!ancorasDe(readFileSync(absoluto, 'utf8')).has(decodeURIComponent(titulo))) {
          quebrados.push(`${destino} (título não existe)`);
        }
      }
      expect(quebrados, `${documento} tem link quebrado`).toEqual([]);
    });
  }
});
