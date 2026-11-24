// A cópia do acervo em partes (decisão do Gui, 23/11/2026, nas respostas à medição M2; sessão D1e).
//
// A cópia inteira num pedido só gastava de 63 a 125 ms de CPU com o acervo cheio, de 6 a 12 vezes o limite
// de 10 ms por pedido do plano gratuito. Agora quem copia pede, em `/api/copia`, primeiro o índice (as
// tabelas e quantas linhas cada uma tem) e depois cada tabela em páginas, e junta as partes no aparelho num
// arquivo só, no mesmo formato de sempre: `{ acervo, gerada_em, banco, tabelas }`, com as linhas de cada
// tabela como objetos. Quem junta: o script do Drive (scripts/copia-no-drive.gs, com a mesma conta escrita
// à mão, porque o Apps Script não importa este arquivo) e o "Baixar cópia do acervo" da Administração
// (baixarCopiaEmPartes, abaixo). Tudo aqui é sem servidor e sem tela, para os testes conferirem que juntar
// as partes dá a cópia de antes.
//
// O índice não tem a chave "tabelas": o script antigo do Drive procurava "tabelas" na resposta, e assim ele
// falha com o e-mail do Google em vez de guardar o índice como se fosse a cópia.
//
// A marca de mudança (item 1 da revisão D1f, 24/11/2026; src/lib/servidor/marca-da-copia.ts): o índice e cada
// parte trazem `marca`, um número que sobe a cada gravação no acervo (as tabelas de registro não contam,
// D1f2). Quem junta só aceita a sequência em que a marca de toda parte é a do índice: nada foi gravado no
// meio, e o arquivo restaura. Se mudou, a sequência inteira é refeita, até TENTATIVAS_DA_COPIA vezes; depois
// disso, falha sem devolver nada.

/** A marca dentro do arquivo: o script e o espelho encontram a cópia por ela (ver "O nome do site", em docs/decisoes.md). */
export const MARCA_DO_ACERVO = 'Bayara Nascimento';

/** O endereço da cópia: o índice sem parâmetros, cada parte com `tabela` e, da segunda página em diante, `depois`. */
export const ENDERECO_DA_COPIA = '/api/copia';

export interface SituacaoDoBancoNaCopia {
  tamanho_em_bytes: number | null;
  aviso_a_partir_de: number;
  limite_do_plano: number;
  passou_do_aviso: boolean;
}

/** O que o primeiro pedido devolve: as tabelas, em ordem de nome, e quantas linhas cada uma tinha. */
export interface IndiceDaCopia {
  acervo: typeof MARCA_DO_ACERVO;
  gerada_em: string;
  /** A marca de mudança do banco na hora do índice */
  marca: number;
  banco: SituacaoDoBancoNaCopia;
  indice: { tabela: string; linhas: number }[];
}

/**
 * Uma página de uma tabela, compacta: os nomes das colunas uma vez só e as linhas como listas de valores.
 * `proxima` é o que pedir em `depois` para a página seguinte; vazia quando a tabela acabou.
 */
export interface ParteDaCopia {
  acervo: typeof MARCA_DO_ACERVO;
  tabela: string;
  /** A marca de mudança do banco na hora desta página, lida na mesma consulta das linhas */
  marca: number;
  colunas: string[];
  linhas: unknown[][];
  proxima: number | null;
}

/** A cópia inteira, como sempre foi: a que a restauração e o espelho leem. */
export interface CopiaDoAcervoInteira {
  acervo: typeof MARCA_DO_ACERVO;
  gerada_em: string;
  banco: SituacaoDoBancoNaCopia;
  tabelas: Record<string, Record<string, unknown>[]>;
}

/** O endereço de uma parte. */
export function enderecoDaParte(tabela: string, depois: number | null = null): string {
  const busca = new URLSearchParams({ tabela });
  if (depois !== null) busca.set('depois', String(depois));
  return `${ENDERECO_DA_COPIA}?${busca}`;
}

/** As linhas de uma parte como objetos, com as colunas na ordem do banco. */
export function linhasComoObjetos(parte: Pick<ParteDaCopia, 'colunas' | 'linhas'>): Record<string, unknown>[] {
  return parte.linhas.map((valores) => {
    const linha: Record<string, unknown> = {};
    parte.colunas.forEach((coluna, i) => {
      linha[coluna] = valores[i];
    });
    return linha;
  });
}

/** Junta o índice e as partes (na ordem em que chegaram) na cópia inteira. */
export function juntarPartes(indice: Omit<IndiceDaCopia, 'marca'>, partes: Omit<ParteDaCopia, 'marca'>[]): CopiaDoAcervoInteira {
  const tabelas: CopiaDoAcervoInteira['tabelas'] = {};
  for (const { tabela } of indice.indice) tabelas[tabela] = [];
  for (const parte of partes) {
    const linhas = tabelas[parte.tabela];
    if (!linhas) throw new Error(`A parte da tabela ${parte.tabela} não está no índice da cópia.`);
    for (const linha of linhasComoObjetos(parte)) linhas.push(linha);
  }
  return { acervo: indice.acervo, gerada_em: indice.gerada_em, banco: indice.banco, tabelas };
}

