// "Sua conta": junta, para quem está logado, as listas de src/lib/conta.ts. A tela é src/pages/conta.astro.
import { administracao, fraseDaLixeira, oQueVoceCriou, pendenciasDaAdministracao, seusLacos, seusRascunhos, suaLixeira, type SituacaoDaAdministracao } from '../conta';
import { emMegabytes, LIMITE_DO_PLANO, situacaoDoBanco } from '../tamanho-do-banco';
import { fraseDoEspaco, notaDosSemMedida, situacaoDoEspaco } from '../espaco-dos-arquivos';
import { lerAcessos, semLogin } from './acesso';
import { ambiente, bucketDeFotos } from './ambiente';
import { podeEspelhar } from './espelho';
import { podeExcluirMemoria, type Usuario } from './permissoes';
import {
  listarCapitulos,
  listarCapitulosExcluidos,
  listarExcluidas,
  listarIntegrantes,
  listarLacosDoCoracao,
  listarMemorias,
  listarNucleos,
  listarRelatosRegistradosPor,
  listarTipos,
  espacoDosArquivos,
  medirArquivosDeAntes,
  obterCarta,
  tamanhoDoBanco,
  ultimaCopiaMensal,
} from './repositorio';

/**
 * O que gera as pendências da administração: a carta, o banco e a cópia mensal. Só a produção recebe a
 * cópia do script do Drive, e só lá ela é conferida. As fotos soltas e os cadastros duplicados entram
 * quando as listas existirem (onda 2): até lá, null.
 */
async function situacaoDasPendencias(): Promise<Pick<SituacaoDaAdministracao, 'carta' | 'banco' | 'espaco' | 'copiaMensal' | 'fotosSoltas' | 'duplicados'>> {
  const conferida = ambiente() === 'producao';
  const [carta, bytes, ultima, arquivos] = await Promise.all([obterCarta(), tamanhoDoBanco(), conferida ? ultimaCopiaMensal() : Promise.resolve(null), espacoDosArquivos()]);
  const banco = situacaoDoBanco(bytes);
  const espaco = situacaoDoEspaco(arquivos.bytes, arquivos.semMedida);
  return {
    carta: carta ? { escritaEm: carta.escritaEm } : null,
    banco: banco && { bytes: banco.bytes, passouDoAviso: banco.passouDoAviso },
    espaco: espaco && { bytes: espaco.bytes, passouDoAviso: espaco.passouDoAviso },
    copiaMensal: { conferida, ultima },
    fotosSoltas: null,
    duplicados: null,
  };
}

/** Quantas pendências da administração somam no número do retrato do topo: só para quem administra. */
export async function contarPendenciasDaAdministracao(usuario: Usuario): Promise<number> {
  if (!usuario.admin) return 0;
  return pendenciasDaAdministracao(await situacaoDasPendencias(), new Date()).length;
}

/** O e-mail com que a pessoa entra. Fora da produção não há login, e não há e-mail. Só os administradores mudam. */
function emailDe(pessoa: string): string | undefined {
  if (semLogin()) return undefined;
  for (const [email, quem] of lerAcessos()) if (quem === pessoa) return email;
  return undefined;
}

export async function montarConta(usuario: Usuario) {
  const eu = usuario.pessoa;
  const [publicadas, rascunhos, relatos, capitulos, lacos, excluidas, integrantes] = await Promise.all([
    listarMemorias(usuario),
    listarMemorias(usuario, { rascunhos: true }),
    listarRelatosRegistradosPor(usuario),
    listarCapitulos(usuario),
    listarLacosDoCoracao(usuario),
    listarExcluidas(usuario),
    listarIntegrantes(),
  ]);
  const minhaLixeira = suaLixeira(eu, excluidas);
  // Quem administra abre a conta: os arquivos de antes da contagem são medidos aos poucos, só lendo o tamanho
  if (usuario.admin) {
    try {
      await medirArquivosDeAntes(async (chave) => (await bucketDeFotos().head(chave))?.size ?? null);
    } catch {
      // Medir é um extra: um erro do bucket nunca derruba a conta
    }
  }
  const situacao: SituacaoDaAdministracao | undefined = usuario.admin
    ? { ...(await situacaoDasPendencias()), tipos: (await listarTipos()).length, familias: (await listarNucleos()).length }
    : undefined;
  const banco = situacao?.banco ? situacaoDoBanco(situacao.banco.bytes) : undefined;
  const arquivos = usuario.admin ? await espacoDosArquivos() : undefined;
  const espaco = arquivos ? situacaoDoEspaco(arquivos.bytes, arquivos.semMedida) : undefined;
  const hoje = new Date();
  return {
    /** "Seus dados e sua página": editáveis em /pessoas/<id>/editar; a página como os outros veem, em /pessoas/<id> */
    dados: integrantes.find((i) => i.id === eu),
    email: emailDe(eu),
    rascunhos: seusRascunhos(eu, rascunhos, relatos),
    lixeira: minhaLixeira,
    /** a frase da lixeira: quem administra lê a conta do que a página da lixeira mostra (src/pages/lixeira.astro); os demais, a do que é deles */
    fraseDaLixeira: fraseDaLixeira(usuario.admin, usuario.admin ? excluidas.filter((m) => podeExcluirMemoria(usuario, m).ok).length + (await listarCapitulosExcluidos(usuario)).length : minhaLixeira.length),
    criou: oQueVoceCriou(eu, { memorias: publicadas, relatos, capitulos }),
    lacos: seusLacos(eu, lacos),
    administracao: administracao(usuario, { podeEspelhar: podeEspelhar() }, situacao),
    /** a situação do acervo para a administração, e o que dela pede ação (src/lib/conta.ts) */
    situacao,
    pendencias: situacao ? pendenciasDaAdministracao(situacao, hoje) : [],
    hoje,
    /** o título de cada memória que a pessoa vê, para dizer de qual memória é um relato */
    titulos: new Map([...publicadas, ...rascunhos].map((m) => [m.id, m.titulo])),
    integrantes,
    banco: banco && `${banco.texto} de ${emMegabytes(LIMITE_DO_PLANO)}`,
    /** o banco passou do tamanho de aviso (docs/decisoes.md, "Aviso de tamanho do banco") */
    bancoEmAviso: Boolean(banco?.passouDoAviso),
    /** o espaço das fotos e áudios: a medida, a porcentagem, o aviso a partir de 7 GB e o que falta medir */
    espaco: espaco && { frase: fraseDoEspaco(espaco), porcento: espaco.porcento, emAviso: espaco.passouDoAviso, nota: notaDosSemMedida(espaco.semMedida) },
  };
}
