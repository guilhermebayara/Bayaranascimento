// As fases do casal como chegam dos formulários (decisões do Gui, 18/11/2026). Funções puras, testadas em
// testes/casal-fases.test.ts.
//
// Dois jeitos de chegar:
// - numeradas, da edição do casal: fase-0-tipo, fase-0-inicioAno, fase-0-inicioMes, fase-0-inicioDia,
//   fase-0-fimAno (e mês e dia), fase-0-remover. As linhas de "Adicionar o que aconteceu depois" seguem a
//   numeração;
// - em linhas paralelas, do cadastro do casal: faseTipo, faseInicioAno, faseInicioMes, faseInicioDia, uma
//   linha por fase, na ordem. A primeira é "Como estão hoje?"; as outras, o que aconteceu depois.
// Linha sem tipo é ignorada. Mês e dia são opcionais, como nas outras datas do site, e só valem com o ano.
import { FASES, type Fase, type TipoDeFase } from './parentesco';
import { validarData } from './servidor/conteudo';

export interface Formulario {
  get(nome: string): FormDataEntryValue | null;
  getAll(nome: string): FormDataEntryValue[];
  keys(): IterableIterator<string>;
}

type Data = { ano: number | null; mes: number | null; dia: number | null };

const numero = (v: FormDataEntryValue | null | undefined): number | null => {
  const texto = typeof v === 'string' ? v.trim() : '';
  return texto ? Number(texto) : null;
};

/** O nome antigo do ano (fase-0-inicio, faseInicio) continua valendo, para a página aberta antes da troca. */
const lerAno = (dados: Formulario, base: string) => numero(dados.get(`${base}Ano`)) ?? numero(dados.get(base));

function conferir(data: Data, qual: string): string | undefined {
  if (data.ano === null) return data.mes || data.dia ? `${qual}: informe pelo menos o ano.` : undefined;
  const problema = validarData(data.ano, data.mes ?? undefined, data.dia ?? undefined);
  return problema ? `${qual}: ${problema.charAt(0).toLowerCase()}${problema.slice(1)}` : undefined;
}

export function lerFasesDoFormulario(dados: Formulario): { fases: Fase[] } | { erro: string } {
  const numeradas = [...new Set([...dados.keys()].map((k) => /^fase-(\d+)-tipo$/.exec(k)?.[1]).filter((n) => n !== undefined))].map(Number).sort((x, y) => x - y);
  const linhas: { tipo: string; inicio: Data; fim: Data }[] = numeradas.length
    ? numeradas.map((n) => ({
        tipo: dados.get(`fase-${n}-remover`) === 'on' ? '' : String(dados.get(`fase-${n}-tipo`) ?? ''),
        inicio: { ano: lerAno(dados, `fase-${n}-inicio`), mes: numero(dados.get(`fase-${n}-inicioMes`)), dia: numero(dados.get(`fase-${n}-inicioDia`)) },
        fim: { ano: lerAno(dados, `fase-${n}-fim`), mes: numero(dados.get(`fase-${n}-fimMes`)), dia: numero(dados.get(`fase-${n}-fimDia`)) },
      }))
    : (() => {
        const tipos = dados.getAll('faseTipo').map(String);
        const anos = dados.getAll('faseInicioAno').length ? dados.getAll('faseInicioAno') : dados.getAll('faseInicio');
        const meses = dados.getAll('faseInicioMes');
        const dias = dados.getAll('faseInicioDia');
        return tipos.map((tipo, i) => ({
          tipo,
          inicio: { ano: numero(anos[i]), mes: numero(meses[i]), dia: numero(dias[i]) },
          fim: { ano: null, mes: null, dia: null },
        }));
      })();

  const fases: Fase[] = [];
  for (const linha of linhas) {
    if (!linha.tipo) continue;
    if (!(linha.tipo in FASES)) return { erro: 'Fase desconhecida.' };
    const nome = FASES[linha.tipo as TipoDeFase];
    const problema = conferir(linha.inicio, nome) ?? conferir(linha.fim, `Fim de ${nome.toLowerCase()}`);
    if (problema) return { erro: problema };
    const { inicio, fim } = linha;
    if (inicio.ano && fim.ano && antes(fim, inicio)) return { erro: 'Uma fase não pode terminar antes de começar.' };
    fases.push({
      tipo: linha.tipo as TipoDeFase,
      inicioAno: inicio.ano,
      inicioMes: inicio.ano ? inicio.mes : null,
      inicioDia: inicio.ano && inicio.mes ? inicio.dia : null,
      fimAno: fim.ano,
      fimMes: fim.ano ? fim.mes : null,
      fimDia: fim.ano && fim.mes ? fim.dia : null,
    });
  }
  if (fases.length === 0) return { erro: 'Informe pelo menos uma fase, como namoro ou casamento.' };
  if (fases.length > 12) return { erro: 'São fases demais para um casal só.' };
  return { fases };
}

/** `a` vem antes de `b`? Mês e dia só contam quando os dois têm. */
function antes(a: Data, b: Data): boolean {
  if (a.ano! !== b.ano!) return a.ano! < b.ano!;
  if (a.mes && b.mes && a.mes !== b.mes) return a.mes < b.mes;
  if (a.mes && b.mes && a.dia && b.dia) return a.dia < b.dia;
  return false;
}

/**
 * "Já é da família" (migração 100). Vale o que o formulário mandou quando ele fez a pergunta
 * (jaDaFamiliaPergunta, posto ao lado da caixa); sem a pergunta, fica como estava.
 */
export function lerJaDaFamilia(dados: Formulario, anterior: boolean | undefined): boolean {
  if (dados.get('jaDaFamiliaPergunta') === null) return anterior ?? false;
  return dados.get('jaDaFamilia') === 'on';
}