/** "acervo-2026-12-01.json", com o dia de São Paulo, como o script do Drive grava. */
export function nomeDoArquivoDaCopia(geradaEm: string): string {
  const dia = new Date(new Date(geradaEm).getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return `acervo-${dia}.json`;
}

/** Quantos pedidos de parte o índice prevê: uma página por tabela vazia, e as cheias divididas. */
export function partesPrevistas(indice: IndiceDaCopia, linhasPorParte: (tabela: string) => number): number {
  return indice.indice.reduce((soma, t) => soma + Math.max(1, Math.ceil(t.linhas / linhasPorParte(t.tabela))), 0);
}

/**
 * Quantas linhas vão em cada parte: o bastante para cada parte ter até uns 150 KB com o acervo cheio. Com mais
 * que isso, a parte passa a pesar mais que o piso de qualquer pedido (medido com o medidor de CPU da M2, fase
 * "copias"; números em docs/desempenho/2026-11-23-d1e.md). As tabelas com texto escrito vão em páginas
 * menores, pelo tamanho médio da linha no acervo cheio: relatos, 1 KB; mensagens, 340 bytes; memórias, 190
 * bytes; as versões guardam a memória inteira a cada edição. Tabela nova com linha grande entra aqui.
 */
export const LINHAS_POR_PARTE = 1000;
const LINHAS_POR_PARTE_DA_TABELA: Record<string, number> = {
  relatos: 150,
  relato_mensagens: 400,
  versoes: 100,
  memorias: 500,
  cartas: 100,
  avisos: 500,
  sugestoes: 500,
  capitulos: 500,
};
export function linhasPorParte(tabela: string): number {
  return LINHAS_POR_PARTE_DA_TABELA[tabela] ?? LINHAS_POR_PARTE;
}

/** Quantas vezes cada parte é pedida antes de desistir, e a espera entre uma e outra. */
export const TENTATIVAS_POR_PARTE = 3;

/** Quantas vezes a sequência inteira é feita quando o acervo muda no meio dela (a marca). */
export const TENTATIVAS_DA_COPIA = 4;

/** O erro de quando o acervo mudou no meio de todas as tentativas: a tela diz para tentar de novo depois. */
export class AcervoMudouNaCopia extends Error {
  constructor() {
    super(`O acervo mudou durante a cópia nas ${TENTATIVAS_DA_COPIA} tentativas.`);
  }
}

/**
 * Pede o índice e as partes e devolve a cópia inteira. `buscar` faz o pedido (no navegador, o fetch; nos
 * testes, a rota de verdade) e devolve o JSON; `aoAndar` diz o andamento ("Baixando 3 de 14"). Uma parte que
 * falha é pedida de novo até TENTATIVAS_POR_PARTE vezes; se ainda falhar, nada é devolvido pela metade. Uma
 * parte com a marca diferente da do índice recomeça a sequência, até TENTATIVAS_DA_COPIA vezes.
 */
export async function baixarCopiaEmPartes(
  buscar: (endereco: string) => Promise<unknown>,
  aoAndar: (feitas: number, total: number) => void = () => undefined,
  esperar: (ms: number) => Promise<void> = (ms) => new Promise((ok) => setTimeout(ok, ms)),
): Promise<CopiaDoAcervoInteira> {
  const tentar = async <T>(endereco: string): Promise<T> => {
    for (let tentativa = 1; ; tentativa++) {
      try {
        return (await buscar(endereco)) as T;
      } catch (erro) {
        if (tentativa >= TENTATIVAS_POR_PARTE) throw erro;
        await esperar(1000 * tentativa);
      }
    }
  };
  /** Uma passada inteira; nada se a marca mudou no meio. */
  const umaPassada = async (): Promise<CopiaDoAcervoInteira | null> => {
    const indice = await tentar<IndiceDaCopia>(ENDERECO_DA_COPIA);
    if (indice?.acervo !== MARCA_DO_ACERVO || !Array.isArray(indice.indice) || typeof indice.marca !== 'number') throw new Error('O índice da cópia não veio.');
    let total = partesPrevistas(indice, linhasPorParte);
    let feitas = 0;
    aoAndar(feitas, total);
    const partes: ParteDaCopia[] = [];
    for (const { tabela } of indice.indice) {
      let depois: number | null = null;
      for (;;) {
        const parte: ParteDaCopia = await tentar<ParteDaCopia>(enderecoDaParte(tabela, depois));
        if (parte?.tabela !== tabela || !Array.isArray(parte.linhas) || !Array.isArray(parte.colunas) || typeof parte.marca !== 'number') throw new Error(`A parte da tabela ${tabela} não veio.`);
        // Algo foi gravado depois do índice: esta passada não vale
        if (parte.marca !== indice.marca) return null;
        partes.push(parte);
        feitas++;
        total = Math.max(total, feitas + (parte.proxima === null ? 0 : 1));
        aoAndar(feitas, total);
        if (parte.proxima === null) break;
        depois = parte.proxima;
      }
    }
    return juntarPartes(indice, partes);
  };
  for (let passada = 1; ; passada++) {
    const copia = await umaPassada();
    if (copia) return copia;
    if (passada >= TENTATIVAS_DA_COPIA) throw new AcervoMudouNaCopia();
    await esperar(2000 * passada);
  }
}
