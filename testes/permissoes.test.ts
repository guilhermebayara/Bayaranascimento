import { describe, expect, it } from 'vitest';
import {
  podeEditarMemoria,
  podeEscreverRelato,
  podeExcluirMemoria,
  podeRemoverFoto,
  podeVerMemoria,
  validarVisibilidade,
  type AcessoDaMemoria,
  type Usuario,
} from '../src/lib/servidor/permissoes';

const gui: Usuario = { pessoa: 'gui', nome: 'Gui', admin: true, nucleos: ['bayara-nascimento'] };
const giovanna: Usuario = { pessoa: 'giovanna', nome: 'Giovanna', admin: true, nucleos: ['bayara-nascimento', 'bayara-bracarense'] };
const elizete: Usuario = { pessoa: 'elizete', nome: 'Elizete', admin: false, nucleos: ['bayara-nascimento'] };
const magno: Usuario = { pessoa: 'lucas-magno', nome: 'Lucas Magno', admin: false, nucleos: ['bayara-bracarense', 'bracarense'] };
const comAcesso = new Set(['gui', 'giovanna', 'elizete', 'lucas-magno']);

const memoria = (extra: Partial<AcessoDaMemoria> = {}): AcessoDaMemoria => ({
  situacao: 'publicada',
  visibilidade: 'todos',
  criadaPor: 'giovanna',
  nucleos: ['bayara-nascimento'],
  integrantes: ['giovanna', 'gui'],
  ...extra,
});
const doCasal = memoria({ visibilidade: 'nucleos', nucleos: ['bayara-bracarense'], integrantes: ['giovanna', 'lucas-magno', 'gui'] });

describe('quem vê uma memória', () => {
  it('memória aberta: toda a família', () => {
    for (const u of [gui, giovanna, elizete, magno]) expect(podeVerMemoria(u, memoria())).toBe(true);
  });
  it('restrita a um núcleo: só os membros', () => {
    expect(podeVerMemoria(giovanna, doCasal)).toBe(true);
    expect(podeVerMemoria(magno, doCasal)).toBe(true);
    expect(podeVerMemoria(elizete, doCasal)).toBe(false);
  });
  it('ser citado não dá acesso', () => {
    expect(doCasal.integrantes).toContain('gui');
    expect(podeVerMemoria(gui, doCasal)).toBe(false);
  });
  it('administrador não tem visão especial', () => {
    expect(gui.admin).toBe(true);
    expect(podeVerMemoria(gui, doCasal)).toBe(false);
  });
  it('restrita a vários núcleos: basta ser de um', () => {
    const m = memoria({ visibilidade: 'nucleos', nucleos: ['bayara-nascimento', 'bracarense'] });
    expect(podeVerMemoria(elizete, m)).toBe(true);
    expect(podeVerMemoria(magno, m)).toBe(true);
  });
  it('rascunho: só quem está escrevendo, mesmo que seja aberto a todos', () => {
    const rascunho = memoria({ situacao: 'rascunho' });
    expect(podeVerMemoria(giovanna, rascunho)).toBe(true);
    expect(podeVerMemoria(gui, rascunho)).toBe(false);
  });
});

describe('quem altera uma memória', () => {
  it('quem criou e quem é citado', () => {
    expect(podeEditarMemoria(giovanna, memoria()).ok).toBe(true);
    expect(podeEditarMemoria(gui, memoria()).ok).toBe(true);
    expect(podeEditarMemoria(elizete, memoria()).ok).toBe(false);
  });
  it('citado que não vê a memória não altera', () => {
    expect(podeEditarMemoria(gui, doCasal).ok).toBe(false);
  });
  it('rascunho: só quem criou', () => {
    expect(podeEditarMemoria(gui, memoria({ situacao: 'rascunho' })).ok).toBe(false);
  });
  it('não dá para restringir a um núcleo de que a pessoa não faz parte', () => {
    expect(validarVisibilidade(gui, 'nucleos', ['bayara-bracarense']).ok).toBe(false);
    expect(validarVisibilidade(giovanna, 'nucleos', ['bayara-bracarense']).ok).toBe(true);
    expect(validarVisibilidade(gui, 'nucleos', []).ok).toBe(false);
    expect(validarVisibilidade(gui, 'todos', []).ok).toBe(true);
  });
  it('só administrador exclui, e só o que enxerga', () => {
    expect(podeExcluirMemoria(giovanna, doCasal).ok).toBe(true);
    expect(podeExcluirMemoria(gui, doCasal).ok).toBe(false);
    expect(podeExcluirMemoria(elizete, memoria()).ok).toBe(false);
  });
  it('só quem enviou remove a foto', () => {
    expect(podeRemoverFoto(giovanna, 'giovanna').ok).toBe(true);
    expect(podeRemoverFoto(gui, 'giovanna').ok).toBe(false);
  });
});

