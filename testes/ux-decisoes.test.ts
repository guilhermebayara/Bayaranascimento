// Decisões do Gui sobre a interface, depois do QA de UX de 16/11/2026 (docs/ux/fluxos.md).
// Conferências no código, para nenhuma delas voltar atrás sem querer.
import { describe, expect, it } from 'vitest';
import { textoEnviando } from '../src/lib/cliente/enviando';

const fontes: Record<string, string> = Object.fromEntries(
  Object.entries(import.meta.glob<string>('../src/**/*.{astro,ts}', { query: '?raw', import: 'default', eager: true })).map(([k, v]) => [k.replace('../', ''), v]),
);
const fonte = (caminho: string) => {
  const texto = fontes[caminho];
  if (texto === undefined) throw new Error(`Arquivo não encontrado: ${caminho}`);
  return texto;
};

describe('formulário de memória', () => {
  it('o tipo de momento começa sem marcação e é obrigatório', () => {
    const nova = fonte('src/pages/nova.astro');
    expect(nova).not.toMatch(/TIPO_PADRAO/);
    expect(nova).toMatch(/name="tipo" value=\{tipo\.id\} checked=\{tipo\.id === memoria\?\.tipo\} required/);
  });

  it('"Quem pode ver?" pergunta primeiro todos ou núcleos, depois quais núcleos', () => {
    const nova = fonte('src/pages/nova.astro');
    expect(nova.indexOf('name="visibilidade" value="todos"')).toBeLessThan(nova.indexOf('name="nucleos"'));
  });

  it('publicar usa o mesmo verbo no resumo, no botão e no recado', () => {
    const nova = fonte('src/pages/nova.astro');
    const api = fonte('src/pages/api/memorias.ts');
    expect(nova).toContain('Confira antes de publicar');
    expect(nova).toContain('Publicar memória');
    expect(nova).toContain("'Memória publicada'");
    expect(nova + api).not.toMatch(/Memória guardada|Guardando…|antes de guardar/);
  });

  it('a data é a mesma peça na memória e na ficha de pessoa, com ano, mês e dia nessa ordem', () => {
    expect(fonte('src/pages/nova.astro')).toContain('<CampoData');
    expect(fonte('src/components/FichaDoIntegrante.astro')).toContain('<CampoData');
    const campo = fonte('src/components/CampoData.astro');
    expect(campo.indexOf("nome('ano')")).toBeLessThan(campo.indexOf("nome('mes')"));
    expect(campo.indexOf("nome('mes')")).toBeLessThan(campo.indexOf("nome('dia')"));
  });
});

