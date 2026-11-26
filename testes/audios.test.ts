import { readFileSync } from 'node:fs';
// Áudios nos relatos: formatos aceitos, limites de espaço e regras de quem ouve
import { describe, expect, it, vi } from 'vitest';
import { temSqlite } from './apoio/d1';
import { AUDIOS_POR_RELATO, cabeNoLimite, CHAVE_DE_AUDIO, duracaoEmTexto, formatoDoAudio, limiteTotal, LIMITE_POR_ARQUIVO, LIMITE_TOTAL } from '../src/lib/audios';

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));

const fontes: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../src/**/*.{astro,ts}', { query: '?raw', import: 'default', eager: true })).map(([k, v]) => [k.replace('../', ''), v]),
);
const bytes = (...partes: (string | number[])[]) =>
  new Uint8Array(partes.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)).concat(new Array(16).fill(0)));

describe('formato pelo conteúdo do arquivo', () => {
  it('reconhece os formatos de voz mais comuns', () => {
    expect(formatoDoAudio(bytes([0x1a, 0x45, 0xdf, 0xa3]))?.extensao).toBe('webm');
    expect(formatoDoAudio(bytes('OggS'))?.extensao).toBe('ogg');
    expect(formatoDoAudio(bytes([0, 0, 0, 0x20], 'ftypM4A '))?.extensao).toBe('m4a');
    expect(formatoDoAudio(bytes('ID3'))?.extensao).toBe('mp3');
    expect(formatoDoAudio(bytes([0xff, 0xfb]))?.extensao).toBe('mp3');
    expect(formatoDoAudio(bytes('RIFF', [0, 0, 0, 0], 'WAVE'))?.extensao).toBe('wav');
  });

  it('recusa o que não é áudio, mesmo com nome de áudio', () => {
    expect(formatoDoAudio(bytes([0xff, 0xd8, 0xff]))).toBeUndefined(); // JPG
    expect(formatoDoAudio(bytes('RIFF', [0, 0, 0, 0], 'WEBP'))).toBeUndefined();
    expect(formatoDoAudio(bytes('<html>'))).toBeUndefined();
  });

  it('a chave no bucket é a gerada pelo site, sem caminho de fora', () => {
    expect(CHAVE_DE_AUDIO.test('2026/2aeb5abf-6fa5-43ee-aa0e-95e569b46417.webm')).toBe(true);
    expect(CHAVE_DE_AUDIO.test('../fotos/2026/2aeb5abf-6fa5-43ee-aa0e-95e569b46417.jpg')).toBe(false);
  });
});

describe('espaço', () => {
  it('os áudios ficam bem dentro do plano gratuito do R2 (10 GB), com folga para as fotos', () => {
    expect(LIMITE_TOTAL).toBeLessThanOrEqual(3 * 1024 ** 3);
    expect(LIMITE_POR_ARQUIVO).toBeLessThanOrEqual(25 * 1024 ** 2);
    expect(AUDIOS_POR_RELATO).toBeLessThanOrEqual(20);
  });

  it('produção, homologação e prévias dividem os 10 GB da conta: somados, os tetos ficam abaixo disso com folga', () => {
    // Homologação e prévias (que dividem um bucket) têm o teto de teste cada uma
    const soma = limiteTotal('producao') + limiteTotal('homologa') + limiteTotal('previa');
    expect(soma).toBeLessThan(4 * 1024 ** 3);
    expect(limiteTotal('homologa')).toBeLessThan(limiteTotal('producao'));
    expect(limiteTotal('desenvolvimento')).toBe(limiteTotal('previa'));
  });

  it('recusa o arquivo que passa do limite dele ou do teto total', () => {
    expect(cabeNoLimite(0, LIMITE_POR_ARQUIVO)).toBe(true);
    expect(cabeNoLimite(0, LIMITE_POR_ARQUIVO + 1)).toBe(false);
    expect(cabeNoLimite(LIMITE_TOTAL - 10, 11)).toBe(false);
  });

  it('o envio confere o teto antes de gravar no bucket', () => {
    const api = fontes['src/pages/api/audios.ts'];
    expect(api.indexOf('cabeNoLimite(')).toBeGreaterThan(0);
    expect(api.indexOf('cabeNoLimite(')).toBeLessThan(api.indexOf('.put('));
  });
});

describe('duração', () => {
  it('em texto curto', () => {
    expect(duracaoEmTexto(45)).toBe('45 s');
    expect(duracaoEmTexto(185)).toBe('3 min');
    expect(duracaoEmTexto(3900)).toBe('1 h 05 min');
    expect(duracaoEmTexto(null)).toBe('');
  });
});

