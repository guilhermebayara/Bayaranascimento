// A troca sem recarregar do Explorar (docs/visual.md, "Movimento que mostra o que mudou").
//
// Cada item tem identidade própria (`data-chave`: "m:<id>" para a memória, "a:<ano>" para o ano da
// linha do tempo, "d:<década>" para o cartão do mural). Numa troca, os que continuam na tela se
// movem do lugar antigo ao novo; os que saem somem onde estão e os que entram aparecem no lugar
// deles, com um movimento curto. A rolagem fica presa ao que a pessoa estava olhando: a mesma
// memória continua no mesmo ponto da tela ou, se ela saiu, a do ano mais próximo.
//
// A técnica é FLIP, com a Web Animations API: mede antes, troca, mede depois e anima a diferença.
// Foi a escolha no lugar das View Transitions com um nome por memória porque funciona em todo
// Safari do iPhone, anima só o que está perto da tela e deixa cada item seguir o próprio caminho.
// Com movimento reduzido, a troca é direta: só a rolagem é devolvida.
import { anoMaisProximo } from '../explorar';

const REGIAO = '[data-explorar]';
/** Abaixo disto, no alto da tela, ficam a faixa de décadas e o ano parados */
const TOPO = 110;
const MOVE = { duration: 460, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' } as const;
const ENTRA = { duration: 260, delay: 120, easing: 'ease-out', fill: 'backwards' } as const;
const SAI = { duration: 200, easing: 'ease-in', fill: 'forwards' } as const;

interface Medida {
  no: HTMLElement;
  caixa: DOMRect;
  /** a foto revelada do item: é ela que viaja quando a forma de ver muda */
  foto: DOMRect | null;
  tipo: string;
}
interface Ancora {
  chave: string;
  ano: number;
  topo: number;
}

const itens = (regiao: ParentNode) => [...regiao.querySelectorAll<HTMLElement>('[data-chave]')];
const tipoDe = (no: HTMLElement) =>
  no.classList.contains('entrada') ? 'entrada' : no.classList.contains('ano__cabeca') ? 'ano' : no.classList.contains('lista__item') ? 'lista' : no.classList.contains('lista__cabeca') ? 'ano-da-lista' : 'mural';
const pertoDaTela = (c: DOMRect) => c.width > 0 && c.bottom > -innerHeight * 0.6 && c.top < innerHeight * 1.6;
const calmo = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** O que a pessoa está olhando: a primeira memória abaixo do que fica parado no alto. */
function acharAncora(regiao: HTMLElement): Ancora | null {
  // Com os controles ainda na tela, a pessoa está no alto da página: a rolagem fica como está
  const controles = regiao.querySelector('.controles');
  if (controles && controles.getBoundingClientRect().bottom > TOPO) return null;
  for (const no of itens(regiao)) {
    if (!no.dataset.chave!.startsWith('m:')) continue;
    const caixa = no.getBoundingClientRect();
    if (caixa.height > 0 && caixa.bottom > TOPO) return { chave: no.dataset.chave!, ano: Number(no.dataset.ano), topo: caixa.top };
  }
  return null;
}

/** Devolve a rolagem: a mesma memória no mesmo ponto da tela, ou a do ano mais próximo. */
function devolverRolagem(regiao: HTMLElement, ancora: Ancora | null) {
  if (!ancora) return;
  const memorias = itens(regiao).filter((no) => no.dataset.chave!.startsWith('m:'));
  let alvo = memorias.find((no) => no.dataset.chave === ancora.chave);
  if (!alvo) {
    const ano = anoMaisProximo(memorias.map((no) => Number(no.dataset.ano)), ancora.ano);
    alvo = memorias.find((no) => Number(no.dataset.ano) === ano);
  }
  if (alvo) scrollBy({ top: alvo.getBoundingClientRect().top - ancora.topo, behavior: 'instant' });
}

function medir(regiao: HTMLElement): Map<string, Medida> {
  const medidas = new Map<string, Medida>();
  for (const no of itens(regiao)) {
    const caixa = no.getBoundingClientRect();
    if (!pertoDaTela(caixa)) continue;
    // Na lista, a foto fica escondida: sem tamanho, não há de onde ela viajar
    const foto = no.querySelector('.monte')?.getBoundingClientRect();
    medidas.set(no.dataset.chave!, { no, caixa, foto: foto && foto.width > 0 ? foto : null, tipo: tipoDe(no) });
  }
  return medidas;
}

/** A foto que já estava carregada continua sendo a mesma: sem piscar durante o movimento. */
function manterFotos(antes: Map<string, Medida>, nova: HTMLElement) {
  for (const no of itens(nova)) {
    const velha = antes.get(no.dataset.chave!)?.no.querySelector<HTMLImageElement>('.polaroid__foto img');
    const novaFoto = no.querySelector<HTMLImageElement>('.polaroid__foto img');
    if (velha && novaFoto && velha.getAttribute('src') === novaFoto.getAttribute('src') && velha.complete) novaFoto.replaceWith(velha);
  }
}

function animar(antes: Map<string, Medida>, nova: HTMLElement) {
  const ficaram = new Set<string>();
  for (const no of itens(nova)) {
    const chave = no.dataset.chave!;
    const de = antes.get(chave);
    const caixa = no.getBoundingClientRect();
    if (de) ficaram.add(chave);
    if (!pertoDaTela(caixa)) continue;
    if (!de) {
      // Entra: aparece no lugar dela
      no.animate([{ opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1 }], ENTRA);
      continue;
    }
    if (de.tipo === tipoDe(no)) {
      // Continua: vai do lugar antigo ao novo (e ao tamanho novo, quando o tamanho das fotos muda)
      const dx = de.caixa.left - caixa.left;
      const dy = de.caixa.top - caixa.top;
      const escala = de.caixa.width / caixa.width;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1 && Math.abs(escala - 1) < 0.01) continue;
      no.animate([{ transformOrigin: '0 0', transform: `translate(${dx}px, ${dy}px) scale(${escala})` }, { transformOrigin: '0 0', transform: 'none' }], MOVE);
      continue;
    }
    // A forma de ver mudou (mural e linha do tempo): a foto viaja de um lugar ao outro, e o resto
    // do item aparece em volta dela
    const foto = no.querySelector<HTMLElement>('.monte');
    const para = foto?.getBoundingClientRect();
    if (foto && para && de.foto && para.width > 0) {
      const escala = de.foto.width / para.width;
      foto.animate(
        [{ transformOrigin: '0 0', transform: `translate(${de.foto.left - para.left}px, ${de.foto.top - para.top}px) scale(${escala})` }, { transformOrigin: '0 0', transform: 'none' }],
        MOVE,
      );
    }
    for (const parte of no.children) if (!foto || !parte.contains(foto)) parte.animate([{ opacity: 0 }, { opacity: 1 }], ENTRA);
  }

  // Saem: somem onde estavam. O item antigo é posto de volta por um instante, por cima, no mesmo
  // ponto da tela, e some. Só quando a forma de ver é a mesma: fora dela ele não teria o estilo dele.
  const mural = nova.querySelector<HTMLElement>('.mural');
  const linha = nova.querySelector<HTMLElement>('.linha');
  const lista = nova.querySelector<HTMLElement>('.lista');
  for (const [chave, de] of antes) {
    if (ficaram.has(chave) || de.caixa.bottom < 0 || de.caixa.top > innerHeight) continue;
    const mesa = de.tipo === 'mural' ? mural : de.tipo === 'lista' || de.tipo === 'ano-da-lista' ? lista : mural || lista ? null : linha;
    if (!mesa) continue;
    const base = mesa.getBoundingClientRect();
    const no = de.no;
    no.removeAttribute('data-chave');
    no.removeAttribute('id');
    no.setAttribute('aria-hidden', 'true');
    no.inert = true;
    Object.assign(no.style, {
      position: 'absolute',
      left: `${de.caixa.left - base.left}px`,
      top: `${de.caixa.top - base.top}px`,
      width: `${de.caixa.width}px`,
      height: `${de.caixa.height}px`,
      margin: '0',
      translate: 'none',
      pointerEvents: 'none',
      zIndex: '2',
    });
    mesa.append(no);
    no.animate([{ opacity: 1, scale: 1 }, { opacity: 0, scale: 0.94 }], SAI).finished.then(() => no.remove(), () => no.remove());
  }
}

