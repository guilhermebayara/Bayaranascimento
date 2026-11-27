// Só o palco de “Me mostre uma memória”. O Explorar e a ordem do modo TV continuam no caminho anterior.
import { lerFiltros, soFiltrosConhecidos } from '../explorar';
import type { Tipo } from '../tipos';
import type { Usuario } from './permissoes';
import { buscarNoAcervo } from './busca';
import { escolherMemoriaAoAcaso, listarCapitulos, listarIntegrantesQueVe, listarNucleos, listarTemasVisiveis, obterMemoria } from './repositorio';

export async function palcoAoAcaso(usuario: Usuario, parametros: URLSearchParams, tipos: readonly Tipo[]) {
  const [nucleos, integrantes, capitulos, temas] = await Promise.all([
    listarNucleos(), listarIntegrantesQueVe(usuario), listarCapitulos(usuario), listarTemasVisiveis(usuario),
  ]);
  const filtros = soFiltrosConhecidos(lerFiltros(parametros), {
    tipos: new Set(tipos.map((t) => t.id)), pessoas: new Set(integrantes.map((i) => i.id)), familias: new Set(nucleos.map((n) => n.id)),
    capitulos: new Set(capitulos.map((c) => c.id)), temas: new Set(temas.map((t) => t.id)), busca: true,
  });
  const busca = filtros.busca ? (await buscarNoAcervo(usuario, tipos, filtros.busca)).achados.map((a) => a.id) : undefined;
  const escolha = await escolherMemoriaAoAcaso(usuario, filtros, capitulos, { id: parametros.get('m'), outra: parametros.has('outra'), anterior: parametros.get('outra'), busca });
  const memoria = escolha.id && !escolha.redirecionar ? await obterMemoria(usuario, escolha.id) : undefined;
  return { ...escolha, filtros, memoria, nucleos, integrantes, capitulos, temas };
}
