# CO-08 · Revisão independente do plano da implantação assistida

Revisão de 27/11/2026 do `co-08/plano.md` (versão 1). Ninguém programou nada e nenhum commit saiu. Cada afirmação do plano foi conferida no código do repositório `t3jus` (main em `4503681`). Também li os planos irmãos `co-09/plano.md` e `co-10-carne/plano.md`, porque os três mexem nas mesmas funções e nos mesmos números do painel.

Nas referências, `plano:N` é a linha N do `co-08/plano.md`, `0690:N` é `sistema/supabase/migrations/0690_cobranca_escritorios.sql` e as outras migrations seguem o mesmo padrão.

## Veredito: aprovar com mudanças

O desenho de base é bom e cabe no código que existe. As linhas saem só em `cobranca_emitir`, fora de `cobranca_itens_da`, o que evita repetir a implantação nas 12 parcelas do carnê. O valor e a condição congelam na abertura, a regra é global e só a Administração muda, e concluir a implantação reaproveita a passagem para Ativo.

Antes de programar, três coisas precisam mudar:

1. **O plano contradiz o do CO-09.** Os dois discordam sobre quando a implantação começa, sobre o que o Ativo dispara e sobre os números do painel. Isso tem de ser resolvido antes do PR 1.
2. **Há furos concretos na regra de cobrança:** a data de corte nula cobra todo mundo, a implantação cobrada some calada no carnê, a fatura cancelada não é reemitida e a tela mostra "Desconto" com R$ 1.490,00.
3. **O escopo está grande demais para algo que sai isento nos 6 primeiros meses.** Dá para cortar uns 40% e ainda cumprir tudo o que a Carol pediu.

---

## Correções (em ordem de importância)

### A. Bloqueiam o PR 1

**1. Combinar com o CO-09 quando a implantação abre e o que o Ativo faz.**
- O plano do CO-08 diz que a implantação não abre durante o teste, que conta 30 dias depois dele e que concluir passa a Ativo, o que começa a cobrança (`plano:48`, `plano:58`, `plano:61`).
- O plano do CO-09 diz o contrário: a implantação começa no dia 1 do teste e anda junto com ele, e a cobrança passa a começar na assinatura. Para quem tem teste, "Ativo volta a querer dizer só implantação concluída" (`co-09/plano.md:10`, `:13`, `:56`, `:88-95`).
- Se o CO-09 sair como está, três regras do CO-08 perdem o sentido: "concluir começa a cobrança", "Ativo pelo prazo cobra" (`plano:59`) e o texto "a cobrança começa no dia em que ela termina" (`plano:354`, `plano:359`).
- **Correção:** escolher um modelo só, antes do PR 1. A minha recomendação é a do CO-09: a implantação abre no primeiro acesso do sócio e anda junto com o teste. As linhas da implantação entram na 1ª fatura, qualquer que seja o gatilho da cobrança, e o fim da implantação deixa de ter efeito financeiro.
- O plano precisa ser escrito para funcionar com os dois gatilhos (Ativo hoje, assinatura com o CO-09), e o teste pgTAP tem de cobrir os dois.

**2. Números do painel disputados de verdade, não só em tese.**
- O CO-08 reserva D41 e F1.28 a F1.34 (`plano:412-419`).
- O CO-09 já reserva F1.28 a F1.38, inclusive um F1.38 da própria CO-08 (`co-09/plano.md:250-259`).
- O plano do carnê do CO-10 reserva D41 e F1.28 a F1.30 (`co-10-carne/plano.md:387-390`).
- **Correção:** a coordenação reparte as faixas agora, por exemplo F1.28-F1.39 para o CO-09, F1.40-F1.42 para o CO-10 e F1.43 em diante para o CO-08, e D41, D42 e D43, um para cada.
- O F1.38 do CO-09 ("valor da implantação na página Assinar") tem de virar um item do CO-08, ou sair, para a mesma pendência não ficar em dois itens.

