# Lista dos estados (capturas), o index.html e o index-publicar.html (imagens embutidas) das pendências
# do Comercial e do Financeiro. Uso: python3 casos.py <pasta-saida> [--publicar]
import json, html, sys, os, base64
SAIDA = sys.argv[1] if len(sys.argv) > 1 else 'saida'
PUBLICAR = '--publicar' in sys.argv
CM, CL, FI, ES, RE = 'comercial.html?estado=', 'clientes.html?estado=', 'financeiro.html?estado=', 'escritorio.html?estado=', 'relatorios.html?estado='

SECOES = [
    ('1. Por que não recebeu proposta', 'F3.8 · AP-03. O banco já guarda o motivo e o Funil já conta. Falta onde marcar e como desfazer: “Encerrar sem proposta” no cartão do Funil, em Atendimentos (“Sem próximo contato”) e na ficha do cliente. Dois motivos só, como o Funil conta. Quem saiu fica numa lista com “Voltar ao funil”. O bloco “Quanto vira contrato” já vem na forma que a Carol escolheu em 21/11 (três números e uma barra).', [
        ('fu-funil', CM + 'fu-funil', 'Funil com o botão no cartão', 'Marina, sócia dona. “Quanto vira contrato” na forma escolhida pela Carol em 21/11: três números (24, 14, 9) e uma barra de onde as 24 pessoas pararam, com quem saiu sem proposta e por quê; “marcar o motivo” leva aos cartões. Em “Primeiro contato”, cada cartão tem “Encerrar sem proposta”. Embaixo, a folha nova “Saíram sem proposta”, com o motivo, quem marcou, a anotação e “Voltar ao funil”.'),
        ('fu-marcar', CM + 'fu-marcar', 'A janela de encerrar', 'Eduardo Nascimento, atendido em 04/11, sem próximo contato. Dois motivos (o escritório não pegou o caso; o cliente não voltou) e uma anotação opcional. A janela diz o que muda no Funil e que a ficha continua ativa.'),
        ('fu-erros', CM + 'fu-erros', 'Erro de campo', 'Nenhum motivo escolhido: resumo no topo e o erro preso ao grupo de opções. O botão nunca fica desabilitado.'),
        ('fu-falha', CM + 'fu-falha', 'Falha do servidor', 'Nada foi salvo, Eduardo continua em “Primeiro contato”, o que se escolheu continua na janela, e há o código para o suporte.'),
        ('fu-marcado', CM + 'fu-marcado', 'Marcado', 'Aviso com “Desfazer”. Na barra e na legenda, as saídas passam a 5, 4 e 1. Eduardo sai da coluna e entra no alto de “Saíram sem proposta”, com o selo “Novo”.'),
        ('fu-voltar', CM + 'fu-voltar', 'Voltar ao funil', 'A janela curta de desfazer: ele volta para “Primeiro contato” e o motivo marcado fica no histórico.'),
        ('fu-vazio', CM + 'fu-vazio', 'Ninguém sem proposta', 'Todo primeiro contato do período recebeu proposta: 14, 14 e 9, a barra só com quem recebeu proposta e “Ninguém no período” em “Saíram sem proposta”. A coluna “Primeiro contato” e a folha “Saíram sem proposta” vazias.'),
        ('fu-atendimentos', CM + 'fu-atendimentos', 'Em Atendimentos', 'O mesmo botão no grupo aprovado “Sem próximo contato”, onde Eduardo já aparecia. Abre a mesma janela.'),
        ('fu-ficha-aberta', CL + 'fu-ficha-aberta', 'Na ficha do cliente', 'Aba Atendimentos da ficha de Eduardo. Ao lado, a folha nova “No funil do Comercial”, com a situação e “Encerrar sem proposta”.'),
        ('fu-ficha', CL + 'fu-ficha', 'Ficha depois de marcar', 'No âmbar, “Fora do funil: não voltou”. A marcação entra no histórico de atendimento, com a anotação. A folha mostra quem marcou e quando, e “Voltar ao funil”.'),
        ('fu-ficha-larissa', CL + 'fu-ficha-larissa', 'Sem a área Comercial (Larissa)', 'A ficha aprovada para quem não tem Comercial: sem histórico, sem funil, sem botão, com o aviso de quem libera.'),
    ]),
    ('2. Quem cuida do repasse', 'F3.71 · PD-06, PD-07. A rota que troca já existe. Na ficha do repasse, a folha “Quem cuida deste repasse” mostra o responsável e de onde ele veio (o responsável pelo contrato), com “Trocar o responsável”. A troca vale para o repasse inteiro, avisa quem entra e fica no histórico.', [
        ('rp-ficha', FI + 'rp-ficha', 'Ficha do repasse com o responsável', 'Irene Castro, RPV de 12/11. Bianca Torres cuida (era de Marina, a do contrato, e passou para Bianca em 13/11). O responsável aparece também no cabeçalho, e a troca de 13/11 está no histórico.'),
        ('rp-trocar', FI + 'rp-trocar', 'Trocar o responsável', 'Só aparece quem tem a área Financeiro. “Responsável agora” marca Bianca. Motivo opcional, que vai no histórico e no aviso. A janela diz quem passa a receber os avisos.'),
        ('rp-trocar-erro', FI + 'rp-trocar-erro', 'Erro de campo', 'Diego perdeu a área Financeiro enquanto a janela estava aberta: resumo no topo, erro preso ao grupo, foco na opção.'),
        ('rp-trocar-falha', FI + 'rp-trocar-falha', 'Falha do servidor', 'Nada foi salvo, Bianca continua responsável, a escolha continua na janela e há o código para o suporte.'),
        ('rp-trocado', FI + 'rp-trocado', 'Trocado', 'Diego cuida agora. Aviso de sucesso, cabeçalho e folha atualizados e a linha nova no histórico, com o motivo.'),
    ]),
    ('3. Prazo e atraso do repasse', 'F3.46 · FI-05. O prazo sai de Escritório › Ajustes do financeiro (padrão 3 dias úteis). Passou do prazo, a parte fica “Atrasado · era 17/11” até ser feita, e quem cuida anota o motivo e a próxima ação, como na cobrança das parcelas.', [
        ('pz-repasses', FI + 'pz-repasses', 'Repasses com atrasos e quem cuida', 'Os blocos aprovados ganham “Cuida: …”, o filtro por responsável e o número “Atrasados”. Gabriela: atrasado, com motivo e próxima ação. Perito de Irene: atrasado sem motivo, com “Anotar o atraso”. Embaixo, a folha nova “A caminho” (item 4).'),
        ('pz-ficha', FI + 'pz-ficha', 'Ficha vista por Bianca', 'A ficha do repasse aberta por Bianca Torres, que cuida dele: a linha do perito em vinho-3, “Sem motivo anotado” e “Anotar o atraso”.'),
        ('pz-anotar', FI + 'pz-anotar', 'Anotar o atraso', 'Motivo (quatro opções curtas e o texto), a próxima ação (quando, com quem, o que fazer). A janela diz que o prazo não muda e que o sino lembra no dia.'),
        ('pz-anotar-erros', FI + 'pz-anotar-erros', 'Erros de campo', 'Data da próxima ação antes de hoje e “O que fazer” em branco: resumo no topo, cada erro preso ao campo, foco no primeiro.'),
        ('pz-anotar-falha', FI + 'pz-anotar-falha', 'Falha do servidor', 'Nada foi salvo, o texto continua na janela, código para o suporte.'),
        ('pz-anotado', FI + 'pz-anotado', 'Anotado', 'A linha do perito mostra o motivo e a próxima ação, com “Mudar a anotação”; o histórico ganha a linha nova.'),
    ]),
    ('4. RPV e precatório a caminho', 'F3.48 · FI-09 e F3.72 · IN-05. Registrar o expedido antes do dinheiro entrar: tipo, caso, tribunal, quem paga, valor requisitado e data estimada. A parte do escritório, pelo contrato, vai à previsão do Caixa em âmbar e ao Falta receber dos Relatórios, à parte. Quando entra, vira levantamento em Repasses.', [
        ('rv-caminho', FI + 'rv-caminho', 'A folha “A caminho” em Repasses', 'Três requisições: Irene (passou da data estimada, fora da previsão), Eduardo (janeiro de 2027) e Hélio (precatório, até dezembro de 2027). Cada uma com “Mudar a data” e “Entrou na conta”. O botão “Registrar RPV expedido” fica também no alto da página.'),
        ('rv-registrar', FI + 'rv-registrar', 'Registrar o expedido', 'RPV municipal da Construtora Vale Alto contra a Prefeitura de Santo André. A data estimada vem sugerida pelo tipo. A parte do escritório (20% de êxito, R$ 3.680,00) sai do contrato, e a janela diz onde ela entra.'),
        ('rv-registrar-erros', FI + 'rv-registrar-erros', 'Erros de campo', 'Valor requisitado em branco e data estimada antes da expedição: resumo, erros presos aos campos, a parte do escritório em “—” até ter valor.'),
        ('rv-registrar-falha', FI + 'rv-registrar-falha', 'Falha do servidor', 'Nada foi salvo e a previsão do Caixa não mudou; o preenchido continua; código para o suporte.'),
        ('rv-registrado', FI + 'rv-registrado', 'Registrado', 'Aviso de sucesso e a Construtora Vale Alto na folha, com o selo “Novo”. O número “A caminho” sobe para R$ 31.730,00.'),
        ('rv-data', FI + 'rv-data', 'Mudar a data estimada', 'Irene passou da data: “Ainda vai entrar” com a nova data, ou “Não vai entrar”, que tira da previsão. Motivo obrigatório; a data anterior fica no histórico.'),
        ('rv-entrou', FI + 'rv-entrou', 'Entrou na conta', 'A janela aprovada de registrar o levantamento, já preenchida pelo RPV a caminho: o valor que entrou (corrigido), a divisão do contrato e o aviso de que ele sai de “A caminho” e da previsão.'),
        ('rv-vazio', FI + 'rv-vazio', 'Nada a caminho', 'A folha vazia explica para que serve e oferece “Registrar expedido”.'),
        ('rv-caixa', FI + 'rv-caixa', 'No Caixa', 'A previsão aprovada com o RPV em âmbar em janeiro. O RPV de Irene, que passou da data, sai da previsão com um aviso e “Mudar a data”. A folha “RPVs e precatórios a caminho” leva a Repasses.'),
        ('re-visao', RE + 're-visao', 'Nos Relatórios do sócio', 'Falta receber · à parte, agora em dois grupos: “Já entrou, falta transferir” (Benedito) e “A caminho, com data estimada” (Eduardo, Irene marcada como passou da data, Hélio). O número do campo vinho diz as duas partes.'),
    ]),
    ('5. Contador e saldo de abertura', 'F3.50 · FI-21, FI-09. Em Escritório, uma seção nova, “Ajustes do financeiro”, com o contador, o saldo de abertura do caixa, o prazo para repassar e a meta. No Caixa, o saldo diz de onde começa e a exportação vai por e-mail ao contador, com os comprovantes num .zip.', [
        ('es-ajustes', ES + 'es-ajustes', 'Ajustes do financeiro', 'Marina, sócia dona. Contador (Paulo Serra, Contabilidade Silva), envio por e-mail e lembrete no dia 5; saldo de abertura de R$ 12.480,00 em 31/08 com “Corrigir”; prazo para repassar; a meta, com o caminho para o Resumo. Ao lado, onde isso aparece e o histórico.'),
        ('es-vazio', ES + 'es-vazio', 'Primeiro uso', 'Nada cadastrado: aviso do que falta, os campos do contador e do saldo de abertura (data e valor), o prazo padrão de 3 dias úteis e a meta vazia.'),
        ('es-erros', ES + 'es-erros', 'Erros de campo', 'E-mail incompleto e prazo zero: resumo no topo, erros presos aos campos.'),
        ('es-falha', ES + 'es-falha', 'Falha do servidor', 'Nada foi salvo, o que se mudou continua na tela, código para o suporte.'),
        ('es-salvo', ES + 'es-salvo', 'Salvo', 'O prazo passou para 2 dias úteis: aviso, linha nova no histórico, vale para o que entrar a partir de agora.'),
        ('es-abertura', ES + 'es-abertura', 'Corrigir o saldo de abertura', 'Data, saldo certo e motivo obrigatório. A janela diz quanto muda o saldo de hoje e a previsão, e que as exportações já enviadas não mudam.'),
        ('es-equipe', ES + 'es-equipe', 'Quem tem Financeiro e não é dona (Bianca)', 'Só leitura, com o aviso de quem muda.'),
        ('es-sem-area', ES + 'es-sem-area', 'Sem a área Financeiro (Larissa)', 'A barra do Escritório não mostra a seção; o link direto explica e leva aos dados do escritório.'),
        ('ct-caixa', FI + 'ct-caixa', 'Caixa com saldo de abertura e contador', 'O saldo do escritório diz que começa no saldo de abertura, com o caminho para Escritório. “Para o contador” mostra o envio por e-mail de outubro, entregue, e o lembrete de dezembro.'),
        ('ct-exportar', FI + 'ct-exportar', 'Exportar e mandar ao contador', 'A janela aprovada ganha os comprovantes num .zip, o saldo do começo e do fim do mês, e “Mandar por e-mail a Paulo Serra”: a planilha vai anexada e o .zip vai por link de 30 dias.'),
        ('ct-exportar-falha', FI + 'ct-exportar-falha', 'O e-mail não saiu', 'Falha parcial: o arquivo foi gerado e baixado, só o envio falhou. “Mandar de novo” e o código para o suporte.'),
        ('ct-enviado', FI + 'ct-enviado', 'Enviado', 'Aviso de sucesso; “Para o contador” mostra o envio de hoje, entregue.'),
        ('ct-sem-contador', FI + 'ct-sem-contador', 'Sem contador cadastrado', 'A exportação só baixa; a janela e a folha levam a cadastrar o contador.'),
        ('ct-sem-abertura', FI + 'ct-sem-abertura', 'Sem saldo de abertura', 'O saldo do escritório começa em R$ 0,00: aviso no campo vinho e “Lançar o saldo de abertura”.'),
    ]),
    ('6. Meta do mês', 'F3.49 · IN-09. A sócia dona define a meta de receita: todo mês a partir de um mês, ou só em um mês. No Resumo, “Previsto e realizado” compara com a meta, ao lado da comparação aprovada com os meses anteriores, com um traço da meta em cada mês.', [
        ('mt-resumo', FI + 'mt-resumo', 'Resumo com a meta', 'A folha “Previsto e realizado” sobe para o alto da coluna e ganha “Meta de novembro: R$ 50.000,00”, com a barra (recebido, previsto e o traço da meta) e quanto falta. Nos meses anteriores, o traço e “bateu” ou a porcentagem; agosto não tinha meta.'),
        ('mt-definir', FI + 'mt-definir', 'Mudar a meta (todo mês)', 'Valor e “Vale para”: todo mês a partir de novembro substitui a de R$ 45.000,00 sem mexer em setembro e outubro. Para comparar, a média dos 3 meses e o previsto. Dezembro, que tem meta só dele, continua.'),
        ('mt-um-mes', FI + 'mt-um-mes', 'Meta de um mês só', '“Só em um mês” abre a escolha do mês: dezembro, R$ 40.000,00, por causa do recesso.'),
        ('mt-erros', FI + 'mt-erros', 'Erros de campo', 'Valor zero e mês que já fechou: resumo e erros presos aos campos.'),
        ('mt-falha', FI + 'mt-falha', 'Falha do servidor', 'Nada foi salvo, novembro continua com a meta de antes, código para o suporte.'),
        ('mt-sem-meta', FI + 'mt-sem-meta', 'Sem meta', 'A faixa tracejada diz o que a meta faz e oferece “Definir a meta”. A comparação com os meses anteriores fica como a aprovada.'),
        ('mt-equipe', FI + 'mt-equipe', 'Quem tem Financeiro e não é dona (Bianca)', 'Vê a meta e a comparação, sem botão: “Definida por Marina Ribeiro, a sócia dona”.'),
        ('fi-sem-area', FI + 'fi-sem-area', 'Sem a área Financeiro (Larissa)', 'O menu não mostra o Financeiro; o link direto para uma destas telas explica e leva ao Início.'),
    ]),
]

