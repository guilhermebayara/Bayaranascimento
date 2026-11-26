// Núcleo e parentes (decisão do Gui, 15/11/2026): a sugestão de família no cadastro, quem cuida de um
// parente, e a regra de que parente nunca vê o que é restrito ao núcleo.
import { describe, expect, it } from 'vitest';
import { NUCLEO_INICIAL, coresDasPessoas, familiaDeOrigem, familiaFormada, familiaMaisRecente, sugerirFamilias, type DadosDasFamilias } from '../src/lib/familias';
import { podeEditarIntegrante, podeMexerEmLaco, type Usuario } from '../src/lib/servidor/permissoes';
import { sqlVeMemoria } from '../src/lib/servidor/quem-ve';
import repositorio from '../src/lib/servidor/repositorio.ts?raw';
import banco from '../src/lib/servidor/banco.ts?raw';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { corDaPessoa, corDoNucleo } from '../src/lib/visual';

const dados: DadosDasFamilias = {
  familias: new Map([
    ['gui', ['bayara']],
    ['giovanna', ['bayara', 'bayara-bracarense']],
    ['lucas-magno', ['bayara-bracarense', 'bracarense']],
    ['elizete', ['bayara']],
    ['aguilar', ['bayara']],
    ['vo-vivica', ['bayara']],
    ['ed', []],
  ]),
  casais: [
    { a: 'giovanna', b: 'lucas-magno' },
    { a: 'aguilar', b: 'elizete' },
  ],
  filiacoes: [
    { filho: 'gui', responsavel: 'elizete' },
    { filho: 'elizete', responsavel: 'vo-vivica' },
  ],
};

describe('família mais recente', () => {
  it('quem formou uma família com quem casou fica com ela; os outros, com a de origem', () => {
    // É a cor do painel de cada pessoa (decisão do Gui, 16/11/2026)
    expect(familiaMaisRecente(dados, 'giovanna')).toBe('bayara-bracarense');
    expect(familiaMaisRecente(dados, 'lucas-magno')).toBe('bayara-bracarense');
    expect(familiaMaisRecente(dados, 'gui')).toBe('bayara');
    expect(familiaMaisRecente(dados, 'elizete')).toBe('bayara');
    expect(familiaMaisRecente(dados, 'ed')).toBeUndefined();
  });
});

describe('a cor de quem é de duas famílias (pedido do Gui, 18/11/2026)', () => {
  // Bayara vem antes na ordem: pela regra antiga, a Giovanna levava a cor do Bayara
  const ordem = ['bayara', 'bayara-bracarense', 'bracarense'];
  const pessoas = [...dados.familias].map(([id, familias]) => ({ id, nucleos: familias, parenteDe: [] as string[] }));
  const corDe = coresDasPessoas(pessoas, dados.casais, ordem);

  it('quem formou um núcleo com quem casou leva a cor dele, a Giovanna e o Magno igual', () => {
    expect(familiaFormada(dados, 'giovanna')).toBe('bayara-bracarense');
    expect(corDe('giovanna')).toBe(corDoNucleo('bayara-bracarense', ordem));
    expect(corDe('lucas-magno')).toBe(corDoNucleo('bayara-bracarense', ordem));
  });
  it('quem não formou outro núcleo continua com a primeira família na ordem', () => {
    expect(familiaFormada(dados, 'gui')).toBeUndefined();
    expect(corDe('gui')).toBe(corDoNucleo('bayara', ordem));
    expect(corDe('elizete')).toBe(corDoNucleo('bayara', ordem));
    expect(corDe('ed')).toBe('tudo');
  });
  it('sem o casal à vista, vale a regra de antes', () => {
    const semCasal = coresDasPessoas(pessoas, [], ordem);
    expect(semCasal('giovanna')).toBe(corDoNucleo('bayara', ordem));
  });
  it('a família formada só vale se for mesmo da pessoa', () => {
    expect(corDaPessoa(['bayara'], ordem, 'bracarense')).toBe(corDoNucleo('bayara', ordem));
  });
  it('a página da pessoa leva a cor dela na tela inteira, e não a mistura das famílias', () => {
    expect(readFileSync('src/pages/pessoas/[id]/index.astro', 'utf8')).toMatch(/<Visual [^\n]*familia=\{p\.familiaDaPessoa\}/);
  });
  it('as páginas e o servidor chegam à cor da pessoa só por coresDasPessoas', () => {
    const arquivos: string[] = [];
    const andar = (dir: string) => {
      for (const n of readdirSync(dir)) {
        const c = join(dir, n);
        if (statSync(c).isDirectory()) andar(c);
        else if (/\.(astro|ts)$/.test(n)) arquivos.push(c);
      }
    };
    andar('src');
    const soltos = arquivos.filter((a) => !/src\/lib\/(visual|familias)\.ts$/.test(a) && readFileSync(a, 'utf8').includes('corDaPessoa('));
    expect(soltos).toEqual([]);
  });
});

