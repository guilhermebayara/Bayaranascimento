// Revisão Z2 (23/11/2026), os pontos que só se veem no navegador: o recado no alto (pontos 1 a 4 da lista),
// a página que continua com o que foi digitado quando salvar falha (ponto 6), o envio único num banco D1 de
// verdade (ponto 7) e o maior lote no D1 local (ponto 5).
//
// Precisa do servidor local no ar, com o acervo de exemplo, e do Playwright instalado na máquina:
//   npm run dev -- --port 4400
//   Z2_SERVIDOR=http://localhost:4400 NODE_PATH=$(npm root -g) npx vitest run testes/revisao-z2-navegador.test.ts
// Sem Z2_SERVIDOR, o arquivo inteiro é pulado (o build do Cloudflare não tem servidor nem navegador, como a
// gestalt). Os casos gravam no banco local: memórias com o título começando por "Z2 navegador".
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// O projeto não tem os tipos do Node: o módulo entra assim para o tsc não acusar o import (como em apoio/d1.ts)
const NODE_MODULE = 'node:module';

const B = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env.Z2_SERVIDOR;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Pagina = any;
type Contexto = any;

describe.skipIf(!B)('Z2 no navegador', () => {
  let navegador: any;
  const abertos: Contexto[] = [];
  let serie = Date.now() % 100000;
  /** Um nome que só existe nesta rodada, sem algarismo: os pares de possíveis duplicados saem do primeiro e do último nome */
  const unico = (raiz: string) => `${raiz}${String(++serie).replace(/\d/g, (d) => 'abcdefghij'[Number(d)]!)}`;

  beforeAll(async () => {
    // O Playwright é o da máquina (NODE_PATH), achado pelo require do Node
    const { createRequire } = (await import(/* @vite-ignore */ NODE_MODULE)) as { createRequire(de: string): (modulo: string) => any };
    const { chromium } = createRequire(import.meta.url)('playwright');
    navegador = await chromium.launch();
  }, 60_000);
  afterAll(async () => {
    for (const c of abertos) await c.close().catch(() => undefined);
    await navegador?.close();
  });

  /** Uma pessoa do "Ver como" (o cookie "como"), com ou sem script */
  async function como(pessoa: string, { script = true, largura = 390 }: { script?: boolean; largura?: number } = {}) {
    const ctx = await navegador.newContext({ viewport: { width: largura, height: 844 }, javaScriptEnabled: script });
    abertos.push(ctx);
    await ctx.addCookies([{ name: 'como', value: pessoa, url: B }]);
    const json = async (rota: string, corpo: Record<string, unknown>) => {
      const r = await ctx.request.post(`${B}/api/${rota}`, { headers: { Origin: B!, 'Content-Type': 'application/json' }, data: corpo });
      return { status: r.status() as number, corpo: (await r.json().catch(() => ({}))) as Record<string, any> };
    };
    const formulario = async (rota: string, campos: Record<string, string>) => {
      const r = await ctx.request.post(`${B}/api/${rota}`, { headers: { Origin: B! }, form: campos, maxRedirects: 0 });
      return { status: r.status() as number, para: decodeURIComponent(String(r.headers().location ?? '').replace(/\+/g, ' ')) };
    };
    const abrir = async (caminho: string): Promise<Pagina> => {
      const pagina = await ctx.newPage();
      // Os envios que a página faz, para conferir que um toque manda um pedido só
      pagina.envios = [] as string[];
      pagina.on('request', (pedido: any) => {
        if (pedido.method() === 'POST') pagina.envios.push(new URL(pedido.url()).pathname);
      });
      await pagina.goto(B + caminho);
      return pagina;
    };
    return { ctx, json, formulario, abrir };
  }
  type Pessoa = Awaited<ReturnType<typeof como>>;

  /** Uma memória da Giovanna só da Bayara Nascimento, com o relato da Elizete, aberta depois para todos: o relato espera */
  async function pedidoParaLiberar(gio: Pessoa, eli: Pessoa) {
    const ficha = { titulo: `Z2 navegador: pedido ${++serie}`, ano: 2015, tipo: 'causo', pessoas: ['giovanna'], visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] };
    const id = (await gio.json('memorias', ficha)).corpo.id as string;
    expect((await eli.json('relatos', { memoria: id, por: 'elizete', texto: 'O relato da Elizete.', publico: 'nucleos:bayara-nascimento' })).status).toBe(201);
    expect((await gio.json('memorias', { ...ficha, id, visibilidade: 'todos', nucleos: [], fotosMostradas: [] })).corpo.esperam).toEqual(['elizete']);
    /** Quem criou muda quem vê de novo, para um público em que o relato continua esperando */
    const mudarDeNovo = () => gio.json('memorias', { ...ficha, id, visibilidade: 'nucleos', nucleos: ['bayara-nascimento', 'bayara-bracarense'], fotosMostradas: [] });
    return { id, mudarDeNovo };
  }

  /** Antes do toque: marca a página (para saber se recarregou) e anota tudo o que for dito ao leitor de tela */
  async function vigiar(pagina: Pagina) {
    await pagina.evaluate(() => {
      const w = window as any;
      if (w.__z2) {
        w.__z2.ditos = [];
        return;
      }
      w.__z2 = { ditos: [] as string[] };
      const vivo = (no: Node | null): Element | null => {
        const el = no instanceof Element ? no : (no?.parentElement ?? null);
        return el?.closest('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]') ?? null;
      };
      new MutationObserver((mudancas) => {
        for (const m of mudancas) {
          // O que entra numa região viva, ou uma região viva que entra na página com texto
          const alvo = vivo(m.target);
          const texto = alvo?.textContent?.trim();
          if (alvo && texto && !alvo.matches('[data-mensagens]')) w.__z2.ditos.push(texto);
          for (const no of m.addedNodes) {
            if (!(no instanceof Element)) continue;
            for (const regiao of [no, ...no.querySelectorAll('*')]) {
              if (regiao.matches('[aria-live]:not([aria-live="off"]), [role="status"], [role="alert"]') && regiao.textContent?.trim() && !alvo) w.__z2.ditos.push(regiao.textContent.trim());
            }
          }
        }
      }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    });
  }

  /** Depois do toque: o que a página mostra, o que foi dito e onde está o foco */
  async function depois(pagina: Pagina) {
    await pagina.waitForFunction(() => !document.querySelector('form[aria-busy]'), null, { timeout: 15_000 });
    // O anúncio entra 50 ms depois da troca
    await pagina.waitForTimeout(250);
    return pagina.evaluate(() => {
      const w = window as any;
      const visivel = (el: Element | null) => Boolean(el && (el as any).checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true }) && el.getBoundingClientRect().height > 0);
      const faixas = [...document.querySelectorAll('[data-recados]')];
      const faixa = faixas[0] as HTMLElement | undefined;
      const ativo = document.activeElement as HTMLElement | null;
      const noFormulario = [...document.querySelectorAll('.recado-no-lugar')];
      return {
        recarregou: !w.__z2,
        ditos: [...new Set((w.__z2?.ditos ?? []) as string[])],
        vezes: (w.__z2?.ditos ?? []) as string[],
        faixas: faixas.length,
        faixa: faixa
          ? {
              texto: faixa.textContent!.trim().replace(/\s+/g, ' '),
              visivel: visivel(faixa),
              erro: Boolean(faixa.matches('.recado--erro') || faixa.querySelector('.recado--erro')),
              classe: (faixa.matches('.recado') ? faixa : faixa.querySelector('.recado'))?.className ?? '',
              papeis: [faixa, ...faixa.querySelectorAll('[role]')].map((e) => e.getAttribute('role')).filter(Boolean),
              topo: Math.round(faixa.getBoundingClientRect().top + window.scrollY),
            }
          : null,
        noFormulario: noFormulario.map((r) => ({ texto: r.textContent!.trim(), visivel: visivel(r), chave: (r.closest('form') as HTMLElement | null)?.dataset.chave ?? null })),
        foco: {
          noCorpo: ativo === document.body || ativo === null,
          oQue: ativo ? `${ativo.tagName.toLowerCase()}${ativo.className ? `.${String(ativo.className).split(/\s+/).join('.')}` : ''}` : '',
          regiao: ativo?.closest('[data-regiao]')?.getAttribute('data-regiao') ?? null,
          visivel: visivel(ativo),
        },
      };
    });
  }
  type Resultado = Awaited<ReturnType<typeof depois>>;
  /** O recado foi dito ao leitor de tela uma vez, e a faixa do alto não é uma segunda região viva */
  function ditoUmaVez(r: Resultado, recado: string) {
    expect(r.vezes.filter((t: string) => t === recado), `dito: ${JSON.stringify(r.vezes)}`).toHaveLength(1);
    expect(r.ditos).toEqual([recado]);
  }
  /** A chave do formulário do pedido desta memória na lista de avisos */
  const pedidoDa = (pagina: Pagina, memoria: string) => pagina.locator('li.aviso').filter({ has: pagina.locator(`a[href^="/memorias/${memoria}"]`) }).locator('form[data-chave^="aviso-"]').getAttribute('data-chave');
  const tocar = async (pagina: Pagina, seletor: string) => {
    await vigiar(pagina);
    await pagina.locator(seletor).first().click();
    return depois(pagina);
  };

  // -------------------------------------------------------------------------------------------------
  describe('ponto 1: o recado vai para o alto quando o formulário some, e fica com o formulário quando ele continua', () => {
    it('o pedido em "Sua conta": respondido, sai da lista, e o recado aparece na faixa do alto, sem recarregar', async () => {
      const [gio, eli] = [await como('giovanna'), await como('elizete')];
      const { id } = await pedidoParaLiberar(gio, eli);
      const pagina = await eli.abrir('/conta');
      const chave = await pedidoDa(pagina, id);
      const r = await tocar(pagina, `form[data-chave="${chave}"] button[value="manter"]`);
      expect(r.recarregou).toBe(false);
      expect(pagina.envios).toEqual(['/api/avisos']);
      expect(await pagina.locator(`form[data-chave="${chave}"]`).count()).toBe(0);
      expect(r.faixas).toBe(1);
      expect(r.faixa).toMatchObject({ visivel: true, erro: false, papeis: [] });
      expect(r.faixa!.texto).toBe('Seu relato continua só para quem via antes. Dá para liberar depois, no próprio relato.');
      expect(r.noFormulario).toEqual([]);
      ditoUmaVez(r, r.faixa!.texto);
      expect(r.foco.noCorpo).toBe(false);
      expect(r.foco.regiao).toBe('avisos-conta');
    }, 60_000);

    it('o pedido no Início: "Liberar" tira o pedido da lista e o recado vai para o alto, no mesmo lugar e com o mesmo texto da página recarregada', async () => {
      const [gio, eli] = [await como('giovanna'), await como('elizete')];
      const { id } = await pedidoParaLiberar(gio, eli);
      // Na primeira visita o Início mostra só a carta: os avisos aparecem a partir da segunda
      await (await eli.abrir('/')).close();
      const pagina = await eli.abrir('/');
      const chave = await pedidoDa(pagina, id);
      const r = await tocar(pagina, `form[data-chave="${chave}"] button[value="liberar"]`);
      expect(r.recarregou).toBe(false);
      expect(r.faixa).toMatchObject({ visivel: true, erro: false, papeis: [], texto: 'Relato liberado para quem passou a ver a memória.' });
      ditoUmaVez(r, r.faixa!.texto);
      // A mesma resposta, sem script, em outro pedido: a página recarrega com o recado no alto
      const outro = await pedidoParaLiberar(gio, eli);
      const semScript = await como('elizete', { script: false });
      const comum = await semScript.abrir('/');
      await comum.locator(`form[data-chave="${await pedidoDa(comum, outro.id)}"] button[value="liberar"]`).click();
      await comum.waitForLoadState('load');
      const recarregada = await comum.evaluate(() => {
        const faixa = document.querySelector('[data-recados]') as HTMLElement;
        return { texto: faixa.textContent!.trim().replace(/\s+/g, ' '), classe: (faixa.matches('.recado') ? faixa : faixa.querySelector('.recado'))!.className, topo: Math.round(faixa.getBoundingClientRect().top + window.scrollY), papel: (faixa.matches('[role]') ? faixa : faixa.querySelector('[role]'))?.getAttribute('role') };
      });
      expect(new URL(comum.url()).searchParams.get('ok')).toBe(recarregada.texto);
      expect(recarregada.papel).toBe('status');
      expect(r.faixa!.texto).toBe(recarregada.texto);
      expect(r.faixa!.classe).toBe(recarregada.classe);
      expect(r.faixa!.topo).toBe(recarregada.topo);
    }, 90_000);

    it('o pedido que mudou enquanto a pessoa lia: o recado de erro vai para o mesmo pedido na página nova, e a faixa do alto fica como estava', async () => {
      const [gio, eli] = [await como('giovanna'), await como('elizete')];
      const { id, mudarDeNovo } = await pedidoParaLiberar(gio, eli);
      const pagina = await eli.abrir('/conta');
      const chave = await pedidoDa(pagina, id);
      expect((await mudarDeNovo()).status).toBe(200);
      const r = await tocar(pagina, `form[data-chave="${chave}"] button[value="liberar"]`);
      expect(r.recarregou).toBe(false);
      expect(r.noFormulario).toEqual([{ texto: 'A memória mudou, e o pedido também. Confira e responda de novo.', visivel: true, chave }]);
      expect(r.faixa).toMatchObject({ visivel: false, texto: '' });
      ditoUmaVez(r, 'A memória mudou, e o pedido também. Confira e responda de novo.');
      expect(r.foco.noCorpo).toBe(false);
    }, 60_000);

    it('o "Liberar" do bilhete, na página da memória: a região some, e o recado vai para o alto (o foco fica registrado)', async () => {
      const [gio, eli] = [await como('giovanna'), await como('elizete')];
      const { id } = await pedidoParaLiberar(gio, eli);
      const pagina = await eli.abrir(`/memorias/${id}`);
      expect(await pagina.locator('form[data-chave^="liberar-"]').count()).toBe(1);
      const r = await tocar(pagina, 'form[data-chave^="liberar-"] button');
      expect(r.recarregou).toBe(false);
      expect(await pagina.locator('form[data-chave^="liberar-"]').count()).toBe(0);
      expect(r.faixa).toMatchObject({ visivel: true, erro: false, papeis: [] });
      expect(r.faixa!.texto).toBe('Relato liberado para quem passou a ver a memória.');
      ditoUmaVez(r, r.faixa!.texto);
      // Ponto 4: aqui a própria região some. Hoje o foco cai no corpo da página
      expect(r.foco).toMatchObject({ noCorpo: true });
    }, 60_000);

    it('o bilhete com o pedido que mudou: o recado de erro aparece no mesmo formulário da página nova', async () => {
      const [gio, eli] = [await como('giovanna'), await como('elizete')];
      const { id, mudarDeNovo } = await pedidoParaLiberar(gio, eli);
      const pagina = await eli.abrir(`/memorias/${id}`);
      const chave = await pagina.locator('form[data-chave^="liberar-"]').getAttribute('data-chave');
      expect((await mudarDeNovo()).status).toBe(200);
      const r = await tocar(pagina, 'form[data-chave^="liberar-"] button');
      expect(r.recarregou).toBe(false);
      expect(r.noFormulario).toEqual([{ texto: 'A memória mudou, e o pedido também. Confira e responda de novo.', visivel: true, chave }]);
      expect(r.faixa).toMatchObject({ visivel: false, texto: '' });
      expect(r.foco).toMatchObject({ noCorpo: false, regiao: chave });
    }, 60_000);

    it('sugestões: recusar tira o formulário e o recado vai para o alto; a resposta vazia deixa o recado junto do formulário', async () => {
      const [gui, eli] = [await como('gui'), await como('elizete')];
      const id = (await gui.json('memorias', { titulo: `Z2 navegador: sugestões ${++serie}`, ano: 2015, tipo: 'causo', pessoas: ['gui'] })).corpo.id as string;
      for (const lugar of ['Caeté', 'Sabará']) expect((await eli.formulario('sugestoes', { acao: 'sugerir-dados', memoria: id, lugar })).status).toBe(303);
      const pagina = await gui.abrir(`/memorias/${id}/sugestoes`);
      const chaves = await pagina.locator('form[data-chave^="sugestao-"]').evaluateAll((fs: HTMLElement[]) => fs.map((f) => f.dataset.chave));
      expect(chaves).toHaveLength(2);
      // A resposta vazia: o formulário continua, e o recado fica nele
      const vazia = await tocar(pagina, `form[data-chave="${chaves[0]}"] button[value="responder"]`);
      expect(vazia.recarregou).toBe(false);
      expect(vazia.noFormulario).toEqual([{ texto: 'Escreva a resposta.', visivel: true, chave: chaves[0] }]);
      expect(vazia.faixa).toMatchObject({ visivel: false, texto: '' });
      ditoUmaVez(vazia, 'Escreva a resposta.');
      expect(vazia.foco.noCorpo).toBe(false);
      // Recusar: a sugestão deixa de ter formulário, e o recado vai para o alto
      const recusada = await tocar(pagina, `form[data-chave="${chaves[0]}"] button[value="recusar"]`);
      expect(recusada.recarregou).toBe(false);
      expect(await pagina.locator(`form[data-chave="${chaves[0]}"]`).count()).toBe(0);
      expect(await pagina.locator(`form[data-chave="${chaves[1]}"]`).count()).toBe(1);
      expect(recusada.faixa).toMatchObject({ visivel: true, erro: false, texto: 'Sugestão recusada.', papeis: [] });
      expect(recusada.noFormulario).toEqual([]);
      ditoUmaVez(recusada, 'Sugestão recusada.');
      expect(recusada.foco).toMatchObject({ noCorpo: false, regiao: 'sugestoes' });
    }, 90_000);

    it('duplicados: "Não são a mesma pessoa" tira o par da lista, e o recado com os dois nomes vai para o alto', async () => {
      const gui = await como('gui', { largura: 1280 });
      const n = unico('Zen');
      expect((await gui.json('memorias', { titulo: `Z2 navegador: duplicados ${n}`, ano: 2015, tipo: 'causo', situacao: 'rascunho', pessoas: ['nova:0', 'nova:1'], novasPessoas: [{ nome: `${n} Souza Prado` }, { nome: `${n} Prado` }] })).status).toBe(201);
      const pagina = await gui.abrir('/admin/duplicados');
      const par = pagina.locator('form[data-chave^="duplicados-"]').filter({ has: pagina.locator(`input[value^="${n.toLowerCase()}-"]`) });
      expect(await par.count()).toBe(1);
      const chave = await par.getAttribute('data-chave');
      const r = await tocar(pagina, `form[data-chave="${chave}"] button`);
      expect(r.recarregou).toBe(false);
      expect(await pagina.locator(`form[data-chave="${chave}"]`).count()).toBe(0);
      expect(r.faixa).toMatchObject({ visivel: true, erro: false, papeis: [] });
      expect(r.faixa!.texto.replace(/^(.+) e (.+) saíram/, (_: string, a: string, b: string) => `${[a, b].sort().join(' e ')} saíram`)).toBe(`${n} Prado e ${n} Souza Prado saíram da lista.`);
      ditoUmaVez(r, r.faixa!.texto);
      expect(r.foco).toMatchObject({ noCorpo: false, regiao: 'duplicados' });
    }, 60_000);

    it('"Quem estava": entrar tira a oferta, e o recado vai para o alto; a oferta que já não vale volta com o recado de erro no alto', async () => {
      const [gui, eli] = [await como('gui'), await como('elizete')];
      const id = (await gui.json('memorias', { titulo: `Z2 navegador: quem estava ${++serie}`, ano: 2015, tipo: 'causo', pessoas: ['gui'] })).corpo.id as string;
      expect((await eli.formulario('reacoes', { acao: 'reagir', memoria: id, simbolo: 'estava', alvo: 'memoria' })).status).toBe(303);
      const pagina = await eli.abrir(`/memorias/${id}`);
      const outraAba = await eli.abrir(`/memorias/${id}`);
      expect(await pagina.locator('form[data-chave="quem-estava"]:not([hidden])').count()).toBe(1);
      const r = await tocar(pagina, 'form[data-chave="quem-estava"] button');
      expect(r.recarregou).toBe(false);
      expect(await pagina.locator('form[data-chave="quem-estava"]').count()).toBe(0);
      expect(r.faixa).toMatchObject({ visivel: true, erro: false, texto: 'Você entrou em Quem estava.', papeis: [] });
      ditoUmaVez(r, 'Você entrou em Quem estava.');
      expect(r.foco).toMatchObject({ noCorpo: false, regiao: 'quem-estava' });
      // A outra aba ainda mostra a oferta: o toque nela é recusado, o formulário some e o erro vai para o alto
      const velha = await tocar(outraAba, 'form[data-chave="quem-estava"] button');
      expect(velha.recarregou).toBe(false);
      expect(velha.faixa).toMatchObject({ visivel: true, erro: true, texto: 'Não foi possível entrar em Quem estava.', papeis: [] });
      ditoUmaVez(velha, 'Não foi possível entrar em Quem estava.');
    }, 90_000);

    it('"Como você chama": o formulário continua na página; o recado de erro fica junto dele e à vista, e a faixa do alto não muda', async () => {
      const gui = await como('gui');
      const pagina = await gui.abrir('/pessoas/elizete');
      await pagina.locator('details#como-voce-chama > summary').click();
      const campo = pagina.locator('form[data-chave="como-chama"] input[name="apelido"]');
      // Um apelido que a regra recusa: comprido demais
      await campo.evaluate((el: HTMLInputElement) => el.removeAttribute('maxlength'));
      await campo.fill('x'.repeat(200));
      const recusado = await tocar(pagina, 'form[data-chave="como-chama"] button[type="submit"], form[data-chave="como-chama"] button:not([type])');
      expect(recusado.recarregou).toBe(false);
      // Um toque, um pedido: a página da pessoa ligava os formulários duas vezes
      expect(pagina.envios).toEqual(['/api/apelidos']);
      expect(recusado.noFormulario).toEqual([{ texto: 'O apelido tem no máximo 40 letras.', visivel: true, chave: 'como-chama' }]);
      // O bloco "Como você chama" volta aberto, com o recado à vista
      expect(await pagina.locator('details#como-voce-chama').evaluate((d: HTMLDetailsElement) => d.open)).toBe(true);
      expect(recusado.faixa).toMatchObject({ visivel: false, texto: '' });
      ditoUmaVez(recusado, recusado.noFormulario[0].texto);
      expect(recusado.foco.noCorpo).toBe(false);
    }, 60_000);

    it('"Como você chama" que dá certo: o nome muda no lugar, o formulário continua, o recado é dito ao leitor de tela e não vai para o alto', async () => {
      const gui = await como('gui');
      const pagina = await gui.abrir('/pessoas/lucas-magno');
      await pagina.locator('details#como-voce-chama > summary').click();
      const apelido = `Magnão ${++serie}`;
      await pagina.locator('form[data-chave="como-chama"] input[name="apelido"]').fill(apelido);
      const r = await tocar(pagina, 'form[data-chave="como-chama"] button[type="submit"], form[data-chave="como-chama"] button:not([type])');
      expect(r.recarregou).toBe(false);
      expect(pagina.envios).toEqual(['/api/apelidos']);
      expect(await pagina.locator('form[data-chave="como-chama"]').count()).toBe(1);
      expect(await pagina.locator('[data-regiao="abertura"]').first().textContent()).toContain(apelido);
      expect(r.faixa).toMatchObject({ visivel: false, texto: '' });
      expect(r.noFormulario).toEqual([]);
      ditoUmaVez(r, `Pronto. Para você, aparece como ${apelido} no site inteiro.`);
      expect(r.foco).toMatchObject({ noCorpo: false, regiao: 'abertura' });
      // Deixa como estava
      await gui.formulario('apelidos', { pessoa: 'lucas-magno', apelido: '' });
    }, 60_000);
  });

  // -------------------------------------------------------------------------------------------------
  describe('ponto 2: o recado do alto, visto por outra pessoa do "Ver como"', () => {
    it('o par com a pessoa que só a Giovanna vê não aparece para os outros administradores, e o recado dela cita só quem ela vê', async () => {
      // A Marina só existe no laço "só eu vejo" da Giovanna. O Gui cadastra outra Marina, à vista de todos
      const [gui, gio, magno] = [await como('gui', { largura: 1280 }), await como('giovanna', { largura: 1280 }), await como('lucas-magno', { largura: 1280 })];
      expect((await gui.json('memorias', { titulo: `Z2 navegador: outra Marina ${++serie}`, ano: 2015, tipo: 'causo', situacao: 'rascunho', pessoas: ['nova:0'], novasPessoas: [{ nome: 'Marina' }] })).status).toBe(201);
      for (const outro of [gui, magno]) {
        const pagina = await outro.abrir('/admin/duplicados');
        expect(await pagina.locator('input[value="ex-marina"]').count()).toBe(0);
        // E o pedido direto, com o código dela, responde como quem não existe
        expect((await outro.formulario('duplicados', { acao: 'nao-sao', a: 'ex-marina', b: 'marina' })).para).toBe('/admin/duplicados?erro=Pessoa não encontrada.');
      }
      const pagina = await gio.abrir('/admin/duplicados');
      const par = pagina.locator('form[data-chave^="duplicados-"]').filter({ has: pagina.locator('input[value="ex-marina"]') });
      if ((await par.count()) === 0) return; // outra rodada já tirou o par da lista
      const chave = await par.first().getAttribute('data-chave');
      const r = await tocar(pagina, `form[data-chave="${chave}"] button`);
      expect(r.faixa!.texto).toBe('Marina e Marina saíram da lista.');
    }, 90_000);

    it('quem não vê a memória não recebe recado nenhum sobre ela: a página e a resposta são as de memória que não existe', async () => {
      const [eli, magno] = [await como('elizete'), await como('lucas-magno')];
      const titulo = `Z2 navegador: só da Bayara Nascimento ${++serie}`;
      const id = (await eli.json('memorias', { titulo, ano: 2015, tipo: 'causo', pessoas: ['elizete'], visibilidade: 'nucleos', nucleos: ['bayara-nascimento'] })).corpo.id as string;
      const pagina = await magno.abrir(`/memorias/${id}`);
      expect(await pagina.content()).not.toContain(titulo);
      for (const [rota, campos] of [
        ['reacoes', { acao: 'entrar', memoria: id }],
        ['sugestoes', { acao: 'sugerir-dados', memoria: id, lugar: 'Caeté' }],
      ] as [string, Record<string, string>][]) {
        const r = await magno.formulario(rota, campos);
        expect(r.para, rota).toBe('/?erro=Memória não encontrada.');
      }
    }, 60_000);
  });

  // -------------------------------------------------------------------------------------------------
  describe('ponto 3: sem script, a página recarrega com o recado no alto', () => {
    it('sugestões, duplicados, "Quem estava" e "Como você chama": cada um volta para a página com o recado na faixa do alto', async () => {
      const [gui, eli] = [await como('gui', { script: false, largura: 1280 }), await como('elizete', { script: false })];
      const faixaDe = (pagina: Pagina) =>
        pagina.evaluate(() => {
          const faixa = document.querySelector('[data-recados]') as HTMLElement;
          const recado = faixa.matches('.recado') ? faixa : faixa.querySelector('.recado');
          return { texto: recado?.textContent?.trim() ?? '', papel: recado?.getAttribute('role') ?? null, visivel: faixa.offsetParent !== null, escondida: faixa.hidden };
        });
      // Sugestões
      const id = (await gui.json('memorias', { titulo: `Z2 navegador: sem script ${++serie}`, ano: 2015, tipo: 'causo', pessoas: ['gui'] })).corpo.id as string;
      expect((await eli.formulario('sugestoes', { acao: 'sugerir-dados', memoria: id, lugar: 'Caeté' })).status).toBe(303);
      let pagina = await gui.abrir(`/memorias/${id}/sugestoes`);
      expect(await faixaDe(pagina)).toMatchObject({ escondida: true, texto: '' });
      await pagina.locator('form[data-chave^="sugestao-"] button[value="recusar"]').click();
      await pagina.waitForLoadState('load');
      expect(new URL(pagina.url()).pathname).toBe(`/memorias/${id}/sugestoes`);
      expect(await faixaDe(pagina)).toEqual({ texto: 'Sugestão recusada.', papel: 'status', visivel: true, escondida: false });
      // Duplicados
      const n = unico('Zul');
      expect((await gui.json('memorias', { titulo: `Z2 navegador: duplicados sem script ${n}`, ano: 2015, tipo: 'causo', situacao: 'rascunho', pessoas: ['nova:0', 'nova:1'], novasPessoas: [{ nome: `${n} Lima Costa` }, { nome: `${n} Costa` }] })).status).toBe(201);
      pagina = await gui.abrir('/admin/duplicados');
      await pagina.locator('form[data-chave^="duplicados-"]').filter({ has: pagina.locator(`input[value^="${n.toLowerCase()}-"]`) }).locator('button').click();
      await pagina.waitForLoadState('load');
      expect(await faixaDe(pagina)).toMatchObject({ papel: 'status', visivel: true });
      expect((await faixaDe(pagina)).texto).toMatch(new RegExp(`^${n} .*saíram da lista\\.$`));
      // Quem estava
      expect((await eli.formulario('reacoes', { acao: 'reagir', memoria: id, simbolo: 'estava', alvo: 'memoria' })).status).toBe(303);
      pagina = await eli.abrir(`/memorias/${id}`);
      await pagina.locator('form[data-chave="quem-estava"] button').click();
      await pagina.waitForLoadState('load');
      expect(await faixaDe(pagina)).toEqual({ texto: 'Você entrou em Quem estava.', papel: 'status', visivel: true, escondida: false });
      // Como você chama
      pagina = await eli.abrir('/pessoas/lucas-magno');
      await pagina.locator('details#como-voce-chama > summary').click();
      await pagina.locator('form[data-chave="como-chama"] input[name="apelido"]').fill('Magno do teste');
      await pagina.locator('form[data-chave="como-chama"] button').first().click();
      await pagina.waitForLoadState('load');
      expect(await faixaDe(pagina)).toEqual({ texto: 'Pronto. Para você, aparece como Magno do teste no site inteiro.', papel: 'status', visivel: true, escondida: false });
      await eli.formulario('apelidos', { pessoa: 'lucas-magno', apelido: '' });
    }, 120_000);
  });

  // -------------------------------------------------------------------------------------------------
  describe('ponto 4: o foco nos outros formulários no lugar', () => {
    it('a proximidade do laço, na edição da pessoa: guarda no lugar com um pedido só, o recado é dito uma vez e o foco fica no formulário', async () => {
      const gui = await como('gui', { largura: 1280 });
      const pagina = await gui.abrir('/pessoas/gui/editar');
      const formulario = pagina.locator('form[data-proximidade-no-lugar]').first();
      expect(await formulario.count()).toBe(1);
      const pessoa = await formulario.locator('input[name="pessoa"]').getAttribute('value');
      // O laço fica num bloco fechado: a pessoa abre para mexer
      await formulario.evaluate((f: HTMLElement) => {
        for (let bloco = f.closest('details'); bloco; bloco = bloco.parentElement?.closest('details') ?? null) bloco.open = true;
      });
      await vigiar(pagina);
      // "Salvar a proximidade" só aparece sem script: com script, o controle guarda sozinho ao mudar
      const controle = formulario.locator('input[type="range"]').first();
      await controle.focus();
      await controle.press('ArrowRight');
      await pagina.waitForFunction(() => (window as any).__z2.ditos.length > 0, null, { timeout: 15_000 });
      const r = await depois(pagina);
      expect(r.recarregou).toBe(false);
      expect(pagina.envios).toEqual(['/api/circulo']);
      expect(r.ditos).toHaveLength(1);
      expect(r.ditos[0]).toMatch(/^Proximidade de .+ guardada: .+\.$/);
      expect(r.vezes).toHaveLength(1);
      expect(r.faixa).toMatchObject({ visivel: false, texto: '' });
      expect(r.foco.noCorpo).toBe(false);
      // As duas regiões com o nome da pessoa foram trocadas: a situação, dentro do formulário, e a linha do laço
      expect(await pagina.locator(`form[data-proximidade-no-lugar] [data-regiao="proximidade-${pessoa}"]`).first().textContent()).toBe('Escolhida por você.');
    }, 60_000);
  });

  // -------------------------------------------------------------------------------------------------
  describe('ponto 6 (D2): quando salvar a memória falha de vez', () => {
    it('com script, a página fica como estava, com o que foi digitado, o recado e os botões de volta; a nova tentativa salva uma vez', async () => {
      const gio = await como('giovanna');
      const pagina = await gio.abrir('/nova');
      const titulo = `Z2 navegador: falha final ${++serie}`;
      await pagina.locator('input[name="titulo"]').fill(titulo);
      // O servidor responde como na terceira tentativa com o código repetido
      let recusados = 0;
      await pagina.route('**/api/memorias', (rota: any) => {
        recusados++;
        return rota.fulfill({ status: 503, contentType: 'application/json; charset=utf-8', body: JSON.stringify({ erro: 'Não consegui salvar.' }) });
      });
      await pagina.locator('button[data-salvar="rascunho"]').click();
      // O recado aparece na linha de avisos do formulário, à vista, junto dos botões
      const aviso = pagina.locator('form[data-formulario-memoria] > [data-situacao]');
      await aviso.filter({ hasText: 'Não consegui salvar.' }).waitFor({ state: 'visible', timeout: 15_000 });
      expect(await aviso.getAttribute('data-tipo')).toBe('erro');
      expect(await pagina.locator('.janela [data-situacao]').textContent()).toBe('');
      expect(recusados).toBe(1);
      expect(new URL(pagina.url()).pathname + new URL(pagina.url()).search).toBe('/nova');
      expect(await pagina.locator('input[name="titulo"]').inputValue()).toBe(titulo);
      expect(await pagina.locator('button[data-salvar="rascunho"]').isDisabled()).toBe(false);
      // A pessoa tenta de novo, e agora o servidor responde
      await pagina.unroute('**/api/memorias');
      await pagina.locator('button[data-salvar="rascunho"]').click();
      await pagina.waitForURL(/\/nova\?id=/, { timeout: 15_000 });
      expect(await pagina.locator('input[name="titulo"]').inputValue()).toBe(titulo);
      // Uma memória só com esse título, nos rascunhos dela
      const conta = await gio.abrir('/conta');
      expect(await conta.getByText(titulo, { exact: true }).count()).toBe(1);
    }, 90_000);

    it('o aviso do próprio formulário ("Dê um título…") aparece à vista na primeira etapa, e não na janela do relato', async () => {
      const gio = await como('giovanna');
      const pagina = await gio.abrir('/nova');
      await pagina.locator('button[data-salvar="rascunho"]').click();
      const aviso = pagina.locator('form[data-formulario-memoria] > [data-situacao]');
      await aviso.filter({ hasText: 'Dê um título para a memória.' }).waitFor({ state: 'visible', timeout: 15_000 });
      expect(await pagina.locator('.janela [data-situacao]').textContent()).toBe('');
      expect(pagina.envios).toEqual([]);
    }, 60_000);

    it('fila: sem script, a falha final volta para o formulário com o recado no alto, mas vazio: o que foi digitado só volta pelo "Voltar" do navegador', async () => {
      const gio = await como('giovanna', { script: false });
      const pagina = await gio.abrir('/nova');
      await pagina.locator('input[name="titulo"]').fill('Z2 navegador: sem script e sem sorte');
      await pagina.route('**/api/memorias', (rota: any) => rota.fulfill({ status: 303, headers: { Location: '/nova?erro=N%C3%A3o+consegui+salvar.' } }));
      await pagina.locator('button[data-salvar="rascunho"]').click();
      await pagina.waitForURL(/\/nova\?erro=/, { timeout: 15_000 });
      expect((await pagina.locator('[data-recados]').textContent())!.trim()).toBe('Não consegui salvar.');
      // Hoje: o campo volta vazio (a guarda do que foi digitado é do script)
      expect(await pagina.locator('input[name="titulo"]').inputValue()).toBe('');
    }, 60_000);
  });

  // -------------------------------------------------------------------------------------------------
  describe('ponto 7 (D3): a janela do relato sem script, no banco D1 local', () => {
    const janela = (pagina: Pagina) =>
      pagina.evaluate(() => ({
        envio: (document.querySelector('form.janela input[name="envio"]') as HTMLInputElement | null)?.value ?? '',
        publico: (document.querySelector('form.janela input[name="publico"]') as HTMLInputElement | null)?.value ?? '',
        mensagens: [...document.querySelectorAll('[data-mensagens] li:not([data-vazio])')].map((l) => l.querySelector('.mensagem__texto, p')?.textContent?.trim() ?? l.textContent!.trim()),
        recado: document.querySelector('[data-recados]')?.textContent?.trim() ?? '',
      }));

    it('cada página leva um código novo; o mesmo envio duas vezes grava uma mensagem só; "Publicar relato" duas vezes publica uma vez', async () => {
      const [gio, eli] = [await como('giovanna'), await como('elizete', { script: false })];
      const id = (await gio.json('memorias', { titulo: `Z2 navegador: toque duplo ${++serie}`, ano: 2015, tipo: 'causo', pessoas: ['giovanna'] })).corpo.id as string;
      const pagina = await eli.abrir(`/memorias/${id}/relato`);
      const primeira = await janela(pagina);
      expect(primeira.envio).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      // O toque duplo: o navegador manda o mesmo formulário duas vezes, com o código da página
      const campos = { memoria: id, por: 'elizete', acrescentar: '1', publico: primeira.publico, envio: primeira.envio, texto: 'Uma mensagem, dois toques.', situacao: 'rascunho' };
      const [um, dois] = [await eli.formulario('relatos', campos), await eli.formulario('relatos', campos)];
      expect(um.status).toBe(303);
      expect(dois).toEqual(um);
      await pagina.reload();
      const segunda = await janela(pagina);
      expect(segunda.mensagens).toEqual(['Uma mensagem, dois toques.']);
      expect(segunda.envio).not.toBe(primeira.envio);
      // Pela página, de verdade: outra mensagem, com o código novo
      await pagina.locator('textarea[data-campo]').fill('A segunda mensagem.');
      await pagina.locator('form.janela button[data-botao]').click();
      await pagina.waitForLoadState('load');
      const terceira = await janela(pagina);
      expect(terceira.recado).toBe('Mensagem guardada no rascunho. Só você vê até publicar.');
      expect(terceira.mensagens).toEqual(['Uma mensagem, dois toques.', 'A segunda mensagem.']);
      // "Publicar relato" duas vezes, com o código da página
      const publicar = { memoria: id, por: 'elizete', acrescentar: '1', publico: terceira.publico, envio: terceira.envio, texto: '', situacao: 'publicada' };
      const [p1, p2] = [await eli.formulario('relatos', publicar), await eli.formulario('relatos', publicar)];
      // Publicar leva à memória, no relato de quem publicou (crítica C1, sessão AA)
      expect(p1.para).toMatch(new RegExp(`^/memorias/${id}\\?ok=Relato publicado\\.#relato-\\d+$`));
      expect(p2).toEqual(p1);
      // Publicado uma vez, com as duas mensagens, cada uma uma vez só
      await pagina.goto(`${B}/memorias/${id}/relato`);
      expect((await janela(pagina)).mensagens).toEqual(['Uma mensagem, dois toques.', 'A segunda mensagem.']);
      const memoria = await gio.abrir(`/memorias/${id}`);
      expect(await memoria.locator('[id^="relato-"]').count()).toBe(1);
    }, 90_000);

    it('voltar no navegador depois de enviar: a página é pedida de novo (não fica guardada), vem com outro código, e a mensagem escrita ali grava', async () => {
      const [gio, eli] = [await como('giovanna'), await como('elizete', { script: false })];
      const id = (await gio.json('memorias', { titulo: `Z2 navegador: voltar ${++serie}`, ano: 2015, tipo: 'causo', pessoas: ['giovanna'] })).corpo.id as string;
      const pagina = await eli.abrir(`/memorias/${id}/relato`);
      const antes = await janela(pagina);
      await pagina.locator('textarea[data-campo]').fill('Antes de voltar.');
      await pagina.locator('form.janela button[data-botao]').click();
      await pagina.waitForLoadState('load');
      const resposta = await pagina.goBack();
      // O site manda "no-store" em toda página: o navegador não reaproveita a de antes
      expect(resposta.headers()['cache-control']).toBe('private, no-store');
      const voltou = await janela(pagina);
      expect(voltou.envio).not.toBe(antes.envio);
      await pagina.locator('textarea[data-campo]').fill('Escrita depois de voltar.');
      await pagina.locator('form.janela button[data-botao]').click();
      await pagina.waitForLoadState('load');
      expect((await janela(pagina)).mensagens).toEqual(['Antes de voltar.', 'Escrita depois de voltar.']);
    }, 90_000);
  });

  // -------------------------------------------------------------------------------------------------
  describe('ponto 5 (D1): um lote grande no banco D1 local', () => {
    it('a memória com 200 mensagens, 20 pessoas novas e temas passa inteira num pedido só', async () => {
      const gio = await como('giovanna');
      const marca = unico('Lote');
      const r = await gio.json('memorias', {
        titulo: `Z2 navegador: lote grande ${marca}`,
        ano: 2015,
        tipo: 'causo',
        situacao: 'rascunho',
        pessoas: ['giovanna', 'gui', 'elizete', 'lucas-magno', ...Array.from({ length: 20 }, (_, n) => `nova:${n}`)],
        novasPessoas: Array.from({ length: 20 }, (_, n) => ({ nome: `${marca}${'abcdefghijklmnopqrst'[n]} Grande` })),
        temas: Array.from({ length: 10 }, (_, n) => `tema ${marca} ${n}`).join(', '),
        relato: { por: 'giovanna', texto: 'x', mensagens: Array.from({ length: 200 }, (_, n) => ({ tipo: 'texto', texto: `Mensagem ${n}.` })) },
      });
      expect(r.status).toBe(201);
      const pagina = await gio.abrir(`/nova?id=${r.corpo.id}`);
      expect(await pagina.locator('[data-mensagens] li:not([data-vazio])').count()).toBe(200);
    }, 90_000);
  });

});
