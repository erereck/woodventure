# A identidade de Woodventure

## O pedido que orientou o protótipo

Na conversa compartilhada, você destacou o caráter simples, solitário e lento de Lumber Tycoon 2, a descoberta da madeira de ouro sem indicadores e a viagem à neve com uma passagem que exige dinamite comprada longe. Também rejeitou a saturação visual e o excesso de setas dos simuladores recentes. Esses pontos tiveram prioridade sobre a lista muito maior sugerida pelo outro assistente.

A versão 0.3 adota uma apresentação híbrida no navegador: os objetos que dependem de volume ganham geometria 3D em Three.js. Chão pintado, mapa, tipografia e interface continuam em 2D. A câmera ortográfica inclinada pode girar para esclarecer apoio, corte e transporte sem perder a escala dos objetos.

## Decisões desta fatia

O jogador chega com um machado gasto e um terreno vazio. Não tem dinheiro, caminhonete, refinadora ou estoque inicial de tábuas. A primeira madeira vendida permite comprar ferramentas; veículos e máquinas chegam em caixas que precisam ser carregadas até o terreno. Não há lista de tarefas. A serra do outro lado do vale e uma descoberta diferente oferecem motivos materiais para viajar.

O ciclo é cortar → lidar com o peso → carregar → dirigir → entregar ou processar → construir. A base funciona como estoque visível. A construção exige madeira próxima; a venda exige uma entrega física. Não há menu de inventário infinito nem botão global de venda.

Os armazéns têm interior: tirar o produto da exposição, levá-lo ao caixa, pagar e transportá-lo faz parte do trabalho. A dinamite também ocupa espaço e tem um pavio real; aproximar-se demais da explosão leva o jogador de volta ao terreno. A refinadora puxa a tora pela entrada e entrega tábuas pelo lado oposto.

O tempo de corte, a inércia, as curvas e o arrasto acrescentam atrito ao trabalho. Os preços e as distâncias estão condensados para testar os sistemas; esta fatia não representa a duração pretendida para a progressão de um jogo completo.

## Direção de arte e som

Pinheiros em camadas, bétulas de outono, caminhonete verde desgastada, terra, telhados envelhecidos e luz dourada. A interface usa verde escuro, papel e latão. O desenho do mundo ocupa a tela; informações aparecem nas bordas. O mapa só mostra estradas e pontos conhecidos.

Sons de ferramentas, madeira, motor e pássaros substituem uma música constante. Um dia dura uma hora real, começando no fim da tarde. Pausar interrompe a simulação. O objetivo é deixar espaço para simplesmente existir no vale.

## Regras para preservar

- Descobertas são reconhecidas no cenário, sem setas, marcadores ou checklist.
- Progressão cria possibilidades físicas; não introduzir XP, levels ou prestige.
- A madeira existe no mundo, inclusive antes de virar dinheiro ou peça de construção.
- Não adicionar fome, sede, stamina ou administração de sobrevivência.
- Não adicionar recompensa diária, streak, passe, lootbox ou estímulos constantes.
- Melhorar clareza dos controles sem explicar todas as descobertas.
- Um sistema pequeno e funcional tem prioridade sobre menus anunciando funcionalidades inexistentes.

## Além do vale · 0.4

A expansão usa distância, preparo e relevo para dar peso às viagens. O lote e os dois armazéns continuam no lugar conhecido; bétulas, escarpas, pinhais, várzea, neve e âmbar prolongam o território ao redor. Acampamentos e mirantes dão ritmo às estradas. Cores e espécies se misturam nos limites de bioma.

O atlas é um caderno de campo: papel, nomes discretos, relevo sombreado e anotações do jogador. Mostra a infraestrutura conhecida e registra exploração, sem conduzir a descoberta com setas na tela. Custos das travessias ficam disponíveis ao consultar o lugar. A marca de destino mede distância em linha reta; não é navegação automática.
