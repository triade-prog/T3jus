"use client";
// Início do Portal por áreas (F3.26; PD-01 a PD-07, PA-01, PA-02, IN-04, IN-06). Desenho aprovado
// em docs/design/aprovadas/portal-inicio-areas (Carol, 19/11/2026): o hero aprovado, a faixa
// "Hoje nas suas áreas" com um cartão por área, um bloco por área liberada, na ordem fixa do menu
// (Comercial, Contratos, Financeiro, Jurídico), e a parte comum à direita (Agenda de hoje e
// Esperando alguém). Cada bloco tem a sua consulta e carrega e falha sozinho (decisão 14). A
// sócia dona troca a página inteira entre "Os meus" e "Da equipe" (decisão 9). O bloco Comercial
// é o bloco de contatos aprovado no F1.14, com a janela "Registrar atendimento".

import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  haQuanto, iniciaisConversa, MOTIVOS_CONVERSA,
  type Agenda, type AreaPortal, type BlocoInicio, type ContatoDoDia, type ContatosDoInicio, type FichaCliente, type InicioContratos,
  type InicioFinanceiro, type InicioJuridico, type ItemInicio, type ListaConversas, type PessoaRef, type ResumoInicio,
} from "@t3jus/domain";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { formatarTelefone } from "../console/ficha.ts";
import { Aviso } from "../console/pecas.tsx";
import { COR_TIPO, horaDe, jaPassou, nomeDoTipo } from "./agenda.ts";
import { ICONE_AREA } from "./areas.ts";
import { ROTAS_FINANCEIRO } from "./financeiro.ts";
import { primeiroNome } from "./equipe.ts";
import { JanelaRegistrar, Toast, type Feito } from "./FichaCliente.tsx";
import {
  cartaoComercial, cartaoContratos, cartaoFinanceiro, cartaoJuridico, diaDoInicio, diaMes, discoData, hojeIso, hojeLongo, peDoBloco,
  peDoLimite, rotuloAtraso, rotuloGrupo, saudacao, subtituloBloco, textoItem, type Cartao,
} from "./inicio.ts";
import { chamarPortal, MolduraPortal, ROTAS_PORTAL, useEscritorioPortal, type EscritorioPortal } from "./Moldura.tsx";
import { reais, AREAS_PORTAL } from "@t3jus/domain";

type De = "MEUS" | "EQUIPE";
type Carga<T> = { estado: "carregando" } | { estado: "erro"; codigo: string | null } | { estado: "ok"; dados: T };
type ContatosComercial = ContatosDoInicio & {
  propostasEsperando?: number;
  propostaMaisAntiga?: { id: string; numero: string; cliente: string; clienteId: string; retornoHoje: boolean } | null;
};

const ROTA_JUR = "/juridico";
const NOME_ID: Record<AreaPortal, string> = { COMERCIAL: "comercial", CONTRATOS: "contratos", FINANCEIRO: "financeiro", JURIDICO: "juridico" };
const ROTA: Record<AreaPortal, { href: string; rot: string }> = {
  COMERCIAL: { href: "/comercial/atendimentos", rot: "Abrir Comercial" },
  CONTRATOS: { href: "/contratos", rot: "Abrir Contratos" },
  FINANCEIRO: { href: "/financeiro", rot: "Abrir Financeiro" },
  JURIDICO: { href: "/juridico", rot: "Abrir Jurídico" },
};

/** Uma consulta de bloco: carrega, falha sozinha e tenta de novo (decisão 14). */
function useCarga<T>(url: string | null): [Carga<T>, () => void] {
  const [c, setC] = useState<Carga<T>>({ estado: "carregando" });
  const [vez, setVez] = useState(0);
  useEffect(() => {
    if (!url) return;
    let vivo = true;
    void Promise.resolve().then(async () => {
      if (!vivo) return;
      setC({ estado: "carregando" });
      const r = await chamarPortal<T>(url);
      if (!vivo) return;
      setC(r.ok ? { estado: "ok", dados: r.dados } : { estado: "erro", codigo: r.erro.codigo ?? null });
    });
    return () => {
      vivo = false;
    };
  }, [url, vez]);
  return [c, useCallback(() => setVez((v) => v + 1), [])];
}

// ---------------------------------------------------------------------------------------
// Hero

