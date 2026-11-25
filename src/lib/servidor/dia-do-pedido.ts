// O simulador de data ("?hoje=AAAA-MM-DD"): mostra o Início como num outro dia, para ver os aniversários, o
// "Neste dia" e o cartão "Na TV da sala" antes da data, e para as capturas saírem sempre iguais. Só vale nas
// prévias, no computador e na homologação; na produção, nunca (diaSimulado, em src/lib/sala.ts, recusa pelo
// ambiente). A guarda (scripts/confere-producao.mjs, regra 14) confere que só este arquivo lê o "hoje" do
// endereço e que a recusa da produção continua no começo de diaSimulado.
import { diaSimulado } from '../sala';
import type { Dia } from '../painel';
import { ambiente } from './ambiente';

export const diaSimuladoDoPedido = (url: URL): Dia | undefined => diaSimulado(url.searchParams.get('hoje'), ambiente());
