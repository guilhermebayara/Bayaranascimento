import { describe, expect, it } from 'vitest';
import { comandosDoEspelho, espelhar, IDS_COM_ACESSO, TABELAS_APAGADAS, type CopiaDoAcervo } from '../src/lib/espelho';
import { retratoDeExemplo } from '../src/lib/fotos-de-exemplo';

// Uma cópia pequena, no formato da cópia do acervo. A regra (decisões do Gui, 18/11/2026): nomes, datas e
// laços passam; memórias, relatos, textos, retratos e fotos nunca passam. Nenhum arquivo da produção
// chega à homologação: a cópia abaixo traz ainda os retratos em base64, como a cópia para o espelho da
// sessão G, e o espelho precisa ignorá-los.
const RETRATO_DO_GUI = '0f3c2a1e-0000-4000-8000-00000000aaaa.jpg';
const RETRATO_SEM_ARQUIVO = '0f3c2a1e-0000-4000-8000-00000000bbbb.jpg';
const copia = {
  acervo: 'Bayara Nascimento',
  retratos: { [RETRATO_DO_GUI]: 'AQID' },
  tabelas: {
    integrantes: [
      { id: 'gui', nome: 'Guilherme Real', apelido: 'Gui', tipo: 'pessoa', tratamento: 'ele', nascimento_ano: 1990, nascimento_mes: 4, nascimento_dia: 12, admin: 1, ordem: 1, sobre: 'Texto secreto do Gui', retrato: RETRATO_DO_GUI, foto: 'foto-antiga-secreta.jpg' },
      { id: 'giovanna', nome: 'Giovanna Real', tipo: 'pessoa', tratamento: 'ela', nascimento_ano: 1997, admin: 1, ordem: 2, retrato: RETRATO_SEM_ARQUIVO },
      { id: 'elizete', nome: 'Elizete Real', tipo: 'pessoa', tratamento: 'ela', nascimento_ano: 1960, ordem: 3 },
      { id: 'lucas-magno', nome: 'Magno Real', tipo: 'pessoa', tratamento: 'ele', ordem: 4 },
      { id: 'aguilar', nome: 'Aguilar Real', tipo: 'pessoa', tratamento: 'ele', nascimento_ano: 1958, ordem: 5 },
      { id: 'vo-bela', nome: 'Bela Real', tipo: 'pessoa', tratamento: 'ela', nascimento_ano: 1930, falecimento_ano: 2020, ordem: 6 },
      { id: 'amiga', nome: 'Amiga Real', tipo: 'pessoa', tratamento: 'ela', ordem: 7 },
      { id: 'cachorro', nome: 'Cachorro Real', tipo: 'bicho', especie: 'cachorro', ordem: 8 },
    ],
    nucleo_membros: [
      { nucleo_id: 'bayara-nascimento', integrante_id: 'gui' },
      { nucleo_id: 'bayara-nascimento', integrante_id: 'giovanna' },
      { nucleo_id: 'bayara-bracarense', integrante_id: 'giovanna' },
      { nucleo_id: 'bayara-bracarense', integrante_id: 'lucas-magno' },
      { nucleo_id: 'bayara-nascimento', integrante_id: 'aguilar', papel: 'parente' },
      { nucleo_id: 'bayara-nascimento', integrante_id: 'vo-bela' },
    ],
    lacos_resumidos: [{ a_id: 'amiga', b_id: 'cachorro', papel: 'sobrinho', criado_por: 'gui' }],
    filiacoes: [
      { filho_id: 'gui', responsavel_id: 'elizete', qualidade: 'biologica' },
      { filho_id: 'gui', responsavel_id: 'aguilar', qualidade: 'biologica' },
      { filho_id: 'giovanna', responsavel_id: 'elizete', qualidade: 'biologica' },
      { filho_id: 'giovanna', responsavel_id: 'aguilar', qualidade: 'biologica' },
      { filho_id: 'aguilar', responsavel_id: 'vo-bela', qualidade: 'biologica' },
      { filho_id: 'cachorro', responsavel_id: 'giovanna', qualidade: 'adotiva', adocao_ano: 2010, adocao_mes: 3, adocao_dia: 14 },
      { filho_id: 'cachorro', responsavel_id: 'gui', qualidade: 'consideracao' },
    ],
    casais: [
      { id: 1, a_id: 'aguilar', b_id: 'elizete', visibilidade: 'todos' },
      { id: 2, a_id: 'giovanna', b_id: 'lucas-magno', visibilidade: 'todos' },
    ],
    casal_fases: [
      { casal_id: 1, tipo: 'casamento', inicio_ano: 1988, ordem: 0 },
      { casal_id: 1, tipo: 'separacao', inicio_ano: 2005, ordem: 1 },
      { casal_id: 2, tipo: 'casamento', inicio_ano: 2026, ordem: 0 },
    ],
    lacos_coracao: [{ dono_id: 'gui', pessoa_id: 'amiga', nome: 'Amiga do colégio', papel: 'irmao', proximidade: 1, privado: 1 }],
    // O que nunca passa: tudo o que alguém escreveu ou fotografou
    memorias: [{ id: 'real-1', titulo: 'Memória real secreta' }],
    relatos: [{ memoria_id: 'real-1', texto: 'Relato real secreto' }],
    fotos: [{ memoria_id: 'real-1', chave: 'foto-real-secreta.jpg', legenda: 'Legenda secreta' }],
    audios: [{ relato_id: 1, chave: 'audios/audio-real-secreto.m4a', transcricao: 'Transcrição secreta' }],
    capitulos: [{ id: 'cap-real', titulo: 'Capítulo secreto', texto: 'Abertura secreta' }],
    temas: [{ id: 'tema-real', nome: 'Tema secreto' }],
    versoes: [{ tipo: 'memoria', dados: 'Versão secreta' }],
    cartas: [{ texto: 'Carta secreta' }],
    sugestoes: [{ recado: 'Recado secreto' }],
    proximidades: [{ dono_id: 'gui', pessoa_id: 'amiga', valor: 12 }],
    ex_para_mim: [{ dono_id: 'elizete', pessoa_id: 'aguilar', como: 'fora' }],
  },
} as CopiaDoAcervo;
const agora = new Date('2026-11-15T12:00:00Z');
const e = espelhar(copia, { semente: 42, agora });
const tabela = (nome: string) => e.tabelas.find(([t]) => t === nome)![1];

