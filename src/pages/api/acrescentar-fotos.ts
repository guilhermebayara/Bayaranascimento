// "Acrescentar fotos", na página da memória (resposta do Gui ao PR #51, 17/11/2026): quem vê a memória
// manda fotos sem escrever relato, pela mesma peça do passo de fotos do relato (src/lib/cliente/fotos.ts).
// As fotos sobem antes, soltas, por /api/fotos; aqui elas entram na memória (acrescentarFotos).
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { erro, json, mesmaOrigem } from '../../lib/servidor/http';
import { recadoDaValidacao } from '../../lib/servidor/recados-de-validacao';
import { acrescentarFotos, obterMemoria } from '../../lib/servidor/repositorio';

const Pedido = z.object({
  memoria: z.string().max(120),
  fotos: z
    .array(z.object({ id: z.number().int().positive(), legenda: z.string().max(200).optional() }))
    .min(1)
    .max(30),
});

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    return erro(400, 'Envio inválido.');
  }
  const lido = Pedido.safeParse(bruto);
  if (!lido.success) return erro(400, recadoDaValidacao(lido.error.issues[0], 'acrescentar-fotos'));
  // Quem não vê a memória recebe o mesmo que para uma memória que não existe. Rascunho é do formulário da memória.
  const memoria = await obterMemoria(locals.usuario, lido.data.memoria);
  if (!memoria || memoria.situacao !== 'publicada') return erro(404, 'Memória não encontrada.');
  const quantas = await acrescentarFotos(memoria.id, lido.data.fotos, locals.usuario);
  if (quantas === 0) return erro(400, 'Uma das fotos não foi encontrada. Tente enviar de novo.');
  return json({ url: `/memorias/${memoria.id}`, quantas });
};
