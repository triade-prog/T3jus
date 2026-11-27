# Os e-mails do teste à sócia dona (CO-09, D42): dia 1, dia 5, dia 7 e dia 8.
# Mesmo visual e mesma estrutura dos e-mails do sistema (sistema/supabase/functions/_shared/email.ts, avisoFimContrato):
# folha branca de 520 px, filete âmbar, logo, título em serifa vinho, "Olá, {primeiro nome}.", parágrafos, um botão vinho,
# contato e o rodapé "Este endereço não recebe respostas". A página mostra antes o envelope (de, para, assunto, quando).
# Uso: python3 emails_tg.py <pasta-saida>
import sys, os, html, json
SAIDA = sys.argv[1] if len(sys.argv) > 1 else '..'
E = html.escape
FONTE = "font-family:'Source Sans 3',Arial,Helvetica,sans-serif;"
PORTAL = 'https://portal.t3jus.pro'
CONTATO = 'atendimento@exemplo.com.br'
ESC = 'Ribeiro & Matos Advocacia'

EMAILS = [
    dict(nome='dia1', quando='Sexta-feira, 27/11/2026, 23h40 · no primeiro acesso', passo='TESTE_COMECOU',
         assunto='Seu teste grátis do T3jus vai até quinta-feira, 03/12', previa='Sete dias, contando hoje.',
         titulo='Boas-vindas ao T3jus',
         pars=[f'O teste grátis da {ESC} começou hoje, no seu primeiro acesso. Ele vai até quinta-feira, 03/12: 7 dias, contando hoje.',
               'Nesses dias, a equipe do escritório usa o Portal inteiro, e nada é cobrado. Rafael Teles, da implantação do T3jus, acompanha vocês.',
               'Para continuar depois do teste, aperte Quero assinar no Portal ou fale com a equipe do T3jus pelo contato abaixo.'],
         botao='Abrir o Portal', link='/inicio'),
    dict(nome='dia5', quando='Terça-feira, 01/12/2026, 8h · dia 5', passo='TESTE_ACABANDO',
         assunto='Faltam 3 dias para o fim do seu teste no T3jus', previa='O teste vai até quinta-feira, 03/12.',
         titulo='Seu teste vai até quinta-feira, 03/12',
         pars=[f'O teste grátis da {ESC} vai até quinta-feira, 03/12. Para continuar usando o T3jus depois disso, aperte Quero assinar no Portal ou fale com a equipe do T3jus.',
               'Nada é cobrado durante o teste. Com a assinatura, a primeira fatura é a de janeiro de 2027.',
               'Se não assinar, nada é apagado: a partir de 04/12, o Portal fica só para consulta, e você continua vendo e baixando os dados do escritório.'],
         botao='Quero assinar', link='/escritorio#plano'),
    dict(nome='dia7', quando='Quinta-feira, 03/12/2026, 8h · dia 7', passo='TESTE_ULTIMO_DIA',
         assunto='Hoje é o último dia do seu teste no T3jus', previa='Amanhã, o Portal fica só para consulta até a assinatura.',
         titulo='Hoje é o último dia do seu teste',
         pars=[f'Hoje, quinta-feira, 03/12, é o último dia do teste grátis da {ESC}. A partir de amanhã, 04/12, à 0h, o Portal fica só para consulta até a assinatura.',
               'Para a equipe continuar trabalhando sem parar, aperte Quero assinar no Portal ainda hoje.',
               'Nada é apagado. Se já pediu para assinar, pode desconsiderar este e-mail: a equipe do T3jus fala com você.'],
         botao='Quero assinar', link='/escritorio#plano'),
    dict(nome='dia8', quando='Sexta-feira, 04/12/2026, 8h · dia 8', passo='TESTE_ACABOU',
         assunto='O teste do T3jus terminou. Seus dados estão guardados', previa='O Portal está só para consulta.',
         titulo='O teste terminou. Seus dados estão guardados',
         pars=[f'O teste grátis da {ESC} terminou em 03/12. Desde hoje, o Portal está só para consulta: a equipe vê tudo, mas ninguém cria nem muda nada.',
               'Você continua baixando os dados do escritório no Portal, em Escritório › Exportar os dados.',
               'Para voltar a usar tudo, aperte Quero assinar no Portal. Quando a equipe do T3jus confirmar a assinatura, tudo volta na hora.'],
         botao='Quero assinar', link='/escritorio#plano'),
]


