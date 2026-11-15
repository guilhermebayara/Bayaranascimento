// A árvore interativa. Funciona como um mapa: arrasta, aproxima, afasta, e se
// reorganiza com animação quando o foco ou os filtros mudam, sem recarregar a página.
import { MEDIDAS, desenharArvore, type Desenho } from '../arvore-desenho';
import { DESLOCAMENTO_DO_PAPEL, alinharPeloCoracao, calcularGeracoes, type Papel } from '../parentesco';
import { linhaDireta, ramosRecolhidos, type Ramo } from '../linha-direta';

export interface DadosDaArvore {
  eu: string;
  /** de quem é a linha direta mostrada por padrão */
  centros: string[];
  /** na ordem em que ficam na árvore, da esquerda para a direita */
  nucleos: { id: string; nome: string }[];
  pessoas: { id: string; nome: string; rotulo: string; nucleos: string[]; bicho: boolean; anos: string }[];
  filiacoes: { filho: string; responsavel: string; consideracao: boolean }[];
  casais: { a: string; b: string; ex: boolean }[];
  coracao: { dono: string; pessoa: string; papel: Papel | null; rotulo: string }[];
}

interface Estado {
  /** a pessoa selecionada, com a ficha aberta */
  foco: string;
  /** de quem é a linha direta. Vazio: a dos centros padrão. */
  centro: string;
  /** ramos laterais abertos por cima da árvore */
  ramos: Set<string>;
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
  const idsDosNucleos = dados.nucleos.map((n) => n.id);
  const indicesDosNucleos = (nucleos: string[]) => nucleos.map((n) => idsDosNucleos.indexOf(n)).filter((i) => i >= 0).sort((a, b) => a - b);
  // A cor de cada lado da família. Quem é de dois núcleos fica com as duas cores, dividida na diagonal.
  const fundoDe = (nucleos: string[]) => {
    const cores = indicesDosNucleos(nucleos).map((i) => `var(--nucleo-${i % 4})`);
    if (cores.length === 0) return '';
    if (cores.length === 1) return cores[0];
    const fatia = 100 / cores.length;
    return `linear-gradient(135deg, ${cores.map((c, i) => `${c} ${i * fatia}% ${(i + 1) * fatia}%`).join(', ')})`;
  };
  const ladoDe = new Map<string, number>();
  for (const p of dados.pessoas) {
    const indices = indicesDosNucleos(p.nucleos);
    if (indices.length && dados.nucleos.length > 1) ladoDe.set(p.id, indices.reduce((s, i) => s + i, 0) / indices.length / (dados.nucleos.length - 1));
  }

  const url = new URL(location.href);
  const ligada = (nome: string) => url.searchParams.get(nome) !== '0';
  const estado: Estado = {
    foco: pessoa.has(url.searchParams.get('foco') ?? '') ? url.searchParams.get('foco')! : dados.eu,
    centro: pessoa.has(url.searchParams.get('centro') ?? '') ? url.searchParams.get('centro')! : '',
    ramos: new Set((url.searchParams.get('ramos') ?? '').split(',').filter(Boolean)),
    nucleo: idsDosNucleos.includes(url.searchParams.get('nucleo') ?? '') ? url.searchParams.get('nucleo')! : '',
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
  // Marcas dos ramos recolhidos e os cartões dos ramos abertos, refeitos a cada desenho
  const extras: HTMLElement[] = [];
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'mapa__linhas');
  svg.setAttribute('aria-hidden', 'true');
  camada.append(svg);

  const campo = <T extends HTMLElement>(nome: string) => controles.elements.namedItem(nome) as unknown as T;
  const refletirNosControles = () => {
    campo<HTMLSelectElement>('centro').value = estado.centro;
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
    if (estado.centro) q.set('centro', estado.centro);
    if (estado.ramos.size) q.set('ramos', [...estado.ramos].sort().join(','));
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
    if (!no) return;  // quem está num ramo aberto já está à vista
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
    const partir = Object.assign(document.createElement('button'), { type: 'button', textContent: 'Partir desta pessoa' });
    partir.dataset.partir = p.id;
    partir.hidden = estado.centro === p.id;
    ficha.replaceChildren(nome, quem, pagina, lacos, partir);
  };

