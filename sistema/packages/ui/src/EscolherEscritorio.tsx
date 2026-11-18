"use client";
// Escolha do escritório (Portal), tela aprovada em 18/11/2026. Aparece sempre que a pessoa tem
// acesso a mais de um escritório (decisão da Carol). O último usado vem primeiro; a busca
// aparece a partir de 7. A escolha vai para a sessão no servidor (PUT /v1/sessao/escritorio):
// depois disso, nenhuma chamada manda o escritório pelo navegador.

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { chamarApi, textoDoErro, type ErroApi } from "./api.ts";
import { Icone } from "./Icone.tsx";
import { Aviso, Cabecalho } from "./pecas.tsx";

export interface EscritorioParaEscolher {
  id: string;
  nome: string;
  cidade: string | null;
  uf: string | null;
  ultimaEntrada: string | null;
}

/** A busca aparece a partir deste número de escritórios. */
export const BUSCA_A_PARTIR_DE = 7;

const FUSO = "America/Sao_Paulo";
/** Sem sessão (ou depois de sair), volta para a tela de entrar com recarga completa. */
const TELA_ENTRAR = "/entrar";

function diaEm(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSO, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

/** "hoje, 9h12", "ontem, 18h40", "12 nov." ou "12 nov. 2025", no horário de Brasília. */
export function quandoEntrou(iso: string, agora: Date = new Date()): string {
  const d = new Date(iso);
  const ontem = new Date(agora.getTime() - 24 * 60 * 60 * 1000);
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, hour: "numeric", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  const hora = `${Number(partes.hour)}h${partes.minute}`;
  if (diaEm(d) === diaEm(agora)) return `hoje, ${hora}`;
  if (diaEm(d) === diaEm(ontem)) return `ontem, ${hora}`;
  const mesmoAno = diaEm(d).slice(0, 4) === diaEm(agora).slice(0, 4);
  const dia = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, day: "numeric", month: "short", ...(mesmoAno ? {} : { year: "numeric" }) })
    .format(d)
    .replace(/ de /g, " ");
  return dia;
}

export function metaEscritorio(e: EscritorioParaEscolher, agora?: Date): string {
  const onde = e.cidade ? `${e.cidade}${e.uf ? `, ${e.uf}` : ""} · ` : "";
  return `${onde}${e.ultimaEntrada ? `Última entrada ${quandoEntrou(e.ultimaEntrada, agora)}` : "Sem entrada nos últimos 30 dias"}`;
}

/** Busca por nome ou cidade, sem diferença de acento nem de maiúscula. */
export function filtrarEscritorios(lista: EscritorioParaEscolher[], termo: string): EscritorioParaEscolher[] {
  const sem = (t: string) => t.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  const t = sem(termo);
  return t ? lista.filter((e) => sem(`${e.nome} ${e.cidade ?? ""}`).includes(t)) : lista;
}

