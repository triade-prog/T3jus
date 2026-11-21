// E-mails que o próprio sistema manda (os do login saem pelo Supabase Auth, docs/EMAILS.md).
// Saem pela API do Resend, com o segredo RESEND_API_KEY nas funções. Sem o segredo, a função
// segue sem mandar: a ação já foi feita e fica no histórico.

export interface MensagemEmail {
  para: string;
  assunto: string;
  html: string;
  texto: string;
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
        body: JSON.stringify({ from: REMETENTE, to: [m.para], subject: m.assunto, html: m.html, text: m.texto }),
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
