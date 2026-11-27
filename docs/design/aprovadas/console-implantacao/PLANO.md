# CO-08 · Implantação assistida com valor anunciado: plano v2

Versão 2, 27/11/2026. Ninguém programou nada e nenhum commit saiu. Esta versão aplica as 25 correções de `co-08/revisao.md` e as decisões da coordenação. Ela segue o modelo do CO-09 (`co-09/plano-v2.md`) e parte do plano do carnê do CO-10 (`co-10-carne/plano.md`; o `plano-v2.md` dele ainda não existia quando escrevi).

Conferi no código (main em `4503681`) as evidências que mudam o plano:
- `escolher_escritorio` em `0210:241-261`;
- `sessoes_escritorio` em `0010:95-100`, com uma linha por sessão e a hora sobrescrita;
- `planos_eventos.autor_id not null` em `0690:92`;
- `cobranca_emitir_pendentes` não reemite a fatura cancelada (`0690:765`);
- o rótulo "Desconto" para todo outro tipo em `FaturaCobranca.tsx:525`;
- `avisos_console` sem `escritorio_id`, com `interessado_id on delete cascade` (`0590:242-257`), e o `fatura_id` da 0691 com `restrict`;
- o guardião exige estado inicial no INSERT (`0060:338-352`);
- `console_mudar_estagio(p, e, versao, estagio, motivo)` em `0130:47`;
- `notas_internas` em `0060:418-428`;
- a marca `t3jus.mudando_contrato` em `0210:443`;
- o prazo de guarda das tabelas novas em `sistema/README.md:591`;
- `console_assinatura` refeita na 0694 e na 0860.

---

## 1. Resumo

1. **Regra global no Console** (Cobrança › Planos, só a Administração muda, com histórico). Ela guarda o valor (R$ 1.490,00, provisório) e o prazo (30 dias). A **condição padrão** (ISENTA ou COBRADA) e a **data de corte** (`isencao_ate`) são campos separados. O valor inicial é ISENTA, sem data de fim. Para passar a cobrar, muda-se a configuração, sem código.
2. **Implantação por escritório, congelada.** Ela começa no **primeiro acesso de um sócio** ao Portal, que o CO-09 grava em `testes_gratis.primeiro_acesso_em`. Ela copia o valor e a condição da regra, e o prazo vai até 30 dias depois de `escritorio_dia_um`. A 1160 do CO-09 precisa estar aplicada antes da 1180. Concluir = passar a Ativo, que já existe. Encerrar o contrato cancela a implantação.
3. **Linhas na 1ª fatura, sempre.** A 1ª fatura traz "Implantação assistida" com o valor cheio e, se a implantação for isenta, a linha "Isenção da implantação · Oferta de lançamento", que zera o efeito. Isso vale qualquer que seja o gatilho da cobrança: com o CO-09, o dia seguinte ao fim do teste (pela rotina) ou a confirmação, se o teste foi dispensado; sem linha de teste, o Ativo, como hoje. Também aparece na assinatura, no PDF e no Portal.
4. **Atrás de uma chave.** As linhas só entram com `implantacao_na_fatura` ligada, em `configuracoes`. A chave liga no PR das telas do Portal, com o desenho aprovado.
5. **Cobrança à vista pronta.** Com a condição COBRADA, a 1ª fatura (Pix ou boleto) cobra o valor cheio. O carnê com implantação cobrada é recusado com `IMPLANTACAO_COBRADA_NO_CARNE`, na emissão e nos caminhos que levam a ela. O carnê com implantação isenta funciona, porque as duas linhas somam zero.
6. **Treinos por pessoa e quem acompanha.** A aba Implantação do Console mostra:
   - "X de Y pessoas treinadas";
   - quem aceitou o convite;
   - o que já aconteceu (sócio entrou, importação concluída, WhatsApp ligado), calculado na leitura;
   - o responsável da equipe;
   - o prazo;
   - a conclusão.

   O sino avisa aos 7, 3 e 0 dias do prazo, e 30 dias antes do fim da isenção.
7. **Ordem.** O PR da fatura só abre depois de a 1170 do CO-10 estar mesclada e aplicada, partindo da versão de `cobranca_emitir` dela. A troca de "Desconto de implantação" para "Desconto de entrada" está na 1170 (dependência, não é pergunta deste plano).
8. **Fica para depois, como pendentes** (seção 12): parcelamento, carnê cobrado, uso do Portal por pessoa, contatos de acompanhamento, checklist com etapas marcadas à mão, Ativo automático no prazo, selo e filtro na carteira, e mudança de condição por escritório.

---

## 2. Como encaixa no CO-09 e no CO-10

