// O círculo no navegador (docs/decisoes.md, "Círculo"). Tocar em alguém abre a ficha, com o slider de
// proximidade, do mais distante (à esquerda) ao mais próximo (à direita); arrastar a pessoa muda o mesmo valor, na tela grande (para perto ou longe do centro) e
// no celular (de uma faixa para outra). O slider é o caminho pelo teclado. A ponta esquerda do slider,
// ou soltar a pessoa além da borda, é "Fora do círculo": ela sai do desenho e vai para a lista do
// painel, de onde volta. Tudo é gravado em /api/circulo, que só aceita o dono.
//
// As contas (faixas, raio, ponto) são de src/lib/circulo.ts. Na tela grande o desenho é um mapa que
// anda e aproxima (mapa-que-anda.ts); no celular é uma lista, com a rolagem do aparelho.
import { FAIXAS, FORA_DO_CIRCULO, faixaDoValor, lugarNoSlider, pontoDe, posicaoDoLugar, valorDaPosicao, valorDoRaio } from '../circulo';
import { criarProximidade, refletirProximidade } from './proximidade';
import { buscaDePessoa } from './busca-pessoa';
import { areaLivreDoMapa, mapaQueAnda } from './mapa-que-anda';
import { painelDoMapa } from './painel-do-mapa';

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3;
/** Quanto o dedo espera parado antes de pegar a pessoa: antes disso, o gesto é de rolar a lista */
const TOQUE_LONGO = 350;

