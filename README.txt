VOTA ESCOLA
===========

Arquivos principais:
- index.html ........ página inicial
- candidato.html .... inscrição em até 2 cargos
- urna.html ......... votação cargo por cargo
- gestor.html ....... comissão eleitoral / inscrições / apuração
- firebase-config.js  configuração do Firebase
- core.js ........... comunicação com banco + som eletrônico
- styles.css ........ visual do sistema
- firestore.rules ... regras iniciais do Firestore

MODO DEMONSTRAÇÃO
-----------------
Se firebase-config.js estiver vazio, o sistema usa localStorage.
Isso serve para testar tudo no mesmo navegador.

PARA USAR EM VÁRIOS COMPUTADORES/CELULARES
------------------------------------------
1. Crie um projeto no Firebase.
2. Ative Firestore Database.
3. Copie a configuração Web do Firebase.
4. Cole em firebase-config.js.
5. Publique as regras de firestore.rules.
6. Antes do uso real, ative Firebase Authentication para proteger gestor.html.

FLUXO
-----
1. Comissão abre inscrições.
2. Aluno se inscreve em até 2 cargos.
3. Comissão aprova/rejeita.
4. Comissão fecha inscrições e abre votação.
5. Eleitor se identifica, vota cargo por cargo e ouve o som de confirmação.
6. O sistema marca que o RA já votou, mas os documentos de voto NÃO guardam RA/nome.
7. Comissão encerra votação e libera resultados.

OBSERVAÇÃO IMPORTANTE
---------------------
O protótipo foi feito para facilitar a primeira implantação.
Para uma eleição real, recomenda-se:
- autenticação administrativa;
- lista oficial de eleitores;
- regras Firestore mais restritivas;
- validação de números duplicados por cargo;
- trilha de auditoria da comissão;
- backup/exportação da eleição;
- termo de regras e critérios de desempate.


FOTOS DE CANDIDATOS
-------------------
A página candidato.html permite selecionar uma imagem do dispositivo ou usar a câmera
em celulares/tablets compatíveis.

Para salvar as fotos no Firebase:
1. No console Firebase, abra Storage.
2. Clique em Começar.
3. Publique as regras do arquivo storage.rules.
4. A foto será enviada para a pasta candidatos/ e a URL ficará salva na candidatura.

FOTOS DE CANDIDATOS - VERSÃO 1.3
--------------------------------
A foto pode ser escolhida da galeria/arquivos ou capturada com a câmera.
Ela é reduzida automaticamente no navegador e salva diretamente no documento
da candidatura no Firestore. Esta versão NÃO depende do Firebase Storage.


ANÁLISE DE CANDIDATURAS
-----------------------
No painel da comissão, cada candidatura mostra:
- foto;
- nome, turma e RA;
- cargos e números;
- propostas completas;
- status.

Ao rejeitar, o gestor deve registrar obrigatoriamente o motivo da negativa.
O campo motivoRejeicao é salvo no documento da candidatura no Firestore.


CONTROLE DE ELEITORES - VERSÃO 1.5
----------------------------------
O painel da comissão possui cadastro manual de eleitores e importação por CSV.
Campos: RA, NOME, TURMA.

A urna aceita somente RAs previamente cadastrados.
Cada documento de eleitor possui o campo votedCargos, que registra somente os cargos
em que aquele RA já participou. O conteúdo do voto continua em uma coleção separada
e NÃO guarda RA, nome ou turma.

Isso permite:
- um único voto por RA em cada cargo;
- retomada da votação se o aluno sair antes de terminar;
- bloqueio apenas dos cargos já votados;
- preservação do sigilo do voto.


URNA SEPARADA - VERSÃO 1.6
--------------------------
A votação possui agora uma página dedicada:
- urna_separada.html

Também existe o atalho:
- votar.html

Assim você pode divulgar diretamente o endereço da urna sem passar pelo painel
administrativo ou pela página de candidaturas.

A urna continua usando o mesmo Firebase, a mesma lista oficial de eleitores e
o mesmo bloqueio de um voto por RA em cada cargo.


RESULTADOS PÚBLICOS - VERSÃO 1.9
--------------------------------
Nova página:
- resultados.html

Ela só exibe o resultado quando resultsReleased = true no config/eleicao.

A página mostra:
- chapa formada com o vencedor de cada cargo;
- empate, quando houver;
- todos os candidatos aprovados que participaram;
- número de votos de cada candidato;
- percentual sobre os votos válidos do respectivo cargo;
- votos brancos, nulos, válidos e total por cargo.

