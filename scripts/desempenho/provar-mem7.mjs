// Provas negativas da MEM-7, sem tocar a árvore de trabalho: só um git archive em /tmp.
// node scripts/desempenho/provar-mem7.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, cpSync, mkdirSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const raiz=process.cwd(), pasta=mkdtempSync(join(tmpdir(),'mem7-provas-'));
execFileSync('git',['archive','--output',join(pasta,'referencia.tar'),'40c7e33']);
execFileSync('tar',['-xf',join(pasta,'referencia.tar'),'-C',pasta]);
symlinkSync(resolve('node_modules'),join(pasta,'node_modules'));
for(const p of ['testes/mem7-mensagens.test.ts','testes/mem7-capitulos.test.ts','testes/mem7-paginas.test.ts','testes/mem7-inicio.test.ts','testes/apoio/pagina-astro.ts','testes/amostras/mem7-historico-nome.html','testes/amostras/mem7-historico-sobre.html']){
  mkdirSync(resolve(pasta,p,'..'),{recursive:true});cpSync(resolve(p),resolve(pasta,p));
}
const resultados=[];
function prova(nome,arquivo,filtro,deveFalhar=true){
  const r=spawnSync(process.execPath,[resolve('node_modules/vitest/vitest.mjs'),'run',`testes/${arquivo}.test.ts`,...(filtro?['-t',filtro]:[])],{cwd:pasta,encoding:'utf8',maxBuffer:8*1024*1024,env:{...process.env,MEM7_REFERENCIA:pasta}});
  const log=(r.stdout??'')+(r.stderr??'');writeFileSync(join(pasta,`${nome}.log`),log);
  const certa=deveFalhar?r.status===1&&/AssertionError|TypeError|too many terms|query string is too large/.test(log):r.status===0;
  resultados.push({nome,saida:r.status,esperada:deveFalhar?1:0,certa});
  console.log(`${certa?'OK':'FALHOU'} ${nome}: saída ${r.status}`);
  if(!certa) console.error(log.slice(-4000));
}
prova('ponto-1','mem7-mensagens');
prova('ponto-2-e-4','mem7-paginas');
prova('ponto-3','mem7-capitulos');
prova('ponto-5-sem-mutacao','mem7-inicio',undefined,false);
const caminho=join(pasta,'src/pages/index.astro'),original=readFileSync(caminho,'utf8');
for(const [nome,antes,depois,filtro] of [
  ['novidades','const naMesa = inicio.naMesa;','const naMesa = [];','Início mostra novidades'],
  ['contar','const paraContar = inicio.paraContar;','const paraContar = undefined;','Início mostra contar'],
  ['outros-anos','const outrosAnos = inicio.outrosAnos;','const outrosAnos = undefined;','Início mostra outros-anos'],
  ['rascunhos','const quantosRascunhos = rascunhos.memorias.length + rascunhos.relatos.length;','const quantosRascunhos = 0;','Início mostra rascunhos'],
]){
  if(!original.includes(antes))throw new Error(`Mutação não aplicada: ${nome}`);
  writeFileSync(caminho,original.replace(antes,depois));prova(`cartao-${nome}-desligado`,'mem7-inicio',filtro);writeFileSync(caminho,original);
}
const palco=join(pasta,'src/lib/servidor/ao-acaso.ts');
writeFileSync(palco,readFileSync(palco,'utf8').replace('const filtros = soFiltrosConhecidos(','const filtros = ((f) => f)('));
prova('acaso-sem-validar','mem7-inicio','ver=acaso');
writeFileSync(join(pasta,'resultado.json'),JSON.stringify({referencia:'40c7e33',resultados},null,2));
console.log(`Logs: ${pasta}`);
if(resultados.some(r=>!r.certa))process.exitCode=1;
