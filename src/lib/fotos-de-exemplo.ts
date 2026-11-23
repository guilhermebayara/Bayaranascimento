// Fotos de exemplo: o Chico e a Karol (decisão do Gui, 16/11/2026). Funções puras, usadas pela
// semente das prévias, pelo espelho da homologação, pelas rotas de fotos e retratos e pelos testes.
//
// As cópias reduzidas ficam em exemplos/fotos/, fora de src/ e de public/, então nunca entram no
// site publicado. No bucket de teste elas moram debaixo de exemplos/, e chegam lá pelo envio de
// scripts/enviar-fotos-de-exemplo.mjs, que só aceita estes 11 arquivos (conferidos pelo SHA-256).
// Toda foto e todo retrato de exemplo apontam para um deles: nada de cópia por memória ou pessoa.

import type { Copias, Tamanho } from './copias-das-fotos';

export interface FotoDeExemplo {
  nome: string;
  /** SHA-256 do arquivo em exemplos/fotos/: só ele entra no bucket com esse nome */
  sha256: string;
  bicho: 'chico' | 'karol';
}

export const FOTOS_DE_EXEMPLO: FotoDeExemplo[] = [
  { nome: 'chico-1.jpg', bicho: 'chico', sha256: '93ce01ac6a9e3d0d9f3025ce44302fc321fd8813ba54c2da63ff53883350dc51' },
  { nome: 'chico-2.jpg', bicho: 'chico', sha256: 'c33e3b99641048bf267c23df18eedb661c2058fb276b548f208638af81b921dd' },
  { nome: 'chico-3.jpg', bicho: 'chico', sha256: 'c187cc9a7e6ce33775ff351541a4c64979962b64f05059b55830b064077bb334' },
  { nome: 'chico-4.jpg', bicho: 'chico', sha256: 'ee78cef360c490c75a920442e8c5157caf125e828bd1e55b2d7ef296fa958ef8' },
  { nome: 'chico-5.jpg', bicho: 'chico', sha256: '64d1f593c45498732037c076aa4eed1233edf2eac84ad8401940a10e6f39b432' },
  { nome: 'karol-1.jpg', bicho: 'karol', sha256: '6133f802fc1ec6b5c4c71da2b03ca12c4a69be1e77ed9fff0b5725e2725db7b2' },
  { nome: 'karol-2.jpg', bicho: 'karol', sha256: 'a8ee9a3bca9755cb9f4730b1f23a25218cb929e87c6948c28c08ddd300fa6643' },
  { nome: 'karol-3.jpg', bicho: 'karol', sha256: '9e8fa6dd634911ebfdc8ce3c1a1ba6004d15882ad297830b4363b992e0d35a10' },
  { nome: 'karol-4.jpg', bicho: 'karol', sha256: '285313b564fc25afba8730ca72c416f5fdeca323085451f0e3bd4845d4b0e99d' },
  { nome: 'karol-5.jpg', bicho: 'karol', sha256: 'bfc73332298eca97f6cc2fb7736bb64ac690ceef9589566468fe65883be706f1' },
  { nome: 'karol-6.jpg', bicho: 'karol', sha256: '3916d08e0de67fa0c38877cb12188b4fef4a9df47a7ee374850f22ee5d13bc51' },
];

// --- As cópias menores das fotos de exemplo (sessão D1b, 23/11/2026) ---
// Feitas uma vez por scripts/copias-das-fotos-de-exemplo.mjs, em exemplos/fotos/copias/, com as medidas de
// src/lib/copias-das-fotos.ts. Sobem ao bucket de teste junto com as fotos (scripts/enviar-fotos-de-exemplo.mjs),
// debaixo de exemplos/, e a rota as confere pelo SHA-256 como confere as fotos. A homologação só lê.

export interface CopiaDeExemplo {
  medida: [number, number];
  sha256: string;
  bytes: number;
}