export interface Troca {
  /**
   * O controle que a pessoa usou (um seletor que vale na região antiga e na nova). Ele fica no mesmo
   * ponto da tela depois da troca, e o foco do teclado continua nele: mudar um filtro nunca muda a
   * rolagem (correção pedida pelo Gui, 17/11/2026).
   */
  foco?: string;
  /** o endereço entra no histórico (não, quando a troca veio do voltar ou do avançar) */
  empurrar: boolean;
}

let pedido = 0;

/**
 * Busca a página do endereço e troca só a região do Explorar, com o movimento. Qualquer problema
 * cai na navegação comum.
 */
export async function trocar(endereco: URL, { foco, empurrar }: Troca) {
  const regiao = document.querySelector<HTMLElement>(REGIAO);
  if (!regiao) return location.assign(endereco);
  const meu = ++pedido;
  regiao.setAttribute('aria-busy', 'true');
  try {
    const resposta = await fetch(endereco, { headers: { Accept: 'text/html' } });
    if (!resposta.ok) throw new Error(String(resposta.status));
    const pagina = new DOMParser().parseFromString(await resposta.text(), 'text/html');
    const nova = pagina.querySelector<HTMLElement>(REGIAO);
    if (!nova) throw new Error('sem a região');
    // Uma escolha mais nova já saiu: esta resposta chegou atrasada
    if (meu !== pedido) return;

    // Quem usou um controle fica com ele no mesmo ponto da tela. Sem controle (o voltar e o avançar
    // do navegador), a rolagem fica presa à memória que estava no alto.
    const controle = foco ? regiao.querySelector<HTMLElement>(foco) : null;
    const controleEm = controle?.getClientRects().length ? controle.getBoundingClientRect().top : null;
    const ancora = controleEm === null ? acharAncora(regiao) : null;
    const antes = calmo() ? new Map<string, Medida>() : medir(regiao);
    manterFotos(antes, nova);
    // O que estava aberto continua aberto: os filtros não fecham sozinhos a cada escolha
    const abertos = [...regiao.querySelectorAll<HTMLDetailsElement>('.controles details')].map((d) => d.open);
    nova.querySelectorAll<HTMLDetailsElement>('.controles details').forEach((d, i) => {
      if (abertos[i] !== undefined) d.open = abertos[i]!;
    });
    regiao.replaceWith(nova);
    // A cor da tela e a assinatura do rodapé acompanham as famílias escolhidas
    const familia = pagina.documentElement.dataset.familia;
    if (familia) document.documentElement.dataset.familia = familia;
    const rodape = pagina.querySelector('footer.rodape');
    if (rodape) document.querySelector('footer.rodape')?.replaceWith(rodape);
    document.title = pagina.title;
    // A rolagem das trocas é nossa: o navegador não a devolve por conta própria ao voltar. Vale para
    // a entrada do histórico em que se está e para a que nasce agora.
    history.scrollRestoration = 'manual';
    if (empurrar) history.pushState({ explorar: true }, '', endereco);
    history.scrollRestoration = 'manual';
    const controleNovo = foco ? nova.querySelector<HTMLElement>(foco) : null;
    if (controleEm !== null && controleNovo?.getClientRects().length) scrollBy({ top: controleNovo.getBoundingClientRect().top - controleEm, behavior: 'instant' });
    else devolverRolagem(nova, ancora);
    aplicarTamanho();
    document.dispatchEvent(new CustomEvent('explorar:trocou'));
    if (!calmo()) animar(antes, nova);
    controleNovo?.focus({ preventScroll: true });
  } catch {
    // Uma escolha mais nova já saiu: o erro desta não pode levar a pessoa de volta ao endereço antigo
    // (achado do QA de código de 17/11/2026, testes/explorar-troca.test.ts)
    if (meu !== pedido) return;
    location.assign(endereco);
  }
}

