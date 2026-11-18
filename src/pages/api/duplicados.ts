// Juntar cadastros duplicados (onda 2, decisão do Gui de 17/11/2026): só os administradores, em
// Administração, escolhendo o que fica de cada ficha, com tudo passando para a que fica e o histórico.
// "Não são a mesma pessoa" tira o par da lista de possíveis duplicados.
import type { APIRoute } from 'astro';
import { chaveDoPar } from '../../lib/nomes-parecidos';
import { pessoasComAcesso } from '../../lib/servidor/acesso';
import { campo, mesmaOrigem, voltar } from '../../lib/servidor/http';
import { podeJuntarCadastros } from '../../lib/servidor/permissoes';
import { AJUSTE_DOS_NAO_DUPLICADOS, fichaJuntada } from '../../lib/juntar';
import { conflitosAoJuntar, juntarIntegrantes, lerAjuste, listarIntegrantesQueVe, salvarAjuste } from '../../lib/servidor/repositorio';

const LISTA = '/admin/duplicados';

export const POST: APIRoute = async ({ request, locals }) => {
  if (!mesmaOrigem(request)) return new Response('Pedido recusado.', { status: 403 });
  const { usuario } = locals;
  if (!usuario.admin) return voltar(request, '/conta', { erro: 'Só os administradores juntam cadastros.' });
  const dados = await request.formData();
  const acao = campo(dados, 'acao', 20);
  // Quem o administrador não vê responde como quem não existe
  const visiveis = await listarIntegrantesQueVe(usuario);
  const achar = (id: string) => visiveis.find((i) => i.id === id);

  if (acao === 'nao-sao') {
    const [a, b] = [achar(campo(dados, 'a', 80)), achar(campo(dados, 'b', 80))];
    if (!a || !b) return voltar(request, LISTA, { erro: 'Pessoa não encontrada.' });
    const ja = await lerAjuste(AJUSTE_DOS_NAO_DUPLICADOS);
    const lista = Array.isArray(ja) ? (ja as string[]) : [];
    await salvarAjuste(AJUSTE_DOS_NAO_DUPLICADOS, [...new Set([...lista, chaveDoPar(a.id, b.id)])], usuario);
    return voltar(request, LISTA, { ok: `${a.nome} e ${b.nome} saíram da lista.` });
  }

  if (acao === 'juntar') {
    const [fica, sai] = [achar(campo(dados, 'fica', 80)), achar(campo(dados, 'sai', 80))];
    if (!fica || !sai) return voltar(request, LISTA, { erro: 'Pessoa não encontrada.' });
    const voltaDaComparacao = `${LISTA}/juntar?a=${encodeURIComponent(fica.id)}&b=${encodeURIComponent(sai.id)}`;
    const decisao = podeJuntarCadastros(usuario, fica.id, sai.id, await pessoasComAcesso());
    if (!decisao.ok) return voltar(request, voltaDaComparacao, { erro: decisao.motivo });
    const conflitos = await conflitosAoJuntar(fica.id, sai.id);
    if (conflitos.length > 0) {
      return voltar(request, voltaDaComparacao, { erro: `As duas fichas têm relato em ${conflitos.map((t) => `“${t}”`).join(', ')}. Cada pessoa tem um relato por memória: deixe um só antes de juntar.` });
    }
    const ficha = fichaJuntada(fica, sai, (c) => (campo(dados, `campo-${c}`, 4) === 'sai' ? 'sai' : 'fica'));
    await juntarIntegrantes(fica, sai, ficha, usuario);
    return voltar(request, `/pessoas/${fica.id}`, { ok: `Fichas juntadas. Tudo o que era de ${sai.nome} passou para ${ficha.nome}, e as duas fichas de antes ficaram no histórico.` });
  }
  return voltar(request, LISTA, { erro: 'Ação desconhecida.' });
};