describe('espelho da produção para a homologação: a família de verdade', () => {
  it('nada que alguém escreveu ou fotografou passa: memórias, relatos, sobre, fotos, áudios, capítulos, cartas', () => {
    const tudo = JSON.stringify(e);
    for (const segredo of ['secret', 'real-1', 'cap-real', 'tema-real', 'Texto secreto']) expect(tudo).not.toContain(segredo);
    for (const i of tabela('integrantes')) expect(i.sobre).toBeNull();
  });
  it('só grava as tabelas da família e das memórias de exemplo', () => {
    expect(e.tabelas.map(([t]) => t).sort()).toEqual(
      ['casais', 'casal_fases', 'casal_nucleos', 'filiacoes', 'fotos', 'integrantes', 'lacos_coracao', 'lacos_resumidos', 'memoria_integrantes', 'memoria_nucleos', 'memorias', 'nucleo_membros', 'relatos'].sort(),
    );
    // As escolhas que só o dono vê não passam, e as que houver na homologação são apagadas
    for (const t of ['proximidades', 'ex_para_mim', 'cartas', 'audios', 'capitulos', 'versoes']) expect(e.tabelas.some(([n]) => n === t)).toBe(false);
    for (const t of ['proximidades', 'ex_para_mim', 'audios', 'capitulos', 'versoes', 'sugestoes', 'reacoes', 'avisos']) expect(TABELAS_APAGADAS).toContain(t);
  });
  it('as pessoas passam como estão: ids, nomes, apelido e datas', () => {
    const gui = tabela('integrantes').find((i) => i.id === 'gui')!;
    expect(gui).toMatchObject({ nome: 'Guilherme Real', apelido: 'Gui', nascimento_ano: 1990, nascimento_mes: 4, nascimento_dia: 12, admin: 1 });
    expect(gui).not.toHaveProperty('foto');
    expect(tabela('integrantes').map((i) => i.id).sort()).toEqual(copia.tabelas.integrantes!.map((i) => i.id).sort());
    const bela = tabela('integrantes').find((i) => i.id === 'vo-bela')!;
    expect(bela).toMatchObject({ nome: 'Bela Real', falecimento_ano: 2020, falecido: 1 });
  });
  it('nenhum arquivo da produção chega à homologação: cada retrato é uma das fotos de exemplo, como nas prévias', () => {
    const pessoas = tabela('integrantes');
    for (const p of pessoas) expect(p.retrato, String(p.id)).toBe(retratoDeExemplo(String(p.id), (p.tratamento as 'ela' | 'ele' | null) ?? null, p.tipo === 'bicho'));
    // Ela é a Karol, ele é o Chico, e quem não informa é um dos dois
    expect(pessoas.find((p) => p.id === 'giovanna')!.retrato).toMatch(/^exemplos\/karol-\d\.jpg$/);
    expect(pessoas.find((p) => p.id === 'gui')!.retrato).toMatch(/^exemplos\/chico-\d\.jpg$/);
    // Nem a chave do retrato de verdade nem o arquivo dele, mesmo quando a cópia os traz
    const tudo = JSON.stringify(e);
    for (const daProducao of [RETRATO_DO_GUI, RETRATO_SEM_ARQUIVO, 'AQID']) expect(tudo).not.toContain(daProducao);
    expect(e).not.toHaveProperty('retratos');
    expect(Object.keys(e)).toEqual(['tabelas', 'resumo']);
  });
  it('as fotos das memórias apontam para as 11 fotos de exemplo, sem nenhuma vazia', () => {
    const fotos = tabela('fotos');
    expect(fotos.length).toBeGreaterThan(0);
    const memorias = new Set(tabela('memorias').map((m) => m.id));
    for (const f of fotos) {
      expect(f.chave).toMatch(/^exemplos\/(chico-[1-5]|karol-[1-6])\.jpg$/);
      expect(memorias.has(f.memoria_id)).toBe(true);
    }
  });
  it('quem tem acesso continua com o mesmo id', () => {
    const ids = tabela('integrantes').map((i) => i.id);
    for (const id of IDS_COM_ACESSO) expect(ids).toContain(id);
  });
  it('os laços passam como estão: filiações, casais, fases, laços do coração e núcleos', () => {
    expect(tabela('filiacoes')).toHaveLength(7);
    expect(tabela('casais')).toHaveLength(2);
    expect(tabela('casal_fases').map((f) => [f.tipo, f.inicio_ano])).toEqual([['casamento', 1988], ['separacao', 2005], ['casamento', 2026]]);
    expect(tabela('nucleo_membros')).toHaveLength(6);
    // A Vó Bela veio de uma cópia sem papel: vira parente, como na migração 013
    expect(tabela('nucleo_membros').filter((m) => m.papel === 'parente').map((m) => m.integrante_id).sort()).toEqual(['aguilar', 'vo-bela']);
    expect(tabela('lacos_resumidos')).toEqual([{ a_id: 'amiga', b_id: 'cachorro', papel: 'sobrinho', criado_por: 'gui' }]);
    expect(tabela('lacos_coracao')).toEqual([{ dono_id: 'gui', pessoa_id: 'amiga', nome: 'Amiga do colégio', papel: 'irmao', proximidade: 1, privado: 1 }]);
    const adocao = tabela('filiacoes').find((f) => f.qualidade === 'adotiva')!;
    expect(adocao).toMatchObject({ adocao_ano: 2010, adocao_mes: 3, adocao_dia: 14 });
  });
  it('as memórias são inventadas e trazem os casos que o QA confere', () => {
    const memorias = tabela('memorias');
    expect(memorias.length).toBeGreaterThan(10);
    expect(memorias.every((m) => String(m.id).startsWith('espelho-') && m.exemplo === 1)).toBe(true);
    expect(memorias.some((m) => m.situacao === 'rascunho' && m.criada_por === 'giovanna')).toBe(true);
    expect(memorias.some((m) => m.excluida_em)).toBe(true);
    expect(tabela('relatos').some((r) => r.situacao === 'rascunho' && r.por === 'elizete')).toBe(true);
  });
  it('a mesma cópia e a mesma semente dão o mesmo espelho', () => {
    expect(espelhar(copia, { semente: 42, agora })).toEqual(e);
  });
  it('recusa um arquivo que não é cópia do acervo', () => {
    expect(() => espelhar({ acervo: 'Outro', tabelas: {} } as CopiaDoAcervo)).toThrow();
  });
  it('os comandos apagam o conteúdo antes de gravar e não tocam em núcleos nem tipos', () => {
    const sqls = comandosDoEspelho(e).map((c) => c.sql);
    expect(sqls[0]).toBe('PRAGMA defer_foreign_keys = true');
    expect(sqls.indexOf('DELETE FROM integrantes')).toBeLessThan(sqls.findIndex((q) => q.startsWith('INSERT INTO integrantes')));
    expect(sqls.some((q) => /^(INSERT INTO|DELETE FROM) (nucleos|tipos)\b/.test(q))).toBe(false);
  });
});

