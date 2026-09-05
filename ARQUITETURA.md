# Simulação local, futura sessão P2P

## Fronteira que já existe

```text
Teclado / mouse / toque / menus
              |
       CommandPort.send
              |
       LocalTransport
     { actor, seq, tick, command }
              |
       Simulation.receive
              |
    fila → validação → tick de 60 Hz
              |
    estado + eventos + snapshot
         /            \
    Renderer       Soundscape
```

`Simulation` pode ser instanciada sem DOM, canvas ou áudio. Os testes a executam em Node. A geração usa uma semente fixa; ruído visual e áudio não interferem na simulação. O render usa uma câmera interpolada e não define regras de economia, corte ou construção.

Toda entidade tem ID estável e campo `owner`. `Envelope` inclui ator, sequência e tick. O transporte local entrega comandos à mesma entrada que um futuro host poderá usar. A entrada descarta autores não locais nesta versão, sequências repetidas e mensagens excessivamente futuras. Regras de alcance, dinheiro, quantidade de tábuas e disponibilidade de itens são verificadas pela simulação.

`Snapshot` tem versão de esquema e contém corpos, posições, velocidades, rotação, estado de árvores, progressão, combustível, peças e amarras. A restauração reconstrói os corpos e as constraints de carga. Restrições de arrasto não persistem: um objeto salvo na mão volta ao mundo solto. Eventos transitórios de som e partículas também não persistem.

Na versão 0.2, o esquema de save passou a **2**. Ele inclui interior, produto, pagamento, slot de exposição, ferramenta solta, refinadora, progresso de processamento, pavio, direção do jogador e retorno após morte. A migração de esquema 1 preserva os recursos do mundo anterior e converte equipamentos e explosivos antigos em entidades físicas. A interface grava o esquema novo em uma chave separada, sem apagar o save antigo.

Compras, abertura, instalação e ignição entram como comandos `checkout`, `open`, `deploy` e `ignite`. A simulação valida proximidade, pagamento, espaço no lote e disponibilidade do objeto; o cliente não entrega dinheiro nem cria o equipamento diretamente. Os armazéns ocupam áreas físicas separadas do exterior, identificadas por `room`. A passagem pela porta transfere jogador e objeto segurado autorizado. `paid`, `owner` e IDs de entidade dão uma base para a futura posse autoritativa, mas ainda não substituem permissões por conexão.

O renderer divide chão, corpos, carcaças e carga. `layers.ts` identifica madeira e produtos apoiados na caçamba no referencial do veículo, independentemente de estarem amarrados. Transparência de copas, altura aparente da carroceria e interpolação visual permanecem locais. O processamento da refinadora, a compra e o dano da explosão pertencem à simulação.

## Modelo indicado para o multiplayer futuro

Usar **um participante como host autoritativo**. Os demais enviam intenções; o host decide as alterações e distribui snapshots/deltas. Matter.js não oferece aqui garantia de determinismo entre máquinas: não usar lockstep com a expectativa de obter corpos idênticos em todos os navegadores.

1. Implementar um transporte WebRTC que satisfaça `CommandPort`. Não fazer o renderer conhecer canais ou conexões.
2. Trocar o único jogador por um registro de atores e associar cada conexão ao seu ator autenticado na sessão. O ID declarado pelo cliente não é prova de identidade.
3. O host executa os 60 ticks/s. Clientes recebem snapshots em frequência menor e interpolam corpos remotos. Predição local e reconciliação podem ser adicionadas depois.
4. Usar mensagens confiáveis para compras, construções, entrada/saída de veículo e posse de objetos. Movimentos podem usar mensagens recentes descartáveis, com sequência própria.
5. Implementar concessões temporárias para manipulação de corpos: quem está segurando uma tora, quem dirige, quem pode mexer no lote. O host impede compras repetidas, tomadas de posse simultâneas e distância inválida.
6. Versionar protocolo, esquema do mundo e IDs de comandos; rejeitar incompatibilidades antes de entrar na partida.
7. Planejar sinalização, STUN/TURN e caminhos com relay. “P2P” não elimina esses serviços nem garante conexão direta para todos.
8. Tratar desconexão soltando objetos e limpando o estado do ator. Migração de host é um trabalho separado, não uma propriedade automática dos snapshots.

## Limites atuais

Não há sockets, sinalização, lista de jogadores, lobby, replicação, interpolação de rede, reconciliação, migração de host ou teste de latência. `owner` é usado no mundo local, não é ainda um sistema de permissões de rede. A classe permite chamada direta de `command` para testes, mas essa não deve ser uma entrada exposta a clientes remotos.