Estrutura pública:
1. gestor.html      - Painel do Gestor
2. candidato.html   - Cadastro de Candidato
3. urna.html        - Urna
4. resultados.html  - Resultado da Eleição


APURAÇÃO PÚBLICA SEGURA - VERSÃO 2.0
------------------------------------
A página resultados.html não lê mais a coleção votos.

Ao marcar "Liberar resultados" no painel do gestor e salvar:
1. o gestor autenticado lê os votos privados;
2. o sistema calcula a apuração;
3. grava somente totais e dados dos candidatos em resultadoPublico/atual;
4. resultados.html lê apenas resultadoPublico/atual.

O documento público NÃO contém RA, nome de eleitor, turma do eleitor ou qualquer
informação que permita relacionar uma pessoa ao voto.

IMPORTANTE:
publique também o novo arquivo firestore.rules no Console do Firebase.


CORREÇÃO RESULTADOS - VERSÃO 2.1
--------------------------------
A apuração pública agora é salva em:
config/resultadoPublico

Motivo: a coleção config já possui leitura pública e escrita somente para gestor
autenticado nas regras existentes do projeto.

Depois de atualizar core.js:
1. Entre em gestor.html.
2. Deixe "Resultados liberados" marcado.
3. Clique em "Salvar configuração" novamente.
4. Confirme no Firestore se apareceu config/resultadoPublico.
5. Abra resultados.html.


IMPORTAÇÃO COM ACENTOS - VERSÃO 2.2
-----------------------------------
A importação de CSV agora reconhece automaticamente:
- UTF-8
- UTF-8 com BOM
- Windows-1252 / ANSI
- ISO-8859-1 como fallback

Isso preserva caracteres do português, por exemplo:
João, José, Vitória, Conceição, São Paulo, Açucena, Ç, ã, õ, á, é, í, ó, ú, â, ê, ô, º e ª.

No Excel, ainda é recomendado salvar como:
"CSV UTF-8 (delimitado por vírgulas) (*.csv)"


PAINEL DE PARTICIPAÇÃO - VERSÃO 2.3
-----------------------------------
Enquanto resultsReleased = false, resultados.html mostra:
- gráfico de pizza com participação;
- barra de progresso;
- total de eleitores cadastrados;
- quantos já participaram;
- quantos ainda faltam;
- atualização automática a cada 15 segundos.

Um eleitor conta como participante após confirmar pelo menos um voto/cargo.
Nenhuma escolha de candidato é exibida antes da liberação oficial do resultado.


VALIDAÇÃO DE CANDIDATO POR RA - VERSÃO 2.5
-----------------------------------------
Somente estudantes previamente cadastrados em eleitores/{RA} podem enviar candidatura.

Na página candidato.html:
- o RA é conferido no sistema eleitoral;
- RA inexistente bloqueia a candidatura;
- RA inativo bloqueia a candidatura;
- nome e turma podem ser preenchidos automaticamente a partir do cadastro eleitoral;
- uma nova conferência é feita no momento do envio, evitando contornar a validação visual.

VERSÃO 3.6 - CORE EMBUTIDO
--------------------------
Para evitar falhas do GitHub Pages ao carregar core.js/firebase-config.js,
gestor.html, candidato.html, urna.html e resultados.html agora contêm internamente
a configuração e a lógica principal do sistema.

Os arquivos core.js e firebase-config.js permanecem no pacote apenas como cópia de segurança.
As páginas principais não dependem mais deles para funcionar.

FOTOS DE CANDIDATOS - REESTRUTURAÇÃO 2026-09-18
------------------------------------------------
- A foto passou a ser obrigatória na candidatura.
- Aceita JPEG, PNG e WebP na entrada.
- O navegador recorta a imagem no formato retrato 3:4.
- A imagem final é padronizada em 300 x 400 px e convertida para JPEG.
- A compressão tenta manter o Base64 em aproximadamente 80 KB e bloqueia acima de 120 KB.
- A foto continua salva no próprio documento da candidatura no Firestore; Firebase Storage não é necessário.
- O Painel do Gestor continua exibindo a foto para análise.
- A urna continua exibindo a foto do candidato ao reconhecer o número.
- resultados.html agora também exibe as fotos dos candidatos e eleitos.
- O snapshot público de resultados não copia RA para config/resultadoPublico; somente dados necessários à exibição pública.
