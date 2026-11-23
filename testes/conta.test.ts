// "Sua conta" (docs/decisoes.md): as listas trazem só o que é da pessoa e o que ela vê, e a seção de
// administração não aparece para quem não é administrador. Regras em src/lib/conta.ts.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  administracao,
  enderecoDoRascunhoDeRelato,
  destinoDaAncoraAntiga,
  ENDERECO_DA_ADMINISTRACAO,
  gruposDaAdministracao,
  contaDePendencias,
  copiaAtrasada,
  fraseDaCopiaMensal,
  FRASE_DA_COPIA_DO_ACERVO,
  oQueVoceCriou,
  pendenciasDaAdministracao,
  PRAZO_DA_COPIA_MENSAL,
  seusLacos,
  seusRascunhos,
  suaLixeira,
  type SituacaoDaAdministracao,
  GRUPO_DO_ESPACO,
  grupoDaPendencia,
  idDoGrupo,
  resumoDoGrupo,
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
    expect(naProducao).toEqual(['Tipos de momento', 'Famílias', 'Centros da árvore', 'Carta de Natal', 'Fotos sem memória', 'Cadastros duplicados', 'Pedidos para excluir', 'Transcrição automática', 'Cópias menores das fotos', 'Sistema visual', 'Baixar cópia do acervo']);
    expect(administracao({ admin: true }, { podeEspelhar: true }).map((i) => i.rotulo)).toContain('Espelho da produção');
  });

  it('só há uma cópia para baixar, a do acervo: a cópia com os retratos para o espelho saiu (observação do Gui, 18/11/2026)', () => {
    for (const podeEspelhar of [true, false]) {
      expect(administracao({ admin: true }, { podeEspelhar }).filter((i) => i.baixar)).toEqual([{ rotulo: 'Baixar cópia do acervo', href: '/api/copia', baixar: true }]);
    }
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
      ['Centros da árvore', 'o padrão'],
      ['Carta de Natal', 'escrita em 2026'],
      ['Fotos sem memória', 'nenhuma'],
      ['Cadastros duplicados', 'nenhum à vista'],
      ['Pedidos para excluir', 'nenhum'],
      ['Transcrição automática', 'desligada'],
      ['Cópias menores das fotos', 'para as fotos de antes'],
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

// Os quadros soltos quebravam a página (observação do Gui, 18/11/2026): os atalhos vão em grupos por tema
describe('grupos da administração', () => {
  it('três grupos, cada atalho num deles, e os links de baixar ficam fora', () => {
    const itens = administracao({ admin: true }, { podeEspelhar: true });
    const grupos = gruposDaAdministracao(itens);
    expect(grupos.map((g) => [g.titulo, g.itens.map((i) => i.rotulo)])).toEqual([
      ['Do acervo', ['Tipos de momento', 'Famílias', 'Centros da árvore', 'Carta de Natal']],
      ['Para arrumar', ['Fotos sem memória', 'Cadastros duplicados', 'Pedidos para excluir']],
      ['Ferramentas', ['Transcrição automática', 'Cópias menores das fotos', 'Sistema visual', 'Espelho da produção']],
    ]);
    expect(itens.filter((i) => !i.baixar).every((i) => i.tema)).toBe(true);
  });
  it('grupo vazio não aparece', () => {
    expect(gruposDaAdministracao([{ rotulo: 'Famílias', href: '/admin/familias', tema: 'acervo' }]).map((g) => g.titulo)).toEqual(['Do acervo']);
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

// Proposta A do conceito da sessão H (escolha do Gui, 18/11/2026): os grupos abrem e fecham, um por vez, e
// o sinal do alto abre o balão das pendências, cada uma dizendo onde mora
describe('administração em seções que abrem e fecham', () => {
  // A Administração tem página própria (decisão do Gui, 18/11/2026)
  const pagina = readFileSync('src/pages/admin/index.astro', 'utf8');
  const css = readFileSync('src/visual/telas/conta.css', 'utf8');
  it('cada pendência mora num grupo: a carta no acervo, as faxinas em "Para arrumar" e o resto no espaço', () => {
    expect(grupoDaPendencia({ tipo: 'carta' })).toBe('Do acervo');
    expect(grupoDaPendencia({ tipo: 'fotos-soltas' })).toBe('Para arrumar');
    expect(grupoDaPendencia({ tipo: 'duplicados' })).toBe('Para arrumar');
    for (const tipo of ['banco', 'espaco', 'copia'] as const) expect(grupoDaPendencia({ tipo })).toBe(GRUPO_DO_ESPACO);
  });
  it('o grupo fechado diz as pendências dele, ou quantos atalhos tem', () => {
    expect(resumoDoGrupo(4, 0)).toBe('4 atalhos');
    expect(resumoDoGrupo(1, 0)).toBe('1 atalho');
    expect(resumoDoGrupo(4, 2)).toBe('2 pendências');
    expect(idDoGrupo('Espaço e cópias')).toBe('administracao-espaco-e-copias');
  });
  it('os grupos são seções de um nome só, e o sinal abre o balão como um menu', () => {
    expect(pagina).toContain('<details class="conta__grupo" name="administracao"');
    expect(pagina).toContain('<details class="conta__sinal" data-menu-acoes>');
    expect(pagina).toContain('ligarMenus();');
    expect(pagina).toContain('em {grupoDaPendencia(p)}');
  });
  it('no computador o cartão fica à direita do título, e na conta os avisos não ocupam a largura toda', () => {
    expect(css).toMatch(/\.admin__abre \{\s*grid-column: 1 \/ span 5;/);
    expect(css).toMatch(/\.admin__cartao \{\s*grid-column: 6 \/ -1;/);
    expect(css).toMatch(/\.conta__grade > \.regiao > \.avisos--conta \{\s*grid-column: 1 \/ span 7;/);
    expect(css).toMatch(/\.conta__lacos \{\s*grid-column: 8 \/ -1;\s*grid-row: span 2;/);
  });
});

describe('a administração chega fechada', () => {
  // Observação do Gui depois da sessão H (18/11/2026): todos os grupos começam fechados
  it('nenhum grupo da administração vem aberto, com ou sem pendência', () => {
    const conta = readFileSync('src/pages/admin/index.astro', 'utf8');
    const grupos = [...conta.matchAll(/<details class="conta__grupo"[^>]*>/g)].map((m) => m[0]);
    expect(grupos.length).toBe(2);
    for (const g of grupos) expect(g).not.toMatch(/\bopen=/);
  });
  it('a pendência continua abrindo o grupo dela', () => {
    expect(readFileSync('src/pages/admin/index.astro', 'utf8')).toContain('data-abre-grupo={p.href ? undefined : idDoGrupo(grupoDaPendencia(p))}');
  });
});

// Excluir pessoa (decisão do Gui depois da sessão I): os pedidos de quem não administra viram pendência
describe('pedidos para excluir pessoa', () => {
  const base = { carta: { escritaEm: '2026-11-01' }, copiaMensal: { conferida: false, ultima: null } };
  it('cada pedido aberto vira pendência em "Para arrumar", com o atalho marcado', () => {
    const [p] = pendenciasDaAdministracao({ ...base, exclusoes: 2 }, new Date('2026-11-18'));
    expect(p).toMatchObject({ tipo: 'exclusoes', texto: '2 pedidos para excluir pessoas.', href: '/admin/exclusoes', quantas: 2 });
    expect(grupoDaPendencia(p)).toBe('Para arrumar');
    expect(pendenciasDaAdministracao({ ...base, exclusoes: 1 }, new Date('2026-11-18'))[0].texto).toBe('Um pedido para excluir uma pessoa.');
    expect(pendenciasDaAdministracao({ ...base, exclusoes: 0 }, new Date('2026-11-18'))).toEqual([]);
    const item = administracao({ admin: true }, { podeEspelhar: false }, { tipos: 1, familias: 1, ...base, exclusoes: 1 }).find((i) => i.rotulo === 'Pedidos para excluir')!;
    expect(item).toMatchObject({ situacao: '1 pedido', pendencia: true });
  });
});

describe('a cópia do acervo (decisão do Gui depois do QA de 18/11/2026)', () => {
  it('a página diz numa frase que a cópia leva tudo, inclusive o que o administrador não vê', () => {
    expect(FRASE_DA_COPIA_DO_ACERVO).toContain('inclusive o que você não vê no site');
    expect(readFileSync('src/pages/admin/index.astro', 'utf-8')).toContain('{copias.length > 0 && <p class="conta__nota">{FRASE_DA_COPIA_DO_ACERVO}</p>}');
  });
});

// A Administração em página própria (decisão do Gui, 18/11/2026): "Sua conta" fica igual para todos, só
// com o que é da pessoa, e quem administra tem o atalho para a página nova, que também está no menu do retrato
describe('a Administração em página própria', () => {
  const conta = readFileSync('src/pages/conta.astro', 'utf8');
  const admin = readFileSync('src/pages/admin/index.astro', 'utf8');
  const esqueleto = readFileSync('src/layouts/Visual.astro', 'utf8');
  it('os endereços antigos da seção levam à página nova, no grupo que apontavam', () => {
    expect(ENDERECO_DA_ADMINISTRACAO).toBe('/admin');
    expect(destinoDaAncoraAntiga('#administracao')).toBe('/admin');
    expect(destinoDaAncoraAntiga('#administracao-cartao')).toBe('/admin');
    expect(destinoDaAncoraAntiga('#administracao-espaco-e-copias')).toBe('/admin#administracao-espaco-e-copias');
    expect(destinoDaAncoraAntiga('#administracao-para-arrumar')).toBe('/admin#administracao-para-arrumar');
    expect(destinoDaAncoraAntiga('#rascunhos')).toBeUndefined();
    expect(destinoDaAncoraAntiga('')).toBeUndefined();
    // Só quem administra é levado: para os outros, a âncora não leva a lugar nenhum, como antes
    expect(conta).toContain("document.querySelector('[data-administra]') ? destinoDaAncoraAntiga(location.hash) : undefined");
    expect(conta).toContain("data-administra={admin ? '' : undefined}");
  });
  it('"Sua conta" não tem mais o cartão, e quem administra tem o atalho, com as pendências ao lado', () => {
    expect(conta).not.toContain('conta__grupo');
    expect(conta).not.toContain('montarAdministracao');
    expect(conta).toMatch(/\{admin && \(\s*<span class="conta__administra">[\s\S]*?contaDePendencias\(conta\.pendenciasDaAdministracao\)/);
  });
  it('a página nova é só dos administradores, e as páginas de dentro voltam para ela', () => {
    expect(admin).toContain("if (!adm) return new Response('Página não encontrada', { status: 404 });");
    expect(admin).toContain('<Visual titulo="Administração" secao="administracao">');
    for (const pagina of ['tipos', 'familias', 'arvore', 'carta', 'fotos-soltas', 'exclusoes', 'transcricao', 'espelho', 'duplicados/index']) {
      const fonte = readFileSync(`src/pages/admin/${pagina}.astro`, 'utf8');
      expect(fonte).not.toContain('/conta#administracao');
      expect(fonte).toContain('<a class="acao" href="/admin">Voltar para a Administração</a>');
    }
  });
  it('o menu do retrato leva à página nova, e nada mais aponta para a seção antiga', () => {
    expect(esqueleto).toContain('<a href={ENDERECO_DA_ADMINISTRACAO}');
    expect(esqueleto).not.toContain('/conta#administracao');
  });
  it('quem chega pelo endereço de um grupo o encontra aberto', () => {
    expect(admin).toContain('if (doEndereco instanceof HTMLDetailsElement) doEndereco.open = true;');
  });
});

describe('o rascunho de relato escrito por outra pessoa (QA de 23/11/2026, docs/historico/qa/2026-11-23-relatorio.md)', () => {
  it('abre a janela de quem está contando, com ?por=, e o próprio relato sem ele', () => {
    expect(enderecoDoRascunhoDeRelato({ memoriaId: 'x6qcfqps', por: 'aguilar' }, 'gui')).toBe('/memorias/x6qcfqps/relato?por=aguilar');
    expect(enderecoDoRascunhoDeRelato({ memoriaId: 'x6qcfqps', por: 'gui' }, 'gui')).toBe('/memorias/x6qcfqps/relato');
  });
  it('a conta e o Início usam o mesmo endereço, e nenhum dos dois monta o link à mão', () => {
    for (const arquivo of ['src/pages/conta.astro', 'src/pages/index.astro']) {
      const fonte = readFileSync(arquivo, 'utf8');
      expect(fonte).toContain('enderecoDoRascunhoDeRelato(');
      expect(fonte).not.toMatch(/memoriaId\}\/relato`/);
    }
  });
});
