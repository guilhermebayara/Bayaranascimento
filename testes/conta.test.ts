// "Sua conta" (docs/decisoes.md): as listas trazem só o que é da pessoa e o que ela vê, e a seção de
// administração não aparece para quem não é administrador. Regras em src/lib/conta.ts.
import { describe, expect, it } from 'vitest';
import {
  administracao,
  colunasDosAtalhos,
  contaDePendencias,
  copiaAtrasada,
  fraseDaCopiaMensal,
  oQueVoceCriou,
  pendenciasDaAdministracao,
  PRAZO_DA_COPIA_MENSAL,
  seusLacos,
  seusRascunhos,
  suaLixeira,
  type SituacaoDaAdministracao,
} from '../src/lib/conta';
import { numeroDoRetrato, rotuloDoRetrato, somaDoRetrato } from '../src/lib/avisos';

const memoria = (id: string, criadaPor: string, fotos: [number, string][] = [], situacao: 'rascunho' | 'publicada' = 'publicada') => ({
  id,
  criadaPor,
  situacao,
  fotos: fotos.map(([fid, enviadaPor]) => ({ id: fid, enviadaPor })),
});
const relato = (id: number, memoriaId: string, por: string, registradoPor = por, situacao: 'rascunho' | 'publicada' = 'publicada') => ({ id, memoriaId, por, registradoPor, situacao });

describe('o que você criou', () => {
  // As memórias que a Elizete vê: "restrita", da Giovanna, não está na lista dela
  const vistas = {
    memorias: [memoria('natal', 'elizete', [[1, 'elizete'], [2, 'gui']]), memoria('praia', 'gui', [[3, 'elizete']]), memoria('rascunho', 'elizete', [[4, 'elizete']], 'rascunho')],
    relatos: [
      relato(1, 'natal', 'elizete'),
      relato(2, 'praia', 'vo-bela', 'elizete'),
      relato(3, 'restrita', 'elizete'),
      relato(4, 'praia', 'gui'),
      relato(5, 'natal', 'elizete', 'elizete', 'rascunho'),
    ],
    capitulos: [
      { id: 'natais', criadoPor: 'elizete' },
      { id: 'viagens', criadoPor: 'gui' },
    ],
  };
  const r = oQueVoceCriou('elizete', vistas);

  it('as memórias que criou, já publicadas', () => {
    expect(r.memorias.map((m) => m.id)).toEqual(['natal']);
  });

  it('os relatos que escreveu, inclusive os registrados por outra pessoa, marcados assim, e só em memórias que vê', () => {
    expect(r.relatos.map((x) => [x.id, x.emNomeDe])).toEqual([
      [1, null],
      [2, 'vo-bela'],
    ]);
  });

  it('as fotos que enviou, mesmo em memória de outra pessoa', () => {
    expect(r.fotos.map((f) => [f.memoria.id, f.foto.id])).toEqual([
      ['natal', 1],
      ['praia', 3],
    ]);
  });

  it('os capítulos que criou', () => {
    expect(r.capitulos.map((c) => c.id)).toEqual(['natais']);
  });

  it('o rascunho fica em "Rascunhos", e só o da própria pessoa', () => {
    const rascunhos = seusRascunhos('elizete', [...vistas.memorias, memoria('do-gui', 'gui', [], 'rascunho')], vistas.relatos);
    expect(rascunhos.memorias.map((m) => m.id)).toEqual(['rascunho']);
    expect(rascunhos.relatos.map((x) => x.id)).toEqual([5]);
  });

  // QA de design (17/11/2026): a conta mostrava o mesmo rascunho duas vezes, como memória e como relato
  it('o relato começado dentro de uma memória em rascunho não vira outra linha', () => {
    const rascunhos = seusRascunhos('gui', [memoria('lista', 'gui', [], 'rascunho'), memoria('natal', 'gui')], [relato(8, 'lista', 'gui', 'gui', 'rascunho'), relato(9, 'natal', 'gui', 'gui', 'rascunho')]);
    expect(rascunhos.memorias.map((m) => m.id)).toEqual(['lista']);
    expect(rascunhos.relatos.map((x) => x.id)).toEqual([9]);
  });
});

