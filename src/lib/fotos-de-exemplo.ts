// Fotos de exemplo: o Chico e a Karol (decisão do Gui, 16/11/2026). Funções puras, usadas pela
// semente das prévias, pelo espelho da homologação, pelas rotas de fotos e retratos e pelos testes.
//
// As cópias reduzidas ficam em exemplos/fotos/, fora de src/ e de public/, então nunca entram no
// site publicado. No bucket de teste elas moram debaixo de exemplos/, e chegam lá pelo envio de
// scripts/enviar-fotos-de-exemplo.mjs, que só aceita estes 11 arquivos (conferidos pelo SHA-256).
// Toda foto e todo retrato de exemplo apontam para um deles: nada de cópia por memória ou pessoa.

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