function Hero({ nome, resumo, areas, carregando }: { nome: string | null; resumo?: ResumoInicio | null; areas: AreaPortal[]; carregando?: boolean }) {
  const dia = resumo ? diaDoInicio(resumo) : null;
  const tem = (a: AreaPortal) => areas.includes(a);
  const atalhos: ReactNode[] = [];
  const escuro = (i: number) => (i === 0 ? "btn btn-escuro" : "btn btn-sec");
  if (tem("COMERCIAL") || !tem("JURIDICO")) atalhos.push(<a key="cli" data-muda className={escuro(atalhos.length)} href={`${ROTAS_PORTAL.clientes}/novo`}><Icone nome="pessoaMais" className="ico" />Novo cliente</a>);
  if (tem("JURIDICO") && !tem("COMERCIAL")) atalhos.unshift(<a key="prazo" data-muda className="btn btn-escuro" href={`${ROTA_JUR}/prazos?novo=1`}><Icone nome="mais" className="ico" />Novo prazo</a>);
  if (tem("FINANCEIRO")) {
    atalhos.push(<a key="rec" className={escuro(atalhos.length)} href={ROTAS_FINANCEIRO.receber}><Icone nome="moeda" className="ico" />Registrar recebimento</a>);
  }
  if (atalhos.length < 2) atalhos.push(<a key="abrir" className="btn btn-sec" href={ROTAS_PORTAL.clientes}><Icone nome="pessoas" className="ico" />Abrir Clientes</a>);
  return (
    <div className="hero">
      <div className="esq campo-vinho">
        <Icone nome="balanca" className="ico estatua" />
        <p className="sobretitulo">{hojeLongo()}</p>
        <h1>
          {saudacao()}
          {nome ? `, ${primeiroNome(nome)}` : ""}.
        </h1>
        <span className="fio" aria-hidden="true" />
        {carregando ? (
          <ul className="dia" aria-hidden="true">
            {[0, 1].map((i) => (
              <li key={i}>
                <span className="pd-esq-dia">
                  <span className="esqueleto" style={{ width: 56, height: 56, borderRadius: "50%", opacity: 0.35 }} />
                  <span className="esqueleto esq-linha" style={{ width: 110, opacity: 0.35 }} />
                </span>
              </li>
            ))}
          </ul>
        ) : dia?.length ? (
          <ul className="dia" aria-label="O seu dia">
            {dia.map((d, i) => (
              <li key={d.titulo}>
                <a href={i === 0 && areas.length ? "#t-areas-ou-bloco" : ROTAS_PORTAL.agenda}>
                  <span className="disco">
                    <span>{d.n}</span>
                  </span>
                  <span>
                    <b>{d.titulo}</b>
                    {d.sub}
                  </span>
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="dir campo-ambar">
        <p className="sobretitulo">Atalhos</p>
        {atalhos.slice(0, 2)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------
// Itens

function Iniciais({ nome }: { nome: string }) {
  return (
    <span className="resp">
      <i aria-hidden="true">{nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join("")}</i>
      {nome}
    </span>
  );
}

const SELO_CLASSE = { urgente: "selo-urgente", atencao: "selo-atencao", neutro: "selo-neutro", implant: "selo-implant", ok: "selo-ok" } as const;
const SELO_ICONE: Partial<Record<keyof typeof SELO_CLASSE, NomeIcone>> = { urgente: "alerta", atencao: "relogio", ok: "check" };

function ItemDia({ i, hoje, comResp }: { i: ItemInicio; hoje: string; comResp: boolean }) {
  const t = textoItem(i, hoje);
  const d = discoData(i.em);
  const disco = i.em < hoje ? "disco pd-venc" : i.em === hoje ? "disco hoje" : "disco";
  return (
    <li className="prazo">
      <div className="data" aria-hidden="true">
        <span className={disco}>
          <span>{d.dia}</span>
        </span>
        <small>{d.mes}</small>
      </div>
      <div>
        <span className="sr">Data: {diaMes(i.em)}. </span>
        <a href={t.href}>{t.titulo}</a>
        <span className="pd-oque">
          <span className="ar-tipo">{t.verbo}</span>
          {t.oque}
        </span>
        {t.detalhe ? (
          <span className="pd-ct">
            <Icone nome={t.detalheIco} className="ico" />
            <span>{t.detalhe}</span>
          </span>
        ) : null}
        {t.esperando ? (
          <span className="ar-esp">
            <Icone nome="relogio" className="ico" />
            {t.esperando}
          </span>
        ) : null}
      </div>
      <div className="lado">
        {t.valor !== null ? <b className="ar-valor">{reais(t.valor)}</b> : null}
        {t.selo ? (
          <span className={`selo ${SELO_CLASSE[t.selo.tom]}`}>
            {SELO_ICONE[t.selo.tom] ? <Icone nome={SELO_ICONE[t.selo.tom]!} className="ico" /> : null}
            {t.selo.texto}
          </span>
        ) : null}
        {comResp ? <Iniciais nome={i.responsavel.nome} /> : null}
      </div>
    </li>
  );
}

function Grupos({ area, b, hoje, comResp, ate }: { area: string; b: BlocoInicio; hoje: string; comResp: boolean; ate?: string | null }) {
  return (
    <>
      {b.grupos.filter((g) => g.itens.length).map((g) => {
        const id = `g-${area}-${g.chave.toLowerCase()}`;
        return (
          <div key={g.chave}>
            <p className="pd-grupo" id={id}>
              {rotuloGrupo(g.chave, g.chave === "ACOMPANHAR" ? ate : null, hoje)} · {g.total}
            </p>
            <ol className="prazos" aria-labelledby={id}>
              {g.itens.map((i) => (
                <ItemDia key={`${i.tipo}-${i.id}`} i={i} hoje={hoje} comResp={comResp} />
              ))}
            </ol>
          </div>
        );
      })}
    </>
  );
}

function Pe({ texto, href, rot, icone = "ajuda" }: { texto: ReactNode; href?: string; rot?: string; icone?: NomeIcone }) {
  return (
    <div className="ar-pe">
      <Icone nome={icone} className="ico" />
      <span>{texto}</span>
      {href && rot ? (
        <a className="ar-pe-ir ver" href={href}>
          {rot}
          <Icone nome="dir" className="ico ico-s" />
        </a>
      ) : null}
    </div>
  );
}

function EmDia({ titulo, prox }: { titulo: string; prox: string }) {
  return (
    <div className="ar-emdia" role="status">
      <span className="disco ar-ok" aria-hidden="true">
        <Icone nome="check" className="ico" />
      </span>
      <p>
        <b>{titulo}</b>
        <span>{prox}</span>
      </p>
    </div>
  );
}

function Esqueleto({ oque, n = 3 }: { oque: string; n?: number }) {
  return (
    <>
      <p className="sr" role="status">
        Carregando {oque}…
      </p>
      <div aria-hidden="true">
        {Array.from({ length: n }, (_, i) => (
          <div className="ar-esq" key={i}>
            <span className="esqueleto" style={{ width: 48, height: 48, borderRadius: "50%" }} />
            <div style={{ display: "grid", gap: 8 }}>
              <span className="esqueleto esq-linha" style={{ width: "60%", height: 13 }} />
              <span className="esqueleto esq-linha" style={{ width: "42%", height: 10 }} />
            </div>
            <span className="esqueleto esq-linha so-pc-i" style={{ width: 100, height: 24 }} />
          </div>
        ))}
      </div>
    </>
  );
}

function ErroBloco({ oque, codigo, aoTentar, alt }: { oque: string; codigo: string | null; aoTentar: () => void; alt: { href: string; rot: string } }) {
  return (
    <div className="estado estado-erro sem-moldura" role="alert">
      <span className="icone-estado">
        <Icone nome="alerta" className="ico" />
      </span>
      <h3>Não deu para carregar {oque}</h3>
      <p>
        O servidor não respondeu. O resto do Início continua funcionando, e nada se perdeu.
        {codigo ? ` Se continuar, passe ao suporte o código ${codigo}.` : ""}
      </p>
      <div className="acoes">
        <button className="btn btn-pri" type="button" onClick={aoTentar}>
          <Icone nome="reenviar" className="ico" />
          Tentar de novo
        </button>
        <a className="btn btn-sec" href={alt.href}>
          {alt.rot}
        </a>
      </div>
    </div>
  );
}

function BlocoArea({ area, sub, ocupado, children, rodape }: { area: AreaPortal; sub: string; ocupado?: boolean; children: ReactNode; rodape?: ReactNode }) {
  const id = NOME_ID[area];
  const nome = AREAS_PORTAL[area];
  return (
    <section className="folha ar-bloco" id={`area-${id}`} aria-labelledby={`t-${id}`} aria-busy={ocupado || undefined}>
      <div className="folha-cab pd-folha-cab">
        <div>
          <h2 id={`t-${id}`}>
            <Icone nome={ICONE_AREA[area]} className="ico" />
            {nome}
          </h2>
          <p className="sub">{sub}</p>
        </div>
        <a className="ver" href={ROTA[area].href}>
          {ROTA[area].rot}
          <span className="sr"> (área {nome})</span>
          <Icone nome="dir" className="ico ico-s" />
        </a>
      </div>
      {children}
      {rodape}
    </section>
  );
}

// ---------------------------------------------------------------------------------------
// Comercial: o bloco de contatos aprovado (F1.14), com a janela "Registrar atendimento".

function ItemContato({ c, comResp, aoRegistrar }: { c: ContatoDoDia; comResp: boolean; aoRegistrar: (c: ContatoDoDia) => void }) {
  const d = discoData(c.em);
  const ct = c.contatoPrincipal;
  return (
    <li className="prazo">
      <div className="data" aria-hidden="true">
        <span className={c.vencido ? "disco pd-venc" : "disco hoje"}>
          <span>{d.dia}</span>
        </span>
        <small>{d.mes}</small>
      </div>
      <div>
        <span className="sr">Marcado para {diaMes(c.em)}. </span>
        <a href={`${ROTAS_PORTAL.clientes}/${c.clienteId}`}>{c.nome}</a>
        <span className="pd-oque">{c.oque}</span>
        {ct ? (
          <span className="pd-ct">
            <Icone nome={ct.telefone ? "telefone" : "envelope"} className="ico" />
            <span>
              {ct.nome}
              {ct.papel ? ` · ${ct.papel}` : ""} · <span className="num">{ct.telefone ? formatarTelefone(ct.telefone) : ct.email}</span>
            </span>
          </span>
        ) : null}
      </div>
      <div className="lado">
        {c.vencido ? (
          <span className="selo selo-urgente">
            <Icone nome="alerta" className="ico" />
            {rotuloAtraso(c.diasAtraso)}
          </span>
        ) : (
          <span className="selo selo-atencao">
            <Icone nome="relogio" className="ico" />
            Hoje
          </span>
        )}
        {comResp ? <Iniciais nome={c.responsavel.nome} /> : null}
        <button className="btn btn-sec btn-compacto" type="button" onClick={() => aoRegistrar(c)}>
          <Icone nome="mais" className="ico ico-s" />
          Registrar atendimento<span className="sr"> de {c.nome}</span>
        </button>
      </div>
    </li>
  );
}

function BlocoComercial({ carga, de, dono, aoTentar, aoRegistrar }: {
  carga: Carga<ContatosComercial>; de: De; dono: boolean; aoTentar: () => void; aoRegistrar: (c: ContatoDoDia) => void;
}) {
  if (carga.estado === "carregando") return <BlocoArea area="COMERCIAL" sub="Buscando os seus contatos…" ocupado><Esqueleto oque="os contatos de hoje" /></BlocoArea>;
  if (carga.estado === "erro") {
    return (
      <BlocoArea area="COMERCIAL" sub="Os contatos vencidos e de hoje">
        <ErroBloco oque="os contatos" codigo={carga.codigo} aoTentar={aoTentar} alt={{ href: `${ROTAS_PORTAL.clientes}?filtro=vencidos`, rot: "Abrir Clientes" }} />
      </BlocoArea>
    );
  }
  const c = carga.dados;
  const resp = c.de === "EQUIPE";
  const quem = de === "EQUIPE" ? "Da equipe" : "Os seus";
  const partes = [c.totalVencidos ? `${c.totalVencidos} ${c.totalVencidos === 1 ? "contato vencido" : "contatos vencidos"}` : "", c.totalHoje ? `${c.totalHoje} ${c.totalHoje === 1 ? "contato" : "contatos"} para hoje` : ""].filter(Boolean);
  const sub = partes.length ? `${quem}: ${partes.join(" e ")}` : `${quem}: nada vencido, nada para hoje`;
  const pe = peDoLimite(c);
  const prop = c.propostaMaisAntiga;
  const nProp = c.propostasEsperando ?? 0;
  return (
    <BlocoArea
      area="COMERCIAL"
      sub={sub}
      rodape={
        <>
          {pe ? <Pe texto={pe} href={`${ROTAS_PORTAL.clientes}?filtro=vencidos`} rot="Ver todos em Clientes" icone="pessoas" /> : null}
          {nProp && prop ? (
            <Pe
              icone="maleta"
              texto={`${nProp === 1 ? `Proposta ${resp ? "" : "sua "}esperando resposta` : `${nProp} propostas ${resp ? "" : "suas "}esperando resposta; a mais antiga`}: ${prop.numero}, de ${prop.cliente}.${prop.retornoHoje ? " O retorno dela é um contato de hoje." : ""}`}
              href="/comercial/propostas"
              rot="Propostas"
            />
          ) : null}
        </>
      }
    >
      {c.de === "MEUS" && dono && !c.totalVencidos && c.equipeVencidos ? (
        <p className="pd-nada-meu">
          <Icone nome="check" className="ico" />
          <span>
            Nenhum contato seu está vencido. Na equipe {c.equipeVencidos === 1 ? "há 1 vencido" : `há ${c.equipeVencidos} vencidos`}. Veja em “Da equipe”.
          </span>
        </p>
      ) : null}
      {!c.totalVencidos && !c.totalHoje ? (
        <EmDia titulo={resp ? "A equipe está em dia." : "Nada seu em Comercial hoje."} prox={c.proximo ? `Próximo contato: ${c.proximo.nome}, ${diaMes(c.proximo.em)}.` : "Nenhum contato marcado."} />
      ) : (
        <>
          {[["venc", "Contatos vencidos", c.vencidos, c.totalVencidos], ["hoje", "Contatos para hoje", c.hoje, c.totalHoje]].map(([k, rot, lista, total]) =>
            (lista as ContatoDoDia[]).length ? (
              <div key={k as string}>
                <p className="pd-grupo" id={`g-comercial-${k as string}`}>
                  {rot as string} · {total as number}
                </p>
                <ol className="prazos pd-contatos" aria-labelledby={`g-comercial-${k as string}`}>
                  {(lista as ContatoDoDia[]).map((x) => (
                    <ItemContato key={x.clienteId} c={x} comResp={resp} aoRegistrar={aoRegistrar} />
                  ))}
                </ol>
              </div>
            ) : null,
          )}
        </>
      )}
    </BlocoArea>
  );
}

// ---------------------------------------------------------------------------------------
// Contratos, Financeiro e Jurídico

function BlocoContratos({ carga, de, hoje, aoTentar }: { carga: Carga<InicioContratos>; de: De; hoje: string; aoTentar: () => void }) {
  if (carga.estado === "carregando") return <BlocoArea area="CONTRATOS" sub="Buscando…" ocupado><Esqueleto oque="Contratos" /></BlocoArea>;
  if (carga.estado === "erro") {
    return <BlocoArea area="CONTRATOS" sub="Cobranças paradas e assinaturas"><ErroBloco oque="Contratos" codigo={carga.codigo} aoTentar={aoTentar} alt={{ href: "/contratos/honorarios", rot: "Abrir Honorários" }} /></BlocoArea>;
  }
  const c = carga.dados;
  const pe = peDoBloco(c);
  return (
    <BlocoArea
      area="CONTRATOS"
      sub={c.total ? subtituloBloco(de, c, { VENCIDOS: ["cobrança parada", "cobranças paradas"], ACOMPANHAR: ["assinatura a registrar", "assinaturas a registrar"] }) : `${de === "EQUIPE" ? "Da equipe" : "Os seus"}: nada para hoje`}
      rodape={
        <>
          {pe ? <Pe texto={pe} href="/contratos" rot="Contratos" icone="pena" /> : null}
          {c.esperandoEtapa ? (
            <Pe icone="pena" texto={`${c.esperandoEtapa} ${c.esperandoEtapa === 1 ? "condição espera" : "condições esperam"} uma etapa do caso para virar cobrança. Nenhuma pede ação hoje.`} href="/contratos/honorarios" rot="Honorários" />
          ) : null}
        </>
      }
    >
      {c.total ? <Grupos area="contratos" b={c} hoje={hoje} comResp={de === "EQUIPE"} /> : (
        <EmDia titulo="Nada seu em Contratos hoje." prox={c.proximo ? `Próxima base a informar: ${c.proximo.cliente}, ${diaMes(c.proximo.em)}.` : "Nenhuma cobrança parada e nenhuma assinatura esta semana."} />
      )}
    </BlocoArea>
  );
}

function BlocoFinanceiro({ carga, de, hoje, aoTentar }: { carga: Carga<InicioFinanceiro>; de: De; hoje: string; aoTentar: () => void }) {
  if (carga.estado === "carregando") return <BlocoArea area="FINANCEIRO" sub="Buscando…" ocupado><Esqueleto oque="o Financeiro" /></BlocoArea>;
  if (carga.estado === "erro") {
    return <BlocoArea area="FINANCEIRO" sub="Parcelas e repasses"><ErroBloco oque="o Financeiro" codigo={carga.codigo} aoTentar={aoTentar} alt={{ href: "/financeiro/a-receber", rot: "Abrir A receber" }} /></BlocoArea>;
  }
  const f = carga.dados;
  const e = f.escritorio;
  const t = f.terceiros;
  const quem = de === "EQUIPE" ? "da equipe" : "os seus";
  const peE = peDoBloco(e);
  const peT = peDoBloco(t);
  return (
    <div className="ar-fin">
      <BlocoArea
        area="FINANCEIRO"
        sub={e.total ? `Do escritório · ${subtituloBloco(de, e, { VENCIDOS: ["parcela vencida", "parcelas vencidas"], ACOMPANHAR: ["que entra logo", "que entram logo"] }, quem)}` : `Do escritório · ${quem}: nada vencido`}
        rodape={
          <>
            {peE ? <Pe texto={peE} href="/financeiro/a-receber" rot="A receber" icone="carteira" /> : null}
            {e.escritorioVencidas ? (
              <Pe icone="carteira" texto={`No escritório todo, ${e.escritorioVencidas} ${e.escritorioVencidas === 1 ? "parcela está vencida" : "parcelas estão vencidas"}. Os números do mês estão no Resumo.`} href="/financeiro" rot="Resumo" />
            ) : null}
          </>
        }
      >
        {e.total ? <Grupos area="financeiro" b={e} hoje={hoje} comResp={de === "EQUIPE"} /> : (
          <EmDia titulo="Nada seu vencido no Financeiro." prox={e.proximo ? `Próxima entrada: ${e.proximo.cliente}, ${diaMes(e.proximo.em)}, ${reais(e.proximo.valor)}.` : "Nenhuma parcela a receber agora."} />
        )}
      </BlocoArea>
      <section className="folha fi-terc ar-bloco ar-terc-bloco" aria-labelledby="t-terc">
        <div className="fi-terc-cab">
          <Icone nome="escudo" className="ico" />
          De terceiros · não é do escritório
        </div>
        <div className="folha-cab pd-folha-cab">
          <div>
            <h3 id="t-terc">
              <Icone nome="enviar" className="ico" />
              Repasses pendentes
            </h3>
            <p className="sub">
              {t.total ? subtituloBloco(de, t, { VENCIDOS: ["atrasado", "atrasados"], ACOMPANHAR: ["no prazo", "no prazo"] }) : `${de === "EQUIPE" ? "Da equipe" : "Os seus"}: nenhum repasse pendente`}
            </p>
          </div>
          <a className="ver" href={ROTAS_FINANCEIRO.repasses}>
            Repasses<span className="sr"> no Financeiro</span>
            <Icone nome="dir" className="ico ico-s" />
          </a>
        </div>
        {t.total ? <Grupos area="terceiros" b={t} hoje={hoje} comResp={de === "EQUIPE"} ate={t.prazoMaisLonge} /> : (
          <EmDia titulo="Nenhum repasse esperando." prox="Quando entrar um alvará, RPV ou acordo, o repasse aparece aqui até ser feito." />
        )}
        {peT ? <Pe texto={peT} href="/financeiro/repasses" rot="Repasses" icone="enviar" /> : null}
      </section>
    </div>
  );
}

function BlocoJuridico({ carga, de, hoje, aoTentar }: { carga: Carga<InicioJuridico>; de: De; hoje: string; aoTentar: () => void }) {
  if (carga.estado === "carregando") return <BlocoArea area="JURIDICO" sub="Buscando…" ocupado><Esqueleto oque="o Jurídico" /></BlocoArea>;
  if (carga.estado === "erro") {
    return <BlocoArea area="JURIDICO" sub="Prazos e tarefas"><ErroBloco oque="o Jurídico" codigo={carga.codigo} aoTentar={aoTentar} alt={{ href: "/juridico/prazos", rot: "Abrir Prazos" }} /></BlocoArea>;
  }
  const j = carga.dados;
  const pe = peDoBloco(j);
  const ep = j.escritorioPrazosHoje;
  return (
    <BlocoArea
      area="JURIDICO"
      sub={j.total ? subtituloBloco(de, j, { VENCIDOS: ["atrasado", "atrasados"] }) : `${de === "EQUIPE" ? "Da equipe" : "Os seus"}: nada para hoje`}
      rodape={
        <>
          {pe ? <Pe texto={pe} href="/juridico/tarefas" rot="Tarefas" icone="balanca" /> : null}
          {ep && ep.n ? (
            <Pe icone="balanca" texto={`No escritório, ${ep.n === 1 ? "1 prazo vence" : `${ep.n} prazos vencem`} hoje: com ${ep.com.map(primeiroNome).join(" e ")}.`} href="/juridico/prazos" rot="Prazos" />
          ) : null}
        </>
      }
    >
      {j.total ? <Grupos area="juridico" b={j} hoje={hoje} comResp={de === "EQUIPE"} /> : (
        <EmDia titulo="Nada seu no Jurídico hoje." prox={j.proximo ? `Próximo: ${j.proximo.texto}, ${diaMes(j.proximo.em)}.` : "Nenhum prazo nem tarefa marcados."} />
      )}
    </BlocoArea>
  );
}

// ---------------------------------------------------------------------------------------
// Faixa "Hoje nas suas áreas"

function CartaoArea({ area, carga, cartao, terceiros }: { area: AreaPortal; carga: Carga<unknown>; cartao: Cartao | null; terceiros?: boolean }) {
  const id = NOME_ID[area];
  return (
    <li>
      <a className="ar-cartao" href={`#area-${id}`} aria-busy={carga.estado === "carregando" || undefined}>
        <span className="ar-c-cab">
          <Icone nome={ICONE_AREA[area]} className="ico" />
          <span className="ar-c-nome">{AREAS_PORTAL[area]}</span>
          <Icone nome="baixo" className="ico ar-ir" />
        </span>
        {carga.estado === "carregando" ? (
          <span className="ar-c-num" aria-hidden="true">
            <span className="esqueleto" style={{ width: 44, height: 44, borderRadius: "50%" }} />
            <span className="esqueleto esq-linha" style={{ width: 90, height: 12 }} />
          </span>
        ) : carga.estado === "erro" || !cartao ? (
          <span className="ar-c-num">
            <span className="disco ar-erro" aria-hidden="true">
              <Icone nome="alerta" className="ico" />
            </span>
            <span className="ar-t">
              <b>Não carregou</b>
              veja no bloco
            </span>
          </span>
        ) : (
          <>
            <span className="ar-c-num">
              {cartao.disco === "ar-ok" ? (
                <span className="disco ar-ok" aria-hidden="true">
                  <Icone nome="check" className="ico" />
                </span>
              ) : (
                <span className={`disco ${cartao.disco}`} aria-hidden="true">
                  <span>{cartao.n}</span>
                </span>
              )}
              <span className="ar-t">
                {cartao.disco !== "ar-ok" ? <span className="sr">{cartao.n} </span> : null}
                <b>{cartao.titulo}</b>
                {cartao.sub}
              </span>
            </span>
            <span className={terceiros ? "ar-c-2 ar-terc" : "ar-c-2"}>
              <Icone nome={terceiros ? "escudo" : ICONE_AREA[area]} className="ico" />
              <span>{cartao.segundo}</span>
            </span>
          </>
        )}
      </a>
    </li>
  );
}

// ---------------------------------------------------------------------------------------
// Parte comum: Agenda de hoje e Esperando alguém (do Início aprovado).

function AgendaDeHoje({ hoje }: { hoje: string }) {
  const [c, tentar] = useCarga<Agenda>(`/v1/escritorio/agenda?de=${hoje}&ate=${hoje}`);
  const lista = c.estado === "ok" ? c.dados.compromissos.filter((x) => x.situacao === "MARCADO").sort((a, b) => a.inicio.localeCompare(b.inicio)) : [];
  const agora = new Date();
  const agoraHora = horaDe(agora.toISOString());
  const iAgora = lista.findIndex((x) => !jaPassou(x, agora));
  return (
    <section className="folha" aria-labelledby="t-agenda" aria-busy={c.estado === "carregando" || undefined}>
      <div className="folha-cab">
        <div>
          <h2 id="t-agenda">
            <Icone nome="agenda" className="ico" />
            Agenda de hoje
          </h2>
          <p className="sub">{c.estado === "ok" ? `Da equipe toda · ${lista.length === 1 ? "1 compromisso" : `${lista.length} compromissos`}` : "Da equipe toda"}</p>
        </div>
        <a className="ver" href={ROTAS_PORTAL.agenda}>
          Agenda
          <Icone nome="dir" className="ico ico-s" />
        </a>
      </div>
      {c.estado === "carregando" ? <Esqueleto oque="a agenda de hoje" n={2} /> : c.estado === "erro" ? (
        <ErroBloco oque="a agenda" codigo={c.codigo} aoTentar={tentar} alt={{ href: ROTAS_PORTAL.agenda, rot: "Abrir a Agenda" }} />
      ) : lista.length ? (
        <ol className="agenda">
          {lista.map((x, i) => (
            <FragmentoEv key={x.id} antes={i === iAgora} agora={agoraHora}>
              <li className={`ev${jaPassou(x, agora) ? " passou" : ""}`} style={{ "--t": COR_TIPO[x.tipo] } as React.CSSProperties}>
                <time>{horaDe(x.inicio)}</time>
                <div className="cx">
                  <span className="tipo">{nomeDoTipo(x)}</span>
                  <strong>
                    <a href={`${ROTAS_PORTAL.agenda}/${x.id}`}>{x.titulo}</a>
                  </strong>
                  <small>{[x.cliente?.nome, x.responsavel.nome].filter(Boolean).join(" · ")}</small>
                </div>
              </li>
            </FragmentoEv>
          ))}
        </ol>
      ) : (
        <EmDia titulo="Nenhum compromisso hoje." prox="A agenda da equipe está livre." />
      )}
    </section>
  );
}

function FragmentoEv({ antes, agora, children }: { antes: boolean; agora: string; children: ReactNode }) {
  return (
    <>
      {antes ? (
        <li className="agora" aria-label={`Agora, ${agora.replace(":", "h")}`}>
          <b />
          agora, {agora.replace(":", "h")}
        </li>
      ) : null}
      {children}
    </>
  );
}

function EsperandoAlguem() {
  const [c, tentar] = useCarga<ListaConversas>("/v1/escritorio/conversas?mostrar=PRECISA");
  const lista = c.estado === "ok" ? c.dados.conversas : [];
  const resto = lista.slice(2);
  return (
    <section className="folha" aria-labelledby="t-conv" aria-busy={c.estado === "carregando" || undefined}>
      <div className="folha-cab conv-cab">
        <div>
          <h2 id="t-conv">
            <Icone nome="whats" className="ico" />
            Esperando alguém
          </h2>
          <p className="sub">{c.estado === "ok" && lista.length ? `A IA respondeu e passou para a equipe · ${lista.length === 1 ? "1 conversa" : `${lista.length} conversas`}` : "As conversas que pedem uma pessoa"}</p>
        </div>
        <a className="ver" href={ROTAS_PORTAL.conversas}>
          Conversas
          <Icone nome="dir" className="ico ico-s" />
        </a>
      </div>
      {c.estado === "carregando" ? <Esqueleto oque="as conversas" n={2} /> : c.estado === "erro" ? (
        <ErroBloco oque="as conversas" codigo={c.codigo} aoTentar={tentar} alt={{ href: ROTAS_PORTAL.conversas, rot: "Abrir Conversas" }} />
      ) : lista.length ? (
        <>
          <ul className="conversas">
            {lista.slice(0, 2).map((x, i) => (
              <li className="conversa" key={x.id}>
                <div className="c-topo">
                  <span className={`av av${(i % 2) + 1}`} aria-hidden="true">{iniciaisConversa(x.nome).slice(0, 1)}</span>
                  <div>
                    <strong>{x.nome}</strong>
                    <small>{x.cliente ? "Cliente" : "Novo contato"}</small>
                  </div>
                  {x.esperandoDesde ? (
                    <span className="espera">
                      <Icone nome="relogio" className="ico ico-s" />
                      {haQuanto(x.esperandoDesde)}
                    </span>
                  ) : null}
                </div>
                {x.ultima?.texto ? <p className="balao">“{x.ultima.texto}”</p> : null}
                <div className="c-pe">
                  <span className="motivo">
                    <Icone nome="ia" className="ico" />
                    {x.motivo ? MOTIVOS_CONVERSA[x.motivo] : "Precisa de alguém"}
                  </span>
                  <a className="btn btn-sec" href={`${ROTAS_PORTAL.conversas}?c=${x.id}`}>
                    Responder<span className="sr"> a {x.nome}</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
          {resto.length ? (
            <Pe
              icone="conversas"
              texto={`Mais ${resto.length === 1 ? "1 conversa esperando" : `${resto.length} conversas esperando`}: ${resto[0]!.nome}${resto[0]!.esperandoDesde ? `, ${haQuanto(resto[0]!.esperandoDesde)}` : ""}.`}
              href={ROTAS_PORTAL.conversas}
              rot="Abrir Conversas"
            />
          ) : null}
        </>
      ) : (
        <EmDia titulo="Ninguém esperando." prox="Quando a IA passar uma conversa para a equipe, ela aparece aqui." />
      )}
    </section>
  );
}

function ParteComum({ hoje }: { hoje: string }) {
  return (
    <>
      <p className="ar-aside-rot">Todo o escritório</p>
      <AgendaDeHoje hoje={hoje} />
      <EsperandoAlguem />
    </>
  );
}

// ---------------------------------------------------------------------------------------
// A página

function InicioDasAreas({ escritorio }: { escritorio: EscritorioPortal }) {
  const hoje = hojeIso();
  const areas = escritorio.areas as AreaPortal[];
  const tem = (a: AreaPortal) => areas.includes(a);
  const [de, setDe] = useState<De>("MEUS");
  const [resumo] = useCarga<ResumoInicio>("/v1/escritorio/inicio/resumo");
  const [com, tCom] = useCarga<ContatosComercial>(tem("COMERCIAL") ? `/v1/escritorio/inicio/contatos?de=${de}` : null);
  const [ctr, tCtr] = useCarga<InicioContratos>(tem("CONTRATOS") ? `/v1/escritorio/inicio/contratos?de=${de}` : null);
  const [fin, tFin] = useCarga<InicioFinanceiro>(tem("FINANCEIRO") ? `/v1/escritorio/inicio/financeiro?de=${de}` : null);
  const [jur, tJur] = useCarga<InicioJuridico>(tem("JURIDICO") ? `/v1/escritorio/inicio/juridico?de=${de}` : null);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [registrar, setRegistrar] = useState<{ f: FichaCliente; pessoas: PessoaRef[]; vez: number } | null>(null);
  const [abrindo, setAbrindo] = useState(false);
  const [erroAbrir, setErroAbrir] = useState(false);

  async function abrirRegistrar(x: ContatoDoDia) {
    if (abrindo) return;
    setFeito(null);
    setErroAbrir(false);
    setAbrindo(true);
    const [f, p] = await Promise.all([
      chamarPortal<FichaCliente>(`/v1/escritorio/clientes/${x.clienteId}`),
      chamarPortal<{ pessoas: PessoaRef[] }>("/v1/escritorio/pessoas"),
    ]);
    setAbrindo(false);
    if (!f.ok || !p.ok) return setErroAbrir(true);
    setRegistrar((o) => ({ f: f.dados, pessoas: p.dados.pessoas, vez: (o?.vez ?? 0) + 1 }));
  }

  const r = resumo.estado === "ok" ? resumo.dados : null;
  const pedidos = com.estado === "ok" ? com.dados.pedidosExclusao : null;
  const cargas: Record<AreaPortal, Carga<unknown>> = { COMERCIAL: com, CONTRATOS: ctr, FINANCEIRO: fin, JURIDICO: jur };
  const cartoes: Record<AreaPortal, Cartao | null> = {
    COMERCIAL: com.estado === "ok" ? cartaoComercial(com.dados, hoje) : null,
    CONTRATOS: ctr.estado === "ok" ? cartaoContratos(ctr.dados, hoje) : null,
    FINANCEIRO: fin.estado === "ok" ? cartaoFinanceiro(fin.dados, hoje) : null,
    JURIDICO: jur.estado === "ok" ? cartaoJuridico(jur.dados, hoje) : null,
  };
  const prontas = areas.every((a) => cargas[a].estado === "ok");
  const tudoEmDia = de === "MEUS" && prontas && areas.length > 1 && areas.every((a) => cartoes[a]?.disco === "ar-ok");

  const blocos = (
    <>
      {tem("COMERCIAL") ? <BlocoComercial carga={com} de={de} dono={escritorio.dono} aoTentar={tCom} aoRegistrar={(x) => void abrirRegistrar(x)} /> : null}
      {tem("CONTRATOS") ? <BlocoContratos carga={ctr} de={de} hoje={hoje} aoTentar={tCtr} /> : null}
      {tem("FINANCEIRO") ? <BlocoFinanceiro carga={fin} de={de} hoje={hoje} aoTentar={tFin} /> : null}
      {tem("JURIDICO") ? <BlocoJuridico carga={jur} de={de} hoje={hoje} aoTentar={tJur} /> : null}
    </>
  );

  const chips = escritorio.dono ? (
    <div className="pd-chips" role="group" aria-label="Mostrar no Início">
      <button type="button" aria-pressed={de === "MEUS"} onClick={() => setDe("MEUS")}>
        Os meus
      </button>
      <button type="button" aria-pressed={de === "EQUIPE"} onClick={() => setDe("EQUIPE")}>
        Da equipe
      </button>
    </div>
  ) : null;

  return (
    <>
      <Hero nome={escritorio.pessoa} resumo={r} areas={areas} carregando={resumo.estado === "carregando"} />
      {pedidos?.map((x, i, todos) => (
        <a key={x.id} className="pd-pedido-ini" href={`${ROTAS_PORTAL.clientes}/${x.clienteId}`}>
          <Icone nome="escudo" className="ico" />
          <span>
            <b>{todos.length === 1 ? "1 pedido de exclusão esperando você" : i === 0 ? `${todos.length} pedidos de exclusão esperando você` : "Outro pedido de exclusão"}</b>
            <small>
              {x.nome} · pedido em {diaMes(x.pedidoEm)} por {x.por} (LGPD)
            </small>
          </span>
          <Icone nome="dir" className="ico ico-s pd-ir" />
        </a>
      ))}
      {erroAbrir ? (
        <Aviso tom="urgencia" titulo="Não deu para abrir o registro de atendimento.">
          Tente de novo ou registre pela ficha do cliente.
        </Aviso>
      ) : null}
      {areas.length === 0 ? (
        <>
          <p className="ar-sem-area">
            <Icone nome="cadeado" className="ico" />
            <span>
              <b>O seu Início mostra o que é de todo o escritório.</b> As áreas do escritório são liberadas pela sócia dona, em Equipe. Quando ela liberar uma para você, o que pede a sua ação nela aparece aqui.
            </span>
          </p>
          <div className="ar-comum">
            <AgendaDeHoje hoje={hoje} />
            <EsperandoAlguem />
          </div>
        </>
      ) : (
        <>
          {tudoEmDia ? (
            <p className="ar-tudo" role="status">
              <Icone nome="check" className="ico" />
              <span>
                <b>Tudo em dia nas suas {areas.length} áreas.</b> Nada vencido e nada para hoje.
              </span>
            </p>
          ) : null}
          {areas.length > 1 ? (
            <section className="ar-faixa" aria-labelledby="t-areas-ou-bloco">
              <div className="ar-faixa-cab">
                <div>
                  <h2 id="t-areas-ou-bloco">{de === "EQUIPE" ? "Hoje nas áreas da equipe" : "Hoje nas suas áreas"}</h2>
                  <p className="sub">O que cobrar, o que entregar e o que acompanhar hoje. Cada cartão leva ao bloco da área.</p>
                </div>
                {chips}
              </div>
              <ul className="ar-cartoes" style={{ "--n": areas.length } as React.CSSProperties}>
                {areas.map((a) => (
                  <CartaoArea key={a} area={a} carga={cargas[a]} cartao={cartoes[a]} terceiros={a === "FINANCEIRO"} />
                ))}
              </ul>
            </section>
          ) : (
            <span id="t-areas-ou-bloco" hidden />
          )}
          <div className="pt-inicio">
            <div className="pt-col">{blocos}</div>
            <aside className="pt-col" aria-label="Parte comum do escritório">
              <ParteComum hoje={hoje} />
            </aside>
          </div>
        </>
      )}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
      {registrar ? (
        <JanelaRegistrar
          key={`r-${registrar.vez}`}
          aberta
          f={registrar.f}
          pessoas={registrar.pessoas}
          eu={escritorio.pessoa}
          aoFechar={() => setRegistrar(null)}
          aoFeito={(x) => {
            const nome = primeiroNome(registrar.f.nome);
            setRegistrar(null);
            setFeito({ titulo: `Atendimento de ${nome} registrado.`, texto: x.texto });
            tCom();
          }}
        />
      ) : null}
    </>
  );
}

export function InicioPortal() {
  const { escritorio, erro, recarregar } = useEscritorioPortal();
  return (
    <MolduraPortal atual="inicio" trilha={[{ nome: "Início" }]} escritorio={escritorio}>
      <div className="pd-inicio">
        {erro ? (
          <>
            <Hero nome={null} areas={[]} />
            <Aviso
              tom="urgencia"
              titulo="Não deu para carregar os dados do escritório."
              acoes={
                <button className="btn btn-sec" type="button" onClick={recarregar}>
                  Tentar de novo
                </button>
              }
            >
              Recarregue a página. Se continuar, fale com o suporte.
            </Aviso>
          </>
        ) : !escritorio ? (
          <Hero nome={null} areas={[]} carregando />
        ) : (
          <InicioDasAreas escritorio={escritorio} />
        )}
      </div>
    </MolduraPortal>
  );
}