| Assunto | Regra deste plano | Por quê |
|---|---|---|
| Quando a implantação começa | No primeiro acesso de um sócio, que `escolher_escritorio` (envolvida pela 1160) grava uma vez em `testes_gratis.primeiro_acesso_em`, com teste ligado, desligado, dispensado ou repetido (`co-09/plano-v2.md:94`). O dia 1 é `escritorio_dia_um(p_escritorio)`. Se a cobrança começar antes de algum sócio entrar, a implantação abre na emissão da 1ª fatura | O convite não é uso: o vínculo SOCIO existe desde o convite, ainda sem senha (revisão, 14). O teste e a implantação andam juntos |
| O gancho no banco | Um gatilho `after update of primeiro_acesso_em on testes_gratis`, com `when (old.primeiro_acesso_em is null and new.primeiro_acesso_em is not null)`. A linha de `testes_gratis` nasce no cadastro do cliente, com `primeiro_acesso_em` nulo (`co-09/plano-v2.md:46`), então o insert não precisa de gatilho. Por segurança, o gatilho também cobre `after insert` com `when (new.primeiro_acesso_em is not null)`. Nenhum gatilho em `sessoes_escritorio`, e só o CO-09 mexe em `escolher_escritorio` (o combinado em `co-09/plano-v2.md:98-102`). **Dependência:** a 1160 aplicada antes da 1180 | Evita duas threads trocando a mesma função |
| Quando a cobrança começa | Não muda neste plano; é do CO-09. Nenhuma fatura sai durante o teste. A cobrança começa em `fim + 1`, pela rotina (`cobranca_comecar`), ou na confirmação, se o teste foi dispensado. Escritório sem linha em `testes_gratis` segue a regra antiga: no Ativo. As linhas entram na fatura da `primeira_competencia`, qualquer que seja o gatilho | Com teste, o fim da implantação não tem efeito financeiro (revisão, 1) |
| `cobranca_emitir` | Parte da versão da 1170 (itens da parcela no carnê) e só junta as linhas da implantação no fim | Se a 1170 entrar depois, apaga as linhas sem erro (revisão, 3) |
| `console_assinatura` e `portal_plano_faturas` | Envolvidas a partir da versão mais nova no ar (0860 e 0696, ou a da 1162 do CO-09, se já estiver mesclada) | A mesma razão |
| "Desconto de entrada" | A 1170 troca o texto de `0690:501`. Este plano não pergunta isso; depende da troca | Três linhas com "implantação" na mesma fatura confundiriam (revisão, 8) |
| Página "Assinar" do CO-09 | A linha da implantação nessa página fica no F1.48 deste plano. O F1.38 do CO-09 sai, para a pendência não ficar em dois itens | Revisão, 2 |
| Desconto de entrada | Vale só sobre a mensalidade, nunca sobre a implantação | `cobranca_itens` não muda |

---

## 3. Regras de negócio

1. **Condição do dia.** `implantacao_condicao(p_dia)`:
   - com `condicao_padrao` = COBRADA, a condição é COBRADA;
   - com `condicao_padrao` = ISENTA, a condição é ISENTA se `isencao_ate` for nula ou se o dia for até `isencao_ate`; se não, é COBRADA.

   O valor inicial é ISENTA, com `isencao_ate` nula. Assim, nenhum escritório que já existe sai cobrado (revisão, 4).
2. **Congela na abertura.** A implantação guarda `valor_centavos`, `condicao` e `condicao_texto`, que é o texto público que vai para a fatura ("Oferta de lançamento"). Mudar a regra vale só para as implantações que abrirem depois.
3. **Prazo.** `prazo_ate = escritorio_dia_um(escritorio) + prazo_dias` (30); `aberta_em` é o mesmo dia 1. Quando não há dia 1 (escritório antigo, ou abertura na 1ª fatura antes de algum sócio entrar), conta do dia da abertura. A Administração pode mudar `prazo_ate` com motivo, que vai para o histórico interno. Não há passagem automática para Ativo nesta entrega.
4. **Linhas na 1ª fatura.** Ao emitir a fatura da `primeira_competencia`, com a chave ligada, uma implantação não cancelada e ainda não faturada, `cobranca_emitir` junta ao fim:
   - `IMPLANTACAO`: "Implantação assistida · treino de toda a equipe e acompanhamento por 30 dias", +valor;
   - `ISENCAO`, só se a implantação for isenta: "Isenção da implantação · Oferta de lançamento", −valor.

   O motivo vai **só na descrição do item**, que é só de inserção. O PDF não busca nada ao vivo (revisão, 19). Valor 0 não gera linha.
5. **"Faturada"** quer dizer que existe uma linha IMPLANTACAO numa fatura não cancelada. Como hoje nada reemite uma fatura cancelada (`0690:765`), a implantação de uma 1ª fatura cancelada fica sem linha. O que fazer nesse caso é a pergunta 3. O teste "cancelada e reemitida" saiu do plano (revisão, 6).
6. **Carnê.**
   - **Isenta:** as duas linhas entram depois dos itens da parcela (1170) e somam zero. A parcela, o Pix e o boleto não mudam.
   - **Cobrada:** `cobranca_emitir` levanta `IMPLANTACAO_COBRADA_NO_CARNE`. Para a pessoa ver a mensagem antes de chegar à emissão, a mesma conferência roda em quatro lugares:
     - `console_assinatura_salvar`, já envolvida pela 1170;
     - `console_carne_novo`;
     - na conclusão, antes de passar a Ativo;
     - na confirmação da assinatura do CO-09;
     - no passo novo de `cobranca_rotina` do CO-09, que chama `cobranca_comecar` em `fim + 1`: a conferência pula esse escritório, com um aviso no sino, para que um escritório não derrube a rotina dos outros.

     Sem teste, a 1ª fatura sai dentro da transação do usuário (`cobranca_comecar`). Com o teste do CO-09, ela pode sair na rotina, em `fim + 1`. Por isso a rotina confere antes e pula o escritório (último item abaixo), e a recusa nunca derruba a rotina diária.