// Achado ao construir "Época e capítulo" (migração 019): uma tabela nova que aponta para pessoas ou
// capítulos precisa ser apagada pelo espelho antes delas, senão o espelho falha ou guarda dado real.
// O espelho lê a cópia mensal, que leva todas as tabelas: o que a lista não apaga passa para a
// homologação. Resposta do Gui aos PRs #56 a #60 (17/11/2026): além de REFERENCES, as colunas
// memoria_id e relato_id também contam, porque a tabela avisos aponta para memórias e relatos sem
// REFERENCES e só entrou na lista à mão.
describe('tabelas que o espelho apaga', () => {
  const banco = Object.values(import.meta.glob<string>('../src/lib/servidor/banco.ts', { query: '?raw', import: 'default', eager: true }))[0]!;
  const PELA_COLUNA: Record<string, string> = { memoria_id: 'memorias', relato_id: 'relatos' };
  const PROTEGIDAS = ['integrantes', 'capitulos', 'memorias', 'relatos'];
  const alvos = new Map<string, Set<string>>();
  const anotar = (tabela: string, alvo: string) => {
    if (tabela === alvo) return;
    if (!alvos.has(tabela)) alvos.set(tabela, new Set());
    alvos.get(tabela)!.add(alvo);
  };
  const lerColunas = (tabela: string, trecho: string) => {
    for (const [, alvo] of trecho.matchAll(/REFERENCES\s+(\w+)\s*\(/g)) anotar(tabela, alvo!);
    for (const [, coluna] of trecho.matchAll(/(?:^|[(,]|ADD COLUMN)\s*(memoria_id|relato_id)\s+\w/gm)) anotar(tabela, PELA_COLUNA[coluna!]!);
  };
  for (const [, nome, corpo] of banco.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?(\w+) \(([\s\S]*?)\)`/g)) lerColunas(nome!.replace(/_novo$/, ''), corpo!);
  for (const [, nome, coluna] of banco.matchAll(/ALTER TABLE (\w+) ADD COLUMN ([^`]*)`/g)) lerColunas(nome!.replace(/_novo$/, ''), `ADD COLUMN ${coluna}`);
  const tabelas = [...alvos].filter(([, a]) => [...a].some((alvo) => PROTEGIDAS.includes(alvo)));

  it('toda tabela que aponta para pessoas, memórias, relatos ou capítulos é apagada, antes daquela para a qual aponta', () => {
    expect(tabelas.length).toBeGreaterThan(5);
    for (const [nome, apontadas] of tabelas) {
      expect(TABELAS_APAGADAS, nome).toContain(nome);
      for (const alvo of apontadas) {
        if (!TABELAS_APAGADAS.includes(alvo)) continue;
        expect(TABELAS_APAGADAS.indexOf(nome), `${nome} antes de ${alvo}`).toBeLessThan(TABELAS_APAGADAS.indexOf(alvo));
      }
    }
  });

  it('pega pelas colunas memoria_id e relato_id a tabela que não tem REFERENCES, como a dos avisos', () => {
    expect([...(alvos.get('avisos') ?? [])].sort()).toEqual(['memorias', 'relatos']);
    // E a coluna acrescentada depois, por ALTER TABLE, também conta
    expect(alvos.get('fotos')?.has('relatos')).toBe(true);
    // Uma tabela nova com memoria_id e sem REFERENCES, fora da lista, faria o teste falhar
    const antes = alvos.size;
    lerColunas('teste_nova', '\n        id INTEGER PRIMARY KEY,\n        memoria_id TEXT NOT NULL,\n        texto TEXT');
    expect(alvos.get('teste_nova')).toEqual(new Set(['memorias']));
    expect(TABELAS_APAGADAS).not.toContain('teste_nova');
    alvos.delete('teste_nova');
    expect(alvos.size).toBe(antes);
  });
});
