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
