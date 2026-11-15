import { beforeAll, describe, expect, it, vi } from 'vitest';

const TIME = 'time-de-teste.cloudflareaccess.com';
const AUD = 'aud-de-teste';

vi.mock('cloudflare:workers', () => ({
  env: { ACCESS_TEAM_DOMAIN: 'time-de-teste.cloudflareaccess.com', ACCESS_AUD: 'aud-de-teste', ACESSOS: '{}', ADMIN: 'gui', COPIA_CLIENT_ID: 'id-da-copia.access' },
}));
vi.mock('../src/lib/servidor/repositorio', () => ({ listarIntegrantes: async () => [] }));

const b64 = (dados: ArrayBuffer | string) =>
  Buffer.from(typeof dados === 'string' ? dados : new Uint8Array(dados)).toString('base64url');

let chaves: CryptoKeyPair;
let outraChave: CryptoKeyPair;
const agora = () => Math.floor(Date.now() / 1000);

async function assinar(dados: Record<string, unknown>, par = chaves, cabecalho: Record<string, unknown> = { alg: 'RS256', kid: 'k1' }) {
  const base = `${b64(JSON.stringify(cabecalho))}.${b64(JSON.stringify(dados))}`;
  const assinatura = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', par.privateKey, new TextEncoder().encode(base));
  return `${base}.${b64(assinatura)}`;
}

const valido = () => ({ email: 'Giovanna@Exemplo.com', exp: agora() + 600, iss: `https://${TIME}`, aud: [AUD] });

beforeAll(async () => {
  const gerar = () =>
    crypto.subtle.generateKey(
      { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
      true,
      ['sign', 'verify'],
    );
  chaves = await gerar();
  outraChave = await gerar();
  const jwk = await crypto.subtle.exportKey('jwk', chaves.publicKey);
  vi.stubGlobal('fetch', async (url: string) => {
    expect(url).toBe(`https://${TIME}/cdn-cgi/access/certs`);
    return new Response(JSON.stringify({ keys: [{ ...jwk, kid: 'k1' }] }));
  });
});

describe('token do Access', () => {
  it('aceita um token assinado pelo Access e devolve o e-mail em minúsculas', async () => {
    const { emailDoToken } = await import('../src/lib/servidor/acesso');
    expect(await emailDoToken(await assinar(valido()))).toBe('giovanna@exemplo.com');
  });
  it('recusa assinatura de outra chave', async () => {
    const { emailDoToken } = await import('../src/lib/servidor/acesso');
    expect(await emailDoToken(await assinar(valido(), outraChave))).toBeUndefined();
  });
  it('recusa conteúdo alterado depois de assinado', async () => {
    const { emailDoToken } = await import('../src/lib/servidor/acesso');
    const [c, , a] = (await assinar(valido())).split('.');
    const adulterado = `${c}.${b64(JSON.stringify({ ...valido(), email: 'intruso@exemplo.com' }))}.${a}`;
    expect(await emailDoToken(adulterado)).toBeUndefined();
  });
  it('recusa token vencido', async () => {
    const { emailDoToken } = await import('../src/lib/servidor/acesso');
    expect(await emailDoToken(await assinar({ ...valido(), exp: agora() - 10 }))).toBeUndefined();
  });
  it('recusa token de outra aplicação', async () => {
    const { emailDoToken } = await import('../src/lib/servidor/acesso');
    expect(await emailDoToken(await assinar({ ...valido(), aud: ['outra'] }))).toBeUndefined();
  });
  it('recusa token de outro time', async () => {
    const { emailDoToken } = await import('../src/lib/servidor/acesso');
    expect(await emailDoToken(await assinar({ ...valido(), iss: 'https://outro.cloudflareaccess.com' }))).toBeUndefined();
  });
  it('recusa token sem assinatura', async () => {
    const { emailDoToken } = await import('../src/lib/servidor/acesso');
    const semAssinatura = `${b64(JSON.stringify({ alg: 'none' }))}.${b64(JSON.stringify(valido()))}.`;
    expect(await emailDoToken(semAssinatura)).toBeUndefined();
    expect(await emailDoToken(undefined)).toBeUndefined();
    expect(await emailDoToken('lixo')).toBeUndefined();
  });
});

describe('cópia automática', () => {
  const servico = (common_name: string) => ({ common_name, type: 'app', exp: agora() + 600, iss: `https://${TIME}`, aud: [AUD] });
  const pedido = (token: string) => new Request('https://memorias.exemplo/api/copia', { headers: { 'Cf-Access-Jwt-Assertion': token } });

  it('reconhece o token de serviço da cópia', async () => {
    const { ehServicoDeCopia } = await import('../src/lib/servidor/acesso');
    expect(await ehServicoDeCopia(pedido(await assinar(servico('id-da-copia.access'))))).toBe(true);
  });
  it('recusa outro token de serviço', async () => {
    const { ehServicoDeCopia } = await import('../src/lib/servidor/acesso');
    expect(await ehServicoDeCopia(pedido(await assinar(servico('outro.access'))))).toBe(false);
  });
  it('recusa o token de uma pessoa', async () => {
    const { ehServicoDeCopia } = await import('../src/lib/servidor/acesso');
    expect(await ehServicoDeCopia(pedido(await assinar(valido())))).toBe(false);
  });
  it('recusa o token de serviço assinado por outra chave', async () => {
    const { ehServicoDeCopia } = await import('../src/lib/servidor/acesso');
    expect(await ehServicoDeCopia(pedido(await assinar(servico('id-da-copia.access'), outraChave)))).toBe(false);
  });
});
