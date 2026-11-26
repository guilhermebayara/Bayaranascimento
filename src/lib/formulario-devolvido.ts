// O formulário da memória que o servidor recusou, sem script (fila da revisão Z2, sessão AA; regra "Quando o
// servidor recusa", em docs/regras/formularios.md). Com script, o que foi digitado fica na sessão da aba
// (src/lib/cliente/guardar-formulario.ts). Sem script, a rota responde com a própria página do formulário,
// já preenchida com o que chegou no pedido (context.rewrite): nada é guardado no servidor, e o que foi
// digitado só existe na página que a pessoa tem aberta.

/** O que a pessoa tinha digitado na página da memória, como o formulário manda. */
export interface MemoriaDevolvida {
  titulo: string;
  ano: number | null;
  mes: number | null;
  dia: number | null;
  aproximada: boolean;
  tipo: string;
  tipoOutro: string;
  lugar: string;
  pessoas: string[];
  capitulos: string[];
  temas: string;
  nucleos: string[];
  visibilidade: 'todos' | 'nucleos';
  relato: string;
  relatoPor: string;
}

/** Lê o formulário da memória que chegou sem script. Os números fora do formato ficam vazios. */
export function memoriaDevolvida(dados: FormData): MemoriaDevolvida {
  const texto = (nome: string, maximo = 20000) => String(dados.get(nome) ?? '').slice(0, maximo);
  const numero = (nome: string) => {
    const n = Number(texto(nome, 10).trim());
    return texto(nome).trim() && Number.isInteger(n) ? n : null;
  };
  const lista = (nome: string) => dados.getAll(nome).map((v) => String(v).slice(0, 120));
  return {
    titulo: texto('titulo', 120),
    ano: numero('ano'),
    mes: numero('mes'),
    dia: numero('dia'),
    aproximada: dados.get('aproximada') === 'on',
    tipo: texto('tipo', 80),
    tipoOutro: texto('tipoOutro', 40),
    lugar: texto('lugar', 120),
    pessoas: lista('pessoas'),
    capitulos: lista('capitulos'),
    temas: texto('temas', 500),
    nucleos: lista('nucleos'),
    visibilidade: texto('visibilidade') === 'nucleos' ? 'nucleos' : 'todos',
    relato: texto('relato'),
    relatoPor: texto('relatoPor', 80),
  };
}
