// O namoro na árvore (decisões do Gui, 18/11/2026): aparece como laço do coração, com a linha tracejada,
// e a pessoa que namora fica colada ao lado do namorado, como o par de um casal, com a linha de lado (na
// mesma geração, sem subir nem descer). Conferido com os dados da prévia: os lados da família e o tronco
// das linhas dos outros laços não mudam.
import { describe, expect, it } from 'vitest';
import { montarDesenho, type DadosDaArvore, type Estado } from '../src/lib/arvore-montagem';
import previa from './dados/arvore-previa.json';

const base = previa as DadosDaArvore;
const estado = (abertos: string[], mudar: Partial<Estado> = {}): Estado => ({
  foco: 'gui', centro: '', ramos: new Set(), nucleo: '', consideracao: true, ex: true, bichos: true, outros: true, abertos: new Set(abertos), ...mudar,
});
const pessoa = (id: string, nome: string) => ({ id, nome, rotulo: '', nucleos: [], bicho: false, anos: '' });
// A Bia namora o Gui; o Thiago, ex da Giovanna, virou amigo (esse não fica colado)
const comNamoro: DadosDaArvore = {
  ...base,
  pessoas: [...base.pessoas, pessoa('bia', 'Bia'), pessoa('thiago', 'Thiago')],
  amizades: [
    { a: 'gui', b: 'bia', rotulo: 'namorada de Gui', namoro: true },
    { a: 'giovanna', b: 'thiago', rotulo: 'amigo de Giovanna' },
  ],
};
const nome = new Map(comNamoro.pessoas.map((p) => [p.id, p.nome]));
const fileiras = (dados: DadosDaArvore, abertos: string[]) => {
  const { desenho } = montarDesenho(dados, estado(abertos));
  const porY = new Map<number, typeof desenho.pessoas>();
  for (const p of desenho.pessoas) porY.set(p.y, [...(porY.get(p.y) ?? []), p]);
  return [...porY].sort((a, b) => a[0] - b[0]).map(([, ps]) => ps.sort((a, b) => a.x - b.x).map((p) => nome.get(p.id)!));
};
const COMBINACOES = [['gui'], ['giovanna'], ['gui', 'giovanna'], ['gui', 'giovanna', 'lucas-magno']];

describe('o namoro na árvore', () => {
  for (const abertos of COMBINACOES) {
    it(`a namorada fica colada ao lado do Gui, e os lados da família não mudam (laços de ${abertos.join(' e ')} abertos)`, () => {
      const f = fileiras(comNamoro, abertos);
      const texto = f.map((l) => l.join(' | ')).join('\n');
      const linha = f.find((l) => l.includes('Gui'))!;
      expect(Math.abs(linha.indexOf('Bia') - linha.indexOf('Gui')), texto).toBe(1);
      // Bayara à esquerda, Bracarense à direita, como sem o namoro
      expect(linha.indexOf('Gui'), texto).toBeLessThan(linha.indexOf('Giovanna'));
      expect(linha.indexOf('Giovanna'), texto).toBeLessThan(linha.indexOf('Lucas Magno'));
      const avos = f.find((l) => l.includes('Vó Vivica'))!;
      expect(avos.indexOf('Vó Vivica'), texto).toBeLessThan(avos.indexOf('Regina'));
    });
  }

  it('a linha do namoro é tracejada (do coração) e vai de lado, na altura dos dois', () => {
    const { desenho } = montarDesenho(comNamoro, estado(['gui']));
    const [gui, bia] = ['gui', 'bia'].map((id) => desenho.pessoas.find((p) => p.id === id)!);
    expect(gui.y).toBe(bia.y);
    const linha = desenho.linhas.find((l) => l.tipo === 'coracao' && l.de.includes('bia'))!;
    expect(linha).toBeDefined();
    // Só pontos na mesma altura: nada sobe nem desce
    const alturas = new Set([...linha.d.matchAll(/(-?[\d.]+)[ ,](-?[\d.]+)/g)].map((m) => Number(m[2])));
    expect(alturas.size, linha.d).toBe(1);
    // E não é casal: sem linha de casal nem ponto entre os dois
    expect(desenho.linhas.some((l) => (l.tipo === 'casal' || l.tipo === 'ponto') && l.de.includes('bia'))).toBe(false);
  });

  it('o ex que virou amigo não fica colado: continua como laço do coração de sempre', () => {
    const { desenho } = montarDesenho({ ...comNamoro, amizades: comNamoro.amizades!.filter((a) => !a.namoro) }, estado(['gui']));
    const semNamoro = montarDesenho({ ...base, pessoas: comNamoro.pessoas, amizades: comNamoro.amizades!.filter((a) => !a.namoro) }, estado(['gui']));
    expect(desenho.pessoas).toEqual(semNamoro.desenho.pessoas);
  });

  it('os outros laços do coração continuam ligando as mesmas pessoas, em tronco', () => {
    // Com a Bia colada ao Gui, o Ed deixa de ser vizinho dele e entra no tronco dos laços do mesmo lado
    // (a regra de sempre: os laços para o mesmo lado saem juntos)
    const ligados = (dados: DadosDaArvore) =>
      new Set(montarDesenho(dados, { ...estado(['gui']), amigos: true }).desenho.linhas.filter((l) => l.tipo === 'coracao').flatMap((l) => l.de).filter((id) => id !== 'bia'));
    const semNamoro = { ...comNamoro, amizades: comNamoro.amizades!.filter((a) => !a.namoro) };
    expect([...ligados(comNamoro)].sort()).toEqual([...ligados(semNamoro)].sort());
    const { desenho } = montarDesenho(comNamoro, { ...estado(['gui']), amigos: true });
    const doGui = desenho.linhas.filter((l) => l.tipo === 'coracao' && l.de.includes('gui') && !l.de.includes('bia'));
    expect(doGui).toHaveLength(1);
    expect(doGui[0].de).toEqual(expect.arrayContaining(['ed-luiz', 'renan', 'natalia-boaventura', 'ex-dona-deia']));
  });

  it('com a camada de consideração e coração desligada, o namoro sai, como os outros laços do coração', () => {
    const { principal } = montarDesenho(comNamoro, estado(['gui'], { consideracao: false }));
    expect(principal.has('bia')).toBe(false);
  });
});