describe('família de origem', () => {
  it('é a família de quem a pessoa veio, sem a que formou com quem casou', () => {
    expect(familiaDeOrigem(dados, 'giovanna')).toEqual(['bayara']);
    expect(familiaDeOrigem(dados, 'lucas-magno')).toEqual(['bracarense']);
  });

  it('quando o casal é da mesma família, vale ela', () => {
    expect(familiaDeOrigem(dados, 'elizete')).toEqual(['bayara']);
  });
});

describe('sugestão de família no cadastro', () => {
  it('o filho da Giovanna com o Magno é do Bayara Bracarense, o núcleo que os dois criaram', () => {
    const comMae = { ...dados, filiacoes: [...dados.filiacoes, { filho: 'bebe', responsavel: 'giovanna' }] };
    expect(sugerirFamilias(comMae, 'bebe', { tipo: 'filho-de', com: 'lucas-magno' })).toEqual(['bayara-bracarense']);
  });

  it('com um pai só cadastrado, vale o que ele divide com quem está casado', () => {
    expect(sugerirFamilias(dados, 'bebe', { tipo: 'filho-de', com: 'giovanna' })).toEqual(['bayara-bracarense']);
  });

  it('quem não tem com quem dividir passa a família de origem', () => {
    expect(sugerirFamilias(dados, 'sobrinho', { tipo: 'filho-de', com: 'gui' })).toEqual(['bayara']);
  });

  it('o avô materno, cadastrado como marido da Vó Vivica, é parente do Bayara', () => {
    expect(sugerirFamilias(dados, 'vo-materno', { tipo: 'casal', com: 'vo-vivica' })).toEqual(['bayara']);
  });

  it('pai ou mãe do Magno é do Bracarense, e não do núcleo do casal', () => {
    expect(sugerirFamilias(dados, 'pai-do-magno', { tipo: 'pai-de', com: 'lucas-magno' })).toEqual(['bracarense']);
  });

  it('quem se liga a alguém de fora das famílias não ganha família', () => {
    expect(sugerirFamilias(dados, 'irmao-do-ed', { tipo: 'pai-de', com: 'ed' })).toEqual([]);
  });
});

describe('quem cuida de um parente', () => {
  const gui: Usuario = { pessoa: 'gui', nome: 'Gui', admin: false, nucleos: ['bayara'] };
  const magno: Usuario = { pessoa: 'lucas-magno', nome: 'Lucas Magno', admin: false, nucleos: ['bayara-bracarense', 'bracarense'] };
  const voMaterno = { id: 'vo-materno', nucleos: [], parenteDe: ['bayara'], criadoPor: 'giovanna' };

  it('quem é do núcleo edita a página e mexe nos laços do parente', () => {
    expect(podeEditarIntegrante(gui, voMaterno, new Set()).ok).toBe(true);
    expect(podeMexerEmLaco(gui, [voMaterno]).ok).toBe(true);
  });

  it('quem é de outro núcleo não edita', () => {
    expect(podeEditarIntegrante(magno, voMaterno, new Set()).ok).toBe(false);
  });
});

describe('parente não vê o que é restrito ao núcleo', () => {
  it('a regra de visibilidade em SQL só conta quem é membro', () => {
    // A regra mora em src/lib/servidor/quem-ve.ts desde a AC3; repositorio.ts usa o fragmento de lá
    expect(sqlVeMemoria()).toMatch(/JOIN nucleo_membros nm ON nm\.nucleo_id = mn\.nucleo_id\s+WHERE mn\.memoria_id = m\.id AND nm\.integrante_id = \?1 AND nm\.papel = 'membro'/);
    expect(repositorio).toContain('const FILTRO_VISIVEL = sqlVeMemoria();');
  });

  it('quem entra na sessão leva só os núcleos de que é membro', () => {
    expect(repositorio).toContain("nucleos: daPessoa(i.id as string, 'membro')");
  });

  it('a migração deixa como membros só quem acessa o site', () => {
    expect(NUCLEO_INICIAL).toEqual(['gui', 'giovanna', 'lucas-magno', 'elizete', 'ana-candida', 'lucio', 'regina']);
    expect(banco).toContain("UPDATE nucleo_membros SET papel = 'parente' WHERE integrante_id NOT IN");
  });
});

describe('laço resumido com o caminho completo', () => {
  it('quando o irmão do Ed vira pai do Caio, com os pais dos dois, a árvore já diz que o Caio é sobrinho do Ed', async () => {
    const { Familia } = await import('../src/lib/parentesco');
    const f = (filho: string, responsavel: string) => ({ filho, responsavel, qualidade: 'biologica' as const });
    const sem = new Familia([f('ed', 'pai-do-ed')], []);
    expect(sem.relacao('ed', 'caio')).toBeUndefined();
    const com = new Familia([f('ed', 'pai-do-ed'), f('irmao-do-ed', 'pai-do-ed'), f('caio', 'irmao-do-ed')], []);
    expect(com.relacao('ed', 'caio')?.texto).toMatch(/sobrinh/);
  });
});
