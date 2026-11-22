// Entrada da Edge Function api-console. As dependências reais ficam aqui; os testes montam o
// mesmo app com dependências falsas.

import { adminGoTrue, authGoTrue } from "../_shared/auth.ts";
import { bancoPostgrest } from "../_shared/banco.ts";
import { arquivosStorage } from "../_shared/arquivos.ts";
import { conferirVazadaHibp } from "../_shared/senha.ts";
import { emailsResend } from "../_shared/email.ts";
import { storageLimpeza } from "../_shared/guarda.ts";
import { meioInter, type MeioPagamento } from "../_shared/pagamento.ts";
import { criarApiConsole } from "./app.ts";

function exigir(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`Falta a variável ${nome}`);
  return v;
}

const url = exigir("SUPABASE_URL");
const chaveServico = exigir("SUPABASE_SERVICE_ROLE_KEY");
const chaveResend = Deno.env.get("RESEND_API_KEY");

// Meio de pagamento da cobrança (F1.21): o Inter só liga com todos os segredos da integração. O
// certificado e a chave (PEM) vão nas chamadas por mTLS. Sem eles, a baixa continua manual.
function meioPagamento(): MeioPagamento | undefined {
  const [id, segredo, cert, chave, aviso] = ["INTER_CLIENT_ID", "INTER_CLIENT_SECRET", "INTER_CERTIFICADO", "INTER_CHAVE", "INTER_CHAVE_AVISO"]
    .map((n) => Deno.env.get(n));
  if (!id || !segredo || !cert || !chave || !aviso) return undefined;
  const cliente = Deno.createHttpClient({ cert, key: chave });
  const buscar: typeof fetch = (url, init) => fetch(url, { ...init, client: cliente });
  return meioInter({ clientId: id, clientSecret: segredo, conta: Deno.env.get("INTER_CONTA"), chaveAviso: aviso }, buscar);
}
const app = criarApiConsole(Deno.env.get("REPASSE_SEGREDO"), {
  banco: bancoPostgrest(url, chaveServico),
  auth: authGoTrue(url, exigir("SUPABASE_ANON_KEY")),
  senhaVazada: conferirVazadaHibp(),
  admin: adminGoTrue(url, chaveServico),
  urlApp: exigir("CONSOLE_URL"),
  urlPortal: exigir("PORTAL_URL"),
  arquivos: arquivosStorage(url, chaveServico),
  emails: chaveResend ? emailsResend(chaveResend) : undefined,
  limpeza: storageLimpeza(url, chaveServico),
  pagamento: meioPagamento(),
});

Deno.serve(app.fetch);
