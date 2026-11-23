// Regra 11 da guarda da produção (scripts/confere-producao.mjs), a parte da cópia para o espelho (sessão D1e,
// 23/11/2026), à parte para os testes darem a ela um código errado e verem a recusa
// (testes/guarda-copia-para-o-espelho.test.ts).
//
// "Baixar cópia para o espelho" sai da produção e chega à homologação. Ela só pode levar o que o espelho já
// lê: as tabelas da família, e nelas nenhuma coluna de texto escrito ou de arquivo. A guarda confere:
// - a lista (src/lib/copia-para-o-espelho.ts, COLUNAS_PARA_O_ESPELHO) só tem tabelas da família, as mesmas que
//   o espelho pode ler, e nenhuma coluna de texto escrito ou de arquivo ("Sobre", retrato, texto, legenda...);
// - a montagem (src/lib/servidor/copia-para-o-espelho.ts) lê só pela lista: nenhum SELECT *, nenhum outro
//   texto de SQL, nenhum nome de tabela escrito à mão, nenhum bucket e nenhum outro módulo do servidor;
// - a rota (src/pages/api/copia-para-o-espelho.ts) é só dos administradores e só entrega a montagem;
// - o espelho da homologação (a rota e gravarEspelho) recusa o que não for a cópia para o espelho antes de ler.
// Os comentários não contam: o código é lido sem eles (separar, de scripts/copias-no-bucket.mjs).
import { separar } from './copias-no-bucket.mjs';

/** As tabelas da família, as únicas que o espelho lê da cópia (a mesma lista da regra 11). */
export const TABELAS_DA_FAMILIA = ['integrantes', 'nucleo_membros', 'filiacoes', 'casais', 'casal_nucleos', 'casal_fases', 'lacos_coracao', 'lacos_resumidos'];
/** Colunas que são texto escrito por alguém, arquivo ou endereço: nunca saem para o espelho. */
const COLUNA_PROIBIDA = /^(sobre|retrato|retrato_\w+|\w+_retrato|texto|legenda|chave|\w+_chave|titulo|descricao|motivo|nota|conteudo|mensagem|audio|foto|email|e_mail)$/;

export const LISTA = 'src/lib/copia-para-o-espelho.ts';
export const MONTAGEM = 'src/lib/servidor/copia-para-o-espelho.ts';
export const ROTA = 'src/pages/api/copia-para-o-espelho.ts';
export const ROTA_DO_ESPELHO = 'src/pages/api/espelho.ts';
export const GRAVAR_O_ESPELHO = 'src/lib/servidor/espelho.ts';

/** As tabelas e colunas da lista, lidas do código sem comentários. */
export function lerLista(texto) {
  const { codigo } = separar(texto);
  const inicio = codigo.indexOf('export const COLUNAS_PARA_O_ESPELHO = {');
  const fim = codigo.indexOf('} as const', inicio);
  if (inicio === -1 || fim === -1) return null;
  const bloco = codigo.slice(inicio + 'export const COLUNAS_PARA_O_ESPELHO = {'.length, fim);
  const tabelas = {};
  for (const m of bloco.matchAll(/(\w+)\s*:\s*\[([^\]]*)\]/g)) tabelas[m[1]] = [...m[2].matchAll(/'([^']*)'|"([^"]*)"/g)].map((c) => c[1] ?? c[2]);
  // O que sobra do bloco tirando as tabelas lidas: precisa ser só vírgulas e espaços
  const resto = bloco.replace(/(\w+)\s*:\s*\[([^\]]*)\]/g, '').replace(/[\s,]/g, '');
  return { tabelas, resto };
}