describe('corrigir e desfazer', () => {
  it('trazer de volta se diz "Restaurar" no histórico e na lixeira', () => {
    for (const arquivo of ['src/pages/memorias/[id]/historico.astro', 'src/pages/lixeira.astro']) {
      const botoes = [...fonte(arquivo).matchAll(/<button[^>]*>([^<{]+)<\/button>/g)].map((m) => m[1].trim());
      expect(botoes.length).toBeGreaterThan(0);
      for (const b of botoes) expect(b).toMatch(/^Restaurar/);
    }
  });

  it('excluir capítulo passa por uma página de confirmação', () => {
    expect(fonte('src/pages/capitulos/[id]/editar.astro')).not.toContain('botao--perigo');
    expect(fonte('src/pages/capitulos/[id]/excluir.astro')).toContain('value="excluir"');
  });

  it('remover laço e apagar casal pedem confirmação no próprio lugar', () => {
    const editar = fonte('src/pages/pessoas/[id]/editar.astro');
    for (const acao of ['filiacao-remover', 'casal-remover', 'coracao-remover']) {
      expect(editar).not.toMatch(new RegExp(`<button[^>]*value="${acao}"`));
      expect(editar).toContain(`acao="${acao}"`);
    }
  });

  it('a lixeira tem um caminho a partir dos rascunhos', () => {
    expect(fonte('src/pages/rascunhos.astro')).toContain('href="/lixeira"');
  });
});

describe('escolher pessoa', () => {
  it('"Com quem", "Quem está contando" e "Partir de" usam a busca com sugestão', () => {
    expect(fonte('src/pages/pessoas/[id]/editar.astro')).toMatch(/buscaDePessoa\(comQuem, \{ nomeNovo/);
    expect(fonte('src/pages/memorias/[id]/relato.astro')).toContain('buscaDePessoa(');
    expect(fonte('src/pages/nova.astro')).toContain('buscaDePessoa(relatoPor)');
    expect(fonte('src/pages/arvore.astro')).toContain('buscaDePessoa(centro)');
  });
});

describe('ação principal', () => {
  it('fica no alto da memória, da pessoa e do capítulo', () => {
    // Antes das fotos, na memória; antes da família e dos capítulos de dentro, na pessoa e no capítulo
    const conteudo: Record<string, string> = {
      'src/pages/memorias/[id].astro': '<Foto',
      'src/pages/pessoas/[id]/index.astro': '<section class="familia">',
      'src/pages/capitulos/[id]/index.astro': '<section class="familia">',
    };
    for (const [arquivo, marco] of Object.entries(conteudo)) {
      const pagina = fonte(arquivo);
      const acoes = pagina.indexOf('acoes--pagina');
      expect(acoes).toBeGreaterThan(pagina.indexOf('<h1>'));
      expect(acoes).toBeLessThan(pagina.indexOf(marco));
    }
  });
});

describe('textos do parentesco', () => {
  it('os laços usam "como se referir" em vez de "filho ou filha" quando ele existe', () => {
    const editar = fonte('src/pages/pessoas/[id]/editar.astro');
    expect(editar).not.toContain('`${chamar} é filho ou filha');
    expect(editar).not.toContain('`é filho ou filha de ${chamar}`');
  });

  it('na própria página, a família aparece com o possessivo, como os laços do coração', () => {
    expect(fonte('src/pages/pessoas/[id]/index.astro')).toMatch(/ehMinha \? possessivo\(relacao/);
  });
});

describe('enviando', () => {
  it('o botão diz o que está acontecendo, com o verbo dele', () => {
    expect(textoEnviando('Salvar página')).toBe('Salvando…');
    expect(textoEnviando('Adicionar laço')).toBe('Adicionando…');
    expect(textoEnviando('Restaurar esta versão')).toBe('Restaurando…');
    expect(textoEnviando('Excluir e mandar para a lixeira')).toBe('Excluindo…');
    expect(textoEnviando('Concluir')).toBe('Enviando…');
  });

  it('não desabilita o botão, que precisa ir com o formulário', () => {
    const enviando = fonte('src/lib/cliente/enviando.ts');
    expect(enviando).not.toMatch(/\.disabled = true/);
    expect(fonte('src/layouts/Base.astro')).toContain('marcarEnvios()');
  });
});

// Segunda rodada (pedido do Gui, 16/11/2026): estrutura dos formulários e dos laços
import { sugerir } from '../src/lib/cliente/quem-estava';
import { periodosDasFases } from '../src/lib/parentesco';

describe('"Quem estava?" usa os laços para sugerir nomes', () => {
  const dados = {
    eu: 'gui',
    nomes: { gui: 'Gui', giovanna: 'Giovanna', elizete: 'Elizete', aguilar: 'Aguilar', magno: 'Lucas Magno', bela: 'Vó Bela', ed: 'Ed' },
    proximos: {
      gui: ['elizete', 'aguilar', 'giovanna'],
      giovanna: ['elizete', 'aguilar', 'gui', 'magno'],
      magno: ['giovanna'],
      elizete: ['gui', 'giovanna', 'aguilar', 'bela'],
    } as Record<string, string[]>,
  };

  it('sem ninguém marcado, sugere quem escreve e a família dela', () => {
    const s = sugerir(dados, []);
    expect(s.titulo).toBe('Você e sua família');
    expect(s.ids).toEqual(['gui', 'elizete', 'aguilar', 'giovanna']);
  });

  it('com alguém marcado, sugere a família dessa pessoa, quem tem mais laços com os marcados primeiro', () => {
    const s = sugerir(dados, ['giovanna', 'elizete']);
    expect(s.titulo).toBe('Família de quem você marcou');
    expect(s.ids[0]).toBe('aguilar');
    expect(s.ids).not.toContain('giovanna');
    expect(s.ids).toContain('magno');
    expect(s.ids).toContain('bela');
    expect(s.ids).not.toContain('ed');
  });

  it('a lista inteira fica recolhida e agrupada por família, com a busca e "Cadastrar"', () => {
    const componente = fonte('src/components/QuemEstava.astro');
    expect(componente).toContain('Ver todos os nomes');
    expect(fonte('src/lib/cliente/quem-estava.ts')).toContain('todos.open = false');
    expect(fonte('src/lib/cliente/quem-estava.ts')).toContain('Cadastrar ');
  });
});

describe('etapas da memória', () => {
  it('uma pergunta por etapa, e as opcionais marcadas para mostrar "Pular esta etapa"', () => {
    const nova = fonte('src/pages/nova.astro');
    const etapas = [...nova.matchAll(/data-etapa="([^"]+)"/g)].map((m) => m[1]);
    expect(etapas).toEqual(['O que aconteceu', 'Quando e onde', 'Quem estava', 'Fotos', 'Relato', 'Capítulo e temas', 'Quem vê']);
    for (const opcional of ['Quem estava', 'Fotos', 'Relato', 'Capítulo e temas']) expect(nova).toContain(`data-etapa="${opcional}" data-opcional`);
    expect(fonte('src/lib/cliente/etapas.ts')).toContain("'Pular esta etapa'");
  });

  it('numa memória nova, os núcleos vêm sugeridos a partir de quem estava, até a pessoa mexer neles', () => {
    const nova = fonte('src/pages/nova.astro');
    expect(nova).toMatch(/if \(idExistente \|\| mexeuNosNucleos\) return;/);
    expect(nova).toContain('data-nucleos-sugeridos');
  });

  it('pessoa e capítulo têm atalho para uma memória nova já preenchida', () => {
    expect(fonte('src/pages/pessoas/[id]/index.astro')).toContain('/nova?com=');
    expect(fonte('src/pages/capitulos/[id]/index.astro')).toContain('/nova?capitulo=');
  });
});

describe('laços', () => {
  it('cada laço tem "Editar", e remover fica dentro da edição', () => {
    const editar = fonte('src/pages/pessoas/[id]/editar.astro');
    for (const acao of ['filiacao-salvar', 'coracao-salvar', 'resumido-salvar', 'casal-salvar']) expect(editar).toContain(`value="${acao}"`);
    expect(editar.match(/<summary class="botao botao--leve">Editar<\/summary>/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('listas curtas viram botões de opção: filiação, fase do casal e proximidade', () => {
    const editar = fonte('src/pages/pessoas/[id]/editar.astro');
    expect(editar).not.toMatch(/<select name="(qualidade|faseTipo|proximidade)"/);
    expect(editar).toMatch(/<Opcoes nome="qualidade"/);
    expect(editar).toMatch(/<Opcoes nome="faseTipo"/);
    expect(editar).toMatch(/<Opcoes nome="proximidade"/);
  });

  it('a ficha vem antes dos laços na edição', () => {
    const editar = fonte('src/pages/pessoas/[id]/editar.astro');
    expect(editar.indexOf('id="ficha"')).toBeLessThan(editar.indexOf('id="lacos"'));
  });

  it('a API do casal aceita as fases numeradas da edição', () => {
    expect(fonte('src/pages/api/lacos.ts')).toMatch(/fase-\$\{n\}-remover/);
  });
});

describe('fases do casal', () => {
  it('uma fase sem fim acaba quando a seguinte começa; só a última fica "desde"', () => {
    expect(
      periodosDasFases([
        { tipo: 'namoro', inicioAno: 2015, fimAno: null },
        { tipo: 'noivado', inicioAno: 2018, fimAno: null },
        { tipo: 'casamento', inicioAno: 2020, fimAno: null },
      ]),
    ).toEqual(['2015 a 2018', '2018 a 2020', 'desde 2020']);
  });

  it('a separação é um momento, e fase sem ano fica sem texto', () => {
    expect(
      periodosDasFases([
        { tipo: 'casamento', inicioAno: null, fimAno: null },
        { tipo: 'separacao', inicioAno: 2019, fimAno: null },
      ]),
    ).toEqual(['até 2019', 'em 2019']);
  });
});

describe('ficha de pessoa', () => {
  it('"Já faleceu" fica fora do recolhido, e "É outra pessoa?" só aparece com nome repetido', () => {
    const ficha = fonte('src/components/FichaDoIntegrante.astro');
    expect(ficha.indexOf('name="falecido"')).toBeLessThan(ficha.indexOf('<details class="mais"'));
    expect(ficha).toContain('data-nome-repetido');
    expect(ficha).toMatch(/repetido\.hidden = !igual/);
  });
});

// Terceira leva (pedidos do Gui, 16/11/2026): data da adoção, cadastro guiado e tipos mais usados
describe('data da adoção', () => {
  it('é guardada na filiação por uma migração nova, só nos laços adotivos', () => {
    const banco = fonte('src/lib/servidor/banco.ts');
    expect(banco).toContain("id: '014-data-da-adocao'");
    for (const coluna of ['adocao_ano', 'adocao_mes', 'adocao_dia']) expect(banco).toContain(`ALTER TABLE filiacoes ADD COLUMN ${coluna}`);
    expect(fonte('src/lib/servidor/repositorio.ts')).toMatch(/const data = qualidade === 'adotiva' \? adocao : null;/);
  });

  it('o formulário mostra a data só com "Adotiva" marcada, e a API confere a data', () => {
    expect(fonte('src/pages/pessoas/[id]/editar.astro')).toContain('<CampoData prefixo="adocao"');
    expect(fonte('src/pages/api/lacos.ts')).toMatch(/if \(qualidade === 'adotiva'\) \{/);
    expect(fonte('src/pages/api/lacos.ts')).toContain('validarData(ano');
  });
});

describe('cadastro guiado', () => {
  it('primeiro "da família ou do coração"; depois, as perguntas de cada caminho; bicho vai direto para a família', () => {
    const editar = fonte('src/pages/pessoas/[id]/editar.astro');
    expect(editar).toContain("familia: pessoa.tipo === 'bicho' ? ['pais'] : ['pais', 'casal', 'filhos'],");
    expect(editar).toContain("coracao: ['coracao', 'casal', 'parentes'],");
    expect(editar).toContain('Como {chamar} se liga a vocês?');
    expect(editar).toContain("'Pular esta pergunta'");
  });

  it('parentes de amigo só para quem é de fora das famílias, como na regra do laço resumido', () => {
    expect(fonte('src/pages/pessoas/[id]/editar.astro')).toContain("passo === 'parentes' && !deFora");
  });

  it('modo completo, com todos os tipos de laço, a partir de qualquer pergunta, e pode ficar como padrão', () => {
    const editar = fonte('src/pages/pessoas/[id]/editar.astro');
    expect(editar.match(/Ver todos os tipos de laço/g)?.length).toBeGreaterThanOrEqual(3);
    expect(editar).toContain("if (modoPedido === 'sempre') Astro.cookies.set(COOKIE_COMPLETO");
    expect(editar).toContain("if (modoPedido === 'guiado') Astro.cookies.delete(COOKIE_COMPLETO");
  });

  it('cada pergunta volta para ela mesma depois de adicionar, para adicionar mais alguém', () => {
    expect(fonte('src/pages/pessoas/[id]/editar.astro')).toMatch(/const volta = guiado \? `\$\{enderecoDoPasso\(passo\)\}#guia`/);
  });

  it('uma ação principal por tela', () => {
    const editar = fonte('src/pages/pessoas/[id]/editar.astro');
    expect(editar).toContain("class={jaNoPasso(passo).length > 0 ? 'botao botao--leve' : 'botao'} type=\"submit\">Adicionar");
  });
});

describe('tipos de momento', () => {
  it('com mais de oito tipos, os seis mais usados à vista e o resto em "Ver mais tipos"', () => {
    const nova = fonte('src/pages/nova.astro');
    expect(nova).toContain('const LIMITE_DE_TIPOS = 8;');
    expect(nova).toContain('const A_VISTA = 6;');
    expect(nova).toContain('Ver mais tipos');
    // O tipo já escolhido nunca fica escondido
    expect(nova).toContain('open={tiposRecolhidos.some((t) => t.id === memoria?.tipo)}');
  });
});

// Quarta leva (pedidos do Gui, 16/11/2026)
describe('como se referir de quem entra pelo nome novo', () => {
  it('o cadastro rápido guarda Ela, Ele ou nada', () => {
    expect(fonte('src/lib/servidor/repositorio.ts')).toContain('export async function criarIntegrante(id: string, nome: string, criadoPor: string, tratamento: Tratamento = null)');
    expect(fonte('src/pages/api/lacos.ts')).toContain("campo(dados, 'tratamentoNovo', 3)");
    expect(fonte('src/pages/api/memorias.ts')).toContain("tratamento: z.enum(['ela', 'ele']).nullable().optional()");
  });

  it('a pergunta aparece junto do nome novo, nos laços e na memória', () => {
    expect(fonte('src/pages/pessoas/[id]/editar.astro').match(/<ComoSeReferir /g)?.length).toBe(2);
    expect(fonte('src/pages/nova.astro')).toContain('data-tratamento-novo');
  });
});

describe('linha do tempo', () => {
  it('mais recentes primeiro, em todas as páginas que mostram a linha do tempo', () => {
    expect(fonte('src/components/LinhaDoTempo.astro')).toContain('agruparPorAno(maisRecentesPrimeiro(memorias))');
  });
});

describe('salto por década', () => {
  it('barra fixa com as décadas, só com mais de uma, e o filtro tira as que ficam vazias', () => {
    const linha = fonte('src/components/LinhaDoTempo.astro');
    expect(linha).toContain('decadas.length > 1 &&');
    expect(linha).toContain('id={`decada-${decadaDe(ano)}`}');
    expect(linha).toContain("item.hidden = !raiz.querySelector(`.ano[data-decada=\"${item.dataset.decada}\"]:not([hidden])`)");
  });
});
