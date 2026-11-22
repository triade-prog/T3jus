# API de integração para parceiros (F1.11, PT-15) · desenho

> **Aprovado pela Carol em 22/11/2026, às 11h10 (Bahia).** Ela respondeu "aprovado, pode seguir o recomendado": as 5 recomendações do fim valem como decisões. O documento original é o Claude Doc https://claude.ai/artifact/9sc99v4FBFhqkmP3LPCmKu; esta é a cópia no repositório. A tela que acompanha está em [`NOTAS.md`](NOTAS.md).

## Decisões

1. **Nada é programado antes do primeiro parceiro.** Agora fica só o desenho aprovado e a tela desenhada. A v1 sai quando houver um parceiro com caso de uso concreto.
2. **Só a sócia dona cuida das chaves**, como no WhatsApp e na Equipe.
3. **A API entra em todos os planos**, com os limites abaixo. Um plano maior só se algum parceiro passar dos limites.
4. **Webhooks só na v1 se o primeiro parceiro precisar de tempo real.** Senão, entram na v1.1, e o parceiro sincroniza com `atualizado_desde`.
5. **A administração do T3jus pode suspender uma chave em incidente**, com motivo, e a dona é avisada.

## O que fazer e quando

A saída de dados que o escritório precisa hoje já existe: a exportação completa pela sócia dona (F0.12 e F1.7, a primeira metade da PT-15). A API é a segunda metade.

| Quando | O quê | Por quê |
| --- | --- | --- |
| Agora | Desenho e tela aprovados (este arquivo e o `NOTAS.md`) | Decisões de segurança e LGPD fechadas antes de haver pressa |
| Agora | Continuar escrevendo todo esquema de entrada e saída no `packages/domain` (já é a regra da PT-17) | É dele que sai a documentação da API, sem retrabalho |
| Primeiro parceiro (v1) | Chaves por escritório, escopos de leitura, limites de uso, registro de acesso, tela de Integrações, documentação | É o mínimo seguro para ler dados de um escritório |
| Primeiro parceiro (v1, se ele pedir tempo real) | Webhooks com assinatura | Sem tempo real, basta o filtro `atualizado_desde` |
| Depois | Escrita pela API (ex.: criar interessado), envio de arquivos, OAuth para parceiro com muitos escritórios, lista de IPs permitidos, ambiente de teste público, catálogo de integrações | Cada um só faz sentido com um parceiro que o use |

A primeira entrega é uma Edge Function nova (`api-parceiros`) em `api.t3jus.pro/v1`, separada da `api-portal`.

## Quem é o parceiro e o formato da API

A mesma peça atende a ferramenta do próprio escritório (planilha do contador, BI, Zapier ou Make) e a empresa parceira que recebe uma chave de cada escritório cliente (captura de publicações, assinatura eletrônica, contabilidade).

- **REST com JSON**, versão no caminho (`/v1/...`). Mudança que quebra vira `/v2`, e a `/v1` vive pelo menos 12 meses depois.
- **Esquemas do `packages/domain`** validam a resposta e geram a documentação OpenAPI (PT-17).
- **Paginação por cursor**, até 100 itens por página, e o filtro `atualizado_desde`.
- **Erros no formato do Portal** (`codigo`, `mensagem`), com os códigos do `ErroDominio`.
- **Dinheiro** como `{centavos, moeda}` (PT-09). **Datas** em ISO 8601 com o fuso de Brasília.
- **Rotas da v1**, só leitura: `GET /v1/clientes`, `/v1/clientes/{id}`, `/v1/casos`, `/v1/casos/{id}`, `/v1/prazos`, `/v1/compromissos`, `/v1/contratos`, `/v1/contratos/{id}`, `/v1/parcelas`, `/v1/recebimentos`, `/v1/contas-a-pagar` e `/v1/escritorio` (nome e escopos da chave).

Parceiro com muitos escritórios que queira o botão "Autorizar no T3jus" precisa de OAuth 2 (código de autorização com PKCE). Fica para depois; as chaves continuam valendo ao lado dele.

## Autenticação: chaves por escritório

- **Formato:** `t3j_live_<8 de prefixo>_<32 de segredo>`, no cabeçalho `Authorization: Bearer <chave>`, só por HTTPS.
- **Guardamos só o resumo** (HMAC-SHA256 do segredo com uma pimenta nos segredos da função). A chave aparece uma vez, na criação; depois só o prefixo.
- **Cada chave tem** nome, escopos, quem criou e quando, validade (12 meses por padrão; 3 ou 6), último uso e, se revogada, quem, quando e o motivo. Nada se apaga (PT-03).
- **Revogar vale na hora.** Trocar é criar a nova, passar ao parceiro e revogar a antiga.
- **Vencimento:** aviso no sino da dona 15 dias antes e no dia. Vencida, `401 CHAVE_VENCIDA`. A validade não se estica (tela, decisão 3).
- **Autoria:** o que a chave lê entra no registro de acesso com a chave como autora, não como pessoa.
- **Fim do contrato** (F0.14) revoga todas. A troca da sócia dona mantém as chaves e avisa a nova dona.
- **Suporte:** a equipe T3jus vê no Console quantas chaves há, os nomes e o uso, nunca o segredo. A administração suspende em incidente (decisão 5).