7. **Concluir.** `console_implantacao_concluir(p, e, versao_cliente, versao_implantacao, resumo)`:
   - chama `console_mudar_estagio(p, e, versao_cliente, 'ATIVO', 'Implantação concluída')`;
   - um gatilho no Ativo passa a implantação a CONCLUIDA, com o resumo (até 2.000 caracteres).

   Quem passa a Ativo pela aba Contrato também conclui. Com teste, o Ativo não cobra nada. Sem linha de teste, o Ativo começa a cobrança, como hoje, e a 1ª fatura já sai com as linhas.
8. **Encerrar.** Um gatilho na passagem de `clientes` para ENCERRADO cancela a implantação aberta **no dia do fim**. Ele roda dentro de `encerrar_no_dia`, com a marca que já existe, `t3jus.mudando_contrato`, e sem marca nova (revisão, 15).
9. **Reabrir.** De Encerrado volta-se a Implantação só quando o encerramento foi durante a implantação (`0210:538-541`). Nesse caso abre uma implantação nova (número 2), com a regra do dia e o prazo contado da reabertura.
10. **Escritórios que já existem.** Eles não têm linha em `testes_gratis`, então `escritorio_dia_um` é nulo. A 1181 abre a implantação dos que estão em Implantação **e** já têm um sócio que criou a senha (`pessoas.senha_criada_em`), com `aberta_em` = o dia da migration e a condição da regra (isenta). Os outros escritórios antigos em Implantação abrem na 1ª fatura, no Ativo. Ativo e Encerrado não ganham implantação.

---

## 4. Modelo de dados

Migrations na faixa 1180 a 1189. Toda tabela de dado de escritório tem `escritorio_id not null references escritorios` e passa por `proteger_tabela_escritorio`. No Portal, o escritório vem da sessão (`c.get("escritorioId")` e `entrar_escritorio`), nunca do corpo. O autor de cada gravação (`*_por`) vem de `contexto_pessoa()`, nunca do corpo.

### 4.1 Regra global: `implantacao_regras`

Uma linha só, como `planos_regras`. Passa por `proteger_tabela_global`, com `controle_versao` e sem exclusão.

| Coluna | Valor inicial | Regra |
|---|---|---|
| `id` boolean pk check (id) | true | |
| `nome` text | "Implantação assistida" | 2 a 60 caracteres |
| `descricao` text | "treino de toda a equipe e acompanhamento por 30 dias" | até 120 caracteres; vai na linha da fatura |
| `valor_centavos` integer | 149000 | 0 a 10.000.000 |
| `condicao_padrao` text | ISENTA | ISENTA ou COBRADA |
| `isencao_ate` date | nula | Só vale com ISENTA; nula = isenta sem data de fim |
| `isencao_texto` text | "Oferta de lançamento" | 1 a 60 caracteres; público, vai na fatura |
| `prazo_dias` integer | 30 | 1 a 90 |
| `versao` | | |

O histórico da regra entra em `planos_eventos`, com a ação `implantacao.regra_mudou` e os dados antes e depois. Toda mudança tem autor (a Administração), o que respeita o `autor_id not null` (revisão, 16). O fim da isenção não grava evento: é só um aviso no sino (4.4).

A chave em `configuracoes` é `implantacao_na_fatura`, com valor `false` e a descrição "Põe as linhas da implantação assistida na 1ª fatura (CO-08). Liga junto com as telas".

### 4.2 `implantacoes` (dado do escritório; entra na exportação)

| Coluna | Regra |
|---|---|
| `id`, `escritorio_id` | `unique (escritorio_id, id)` para as chaves compostas das tabelas filhas |
| `numero` integer ≥ 1 | 1; 2 na reabertura |
| `estado` | ABERTA, CONCLUIDA ou CANCELADA, com `ligar_guardiao`, `estados_iniciais ('implantacoes','ABERTA')` e as transições ABERTA→CONCLUIDA e ABERTA→CANCELADA. A abertura chama `definir_transicao`, com o sistema como autor quando vem do gatilho (revisão, 20) |
| `aberta_em` date, `prazo_ate` date | |
| `nome`, `descricao`, `valor_centavos`, `condicao`, `condicao_texto` | Copiados da regra (congelados). `condicao_texto` é o texto público da fatura |
| `responsavel_id` uuid, aceita nulo | Pessoa da equipe com vínculo ativo no escritório e a função IMPLANTACAO ou ADMINISTRACAO ainda ativa, pela mesma regra de `pessoas_cobranca_do_escritorio` (`0691:26-38`) |
| `concluida_em`, `concluida_por`, `resumo` (até 2.000 caracteres) | O sócio vê o resumo |
| `cancelada_em` | O motivo fica no histórico do encerramento |
| `criado_em`, `versao` | |

Um índice único `(escritorio_id) where estado = 'ABERTA'` impede duas implantações abertas. O CO-09 grava `primeiro_acesso_em` uma vez só (`update … where primeiro_acesso_em is null`), então o gatilho dispara uma vez. A abertura também usa `on conflict do nothing`, para a abertura pela 1ª fatura não colidir com ela.

O motivo de mudar o prazo **não** fica na tabela, que é exportada. Ele vai para o histórico interno (CO-04), como pede a revisão na correção 18.

### 4.3 Treinos (dado do escritório; entram na exportação)

