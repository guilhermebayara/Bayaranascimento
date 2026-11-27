import { mensagensDerivadas } from './conversa';

/** Vai logo depois do INSERT do relato, no mesmo lote. Um INSERT ignorado também deixa a conversa como está. */
export function comandoDasDerivadasDoRelatoInserido(texto: string) {
  return {
    sql: `WITH novo AS MATERIALIZED (SELECT id, criado_em FROM relatos WHERE id = last_insert_rowid() AND changes() = 1)
      INSERT INTO relato_mensagens (relato_id, ordem, tipo, texto, enviada_em)
      SELECT novo.id, j.key, 'texto', j.value, novo.criado_em FROM novo, json_each(?) j`,
    valores: [JSON.stringify(mensagensDerivadas(texto, [], []).map((m) => m.texto))],
  };
}
