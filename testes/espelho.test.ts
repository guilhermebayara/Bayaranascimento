import { describe, expect, it } from 'vitest';
import { comandosDoEspelho, espelhar, IDS_MANTIDOS, type CopiaDoAcervo } from '../src/lib/espelho';

// Uma cópia pequena, no formato da cópia do acervo, com nomes e textos "reais" para conferir que nada vaza
const copia: CopiaDoAcervo = {
  acervo: 'Bayara Nascimento',
  tabelas: {
    integrantes: [
      { id: 'gui', nome: 'Guilherme Real', tipo: 'pessoa', tratamento: 'ele', nascimento_ano: 1990, admin: 1, ordem: 1, sobre: 'Texto secreto do Gui' },
      { id: 'giovanna', nome: 'Giovanna Real', tipo: 'pessoa', tratamento: 'ela', nascimento_ano: 1997, admin: 1, ordem: 2 },
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
      { filho_id: 'cachorro', responsavel_id: 'giovanna', qualidade: 'biologica' },
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
    lacos_coracao: [{ dono_id: 'gui', pessoa_id: 'amiga', nome: 'Amiga do colégio Tal', papel: 'irmao', proximidade: 1, privado: 1 }],
    memorias: [{ id: 'real-1', titulo: 'Memória real secreta' }],
    relatos: [{ memoria_id: 'real-1', texto: 'Relato real secreto' }],
  },
};
const agora = new Date('2026-11-15T12:00:00Z');
const e = espelhar(copia, { semente: 42, agora });
const tabela = (nome: string) => e.tabelas.find(([t]) => t === nome)![1];

describe('espelho da produção para a homologação', () => {
  it('nenhum nome, texto ou memória real passa para o espelho', () => {
    const tudo = JSON.stringify(e);
    for (const segredo of ['Real', 'secreto', 'Texto secreto', 'colégio Tal', 'vo-bela', 'aguilar', 'real-1']) expect(tudo).not.toContain(segredo);
  });
  it('mantém os ids de quem tem acesso e troca os outros', () => {
    const ids = tabela('integrantes').map((i) => i.id);
    for (const id of IDS_MANTIDOS) expect(ids).toContain(id);
    expect(ids.filter((id) => String(id).startsWith('pessoa-'))).toHaveLength(4);
  });
  it('a estrutura da família é a mesma: filiações, casais, fases, laços e núcleos', () => {
    expect(tabela('filiacoes')).toHaveLength(7);
    expect(tabela('casais')).toHaveLength(2);
    expect(tabela('casal_fases').map((f) => f.tipo)).toEqual(['casamento', 'separacao', 'casamento']);
    expect(tabela('nucleo_membros')).toHaveLength(6);
    // Membro e parente continuam como na produção
    // A Vó Bela veio de uma cópia sem papel: vira parente, como na migração 013
    expect(tabela('nucleo_membros').filter((m) => m.papel === 'parente')).toHaveLength(2);
    expect(tabela('nucleo_membros').filter((m) => m.papel === 'parente').every((m) => String(m.integrante_id).startsWith('pessoa-'))).toBe(true);
    const [resumido] = tabela('lacos_resumidos');
    expect(resumido).toMatchObject({ papel: 'sobrinho', criado_por: 'gui' });
    expect(String(resumido.a_id)).toMatch(/^pessoa-/);
    const [laco] = tabela('lacos_coracao');
    expect(laco).toMatchObject({ dono_id: 'gui', papel: 'irmao', privado: 1, nome: 'Amiga-irmã' });
    // Gui e Giovanna continuam irmãos: os mesmos dois pais
    const pais = (filho: string) => tabela('filiacoes').filter((f) => f.filho_id === filho && f.qualidade !== 'consideracao').map((f) => f.responsavel_id).sort();
    expect(pais('gui')).toEqual(pais('giovanna'));
    // O bicho continua bicho, filho de consideração do Gui
    const bicho = tabela('integrantes').find((i) => i.tipo === 'bicho')!;
    expect(tabela('filiacoes')).toContainEqual(expect.objectContaining({ filho_id: bicho.id, responsavel_id: 'gui', qualidade: 'consideracao' }));
  });
  it('os anos andam alguns anos para a frente, sem passar do ano atual', () => {
    const gui = tabela('integrantes').find((i) => i.id === 'gui')!;
    expect(Number(gui.nascimento_ano) - 1990).toBe(e.resumo.deslocamentoDeAnos);
    expect(e.resumo.deslocamentoDeAnos).toBeGreaterThanOrEqual(1);
    expect(tabela('casal_fases').every((f) => f.inicio_ano === null || Number(f.inicio_ano) <= 2026)).toBe(true);
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