**`implantacao_treinos`**
- Colunas: `id`, `escritorio_id`, `implantacao_id`, `dia` (hoje ou antes; `TREINO_NO_FUTURO`), `duracao_min` (15 a 480), `forma` (VIDEO, PRESENCIAL ou TELEFONE), `temas text[]` (áreas do Portal), `dado_por` e `criado_em`.
- Chave composta `(escritorio_id, implantacao_id) references implantacoes (escritorio_id, id)`.
- Só de inserção. Para corrigir, "Desfazer registro" com motivo: preenche `desfeito_em` e `desfeito_por`, por um gatilho que só deixa mudar essas colunas uma vez. O motivo vai para o histórico interno.

**`implantacao_treino_pessoas`**
- Colunas: `escritorio_id`, `treino_id` e `pessoa_id`.
- Chave composta `(escritorio_id, treino_id)`.
- A `pessoa_id` precisa ter vínculo ativo de função do Portal no mesmo escritório (`PESSOA_SEM_VINCULO`).
- Só de inserção.

Os treinos ligam à implantação. A pergunta 6 decide se pessoa que entra depois da conclusão também ganha treino. Se sim, a mesma tabela aceita implantação CONCLUIDA.

### 4.4 Mudanças em tabelas que existem

- **`fatura_itens`:**
  - `tipo` passa a aceitar `IMPLANTACAO` e `ISENCAO`;
  - o check do sinal muda para `(tipo in ('DESCONTO','ISENCAO')) = (valor_centavos < 0) or valor_centavos = 0`;
  - entra `implantacao_id uuid` com uma chave composta `(escritorio_id, implantacao_id)`, preenchida só nesses dois tipos (check).
- **`avisos_console`:**
  - tipos novos `IMPLANTACAO_PRAZO`, com `implantacao_id references implantacoes on delete cascade`, e `IMPLANTACAO_ISENCAO_FIM`, sem id;
  - o check exige `implantacao_id` só no primeiro tipo;
  - o `cascade` evita travar o fim da guarda (revisão, 17);
  - se a 1160 do CO-09 já tiver posto `escritorio_id` em `avisos_console`, o aviso de prazo também o preenche.
  - A frente da F0.15 precisa saber que o `fatura_id` da 0691 tem `restrict` e o mesmo risco.
- **`funcao_acoes`:** veja a seção 7.
- **`inventario_dados`:** uma linha para `implantacoes`, uma para `implantacao_treinos` e uma para `implantacao_treino_pessoas`, todas com `exportar`. O prazo é "Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato" (`README.md:591`). Os treinos têm dado pessoal da equipe do escritório: a finalidade é a execução do contrato, e o escritório é o controlador.
- **Fim da guarda (0540):** as tabelas novas já entram, porque `proteger_tabela_escritorio` cria a política `fim_da_guarda`.

### 4.5 O que é calculado, sem nada guardado

`implantacao_situacao(p_escritorio)` lê na hora (como o atraso, `README.md:89`):
- o sócio já entrou e em que dia (`escritorio_dia_um`);
- as pessoas com vínculo do Portal, com "Aceitou o convite" ou "Ainda não entrou" (`pessoas.senha_criada_em`) e "Treinada em dd/mm" ou "Sem treino";
- "X de Y pessoas treinadas";
- importação concluída (`importacoes` com CONCLUIDA, de PLANILHA, ASTREA ou ADVBOX_PLANILHA);
- WhatsApp ligado;
- dias até o prazo.

Nenhuma etapa é guardada nem marcada à mão nesta entrega.

---

## 5. Funções e rotas

### 5.1 Banco (as da API são `security definer` e começam por `entrar_escritorio(p_pessoa, p_escritorio, '<ação>')`)

| Função | Migration | O que faz |
|---|---|---|
| `implantacao_condicao(p_dia)` | 1180 | Devolve a condição e o texto do dia |
| `console_implantacao_regras` / `…_salvar(p, versao, dados)` | 1180 | Ler e mudar a regra; o evento entra em `planos_eventos` |
| `implantacao_abrir(p_escritorio, p_sistema)` | 1181 | Abre a implantação, se o estágio for IMPLANTACAO e não houver uma aberta. Chamada pelo gatilho de `primeiro_acesso_em` em `testes_gratis` (o CO-09 já filtra o vínculo SOCIO) e por `cobranca_comecar`, antes de emitir |
| Gatilhos em `clientes` | 1181 | Ativo → CONCLUIDA; Encerrado → CANCELADA; Encerrado → Implantação abre a número 2 |
| `console_implantacao_concluir(p, e, v_cliente, v_impl, resumo)` | 1181 | Regra 7 |
| `console_implantacao_prazo(p, e, prazo_ate, motivo, versao)` | 1181 | Muda o prazo, com motivo no histórico interno |
| `implantacao_itens(a assinaturas, p_competencia)` | 1182 | A única fonte das duas linhas (lista vazia com a chave desligada) |
| `cobranca_emitir` (create or replace **a partir da 1170**) | 1182 | Junta `implantacao_itens` ao fim, soma ao total e recusa a implantação cobrada no carnê |
| `console_assinatura`, `portal_plano_faturas`, `cobranca_documento_json` | 1182 | Envolvidas a partir da versão mais nova, com o bloco `implantacao {nome, valorCentavos, condicao, condicaoTexto, faturada, faturaId}`. O valor só vai para quem tem `console.cobranca.ver` ou é o sócio dono |
| `console_implantacao(p, e)` | 1183 | A aba: cabeçalho, situação calculada (4.5), treinos e responsável |
| `console_implantacao_treino(p, e, dados)` / `…_treino_desfazer(p, e, treino, motivo)` | 1183 | Registrar e desfazer treinos |
| `console_implantacao_responsavel(p, e, pessoa, versao)` | 1183 | `RESPONSAVEL_SEM_ATRIBUICAO` |
| `implantacao_rotina()` | 1184 | Chamada no começo de `cobranca_rotina`, **antes** do `continue` de quem não tem `primeira_competencia` (`0690:879`). Avisa aos 7, 3 e 0 dias (uma vez cada) e, 30 dias antes de `isencao_ate`, manda o aviso de fim da isenção à Administração |
| `portal_implantacao(p, e)` | 1185 | Para os sócios: prazo, responsável, situação calculada e treinos por pessoa, sem valores. Cada pessoa lê o próprio treino |

