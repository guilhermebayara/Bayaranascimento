// A árvore interativa. Funciona como um mapa: arrasta, aproxima, afasta, e se
// reorganiza com animação quando o foco ou os filtros mudam, sem recarregar a página.
import { MEDIDAS, TARJA_DO_DISCRETO, cantoReto, arredondado, desenharArvore, type Desenho } from '../arvore-desenho';
import { enderecoDoLaco } from '../pagina-do-laco';
import { comLacoDeArvore, montarDesenho, type DadosDaArvore, type Estado } from '../arvore-montagem';
import { areaLivreDoMapa, mapaQueAnda } from './mapa-que-anda';

export type { DadosDaArvore };

const SVG = 'http://www.w3.org/2000/svg';
const CHAVES = ['consideracao', 'ex', 'bichos', 'outros'] as const;
const ZOOM_MIN = 0.25;
// O zoom vai até 400% (resposta do Gui, 17/11/2026, P94): ajuda quem enxerga pouco, e com o desenho
// refeito na escala nova o texto continua nítido.
const ZOOM_MAX = 4;

/** O que a página pode pedir ao mapa depois de montado */
export interface ControleDaArvore {
  /** Leva o mapa até a pessoa e abre a ficha dela, sem trocar a linha direta. */
  irPara(id: string): void;
}

/** O que a página sabe além dos dados da montagem */
export interface ExtrasDaArvore {
  /** quem já faleceu: o cartão e o retrato da ficha levam a marca */
  falecidos?: string[];
}