## Escopos e o que nunca sai

| Escopo | O que a chave lê | Rotas |
| --- | --- | --- |
| `clientes:ler` | Nome, tipo, contatos, cidade e UF, situação, responsável | `/v1/clientes` |
| `clientes:documentos` | CPF, CNPJ, RG e endereço completo; só com `clientes:ler`, desmarcado por padrão | campos a mais em `/v1/clientes` |
| `juridico:ler` | Casos (número CNJ, área, etapa, responsável), prazos e compromissos não internos | `/v1/casos`, `/v1/prazos`, `/v1/compromissos` |
| `contratos:ler` | Contratos, honorários combinados, situação e datas | `/v1/contratos` |
| `financeiro:ler` | Parcelas, recebimentos e contas a pagar | `/v1/parcelas`, `/v1/recebimentos`, `/v1/contas-a-pagar` |

Nunca saem, com qualquer escopo: conversas do WhatsApp e respostas da IA; dados de saúde e outros sensíveis; notas e compromissos internos, configuração da IA, avisos e automações; equipe do escritório, sessões, tokens e chaves; o que é interno do T3jus; arquivos (na v1 sai só a lista dos documentos de um caso). O `inventario_dados` ganha a coluna `api` ao lado da `exportar`, e um teste falha se tabela sensível aparecer na API.

## Eventos e webhooks

O aviso é "magro": tipo, id do registro e hora. O parceiro busca o registro com a chave.

| Evento | Quando | Escopo |
| --- | --- | --- |
| `cliente.criado`, `cliente.alterado` | Ficha criada ou mudada | `clientes:ler` |
| `cliente.dados_excluidos` | Pedido de exclusão atendido (F1.15) | `clientes:ler` |
| `caso.criado`, `caso.etapa_mudou` | Caso aberto ou movido | `juridico:ler` |
| `compromisso.criado`, `.alterado`, `.cancelado` | Compromisso não interno | `juridico:ler` |
| `contrato.assinado`, `contrato.encerrado` | Mudança pelo guardião | `contratos:ler` |
| `recebimento.registrado` | Parcela paga | `financeiro:ler` |
| `parcela.atrasou` | Rotina diária, uma vez por parcela | `financeiro:ler` |

1. O evento entra na fila na mesma transação da mudança (outbox, PT-04), como a fila do WhatsApp.
2. Uma rotina do pg_cron, a cada minuto, chama a rota que entrega.
3. Cada destino tem segredo próprio, mostrado uma vez. `T3jus-Assinatura: t=<hora>,v1=<HMAC-SHA256>`; o parceiro recusa repetições com mais de 5 minutos.
4. 2xx em até 10 segundos é entregue. Senão, novas tentativas espaçadas por até 24 horas, com o mesmo `id`.
5. Destino que falha 3 dias seguidos é pausado, e a dona é avisada. Entregas visíveis por 30 dias.

Só `https` com nome público; IP privado, `localhost` e redirecionamento são recusados.

## Limites de uso

Ficam em `configuracoes`; o contador é o `limites_uso`.

| Limite | Valor | Ao passar |
| --- | --- | --- |
| Chamadas por chave | 60 por minuto, 10.000 por dia | `429` com `Retry-After` |
| Itens por página | 100 | Próxima página |
| Chaves ativas por escritório | 5 | A tela não deixa criar a sexta |
| Destinos por escritório | 3 | Idem |
| Chave errada do mesmo IP | 20 por hora | O IP espera 1 hora |

Toda resposta leva `RateLimit-Limit`, `RateLimit-Remaining` e `RateLimit-Reset`. No só consulta, as chaves continuam lendo e a dona não cria chave nova.

## Isolamento entre escritórios

O escritório vem sempre da chave, conferida no servidor, nunca de parâmetro (PT-01).

1. A `api-parceiros` calcula o resumo e chama `entrar_escritorio_chave(resumo, escopo)`.
2. A função confere chave ativa, não vencida, com o escopo, e escritório sem guarda terminada; só então grava o escritório no contexto da transação.
3. Valem as políticas `isolamento_escritorio` de sempre.
4. Id de outro escritório responde `404`, igual a id inexistente.

As tabelas novas têm `escritorio_id` e passam por `proteger_tabela_escritorio`. Testes negativos no pgTAP e na Deno: chave de A com ids de B, chave revogada, vencida, sem escopo e de escritório com guarda terminada.

## LGPD e sigilo

O escritório é o controlador e o T3jus o operador (PT-11); ao criar a chave, é o escritório que decide compartilhar.

- **Aceite na criação**, com escopos e hora no histórico.
- **Mínimo necessário:** escopo por área, documentos à parte, sensíveis e conversas nunca.
- **Registro de cada chamada:** chave, rota, quantos registros, resultado, IP e hora; nunca conteúdo. Prazo de 6 meses, como `PROPOSTA` no inventário até o ok da Carol.
- **Exclusão do titular:** a API para de devolver o cliente e manda `cliente.dados_excluidos`.
- **Fim do contrato:** chaves revogadas e destinos desligados.
- **Documentação pública** traz um modelo de cláusula para o escritório pedir ao parceiro.

Parceiro oficial, que acessa muitos escritórios, vai precisar de contrato com o T3jus; entra junto com o OAuth.
