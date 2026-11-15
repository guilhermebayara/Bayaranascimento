import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { TIPOS_IDS } from './data/tipos';

const pessoas = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pessoas' }),
  schema: z.object({
    nome: z.string(),
    // Como a pessoa aparece nos filtros e nos cartões
    apelido: z.string().optional(),
    // Quem é do núcleo aparece no menu do topo. Os demais ficam na página "Pessoas".
    nucleo: z.boolean().default(false),
    // Relação com a família, em texto livre: "avó materna", "marido da Giovanna"
    parentesco: z.string().optional(),
    nascimento: z.number().int().optional(),
    falecimento: z.number().int().optional(),
    foto: z.string().optional(),
    // Ordem em que aparece nas listas
    ordem: z.number().default(99),
  }),
});

const memorias = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/memorias' }),
  schema: z.object({
    titulo: z.string(),
    // Data: só o ano é obrigatório. Mês e dia entram quando a gente souber.
    ano: z.number().int(),
    mes: z.number().int().min(1).max(12).optional(),
    dia: z.number().int().min(1).max(31).optional(),
    // Marque quando a data for um chute ("meados de 1994")
    aproximada: z.boolean().default(false),
    tipo: z.enum(TIPOS_IDS),
    pessoas: z.array(reference('pessoas')).default([]),
    lugar: z.string().optional(),
    // Quem criou o registro. Os relatos ficam em src/content/relatos.
    criadaPor: reference('pessoas').optional(),
    fotos: z
      .array(
        z.object({
          // Endereço da imagem. Sem endereço, aparece um espaço reservado.
          src: z.string().optional(),
          legenda: z.string().optional(),
          // A foto chave é a que aparece na linha do tempo
          chave: z.boolean().default(false),
          // Quem enviou a foto pelo site. Só essa pessoa pode removê-la.
          enviadaPor: reference('pessoas').optional(),
        }),
      )
      .default([]),
    // Memórias de exemplo, para apagar quando o acervo real entrar
    exemplo: z.boolean().default(false),
    rascunho: z.boolean().default(false),
  }),
});

// Um relato é a lembrança de uma pessoa sobre uma memória.
// Fica em src/content/relatos/<memoria>/<pessoa>.md: um arquivo por pessoa,
// para que cada um edite só o próprio relato.
const relatos = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/relatos' }),
  schema: z.object({
    memoria: reference('memorias'),
    por: reference('pessoas'),
    // Quando o relato é de alguém que não acessa o site: quem ouviu e escreveu
    registradoPor: reference('pessoas').optional(),
  }),
});

export const collections = { pessoas, memorias, relatos };