export function EscolherEscritorio({ destino = "/" }: { destino?: string }) {
  const [lista, setLista] = useState<EscritorioParaEscolher[] | null>(null);
  const [email, setEmail] = useState("");
  const [termo, setTermo] = useState("");
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [escolhendo, setEscolhendo] = useState<string | null>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const ids = useId();
  const carregado = useRef(false);

  async function escolher(id: string) {
    setErro(null);
    setEscolhendo(id);
    const r = await chamarApi("/v1/sessao/escritorio", { metodo: "PUT", corpo: { escritorioId: id } });
    if (!r.ok) {
      setEscolhendo(null);
      return setErro(r.erro);
    }
    window.location.assign(destino);
  }

  useEffect(() => {
    if (carregado.current) return;
    carregado.current = true;
    void (async () => {
      const r = await chamarApi<{ email: string; escritorios: EscritorioParaEscolher[] }>("/v1/sessao/escolha");
      if (!r.ok) {
        // Recarga completa de propósito: a sessão mudou no servidor (cookie HttpOnly).
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        if (r.erro.codigo === "UNAUTHORIZED" || r.erro.codigo === "MFA_REQUIRED") return window.location.assign(TELA_ENTRAR);
        setErro(r.erro);
        return setLista([]);
      }
      setEmail(r.dados.email);
      // Um escritório só: não há o que escolher.
      if (r.dados.escritorios.length === 1) return void escolher(r.dados.escritorios[0]!.id);
      setLista(r.dados.escritorios);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lista && lista.length > 1) titulo.current?.focus();
  }, [lista]);

  const visiveis = useMemo(() => filtrarEscritorios(lista ?? [], termo), [lista, termo]);

  async function sair() {
    await chamarApi("/v1/auth/sair", { corpo: {} });
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(TELA_ENTRAR);
  }

  if (!lista || (lista.length === 1 && !erro)) {
    return (
      <>
        <Cabecalho titulo="Qual escritório?" lede="Carregando os seus escritórios…" />
        <div className="ac-form" aria-busy="true" />
      </>
    );
  }

  const comBusca = lista.length >= BUSCA_A_PARTIR_DE;
  const idTotal = `${ids}-total`;
  const idLista = `${ids}-lista`;
  return (
    <>
      <Cabecalho ref={titulo} titulo="Qual escritório?"
        lede={lista.length === 0 ? "Você não tem acesso ativo a nenhum escritório." : `Você tem acesso a ${lista.length} escritórios. Dá para trocar depois, pelo menu.`} />
      <div className="ac-form ac-escolha">
        {erro ? <Aviso tom="erro">{textoDoErro(erro)}</Aviso> : null}
        {comBusca ? (
          <div className="ac-campo">
            <label htmlFor={`${ids}-busca`}>Buscar escritório</label>
            <div className="ac-busca">
              <Icone nome="busca" />
              <input className="ac-entrada" id={`${ids}-busca`} type="search" autoComplete="off" placeholder="Nome ou cidade"
                aria-describedby={idTotal} aria-controls={visiveis.length > 0 ? idLista : undefined} value={termo} onChange={(e) => setTermo(e.target.value)} />
            </div>
            <p className="ac-total" id={idTotal} aria-live="polite">
              {termo.trim() ? `${visiveis.length} de ${lista.length} escritórios` : "Do mais recente ao mais antigo"}
            </p>
          </div>
        ) : null}
        {visiveis.length > 0 ? (
          <div className={comBusca ? "ac-rolagem" : undefined} role="group" aria-label="Escritórios">
            <ul className="ac-escritorios" id={idLista}>
              {visiveis.map((e) => {
                const atual = e.id === lista[0]?.id && Boolean(e.ultimaEntrada);
                return (
                  <li key={e.id}>
                    <button className={atual ? "ac-esc ac-esc-atual" : "ac-esc"} type="button" disabled={escolhendo !== null}
                      aria-busy={escolhendo === e.id || undefined} onClick={() => void escolher(e.id)}>
                      <span className="ac-esc-texto">
                        {atual ? <span className="ac-selo-p">Último usado</span> : null}
                        <span className="ac-esc-nome">{e.nome}</span>
                        <span className="ac-esc-meta">{metaEscritorio(e)}</span>
                      </span>
                      <Icone nome="seta" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : lista.length > 0 ? (
          <div className="ac-vazio">
            <strong>Nenhum escritório com “{termo.trim()}”.</strong>
            Confira a grafia ou busque pela cidade. Se falta um escritório, peça o convite ao sócio dele.
          </div>
        ) : (
          <div className="ac-vazio">
            <strong>Nenhum escritório por aqui.</strong>
            Se você deveria ter acesso, peça o convite ao sócio do escritório.
          </div>
        )}
      </div>
      <div className="ac-sessao">
        <p>
          Entrou como
          <br />
          <strong>{email}</strong>
        </p>
        <button className="ac-sair" type="button" onClick={() => void sair()}>
          <Icone nome="sair" className="ac-ico ac-ico-p" />
          Sair
        </button>
      </div>
    </>
  );
}