### 5.2 Rotas

`api-console`:
- `GET` e `PUT /v1/cobranca/implantacao`;
- `GET /v1/clientes/:id/implantacao`;
- `POST …/implantacao/concluir`;
- `PUT …/implantacao/prazo`;
- `POST …/implantacao/treinos` e `POST …/treinos/:treino/desfazer`;
- `PUT …/implantacao/responsavel`.

`api-portal`:
- `GET /v1/escritorio/implantacao`, com o escritório da sessão;
- `GET /v1/escritorio/faturas` ganha o bloco `implantacao`.

Os corpos são validados por schemas zod novos em `packages/domain`. Se a resposta da api-portal passa por zod, os tipos novos entram nele.

**Erros novos:**
- `IMPLANTACAO_COBRADA_NO_CARNE`
- `IMPLANTACAO_NAO_ABERTA`
- `PESSOA_SEM_VINCULO`
- `RESPONSAVEL_SEM_ATRIBUICAO`
- `TREINO_NO_FUTURO`
- `PRAZO_INVALIDO`

Os que já existem também valem: `MOTIVO_OBRIGATORIO`, `CONFLITO_VERSAO`, `SEM_PERMISSAO` e `SEM_SOCIO`.

### 5.3 Telas e PDF (só no PR das telas)

- Os rótulos de `FaturaCobranca.tsx:525` passam a ser explícitos ("Implantação" e "Isenção"), sem o "Desconto" para todo outro tipo.
- Os tipos fechados de `cobranca_pdf.ts:58`, `packages/ui/src/console/cobranca.ts:64` e do Portal ganham os dois tipos.
- O PDF usa só a descrição do item.

---

## 6. Como aparece

**1ª fatura** (plano Escritório, R$ 499, desconto de entrada de 20%, implantação isenta):

| Item | Valor |
|---|---|
| Plano Escritório · janeiro de 2027 | R$ 499,00 |
| Desconto de entrada (20% da mensalidade) | −R$ 99,80 |
| Implantação assistida · treino de toda a equipe e acompanhamento por 30 dias | R$ 1.490,00 |
| Isenção da implantação · Oferta de lançamento | −R$ 1.490,00 |
| **Total** | **R$ 399,20** |

Com a implantação cobrada (à vista), a mesma fatura dá R$ 1.889,20.

**Assinatura (Console):** um bloco "Implantação assistida · Isenta (Oferta de lançamento)", com "Na 1ª fatura" ou "Na fatura de janeiro de 2027 (ver)". O valor aparece só para a Administração e o Financeiro, que é a decisão aprovada de que a Implantação e o Suporte não veem valores na Assinatura (`console-cobranca/NOTAS.md:146`).

**Portal (sócio dono):** em Plano e faturas, a mesma linha e as linhas da fatura. Os sócios veem a folha Implantação sem valores. Cada pessoa vê o próprio treino no Início.

---

## 7. Permissões

| Ação nova | Quem | O que libera |
|---|---|---|
| `console.implantacao.ver` | ADMINISTRACAO, IMPLANTACAO, FINANCEIRO, SUPORTE | Ver a aba Implantação. A condição aparece para todos, e o valor só para quem tem `console.cobranca.ver` |
| `console.implantacao.editar` | ADMINISTRACAO, IMPLANTACAO | Treinos e responsável |
| `console.implantacao.prazo` | ADMINISTRACAO | Mudar o prazo |
| `console.implantacao.regras` | ADMINISTRACAO | Mudar a regra global |
| `portal.implantacao.ver` | SOCIO | Ver a folha Implantação |

- Concluir usa `console.estagio.mudar` (ADMINISTRACAO e IMPLANTACAO).
- Cada pessoa do Portal vê o próprio treino sem ação nova: a função lê só a pessoa da sessão.
- O valor no Portal segue `portal.faturas.ver` mais `e_socio_dono`.
- A pessoa da equipe só vê os escritórios atribuídos a ela.

---

## 8. Telas que vão para o desenho (D43)