// --- O tamanho das fotos do mural ---------------------------------------------------------------
// É preferência de quem está vendo, guardada no aparelho, e não vai para o endereço (decisão do Gui,
// 17/11/2026: no endereço fica só o que traz a pessoa de volta ao mesmo lugar). Sem script, os links
// do controle continuam levando o tamanho no endereço.
const GUARDA_DO_TAMANHO = 'mural-tamanho';
const TAMANHOS_DAS_FOTOS = ['pequenas', 'medias', 'grandes'];

function tamanhoGuardado(): string | null {
  try {
    const guardado = localStorage.getItem(GUARDA_DO_TAMANHO);
    return guardado && TAMANHOS_DAS_FOTOS.includes(guardado) ? guardado : null;
  } catch {
    return null;
  }
}

/** Põe no mural que está na página o tamanho guardado no aparelho, e marca a opção no controle. */
export function aplicarTamanho(tamanho = tamanhoGuardado()) {
  const mural = document.querySelector<HTMLElement>(`${REGIAO} [data-mural]`);
  if (!mural || !tamanho) return;
  mural.dataset.tamanho = tamanho;
  for (const opcao of document.querySelectorAll<HTMLElement>(`${REGIAO} [data-tamanho-das-fotos]`)) {
    if (opcao.dataset.tamanhoDasFotos === tamanho) opcao.setAttribute('aria-current', 'page');
    else opcao.removeAttribute('aria-current');
  }
}

/** Troca o tamanho das fotos no lugar: as fotos vão ao tamanho e ao lugar novos, sem buscar nada. */
function trocarTamanho(opcao: HTMLElement) {
  const regiao = document.querySelector<HTMLElement>(REGIAO);
  const tamanho = opcao.dataset.tamanhoDasFotos;
  if (!regiao || !tamanho) return;
  try {
    localStorage.setItem(GUARDA_DO_TAMANHO, tamanho);
  } catch {
    // sem armazenamento, vale só até sair da página
  }
  const em = opcao.getBoundingClientRect().top;
  const antes = calmo() ? new Map<string, Medida>() : medir(regiao);
  aplicarTamanho(tamanho);
  scrollBy({ top: opcao.getBoundingClientRect().top - em, behavior: 'instant' });
  if (!calmo()) animar(antes, regiao);
}

