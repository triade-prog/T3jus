// E-mails que o próprio sistema manda (os do login saem pelo Supabase Auth, docs/EMAILS.md).
// Saem pela API do Resend, com o segredo RESEND_API_KEY nas funções. Sem o segredo, a função
// segue sem mandar: a ação já foi feita e fica no histórico.

export interface MensagemEmail {
  para: string;
  assunto: string;
  html: string;
  texto: string;
  /** Para onde vai a resposta (o endereço do remetente não recebe). */
  responderPara?: string | null;
  /** Em cópia (a cobrança copia o sócio dono). */
  copia?: string[];
  /** Arquivos anexados, em base64. */
  anexos?: { nome: string; base64: string }[];
}

export interface Emails {
  enviar(m: MensagemEmail): Promise<void>;
}

export const REMETENTE = "T3jus <nao-responda@t3jus.pro>";

export function emailsResend(chave: string, buscar: typeof fetch = fetch): Emails {
  return {
    async enviar(m) {
      const r = await buscar("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${chave}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: REMETENTE, to: [m.para], subject: m.assunto, html: m.html, text: m.texto,
          ...(m.responderPara ? { reply_to: m.responderPara } : {}),
          ...(m.copia?.length ? { cc: m.copia } : {}),
          ...(m.anexos?.length ? { attachments: m.anexos.map((a) => ({ filename: a.nome, content: a.base64 })) } : {}),
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw new Error(`Resend respondeu ${r.status}`);
    },
  };
}

function escapar(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/**
 * Aviso de que o suporte tirou o autenticador (F1.12, PT-23), com o texto do desenho aprovado
 * (docs/design/aprovadas/console-suporte, pergunta 3): "seu autenticador foi tirado pelo
 * suporte; se não foi você, fale com o escritório". Mesmo visual dos e-mails do login.
 */
export function avisoAutenticadorTirado(nome: string): Omit<MensagemEmail, "para"> {
  const primeiro = nome.trim().split(/\s+/)[0] ?? "";
  const ola = primeiro ? `Olá, ${primeiro}.` : "Olá.";
  const corpo = "O suporte do T3jus tirou o autenticador da sua conta, a seu pedido. Por segurança, a conta também saiu de todos os aparelhos. "
    + "Na próxima vez que entrar, cadastre o autenticador de novo.";
  const alerta = "Se não foi você que pediu, fale com o escritório agora.";
  const fonte = "font-family:'Source Sans 3',Arial,Helvetica,sans-serif;";
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>O autenticador da sua conta foi tirado</title>
</head>
<body style="margin:0;padding:0;background:#F2ECE8;">
<div style="display:none;max-height:0;overflow:hidden;">O suporte do T3jus tirou o autenticador da sua conta.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2ECE8;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E6D9D0;border-radius:12px;">
<tr><td style="padding:28px 32px 8px 32px;border-top:4px solid #DD9760;border-radius:12px 12px 0 0;">
<img src="https://t3jus.pro/marca/logo-email.png" width="160" height="56" alt="T3jus" style="display:block;border:0;">
</td></tr>
<tr><td style="padding:16px 32px 0 32px;font-family:Alegreya,Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:#692746;font-weight:700;">O autenticador da sua conta foi tirado</td></tr>
<tr><td style="padding:12px 32px 0 32px;${fonte}font-size:16px;line-height:1.55;color:#2A1A22;">${escapar(ola)} ${corpo}</td></tr>
<tr><td style="padding:16px 32px 0 32px;${fonte}font-size:16px;line-height:1.55;color:#692746;font-weight:600;">${alerta}</td></tr>
<tr><td style="padding:24px 32px 28px 32px;${fonte}font-size:13px;line-height:1.5;color:#5E4A54;border-top:1px solid #F1E6DF;margin-top:16px;">Dúvidas: <a href="mailto:contato@t3jus.pro" style="color:#692746;">contato@t3jus.pro</a></td></tr>
</table>
<p style="margin:16px 0 0 0;${fonte}font-size:12px;color:#5E4A54;">T3jus · Sistema Jurídico · <a href="https://t3jus.pro" style="color:#5E4A54;">t3jus.pro</a><br>Este endereço não recebe respostas.</p>
</td></tr>
</table>
</body>
</html>`;
  const texto = `${ola}\n\n${corpo}\n\n${alerta}\n\nDúvidas: contato@t3jus.pro\n\nT3jus · Sistema Jurídico · t3jus.pro\nEste endereço não recebe respostas.`;
  return { assunto: "O autenticador da sua conta no T3jus foi tirado", html, texto };
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/**
 * A exportação do mês para o contador (F3.50, FI-21), desenho aprovado em
 * docs/design/aprovadas/portal-comercial-financeiro-pendencias (ct-exportar): sai de T3jus em nome
 * do escritório, com a planilha anexada e resposta para quem exportou.
 */
export function exportacaoContador(d: {
  contador: string; escritorio: string; mes: string; quem: string; arquivo: string;
  /** Os comprovantes do mês num .zip, por link que vale 30 dias (F3.89, decisão 9). */
  pasta?: { arquivos: number; ate: string; links: { nome: string; tamanho: number; url: string }[] } | null;
}): Omit<MensagemEmail, "para"> {
  const mes = `${MESES[Number(d.mes.slice(5, 7)) - 1]} de ${d.mes.slice(0, 4)}`;
  const primeiro = d.contador.trim().split(/\s+/)[0] ?? "";
  const ola = primeiro ? `Olá, ${primeiro}.` : "Olá.";
  const corpo = `Segue a exportação do financeiro de ${mes} do escritório ${d.escritorio}, enviada por ${d.quem} pelo T3jus. `
    + `A planilha ${d.arquivo} vai anexada: recebimentos, despesas e o saldo do começo e do fim do mês, com o dinheiro de terceiros numa aba à parte.`;
  const resp = "Para responder, é só responder a este e-mail: a resposta vai para o escritório.";
  const fonte = "font-family:'Source Sans 3',Arial,Helvetica,sans-serif;";
  const titulo = `Financeiro de ${mes} · ${d.escritorio}`;
  const pasta = d.pasta && d.pasta.links.length ? d.pasta : null;
  const ate = pasta ? `${pasta.ate.slice(8, 10)}/${pasta.ate.slice(5, 7)}/${pasta.ate.slice(0, 4)}` : "";
  const mb = (n: number) => `${Math.max(1, Math.round(n / 1048576))} MB`;
  const textoPasta = pasta
    ? `Os comprovantes, notas e guias do mês (${pasta.arquivos === 1 ? "1 arquivo" : `${pasta.arquivos} arquivos`}) estão num .zip${pasta.links.length > 1 ? `, em ${pasta.links.length} partes` : ""}. `
      + `O link vale até ${ate}; depois disso, peça ao escritório para mandar de novo.`
    : "";
  const botoes = pasta
    ? pasta.links.map((l, i) => `<tr><td style="padding:${i ? 8 : 12}px 32px 0 32px;"><a href="${escapar(l.url)}" style="display:inline-block;background:#692746;color:#FFFFFF;${fonte}font-size:15px;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:8px;">Baixar os comprovantes${pasta.links.length > 1 ? ` · parte ${i + 1} de ${pasta.links.length}` : ""} (${mb(l.tamanho)})</a></td></tr>`).join("")
    : "";
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapar(titulo)}</title>
</head>
<body style="margin:0;padding:0;background:#F2ECE8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2ECE8;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E6D9D0;border-radius:12px;">
<tr><td style="padding:28px 32px 8px 32px;border-top:4px solid #DD9760;border-radius:12px 12px 0 0;">
<img src="https://t3jus.pro/marca/logo-email.png" width="160" height="56" alt="T3jus" style="display:block;border:0;">
</td></tr>
<tr><td style="padding:16px 32px 0 32px;font-family:Alegreya,Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:#692746;font-weight:700;">${escapar(titulo)}</td></tr>
<tr><td style="padding:12px 32px 0 32px;${fonte}font-size:16px;line-height:1.55;color:#2A1A22;">${escapar(ola)} ${escapar(corpo)}</td></tr>
${pasta ? `<tr><td style="padding:12px 32px 0 32px;${fonte}font-size:16px;line-height:1.55;color:#2A1A22;">${escapar(textoPasta)}</td></tr>${botoes}` : ""}
<tr><td style="padding:16px 32px 28px 32px;${fonte}font-size:14px;line-height:1.55;color:#5E4A54;">${resp}</td></tr>
</table>
<p style="margin:16px 0 0 0;${fonte}font-size:12px;color:#5E4A54;">T3jus · Sistema Jurídico · <a href="https://t3jus.pro" style="color:#5E4A54;">t3jus.pro</a></p>
</td></tr>
</table>
</body>
</html>`;
  const linksTexto = pasta ? `${textoPasta}\n${pasta.links.map((l, i) => `${pasta.links.length > 1 ? `Parte ${i + 1}: ` : ""}${l.url}`).join("\n")}\n\n` : "";
  const texto = `${ola}\n\n${corpo}\n\n${linksTexto}${resp}\n\nT3jus · Sistema Jurídico · t3jus.pro`;
  return { assunto: titulo, html, texto };
}

/**
 * Resposta automática ao pedido de demonstração do site (F2.2, SC-02; desenho aprovado em
 * docs/design/aprovadas/site-comercial, decisão 9): "recebemos seu pedido", o prazo de 1 dia
 * útil e a cópia do que a pessoa mandou. Mesmo visual dos outros e-mails do sistema.
 */
export function confirmacaoPedidoDemonstracao(p: { nome: string; escritorio: string; email: string; whats: string; tamanho: string; area?: string; msg?: string }): Omit<MensagemEmail, "para"> {
  const primeiro = p.nome.trim().split(/\s+/)[0] ?? "";
  const ola = primeiro ? `Olá, ${primeiro}.` : "Olá.";
  const corpo = "Recebemos o seu pedido de demonstração do T3jus. Respondemos em até 1 dia útil, pelo WhatsApp ou por e-mail, para combinar o melhor horário.";
  const linhas: [string, string][] = [
    ["Escritório", p.escritorio],
    ["E-mail", p.email],
    ["WhatsApp", p.whats],
    ["Pessoas no escritório", p.tamanho],
    ...(p.area ? [["Área principal", p.area] as [string, string]] : []),
    ...(p.msg ? [["Como se organizam hoje", p.msg] as [string, string]] : []),
  ];
  const fonte = "font-family:'Source Sans 3',Arial,Helvetica,sans-serif;";
  const tabela = linhas.map(([k, v]) =>
    `<tr><td style="padding:6px 0;${fonte}font-size:14px;color:#5E4A54;vertical-align:top;width:42%;">${escapar(k)}</td><td style="padding:6px 0;${fonte}font-size:14px;color:#2A1A22;font-weight:600;">${escapar(v)}</td></tr>`).join("");
  const rodape = "Se não foi você que pediu, pode ignorar este e-mail. Para apagar os seus dados, escreva para contato@t3jus.pro.";
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Recebemos o seu pedido de demonstração</title>
</head>
<body style="margin:0;padding:0;background:#F2ECE8;">
<div style="display:none;max-height:0;overflow:hidden;">Respondemos em até 1 dia útil.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2ECE8;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E6D9D0;border-radius:12px;">
<tr><td style="padding:28px 32px 8px 32px;border-top:4px solid #DD9760;border-radius:12px 12px 0 0;">
<img src="https://t3jus.pro/marca/logo-email.png" width="160" height="56" alt="T3jus" style="display:block;border:0;">
</td></tr>
<tr><td style="padding:16px 32px 0 32px;font-family:Alegreya,Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:#692746;font-weight:700;">Recebemos o seu pedido</td></tr>
<tr><td style="padding:12px 32px 0 32px;${fonte}font-size:16px;line-height:1.55;color:#2A1A22;">${escapar(ola)} ${corpo}</td></tr>
<tr><td style="padding:16px 32px 0 32px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #F1E6DF;">${tabela}</table></td></tr>
<tr><td style="padding:24px 32px 28px 32px;${fonte}font-size:13px;line-height:1.5;color:#5E4A54;">${escapar(rodape)}</td></tr>
</table>
<p style="margin:16px 0 0 0;${fonte}font-size:12px;color:#5E4A54;">T3jus · Sistema Jurídico · <a href="https://t3jus.pro" style="color:#5E4A54;">t3jus.pro</a><br>Este endereço não recebe respostas.</p>
</td></tr>
</table>
</body>
</html>`;
  const texto = `${ola}\n\n${corpo}\n\n${linhas.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${rodape}\n\nT3jus · Sistema Jurídico · t3jus.pro\nEste endereço não recebe respostas.`;
  return { assunto: "Recebemos o seu pedido de demonstração do T3jus", html, texto };
}

// ---------------------------------------------------------------------------------------
// Cobrança dos escritórios (CO-06, F1.18): os e-mails da régua, o lembrete manual, o recibo e o
// aviso de cancelamento. Desenho aprovado em docs/design/aprovadas/console-cobranca (Régua):
// curtos e educados, sem ameaça e sem juros; o uso do Portal continua normal. O Pix e o boleto
// de verdade dependem do meio de pagamento, ainda não escolhido: até lá, o e-mail leva ao Portal.

export interface EnvioCobranca {
  tipo: "EMITIDA" | "VENCE_EM_3" | "VENCE_HOJE" | "VENCEU_3" | "VENCEU_7" | "VENCEU_15" | "MANUAL" | "RECIBO" | "CANCELADA";
  escritorio: string;
  socio: string | null;
  fatura: { competencia: string; vencimento: string; totalCentavos: number; pagaEm: string | null; atrasoDias: number | null;
            pixCopiaCola: string | null; linhaBoleto: string | null };
  abertas: { competencia: string; vencimento: string; totalCentavos: number; atrasoDias: number | null }[];
}

const reais = (c: number) => `R$ ${(c / 100).toFixed(2).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
const diaBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const mesDe = (c: string) => `${MESES[Number(c.slice(5, 7)) - 1]} de ${c.slice(0, 4)}`;

export function emailCobranca(e: EnvioCobranca, urlPortal: string, contato: string): Omit<MensagemEmail, "para"> {
  const f = e.fatura;
  const mes = mesDe(f.competencia);
  const mesCurto = MESES[Number(f.competencia.slice(5, 7)) - 1];
  const primeiro = (e.socio ?? "").trim().split(/\s+/)[0] ?? "";
  const ola = primeiro ? `Olá, ${primeiro}.` : "Olá.";
  const valor = reais(f.totalCentavos);
  const venc = diaBr(f.vencimento);
  const comoPagar = f.pixCopiaCola || f.linhaBoleto
    ? "Para pagar, use o Pix ou o boleto da fatura, ou abra o Portal em Escritório › Plano e faturas."
    : "Para ver e pagar, abra o Portal em Escritório › Plano e faturas.";
  const desconsidere = "Se já pagou, desconsidere este e-mail: o boleto leva até 1 dia útil para cair.";
  const normal = "O uso do Portal continua normal.";
  let assunto: string;
  let paragrafos: string[];
  let botao: string | null = "Ver a fatura no Portal";
  switch (e.tipo) {
    case "EMITIDA":
      assunto = `Fatura de ${mesCurto} do T3jus`;
      paragrafos = [`A fatura de ${mes} da ${e.escritorio}, de ${valor}, já está disponível e vence em ${venc}.`, comoPagar];
      break;
    case "VENCE_EM_3":
      assunto = `A fatura de ${mesCurto} do T3jus vence em 3 dias`;
      paragrafos = [`A fatura de ${mes} da ${e.escritorio}, de ${valor}, vence em ${venc}.`, comoPagar];
      break;
    case "VENCE_HOJE":
      assunto = `A fatura de ${mesCurto} do T3jus vence hoje`;
      paragrafos = [`A fatura de ${mes} da ${e.escritorio}, de ${valor}, vence hoje, ${venc}.`, comoPagar];
      break;
    case "VENCEU_3":
    case "VENCEU_7":
    case "VENCEU_15": {
      const dias = f.atrasoDias ?? 0;
      assunto = `Fatura de ${mesCurto} do T3jus em aberto há ${dias} ${dias === 1 ? "dia" : "dias"}`;
      paragrafos = [`A fatura de ${mes} da ${e.escritorio}, de ${valor}, venceu em ${venc} e ainda não consta como paga. ${desconsidere}`,
                    `${comoPagar} ${normal}`];
      break;
    }
    case "MANUAL": {
      const abertas = e.abertas.length ? e.abertas : [{ ...f }];
      const total = abertas.reduce((s, a) => s + a.totalCentavos, 0);
      assunto = abertas.length > 1 ? `Faturas do T3jus em aberto` : `Fatura de ${mesCurto} do T3jus em aberto`;
      paragrafos = [
        abertas.length > 1
          ? `A ${e.escritorio} tem ${abertas.length} faturas do T3jus em aberto, somando ${reais(total)}: `
            + abertas.map((a) => `${mesDe(a.competencia)} (${reais(a.totalCentavos)}, vencimento em ${diaBr(a.vencimento)})`).join("; ") + "."
          : `A fatura de ${mes} da ${e.escritorio}, de ${valor}, com vencimento em ${venc}, está em aberto.`,
        desconsidere, `${comoPagar} ${normal}`];
      break;
    }
    case "RECIBO":
      assunto = `Recebemos o pagamento da fatura de ${mesCurto}`;
      paragrafos = [`Recebemos o pagamento da fatura de ${mes} da ${e.escritorio}, de ${valor}${f.pagaEm ? `, em ${diaBr(f.pagaEm)}` : ""}. Obrigado.`,
                    "O recibo fica no Portal, em Escritório › Plano e faturas."];
      botao = "Ver no Portal";
      break;
    case "CANCELADA":
      assunto = `A fatura de ${mesCurto} do T3jus foi cancelada`;
      paragrafos = [`A fatura de ${mes} da ${e.escritorio}, de ${valor}, foi cancelada. Não há nada a pagar por ela, e o Pix e o boleto dela deixam de valer.`];
      botao = null;
      break;
  }
  const fonte = "font-family:'Source Sans 3',Arial,Helvetica,sans-serif;";
  const link = `${urlPortal}/meu-escritorio`;
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapar(assunto)}</title>
</head>
<body style="margin:0;padding:0;background:#F2ECE8;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2ECE8;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;background:#FFFFFF;border:1px solid #E6D9D0;border-radius:12px;">
<tr><td style="padding:28px 32px 8px 32px;border-top:4px solid #DD9760;border-radius:12px 12px 0 0;">
<img src="https://t3jus.pro/marca/logo-email.png" width="160" height="56" alt="T3jus" style="display:block;border:0;">
</td></tr>
<tr><td style="padding:16px 32px 0 32px;font-family:Alegreya,Georgia,'Times New Roman',serif;font-size:24px;line-height:1.3;color:#692746;font-weight:700;">${escapar(assunto)}</td></tr>
<tr><td style="padding:12px 32px 0 32px;${fonte}font-size:16px;line-height:1.55;color:#2A1A22;">${escapar(ola)}</td></tr>
${paragrafos.map((p) => `<tr><td style="padding:12px 32px 0 32px;${fonte}font-size:16px;line-height:1.55;color:#2A1A22;">${escapar(p)}</td></tr>`).join("\n")}
${botao ? `<tr><td style="padding:20px 32px 0 32px;"><a href="${escapar(link)}" style="display:inline-block;background:#692746;color:#FFFFFF;${fonte}font-size:15px;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:8px;">${escapar(botao)}</a></td></tr>` : ""}
<tr><td style="padding:24px 32px 28px 32px;${fonte}font-size:13px;line-height:1.5;color:#5E4A54;">Dúvidas: <a href="mailto:${escapar(contato)}" style="color:#692746;">${escapar(contato)}</a></td></tr>
</table>
<p style="margin:16px 0 0 0;${fonte}font-size:12px;color:#5E4A54;">T3jus · Sistema Jurídico · <a href="https://t3jus.pro" style="color:#5E4A54;">t3jus.pro</a><br>Este endereço não recebe respostas.</p>
</td></tr>
</table>
</body>
</html>`;
  const texto = `${ola}\n\n${paragrafos.join("\n\n")}${botao ? `\n\n${botao}: ${link}` : ""}\n\nDúvidas: ${contato}\n\nT3jus · Sistema Jurídico · t3jus.pro\nEste endereço não recebe respostas.`;
  return { assunto, html, texto, responderPara: contato };
}
