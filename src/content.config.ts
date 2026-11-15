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
    // Ordem em que aparece no menu
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
    // Quem escreveu o relato principal (o texto do arquivo)
    registradoPor: reference('pessoas').optional(),
    fotos: z
      .array(
        z.object({
          // Endereço da imagem. Sem endereço, aparece um espaço reservado.
          src: z.string().optional(),
          legenda: z.string().optional(),
          // A foto chave é a que aparece na linha do tempo
          chave: z.boolean().default(false),
        }),
      )
      .default([]),
    // Outros relatos da mesma memória, cada um por uma pessoa
    relatos: z
      .array(z.object({ por: reference('pessoas'), texto: z.string() }))
      .default([]),
    // Memórias de exemplo, para apagar quando o acervo real entrar
    exemplo: z.boolean().default(false),
    rascunho: z.boolean().default(false),
  }),
});

export const collections = { pessoas, memorias };