describe('seus laços do coração', () => {
  it('só os que a pessoa definiu, inclusive os "só eu", do mais próximo para o mais distante', () => {
    const lacos = [
      { id: 1, dono: 'gui', pessoa: 'caio', privado: false, proximidade: 3 },
      { id: 2, dono: 'gui', pessoa: 'deia', privado: true, proximidade: 1 },
      { id: 3, dono: 'giovanna', pessoa: 'marina', privado: false, proximidade: null },
    ];
    expect(seusLacos('gui', lacos).map((l) => l.id)).toEqual([2, 1]);
    expect(seusLacos('elizete', lacos)).toEqual([]);
  });
});

describe('lixeira', () => {
  it('só o que a pessoa mesma mandou para a lixeira', () => {
    const excluidas = [
      { id: 'a', excluidaPor: 'gui' },
      { id: 'b', excluidaPor: 'giovanna' },
      { id: 'c', excluidaPor: null },
    ];
    expect(suaLixeira('gui', excluidas).map((m) => m.id)).toEqual(['a']);
  });
});

describe('administração', () => {
  it('não aparece para quem não é administrador', () => {
    expect(administracao({ admin: false }, { podeEspelhar: true })).toEqual([]);
  });

  it('para os administradores, com o espelho só onde ele existe', () => {
    const naProducao = administracao({ admin: true }, { podeEspelhar: false }).map((i) => i.rotulo);
    expect(naProducao).toEqual(['Tipos de momento', 'Famílias', 'Carta de Natal', 'Fotos sem memória', 'Sistema visual', 'Baixar cópia do acervo']);
    expect(administracao({ admin: true }, { podeEspelhar: true }).map((i) => i.rotulo)).toContain('Espelho da produção');
  });
});

