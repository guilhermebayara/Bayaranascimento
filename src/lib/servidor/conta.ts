// "Sua conta": junta, para quem está logado, as listas de src/lib/conta.ts. A tela é src/pages/conta.astro.
import { administracao, fraseDaLixeira, oQueVoceCriou, pendenciasDaAdministracao, seusLacos, seusRascunhos, suaLixeira, type SituacaoDaAdministracao } from '../conta';
import { emMegabytes, LIMITE_DO_PLANO, situacaoDoBanco } from '../tamanho-do-banco';
import { AJUSTE_DOS_CENTROS } from '../centros-da-arvore';
import { situacaoDaTranscricaoAgora } from './transcricao';
import { AJUSTE_DOS_NAO_DUPLICADOS } from '../juntar';
import { possiveisDuplicados } from '../nomes-parecidos';
import { fraseDoEspaco, notaDosSemMedida, situacaoDoEspaco } from '../espaco-dos-arquivos';
import { lerAcessos, semLogin } from './acesso';
import { ambiente, bucketDeFotos } from './ambiente';
import { podeEspelhar } from './espelho';
import { podeExcluirMemoria, type Usuario } from './permissoes';
import {
  listarCapitulos,
  listarCapitulosExcluidos,
  listarPessoasExcluidas,
  listarExcluidas,
  listarIntegrantes,
  listarIntegrantesQueVe,
  listarLacosDoCoracao,
  listarMemorias,
  listarNucleos,
  listarRascunhosDeRelatoDescartados,
  listarRelatosRegistradosPor,
  listarTipos,
  espacoDosArquivos,
  lerAjuste,
  contarFotosSoltas,
  medirArquivosDeAntes,
  obterCarta,
  tamanhoDoBanco,
  listarPedidosDeExclusao,
  ultimaCopiaMensal,
} from './repositorio';

/**
 * O que gera as pendências da administração: a carta, o banco e a cópia mensal. Só a produção recebe a
 * cópia do script do Drive, e só lá ela é conferida. As fotos soltas e os cadastros duplicados entram
 * quando as listas existirem (onda 2): até lá, null.
 */
async function situacaoDasPendencias(usuario: Usuario): Promise<Pick<SituacaoDaAdministracao, 'carta' | 'banco' | 'espaco' | 'copiaMensal' | 'fotosSoltas' | 'duplicados' | 'exclusoes'>> {
  const conferida = ambiente() === 'producao';
  const [carta, bytes, ultima, arquivos, fotosSoltas, integrantes, naoSao, pedidos] = await Promise.all([
    obterCarta(),
    tamanhoDoBanco(),
    conferida ? ultimaCopiaMensal() : Promise.resolve(null),
    espacoDosArquivos(),
    contarFotosSoltas(),
    // Só quem o administrador vê: a conta nunca denuncia quem está num laço privado de outra pessoa
    listarIntegrantesQueVe(usuario),
    lerAjuste(AJUSTE_DOS_NAO_DUPLICADOS),
    listarPedidosDeExclusao(),
  ]);
  // Os possíveis cadastros duplicados, pelas comparações baratas (src/lib/nomes-parecidos.ts)
  const duplicados = possiveisDuplicados(integrantes, new Set(Array.isArray(naoSao) ? (naoSao as string[]) : [])).length;
  const banco = situacaoDoBanco(bytes);
  const espaco = situacaoDoEspaco(arquivos.bytes, arquivos.semMedida);
  return {
    carta: carta ? { escritaEm: carta.escritaEm } : null,
    banco: banco && { bytes: banco.bytes, passouDoAviso: banco.passouDoAviso },
    espaco: espaco && { bytes: espaco.bytes, passouDoAviso: espaco.passouDoAviso },
    copiaMensal: { conferida, ultima },
    fotosSoltas,
    duplicados,
    // Só o pedido de quem o administrador vê
    exclusoes: pedidos.filter((p) => integrantes.some((i) => i.id === p.pessoa)).length,
  };
}

/** Quantas pendências da administração somam no número do retrato do topo: só para quem administra. */
export async function contarPendenciasDaAdministracao(usuario: Usuario): Promise<number> {
  if (!usuario.admin) return 0;
  return pendenciasDaAdministracao(await situacaoDasPendencias(usuario), new Date()).length;
}

/** O e-mail com que a pessoa entra. Fora da produção não há login, e não há e-mail. Só os administradores mudam. */
function emailDe(pessoa: string): string | undefined {
  if (semLogin()) return undefined;
  for (const [email, quem] of lerAcessos()) if (quem === pessoa) return email;
  return undefined;
}

/**
 * O que a página da lixeira mostra a cada pessoa (src/pages/lixeira.astro): para quem administra, as
 * memórias excluídas que ela restauraria, os capítulos e as pessoas excluídos; para todos, os rascunhos de
 * relato que a pessoa descartou. A frase da lixeira de "Sua conta" conta daqui, para dizer o mesmo que a
 * página (achado da W2, revisão Y2 do PR #160: as pessoas excluídas ficavam fora da conta).
 */
