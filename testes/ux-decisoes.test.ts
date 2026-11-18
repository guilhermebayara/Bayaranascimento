// Decisões do Gui sobre a interface, depois do QA de UX de 16/11/2026 (docs/historico/ux/fluxos.md).
// Conferências no código, para nenhuma delas voltar atrás sem querer.
import { readFileSync } from 'node:fs';
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

  // A página Rascunhos saiu (resposta do Gui à P150, 17/11/2026): os rascunhos e a lixeira moram em "Sua conta"
  it('a lixeira tem um caminho a partir dos rascunhos, em "Sua conta"', () => {
    expect(fonte('src/pages/conta.astro')).toContain('href="/lixeira"');
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
  it('na memória, um atalho no alto para quem chega querendo contar, e o convite grande no fim', () => {
    // docs/visual.md, "Página da memória": a ação principal continua ao alcance logo abaixo do título
    const pagina = fonte('src/pages/memorias/[id].astro');
    const atalho = pagina.indexOf('abre__atalho');
    expect(atalho).toBeGreaterThan(pagina.indexOf('<h1'));
    expect(atalho).toBeLessThan(pagina.indexOf('class="corpo grade"'));
    expect(pagina.indexOf('class="convite miolo"')).toBeGreaterThan(pagina.indexOf('class="parede"'));
    // Três no código, dois na tela: o atalho do alto e, no fim, o convite ou a linha quieta de quem já
    // contou (resposta do Gui à P54 do QA de design de 17/11/2026)
    expect(pagina.match(/href=\{`\/memorias\/\$\{memoria\.id\}\/relato`\}/g)).toHaveLength(3);
  });

  it('fica no alto da pessoa e do capítulo', () => {
    // Antes da família e dos capítulos de dentro
    // Na pessoa (visual novo): depois do nome, dentro da abertura, antes da voz e dos laços
    const pessoa = (fonte('src/pages/pessoas/[id]/index.astro') + fonte('src/lib/servidor/pagina-da-pessoa.ts'));
    const acoesDaPessoa = pessoa.indexOf('verbete__acoes');
    expect(acoesDaPessoa).toBeGreaterThan(pessoa.indexOf('<h1'));
    expect(acoesDaPessoa).toBeLessThan(pessoa.indexOf('class="verbete__lacos miolo"'));
    expect(acoesDaPessoa).toBeLessThan(pessoa.indexOf('class="verbete__palavras"'));
    // No capítulo (visual novo): depois do título, dentro da capa, antes dos capítulos de dentro e dos marcos
    const capitulo = fonte('src/pages/capitulos/[id]/index.astro');
    const acoesDoCapitulo = capitulo.indexOf('capitulo__acoes');
    expect(acoesDoCapitulo).toBeGreaterThan(capitulo.indexOf('<h1'));
    expect(acoesDoCapitulo).toBeLessThan(capitulo.indexOf('class="capitulo__corpo"'));
    expect(acoesDoCapitulo).toBeLessThan(capitulo.indexOf('class="marcos"'));
  });
});

