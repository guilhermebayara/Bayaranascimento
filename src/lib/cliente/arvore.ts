// A árvore interativa. Funciona como um mapa: arrasta, aproxima, afasta, e se
// reorganiza com animação quando o foco ou os filtros mudam, sem recarregar a página.
import { MEDIDAS, desenharArvore, type Desenho } from '../arvore-desenho';
import { DESLOCAMENTO_DO_PAPEL, alinharPeloCoracao, calcularGeracoes, type Papel } from '../parentesco';

export interface DadosDaArvore {
  eu: string;
  /** na ordem em que ficam na árvore, da esquerda para a direita */
  nucleos: string[];
  pessoas: { id: string; nome: string; rotulo: string; nucleos: string[]; bicho: boolean; anos: string }[];
  filiacoes: { filho: string; responsavel: string; consideracao: boolean }[];
  casais: { a: string; b: string; ex: boolean }[];
  coracao: { dono: string; pessoa: string; papel: Papel | null; rotulo: string }[];
}

interface Estado {
  foco: string;
  nucleo: string;
  consideracao: boolean;
  ex: boolean;
  bichos: boolean;
  outros: boolean;
  /** de quem são os laços do coração abertos na árvore. Por padrão, só os de quem está olhando. */
  abertos: Set<string>;
}

const SVG = 'http://www.w3.org/2000/svg';
const CHAVES = ['consideracao', 'ex', 'bichos', 'outros'] as const;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2;

