import type { z } from 'astro/zod';

type Formulario = 'memoria' | 'relato' | 'acrescentar-fotos';

const campos: Record<string, string> = {
  id: 'O código da memória',
  memoria: 'O código da memória',
  titulo: 'O título',
  ano: 'O ano',
  mes: 'O mês',
  dia: 'O dia',
  tipo: 'O código do tipo de momento',
  tipoOutro: 'O nome do tipo de momento',
  lugar: 'O lugar',
  temas: 'O campo de temas',
  'pessoas.*': 'O código da pessoa',
  'novasPessoas.*.nome': 'O nome da pessoa',
  'nucleos.*': 'O código da família',
  'capitulos.*': 'O código do capítulo',
  'fotos.*.id': 'O código da foto',
  'fotos.*.legenda': 'A legenda da foto',
  'fotosMostradas.*': 'O código da foto mostrada',
  por: 'O código de quem contou',
  texto: 'O texto do relato',
  'audios.*.id': 'O código do áudio',
  'audios.*.transcricao': 'A transcrição do áudio',
  'mensagens.*.id': 'O código da mensagem',
  'mensagens.*.audioId': 'O código do áudio',
  'mensagens.*.fotoId': 'O código da foto',
  'mensagens.*.citaId': 'O código da mensagem citada',
  'mensagens.*.texto': 'O texto da mensagem',
  'mensagens.*.transcricao': 'A transcrição do áudio',
  'mensagens.*.legenda': 'A legenda da foto',
  cita: 'O código da mensagem citada',
  publico: 'O campo de quem vê o relato',
  envio: 'O código do envio',
};

const quantidades: Record<string, string> = {
  pessoas: 'Dá para marcar até {n} pessoas.',
  novasPessoas: 'Dá para cadastrar até {n} pessoas novas de cada vez.',
  nucleos: 'Dá para marcar até {n} famílias.',
  capitulos: 'Dá para marcar até {n} capítulos.',
  fotosMostradas: 'A lista de fotos mostradas pode ter até {n} fotos.',
};

const quantidadesDeFotos: Record<Formulario, string> = {
  memoria: 'Uma memória pode ter até {n} fotos.',
  relato: 'Um relato pode trazer até {n} fotos.',
  'acrescentar-fotos': 'Dá para acrescentar até {n} fotos de cada vez.',
};

const numero = new Intl.NumberFormat('pt-BR');

export function recadoDoTetoDoRelato(campo: 'audios' | 'mensagens', limite: number | bigint): string {
  return `Um relato pode ter até ${numero.format(limite)} ${campo === 'audios' ? 'áudios' : 'mensagens'}.`;
}

/** O esquema fornece o limite, e aqui os caminhos do pedido viram nomes do formulário. */
export function recadoDaValidacao(issue: z.ZodIssue | undefined, formulario: Formulario): string {
  const padrao = formulario === 'acrescentar-fotos' ? 'Confira as fotos.' : 'Confira os campos.';
  if (!issue || (issue.code !== 'too_big' && issue.code !== 'too_small')) return issue?.message ?? padrao;
  const caminho = issue.path.map((parte) => typeof parte === 'number' ? '*' : String(parte)).join('.').replace(/^relato\./, '');
  if (issue.code === 'too_big') {
    if (issue.origin === 'array') {
      if (caminho === 'audios' || caminho === 'mensagens') return recadoDoTetoDoRelato(caminho, issue.maximum);
      const recado = caminho === 'fotos' ? quantidadesDeFotos[formulario] : quantidades[caminho];
      return recado?.replace('{n}', numero.format(issue.maximum)) ?? padrao;
    }
    const campo = campos[caminho];
    if (!campo) return padrao;
    const limite = numero.format(issue.maximum);
    return issue.origin === 'string' ? `${campo} pode ter até ${limite} caracteres.` : `${campo} vai até ${limite}.`;
  }
  if (caminho === 'titulo') return 'Dê um título para a memória.';
  if (caminho === 'novasPessoas.*.nome') return 'Escreva o nome da pessoa.';
  if (caminho === 'fotos') return 'Escolha pelo menos uma foto.';
  const campo = campos[caminho];
  return campo ? `${campo} precisa ser ${issue.inclusive ? 'pelo menos' : 'maior que'} ${numero.format(issue.minimum)}.` : padrao;
}