**3. Ordem das migrations que trocam `cobranca_emitir`.**
- A 1181 do CO-08 faz `create or replace` de `cobranca_emitir` (`plano:195`, `plano:439`).
- A 1170 do CO-10 troca a mesma função, no ramo do carnê (`co-10-carne/plano.md:170`), e foi pensada para ir ao ar fora de ordem (`:143`).
- Se a 1181 for aplicada antes e a 1170 depois, com `--include-all`, a 1170, que parte da 0690, apaga as linhas da implantação sem nenhum erro.
- O mesmo vale para `portal_plano_faturas` (já trocada na 0692, na 0695 e na 0696) e para `console_assinatura`, que já foi envolvida duas vezes (`0694:122`, `0860:386`). O plano cita só a versão da 0690 (`plano:207`).
- **Correção:**
  - escrever no plano que o PR 2 só abre depois de a 1170 estar mesclada e aplicada;
  - partir sempre da versão mais nova de cada função (a da 1170 e a da 0860);
  - pôr no pgTAP uma conferência de que a 1ª fatura isenta ainda traz as duas linhas depois de todas as migrations.

**4. A data de corte nula contradiz a pergunta 3 e cobra os escritórios que já existem.**
- A tabela diz "nulo quer dizer que todas são cobradas" (`plano:79`).
- A pergunta 3 recomenda deixar a regra "isenta, sem data de fim" enquanto a data não existe (`plano:491`).
- A migration 1180 abre a implantação dos escritórios que já existem "com a condição pela regra, que dá isenta" (`plano:180`). Com o corte nulo, dá cobrada.
- **Correção:** separar as duas coisas na regra, com `condicao_padrao` (ISENTA ou COBRADA) e `isencao_ate` (date, aceita nulo, só vale com ISENTA), ou trocar por `cobrar_a_partir_de` (nulo quer dizer nunca cobra).
- O valor inicial tem de ser isento. Mais um teste: "1180 com o corte nulo abre isenta".

**5. A implantação cobrada some calada no carnê.**
- O plano recusa duas combinações: salvar a assinatura com Carnê e mudar a condição para cobrada (`plano:57`).
- Mas a implantação abre sozinha, por gatilho (`plano:192`). Se a regra já estiver cobrada e a assinatura já for Carnê, a implantação nasce COBRADA sem passar por nenhuma das duas recusas.
- Na emissão, "no carnê, só junta quando a soma der zero" (`plano:195`). A implantação cobrada não entra, nada avisa e a condição continua "não faturada".
- Há ainda dois caminhos que trocam a forma ou o carnê sem passar pelo salvar: `cobranca_trocar_carne` e `console_carne_novo` (`0690:1607-1629`). E a regra só olha "ainda não faturada": quem paga a parcela 1 de 3 por Pix e passa para Carnê perde as parcelas 2 e 3.
- **Correção:** recusar no ponto que não tem como escapar, que é a emissão. Com implantação COBRADA e forma CARNE, `cobranca_emitir` levanta `IMPLANTACAO_COBRADA_NO_CARNE`, e a conclusão confere a mesma coisa antes de passar para Ativo.
- Na primeira entrega, sem parcelamento (veja a 9), o caso das parcelas 2 e 3 deixa de existir.

**6. A fatura cancelada não é reemitida, e o teste do plano testa um fluxo que não existe.**
- O plano promete "fatura cancelada e reemitida repete as linhas" (`plano:376`).
- Hoje nada reemite. `cobranca_emitir_pendentes` só emite a competência que não tem fatura nenhuma, e a cancelada conta (`0690:765`: `not exists (... f.competencia = v_comp)`, sem filtro de situação). O índice único deixa ter outra (`0690:188`), mas nenhum código cria.
- Com isso, a desistência da pergunta 7 (`plano:495`), ou um cancelamento por engano, tira a implantação de vez, e `IMPLANTACAO_JA_FATURADA` passa a valer para sempre.
- **Correção:** tirar esse teste. Escrever a regra: "a implantação conta como faturada quando há linha IMPLANTACAO numa fatura não cancelada".
- Decidir com a Carol o que acontece depois do cancelamento: a implantação fica isenta com o motivo da desistência, que é o recomendado, ou é cobrada de novo à mão (fica fora da primeira entrega).

