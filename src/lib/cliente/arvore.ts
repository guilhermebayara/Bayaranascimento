// A árvore interativa: recalcula e redesenha a cada mudança de filtro, sem recarregar a página.
import { MEDIDAS, desenharArvore } from '../arvore-desenho';
import { DESLOCAMENTO_DO_PAPEL, alinharPeloCoracao, calcularGeracoes, type Papel } from '../parentesco';

export interface DadosDaArvore {
  eu: string;
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
  zoom: number;
}

const SVG = 'http://www.w3.org/2000/svg';
const MARGEM = 48;

export function montarArvore(raiz: HTMLElement, dados: DadosDaArvore): void {
  const moldura = raiz.querySelector<HTMLElement>('[data-mapa]')!;
  const tela = raiz.querySelector<HTMLElement>('[data-tela]')!;
  const camada = raiz.querySelector<HTMLElement>('[data-camada]')!;
  const ficha = raiz.querySelector<HTMLElement>('[data-ficha-do-foco]')!;
  const soltos = raiz.querySelector<HTMLElement>('[data-sem-lacos]')!;
  const controles = raiz.querySelector<HTMLFormElement>('[data-controles]')!;
  const pessoa = new Map(dados.pessoas.map((p) => [p.id, p]));

  const url = new URL(location.href);
  const ligada = (nome: string) => url.searchParams.get(nome) !== '0';
  const estado: Estado = {
    foco: pessoa.has(url.searchParams.get('foco') ?? '') ? url.searchParams.get('foco')! : dados.eu,
    nucleo: url.searchParams.get('nucleo') ?? '',
    consideracao: ligada('consideracao'),
    ex: ligada('ex'),
    bichos: ligada('bichos'),
    outros: ligada('outros'),
    zoom: 0,
  };

  const campo = <T extends HTMLElement>(nome: string) => controles.elements.namedItem(nome) as unknown as T;
  const refletirNosControles = () => {
    campo<HTMLSelectElement>('foco').value = estado.foco;
    campo<HTMLSelectElement>('nucleo').value = estado.nucleo;
    for (const nome of ['consideracao', 'ex', 'bichos', 'outros'] as const) campo<HTMLInputElement>(nome).checked = estado[nome];
    // "Outros núcleos" só faz sentido com um núcleo em destaque
    const outros = campo<HTMLInputElement>('outros');
    outros.disabled = !estado.nucleo;
    outros.closest('label')?.toggleAttribute('data-desligado', !estado.nucleo);
  };
  const guardarNoEndereco = () => {
    const q = new URLSearchParams();
    if (estado.foco !== dados.eu) q.set('foco', estado.foco);
    if (estado.nucleo) q.set('nucleo', estado.nucleo);
    for (const nome of ['consideracao', 'ex', 'bichos', 'outros'] as const) if (!estado[nome]) q.set(nome, '0');
    history.replaceState(null, '', q.size ? `?${q}` : location.pathname);
  };

  let desenhoAtual: ReturnType<typeof desenharArvore> | undefined;

  const aplicarZoom = () => {
    if (!desenhoAtual) return;
    const largura = desenhoAtual.largura + MARGEM * 2;
    const altura = desenhoAtual.altura + MARGEM * 2;
    tela.style.width = `${largura * estado.zoom}px`;
    tela.style.height = `${altura * estado.zoom}px`;
    camada.style.width = `${largura}px`;
    camada.style.height = `${altura}px`;
    camada.style.transform = `scale(${estado.zoom})`;
    raiz.querySelector<HTMLElement>('[data-zoom-atual]')!.textContent = `${Math.round(estado.zoom * 100)}%`;
    // A moldura acompanha a altura da árvore, até um teto, para não sobrar um vazio embaixo
    moldura.style.height = `${Math.min(altura * estado.zoom + 4, window.innerHeight * 0.72)}px`;
  };

  const centralizar = (id: string, suave = true) => {
    const no = desenhoAtual?.pessoas.find((p) => p.id === id);
    if (!no) return;
    const x = (no.x + MARGEM + MEDIDAS.largura / 2) * estado.zoom - moldura.clientWidth / 2;
    const y = (no.y + MARGEM + MEDIDAS.altura / 2) * estado.zoom - moldura.clientHeight / 2;
    moldura.scrollTo({ left: Math.max(0, x), top: Math.max(0, y), behavior: suave ? 'smooth' : 'auto' });
  };

  const mostrarFicha = () => {
    const p = pessoa.get(estado.foco);
    if (!p) return;
    ficha.replaceChildren();
    const nome = document.createElement('strong');
    nome.textContent = p.nome;
    const quem = document.createElement('span');
    quem.textContent = [p.rotulo, p.anos].filter(Boolean).join(', ');
    const pagina = Object.assign(document.createElement('a'), { className: 'botao botao--leve', href: `/pessoas/${p.id}`, textContent: 'Ver a página' });
    const lacos = Object.assign(document.createElement('a'), { className: 'botao botao--leve', href: `/pessoas/${p.id}/editar#lacos`, textContent: 'Laços' });
    ficha.append(nome, quem, pagina, lacos);
  };

  const desenhar = (recentralizar: boolean) => {
    // 1. Quem e o que aparece, conforme os controles
    const noNucleo = (id: string) => !estado.nucleo || (pessoa.get(id)?.nucleos.includes(estado.nucleo) ?? false);
    const visiveis = new Set(
      dados.pessoas.filter((p) => (estado.bichos || !p.bicho) && (estado.outros || noNucleo(p.id))).map((p) => p.id),
    );
    const dentro = (...ids: string[]) => ids.every((id) => visiveis.has(id));
    const filiacoes = dados.filiacoes.filter((f) => dentro(f.filho, f.responsavel) && (estado.consideracao || !f.consideracao));
    const casais = dados.casais.filter((c) => dentro(c.a, c.b) && (estado.ex || !c.ex));
    const coracao = estado.consideracao ? dados.coracao.filter((l) => dentro(l.dono, l.pessoa)) : [];

    // 2. Gerações. Famílias de amigos se encaixam pelos laços do coração.
    const geracoes = alinharPeloCoracao(calcularGeracoes([...visiveis], filiacoes, casais), filiacoes, casais, coracao, dados.eu);
    // Quem só está na árvore por um "como se fosse" entra na geração que o papel indica
    const agregados = coracao.filter((l) => l.papel && geracoes.has(l.dono) && !geracoes.has(l.pessoa));
    for (const l of agregados) if (!geracoes.has(l.pessoa)) geracoes.set(l.pessoa, geracoes.get(l.dono)! + DESLOCAMENTO_DO_PAPEL[l.papel!]);
    const ligados = coracao.filter((l) => l.papel && geracoes.has(l.dono) && geracoes.has(l.pessoa));

    // Na ordem da lista (que vem ordenada do servidor), para o desenho ser estável
    const naArvore = dados.pessoas.filter((p) => geracoes.has(p.id)).map((p) => ({ id: p.id, geracao: geracoes.get(p.id)! }));
    const desenho = desenharArvore(naArvore, casais, filiacoes, ligados);
    desenhoAtual = desenho;

    // 3. Linhas
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'mapa__linhas');
    svg.setAttribute('width', String(desenho.largura + MARGEM * 2));
    svg.setAttribute('height', String(desenho.altura + MARGEM * 2));
    svg.setAttribute('aria-hidden', 'true');
    const grupo = document.createElementNS(SVG, 'g');
    grupo.setAttribute('transform', `translate(${MARGEM} ${MARGEM})`);
    for (const linha of desenho.linhas) {
      const caminho = document.createElementNS(SVG, 'path');
      caminho.setAttribute('d', linha.d);
      const classes = ['linha', `linha--${linha.tipo}`];
      if (estado.nucleo && !linha.de.every(noNucleo)) classes.push('linha--apagada');
      if (linha.de.includes(estado.foco)) classes.push('linha--foco');
      caminho.setAttribute('class', classes.join(' '));
      grupo.append(caminho);
    }
    svg.append(grupo);

    // 4. Pessoas
    const rotuloDoCoracao = new Map(agregados.map((l) => [l.pessoa, l.rotulo]));
    const nos = desenho.pessoas.map((no) => {
      const p = pessoa.get(no.id)!;
      const a = document.createElement('a');
      a.href = `/pessoas/${p.id}`;
      a.dataset.id = p.id;
      a.className = 'no';
      if (p.id === dados.eu) a.classList.add('no--eu');
      if (p.id === estado.foco) a.classList.add('no--foco');
      if (estado.nucleo && !noNucleo(p.id)) a.classList.add('no--apagado');
      if (rotuloDoCoracao.has(p.id)) a.classList.add('no--consideracao');
      a.style.left = `${no.x + MARGEM}px`;
      a.style.top = `${no.y + MARGEM}px`;
      a.style.width = `${MEDIDAS.largura}px`;
      a.style.height = `${MEDIDAS.altura}px`;
      const nome = document.createElement('strong');
      nome.textContent = p.nome;
      const rotulo = document.createElement('span');
      rotulo.textContent = p.rotulo || rotuloDoCoracao.get(p.id) || (p.bicho ? 'bicho da família' : '');
      a.append(nome, rotulo);
      return a;
    });
    camada.replaceChildren(svg, ...nos);

    // 5. Quem ficou de fora por não ter laços
    const fora = [...visiveis].filter((id) => !geracoes.has(id));
    soltos.hidden = fora.length === 0;
    soltos.replaceChildren(
      'Ainda sem laços na árvore: ',
      ...fora.flatMap((id, i) => [i ? ', ' : '', Object.assign(document.createElement('a'), { href: `/pessoas/${id}/editar#lacos`, textContent: pessoa.get(id)!.nome })]),
    );

    // Na primeira vez, o zoom tenta mostrar a árvore inteira, sem deixar o texto ilegível
    if (!estado.zoom) estado.zoom = Math.max(0.55, Math.min(1, moldura.clientWidth / (desenho.largura + MARGEM * 2)));
    aplicarZoom();
    mostrarFicha();
    if (recentralizar) centralizar(desenho.pessoas.some((p) => p.id === estado.foco) ? estado.foco : dados.eu, false);
  };

  // --- Interações ---
  controles.addEventListener('change', () => {
    estado.foco = campo<HTMLSelectElement>('foco').value;
    estado.nucleo = campo<HTMLSelectElement>('nucleo').value;
    for (const nome of ['consideracao', 'ex', 'bichos', 'outros'] as const) estado[nome] = campo<HTMLInputElement>(nome).checked;
    if (!estado.nucleo) estado.outros = true;
    refletirNosControles();
    guardarNoEndereco();
    desenhar(true);
  });
  controles.addEventListener('submit', (e) => e.preventDefault());

  let arrasto: { x: number; y: number; esq: number; topo: number; andou: boolean } | undefined;
  let fimDoArrasto = 0;

  // Tocar em alguém põe essa pessoa em foco. O segundo toque abre a página dela.
  camada.addEventListener('click', (evento) => {
    if (Date.now() - fimDoArrasto < 300) return evento.preventDefault();
    const no = (evento.target as HTMLElement).closest<HTMLAnchorElement>('a.no');
    if (!no || no.dataset.id === estado.foco) return;
    evento.preventDefault();
    estado.foco = no.dataset.id!;
    refletirNosControles();
    guardarNoEndereco();
    desenhar(false);
    centralizar(estado.foco);
  });

  const mudarZoom = (fator: number) => {
    const meioX = (moldura.scrollLeft + moldura.clientWidth / 2) / estado.zoom;
    const meioY = (moldura.scrollTop + moldura.clientHeight / 2) / estado.zoom;
    estado.zoom = Math.max(0.35, Math.min(1.6, estado.zoom * fator));
    aplicarZoom();
    moldura.scrollTo({ left: meioX * estado.zoom - moldura.clientWidth / 2, top: meioY * estado.zoom - moldura.clientHeight / 2 });
  };
  raiz.querySelector('[data-zoom-mais]')!.addEventListener('click', () => mudarZoom(1.2));
  raiz.querySelector('[data-zoom-menos]')!.addEventListener('click', () => mudarZoom(1 / 1.2));
  raiz.querySelector('[data-ver-tudo]')!.addEventListener('click', () => {
    if (!desenhoAtual) return;
    estado.zoom = Math.max(0.35, Math.min(1, moldura.clientWidth / (desenhoAtual.largura + MARGEM * 2), moldura.clientHeight / (desenhoAtual.altura + MARGEM * 2)));
    aplicarZoom();
    moldura.scrollTo({ left: 0, top: 0 });
  });
  raiz.querySelector('[data-ir-ao-foco]')!.addEventListener('click', () => centralizar(estado.foco));

  // Arrastar com o mouse para andar pela árvore. No celular, o dedo já rola.

  moldura.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    arrasto = { x: e.clientX, y: e.clientY, esq: moldura.scrollLeft, topo: moldura.scrollTop, andou: false };
  });
  window.addEventListener('pointermove', (e) => {
    if (!arrasto) return;
    const dx = e.clientX - arrasto.x;
    const dy = e.clientY - arrasto.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) arrasto.andou = true;
    if (arrasto.andou) {
      moldura.classList.add('mapa--arrastando');
      moldura.scrollLeft = arrasto.esq - dx;
      moldura.scrollTop = arrasto.topo - dy;
    }
  });
  window.addEventListener('pointerup', () => {
    // O clique que vem logo depois de um arrasto não deve escolher ninguém
    if (arrasto?.andou) fimDoArrasto = Date.now();
    arrasto = undefined;
    moldura.classList.remove('mapa--arrastando');
  });

  refletirNosControles();
  desenhar(true);
}
