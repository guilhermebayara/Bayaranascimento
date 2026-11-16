// Leva as 11 fotos de exemplo (o Chico e a Karol) ao bucket de teste, debaixo de "exemplos/". Usada por
// scripts/enviar-fotos-de-exemplo.mjs. Só existe nas prévias e no computador, e só aceita os 11 arquivos
// de exemplos/fotos/, conferidos pelo SHA-256: qualquer outro arquivo é recusado. As fotos nunca entram
// no pacote publicado, e a homologação só lê o que está aqui.
import type { APIRoute } from 'astro';
import { AMBIENTES_COM_EXEMPLOS, ambiente, bucketDeTesteParaGravar, bucketDosExemplos, ehHomologacao } from '../../lib/servidor/ambiente';
import { erro, json } from '../../lib/servidor/http';
import { FOTOS_DE_EXEMPLO, chaveDeExemplo } from '../../lib/fotos-de-exemplo';

const soNoTeste = () => AMBIENTES_COM_EXEMPLOS.includes(ambiente()) && !ehHomologacao();

const hex = (bytes: ArrayBuffer) => [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');

/** Quais das 11 já estão no bucket de teste. */
export const GET: APIRoute = async () => {
  const bucket = bucketDosExemplos();
  if (!soNoTeste() || !bucket) return erro(404, 'Não encontrado.');
  const presentes = await Promise.all(FOTOS_DE_EXEMPLO.map(async (f) => ((await bucket.head(chaveDeExemplo(f.nome))) ? f.nome : null)));
  return json({ total: FOTOS_DE_EXEMPLO.length, presentes: presentes.filter(Boolean) });
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
  return json({ gravadas }, gravadas.length ? 201 : 200);
};
