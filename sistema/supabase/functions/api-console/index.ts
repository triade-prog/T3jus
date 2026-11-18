// Entrada da Edge Function api-console. As dependências reais ficam aqui; os testes montam o
// mesmo app com dependências falsas.

import { adminGoTrue, authGoTrue } from "../_shared/auth.ts";
import { bancoPostgrest } from "../_shared/banco.ts";
import { arquivosStorage } from "../_shared/arquivos.ts";
import { conferirVazadaHibp } from "../_shared/senha.ts";
import { criarApiConsole } from "./app.ts";

function exigir(nome: string): string {
  const v = Deno.env.get(nome);
  if (!v) throw new Error(`Falta a variável ${nome}`);
  return v;
}

const url = exigir("SUPABASE_URL");
const chaveServico = exigir("SUPABASE_SERVICE_ROLE_KEY");
const app = criarApiConsole(Deno.env.get("REPASSE_SEGREDO"), {
  banco: bancoPostgrest(url, chaveServico),
  auth: authGoTrue(url, exigir("SUPABASE_ANON_KEY")),
  senhaVazada: conferirVazadaHibp(),
  admin: adminGoTrue(url, chaveServico),
  urlApp: exigir("CONSOLE_URL"),
  urlPortal: exigir("PORTAL_URL"),
  arquivos: arquivosStorage(url, chaveServico),
});

Deno.serve(app.fetch);