/** As recusas, uma por regra quebrada. `fontes` é { caminho: texto }. */
export function copiaParaOEspelhoErrada(fontes) {
  const erros = [];
  const falhar = (m) => erros.push(m);
  const ler = (caminho) => {
    if (typeof fontes[caminho] !== 'string') {
      falhar(`${caminho}: não encontrei o arquivo.`);
      return null;
    }
    return fontes[caminho];
  };

  // A lista
  const lista = ler(LISTA);
  if (lista !== null) {
    const lida = lerLista(lista);
    if (!lida || lida.resto !== '' || Object.keys(lida.tabelas).length === 0) {
      falhar(`${LISTA}: COLUNAS_PARA_O_ESPELHO precisa ser uma lista simples, tabela: ['coluna', ...], para a guarda conferir cada uma.`);
    } else {
      for (const [tabela, colunas] of Object.entries(lida.tabelas)) {
        if (!TABELAS_DA_FAMILIA.includes(tabela)) falhar(`${LISTA}: a cópia para o espelho leva "${tabela}"; só as tabelas da família passam (nomes, datas e laços).`);
        for (const coluna of colunas) {
          if (COLUNA_PROIBIDA.test(coluna) || !/^\w+$/.test(coluna)) falhar(`${LISTA}: a cópia para o espelho leva "${tabela}.${coluna}"; texto escrito, retrato e arquivo nunca passam.`);
        }
      }
    }
  }

  // A montagem
  const montagem = ler(MONTAGEM);
  if (montagem !== null) {
    const { codigo, literais } = separar(montagem);
    if (/SELECT\s+\*|\*\s*FROM/i.test(montagem.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''))) falhar(`${MONTAGEM}: a cópia para o espelho não lê SELECT *; as colunas vêm uma a uma de COLUNAS_PARA_O_ESPELHO.`);
    const sql = literais.filter((l) => /\b(SELECT|FROM|JOIN|WHERE|UNION|INSERT|UPDATE|DELETE|PRAGMA|sqlite_master)\b/i.test(l));
    const permitidos = ['SELECT ', ' FROM ', ' ORDER BY rowid'];
    for (const l of sql) if (!permitidos.includes(l)) falhar(`${MONTAGEM}: SQL fora da forma combinada ("${l.trim()}"); a cópia para o espelho lê só pela lista, tabela a tabela.`);
    if (!codigo.includes("db.prepare(`SELECT ${COLUNAS_PARA_O_ESPELHO[tabela].join(', ')} FROM ${tabela} ORDER BY rowid`)") || !codigo.includes('TABELAS_PARA_O_ESPELHO.map((tabela) =>')) {
      falhar(`${MONTAGEM}: a leitura precisa ser TABELAS_PARA_O_ESPELHO.map((tabela) => db.prepare(\`SELECT \${COLUNAS_PARA_O_ESPELHO[tabela].join(', ')} FROM \${tabela} ORDER BY rowid\`)).`);
    }
    if ((codigo.match(/\.prepare\(/g) ?? []).length !== 1 || /\.exec\(|\.raw\(|\.first\(/.test(codigo)) falhar(`${MONTAGEM}: a cópia para o espelho tem uma leitura só, a da lista.`);
    if (/bucket|\.put\(|\.get\(/i.test(codigo)) falhar(`${MONTAGEM}: a cópia para o espelho leva só o banco; ela não lê nem grava arquivo.`);
    const imports = [...codigo.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]);
    for (const modulo of imports) if (!['./ambiente', '../copia-em-partes', '../copia-para-o-espelho'].includes(modulo)) falhar(`${MONTAGEM}: importa "${modulo}"; a cópia para o espelho só usa o banco e a lista.`);
    for (const l of literais) if (/^\w+$/.test(l) && /^(memorias|relatos|relato_mensagens|fotos|audios|capitulos|cartas|versoes|proximidades|apelidos_meus|ex_para_mim|avisos|sugestoes|reacoes|retratos_enviados)$/.test(l)) falhar(`${MONTAGEM}: cita a tabela "${l}"; a cópia para o espelho só lê pela lista.`);
  }

  // A rota
  const rota = ler(ROTA);
  if (rota !== null) {
    const { codigo } = separar(rota);
    if (!codigo.includes("if (!locals.usuario.admin) return erro(403,") || !/return respostaDaCopiaParaOEspelho\(\);/.test(codigo)) falhar(`${ROTA}: só os administradores baixam a cópia para o espelho, e a rota só entrega a montagem.`);
    if (/export const (POST|PUT|PATCH|DELETE)/.test(codigo)) falhar(`${ROTA}: a cópia para o espelho só é lida, nunca gravada.`);
  }

  // O espelho recusa o que não for a cópia para o espelho
  const espelho = ler(ROTA_DO_ESPELHO);
  if (espelho !== null) {
    const { codigo } = separar(espelho);
    const recusa = codigo.indexOf('const recusa = recusaDaCopiaParaOEspelho(copia);');
    if (recusa === -1 || codigo.indexOf('if (recusa) return voltar(request, PAGINA, { erro: recusa });', recusa) === -1 || recusa > codigo.indexOf('gravarEspelho(copia)')) {
      falhar(`${ROTA_DO_ESPELHO}: o espelho recusa, antes de gravar, o arquivo que não for a cópia para o espelho.`);
    }
    if (!codigo.includes('arquivo.size > LIMITE_DA_COPIA_PARA_O_ESPELHO')) falhar(`${ROTA_DO_ESPELHO}: o espelho recusa o arquivo maior que LIMITE_DA_COPIA_PARA_O_ESPELHO.`);
  }
  const gravar = ler(GRAVAR_O_ESPELHO);
  if (gravar !== null) {
    const { codigo } = separar(gravar);
    const recusa = codigo.indexOf('const recusa = recusaDaCopiaParaOEspelho(copia);');
    if (recusa === -1 || !codigo.includes('if (recusa) throw new Error(recusa);') || recusa > codigo.indexOf('espelhar(copia)')) {
      falhar(`${GRAVAR_O_ESPELHO}: gravarEspelho recusa, antes de espelhar, o que não for a cópia para o espelho.`);
    }
  }
  return erros;
}
