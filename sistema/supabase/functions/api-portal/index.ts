// Entrada da Edge Function api-portal. As dependências reais ficam aqui; os testes montam o
// mesmo app com dependências falsas.

import { adminGoTrue, authGoTrue } from "../_shared/auth.ts";
import { bancoPostgrest } from "../_shared/banco.ts";
import { arquivosStorage, BUCKET_DOCUMENTOS_PORTAL } from "../_shared/arquivos.ts";
import { conferirVazadaHibp } from "../_shared/senha.ts";
import { cerebroOpenAI, MODELO_PADRAO } from "../_shared/ia.ts";
import { criarApiPortal } from "./app.ts";

function exigir(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`Falta a variável ${nome}`);
  return v;
}

const url = exigir("SUPABASE_URL");
const chaveServico = exigir("SUPABASE_SERVICE_ROLE_KEY");
const app = criarApiPortal(Deno.env.get("REPASSE_SEGREDO"), {
  banco: bancoPostgrest(url, chaveServico),
  auth: authGoTrue(url, exigir("SUPABASE_ANON_KEY")),
  senhaVazada: conferirVazadaHibp(),
  urlApp: exigir("PORTAL_URL"),
  admin: adminGoTrue(url, chaveServico),
  arquivos: arquivosStorage(url, chaveServico, BUCKET_DOCUMENTOS_PORTAL),
  // Sem a chave, a IA fica indisponível: o teste diz isso e as conversas vão para a equipe.
  ia: Deno.env.get("OPENAI_API_KEY") ? cerebroOpenAI(Deno.env.get("OPENAI_API_KEY")!, Deno.env.get("IA_MODELO") || MODELO_PADRAO) : null,
});

Deno.serve(app.fetch);