export function montarArvore(raiz: HTMLElement, dados: DadosDaArvore): void {
  const mapa = raiz.querySelector<HTMLElement>('[data-mapa]')!;
  const camada = raiz.querySelector<HTMLElement>('[data-camada]')!;
  const ficha = raiz.querySelector<HTMLElement>('[data-ficha-do-foco]')!;
  const soltos = raiz.querySelector<HTMLElement>('[data-sem-lacos]')!;
  const controles = raiz.querySelector<HTMLFormElement>('[data-controles]')!;
  const zoomAtual = raiz.querySelector<HTMLElement>('[data-zoom-atual]')!;
  const pessoa = new Map(dados.pessoas.map((p) => [p.id, p]));

  // Para que lado cada pessoa puxa: o primeiro núcleo à esquerda, o último à direita,
  // e quem é de dois núcleos fica entre eles
  const ladoDe = new Map<string, number>();
  for (const p of dados.pessoas) {
    const indices = p.nucleos.map((n) => dados.nucleos.indexOf(n)).filter((i) => i >= 0);
    if (indices.length && dados.nucleos.length > 1) ladoDe.set(p.id, indices.reduce((s, i) => s + i, 0) / indices.length / (dados.nucleos.length - 1));
  }

  const url = new URL(location.href);
  const ligada = (nome: string) => url.searchParams.get(nome) !== '0';
  const estado: Estado = {
    foco: pessoa.has(url.searchParams.get('foco') ?? '') ? url.searchParams.get('foco')! : dados.eu,
    nucleo: dados.nucleos.includes(url.searchParams.get('nucleo') ?? '') ? url.searchParams.get('nucleo')! : '',
    consideracao: ligada('consideracao'),
    ex: ligada('ex'),
    bichos: ligada('bichos'),
    outros: ligada('outros'),
    abertos: new Set(url.searchParams.has('coracao') ? url.searchParams.get('coracao')!.split(',').filter((id) => pessoa.has(id)) : [dados.eu]),
  };
  // Onde o mapa está: deslocamento e zoom
  const vista = { x: 0, y: 0, zoom: 1 };
  let desenho: Desenho | undefined;
  const nos = new Map<string, HTMLAnchorElement>();
  const botoesDoCoracao = new Map<string, HTMLButtonElement>();
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'mapa__linhas');
  svg.setAttribute('aria-hidden', 'true');
  camada.append(svg);

  const campo = <T extends HTMLElement>(nome: string) => controles.elements.namedItem(nome) as unknown as T;
  const refletirNosControles = () => {
    campo<HTMLSelectElement>('foco').value = estado.foco;
    campo<HTMLSelectElement>('nucleo').value = estado.nucleo;
    for (const nome of CHAVES) campo<HTMLInputElement>(nome).checked = estado[nome];
    // "Outros núcleos" só faz sentido com um núcleo em destaque
    const outros = campo<HTMLInputElement>('outros');
    outros.disabled = !estado.nucleo;
    outros.closest('label')?.toggleAttribute('data-desligado', !estado.nucleo);
  };
  const guardarNoEndereco = () => {
    const q = new URLSearchParams();
    if (estado.foco !== dados.eu) q.set('foco', estado.foco);
    if (estado.nucleo) q.set('nucleo', estado.nucleo);
    for (const nome of CHAVES) if (!estado[nome]) q.set(nome, '0');
    const abertos = [...estado.abertos].sort();
    if (abertos.join() !== dados.eu) q.set('coracao', abertos.join(','));
    history.replaceState(null, '', q.size ? `?${q}` : location.pathname);
  };

  // --- O mapa: mover e aproximar ---
  const aplicarVista = (animado = false) => {
    camada.classList.toggle('mapa__camada--animada', animado);
    camada.style.transform = `translate(${vista.x}px, ${vista.y}px) scale(${vista.zoom})`;
    zoomAtual.textContent = `${Math.round(vista.zoom * 100)}%`;
  };
  const zoomEm = (novo: number, px: number, py: number, animado = false) => {
    const zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, novo));
    // O ponto sob o cursor (ou entre os dedos) fica parado enquanto o resto cresce
    vista.x = px - ((px - vista.x) / vista.zoom) * zoom;
    vista.y = py - ((py - vista.y) / vista.zoom) * zoom;
    vista.zoom = zoom;
    aplicarVista(animado);
  };
  const centralizar = (id: string, animado = true) => {
    const no = desenho?.pessoas.find((p) => p.id === id);
    if (!no) return;
    vista.x = mapa.clientWidth / 2 - (no.x + MEDIDAS.largura / 2) * vista.zoom;
    vista.y = mapa.clientHeight / 2 - (no.y + MEDIDAS.altura / 2) * vista.zoom;
    aplicarVista(animado);
  };
  const verTudo = (animado = true) => {
    if (!desenho) return;
    const folga = 56;
    vista.zoom = Math.max(ZOOM_MIN, Math.min(1.1, (mapa.clientWidth - folga * 2) / desenho.largura, (mapa.clientHeight - folga * 2) / desenho.altura));
    vista.x = (mapa.clientWidth - desenho.largura * vista.zoom) / 2;
    vista.y = (mapa.clientHeight - desenho.altura * vista.zoom) / 2;
    aplicarVista(animado);
  };

  const mostrarFicha = () => {
    const p = pessoa.get(estado.foco);
    if (!p) return;
    const nome = document.createElement('strong');
    nome.textContent = p.nome;
    const quem = document.createElement('span');
    quem.textContent = [p.rotulo, p.anos].filter(Boolean).join(', ');
    const pagina = Object.assign(document.createElement('a'), { href: `/pessoas/${p.id}`, textContent: 'Ver a página' });
    const lacos = Object.assign(document.createElement('a'), { href: `/pessoas/${p.id}/editar#lacos`, textContent: 'Laços' });
    ficha.replaceChildren(nome, quem, pagina, lacos);
  };

  const desenhar = () => {
    // 1. Quem e o que aparece, conforme os controles
    const noNucleo = (id: string) => !estado.nucleo || (pessoa.get(id)?.nucleos.includes(estado.nucleo) ?? false);
    const visiveis = new Set(dados.pessoas.filter((p) => (estado.bichos || !p.bicho) && (estado.outros || noNucleo(p.id))).map((p) => p.id));
    const dentro = (...ids: string[]) => ids.every((id) => visiveis.has(id));
    const filiacoes = dados.filiacoes.filter((f) => dentro(f.filho, f.responsavel) && (estado.consideracao || !f.consideracao));
    const casais = dados.casais.filter((c) => dentro(c.a, c.b) && (estado.ex || !c.ex));
    const todosDoCoracao = estado.consideracao ? dados.coracao.filter((l) => dentro(l.dono, l.pessoa)) : [];

    // 1b. Laços do coração: só aparecem os de quem está com eles abertos. A família de uma amiga,
    // que só se liga à árvore por um laço fechado, fica guardada até alguém abrir.
    const grupoDe = new Map([...visiveis].map((id) => [id, id]));
    const raiz = (id: string): string => (grupoDe.get(id) === id ? id : raiz(grupoDe.get(id)!));
    const unir = (a: string, b: string) => grupoDe.set(raiz(a), raiz(b));
    for (const f of filiacoes) unir(f.filho, f.responsavel);
    for (const c of casais) unir(c.a, c.b);
    const ancoras = [dados.eu, estado.foco].filter((id) => visiveis.has(id));
    if (ancoras.length) {
      const tocados = new Set(dados.coracao.flatMap((l) => [l.dono, l.pessoa]).filter((id) => visiveis.has(id)).map(raiz));
      const mostrados = new Set(ancoras.map(raiz));
      // Quem não tem laço do coração nenhum continua como antes
      for (const id of visiveis) if (!tocados.has(raiz(id))) mostrados.add(raiz(id));
      for (let mudou = true; mudou; ) {
        mudou = false;
        for (const l of todosDoCoracao) {
          if (!estado.abertos.has(l.dono) || !mostrados.has(raiz(l.dono)) || mostrados.has(raiz(l.pessoa))) continue;
          mostrados.add(raiz(l.pessoa));
          mudou = true;
        }
      }
      for (const id of [...visiveis]) if (!mostrados.has(raiz(id))) visiveis.delete(id);
    }
    const coracao = todosDoCoracao.filter((l) => estado.abertos.has(l.dono) && dentro(l.dono, l.pessoa));
    const filiacoesVisiveis = filiacoes.filter((f) => dentro(f.filho, f.responsavel));
    const casaisVisiveis = casais.filter((c) => dentro(c.a, c.b));
    const lacosDe = new Map<string, number>();
    for (const l of todosDoCoracao) if (visiveis.has(l.dono)) lacosDe.set(l.dono, (lacosDe.get(l.dono) ?? 0) + 1);

    // 2. Gerações. Famílias de amigos se encaixam pelos laços do coração.
    const geracoes = alinharPeloCoracao(calcularGeracoes([...visiveis], filiacoesVisiveis, casaisVisiveis), filiacoesVisiveis, casaisVisiveis, coracao, dados.eu);
    // Quem só está na árvore por um "como se fosse" entra na geração que o papel indica
    const agregados = coracao.filter((l) => l.papel && geracoes.has(l.dono) && !geracoes.has(l.pessoa));
    for (const l of agregados) if (!geracoes.has(l.pessoa)) geracoes.set(l.pessoa, geracoes.get(l.dono)! + DESLOCAMENTO_DO_PAPEL[l.papel!]);
    const ligados = coracao.filter((l) => l.papel && geracoes.has(l.dono) && geracoes.has(l.pessoa));

    // Na ordem da lista (que vem ordenada do servidor), para o desenho ser estável
    const naArvore = dados.pessoas.filter((p) => geracoes.has(p.id)).map((p) => ({ id: p.id, geracao: geracoes.get(p.id)!, lado: ladoDe.get(p.id) }));
    desenho = desenharArvore(naArvore, casaisVisiveis, filiacoesVisiveis, ligados);

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
        return caminho;
      }),
    );

    // 4. Pessoas: cada caixa continua a mesma entre um desenho e outro, e desliza até o novo lugar
    const rotuloDoCoracao = new Map(agregados.map((l) => [l.pessoa, l.rotulo]));
    const presentes = new Set<string>();
    for (const lugar of desenho.pessoas) {
      const p = pessoa.get(lugar.id)!;
      presentes.add(p.id);
      let no = nos.get(p.id);
      if (!no) {
        no = document.createElement('a');
        no.href = `/pessoas/${p.id}`;
        no.dataset.id = p.id;
        no.style.width = `${MEDIDAS.largura}px`;
        no.style.height = `${MEDIDAS.altura}px`;
        no.append(document.createElement('strong'), document.createElement('span'));
        no.firstElementChild!.textContent = p.nome;
        nos.set(p.id, no);
        camada.append(no);
      }
      no.lastElementChild!.textContent = p.rotulo || rotuloDoCoracao.get(p.id) || (p.bicho ? 'bicho da família' : '');
      no.className = 'no';
      no.classList.toggle('no--eu', p.id === dados.eu);
      no.classList.toggle('no--foco', p.id === estado.foco);
      no.classList.toggle('no--apagado', Boolean(estado.nucleo) && !noNucleo(p.id));
      no.classList.toggle('no--consideracao', rotuloDoCoracao.has(p.id));
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

    // 5. Quem ficou de fora por não ter laços
    const fora = [...visiveis].filter((id) => !geracoes.has(id));
    soltos.hidden = fora.length === 0;
    soltos.replaceChildren(
      'Ainda sem laços: ',
      ...fora.flatMap((id, i) => [i ? ', ' : '', Object.assign(document.createElement('a'), { href: `/pessoas/${id}/editar#lacos`, textContent: pessoa.get(id)!.nome })]),
    );
    mostrarFicha();
  };

  const focar = (id: string) => {
    estado.foco = id;
    refletirNosControles();
    guardarNoEndereco();
    desenhar();
    centralizar(id);
  };

  // --- Interações ---
  controles.addEventListener('change', (evento) => {
    const mudouFoco = (evento.target as HTMLElement).getAttribute('name') === 'foco';
    estado.foco = campo<HTMLSelectElement>('foco').value;
    estado.nucleo = campo<HTMLSelectElement>('nucleo').value;
    for (const nome of CHAVES) estado[nome] = campo<HTMLInputElement>(nome).checked;
    if (!estado.nucleo) estado.outros = true;
    refletirNosControles();
    guardarNoEndereco();
    desenhar();
    // Trocar o foco leva até a pessoa. Trocar um filtro mostra o resultado inteiro.
    if (mudouFoco) centralizar(estado.foco);
    else verTudo();
  });
  controles.addEventListener('submit', (e) => e.preventDefault());

  // Arrastar move o mapa (mouse ou dedo). Dois dedos aproximam e afastam.
  const dedos = new Map<number, { x: number; y: number }>();
  let arrasto: { x: number; y: number; vx: number; vy: number; andou: boolean } | undefined;
  let pinca: { distancia: number; zoom: number } | undefined;
  let fimDoArrasto = 0;
  const ponto = (e: { clientX: number; clientY: number }) => {
    const caixa = mapa.getBoundingClientRect();
    return { x: e.clientX - caixa.left, y: e.clientY - caixa.top };
  };
  mapa.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('[data-sobre-o-mapa]')) return;
    dedos.set(e.pointerId, ponto(e));
    if (dedos.size === 1) arrasto = { ...ponto(e), vx: vista.x, vy: vista.y, andou: false };
    if (dedos.size === 2) {
      const [a, b] = [...dedos.values()];
      pinca = { distancia: Math.hypot(a.x - b.x, a.y - b.y), zoom: vista.zoom };
      arrasto = undefined;
    }
  });
  window.addEventListener('pointermove', (e) => {
    if (!dedos.has(e.pointerId)) return;
    dedos.set(e.pointerId, ponto(e));
    if (pinca && dedos.size === 2) {
      const [a, b] = [...dedos.values()];
      zoomEm((pinca.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / pinca.distancia, (a.x + b.x) / 2, (a.y + b.y) / 2);
      return;
    }
    if (!arrasto) return;
    const p = ponto(e);
    if (Math.abs(p.x - arrasto.x) + Math.abs(p.y - arrasto.y) > 5) arrasto.andou = true;
    if (!arrasto.andou) return;
    mapa.classList.add('mapa--arrastando');
    vista.x = arrasto.vx + p.x - arrasto.x;
    vista.y = arrasto.vy + p.y - arrasto.y;
    aplicarVista();
  });
  const soltar = (e: PointerEvent) => {
    if (!dedos.delete(e.pointerId)) return;
    // O clique que vem logo depois de um arrasto não deve escolher ninguém
    if (arrasto?.andou || pinca) fimDoArrasto = Date.now();
    if (dedos.size < 2) pinca = undefined;
    if (dedos.size === 0) arrasto = undefined;
    mapa.classList.remove('mapa--arrastando');
  };
  window.addEventListener('pointerup', soltar);
  window.addEventListener('pointercancel', soltar);

  // Rolar move o mapa. Com Ctrl (ou o gesto de pinça do trackpad), aproxima e afasta.
  mapa.addEventListener(
    'wheel',
    (e) => {
      if ((e.target as HTMLElement).closest('[data-sobre-o-mapa]')) return;
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const p = ponto(e);
        zoomEm(vista.zoom * Math.exp(-e.deltaY * 0.01), p.x, p.y);
      } else {
        vista.x -= e.deltaX;
        vista.y -= e.deltaY;
        aplicarVista();
      }
    },
    { passive: false },
  );

  // Teclado: setas movem, + e − aproximam
  mapa.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).closest('[data-sobre-o-mapa]')) return;
    const passo = 80;
    const movimentos: Record<string, [number, number]> = { ArrowLeft: [passo, 0], ArrowRight: [-passo, 0], ArrowUp: [0, passo], ArrowDown: [0, -passo] };
    if (movimentos[e.key]) {
      e.preventDefault();
      vista.x += movimentos[e.key][0];
      vista.y += movimentos[e.key][1];
      aplicarVista(true);
    } else if (e.key === '+' || e.key === '=') zoomEm(vista.zoom * 1.2, mapa.clientWidth / 2, mapa.clientHeight / 2, true);
    else if (e.key === '-') zoomEm(vista.zoom / 1.2, mapa.clientWidth / 2, mapa.clientHeight / 2, true);
  });

  // Tocar em alguém põe essa pessoa em foco. O segundo toque abre a página dela.
  camada.addEventListener('click', (evento) => {
    if (Date.now() - fimDoArrasto < 300) return evento.preventDefault();
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
    if (!no || no.dataset.id === estado.foco) return;
    evento.preventDefault();
    focar(no.dataset.id!);
  });

  raiz.querySelector('[data-zoom-mais]')!.addEventListener('click', () => zoomEm(vista.zoom * 1.25, mapa.clientWidth / 2, mapa.clientHeight / 2, true));
  raiz.querySelector('[data-zoom-menos]')!.addEventListener('click', () => zoomEm(vista.zoom / 1.25, mapa.clientWidth / 2, mapa.clientHeight / 2, true));
  raiz.querySelector('[data-ver-tudo]')!.addEventListener('click', () => verTudo());
  raiz.querySelector('[data-ir-ao-foco]')!.addEventListener('click', () => centralizar(estado.foco));

  refletirNosControles();
  desenhar();
  // Abre mostrando a árvore inteira. Se ela ficar pequena demais para ler, abre no foco.
  verTudo(false);
  if (vista.zoom < 0.6) {
    vista.zoom = 0.75;
    centralizar(estado.foco, false);
  }
  // As caixas só passam a deslizar depois do primeiro desenho, para não "voarem" na chegada
  requestAnimationFrame(() => camada.classList.add('mapa__camada--viva'));
}
