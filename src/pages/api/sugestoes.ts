// Sugestão de correção (onda 2, decisão do Gui de 17/11/2026; regras em src/lib/sugestoes.ts). Quem vê a
// memória sugere uma correção dos dados a quem a criou, ou deixa um recado a quem registrou um relato.
// Quem recebe aceita (só nos dados), recusa ou responde. Quem não vê responde como quem não existe.
import type { APIRoute } from 'astro';
import { limparProposta, propostaVazia, aplicarProposta, type Proposta } from '../../lib/sugestoes';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { podeDeixarRecado, podeEditarMemoria, podeResponderSugestao, podeSugerirDados } from '../../lib/servidor/permissoes';
import {
  atualizarMemoria,
  criarSugestao,
  listarIntegrantesQueVe,
  listarRelatos,
  obterMemoria,
  obterSugestao,
  pessoasQueSoVoceVe,
  responderSugestao,
  type DadosDaMemoria,
} from '../../lib/servidor/repositorio';

const numero = (texto: string): number | null => (/^\d+$/.test(texto) ? Number(texto) : null);

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario } = locals;
  const dados = await request.formData();
  const acao = campo(dados, 'acao', 20);
  const memoria = await obterMemoria(usuario, campo(dados, 'memoria', 120));
  if (!memoria || memoria.situacao !== 'publicada') return voltar(request, '/', { erro: 'Memória não encontrada.' });
  const pagina = `/memorias/${memoria.id}`;
  const sugerir = `${pagina}/sugerir`;
  const sugestoes = `${pagina}/sugestoes`;
  const texto = campo(dados, 'texto', 2000) || null;

  if (acao === 'sugerir-dados') {
    const decisao = podeSugerirDados(usuario, memoria);
    if (!decisao.ok) return voltar(request, pagina, { erro: decisao.motivo });
    // Só entra quem quem sugere vê e que não existe só para ela: a sugestão nunca revela uma pessoa privada
    const [visiveis, soDela] = await Promise.all([listarIntegrantesQueVe(usuario), pessoasQueSoVoceVe(usuario)]);
    const pode = (id: string) => visiveis.some((i) => i.id === id) && !soDela.has(id);
    const pedida: Proposta = {
      ano: numero(campo(dados, 'ano', 4)) ?? undefined,
      mes: numero(campo(dados, 'mes', 2)),
      dia: numero(campo(dados, 'dia', 2)),
      lugar: campo(dados, 'lugar', 120) || undefined,
      entram: dados.getAll('entram').map(String).filter(Boolean),
      saem: dados.getAll('saem').map(String).filter(Boolean),
    };
    const anoAtual = new Date().getUTCFullYear();
    if (pedida.ano && (pedida.ano < 1800 || pedida.ano > anoAtual)) return voltar(request, sugerir, { erro: `O ano vai de 1800 a ${anoAtual}.` });
    const proposta = limparProposta(pedida, memoria, pode);
    if (propostaVazia(proposta) && !texto) return voltar(request, sugerir, { erro: 'Diga o que mudaria, ou escreva um recado.' });
    await criarSugestao({ memoriaId: memoria.id, relatoId: null, para: memoria.criadaPor, tipo: 'dados', proposta: propostaVazia(proposta) ? null : proposta, texto }, usuario);
    return voltar(request, pagina, { ok: 'Sugestão enviada. Quem criou a memória recebe um aviso e decide.' });
  }

  if (acao === 'recado') {
    const relato = (await listarRelatos(usuario, memoria.id)).find((r) => r.id === Number(campo(dados, 'relato', 12)));
    const decisao = relato ? podeDeixarRecado(usuario, relato, true) : podeDeixarRecado(usuario, { registradoPor: '', situacao: '' }, false);
    if (!relato || !decisao.ok) return voltar(request, sugerir, { erro: decisao.motivo });
    if (!texto) return voltar(request, sugerir, { erro: 'Escreva o recado.' });
    await criarSugestao({ memoriaId: memoria.id, relatoId: relato.id, para: relato.registradoPor, tipo: 'recado', proposta: null, texto }, usuario);
    return voltar(request, pagina, { ok: 'Recado enviado. Quem escreveu o relato recebe um aviso.' });
  }

  // Responder: só quem recebeu, e só a sugestão desta memória
  const sugestao = await obterSugestao(Number(campo(dados, 'sugestao', 12)));
  if (!sugestao || sugestao.memoriaId !== memoria.id) return voltar(request, sugestoes, { erro: 'Sugestão não encontrada.' });
  const decisao = podeResponderSugestao(usuario, sugestao);
  if (!decisao.ok) return voltar(request, sugestoes, { erro: decisao.motivo });

  if (acao === 'aceitar') {
    if (sugestao.tipo !== 'dados' || !sugestao.proposta) return voltar(request, sugestoes, { erro: 'Esta sugestão é só um recado: responda ou recuse.' });
    const editar = podeEditarMemoria(usuario, memoria);
    if (!editar.ok) return voltar(request, sugestoes, { erro: editar.motivo });
    // Quem aceita só marca quem ela vê, e nunca quem só ela vê (a memória está publicada)
    const [visiveis, soDela] = await Promise.all([listarIntegrantesQueVe(usuario), pessoasQueSoVoceVe(usuario)]);
    const novo = aplicarProposta(sugestao.proposta, memoria);
    const integrantes = novo.integrantes.filter((id) => memoria.integrantes.includes(id) || (visiveis.some((i) => i.id === id) && !soDela.has(id)));
    const ficha: DadosDaMemoria = {
      titulo: memoria.titulo,
      ano: novo.ano,
      mes: novo.mes ?? undefined,
      dia: novo.dia ?? undefined,
      aproximada: memoria.aproximada,
      tipo: memoria.tipo,
      tipoOutro: memoria.tipoOutro ?? undefined,
      lugar: novo.lugar ?? undefined,
      visibilidade: memoria.visibilidade,
      situacao: memoria.situacao,
      nucleos: memoria.nucleos,
      integrantes,
      fotos: memoria.fotos.map((f) => ({ id: f.id, legenda: f.legenda ?? undefined, principal: f.principal })),
    };
    await atualizarMemoria(memoria, ficha, usuario, []);
    await responderSugestao(sugestao, 'aceita', texto, usuario);
    return voltar(request, sugestoes, { ok: 'Sugestão aceita. A memória mudou, e a versão de antes ficou no histórico.' });
  }
  if (acao === 'recusar') {
    await responderSugestao(sugestao, 'recusada', texto, usuario);
    return voltar(request, sugestoes, { ok: 'Sugestão recusada.' });
  }
  if (acao === 'responder') {
    if (!texto) return voltar(request, sugestoes, { erro: 'Escreva a resposta.' });
    await responderSugestao(sugestao, 'respondida', texto, usuario);
    return voltar(request, sugestoes, { ok: 'Resposta enviada.' });
  }
  return voltar(request, pagina, { erro: 'Ação desconhecida.' });
};
