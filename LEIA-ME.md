# Woodventure · 0.4.0

Um protótipo original de sandbox para navegador com apresentação híbrida 3D/2D, inspirado na logística, na descoberta e no ritmo de Lumber Tycoon 2.

## Jogar

Abra **JOGAR.html** no navegador. O jogo, as fontes, a física e os sons estão no próprio arquivo. Não precisa instalar nada nem estar conectado à internet. Requer WebGL 2 e aceleração gráfica habilitada no navegador. A experiência principal foi pensada para computador com teclado e mouse; há controles básicos de toque.

O jogo salva automaticamente neste navegador e permite baixar/carregar cópias do mundo pelo menu. Se o navegador impedir o armazenamento de arquivos locais, use a cópia em JSON ou execute a versão local descrita abaixo. Saves em arquivo local e no servidor local podem ficar separados pelo navegador.

**WASD** caminha. **Clique / Espaço** corta. **Botão direito** segura e arrasta madeira, caixas e dinamite. **E** entra na caminhonete ou na loja, sai pela porta e conversa com o caixa. **R** prende ou solta a carga na caçamba. **X** abre caixas, equipa machados e posiciona equipamentos. **Q** gira objetos e a prévia de instalação. **4 + clique** acende uma dinamite física próxima. **C / Shift+C** gira a câmera; **V** alterna a inclinação; **Home** restaura a vista. **H** mostra os demais controles.

Você começa com um terreno vazio, sem dinheiro, e um machado gasto. Venda madeira na balança da clareira ao sul do primeiro armazém. Entre na loja, leve uma caixa da exposição ao balcão e pressione **E** para pagar. Carregue-a pela porta com o botão direito. A caminhonete e a refinadora precisam chegar ao seu terreno: use **X**, escolha o lugar, gire com **Q** e clique para instalar. A refinadora recebe toras pela mesa com faixas claras. Soltar um produto próximo do balcão o acomoda numa posição livre sobre a mesa; E também permite apoiar e pagar o produto segurado.

Mundos da versão anterior são migrados preservando o progresso. **Novo começo** guarda o mundo atual e inicia a progressão nova; **Voltar ao mundo anterior**, no menu, alterna entre os dois. Há um único slot de mundo anterior. Exporte uma cópia para manter mais mundos.

## O que existe nesta versão

- Mundo contínuo de 23.040 × 18.432 unidades: quase 25 vezes a área anterior, nove regiões, 17 traçados de estrada e cerca de 19 mil árvores determinísticas. Terreno e floresta carregam por setores durante a viagem.
- Três grandes áreas elevadas, rampas dirigíveis e escarpas. Travessias danificadas recebem 6, 8 ou 10 tábuas físicas; E conclui a reparação. Um novo desmoronamento responde à dinamite entregue no local.
- Biomas misturam cores e espécies nas bordas. Rampas têm curvas arredondadas e transições graduais; a caminhonete acompanha a inclinação do terreno.
- Árvores com resistência, reação aos golpes e queda animada. Elas viram toras físicas que podem ser subdivididas.
- Arrasto elástico, rotação, colisões e madeira com massa. Caçamba com atrito e cordas físicas para prender a carga.
- Caminhonete com aceleração, ré, direção, freio, faróis, combustível, efeito da carga e revisão de motor. O terreno afeta a tração.
- Balança que compra madeira fisicamente entregue. Serraria que recebe toras e devolve tábuas no chão.
- Construção de pisos, paredes, pilares, luminárias e esteiras; consome tábuas próximas. Desmontagem devolve as tábuas.
- Dois armazéns com interiores caminháveis, produtos físicos, preços e caixa. Você só leva a mercadoria depois de pagar.
- Machado gasto inicial, ferramentas melhores e equipamentos entregues em caixas. Um machado substituído fica no chão.
- Dinamite física transportável na mão ou na caçamba, pavio de quatro segundos e explosão fatal de perto. Você reaparece no terreno; objetos permanecem no mundo. Ela também abre a passagem para a serra.
- Veículos, madeira, personagem, árvores, rochas, equipamentos, base e interiores desenhados com volumes reais em Three.js. Sombras, rodas, caçamba aberta, copas que cedem visibilidade e câmera com rotação e inclinação.
- Chão pintado na vila, relevo em malha 3D nas terras altas, mapa de papel e interface em 2D. Todas as inscrições do cenário usam letras com geometria 3D fixadas às superfícies; preços ficam em placas inclinadas nas bancadas. Etiquetas de armazém, entrada e saída removidas do cenário.
- Seleção pela superfície 3D do objeto e movimento do personagem relativo à câmera. Carga recebe altura visual na caçamba, na refinadora e no balcão.
- Outra descoberta depende de reconhecer e transportar um objeto. Ela não aparece no mapa.
- Dia de uma hora, começando no fim da tarde; iluminação noturna, ambiente sonoro, vento, pássaros, motor, golpes e madeira.
- M abre um atlas gerado pelos dados do mundo: arrasto, zoom no cursor, anotações com distância, localização, relevo e camadas de estradas e lugares. Clique numa travessia para consultar a preparação necessária. Áreas visitadas, equipamentos e caminhos abertos aparecem automaticamente. Lugares escondidos só ganham marca depois da exploração.
- Modo de fotografia, pausa, salvamento e importação/exportação do mundo.

