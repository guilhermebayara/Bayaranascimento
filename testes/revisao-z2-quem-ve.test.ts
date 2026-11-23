// Revisão Z2, ponto 15: nenhuma regra de quem vê o quê mudou com a Sessão Z. A matriz abaixo (cada pessoa,
// o que ela vê e o que pode corrigir, no acervo de exemplo) foi tirada com este mesmo arquivo na homologa
// (f25696a) e na branch da Z (9d5b233), em 23/11/2026, e as duas saíram iguais, byte a byte.
// Com Z2_MATRIZ=<arquivo>, o teste grava a matriz nesse arquivo, para comparar duas branches.
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';

// O projeto não tem os tipos do Node: o módulo entra assim para o tsc não acusar o import (como em apoio/d1.ts)
const NODE_FS = 'node:fs';
const { writeFileSync } = (await import(/* @vite-ignore */ NODE_FS)) as { writeFileSync(caminho: string, texto: string): void };

const comSqlite = await temSqlite();
const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };
const destino = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.Z2_MATRIZ;

describe.skipIf(!comSqlite)('Z2, ponto 15: quem vê o quê no acervo de exemplo', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  await (await import('../src/lib/servidor/banco')).prepararBanco();
  const repo = await import('../src/lib/servidor/repositorio');
  const permissoes = await import('../src/lib/servidor/permissoes');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const linhas = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).all(...valores) as T[];
  const usuarioDe = (pessoa: string): Usuario => ({
    pessoa,
    nome: pessoa,
    admin: Boolean(linhas<{ admin: number }>('SELECT admin FROM integrantes WHERE id = ?', pessoa)[0].admin),
    nucleos: linhas<{ n: string }>(`SELECT nucleo_id AS n FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((l) => l.n),
  });
  // Quem tem acesso nas prévias e gente das outras famílias, para as regras valerem com qualquer pessoa
  const pessoas = ['gui', 'giovanna', 'elizete', 'lucas-magno', 'lucio', 'regina', 'ana-candida'].map(usuarioDe);
  const todas = linhas<{ id: string }>('SELECT id FROM memorias ORDER BY id').map((m) => m.id);

  async function matriz() {
    const saida: Record<string, unknown> = {};
    for (const u of pessoas) {
      const memorias: Record<string, unknown> = {};
      const listadas = new Set((await repo.listarMemorias(u)).map((m) => m.id));
      for (const id of todas) {
        const m = await repo.obterMemoria(u, id);
        if (!m) {
          if (listadas.has(id)) memorias[id] = 'listada sem abrir';
          continue;
        }
        const relatos = await repo.listarRelatos(u, id);
        const audios = await repo.listarAudiosDosRelatos(relatos.map((r) => r.id));
        memorias[id] = {
          listada: listadas.has(id),
          situacao: m.situacao,
          publico: permissoes.chaveDoPublico(m),
          corrige: permissoes.alcanceDaCorrecao(u, m),
          mudaQuemVe: permissoes.podeMudarQuemVe(u, m, m.visibilidade, m.nucleos).ok,
          exclui: permissoes.podeExcluirMemoria(u, m).ok,
          integrantes: [...m.integrantes].sort(),
          fotos: m.fotos.map((f) => f.id),
          relatos: relatos.map((r) => [r.id, r.por, r.situacao, r.soParaNucleos ?? null]),
          audios: [...audios.values()].flat().map((a) => a.id).sort((a, b) => a - b),
        };
      }
      saida[u.pessoa] = {
        integrantes: (await repo.listarIntegrantesQueVe(u)).map((i) => i.id).sort(),
        temas: (await repo.listarTemasVisiveis(u)).map((t) => t.id).sort(),
        capitulos: (await repo.listarCapitulos(u)).map((c) => c.id).sort(),
        memorias,
      };
    }
    return saida;
  }

  it('a matriz sai inteira, e as regras de sempre valem nela', async () => {
    const feita = (await matriz()) as Record<string, { integrantes: string[]; memorias: Record<string, { situacao: string; publico: string; corrige: string | null; listada: boolean }> }>;
    if (destino) writeFileSync(destino, JSON.stringify(feita, null, 1));
    expect(Object.keys(feita)).toHaveLength(pessoas.length);
    for (const u of pessoas) {
      const vistas = Object.entries(feita[u.pessoa].memorias);
      expect(vistas.length, u.pessoa).toBeGreaterThan(10);
      for (const [id, m] of vistas) {
        // Ninguém vê o rascunho de outra pessoa nem a memória restrita a uma família que não é a sua
        if (m.situacao === 'rascunho') expect(linhas<{ c: string }>('SELECT criada_por AS c FROM memorias WHERE id = ?', id)[0].c, `${u.pessoa}: ${id}`).toBe(u.pessoa);
        if (m.publico !== 'todos') expect(m.publico.replace('nucleos:', '').split(',').some((n) => u.nucleos.includes(n)), `${u.pessoa}: ${id}`).toBe(true);
        // O administrador não tem visão especial: só corrige o que vê
        expect(typeof m.listada).toBe('boolean');
      }
    }
    // A pessoa do laço "só eu vejo" da Giovanna só aparece para ela
    for (const u of pessoas) expect(feita[u.pessoa].integrantes.includes('ex-marina'), u.pessoa).toBe(u.pessoa === 'giovanna');
  });
});
