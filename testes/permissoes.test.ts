import { describe, expect, it } from 'vitest';
import {
  podeEditarFicha,
  podeEditarPessoa,
  podeEscreverRelato,
  podeExcluirMemoria,
  podeRemoverFoto,
  type Usuario,
} from '../src/lib/servidor/permissoes';

const gui: Usuario = { pessoa: 'gui', nome: 'Gui', nucleo: true, admin: true };
const giovanna: Usuario = { pessoa: 'giovanna', nome: 'Giovanna', nucleo: true, admin: false };
const cunhado: Usuario = { pessoa: 'magno', nome: 'Magno', nucleo: false, admin: false };
const comAcesso = new Set(['gui', 'giovanna', 'elizete', 'magno']);

describe('relatos', () => {
  it('cada pessoa escreve o próprio relato', () => {
    expect(podeEscreverRelato(giovanna, 'giovanna', undefined, comAcesso).ok).toBe(true);
  });
  it('cada pessoa edita o próprio relato', () => {
    expect(podeEscreverRelato(giovanna, 'giovanna', { por: 'giovanna' }, comAcesso).ok).toBe(true);
  });
  it('ninguém escreve em nome de quem acessa o site', () => {
    expect(podeEscreverRelato(gui, 'giovanna', undefined, comAcesso).ok).toBe(false);
  });
  it('ninguém edita o relato de outra pessoa, nem o administrador', () => {
    expect(podeEscreverRelato(gui, 'giovanna', { por: 'giovanna' }, comAcesso).ok).toBe(false);
  });
  it('qualquer um registra o relato de quem não acessa o site', () => {
    expect(podeEscreverRelato(giovanna, 'vo-bela', undefined, comAcesso).ok).toBe(true);
    expect(podeEscreverRelato(cunhado, 'vo-bela', undefined, comAcesso).ok).toBe(true);
  });
  it('só quem registrou edita o relato feito em nome de outra pessoa', () => {
    const relato = { por: 'vo-bela', registradoPor: 'elizete' };
    expect(podeEscreverRelato(giovanna, 'vo-bela', relato, comAcesso).ok).toBe(false);
    expect(podeEscreverRelato({ ...giovanna, pessoa: 'elizete' }, 'vo-bela', relato, comAcesso).ok).toBe(true);
  });
  it('quem ganha acesso depois não sobrescreve o relato registrado em seu nome sem aviso', () => {
    const relato = { por: 'magno', registradoPor: 'giovanna' };
    expect(podeEscreverRelato(cunhado, 'magno', relato, comAcesso).ok).toBe(false);
  });
});

describe('ficha, fotos, pessoas e exclusão', () => {
  it('só o núcleo corrige a ficha', () => {
    expect(podeEditarFicha(giovanna).ok).toBe(true);
    expect(podeEditarFicha(cunhado).ok).toBe(false);
  });
  it('só quem enviou remove a foto', () => {
    expect(podeRemoverFoto(giovanna, 'giovanna').ok).toBe(true);
    expect(podeRemoverFoto(gui, 'giovanna').ok).toBe(false);
    expect(podeRemoverFoto(gui, undefined).ok).toBe(true);
    expect(podeRemoverFoto(giovanna, undefined).ok).toBe(false);
  });
  it('cada um cuida da própria página, e o núcleo cuida de quem não acessa', () => {
    expect(podeEditarPessoa(giovanna, 'giovanna', comAcesso).ok).toBe(true);
    expect(podeEditarPessoa(gui, 'giovanna', comAcesso).ok).toBe(false);
    expect(podeEditarPessoa(giovanna, 'vo-bela', comAcesso).ok).toBe(true);
    expect(podeEditarPessoa(cunhado, 'vo-bela', comAcesso).ok).toBe(false);
  });
  it('só o administrador exclui memórias', () => {
    expect(podeExcluirMemoria(gui).ok).toBe(true);
    expect(podeExcluirMemoria(giovanna).ok).toBe(false);
  });
});