describe('textos do parentesco', () => {
  it('os laços usam "como se referir" em vez de "filho ou filha" quando ele existe', () => {
    const editar = fonte('src/pages/pessoas/[id]/editar.astro');
    expect(editar).not.toContain('`${chamar} é filho ou filha');
    expect(editar).not.toContain('`é filho ou filha de ${chamar}`');
  });

  it('na própria página, a família aparece com o possessivo, como os laços do coração', () => {
    expect((fonte('src/pages/pessoas/[id]/index.astro') + fonte('src/lib/servidor/pagina-da-pessoa.ts'))).toMatch(/ehMinha \? possessivo\(relacao/);
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
    expect(fonte('src/components/formularios/Pagina.astro')).toContain('marcarEnvios()');
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
    expect((fonte('src/pages/pessoas/[id]/index.astro') + fonte('src/lib/servidor/pagina-da-pessoa.ts'))).toContain('/nova?com=');
    expect(fonte('src/pages/capitulos/[id]/index.astro')).toContain('/nova?capitulo=');
  });
});

describe('laços', () => {
  it('cada laço tem "Editar", e remover fica dentro da edição', () => {
    const editar = fonte('src/pages/pessoas/[id]/editar.astro');
    for (const acao of ['filiacao-salvar', 'coracao-salvar', 'resumido-salvar', 'casal-salvar']) expect(editar).toContain(`value="${acao}"`);
    expect(editar.match(/<summary class="botao botao--leve">Editar<\/summary>/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it('listas curtas viram botões de opção: filiação e fase do casal; a proximidade é o slider do círculo', () => {
    const editar = fonte('src/pages/pessoas/[id]/editar.astro');
    expect(editar).not.toMatch(/<select name="(qualidade|faseTipo|proximidade)"/);
    expect(editar).toMatch(/<Opcoes nome="qualidade"/);
    // A fase de cada linha da edição do casal; e a primeira do cadastro (PrimeiraFase.astro)
    expect(editar).toContain('<Opcoes nome={`fase-${n}-tipo`}');
    expect(fonte('src/components/formularios/PrimeiraFase.astro')).toContain('<Opcoes nome="faseTipo"');
    // Decisão do Gui, 18/11/2026: a proximidade virou o slider em todo lugar
    expect(editar).not.toMatch(/<Opcoes nome="proximidade"/);
    expect(editar).toMatch(/<CampoProximidade /);
  });

  it('a ficha vem antes dos laços na edição', () => {
    const editar = fonte('src/pages/pessoas/[id]/editar.astro');
    expect(editar.indexOf('id="ficha"')).toBeLessThan(editar.indexOf('id="lacos"'));
  });

  it('a API do casal aceita as fases numeradas da edição', () => {
    expect(fonte('src/pages/api/lacos.ts')).toContain('lerFasesDoFormulario(dados)');
    expect(fonte('src/lib/fases-do-formulario.ts')).toMatch(/fase-\$\{n\}-remover/);
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
    // No visual novo, a linha do tempo é a do Explorar (explorar/Linha.astro), que recebe as memórias
    // já na ordem: a pessoa e o tema entregam das mais recentes para as mais antigas, e os marcos do
    // capítulo seguem a mesma ordem
    expect((fonte('src/pages/pessoas/[id]/index.astro') + fonte('src/lib/servidor/pagina-da-pessoa.ts'))).toMatch(/listarMemorias\(usuario, \{ integrante: pessoa\.id(, comRascunhos: true)? \}\)\)\.reverse\(\)/);
    expect(fonte('src/pages/temas/[id].astro')).toMatch(/listarMemorias\(usuario, \{ tema: tema\.id \}\)\)\.reverse\(\)/);
    expect(fonte('src/pages/capitulos/[id]/index.astro')).toContain('maisRecentesPrimeiro(memorias)');
  });
});

describe('salto por década', () => {
  it('faixa com as décadas, só com mais de uma', () => {
    const linha = fonte('src/components/explorar/Linha.astro');
    expect(linha).toContain('decadas.length > 1 &&');
    expect(linha).toContain('href={`#decada-${d}`}');
  });
});

// Observações do Gui na sessão H (18/11/2026), no cadastro de laços
describe('cadastro de laços depois da sessão H', () => {
  const editar = fonte('src/pages/pessoas/[id]/editar.astro');
  const css = readFileSync('src/visual/telas/formulario.css', 'utf8');
  it('"Pular esta pergunta" fica na linha da ação principal, logo embaixo dos campos', () => {
    const acoes = editar.slice(editar.indexOf('<div class="acoes acoes--pergunta">'), editar.indexOf('</form>', editar.indexOf('<div class="acoes acoes--pergunta">')));
    expect(acoes).toContain('>Adicionar</button>');
    expect(acoes).toContain("'Pular esta pergunta'");
  });
  it('laço do coração: os campos mudam de propósito, e a tela diz o que muda (correção do Gui, 18/11/2026)', () => {
    const doCoracao = editar.slice(editar.indexOf("{g.novo.laco === 'coracao' && podeLacos && ("), editar.indexOf("{g.novo.laco === 'resumido' && ("));
    // A escolha num seletor segmentado, com uma frase curta só da opção escolhida, colada nele
    expect(doCoracao).toMatch(/<Segmentado[^]*?nome="reconhece"/);
    expect(doCoracao).toMatch(/<span data-para="coracao-so-eu">\{ehMinha \? 'Um laço seu, que só vale para você\.'/);
    expect(doCoracao).toMatch(/<span data-para="coracao-familia" hidden>\{ehMinha \? 'Um parente de consideração seu/);
    // "Com quem" fica fora da troca, e na página de outra pessoa o "só eu" não pergunta: o título já diz
    expect(doCoracao).toContain("data-para={g.novo.laco === 'coracao' ? 'coracao-meu coracao-familia' : undefined}");
    // Cada opção na mesma caixa, com só o que é dela
    const soEu = doCoracao.slice(doCoracao.indexOf('<div class="reconhece__painel" data-para="coracao-so-eu">'), doCoracao.indexOf('<div class="reconhece__painel" data-para="coracao-familia" hidden>'));
    const familia = doCoracao.slice(doCoracao.indexOf('<div class="reconhece__painel" data-para="coracao-familia" hidden>'));
    for (const campo of ['name="nomeDoLaco"', '<CampoProximidade ', 'name="privado"']) {
      expect(soEu).toContain(campo);
      expect(familia).not.toContain(campo);
    }
    expect(familia).toMatch(/<option value="filho">[^]*<option value="pai">[^]*<option value="irmao">/);
    expect(css).toMatch(/\.reconhece__troca \{[^}]*background: var\(--papel-recuo\);/);
  });
  it('a história inteira do casal já no cadastro, guiado e completo, e "O que aconteceu depois?" como título pequeno', () => {
    // Revisto pelo Gui em 18/11/2026: "Adicionar o que aconteceu depois" é uma ação, no cadastro e na edição
    expect(editar.match(/<FasesDepois /g)?.length).toBe(3);
    const fases = fonte('src/components/formularios/FasesDepois.astro');
    expect(fases).toContain("numerada === undefined ? 'faseTipo'");
    expect(fases).toContain('>Adicionar o que aconteceu depois</button>');
    expect(css).toMatch(/\.fases-depois__linha > legend \{[^}]*font-family: var\(--mono\);/);
  });
});