casos = [{'nome': it[0], 'url': it[1]} for _, _, itens in SECOES for it in itens]
json.dump(casos, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'casos.json'), 'w'), ensure_ascii=False, indent=1)

h = lambda s: html.escape(s, quote=True)


def img(nome, tam):
    if not PUBLICAR:
        return f'{nome}-{tam}.webp'
    # Para caber no limite da página publicada, a captura embutida vai reduzida (1200 de largura, qualidade 70).
    from PIL import Image
    import io
    im = Image.open(os.path.join(SAIDA, f'{nome}-{tam}.webp'))
    if im.width > 1200:
        im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=70, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode()


def montar(publicar=False):
    corpo = ''
    for n, (titulo, sub, itens) in enumerate(SECOES, 1):
        corpo += f'<section id="s{n}" aria-labelledby="s{n}-t"><h2 id="s{n}-t">{h(titulo)}</h2><p class="sub">{h(sub)}</p>'
        for nome, url, t, leg in itens:
            tams = ['computador'] if publicar else ['computador', 'celular']
            figs = ''
            for tam in tams:
                src = img(nome, tam)
                alvo = f'<a href="{h(url)}">' if not publicar else ''
                fim = '</a>' if not publicar else ''
                figs += (f'<figure class="{"pc" if tam == "computador" else "cel"}">{alvo}<img src="{src}" alt="{h(t)}, {tam}." loading="lazy" width="{1440 if tam == "computador" else 412}">{fim}'
                         f'<figcaption>{"Computador · 1440" if tam == "computador" else "Celular · 412"}</figcaption></figure>')
            ab = (f'<p class="abrir">Na pasta: <code>{h(url)}</code> e a captura de celular <code>{nome}-celular.webp</code></p>' if publicar else
                  f'<p class="abrir">Abrir: <a href="{h(url)}">{h(url)}</a> (estreite a janela para ver o celular)</p>')
            corpo += (f'<article class="{"um" if publicar else ""}">{figs}<div class="leg"><p class="est">{nome}</p><h3>{h(t)}</h3><p>{h(leg)}</p>{ab}</div></article>')
        corpo += '</section>'
    ir = ''.join(f'<a href="#s{n}">{h(t.split(". ", 1)[1])}</a>' for n, (t, _, _) in enumerate(SECOES, 1))
    extra = ('<p>Nesta página, só as capturas de computador vão embutidas. As de celular (412) e os HTML de cada estado estão na pasta do desenho.</p>' if publicar else
             '<p>Cada estado tem computador (1440) e celular (412). Clique numa imagem para abrir o HTML naquele estado.</p>')
    return f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Comercial e Financeiro: pendências</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500&family=Poppins:wght@400;500&display=swap" rel="stylesheet">
