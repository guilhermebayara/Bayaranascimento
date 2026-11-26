// O índice da busca (migração 116) guarda o FTS5 em tabelas de sombra do próprio SQLite (busca_indice_*), duas
// delas sem rowid e todas em blocos binários. As impressões do banco inteiro deixam essas de fora: o que o
// índice tem de legível está em busca_textos, que continua na impressão, e as sombras são refeitas pelo FTS5.
export const foraDoIndiceDaBusca = (tabela: string) => !/^busca_indice(_|$)/.test(tabela);
