// Complemento do gabarito: pai com cinco filhos reunidos, HTML bruto nas duas páginas, três leitores.
// Só loopback e banco de exemplo. Apaga só a fixture mem7-gabarito-* ao terminar.
import { mkdirSync,readFileSync,writeFileSync } from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const arg=(n,d)=>process.argv.includes(n)?process.argv[process.argv.indexOf(n)+1]:d;
const ENDERECOS_LOCAIS = new Set(['127.0.0.1', 'localhost', '[::1]']);
const endereco = new URL(arg('--base','http://127.0.0.1:4366'));
if (endereco.protocol !== 'http:' || !ENDERECOS_LOCAIS.has(endereco.hostname)) {
  process.exit(1);
}
const API = new URL('/cdn-cgi/local/explorer/api', endereco).href;
const saida=resolve(arg('--saida','/tmp/mem7-capitulos-html'));
const comparar=process.argv.includes('--comparar');mkdirSync(saida,{recursive:true});
const chamar=async(p,d)=>{const r=await fetch(`${API}${p}`,d&&{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(d)});const j=await r.json();if(!r.ok||!j.success)throw new Error(JSON.stringify(j));return j.result;};
const [db]=await chamar('/d1/database');if(db.name!=='DB')throw new Error('Esperava DB local.');
const sql=async(q)=>(await chamar(`/d1/database/${db.uuid}/raw`,{sql:q}))[0].results.rows;
const exemplos = (await sql("SELECT id FROM integrantes WHERE id LIKE 'ex-%' LIMIT 1")).length;
if (!exemplos) {
  process.exit(1);
}
const limpar=async()=>{
  await sql("DELETE FROM capitulo_memorias WHERE capitulo_id LIKE 'mem7-gabarito-%'");
  await sql("DELETE FROM capitulos WHERE pai_id = 'mem7-gabarito-pai'");
  await sql("DELETE FROM capitulos WHERE id = 'mem7-gabarito-pai'");
};
await limpar();
const casos=[];
try{
  await sql("INSERT INTO capitulos (id,titulo,criado_por,criado_em) VALUES ('mem7-gabarito-pai','Pai com cinco filhos','gui','2026-11-20')");
  const ms=await sql("SELECT id FROM memorias WHERE situacao = 'publicada' AND excluida_em IS NULL ORDER BY id LIMIT 6");
  for(let i=0;i<5;i++){
    await sql(`INSERT INTO capitulos (id,titulo,pai_id,criado_por,criado_em) VALUES ('mem7-gabarito-filho-${i}','Filho ${i}','mem7-gabarito-pai','gui','2026-11-20')`);
    await sql(`INSERT INTO capitulo_memorias VALUES ('mem7-gabarito-filho-${i}','${ms[i][0]}')`);
  }
  for(const leitor of ['gui','elizete','lucas-magno'])for(const [nome,p] of [['lista','/capitulos'],['pai','/capitulos/mem7-gabarito-pai']]){
    const r=await fetch(new URL(p,endereco),{headers:{cookie:`como=${leitor}`}});const html=Buffer.from(await r.arrayBuffer());
    if(r.status!==200)throw new Error(`${leitor} ${nome}: ${r.status}`);
    const arquivo=resolve(saida,`${leitor}-${nome}.html`);
    if(comparar&&!html.equals(readFileSync(arquivo)))throw new Error(`HTML diferente: ${leitor} ${nome}`);
    if(!comparar)writeFileSync(arquivo,html);
    casos.push({leitor,nome,bytes:html.length,sha256:createHash('sha256').update(html).digest('hex')});
  }
}finally{await limpar();}
writeFileSync(resolve(saida,comparar?'depois.json':'antes.json'),JSON.stringify(casos,null,2));
console.log(`${casos.length}/6 HTMLs ${comparar?'iguais':'gravados'}.`);
