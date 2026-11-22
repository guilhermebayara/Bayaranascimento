// A resposta ao pedido para liberar manda o público que a página mostrou (chaveDoPublico, revisão Y2 do PR
// #160). Nos testes que respondem pelas rotas, este apoio faz o que a página faz: lê o público de agora da
// memória do aviso ou do relato e o põe no formulário, a menos que o teste já tenha posto outro.
import { chaveDoPublico } from '../../src/lib/servidor/permissoes';
import type { DatabaseSync } from './d1';

export function comPublicoDaPagina<T extends Record<string, unknown>>(sqlite: DatabaseSync, campos: T): T & { publico?: string } {
  if ('publico' in campos) return campos;
  const aviso = campos.aviso ? (sqlite.prepare('SELECT relato_id AS r FROM avisos WHERE id = ?').get(Number(campos.aviso)) as { r: number } | undefined) : undefined;
  const relato = aviso?.r ?? (campos.relato ? Number(campos.relato) : undefined);
  const linha = relato ? (sqlite.prepare('SELECT memoria_id AS m FROM relatos WHERE id = ?').get(relato) as { m: string } | undefined) : undefined;
  if (!linha) return campos;
  const memoria = sqlite.prepare('SELECT visibilidade AS v FROM memorias WHERE id = ?').get(linha.m) as { v: 'todos' | 'nucleos' };
  const nucleos = (sqlite.prepare('SELECT nucleo_id AS n FROM memoria_nucleos WHERE memoria_id = ?').all(linha.m) as { n: string }[]).map((n) => n.n);
  return { ...campos, publico: chaveDoPublico({ visibilidade: memoria.v, nucleos }) };
}
