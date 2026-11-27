import { beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { criarD1, temSqlite } from './apoio/d1';
const env=vi.hoisted(()=>({AMBIENTE:'previa',DB:undefined as unknown,FOTOS:{list:async()=>({objects:[],truncated:false}),delete:async()=>{},get:async()=>null,head:async()=>null}}));
vi.mock('cloudflare:workers',()=>({env}));
describe.skipIf(!(await temSqlite()))('MEM-7: capítulos nos limites reais do D1',async()=>{
  const d1=await criarD1();env.DB=d1;
  const {prepararBanco}=await import('../src/lib/servidor/banco');
  const repo=await import('../src/lib/servidor/repositorio');
  const gui={pessoa:'gui',nome:'Gui',admin:true,nucleos:['bayara-nascimento']};
  beforeAll(async()=>{await prepararBanco();});
  it.each([6,100])('%i capítulos, incluindo um pai com cinco filhos',async(n)=>{
    for(let i=0;i<n;i++){
      d1.sqlite.prepare("INSERT OR IGNORE INTO capitulos (id,titulo,pai_id,criado_por) VALUES (?,?,?,'gui')").run(`mem7-${i}`,`Capítulo ${i}`,i>0&&i<=5?'mem7-0':null);
      d1.sqlite.prepare("INSERT OR IGNORE INTO capitulo_memorias VALUES (?, '1992-chegada-do-gui')").run(`mem7-${i}`);
    }
    const cs=(await repo.listarCapitulos(gui)).filter(c=>c.id.startsWith('mem7-')).slice(0,n);
    // Não duplica a memória nos cinco filhos e no pai.
    let consulta='', valores:unknown[]=[];
    const preparar=d1.prepare.bind(d1);
    const espiao=vi.spyOn(d1,'prepare').mockImplementation(sql=>{
      const c=preparar(sql);
      if(sql.includes('visiveis AS MATERIALIZED')){
        consulta=sql;const bind=c.bind.bind(c);
        vi.spyOn(c,'bind').mockImplementation((...vs)=>{valores=vs;return bind(...vs);});
      }
      return c;
    });
    const resumos=await repo.resumosDosCapitulos(gui,cs);
    const cores=await repo.coresDosCapitulosNoBanco(gui,cs);
    espiao.mockRestore();
    expect(resumos.get('mem7-0')?.memorias).toBe(1);
    expect(resumos.size).toBe(n);expect(cores.has('mem7-0')).toBe(true);
    const pasta=mkdtempSync(join(tmpdir(),'mem7-d1-'));
    const sqlite='node:sqlite';const {backup}=await import(/* @vite-ignore */sqlite);
    await backup(d1.sqlite,join(pasta,'banco.sqlite'));
    writeFileSync(join(pasta,'consulta.json'),JSON.stringify({sql:consulta,valores}));
    const resultado=JSON.parse(execFileSync('python3',['-c',`
import sqlite3,json,sys
b=sqlite3.connect(sys.argv[1]);b.setlimit(sqlite3.SQLITE_LIMIT_COMPOUND_SELECT,5);b.setlimit(sqlite3.SQLITE_LIMIT_SQL_LENGTH,100000)
c=json.load(open(sys.argv[2]));linhas=b.execute(c['sql'],c['valores']).fetchall()
print(json.dumps({'linhas':len(linhas),'bytes':len(c['sql'].encode()),'composto':b.getlimit(sqlite3.SQLITE_LIMIT_COMPOUND_SELECT),'tamanho':b.getlimit(sqlite3.SQLITE_LIMIT_SQL_LENGTH)}))
`,join(pasta,'banco.sqlite'),join(pasta,'consulta.json')],{encoding:'utf8'}));
    expect(resultado).toMatchObject({linhas:n,composto:5,tamanho:100000});
    expect(resultado.bytes).toBeLessThan(100000);
    console.log(`D1: ${n} capítulos, ${resultado.bytes} bytes, limites 5/100000.`);
  });
});
