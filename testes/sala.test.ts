// A TV da sala e o modo TV lendo uma memória só (aplicação da E1 e causa 6 da medição M1). Adaptado do teste
// da exploração (tst-ver-junto), com os casos da aplicação: as datas no fuso de São Paulo, o simulador de
// data recusado na produção, a ordem com filtros e com a regra da sala, a rota de uma memória, a voz, as
// contagens do alto da sala e a carta da sala sem gravar visita. Os casos de banco rodam sobre o SQLite em
// memória com o acervo de exemplo semeado pelas próprias migrações (testes/apoio/d1.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { temSqlite, type D1DeTeste } from './apoio/d1';
import {
  diaSimulado,
  ehDiaDaSala,
  ehDiaDaSalaEm,
  entraNaSala,
  esperaDaMemoria,
  idValido,
  linhaDoAlto,
  nomeDeNatal,
  ordemDaTv,
  paragrafosDaCarta,
  passoDaCarta,
  posicaoNaOrdem,
  quemAssina,
  relatoDaVez,
  relatoNaTv,
  segundosDoParagrafo,
  tempoDaVoz,
  vizinhasNaOrdem,
} from '../src/lib/sala';
import { problemasDoSimuladorDeData } from '../scripts/simulador-de-data.mjs';

const ler = (caminho: string) => readFileSync(new URL(`../${caminho}`, import.meta.url), 'utf8');
const comSqlite = await temSqlite();

