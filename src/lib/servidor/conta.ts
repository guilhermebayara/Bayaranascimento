// "Sua conta": junta, para quem está logado, as listas de src/lib/conta.ts. A tela é src/pages/conta.astro.
import { administracao, oQueVoceCriou, seusLacos, seusRascunhos, suaLixeira } from '../conta';
import { emMegabytes, LIMITE_DO_PLANO, situacaoDoBanco } from '../tamanho-do-banco';
import { lerAcessos, semLogin } from './acesso';
import { podeEspelhar } from './espelho';
import type { Usuario } from './permissoes';
import {
  listarCapitulos,
  listarExcluidas,
  listarIntegrantes,
  listarLacosDoCoracao,
  listarMemorias,
  listarRelatosRegistradosPor,
  tamanhoDoBanco,
} from './repositorio';

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
  const banco = usuario.admin ? situacaoDoBanco(await tamanhoDoBanco()) : undefined;
  return {
    /** "Seus dados e sua página": editáveis em /pessoas/<id>/editar; a página como os outros veem, em /pessoas/<id> */
    dados: integrantes.find((i) => i.id === eu),
    email: emailDe(eu),
    rascunhos: seusRascunhos(eu, rascunhos, relatos),
    lixeira: suaLixeira(eu, excluidas),
    criou: oQueVoceCriou(eu, { memorias: publicadas, relatos, capitulos }),
    lacos: seusLacos(eu, lacos),
    administracao: administracao(usuario, { podeEspelhar: podeEspelhar() }),
    /** o título de cada memória que a pessoa vê, para dizer de qual memória é um relato */
    titulos: new Map([...publicadas, ...rascunhos].map((m) => [m.id, m.titulo])),
    integrantes,
    banco: banco && `${banco.texto} de ${emMegabytes(LIMITE_DO_PLANO)}`,
    /** o banco passou do tamanho de aviso (docs/decisoes.md, "Aviso de tamanho do banco") */
    bancoEmAviso: Boolean(banco?.passouDoAviso),
  };
}
