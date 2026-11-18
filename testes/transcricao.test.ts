// Transcrição automática dos áudios (onda 2, decisão do Gui de 17/11/2026): Whisper no Workers AI, só se
// couber na cota gratuita. Fica pronta e desligada: sem o binding "AI" no wrangler.jsonc e sem o ajuste
// ligado, nada roda. Um teto por dia mantém o uso bem abaixo da cota. A transcrição entra como rascunho.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  COTA_GRATUITA_POR_DIA,
  NEURONIOS_POR_MINUTO,
  TETO_DE_MINUTOS_POR_DIA,
  cabeNoTeto,
  chaveDoUso,
  minutosDoAudio,
  situacaoDaTranscricao,
  textoDaTranscricao,
} from '../src/lib/transcricao';

describe('a transcrição automática', () => {
  it('o teto do dia fica bem abaixo da cota gratuita do Workers AI', () => {
    expect(TETO_DE_MINUTOS_POR_DIA * NEURONIOS_POR_MINUTO).toBeLessThan(COTA_GRATUITA_POR_DIA * 0.75);
    expect(cabeNoTeto(140, 10)).toBe(true);
    expect(cabeNoTeto(145, 10)).toBe(false);
  });
  it('conta os minutos pela duração ou, sem ela, pelo tamanho, sempre para cima', () => {
    expect(minutosDoAudio(61, 0)).toBe(2);
    expect(minutosDoAudio(null, 240_000)).toBe(1);
    expect(minutosDoAudio(null, 2_400_000)).toBe(10);
    expect(chaveDoUso(new Date('2026-11-18T10:00:00Z'))).toBe('transcricao-uso-2026-11-18');
  });
  it('só fica ligada com o binding e o ajuste', () => {
    expect(situacaoDaTranscricao(false, true)).toBe('sem-binding');
    expect(situacaoDaTranscricao(true, false)).toBe('desligada');
    expect(situacaoDaTranscricao(true, true)).toBe('ligada');
    expect(textoDaTranscricao({ text: '  oi,   tudo bem ' })).toBe('oi, tudo bem');
    expect(textoDaTranscricao(null)).toBe('');
  });
  // Resposta do Gui à sessão F (18/11/2026): o binding entra, na produção e nas prévias; a transcrição
  // continua desligada até um administrador ligar em Administração, primeiro na homologação
  it('o Workers AI está ligado no wrangler.jsonc, na produção e nas prévias', () => {
    const wrangler = readFileSync('wrangler.jsonc', 'utf-8').replace(/\/\/.*$/gm, '');
    expect(wrangler.match(/"ai": \{ "binding": "AI" \}/g)).toHaveLength(2);
  });
  it('a transcrição nasce desligada: só o ajuste de Administração liga', () => {
    expect(situacaoDaTranscricao(true, false)).toBe('desligada');
  });
  it('a rota confere que está ligada, o teto do dia e quem pode transcrever, e o texto só volta ao formulário', () => {
    const rota = readFileSync('src/pages/api/transcricao.ts', 'utf-8');
    expect(rota).toMatch(/situacaoDaTranscricaoAgora\(\)\) !== 'ligada'/);
    expect(rota).toContain('cabeNoTeto(usados, minutos)');
    expect(rota).toContain('audioParaTranscrever(id, locals.usuario)');
    // Não grava a transcrição: ela volta como rascunho para a caixa do formulário
    expect(rota).not.toMatch(/UPDATE audios|ligarAudios/);
  });
});
