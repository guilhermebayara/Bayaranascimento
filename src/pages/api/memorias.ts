// Cria uma memória: a ficha, as fotos já enviadas, pessoas novas e, se houver, o primeiro relato.
import type { APIRoute } from 'astro';
import { z } from 'astro/zod';
import { env } from 'cloudflare:workers';
import { TIPOS, TIPOS_IDS } from '../../data/tipos';
import { listarMemorias, listarPessoas } from '../../lib/memorias';
import { pessoasComAcesso, usuarioDoPedido } from '../../lib/servidor/acesso';
import {
  arquivoDaMemoria,
  arquivoDaPessoa,
  arquivoDoRelato,
  caminhos,
  criarSlug,
  slugUnico,
  validarData,
} from '../../lib/servidor/conteudo';
import type { Arquivo } from '../../lib/servidor/github';
import { configuracaoFaltando, erro, github, json, mesmaOrigem } from '../../lib/servidor/http';
import { podeEscreverRelato } from '../../lib/servidor/permissoes';

export const prerender = false;

const opcional = (maximo: number) => z.string().trim().max(maximo).optional();

const Pedido = z.object({
  titulo: z.string().trim().min(1, 'Dê um título para a memória.').max(120),
  ano: z.number().int(),
  mes: z.number().int().min(1).max(12).optional(),
  dia: z.number().int().min(1).max(31).optional(),
  aproximada: z.boolean().default(false),
  tipo: z.enum(TIPOS_IDS),
  // ids de pessoas que já existem, ou "nova:0", "nova:1"... apontando para novasPessoas
  pessoas: z.array(z.string().max(80)).max(60).default([]),
  novasPessoas: z
    .array(z.object({ nome: z.string().trim().min(1).max(80), parentesco: opcional(80) }))
    .max(20)
    .default([]),
  lugar: opcional(120),
  fotos: z
    .array(z.object({ chave: z.string().regex(/^\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp)$/), legenda: opcional(200), principal: z.boolean().default(false) }))
    .max(30)
    .default([]),
  relato: z.object({ por: z.string().max(80), texto: z.string().trim().min(1).max(20000) }).optional(),
});

export const POST: APIRoute = async (contexto) => {
  try {
    return await tratar(contexto);
  } catch (e) {
    console.error('Falha inesperada ao salvar memória', e);
    return erro(502, 'Não consegui salvar agora. Seu texto continua na tela: tente de novo em instantes.');
  }
};

const tratar: APIRoute = async ({ request }) => {
  if (!mesmaOrigem(request)) return erro(403, 'Pedido recusado.');
  const usuario = await usuarioDoPedido(request);
  if (!usuario) return erro(401, 'Não foi possível identificar quem está enviando.');
  if (configuracaoFaltando().length > 0) return erro(503, 'O envio de memórias ainda não foi ativado.');

  let bruto: unknown;
  try {
    bruto = await request.json();
  } catch {
    return erro(400, 'Envio inválido.');
  }
  const lido = Pedido.safeParse(bruto);
  if (!lido.success) return erro(400, lido.error.issues[0]?.message ?? 'Confira os campos.');
  const pedido = lido.data;

  const erroData = validarData(pedido.ano, pedido.mes, pedido.dia);
  if (erroData) return erro(400, erroData);

  const pessoasExistentes = await listarPessoas();
  const idsPessoas = new Set(pessoasExistentes.map((p) => p.id));
  const arquivos: Arquivo[] = [];

  // Pessoas novas: cria o cadastro mínimo, reaproveitando quem já existe com o mesmo nome
  const idsNovas = pedido.novasPessoas.map((nova) => {
    const base = criarSlug(nova.nome);
    const jaExiste = pessoasExistentes.find((p) => criarSlug(p.data.nome) === base);
    if (jaExiste) return jaExiste.id;
    const id = slugUnico(base, idsPessoas);
    idsPessoas.add(id);
    arquivos.push({ caminho: caminhos.pessoa(id), conteudo: arquivoDaPessoa(nova) });
    return id;
  });

  const resolver = (ref: string): string | undefined => {
    const nova = /^nova:(\d+)$/.exec(ref);
    if (nova) return idsNovas[Number(nova[1])];
    return idsPessoas.has(ref) ? ref : undefined;
  };

  const pessoas: string[] = [];
  for (const ref of pedido.pessoas) {
    const id = resolver(ref);
    if (!id) return erro(400, 'Uma das pessoas marcadas não existe no acervo.');
    if (!pessoas.includes(id)) pessoas.push(id);
  }

  // Fotos: só entram as que esta pessoa enviou e que estão mesmo no bucket
  const fotos = [];
  for (const foto of pedido.fotos) {
    const objeto = await env.FOTOS.head(foto.chave);
    if (!objeto || objeto.customMetadata?.enviadaPor !== usuario.pessoa) {
      return erro(400, 'Uma das fotos não foi encontrada. Tente enviar de novo.');
    }
    fotos.push({ src: `/fotos/${foto.chave}`, legenda: foto.legenda, chave: foto.principal, enviadaPor: usuario.pessoa });
  }
  if (fotos.length > 0 && !fotos.some((f) => f.chave)) fotos[0].chave = true;

  const gh = github();
  const idsMemorias = new Set((await listarMemorias()).map((m) => m.id));
  let id = slugUnico(`${pedido.ano}-${criarSlug(pedido.titulo)}`, idsMemorias);
  // O site publicado pode estar um passo atrás do repositório: confere lá também
  while ((await gh.ler(caminhos.memoria(id))) !== undefined) {
    idsMemorias.add(id);
    id = slugUnico(`${pedido.ano}-${criarSlug(pedido.titulo)}`, idsMemorias);
  }

  arquivos.push({
    caminho: caminhos.memoria(id),
    conteudo: arquivoDaMemoria({
      titulo: pedido.titulo,
      ano: pedido.ano,
      mes: pedido.mes,
      dia: pedido.dia,
      aproximada: pedido.aproximada,
      tipo: pedido.tipo,
      pessoas,
      lugar: pedido.lugar,
      criadaPor: usuario.pessoa,
      fotos,
    }),
  });

  if (pedido.relato) {
    const por = resolver(pedido.relato.por);
    if (!por) return erro(400, 'Não encontrei a pessoa que contou o relato.');
    const decisao = podeEscreverRelato(usuario, por, undefined, pessoasComAcesso());
    if (!decisao.ok) return erro(403, decisao.motivo);
    arquivos.push({
      caminho: caminhos.relato(id, por),
      conteudo: arquivoDoRelato(id, por, usuario.pessoa, pedido.relato.texto),
    });
  }

  try {
    await gh.gravar(arquivos, `${usuario.nome} registrou a memória "${pedido.titulo}" (${TIPOS[pedido.tipo].rotulo})`, {
      nome: usuario.nome,
      pessoa: usuario.pessoa,
    });
  } catch (e) {
    console.error('Falha ao gravar memória', e);
    return erro(502, 'Não consegui salvar agora. Seu texto continua na tela: tente de novo em instantes.');
  }
  return json({ id, url: `/memorias/${id}` }, 201);
};
