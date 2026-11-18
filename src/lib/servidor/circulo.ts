// O círculo de quem está logado (docs/decisoes.md, "Círculo"): quem aparece, com que laço e a que
// distância. É montado só para o dono: ninguém mais vê o círculo nem os valores. A página e a rota
// que grava usam esta mesma lista, para ninguém gravar proximidade de quem não está no círculo dele.
import { FORA_DO_CIRCULO, distribuir, faixaDoValor, proximidadePadrao, valorDoNivel } from '../circulo';
import { jaFaleceu } from '../datas';
import { Familia, lacoParaODono, possessivo, type Tratamento } from '../parentesco';
import { enderecoDoRetrato } from '../retratos';
import { corDaPessoa } from '../visual';
import type { Usuario } from './permissoes';
import { familiasDe, listarCasais, listarFiliacoes, listarIntegrantesQueVe, listarLacosDoCoracao, listarNucleos, listarProximidades, pessoasQueONaoVe, type Integrante } from './repositorio';

export interface PessoaDoCirculo {
  id: string;
  nome: string;
  /** o que a pessoa é de quem olha: "sua avó", "seu amigo-irmão", "cachorro" */
  laco: string;
  foto: string | null;
  /** a cor da família, para o retrato sem foto */
  cor: string;
  falecido: boolean;
  /** de 0 a 99 dentro do círculo; 100 é fora */
  valor: number;
  /** a proximidade de quem não declarou nada, para "trazer de volta" */
  padrao: number;
  angulo: number;
  /** o ângulo de quem não escolheu lugar, para "trazer de volta" */
  anguloPadrao: number;
}

export interface Circulo {
  eu: Integrante;
  cor: string;
  /** quem está no desenho, por faixa */
  dentro: PessoaDoCirculo[];
  /** quem foi afastado até o fim: fica numa lista, de onde volta */
  fora: PessoaDoCirculo[];
}

/**
 * Quem aparece: toda a família que a pessoa vê (quem é de alguma família ou tem parentesco com ela),
 * os laços do coração dela, quem já faleceu e os bichos. Quem ela não vê não entra.
 */
export async function montarCirculo(usuario: Usuario): Promise<Circulo | null> {
  const [integrantes, filiacoes, casais, todosOsLacos, nucleos, naoVe, declaradas] = await Promise.all([
    listarIntegrantesQueVe(usuario),
    listarFiliacoes(),
    listarCasais(usuario),
    listarLacosDoCoracao(usuario),
    listarNucleos(),
    pessoasQueONaoVe(usuario),
    listarProximidades(usuario.pessoa),
  ]);
  const eu = integrantes.find((i) => i.id === usuario.pessoa);
  if (!eu) return null;
  const ordem = nucleos.map((n) => n.id);
  const lacos = todosOsLacos.filter((l) => l.dono === usuario.pessoa);
  const familia = new Familia(filiacoes, casais, new Map<string, Tratamento>(integrantes.map((i) => [i.id, i.tratamento])));

  const todos = integrantes
    .filter((i) => i.id !== eu.id)
    .flatMap((i) => {
      const relacao = familia.relacao(eu.id, i.id);
      const meu = lacos.find((l) => l.pessoa === i.id);
      if (!relacao && !meu && familiasDe(i).length === 0) return [];
      // Sem valor declarado: o nível antigo do laço, se houver, e depois a distância na árvore
      const padrao = (meu?.proximidade ? valorDoNivel(meu.proximidade) : null) ?? proximidadePadrao({ caminho: relacao?.caminho, doCoracao: Boolean(meu) });
      const declarada = declaradas.get(i.id);
      return [
        {
          id: i.id,
          nome: i.apelido ?? i.nome,
          laco: relacao ? possessivo(relacao, i.tratamento) : meu ? lacoParaODono(meu.nome, i.tratamento) : i.tipo === 'bicho' ? (i.especie ?? 'bicho') : '',
          foto: i.retrato && !naoVe.has(i.id) ? enderecoDoRetrato(i.retrato) : null,
          cor: corDaPessoa(familiasDe(i), ordem),
          falecido: jaFaleceu(i),
          valor: declarada?.valor ?? padrao,
          padrao,
          angulo: (declarada?.angulo ?? null) as number | null,
        },
      ];
    });
  // O ângulo de quem não escolheu lugar é calculado duas vezes: com tudo como está, e com tudo no padrão
  const noPadrao = new Map(distribuir(todos.map((p) => ({ id: p.id, valor: p.padrao, angulo: null as number | null }))).map((p) => [p.id, p.angulo]));
  const dentro = distribuir(todos.filter((p) => faixaDoValor(p.valor))).map((p) => ({ ...p, anguloPadrao: noPadrao.get(p.id) ?? p.angulo }));
  const fora = todos
    .filter((p) => p.valor >= FORA_DO_CIRCULO)
    .map((p) => ({ ...p, angulo: noPadrao.get(p.id) ?? 0, anguloPadrao: noPadrao.get(p.id) ?? 0 }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return { eu, cor: corDaPessoa(familiasDe(eu), ordem), dentro, fora };
}
