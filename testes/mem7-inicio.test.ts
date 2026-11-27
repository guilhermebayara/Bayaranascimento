import { beforeAll, describe, expect, it, vi } from 'vitest';
import { criarD1, temSqlite } from './apoio/d1';
import { paginaAstro } from './apoio/pagina-astro';
import { acrescentarEscondido } from './apoio/casos-escondidos';
const env=vi.hoisted(()=>({AMBIENTE:'previa',DB:undefined as unknown,FOTOS:{list:async()=>({objects:[],truncated:false}),delete:async()=>{},get:async()=>null,head:async()=>null}}));
vi.mock('cloudflare:workers',()=>({env}));
describe.skipIf(!(await temSqlite()))('MEM-7: os cartões chegam ao HTML do Início',async()=>{
  const d1=await criarD1();env.DB=d1;
  const {prepararBanco}=await import('../src/lib/servidor/banco');
  const repo=await import('../src/lib/servidor/repositorio');
  const gui={pessoa:'gui',nome:'Gui',admin:true,nucleos:['bayara-nascimento']};
  let inicio:Awaited<ReturnType<typeof paginaAstro>>;
  beforeAll(async()=>{
    await prepararBanco();acrescentarEscondido(d1.sqlite,'gui');
    d1.sqlite.prepare("INSERT INTO memorias (id,titulo,ano,mes,dia,tipo,criada_por,situacao,publicada_em) VALUES ('mem7-nova','Novidade do teste',2025,12,25,'outro','elizete','publicada','2099-01-01')").run();
    d1.sqlite.prepare("INSERT INTO memorias (id,titulo,ano,tipo,criada_por,situacao) VALUES ('mem7-rascunho','Rascunho do teste',0,'outro','gui','rascunho')").run();
    inicio=await paginaAstro('src/pages/index.astro',env);
  });
  it.each(['novidades','contar','outros-anos','outros-anos-sem-novo','rascunhos'])('Início mostra %s recebido do banco',async(cartao)=>{
    const desde=cartao==='outros-anos-sem-novo'?'2199-01-01':'2026-11-20';
    d1.sqlite.prepare(`INSERT OR REPLACE INTO visitas (pessoa,primeira_em,visita_em,ultima_em,anterior_em,carta_em)
      VALUES ('gui','2026-11-01',datetime('now'),datetime('now'),?,'2026-11-01')`).run(desde);
    const dados=await repo.memoriasDoInicio(gui,desde,{ano:2026,mes:12,dia:25});
    const html=await inicio.render({request:new Request('http://localhost/?hoje=2026-12-25'),locals:{usuario:gui,tipos:await repo.listarTipos()}});
    if(cartao==='novidades'){
      expect(dados.naMesa.length).toBeGreaterThan(0);
      expect(html).toContain('class="novo__mesa"');expect(html).toContain('Memória nova');
      for(const m of dados.naMesa) expect(html).toContain(m.titulo);
    }else if(cartao==='contar'){
      expect(dados.paraContar).toBeDefined();
      expect(html).toContain('Você estava lá e ainda não contou');
      expect(html).toContain(`href="/memorias/${dados.paraContar!.id}/relato"`);
    }else if(cartao.startsWith('outros-anos')){
      expect(dados.outrosAnos?.itens.length).toBeGreaterThan(0);
      expect(html).toContain('id="outros-anos"');
      for(const m of dados.outrosAnos!.itens) expect(html).toContain(m.titulo);
      if(cartao==='outros-anos-sem-novo') expect(html).toContain('id="da-caixa"');
    }else{
      expect(dados.rascunhos.total).toBeGreaterThan(0);
      expect(html).toContain('class="novo__rascunho"');
      expect(html).toMatch(/Continuar o rascunho|Ver seus rascunhos/);
    }
  });
  it('ver=acaso valida os filtros na entrada real, descartando os inexistentes e os escondidos',async()=>{
    const explorar=await paginaAstro('src/pages/explorar.astro',env);
    const locals={usuario:gui,tipos:await repo.listarTipos()};
    const r=await explorar.response({request:new Request('http://localhost/explorar?ver=acaso&m=1992-chegada-do-gui&tipo=inexistente&pessoa=zz-pessoa&nucleo=inexistente&capitulo=zz-cap&tema=zz-tema'),locals});
    expect(r.status).toBe(200);
    const html=await r.text();
    expect(html).toContain((await repo.obterMemoria(gui,'1992-chegada-do-gui'))!.titulo);
    expect(html).not.toContain('Pessoa Escondida');expect(html).not.toContain('Capítulo escondido');
    expect(html).not.toContain('Tema escondido');
    // Um filtro válido continua valendo e tira a memória pedida, de outro tipo.
    const filtrado=await explorar.response({request:new Request('http://localhost/explorar?ver=acaso&tipo=outro&m=1992-chegada-do-gui'),locals});
    expect(filtrado.status).toBe(302);
    const url=new URL(filtrado.headers.get('location')!,'http://localhost');
    expect(url.searchParams.get('tipo')).toBe('outro');
    const m=await repo.obterMemoria(gui,url.searchParams.get('m')!);expect(m?.tipo).toBe('outro');
  });
});
