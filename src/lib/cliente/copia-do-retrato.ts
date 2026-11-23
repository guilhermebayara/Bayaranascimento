// Roda no navegador. A cópia pequena do retrato (sessão D1c, src/lib/retratos.ts): no recorte, ao enviar, e no
// ajuste "Cópias menores das fotos" da Administração, para os retratos de antes.
import { QUALIDADE_DA_COPIA_DO_RETRATO, ladoDaCopiaDoRetrato } from '../retratos';

/**
 * A cópia pequena do retrato (sessão D1c, src/lib/retratos.ts), feita a partir do quadrado já recortado.
 * WebP quando o navegador gera WebP de verdade (o Safari devolve PNG quando não sabe: aí vai JPEG). Se der
 * errado, nada: o retrato sobe sozinho e a rota entrega a original.
 */
export async function fazerCopiaDoRetrato(quadrado: HTMLCanvasElement | ImageBitmap): Promise<Blob | null> {
  try {
    const lado = ladoDaCopiaDoRetrato(quadrado.width);
    const tela = document.createElement('canvas');
    tela.width = tela.height = lado;
    const contexto = tela.getContext('2d')!;
    contexto.imageSmoothingQuality = 'high';
    contexto.drawImage(quadrado, 0, 0, lado, lado);
    const paraBlob = (tipo: string, qualidade: number) => new Promise<Blob | null>((resolver) => tela.toBlob(resolver, tipo, qualidade));
    const webp = await paraBlob('image/webp', QUALIDADE_DA_COPIA_DO_RETRATO.webp);
    if (webp?.type === 'image/webp') return webp;
    return await paraBlob('image/jpeg', QUALIDADE_DA_COPIA_DO_RETRATO.jpg);
  } catch {
    return null;
  }
}
