# Verificação · versão 0.4.0

Data: 5 de setembro de 2026.

## Simulação

`npm test`: **34 testes aprovados**, sem falhas.

O conjunto cobre corte, queda e divisão de madeira, início vazio, alcance, compras físicas, balcão, instalação no lote, processamento, venda, construção, arrasto, caçamba e cordas, dinamite e retorno após morte, passagens antigas, snapshots e transporte de comandos.

Os dez testes da expansão verificam tamanho e geração determinística; subida e descida nas três rampas com centro e laterais dirigíveis; continuidade das estradas nas terras altas; bloqueios e escarpas; caminhonete real com acelerador e direção percorrendo as três rampas nos dois sentidos; mistura contínua de paletas; descarregamento de setores e persistência das alterações; consumo físico de tábuas; abertura do desmoronamento por uma carga entregue na borda acessível; migração de interiores v2; origens de interiores para futuras expansões e rejeição de metadados corrompidos antes de alterar o mundo ativo.

## Navegador

Cenários executados com Playwright em Microsoft Edge/Chromium, usando contextos isolados. Os testes não alteram o save aberto pelo usuário.

- Partida nova, interior da loja, arrastar ao balcão, pagamento, saída com produto e equipamento com X.
- Instalação de caminhonete e refinadora, madeira processada, carga solta e amarrada, orientação pelo mouse e explosão com morte/retorno.
- Salvamento, recarregamento e alternância entre mundo atual e anterior.
- WebGL 2, rotação/inclinação, movimento relativo à câmera e seleção pela superfície elevada da madeira.
- Atlas com M, zoom no cursor, arrasto, anotação com distância, camadas, centralização e fechamento com M.
- Caminhonete conduzida com W numa rampa: subiu e desceu sem prender na transição. Altura visual e altura do terreno diferiram menos de 3 unidades; conversão tela/mundo no relevo diferiu menos de 0,01 unidade.
- E rejeita reparação sem materiais e abre a travessia após entrega das tábuas.
- Clique acende dinamite junto ao desmoronamento, caminhar para longe evita a morte, e a estrada abre.
- Recarregamento preserva exploração, rotas abertas, caminhonete e dinheiro.
- Atlas e interface em 390 × 844 sem transbordamento horizontal.

As imagens ATLAS.png e ESCARPAS.png registram a versão expandida. CAPA.png e VALE.png registram o HTML de produção. A composição da loja e as inscrições em relevo preservam a direção da versão anterior. Nenhum erro não tratado foi detectado nos cenários.

Os testes usam dados preparados para saltar viagens longas e obtenção de dinheiro; compras, manipulação e os trechos de direção descritos usam os controles reais. A amostra de desempenho no interior atingiu aproximadamente 60 FPS no ambiente de teste; não é uma garantia para outros dispositivos ou regiões.

## Entrega

`npm run build`: TypeScript e build de produção concluídos. O HTML de produção foi aberto por `file://`, com HTTP bloqueado: início vazio, caminhada, save, atlas e ajuda funcionaram, sem requisições de rede ou erros. A interface de inspeção exclusiva de desenvolvimento não está no build.

JavaScript, estilos, fontes e física ficam incorporados. Sons são gerados localmente. JOGAR.html e o HTML avulso são cópias do mesmo build.

## Limites de cobertura

Não substitui balanceamento de viagens de longa duração. Sem testes de multiplayer, Safari/Firefox, sessões de muitas horas, milhares de toras simultâneas ou variedade ampla de celulares. A colisão usa Matter.js planar com restrições de relevo; ainda não há queda vertical livre, capotamento ou empilhamento físico em três dimensões.
