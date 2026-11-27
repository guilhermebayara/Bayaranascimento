// Provas manuais de MEM-14. Use um servidor de desenvolvimento com o banco de exemplo descartável.
// node scripts/qa-homologa-2026-11-27.mjs http://127.0.0.1:43815 leitura|repositorio|escrita|copia|espelho
// A opção espelho troca o conteúdo do banco local. Rode por último.
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { MARCA_DO_ACERVO, baixarCopiaEmPartes } from '../src/lib/copia-em-partes.ts';
import { restaurarCopia } from '../testes/apoio/restaurar.ts';

const base = new URL(process.argv[2] ?? 'http://127.0.0.1:43815');
const modo = process.argv[3] ?? 'leitura';
if (base.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(base.hostname) || base.pathname !== '/' || !base.port) {
  throw new Error('Informe um servidor de desenvolvimento no loopback.');
}
const pasta = new URL('../.wrangler/state/v3/d1/miniflare-D1DatabaseObject/', import.meta.url);
const arquivos = readdirSync(pasta).filter((nome) => /^[a-f0-9]{64}\.sqlite$/.test(nome));
if (arquivos.length !== 1) throw new Error('Abra o servidor com um único banco D1 local na worktree antes de rodar.');
const db = new DatabaseSync(new URL(arquivos[0], pasta), { readOnly: true });
const linhas = (sql, ...args) => db.prepare(sql).all(...args);
if (!linhas("SELECT id FROM integrantes WHERE id = 'ex-bia'").length) throw new Error('Só o banco de exemplo.');

