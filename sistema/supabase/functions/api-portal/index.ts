// Entrada da Edge Function api-portal. As dependências reais ficam aqui; os testes montam o
// mesmo app com dependências falsas.

import { authGoTrue } from "../_shared/auth.ts";
import { bancoPostgrest } from "../_shared/banco.ts";
import { conferirVazadaHibp } from "../_shared/senha.ts";
import { criarApiPortal } from "./app.ts";

function exigir(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`Falta a variável ${nome}`);
  return v;
}

const url = exigir("SUPABASE_URL");
const app = criarApiPortal(Deno.env.get("REPASSE_SEGREDO"), {
  banco: bancoPostgrest(url, exigir("SUPABASE_SERVICE_ROLE_KEY")),
  auth: authGoTrue(url, exigir("SUPABASE_ANON_KEY")),
  senhaVazada: conferirVazadaHibp(),
  urlApp: exigir("PORTAL_URL"),
});

Deno.serve(app.fetch);
