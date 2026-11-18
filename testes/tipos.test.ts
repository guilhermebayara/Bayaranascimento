// A cor e o desenho de cada tipo de momento (resposta do Gui à pergunta 11 do PR #38, 17/11/2026):
// os administradores escolhem a cor numa paleta do sistema e o desenho entre os rabiscos, em
// /admin/tipos. A migração 021 dá aos tipos de sempre a cor e o rabisco que eles já mostravam.
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { COR_DO_TIPO, CORES, PALETA, corDeReserva, corDoTipo, ehCorDaPaleta, estiloDoTipo, iconeDoTipo, lerEscolhasDe } from '../src/lib/visual';
import { RABISCOS, RABISCO_PADRAO, ehRabisco, rabisco } from '../src/visual/rabiscos';

const ler = (caminho: string) => readFileSync(new URL(`../src/${caminho}`, import.meta.url), 'utf8');
const TIPOS_DE_SEMPRE = ['nascimento', 'aniversario', 'casamento', 'conquista', 'viagem', 'casa', 'festa', 'causo', 'cotidiano', 'despedida', 'outro'];

afterEach(() => lerEscolhasDe(() => undefined));

describe('a escolha de cor e de desenho dos tipos', () => {
  it('sem escolha, cada tipo continua com a cor e o rabisco de sempre', () => {
    for (const tipo of TIPOS_DE_SEMPRE) {
      expect(corDoTipo(tipo)).toBe(COR_DO_TIPO[tipo]);
      expect(rabisco(iconeDoTipo(tipo)).id).toBe(tipo);
    }
    // Tipo criado depois, sem escolha: uma das onze, pelo id, e o brilho
    expect(CORES).toContain(corDoTipo('tipo-criado-depois'));
    expect(rabisco(iconeDoTipo('tipo-criado-depois')).id).toBe(RABISCO_PADRAO);
  });

  it('com escolha, vale a cor e o rabisco que os administradores marcaram', () => {
    lerEscolhasDe(() => [
      { id: 'viagem', corDaPaleta: 'cereja', icone: 'montanha' },
      { id: 'formatura', corDaPaleta: 'anil', icone: 'formatura' },
    ]);
    expect(corDoTipo('viagem')).toBe('cereja');
    expect(estiloDoTipo('viagem')).toBe('--tipo-pastel: var(--cereja-pastel); --tipo-meio: var(--cereja-meio); --tipo-cor: var(--cereja-vivo); --tipo-tinta: var(--cereja-tinta)');
    expect(iconeDoTipo('viagem')).toBe('montanha');
    expect(corDoTipo('formatura')).toBe('anil');
    // Quem não está na lista continua com a reserva
    expect(corDoTipo('casa')).toBe('pessego');
  });

  it('uma cor ou um rabisco que não existe nunca chega à tela: vale a reserva', () => {
    lerEscolhasDe(() => [{ id: 'viagem', corDaPaleta: 'red; background: url(x)', icone: '<script>' }]);
    expect(corDoTipo('viagem')).toBe(corDeReserva('viagem'));
    expect(rabisco(iconeDoTipo('viagem')).id).toBe(RABISCO_PADRAO);
    lerEscolhasDe(() => [{ id: 'viagem', corDaPaleta: null, icone: null }]);
    expect(corDoTipo('viagem')).toBe('azul');
    expect(iconeDoTipo('viagem')).toBe('viagem');
  });

  it('a migração 021 dá aos tipos de sempre a cor e o rabisco que eles já mostravam: nada muda de aparência', () => {
    const banco = ler('lib/servidor/banco.ts');
    const migracao = banco.slice(banco.indexOf("id: '021-cor-e-icone-dos-tipos'"));
    expect(migracao).toContain('ALTER TABLE tipos ADD COLUMN cor_da_paleta TEXT');
    expect(migracao).toContain('ALTER TABLE tipos ADD COLUMN icone TEXT');
    const preenchidos = [...migracao.matchAll(/UPDATE tipos SET cor_da_paleta = '(\w+)', icone = '(\w+)' WHERE id = '(\w+)'/g)].map(([, cor, icone, id]) => ({ cor, icone, id }));
    expect(preenchidos.map((p) => p.id).sort()).toEqual([...TIPOS_DE_SEMPRE].sort());
    for (const { cor, icone, id } of preenchidos) {
      expect(cor, id).toBe(COR_DO_TIPO[id!]);
      expect(icone, id).toBe(id);
      expect(ehRabisco(icone), id).toBe(true);
    }
    // Com o que a migração gravou, a tela pinta igual ao que pintava sem escolha nenhuma
    const semEscolha = TIPOS_DE_SEMPRE.map((t) => [estiloDoTipo(t), rabisco(iconeDoTipo(t)).desenho]);
    lerEscolhasDe(() => preenchidos.map((p) => ({ id: p.id!, corDaPaleta: p.cor, icone: p.icone })));
    expect(TIPOS_DE_SEMPRE.map((t) => [estiloDoTipo(t), rabisco(iconeDoTipo(t)).desenho])).toEqual(semEscolha);
    // A migração é nova: as publicadas não foram editadas para isso
    expect(banco.slice(0, banco.indexOf("id: '021-cor-e-icone-dos-tipos'"))).not.toContain('cor_da_paleta');
  });

  it('os rabiscos: os onze de sempre e pelo menos doze novos, cada um com nome e desenho próprios', () => {
    expect(RABISCOS.slice(0, 11).map((r) => r.id)).toEqual(TIPOS_DE_SEMPRE);
    expect(RABISCOS.length - 11).toBeGreaterThanOrEqual(12);
    expect(new Set(RABISCOS.map((r) => r.id)).size).toBe(RABISCOS.length);
    expect(new Set(RABISCOS.map((r) => r.nome)).size).toBe(RABISCOS.length);
    expect(new Set(RABISCOS.map((r) => r.desenho)).size).toBe(RABISCOS.length);
    for (const r of RABISCOS) {
      expect(r.id, r.id).toMatch(/^[a-z]+$/);
      // O mesmo traço: só linhas e formas abertas, sem preenchimento, cor ou espessura própria
      // (a espessura maior só vale nos pontos, que são traços de comprimento zero)
      expect(r.desenho, r.id).toMatch(/^(<(path|circle|ellipse) [^>]+\/>)+$/);
      expect(r.desenho, r.id).not.toMatch(/fill=|stroke=|style=|class=/);
      for (const [, resto] of r.desenho.matchAll(/<path d="([^"]+)" stroke-width="2\.2"\/>/g)) expect(resto, r.id).toMatch(/^(M[\d. ]+h\.01)+$/);
    }
    const peca = ler('components/visual/IconeDoTipo.astro');
    expect(peca).toMatch(/viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1\.6" stroke-linecap="round" stroke-linejoin="round"/);
  });

  it('a API só aceita cor da paleta e rabisco da lista, e só de administrador', () => {
    const api = ler('pages/api/tipos.ts');
    // Quem não é administrador sai antes de qualquer leitura do pedido
    expect(api.indexOf('if (!usuario.admin) return voltar(')).toBeGreaterThan(0);
    expect(api.indexOf('if (!usuario.admin) return voltar(')).toBeLessThan(api.indexOf('await request.formData()'));
    // Criar, promover e editar passam pelas duas listas
    expect(api.match(/ehCorDaPaleta\(cor\)/g)).toHaveLength(2);
    expect(api.match(/ehRabisco\(icone\)/g)).toHaveLength(2);
    expect(api).not.toMatch(/#\[0-9a-fA-F\]/);
    expect(api).toMatch(/await criarTipo\(id, rotulo, cor, icone, usuario\);/);
    // As listas que a API consulta são as mesmas da tela e dos tokens
    for (const cor of PALETA) expect(ehCorDaPaleta(cor)).toBe(true);
    for (const nome of ['', 'vermelho', '#2F7D6B', 'verde-pastel', 'var(--verde-vivo)', null, undefined]) expect(ehCorDaPaleta(nome), String(nome)).toBe(false);
    for (const r of RABISCOS) expect(ehRabisco(r.id)).toBe(true);
    for (const nome of ['', 'dinossauro', '<svg>', null, undefined]) expect(ehRabisco(nome), String(nome)).toBe(false);
    // O banco guarda os nomes, e a lista chega a cada pedido com eles
    const repositorio = ler('lib/servidor/repositorio.ts');
    expect(repositorio).toContain("SELECT id, rotulo, cor, cor_da_paleta AS corDaPaleta, icone FROM tipos");
    expect(ler('middleware.ts')).toMatch(/lerEscolhasDe\(tiposDoPedido\);[\s\S]*guardarTiposDoPedido\(contexto\.locals\.tipos\);/);
  });

  it('/admin/tipos: a cor e o desenho são rádios de formulário comum, só para administradores', () => {
    const pagina = ler('pages/admin/tipos.astro');
    expect(pagina).toMatch(/if \(!usuario\.admin\) return new Response\('Página não encontrada', \{ status: 404 \}\);/);
    expect(pagina).not.toMatch(/type="color"/);
    expect(pagina).not.toMatch(/#[0-9a-fA-F]{6}/);
    // Tipo novo vem com uma cor que ninguém usa
    expect(pagina).toMatch(/const corLivre = PALETA\.find\(\(c\) => !emUso\.has\(c\)\)/);
    const escolha = ler('components/formularios/EscolhaDoTipo.astro');
    expect(escolha).toMatch(/<input type="radio" name="cor" value=\{c\} checked=\{c === cor\} required/);
    expect(escolha).toMatch(/<input type="radio" name="icone" value=\{r\.id\} checked=\{r\.id === icone\} required/);
    // Os desenhos vêm por assunto, e o grupo é só arrumação: um nome de campo só, sem script
    expect(escolha).toMatch(/rabiscosPorAssunto\(\)\.map\(\(a\) => \([\s\S]*?class="rabiscos__rotulo"[\s\S]*?\{a\.nome\}[\s\S]*?a\.rabiscos\.map\(/);
    expect(escolha.match(/name="icone"/g)).toHaveLength(1);
    // O nome da cor está escrito, e o do rabisco é lido pelo leitor de tela
    expect(escolha).toContain('{NOMES_DAS_CORES[c]}');
    expect(escolha).toContain('<span class="so-leitor">{r.nome}</span>');
    const css = ler('visual/telas/tipos.css');
    // A escolhida não depende só da cor: leva o tique. E o foco aparece na amostra inteira.
    expect(css).toMatch(/\.amostra:has\(input:checked\) \.amostra__cor::before\s*\{\s*content: '✓'/);
    expect(css).toMatch(/\.rabisco-a-escolher:has\(input:checked\)::after\s*\{\s*content: '✓'/);
    expect(css).toMatch(/:is\(\.amostra, \.rabisco-a-escolher\):has\(input:focus-visible\)\s*\{\s*outline:/);
  });

  it('/sistema mostra a paleta inteira, com o contraste, e todos os rabiscos com o nome', () => {
    const sistema = ler('pages/sistema.astro');
    expect(sistema).toMatch(/CORES\.map\(/);
    expect(sistema).toMatch(/CORES_NOVAS\.map\(/);
    expect(sistema).toMatch(/CORES_MAIS_NOVAS\.map\(/);
    expect(sistema).toMatch(/PALETA\.map\(\(c\) => \{[\s\S]*?razao\(v\.tinta, v\.pastel\)[\s\S]*?razao\(v\.tinta, corDoPapel\)[\s\S]*?razao\(corDaTinta, v\.pastel\)/);
    expect(sistema).toMatch(/rabiscosPorAssunto\(\)\.map\(\(a\) => \([\s\S]*?\{a\.nome\}[\s\S]*?a\.rabiscos\.map\(\(r\) => \([\s\S]*?<IconeDoTipo rabisco=\{r\.id\} \/>[\s\S]*?\{r\.nome\}/);
  });

  it('ninguém mais pinta o tipo por conta própria: a cor e o rabisco saem de estiloDoTipo e do IconeDoTipo', () => {
    const arquivos = (pasta: string): string[] => readdirSync(new URL(`../src/${pasta}`, import.meta.url), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivos(`${pasta}/${e.name}`) : [`${pasta}/${e.name}`]));
    for (const arquivo of [...arquivos('pages'), ...arquivos('components')].filter((a) => a.endsWith('.astro'))) {
      // A cor antiga do banco (tipo.cor, um valor solto) não chega a nenhum estilo
      expect(ler(arquivo), arquivo).not.toMatch(/style=\{[^}]*\b(tipo|t)\.cor\b/);
    }
  });
});