Snapshots são cópias completas para save local. Para rede real, será necessário implementar deltas, relevância espacial, limites de frequência, validação de tamanhos e auditoria do protocolo. A simulação usa o mesmo número de ticks por segundo independentemente da taxa de desenho, com limite do tempo acumulado para evitar saltos quando o navegador suspende a página.

## Território e atlas · 0.4

O registro em `world.ts` é a fonte comum de regiões, limites, estradas, platôs, passagens e lugares. `WORLD` deriva das regiões; renderer, simulação e atlas consomem esses dados. O mapa não tem uma lista de estradas desenhada à mão em outro arquivo.

`heightAt` interpola os mesmos vértices e a mesma diagonal dos triângulos de 32 unidades usados na malha. A simulação verifica inclinação e bloqueios ao mover corpos, e o cursor faz raycast dessa malha. Rampas têm centro contínuo, curvas arredondadas, transição suave nas extremidades e acostamentos. A caminhonete orienta seu modelo pela normal do terreno, preservando a direção de condução.

Setores de 768 unidades geram árvores com IDs e sementes estáveis. A simulação mantém uma vizinhança de 5 × 5 setores; o terreno usa 5 × 5 ou 7 × 7 conforme o zoom. Árvores procedurais intactas distantes são descarregadas. Árvores danificadas, cortes, toras, construções e mercadorias persistem. As árvores originais do vale ficam preservadas, inclusive as alterações de saves antigos. No P2P futuro, o host deve carregar a união das vizinhanças dos participantes; o streaming atual usa um único jogador.

O esquema **3** registra exploração, passagens abertas, árvores removidas e apenas as árvores procedurais alteradas. Também salva a origem dos interiores para poder reposicioná-los caso o território cresça novamente. A chave local v3 mantém as chaves v1/v2 como fontes de migração; produtos, equipamentos e dinheiro são preservados. Metadados inválidos são rejeitados antes de substituir o mundo ativo.

### Acrescentar conteúdo

1. Acrescente ou estenda uma entrada de `REGIONS`. Os limites, o atlas, a paleta e a geração por setores acompanham o registro.
2. Acrescente caminhos em `ROAD`; para terreno elevado, declare `PLATEAUS` com altura e pontos da rampa. A rampa entra na estrada automaticamente. Mantenha os caminhos dentro da superfície alcançável e execute os testes de percurso.
3. Declare `PASSAGES` para travessias reparáveis ou desmoronamentos. Elas ganham cenário, regra de acesso e marca no mapa pelo mesmo registro.
4. Declare `LANDMARKS` para lugares conhecidos ou descobertas. `hidden` oculta a marca até a exploração. Acampamentos e mirantes possuem representação procedural; tipos novos ainda precisam de um modelo.

Preserve os IDs e coordenadas de conteúdo existente quando quiser compatibilidade direta dos saves. Mudar a semente ou a distribuição de árvores já publicadas exige uma migração do gerador; geração determinística não elimina esse cuidado.

## Próximos trabalhos dentro da identidade do jogo

Primeiro: amadurecer a manipulação e a caçamba, adicionar veículos com utilidades distintas e expandir estradas reconhecíveis. Depois: implementar uma sessão de dois jogadores com host, posse exclusiva dos objetos e salvamento do mundo. Só então experimentar duas pessoas carregando o mesmo corpo e passageiro na caminhonete.

## Apresentação híbrida · 0.3

Three.js substitui o desenho de entidades em Canvas, preservando a simulação Matter.js e o esquema de save 2. As coordenadas físicas `(x, y)` são convertidas em `(x, altura, z)`; a rotação física corresponde ao negativo da rotação em torno do eixo vertical. O transporte de comandos não depende da tecnologia gráfica.

A câmera ortográfica usa raycasting para converter o cursor em posições do plano e selecionar as superfícies dos modelos. WASD a pé é convertido do referencial da tela para o mundo; no veículo, mantém acelerador e direção. Copas cedem visibilidade com base na projeção atual, inclusive ao girar a câmera. Geometrias de árvores e primitivas são compartilhadas; objetos distantes deixam de ser desenhados.

Alturas de apoio na caçamba, no balcão e na mesa da refinadora são interpoladas apenas na apresentação. Não há dinâmica vertical livre. O encaixe do balcão é uma regra autoritativa: ao soltar o produto próximo, escolhe uma posição disponível, zera velocidade e alinha a caixa. O corpo do balcão colide com o jogador e deixa produtos passarem sobre ele.

Referências: [Three.js — OrthographicCamera](https://threejs.org/docs/pages/OrthographicCamera.html) e [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html).
