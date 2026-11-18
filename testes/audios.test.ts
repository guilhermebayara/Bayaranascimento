import { readFileSync } from 'node:fs';
// Áudios nos relatos: formatos aceitos, limites de espaço e regras de quem ouve
import { describe, expect, it } from 'vitest';
import { AUDIOS_POR_RELATO, cabeNoLimite, CHAVE_DE_AUDIO, duracaoEmTexto, formatoDoAudio, limiteTotal, LIMITE_POR_ARQUIVO, LIMITE_TOTAL } from '../src/lib/audios';

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
    const regra = repositorio.slice(repositorio.indexOf('export async function podeOuvirAudio'));
    expect(regra).toContain('(a.relato_id IS NULL AND a.enviado_por = ?1)');
    expect(regra).toContain("(r2.situacao = 'publicada' OR r2.registrado_por = ?1) AND ${FILTRO_VISIVEL}");
    // O relato de quem a pessoa não vê também fica de fora (decisão do Gui, 17/11/2026)
    expect(regra.slice(0, regra.indexOf('\n}\n'))).toContain('veORelato(');
  });

  it('a rota responde igual para áudio que não existe e áudio que a pessoa não pode ouvir', () => {
    const rota = fontes['src/pages/audios/[...chave].ts'];
    expect(rota).toMatch(/if \(!\(await podeOuvirAudio\(locals\.usuario, chave\)\)\) return naoEncontrado\(\);/);
    expect(rota).toContain("'Accept-Ranges', 'bytes'");
  });

  it('só entram no relato áudios que a própria pessoa enviou para aquela memória', () => {
    const ligar = repositorio.slice(repositorio.indexOf('export async function ligarAudios'));
    expect(ligar).toContain('enviado_por = ? AND (memoria_id = ? OR memoria_id IS NULL)');
  });

  it('o espelho da produção não leva áudios e apaga os que houver', async () => {
    const { TABELAS_APAGADAS } = await import('../src/lib/espelho');
    expect(TABELAS_APAGADAS.indexOf('audios')).toBeGreaterThanOrEqual(0);
    expect(TABELAS_APAGADAS.indexOf('audios')).toBeLessThan(TABELAS_APAGADAS.indexOf('relatos'));
  });
});

// Proposta B do conceito da sessão H (escolha do Gui, 18/11/2026): gravar como mensagem de voz
describe('o gravador, como mensagem de voz', () => {
  const ler = (c: string) => readFileSync(c, 'utf8');
  const peca = ler('src/components/formularios/Gravador.astro');
  const cliente = ler('src/lib/cliente/audios.ts');
  const css = ler('src/visual/telas/formulario.css');
  it('as duas telas usam a mesma peça, e gravar é a barra com o microfone; anexar fica embaixo, discreto', () => {
    // O relato está no conceito do campo só (tst-relato): a caixa leva o mesmo gravador, no canto
    expect(ler('src/pages/nova.astro')).toContain('<Gravador transcricaoAutomatica={transcricaoAutomatica}');
    expect(ler('src/pages/memorias/[id]/relato.astro')).toContain('<CaixaDoRelato proposta={proposta} transcricaoAutomatica={transcricaoAutomatica}');
    expect(ler('src/components/formularios/CaixaDoRelato.astro')).toContain('<button type="button" class="gravador__botao" data-gravar aria-label="Gravar áudio">');
    expect(peca).toContain('<button type="button" class="gravador__botao" data-gravar aria-label="Gravar áudio">');
    expect(peca.indexOf('data-gravador')).toBeLessThan(peca.indexOf('Anexar um áudio do celular'));
    expect(peca).not.toMatch(/botao botao--leve/);
  });
  it('gravando, "Cancelar" descarta sem guardar e fica longe da borda, antes do quadrado de parar', () => {
    expect(peca.indexOf('data-cancelar-gravacao')).toBeLessThan(peca.indexOf('data-gravar'));
    expect(cliente).toMatch(/if \(cancelada\) return avisar\('Gravação cancelada\. Nada foi guardado\.'\);/);
    expect(css).toMatch(/\.gravador__cancelar \{[^}]*padding: 0 var\(--e-3\);/);
  });
  it('cada áudio é um balão com tocar e a duração, e a transcrição, a ordem e "Remover" embaixo', () => {
    for (const marca of ['data-tocar', 'data-andou', 'data-abre-transcricao', 'data-subir', 'data-descer', 'data-remover-audio', 'data-transcricao']) expect(cliente).toContain(marca);
    expect(cliente).toContain("setAttribute('aria-label', `Ouvir o áudio ${i + 1}`)");
  });
});
