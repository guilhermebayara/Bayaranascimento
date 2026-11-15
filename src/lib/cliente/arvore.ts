// A árvore interativa. Funciona como um mapa: arrasta, aproxima, afasta, e se
// reorganiza com animação quando o foco ou os filtros mudam, sem recarregar a página.
import { MEDIDAS, arredondado, desenharArvore, type Desenho } from '../arvore-desenho';
import { montarDesenho, type DadosDaArvore, type Estado } from '../arvore-montagem';

export type { DadosDaArvore };

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
  // Depois de abrir um ramo, o mapa anda o mínimo para o cartão e a origem dele caberem na tela
  const mostrarCartao = (chave: string) => {
    const cartao = camada.querySelector<HTMLElement>(`[data-ramo-aberto="${CSS.escape(chave)}"]`);
    const marca = camada.querySelector<HTMLElement>(`button.no__ramo[data-ramo="${CSS.escape(chave)}"]`);
    if (!cartao || !marca) return;
    const posicao = (el: HTMLElement) => el.style.transform.match(/-?[\d.]+/g)!.map(Number);
    const [cx, cy] = posicao(cartao);
    const [, my] = posicao(marca);
    // Da linha dos avós (um pouco acima da marca) até o pé do cartão, com uma margem
    const topo = my - MEDIDAS.altura - 40;
    const caixa = { x: cx - 24, y: topo, w: cartao.offsetWidth + 48, h: cy + cartao.offsetHeight + 24 - topo };
    const z = vista.zoom;
    const ajuste = (inicio: number, tamanho: number, tela: number, atual: number) => {
      const a = atual + inicio * z;
      const b = a + tamanho * z;
      if (tamanho * z > tela) return atual - a;
      if (a < 0) return atual - a;
      if (b > tela) return atual - (b - tela);
      return atual;
    };
    vista.x = ajuste(caixa.x, caixa.w, mapa.clientWidth, vista.x);
    vista.y = ajuste(caixa.y, caixa.h, mapa.clientHeight, vista.y);
    aplicarVista(true);
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
    // 1 e 2. Quem aparece, em que geração, e o desenho (em src/lib/arvore-montagem.ts)
    const { desenho: novo, principal, coracao, lacosDe, ramos, abertos, filiacoesVisiveis, casaisVisiveis, geracoes, agregados, noNucleo, visiveis } = montarDesenho(dados, estado, ladoDe);
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
      if (aberto || !daLinha || !descida) {
        // Aberto (como no Figma): a marca fica logo abaixo do casal, no tronco, e a linha segue dela até o cartão
        marca.style.transform = `translate(${ancoraX - 22}px, ${baseY + 6}px)`;
      } else {
        // Recolhido (como no FigJam): a marca ocupa o lugar de mais um filho, ao lado de quem está na
        // linha direta, e a linha dos pais se divide até ela. Assim fica claro que são mais filhos.
        // Mais de um ramo ao lado da mesma pessoa (filhos do casal e filhos de um dos dois com outra
        // pessoa): cada marca ganha o lugar seguinte, para fora
        const vaga = (vagas.get(daLinha.id) ?? 0) + 1;
        vagas.set(daLinha.id, vaga);
        const x = daLinha.x + MEDIDAS.largura / 2 + (lado || 1) * vaga * (MEDIDAS.largura + MEDIDAS.vaoX);
        const topo = descida.barra + 14;
        marca.style.transform = `translate(${x - 22}px, ${topo}px)`;
        const galho = document.createElementNS(SVG, 'path');
        galho.setAttribute('d', arredondado([[descida.x, descida.y], [descida.x, descida.barra], [x, descida.barra], [x, topo]]));
        galho.setAttribute('class', 'linha linha--filhos');
        galho.dataset.de = ramo.pais.join(' ');
        svg.append(galho);
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
      const cabecalho = 30;
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
      // Do Figma: a linha sai da marca, corre por fora do cartão, logo acima dele, e só entra
      // no cartão em cima de cada filho do ramo. Assim ela não cruza o título nem a árvore.
      const daMarca = baseY + 32 - conteudoY;
      const corredor = (daMarca + topo - conteudoY) / 2;
      const ligacao = xs.map((x) => arredondado([[ancoraNoRamo, daMarca], [ancoraNoRamo, corredor], [x, corredor], [x, 0]], 8)).join(' ');
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
      const abrindo = !estado.ramos.delete(chave);
      if (abrindo) estado.ramos.add(chave);
      guardarNoEndereco();
      desenhar();
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
