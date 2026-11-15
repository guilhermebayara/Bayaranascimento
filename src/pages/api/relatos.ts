// Escreve ou edita um relato em uma memória que já existe.
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { listarMemorias, listarPessoas } from '../../lib/memorias';
import { pessoasComAcesso, usuarioDoPedido } from '../../lib/servidor/acesso';
import { arquivoDoRelato, caminhos, lerDonoDoArquivo } from '../../lib/servidor/conteudo';
import { configuracaoFaltando, erro, github, json, mesmaOrigem } from '../../lib/servidor/http';
import { podeEscreverRelato } from '../../lib/servidor/permissoes';

export const prerender = false;

const Pedido = z.object({
  memoria: z.string().max(120),
  por: z.string().max(80),
  texto: z.string().trim().min(1, 'Escreva o relato antes de salvar.').max(20000),
});

export const POST: APIRoute = async (contexto) => {
  try {
    return await tratar(contexto);
  } catch (e) {
    console.error('Falha inesperada ao salvar relato', e);
    return erro(502, 'Não consegui salvar agora. Seu texto continua na tela: tente de novo em instantes.');
  }
};

const tratar: APIRoute = async ({ request }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  const usuario = await usuarioDoPedido(request);
  if (!usuario) return erro(401, 'Não foi possível identificar quem está enviando.');
  if (configuracaoFaltando().length > 0) return erro(503, 'O envio de relatos ainda não foi ativado.');

  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    return erro(400, 'Envio inválido.');
  }
  const lido = Pedido.safeParse(bruto);
  if (!lido.success) return erro(400, lido.error.issues[0]?.message ?? 'Confira os campos.');
  const { memoria: memoriaId, por, texto } = lido.data;

  const gh = github();
  const memoria = (await listarMemorias()).find((m) => m.id === memoriaId);
  // Memória recém-criada pode ainda não estar no site publicado: confere no repositório
  const existeNoRepo = memoria ? true : /^[a-z0-9-]+$/.test(memoriaId) && (await gh.ler(caminhos.memoria(memoriaId))) !== undefined;
  if (!existeNoRepo) return erro(404, 'Memória não encontrada.');

  const quemConta = (await listarPessoas()).find((p) => p.id === por);
  if (!quemConta) return erro(400, 'Pessoa não encontrada.');

  // A fonte da verdade sobre quem é dono do relato é o repositório
  const caminho = caminhos.relato(memoriaId, por);
  const atual = await gh.ler(caminho);
  const existente = atual === undefined ? undefined : (lerDonoDoArquivo(atual) ?? { por });

  const decisao = podeEscreverRelato(usuario, por, existente, pessoasComAcesso());
  if (!decisao.ok) return erro(403, decisao.motivo);

  const titulo = memoria?.data.titulo ?? memoriaId;
  const acao = existente ? 'editou' : 'escreveu';
  const deQuem = por === usuario.pessoa ? 'o próprio relato' : `o relato de ${quemConta.data.nome}`;
  try {
    await gh.gravar(
      [{ caminho, conteudo: arquivoDoRelato(memoriaId, por, usuario.pessoa, texto) }],
      `${usuario.nome} ${acao} ${deQuem} em "${titulo}"`,
      { nome: usuario.nome, pessoa: usuario.pessoa },
    );
  } catch (e) {
    console.error('Falha ao gravar relato', e);
    return erro(502, 'Não consegui salvar agora. Seu texto continua na tela: tente de novo em instantes.');
  }
  return json({ url: `/memorias/${memoriaId}`, editado: Boolean(existente) }, existente ? 200 : 201);
};