## O que ainda não existe

Esta é uma fatia jogável, não um equivalente completo de todos os sistemas e conteúdos de Lumber Tycoon 2. Multiplayer, barcos, vários veículos, guinchos, mineração, chuva, rotinas de NPCs e uma campanha extensa não estão implementados. As árvores não regeneram nesta versão. A simulação de colisões continua em um plano 2D. A geometria e a câmera são 3D, e o relevo restringe percursos pela mesma superfície usada no desenho. O apoio em objetos continua simplificado: ainda não há empilhamento vertical livre ou dinâmica de capotamento. Pisos e esteiras atuam no chão; paredes não formam interiores de vários andares.

O multiplayer está preparado na organização do código e no formato dos dados, mas não há conexão de rede ou cooperação funcional nesta versão.

## Desenvolver

Requer Node.js 22.12+ ou uma versão atual compatível com Vite 7.

```sh
npm install
npm run dev
```

Abra `http://127.0.0.1:4173`.

```sh
npm test
npm run build
```

O build produz `dist/index.html`, um único arquivo independente. O arquivo `JOGAR.html` é uma cópia desse build. Para atualizar a versão portátil, substitua `JOGAR.html` pelo novo `dist/index.html`.

## Organização

- `src/world.ts`: definição única de regiões, relevo, estradas, passagens, lugares, cores e árvores por setor.
- `src/model.ts`: entidades, comandos e snapshots.
- `src/terrain3d.ts`: malhas de terreno por setor, estradas, pontes e pontos de parada.
- `src/atlas.ts`: atlas interativo, derivado dos mesmos dados.
- `src/simulation.ts`: simulação autoritativa, física, economia e regras.
- `src/transport.ts`: porta de comandos e transporte local substituível.
- `src/renderer.ts`: cena Three.js, câmera, seleção por raycast, apoio visual, luz e animação.
- `src/models3d.ts`: modelos de objetos e geometria compartilhada.
- `src/scenery3d.ts`: edifícios, interiores e cenário estático.
- `src/lettering3d.ts`: letras em relevo com uma seleção local da fonte DM Sans, sem download em tempo de execução.
- `src/paint.ts`: chão pintado da vila, com bordas que se misturam ao terreno maior.
- `src/layers.ts`: reconhecimento de apoio na caçamba e visibilidade das copas.
- `src/audio.ts`: ambiente e efeitos gerados com Web Audio.
- `src/main.ts`: controles, menus, salvamento local e ciclo do aplicativo.
- `tests/`: 34 testes: ciclo do jogo, compras, instalação, explosões, relevo, caminhonete nas três rampas, geração por setores e migração de saves.

Leia `ARQUITETURA.md` para a evolução P2P e `DIRECAO.md` para as decisões de design.

## Créditos

Código e arte procedural criados para este protótipo. Não usa mapas, sons, texturas ou código de Lumber Tycoon 2. Matter.js e Three.js: licença MIT. DM Sans e Libre Caslon Display: SIL Open Font License. As licenças estão na pasta `licenses`.
