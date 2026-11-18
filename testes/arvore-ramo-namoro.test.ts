// O namoro de quem está num ramo recolhido vai junto para o cartão do ramo (defeito do QA de 18/11/2026,
// corrigido por ordem do Gui): a Bia, namorada do Primo Téo, não aparecia no ramo dele. Ela entra na
// geração do par e o cartão desenha o tracejado do coração entre os dois. Com os dados da prévia.
import { describe, expect, it } from 'vitest';
import { montarDesenho, type DadosDaArvore } from '../src/lib/arvore-montagem';
import { desenharArvore } from '../src/lib/arvore-desenho';
import previa from './dados/arvore-previa.json';

const base = previa as DadosDaArvore;
const dados: DadosDaArvore = {
  ...base,
  pessoas: [...base.pessoas, { id: 'ex-bia', nome: 'Bia', rotulo: 'namorada de Primo Téo', nucleos: [], bicho: false, anos: '2003' }],
  amizades: [{ a: 'ex-bia', b: 'ex-primo-teo', rotulo: 'namorada de Primo Téo', namoro: true }],
};
const montar = (ramos: string[], consideracao = true) =>
  montarDesenho(dados, { foco: 'gui', centro: '', ramos: new Set(ramos), nucleo: '', consideracao, ex: true, bichos: true, outros: true, amigos: true, abertos: new Set(['gui']) });

describe('o namoro no cartão do ramo', () => {
  it('a Bia está no ramo do Primo Téo, na geração dele, e fora da árvore principal', () => {
    const r = montar(['vo-bela']);
    const ramo = r.ramos.find((x) => x.membros.includes('ex-primo-teo'))!;
    expect(ramo.membros).toContain('ex-bia');
    expect(r.geracoes.get('ex-bia')).toBe(r.geracoes.get('ex-primo-teo'));
    expect(r.principal.has('ex-bia')).toBe(false);
    expect(r.coracaoDosRamos.map((l) => [l.dono, l.pessoa])).toEqual([['ex-bia', 'ex-primo-teo']]);
  });
  it('o cartão do ramo desenha os dois lado a lado, com o laço entre eles', () => {
    const r = montar(['vo-bela']);
    const membros = r.ramos.find((x) => x.membros.includes('ex-primo-teo'))!.membros.filter((id) => r.geracoes.has(id));
    const desenho = desenharArvore(
      dados.pessoas.filter((p) => membros.includes(p.id)).map((p) => ({ id: p.id, geracao: r.geracoes.get(p.id)! })),
      r.casaisVisiveis.filter((c) => membros.includes(c.a) && membros.includes(c.b)),
      r.filiacoesVisiveis.filter((f) => membros.includes(f.filho) && membros.includes(f.responsavel)),
      r.coracaoDosRamos.filter((l) => membros.includes(l.dono) && membros.includes(l.pessoa)),
    );
    const bia = desenho.pessoas.find((p) => p.id === 'ex-bia')!;
    const teo = desenho.pessoas.find((p) => p.id === 'ex-primo-teo')!;
    expect(bia.y).toBe(teo.y);
    expect(Math.abs(bia.x - teo.x)).toBeLessThan(400);
    expect(desenho.linhas.filter((l) => l.tipo === 'coracao' && l.de.includes('ex-bia') && l.de.includes('ex-primo-teo'))).toHaveLength(1);
  });
  it('com o ramo fechado, ou sem a camada de consideração e coração, ela não aparece', () => {
    expect(montar([]).coracaoDosRamos).toEqual([]);
    expect(montar(['vo-bela'], false).coracaoDosRamos).toEqual([]);
  });
  it('o código do navegador passa o namoro ao desenho do cartão', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('src/lib/cliente/arvore.ts', 'utf8')).toContain('coracaoDosRamos.filter((l) => membros.includes(l.dono) && membros.includes(l.pessoa)),');
  });
});