  // Uma caixa de pessoa para os ramos abertos (as da árvore principal são guardadas e reaproveitadas)
  const criarNo = (id: string, x: number, y: number) => {
    const p = pessoa.get(id)!;
    const no = document.createElement('a');
    no.href = `/pessoas/${p.id}`;
    no.dataset.id = p.id;
    no.className = 'no';
    no.classList.toggle('no--foco', p.id === estado.foco);
    no.classList.toggle('no--de-fora', p.nucleos.length === 0);
    no.style.width = `${MEDIDAS.largura}px`;
    no.style.height = `${MEDIDAS.altura}px`;
    no.style.background = fundoDe(p.nucleos);
    no.style.transform = `translate(${x}px, ${y}px)`;
    const nome = document.createElement('strong');
    nome.textContent = p.nome;
    const quem = document.createElement('span');
    quem.textContent = p.rotulo || (p.bicho ? 'bicho da família' : '');
    no.append(nome, quem);
    return no;
  };

  const desenhar = () => {
    // 1. Quem e o que aparece, conforme os controles
    const noNucleo = (id: string) => !estado.nucleo || (pessoa.get(id)?.nucleos.includes(estado.nucleo) ?? false);
    const visiveis = new Set(dados.pessoas.filter((p) => (estado.bichos || !p.bicho) && (estado.outros || noNucleo(p.id))).map((p) => p.id));
    const dentro = (...ids: string[]) => ids.every((id) => visiveis.has(id));
    const filiacoes = dados.filiacoes.filter((f) => dentro(f.filho, f.responsavel) && (estado.consideracao || !f.consideracao));
    const casais = dados.casais.filter((c) => dentro(c.a, c.b) && (estado.ex || !c.ex));
    const todosDoCoracao = estado.consideracao ? dados.coracao.filter((l) => dentro(l.dono, l.pessoa)) : [];

    // 1b. A linha direta: os centros, os ancestrais, os irmãos, os descendentes e os casais.
    // O resto da família fica em ramos recolhidos, que abrem por cima da árvore.
    const centros = estado.centro ? [estado.centro] : dados.centros.filter((id) => visiveis.has(id));
    const principal = linhaDireta(centros.length ? centros : [dados.eu], [...visiveis], filiacoes, casais);

    // 1c. Laços do coração: só aparecem os de quem está com eles abertos. Quem foi escolhido entra
    // na árvore; se tem uma família que não é a nossa (a de uma amiga), ela vem junto.
    const grupoDe = new Map([...visiveis].map((id) => [id, id]));
    const raiz = (id: string): string => (grupoDe.get(id) === id ? id : raiz(grupoDe.get(id)!));
    const unir = (a: string, b: string) => grupoDe.set(raiz(a), raiz(b));
    for (const f of filiacoes) unir(f.filho, f.responsavel);
    for (const c of casais) unir(c.a, c.b);
    const daFamilia = new Set([...principal].map(raiz));
    for (let mudou = true; mudou; ) {
      mudou = false;
      for (const l of todosDoCoracao) {
        if (!estado.abertos.has(l.dono) || !principal.has(l.dono) || principal.has(l.pessoa)) continue;
        if (daFamilia.has(raiz(l.pessoa))) principal.add(l.pessoa);
        else for (const id of visiveis) if (raiz(id) === raiz(l.pessoa)) principal.add(id);
        mudou = true;
      }
    }
    const coracao = todosDoCoracao.filter((l) => estado.abertos.has(l.dono) && principal.has(l.dono) && principal.has(l.pessoa));
    const lacosDe = new Map<string, number>();
    for (const l of todosDoCoracao) if (principal.has(l.dono)) lacosDe.set(l.dono, (lacosDe.get(l.dono) ?? 0) + 1);

    // 1d. Os ramos recolhidos, e quais deles estão abertos
    const ramos = ramosRecolhidos(principal, [...visiveis], filiacoes, casais);
    const abertos = ramos.filter((r) => estado.ramos.has(r.chave));
    const noRamo = new Set(abertos.flatMap((r) => r.membros));
    const entra = (id: string) => principal.has(id) || noRamo.has(id);
    const filiacoesVisiveis = filiacoes.filter((f) => entra(f.filho) && entra(f.responsavel));
    const casaisVisiveis = casais.filter((c) => entra(c.a) && entra(c.b));
    const naPrincipal = (...ids: string[]) => ids.every((id) => principal.has(id));

    // 2. Gerações, calculadas para a árvore e os ramos abertos juntos, para as fileiras baterem
    const geracoes = alinharPeloCoracao(
      calcularGeracoes([...visiveis].filter(entra), filiacoesVisiveis, casaisVisiveis),
      filiacoesVisiveis,
      casaisVisiveis,
      coracao,
      dados.eu,
    );
    // Quem só está na árvore por um "como se fosse" entra na geração que o papel indica
    const agregados = coracao.filter((l) => l.papel && geracoes.has(l.dono) && !geracoes.has(l.pessoa));
    for (const l of agregados) if (!geracoes.has(l.pessoa)) geracoes.set(l.pessoa, geracoes.get(l.dono)! + DESLOCAMENTO_DO_PAPEL[l.papel!]);
    // Todo laço do coração aberto entra no desenho, com ou sem "como se fosse"
    const ligados = coracao.filter((l) => geracoes.has(l.dono) && geracoes.has(l.pessoa));

    // Na ordem da lista (que vem ordenada do servidor), para o desenho ser estável
    const naArvore = dados.pessoas.filter((p) => principal.has(p.id) && geracoes.has(p.id)).map((p) => ({ id: p.id, geracao: geracoes.get(p.id)!, lado: ladoDe.get(p.id) }));
    desenho = desenharArvore(
      naArvore,
      casaisVisiveis.filter((c) => naPrincipal(c.a, c.b)),
      filiacoesVisiveis.filter((f) => naPrincipal(f.filho, f.responsavel)),
      ligados,
    );

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
      no.classList.toggle('no--de-fora', p.nucleos.length === 0);
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
    for (const ramo of ramos) {
      const pais = ramo.pais.map((id) => lugarDe.get(id));
      if (pais.some((l) => !l)) continue;
      const [esq, dir] = [Math.min(...pais.map((l) => l!.x)), Math.max(...pais.map((l) => l!.x))];
      // A marca fica no meio do casal, logo abaixo dele, em cima da linha que desce para os filhos
      const ancoraX = pais.length > 1 ? (esq + MEDIDAS.largura + dir) / 2 : esq + MEDIDAS.largura / 2;
      const baseY = Math.max(...pais.map((l) => l!.y)) + MEDIDAS.altura;
      const aberto = abertos.includes(ramo);
      const marca = document.createElement('button');
      marca.type = 'button';
      marca.className = 'no__ramo';
      marca.dataset.ramo = ramo.chave;
      marca.textContent = `${aberto ? '−' : '+'} ${ramo.filhos.length}`;
      marca.setAttribute('aria-pressed', String(aberto));
      marca.title = `${aberto ? 'Recolher' : 'Mostrar'} o ramo de ${nomes(ramo.filhos)}`;
      marca.setAttribute('aria-label', marca.title);
      marca.style.transform = `translate(${ancoraX - 22}px, ${baseY + 6}px)`;
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
      const cabecalho = 30;
      // O cartão abre para o lado de fora do casal, como os irmãos: o ramo da irmã de quem está à
      // esquerda no casal abre para a esquerda, o do irmão de quem está à direita, para a direita
      const daLinha = desenho.pessoas.find((l) => ramo.pais.every((p) => dados.filiacoes.some((f) => f.filho === l.id && f.responsavel === p && !f.consideracao)));
      const par = daLinha && casaisVisiveis.map((c) => (c.a === daLinha.id ? c.b : c.b === daLinha.id ? c.a : '')).map((id) => lugarDe.get(id)).find((l) => l && l.y === daLinha.y);
      const lado = !daLinha || !par ? 0 : par.x > daLinha.x ? -1 : 1;
      const largura = arvoreDoRamo.largura + folga * 2;
      const altura = arvoreDoRamo.altura + folga * 2 + cabecalho;
      let esquerda = lado < 0 ? ancoraX + 60 - largura : lado > 0 ? ancoraX - 60 : ancoraX - largura / 2;
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
      const texto = document.createElement('span');
      texto.textContent = `Ramo de ${nomes(ramo.filhos)}`;
      const fechar = Object.assign(document.createElement('button'), { type: 'button', textContent: '×' });
      fechar.dataset.ramo = ramo.chave;
      fechar.setAttribute('aria-label', 'Recolher este ramo');
      titulo.append(texto, fechar);
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
      const barra = -cabecalho / 2 - 4;
      let ligacao = `M ${ancoraNoRamo} ${baseY + 32 - conteudoY} V ${barra} M ${Math.min(ancoraNoRamo, ...xs)} ${barra} H ${Math.max(ancoraNoRamo, ...xs)}`;
      for (const x of xs) ligacao += ` M ${x} ${barra} V 0`;
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
      camada.append(cartao);
      extras.push(cartao);
    }

    // 5. Quem não tem laço nenhum com ninguém
    const comLaco = new Set([...dados.filiacoes.flatMap((f) => [f.filho, f.responsavel]), ...dados.casais.flatMap((c) => [c.a, c.b]), ...dados.coracao.flatMap((l) => [l.dono, l.pessoa])]);
    const fora = [...visiveis].filter((id) => !comLaco.has(id));
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
    const mudouCentro = (evento.target as HTMLElement).getAttribute('name') === 'centro';
    estado.centro = campo<HTMLSelectElement>('centro').value;
    if (mudouCentro) {
      // Trocar o centro fecha os ramos, que eram da linha anterior
      estado.ramos.clear();
      if (estado.centro) estado.foco = estado.centro;
    }
    estado.nucleo = campo<HTMLSelectElement>('nucleo').value;
    for (const nome of CHAVES) estado[nome] = campo<HTMLInputElement>(nome).checked;
    if (!estado.nucleo) estado.outros = true;
    refletirNosControles();
    guardarNoEndereco();
    desenhar();
    // Trocar o centro ou um filtro mostra o resultado inteiro
    verTudo();
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
    const doRamo = (evento.target as HTMLElement).closest<HTMLButtonElement>('button[data-ramo]');
    if (doRamo) {
      // Abre ou recolhe um ramo lateral, sem mexer na árvore principal
      const chave = doRamo.dataset.ramo!;
      if (!estado.ramos.delete(chave)) estado.ramos.add(chave);
      guardarNoEndereco();
      desenhar();
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
    if (!no || no.dataset.id === estado.foco) return;
    evento.preventDefault();
    focar(no.dataset.id!);
  });

  // "Partir desta pessoa", na ficha: a linha direta passa a ser a dela
  ficha.addEventListener('click', (evento) => {
    const botao = (evento.target as HTMLElement).closest<HTMLButtonElement>('[data-partir]');
    if (!botao) return;
    estado.centro = botao.dataset.partir!;
    estado.ramos.clear();
    refletirNosControles();
    guardarNoEndereco();
    desenhar();
    verTudo();
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