/** Liga a troca sem recarregar: os links dos controles, o formulário dos filtros e o histórico. */
export function ligarTroca() {
  // A região troca dentro da mesma página: o Explorar e, com as mesmas formas de ver, a página da pessoa
  const daRegiao = (endereco: URL) => endereco.origin === location.origin && endereco.pathname === location.pathname && ['linha', 'mural', 'lista', null].includes(endereco.searchParams.get('ver'));

  document.addEventListener('click', (evento) => {
    const link = evento.target instanceof Element ? evento.target.closest<HTMLAnchorElement>(`${REGIAO} .controles a[href]`) : null;
    if (!link || evento.defaultPrevented || evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    // O tamanho das fotos troca no lugar e não mexe no endereço
    if (link.dataset.tamanhoDasFotos) {
      evento.preventDefault();
      return trocarTamanho(link);
    }
    const endereco = new URL(link.href);
    endereco.searchParams.delete('tamanho');
    // A âncora do link é de quem está sem script: aqui a rolagem já fica no lugar
    endereco.hash = '';
    if (!daRegiao(endereco)) return;
    evento.preventDefault();
    // A mesma opção, no mesmo controle: é o nome dela que não muda de uma página para a outra
    const controle = link.closest('nav')?.getAttribute('aria-labelledby') ?? '';
    const opcao = link.dataset.opcao ?? '';
    trocar(endereco, { empurrar: true, foco: `.controles nav[aria-labelledby="${CSS.escape(controle)}"] a[data-opcao="${CSS.escape(opcao)}"]` });
  });

  // Os filtros valem na hora, a cada escolha, com o painel aberto e sem sair do lugar. O botão
  // "Mostrar memórias" é de quem está sem script: aqui ele some (classe "com-troca", no CSS).
  document.documentElement.classList.add('com-troca');
  aplicarTamanho();
  const enderecoDoFormulario = (formulario: HTMLFormElement) => {
    // O endereço fica só com o que foi escolhido: campo vazio não vai junto
    const endereco = new URL(formulario.action);
    for (const [nome, valor] of new FormData(formulario)) if (nome !== 'tamanho' && typeof valor === 'string' && valor.trim()) endereco.searchParams.append(nome, valor.trim());
    return endereco;
  };
  const doFormulario = (alvo: EventTarget | null) => (alvo instanceof Element ? alvo.closest<HTMLFormElement>(`${REGIAO} [data-filtros]`) : null);

  document.addEventListener('change', (evento) => {
    const formulario = doFormulario(evento.target);
    const campo = evento.target;
    if (!formulario || !(campo instanceof HTMLInputElement || campo instanceof HTMLSelectElement)) return;
    // Ano escrito pela metade ainda não é filtro
    if (campo instanceof HTMLInputElement && campo.type === 'text' && campo.value && !campo.checkValidity()) return;
    const endereco = enderecoDoFormulario(formulario);
    if (!daRegiao(endereco)) return;
    const marcavel = campo instanceof HTMLInputElement && (campo.type === 'checkbox' || campo.type === 'radio');
    trocar(endereco, { empurrar: true, foco: `[data-filtros] [name="${CSS.escape(campo.name)}"]${marcavel ? `[value="${CSS.escape(campo.value)}"]` : ''}` });
  });

  document.addEventListener('submit', (evento) => {
    const formulario = doFormulario(evento.target);
    if (!formulario || evento.target !== formulario) return;
    const endereco = enderecoDoFormulario(formulario);
    evento.preventDefault();
    if (!daRegiao(endereco)) return location.assign(endereco);
    const campo = document.activeElement instanceof HTMLInputElement && formulario.contains(document.activeElement) ? document.activeElement : null;
    trocar(endereco, { empurrar: true, foco: campo ? `[data-filtros] [name="${CSS.escape(campo.name)}"]` : '.filtros > summary' });
  });

  // O voltar e o avançar do aparelho desfazem e refazem a troca, com o mesmo movimento
  let ondeEstava = location.pathname + location.search;
  document.addEventListener('explorar:trocou', () => {
    ondeEstava = location.pathname + location.search;
  });
  addEventListener('popstate', () => {
    const endereco = new URL(location.href);
    // Só a âncora mudou (um link para outra parte da mesma página): não há o que trocar
    if (endereco.pathname + endereco.search === ondeEstava) return;
    ondeEstava = endereco.pathname + endereco.search;
    if (document.querySelector(REGIAO) && daRegiao(endereco)) trocar(endereco, { empurrar: false });
    else location.reload();
  });
  // Ao sair para outra página, a rolagem volta a ser do navegador: o voltar de lá cai no mesmo lugar
  addEventListener('pagehide', () => {
    history.scrollRestoration = 'auto';
  });
}
