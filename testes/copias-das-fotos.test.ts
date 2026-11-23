// As cópias menores das fotos (sessão D1b, 23/11/2026; src/lib/copias-das-fotos.ts): as medidas, os nomes
// no bucket (nunca o de uma original), a leitura das medidas de cada formato, a conferência do que chega
// e as fontes de cada <img>. As cópias das fotos de exemplo conferem com os arquivos de exemplos/fotos/copias/.
import { describe, expect, it } from 'vitest';
import {
  LADO_MENOR,
  chaveDaCopia,
  conferirCopias,
  enderecoDaFoto,
  fontesDaFoto,
  gravarCopias,
  lerCaminhoDaFoto,
  lerCopias,
  medidaDaCopia,
  medidaDaImagem,
  type Copias,
} from '../src/lib/copias-das-fotos';
import { COPIAS_DE_EXEMPLO, FOTOS_DE_EXEMPLO, copiasDeExemplo, ehChaveDeExemplo, nomeDaCopiaDeExemplo } from '../src/lib/fotos-de-exemplo';
import { SETE_DIAS, cabecalhoDeGuardar } from '../src/lib/servidor/http';

// O nome do módulo fica numa variável porque o projeto não tem os tipos do Node
const fs = 'node:fs';
const cripto = 'node:crypto';
const { readFileSync, readdirSync } = (await import(/* @vite-ignore */ fs)) as { readFileSync: (caminho: URL) => Uint8Array; readdirSync: (caminho: URL) => string[] };
const { createHash } = (await import(/* @vite-ignore */ cripto)) as { createHash: (a: string) => { update: (b: Uint8Array) => { digest: (f: string) => string } } };
const arquivo = (nome: string) => readFileSync(new URL(`../exemplos/fotos/${nome}`, import.meta.url));

const ORIGINAL = '2026/0f3c2a1e-1234-4abc-8def-0123456789ab.jpg';
const CHAVE_DA_ORIGINAL = /^\d{4}\/[0-9a-f-]{36}\.(jpg|png|webp)$/;

describe('as medidas das cópias', () => {
  it('o lado menor vai a 480 e a 1200, sem nunca aumentar a foto', () => {
    expect(medidaDaCopia(2400, 1800, 'pequena')).toEqual([640, 480]);
    expect(medidaDaCopia(1800, 2400, 'media')).toEqual([1200, 1600]);
    expect(medidaDaCopia(800, 600, 'media')).toEqual([800, 600]);
    expect(medidaDaCopia(300, 200, 'pequena')).toEqual([300, 200]);
  });
  it('a panorâmica não vira cópia grande: o lado maior fica no dobro do menor', () => {
    expect(medidaDaCopia(2400, 600, 'pequena')).toEqual([960, 240]);
    expect(Math.min(...medidaDaCopia(2400, 600, 'media'))).toBeLessThanOrEqual(LADO_MENOR.media);
  });
});

describe('o nome da cópia no bucket', () => {
  it('fica ao lado da original, com o tamanho e o formato', () => {
    expect(chaveDaCopia(ORIGINAL, 'pequena', 'webp')).toBe('2026/0f3c2a1e-1234-4abc-8def-0123456789ab.pequena.webp');
    expect(chaveDaCopia(ORIGINAL, 'media', 'jpg')).toBe('2026/0f3c2a1e-1234-4abc-8def-0123456789ab.media.jpg');
    expect(chaveDaCopia('exemplos/karol-6.jpg', 'pequena', 'webp')).toBe('exemplos/karol-6.pequena.webp');
  });
  it('nunca é o nome de uma original: gravar a cópia não substitui nada, e a rota não a entrega como original', () => {
    for (const chave of [ORIGINAL, '2025/aaaaaaaa-0000-0000-0000-000000000001.png', '2024/bbbbbbbb-0000-0000-0000-000000000002.webp', 'exemplos/chico-1.jpg']) {
      for (const t of ['pequena', 'media'] as const) {
        for (const f of ['webp', 'jpg'] as const) {
          const copia = chaveDaCopia(chave, t, f);
          expect(copia).not.toBe(chave);
          expect(copia).not.toMatch(CHAVE_DA_ORIGINAL);
          expect(ehChaveDeExemplo(copia)).toBe(false);
        }
      }
    }
  });
  it('recusa o que não é chave de foto', () => {
    expect(() => chaveDaCopia('retratos/x.jpg', 'pequena', 'webp')).toThrow();
    expect(() => chaveDaCopia('2026/../segredo.jpg', 'pequena', 'webp')).toThrow();
  });
  it('o endereço da cópia é a mesma rota, com o tamanho na frente da chave da original', () => {
    expect(enderecoDaFoto(ORIGINAL)).toBe(`/fotos/${ORIGINAL}`);
    expect(enderecoDaFoto(ORIGINAL, 'pequena')).toBe(`/fotos/pequena/${ORIGINAL}`);
    expect(lerCaminhoDaFoto(`pequena/${ORIGINAL}`)).toEqual({ chave: ORIGINAL, tamanho: 'pequena' });
    expect(lerCaminhoDaFoto(`media/${ORIGINAL}`)).toEqual({ chave: ORIGINAL, tamanho: 'media' });
    expect(lerCaminhoDaFoto(ORIGINAL)).toEqual({ chave: ORIGINAL });
    expect(lerCaminhoDaFoto('grande/2026/x.jpg')).toEqual({ chave: 'grande/2026/x.jpg' });
  });
});