<style>
:root{{--vinho:#692746;--sal:#F1E6DF;--tinta:#2A1A22;--tinta-2:#6E5562;--papel:#fff}}
*{{box-sizing:border-box}} body{{margin:0;background:var(--sal);color:var(--tinta);font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
header{{background:var(--vinho);color:#fff;padding:40px 48px 32px}} header p{{margin:6px 0 0;color:#F2CDB3;max-width:95ch}}
h1,h2,h3{{font-family:Alegreya,Georgia,serif;font-weight:500;margin:0}} h1{{font-size:40px;line-height:1.1}} h2{{font-size:30px;color:var(--vinho)}} h3{{font-size:20px;color:var(--vinho)}}
.sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90!important;margin:0 0 6px!important}}
nav.ir{{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}} nav.ir a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:#87335B;color:#fff;text-decoration:none;font-weight:500}}
main{{padding:24px 48px 64px;max-width:1700px}} section{{margin-top:40px}} .sub{{margin:2px 0 16px;color:var(--tinta-2);max-width:110ch}}
article{{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(220px,1.1fr);gap:20px;align-items:start;background:var(--papel);border-radius:14px;padding:20px;margin-bottom:16px}}
article.um{{grid-template-columns:minmax(0,3fr) minmax(240px,1.2fr)}}
figure{{margin:0}} img{{display:block;width:100%;height:auto;border-radius:8px;border:1px solid var(--sal)}}
figcaption{{font-size:12px;color:var(--tinta-2);margin-top:6px}} .leg p{{margin:6px 0 0}} .abrir{{font-size:12px;overflow-wrap:anywhere;color:var(--tinta-2)}} .abrir a{{color:var(--vinho);font-weight:500}}
.est{{font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#87335B;margin:0 0 4px!important}}
code{{font-size:12px;background:var(--sal);padding:1px 5px;border-radius:4px}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} header a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:900px){{header,main{{padding-left:16px;padding-right:16px}} article,article.um{{grid-template-columns:1fr}} .cel{{max-width:260px}} h1{{font-size:32px}}}}
</style></head><body>
<header><p class="sobre">T3jus · Portal do advogado · para aprovação da Carol</p><h1>Comercial e Financeiro: seis pendências</h1>
<p>Telas para seis itens do painel que precisam de desenho antes do código: por que o primeiro contato não recebeu proposta (F3.8), quem cuida do repasse (F3.71), prazo e atraso do repasse (F3.46), RPV e precatório a caminho (F3.48 e F3.72), contador e saldo de abertura (F3.50) e a meta do mês (F3.49). Base: as telas aprovadas do Comercial, Clientes, Financeiro, Relatórios e Escritório, com o mesmo elenco e o mesmo dia (quarta, 18/11/2026). Dados fictícios.</p>
<p>{extra[3:-4]} As decisões, o que muda no servidor e as perguntas estão em NOTAS.md.</p>
<nav class="ir" aria-label="Ir para">{ir}</nav></header>
<main>{corpo}</main></body></html>
'''


open(os.path.join(SAIDA, 'index.html'), 'w', encoding='utf-8').write(montar(False))
if PUBLICAR:
    open(os.path.join(SAIDA, 'index-publicar.html'), 'w', encoding='utf-8').write(montar(True))
print(len(casos), 'casos')