export async function itensDaLixeira(usuario: Usuario) {
  const [excluidas, capitulos, pessoas, relatos] = await Promise.all([
    listarExcluidas(usuario),
    usuario.admin ? listarCapitulosExcluidos(usuario) : Promise.resolve([]),
    usuario.admin ? listarPessoasExcluidas() : Promise.resolve([]),
    listarRascunhosDeRelatoDescartados(usuario),
  ]);
  return { memorias: excluidas.filter((m) => podeExcluirMemoria(usuario, m).ok), capitulos, pessoas, relatos, todasAsMemorias: excluidas };
}

export async function montarConta(usuario: Usuario) {
  const eu = usuario.pessoa;
  const [publicadas, rascunhos, relatos, capitulos, lacos, lixeira, integrantes] = await Promise.all([
    listarMemorias(usuario),
    listarMemorias(usuario, { rascunhos: true }),
    listarRelatosRegistradosPor(usuario),
    listarCapitulos(usuario),
    listarLacosDoCoracao(usuario),
    itensDaLixeira(usuario),
    listarIntegrantes(),
  ]);
  const minhaLixeira = suaLixeira(eu, lixeira.todasAsMemorias);
  return {
    /** "Seus dados e sua página": editáveis em /pessoas/<id>/editar; a página como os outros veem, em /pessoas/<id> */
    dados: integrantes.find((i) => i.id === eu),
    email: emailDe(eu),
    rascunhos: seusRascunhos(eu, rascunhos, relatos),
    lixeira: minhaLixeira,
    /**
     * a frase da lixeira: quem administra lê a conta do que a página da lixeira mostra (itensDaLixeira: memórias, capítulos e
     * pessoas); os demais, a do que é deles. Nos dois, o rascunho de relato que a pessoa descartou, que a lixeira mostra a ela
     * (revisão Y do PR #160)
     */
    fraseDaLixeira: fraseDaLixeira(
      usuario.admin,
      (usuario.admin ? lixeira.memorias.length + lixeira.capitulos.length + lixeira.pessoas.length : minhaLixeira.length) + lixeira.relatos.length,
    ),
    criou: oQueVoceCriou(eu, { memorias: publicadas, relatos, capitulos }),
    lacos: seusLacos(eu, lacos),
    /** quem administra vê o atalho para a Administração (src/pages/admin/index.astro) */
    administra: usuario.admin,
    /** quantas pendências a administração tem, para o atalho de quem administra (0 para os outros) */
    pendenciasDaAdministracao: usuario.admin ? await contarPendenciasDaAdministracao(usuario) : 0,
    /** o título de cada memória que a pessoa vê, para dizer de qual memória é um relato */
    titulos: new Map([...publicadas, ...rascunhos].map((m) => [m.id, m.titulo])),
    integrantes,
  };
}

/**
 * A página da Administração (decisão do Gui, 18/11/2026: ela sai de "Sua conta" e ganha página própria):
 * os atalhos, a situação do acervo, as pendências, o banco e o espaço das fotos e áudios. Só para quem
 * administra; para os outros, nada.
 */
export async function montarAdministracao(usuario: Usuario) {
  if (!usuario.admin) return undefined;
  // Quem administra abre a página: os arquivos de antes da contagem são medidos aos poucos, só lendo o tamanho
  try {
    await medirArquivosDeAntes(async (chave) => (await bucketDeFotos().head(chave))?.size ?? null);
  } catch {
    // Medir é um extra: um erro do bucket nunca derruba a página
  }
  const situacao: SituacaoDaAdministracao = {
    ...(await situacaoDasPendencias(usuario)),
    tipos: (await listarTipos()).length,
    familias: (await listarNucleos()).length,
    transcricao: await situacaoDaTranscricaoAgora(),
    centros: ((c) => (Array.isArray(c) && c.length ? c.length : null))(await lerAjuste(AJUSTE_DOS_CENTROS)),
  };
  const banco = situacao.banco ? situacaoDoBanco(situacao.banco.bytes) : undefined;
  const arquivos = await espacoDosArquivos();
  const espaco = situacaoDoEspaco(arquivos.bytes, arquivos.semMedida);
  const hoje = new Date();
  return {
    administracao: administracao(usuario, { podeEspelhar: podeEspelhar() }, situacao),
    /** a situação do acervo para a administração, e o que dela pede ação (src/lib/conta.ts) */
    situacao,
    pendencias: pendenciasDaAdministracao(situacao, hoje),
    hoje,
    banco: banco && `${banco.texto} de ${emMegabytes(LIMITE_DO_PLANO)}`,
    /** o banco passou do tamanho de aviso (docs/decisoes.md, "Aviso de tamanho do banco") */
    bancoEmAviso: Boolean(banco?.passouDoAviso),
    /** o espaço das fotos e áudios: a medida, a porcentagem, o aviso a partir de 7 GB e o que falta medir */
    espaco: espaco && { frase: fraseDoEspaco(espaco), porcento: espaco.porcento, emAviso: espaco.passouDoAviso, nota: notaDosSemMedida(espaco.semMedida) },
  };
}