describe('as medidas lidas do próprio arquivo', () => {
  it('JPEG e WebP de verdade', () => {
    expect(medidaDaImagem(arquivo('chico-3.jpg'))).toEqual([1600, 900]);
    expect(medidaDaImagem(arquivo('karol-2.jpg'))).toEqual([1200, 1600]);
    expect(medidaDaImagem(arquivo('copias/chico-3.pequena.webp'))).toEqual([853, 480]);
  });
  it('PNG, WebP sem perda e estendido', () => {
    const png = new Uint8Array(33);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 3, 0x20, 0, 0, 2, 0x58]);
    expect(medidaDaImagem(png)).toEqual([800, 600]);
    const riff = (bloco: string, corpo: number[]) => new Uint8Array([...'RIFF'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [...'WEBP'].map((c) => c.charCodeAt(0)), [...bloco].map((c) => c.charCodeAt(0)), [0, 0, 0, 0], corpo, Array(10).fill(0)));
    // VP8X: largura e altura menos 1, em 24 bits
    expect(medidaDaImagem(riff('VP8X', [0, 0, 0, 0, 0x1f, 0x03, 0x00, 0x57, 0x02, 0x00]))).toEqual([800, 600]);
    // VP8L: 14 bits de cada, menos 1
    const l = 799 | (599 << 14);
    expect(medidaDaImagem(riff('VP8L', [0x2f, l & 0xff, (l >> 8) & 0xff, (l >> 16) & 0xff, (l >> 24) & 0xff]))).toEqual([800, 600]);
  });
  it('o que não é imagem não tem medida', () => {
    expect(medidaDaImagem(new TextEncoder().encode('não é uma imagem, só um texto comprido o bastante'))).toBeUndefined();
  });
});

describe('a conferência das cópias que chegam', () => {
  const original = arquivo('chico-3.jpg');
  const pequena = arquivo('copias/chico-3.pequena.webp');
  const media = arquivo('copias/chico-3.media.webp');
  it('aceita as cópias certas e devolve o que o banco guarda', () => {
    const r = conferirCopias(original, pequena, media);
    expect(r).toEqual({ copias: { formato: 'webp', pequena: [853, 480], media: [1600, 900], original: [1600, 900], bytes: pequena.byteLength + media.byteLength } });
  });
  it('recusa a cópia de outra foto, os tamanhos trocados, formato misturado e o que não é cópia', () => {
    expect(conferirCopias(original, arquivo('copias/karol-2.pequena.webp'), media)).toHaveProperty('erro');
    expect(conferirCopias(original, media, pequena)).toHaveProperty('erro');
    expect(conferirCopias(original, pequena, arquivo('chico-3.jpg'))).toHaveProperty('erro');
    expect(conferirCopias(original, new Uint8Array(64), media)).toHaveProperty('erro');
  });
});

describe('o que o banco guarda', () => {
  const copias: Copias = { formato: 'jpg', pequena: [480, 640], media: [1200, 1600], original: [1800, 2400], bytes: 250000 };
  it('volta igual depois de gravado', () => {
    expect(lerCopias(gravarCopias(copias))).toEqual(copias);
  });
  it('qualquer coisa fora do formato vale como "sem cópia"', () => {
    for (const ruim of [null, '', '{', '{"formato":"gif","pequena":[1,1],"media":[1,1]}', '{"formato":"webp","pequena":[0,1],"media":[1,1]}', 42]) expect(lerCopias(ruim)).toBeNull();
  });
});

