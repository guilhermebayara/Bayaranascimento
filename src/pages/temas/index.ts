// Os temas não têm lista própria: ficam no fim de "Capítulos". Quem apaga o fim do endereço de um
// tema chega lá, no ponto onde os temas começam (resposta do Gui à P11 do QA de design, 17/11/2026).
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ redirect }) => redirect('/capitulos#temas', 302);