**7. Os itens novos aparecem na tela como "Desconto" e o PDF não os conhece.**
- A tabela da fatura no Console rotula todo tipo que não é MENSALIDADE nem PESSOA_A_MAIS como "Desconto" (`packages/ui/src/console/FaturaCobranca.tsx:525`). A linha "Implantação assistida R$ 1.490,00" sairia como "Desconto".
- Os tipos fechados estão em `_shared/cobranca_pdf.ts:58` e em `packages/ui/src/console/cobranca.ts:64`.
- O PR 2 põe as linhas nas faturas de verdade (`plano:439`), mas as telas só chegam nos PRs 6 e 7.
- O PR 2 também mexe no PDF (`plano:243`), que está entre as telas alteradas (`plano:463`), antes do desenho aprovado. Isso fere o CLAUDE.md.
- **Correção:** pôr as linhas atrás de uma chave em `configuracoes`, por exemplo `implantacao_na_fatura`, desligada, como o `teste_gratis_ligado` do CO-09. A chave só liga no PR das telas, já com o desenho aprovado. O PDF e os rótulos vão para esse mesmo PR.

**8. O nome "Desconto de implantação" já existe e vai confundir.**
- A linha do desconto de hoje se chama "Desconto de implantação (20% da mensalidade)" (`0690:501`), e o desenho aprovado também usa esse nome (`docs/design/aprovadas/console-cobranca/NOTAS.md:334`; `docs/CONTEXTO.md:20`).
- A 1ª fatura de um escritório com desconto de entrada ficaria com três linhas de "implantação": o desconto, a implantação assistida e a isenção.
- **Correção:** pergunta nova para a Carol: renomear para "Desconto de entrada", como o CO-09 já propõe na 1161 (`co-09/plano.md:159`).
- O PR que fizer a troca muda também o texto do 092 e o do PDF.

### B. Escopo: o que cortar na primeira entrega

**9. Cortar o parcelamento de 1 a 3.**
- Nos 6 primeiros meses ninguém paga, e o parcelamento traz quase todos os casos de borda: a sobra dos centavos, a troca para carnê no meio, a desistência entre parcelas e a mudança de forma.
- O plano também se contradiz aqui: a tabela tem `parcelas_padrao` = 1 (`plano:81`), e a pergunta 2 recomenda 3 como padrão (`plano:490`).
- A conta da capa está errada: a parcela 3 dá R$ 1.045,68, não R$ 1.045,66 (`plano:276`).
- **Correção:** a primeira entrega cobra à vista na 1ª fatura (Pix ou boleto). O parcelamento vira um item pendente que cita CO-08, para decidir junto com a cobrança de verdade e com o carnê do CO-10.

**10. Cortar o "uso do Portal por pessoa": o dado não existe e a finalidade não cobre.**
- `sessoes_escritorio` guarda uma linha por sessão, com a hora em que o escritório foi escolhido. Uma nova escolha na mesma sessão sobrescreve a hora (`0210:254-256`, tabela em `0010:95-100`, não na 0100 como diz `plano:38`).
- Não há registro por dia, então "quantos dias, dos últimos 7, tiveram entrada" (`plano:163`) não dá para calcular.
- A tabela só abre para a própria pessoa e para a rotina dos prazos (`0010:132`, `0080:42-44`). O Console precisaria de uma política nova.
- A finalidade no inventário é "Manter a pessoa no escritório escolhido" (`0070:48-50`). Usar a tabela para acompanhar quem entra é outra finalidade (LGPD, art. 6º, I).
- **Correção:** na primeira entrega, mostrar só "Aceitou o convite" e "Ainda não entrou" (`pessoas.senha_criada_em`) e o treino. O uso por pessoa vira ideia ou item à parte, com o inventário revisto.

**11. Reaproveitar o que já existe, em vez de criar tabelas.**
- **Contatos de acompanhamento:** `notas_internas` já é interna, só de inserção e com autor (`0060:418-428`). Basta um prefixo ou um campo `tipo`. Isso tira `implantacao_contatos` (`plano:149-157`).
- **Catálogo de etapas:** `implantacao_etapas_modelo` (`plano:88`) com 7 linhas fixas pode ser uma lista no código.
- **Etapas automáticas:** em vez de guardar e manter com gatilhos sobre `importacoes`, `whatsapp_escritorio` e `vinculos`, mais a rotina (`plano:131`, `plano:205`), calcular na leitura, como o atraso ("Atraso é calculado, não guardado", `sistema/README.md:89`). Só a marcação manual e o "Não se aplica" ficam guardados. Isso acaba com o problema da importação DESFEITA que volta a PENDENTE.

