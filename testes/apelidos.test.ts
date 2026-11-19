// "Como você chama", só seu (decisão do Gui, 18/11/2026; src/lib/apelidos.ts, migração 090): cada pessoa
// dá o próprio apelido a alguém, e só ela vê, no site inteiro. Sem apelido próprio, vale o da família.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LIMITE_DO_APELIDO, apelidoSoSeuDaFicha, apelidosDaFicha, lerApelido, podeDarApelido, quemVeOApelido } from '../src/lib/apelidos';
import { TABELAS_APAGADAS } from '../src/lib/espelho';

const ler = (c: string) => readFileSync(c, 'utf8');

describe('como você chama, só seu', () => {
  it('o apelido é aparado; vazio apaga; longo demais é recusado', () => {
    expect(lerApelido('  Tia   Lu ')).toEqual({ ok: true, apelido: 'Tia Lu' });
    expect(lerApelido('')).toEqual({ ok: true, apelido: null });
    expect(lerApelido(undefined)).toEqual({ ok: true, apelido: null });
    expect(lerApelido('x'.repeat(LIMITE_DO_APELIDO + 1)).ok).toBe(false);
  });
  it('só se dá apelido a quem se vê, e nunca a si mesmo', () => {
    expect(podeDarApelido('giovanna', 'elizete', true)).toBe(true);
    expect(podeDarApelido('giovanna', 'elizete', false)).toBe(false);
    expect(podeDarApelido('giovanna', 'giovanna', true)).toBe(false);
  });
  it('só o dono lê os dele, e a tabela tem o limite de 40 letras', () => {
    const repo = ler('src/lib/servidor/repositorio.ts');
    expect(repo).toContain("SELECT pessoa_id, apelido FROM apelidos_meus WHERE dono_id = ?");
    expect(repo.match(/SELECT [^'`]*FROM apelidos_meus/g)?.length).toBe(1);
    expect(ler('src/lib/servidor/banco.ts')).toMatch(/id: '090-como-voce-chama'[\s\S]*apelido TEXT NOT NULL CHECK \(length\(apelido\) BETWEEN 1 AND 40\)/);
  });
  it('nas páginas, a pessoa aparece com o apelido de quem olha; a ficha de edição continua com o da família', () => {
    const repo = ler('src/lib/servidor/repositorio.ts');
    expect(repo).toContain('apelido: meus?.get(i.id as string) ?? (i.apelido as string | null),');
    expect(repo).toContain('apelidoDaFamilia: i.apelido as string | null,');
    expect(ler('src/components/FichaDoIntegrante.astro')).toContain('i.apelidoDaFamilia !== undefined ? i.apelidoDaFamilia : i?.apelido');
  });
  it('as rotas de /api e a administração leem os de sempre: nenhum apelido privado vira o da família', () => {
    expect(ler('src/middleware.ts')).toContain("if (!/^\\/(api|admin)(\\/|$)/.test(contexto.url.pathname)) guardarApelidosDoPedido(await listarMeusApelidos(usuario.pessoa));");
  });
  it('não passa pelo espelho, e juntar duplicados leva os apelidos para a ficha que fica', () => {
    expect(TABELAS_APAGADAS).toContain('apelidos_meus');
    expect(ler('src/lib/servidor/repositorio.ts')).toContain("['apelidos_meus', 'dono_id', 'pessoa_id'],");
  });
  it('dá para dar o apelido na página da pessoa e chegar lá pela ficha da árvore', () => {
    const pagina = (ler('src/pages/pessoas/[id]/index.astro') + ler('src/lib/servidor/pagina-da-pessoa.ts'));
    expect(pagina).toContain('<details class="como-chama" id="como-voce-chama">');
    expect(pagina).toContain('action="/api/apelidos"');
    expect(ler('src/lib/cliente/arvore.ts')).toContain('href: `/pessoas/${p.id}#como-voce-chama`');
    const rota = ler('src/pages/api/apelidos.ts');
    expect(rota).toContain('if (!mesmaOrigem(request))');
    expect(rota).toContain('if (!podeDarApelido(usuario.pessoa, pessoa, ve))');
  });
});

// Apelidos na edição da pessoa (decisão do Gui, 18/11/2026, depois da sessão H): o campo do apelido deixa de
// ficar sempre aberto; "Adicionar apelido" pergunta se é o da família ou só seu.
describe('apelidos na ficha', () => {
  it('quem já tem apelido aparece com ele; o que falta entra por "Adicionar apelido"', () => {
    expect(apelidosDaFicha({ familia: '', meu: '', propria: false })).toEqual({ tipos: ['familia', 'meu'], existentes: [], faltam: ['familia', 'meu'], pergunta: true });
    const comODaFamilia = apelidosDaFicha({ familia: 'Vó Bela', meu: null, propria: false });
    expect(comODaFamilia.existentes).toEqual([{ deQuem: 'familia', apelido: 'Vó Bela' }]);
    expect(comODaFamilia.faltam).toEqual(['meu']);
    // Sobrou um só: "Adicionar apelido" não pergunta de quem é
    expect(comODaFamilia.pergunta).toBe(false);
    const comOsDois = apelidosDaFicha({ familia: 'Vó Bela', meu: 'Vovó', propria: false });
    expect(comOsDois.existentes.map((e) => e.deQuem)).toEqual(['familia', 'meu']);
    expect(comOsDois.faltam).toEqual([]);
    expect(apelidosDaFicha({ familia: '  ', meu: undefined, propria: false }).existentes).toEqual([]);
  });
  it('na própria ficha não há apelido só seu', () => {
    const propria = apelidosDaFicha({ familia: '', meu: 'Eu mesmo', propria: true });
    expect(propria.tipos).toEqual(['familia']);
    expect(propria.existentes).toEqual([]);
    expect(propria.faltam).toEqual(['familia']);
    expect(propria.pergunta).toBe(false);
  });
  it('a frase colada na escolha diz quem vê', () => {
    expect(quemVeOApelido('familia', 'Elizete')).toBe('Um apelido que a família toda vê.');
    expect(quemVeOApelido('meu', 'Elizete')).toBe('Só você vê. No site inteiro, para você, Elizete aparece assim.');
    expect(quemVeOApelido('meu', null)).toContain('a pessoa aparece assim');
  });
  it('o apelido só seu que vem com a ficha: gravado à parte, nunca para si mesmo', () => {
    expect(apelidoSoSeuDaFicha('  Tia  Zete ', 'gui', 'elizete')).toEqual({ ok: true, guardar: true, apelido: 'Tia Zete' });
    expect(apelidoSoSeuDaFicha('', 'gui', 'elizete')).toEqual({ ok: true, guardar: true, apelido: null });
    // Sem o campo (a própria ficha, ou um envio antigo), nada muda
    expect(apelidoSoSeuDaFicha(null, 'gui', 'elizete')).toEqual({ ok: true, guardar: false, apelido: null });
    expect(apelidoSoSeuDaFicha('Eu', 'gui', 'gui')).toEqual({ ok: true, guardar: false, apelido: null });
    expect(apelidoSoSeuDaFicha('x'.repeat(LIMITE_DO_APELIDO + 1), 'gui', 'elizete').ok).toBe(false);
  });
  it('a ficha usa o seletor segmentado com a frase colada, e sem script os campos continuam', () => {
    const ficha = ler('src/components/FichaDoIntegrante.astro');
    expect(ficha).toContain('nome="apelidoDeQuem"');
    expect(ficha).toContain('explicacao="frase-do-apelido"');
    expect(ficha).toContain("{ valor: 'familia', texto: 'A família toda', atual: true }");
    expect(ficha).toContain("{ valor: 'meu', texto: 'Só eu' }");
    expect(ficha).toContain('Adicionar apelido');
    // Os campos de sempre vão com a ficha; escondidos com script, à vista sem ele (data-depende, no noscript)
    expect(ficha).toMatch(/<label class="campo apelidos__campo" data-apelido-campo=\{t\} data-depende="apelido" hidden>/);
    expect(ficha).toContain("name={t === 'familia' ? 'apelido' : 'meuApelido'}");
    // A linha do apelido que já existe e o "Adicionar" são só com script
    expect(ficha).toContain('<ul class="apelidos__lista" data-so-com-script>');
    expect(ficha).toContain('data-apelido-adicionar data-so-com-script');
    expect(ler('src/components/formularios/Pagina.astro')).toContain('[data-depende][hidden] { display: block !important; }');
  });
  it('a rota da ficha grava o apelido só seu à parte, para quem deu', () => {
    const rota = ler('src/pages/api/integrantes.ts');
    expect(rota).toContain("apelidoSoSeuDaFicha(dados.get('meuApelido'), usuario.pessoa, id || '(nova)')");
    expect(rota).toContain('await guardarMeuApelido(usuario.pessoa, id, meuApelido.apelido);');
    expect(rota).toContain('await guardarMeuApelido(usuario.pessoa, novoId, meuApelido.apelido);');
  });
});

// Defeito visto pelo Gui depois da sessão I: o botão "Como você chama ...?" da página da pessoa usava o
// apelido da família ("Como você chama Cidinha?"), e o título da página não trazia o apelido como na
// lista de Pessoas. A pergunta usa o nome da ficha; o título é "Nome (apelido)".
describe('a página da pessoa com apelido', () => {
  const pagina = (ler('src/pages/pessoas/[id]/index.astro') + ler('src/lib/servidor/pagina-da-pessoa.ts'));
  it('a pergunta usa o nome da ficha, e "Voltar a" usa o de sempre', () => {
    expect(pagina).toContain('`Como você chama ${pessoa.nome}?`');
    expect(pagina).toContain('<span class="so-leitor">Como você chama {pessoa.nome}?</span>');
    expect(pagina).not.toContain('Como você chama ${nomeDaFamilia}');
    expect(pagina).toContain('Voltar a {p.nomeDaFamilia}');
  });
  it('o título mostra "Nome (apelido)", com o apelido que quem olha vê', () => {
    expect(pagina).toContain('apelidoNoTitulo: apelidoAoLado(pessoa.nome, pessoa.apelido),');
    expect(pagina).toMatch(/\{pessoa\.nome\}\s*\{p\.apelidoNoTitulo && <span class="verbete__apelido"> \(\{p\.apelidoNoTitulo\}\)<\/span>\}\s*<\/h1>/);
  });
});
