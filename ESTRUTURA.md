# Estrutura do código

Woodventure mantém arquivos-fachada nos caminhos antigos (`model.ts`, `world.ts`, `simulation.ts` e `models3d.ts`) para preservar imports estáveis, mas a implementação foi dividida por responsabilidade.

## `src/game/`

- `types.ts`: entidades, comandos, eventos e snapshots.
- `catalog.ts`: madeiras, peças de construção, produtos, estoque e posições de balcão/porta.
- `math.ts`: matemática 2D determinística e transformações locais.
- `spatial.ts`: regras espaciais pequenas que dependem do mundo.

## `src/world/`

- `data.ts`: registro estático do território, regiões, estradas, platôs, passagens, lojas e landmarks.
- `terrain.ts`: distância de estrada, região, campo de altura e mistura de cores do solo.
- `ecology.ts`: biomas, rio, travessia, chunks e geração determinística de árvores.

`src/world.ts` apenas reexporta esses módulos. Isso mantém atlas, renderer, testes e saves compatíveis enquanto novas regiões podem ser trabalhadas sem abrir toda a matemática do relevo.

## `src/simulation/`

- `entities.ts`: criação, remoção e busca de entidades físicas.
- `world-runtime.ts`: paredes, mundo inicial, streaming, exploração e travessias.
- `step.ts`: tick autoritativo e processamento contínuo.
- `commands.ts`: validação/execução de comandos e corte de madeira.
- `logistics.ts`: segurar, caçamba e amarração.
- `commerce.ts`: estoque de lojas, interiores, balcão, compras, caixas e instalação de equipamentos.
- `construction.ts`: construção e explosões.
- `snapshot.ts`: captura, validação, migração e restauração de saves.

`src/simulation.ts` é a fachada/orquestrador. Renderer, transporte, testes e futuro multiplayer continuam falando com uma única `Simulation`.

## `src/render/`

- `primitives.ts`: geometrias e materiais compartilhados.
- `tree-model.ts`: árvores e cache de geometria.
- `machinery-models.ts`: jogador, ferramenta, caminhonete, refinadora e estruturas.
- `prop-models.ts`: toras, tábuas, caixas, dinamite, pedras e relíquia.

`src/models3d.ts` continua sendo a fábrica pública de modelos.

## `src/app/`

- `ui-template.ts`: estrutura HTML e ícones da interface. O bootstrap e o loop permanecem em `main.ts`.

## Regra para crescer

Prefira acrescentar comportamento no módulo que possui a regra. Não mova autoridade para renderer/UI. Crie um módulo novo quando surgir um domínio realmente novo (por exemplo `vehicles/`, `weather/`, `network/`), não apenas para reduzir contagem de linhas. Fachadas antigas devem continuar pequenas e estáveis enquanto houver consumidores delas.