describe('as fontes de cada <img>', () => {
  const copias: Copias = { formato: 'webp', pequena: [480, 640], media: [1200, 1600], original: [1800, 2400], bytes: 1 };
  it('sem cópia, a original: nunca uma foto quebrada', () => {
    expect(fontesDaFoto({ chave: ORIGINAL }, 'pequena')).toEqual({ src: `/fotos/${ORIGINAL}` });
    expect(fontesDaFoto({ chave: ORIGINAL, copias: null }, 'media')).toEqual({ src: `/fotos/${ORIGINAL}` });
    expect(fontesDaFoto({ chave: ORIGINAL, copias: null }, 'inteira')).toEqual({ src: `/fotos/${ORIGINAL}` });
  });
  it('as fotos de lista levam a pequena e a média, com a largura da caixa', () => {
    expect(fontesDaFoto({ chave: ORIGINAL, copias }, 'pequena', '160px')).toEqual({
      src: `/fotos/pequena/${ORIGINAL}`,
      srcset: `/fotos/pequena/${ORIGINAL} 480w, /fotos/media/${ORIGINAL} 1200w`,
      sizes: '160px',
    });
  });
  it('a foto principal leva a média; a galeria, a média e a original', () => {
    expect(fontesDaFoto({ chave: ORIGINAL, copias }, 'media')).toEqual({ src: `/fotos/media/${ORIGINAL}` });
    expect(fontesDaFoto({ chave: ORIGINAL, copias }, 'inteira')).toEqual({ src: `/fotos/media/${ORIGINAL}`, srcset: `/fotos/media/${ORIGINAL} 1200w, /fotos/${ORIGINAL} 1800w`, sizes: '100vw' });
  });
  it('a foto de exemplo usa as cópias de exemplo', () => {
    expect(fontesDaFoto({ chave: 'exemplos/chico-3.jpg' }, 'pequena', '100px').srcset).toBe('/fotos/pequena/exemplos/chico-3.jpg 853w, /fotos/media/exemplos/chico-3.jpg 1600w');
  });
});

describe('as cópias das fotos de exemplo', () => {
  it('são os arquivos de exemplos/fotos/copias/, com o SHA-256, a medida e o tamanho certos', () => {
    const pasta = new URL('../exemplos/fotos/copias/', import.meta.url);
    const esperados = FOTOS_DE_EXEMPLO.flatMap((f) => (['pequena', 'media'] as const).map((t) => nomeDaCopiaDeExemplo(f.nome, t))).sort();
    expect(readdirSync(pasta).sort()).toEqual(esperados);
    for (const f of FOTOS_DE_EXEMPLO) {
      const tabela = COPIAS_DE_EXEMPLO[f.nome]!;
      expect(medidaDaImagem(arquivo(f.nome)), f.nome).toEqual(tabela.original);
      for (const t of ['pequena', 'media'] as const) {
        const bytes = readFileSync(new URL(nomeDaCopiaDeExemplo(f.nome, t), pasta));
        expect(createHash('sha256').update(bytes).digest('hex'), `${f.nome} ${t}`).toBe(tabela[t].sha256);
        expect(medidaDaImagem(bytes)).toEqual(tabela[t].medida);
        expect(tabela[t].medida).toEqual(medidaDaCopia(tabela.original[0], tabela.original[1], t));
        expect(bytes.byteLength).toBe(tabela[t].bytes);
      }
      expect(copiasDeExemplo(`exemplos/${f.nome}`)?.formato).toBe('webp');
    }
    expect(copiasDeExemplo(ORIGINAL)).toBeNull();
  });
});

describe('o cabeçalho das fotos e dos retratos', () => {
  it('o que pode ficar guardado fica 7 dias no aparelho; o resto é conferido a cada uso', () => {
    expect(SETE_DIAS).toBe(604800);
    expect(cabecalhoDeGuardar(true, false)).toEqual({ 'Cache-Control': 'private, max-age=604800' });
    expect(cabecalhoDeGuardar(false, false)).toEqual({ 'Cache-Control': 'private, no-cache' });
  });
  it('sempre "private", e com o "Ver como" a resposta depende do cookie', () => {
    for (const guardar of [true, false]) {
      expect(cabecalhoDeGuardar(guardar, true)['Cache-Control']).toMatch(/^private, /);
      expect(cabecalhoDeGuardar(guardar, true).Vary).toBe('Cookie');
      expect(cabecalhoDeGuardar(guardar, false).Vary).toBeUndefined();
    }
  });
});
