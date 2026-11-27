import { describe, expect, it, vi } from 'vitest';
import { textoDasMensagens, type Mensagem } from '../src/lib/conversa';
import { baixarCopiaEmPartes, type IndiceDaCopia } from '../src/lib/copia-em-partes';
import { arrumarTexto } from '../src/lib/servidor/conteudo';
import { abrirBancoDeExemplo } from './apoio/banco-de-exemplo';
import { ComandoDeTeste, temSqlite, type DatabaseSync } from './apoio/d1';
import { restaurarCopia } from './apoio/restaurar';

const env = vi.hoisted(() => ({ AMBIENTE: 'previa', DB: undefined as unknown, FOTOS: undefined as unknown }));
vi.mock('cloudflare:workers', () => ({ env }));

describe.skipIf(!(await temSqlite()))('Relato como conversa em um lote', async () => {
  const { banco, sql, linha, usuarioDe } = await abrirBancoDeExemplo(env);
  const relatos = await import('../src/pages/api/relatos');
  const memorias = await import('../src/pages/api/memorias');
  const lixeira = await import('../src/pages/api/lixeira');
  const copia = await import('../src/pages/api/copia');
  const { noPedido } = await import('../src/lib/servidor/ambiente');
  const gui = usuarioDe('gui');
  const elizete = usuarioDe('elizete');
  const tipos = [{ id: 'cotidiano' }];
  const lote = banco.batch.bind(banco);
  const texto = (texto: string): Mensagem => ({ tipo: 'texto', texto });

  function memoria(id: string) {
    sql("INSERT INTO memorias (id, titulo, ano, tipo, criada_por) VALUES (?, 'Memória de teste', 2001, 'cotidiano', 'gui')", id);
    return id;
  }
  function midias() {
    const audioId = Number(sql("INSERT INTO audios (chave, tipo, tamanho, enviado_por) VALUES ('teste/voz.m4a', 'audio/mp4', 10, 'elizete')").lastInsertRowid);
    const fotoId = Number(sql("INSERT INTO fotos (chave, enviada_por) VALUES ('teste/foto.jpg', 'elizete')").lastInsertRowid);
    return { audio: { tipo: 'audio' as const, audioId }, foto: { tipo: 'foto' as const, fotoId } };
  }
  function relato(id: string, pessoa = 'elizete') {
    return linha<{ id: number; texto: string }>('SELECT id, texto FROM relatos WHERE memoria_id = ? AND por = ?', id, pessoa);
  }
  function mensagens(id: number) {
    return banco.sqlite.prepare('SELECT * FROM relato_mensagens WHERE relato_id = ? ORDER BY ordem').all(id) as {
      id: number; tipo: Mensagem['tipo']; texto: string | null; cita_id: number | null; enviada_em: string;
    }[];
  }
  async function postar(rota: typeof relatos, caminho: string, corpo: Record<string, unknown> | URLSearchParams, usuario = elizete) {
    const form = corpo instanceof URLSearchParams;
    const request = new Request('http://localhost' + caminho, {
      method: 'POST', headers: { Origin: 'http://localhost', ...(form ? {} : { 'Content-Type': 'application/json' }) },
      body: form ? corpo : JSON.stringify(corpo),
    });
    return noPedido(request, () => rota.POST({ request, locals: { usuario, tipos } } as never));
  }

  function conferirRelatos(db: DatabaseSync, id: string) {
    const linhas = db.prepare('SELECT id, texto FROM relatos WHERE memoria_id = ?').all(id) as { id: number; texto: string }[];
    for (const r of linhas) {
      const m = db.prepare(`SELECT m.tipo, m.texto,
        (SELECT 1 FROM audios a WHERE a.id = m.audio_id AND a.relato_id = m.relato_id AND a.removido_em IS NULL) AS audio,
        (SELECT 1 FROM fotos f WHERE f.id = m.foto_id AND f.relato_id = m.relato_id AND f.removida_em IS NULL) AS foto
        FROM relato_mensagens m WHERE relato_id = ? ORDER BY ordem, id`).all(r.id) as { tipo: Mensagem['tipo']; texto?: string; audio: number | null; foto: number | null }[];
      expect(arrumarTexto(textoDasMensagens(m)), `Relato ${r.id} depois da gravação`).toBe(arrumarTexto(r.texto));
      expect(m.filter((f) => f.tipo === 'audio').every((f) => f.audio === 1)).toBe(true);
      expect(m.filter((f) => f.tipo === 'foto').every((f) => f.foto === 1)).toBe(true);
    }
  }
  const grava = (sql: string) => /\b(INSERT INTO|UPDATE|DELETE FROM)\b/i.test(sql);
  async function conferirCadaLote(id: string | (() => string | undefined), fazer: () => Promise<Response>) {
    let escritas = 0;
    const avulsas = (['all', 'first', 'run', 'raw'] as const).map((metodo) => vi.spyOn(ComandoDeTeste.prototype, metodo));
    const exec = vi.spyOn(banco, 'exec');
    banco.batch = async (comandos) => {
      const resultado = await lote(comandos);
      if (comandos.some((c) => grava(c.sql))) escritas++;
      const atual = typeof id === 'function' ? id() : id;
      if (atual) conferirRelatos(banco.sqlite, atual);
      return resultado;
    };
    try {
      const resultado = await fazer();
      expect(escritas).toBe(1);
      for (const metodo of avulsas) expect(metodo.mock.contexts.some((c) => grava((c as ComandoDeTeste).sql))).toBe(false);
      expect(exec).not.toHaveBeenCalled();
      return resultado;
    } finally {
      banco.batch = lote;
      for (const metodo of avulsas) metodo.mockRestore();
      exec.mockRestore();
    }
  }
  const salvar = (id: string, campos: Record<string, unknown>) => postar(relatos, '/api/relatos', { memoria: id, por: 'elizete', ...campos });
  async function gravar(id: string, mensagens: Mensagem[], situacao = 'publicada') {
    const resp = await conferirCadaLote(id, () => salvar(id, { mensagens, situacao }));
    expect([200, 201]).toContain(resp.status);
    return ((await resp.json()) as { mensagens: Mensagem[] }).mensagens;
  }

  it('confere cada lote ao criar, publicar, editar, mover, apagar e acrescentar', async () => {
    const id = memoria('mem8-passos');
    const { audio, foto } = midias();
    sql("INSERT INTO acessos (pessoa) VALUES ('gui') ON CONFLICT DO NOTHING");
    const [a, som, imagem, b] = await gravar(id, [texto('  Um\r\n\r\n\r\nparágrafo.  '), audio, foto, texto('Fim')], 'rascunho');
    expect(linha<{ memoria_id: string | null }>('SELECT memoria_id FROM fotos WHERE id = ?', foto.fotoId).memoria_id).toBeNull();
    await gravar(id, [a, som, imagem, b]);
    expect(linha('SELECT memoria_id, principal FROM fotos WHERE id = ?', foto.fotoId)).toEqual({ memoria_id: id, principal: 1 });
    expect(linha("SELECT para, relato_id FROM avisos WHERE tipo = 'relato-novo' AND memoria_id = ?", id)).toEqual({ para: 'gui', relato_id: relato(id).id });
    const [editada] = await gravar(id, [{ ...a, texto: 'Editada.' }, som, imagem, b]);
    expect(editada.id).toBe(a.id);
    await gravar(id, [b, som, imagem, editada]);
    await gravar(id, [b, imagem, editada]);
    const contar = () => linha<{ n: number }>("SELECT COUNT(*) AS n FROM versoes WHERE tipo = 'relato' AND item_id = ?", String(relato(id).id)).n;
    expect(contar()).toBe(3);
    await gravar(id, [b, imagem, editada, texto('Mais.')]);
    expect(contar()).toBe(3);
  });

  it('confere cada lote para o envio sem script e o envio antigo sem lista', async () => {
    const id = memoria('mem8-formulario');
    const { audio, foto } = midias();
    const campos = new URLSearchParams({ memoria: id, por: 'elizete', texto: 'Sem script.\r\n\r\nOutro parágrafo.', acrescentar: '1', envio: 'mem8-formulario', situacao: 'rascunho' });
    const resp = await conferirCadaLote(id, () => postar(relatos, '/api/relatos', campos));
    expect(resp.status).toBe(303);
    const antiga = await conferirCadaLote(id, () => salvar(id, { texto: 'Texto de formulário antigo.\n\nSegundo parágrafo.', audios: [{ id: audio.audioId }], fotos: [{ id: foto.fotoId }], situacao: 'rascunho' }));
    expect(antiga.status).toBe(200);
    expect(mensagens(relato(id).id).map((m) => m.tipo)).toEqual(['audio', 'texto', 'texto', 'foto']);
    expect(await antiga.json()).not.toHaveProperty('mensagens');
    campos.set('texto', '');
    campos.set('publicar', '1');
    campos.set('situacao', 'publicada');
    await conferirCadaLote(id, () => postar(relatos, '/api/relatos', campos));
    expect(linha('SELECT memoria_id, principal FROM fotos WHERE id = ?', foto.fotoId)).toEqual({ memoria_id: id, principal: 1 });
  });

  it('faz principal a foto que chega com o relato quando outro pedido tira a única foto no meio', async () => {
    const id = memoria('mem8-foto-principal');
    const original = Number(sql("INSERT INTO fotos (chave, enviada_por, memoria_id, principal) VALUES ('teste/principal.jpg', 'gui', ?, 1)", id).lastInsertRowid);
    const { foto } = midias();
    let retirou = false;
    banco.batch = async (comandos) => {
      if (!retirou && comandos.some((c) => /^INSERT INTO relatos\b/.test(c.sql))) {
        retirou = true;
        const mudanca = await postar(memorias, '/api/memorias', {
          id, titulo: 'Memória de teste', ano: 2001, tipo: 'cotidiano', fotosMostradas: [original], fotos: [],
        }, gui);
        expect(mudanca.status).toBe(200);
      }
      return lote(comandos);
    };
    try {
      expect((await salvar(id, { texto: 'Com foto.', fotos: [{ id: foto.fotoId }] })).status).toBe(201);
      expect(retirou).toBe(true);
      expect(banco.sqlite.prepare('SELECT id, principal FROM fotos WHERE memoria_id = ? AND removida_em IS NULL').all(id)).toEqual([{ id: foto.fotoId, principal: 1 }]);
      conferirRelatos(banco.sqlite, id);
    } finally {
      banco.batch = lote;
    }
  });

  it('confere cada lote ao restaurar pela lixeira', async () => {
    const id = memoria('mem8-lixeira');
    const { audio, foto } = midias();
    const [a, som, imagem] = await gravar(id, [texto('Antes.'), audio, foto]);
    await gravar(id, [{ ...a, texto: 'Depois.' }, som, imagem]);
    const versao = linha<{ id: number }>("SELECT id FROM versoes WHERE tipo = 'relato' AND item_id = ?", String(relato(id).id));
    const form = new URLSearchParams({ acao: 'restaurar-relato', memoria: id, por: 'elizete', versao: String(versao.id) });
    const resp = await conferirCadaLote(id, () => postar(lixeira, '/api/lixeira', form));
    expect(resp.headers.get('location')).toContain('ok=');
    expect(relato(id).texto).toBe('Antes.');
  });

  it('confere cada lote da memória nova com relato', async () => {
    const { audio } = midias();
    const id = () => linha<{ id: string } | undefined>("SELECT id FROM memorias WHERE titulo = 'Com relato no lote'")?.id;
    const resp = await conferirCadaLote(id, () => postar(memorias, '/api/memorias', {
      titulo: 'Com relato no lote', ano: 2001, tipo: 'cotidiano', pessoas: ['elizete'],
      relato: { por: 'elizete', texto: 'Na memória nova.', audios: [{ id: audio.audioId }], mensagens: [texto('Na memória nova.'), audio] },
    }));
    expect(resp.status).toBe(201);
    expect(mensagens(relato(id()!).id).map((m) => m.tipo)).toEqual(['texto', 'audio']);
  });

  it('restaura a cópia oficial com citações, anexos e relatos de 80, 81 e 200 mensagens', async () => {
    const id = memoria('mem8-copia');
    sql("INSERT INTO relatos (memoria_id, por, registrado_por, texto, situacao) VALUES (?, 'elizete', 'elizete', '', 'rascunho')", id);
    const vazio = relato(id).id;
    const resp = await postar(relatos, '/api/relatos', { memoria: id, por: 'gui', mensagens: [texto('Publicado para citar.')] }, gui);
    expect(resp.status).toBe(201);
    const citaId = mensagens(relato(id, 'gui').id)[0].id;
    const { audio, foto } = midias();
    const [citante, som, imagem] = await gravar(id, [{ ...texto('Respondendo.'), citaId }, audio, foto], 'rascunho');
    expect(relato(id).id).toBe(vazio);
    sql("UPDATE relato_mensagens SET enviada_em = '2026-11-20 12:00:00' WHERE id = ?", citante.id!);

    for (const n of [80, 81, 200]) {
      const atuais = mensagens(vazio).map((m, i) => i === 0 ? { ...citante, texto: 'Corrigida', citaId } :
        i === 1 ? som : i === 2 ? imagem : { id: m.id, tipo: m.tipo, texto: m.texto ?? undefined });
      const loteNovo = [...atuais, ...Array.from({ length: n - atuais.length }, (_, i) => texto(`Parágrafo ${atuais.length + i}.`))];
      await gravar(id, loteNovo);
      expect(mensagens(vazio)).toHaveLength(n);
      expect(mensagens(vazio)[0]).toMatchObject({ id: citante.id, enviada_em: '2026-11-20 12:00:00', cita_id: citaId });
      await conferirCopia(id);
    }
    const antes = mensagens(vazio);
    const excedeu = await salvar(id, { mensagens: Array.from({ length: 201 }, () => texto('A mais.')) });
    expect(excedeu.status).toBe(400);
    expect(mensagens(vazio)).toEqual(antes);
    await conferirCopia(id);
  });

  async function conferirCopia(id: string, noMeio?: () => Promise<void>) {
    let indices = 0;
    let editou = false;
    const acervo = await baixarCopiaEmPartes(async (endereco) => {
      const url = new URL(endereco, 'http://localhost');
      const request = new Request(url);
      const resposta = await noPedido(request, () => copia.GET({ url, request, locals: { usuario: gui } } as never));
      expect(resposta.status).toBe(200);
      const parte = await resposta.json();
      if ((parte as IndiceDaCopia).indice) indices++;
      if (noMeio && !editou && parte.tabela === 'relatos' && parte.proxima === null) {
        editou = true;
        await noMeio();
      }
      return parte;
    }, undefined, async () => undefined);
    expect(indices).toBe(noMeio ? 2 : 1);
    expect(editou).toBe(Boolean(noMeio));
    for (const tabela of ['relatos', 'relato_mensagens']) {
      expect(acervo.tabelas[tabela]).toEqual(banco.sqlite.prepare(`SELECT * FROM ${tabela} ORDER BY rowid`).all());
    }
    expect(await restaurarCopia(banco.sqlite, acervo, (db) => {
      conferirRelatos(db, id);
      for (const tabela of ['relatos', 'relato_mensagens']) {
        expect(db.prepare(`SELECT * FROM ${tabela} ORDER BY rowid`).all()).toEqual(acervo.tabelas[tabela]);
      }
    })).toBeNull();
  }

  it('restaura a cópia oficial tirada no primeiro instante visível da gravação', async () => {
    const id = memoria('mem8-copia-no-lote');
    const { audio, foto } = midias();
    let copiou = false;
    banco.batch = async (comandos) => {
      const resultado = await lote(comandos);
      if (!copiou && comandos.some((c) => /^INSERT INTO relatos\b/.test(c.sql))) {
        copiou = true;
        await conferirCopia(id);
      }
      return resultado;
    };
    try {
      expect((await salvar(id, { mensagens: [texto('Tudo junto.'), audio, foto] })).status).toBe(201);
      expect(copiou).toBe(true);
    } finally {
      banco.batch = lote;
    }
  });

  it('reinicia a cópia depois de ler os relatos e restaura a segunda sequência', async () => {
    const id = memoria('mem8-copia-edicao');
    const [antes] = await gravar(id, [texto('Primeiro instante.')]);
    await conferirCopia(id);
    await conferirCopia(id, async () => {
      await gravar(id, [{ ...antes, texto: 'Segundo instante.' }]);
    });
    expect(relato(id).texto).toBe('Segundo instante.');
  });
});