describe('quem ouve', () => {
  const repositorio = fontes['src/lib/servidor/repositorio.ts'];
  it('áudio solto, só quem enviou; do relato, quem vê o relato numa memória que vê', () => {
    const regra = repositorio.slice(repositorio.indexOf('export async function acessoAoAudio'));
    expect(regra).toContain('(a.relato_id IS NULL AND a.enviado_por = ?1)');
    // O relato à vista mora em src/lib/servidor/quem-ve.ts (AC3); o áudio ainda deixa ouvir o rascunho descartado (V-3, na fila)
    expect(regra).toContain("${sqlRelatoAberto('r2', '?1', { descartadoTambem: true })} AND ${FILTRO_VISIVEL}");
    // O relato de quem a pessoa não vê também fica de fora (decisão do Gui, 17/11/2026)
    expect(regra.slice(0, regra.indexOf('\n}\n'))).toContain('veORelato(');
  });

  it('a rota responde igual para áudio que não existe e áudio que a pessoa não pode ouvir', () => {
    const rota = fontes['src/pages/audios/[...chave].ts'];
    expect(rota).toContain('const acesso = await acessoAoAudio(locals.usuario, chave);\n  if (!acesso) return naoEncontrado();');
    expect(rota).toContain("'Accept-Ranges', 'bytes'");
  });

  it('só entram no relato áudios que a própria pessoa enviou para aquela memória (audiosQueEntram, que ligarAudios e a rota da memória usam)', () => {
    const ligar = repositorio.slice(repositorio.indexOf('export async function audiosQueEntram'));
    expect(ligar).toContain('enviado_por = ? AND (memoria_id = ? OR memoria_id IS NULL)');
  });

  it('o espelho da produção não leva áudios e apaga os que houver', async () => {
    const { TABELAS_APAGADAS } = await import('../src/lib/espelho');
    expect(TABELAS_APAGADAS.indexOf('audios')).toBeGreaterThanOrEqual(0);
    expect(TABELAS_APAGADAS.indexOf('audios')).toBeLessThan(TABELAS_APAGADAS.indexOf('relatos'));
  });
});

// Proposta B do conceito da sessão H (escolha do Gui, 18/11/2026): gravar como mensagem de voz
// O gravador agora mora na janela de escrever do relato como conversa (escolha do Gui depois da sessão I,
// 18/11/2026): o botão redondo grava sem texto e envia com texto, e cada áudio vira uma mensagem
describe('gravar na janela da conversa', () => {
  const ler = (c: string) => readFileSync(c, 'utf8');
  const janela = ler('src/components/conversa/Janela.astro');
  const cliente = ler('src/lib/cliente/conversa.ts');
  const css = ler('src/visual/telas/conversa.css');
  it('as duas telas usam a mesma janela', () => {
    expect(ler('src/pages/nova.astro')).toContain('<Janela modo="formulario"');
    expect(ler('src/pages/memorias/[id]/relato.astro')).toContain('<Janela modo="ao-vivo"');
  });
  it('sem texto o botão grava, com texto envia, gravando ele para; o "+" anexa o áudio do celular', () => {
    expect(cliente).toMatch(/const modo = gravador\?\.state === 'recording' \? 'gravando' : campo\.value\.trim\(\) \|\| !podeGravar \? 'texto' : 'voz';/);
    expect(janela).toContain('data-anexar="audio">Áudio do celular</button>');
    expect(cliente).toContain("if (cancelada) return avisar('Gravação cancelada. Nada foi guardado.');");
  });
  it('o botão de áudio ganha cor: sem texto, na cor viva', () => {
    expect(css).toMatch(/\.janela__escrever\[data-modo='voz'\] \.janela__botao \{\s*background: var\(--vivo-tinta\);/);
  });
  it('cada áudio é uma mensagem com tocar, a onda e a duração; a transcrição mora no menu dela', () => {
    for (const marca of ['data-tocar', 'data-andou', 'data-tempo', 'data-transcrever', 'data-transcricao-campo']) expect(cliente).toContain(marca);
  });
});

// Quem ouve, pela consulta de verdade (revisão MEM-2 da AC3): o rascunho de relato é só de quem o registrou, com
// o áudio dele, e o publicado é de quem vê a memória. A conferência do texto, acima, não pega uma inversão
describe.skipIf(!comSqlite)('quem ouve, pelo banco', async () => {
  const { abrirBancoDeExemplo } = await import('./apoio/banco-de-exemplo');
  const { repo, sql, usuarioDe, memoriaAberta, ultimoRelato } = await abrirBancoDeExemplo(env);
  const memoria = memoriaAberta();
  sql(`INSERT INTO integrantes (id, nome) VALUES ('t-ouve-rascunho', 'Rascunho'), ('t-ouve-publicado', 'Publicado')`);
  sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, 't-ouve-rascunho', 'gui', 'Rascunho do Gui', 'rascunho')`, memoria);
  sql(`INSERT INTO audios (relato_id, memoria_id, chave, tipo, tamanho, enviado_por) VALUES (?, ?, 't-ouve-rascunho.webm', 'audio/webm', 10, 'gui')`, ultimoRelato(), memoria);
  sql(`INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao, publicado_em) VALUES (?, 't-ouve-publicado', 'gui', 'Publicado do Gui', 'publicada', datetime('now'))`, memoria);
  sql(`INSERT INTO audios (relato_id, memoria_id, chave, tipo, tamanho, enviado_por) VALUES (?, ?, 't-ouve-publicado.webm', 'audio/webm', 10, 'gui')`, ultimoRelato(), memoria);
  const [gui, giovanna] = ['gui', 'giovanna'].map(usuarioDe);

  it('o áudio do rascunho, só quem registrou ouve', async () => {
    expect(await repo.podeOuvirAudio(gui, 't-ouve-rascunho.webm')).toBe(true);
    expect(await repo.podeOuvirAudio(giovanna, 't-ouve-rascunho.webm')).toBe(false);
  });
  it('o áudio do relato publicado, quem vê a memória ouve', async () => {
    expect(await repo.podeOuvirAudio(gui, 't-ouve-publicado.webm')).toBe(true);
    expect(await repo.podeOuvirAudio(giovanna, 't-ouve-publicado.webm')).toBe(true);
  });
});