const env = vi.hoisted(() => ({ AMBIENTE: 'previa' as string, DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));
env.FOTOS = { list: async () => ({ objects: [], truncated: false }), delete: async () => undefined, put: async () => undefined, get: async () => null, head: async () => null };

const relato = (id: number, mais: Partial<{ texto: string; situacao: 'rascunho' | 'publicada'; soParaNucleos: string[] | null; descartadoEm: string | null }> = {}) => ({
  id,
  texto: `relato ${id}`,
  situacao: 'publicada' as const,
  soParaNucleos: null,
  ...mais,
});

describe('na sala, só o que é aberto a toda a família', () => {
  it('a memória entra só publicada e aberta a todos', () => {
    expect(entraNaSala({ situacao: 'publicada', visibilidade: 'todos' })).toBe(true);
    expect(entraNaSala({ situacao: 'publicada', visibilidade: 'nucleos' })).toBe(false);
    expect(entraNaSala({ situacao: 'rascunho', visibilidade: 'todos' })).toBe(false);
  });
  it('o relato que espera, o rascunho e o descartado nunca vão à TV, nem a voz deles', () => {
    expect(relatoNaTv(relato(1))).toBe(true);
    expect(relatoNaTv(relato(2, { soParaNucleos: ['bayara'] }))).toBe(false);
    expect(relatoNaTv(relato(3, { situacao: 'rascunho' }))).toBe(false);
    expect(relatoNaTv(relato(4, { descartadoEm: '2026-11-20' }))).toBe(false);
    // O relato com voz vem antes; o que espera, mesmo com voz, não vem
    const comVoz = new Set([2, 5]);
    expect(relatoDaVez([relato(1), relato(2, { soParaNucleos: ['bayara'] }), relato(5)], comVoz)?.id).toBe(5);
    expect(relatoDaVez([relato(2, { soParaNucleos: ['bayara'] }), relato(3, { situacao: 'rascunho' })], comVoz)).toBeUndefined();
    // Sem voz, o primeiro com texto
    expect(relatoDaVez([relato(1, { texto: '  ' }), relato(6)], new Set())?.id).toBe(6);
  });
});

describe('os dias da porta, no fuso de São Paulo', () => {
  it('de 24 a 26 de dezembro', () => {
    expect([23, 24, 25, 26, 27].map((dia) => ehDiaDaSala({ mes: 12, dia }))).toEqual([false, true, true, true, false]);
    expect(ehDiaDaSala({ mes: 11, dia: 25 })).toBe(false);
  });
  it('o dia é o de São Paulo, e não o do servidor em UTC', () => {
    // 24/12 às 1h em UTC ainda é 23/12 em São Paulo; 27/12 às 2h em UTC ainda é 26/12
    expect(ehDiaDaSalaEm(new Date('2026-12-24T01:00:00Z'))).toBe(false);
    expect(ehDiaDaSalaEm(new Date('2026-12-24T03:30:00Z'))).toBe(true);
    expect(ehDiaDaSalaEm(new Date('2026-12-27T02:00:00Z'))).toBe(true);
    expect(ehDiaDaSalaEm(new Date('2026-12-27T03:30:00Z'))).toBe(false);
  });
});

describe('o simulador de data nunca vale na produção', () => {
  it('responde nas prévias, no computador e na homologação; na produção, com qualquer valor, não', () => {
    expect(diaSimulado('2026-12-25', 'previa')).toEqual({ ano: 2026, mes: 12, dia: 25 });
    expect(diaSimulado('2026-12-25', 'homologa')).toEqual({ ano: 2026, mes: 12, dia: 25 });
    expect(diaSimulado('2026-12-25', 'desenvolvimento')).toEqual({ ano: 2026, mes: 12, dia: 25 });
    for (const valor of ['2026-12-25', '2026-12-24', ' 2026-12-25', '2026-13-40']) expect(diaSimulado(valor, 'producao')).toBeUndefined();
    expect(diaSimulado('2026-12-25', 'outro')).toBeUndefined();
    expect(diaSimulado('25/12/2026', 'previa')).toBeUndefined();
    expect(diaSimulado(null, 'previa')).toBeUndefined();
  });
  it('a guarda (regra 14) passa no código de hoje e recusa cada jeito de abrir o simulador na produção', () => {
    const arquivos = new Map<string, string>([
      ['src/lib/sala.ts', ler('src/lib/sala.ts')],
      ['src/lib/servidor/dia-do-pedido.ts', ler('src/lib/servidor/dia-do-pedido.ts')],
      ['src/pages/index.astro', ler('src/pages/index.astro')],
    ]);
    const guarda = (troca: Record<string, string> = {}) => {
      const lidos = new Map([...arquivos, ...Object.entries(troca)]);
      return problemasDoSimuladorDeData((c: string) => lidos.get(c) ?? '', [...lidos.keys()]);
    };
    expect(guarda()).toEqual([]);
    // Sem a recusa da produção no começo de diaSimulado
    expect(guarda({ 'src/lib/sala.ts': arquivos.get('src/lib/sala.ts')!.replace("if (ambiente === 'producao') return undefined;", '') })).toHaveLength(1);
    // Com o ambiente fixo no lugar do ambiente do pedido
    expect(guarda({ 'src/lib/servidor/dia-do-pedido.ts': arquivos.get('src/lib/servidor/dia-do-pedido.ts')!.replace('ambiente())', "'previa')") })).toHaveLength(1);
    // Outra página lendo o "hoje" do endereço por fora
    expect(guarda({ 'src/pages/outra.astro': "const dia = Astro.url.searchParams.get('hoje');" })).toHaveLength(1);
    expect(guarda({ 'src/pages/outra.astro': "diaSimulado(x, 'previa')" })).toHaveLength(1);
  });
  it('o Início usa o simulador do pedido, e não lê o "hoje" do endereço por conta própria', () => {
    const inicio = ler('src/pages/index.astro');
    expect(inicio).toMatch(/const hoje = diaSimuladoDoPedido\(Astro\.url\) \?\? hojeNoBrasil\(agora\);/);
    expect(inicio).toMatch(/const diaDaSala = ehDiaDaSala\(hoje\);/);
    expect(inicio).toMatch(/!cartaNoAlto && diaDaSala && <PortaDaSala natais=\{sala\.natais\} todas=\{sala\.todas\} \/>/);
    expect(ler('scripts/confere-producao.mjs')).toMatch(/problemasDoSimuladorDeData\(/);
  });
});

describe('a ordem do modo TV', () => {
  it('a carta vem na frente, um passo por parágrafo, e a posição conta só as memórias', () => {
    const ordem = ordemDaTv(['a1', 'b2', 'c3'], 2);
    expect(ordem).toEqual(['carta-1', 'carta-2', 'a1', 'b2', 'c3']);
    expect(passoDaCarta('carta-2')).toBe(2);
    expect(passoDaCarta('carta-0')).toBeUndefined();
    expect(passoDaCarta('1994-natal-na-vo-vivica')).toBeUndefined();
    expect(posicaoNaOrdem(ordem, 'b2')).toEqual({ posicao: 2, de: 3 });
    expect(posicaoNaOrdem(ordem, 'carta-1')).toBeUndefined();
    expect(posicaoNaOrdem(ordem, 'zz')).toBeUndefined();
  });
  it('as vizinhas: a última volta à primeira só com "Passar sozinho"', () => {
    const ordem = ['a1', 'b2', 'c3'];
    expect(vizinhasNaOrdem(ordem, 'b2', false)).toEqual({ indice: 1, antes: 'a1', depois: 'c3' });
    expect(vizinhasNaOrdem(ordem, 'c3', false)).toEqual({ indice: 2, antes: 'b2', depois: undefined });
    expect(vizinhasNaOrdem(ordem, 'c3', true)).toEqual({ indice: 2, antes: 'b2', depois: 'a1' });
    expect(vizinhasNaOrdem(['a1'], 'a1', true)).toEqual({ indice: 0, antes: undefined, depois: undefined });
    expect(vizinhasNaOrdem(ordem, 'zz', true).indice).toBe(-1);
  });
  it('a linha do alto: na sala, diz o que entra; fora, a de sempre', () => {
    expect(linhaDoAlto({ sala: true, posicao: 3, de: 48 })).toBe('3 de 48 · só o que é aberto a toda a família');
    expect(linhaDoAlto({ sala: true, carta: true })).toBe('A carta · só o que é aberto a toda a família');
    expect(linhaDoAlto({ sala: false, posicao: 3, de: 48 })).toBe('3 de 48');
  });
  it('a rota só aceita ids do jeito dos do acervo', () => {
    expect(['1994-natal-na-vo-vivica', 'k7mq2xab', 'carta-1'].every(idValido)).toBe(true);
    expect(['', 'A', '../x', 'a b', '<x>', 'x'.repeat(101)].some(idValido)).toBe(false);
  });
});

describe('a carta e a voz na TV', () => {
  it('a carta: os parágrafos, quem assina, o tempo de ler e a saudação da sala', () => {
    expect(paragrafosDaCarta('Um.\n\nDois.\n  \nTrês.')).toEqual(['Um.', 'Dois.', 'Três.']);
    expect(quemAssina('Gui, Giovanna e Magno')).toEqual(['Gui', 'Giovanna', 'Magno']);
    expect(segundosDoParagrafo('x'.repeat(18))).toBe(7);
    expect(segundosDoParagrafo('x'.repeat(2000))).toBe(30);
    expect(ler('src/lib/sala.ts')).toMatch(/SAUDACAO_DA_SALA = 'Oi, família,'/);
  });
  it('"Passar sozinho" espera a voz acabar e mais três segundos', () => {
    expect(esperaDaMemoria(10, null)).toBe(10);
    expect(esperaDaMemoria(10, 4)).toBe(10);
    expect(esperaDaMemoria(10, 11.2)).toBe(15);
    expect(tempoDaVoz(11.4)).toBe('0:11');
    expect(tempoDaVoz(75)).toBe('1:15');
  });
  it('o tema de Natal pelo nome', () => {
    expect(['Natal', 'natais', 'NATAL '].every(nomeDeNatal)).toBe(true);
    expect(['Natais na Vó Vivica', 'Festas'].some(nomeDeNatal)).toBe(false);
  });
  it('ver a carta na TV não conta como a primeira vez de ninguém: nada do modo TV grava visita', () => {
    for (const arquivo of ['src/pages/explorar.astro', 'src/pages/explorar/palco.astro', 'src/lib/servidor/tv.ts', 'src/components/explorar/CartaNaTv.astro', 'src/components/explorar/PalcoDaTv.astro']) {
      expect(ler(arquivo), arquivo).not.toMatch(/salvarVisitas|chegarAoPainel/);
    }
  });
  it('o tema e a pessoa abrem o modo TV com o filtro que o Explorar já aceita, como o capítulo, sem marcador da sala', () => {
    expect(ler('src/pages/temas/[id].astro')).toMatch(/href=\{`\/explorar\?tema=\$\{tema\.id\}&ver=tv`\}>\s*Passar no modo TV/);
    expect(ler('src/pages/pessoas/[id]/index.astro')).toMatch(/href=\{`\/explorar\?pessoa=\$\{pessoa\.id\}&ver=tv`\}>\s*Passar no modo TV/);
    for (const arquivo of ['src/pages/temas/[id].astro', 'src/pages/pessoas/[id]/index.astro']) expect(ler(arquivo), arquivo).not.toMatch(/sala=1/);
  });
  it('"Ouvir as vozes" só existe na carta da sala, e liga o mesmo som do símbolo da barra', () => {
    const fontes = ['src/pages/explorar.astro', 'src/pages/explorar/palco.astro', 'src/pages/index.astro', 'src/pages/carta.astro', 'src/components/explorar/PalcoDaTv.astro', 'src/components/explorar/Palco.astro', 'src/lib/servidor/tv.ts'];
    for (const arquivo of fontes) expect(ler(arquivo), arquivo).not.toMatch(/Ouvir as vozes/);
    expect(ler('src/components/explorar/CartaNaTv.astro')).toMatch(/data-palco-vozes data-ligar="Ouvir as vozes" data-desligar="Desligar as vozes" hidden>/);
    // A carta só é desenhada quando palcoDaTv a montou, e ela só existe com o marcador da sala (caso de banco abaixo)
    expect(ler('src/components/explorar/PalcoDaTv.astro')).toMatch(/\{palco\.carta && <CartaNaTv /);
    const palco = ler('src/components/explorar/Palco.astro');
    // O toque passa pelo mesmo alternarSom do símbolo: a mesma escolha guardada no aparelho, o mesmo destravar
    expect(palco).toMatch(/closest\('\[data-palco\] \[data-palco-vozes\]'\) \? palco\(\)\?\.querySelector<HTMLElement>\('\[data-palco-som\]'\) : null;\s*if \(barra\) return alternarSom\(barra\);/);
    expect(palco).toMatch(/guardar\('tv-som', somLigado \? '1' : '0'\)/);
  });
  it('a rota de uma memória responde igual para tudo o que não entra, e só desenha o que palcoDaTv decidiu', () => {
    const rota = ler('src/pages/explorar/palco.astro');
    expect(rota).toMatch(/export const partial = true;/);
    expect(rota).toMatch(/if \(!palco\) return new Response\('Não encontrada\.', \{ status: 404/);
    expect(rota).not.toMatch(/listarMemorias|obterMemoria|listarRelatos/);
  });
});

describe.skipIf(!comSqlite)('o modo TV no banco: a ordem, a rota de uma memória e a regra da sala', async () => {
  const { criarD1 } = await import('./apoio/d1');
  const banco: D1DeTeste = await criarD1();
  env.DB = banco;
  const { prepararBanco } = await import('../src/lib/servidor/banco');
  await prepararBanco();
  const { ordemDoModoTv, palcoDaTv, enderecosDaSala, VISITANTE_DA_SALA } = await import('../src/lib/servidor/tv');
  const repo = await import('../src/lib/servidor/repositorio');
  type Usuario = import('../src/lib/servidor/permissoes').Usuario;
  const sql = (texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).run(...valores);
  const uma = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).get(...valores) as T;
  const todas = <T>(texto: string, ...valores: (string | number | null)[]) => banco.sqlite.prepare(texto).all(...valores) as T[];
  const usuarioDe = (pessoa: string): Usuario => {
    const i = uma<{ nome: string; admin: number }>('SELECT nome, admin FROM integrantes WHERE id = ?', pessoa);
    const nucleos = todas<{ nucleo_id: string }>(`SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'`, pessoa).map((n) => n.nucleo_id);
    return { pessoa, nome: i.nome, admin: Boolean(i.admin), nucleos };
  };
  const tipos = await repo.listarTipos();
  const giovanna = usuarioDe('giovanna');
  const elizete = usuarioDe('elizete');
  const p = (texto: string) => new URLSearchParams(texto);
  const CEIA = '2024-ceia-so-nossa';
  const restritas = new Set(todas<{ id: string }>(`SELECT id FROM memorias WHERE visibilidade = 'nucleos'`).map((m) => m.id));

  it('a Ceia restrita existe no acervo de exemplo e a Giovanna a vê no Explorar e no modo TV fora da sala', async () => {
    expect(uma<{ visibilidade: string }>('SELECT visibilidade FROM memorias WHERE id = ?', CEIA).visibilidade).toBe('nucleos');
    const fora = await ordemDoModoTv(giovanna, p('ver=tv&tema=natal&ordem=antigas'), tipos);
    expect(fora.ordem).toContain(CEIA);
    expect(await palcoDaTv({ usuario: giovanna, parametros: p(`ver=tv&m=${CEIA}`) })).toBeDefined();
  });

  it('na sala, a ordem só tem o que é aberto a todos, para qualquer login, e a carta vem na frente', async () => {
    const entrada = new URL((await enderecosDaSala()).natais, 'http://x').searchParams;
    expect(entrada.get('sala')).toBe('1');
    expect(entrada.get('tema')).toBe('natal');
    expect(entrada.get('ordem')).toBe('antigas');
    for (const quem of ['gui', 'giovanna', 'elizete', 'lucas-magno']) {
      const naSala = await ordemDoModoTv(usuarioDe(quem), entrada, tipos);
      expect(naSala.ordem.slice(0, naSala.paragrafos.length).every((id) => passoDaCarta(id))).toBe(true);
      const memorias = naSala.ordem.filter((id) => !passoDaCarta(id));
      expect(memorias.length).toBeGreaterThan(0);
      expect(memorias.some((id) => restritas.has(id)), quem).toBe(false);
      expect(naSala.memorias.every((m) => m.visibilidade === 'todos' && m.situacao === 'publicada')).toBe(true);
      // Das mais antigas para as mais novas
      expect(naSala.memorias.map((m) => m.ano)).toEqual([...naSala.memorias.map((m) => m.ano)].sort((a, b) => a - b));
    }
    // "Todas as memórias": a mesma ordem para todo mundo
    const ordens = await Promise.all(['gui', 'giovanna', 'elizete'].map(async (quem) => (await ordemDoModoTv(usuarioDe(quem), p('ver=tv&sala=1'), tipos)).ordem.join()));
    expect(new Set(ordens).size).toBe(1);
  });

  it('as contagens do alto da sala contam só o que entra', async () => {
    const naSala = await ordemDoModoTv(giovanna, p('ver=tv&sala=1'), tipos);
    const abertas = todas<{ n: number }>(`SELECT COUNT(*) AS n FROM memorias WHERE visibilidade = 'todos' AND situacao = 'publicada' AND excluida_em IS NULL`)[0]!.n;
    expect(naSala.ordem).toHaveLength(abertas);
    const id = naSala.ordem[2]!;
    const palco = await palcoDaTv({ usuario: giovanna, parametros: p(`ver=tv&sala=1&m=${id}`), posicao: posicaoNaOrdem(naSala.ordem, id) });
    expect(palco?.linha).toBe(`3 de ${abertas} · só o que é aberto a toda a família`);
    // Fora da sala, a Giovanna vê mais (as restritas à família dela)
    expect((await ordemDoModoTv(giovanna, p('ver=tv'), tipos)).ordem.length).toBeGreaterThan(abertas);
  });

  it('fora do Natal, o modo TV segue os filtros de onde foi aberto: as mesmas memórias da linha do tempo, publicadas', async () => {
    const { explorar, lerFiltros } = await import('../src/lib/explorar');
    const { contextoDoExplorar } = await import('../src/lib/servidor/explorar');
    for (const busca of ['nucleo=bracarense', 'tema=natal', 'capitulo=natais', 'ordem=antigas', 'tipo=festa', '']) {
      const memorias = await repo.listarMemorias(elizete);
      const linha = explorar(memorias, lerFiltros(p(busca)), await contextoDoExplorar(elizete, memorias)).memorias.filter((m) => m.situacao === 'publicada');
      expect((await ordemDoModoTv(elizete, p(`ver=tv&${busca}`), tipos)).ordem, busca).toEqual(linha.map((m) => m.id));
    }
    expect((await ordemDoModoTv(elizete, p('ver=tv&nucleo=bracarense'), tipos)).ordem.length).toBeLessThan((await ordemDoModoTv(elizete, p('ver=tv'), tipos)).ordem.length);
  });

  it('a rota de uma memória: a restrita pedida na sala é recusada, mesmo por quem a vê', async () => {
    expect(await palcoDaTv({ usuario: giovanna, parametros: p(`ver=tv&sala=1&m=${CEIA}`) })).toBeUndefined();
    // Recusada igual a uma memória que não existe
    expect(await palcoDaTv({ usuario: giovanna, parametros: p('ver=tv&sala=1&m=nao-existe') })).toBeUndefined();
  });

  it('a rota de uma memória: a de outra família, fora da sala, é recusada para quem não a vê', async () => {
    expect(elizete.nucleos).not.toContain('bayara-bracarense');
    expect(await palcoDaTv({ usuario: elizete, parametros: p(`ver=tv&m=${CEIA}`) })).toBeUndefined();
    expect((await ordemDoModoTv(elizete, p('ver=tv'), tipos)).ordem).not.toContain(CEIA);
  });

  it('a rota de uma memória: o rascunho e a memória na lixeira são recusados', async () => {
    const rascunho = uma<{ id: string; criada_por: string } | undefined>(`SELECT id, criada_por FROM memorias WHERE situacao = 'rascunho' LIMIT 1`);
    expect(rascunho).toBeDefined();
    expect(await palcoDaTv({ usuario: usuarioDe(rascunho!.criada_por), parametros: p(`ver=tv&m=${rascunho!.id}`) })).toBeUndefined();
    const aberta = (await ordemDoModoTv(elizete, p('ver=tv&sala=1'), tipos)).ordem[0]!;
    expect(await palcoDaTv({ usuario: elizete, parametros: p(`ver=tv&m=${aberta}`) })).toBeDefined();
    sql(`UPDATE memorias SET excluida_em = datetime('now'), excluida_por = 'gui' WHERE id = ?`, aberta);
    try {
      expect(await palcoDaTv({ usuario: elizete, parametros: p(`ver=tv&m=${aberta}`) })).toBeUndefined();
      expect(await palcoDaTv({ usuario: elizete, parametros: p(`ver=tv&sala=1&m=${aberta}`) })).toBeUndefined();
      expect((await ordemDoModoTv(elizete, p('ver=tv&sala=1'), tipos)).ordem).not.toContain(aberta);
    } finally {
      sql('UPDATE memorias SET excluida_em = NULL, excluida_por = NULL WHERE id = ?', aberta);
    }
  });

  it('a voz: sai de relato publicado com áudio, e o relato que espera não toca, nem o áudio dele', async () => {
    const comAudio = uma<{ memoria_id: string; relato_id: number }>(
      `SELECT r.memoria_id, r.id AS relato_id FROM audios a JOIN relatos r ON r.id = a.relato_id JOIN memorias m ON m.id = r.memoria_id
       WHERE a.removido_em IS NULL AND r.situacao = 'publicada' AND m.visibilidade = 'todos' LIMIT 1`,
    );
    const palco = await palcoDaTv({ usuario: elizete, parametros: p(`ver=tv&m=${comAudio.memoria_id}`) });
    expect(palco?.voz?.audios.length).toBeGreaterThan(0);
    expect(palco?.voz?.audios[0]!.src).toMatch(/^\/audios\//);
    // O relato passa a esperar o sim de quem registrou, só para uma família da Elizete: ela ainda o vê na
    // memória, mas na TV ele não vai, nem o texto nem a voz, na sala ou fora dela
    sql('UPDATE relatos SET so_para_nucleos = ? WHERE id = ?', JSON.stringify(elizete.nucleos), comAudio.relato_id);
    try {
      const relatos = await repo.listarRelatos(elizete, comAudio.memoria_id);
      expect(relatos.some((r) => r.id === comAudio.relato_id)).toBe(true);
      for (const parametros of [p(`ver=tv&m=${comAudio.memoria_id}`), p(`ver=tv&sala=1&m=${comAudio.memoria_id}`)]) {
        const depois = await palcoDaTv({ usuario: elizete, parametros });
        const chaves = todas<{ chave: string }>('SELECT chave FROM audios WHERE relato_id = ?', comAudio.relato_id).map((a) => `/audios/${a.chave}`);
        expect(depois?.voz?.audios.some((a) => chaves.includes(a.src)) ?? false).toBe(false);
      }
    } finally {
      sql('UPDATE relatos SET so_para_nucleos = NULL WHERE id = ?', comAudio.relato_id);
    }
  });

  it('a voz e o trecho na sala: memória restrita não tem palco, e o visitante não vê rascunho de relato', async () => {
    expect(await repo.listarMemorias(VISITANTE_DA_SALA as Usuario)).not.toContainEqual(expect.objectContaining({ id: CEIA }));
    expect((await repo.listarMemorias(VISITANTE_DA_SALA as Usuario, { comRascunhos: true })).every((m) => m.situacao === 'publicada' && m.visibilidade === 'todos')).toBe(true);
  });

  it('a carta da sala: um parágrafo por vez, as fotos só de memórias abertas a todos, sem gravar visita', async () => {
    const entrada = new URL((await enderecosDaSala()).natais, 'http://x').searchParams;
    const visitasAntes = todas<Record<string, unknown>>('SELECT * FROM visitas');
    const naSala = await ordemDoModoTv(giovanna, entrada, tipos);
    const primeiro = await palcoDaTv({ usuario: giovanna, parametros: entrada, depois: naSala.ordem[1] });
    expect(primeiro?.carta?.saudacao).toBe('Oi, família,');
    expect(primeiro?.carta?.numero).toBe(1);
    expect(primeiro?.linha).toBe('A carta · só o que é aberto a toda a família');
    expect(primeiro?.carta?.fotos.every((f) => !restritas.has(f.id))).toBe(true);
    const ultimo = await palcoDaTv({ usuario: giovanna, parametros: p(`${entrada}`.replace('m=carta-1', `m=carta-${naSala.paragrafos.length}`)) });
    expect(ultimo?.carta?.assinam.length).toBeGreaterThan(0);
    expect(ultimo?.carta?.fotos).toEqual([]);
    expect(todas<Record<string, unknown>>('SELECT * FROM visitas')).toEqual(visitasAntes);
    // A carta só existe na porta da sala, e não depois do último parágrafo
    expect(await palcoDaTv({ usuario: giovanna, parametros: p('ver=tv&m=carta-1') })).toBeUndefined();
    expect(await palcoDaTv({ usuario: giovanna, parametros: p(`ver=tv&sala=1&carta=1&m=carta-${naSala.paragrafos.length + 1}`) })).toBeUndefined();
  });

  it('o modo TV a partir do tema e da pessoa: as mesmas memórias publicadas da página, para cada login, e nada que o login não veja', async () => {
    const { montarPaginaDaPessoa } = await import('../src/lib/servidor/pagina-da-pessoa');
    const lucas = usuarioDe('lucas-magno');
    // A Giovanna, o Lucas Magno e a Elizete veem famílias diferentes; a Giovanna está na Ceia restrita
    for (const quem of [giovanna, elizete, lucas]) {
      const ve = new Set((await repo.listarMemorias(quem)).map((m) => m.id));
      for (const tema of ['natal', ...(await repo.listarTemasVisiveis(quem)).map((t) => t.id).slice(0, 3)]) {
        const ordem = (await ordemDoModoTv(quem, p(`ver=tv&tema=${tema}`), tipos)).ordem;
        const pagina = (await repo.listarMemorias(quem, { tema })).filter((m) => m.situacao === 'publicada').map((m) => m.id);
        expect(new Set(ordem), `${quem.pessoa} · ${tema}`).toEqual(new Set(pagina));
        expect(ordem.every((id) => ve.has(id))).toBe(true);
      }
      for (const pessoa of ['giovanna', 'vo-vivica', 'vo-bela', 'chico', 'elizete']) {
        const ordem = (await ordemDoModoTv(quem, p(`ver=tv&pessoa=${pessoa}`), tipos)).ordem;
        const pagina = await montarPaginaDaPessoa(quem, pessoa, false);
        expect(new Set(ordem), `${quem.pessoa} · ${pessoa}`).toEqual(new Set(pagina?.publicadas.map((m) => m.id) ?? []));
        expect(ordem.every((id) => ve.has(id))).toBe(true);
      }
    }
    // A Ceia restrita entra no modo TV da Giovanna a partir da página dela, e não no da Elizete
    expect((await ordemDoModoTv(giovanna, p('ver=tv&pessoa=giovanna'), tipos)).ordem).toContain(CEIA);
    expect((await ordemDoModoTv(elizete, p('ver=tv&pessoa=giovanna'), tipos)).ordem).not.toContain(CEIA);
    expect((await ordemDoModoTv(elizete, p('ver=tv&tema=natal'), tipos)).ordem).not.toContain(CEIA);
  });

  it('os nomes de "Com…" na sala são os que todo mundo vê, com o apelido da família', async () => {
    const naSala = await ordemDoModoTv(giovanna, p('ver=tv&sala=1'), tipos);
    const visiveis = new Set((await repo.listarIntegrantesQueVe(VISITANTE_DA_SALA as Usuario)).map((i) => i.apelidoDaFamilia ?? i.nome));
    for (const id of naSala.ordem.slice(0, 15)) {
      const palco = await palcoDaTv({ usuario: giovanna, parametros: p(`ver=tv&sala=1&m=${id}`) });
      for (const nome of palco?.nomes ?? []) expect(visiveis.has(nome), nome).toBe(true);
    }
  });
});
