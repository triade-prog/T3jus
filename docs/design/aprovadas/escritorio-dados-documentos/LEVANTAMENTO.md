# Dados do escritório para os documentos · levantamento (22/11/2026)

Pedido da Carol (22/11, 18h51 Bahia), com print do cartão "Dados do escritório" do Portal (Escritório):
"em dados do escritório precisa solicitar mais informações, pois é daqui que vai sair para preencher contrato, procuração, etc."

## O que existe hoje (repo triade-prog/t3jus, main 300c9be)

Tabela `escritorios` (só a equipe T3jus muda, pelo Console, `console_editar_ficha`, 0060):
- `nome` (2 a 120) — hoje "Santana": é o nome curto do sistema e é o que sai no contrato em maiúsculas ("CONTRATADA: SANTANA").
- `cnpj` (14 números, opcional).
- `cidade`, `uf`.
- `endereco` (um texto só, 3 a 200, sem CEP, número ou bairro separados).
- `contatos` (jsonb: nome, papel, telefone, e-mail): as pessoas com quem a equipe T3jus fala. O timbrado usa o telefone e o e-mail delas.
- `oab_sociedade_uf` + `oab_sociedade_numero` (0601): registro da sociedade na OAB. Quem muda é a sócia dona, em Escritório › Marca e timbrado (`MarcaTimbrado.tsx`), não no cartão.

Outros lugares com dados parecidos (não duplicar):
- Endereço de cobrança na aba Assinatura do Console (0694, PR #126, desenho `docs/design/aprovadas/cobranca-pdfs`, estados 26 a 30): CEP, rua, número, complemento, bairro, cidade, UF, em `assinaturas`. "Nasce do endereço da ficha"; só Administração e Financeiro veem.
- Dados do advogado em Sua conta (EX-15, 0760, `docs/design/aprovadas/portal-conta-dados`): nome completo, tratamento, nacionalidade, estado civil, CPF, RG, endereço profissional (padrão = o do escritório, caixa "Usar o endereço do escritório"), e-mail e telefone profissionais. OAB de cada pessoa na Equipe.
- Chave Pix do escritório em Escritório › Recebimento (0450).

## O que os documentos pedem do escritório

`sistema/packages/domain/src/documentos.ts` (contrato, procuração, declarações) e `peticoes.ts`:

| Campo do modelo | De onde vem hoje | Problema |
|---|---|---|
| `[ESCRITORIO_NOME]` | `nome` em maiúsculas | Sai o nome curto ("SANTANA"), não a razão social registrada |
| `[ESCRITORIO_CNPJ]` | `cnpj` | Ok; advogado sem sociedade não tem, e o contrato diz "inscrita no CNPJ" |
| `[ESCRITORIO_OAB]` | `oab_sociedade_*` | Ok, mas mora em Marca e timbrado, longe do cartão |
| `[ESCRITORIO_ENDERECO]` | `endereco + cidade + uf` | Sem CEP, número, bairro em partes; hoje "Não informado" no Santana |
| `[CIDADE_DATA]` | `cidade` | Ok |
| Qualificação dos advogados (EX-15) | endereço profissional = o do escritório | Herda o endereço incompleto |
| Petições "com escritório em [ESCRITORIO_ENDERECO], onde recebem intimações" | idem | idem |
| Timbrado do carnê e do recibo | nome, CNPJ, OAB, contatos | Recibo usa `nome` como razão |

Texto do contrato padrão: "CONTRATADA: [ESCRITORIO_NOME], inscrita no CNPJ sob o nº [ESCRITORIO_CNPJ] e registrada na [ESCRITORIO_OAB], com sede em [ESCRITORIO_ENDERECO], por seus advogados, [ADVOGADOS_QUALIFICACAO]."

## Proposta de campos (para o desenho)

Quem é o escritório:
1. Nome no T3jus (o curto, já existe: "Santana").
2. Tipo: sociedade de advogados · sociedade individual de advocacia · advogada ou advogado sem sociedade (sem CNPJ). Muda a frase do contrato.
3. Razão social, como no registro da OAB e no CNPJ (ex.: "Santana Sociedade Individual de Advocacia"). Não aparece no tipo "sem sociedade".
4. CNPJ (já existe).
5. Registro da sociedade na OAB (já existe; passa a ser mudado aqui e Marca e timbrado só mostra, com link).

Onde fica (sede):
6. Endereço em partes: CEP, rua, número (aceita S/N), complemento (opcional), bairro, cidade, UF. Cidade e UF já existem. O `endereco` antigo vira rua e fica com "confira" até alguém salvar.

Como falar com o escritório (nos documentos e no timbrado):
7. Telefone do escritório e e-mail do escritório (opcionais; o e-mail é o "onde recebem intimações"/contato no papel). Site opcional.
8. Contatos (pessoas com quem a equipe T3jus fala) continuam como estão, num bloco à parte.

Ligações sem duplicar:
- Endereço de cobrança (Assinatura): passa a ter "O mesmo da sede" marcado por padrão; só guarda outro se for diferente.
- Endereço profissional do advogado (Sua conta): já aponta para o do escritório; nada muda, só herda o endereço completo.

## Perguntas para a Carol (com recomendação)

1. Quem preenche? Recomendado: a sócia dona preenche e muda no Portal (os outros leem), e a equipe T3jus continua podendo mudar no Console; tudo no histórico. Alternativa: continua só a equipe T3jus.
2. Endereço de cobrança "o mesmo da sede" por padrão? Recomendado: sim.
3. Registro da sociedade na OAB passa para este cartão (e sai de Marca e timbrado como campo)? Recomendado: sim, um lugar só.
4. Advogada ou advogado sem sociedade: o contrato sai com a pessoa como CONTRATADA (qualificação de Sua conta), sem CNPJ? Recomendado: sim.