**12. Adiar o Ativo pelo prazo automático e simplificar a prorrogação.**
- O Ativo pelo prazo (`plano:59`) precisa de quatro coisas que o plano não prevê:
  - uma política RLS nova em `clientes`. A tabela é interna e exige `contexto_equipe()` (`0060:273`, `0060:412`), e `entrar_escritorio_servico` não liga a equipe (`0300:213-224`). Sem a política, o `update` não muda nenhuma linha e não dá erro;
  - `definir_transicao` com o sistema como autor;
  - pular o escritório com o encerramento já marcado (`0210:442-448`: o estágio só vira Encerrado no dia do fim);
  - rodar antes do `continue` de `cobranca_rotina`, que pula quem ainda não tem `primeira_competencia` (`0690:879`).
- Com o CO-09 (correção 1), o prazo deixa de proteger a receita.
- **Correção:** na primeira entrega, o prazo aparece, o sino avisa aos 7, 3 e 0 dias e a Administração pode mudar `prazo_ate` com motivo. A passagem automática vira a pergunta 5, para depois dos pilotos. O "aviso de fim da isenção 30 dias antes" pode sair junto com a regra, porque é um aviso só.

**13. Adiar a carteira (selo e filtro), o "Mudar a condição deste escritório" e a folha do Portal depois da conclusão.**
- Nada disso é pedido da Carol.
- A condição por escritório (`plano:202`) só faz diferença quando alguém for cobrado, o que nos 6 primeiros meses não acontece.

A primeira entrega enxuta, que ainda cumpre todos os pedidos, fica assim:
- a regra global no Console, com valor, condição, data e prazo, histórico e só a Administração mudando;
- a implantação congelada por escritório, com prazo de 30 dias;
- as linhas IMPLANTACAO e ISENCAO na 1ª fatura (Pix, boleto e carnê isento), na assinatura, no PDF e no Portal;
- os treinos por pessoa, com o "X de Y pessoas treinadas";
- os avisos de prazo;
- a cobrança à vista pronta, para a Carol trocar a regra sem código, e o carnê recusado com código.

### C. Erros e lacunas de regra

**14. O convite não é uso.**
- `SEM_SOCIO` olha o vínculo SOCIO não revogado (`0060:473-474`), e esse vínculo existe desde o convite, ainda sem senha. Tanto que o encerramento revoga os convites "sem `senha_criada_em`" (`0210:445-447`).
- Por isso "esse é o dia em que o escritório começa a usar o Portal" (`plano:48`, `plano:492`) está errado. O convite parado na caixa de entrada gastaria dias do prazo.
- **Correção:** abrir no primeiro acesso de um sócio, pela `escolher_escritorio` (`0210:241-261`), como o CO-09 faz (`co-09/plano.md:39-41`). Assim os dois planos usam o mesmo gancho.

**15. A marca nova `t3jus.implantando` não faz falta.**
- `encerrar_no_dia` já liga `t3jus.mudando_contrato` antes do `update clientes` (`0210:443-444`), e `contrato_aceita_escrita` aceita essa marca (`0690:402`). O gatilho que cancela a implantação roda dentro desse `update`.
- Criar a marca (`plano:174`) obriga a trocar `contrato_aceita_escrita` mais uma vez, e ela já foi trocada na 0210, na 0550 e na 0690, e o CO-09 vai trocar de novo na 1160 (`co-09/plano.md:158`).
- **Correção:** usar a marca que existe.
- Decidir também quando a implantação é cancelada: no dia do fim (recomendo) ou quando o encerramento é marcado.

**16. `planos_eventos` não aceita evento sem autor.**
- `autor_id` é `not null` (`0690:92`). O evento `implantacao.isencao_terminou`, que é do sistema (`plano:86`), falharia.
- **Correção:** só gravar eventos com autor, por exemplo a mudança da regra, ou criar `implantacao_eventos` com o autor aceitando nulo.

**17. Avisos no sino travam o fim da guarda.**
- O plano copia o padrão da 0691 para `avisos_console.implantacao_id` (`plano:171`).
- `avisos_console` é global, não tem `escritorio_id` (`0590:242-257`), então `terminar_guarda` não apaga a linha (`0540:166-169`). Com `on delete restrict`, a chave impede apagar `implantacoes` no fim da guarda.
- Do jeito que está, o teste 047 não pega o caso, porque não cria aviso.
- A `fatura_id` da 0691 (`0691:16`) tem o mesmo problema, e vale avisar a frente da F0.15.
- **Correção:** usar `on delete cascade`, como `interessado_id` (`0590:249`). Pôr no 047 um escritório com aviso de implantação. O aviso de fim da isenção não tem `implantacao_id`, então o check tem de aceitar isso.