export const COPIAS_DE_EXEMPLO: Record<string, Record<Tamanho, CopiaDeExemplo> & { original: [number, number] }> = {
  'chico-1.jpg': { original: [900, 1600], pequena: { medida: [480, 853], sha256: 'a0ba94584abbf4b30bcff5b39a264c290a10eceb81854af517121177b1ac85bb', bytes: 39882 }, media: { medida: [900, 1600], sha256: '1db5cf074d6c7aacbf218dd343fc5ac0fbe9235d52e3b9997b91b6f0e016a8c8', bytes: 98320 } },
  'chico-2.jpg': { original: [1200, 1600], pequena: { medida: [480, 640], sha256: '81e1f781c32696b2e889a6af528b41996046b88ccbec32bcbd749fda53a090f7', bytes: 28282 }, media: { medida: [1200, 1600], sha256: 'd98e3547b9c4f669d184976cc68ae3269a09c6a94db0540fac925308a54f7cc4', bytes: 90688 } },
  'chico-3.jpg': { original: [1600, 900], pequena: { medida: [853, 480], sha256: '18682388a03c49270f56b1e4cfad002a17ec509ca4e0e1e1a1973ea07e492ec5', bytes: 18432 }, media: { medida: [1600, 900], sha256: 'f21846bb6a6449d74e2ec65d34f5ee75107ffdaeccff8d3c3f425f0c84c978f6', bytes: 42482 } },
  'chico-4.jpg': { original: [900, 1600], pequena: { medida: [480, 853], sha256: '072e331fe0caa0cfa4f88413422a195a39a34ebc06fffa3e75e0264a16428619', bytes: 18234 }, media: { medida: [900, 1600], sha256: 'e580858f827198d961050c5591331a7b0ed465a2d83c183ee8539cd5010e3b39', bytes: 41020 } },
  'chico-5.jpg': { original: [900, 1600], pequena: { medida: [480, 853], sha256: 'a64b46ba786a065bfa66d4693921e2c9b146b75a47200f8eb402b138df6b09fe', bytes: 18522 }, media: { medida: [900, 1600], sha256: '658516b8b065a56042812edaeb9d14cd93da21d33d69a064f993a14489be1db2', bytes: 41046 } },
  'karol-1.jpg': { original: [900, 1600], pequena: { medida: [480, 853], sha256: '2b65762e21884d3c081cf8f2e6d4d63606c1fe98463d48b2bcfc0a4915806aa9', bytes: 42284 }, media: { medida: [900, 1600], sha256: '3ddf44377df9e19c0510883983716ca61ab86446636b772c7f976e423d0e1aca', bytes: 122198 } },
  'karol-2.jpg': { original: [1200, 1600], pequena: { medida: [480, 640], sha256: '4fab632543f16597f7b2d34a26349dc11fba5953d461c162c501713964d01468', bytes: 20558 }, media: { medida: [1200, 1600], sha256: '7ead65a0357707065688bfa35416de98757d2d88311c02f84fa9f1520209226f', bytes: 97630 } },
  'karol-3.jpg': { original: [1200, 1600], pequena: { medida: [480, 640], sha256: 'c818f4efa56f63b92ebf88eb09298103c4ef49b28df295bb4bb68f3cefd590b2', bytes: 29696 }, media: { medida: [1200, 1600], sha256: 'ce2bc3d51b37050bd59ec16203e71487fb316b5c28f709d44372353dcb144ebd', bytes: 127886 } },
  'karol-4.jpg': { original: [1200, 1600], pequena: { medida: [480, 640], sha256: '87440151215b35f32dd22b6486bf4160ab8fb3c6d75126ddf99377631aaa231c', bytes: 20800 }, media: { medida: [1200, 1600], sha256: '17fbe5a5e842104686db112536e30ecb64bb9a8aab66b7e9959366054278dfdf', bytes: 86700 } },
  'karol-5.jpg': { original: [1200, 1600], pequena: { medida: [480, 640], sha256: 'bdb3df02d92793282fa2e92ffbfaf84ac69acbb414390b31b4e866f8c00dc67d', bytes: 23420 }, media: { medida: [1200, 1600], sha256: '066dc88e5a3d70f2613a9d288de6f0c335cb3732074910ae5603b0ca25a9185f', bytes: 92778 } },
  'karol-6.jpg': { original: [1200, 1600], pequena: { medida: [480, 640], sha256: '68a7466c5ec5a58d73c697a5a5e85f7570ee51c03a8fdd4a4099dc20a3f828ce', bytes: 23512 }, media: { medida: [1200, 1600], sha256: '3c4ef95d056caa9d7734f19da85905b3c57fe65a8d8a3a09f7de7969e5dbc3e6', bytes: 95602 } },
};

/** O nome do arquivo de uma cópia de exemplo, como fica em exemplos/fotos/copias/ e no bucket: "chico-1.pequena.webp". */
export const nomeDaCopiaDeExemplo = (nome: string, tamanho: Tamanho) => `${nome.replace(/\.jpg$/, '')}.${tamanho}.webp`;

/** As cópias de uma foto de exemplo, como o banco guardaria (fotos.copias). Nada, se a chave não é de exemplo. */
export function copiasDeExemplo(chave: string): Copias | null {
  if (!ehChaveDeExemplo(chave)) return null;
  const c = COPIAS_DE_EXEMPLO[chave.slice(PASTA_DOS_EXEMPLOS.length)];
  return c ? { formato: 'webp', pequena: c.pequena.medida, media: c.media.medida, original: c.original, bytes: c.pequena.bytes + c.media.bytes } : null;
}

