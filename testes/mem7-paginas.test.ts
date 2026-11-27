import { beforeAll, describe, expect, it, vi } from 'vitest';
import { criarD1, temSqlite } from './apoio/d1';
import { paginaAstro } from './apoio/pagina-astro';
const env = vi.hoisted(() => ({ AMBIENTE:'previa', DB:undefined as unknown, FOTOS:{list:async()=>({objects:[],truncated:false}),delete:async()=>{},get:async()=>null,head:async()=>null} }));
vi.mock('cloudflare:workers',()=>({env}));
describe.skipIf(!(await temSqlite()))('MEM-7: HTML real das páginas',async()=>{
  const d1=await criarD1();env.DB=d1;
  const {prepararBanco}=await import('../src/lib/servidor/banco');
  const repo=await import('../src/lib/servidor/repositorio');
  const gui={pessoa:'gui',nome:'Gui',admin:true,nucleos:['bayara-nascimento']};
  beforeAll(async()=>{await prepararBanco();});
  it.each(['sobre','nome'])('histórico: só %s conserva a descrição e o botão Restaurar',async(campo)=>{
    const pagina=await paginaAstro('src/pages/pessoas/[id]/historico.astro',env,process.env.MEM7_REFERENCIA);
      d1.sqlite.exec('SAVEPOINT historico');
      try{
        d1.sqlite.prepare("UPDATE integrantes SET sobre = ? WHERE id = 'gui'").run(campo==='sobre'?null:'Sobre anterior.');
        const guiAntes=(await repo.listarIntegrantes()).find(i=>i.id==='gui')!;
        await repo.lerSobreDaPessoa(guiAntes);
        await repo.atualizarIntegrante(guiAntes,{...guiAntes,nome:campo==='nome'?'Nome atualizado':guiAntes.nome,tipo:guiAntes.tipo,tratamento:guiAntes.tratamento,sobre:campo==='sobre'?'Sobre preenchido.':'Sobre anterior.'},gui);
        d1.sqlite.prepare("UPDATE versoes SET criada_em = '2026-11-26 12:00:00'").run();
        const html=await pagina.render({params:{id:'gui'},locals:{usuario:gui,tipos:await repo.listarTipos()},request:new Request('http://localhost/pessoas/gui/historico')});
        expect(html).toContain(`Mudou: ${campo}.`);
        expect(html).not.toContain('Mudou: nome, sobre.');
        expect(html).toContain('Restaurar esta versão');
        await expect(html).toMatchFileSnapshot(`amostras/mem7-historico-${campo}.html`);
      }finally{d1.sqlite.exec('ROLLBACK TO historico; RELEASE historico');}
  });
  it.each(['memoria','foto'])('Sua conta: descarta o par quando a %s sai entre as leituras',async(alvo)=>{
    const pagina=await paginaAstro('src/pages/conta.astro',env);
    d1.sqlite.exec('SAVEPOINT conta');
    try{
      d1.sqlite.prepare("INSERT INTO memorias (id,titulo,ano,tipo,criada_por,situacao) VALUES ('mem7-corrida','Corrida da conta',2025,'outro','gui','publicada')").run();
      const foto=d1.sqlite.prepare("INSERT INTO fotos (memoria_id,chave,enviada_por) VALUES ('mem7-corrida','exemplos/corrida.jpg','gui')").run().lastInsertRowid;
      const lote=d1.batch.bind(d1);let interrompeu=false;
      const espiao=vi.spyOn(d1,'batch').mockImplementation(async cs=>{
        const resultado=await lote(cs);
        if(cs.some(c=>c.sql.includes('SELECT m.id AS memoria, f.id FROM fotos'))){
          interrompeu=true;
          if(alvo==='memoria') d1.sqlite.prepare("UPDATE memorias SET excluida_em = datetime('now') WHERE id = 'mem7-corrida'").run();
          else d1.sqlite.prepare("UPDATE fotos SET removida_em = datetime('now') WHERE id = ?").run(foto);
        }
        return resultado;
      });
      const html=await pagina.render({locals:{usuario:gui,tipos:await repo.listarTipos()},request:new Request('http://localhost/conta')});
      expect(interrompeu).toBe(true);
      expect(html).toContain('Sua conta');
      expect(html).not.toContain('src="/fotos/pequena/exemplos/corrida.jpg"');
      espiao.mockRestore();
    }finally{vi.restoreAllMocks();d1.sqlite.exec('ROLLBACK TO conta; RELEASE conta');}
  });

});
