// Foto de retrato no cadastro da pessoa (decisão do Gui, 16/11/2026): o recorte, o formato, quem pode pôr
// e trocar, e que o retrato de quem a pessoa não vê não é entregue.
import { describe, expect, it } from 'vitest';
import {
  CHAVE_DE_RETRATO,
  LADO_DO_RETRATO,
  ajustarEnquadramento,
  aproximar,
  enquadramentoInicial,
  formatoDoRetrato,
  iniciais,
  recorteDaFoto,
} from '../src/lib/retratos';
import { corDaPessoa } from '../src/lib/visual';
import { readFileSync } from 'node:fs';
import { pessoasQueNaoVe, podeMudarRetrato, podeVerRetrato, type Usuario } from '../src/lib/servidor/permissoes';

const fontes: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../src/**/*.{astro,ts}', { query: '?raw', import: 'default', eager: true })).map(([k, v]) => [k.replace('../', ''), v]),
);
const bytes = (...partes: (string | number[])[]) =>
  new Uint8Array(partes.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)).concat(new Array(16).fill(0)));

const gui: Usuario = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };
const elizete: Usuario = { pessoa: 'elizete', nome: 'Elizete', admin: false, nucleos: ['bayara-nascimento'] };
const magno: Usuario = { pessoa: 'lucas-magno', nome: 'Lucas Magno', admin: false, nucleos: ['bayara-bracarense', 'bracarense'] };
const comAcesso = new Set(['gui', 'giovanna', 'elizete', 'lucas-magno']);