export function montarCirculo(raiz: HTMLElement): void {
  const mapa = raiz.querySelector<HTMLElement>('[data-mapa]')!;
  const camada = raiz.querySelector<HTMLElement>('[data-camada]')!;
  const ficha = raiz.querySelector<HTMLElement>('[data-ficha-do-circulo]')!;
  const aviso = raiz.querySelector<HTMLElement>('[data-aviso]')!;
  const quadro = raiz.querySelector<HTMLElement>('[data-quadro]');
  const barra = raiz.querySelector<HTMLElement>('.mapa__zoom');
  const zoomAtual = raiz.querySelector<HTMLElement>('[data-zoom-atual]')!;
  const listaDeFora = raiz.querySelector<HTMLElement>('[data-lista-de-fora]')!;
  const painel = painelDoMapa(raiz);
  // Os anéis só existem na tela grande: abaixo disso o círculo é uma lista de faixas
  const emAneis = matchMedia('(min-width: 62rem)');
  const pessoas = () => [...raiz.querySelectorAll<HTMLButtonElement>('.circulo__pessoa')];
  const achar = (id: string) => raiz.querySelector<HTMLButtonElement>(`.circulo__pessoa[data-pessoa="${CSS.escape(id)}"]`);
  const itemDe = (botao: HTMLElement) => botao.closest<HTMLElement>('li')!;

  // --- O mapa: andar e aproximar, só nos anéis ---
  const anda = mapaQueAnda({
    mapa,
    camadas: [camada],
    zoomMin: ZOOM_MIN,
    zoomMax: ZOOM_MAX,
    ativo: () => emAneis.matches,
    foraDoGesto: (alvo) => Boolean(alvo.closest('[data-sobre-o-mapa], .circulo__pessoa')),
    aoMudar: (vista) => (zoomAtual.textContent = `${Math.round(vista.zoom * 100)}%`),
  });
  const areaLivre = () => areaLivreDoMapa(mapa, quadro, barra);
  // O círculo inteiro, no maior tamanho que cabe ao lado do painel e acima da barra
  const verTudo = (animado = true) => {
    if (!emAneis.matches) return;
    const livre = areaLivre();
    const lado = camada.offsetWidth;
    const folga = 28;
    const zoom = Math.max(ZOOM_MIN, Math.min(1.8, (livre.w - folga * 2) / lado, (livre.h - folga * 2) / lado));
    anda.ir({ zoom, x: livre.x + (livre.w - lado * zoom) / 2, y: livre.y + (livre.h - lado * zoom) / 2 }, animado);
  };
  raiz.querySelector('[data-ver-tudo]')!.addEventListener('click', () => verTudo());
  raiz.querySelector('[data-zoom-mais]')!.addEventListener('click', () => anda.zoomEm(anda.vista.zoom * 1.25, mapa.clientWidth / 2, mapa.clientHeight / 2, true));
  raiz.querySelector('[data-zoom-menos]')!.addEventListener('click', () => anda.zoomEm(anda.vista.zoom / 1.25, mapa.clientWidth / 2, mapa.clientHeight / 2, true));
  // Ao passar de anéis para lista (ou o contrário), a vista do mapa sai ou volta
  emAneis.addEventListener('change', () => {
    if (emAneis.matches) verTudo(false);
    else camada.style.transform = '';
  });

  // --- Guardar ---
  const pendentes = new Map<string, number>();
  const avisar = (texto: string) => {
    aviso.textContent = texto;
    aviso.hidden = !texto;
  };
  // O lugar na volta vai junto com a proximidade: quem foi mexido fica onde estava na próxima visita
  const guardar = (botao: HTMLButtonElement, apagar = false) => {
    const id = botao.dataset.pessoa!;
    clearTimeout(pendentes.get(id));
    pendentes.set(
      id,
      window.setTimeout(async () => {
        pendentes.delete(id);
        const corpo = apagar ? { pessoa: id, valor: null } : { pessoa: id, valor: Number(botao.dataset.valor), angulo: Number(botao.dataset.angulo) };
        try {
          const resposta = await fetch('/api/circulo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
          if (!resposta.ok) throw new Error(String(resposta.status));
          avisar('');
        } catch {
          avisar(`Não deu para guardar o lugar de ${botao.dataset.nome}. Confira a internet e mude de novo.`);
        }
      }, 400),
    );
  };

  // --- Pôr alguém no lugar ---
  // Dentro de cada faixa, a ordem da lista é a da proximidade: no celular é o que se vê, e pelo
  // teclado é a ordem do Tab
  const encaixar = (botao: HTMLButtonElement) => {
    const item = itemDe(botao);
    const valor = Number(botao.dataset.valor);
    const faixa = faixaDoValor(valor) ?? faixaDoValor(Number(botao.dataset.padrao)) ?? FAIXAS[2]!;
    const lista = raiz.querySelector<HTMLElement>(`.circulo__faixa[data-faixa="${faixa.id}"] ul`)!;
    const depois = [...lista.querySelectorAll<HTMLButtonElement>('.circulo__pessoa')].find((outro) => outro !== botao && Number(outro.dataset.valor) > valor);
    const tinhaFoco = document.activeElement === botao;
    if (depois) lista.insertBefore(item, itemDe(depois));
    else lista.append(item);
    if (tinhaFoco) botao.focus({ preventScroll: true });
  };
  const listarFora = () => {
    const fora = pessoas().filter((b) => Number(b.dataset.valor) >= FORA_DO_CIRCULO).sort((a, b) => a.dataset.nome!.localeCompare(b.dataset.nome!, 'pt-BR'));
    listaDeFora.replaceChildren(
      ...fora.map((b) => {
        const linha = document.createElement('li');
        const volta = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Trazer de volta' });
        volta.dataset.voltar = b.dataset.pessoa;
        volta.setAttribute('aria-label', `Trazer ${b.dataset.nome} de volta`);
        linha.append(Object.assign(document.createElement('span'), { textContent: b.dataset.nome }), volta);
        return linha;
      }),
    );
    raiz.querySelector<HTMLElement>('[data-quantos-fora]')!.textContent = fora.length ? String(fora.length) : '';
    raiz.querySelector<HTMLElement>('[data-ninguem-fora]')!.hidden = fora.length > 0;
  };
  /** Muda a proximidade de alguém (e o lugar na volta, quando vem do arrasto) e redesenha. */
  const por = (botao: HTMLButtonElement, valor: number, angulo?: number) => {
    const item = itemDe(botao);
    const estavaFora = item.hasAttribute('data-fora');
    botao.dataset.valor = String(valor);
    if (angulo !== undefined) botao.dataset.angulo = String(Math.round(angulo * 10) / 10);
    const { x, y } = pontoDe(valor, Number(botao.dataset.angulo));
    item.style.setProperty('--x', String(x));
    item.style.setProperty('--y', String(y));
    item.toggleAttribute('data-fora', valor >= FORA_DO_CIRCULO);
    encaixar(botao);
    if (estavaFora !== valor >= FORA_DO_CIRCULO) listarFora();
    if (aberta === botao) refletirNaFicha();
  };

  // --- A ficha: quem é, "Ver a página" e o slider ---
  let aberta: HTMLButtonElement | null = null;
  const refletirNaFicha = () => {
    const slider = ficha.querySelector<HTMLInputElement>('input');
    if (!slider || !aberta) return;
    const valor = Number(aberta.dataset.valor);
    // O slider vai do mais distante, à esquerda, ao mais próximo, à direita: o lugar é o contrário do valor
    if (posicaoDoLugar(Number(slider.value)) !== posicaoDoLugar(lugarNoSlider(valor, true))) slider.value = String(lugarNoSlider(valor, true));
    refletirProximidade(ficha.querySelector<HTMLElement>('[data-proximidade]')!);
  };
  const fecharFicha = () => {
    if (!aberta) return;
    const volta = ficha.contains(document.activeElement) ? aberta : null;
    aberta.removeAttribute('aria-pressed');
    aberta = null;
    ficha.replaceChildren();
    // Quem estava fora do círculo não tem para onde o foco voltar no desenho
    if (volta && volta.offsetParent) volta.focus({ preventScroll: true });
    else if (volta) mapa.focus({ preventScroll: true });
  };
  const abrirFicha = (botao: HTMLButtonElement, focoNoSlider = false) => {
    aberta?.removeAttribute('aria-pressed');
    aberta = botao;
    botao.setAttribute('aria-pressed', 'true');
    // O retrato da ficha é uma cópia do retrato do círculo, que é a peça do sistema
    const retrato = botao.querySelector('.retrato')!.cloneNode(true);
    const nome = Object.assign(document.createElement('strong'), { textContent: botao.dataset.nome });
    const quem = Object.assign(document.createElement('span'), { className: 'mapa__foco-quem' });
    quem.append(Object.assign(document.createElement('span'), { textContent: botao.dataset.laco }));
    if (botao.querySelector('.so-leitor')) quem.append(Object.assign(document.createElement('i'), { className: 'so-leitor', textContent: ', já faleceu' }));
    const pagina = Object.assign(document.createElement('a'), { href: `/pessoas/${botao.dataset.pessoa}`, textContent: 'Ver a página' });
    const fechar = Object.assign(document.createElement('button'), { type: 'button', textContent: '×', className: 'mapa__foco-fechar' });
    fechar.dataset.fecharFicha = '';
    fechar.setAttribute('aria-label', 'Fechar');
    // O slider é a peça Proximidade (src/components/visual/Proximidade.astro), montada aqui
    const { bloco, slider } = criarProximidade('proximidade-da-ficha', Number(botao.dataset.valor));
    const campo = Object.assign(document.createElement('div'), { className: 'pm__proximidade' });
    campo.append(bloco);
    const acoes = Object.assign(document.createElement('div'), { className: 'pm__ficha-acoes' });
    acoes.append(pagina);
    ficha.replaceChildren(retrato, nome, quem, acoes, campo, fechar);
    refletirNaFicha();
    slider.addEventListener('input', () => {
      por(botao, valorDaPosicao(posicaoDoLugar(Number(slider.value))));
      guardar(botao);
    });
    if (focoNoSlider) slider.focus({ preventScroll: true });
  };

  // --- Tocar ---
  let fimDoArrastoDaPessoa = 0;
  raiz.addEventListener('click', (e) => {
    const alvo = e.target as HTMLElement;
    if (alvo.closest('[data-fechar-ficha]')) return fecharFicha();
    const volta = alvo.closest<HTMLButtonElement>('[data-voltar]');
    if (volta) {
      // De volta ao lugar que o parentesco ou o laço dão: a proximidade declarada sai
      const botao = achar(volta.dataset.voltar!);
      if (!botao) return;
      por(botao, Number(botao.dataset.padrao), Number(botao.dataset.anguloPadrao));
      guardar(botao, true);
      // A linha saiu da lista: o foco vai para a próxima, ou para o título da seção
      (listaDeFora.querySelector<HTMLElement>('button') ?? raiz.querySelector<HTMLElement>('[data-fora-do-circulo] summary'))?.focus();
      return;
    }
    const botao = alvo.closest<HTMLButtonElement>('.circulo__pessoa');
    if (!botao) {
      // Tocar no vazio fecha a ficha. O clique que encerra um arrasto do mapa não conta.
      if (!alvo.closest('[data-sobre-o-mapa]') && !anda.acabouDeArrastar()) fecharFicha();
      return;
    }
    if (Date.now() - fimDoArrastoDaPessoa < 300) return;
    if (botao === aberta) return fecharFicha();
    // Pelo teclado, o foco vai direto para o slider, que é o caminho dele
    abrirFicha(botao, botao.matches(':focus-visible'));
  });
  raiz.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented || !aberta) return;
    if ((e.target as HTMLElement).closest('.pm__corpo')) return;
    e.preventDefault();
    const botao = aberta;
    fecharFicha();
    if (botao.offsetParent) botao.focus({ preventScroll: true });
  });

  // --- Arrastar uma pessoa ---
  // Com o mouse, o arrasto começa ao andar um pouco. Com o dedo, depois de um toque longo: antes
  // disso o gesto é de rolar (no celular) ou de andar pelo mapa não começa numa pessoa.
  let arrasto: { botao: HTMLButtonElement; x: number; y: number; andou: boolean; valor: number; angulo: number } | undefined;
  const comecar = (botao: HTMLButtonElement, x: number, y: number) => {
    arrasto = { botao, x, y, andou: false, valor: Number(botao.dataset.valor), angulo: Number(botao.dataset.angulo) };
  };
  const mexer = (x: number, y: number) => {
    if (!arrasto) return;
    if (!arrasto.andou && Math.hypot(x - arrasto.x, y - arrasto.y) < 6) return;
    arrasto.andou = true;
    const item = itemDe(arrasto.botao);
    item.setAttribute('data-arrastando', '');
    if (emAneis.matches) {
      // O ponto do ponteiro no círculo, em porcentagem do diâmetro, a partir do centro
      const caixa = camada.getBoundingClientRect();
      const px = ((x - caixa.left) / caixa.width - 0.5) * 100;
      const py = ((y - caixa.top) / caixa.height - 0.5) * 100;
      arrasto.valor = valorDoRaio(Math.hypot(px, py));
      arrasto.angulo = (Math.atan2(py, px) * 180) / Math.PI;
      item.style.setProperty('--x', px.toFixed(2));
      item.style.setProperty('--y', py.toFixed(2));
      item.toggleAttribute('data-saindo', arrasto.valor >= FORA_DO_CIRCULO);
    } else {
      // No celular a pessoa acompanha o dedo, e a faixa embaixo dele é para onde ela vai
      item.style.translate = `${x - arrasto.x}px ${y - arrasto.y}px`;
      item.style.pointerEvents = 'none';
      const faixa = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('.circulo__faixa');
      for (const f of raiz.querySelectorAll('.circulo__faixa')) f.toggleAttribute('data-alvo', f === faixa);
      if (faixa) {
        const dados = FAIXAS.find((f) => String(f.id) === faixa.dataset.faixa)!;
        const caixa = faixa.getBoundingClientRect();
        // Mais para cima na faixa é mais perto; mais para baixo, mais longe
        const parte = Math.min(Math.max((y - caixa.top) / caixa.height, 0), 1);
        arrasto.valor = Math.round(dados.de + parte * (Math.min(dados.ate, FORA_DO_CIRCULO) - 1 - dados.de));
      }
    }
  };
  const soltar = (cancelado = false) => {
    if (!arrasto) return;
    const { botao, andou, valor, angulo } = arrasto;
    arrasto = undefined;
    const item = itemDe(botao);
    item.removeAttribute('data-arrastando');
    item.removeAttribute('data-saindo');
    item.style.translate = '';
    item.style.pointerEvents = '';
    for (const f of raiz.querySelectorAll('.circulo__faixa')) f.removeAttribute('data-alvo');
    if (!andou) return;
    fimDoArrastoDaPessoa = Date.now();
    if (cancelado) return por(botao, Number(botao.dataset.valor));
    if (emAneis.matches && valor < FORA_DO_CIRCULO) por(botao, valor, angulo);
    else por(botao, valor);
    guardar(botao);
  };
  // Mouse e caneta
  camada.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' || e.button !== 0) return;
    const botao = (e.target as HTMLElement).closest<HTMLButtonElement>('.circulo__pessoa');
    if (botao) comecar(botao, e.clientX, e.clientY);
  });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'touch') mexer(e.clientX, e.clientY);
  });
  window.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'touch') soltar();
  });
  window.addEventListener('pointercancel', (e) => {
    if (e.pointerType !== 'touch') soltar(true);
  });
  camada.addEventListener('dragstart', (e) => e.preventDefault());
  // Dedo: toque longo pega a pessoa. Enquanto ela está na mão, a página não rola.
  let espera = 0;
  camada.addEventListener(
    'touchstart',
    (e) => {
      const botao = (e.target as HTMLElement).closest<HTMLButtonElement>('.circulo__pessoa');
      const dedo = e.touches[0];
      if (!botao || !dedo || e.touches.length > 1) return;
      const { clientX, clientY } = dedo;
      clearTimeout(espera);
      espera = window.setTimeout(() => {
        comecar(botao, clientX, clientY);
        // Já na mão, mesmo antes de andar: a pessoa sobe do papel para avisar
        arrasto!.andou = true;
        itemDe(botao).setAttribute('data-arrastando', '');
      }, TOQUE_LONGO);
    },
    { passive: true },
  );
  camada.addEventListener(
    'touchmove',
    (e) => {
      const dedo = e.touches[0];
      if (!arrasto || !dedo) return clearTimeout(espera);
      e.preventDefault();
      mexer(dedo.clientX, dedo.clientY);
    },
    { passive: false },
  );
  camada.addEventListener('touchend', () => {
    clearTimeout(espera);
    soltar();
  });
  camada.addEventListener('touchcancel', () => {
    clearTimeout(espera);
    soltar(true);
  });
  // O toque longo não abre o menu do navegador em cima do retrato
  camada.addEventListener('contextmenu', (e) => {
    if ((e.target as HTMLElement).closest('.circulo__pessoa')) e.preventDefault();
  });

  // --- Teclado: o mapa anda até quem recebeu o foco, sem ficar atrás do painel nem da barra ---
  camada.addEventListener('focusin', (e) => {
    const alvo = e.target as HTMLElement;
    if (!emAneis.matches || !alvo.matches('.circulo__pessoa:focus-visible')) return;
    const livre = areaLivre();
    const m = mapa.getBoundingClientRect();
    const r = alvo.getBoundingClientRect();
    const ajuste = (inicio: number, tamanho: number, de: number, ate: number) => (inicio < de ? de - inicio : inicio + tamanho > ate ? ate - (inicio + tamanho) : 0);
    const dx = ajuste(r.left - m.left, r.width, livre.x + 16, livre.x + livre.w - 16);
    const dy = ajuste(r.top - m.top, r.height, livre.y + 16, livre.y + livre.h - 16);
    if (dx || dy) anda.mover(dx, dy, true);
  });

  // --- "Procurar no círculo": abre a ficha de quem foi escolhido ---
  const quem = raiz.querySelector<HTMLSelectElement>('select[name="quem"]');
  if (quem) {
    buscaDePessoa(quem);
    quem.addEventListener('change', () => {
      const botao = quem.value ? achar(quem.value) : null;
      quem.value = '';
      quem.dispatchEvent(new Event('busca:atualizar'));
      if (!botao) return;
      painel.fechar();
      abrirFicha(botao, true);
    });
    quem.form?.addEventListener('submit', (e) => e.preventDefault());
  }

  verTudo(false);
  // Os retratos só passam a deslizar depois do primeiro desenho
  requestAnimationFrame(() => camada.classList.add('mapa__camada--viva'));
}
