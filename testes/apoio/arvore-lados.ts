// O que os testes dos lados das famílias dividem (testes/arvore-lados*.test.ts): os dados, a regra que fura e a
// fileira de cada um. Os centros ficam em arquivos separados para rodarem em paralelo (auditoria AC, G-1, sessão
// AC1): são 640 montagens, a uns 13 ms cada, e os casos são os mesmos de antes.
import { expect, it } from 'vitest';
import { montarDesenho, type DadosDaArvore } from '../../src/lib/arvore-montagem';
import previa from '../dados/arvore-previa.json';

export const base = previa as DadosDaArvore;
export const comAmigo: DadosDaArvore = {
  ...base,
  pessoas: [...base.pessoas, { id: 'thiago', nome: 'Thiago', rotulo: '', nucleos: [], bicho: false, anos: '' }],
  amizades: [{ a: 'giovanna', b: 'thiago', rotulo: 'amigo de Giovanna' }],
};
export const nome = new Map(comAmigo.pessoas.map((p) => [p.id, p.nome]));
// O lado de cada pessoa, pela ordem das famílias: 0 é o Bayara, 1 o Bracarense
const ordemDasFamilias = base.nucleos.map((n) => n.id);
const lado = new Map(
  comAmigo.pessoas
    .filter((p) => p.nucleos.length)
    .map((p) => [p.id, p.nucleos.reduce((s, n) => s + ordemDasFamilias.indexOf(n), 0) / p.nucleos.length / (ordemDasFamilias.length - 1)]),
);

const DONOS = ['gui', 'giovanna', 'lucas-magno', 'elizete'];
/** Os centros de antes: o começo e as quatro pessoas. Cada um tem o seu arquivo, e o primeiro confere que nenhum falta. */
export const CENTROS = ['', 'gui', 'giovanna', 'lucas-magno', 'elizete'];
const CAMADAS = [
  { nome: 'tudo ligado', ex: true, bichos: true },
  { nome: 'sem ex', ex: false, bichos: true },
  { nome: 'sem bichinhos', ex: true, bichos: false },
];
const subconjuntos = Array.from({ length: 1 << DONOS.length }, (_, m) => DONOS.filter((_, i) => m & (1 << i)));

/** O que fura a regra numa montagem: a fileira de cada um, da esquerda para a direita */
function problemas(dados: DadosDaArvore, centro: string, abertos: string[], camada: (typeof CAMADAS)[number], amigos: boolean): string[] {
  const { desenho } = montarDesenho(dados, {
    foco: 'gui', centro, ramos: new Set(), nucleo: '', consideracao: true, ex: camada.ex, bichos: camada.bichos, outros: true, amigos, abertos: new Set(abertos),
  });
  const porY = new Map<number, typeof desenho.pessoas>();
  for (const p of desenho.pessoas) porY.set(p.y, [...(porY.get(p.y) ?? []), p]);
  const achados: string[] = [];
  for (const fileira of porY.values()) {
    const ordem = fileira.sort((a, b) => a.x - b.x).map((p) => p.id);
    const texto = ordem.map((id) => nome.get(id)).join(' | ');
    // Quem é mais do Bayara fica à esquerda de quem é mais do Bracarense
    for (let i = 0; i < ordem.length; i++) {
      for (let j = i + 1; j < ordem.length; j++) {
        const [a, b] = [lado.get(ordem[i]), lado.get(ordem[j])];
        if (a !== undefined && b !== undefined && a > b) achados.push(`${nome.get(ordem[i])} à esquerda de ${nome.get(ordem[j])}: ${texto}`);
      }
    }
    // O ex que virou amigo, colado à Giovanna do lado de fora do casal, entre os irmãos
    const t = ordem.indexOf('thiago');
    if (t >= 0 && (ordem[t + 1] !== 'giovanna' || (ordem.includes('gui') && ordem.indexOf('gui') > t))) achados.push(`Thiago fora do lugar: ${texto}`);
  }
  return achados;
}

/** O teste dos lados, partindo de um centro, com qualquer combinação de laços abertos */
export function testarOsLadosPartindoDe(centro: string) {
  it(`Bayara à esquerda e Bracarense à direita, partindo ${centro ? `de ${centro}` : 'do começo'}, com qualquer combinação de laços abertos`, () => {
    const achados = new Set<string>();
    for (const dados of [base, comAmigo]) {
      for (const abertos of subconjuntos) {
        for (const camada of CAMADAS) {
          // Os amigos sem lugar na família, só com tudo ligado, para o teste não demorar
          for (const amigos of camada === CAMADAS[0] ? [false, true] : [false]) {
            for (const p of problemas(dados, centro, abertos, camada, amigos)) achados.add(`[♥ ${abertos.join(', ') || 'nenhum'}; ${camada.nome}${amigos ? '; amigos' : ''}] ${p}`);
          }
        }
      }
    }
    expect([...achados].slice(0, 12)).toEqual([]);
  }, 60_000);
}

/** A fileira de uma pessoa, da esquerda para a direita, numa montagem partindo de um centro */
export const fileiraDe = (dados: DadosDaArvore, centro: string, abertos: string[], bichos = true, quem = 'giovanna') => {
  const { desenho } = montarDesenho(dados, { foco: 'gui', centro, ramos: new Set(), nucleo: '', consideracao: true, ex: true, bichos, outros: true, amigos: false, abertos: new Set(abertos) });
  const y = desenho.pessoas.find((p) => p.id === quem)!.y;
  return desenho.pessoas.filter((p) => p.y === y).sort((a, b) => a.x - b.x).map((p) => nome.get(p.id)).join(' | ');
};