const pedir = (caminho, pessoa = 'gui', opcoes = {}) => {
  if (!caminho.startsWith('/') || caminho.startsWith('//')) throw new Error('Use um caminho local.');
  return fetch(new URL(caminho, base), {
    redirect: 'manual',
    ...opcoes,
    headers: { Cookie: `como=${pessoa}`, ...opcoes.headers },
  });
};
const json = (rota, dados, pessoa) => pedir(`/api/${rota}`, pessoa, {
  method: 'POST', headers: { Origin: base.origin, 'Content-Type': 'application/json' }, body: JSON.stringify(dados),
});
const form = (rota, dados, pessoa) => pedir(`/api/${rota}`, pessoa, {
  method: 'POST', headers: { Origin: base.origin },
  body: dados instanceof FormData ? dados : new URLSearchParams(dados),
});
const resumo = async (r) => {
  const location = r.headers.get('location');
  const tipo = r.headers.get('content-type') ?? '';
  const corpo = tipo.includes('json') ? await r.json() : null;
  return { status: r.status, location, erro: corpo?.erro, dados: corpo };
};
const passo = (nome, observado) => console.log(JSON.stringify({ nome, observado }));
const relatorio = (r) => ({ status: r.status, location: r.location, erro: r.erro });
const idDaUrl = (url) => /\/memorias\/([^#?]+)/.exec(url ?? '')?.[1] ?? new URL(url, base).searchParams.get('id');
const pessoas = ['gui', 'elizete', 'giovanna', 'lucas-magno'];
const sufixo = randomUUID().slice(0, 8);
const ficha = (nome) => ({
  titulo: `QA MEM14 ${nome} ${sufixo}`, ano: 2026, tipo: 'cotidiano', situacao: 'publicada',
  visibilidade: 'todos', pessoas: ['gui'], nucleos: ['bayara-nascimento'],
});

async function criar(nome, extra = {}) {
  const r = await resumo(await json('memorias', { ...ficha(nome), ...extra }));
  if (!r.dados?.url) throw new Error(JSON.stringify(r));
  return idDaUrl(r.dados.url);
}

async function anexo(rota, campo, caminho, tipo, pessoa = 'gui', memoria = '') {
  const dados = new FormData();
  const arquivo = new URL(caminho, import.meta.url);
  dados.set(campo, new Blob([readFileSync(arquivo)], { type: tipo }), arquivo.pathname.split('/').at(-1));
  if (memoria) dados.set('memoria', memoria);
  return resumo(await form(rota, dados, pessoa));
}

async function leitura() {
  const memorias = linhas('SELECT id, titulo, situacao, visibilidade, criada_por, excluida_em FROM memorias ORDER BY id');
  const membros = linhas("SELECT integrante_id, nucleo_id FROM nucleo_membros WHERE papel = 'membro'");
  const publicos = linhas('SELECT memoria_id, nucleo_id FROM memoria_nucleos');
  const vinculos = linhas('SELECT memoria_id, integrante_id FROM memoria_integrantes');
  const perfis = linhas('SELECT id FROM integrantes WHERE excluida_em IS NULL');
  const capitulos = linhas('SELECT id FROM capitulos WHERE excluido_em IS NULL');
  const temas = linhas('SELECT id FROM temas');
  const espera = linhas("SELECT id, memoria_id, registrado_por, so_para_nucleos, texto FROM relatos WHERE so_para_nucleos IS NOT NULL AND so_para_nucleos <> '' AND situacao = 'publicada'");
  const prefere = (pessoa, memoria) => memoria.excluida_em === null &&
    (memoria.situacao === 'rascunho' ? memoria.criada_por === pessoa :
      memoria.visibilidade === 'todos' || publicos.some((p) => p.memoria_id === memoria.id &&
        membros.some((m) => m.integrante_id === pessoa && m.nucleo_id === p.nucleo_id)));
  const ordem = (html) => JSON.parse(/data-ordem-da-tv[^>]*>([^<]+)/.exec(html)?.[1] ?? '[]');
  const chavesDaLinha = (html) => [...new Set([...html.matchAll(/data-chave="m:([a-z0-9-]+)"/g)].map((m) => m[1]))];
  const ids = (html) => [...new Set([...html.matchAll(/href="\/memorias\/([a-z0-9-]+)(?=[#"?/])/g)].map((m) => m[1]))];
  const ocorreu = [];
  const conferir = (pessoa, onde, esperado, obtido) => {
    if (JSON.stringify(esperado) !== JSON.stringify(obtido)) ocorreu.push({ pessoa, onde, esperado, obtido });
  };
  const checarIds = (pessoa, onde, achados, conjunto, exato = false) => {
    const faltou = exato ? conjunto.filter((id) => !achados.includes(id)) : [];
    const sobrou = achados.filter((id) => !conjunto.includes(id));
    if (faltou.length || sobrou.length) ocorreu.push({ pessoa, onde, faltou, sobrou });
  };

  for (const pessoa of pessoas) {
    const troca = await pedir(`/como/${pessoa}?volta=/explorar`);
    conferir(pessoa, 'Ver como', [303, '/explorar', `como=${pessoa}`],
      [troca.status, troca.headers.get('location'), troca.headers.get('set-cookie')?.split(';')[0]]);
    const visiveis = memorias.filter((m) => prefere(pessoa, m));
    const publicados = visiveis.filter((m) => m.situacao === 'publicada').map((m) => m.id);
    const comRascunhos = visiveis.map((m) => m.id);
    const sala = visiveis.filter((m) => m.situacao === 'publicada' && m.visibilidade === 'todos').map((m) => m.id);
    const diretos = [];
    for (const m of memorias) {
      const r = await pedir(`/memorias/${m.id}`, pessoa);
      const html = await r.text();
      conferir(pessoa, `/memorias/${m.id}`,
        !prefere(pessoa, m) ? 404 : m.situacao === 'rascunho' ? 302 : 200, r.status);
      if (r.status === 200 || r.status === 302) diretos.push(m.id);
      for (const relato of espera.filter((v) => v.memoria_id === m.id && r.status === 200)) {
        const nucleos = JSON.parse(relato.so_para_nucleos);
        const ve = relato.registrado_por === pessoa || membros.some((v) => v.integrante_id === pessoa && nucleos.includes(v.nucleo_id));
        const trecho = relato.texto.trim().match(/[\p{L}0-9 ]{12,}/u)?.[0].slice(0, 36).trim();
        if (trecho) conferir(pessoa, `relato ${relato.id} em ${m.id}`, ve, html.includes(trecho));
      }
      const palco = await pedir(`/explorar/palco?m=${m.id}`, pessoa);
      conferir(pessoa, `palco ${m.id}`, publicados.includes(m.id) ? 200 : 404, palco.status);
      const palcoSala = await pedir(`/explorar/palco?sala=1&m=${m.id}`, pessoa);
      conferir(pessoa, `sala ${m.id}`, sala.includes(m.id) ? 200 : 404, palcoSala.status);
      for (const relato of espera.filter((v) => v.memoria_id === m.id)) {
        const corpo = await palcoSala.text();
        const trecho = relato.texto.trim().match(/[\p{L}0-9 ]{12,}/u)?.[0].slice(0, 36).trim();
        if (trecho) conferir(pessoa, `trecho de relato em espera no palco ${m.id}`, false, corpo.includes(trecho));
      }
    }
    for (const [caminho, permitidos, extrair, exato] of [
      ['/explorar?ver=tv', publicados, ordem, true],
      ['/explorar?ver=tv&sala=1', sala, ordem, true],
      ['/explorar?ver=lista', comRascunhos, chavesDaLinha, true],
      ['/explorar?ver=mural', publicados, ids, false],
      ['/explorar', comRascunhos, chavesDaLinha, true],
      ['/tudo', publicados, ids, false],
      ['/capitulos', publicados, ids, false],
      ['/pessoas', publicados, ids, false],
      ['/conta', comRascunhos, ids, false],
      ['/', publicados, ids, false],
      ['/carta', publicados, ids, false],
      ...perfis.map(({ id }) => [`/pessoas/${id}`, comRascunhos, ids, false]),
      ...capitulos.map(({ id }) => [`/capitulos/${id}`, publicados, ids, false]),
      ...temas.map(({ id }) => [`/temas/${id}`, publicados, ids, false]),
    ]) {
      const r = await pedir(caminho, pessoa);
      if (r.status >= 500) ocorreu.push({ pessoa, onde: caminho, status: r.status });
      if (r.status === 200) checarIds(pessoa, caminho, extrair(await r.text()), permitidos.filter((id) => diretos.includes(id)), exato);
    }
    for (const { id } of perfis) {
      const r = await pedir(`/explorar?ver=tv&pessoa=${id}`, pessoa);
      if (r.status === 200 && (await pedir(`/pessoas/${id}`, pessoa)).status === 200) {
        checarIds(pessoa, `TV da pessoa ${id}`, ordem(await r.text()),
          publicados.filter((m) => vinculos.some((v) => v.memoria_id === m && v.integrante_id === id)), true);
      }
    }
    for (const m of memorias.filter((v) => v.visibilidade !== 'todos' || v.situacao !== 'publicada' || v.excluida_em !== null)) {
      for (const rota of ['/busca', '/busca/resultado', '/explorar']) {
        const r = await pedir(`${rota}?q=${encodeURIComponent(m.titulo)}`, pessoa);
        const corpo = await r.text();
        checarIds(pessoa, `${rota} q=${m.id}`, ids(corpo), publicados);
        if (publicados.includes(m.id) && rota !== '/explorar' && !ids(corpo).includes(m.id)) {
          ocorreu.push({ pessoa, onde: `${rota} q=${m.id}`, faltou: [m.id] });
        }
      }
    }
    for (const dia of [23, 24, 25, 26, 27]) {
      const html = await (await pedir(`/?hoje=2026-12-${dia}`, pessoa)).text();
      conferir(pessoa, `cartão da sala em 2026-12-${dia}`, dia >= 24 && dia <= 26, html.includes('id="porta-da-sala"'));
    }
    const admin = pessoa !== 'elizete';
    for (const rota of ['/api/copia', '/api/copia?tabela=integrantes', '/api/copia-para-o-espelho', '/admin/espelho']) {
      conferir(pessoa, rota, admin ? 200 : rota.startsWith('/api') ? 403 : 404, (await pedir(rota, pessoa)).status);
    }
    passo(pessoa, { detalhesVisiveis: diretos.length, publicadas: publicados.length, tvDaSala: sala.length, totalDoBanco: memorias.length });
  }
  passo('divergências da matriz de leitura', ocorreu);
}

