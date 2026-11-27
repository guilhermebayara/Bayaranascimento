// Explorar: o que os filtros precisam do banco, só sobre as memórias que a pessoa vê.
// As regras ficam em src/lib/explorar.ts. Sem tela: a tela do Explorar é da revisão visual.
import { memoriaDoCapitulo } from '../capitulos';
import type { Contexto } from '../explorar';
import type { Usuario } from './permissoes';
import { listarCapitulos, memoriasComAudio, quemContouEmCadaMemoria, type Memoria } from './repositorio';

export async function contextoDoExplorar(usuario: Usuario, memorias: Memoria[]): Promise<Contexto> {
  const vistas = new Map(memorias.map((m) => [m.id, m]));
  const [capitulos, audio, contaram] = await Promise.all([listarCapitulos(usuario), memoriasComAudio(usuario), quemContouEmCadaMemoria(usuario)]);
  const porId = new Map(capitulos.map((c) => [c.id, c]));
  // A mesma regra da página do capítulo: no reunido, as memórias colocadas nele e nos de dentro;
  // no por período e na época, memoriaDoCapitulo (o período e de quem é). Capítulo que a pessoa
  // não vê não filtra nada.
  const doCapitulo = (memoriaId: string, capituloId: string) => {
    const c = porId.get(capituloId);
    const m = vistas.get(memoriaId);
    if (!c || !m) return false;
    return memoriaDoCapitulo(m, c, capitulos.filter((x) => x.dentroDe === c.id).map((x) => x.id));
  };
  return {
    eu: usuario.pessoa,
    doCapitulo,
    comAudio: new Set([...audio].filter((id) => vistas.has(id))),
    contaram: new Map([...contaram].filter(([id]) => vistas.has(id))),
  };
}
