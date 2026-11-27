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
});