// Escolha do Gui no conceito da sessão E (17/11/2026): a administração em atalhos, com a situação de
// cada item e as pendências marcadas no cartão e somadas no número do retrato
describe('administração: situação e pendências', () => {
  const hoje = new Date('2026-11-18T12:00:00Z');
  const tudoEmDia: SituacaoDaAdministracao = {
    tipos: 14,
    familias: 3,
    carta: { escritaEm: '2026-11-10 10:00:00' },
    banco: { bytes: 12_000_000, passouDoAviso: false },
    copiaMensal: { conferida: true, ultima: '2026-11-01 06:00:00' },
    fotosSoltas: null,
    duplicados: null,
  };

  it('cada item diz a situação dele', () => {
    const itens = administracao({ admin: true }, { podeEspelhar: true }, tudoEmDia);
    expect(itens.map((i) => [i.rotulo, i.situacao])).toEqual([
      ['Tipos de momento', '14 tipos'],
      ['Famílias', '3 famílias'],
      ['Carta de Natal', 'escrita em 2026'],
      ['Fotos sem memória', 'nenhuma'],
      ['Sistema visual', 'tokens e peças'],
      ['Baixar cópia do acervo', undefined],
      ['Espelho da produção', 'só na homologação'],
    ]);
    expect(itens.some((i) => i.pendencia)).toBe(false);
    expect(administracao({ admin: true }, { podeEspelhar: false }, { ...tudoEmDia, familias: 1 })[1]!.situacao).toBe('1 família');
  });

  it('as fotos sem memória marcam o atalho delas (onda 2)', () => {
    const fotos = administracao({ admin: true }, { podeEspelhar: false }, { ...tudoEmDia, fotosSoltas: 3 }).find((i) => i.href === '/admin/fotos-soltas')!;
    expect(fotos).toMatchObject({ situacao: '3 fotos', pendencia: true });
  });

  it('a carta por escrever marca o atalho dela', () => {
    const itens = administracao({ admin: true }, { podeEspelhar: false }, { ...tudoEmDia, carta: null });
    const carta = itens.find((i) => i.href === '/admin/carta')!;
    expect(carta).toMatchObject({ situacao: 'ainda não escrita', pendencia: true });
    expect(itens.filter((i) => i.pendencia)).toHaveLength(1);
  });

  it('tudo em dia: nenhuma pendência', () => {
    expect(pendenciasDaAdministracao(tudoEmDia, hoje)).toEqual([]);
  });

  it('a carta por escrever, o banco perto do limite e a cópia atrasada', () => {
    const p = pendenciasDaAdministracao({ ...tudoEmDia, carta: null, banco: { bytes: 312_000_000, passouDoAviso: true }, copiaMensal: { conferida: true, ultima: '2026-09-01 06:00:00' } }, hoje);
    expect(p.map((x) => x.tipo)).toEqual(['carta', 'banco', 'copia']);
    expect(p[0]!.href).toBe('/admin/carta');
    expect(p[2]!.texto).toBe('A cópia mensal está atrasada: a última foi em 1 set 2026.');
    expect(contaDePendencias(p.length)).toBe('3 pendências');
    expect(contaDePendencias(1)).toBe('1 pendência');
  });

  it('a cópia mensal: atrasada depois do prazo, ou se nunca foi feita', () => {
    expect(PRAZO_DA_COPIA_MENSAL).toBe(35);
    expect(copiaAtrasada(null, hoje)).toBe(true);
    expect(copiaAtrasada('2026-11-01 06:00:00', hoje)).toBe(false);
    expect(copiaAtrasada('2026-10-14 12:00:00', hoje)).toBe(false);
    expect(copiaAtrasada('2026-10-13 11:00:00', hoje)).toBe(true);
    expect(pendenciasDaAdministracao({ ...tudoEmDia, copiaMensal: { conferida: true, ultima: null } }, hoje).map((x) => x.texto)).toEqual(['A cópia mensal ainda não foi feita.']);
  });

  it('a cópia mensal só vira pendência onde o script do Drive a busca (a produção)', () => {
    expect(pendenciasDaAdministracao({ ...tudoEmDia, copiaMensal: { conferida: false, ultima: null } }, hoje)).toEqual([]);
    expect(fraseDaCopiaMensal({ conferida: false, ultima: null }, hoje)).toBe('Cópia mensal: só na produção');
    expect(fraseDaCopiaMensal({ conferida: true, ultima: '2026-11-01 06:00:00' }, hoje)).toBe('Última cópia mensal: 1 nov 2026');
    expect(fraseDaCopiaMensal({ conferida: true, ultima: '2026-09-01 06:00:00' }, hoje)).toBe('Cópia mensal atrasada: a última foi em 1 set 2026');
  });

  // Onda 2: as listas ainda não existem; a estrutura já aceita os dois tipos
  it('fotos soltas e cadastros duplicados: indisponíveis ou zero não contam, e com número viram pendência com endereço', () => {
    expect(pendenciasDaAdministracao({ ...tudoEmDia, fotosSoltas: null, duplicados: 0 }, hoje)).toEqual([]);
    const p = pendenciasDaAdministracao({ ...tudoEmDia, fotosSoltas: 4, duplicados: 1 }, hoje);
    expect(p).toEqual([
      { tipo: 'fotos-soltas', texto: '4 fotos sem memória há mais de 30 dias.', href: '/admin/fotos-soltas', quantas: 4 },
      { tipo: 'duplicados', texto: 'Um possível cadastro duplicado.', href: '/admin/duplicados', quantas: 1 },
    ]);
    expect(pendenciasDaAdministracao({ ...tudoEmDia, fotosSoltas: 1, duplicados: 2 }, hoje).map((x) => x.texto)).toEqual([
      'Uma foto sem memória há mais de 30 dias.',
      '2 possíveis cadastros duplicados.',
    ]);
  });

  it('o número do retrato soma os avisos e as pendências da administração', () => {
    expect(somaDoRetrato(2, 3)).toBe(5);
    expect(somaDoRetrato(0)).toBe(0);
    expect(numeroDoRetrato(somaDoRetrato(0, 1))).toBe('1');
    expect(numeroDoRetrato(somaDoRetrato(8, 3))).toBe('9+');
    expect(rotuloDoRetrato('Gui', 2, 1)).toBe('Sua conta, Gui, 2 avisos, 1 pendência da administração');
    expect(rotuloDoRetrato('Gui', 0, 2)).toBe('Sua conta, Gui, 2 pendências da administração');
    expect(rotuloDoRetrato('Elizete', 1)).toBe('Sua conta, Elizete, 1 aviso');
  });
});