describe('relatos', () => {
  it('cada pessoa escreve e edita o próprio relato', () => {
    expect(podeEscreverRelato(giovanna, 'giovanna', undefined, comAcesso).ok).toBe(true);
    expect(podeEscreverRelato(giovanna, 'giovanna', { por: 'giovanna' }, comAcesso).ok).toBe(true);
  });
  it('ninguém escreve em nome de quem acessa o site', () => {
    expect(podeEscreverRelato(gui, 'giovanna', undefined, comAcesso).ok).toBe(false);
  });
  it('ninguém edita o relato de outra pessoa, nem o administrador', () => {
    expect(podeEscreverRelato(gui, 'giovanna', { por: 'giovanna' }, comAcesso).ok).toBe(false);
  });
  it('qualquer um registra o relato de quem não acessa o site', () => {
    expect(podeEscreverRelato(elizete, 'vo-bela', undefined, comAcesso).ok).toBe(true);
  });
  it('só quem registrou edita o relato feito em nome de outra pessoa', () => {
    const relato = { por: 'vo-bela', registradoPor: 'elizete' };
    expect(podeEscreverRelato(giovanna, 'vo-bela', relato, comAcesso).ok).toBe(false);
    expect(podeEscreverRelato(elizete, 'vo-bela', relato, comAcesso).ok).toBe(true);
  });
  it('quem ganha acesso depois não sobrescreve o relato registrado em seu nome', () => {
    expect(podeEscreverRelato(magno, 'lucas-magno', { por: 'lucas-magno', registradoPor: 'giovanna' }, comAcesso).ok).toBe(false);
  });
});

describe('cadastro de integrantes e laços', async () => {
  const { podeEditarIntegrante, podeMexerEmLaco } = await import('../src/lib/servidor/permissoes');
  const pessoa = (pessoa: string, nucleos: string[], admin = false) => ({ pessoa, nome: pessoa, admin, nucleos });
  const elizete = pessoa('elizete', ['bayara-nascimento']);
  const magno = pessoa('lucas-magno', ['bayara-bracarense', 'bracarense']);
  const gui = pessoa('gui', ['bayara-nascimento'], true);
  const comAcesso = new Set(['gui', 'giovanna', 'elizete', 'lucas-magno']);
  const voBela = { id: 'vo-bela', nucleos: ['bayara-nascimento'], criadoPor: null };
  const lucio = { id: 'lucio', nucleos: ['bracarense'], criadoPor: null };
  const amiga = { id: 'amiga', nucleos: [], criadoPor: 'elizete' };

  it('cada pessoa com acesso cuida da própria página, e só ela', () => {
    expect(podeEditarIntegrante(elizete, { id: 'elizete', nucleos: ['bayara-nascimento'] }, comAcesso).ok).toBe(true);
    expect(podeEditarIntegrante(gui, { id: 'elizete', nucleos: ['bayara-nascimento'] }, comAcesso).ok).toBe(false);
  });
  it('página de quem não acessa: núcleo em comum, quem cadastrou ou admin', () => {
    expect(podeEditarIntegrante(elizete, voBela, comAcesso).ok).toBe(true);
    expect(podeEditarIntegrante(magno, voBela, comAcesso).ok).toBe(false);
    expect(podeEditarIntegrante(elizete, amiga, comAcesso).ok).toBe(true);
    expect(podeEditarIntegrante(magno, amiga, comAcesso).ok).toBe(false);
    expect(podeEditarIntegrante(gui, lucio, comAcesso).ok).toBe(true);
  });
  it('laço de árvore: envolvidos, núcleo em comum com algum deles, ou admin', () => {
    expect(podeMexerEmLaco(magno, [lucio, { id: 'lucas-magno', nucleos: magno.nucleos }]).ok).toBe(true);
    expect(podeMexerEmLaco(elizete, [voBela, amiga]).ok).toBe(true);
    expect(podeMexerEmLaco(elizete, [lucio]).ok).toBe(false);
    expect(podeMexerEmLaco(elizete, [{ id: 'elizete', nucleos: [] }, lucio]).ok).toBe(true);
    expect(podeMexerEmLaco(gui, [lucio]).ok).toBe(true);
  });
});

describe('descartar rascunho', async () => {
  const { podeExcluirMemoria: excluir } = await import('../src/lib/servidor/permissoes');
  const pessoa = (pessoa: string, admin = false) => ({ pessoa, nome: pessoa, admin, nucleos: ['bayara-nascimento'] });
  const rascunho = { situacao: 'rascunho' as const, visibilidade: 'todos' as const, criadaPor: 'elizete', nucleos: [], integrantes: [] };
  it('quem escreve o rascunho pode descartar, mesmo sem ser admin', () => {
    expect(excluir(pessoa('elizete'), rascunho).ok).toBe(true);
  });
  it('rascunho de outra pessoa nem admin exclui, porque não vê', () => {
    expect(excluir(pessoa('gui', true), rascunho).ok).toBe(false);
  });
  it('memória publicada continua sendo só com admin', () => {
    expect(excluir(pessoa('elizete'), { ...rascunho, situacao: 'publicada' }).ok).toBe(false);
    expect(excluir(pessoa('gui', true), { ...rascunho, situacao: 'publicada' }).ok).toBe(true);
  });
});
