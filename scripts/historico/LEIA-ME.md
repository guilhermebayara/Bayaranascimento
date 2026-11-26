# Scripts de sessões que acabaram

O que ficou aqui serviu a uma sessão só e fica como registro: os relatórios em `docs/desempenho/` dizem como cada
um foi usado. O build, a guarda da produção e os testes não leem esta pasta, e nada daqui roda sozinho.

- `medir-navegador.mjs`, `medir-espera.mjs`, `medir-falhas.mjs`, `medir-servidor.mjs` e `proxy-local.mjs`: a medição
  M1 (22/11/2026). Ainda recusam a produção e a homologação, mas ninguém os roda de rotina.
- `atraso-no-d1.patch` e `atraso-no-d1-guarda.patch`: o atraso de 50 ms em cada ida ao D1, para medir a fila. **Não
  aplicam mais** no `ambiente.ts` de hoje (`git apply --check` falha). Para medir a fila de novo, refaça o patch.

O que roda de rotina e a medição M2 (que ainda pode voltar) ficam em `scripts/desempenho/`, sob a regra 12 da guarda.