// "Sistema visual" ficava sozinho na segunda linha: os atalhos nunca deixam um sozinho numa linha
describe('colunas dos atalhos da administração', () => {
  it('até o máximo, todos numa linha', () => {
    expect(colunasDosAtalhos(1, 3)).toBe(1);
    expect(colunasDosAtalhos(3, 3)).toBe(3);
    expect(colunasDosAtalhos(2, 2)).toBe(2);
  });
  it('a produção (4 atalhos) fica em 2 × 2; a homologação (5), em 3 e 2', () => {
    expect(colunasDosAtalhos(4, 3)).toBe(2);
    expect(colunasDosAtalhos(5, 3)).toBe(3);
    expect(colunasDosAtalhos(5, 2)).toBe(1);
  });
  it('nunca um sozinho na última linha, qualquer que seja a quantidade', () => {
    for (const maximo of [2, 3, 4]) {
      for (let n = 1; n <= 30; n++) {
        const c = colunasDosAtalhos(n, maximo);
        expect(c).toBeGreaterThanOrEqual(1);
        expect(c).toBeLessThanOrEqual(maximo);
        const resto = n % c;
        if (c > 1 && n > 1) expect(resto === 1, `${n} atalhos em ${c} colunas`).toBe(false);
      }
    }
  });
});

// A data da última cópia mensal: o site anota quando o script do Drive baixa a cópia com o token de
// serviço (migração 060), e anotar nunca impede a cópia de sair
describe('a data da cópia mensal', () => {
  const fontes = import.meta.glob<string>(['../src/lib/servidor/banco.ts', '../src/lib/servidor/conta.ts', '../src/middleware.ts'], { query: '?raw', import: 'default', eager: true });
  const ler = (caminho: string) => fontes[`../${caminho}`]!;
  it('a migração 060 cria a tabela, sem cascata', () => {
    const banco = ler('src/lib/servidor/banco.ts');
    const sql = banco.slice(banco.indexOf("id: '060-copias-mensais'"));
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS copias_mensais/);
    expect(sql.slice(0, sql.indexOf('],'))).not.toMatch(/REFERENCES|CASCADE|DROP TABLE/);
  });
  it('o middleware anota só no pedido do serviço de cópia, depois de montar a resposta, sem deixar a falha passar', () => {
    const middleware = ler('src/middleware.ts');
    const trecho = middleware.slice(middleware.indexOf('ehServicoDeCopia(contexto.request)'), middleware.indexOf('usuarioDoPedido(contexto.request)'));
    expect(trecho).toMatch(/const resposta = await respostaDaCopia\(\);\s*[\s\S]*?await anotarCopiaMensal\(\)\.catch\(\(\) => undefined\);\s*return resposta;/);
    expect(middleware.match(/anotarCopiaMensal\(\)/g)).toHaveLength(1);
  });
  it('a cópia mensal só é conferida na produção', () => {
    expect(ler('src/lib/servidor/conta.ts')).toContain("const conferida = ambiente() === 'producao';");
  });
});

describe('Editar seus dados', () => {
  it('leva à ficha já aberta, pelo #ficha da página de editar', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('src/pages/conta.astro', 'utf8')).toContain('href={`/pessoas/${usuario.pessoa}/editar#ficha`}');
  });
});