async function repositorio() {
  const pastaDoProjeto = fileURLToPath(new URL('../', import.meta.url));
  globalThis.qaMem14 = { AMBIENTE: 'previa' };
  try {
    const compilado = await build({
      stdin: {
        contents: `export * from './src/lib/servidor/repositorio.ts';
          export { resumoDoCapitulo } from './src/lib/capitulos.ts';
          export { ComandoDeTeste } from './testes/apoio/d1.ts';`,
        resolveDir: pastaDoProjeto,
      },
      bundle: true, write: false, format: 'esm', platform: 'node',
      define: { 'import.meta.env.DEV': 'false' },
      plugins: [{
        name: 'd1-local-qa',
        setup(b) {
          b.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: 'workers', namespace: 'qa' }));
          b.onLoad({ filter: /^workers$/, namespace: 'qa' }, () => ({ contents: 'export const env = globalThis.qaMem14' }));
        },
      }],
    });
    const repo = await import(`data:text/javascript;base64,${Buffer.from(compilado.outputFiles[0].text).toString('base64')}`);
    globalThis.qaMem14.DB = {
      prepare: (sql) => new repo.ComandoDeTeste(db, sql),
      batch: async (comandos) => comandos.map((c) => c.executar()),
    };
    const ids = linhas('SELECT id FROM memorias ORDER BY id').map((m) => m.id);
    const perfis = linhas('SELECT id AS pessoa, nome, admin FROM integrantes WHERE excluida_em IS NULL');
    perfis.push({ pessoa: ':sala', nome: 'Visitante da sala', admin: 0 });
    const divergencias = [];
    for (const perfil of perfis) {
      const usuario = {
        ...perfil, admin: Boolean(perfil.admin),
        nucleos: linhas("SELECT nucleo_id FROM nucleo_membros WHERE integrante_id = ? AND papel = 'membro'", perfil.pessoa).map((n) => n.nucleo_id),
      };
      const daLista = await repo.listarMemorias(usuario, { comRascunhos: true });
      const diretas = (await Promise.all(ids.map((id) => repo.obterMemoria(usuario, id)))).filter(Boolean);
      const porId = new Map(diretas.map((m) => [m.id, m]));
      const naLista = new Map(daLista.map((m) => [m.id, m]));
      for (const id of ids) {
        if (JSON.stringify(porId.get(id)) !== JSON.stringify(naLista.get(id))) divergencias.push([perfil.pessoa, 'ficha/lista', id]);
      }
      const publicadas = diretas.filter((m) => m.situacao === 'publicada');
      const contagens = await repo.contarMemoriasPorPessoa(usuario);
      for (const { pessoa } of perfis) {
        const esperado = publicadas.filter((m) => m.integrantes.includes(pessoa)).length;
        if ((contagens.get(pessoa) ?? 0) !== esperado) divergencias.push([perfil.pessoa, 'contagem da pessoa', pessoa]);
      }
      const capitulos = await repo.listarCapitulos(usuario);
      const resumos = await repo.resumosDosCapitulos(usuario, capitulos);
      for (const c of capitulos) {
        const ms = await repo.memoriasDoCapitulo(usuario, c, capitulos);
        const resumo = repo.resumoDoCapitulo(c, capitulos, publicadas);
        const obtido = resumos.get(c.id);
        if (ms.some((m) => !publicadas.some((p) => p.id === m.id))) divergencias.push([perfil.pessoa, 'lista do capítulo', c.id]);
        if (obtido.memorias !== resumo.memorias || obtido.periodo !== resumo.periodo || ms.length !== resumo.memorias) {
          divergencias.push([perfil.pessoa, 'período/contagem do capítulo', c.id]);
        }
      }
    }
    passo('comparação direta com obterMemoria', { perfis: perfis.length, memorias: ids.length, divergencias });
  } finally {
    delete globalThis.qaMem14;
  }
}

