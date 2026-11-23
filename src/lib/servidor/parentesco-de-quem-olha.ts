// O que cada pessoa é para quem olha ("sua mãe", "seu amigo"), para o filtro "Quem estava junto" do
// Explorar (resposta do Gui às críticas C1 e C2, 22/11/2026). A regra é a de Pessoas: o parentesco da
// árvore e, sem ele, o laço do coração de quem olha. Só entram os laços que quem olha vê: os casais
// que ele vê (listarCasais) e as filiações entre pessoas que ele vê, para um parentesco nunca passar
// por quem só existe num laço privado de outra pessoa (pessoasQueONaoVe).
import { Familia, lacoParaODono, possessivo, type Tratamento } from '../parentesco';
import { nomeParaQuemOlha } from '../painel';
import type { Usuario } from './permissoes';
import { listarCasais, listarFiliacoes, listarLacosDoCoracao, pessoasQueONaoVe, type Integrante } from './repositorio';

/**
 * O parentesco de cada pessoa da lista para quem olha, pelo id. Quem olha é "você", como em Pessoas.
 * Quem não tem parentesco nem laço do coração com quem olha fica fora do mapa. Quando o apelido já diz o mesmo ("Tia
 * Cida" para o sobrinho), o parentesco não se repete.
 */
export async function parentescosDeQuemOlha(usuario: Usuario, pessoas: Pick<Integrante, 'id' | 'nome' | 'apelido' | 'tratamento'>[]): Promise<Map<string, string>> {
  const [filiacoes, casais, lacos, naoVe] = await Promise.all([listarFiliacoes(), listarCasais(usuario), listarLacosDoCoracao(usuario), pessoasQueONaoVe(usuario)]);
  const tratamentos = new Map<string, Tratamento>(pessoas.map((p) => [p.id, p.tratamento]));
  const familia = new Familia(
    filiacoes.filter((f) => !naoVe.has(f.filho) && !naoVe.has(f.responsavel)),
    casais.filter((c) => !naoVe.has(c.a) && !naoVe.has(c.b)),
    tratamentos,
  );
  const meusLacos = lacos.filter((l) => l.dono === usuario.pessoa);
  const saida = new Map<string, string>();
  for (const p of pessoas) {
    if (naoVe.has(p.id)) continue;
    if (p.id === usuario.pessoa) {
      saida.set(p.id, 'você');
      continue;
    }
    const relacao = familia.relacao(usuario.pessoa, p.id);
    const meuLaco = meusLacos.find((l) => l.pessoa === p.id);
    const parentesco = relacao ? possessivo(relacao, p.tratamento) : meuLaco ? lacoParaODono(meuLaco.nome, p.tratamento) : undefined;
    if (!parentesco) continue;
    // "Tia Cida" para o sobrinho já diz "sua tia": o parentesco não se repete embaixo do nome
    const nome = p.apelido ?? p.nome;
    const visto = nomeParaQuemOlha(nome, parentesco);
    const final = visto.nome === nome ? visto.parentesco : parentesco;
    if (final) saida.set(p.id, final);
  }
  return saida;
}
