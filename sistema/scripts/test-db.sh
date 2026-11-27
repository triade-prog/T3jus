#!/usr/bin/env bash
# Sobe um Postgres temporário, aplica as migrations em ordem, roda os testes pgTAP e o teste
# de edição simultânea com duas conexões de verdade.
# Uso: bash scripts/test-db.sh   (precisa de PostgreSQL 16+ com pgTAP e pg_prove)
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
PGBIN="${PGBIN:-$(pg_config --bindir 2>/dev/null || ls -d /usr/lib/postgresql/*/bin | sort -V | tail -1)}"
PORTA="${PGPORT_TESTE:-54339}"
DADOS="$(mktemp -d /tmp/t3jus-pg.XXXXXX)"

como_pg() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$DADOS"

limpar() { como_pg "$PGBIN/pg_ctl" -D "$DADOS" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DADOS"; }
trap limpar EXIT

como_pg "$PGBIN/initdb" -D "$DADOS" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
como_pg "$PGBIN/pg_ctl" -D "$DADOS" -o "-p $PORTA -k /tmp -c listen_addresses=127.0.0.1" -w start >/dev/null

export PGHOST=/tmp PGPORT="$PORTA" PGUSER=postgres PGDATABASE=postgres PGOPTIONS="-c client_min_messages=warning"
PSQL=("$PGBIN/psql" -v ON_ERROR_STOP=1 -q -X)

"${PSQL[@]}" -f "$RAIZ/supabase/tests/bootstrap.sql"
for f in "$RAIZ"/supabase/migrations/*.sql; do
  echo "migration $(basename "$f")"
  "${PSQL[@]}" -f "$f"
done
"${PSQL[@]}" -f "$RAIZ/supabase/tests/ajudantes.sql"

pg_prove --ext .sql -r "$RAIZ/supabase/tests/pgtap"

# Edição simultânea do mesmo registro com duas conexões (T4, PT-19).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/edicao-simultanea.sh"

# Exclusão a pedido do titular com um anexo ao mesmo tempo (F3.141, PT-11).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/exclusao-anexo-simultaneo.sh"

# A despesa adiantada e o arquivo dela ao mesmo tempo que a exclusão (F3.156, PT-11).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/exclusao-conta-simultanea.sh"

# O pedido de contrato, o aviso do sino e a edição da proposta ao mesmo tempo que a exclusão (F3.172, F3.179 e F3.181, PT-11).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/exclusao-sino-simultaneo.sh"

# O pedido de contrato ao mesmo tempo que a exclusão de verdade e que o contrato pela proposta (F3.181, PT-11).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/exclusao-pedido-contrato-simultaneo.sh"

# As conversas do WhatsApp, o webhook e o motor ao mesmo tempo que a exclusão (F3.157, PT-11).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/exclusao-conversa-simultanea.sh"

# O histórico do sistema antigo, os lembretes, a importação e o desfazer ao mesmo tempo que a
# exclusão (F3.177 e F3.158, PT-11).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/exclusao-desfazer-simultaneo.sh"

# O contrato novo ao mesmo tempo que a exclusão, com o deadlock da proposta e a importação com
# JUNTAR (F3.180, PT-11).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/exclusao-contrato-simultaneo.sh"

# A ligação nova a caso (adicionar, cadastrar e importar) ao mesmo tempo que a exclusão, e o caso novo
# de importação desfeita, com o levantamento (F3.187 e F3.185, PT-11).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/exclusao-caso-simultaneo.sh"

# Dispensar, trazer de volta e o contrato novo do mesmo cliente ao mesmo tempo (F3.145, VA-05).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/dispensar-contrato.sh"

# O aviso de caso pronto com duas conexões como service_role e commit de verdade (F3.147, EX-16).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/caso-pronto-simultaneo.sh"

# A divisão do levantamento pela API, como service_role, com commit de verdade (F3.163, FI-05).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/levantamento-pela-api.sh"

# O êxito com baixa sem receber e a divisão do alvará ao mesmo tempo, com commit de verdade (F3.174, FI-24).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/exito-baixado-divisao.sh"

# O êxito lançado, a divisão do alvará e o "Dispensar" ao mesmo tempo, com commit de verdade (F3.199, CH-07).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/exito-lancado-pelo-alvara.sh"

# O êxito não cobrado, o "Não cobrar" e dois "Cobrar" do mesmo êxito na divisão do alvará ao mesmo
# tempo, com commit de verdade (F3.191, CH-07).
PSQL_BIN="$PGBIN/psql" bash "$RAIZ/supabase/tests/concorrencia/exito-nao-cobrado-divisao.sh"
