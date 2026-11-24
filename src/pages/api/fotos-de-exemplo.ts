// Leva as 11 fotos de exemplo (o Chico e a Karol) ao bucket de teste, debaixo de "exemplos/", e os
// áudios de exemplo (voz sintetizada), debaixo de "audios/exemplos/". Usada por
// scripts/enviar-fotos-de-exemplo.mjs. Só existe nas prévias e no computador, e só aceita os arquivos
// de exemplos/fotos/ e exemplos/audios/, conferidos pelo SHA-256: qualquer outro arquivo é recusado.
// Nada disso entra no pacote publicado, e a homologação só lê as fotos (os áudios ela nem serve).
// As cópias menores das fotos (sessão D1b, exemplos/fotos/copias/) vêm no campo "copia" e moram ao lado das
// fotos, debaixo de exemplos/, com o SHA-256 de COPIAS_DE_EXEMPLO.
import type { APIRoute } from 'astro';
import { AMBIENTES_COM_EXEMPLOS, ambiente, bucketDeTesteParaGravar, bucketDosExemplos, ehHomologacao } from '../../lib/servidor/ambiente';
import { erro, json } from '../../lib/servidor/http';
import { COPIAS_DE_EXEMPLO, FOTOS_DE_EXEMPLO, chaveDeExemplo, nomeDaCopiaDeExemplo } from '../../lib/fotos-de-exemplo';
import { TAMANHOS } from '../../lib/copias-das-fotos';
import { AUDIOS_DE_EXEMPLO, TIPO_DOS_AUDIOS_DE_EXEMPLO, chaveDeAudioDeExemplo } from '../../lib/audios-de-exemplo';

const soNoTeste = () => AMBIENTES_COM_EXEMPLOS.includes(ambiente()) && !ehHomologacao();

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** As cópias de exemplo, pelo nome do arquivo: "chico-1.pequena.webp". */
const COPIAS = new Map(FOTOS_DE_EXEMPLO.flatMap((f) => TAMANHOS.map((t) => [nomeDaCopiaDeExemplo(f.nome, t), COPIAS_DE_EXEMPLO[f.nome]![t].sha256] as const)));
const noBucket = (nome: string) => (FOTOS_DE_EXEMPLO.some((f) => f.nome === nome) || COPIAS.has(nome) ? chaveDeExemplo(nome) : `audios/${chaveDeAudioDeExemplo(nome)}`);
const TODOS = [...FOTOS_DE_EXEMPLO.map((f) => f.nome), ...COPIAS.keys(), ...AUDIOS_DE_EXEMPLO.map((a) => a.nome)];

/** Quais das fotos e dos áudios já estão no bucket de teste. */
export const GET: APIRoute = async () => {
  const bucket = bucketDosExemplos();
  if (!soNoTeste() || !bucket) return erro(404, 'Não encontrado.');
  const presentes = await Promise.all(TODOS.map(async (nome) => ((await bucket.head(noBucket(nome))) ? nome : null)));
  return json({ total: TODOS.length, presentes: presentes.filter(Boolean) });
};

export const POST: APIRoute = async ({ request }) => {
  if (!soNoTeste()) return erro(404, 'Não encontrado.');
  let dados: FormData;
  try {
    dados = await request.formData();
  } catch {
    return erro(400, 'Envio inválido.');
  }
  const gravadas: string[] = [];
  for (const valor of dados.getAll('foto')) {
    if (!(valor instanceof File)) continue;
    const esperada = FOTOS_DE_EXEMPLO.find((f) => f.nome === valor.name);
    if (!esperada) return erro(400, `${valor.name} não é uma das fotos de exemplo.`);
    const bytes = await valor.arrayBuffer();
    if (hex(await crypto.subtle.digest('SHA-256', bytes)) !== esperada.sha256) return erro(400, `${valor.name} não é o arquivo de exemplos/fotos/.`);
    await bucketDeTesteParaGravar().put(chaveDeExemplo(esperada.nome), bytes, { httpMetadata: { contentType: 'image/jpeg' } });
    gravadas.push(esperada.nome);
  }
  for (const valor of dados.getAll('copia')) {
    if (!(valor instanceof File)) continue;
    const sha256 = COPIAS.get(valor.name);
    if (!sha256) return erro(400, `${valor.name} não é uma das cópias de exemplo.`);
    const bytes = await valor.arrayBuffer();
    if (hex(await crypto.subtle.digest('SHA-256', bytes)) !== sha256) return erro(400, `${valor.name} não é o arquivo de exemplos/fotos/copias/.`);
    await bucketDeTesteParaGravar().put(chaveDeExemplo(valor.name), bytes, { httpMetadata: { contentType: 'image/webp' } });
    gravadas.push(valor.name);
  }
  for (const valor of dados.getAll('audio')) {
    if (!(valor instanceof File)) continue;
    const esperado = AUDIOS_DE_EXEMPLO.find((a) => a.nome === valor.name);
    if (!esperado) return erro(400, `${valor.name} não é um dos áudios de exemplo.`);
    const bytes = await valor.arrayBuffer();
    if (hex(await crypto.subtle.digest('SHA-256', bytes)) !== esperado.sha256) return erro(400, `${valor.name} não é o arquivo de exemplos/audios/.`);
    await bucketDeTesteParaGravar().put(noBucket(esperado.nome), bytes, { httpMetadata: { contentType: TIPO_DOS_AUDIOS_DE_EXEMPLO } });
    gravadas.push(esperado.nome);
  }
  return json({ gravadas }, gravadas.length ? 201 : 200);
};
