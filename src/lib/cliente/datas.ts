// Avisa na hora uma data que não existe (31 de fevereiro, dia sem mês), ao lado dos campos,
// e segura o "Continuar" e o envio até ela ser corrigida.
import { problemaNaData } from '../datas';

export function ligarDatas(raiz: ParentNode, grupos: { ano: string; mes: string; dia: string }[]): void {
  for (const nomes of grupos) {
    const campo = (nome: string) => raiz.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${nome}"]`);
    const [ano, mes, dia] = [campo(nomes.ano), campo(nomes.mes), campo(nomes.dia)];
    if (!ano || !mes || !dia) continue;
    const aviso = document.createElement('p');
    aviso.className = 'recado recado--erro';
    aviso.setAttribute('role', 'alert');
    aviso.hidden = true;
    (dia.closest('.campos-data') ?? dia.parentElement!).after(aviso);
    const conferir = () => {
      const numero = (c: HTMLInputElement | HTMLSelectElement) => (c.value ? Number(c.value) : undefined);
      const problema = problemaNaData(numero(ano), numero(mes), numero(dia)) ?? '';
      dia.setCustomValidity(problema);
      aviso.textContent = problema;
      aviso.hidden = !problema;
    };
    for (const c of [ano, mes, dia]) {
      c.addEventListener('input', conferir);
      c.addEventListener('change', conferir);
    }
    conferir();
  }
}