export function montarArvore(raiz: HTMLElement, dados: DadosDaArvore, alem: ExtrasDaArvore = {}): ControleDaArvore {
  const falecidos = new Set(alem.falecidos ?? []);
  // A marca de quem já faleceu no cartão: a orelha dobrada no canto, e o aviso para o leitor de tela
  const marcarFalecido = (no: HTMLElement, id: string) => {
    no.classList.toggle('no--falecido', falecidos.has(id));
    if (falecidos.has(id) && !no.querySelector('.so-leitor')) no.append(Object.assign(document.createElement('small'), { className: 'so-leitor', textContent: 'já faleceu' }));
  };
  const mapa = raiz.querySelector<HTMLElement>('[data-mapa]')!;
  const camada = raiz.querySelector<HTMLElement>('[data-camada]')!;
  // Os cartões dos ramos abertos ficam numa camada à parte, que anda junto com a árvore e fica acima da legenda
  const camadaDosRamos = raiz.querySelector<HTMLElement>('[data-camada-ramos]')!;
  const camadas = [camada, camadaDosRamos];
  const ficha = raiz.querySelector<HTMLElement>('[data-ficha-do-foco]')!;
  const soltos = raiz.querySelector<HTMLElement>('[data-sem-lacos]')!;
  const controles = raiz.querySelector<HTMLFormElement>('[data-controles]')!;
  const zoomAtual = raiz.querySelector<HTMLElement>('[data-zoom-atual]')!;
  const irAoFoco = raiz.querySelector<HTMLElement>('[data-ir-ao-foco]')!;
  const pessoa = new Map(dados.pessoas.map((p) => [p.id, p]));
  // Só dá para partir de quem tem laço de árvore: de quem não tem, a árvore seria só a pessoa
  const partivel = comLacoDeArvore(dados);

  // Para que lado cada pessoa puxa: o primeiro núcleo à esquerda, o último à direita,
  // e quem é de dois núcleos fica entre eles
  const idsDosNucleos = dados.nucleos.map((n) => n.id);
  const indicesDosNucleos = (nucleos: string[]) => nucleos.map((n) => idsDosNucleos.indexOf(n)).filter((i) => i >= 0).sort((a, b) => a - b);
  // A cor de cada lado da família. Quem é de dois núcleos fica com as duas cores, dividida na diagonal.
  const fundoDe = (nucleos: string[]) => {
    const cores = indicesDosNucleos(nucleos).map((i) => `var(--arvore-familia-${i % 4})`);
    if (cores.length === 0) return '';
    if (cores.length === 1) return cores[0];
    const fatia = 100 / cores.length;
    return `linear-gradient(135deg, ${cores.map((c, i) => `${c} ${i * fatia}% ${(i + 1) * fatia}%`).join(', ')})`;
  };
  // O canto reto do cartão aponta para o lado da família de origem (cantoReto, em arvore-desenho.ts)
  const marcarCanto = (no: HTMLElement, nucleos: string[]) => {
    const canto = cantoReto(indicesDosNucleos(nucleos), idsDosNucleos.length);
    no.classList.toggle('no--canto-direita', canto === 'direita');
    no.classList.toggle('no--sem-canto', canto === null);
  };
  const ladoDe = new Map<string, number>();
  for (const p of dados.pessoas) {
    const indices = indicesDosNucleos(p.nucleos);
    if (indices.length && dados.nucleos.length > 1) ladoDe.set(p.id, indices.reduce((s, i) => s + i, 0) / indices.length / (dados.nucleos.length - 1));
  }

  const url = new URL(location.href);
  const ligada = (nome: string) => url.searchParams.get(nome) !== '0';
  const estado: Estado = {
    // Um ex discreto não recebe o foco: o cartão dele não abre nada
    foco: pessoa.has(url.searchParams.get('foco') ?? '') && !pessoa.get(url.searchParams.get('foco')!)?.discreto ? url.searchParams.get('foco')! : dados.eu,
    centro: partivel.has(url.searchParams.get('centro') ?? '') ? url.searchParams.get('centro')! : '',
    ramos: new Set((url.searchParams.get('ramos') ?? '').split(',').filter(Boolean)),
    nucleo: idsDosNucleos.includes(url.searchParams.get('nucleo') ?? '') ? url.searchParams.get('nucleo')! : '',
    consideracao: ligada('consideracao'),
    ex: ligada('ex'),
    bichos: ligada('bichos'),
    outros: ligada('outros'),
    amigos: url.searchParams.get('amigos') === '1',
    abertos: new Set(url.searchParams.has('coracao') ? url.searchParams.get('coracao')!.split(',').filter((id) => pessoa.has(id)) : [dados.eu]),
  };
  let desenho: Desenho | undefined;
  const nos = new Map<string, HTMLAnchorElement>();
  const botoesDoCoracao = new Map<string, HTMLButtonElement>();
  // Marcas dos ramos recolhidos e os cartões dos ramos abertos, refeitos a cada desenho
  const extras: HTMLElement[] = [];
  // Os ramos recolhidos do último desenho, para a busca saber em qual deles alguém está
  let ramosDeAgora: { chave: string; membros: string[] }[] = [];
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'mapa__linhas');
  svg.setAttribute('aria-hidden', 'true');
  camada.append(svg);

  const campo = <T extends HTMLElement>(nome: string) => controles.elements.namedItem(nome) as unknown as T;
  const refletirNosControles = () => {
    campo<HTMLSelectElement>('centro').value = estado.centro;
    campo<HTMLSelectElement>('centro').dispatchEvent(new Event('busca:atualizar'));
    campo<HTMLSelectElement>('nucleo').value = estado.nucleo;
    for (const nome of CHAVES) campo<HTMLInputElement>(nome).checked = estado[nome];
    campo<HTMLInputElement>('amigos').checked = Boolean(estado.amigos);
    // "Outros núcleos" só faz sentido com um núcleo em destaque. E nenhum filtro pode esconder de quem
    // a árvore parte: com um centro de fora do núcleo, "Outros núcleos" fica ligado; com um bicho, "Bichos".
    const doCentro = pessoa.get(estado.centro);
    const prender = (nome: 'outros' | 'bichos', desligado: boolean, motivo: string) => {
      const caixa = campo<HTMLInputElement>(nome);
      caixa.disabled = desligado;
      caixa.closest('label')?.toggleAttribute('data-desligado', desligado);
      caixa.closest('label')!.title = motivo;
    };
    const foraDoNucleo = Boolean(doCentro && estado.nucleo && !doCentro.nucleos.includes(estado.nucleo));
    prender('outros', !estado.nucleo || foraDoNucleo, foraDoNucleo ? `A árvore parte de ${doCentro!.nome}, que é de outra família` : '');
    prender('bichos', Boolean(doCentro?.bicho), doCentro?.bicho ? `A árvore parte de ${doCentro.nome}` : '');
  };
  // Nenhum filtro esconde de quem a árvore parte: um bicho liga "Bichos", alguém de fora do núcleo liga "Outros núcleos"
  const protegerCentro = () => {
    const doCentro = pessoa.get(estado.centro);
    if (doCentro?.bicho) estado.bichos = true;
    if (doCentro && estado.nucleo && !doCentro.nucleos.includes(estado.nucleo)) estado.outros = true;
  };
  const guardarNoEndereco = () => {
    const q = new URLSearchParams();
    if (estado.foco !== dados.eu) q.set('foco', estado.foco);
    if (estado.centro) q.set('centro', estado.centro);
    if (estado.ramos.size) q.set('ramos', [...estado.ramos].sort().join(','));
    if (estado.nucleo) q.set('nucleo', estado.nucleo);
    for (const nome of CHAVES) if (!estado[nome]) q.set(nome, '0');
    if (estado.amigos) q.set('amigos', '1');
    const abertos = [...estado.abertos].sort();
    if (abertos.join() !== dados.eu) q.set('coracao', abertos.join(','));
    history.replaceState(null, '', q.size ? `?${q}` : location.pathname);
  };

  // --- O mapa: mover e aproximar ---
  // Arrastar, a pinça, a roda, as setas e a nitidez no zoom moram em src/lib/cliente/mapa-que-anda.ts,
  // o mesmo módulo do círculo (resposta do Gui aos PRs #53 a #62, 17/11/2026). Na árvore, as setas e
  // o + e − andam o mapa com o foco em qualquer lugar dele, inclusive num cartão.
  const anda = mapaQueAnda({
    mapa,
    camadas,
    zoomMin: ZOOM_MIN,
    zoomMax: ZOOM_MAX,
    foraDoGesto: (alvo) => Boolean(alvo.closest('[data-sobre-o-mapa]')),
    tecladoAnda: (alvo) => !alvo.closest('[data-sobre-o-mapa]'),
    aoMudar: (v) => (zoomAtual.textContent = `${Math.round(v.zoom * 100)}%`),
  });
  // Onde o mapa está: deslocamento e zoom. As contas abaixo mudam a vista e chamam aplicarVista.
  const vista = anda.vista;
  const aplicarVista = (animado = false) => anda.aplicar(animado);
  const zoomEm = anda.zoomEm;
  const centralizar = (id: string, animado = true) => {
    const no = desenho?.pessoas.find((p) => p.id === id);
    if (!no) return;  // quem está num ramo aberto já está à vista
    const livre = areaLivre();
    vista.x = livre.x + livre.w / 2 - (no.x + MEDIDAS.largura / 2) * vista.zoom;
    vista.y = livre.y + livre.h / 2 - (no.y + MEDIDAS.altura / 2) * vista.zoom;
    aplicarVista(animado);
  };
  // Depois de abrir um ramo, o mapa anda o mínimo para o cartão e a origem dele caberem na tela
  const mostrarCartao = (chave: string) => {
    const cartao = camadaDosRamos.querySelector<HTMLElement>(`[data-ramo-aberto="${CSS.escape(chave)}"]`);
    const marca = camada.querySelector<HTMLElement>(`button.no__ramo[data-ramo="${CSS.escape(chave)}"]`);
    if (!cartao || !marca) return;
    const posicao = (el: HTMLElement) => el.style.transform.match(/-?[\d.]+/g)!.map(Number);
    const [cx, cy] = posicao(cartao);
    const [, my] = posicao(marca);
    // Da linha dos avós (um pouco acima da marca) até o pé do cartão, com uma margem
    const topo = my - MEDIDAS.altura - 40;
    const caixa = { x: cx - 24, y: topo, w: cartao.offsetWidth + 48, h: cy + cartao.offsetHeight + 24 - topo };
    const z = vista.zoom;
    // O cartão cabe no que sobra ao lado do painel e acima da barra de baixo
    const livre = areaLivre();
    const ajuste = (inicio: number, tamanho: number, de: number, ate: number, atual: number) => {
      const a = atual + inicio * z;
      const b = a + tamanho * z;
      if (tamanho * z > ate - de || a < de) return atual + de - a;
      if (b > ate) return atual - (b - ate);
      return atual;
    };
    vista.x = ajuste(caixa.x, caixa.w, livre.x, livre.x + livre.w, vista.x);
    vista.y = ajuste(caixa.y, caixa.h, livre.y, livre.y + livre.h, vista.y);
    aplicarVista(true);
  };
  // O quadro do mapa (docs/decisoes.md, "A página como mapa", em "Árvore"): o painel pousado sobre o mapa
  // ocupa um lado dele (tela grande) ou uma faixa no alto (celular), e a árvore é enquadrada no que
  // sobra, acima da barra de baixo.
  const quadro = raiz.querySelector<HTMLElement>('[data-quadro]');
  const barraDeBaixo = raiz.querySelector<HTMLElement>('.mapa__zoom');
  const areaLivre = () => areaLivreDoMapa(mapa, quadro, barraDeBaixo);
  const verTudo = (animado = true) => {
    if (!desenho) return;
    const livre = areaLivre();
    const folga = 24;
    vista.zoom = Math.max(ZOOM_MIN, Math.min(1.1, (livre.w - folga * 2) / desenho.largura, (livre.h - folga * 2) / desenho.altura));
    vista.x = livre.x + (livre.w - desenho.largura * vista.zoom) / 2;
    vista.y = livre.y + (livre.h - desenho.altura * vista.zoom) / 2;
    aplicarVista(animado);
  };
  // No quadro, a altura da tela guia o enquadramento da chegada: a árvore cabe de cima a baixo, num
  // tamanho que dá para ler, e, se não couber de lado, fica à vista o trecho de quem está em foco
  const enquadrarPelaAltura = () => {
    if (!desenho) return;
    const livre = areaLivre();
    const folga = 24;
    vista.zoom = Math.max(0.6, Math.min(1.1, (livre.h - folga * 2) / desenho.altura));
    const largura = desenho.largura * vista.zoom;
    const no = desenho.pessoas.find((p) => p.id === estado.foco);
    if (largura <= livre.w - folga * 2 || !no) vista.x = livre.x + (livre.w - largura) / 2;
    else {
      const noCentro = livre.x + livre.w / 2 - (no.x + MEDIDAS.largura / 2) * vista.zoom;
      vista.x = Math.max(livre.x + livre.w - folga - largura, Math.min(livre.x + folga, noCentro));
    }
    const altura = desenho.altura * vista.zoom;
    vista.y = altura <= livre.h - folga * 2 ? livre.y + (livre.h - altura) / 2 : livre.y + folga;
    aplicarVista(false);
  };

  // A ficha (respostas do Gui, 17/11/2026, P84, P86, P91, P95 e P97). A árvore abre sem ela: aparece
  // ao tocar em alguém e fecha no "×", no Esc ou no toque no vazio. O anel de quem está em foco fica.
  let fichaAberta = false;
  const mostrarFicha = () => {
    const p = pessoa.get(estado.foco);
    if (!p) return;
    // O botão da barra de baixo diz para quem a árvore volta
    irAoFoco.textContent = `Voltar para ${p.nome}`;
    if (!fichaAberta) return ficha.replaceChildren();
    const nome = document.createElement('strong');
    nome.textContent = p.nome;
    // O parentesco e os anos são duas informações, separadas pelo ponto do carimbo
    const quem = document.createElement('span');
    quem.className = 'mapa__foco-quem';
    quem.append(...[p.rotulo, p.anos].filter(Boolean).map((texto) => Object.assign(document.createElement('span'), { textContent: texto })));
    // Quem já faleceu: o retrato fica em tom suave, e o leitor de tela ouve (a ficha não escreve "em memória")
    if (falecidos.has(p.id)) quem.append(Object.assign(document.createElement('i'), { textContent: ', já faleceu', className: 'so-leitor' }));
    const pagina = Object.assign(document.createElement('a'), { href: `/pessoas/${p.id}`, textContent: 'Ver a página' });
    const partir = Object.assign(document.createElement('button'), { type: 'button', textContent: `Ver a árvore de ${p.nome}` });
    partir.dataset.partir = p.id;
    partir.hidden = estado.centro === p.id || !partivel.has(p.id);
    const fechar = Object.assign(document.createElement('button'), { type: 'button', textContent: '×', className: 'mapa__foco-fechar' });
    fechar.dataset.fecharFicha = '';
    fechar.setAttribute('aria-label', 'Fechar');
    // O retrato aparece só aqui, na ficha. Sem retrato, as iniciais sobre a cor da família.
    const retrato = document.createElement('span');
    retrato.className = falecidos.has(p.id) ? 'retrato retrato--falecido' : 'retrato';
    retrato.style.setProperty('--retrato-cor', fundoDe(p.nucleos) || 'var(--arvore-de-fora)');
    if (p.retrato) retrato.append(Object.assign(new Image(), { src: p.retrato, alt: '' }));
    else retrato.append(Object.assign(document.createElement('span'), { textContent: p.iniciais ?? '' }));
    retrato.firstElementChild!.setAttribute('aria-hidden', 'true');
    // O retrato de quem faleceu acende com o foco, em qualquer lugar: na ficha ele fica fora de link,
    // então acende quando "Ver a página" recebe o foco
    if (falecidos.has(p.id)) {
      pagina.addEventListener('focus', () => retrato.classList.toggle('retrato--aceso', pagina.matches(':focus-visible')));
      pagina.addEventListener('blur', () => retrato.classList.remove('retrato--aceso'));
    }
    // "Ver o laço" (onda 2): a página do laço entre quem olha e a pessoa tocada
    const doLaco = p.id !== dados.eu && pessoa.has(dados.eu) ? [Object.assign(document.createElement('a'), { href: enderecoDoLaco(dados.eu, p.id), textContent: 'Ver o laço' })] : [];
    // As ações ficam numa linha só, que quebra quando falta espaço: com "Ver o laço", eram três links na
    // mesma célula da grade, um em cima do outro (observação do Gui de 18/11/2026)
    const acoes = Object.assign(document.createElement('div'), { className: 'pm__ficha-acoes' });
    // "Como você chama" (só seu, decisão do Gui de 18/11/2026): leva à pergunta, na página da pessoa
    const comoChama = p.id !== dados.eu ? [Object.assign(document.createElement('a'), { href: `/pessoas/${p.id}#como-voce-chama`, textContent: 'Como você chama' })] : [];
    acoes.append(pagina, ...doLaco, ...comoChama, partir);
    ficha.replaceChildren(retrato, nome, quem, acoes, fechar);
  };
  const fecharFicha = () => {
    if (!fichaAberta) return;
    // Se o foco do teclado estava na ficha, ele volta para o cartão da pessoa
    const estavaNaFicha = ficha.contains(document.activeElement);
    fichaAberta = false;
    mostrarFicha();
    if (estavaNaFicha) (raiz.querySelector<HTMLElement>(`a.no[data-id="${CSS.escape(estado.foco)}"]`) ?? mapa).focus({ preventScroll: true });
  };

  // Bichos: a espécie aparece no cartão, para um bicho não se confundir com uma criança (marca provisória)
  const marcaDeBicho = (especie?: string | null) => Object.assign(document.createElement('small'), { className: 'no__bicho', textContent: especie || 'bichinho' });

  // Um ex que quem olha deixou discreto: o cartão continua no lugar, com a tarja sobre o nome, e não
  // abre nada (não é link, não recebe o foco nem o toque). O caminho até os parentes dele continua.
  const cartaoVazio = (p: { id: string; discreto?: boolean }) => {
    if (!p.discreto) {
      const a = document.createElement('a');
      a.href = `/pessoas/${p.id}`;
      return a;
    }
    const div = document.createElement('div');
    div.setAttribute('role', 'img');
    div.setAttribute('aria-label', TARJA_DO_DISCRETO.leitor);
    return div;
  };
  const tarja = () => Object.assign(document.createElement('span'), { className: 'no__tarja', textContent: TARJA_DO_DISCRETO.texto, ariaHidden: 'true' });

  // Uma caixa de pessoa para os ramos abertos (as da árvore principal são guardadas e reaproveitadas)
  const criarNo = (id: string, x: number, y: number) => {
    const p = pessoa.get(id)!;
    const no = cartaoVazio(p);
    no.dataset.id = p.id;
    no.className = 'no';
    no.classList.toggle('no--foco', p.id === estado.foco);
    no.classList.toggle('no--de-fora', p.nucleos.length === 0);
    marcarCanto(no, p.nucleos);
    marcarFalecido(no, p.id);
    no.style.width = `${MEDIDAS.largura}px`;
    no.style.height = `${MEDIDAS.altura}px`;
    no.style.background = fundoDe(p.nucleos);
    no.style.transform = `translate(${x}px, ${y}px)`;
    const nome = document.createElement('strong');
    nome.textContent = p.nome;
    const quem = document.createElement('span');
    quem.textContent = p.rotulo || (p.bicho ? 'bichinho da família' : '');
    no.append(nome, quem);
    if (p.bicho) no.append(marcaDeBicho(p.especie));
    if (p.discreto) no.append(tarja());
    no.classList.toggle('no--bicho', p.bicho);
    no.classList.toggle('no--discreto', Boolean(p.discreto));
    return no;
  };

  const desenhar = () => {
    // 1 e 2. Quem aparece, em que geração, e o desenho (em src/lib/arvore-montagem.ts)
    const { desenho: novo, principal, coracao, lacosDe, ramos, abertos, filiacoesVisiveis, casaisVisiveis, geracoes, agregados, noNucleo, visiveis } = montarDesenho(dados, estado, ladoDe);
    ramosDeAgora = ramos;
    desenho = novo;

    // 3. Linhas: redesenhadas a cada vez, surgindo aos poucos
    svg.setAttribute('width', String(desenho.largura));
    svg.setAttribute('height', String(desenho.altura));
    svg.replaceChildren(
      ...desenho.linhas.map((linha) => {
        const caminho = document.createElementNS(SVG, 'path');
        caminho.setAttribute('d', linha.d);
        const classes = ['linha', `linha--${linha.tipo}`];
        if (estado.nucleo && !linha.de.every(noNucleo)) classes.push('linha--apagada');
        if (linha.de.includes(estado.foco)) classes.push('linha--foco');
        caminho.setAttribute('class', classes.join(' '));
        caminho.dataset.de = linha.de.join(' ');
        return caminho;
      }),
    );

    // 4. Pessoas: cada caixa continua a mesma entre um desenho e outro, e desliza até o novo lugar
    // O rótulo vem do laço de quem olha quando ele existe: "sua vó de consideração", e não o da Elizete
    const rotuloDoCoracao = new Map([...agregados].sort((a, b) => Number(a.dono === dados.eu) - Number(b.dono === dados.eu)).map((l) => [l.pessoa, l.rotulo]));
    const presentes = new Set<string>();
    for (const lugar of desenho.pessoas) {
      const p = pessoa.get(lugar.id)!;
      presentes.add(p.id);
      let no = nos.get(p.id);
      if (!no) {
        no = cartaoVazio(p) as HTMLAnchorElement;
        no.dataset.id = p.id;
        no.style.width = `${MEDIDAS.largura}px`;
        no.style.height = `${MEDIDAS.altura}px`;
        no.append(document.createElement('strong'), document.createElement('span'));
        no.firstElementChild!.textContent = p.nome;
        if (p.bicho) no.append(marcaDeBicho(p.especie));
        if (p.discreto) no.append(tarja());
        nos.set(p.id, no);
        camada.append(no);
      }
      no.querySelector('span')!.textContent = p.rotulo || rotuloDoCoracao.get(p.id) || (p.bicho ? 'bichinho da família' : '');
      no.className = 'no';
      no.classList.toggle('no--bicho', p.bicho);
      no.classList.toggle('no--discreto', Boolean(p.discreto));
      no.classList.toggle('no--eu', p.id === dados.eu);
      no.classList.toggle('no--foco', p.id === estado.foco);
      no.classList.toggle('no--apagado', Boolean(estado.nucleo) && !noNucleo(p.id));
      no.classList.toggle('no--de-fora', p.nucleos.length === 0);
      marcarCanto(no, p.nucleos);
      marcarFalecido(no, p.id);
      no.style.background = fundoDe(p.nucleos);
      no.style.transform = `translate(${lugar.x}px, ${lugar.y}px)`;
    }
    for (const [id, no] of nos) {
      if (presentes.has(id)) continue;
      no.remove();
      nos.delete(id);
    }

    // 4b. Em quem tem laços do coração, um botão para abrir e fechar
    const comBotao = new Set<string>();
    for (const lugar of desenho.pessoas) {
      const quantos = lacosDe.get(lugar.id);
      if (!quantos) continue;
      comBotao.add(lugar.id);
      let botao = botoesDoCoracao.get(lugar.id);
      if (!botao) {
        botao = document.createElement('button');
        botao.type = 'button';
        botao.className = 'no__coracao';
        botao.dataset.coracaoDe = lugar.id;
        botoesDoCoracao.set(lugar.id, botao);
        camada.append(botao);
      }
      const aberto = estado.abertos.has(lugar.id);
      const de = lugar.id === dados.eu ? 'seus laços' : `os laços de ${pessoa.get(lugar.id)!.nome}`;
      botao.textContent = `♥ ${quantos}`;
      botao.setAttribute('aria-pressed', String(aberto));
      botao.title = `${aberto ? 'Recolher' : 'Mostrar'} ${de} do coração (${quantos})`;
      botao.setAttribute('aria-label', botao.title);
      botao.classList.toggle('no__coracao--apagado', Boolean(estado.nucleo) && !noNucleo(lugar.id));
      botao.style.transform = `translate(${lugar.x + MEDIDAS.largura - 30}px, ${lugar.y - 13}px)`;
    }
    for (const [id, botao] of botoesDoCoracao) {
      if (comBotao.has(id)) continue;
      botao.remove();
      botoesDoCoracao.delete(id);
    }

    // 4c. Ramos: uma marca no ponto de onde cada ramo nasce, e os abertos num cartão por cima
    for (const e of extras.splice(0)) e.remove();
    const lugarDe = new Map(desenho.pessoas.map((l) => [l.id, l]));
    const passo = MEDIDAS.altura + MEDIDAS.vaoY;
    const referencia = desenho.pessoas[0];
    const yDaGeracao = (g: number) => (referencia ? referencia.y + (g - geracoes.get(referencia.id)!) * passo : 0);
    const nomes = (ids: string[]) => {
      const n = ids.map((id) => pessoa.get(id)!.nome);
      return n.length > 1 ? `${n.slice(0, -1).join(', ')} e ${n[n.length - 1]}` : n[0];
    };
    const ocupados: { x: number; y: number; w: number; h: number }[] = [];
    const vagas = new Map<string, number>();
    // Os ramos do casal primeiro, para ficarem mais perto
    for (const ramo of [...ramos].sort((a, b) => b.pais.length - a.pais.length)) {
      const pais = ramo.pais.map((id) => lugarDe.get(id));
      if (pais.some((l) => !l)) continue;
      const [esq, dir] = [Math.min(...pais.map((l) => l!.x)), Math.max(...pais.map((l) => l!.x))];
      const ancoraX = pais.length > 1 ? (esq + MEDIDAS.largura + dir) / 2 : esq + MEDIDAS.largura / 2;
      const baseY = Math.max(...pais.map((l) => l!.y)) + MEDIDAS.altura;
      const aberto = abertos.includes(ramo);
      // O ramo fica do lado de fora do casal, como os irmãos: o da irmã de quem está à esquerda no
      // casal vai para a esquerda, o do irmão de quem está à direita, para a direita
      const daLinha = desenho.pessoas.find((l) => ramo.pais.every((p) => dados.filiacoes.some((f) => f.filho === l.id && f.responsavel === p && !f.consideracao)));
      const par = daLinha && casaisVisiveis.map((c) => (c.a === daLinha.id ? c.b : c.b === daLinha.id ? c.a : '')).map((id) => lugarDe.get(id)).find((l) => l && l.y === daLinha.y);
      const lado = !daLinha || !par ? 0 : par.x > daLinha.x ? -1 : 1;
      // A linha dos filhos que já está desenhada para esses pais. Um ramo de um pai só (filhos da Vó
      // Vivica com outro companheiro) usa a altura da linha do casal, mas desce de baixo dela.
      const exata = desenho.descidas.find((d) => d.pais.join('+') === [...ramo.pais].sort().join('+'));
      const maior = desenho.descidas.find((d) => ramo.pais.every((p) => d.pais.includes(p)));
      const descida = exata ?? (maior && pais.length === 1 ? { ...maior, x: ancoraX, y: baseY } : undefined);
      const marca = document.createElement('button');
      marca.type = 'button';
      marca.className = 'no__ramo';
      marca.dataset.ramo = ramo.chave;
      marca.textContent = `${aberto ? '−' : '+'} ${ramo.filhos.length}`;
      marca.setAttribute('aria-pressed', String(aberto));
      marca.title = `${aberto ? 'Recolher' : 'Mostrar'} o ramo de ${nomes(ramo.filhos)}`;
      marca.setAttribute('aria-label', marca.title);
      const galho = (d: string) => {
        const caminho = document.createElementNS(SVG, 'path');
        caminho.setAttribute('d', d);
        caminho.setAttribute('class', 'linha linha--filhos');
        caminho.dataset.de = ramo.pais.join(' ');
        svg.append(caminho);
      };
      if (aberto || !daLinha || !descida) {
        // Aberto (como no Figma): a marca fica logo abaixo do casal, no tronco, e a linha segue dela até o
        // cartão. Um casal sem ninguém na linha direta embaixo (Luísa e Bruno) ganha o ponto do casal e
        // uma linha curta até a marca, para ela não ficar solta.
        const topo = aberto ? baseY + 6 : baseY + 34;
        marca.style.transform = `translate(${ancoraX - 22}px, ${topo}px)`;
        if (!descida) {
          const doCasal = pais.length === 2 && pais[0]!.y === pais[1]!.y;
          const origemY = doCasal ? pais[0]!.y + MEDIDAS.altura / 2 : baseY;
          galho(`M ${ancoraX} ${origemY} V ${topo}`);
          if (doCasal) {
            const ponto = document.createElementNS(SVG, 'path');
            ponto.setAttribute('d', `M ${ancoraX - 5} ${origemY} a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0`);
            ponto.setAttribute('class', 'linha linha--ponto');
            ponto.dataset.de = ramo.pais.join(' ');
            svg.append(ponto);
          }
        }
      } else {
        // Recolhido (como no FigJam): a marca ocupa o lugar de mais um filho, ao lado de quem está na
        // linha direta, e a linha dos pais se divide até ela. Assim fica claro que são mais filhos.
        // Mais de um ramo ao lado da mesma pessoa (filhos do casal e filhos de um dos dois com outra
        // pessoa): cada marca ganha o lugar seguinte, para fora
        const vaga = (vagas.get(daLinha.id) ?? 0) + 1;
        vagas.set(daLinha.id, vaga);
        const x = daLinha.x + MEDIDAS.largura / 2 + (lado || 1) * vaga * (MEDIDAS.largura + MEDIDAS.vaoX);
        const topo = descida.barra + 18;
        marca.style.transform = `translate(${x - 22}px, ${topo}px)`;
        galho(arredondado([[descida.x, descida.y], [descida.x, descida.barra], [x, descida.barra], [x, topo]]));
      }
      camada.append(marca);
      extras.push(marca);
      if (!aberto) continue;

      // O ramo aberto: uma árvore pequena, num cartão por cima, com as fileiras alinhadas às da árvore
      const membros = ramo.membros.filter((id) => geracoes.has(id));
      const arvoreDoRamo = desenharArvore(
        dados.pessoas.filter((p) => membros.includes(p.id)).map((p) => ({ id: p.id, geracao: geracoes.get(p.id)!, lado: ladoDe.get(p.id) })),
        casaisVisiveis.filter((c) => membros.includes(c.a) && membros.includes(c.b)),
        filiacoesVisiveis.filter((f) => membros.includes(f.filho) && membros.includes(f.responsavel)),
      );
      if (!arvoreDoRamo.pessoas.length) continue;
      const primeira = Math.min(...membros.map((id) => geracoes.get(id)!));
      const folga = 18;
      // Sem título: a linha até o casal já diz de onde o ramo vem. Fica só o botão de fechar, no canto.
      const cabecalho = 18;
      const largura = arvoreDoRamo.largura + folga * 2;
      const altura = arvoreDoRamo.altura + folga * 2 + cabecalho;
      let esquerda = lado < 0 ? ancoraX + 60 - largura : lado > 0 ? ancoraX - 60 : ancoraX - largura / 2;
      // Quem liga o ramo à árvore (a Elizete, no ramo da Tia Lourdes) fica sempre à vista, ao lado do cartão
      if (daLinha && lado < 0) esquerda = Math.min(esquerda, daLinha.x - 12 - largura);
      if (daLinha && lado > 0) esquerda = Math.max(esquerda, daLinha.x + MEDIDAS.largura + 12);
      const topo = yDaGeracao(primeira) - folga - cabecalho;
      // Se encosta em outro cartão já aberto, é empurrado para fora
      const sobrepoe = () => ocupados.find((o) => esquerda < o.x + o.w + 16 && esquerda + largura + 16 > o.x && topo < o.y + o.h && topo + altura > o.y);
      for (let o = sobrepoe(); o; o = sobrepoe()) esquerda = lado < 0 ? o.x - largura - 16 : o.x + o.w + 16;
      ocupados.push({ x: esquerda, y: topo, w: largura, h: altura });
      const conteudoX = esquerda + folga;
      const conteudoY = yDaGeracao(primeira);
      const cartao = document.createElement('section');
      cartao.className = 'ramo';
      cartao.dataset.ramoAberto = ramo.chave;
      cartao.setAttribute('aria-label', `Ramo de ${nomes(ramo.filhos)}`);
      cartao.style.transform = `translate(${esquerda}px, ${topo}px)`;
      cartao.style.width = `${largura}px`;
      cartao.style.height = `${altura}px`;
      const titulo = document.createElement('header');
      titulo.className = 'ramo__titulo';
      const fechar = Object.assign(document.createElement('button'), { type: 'button', textContent: '×' });
      fechar.dataset.ramo = ramo.chave;
      fechar.setAttribute('aria-label', 'Recolher este ramo');
      titulo.append(fechar);
      const conteudo = document.createElement('div');
      conteudo.className = 'ramo__conteudo';
      conteudo.style.left = `${folga}px`;
      conteudo.style.top = `${folga + cabecalho}px`;
      const linhasDoRamo = document.createElementNS(SVG, 'svg');
      linhasDoRamo.setAttribute('class', 'mapa__linhas');
      linhasDoRamo.setAttribute('aria-hidden', 'true');
      linhasDoRamo.setAttribute('width', String(arvoreDoRamo.largura));
      linhasDoRamo.setAttribute('height', String(arvoreDoRamo.altura));
      // Ligação com a árvore: dos pais (a marca) até os filhos do ramo, por cima do cartão
      const doRamo = new Map(arvoreDoRamo.pessoas.map((l) => [l.id, l]));
      const filhosNoTopo = ramo.filhos.filter((f) => doRamo.get(f)?.y === 0);
      const xs = filhosNoTopo.map((f) => doRamo.get(f)!.x + MEDIDAS.largura / 2);
      const ancoraNoRamo = ancoraX - conteudoX;
      // Do Figma: a linha sai da marca, corre por fora do cartão, logo acima dele, e só entra
      // no cartão em cima de cada filho do ramo. Assim ela não cruza o título nem a árvore.
      const daMarca = baseY + 32 - conteudoY;
      const corredor = (daMarca + topo - conteudoY) / 2;
      const ligacao = xs.map((x) => arredondado([[ancoraNoRamo, daMarca], [ancoraNoRamo, corredor], [x, corredor], [x, 0]])).join(' ');
      const caminhos = [...arvoreDoRamo.linhas.map((l) => [l.d, `linha linha--${l.tipo}`]), [ligacao, 'linha linha--filhos linha--ramo']];
      linhasDoRamo.replaceChildren(
        ...caminhos.map(([d, classe]) => {
          const c = document.createElementNS(SVG, 'path');
          c.setAttribute('d', d);
          c.setAttribute('class', classe);
          return c;
        }),
      );
      conteudo.append(linhasDoRamo);
      for (const lugar of arvoreDoRamo.pessoas) conteudo.append(criarNo(lugar.id, lugar.x, lugar.y));
      cartao.append(titulo, conteudo);
      camadaDosRamos.append(cartao);
      extras.push(cartao);
    }

    // 4d. Com um ramo aberto, o resto da árvore recua. Ficam nítidos o cartão, a origem dele (o
    // casal de onde o ramo nasce, com a marca) e quem está na mesma geração do ramo e vem do
    // mesmo casal (a Elizete, no ramo da Tia Lourdes). Com vários abertos, vale o último.
    const emFoco = [...estado.ramos].reverse().map((chave) => abertos.find((r) => r.chave === chave)).find(Boolean);
    const nitidos = new Set<string>();
    if (emFoco) {
      for (const id of emFoco.pais) nitidos.add(id);
      for (const f of filiacoesVisiveis) if (emFoco.pais.includes(f.responsavel) && principal.has(f.filho)) nitidos.add(f.filho);
    }
    const recuar = (el: Element, recua: boolean) => el.classList.toggle('recuado', Boolean(emFoco) && recua);
    for (const [id, no] of nos) recuar(no, !nitidos.has(id));
    for (const [id, botao] of botoesDoCoracao) recuar(botao, !nitidos.has(id));
    for (const caminho of svg.querySelectorAll<SVGPathElement>('path')) {
      const de = (caminho.dataset.de ?? '').split(' ').filter(Boolean);
      recuar(caminho, !de.every((id) => nitidos.has(id)));
    }
    for (const e of extras) recuar(e, e.getAttribute('data-ramo') !== emFoco?.chave && (e as HTMLElement).dataset.ramoAberto !== emFoco?.chave);

    // 5. Quem não tem laço nenhum com ninguém
    // O namoro e o ex que virou amigo são laços; quem só namorou e terminou tem laço, só não aparece na árvore
    const comLaco = new Set([
      ...dados.filiacoes.flatMap((f) => [f.filho, f.responsavel]),
      ...dados.casais.flatMap((c) => [c.a, c.b]),
      ...dados.coracao.flatMap((l) => [l.dono, l.pessoa]),
      ...(dados.amizades ?? []).flatMap((a) => [a.a, a.b]),
      ...(dados.foraDeProposito ?? []),
    ]);
    const fora = [...visiveis].filter((id) => !comLaco.has(id));
    soltos.hidden = fora.length === 0;
    soltos.replaceChildren(
      'Ainda sem laços: ',
      ...fora.flatMap((id, i) => [i ? ', ' : '', Object.assign(document.createElement('a'), { href: `/pessoas/${id}/editar#lacos`, textContent: pessoa.get(id)!.nome })]),
    );
    // Quem estava em foco saiu da árvore (uma camada ou um filtro desligado): a ficha fecha e o foco volta
    // para quem está na tela, a começar pelo centro (observação do Gui, 18/11/2026: com a camada do
    // coração desligada, o cartão do ex que virou amizade sumia, mas a ficha dele continuava aberta)
    const estaNaTela = (id: string) => presentes.has(id) || Boolean(camadaDosRamos.querySelector(`a.no[data-id="${CSS.escape(id)}"]`));
    if (!estaNaTela(estado.foco)) {
      fichaAberta = false;
      estado.foco = [estado.centro, dados.eu, ...dados.centros, ...presentes].find((id) => id && estaNaTela(id)) ?? estado.foco;
      guardarNoEndereco();
    }
    mostrarFicha();
  };

  const focar = (id: string) => {
    estado.foco = id;
    fichaAberta = true;
    refletirNosControles();
    guardarNoEndereco();
    desenhar();
    centralizar(id);
  };

  // --- Interações ---
  controles.addEventListener('change', (evento) => {
    const mudouCentro = (evento.target as HTMLElement).getAttribute('name') === 'centro';
    estado.centro = campo<HTMLSelectElement>('centro').value;
    if (mudouCentro) {
      // Trocar o centro fecha os ramos, que eram da linha anterior
      estado.ramos.clear();
      if (estado.centro) estado.foco = estado.centro;
    }
    estado.nucleo = campo<HTMLSelectElement>('nucleo').value;
    for (const nome of CHAVES) estado[nome] = campo<HTMLInputElement>(nome).checked;
    estado.amigos = campo<HTMLInputElement>('amigos').checked;
    if (!estado.nucleo) estado.outros = true;
    protegerCentro();
    refletirNosControles();
    guardarNoEndereco();
    desenhar();
    // Trocar o centro ou um filtro mostra o resultado inteiro
    verTudo();
  });
  controles.addEventListener('submit', (e) => e.preventDefault());

  // --- Teclado e foco (correção autorizada pelo Gui, 17/11/2026, P88) ---
  // A caixa do mapa nunca rola: quem anda é a vista. Com o Tab num cartão fora da vista, o navegador
  // rolava a caixa, e os ajustes, a ficha e o zoom saíam da tela sem volta.
  // O módulo do mapa já devolve a caixa ao lugar quando ela rola; aqui, antes de medir.
  const semRolagem = () => {
    if (mapa.scrollLeft) mapa.scrollLeft = 0;
    if (mapa.scrollTop) mapa.scrollTop = 0;
  };
  // O mapa anda o mínimo até o que recebeu o foco do teclado, a mesma conta que traz o cartão do ramo
  // para a tela. A posição é lida da vista de agora, mesmo no meio de uma animação.
  const trazerParaAVista = (el: HTMLElement) => {
    semRolagem();
    const caixa = mapa.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const agora = new DOMMatrixReadOnly(getComputedStyle(camada).transform);
    const escala = agora.a || 1;
    // Onde o elemento vai estar quando a vista chegar aonde já foi mandada
    const x = vista.x + ((r.left - caixa.left - agora.e) / escala) * vista.zoom;
    const y = vista.y + ((r.top - caixa.top - agora.f) / escala) * vista.zoom;
    const [w, h] = [(r.width / escala) * vista.zoom, (r.height / escala) * vista.zoom];
    // O que fica por cima do mapa não cobre quem está em foco: os ajustes no alto, a barra embaixo
    const barra = raiz.querySelector<HTMLElement>('.mapa__zoom');
    const livre = { pe: (barra?.offsetHeight ?? 44) + 32, lado: 24 };
    const ajuste = (inicio: number, tamanho: number, de: number, ate: number) => {
      if (tamanho > ate - de || inicio < de) return de - inicio;
      if (inicio + tamanho > ate) return ate - (inicio + tamanho);
      return 0;
    };
    // No quadro, o painel também não cobre quem está em foco
    const area = areaLivre();
    const dx = ajuste(x, w, area.x + livre.lado, mapa.clientWidth - livre.lado);
    const dy = ajuste(y, h, area.y + 24, Math.min(area.y + area.h, mapa.clientHeight - livre.pe));
    if (!dx && !dy) return;
    vista.x += dx;
    vista.y += dy;
    aplicarVista(true);
  };
  for (const c of camadas) {
    c.addEventListener('focusin', (e) => {
      const alvo = e.target as HTMLElement;
      // Só o foco do teclado: o toque e o clique já acontecem em cima do que está à vista
      if (alvo.matches(':focus-visible')) trazerParaAVista(alvo);
      else semRolagem();
    });
  }
  // Depois de um desenho, a marca do ramo e os cartões de dentro dele são outros elementos: o foco
  // volta para o que ficou no lugar
  const devolverFoco = (seletor: string) => {
    const el = raiz.querySelector<HTMLElement>(seletor);
    if (el && el !== document.activeElement) el.focus({ preventScroll: true });
  };

  // Tocar em alguém põe essa pessoa em foco. O segundo toque abre a página dela.
  const aoTocar = (evento: MouseEvent) => {
    if (anda.acabouDeArrastar()) return evento.preventDefault();
    const tinhaFoco = document.activeElement instanceof HTMLElement && (evento.target as HTMLElement).closest('a, button') === document.activeElement;
    const doRamo = (evento.target as HTMLElement).closest<HTMLButtonElement>('button[data-ramo]');
    if (doRamo) {
      // Abre ou recolhe um ramo lateral, sem mexer na árvore principal
      const chave = doRamo.dataset.ramo!;
      const abrindo = !estado.ramos.delete(chave);
      if (abrindo) estado.ramos.add(chave);
      guardarNoEndereco();
      desenhar();
      if (tinhaFoco) devolverFoco(`button.no__ramo[data-ramo="${CSS.escape(chave)}"]`);
      if (abrindo) mostrarCartao(chave);
      return;
    }
    const botao = (evento.target as HTMLElement).closest<HTMLButtonElement>('button.no__coracao');
    if (botao) {
      // Abre ou recolhe os laços do coração dessa pessoa
      const dono = botao.dataset.coracaoDe!;
      if (!estado.abertos.delete(dono)) estado.abertos.add(dono);
      guardarNoEndereco();
      desenhar();
      centralizar(dono);
      return;
    }
    const no = (evento.target as HTMLElement).closest<HTMLAnchorElement>('a.no');
    if (!no) return;
    if (no.dataset.id === estado.foco) {
      // Com a ficha à vista, o segundo toque abre a página. Sem ela, o toque mostra a ficha.
      if (fichaAberta) return;
      evento.preventDefault();
      fichaAberta = true;
      mostrarFicha();
      return;
    }
    evento.preventDefault();
    focar(no.dataset.id!);
    // Dentro de um ramo aberto o cartão foi refeito: o foco do teclado continua na mesma pessoa
    if (tinhaFoco && !no.isConnected) devolverFoco(`a.no[data-id="${CSS.escape(estado.foco)}"]`);
  };
  for (const c of camadas) c.addEventListener('click', aoTocar);
  // Tocar no vazio do mapa fecha a ficha. O clique que encerra um arrasto não conta.
  mapa.addEventListener('click', (evento) => {
    if (anda.acabouDeArrastar()) return;
    if ((evento.target as HTMLElement).closest('a.no, button, .ramo, [data-sobre-o-mapa]')) return;
    fecharFicha();
  });
  mapa.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || e.defaultPrevented || !fichaAberta) return;
    e.preventDefault();
    fecharFicha();
  });

  // Na ficha: "×" fecha, e "Ver a árvore de Fulano" faz a linha direta passar a ser a dela
  ficha.addEventListener('click', (evento) => {
    const alvo = evento.target as HTMLElement;
    if (alvo.closest('[data-fechar-ficha]')) return fecharFicha();
    const botao = alvo.closest<HTMLButtonElement>('[data-partir]');
    if (!botao) return;
    estado.centro = botao.dataset.partir!;
    estado.ramos.clear();
    protegerCentro();
    refletirNosControles();
    guardarNoEndereco();
    desenhar();
    verTudo();
    // A ficha foi refeita sem o botão: o foco do teclado fica em "Ver a página"
    ficha.querySelector<HTMLElement>('a')?.focus({ preventScroll: true });
  });

  raiz.querySelector('[data-zoom-mais]')!.addEventListener('click', () => zoomEm(vista.zoom * 1.25, mapa.clientWidth / 2, mapa.clientHeight / 2, true));
  raiz.querySelector('[data-zoom-menos]')!.addEventListener('click', () => zoomEm(vista.zoom / 1.25, mapa.clientWidth / 2, mapa.clientHeight / 2, true));
  raiz.querySelector('[data-ver-tudo]')!.addEventListener('click', () => verTudo());
  raiz.querySelector('[data-ir-ao-foco]')!.addEventListener('click', () => centralizar(estado.foco));

  protegerCentro();
  refletirNosControles();
  // O endereço passa a dizer o que está na tela (um centro inválido some dele)
  guardarNoEndereco();
  desenhar();
  // Abre com a altura da tela guiando o enquadramento: a árvore à vista de cima a baixo
  enquadrarPelaAltura();
  // As caixas só passam a deslizar depois do primeiro desenho, para não "voarem" na chegada
  requestAnimationFrame(() => camada.classList.add('mapa__camada--viva'));

  const naTela = (id: string) => Boolean(desenho?.pessoas.some((p) => p.id === id)) || Boolean(camadaDosRamos.querySelector(`a.no[data-id="${CSS.escape(id)}"]`));
  return {
    // A busca por nome (resposta do Gui, 17/11/2026): a linha direta fica como está. Quem está num
    // ramo recolhido aparece com o cartão do ramo aberto, e o mapa vai até a pessoa, com a ficha.
    irPara(id) {
      const p = pessoa.get(id);
      if (!p) return;
      let ramo: { chave: string } | undefined;
      let trocouCentro = false;
      if (!naTela(id)) {
        // Um filtro que esconde a pessoa é desligado antes de procurar
        if (p.bicho) estado.bichos = true;
        if (estado.nucleo && !p.nucleos.includes(estado.nucleo)) estado.outros = true;
        desenhar();
      }
      if (!naTela(id)) {
        ramo = ramosDeAgora.find((r) => r.membros.includes(id));
        const laco = dados.coracao.find((l) => l.pessoa === id);
        // O ex que virou amigo aparece com os laços do coração de quem foi o par abertos
        const amizade = (dados.amizades ?? []).find((a) => !a.namoro && (a.a === id || a.b === id));
        if (ramo) estado.ramos.add(ramo.chave);
        else if (laco) {
          // Quem só aparece por um laço do coração: os laços de quem escolheu se abrem
          estado.consideracao = true;
          estado.abertos.add(laco.dono);
          if (!laco.papel) estado.amigos = true;
        } else if (amizade) {
          estado.consideracao = true;
          estado.abertos.add(amizade.a === id ? amizade.b : amizade.a);
        }
        desenhar();
      }
      // Só quem não tem lugar na árvore de agora vira o ponto de partida
      if (!naTela(id) && partivel.has(id)) {
        estado.centro = id;
        estado.ramos.clear();
        protegerCentro();
        trocouCentro = true;
      }
      focar(id);
      if (ramo) mostrarCartao(ramo.chave);
      else if (trocouCentro) verTudo();
      // Por fim, a pessoa procurada fica à vista, fora do painel e da barra
      const cartao = raiz.querySelector<HTMLElement>(`a.no[data-id="${CSS.escape(id)}"]`);
      if (cartao) trazerParaAVista(cartao);
    },
  };
}