/** A pasta das fotos de exemplo no bucket de teste. Nada aqui é apagado pela limpeza. */
export const PASTA_DOS_EXEMPLOS = 'exemplos/';

/** Chave de uma foto de exemplo, como fica no banco e no bucket: "exemplos/chico-1.jpg". */
export const chaveDeExemplo = (nome: string) => `${PASTA_DOS_EXEMPLOS}${nome}`;

const NOMES = new Set(FOTOS_DE_EXEMPLO.map((f) => f.nome));

/** É a chave de uma das 11 fotos de exemplo? Só essas chaves passam pelas rotas como exemplo. */
export function ehChaveDeExemplo(chave: string): boolean {
  return chave.startsWith(PASTA_DOS_EXEMPLOS) && NOMES.has(chave.slice(PASTA_DOS_EXEMPLOS.length));
}

/** Um número fixo tirado de um texto (FNV-1a, 32 bits): o mesmo id sempre dá a mesma foto. */
export function numeroDoId(texto: string): number {
  let h = 0x811c9dc5;
  for (const c of texto) {
    h ^= c.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

const dos = (bicho?: 'chico' | 'karol') => FOTOS_DE_EXEMPLO.filter((f) => !bicho || f.bicho === bicho);

/**
 * O retrato de exemplo de uma pessoa ou bicho, pelo id. Quem é tratado como "ela" ganha uma foto da
 * Karol; como "ele", do Chico. Bichos e "Não informar", de um dos dois. O recorte quadrado é feito na
 * tela (o retrato mostra a foto cobrindo o quadrado), para o bucket guardar só as 11 fotos.
 */
export function retratoDeExemplo(id: string, tratamento: 'ela' | 'ele' | null, bicho = false): string {
  const opcoes = bicho || !tratamento ? dos() : dos(tratamento === 'ela' ? 'karol' : 'chico');
  return chaveDeExemplo(opcoes[numeroDoId(`retrato:${id}`) % opcoes.length]!.nome);
}

/** A foto de exemplo de uma memória, sorteada entre as 11 pelo id da memória e a posição da foto. */
export function fotoDeMemoriaDeExemplo(memoriaId: string, ordem: number): string {
  return chaveDeExemplo(FOTOS_DE_EXEMPLO[numeroDoId(`foto:${memoriaId}:${ordem}`) % FOTOS_DE_EXEMPLO.length]!.nome);
}

/** Quantas fotos uma memória do espelho ganha, de nenhuma a três, também pelo id. */
export const quantasFotosNoEspelho = (memoriaId: string) => numeroDoId(`quantas:${memoriaId}`) % 4;

// --- Limpeza do bucket de teste ---

/** Depois de quantos dias o que as prévias enviaram ao testar é apagado. */
export const DIAS_ATE_A_LIMPEZA = 7;

/**
 * Do que está no bucket de teste, o que a limpeza apaga: fotos e retratos enviados há mais de
 * DIAS_ATE_A_LIMPEZA dias. Nunca o que está em exemplos/ e nunca os áudios, que têm o teto deles.
 */
export function paraLimpar(objetos: { key: string; uploaded: Date }[], agora: Date, dias = DIAS_ATE_A_LIMPEZA): string[] {
  const limite = agora.getTime() - dias * 24 * 60 * 60 * 1000;
  return objetos
    .filter((o) => !o.key.startsWith(PASTA_DOS_EXEMPLOS) && !o.key.startsWith('audios/'))
    .filter((o) => /^(retratos\/|\d{4}\/)/.test(o.key))
    .filter((o) => o.uploaded.getTime() < limite)
    .map((o) => o.key);
}

/**
 * Os retratos da homologação que precisam voltar a ser de exemplo (defeito visto pelo Gui depois da
 * sessão H, 18/11/2026): o espelho da sessão G levou os retratos reais e, sem eles na cópia, deixou as
 * pessoas sem retrato. Na homologação, todo retrato é uma das fotos do Chico e da Karol, sorteada pelo id
 * como no espelho (retratoDeExemplo). Devolve só quem muda.
 */
export function retratosDeExemploParaHomologacao(
  integrantes: { id: string; retrato: string | null; tratamento: string | null; tipo: string }[],
): { id: string; retrato: string }[] {
  return integrantes
    .filter((i) => !i.retrato || !ehChaveDeExemplo(i.retrato))
    .map((i) => {
      const tratamento = i.tratamento === 'ela' || i.tratamento === 'ele' ? i.tratamento : null;
      return { id: i.id, retrato: retratoDeExemplo(i.id, tratamento, i.tipo === 'bicho') };
    });
}
