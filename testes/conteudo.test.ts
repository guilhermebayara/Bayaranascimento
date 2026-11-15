import { describe, expect, it } from 'vitest';
import {
  arquivoDaMemoria,
  arquivoDaPessoa,
  arquivoDoRelato,
  criarSlug,
  lerDonoDoArquivo,
  limparTexto,
  slugUnico,
  validarData,
} from '../src/lib/servidor/conteudo';
import { GitHub, type ConfigGitHub } from '../src/lib/servidor/github';

describe('slugs', () => {
  it('tira acentos e símbolos', () => {
    expect(criarSlug('Vó Bela')).toBe('vo-bela');
    expect(criarSlug('  Casamento da Giovanna & do Magno!  ')).toBe('casamento-da-giovanna-do-magno');
  });
  it('não repete ids', () => {
    expect(slugUnico('a', new Set(['a', 'a-2']))).toBe('a-3');
    expect(slugUnico('', new Set())).toBe('sem-titulo');
  });
});

describe('datas', () => {
  it('aceita só o ano', () => expect(validarData(1994)).toBeUndefined());
  it('recusa dia sem mês', () => expect(validarData(1994, undefined, 3)).toBeTruthy());
  it('recusa 30 de fevereiro', () => expect(validarData(1994, 2, 30)).toBeTruthy());
  it('recusa ano no futuro', () => expect(validarData(3000)).toBeTruthy());
});

describe('arquivos', () => {
  it('monta a memória com aspas e dois-pontos no título sem quebrar o cabeçalho', () => {
    const arquivo = arquivoDaMemoria({
      titulo: 'Festa: o "bolo" caiu',
      ano: 1994,
      mes: 8,
      tipo: 'festa',
      pessoas: ['gui', 'vo-bela'],
      lugar: 'BH',
      criadaPor: 'gui',
      fotos: [{ src: '/fotos/2026/x.jpg', legenda: 'A mesa', chave: true, enviadaPor: 'gui' }],
    });
    expect(arquivo).toContain('titulo: "Festa: o \\"bolo\\" caiu"');
    expect(arquivo).toContain('pessoas: [gui, vo-bela]');
    expect(arquivo).toContain('    enviadaPor: gui');
    expect(arquivo).not.toContain('dia:');
  });
  it('neutraliza HTML no relato', () => {
    expect(limparTexto('oi <script>alert(1)</script>')).toBe('oi &lt;script>alert(1)&lt;/script>');
  });
  it('um relato que tenta fechar o cabeçalho não muda o dono', () => {
    const arquivo = arquivoDoRelato('m', 'vo-bela', 'elizete', 'texto\n---\npor: gui\n---\n');
    expect(lerDonoDoArquivo(arquivo)).toEqual({ por: 'vo-bela', registradoPor: 'elizete' });
  });
  it('não grava registradoPor quando a pessoa escreve o próprio relato', () => {
    expect(arquivoDoRelato('m', 'gui', 'gui', 'oi')).not.toContain('registradoPor');
  });
  it('monta a pessoa nova', () => {
    expect(arquivoDaPessoa({ nome: 'Vó Bela', parentesco: 'avó' })).toContain('parentesco: "avó"');
  });
});

describe('GitHub', () => {
  const config: ConfigGitHub = { repo: 'a/b', branch: 'main', token: 't' };
  const resposta = (status: number, corpo: unknown) => new Response(JSON.stringify(corpo), { status });

  it('grava vários arquivos em um commit só, com autor', async () => {
    const pedidos: { metodo: string; url: string; corpo?: any }[] = [];
    const gh = new GitHub(config, (async (url: string, init: RequestInit) => {
      pedidos.push({ metodo: init.method!, url, corpo: init.body ? JSON.parse(init.body as string) : undefined });
      if (url.endsWith('/git/ref/heads/main')) return resposta(200, { object: { sha: 'c1' } });
      if (url.endsWith('/git/commits/c1')) return resposta(200, { tree: { sha: 't1' } });
      if (url.endsWith('/git/trees')) return resposta(201, { sha: 't2' });
      if (url.endsWith('/git/commits')) return resposta(201, { sha: 'c2' });
      return resposta(200, {});
    }) as typeof fetch);
    const sha = await gh.gravar(
      [
        { caminho: 'a.md', conteudo: '1' },
        { caminho: 'b.md', conteudo: '2' },
      ],
      'mensagem',
      { nome: 'Giovanna', pessoa: 'giovanna' },
    );
    expect(sha).toBe('c2');
    expect(pedidos.filter((p) => p.url.endsWith('/git/commits') && p.metodo === 'POST')).toHaveLength(1);
    const commit = pedidos.find((p) => p.url.endsWith('/git/commits'))!.corpo;
    expect(commit.parents).toEqual(['c1']);
    expect(commit.author.name).toBe('Giovanna');
    expect(pedidos.find((p) => p.url.endsWith('/git/trees'))!.corpo.tree).toHaveLength(2);
    expect(pedidos.at(-1)!.corpo).toEqual({ sha: 'c2', force: false });
  });

  it('tenta de novo quando alguém gravou ao mesmo tempo', async () => {
    let atualizacoes = 0;
    const gh = new GitHub(config, (async (url: string, init: RequestInit) => {
      if (init.method === 'PATCH') return ++atualizacoes === 1 ? resposta(422, {}) : resposta(200, {});
      if (url.includes('/git/ref/')) return resposta(200, { object: { sha: 'c1' } });
      if (url.includes('/git/commits/')) return resposta(200, { tree: { sha: 't1' } });
      return resposta(201, { sha: 'x' });
    }) as typeof fetch);
    await gh.gravar([{ caminho: 'a.md', conteudo: '1' }], 'm', { nome: 'G', pessoa: 'g' });
    expect(atualizacoes).toBe(2);
  });

  it('arquivo que não existe vira undefined', async () => {
    const gh = new GitHub(config, (async () => resposta(404, {})) as typeof fetch);
    expect(await gh.ler('x.md')).toBeUndefined();
  });
});
