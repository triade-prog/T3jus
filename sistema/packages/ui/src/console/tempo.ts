// Datas do Console, sempre no horário de Brasília: "há 3 dias", "hoje, 9h12", "12/11".

const FUSO = "America/Sao_Paulo";
const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

function diaEm(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "9h12", no horário de Brasília. */
export function hora(iso: string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "numeric", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date(iso))
      .map((x) => [x.type, x.value]),
  );
  return `${Number(p.hour)}h${p.minute}`;
}

/** "12/11" no mesmo ano; "12/11/2025" fora dele. */
export function dataCurta(iso: string, agora: Date = new Date()): string {
  const d = new Date(iso);
  const mesmoAno = diaEm(d).slice(0, 4) === diaEm(agora).slice(0, 4);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", ...(mesmoAno ? {} : { year: "numeric" }) }).format(d);
}

/** "12/11, 10h24". */
export function dataHora(iso: string, agora: Date = new Date()): string {
  return `${dataCurta(iso, agora)}, ${hora(iso)}`;
}

/** "04/11/2026": a data inteira, para "desde". */
export function dataLonga(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

/** Quanto tempo passou, do jeito da carteira: "agora", "há 2 h", "hoje, 9h12", "ontem", "há 3 dias", "há 2 semanas", "12/11". */
export function haQuanto(iso: string, agora: Date = new Date()): string {
  const d = new Date(iso);
  const passou = agora.getTime() - d.getTime();
  if (passou < MINUTO) return "agora";
  if (passou < HORA) return `há ${Math.floor(passou / MINUTO)} min`;
  if (passou < 6 * HORA) return `há ${Math.floor(passou / HORA)} h`;
  if (diaEm(d) === diaEm(agora)) return `hoje, ${hora(iso)}`;
  if (diaEm(d) === diaEm(new Date(agora.getTime() - DIA))) return "ontem";
  const dias = Math.round((Date.parse(diaEm(agora)) - Date.parse(diaEm(d))) / DIA);
  if (dias < 7) return `há ${dias} dias`;
  if (dias < 35) {
    const semanas = Math.floor(dias / 7);
    return semanas === 1 ? "há 1 semana" : `há ${semanas} semanas`;
  }
  return dataCurta(iso, agora);
}

/** "Aguardando há 6 dias", "há 3 h": tempo de espera, sem horário. */
export function esperando(iso: string, agora: Date = new Date()): string {
  const passou = Math.max(0, agora.getTime() - new Date(iso).getTime());
  if (passou < HORA) return `há ${Math.max(1, Math.floor(passou / MINUTO))} min`;
  if (passou < DIA) return `há ${Math.floor(passou / HORA)} h`;
  const dias = Math.floor(passou / DIA);
  return dias === 1 ? "há 1 dia" : `há ${dias} dias`;
}

/** Iniciais para o avatar: "Carol Andrade" → "CA"; um nome só → "C". */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter((p) => !/^(d[aeo]s?|e)$/i.test(p));
  const primeira = partes[0]?.[0] ?? "?";
  const ultima = partes.length > 1 ? partes[partes.length - 1]![0] : "";
  return `${primeira}${ultima ?? ""}`.toUpperCase();
}
