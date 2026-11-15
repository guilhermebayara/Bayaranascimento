// Grava arquivos no repositório do acervo pela API do GitHub.
// Cada envio vira um único registro (commit) com autor e descrição, que é
// o que alimenta o histórico de mudanças. Gravar no repositório dispara a
// republicação do site.

export interface ConfigGitHub {
  repo: string;
  branch: string;
  token: string;
  /** Só em desenvolvimento, para apontar para um servidor local */
  apiUrl?: string;
}

export interface Arquivo {
  caminho: string;
  conteudo: string;
}

export interface Autor {
  nome: string;
  /** id da pessoa, usado para montar um e-mail fictício: o real não vai para o histórico */
  pessoa: string;
}

export class ErroGitHub extends Error {
  constructor(
    public status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

type Buscar = typeof fetch;

export class GitHub {
  private base: string;

  constructor(
    private config: ConfigGitHub,
    // Não guardar `fetch` direto: no Workers, chamá-lo como método de outro objeto falha
    private buscar: Buscar = (entrada, opcoes) => fetch(entrada, opcoes),
  ) {
    this.base = `${(config.apiUrl ?? 'https://api.github.com').replace(/\/$/, '')}/repos/${config.repo}`;
  }

  private async pedir<T>(metodo: string, caminho: string, corpo?: unknown): Promise<T> {
    const resposta = await this.buscar(`${this.base}${caminho}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'acervo-bayara-nascimento',
        ...(corpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
    });
    if (!resposta.ok) {
      throw new ErroGitHub(resposta.status, `GitHub respondeu ${resposta.status} em ${metodo} ${caminho}`);
    }
    return (await resposta.json()) as T;
  }

  /** Lê um arquivo de texto. undefined quando não existe. */
  async ler(caminho: string): Promise<string | undefined> {
    try {
      const dados = await this.pedir<{ content: string; encoding: string }>(
        'GET',
        `/contents/${caminho.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(this.config.branch)}`,
      );
      const binario = atob(dados.content.replace(/\n/g, ''));
      return new TextDecoder().decode(Uint8Array.from(binario, (c) => c.charCodeAt(0)));
    } catch (erro) {
      if (erro instanceof ErroGitHub && erro.status === 404) return undefined;
      throw erro;
    }
  }

  /** Grava um ou mais arquivos em um único commit. Tenta de novo se alguém gravou ao mesmo tempo. */
  async gravar(arquivos: Arquivo[], mensagem: string, autor: Autor): Promise<string> {
    const ref = `heads/${this.config.branch}`;
    let ultimoErro: unknown;
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        const { object } = await this.pedir<{ object: { sha: string } }>('GET', `/git/ref/${ref}`);
        const commitAtual = await this.pedir<{ tree: { sha: string } }>('GET', `/git/commits/${object.sha}`);
        const arvore = await this.pedir<{ sha: string }>('POST', '/git/trees', {
          base_tree: commitAtual.tree.sha,
          tree: arquivos.map((a) => ({ path: a.caminho, mode: '100644', type: 'blob', content: a.conteudo })),
        });
        const pessoa = { name: autor.nome, email: `${autor.pessoa}@memorias.bayara.com.br` };
        const commit = await this.pedir<{ sha: string }>('POST', '/git/commits', {
          message: mensagem,
          tree: arvore.sha,
          parents: [object.sha],
          author: pessoa,
          committer: pessoa,
        });
        await this.pedir('PATCH', `/git/refs/${ref}`, { sha: commit.sha, force: false });
        return commit.sha;
      } catch (erro) {
        ultimoErro = erro;
        // 409 e 422 aqui significam que o branch andou enquanto montávamos o commit
        if (!(erro instanceof ErroGitHub) || (erro.status !== 409 && erro.status !== 422)) throw erro;
      }
    }
    throw ultimoErro;
  }
}