**18. O inventário usa o prazo errado.**
- O plano dá "o prazo do vínculo" para treinos e participantes (`plano:173`).
- O README manda que tabela nova de dado do escritório use "Enquanto o escritório for cliente do T3jus e 5 anos depois do fim do contrato" (`sistema/README.md:591`).
- **Correção:** usar esse texto. Também separar `condicao_motivo`: o texto que aparece na fatura é público, mas o motivo que a Administração escreve pode ser interno, e `implantacoes` entra na exportação (`plano:100`, `plano:115`). Guardar o texto da isenção como sai na fatura e deixar o motivo da Administração no histórico interno.

**19. O motivo da isenção tem de ficar congelado no item.**
- O PDF põe o motivo do desconto embaixo da linha lendo `d.motivoDesconto` (`cobranca_pdf.ts:416`), que vem da assinatura de hoje, não da fatura (`0695:70`).
- "Como o desconto já sai" (`plano:243`), o texto da isenção mudaria nas faturas antigas sempre que a regra mudasse.
- **Correção:** o motivo vai só na `descricao` do item ("Isenção da implantação · Oferta de lançamento"), que é só de inserção, e o PDF não busca nada ao vivo.
- Implantação com valor 0 não gera linha nenhuma.

**20. Concluir pela função que existe tem outra assinatura.**
- `console_mudar_estagio` pede a versão de `clientes` e um motivo obrigatório de 1 a 300 caracteres (`0130:47-72`).
- `console_implantacao_concluir(p, e, resumo, motivo, versao)` (`plano:203`) tem uma versão só e o motivo opcional, e o resumo vai até 2.000 caracteres.
- **Correção:** a função recebe as duas versões, monta o motivo do estágio (por exemplo "Implantação concluída") e guarda o resumo na implantação.
- O guardião exige evento e autor (ou o sistema) também no INSERT (`0060:338-352`). O gatilho de abertura e a 1180 precisam de `definir_transicao`, e `estados_iniciais` precisa de `('implantacoes','ABERTA')`.

**21. Detalhes factuais.**
- `cobranca_emitir` começa na `0690:679`, não na 668 (`plano:34`).
- `sessoes_escritorio` está na 0010 (`plano:38`).
- A origem da ADVBOX é `ADVBOX_PLANILHA` (`0790:20-21`).
- A pergunta 9 (`plano:497`): reabrir só volta a Implantação quando o escritório foi encerrado durante a implantação, porque o estágio volta ao de antes (`0210:538-541`). Esse escritório nunca pagou a implantação, então o motivo "cobrar de novo afasta" não se aplica. Basta seguir a regra do dia ou continuar a número 1.
- A pergunta 13 (`plano:501`) contradiz uma decisão aprovada: a Implantação e o Suporte não veem valores na aba Assinatura (`console-cobranca/NOTAS.md:146`). O plano precisa citar essa decisão e restringir o valor à aba Implantação.

### D. Segurança e isolamento

**22. Chaves compostas e o autor vindo da sessão.**
- `implantacao_treino_pessoas` e `implantacao_etapas` apontam para `treino_id` e `implantacao_id` de outra tabela.
- **Correção:**
  - usar chave composta `(escritorio_id, implantacao_id)` ou um gatilho que confira que é o mesmo escritório, para a linha filha nunca apontar para outro escritório;
  - `dado_por`, `autor_id` e `concluida_por` vêm de `contexto_pessoa()`, nunca do corpo do pedido;
  - `pessoa_id` só com vínculo de função do Portal no mesmo escritório, como o plano já diz;
  - o `responsavel_id` só com uma pessoa da equipe com vínculo ativo no escritório e a função ainda ativa, a mesma regra de `pessoas_cobranca_do_escritorio` (`0691:27-37`).
- No pgTAP de isolamento, tentar desfazer o treino de outro escritório pela rota do escritório A.

### E. Testes que faltam

