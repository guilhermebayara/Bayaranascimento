// Roda no navegador. Reduz a foto antes de enviar: fotos de celular chegam
// com vários megabytes, e o site não precisa de mais que isso para exibir bem.
// Os originais continuam onde estavam (iCloud, celular).

const LADO_MAXIMO = 2400;
const QUALIDADE = 0.85;

export async function prepararFoto(arquivo: File): Promise<Blob> {
  try {
    // "from-image" respeita a rotação gravada pela câmera
    const imagem = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagem.width, imagem.height));
    const largura = Math.round(imagem.width * escala);
    const altura = Math.round(imagem.height * escala);

    const tela = document.createElement('canvas');
    tela.width = largura;
    tela.height = altura;
    tela.getContext('2d')!.drawImage(imagem, 0, 0, largura, altura);
    imagem.close();

    const reduzida = await new Promise<Blob | null>((resolver) => tela.toBlob(resolver, 'image/jpeg', QUALIDADE));
    if (reduzida) return reduzida;
  } catch {
    // Navegador não conseguiu abrir a imagem: tenta enviar como está
  }
  return arquivo;
}