def corpo(e):
    pars = '\n'.join(f'<tr><td style="padding:12px 32px 0 32px;{FONTE}font-size:16px;line-height:1.55;color:#2A1A22;">{E(p)}</td></tr>' for p in e['pars'])
    return f'''<div style="display:none;max-height:0;overflow:hidden;">{E(e['previa'])}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2ECE8;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E6D9D0;border-radius:12px;">
<tr><td style="padding:28px 32px 8px 32px;border-top:4px solid #DD9760;border-radius:12px 12px 0 0;">
<svg width="160" height="54" viewBox="0 0 1372 463" role="img" aria-label="T3jus" style="display:block"><use href="#pd-logo"/></svg>
</td></tr>
<tr><td style="padding:16px 32px 0 32px;font-family:Alegreya,Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:#692746;font-weight:700;">{E(e['titulo'])}</td></tr>
<tr><td style="padding:12px 32px 0 32px;{FONTE}font-size:16px;line-height:1.55;color:#2A1A22;">Olá, Marina.</td></tr>
{pars}
<tr><td style="padding:20px 32px 0 32px;"><a href="{PORTAL}{e['link']}" style="display:inline-block;background:#692746;color:#FFFFFF;{FONTE}font-size:15px;font-weight:600;text-decoration:none;padding:13px 20px;border-radius:8px;min-height:44px;box-sizing:border-box;">{E(e['botao'])}</a></td></tr>
<tr><td style="padding:24px 32px 28px 32px;{FONTE}font-size:13px;line-height:1.5;color:#5E4A54;">Dúvidas ou para assinar: <a href="mailto:{CONTATO}" style="color:#692746;">{CONTATO}</a></td></tr>
</table>
<p style="margin:16px 0 0 0;{FONTE}font-size:12px;color:#5E4A54;">T3jus · Sistema Jurídico · <a href="https://t3jus.pro" style="color:#5E4A54;">t3jus.pro</a><br>Este endereço não recebe respostas.</p>
</td></tr></table>'''


def envelope(e, i):
    return (f'<section class="env" aria-label="Envelope do e-mail"><p class="sobre">E-mail {i} de 4 · {E(e["passo"])}</p><h1>{E(e["assunto"])}</h1>'
            f'<dl><div><dt>De</dt><dd>T3jus &lt;nao-responda@t3jus.pro&gt;</dd></div><div><dt>Para</dt><dd>Marina Ribeiro &lt;marina@ribeiromatos.exemplo.com.br&gt;, a sócia dona</dd></div>'
            f'<div><dt>Responder para</dt><dd>{CONTATO}</dd></div><div><dt>Quando</dt><dd>{E(e["quando"])}</dd></div></dl>'
            '<p class="nota">O mesmo texto vai no sino do Portal. Um passo que perde o dia dele não sai depois.</p>'
            '<nav aria-label="Os 4 e-mails">' + ''.join(f'<a href="?estado={x["nome"]}"{" aria-current=\"page\"" if x is e else ""}>{["Dia 1", "Dia 5", "Dia 7", "Dia 8"][j]}</a>' for j, x in enumerate(EMAILS))
            + '</nav></section>')


# O logo vem do símbolo de marca aprovado (o mesmo símbolo dos e-mails, em vetor para o desenho).
INI = open(os.environ.get('APROV', '/home/user/t3jus/docs/design/aprovadas/') + 'portal-inicio-audiencias/inicio.html', encoding='utf-8').read()
i = INI.index('<symbol id="pd-logo"')
LOGO = INI[i:INI.index('</symbol>', i) + 9].replace('#F1E6DF', '#692746')  # sobre fundo claro: letras em vinho (IDENTIDADE.md)

TPL = ''.join(f'<template data-est="{e["nome"]}">{envelope(e, n)}<div class="email">{corpo(e)}</div></template>\n' for n, e in enumerate(EMAILS, 1))
PAG = f'''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>E-mails do teste grátis · T3jus</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@500;700&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*{{box-sizing:border-box}} body{{margin:0;background:#F2ECE8;color:#2A1A22;font:14px/1.57 Poppins,"Segoe UI",system-ui,sans-serif}}
.env{{max-width:584px;margin:32px auto 0;padding:20px 24px;background:#692746;color:#fff;border-radius:12px}}
.env .sobre{{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#E9AE90;margin:0 0 4px}}
.env h1{{font-family:Alegreya,Georgia,serif;font-weight:500;font-size:26px;line-height:1.2;margin:0}}
.env dl{{margin:12px 0 0;display:grid;gap:4px}} .env dl div{{display:grid;grid-template-columns:118px minmax(0,1fr);gap:8px;font-size:13px}}
.env dt{{color:#F2CDB3}} .env dd{{margin:0;overflow-wrap:anywhere}}
.env .nota{{font-size:12px;color:#F2CDB3;margin:10px 0 0}}
.env nav{{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}}
.env nav a{{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border-radius:22px;background:#87335B;color:#fff;text-decoration:none;font-weight:500}}
.env nav a[aria-current]{{background:#F2CDB3;color:#4F1D35}}
a:focus-visible{{outline:3px solid #AC3F6B;outline-offset:2px;border-radius:6px}} .env a:focus-visible{{outline-color:#F2CDB3}}
@media (max-width:620px){{.env{{margin:0;border-radius:0;padding:16px}} .env dl div{{grid-template-columns:1fr;gap:0}}}}
</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" style="display:none" aria-hidden="true">{LOGO}</svg>
<main id="m"></main>
{TPL}
<script>(function(){{var q=new URLSearchParams(location.search).get('estado')||'dia1';var t=document.querySelector('template[data-est="'+q+'"]')||document.querySelector('template[data-est]');
document.getElementById('m').appendChild(t.content.cloneNode(true));}})();</script>
</body></html>'''
open(os.path.join(SAIDA, 'emails.html'), 'w', encoding='utf-8').write(PAG)
json.dump([{k: e[k] for k in ('nome', 'assunto', 'quando')} for e in EMAILS], open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'emails_tg.json'), 'w'), ensure_ascii=False, indent=1)
print('emails ok', len(EMAILS))