**23.** Faltam estes testes:
- `092_cobranca_escritorios_test.sql:77` confere os itens exatos da 1ª fatura (`MENSALIDADE`, `PESSOA_A_MAIS`, `DESCONTO`). Com a implantação aberta para todo escritório, esse teste quebra. A lista da `plano:380` precisa incluir o 092, o 116 e o 117, além do 007, do 013 e do 021 (estágio e fim do contrato) e do `console-cobranca.spec.ts`. Ou o 092 roda com a chave da correção 7 desligada.
- A implantação nasce COBRADA com Carnê já salvo, e a emissão recusa (correção 5).
- A 1180 com o corte nulo (correção 4).
- O fim da guarda com aviso de implantação (correção 17).
- Os itens da implantação continuam depois de todas as migrations, inclusive a 1170 (correção 3).
- Concorrência (`tests/concorrencia/`): concluir na mão e o Ativo pelo prazo ao mesmo tempo, se ele ficar; dois convites de sócio na mesma hora (o índice parcial segura, mas a transação de trás precisa voltar sem erro).
- A resposta da api-portal com os tipos novos, se o zod filtrar a resposta.

### F. PRs

**24.** Como redividir os PRs:
- **PR 1** junta regra, catálogo, guardião, três gatilhos, os escritórios que já existem, permissões, inventário e rotas (`plano:438`). Separar em dois: regra e implantação congelada num, abertura, conclusão e cancelamento no outro. Assim cada um fica revisável.
- **PR 2** só depois da 1170 (correção 3), com a chave desligada (correção 7) e sem o PDF.
- **PR 4** depende só do PR 1, não do PR 3 (`plano:441`).
- **PR 5 e PR 6** dividem o F1.32 (`plano:442-443`). Melhor um item do painel por PR.
- **PR 8** some da primeira rodada. Vira item pendente e depende do F1 do carnê do CO-10, não de "a mudança do carnê" em geral.

### G. Perguntas à Carol: o que falta e o que mudar

**25.** O que acrescentar e o que mudar:
- **Nova:** renomear "Desconto de implantação" para "Desconto de entrada" (correção 8).
- **Nova:** a implantação anda junto com o teste de 7 dias do CO-09, ou começa depois dele? Recomendar "junto", para os dois planos dizerem o mesmo.
- **Nova:** o que acontece com a implantação quando a fatura dela é cancelada, na desistência ou por engano (correção 6).
- **Nova:** quando começam os "6 primeiros meses do T3jus rodando": a primeira implantação, o primeiro Ativo ou uma data fixa de lançamento? A pergunta 3 mistura isso com a regra técnica. Recomendo uma data fixa que a Carol grava, com a regra isenta enquanto a data não existe.
- **Pergunta 2:** passar para "à vista na primeira entrega; parcelar se e quando passar a cobrar".
- **Pergunta 4:** passar para "primeiro acesso do sócio".
- **Pergunta 5:** passar para "por enquanto, só avisos e prorrogação; o Ativo automático depois dos pilotos".
- **Pergunta 10:** continua valendo, mas sem o "dias de uso" (correção 10).
- **Nota fiscal (risco 7, `plano:480`):** subir para condição de "passar a cobrar". Mudar a regra para COBRADA no Console devia mostrar esse aviso.

---

## As 10 mais importantes

1. Combinar com o CO-09 quando a implantação abre e o que o Ativo faz (correção 1).
2. Repartir os ids do painel, D41 e F1.28 em diante, entre o CO-08, o CO-09 e o CO-10 (correção 2).
3. Fazer o PR 2 só depois da 1170 e partir das versões mais novas de `cobranca_emitir`, `console_assinatura` e `portal_plano_faturas` (correção 3).
4. Separar a condição padrão da data de corte, porque o corte nulo hoje cobra os escritórios que já existem (correção 4).
5. Recusar a implantação cobrada no carnê na emissão e na conclusão, e não só ao salvar (correção 5).
6. Tirar o teste "cancelada e reemitida", porque não existe reemissão, e definir o que é "faturada" (correção 6).
7. Ligar as linhas na fatura só com uma chave e com as telas aprovadas, porque hoje viram "Desconto" (correção 7).
8. Cortar o parcelamento e o uso por pessoa da primeira entrega (correções 9 e 10).
9. Abrir no primeiro acesso do sócio, não no convite, e adiar o Ativo automático, que também pede uma política RLS em `clientes` (correções 12 e 14).
10. Usar `on delete cascade` no aviso, o prazo de guarda certo no inventário, a marca que já existe e eventos com autor (correções 15 a 18).
