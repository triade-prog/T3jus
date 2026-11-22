// Entrada da Edge Function api-portal. As dependências reais ficam aqui; os testes montam o
// mesmo app com dependências falsas.

import { adminGoTrue, authGoTrue } from "../_shared/auth.ts";
import { bancoPostgrest } from "../_shared/banco.ts";
import { arquivosStorage, BUCKET_DOCUMENTOS_PORTAL } from "../_shared/arquivos.ts";
import { conferirVazadaHibp } from "../_shared/senha.ts";
import { cerebroOpenAI, MODELO_PADRAO } from "../_shared/ia.ts";
import { emailsResend } from "../_shared/email.ts";
import { whatsappCloud, VERSAO_GRAPH } from "../_shared/whatsapp.ts";
import { criarApiPortal } from "./app.ts";

function exigir(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`Falta a variável ${nome}`);
  return v;
}

const url = exigir("SUPABASE_URL");
const chaveServico = exigir("SUPABASE_SERVICE_ROLE_KEY");
// F0.21: a entrega pelo WhatsApp só liga com WHATSAPP_ENVIO=ligado. O token por enquanto é um
// só (WHATSAPP_TOKEN, o usuário de sistema do T3jus na Meta); a ligação com a Meta (F3.58) pode
// trocar por um token por escritório guardado no cofre (token_ref), sem mexer na entrega.
const tokenWhatsapp = Deno.env.get("WHATSAPP_TOKEN") ?? "";
const whatsapp = Deno.env.get("WHATSAPP_ENVIO") === "ligado" && tokenWhatsapp
  ? { cloud: whatsappCloud(Deno.env.get("WHATSAPP_GRAPH_VERSAO") || VERSAO_GRAPH), tokenDe: () => Promise.resolve(tokenWhatsapp) }
  : null;

const app = criarApiPortal(Deno.env.get("REPASSE_SEGREDO"), {
  banco: bancoPostgrest(url, chaveServico),
  auth: authGoTrue(url, exigir("SUPABASE_ANON_KEY")),
  senhaVazada: conferirVazadaHibp(),
  urlApp: exigir("PORTAL_URL"),
  admin: adminGoTrue(url, chaveServico),
  arquivos: arquivosStorage(url, chaveServico, BUCKET_DOCUMENTOS_PORTAL),
  // Sem a chave, a IA fica indisponível: o teste diz isso e as conversas vão para a equipe.
  // Sem a chave do Resend, o e-mail ao contador fica como "não saiu" e dá para mandar de novo.
  emails: Deno.env.get("RESEND_API_KEY") ? emailsResend(Deno.env.get("RESEND_API_KEY")!) : undefined,
  whatsapp,
  ia: Deno.env.get("OPENAI_API_KEY") ? cerebroOpenAI(Deno.env.get("OPENAI_API_KEY")!, Deno.env.get("IA_MODELO") || MODELO_PADRAO) : null,
});

Deno.serve(app.fetch);
