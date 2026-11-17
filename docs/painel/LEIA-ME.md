# Painel de execução

O painel mostra tudo o que vai ser construído no T3 Just, com o status de cada entrega, teste, item de publicação, dependência externa e decisão, e o histórico. O formato veio do TRÍADE Condo (DC4): os dados ficam em arquivos pequenos, um por registro, e o painel é montado por script. Assim, dois PRs quase nunca mexem no mesmo arquivo.

Nada gerado vai para o Git.

## Onde fica cada coisa

| Arquivo em `docs/painel/dados/` | O que é | Quem mexe |
|---|---|---|
| `fases/<F>/<item>.json` | Um item, por exemplo `fases/F0/F0.3.json`. Tem os campos `id`, `texto`, `peca`, `refs`, `status`, `nota`, `evidencia`, `ordem` e, se houver, `proximo` | A frente da entrega |
| `fases/<F>/fase.json` | O nome, o objetivo e a ordem da fase | Raramente |
| `historico/AAAA-MM-DD-HHMM-nome.json` | Uma linha do histórico. A data e a hora no nome são as do início | Cada entrega cria uma linha nova |
| `historico/legado.json` | Vazio; existe porque o script o espera | Ninguém |
| `testes/`, `externos/`, `decisoes/`, `publicacao/<grupo>/` | Um arquivo por registro, com `ordem` | Quem muda o registro |
| `situacao.json` | O resumo geral ("Agora") | Só nos marcos |
| `meta.json` | `fase_atual` e `fora_do_software` | Raramente |

O script calcula o resto sozinho:
- a data de atualização é a da linha mais nova do histórico;
- o total e os códigos das ideias saem das tabelas das seções numeradas do `IDEIAS.md`.

As peças (`peca`) são: S1 Painel do dia, S2 Atendimento e propostas, S3 Contratos e honorários, S4 Financeiro e repasses, S5 Casos, tarefas e prazos, S6 Documentos, S7 Configurações; C1 Carteira de escritórios, C2 Implantação, C3 Equipe interna, C4 Comercial; W1 Site comercial; B1 Segurança e acesso, B2 Dados e histórico, B3 Motor de mensagens, B4 Infraestrutura e qualidade, B5 Princípios do produto. A lista fica no `PECAS` da `pagina.html`.

## A cada entrega, no mesmo commit do código

1. **O item.** Mude o arquivo do seu item:
   - `status` pode ser `pendente`, `andamento`, `feito` ou `bloqueado`;
   - em `feito`, preencha `evidencia`;
   - em `bloqueado`, preencha `nota` com o motivo;
   - `refs` leva os códigos das ideias que o item atende.

   Entrega que atende só parte de uma ideia não a cita como atendida sem um item `pendente` com o resto, que também cita a ideia.
2. **Item novo.** Crie `fases/<F>/<id>.json`. O nome do arquivo é o id. Use um `ordem` maior que o último da fase, ou um número entre dois itens.
3. **Próximo passo.** Ponha o que falta no campo `proximo` do próprio item. A frase aparece em "Próximos passos", na Situação. Quando a pendência acabar, **apague o campo**.
4. **Histórico.** Crie a linha com o comando abaixo. Ele usa a data de hoje em Brasília quando `--data` fica de fora.
   ```
   python3 docs/painel/painel.py novo-historico --inicio 10:05 --fim 10:31 \
       --refs F1.2 PT-20 --texto "O que foi entregue, em uma frase."
   ```
5. **Conferência.** Rode antes do commit (o CI também roda):
   ```
   python3 docs/painel/painel.py conferir
   ```
   O commit só sai com 0 erro. Os avisos são para ler.

## Ver o painel

O painel publicado fica em https://claude.ai/artifact/S3Xf82PijknQxUqaEbx4si. Para republicar, monte a partir do main e publique no mesmo link.

```
python3 docs/painel/painel.py montar /tmp/painel
```

O comando roda o `conferir` antes e gera:
- `painel-execucao.html`, o painel inteiro num arquivo só, para abrir no computador;
- `index.html` e `dados/*.json`, as partes para publicar como artifact. Ao publicar, passe o `index.html` como página e a pasta de saída como `root`; nas vezes seguintes, só as partes que mudaram.