**Console:**
1. **Ficha › aba nova Implantação.**
   - Cabeçalho: prazo com os dias que faltam, responsável com "Trocar", condição.
   - "O que já aconteceu", calculado.
   - Pessoas, com o aceite do convite e o treino, e "X de Y treinadas".
   - Treinos, com a janela "Registrar treino" (com erros) e "Desfazer registro".
   - Janela "Mudar o prazo".
   - `alertdialog` "Concluir a implantação", com o resumo e o efeito na cobrança, com e sem o CO-09.
   - Estados: aberta, perto do prazo, vence hoje, passou do prazo, concluída, cancelada, carregando, erro, conflito, leitura do Financeiro e do Suporte, e sem permissão.
2. **Cobrança › Planos › folha Implantação assistida.**
   - Ver e editar: valor, condição padrão, data de corte, texto da isenção e prazo.
   - Prévia "Vale para as implantações que abrirem depois".
   - Aviso de nota fiscal ao escolher Cobrada.
   - Histórico, leitura do Financeiro e erros.
3. **Ficha › Assinatura.** O bloco da implantação (isenta, cobrada, já faturada) e o erro `IMPLANTACAO_COBRADA_NO_CARNE` ao salvar com Carnê e ao gerar carnê novo.
4. **Fatura aberta.** Os rótulos novos (Implantação e Isenção).
5. **PDF da fatura e do recibo.** As duas linhas.
6. **Sino.** "A implantação do Cedro & Lima vence em 7 dias (4 de 6 pessoas treinadas)", o mesmo com 3 dias e no dia, e "A isenção da implantação termina em 30 dias, em dd/mm/aaaa".
7. **Ficha › aba Contrato.** "Concluir a implantação" leva à aba Implantação.

**Portal:**

8. **Escritório › Implantação** (sócios): prazo, quem acompanha, o que já aconteceu com os atalhos (Equipe, Importar, WhatsApp), pessoas com o treino, e a versão concluída com o resumo.
9. **Início.** O cartão da implantação para os sócios e "Seu treino" para cada pessoa.
10. **Escritório › Plano e faturas.** A linha da implantação e a fatura com a isenção.
11. **Assinar o T3jus (CO-09).** A linha da implantação com a isenção, na página que o CO-09 desenha.

---

## 9. Testes

### 9.1 pgTAP

Os arquivos levam os números livres na hora do PR (o CO-10 usa 180 a 182, e o CO-09, a faixa 17x). O nome de cada teste começa por `CO-08` (DC9).

| Arquivo | O que confere |
|---|---|
| `implantacao_regras` | A linha única, a versão, só a Administração, o evento com autor. A condição: ISENTA com corte nulo dá isenta; no dia do corte, isenta; no dia seguinte, cobrada; COBRADA ignora o corte |
| `implantacao_abertura` | Abre quando `primeiro_acesso_em` é gravado, e não no convite; o prazo conta de `escritorio_dia_um`; abre com o teste desligado, dispensado e repetido; a pessoa da EQUIPE não abre; abre na 1ª fatura quando nenhum sócio entrou; dois acessos ao mesmo tempo dão uma implantação só; a 1181 com o corte nulo abre isenta; os três gatilhos da cobrança (Ativo sem linha de teste, `fim + 1` pela rotina e confirmação com o teste dispensado), todos com as linhas na 1ª fatura; nenhuma fatura no teste; isolamento entre escritórios; o escritório vem da sessão |
| `implantacao_fatura` | Com a chave desligada, nada muda (o 092, o 116 e o 117 passam como estão). Com a chave ligada: isenta (as duas linhas, o total igual, só na 1ª); cobrada à vista (o total mais 1.490); o desconto de entrada não incide sobre a implantação; carnê isento (parcela, Pix e boleto iguais, a soma confere, com os itens da 1170); implantação COBRADA nascida com Carnê já salvo recusa na emissão e na conclusão; `console_carne_novo` recusa; a fatura cancelada deixa a implantação "não faturada"; o check do sinal; **depois de todas as migrations, a 1ª fatura isenta ainda traz as duas linhas** |
| `implantacao_treinos` | Pessoa sem vínculo ou de outro escritório recusa; desfazer com motivo, uma vez; desfazer o treino de outro escritório pela rota do escritório A falha; "X de Y" com pessoa nova volta a contar; o autor vem da sessão; permissões por função |
| `implantacao_conclusao` | Concluir passa a Ativo e fecha a implantação na mesma transação, com as duas versões; o caminho da aba Contrato também fecha; o motivo do estágio é preenchido; o encerramento cancela no dia do fim; reabrir abre a número 2; conflito de versão |
| `implantacao_prazo` | Com `app_relogio`: os avisos de 7, 3 e 0 dias, uma vez cada; o aviso chega também a quem ainda não tem `primeira_competencia`; mudar o prazo com motivo; o aviso de fim da isenção |
| Os que já existem | O 001 (RLS), o 008 (inventário), o 047 (fim da guarda, agora com um escritório com aviso de implantação), o 007, o 013 e o 021 (estágio e fim do contrato), o 092, o 116 e o 117 |

### 9.2 Deno, Vitest e ponta a ponta

- `api-console/implantacao_test.ts` e o teste da rota do Portal, que ignora um escritório vindo no corpo.
- `_shared/cobranca_pdf_test.ts`, com as linhas novas.
- Vitest dos schemas e dos textos.
- **Playwright com axe, no celular e no computador:**
  - `console-implantacao.spec.ts` (novo): registrar treino, "X de Y", trocar o responsável, mudar o prazo (Implantação recusada), concluir, leitura do Financeiro e do Suporte;
  - `console-cobranca.spec.ts`: a folha da regra, o bloco da assinatura e os rótulos da fatura;
  - `portal-implantacao.spec.ts` (novo) e `portal-plano-faturas.spec.ts`.
