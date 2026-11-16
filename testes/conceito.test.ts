// O conceito da revisão visual (/conceito) usa o acervo de exemplo e dados fixos de exemplo.
// Por isso só existe nas prévias de teste e no computador: na produção e na homologação, toda
// rota dele responde 404. Aqui a trava roda de verdade, em cada ambiente.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// O ambiente do Cloudflare, como o site o recebe: os testes trocam o que cada um precisa
const env = vi.hoisted(() => ({ AMBIENTE: 'producao' as string, DB_HOMOLOGA: undefined as unknown, FOTOS_HOMOLOGA: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));

const { ENDERECO_DA_HOMOLOGACAO, noPedido } = await import('../src/lib/servidor/ambiente');
const { conceitoDisponivel, naoEncontrado } = await import('../src/lib/servidor/conceito');

const em = (endereco: string) => noPedido(new Request(`https://${endereco}/conceito`), () => conceitoDisponivel());

describe('onde o conceito existe', () => {
  beforeEach(() => {
    // No pacote publicado, DEV é sempre falso: é o que decide entre o computador e o Cloudflare
    vi.stubEnv('DEV', false);
    env.AMBIENTE = 'producao';
    env.DB_HOMOLOGA = undefined;
    env.FOTOS_HOMOLOGA = undefined;
  });
  afterEach(() => vi.unstubAllEnvs());

  it('na produção, não existe', () => {
    expect(em('memorias.bayara.com.br')).toBe(false);
  });

  it('na homologação, não existe, mesmo ela sendo uma prévia', () => {
    // A homologação é a prévia da branch homologa: recebe a configuração das prévias, com o banco dela
    env.AMBIENTE = 'previa';
    env.DB_HOMOLOGA = {};
    env.FOTOS_HOMOLOGA = {};
    expect(em(ENDERECO_DA_HOMOLOGACAO)).toBe(false);
  });

  it('nas prévias de teste, existe', () => {
    env.AMBIENTE = 'previa';
    env.DB_HOMOLOGA = {};
    env.FOTOS_HOMOLOGA = {};
    expect(em('tst-visual.memorias.bayara.com.br')).toBe(true);
  });

  it('no computador, existe', () => {
    vi.stubEnv('DEV', true);
    expect(em('localhost')).toBe(true);
  });

  it('onde não existe, a resposta é 404', () => {
    expect(naoEncontrado().status).toBe(404);
  });
});