async function escrita() {
  const inicial = ficha('ficha');
  const id = await criar('ficha', { relato: { por: 'gui', texto: 'Relato inicial do QA.' } });
  passo('memória com relato', { id, relato: linhas('SELECT texto, situacao FROM relatos WHERE memoria_id = ?', id) });
  const foto = await anexo('fotos', 'foto', '../exemplos/fotos/chico-1.jpg', 'image/jpeg');
  const fotoAlheia = await anexo('fotos', 'foto', '../exemplos/fotos/chico-2.jpg', 'image/jpeg', 'elizete');
  const idFoto = foto.dados?.id;
  const fotos = [{ id: idFoto, legenda: 'Legenda inicial' }];
  const anexar = async (fs) => resumo(await json('acrescentar-fotos', { memoria: id, fotos: fs }));
  passo('foto de outra pessoa', relatorio(await anexar([{ id: fotoAlheia.dados?.id }])));
  passo('acrescentar foto e repetir', [relatorio(await anexar(fotos)), relatorio(await anexar(fotos))]);
  const voz = await anexo('audios', 'audio', '../exemplos/audios/vo-bela-canja.m4a', 'audio/mp4', 'gui', id);
  const idAudio = voz.dados?.id;
  const f = { ...inicial, id, fotos: [{ ...fotos[0], principal: true, legenda: 'Legenda nova' }], fotosMostradas: [idFoto] };
  const editar = async (dados) => resumo(await json('memorias', { ...f, ...dados }));
  passo('enviar mídia, trocar a legenda pela ficha e salvar relato', [
    relatorio(voz), relatorio(await editar({})),
    relatorio(await resumo(await json('relatos', { memoria: id, por: 'gui', mensagens: [{ tipo: 'texto', texto: 'Texto salvo depois da ficha.' }, { tipo: 'audio', audioId: idAudio }] }))),
    linhas('SELECT legenda FROM fotos WHERE id = ?', idFoto),
    linhas('SELECT relato_id FROM audios WHERE id = ?', idAudio),
  ]);
  const relato = (campos, pessoa = 'gui') => json('relatos', { memoria: id, por: pessoa, ...campos }, pessoa).then(resumo);
  passo('restringir, narrar no público restrito e reabrir', [
    relatorio(await editar({ visibilidade: 'nucleos' })),
    (await pedir(`/memorias/${id}`, 'lucas-magno')).status,
    relatorio(await relato({ texto: 'Trecho exclusivamente para o público inicial do QA.', publico: 'nucleos:bayara-nascimento' }, 'elizete')),
    relatorio(await editar({ visibilidade: 'todos' })),
    (await pedir(`/memorias/${id}`, 'lucas-magno')).status,
    linhas("SELECT por, so_para_nucleos FROM relatos WHERE memoria_id = ? AND por = 'elizete'", id),
  ]);
  passo('tirar foto e restaurar', [
    relatorio(await editar({ fotos: [] })),
    linhas('SELECT removida_em IS NOT NULL AS removida FROM fotos WHERE id = ?', idFoto),
    relatorio(await resumo(await form('lixeira', { acao: 'restaurar-foto', memoria: id, foto: String(idFoto) }))),
    linhas('SELECT removida_em IS NOT NULL AS removida FROM fotos WHERE id = ?', idFoto),
  ]);
  passo('entradas ruins JSON', [
    relatorio(await resumo(await json('memorias', { ...f, titulo: '' }))),
    relatorio(await resumo(await json('memorias', { ...f, titulo: 'x'.repeat(121) }))),
    relatorio(await resumo(await json('memorias', { ...f, pessoas: Array(61).fill('gui') }))),
    relatorio(await resumo(await json('memorias', { ...f, pessoas: ['qa-pessoa-inexistente'] }))),
    relatorio(await relato({ por: 'elizete', texto: 'Outro autor' })),
    relatorio(await relato({ texto: '', audios: [] })),
    relatorio(await relato({ texto: 'x'.repeat(20001) })),
    relatorio(await anexar([])),
  ]);
  const duzentas = Array.from({ length: 200 }, (_, i) => ({ tipo: 'texto', texto: `Parágrafo número ${i + 1}.` }));
  const quantidade = (m) => linhas('SELECT COUNT(*) AS total FROM relato_mensagens rm JOIN relatos r ON r.id = rm.relato_id WHERE r.memoria_id = ? AND r.por = ?', m, 'gui')[0].total;
  const r200 = await relato({ mensagens: duzentas });
  passo('200 e 201 mensagens JSON', [
    relatorio(r200), r200.dados?.mensagens?.length, relatorio(await relato({ mensagens: [...duzentas, duzentas[0]] })), quantidade(id),
  ]);

  const dados = { titulo: ficha('formulario').titulo, ano: '2026', tipo: 'cotidiano', relatoPor: 'gui', relato: 'Relato inicial sem script.' };
  const rascunho = await resumo(await form('memorias', { ...dados, situacao: 'rascunho' }));
  const idForm = idDaUrl(rascunho.location);
  const publicar = { ...dados, id: idForm, pagina: 'rascunho', situacao: 'publicada', envio: randomUUID() };
  const doisToques = await Promise.all([form('memorias', publicar), form('memorias', publicar)]);
  passo('ficha sem script, rascunho e toque duplo ao publicar', {
    id: idForm, rascunho: relatorio(rascunho), publicar: await Promise.all(doisToques.map(async (r) => relatorio(await resumo(r)))),
    banco: linhas('SELECT situacao FROM memorias WHERE id = ?', idForm),
  });
  const restrita = await resumo(await form('memorias', { ...publicar, relato: '', pagina: 'publicada', envio: randomUUID(), visibilidade: 'nucleos', nucleos: 'bayara-nascimento' }));
  const reaberta = await resumo(await form('memorias', { ...publicar, relato: '', pagina: 'publicada', envio: randomUUID(), visibilidade: 'todos' }));
  passo('formulário restringe e reabre', [relatorio(restrita), relatorio(reaberta), linhas('SELECT visibilidade FROM memorias WHERE id = ?', idForm)]);

  const idLongo = await criar('formulario longo');
  const baseRelato = { memoria: idLongo, por: 'gui', acrescentar: '1', situacao: 'rascunho', publico: 'todos' };
  const anterior = await resumo(await form('relatos', { ...baseRelato, texto: duzentas.slice(0, 199).map((m) => m.texto).join('\n\n'), envio: randomUUID() }));
  const ultima = { ...baseRelato, texto: duzentas.at(-1).texto, envio: randomUUID() };
  const primeira = await resumo(await form('relatos', ultima));
  const repetida = await resumo(await form('relatos', ultima));
  const publicado = await resumo(await form('relatos', { ...baseRelato, texto: '', publicar: '1', situacao: 'publicada', envio: randomUUID() }));
  passo('formulário no limite, repetir o 200º envio e publicar', {
    id: idLongo, anterior: relatorio(anterior), primeira: relatorio(primeira), repetida: relatorio(repetida), publicado: relatorio(publicado), quantidade: quantidade(idLongo),
  });

  const idAbas = await criar('duas abas');
  const mesma = (texto) => json('relatos', { memoria: idAbas, por: 'gui', mensagens: [{ tipo: 'texto', texto }] });
  const concorrencias = [];
  for (let vez = 0; vez < 5; vez++) {
    const respostas = await Promise.all([mesma(`Texto da primeira aba ${vez}.`), mesma(`Texto da segunda aba ${vez}.`)]);
    concorrencias.push(await Promise.all(respostas.map(async (r) => relatorio(await resumo(r)))));
  }
  const formAbas = (texto) => form('relatos', { ...baseRelato, memoria: idAbas, texto, situacao: 'publicada', envio: randomUUID() });
  const ambas = await Promise.all([formAbas('Mais uma lembrança.'), formAbas('Mais outra lembrança.')]);
  passo('duas abas da mesma pessoa', {
    id: idAbas, concorrencias, formularios: await Promise.all(ambas.map(async (r) => relatorio(await resumo(r)))),
    banco: linhas('SELECT texto FROM relatos WHERE memoria_id = ?', idAbas),
  });

  const lixeira = (acao, mid) => form('lixeira', { acao, memoria: mid }).then(resumo);
  const excluida = await lixeira('excluir', idForm);
  const antes = linhas('SELECT COUNT(*) AS n FROM memorias')[0].n;
  const jsonExcluida = await resumo(await json('memorias', { ...ficha('ficha aberta'), id: idForm }));
  const formExcluida = await resumo(await form('memorias', { ...dados, titulo: ficha('ficha aberta').titulo, relato: '', id: idForm, pagina: 'publicada', situacao: 'publicada', envio: randomUUID() }));
  const depois = linhas('SELECT COUNT(*) AS n FROM memorias')[0].n;
  passo('lixeira e envio tardio da ficha aberta antes de excluir', {
    id: idForm, excluir: relatorio(excluida), json: relatorio(jsonExcluida), formulario: relatorio(formExcluida), antes, depois,
    restaurar: relatorio(await lixeira('restaurar-excluida', idForm)),
  });
}