- **Concorrência (`tests/concorrencia/`):** dois sócios entrando ao mesmo tempo; concluir e encerrar ao mesmo tempo.

---

## 10. Painel (`docs/painel/LEIA-ME.md`)

Números confirmados pela coordenação: **D43** e **F1.42 a F1.49**.

| Item | Peça | refs | O que é | PR |
|---|---|---|---|---|
| D43 | C2 | CO-08 | Desenho da implantação assistida: as 11 telas da seção 8 | Desenho |
| F1.42 | C2 | CO-08 | Regra global da implantação no servidor (valor, condição padrão, data de corte, prazo) e a implantação congelada por escritório | PR 1 |
| F1.43 | C2 | CO-08, CO-09 | Abertura no primeiro acesso do sócio, conclusão no Ativo, cancelamento no fim do contrato, reabertura e escritórios existentes | PR 2 |
| F1.44 | C1 | CO-08, CO-06 | Linhas IMPLANTACAO e ISENCAO na 1ª fatura, atrás da chave, a cobrança à vista e o carnê cobrado recusado | PR 3 |
| F1.45 | C2 | CO-08 | Treinos por pessoa, responsável e situação calculada no servidor | PR 4 |
| F1.46 | C2 | CO-08 | Avisos de prazo e de fim da isenção no sino, e mudança do prazo | PR 5 |
| F1.47 | C2 | CO-08 | Telas do Console e PDF | PR 6 |
| F1.48 | S7 | CO-08 | Telas do Portal (Implantação, Início, Plano e faturas, linha na página Assinar do CO-09), que ligam `implantacao_na_fatura` | PR 7 |
| F1.49 | C2 | CO-08 | **Pendente:** o que fica para depois (seção 12) | Nasce no PR 1 |

- O PR 1 cria todos os itens como `pendente`, com o F1.49 já listando o que falta. Cada PR, no mesmo commit:
  - muda o seu item para `feito`, com `evidencia`, e preenche ou apaga o `proximo`;
  - cria a linha do histórico com `python3 docs/painel/painel.py novo-historico --inicio … --fim … --refs F1.4x CO-08 --texto "…"`, no horário de Brasília;
  - roda `python3 docs/painel/painel.py conferir`, que precisa dar 0 erro.
- Enquanto o F1.49 estiver pendente, ele cita CO-08, e a CO-08 não conta como atendida por inteiro.
- O PR 1 também:
  - muda o texto da CO-08 no `IDEIAS.md`, que ganha "em até 30 dias" e "o fim da isenção é configuração do Console". A contagem não muda (145);
  - cria a seção "Implantação assistida (F1.42 a F1.48; CO-08)" no `sistema/README.md`;
  - atualiza o `docs/CONTEXTO.md` quando a Carol responder.
- A combinar com a thread do CO-09: o F1.38 dela ("valor da implantação na página Assinar") sai, porque essa parte agora é do F1.48.

---

## 11. PRs (a Carol mescla um por vez)

| # | PR | Migration | Conteúdo | Pode abrir quando |
|---|---|---|---|---|
| — | Desenho (D43) | — | As telas da seção 8, para a Carol aprovar e responder às perguntas | Agora |
| 1 | Regra e implantação congelada (F1.42) | 1180 | `implantacao_regras`, `implantacoes` (guardião, estado inicial, chaves compostas), `implantacao_condicao`, permissões, inventário, rotas da regra, a chave `implantacao_na_fatura`, `IDEIAS.md`, README e painel | Com a **1160 do CO-09 aplicada** (sem tela) |
| 2 | Abertura, conclusão e cancelamento (F1.43) | 1181 | O gatilho em `testes_gratis.primeiro_acesso_em`, a abertura na 1ª fatura, `console_implantacao_concluir`, os gatilhos de Ativo, Encerrado e reabertura, a mudança de prazo, os escritórios existentes | Depois do PR 1 |
| 3 | Na fatura (F1.44) | 1182 | `fatura_itens` com os tipos novos, `implantacao_itens`, `cobranca_emitir` a partir da 1170, as recusas do carnê cobrado, os blocos em `console_assinatura`, `portal_plano_faturas` e `cobranca_documento_json`. Sem PDF e sem tela; a chave fica desligada | **Só com a 1170 mesclada e aplicada**, e depois do PR 2 |
| 4 | Treinos (F1.45) | 1183 | Treinos e participantes, responsável, situação calculada, rotas | Depois do PR 2 |
| 5 | Avisos (F1.46) | 1184 | `implantacao_rotina` em `cobranca_rotina`, os tipos de `avisos_console` com `cascade`, o 047 | Depois do PR 2 (não depende do PR 4) |
| 6 | Telas do Console e PDF (F1.47) | — | Telas 1 a 7 e o PDF, mais `console-implantacao.spec.ts` e `console-cobranca.spec.ts` | D43 aprovado, PRs 3 a 5 |
| 7 | Portal e chave (F1.48) | 1185 | `portal_implantacao`, rota, telas 8 a 11, specs do Portal, `implantacao_na_fatura` = true | D43 aprovado, PR 6, e a página Assinar do CO-09, se já existir (se não, a linha entra quando ela sair) |