describe('quem pode pôr e trocar o retrato', () => {
  it('quem acessa o site: a própria pessoa e os administradores (Administradores podem mais, 16/11/2026)', () => {
    expect(podeMudarRetrato(elizete, { id: 'elizete', nucleos: ['bayara-nascimento'] }, comAcesso).ok).toBe(true);
    expect(podeMudarRetrato(gui, { id: 'elizete', nucleos: ['bayara-nascimento'] }, comAcesso).ok).toBe(true);
    // Quem divide o núcleo, não
    expect(podeMudarRetrato(magno, { id: 'giovanna', nucleos: ['bayara-bracarense'] }, comAcesso).ok).toBe(false);
  });

  it('quem não acessa: quem é do núcleo dela (ou do núcleo de que ela é parente), quem cadastrou e os admins', () => {
    const voBela = { id: 'vo-bela', nucleos: [], parenteDe: ['bayara-nascimento'], criadoPor: 'giovanna' };
    expect(podeMudarRetrato(elizete, voBela, comAcesso).ok).toBe(true);
    expect(podeMudarRetrato(gui, voBela, comAcesso).ok).toBe(true);
    expect(podeMudarRetrato(magno, voBela, comAcesso).ok).toBe(false);
    const amigoDoMagno = { id: 'amigo', nucleos: [], criadoPor: 'lucas-magno' };
    expect(podeMudarRetrato(magno, amigoDoMagno, comAcesso).ok).toBe(true);
    expect(podeMudarRetrato(elizete, amigoDoMagno, comAcesso).ok).toBe(false);
    expect(podeMudarRetrato(gui, amigoDoMagno, comAcesso).ok).toBe(true);
  });

  it('o envio confere a permissão antes de guardar o arquivo, e trocar não sobrescreve o antigo', () => {
    const api = fontes['src/pages/api/integrantes.ts'];
    const edicao = api.slice(api.indexOf('if (id) {'));
    expect(edicao.indexOf('podeMudarRetrato(usuario, anterior, comAcesso)')).toBeGreaterThan(0);
    expect(edicao.indexOf('podeMudarRetrato(usuario, anterior, comAcesso)')).toBeLessThan(edicao.indexOf('await guardarRetrato('));
    // Cada retrato ganha uma chave nova debaixo de retratos/
    expect(api).toContain('const chave = `${crypto.randomUUID()}.${retrato.extensao}`;');
    expect(api).toContain('`${PASTA_DOS_RETRATOS}${chave}`');
    expect(api).not.toMatch(/\.delete\(/);
  });

  it('a mudança entra nas versões guardadas do cadastro', () => {
    const repositorio = fontes['src/lib/servidor/repositorio.ts'];
    const atualizar = repositorio.slice(repositorio.indexOf('export async function atualizarIntegrante'));
    expect(atualizar).toMatch(/INSERT INTO versoes \(tipo, item_id, dados, autor\) VALUES \('integrante', \?, \?, \?\)`\)\.bind\(anterior\.id, JSON\.stringify\(anterior\)/);
    expect(atualizar).toContain('sobre = ?, retrato = ? WHERE id = ?');
    // A versão guarda o integrante inteiro, e o integrante tem o retrato
    expect(repositorio).toContain('retrato: (i.retrato as string | null) ?? null,');
  });

  it('uma migração nova guarda a chave em integrantes', () => {
    const banco = fontes['src/lib/servidor/banco.ts'];
    expect(banco).toContain("id: '016-retrato'");
    expect(banco).toContain('ALTER TABLE integrantes ADD COLUMN retrato TEXT');
  });
});

describe('quem vê o retrato', () => {
  it('quem só existe num laço privado de outra pessoa, sem laço que se veja, não é visto', () => {
    const naoVe = pessoasQueNaoVe(new Set(['amiga-secreta', 'prima']), new Set(['prima', 'gui']));
    expect([...naoVe]).toEqual(['amiga-secreta']);
    expect(podeVerRetrato('amiga-secreta', naoVe)).toBe(false);
    expect(podeVerRetrato('prima', naoVe)).toBe(true);
    expect(podeVerRetrato('gui', naoVe)).toBe(true);
  });

  it('a rota responde igual para retrato que não existe e retrato que a pessoa não vê', () => {
    const rota = fontes['src/pages/retratos/[...chave].ts'];
    expect(rota).toMatch(/if \(!CHAVE_DE_RETRATO\.test\(chave\) && !exemplo\) return naoEncontrado\(\);/);
    expect(rota).toMatch(/if \(!\(await podeVerRetratoDaChave\(locals\.usuario, chave\)\)\) return naoEncontrado\(\);/);
    expect(rota).toContain("'Cache-Control', 'private, no-cache'");
  });

  it('só o retrato atual é entregue, e passa pela mesma regra de quem a pessoa vê', () => {
    const repositorio = fontes['src/lib/servidor/repositorio.ts'];
    const regra = repositorio.slice(repositorio.indexOf('export async function podeVerRetratoDaChave'));
    expect(regra).toContain("prepare('SELECT id FROM integrantes WHERE retrato = ?')");
    expect(regra).toContain('return donos.some((dono) => podeVerRetrato(dono.id, naoVe));');
  });

  it('as páginas só mostram o retrato de quem a pessoa vê', () => {
    // A página da pessoa monta os dados em src/lib/servidor/pagina-da-pessoa.ts (sessão L)
    expect(readFileSync('src/lib/servidor/pagina-da-pessoa.ts', 'utf-8')).toMatch(/achar\(id\)\?\.retrato && !naoVe\.has\(id\)/);
    expect(fontes['src/pages/memorias/[id].astro']).toMatch(/pessoa\?\.retrato && !naoVe\.has\(id\)/);
    // Na árvore, quem a pessoa não vê nem chega ao navegador
    const arvore = fontes['src/pages/arvore.astro'];
    expect(arvore).toContain('const integrantes = todos.filter((i) => !naoVe.has(i.id));');
    expect(arvore.indexOf('pessoasQueNaoVe(')).toBeLessThan(arvore.indexOf('retrato: i.retrato'));
  });

  it('os cartões da árvore continuam sem foto: o retrato só aparece na ficha', () => {
    const cliente = fontes['src/lib/cliente/arvore.ts'];
    const ficha = cliente.slice(cliente.indexOf('const mostrarFicha'), cliente.indexOf('const marcaDeBicho'));
    expect(ficha).toContain('p.retrato');
    expect(cliente.match(/\.retrato\b/g)?.length).toBe(ficha.match(/\.retrato\b/g)?.length);
  });
});

describe('formato e chave', () => {
  it('reconhece JPG, PNG e WebP pelo conteúdo', () => {
    expect(formatoDoRetrato(bytes([0xff, 0xd8, 0xff, 0xe0]))?.extensao).toBe('jpg');
    expect(formatoDoRetrato(bytes([0x89, 0x50, 0x4e, 0x47]))?.extensao).toBe('png');
    expect(formatoDoRetrato(bytes('RIFF', [0, 0, 0, 0], 'WEBP'))?.extensao).toBe('webp');
    expect(formatoDoRetrato(bytes('<svg'))).toBeUndefined();
    expect(formatoDoRetrato(bytes('GIF89a'))).toBeUndefined();
  });

  it('a chave é a gerada pelo site, sem caminho de fora', () => {
    expect(CHAVE_DE_RETRATO.test('0f3c2a1e-1234-4abc-8def-0123456789ab.jpg')).toBe(true);
    expect(CHAVE_DE_RETRATO.test('../2026/0f3c2a1e-1234-4abc-8def-0123456789ab.jpg')).toBe(false);
    expect(CHAVE_DE_RETRATO.test('audios/0f3c2a1e-1234-4abc-8def-0123456789ab.jpg')).toBe(false);
    expect(CHAVE_DE_RETRATO.test('0f3c2a1e-1234-4abc-8def-0123456789ab.svg')).toBe(false);
  });
});

describe('recorte quadrado', () => {
  const [largura, altura, quadrado] = [4000, 3000, 300];

  it('começa com a foto centralizada, cobrindo o quadrado pelo lado menor', () => {
    const e = enquadramentoInicial(largura, altura, quadrado);
    expect(e.zoom).toBe(1);
    expect(e.y).toBe(0);
    expect(e.x).toBeCloseTo(-50);
    const r = recorteDaFoto(largura, altura, quadrado, e);
    expect(r).toEqual({ x: 500, y: 0, lado: 3000 });
  });

  it('nunca deixa fundo vazio: arrastar demais para no limite da foto', () => {
    expect(ajustarEnquadramento(largura, altura, quadrado, { zoom: 1, x: 80, y: 80 })).toEqual({ zoom: 1, x: 0, y: 0 });
    expect(ajustarEnquadramento(largura, altura, quadrado, { zoom: 1, x: -9999, y: -9999 })).toEqual({ zoom: 1, x: -100, y: 0 });
    expect(ajustarEnquadramento(largura, altura, quadrado, { zoom: 0.2, x: 0, y: 0 }).zoom).toBe(1);
    expect(ajustarEnquadramento(largura, altura, quadrado, { zoom: 40, x: 0, y: 0 }).zoom).toBe(4);
  });

  it('aproximar mantém parado o meio do quadrado', () => {
    const e = aproximar(largura, altura, quadrado, enquadramentoInicial(largura, altura, quadrado), 2);
    const r = recorteDaFoto(largura, altura, quadrado, e);
    expect(r.lado).toBe(1500);
    expect(r.x + r.lado / 2).toBeCloseTo(2000);
    expect(r.y + r.lado / 2).toBeCloseTo(1500);
  });

  it('o pedaço recortado é sempre um quadrado dentro da foto', () => {
    for (const e of [
      { zoom: 3.3, x: -700, y: -10 },
      { zoom: 1.7, x: 50, y: -2000 },
      { zoom: 4, x: -99999, y: -99999 },
    ]) {
      const r = recorteDaFoto(1200, 1900, 280, e);
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.y).toBeGreaterThanOrEqual(0);
      expect(r.x + r.lado).toBeLessThanOrEqual(1200 + 1e-6);
      expect(r.y + r.lado).toBeLessThanOrEqual(1900 + 1e-6);
    }
  });

  it('o retrato enviado tem uns 800 px', () => {
    expect(LADO_DO_RETRATO).toBe(800);
    expect(fontes['src/lib/cliente/retrato.ts']).toContain('Math.min(LADO_DO_RETRATO, Math.round(pedaco.lado))');
  });
});

describe('sem retrato', () => {
  it('as iniciais da primeira e da última palavra do nome', () => {
    expect(iniciais('Vó Bela')).toBe('VB');
    expect(iniciais('Maria da Silva')).toBe('MS');
    expect(iniciais('Chico')).toBe('C');
    expect(iniciais('  ')).toBe('?');
    expect(iniciais('élcio de andrade')).toBe('ÉA');
  });

  it('sobre a cor da família, a mesma da árvore', () => {
    const ordem = ['bayara-nascimento', 'bayara-bracarense', 'bracarense'];
    // A cor é a do sistema visual (corDaPessoa): a da primeira família da pessoa, na ordem das famílias
    expect(corDaPessoa(['bracarense'], ordem)).toBe(corDaPessoa(['bracarense', 'nenhuma'], ordem));
    expect(corDaPessoa(['bracarense', 'bayara-nascimento'], ordem)).toBe(corDaPessoa(['bayara-nascimento'], ordem));
    expect(corDaPessoa(['bracarense'], ordem)).not.toBe(corDaPessoa(['bayara-nascimento'], ordem));
    expect(corDaPessoa([], ordem)).toBe('tudo');
    // E o campo do retrato, no formulário, usa a mesma cor, sem variável do estilo antigo
    const campo = readFileSync(new URL('../src/components/CampoRetrato.astro', import.meta.url), 'utf8');
    expect(campo).toMatch(/data-familia=\{familiaDoRetrato\}/);
    expect(campo).not.toMatch(/--nucleo-|--cor-|--retrato-cor/);
  });
});