async function copia() {
  const indice = await (await pedir('/api/copia')).json();
  let id;
  let passadas = 0;
  const obter = async (url) => {
    const pedido = new URL(url, base);
    if (pedido.pathname === '/api/copia' && !pedido.search) passadas++;
    if (!id && pedido.searchParams.get('tabela') === 'relatos') {
      id = await criar('durante a cópia', { relato: { por: 'gui', texto: 'Relato gravado enquanto a cópia estava em andamento.' } });
    }
    const r = await pedir(url);
    if (!r.ok) throw new Error(`Cópia: HTTP ${r.status}`);
    return r.json();
  };
  const resultado = await baixarCopiaEmPartes(obter);
  let restaurado;
  const erroAoRestaurar = await restaurarCopia(db, resultado, (novo) => {
    restaurado = {
      memoria: novo.prepare('SELECT id FROM memorias WHERE id = ?').get(id),
      relato: novo.prepare('SELECT texto FROM relatos WHERE memoria_id = ?').get(id),
      falhasDeChave: novo.prepare('PRAGMA foreign_key_check').all().length,
      buscaReconstruida: novo.prepare('SELECT COUNT(*) AS n FROM busca_textos WHERE memoria_id = ?').get(id).n,
    };
    novo.close();
  });
  passo('cópia durante escrita', {
    passadas, id, tabelas: indice.indice.map((t) => t.tabela), erroAoRestaurar, restaurado,
  });
  return resultado;
}