As migrations de 1186 a 1189 ficam livres para correções. Toda função trocada (`cobranca_emitir`, `console_assinatura`, `portal_plano_faturas`, `cobranca_documento_json`) parte da versão mais nova no ar, e o PR guarda o `pg_get_functiondef` de antes, como o CO-10 faz.

---

## 12. O que fica para depois (vai no F1.49, pendente, citando CO-08)

1. Parcelar a implantação cobrada em mais de uma fatura.
2. A implantação cobrada no carnê, nas parcelas do primeiro carnê, usando os itens por parcela da 1170.
3. O uso do Portal por pessoa: pede registro por dia, uma política nova e outra finalidade no inventário (revisão, 10).
4. Os contatos de acompanhamento, como `notas_internas` com um tipo (até lá, a equipe usa as notas internas que já existem).
5. O checklist com etapas marcadas à mão e "Não se aplica", com a lista no código.
6. A passagem automática para Ativo no fim do prazo, que precisa de política RLS em `clientes`, de `definir_transicao` com o sistema como autor e de pular quem já tem encerramento marcado (revisão, 12).
7. O selo e o filtro do prazo na carteira.
8. Isentar ou cobrar um escritório só, com motivo, até a 1ª fatura.

---

## 13. Riscos

1. **A 1170 aplicada depois da 1182 apaga as linhas sem erro.** **Mitigação:** o PR 3 só abre com a 1170 no ar, e um teste confere as linhas depois de todas as migrations.
2. **A chave ligada antes das telas mostraria "Desconto" com R$ 1.490,00.** **Mitigação:** a chave liga só no PR 7, e o PR 6 já corrige os rótulos.
3. **Escritório que tem a 1ª fatura emitida com a chave desligada fica sem as linhas para sempre**, porque elas entram só na 1ª fatura. **Mitigação:** é isento nos 6 meses, então não há efeito em dinheiro, e a assinatura continua mostrando a condição.
4. **Passar a cobrar sem nota fiscal.** A 1ª fatura passa de R$ 1.900. **Mitigação:** a tela avisa ao escolher Cobrada (pergunta 5).
5. **Prazo sem efeito automático.** O escritório pode ficar em Implantação por mais de 30 dias. **Mitigação:** os avisos no sino; com o CO-09, a cobrança já não depende do Ativo.
6. **Promessa de treinar todas as pessoas.** **Mitigação:** a duração de cada treino fica registrada, o que mede o custo de verdade nos pilotos (a revisão de preços estima de 8 a 12 horas).
7. **Três threads na cobrança.** **Mitigação:** as faixas de migration e os números do painel estão separados; o gancho fica num gatilho em `testes_gratis.primeiro_acesso_em`, e não dentro de `escolher_escritorio`; a 1180 só vai ao ar com a 1160 aplicada.

---

## 14. Perguntas para a Carol (cada uma com recomendação)

1. **O valor da implantação assistida é R$ 1.490,00?** *Recomendo confirmar.* Ele fica acima do custo estimado (R$ 480 a R$ 720) e abaixo do que os concorrentes cobram pela configuração somada à adesão. Como é configuração, dá para mudar depois sem código.
2. **Quando começam os "6 primeiros meses do T3jus rodando"?** *Recomendo uma data fixa de lançamento, que a Carol grava em Cobrança › Planos. A isenção vale para as implantações que abrirem até essa data mais 6 meses.* Enquanto a data não existir, a regra fica "isenta, sem data de fim", e o sino avisa 30 dias antes do fim.
3. **Se a 1ª fatura (a que traz a implantação) for cancelada, por desistência ou por engano, o que acontece com a implantação?** *Recomendo que fique isenta, com o motivo do cancelamento no histórico, sem voltar a cobrar sozinha.* Nada no sistema reemite uma fatura cancelada, e cobrar de novo à mão fica para quando houver implantação cobrada.
4. **O que acontece quando passam os 30 dias?** *Recomendo, por enquanto, só os avisos aos 7, 3 e 0 dias e a mudança do prazo pela Administração, com motivo.* A passagem automática para Ativo pode ser decidida depois dos pilotos. Com o teste do CO-09, a cobrança começa no dia seguinte ao fim do teste, ou na confirmação quando o teste é dispensado, e não espera o fim da implantação.
5. **Quando a Carol decidir passar a cobrar, o que vem junto?** *Recomendo:*
   - cobrar à vista na 1ª fatura, com Pix ou boleto;
   - deixar o parcelamento e o carnê para quando os pilotos pedirem;
   - só trocar para "Cobrada" depois de a nota fiscal estar resolvida com o contador (F1.24). A tela mostra esse aviso.
6. **Pessoa que entra no escritório depois da implantação também ganha o treino?** *Recomendo que sim, sem custo, dado pela equipe e registrado na mesma lista de treinos.* É o diferencial anunciado ("todas as pessoas"), e as durações registradas mostram o custo real.

A troca de "Desconto de implantação" para "Desconto de entrada (20% da mensalidade)" **não** está aqui. A thread do CO-10 já perguntou à Carol, e o texto muda na 1170. Este plano depende dessa troca: sem ela, a 1ª fatura teria três linhas com "implantação".