async function espelho() {
  const arquivo = await (await pedir('/api/copia-para-o-espelho')).json();
  const enviar = (dados) => {
    const corpo = new FormData();
    corpo.append('copia', new Blob([JSON.stringify(dados)], { type: 'application/json' }), 'qa.json');
    return form('espelho', corpo).then(resumo);
  };
  const sentinela = await criar('fora do espelho');
  const recusada = await enviar({ acervo: MARCA_DO_ACERVO, tabelas: { memorias: [] } });
  const tabelaExtra = await enviar({ ...arquivo, tabelas: { ...arquivo.tabelas, memorias: [] } });
  const colunaExtra = await enviar({ ...arquivo, tabelas: { ...arquivo.tabelas, integrantes: [{ ...arquivo.tabelas.integrantes[0], sobre: 'Texto de QA' }] } });
  const antes = linhas('SELECT COUNT(*) AS n FROM memorias WHERE id = ?', sentinela)[0].n;
  const refeita = await enviar(arquivo);
  passo('espelho aplicado por último', {
    tabelas: Object.keys(arquivo.tabelas), colunasDaPessoa: Object.keys(arquivo.tabelas.integrantes[0]),
    recusada: relatorio(recusada), tabelaExtra: relatorio(tabelaExtra), colunaExtra: relatorio(colunaExtra), antes,
    refeita: relatorio(refeita), depois: linhas('SELECT COUNT(*) AS n FROM memorias WHERE id = ?', sentinela)[0].n,
    sobre: linhas("SELECT COUNT(*) AS n FROM integrantes WHERE COALESCE(sobre, '') <> ''")[0].n,
  });
}

try {
  const rodadas = { leitura, repositorio, escrita, copia, espelho };
  if (!Object.hasOwn(rodadas, modo)) throw new Error('Use leitura, repositorio, escrita, copia ou espelho.');
  await rodadas[modo]();
} finally {
  db.close();
}
