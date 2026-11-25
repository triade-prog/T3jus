"use client";
// Console › ficha › aba Assinatura (CO-06), telas aprovadas em docs/design/aprovadas/console-cobranca
// (estados 27 a 41): o plano, a mensalidade, as pessoas, o dia, a forma, o e-mail, o CNPJ e o
// desconto; preparar, editar, mudar de plano; o atraso e o Portal só para consulta; o carnê.
// Implantação e Suporte veem o plano e a situação, sem valores nem faturas (o banco já esconde).

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { diaBrasilia, FORMAS_ASSINATURA, mesPorExtenso, UFS_BRASIL, type FormaAssinatura } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { brl, dataBr, enderecoEmLinha, sedeParaCobranca, textoEvento, textoPessoas, type AssinaturaCb, type AssinaturaResposta, type FaturaCb } from "./cobranca.ts";
import { formatarCnpj } from "./ficha.ts";
import { chamarConsole } from "./Moldura.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "./pecas.tsx";
import { BotaoBaixarDoc, FolhaCarne, hrefFatura, SituacaoDoc, TabelaDoEscritorio, useBaixarDoc } from "./PecasCobranca.tsx";
import { hora } from "./tempo.ts";

const MOTIVO_MAX = 300;
const DIAS = [5, 10, 15, 20, 25];
const AJUDA_FORMA: Record<FormaAssinatura, string> = {
  PIX: "O boleto vai junto, como alternativa",
  BOLETO: "O Pix vai junto, como alternativa",
  CARNE: "12 parcelas iguais, de uma vez, cada uma com Pix e boleto",
};

type Falha = { tipo: "conflito"; quem: string | null; em: string | null } | { tipo: "erro"; erro: ErroApi };

function falhaDe(r: { status: number; erro: ErroApi }): Falha {
  if (r.status === 409) {
    const d = r.erro.detalhes ?? {};
    return { tipo: "conflito", quem: typeof d.quem === "string" ? d.quem : null, em: typeof d.em === "string" ? d.em : null };
  }
  return { tipo: "erro", erro: r.erro };
}

/** Os próximos 12 meses a partir de uma competência ("2026-12-01"). */
function mesesDesde(competencia: string, n = 12): string[] {
  const [a, m] = competencia.split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const t = (a ?? 2026) * 12 + ((m ?? 1) - 1) + i;
    return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}-01`;
  });
}

function proximaCompetencia(hoje: string): string {
  return mesesDesde(`${hoje.slice(0, 7)}-01`, 2)[1]!;
}

/** "até a fatura de fevereiro de 2027 (3 faturas)", contando da próxima ainda não emitida. */
function textoDesconto(ate: string, desde: string | undefined): string {
  if (!desde || ate < desde) return `até a fatura de ${mesPorExtenso(ate)}`;
  const n = mesesDesde(desde, 400).indexOf(ate) + 1;
  return `até a fatura de ${mesPorExtenso(ate)}${n > 0 ? ` (${n} ${n === 1 ? "fatura" : "faturas"})` : ""}`;
}

/** Faixa que aparece em todas as abas da ficha quando o Portal está só para consulta (estado 36). */
export function FaixaSoConsulta({ id, desde, por }: { id: string; desde: string; por?: string | null }) {
  return (
    <div className="fc-faixa" role="note" aria-label="Situação do Portal">
      <Icone nome="cadeado" className="ico" />
      <p>
        <b>Portal só para consulta por atraso</b>, desde {dataBr(desde)}
        {por ? `, por ${por}` : ""}. Volta ao normal sozinho quando as faturas em atraso forem pagas. Nenhum dado foi apagado.
      </p>
      <a href={`/clientes/${id}/assinatura`}>
        <Icone nome="fatura" className="ico" />
        Ver a assinatura
      </a>
    </div>
  );
}

function ComoFunciona({ carne }: { carne: boolean }) {
  const ids = useId();
  return (
    <section className="explica campo-ambar" aria-labelledby={`${ids}-c`}>
      <p className="sobretitulo">Como funciona</p>
      {carne ? (
        <>
          <h2 id={`${ids}-c`}>O carnê.</h2>
          <ul>
            <li>
              <Icone nome="carne" className="ico" />
              <span>12 parcelas com o mesmo valor, mandadas de uma vez em PDF. Cada parcela tem o próprio Pix e boleto.</span>
            </li>
            <li>
              <Icone nome="fatura" className="ico" />
              <span>Cada parcela é a fatura do mês, emitida 20 dias antes, com os mesmos códigos. A régua de lembretes vale igual.</span>
            </li>
            <li>
              <Icone nome="check" className="ico" />
              <span>Pode pagar adiantado: a parcela fica paga e a fatura do mês já nasce paga.</span>
            </li>
            <li>
              <Icone nome="planos" className="ico" />
              <span>Mudou o plano, o valor ou o dia: carnê novo a partir da próxima parcela sem fatura. As que faltam são canceladas com motivo, nunca apagadas.</span>
            </li>
            <li>
              <Icone nome="relogio" className="ico" />
              <span>20 dias antes da última parcela, sai o próximo carnê.</span>
            </li>
          </ul>
        </>
      ) : (
        <>
          <h2 id={`${ids}-c`}>A assinatura do escritório.</h2>
          <ul>
            <li>
              <Icone nome="planos" className="ico" />
              <span>Mudar de plano ou de dia vale na próxima fatura ainda não emitida. Sem proporcional: nada de crédito nem de diferença.</span>
            </li>
            <li>
              <Icone nome="pessoas" className="ico" />
              <span>Pessoa a mais conta quem está ativo no dia em que a fatura é emitida.</span>
            </li>
            <li>
              <Icone nome="relogio" className="ico" />
              <span>Com 7 dias de atraso, o sócio dono vê um aviso no Portal. Com 30, a Administração pode deixar o Portal só para consulta. Nada é apagado.</span>
            </li>
            <li>
              <Icone nome="check" className="ico" />
              <span>Ao pagar, o Portal volta ao normal sozinho.</span>
            </li>
          </ul>
        </>
      )}
    </section>
  );
}

function Situacao({ r }: { r: AssinaturaResposta }) {
  const ids = useId();
  const a = r.assinatura;
  const proxima = a?.proxima;
  const encerrado = r.estagio === "ENCERRADO";
  let selo: ReactNode;
  let grande: ReactNode = null;
  let texto: ReactNode;
  if (!a || a.situacao === "SEM_COBRANCA") {
    selo = <span className="selo selo-implant">{r.estagio === "IMPLANTACAO" ? "Em implantação" : "Cobrança não começou"}</span>;
    texto = "Nenhuma fatura. A primeira é emitida no dia em que o cliente passar para Ativo.";
  } else if (a.situacao === "SO_CONSULTA") {
    selo = (
      <span className="selo selo-consulta">
        <Icone nome="cadeado" className="ico" />
        Portal só consulta
      </span>
    );
    grande = a.abertas ? <p className="cb-grande cb-urg">{brl(a.abertas.totalCentavos)}</p> : null;
    texto = (
      <>
        Em atraso há {a.atrasoDias ?? 0} dias. Desde {dataBr(a.soConsultaDesde!)}
        {a.soConsulta?.por ? `, por ${a.soConsulta.por}` : ""}. Volta sozinho ao pagar.
      </>
    );
  } else if (a.situacao === "EM_ATRASO") {
    const urg = (a.atrasoDias ?? 0) >= 30;
    selo = (
      <span className={urg ? "selo selo-urgente" : "selo selo-atencao"}>
        <Icone nome={urg ? "alerta" : "relogio"} className="ico" />
        Em atraso · {a.atrasoDias} {a.atrasoDias === 1 ? "dia" : "dias"}
      </span>
    );
    grande = a.abertas ? <p className="cb-grande cb-urg">{brl(a.abertas.totalCentavos)}</p> : null;
    texto = encerrado
      ? "O contrato terminou: a régua parou e os lembretes agora são manuais."
      : a.abertas
        ? `${a.abertas.faturas} ${a.abertas.faturas === 1 ? "fatura em aberto" : "faturas em aberto"}. Ao pagar, o atraso sai sozinho.`
        : "Ao pagar, o atraso sai sozinho.";
  } else {
    selo = (
      <span className="selo selo-ok">
        <Icone nome="check" className="ico" />
        Em dia
      </span>
    );
    grande = proxima ? <p className="cb-grande">{brl(proxima.totalCentavos)}</p> : null;
    texto = encerrado ? (
      "Assinatura encerrada com o contrato. Nenhuma fatura nova é emitida."
    ) : (
      <>
        Próxima fatura: <b>{mesPorExtenso(a.proxima?.competencia ?? a.primeiraCompetencia ?? r.hoje)}</b>
        {proxima ? (
          <>
            , vence em <b>{dataBr(proxima.vencimento)}</b>
          </>
        ) : null}
        .
      </>
    );
  }
  return (
    <section className="folha" aria-labelledby={`${ids}-s`}>
      <div className="folha-cab" style={{ paddingBottom: 6 }}>
        <h2 id={`${ids}-s`} style={{ fontSize: 20 }}>
          Situação da cobrança
        </h2>
      </div>
      <div className="cb-situ">
        <p>{selo}</p>
        {grande}
        <p>{texto}</p>
      </div>
    </section>
  );
}

/** Janela com só o motivo: só consulta, devolver o acesso, carnê novo. */
function JanelaMotivo({ titulo, sobretitulo, descricao, children, botao, icone, perigo, caminho, versao, ajuda, aoFechar, aoFeito }: {
  titulo: string;
  sobretitulo: string;
  descricao: string;
  children?: ReactNode;
  botao: string;
  icone: "cadeado" | "abrir" | "carne";
  perigo?: boolean;
  caminho: string;
  versao: number;
  ajuda: string;
  aoFechar: () => void;
  aoFeito: () => void;
}) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const [motivo, setMotivo] = useState("");
  const [erroMotivo, setErroMotivo] = useState(false);
  const [falha, setFalha] = useState<Falha | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setFalha(null);
    if (!motivo.trim()) {
      setErroMotivo(true);
      return focarPrimeiroErro(corpo.current);
    }
    setErroMotivo(false);
    setEnviando(true);
    const r = await chamarConsole(caminho, { corpo: { versao, motivo: motivo.trim() } });
    setEnviando(false);
    if (!r.ok) return setFalha(falhaDe(r));
    aoFeito();
  }

  return (
    <Janela id={`${ids}-j`} aberta alerta aoFechar={aoFechar} sobretitulo={sobretitulo} titulo={titulo} descricao={`${ids}-d`} aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar} data-foco={erroMotivo ? undefined : ""}>
            Cancelar
          </button>
          <button className={perigo ? "btn fc-perigo-cheio" : "btn btn-pri"} type="submit" aria-busy={enviando || undefined}>
            <Icone nome={icone} className="ico" />
            {enviando ? "Enviando…" : botao}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id={`${ids}-d`}>{descricao}</p>
        {erroMotivo ? (
          <Aviso tom="urgencia" titulo={faltaAcertar(1)}>
            Nada mudou.
          </Aviso>
        ) : falha ? (
          <Aviso tom="urgencia" titulo="Não deu para fazer agora.">
            {falha.tipo === "conflito"
              ? `${falha.quem ?? "Outra pessoa"} mudou esta assinatura${falha.em ? ` às ${hora(falha.em)}` : ""}. Feche e confira antes de tentar de novo.`
              : textoDoErro(falha.erro)}
          </Aviso>
        ) : null}
        {children}
        <div className="campo">
          <label htmlFor={`${ids}-m`}>Motivo</label>
          <textarea className="entrada" id={`${ids}-m`} rows={3} maxLength={MOTIVO_MAX} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            aria-required="true" aria-invalid={erroMotivo || undefined} aria-describedby={descritoPor(erroMotivo && `${ids}-m-e`, `${ids}-m-a`)} />
          {erroMotivo ? <ErroCampo id={`${ids}-m-e`}>Escreva o motivo. Ele fica no histórico da assinatura.</ErroCampo> : null}
          <p className="ajuda" id={`${ids}-m-a`}>
            {ajuda}
          </p>
        </div>
      </div>
    </Janela>
  );
}

function JanelaMudarPlano({ id, r, a, nome, aoFechar, aoFeito }: { id: string; r: AssinaturaResposta; a: AssinaturaCb; nome: string; aoFechar: () => void; aoFeito: (plano: string) => void }) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const planos = r.planos ?? [];
  const [planoId, setPlanoId] = useState(() => planos.find((p) => p.id !== a.plano.id)?.id ?? "");
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<Set<string>>(new Set());
  const [falha, setFalha] = useState<Falha | null>(null);
  const [enviando, setEnviando] = useState(false);
  const novo = planos.find((p) => p.id === planoId) ?? null;
  const ativas = r.pessoasAtivas;

  async function enviar() {
    setFalha(null);
    const e = new Set<string>();
    if (!novo || novo.id === a.plano.id) e.add("plano");
    if (!motivo.trim()) e.add("motivo");
    setErros(e);
    if (e.size) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const res = await chamarConsole(`/v1/clientes/${id}/assinatura/mudar-plano`, {
      corpo: { versao: a.versao, planoId, motivo: motivo.trim() },
    });
    setEnviando(false);
    if (!res.ok) {
      const campos = res.erro.detalhes?.campos;
      if (res.status === 422 && Array.isArray(campos) && campos.length) {
        setErros(new Set(campos.map(String)));
        return focarPrimeiroErro(corpo.current);
      }
      return setFalha(falhaDe(res));
    }
    aoFeito(novo!.nome);
  }

  const extraHoje = Math.max(0, ativas - a.pessoasIncluidas);
  return (
    <Janela id={`${ids}-j`} aberta aoFechar={aoFechar} sobretitulo={`Assinatura · ${nome}`} titulo="Mudar de plano" descricao={`${ids}-d`} aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar} data-foco={erros.size ? undefined : ""}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}>
            <Icone nome="planos" className="ico" />
            {enviando ? "Mudando…" : novo && novo.id !== a.plano.id ? `Mudar para ${novo.nome}` : "Mudar de plano"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id={`${ids}-d`}>A mudança vale na próxima fatura ainda não emitida, sem proporcional.</p>
        {erros.size ? (
          <Aviso tom="urgencia" titulo={faltaAcertar(erros.size)}>
            O plano não mudou.
          </Aviso>
        ) : falha ? (
          <Aviso tom="urgencia" titulo="Não deu para mudar o plano.">
            {falha.tipo === "conflito"
              ? `${falha.quem ?? "Outra pessoa"} mudou esta assinatura${falha.em ? ` às ${hora(falha.em)}` : ""}. Feche e confira antes de mudar.`
              : textoDoErro(falha.erro)}
          </Aviso>
        ) : null}
        {novo ? (
          <div className="cb-compara-planos" aria-label={`De ${a.plano.nome} para ${novo.nome}`}>
            <div>
              <span className="cb-peq">Hoje</span>
              <strong>{a.plano.nome}</strong>
              <span>
                {brl(a.precoCentavos ?? 0)} por mês · até {a.pessoasIncluidas} pessoas
              </span>
              <span className="cb-peq">
                {extraHoje && r.pessoaAMaisCentavos !== null
                  ? `com ${ativas} pessoas: ${brl((a.precoCentavos ?? 0) + extraHoje * r.pessoaAMaisCentavos)} sem desconto`
                  : "sem pessoa a mais"}
              </span>
            </div>
            <span className="cb-seta" aria-hidden="true">
              <Icone nome="seta" className="ico" />
            </span>
            <div className="cb-novo">
              <span className="cb-peq">Novo</span>
              <strong>{novo.nome}</strong>
              <span>
                {brl(novo.precoCentavos)} por mês · até {novo.pessoasIncluidas} pessoas
              </span>
              <span className="cb-peq">{ativas > novo.pessoasIncluidas ? `${ativas - novo.pessoasIncluidas} a mais` : "sem pessoa a mais"}</span>
            </div>
          </div>
        ) : null}
        <fieldset className="grupo-opcoes" aria-invalid={erros.has("plano") || undefined} aria-describedby={erros.has("plano") ? `${ids}-p-e` : undefined}>
          <legend>Plano novo</legend>
          {planos.map((p) => (
            <label className="opcao" key={p.id}>
              <input className="marcar" type="radio" name={`${ids}-plano`} checked={planoId === p.id} onChange={() => setPlanoId(p.id)}
                disabled={p.id === a.plano.id} data-foco={erros.has("plano") && p.id !== a.plano.id ? "" : undefined} />
              <span>
                {p.nome}
                <small>
                  {brl(p.precoCentavos)} por mês · até {p.pessoasIncluidas} pessoas{p.id === a.plano.id ? " · o plano de hoje" : ""}
                </small>
              </span>
            </label>
          ))}
          {erros.has("plano") ? <ErroCampo id={`${ids}-p-e`}>Escolha um plano diferente do de hoje.</ErroCampo> : null}
        </fieldset>
        {novo?.previa ? (
          <div>
            <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              Primeira fatura no {novo.nome}: {mesPorExtenso(novo.previa.competencia)}, vence em {dataBr(novo.previa.vencimento)}
            </p>
            <ul className="cb-conta">
              {novo.previa.itens.map((i, k) => (
                <li key={k}>
                  <span>
                    {i.tipo === "MENSALIDADE" ? `Mensalidade do ${novo.nome}` : i.tipo === "PESSOA_A_MAIS" ? `Pessoa a mais (${ativas} de ${novo.pessoasIncluidas})` : i.descricao}
                  </span>
                  <b>{brl(i.valorCentavos)}</b>
                </li>
              ))}
              <li className="cb-tot">
                <span>Total</span>
                <b>{brl(novo.previa.totalCentavos)}</b>
              </li>
            </ul>
          </div>
        ) : null}
        {novo ? (
          <p className="permissao">
            <Icone nome="ajuda" className="ico" />
            As faturas já emitidas não mudam. A assinatura guarda o preço de hoje do {novo.nome}, {brl(novo.precoCentavos)}.
          </p>
        ) : null}
        <div className="campo">
          <label htmlFor={`${ids}-m`}>Motivo</label>
          <textarea className="entrada" id={`${ids}-m`} rows={2} maxLength={MOTIVO_MAX} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            aria-required="true" aria-invalid={erros.has("motivo") || undefined} aria-describedby={descritoPor(erros.has("motivo") && `${ids}-m-e`, `${ids}-m-a`)} />
          {erros.has("motivo") ? <ErroCampo id={`${ids}-m-e`}>Escreva o motivo da mudança. Ele fica no histórico da assinatura.</ErroCampo> : null}
          <p className="ajuda" id={`${ids}-m-a`}>
            Obrigatório. Fica no histórico da assinatura.
          </p>
        </div>
      </div>
    </Janela>
  );
}

interface Formulario {
  planoId: string;
  dia: string;
  forma: FormaAssinatura;
  email: string;
  cnpj: string;
  pct: string;
  ate: string;
  motivo: string;
  parcelas: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

const UFS = Object.keys(UFS_BRASIL).sort();
const CAMPOS_ENDERECO = ["cep", "logradouro", "numero", "complemento", "bairro", "cidade", "uf"] as const;

function cepComHifen(cep: string): string {
  const n = cep.replace(/\D/g, "");
  return n.length === 8 ? `${n.slice(0, 5)}-${n.slice(5)}` : cep;
}

function formularioDe(r: AssinaturaResposta): Formulario {
  const a = r.assinatura;
  const proxima = a?.proxima?.competencia ?? proximaCompetencia(r.hoje);
  return {
    planoId: a?.plano.id ?? r.planos?.[0]?.id ?? "",
    dia: String(a?.diaVencimento ?? 10),
    forma: a?.forma ?? "PIX",
    email: a?.emailCobranca ?? r.emailSugerido ?? "",
    cnpj: formatarCnpj(a?.cnpjNota ?? r.cnpjSugerido ?? "") || "",
    pct: a?.desconto ? String(a.desconto.pct) : "",
    ate: a?.desconto?.ate ?? mesesDesde(proxima, 3)[2]!,
    motivo: a?.desconto?.motivo ?? "",
    parcelas: String(a?.parcelasPorCarne ?? 12),
    // O endereço de cobrança nasce da ficha (decisão 10 do desenho cobranca-pdfs); a ficha não tem o CEP.
    ...enderecoDe(a && !a.mesmoDaSede ? a.enderecoCobranca ?? null : null,
      a?.enderecoCobranca && !a.mesmoDaSede ? {} : { ...(r.enderecoSugerido ?? {}), ...Object.fromEntries(Object.entries(r.sede ?? {}).filter(([k, x]) => x && k !== "confira" && !r.sede?.confira)) }),
  };
}

function enderecoDe(e: AssinaturaCb["enderecoCobranca"], sugerido: Record<string, string | null | undefined>) {
  const x = (e ?? sugerido) as Record<string, string | null | undefined>;
  const t = (k: string) => x[k] ?? "";
  return { cep: cepComHifen(t("cep")), logradouro: t("logradouro"), numero: t("numero"), complemento: t("complemento"), bairro: t("bairro"), cidade: t("cidade"), uf: t("uf") };
}

/**
 * O endereço veio só da sugestão da ficha (sem CEP) e ninguém mexeu: não trava o salvar do resto
 * da assinatura; segue sem endereço, e a folha continua avisando que falta.
 */
function enderecoIntocado(v: Formulario, inicial: Formulario, temSalvo: boolean): boolean {
  return !temSalvo && !v.cep.trim() && CAMPOS_ENDERECO.every((k) => v[k] === inicial[k]);
}

/**
 * `endereco`: "enviar" o que está nos campos, "vazio" (sem endereço), "omitir" (fica o salvo) ou
 * "sede" ("O mesmo endereço da sede", PA-07: nada se guarda e o pagador usa a sede do dia).
 */
function corpoDe(v: Formulario, criar: boolean, endereco: "enviar" | "vazio" | "omitir" | "sede" = "enviar") {
  const pct = Number(v.pct.trim() || "0");
  return {
    ...(criar ? { planoId: v.planoId } : {}),
    diaVencimento: Number(v.dia),
    forma: v.forma,
    emailCobranca: v.email.trim(),
    cnpjNota: v.cnpj.replace(/\D/g, "") || null,
    desconto: v.pct.trim() && pct !== 0 ? { pct: Number.isInteger(pct) ? pct : -1, ate: v.ate, motivo: v.motivo.trim() } : null,
    parcelasPorCarne: v.forma === "CARNE" ? Number(v.parcelas) : null,
    ...(endereco === "omitir" ? {} : endereco === "sede" ? { mesmoDaSede: true }
      : { endereco: endereco === "vazio" ? null : Object.fromEntries(CAMPOS_ENDERECO.map((k) => [k, v[k].trim()])), ...(endereco === "enviar" ? { mesmoDaSede: false } : {}) }),
  };
}

const NOMES_CAMPOS: [keyof Formulario, string][] = [
  ["dia", "Dia de vencimento"],
  ["forma", "Forma de pagamento"],
  ["email", "E-mail de cobrança"],
  ["cnpj", "CNPJ de cobrança"],
  ["cep", "CEP"],
  ["logradouro", "Rua, avenida ou travessa"],
  ["numero", "Número"],
  ["complemento", "Complemento"],
  ["bairro", "Bairro"],
  ["cidade", "Cidade"],
  ["uf", "UF"],
  ["pct", "Desconto"],
  ["ate", "Desconto até"],
  ["motivo", "Motivo do desconto"],
];

function mostrar(k: keyof Formulario, v: Formulario): string {
  if (k === "forma") return FORMAS_ASSINATURA[v.forma];
  if (k === "ate") return mesPorExtenso(v.ate);
  if (k === "pct") return v.pct ? `${v.pct}%` : "Sem desconto";
  return v[k] || "—";
}

function FormAssinatura({ id, r, nome, socio, aoCancelar, aoSalvar }: { id: string; r: AssinaturaResposta; nome: string; socio: string | null; aoCancelar: () => void; aoSalvar: (preparada: boolean) => void }) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const a = r.assinatura;
  const criar = !a;
  const [v, setV] = useState<Formulario>(() => formularioDe(r));
  const [inicial] = useState<Formulario>(() => formularioDe(r));
  // PA-07: "O mesmo endereço da sede" vem marcado, salvo quando já se guardou outro endereço.
  const comSede = r.sede !== undefined;
  const [mesmo, setMesmo] = useState(() => comSede && (a ? a.mesmoDaSede !== false : true));
  const sede = sedeParaCobranca(r.sede);
  const intocado = enderecoIntocado(v, inicial, !!a?.enderecoCobranca && !a.mesmoDaSede);
  const [versao, setVersao] = useState(a?.versao ?? null);
  const [erros, setErros] = useState<Set<string>>(new Set());
  const [falha, setFalha] = useState<{ tipo: "erro"; erro: ErroApi } | null>(null);
  const [conflito, setConflito] = useState<{ quem: string | null; em: string | null; salvo: Formulario } | null>(null);
  const [confirmarCarne, setConfirmarCarne] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const muda = (k: keyof Formulario) => (valor: string) => setV((x) => ({ ...x, [k]: valor }));
  const carneEmUso = a?.forma === "CARNE" && (a.carne?.emUso.length ?? 0) > 0;
  const proxima = a?.proxima?.competencia ?? proximaCompetencia(r.hoje);
  const meses = mesesDesde(proxima, 24);
  if (!meses.includes(v.ate)) meses.unshift(v.ate);
  const dias = DIAS.includes(Number(v.dia)) ? DIAS : [...DIAS, Number(v.dia)].sort((x, y) => x - y);

  function conferir(): Set<string> {
    const e = new Set<string>();
    if (criar && !v.planoId) e.add("plano");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) e.add("emailCobranca");
    const cnpj = v.cnpj.replace(/\D/g, "");
    if (cnpj && cnpj.length !== 14) e.add("cnpjNota");
    // Endereço de cobrança: vazio vale (a fatura sai só com o Pix); começou, precisa estar inteiro.
    if (r.valores && !mesmo && !intocado && CAMPOS_ENDERECO.some((k) => v[k].trim())) {
      if (!/^\d{5}-?\d{3}$/.test(v.cep.trim())) e.add("cepCobranca");
      if (v.logradouro.trim().length < 2) e.add("logradouroCobranca");
      if (!v.numero.trim()) e.add("numeroCobranca");
      if (v.bairro.trim().length < 2) e.add("bairroCobranca");
      if (v.cidade.trim().length < 2) e.add("cidadeCobranca");
      if (!v.uf) e.add("ufCobranca");
    }
    if (v.pct.trim() && v.pct.trim() !== "0") {
      const n = Number(v.pct.trim());
      if (!Number.isInteger(n) || n < 1 || n > 100) e.add("descontoPct");
      if (!v.motivo.trim()) e.add("descontoMotivo");
    }
    return e;
  }

  async function enviar(confirmado = false, versaoUsada = versao) {
    setFalha(null);
    const e = conferir();
    setErros(e);
    if (e.size) return focarPrimeiroErro(corpo.current);
    if (!confirmado && carneEmUso && (Number(v.dia) !== a!.diaVencimento || v.forma !== a!.forma)) return setConfirmarCarne(true);
    setConfirmarCarne(false);
    setEnviando(true);
    const res = await chamarConsole(`/v1/clientes/${id}/assinatura`, { metodo: "PUT", corpo: { ...(versaoUsada ? { versao: versaoUsada } : {}), ...corpoDe(v, criar, !r.valores ? "omitir" : mesmo ? "sede" : intocado ? (comSede ? "enviar" : "vazio") : "enviar") } });
    setEnviando(false);
    if (!res.ok) {
      const campos = res.erro.detalhes?.campos;
      if (res.status === 422 && Array.isArray(campos) && campos.length) {
        setErros(new Set(campos.map(String)));
        return focarPrimeiroErro(corpo.current);
      }
      if (res.status === 409) {
        const d = res.erro.detalhes ?? {};
        const atual = await chamarConsole<AssinaturaResposta>(`/v1/clientes/${id}/assinatura`);
        if (atual.ok && atual.dados.assinatura) {
          setVersao(atual.dados.assinatura.versao);
          setConflito({ quem: typeof d.quem === "string" ? d.quem : null, em: typeof d.em === "string" ? d.em : null, salvo: formularioDe(atual.dados) });
          return;
        }
      }
      return setFalha({ tipo: "erro", erro: res.erro });
    }
    aoSalvar(criar);
  }

  const mudaram = conflito ? NOMES_CAMPOS.filter(([k]) => conflito.salvo[k] !== v[k]) : [];
  const erro = (campo: string, texto: string) =>
    erros.has(campo) ? <ErroCampo id={`${ids}-${campo}-e`}>{texto}</ErroCampo> : null;
  const inv = (campo: string) => erros.has(campo) || undefined;
  const digitosCep = v.cep.replace(/\D/g, "").length;
  const campoEnd = (k: (typeof CAMPOS_ENDERECO)[number], rotulo: string, classe: string, auto: string, texto: string | null, ajuda?: string) => {
    const c = `${k}Cobranca`;
    const desc = descritoPor(erros.has(c) && `${ids}-${c}-e`, ajuda ? `${ids}-${k}-a` : false);
    return (
      <div className={`campo ${classe}`}>
        <label htmlFor={`${ids}-${k}`}>
          {rotulo}
          {k === "complemento" ? <span className="opcional"> (opcional)</span> : null}
          {conflito && conflito.salvo[k] !== v[k] ? <span className="mudou">Mudou</span> : null}
        </label>
        {k === "uf" ? (
          <select className="entrada" id={`${ids}-${k}`} autoComplete={auto} value={v.uf} onChange={(e) => muda("uf")(e.target.value)} aria-invalid={inv(c)} aria-describedby={desc}>
            <option value="">Escolha</option>
            {UFS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        ) : (
          <input className="entrada" id={`${ids}-${k}`} type="text" autoComplete={auto} inputMode={k === "cep" ? "numeric" : undefined} value={v[k]}
            onChange={(e) => muda(k)(e.target.value)} aria-invalid={inv(c)} aria-describedby={desc} />
        )}
        {texto ? erro(c, texto) : null}
        {ajuda ? (
          <p className="ajuda" id={`${ids}-${k}-a`}>
            {ajuda}
          </p>
        ) : null}
      </div>
    );
  };

  return (
    <section className="folha" aria-labelledby={`${ids}-t`} style={{ overflow: "hidden" }}>
      <div className="cb-ass-topo">
        <div>
          <h2 id={`${ids}-t`}>{criar ? "Preparar a assinatura" : "Editar a assinatura"}</h2>
          <p className="sub">Os campos sem “(opcional)” são obrigatórios.</p>
        </div>
      </div>
      <div ref={corpo}>
        {erros.size ? (
          <div style={{ padding: "0 24px 16px" }}>
            <Aviso tom="urgencia" titulo={faltaAcertar(erros.size)}>
              Nada foi salvo.
            </Aviso>
          </div>
        ) : falha ? (
          <div style={{ padding: "0 24px 16px" }}>
            <Aviso tom="urgencia" titulo="Não deu para salvar.">
              {textoDoErro(falha.erro)}
            </Aviso>
          </div>
        ) : conflito ? (
          <div style={{ padding: "0 24px 16px" }}>
            <div className="aviso aviso-urgencia" role="alert">
              <Icone nome="alerta" className="ico" />
              <div>
                <strong className="aviso-titulo">
                  {conflito.quem ?? "Outra pessoa"} salvou esta assinatura{conflito.em ? ` às ${hora(conflito.em)}` : ""}, enquanto você editava.
                </strong>
                <p>
                  Nada do que você escreveu se perdeu.{" "}
                  {mudaram.length ? `Compare ${mudaram.length === 1 ? "o campo que mudou" : `os ${mudaram.length} campos que mudaram`} e escolha qual versão fica.` : "Escolha qual versão fica."}
                </p>
                <div className="aviso-acoes">
                  <button className="btn btn-pri" type="button" onClick={() => { setConflito(null); void enviar(false, versao); }}>
                    <Icone nome="check" className="ico" />
                    Salvar a minha versão
                  </button>
                  <button className="btn btn-sec" type="button" onClick={() => { setV(conflito.salvo); setConflito(null); }}>
                    Ficar com a versão salva
                  </button>
                </div>
                {mudaram.length ? (
                  <table className="comparar">
                    <caption className="sr">Campos que mudaram</caption>
                    <thead>
                      <tr>
                        <th scope="col">Campo</th>
                        <th scope="col">Salvo agora{conflito.quem ? `, por ${conflito.quem.split(" ")[0]}` : ""}</th>
                        <th scope="col">O que você escreveu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mudaram.map(([k, n]) => (
                        <tr key={k}>
                          <th scope="row">{n}</th>
                          <td>{mostrar(k, conflito.salvo)}</td>
                          <td>{mostrar(k, v)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        <form className="form-folha" noValidate onSubmit={(e) => { e.preventDefault(); void enviar(); }}>
          {criar ? (
            <fieldset className="grupo-opcoes c6" aria-invalid={inv("plano")} aria-describedby={erros.has("plano") ? `${ids}-plano-e` : undefined}>
              <legend>Plano</legend>
              {(r.planos ?? []).map((p) => (
                <label className="opcao" key={p.id}>
                  <input className="marcar" type="radio" name={`${ids}-plano`} checked={v.planoId === p.id} onChange={() => muda("planoId")(p.id)} />
                  <span>
                    {p.nome}
                    <small>
                      {brl(p.precoCentavos)} por mês · até {p.pessoasIncluidas} pessoas
                    </small>
                  </span>
                </label>
              ))}
              {erro("plano", "Escolha o plano.")}
            </fieldset>
          ) : (
            <div className="campo c6">
              <span style={{ fontSize: 13, fontWeight: 500 }}>Plano</span>
              <p style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span className="cb-plano-nome">{a!.plano.nome}</span>
                <span className="cb-peq">
                  {brl(a!.precoCentavos ?? 0)} por mês, até {a!.pessoasIncluidas} pessoas · para mudar, use “Mudar de plano”
                </span>
              </p>
            </div>
          )}
          <div className="campo c3">
            <label htmlFor={`${ids}-dia`}>
              Dia de vencimento
              {conflito && conflito.salvo.dia !== v.dia ? <span className="mudou">Mudou</span> : null}
            </label>
            <select className="entrada" id={`${ids}-dia`} value={v.dia} onChange={(e) => muda("dia")(e.target.value)} aria-invalid={inv("diaVencimento")}
              aria-describedby={descritoPor(erros.has("diaVencimento") && `${ids}-diaVencimento-e`, `${ids}-dia-a`)}>
              {dias.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            {erro("diaVencimento", "Escolha o dia de vencimento.")}
            <p className="ajuda" id={`${ids}-dia-a`}>
              {carneEmUso ? "Com carnê, mudar o dia gera um carnê novo." : criar ? "As faturas vencem neste dia, todo mês." : "Muda a partir da próxima fatura."}
            </p>
          </div>
          <fieldset className="grupo-opcoes c3" aria-invalid={inv("forma")}>
            <legend>
              Forma de pagamento
              {conflito && conflito.salvo.forma !== v.forma ? <span className="mudou">Mudou</span> : null}
            </legend>
            {(Object.keys(FORMAS_ASSINATURA) as FormaAssinatura[]).map((k) => (
              <label className="opcao" key={k}>
                <input className="marcar" type="radio" name={`${ids}-forma`} checked={v.forma === k} onChange={() => muda("forma")(k)} />
                <span>
                  {FORMAS_ASSINATURA[k]}
                  <small>{AJUDA_FORMA[k]}</small>
                </span>
              </label>
            ))}
          </fieldset>
          {v.forma === "CARNE" ? (
            <>
              <div className="campo c3">
                <label htmlFor={`${ids}-parc`}>Parcelas por carnê</label>
                <select className="entrada" id={`${ids}-parc`} value={v.parcelas} onChange={(e) => muda("parcelas")(e.target.value)} aria-invalid={inv("parcelasPorCarne")}
                  aria-describedby={`${ids}-parc-a`}>
                  {Array.from({ length: 12 }, (_, i) => 12 - i).map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <p className="ajuda" id={`${ids}-parc-a`}>
                  Uma por mês. O próximo carnê sai 20 dias antes da última parcela.
                </p>
              </div>
              {carneEmUso ? (
                <div className="campo c3">
                  <span style={{ fontSize: 13, fontWeight: 500 }}>Carnê em uso</span>
                  <p style={{ margin: "6px 0 0" }}>Carnê {a!.carne!.emUso[0]!.numero}</p>
                </div>
              ) : null}
            </>
          ) : null}
          <div className="campo c3">
            <label htmlFor={`${ids}-email`}>E-mail de cobrança</label>
            <input className="entrada" id={`${ids}-email`} type="email" autoComplete="off" value={v.email} onChange={(e) => muda("email")(e.target.value)}
              aria-invalid={inv("emailCobranca")} aria-describedby={descritoPor(erros.has("emailCobranca") && `${ids}-emailCobranca-e`, `${ids}-email-a`)} />
            {erro("emailCobranca", "Confira o e-mail: ele precisa de um @ e do domínio, como em @escritorio.com.br.")}
            <p className="ajuda" id={`${ids}-email-a`}>
              {v.forma === "CARNE" ? "O carnê, as faturas" : "A fatura"} e os lembretes vão para este e-mail{socio ? `, com cópia para ${socio}` : ", com cópia para o sócio dono"}.
            </p>
          </div>
          <div className="campo c3">
            <label htmlFor={`${ids}-cnpj`}>
              CNPJ de cobrança <span className="opcional">(opcional)</span>
            </label>
            <input className="entrada" id={`${ids}-cnpj`} inputMode="numeric" autoComplete="off" value={v.cnpj} onChange={(e) => muda("cnpj")(e.target.value)}
              aria-invalid={inv("cnpjNota")} aria-describedby={descritoPor(erros.has("cnpjNota") && `${ids}-cnpjNota-e`, `${ids}-cnpj-a`)} />
            {erro("cnpjNota", "O CNPJ tem 14 dígitos. Confira o número no cartão do CNPJ.")}
            <p className="ajuda" id={`${ids}-cnpj-a`}>
              O mesmo da ficha. Mude só se a cobrança sai em outro CNPJ.
            </p>
          </div>
          {r.valores ? (
            <fieldset className="end-grupo" aria-describedby={`${ids}-end-a`}>
              <legend>Endereço de cobrança</legend>
              <p className="ajuda" id={`${ids}-end-a`}>
                Vai no boleto como endereço do pagador; sem ele, o Banco Inter não registra o boleto e a fatura sai só com o Pix. Veio da ficha do escritório: mude só se a cobrança é em
                outro endereço.
              </p>
              {comSede ? (
                <div className="dd-mesmo">
                  <label className="opcao">
                    <input className="marcar" type="checkbox" checked={mesmo} onChange={(e) => setMesmo(e.target.checked)} aria-describedby={mesmo ? `${ids}-mesmo-t` : undefined} />
                    <span>
                      O mesmo endereço da sede
                      <small>Muda junto se a sede mudar, na ficha ou no Portal.</small>
                    </span>
                  </label>
                  {mesmo ? (
                    <p className="dd-mesmo-txt" id={`${ids}-mesmo-t`}>
                      {sede ? (
                        <>
                          <b>{enderecoEmLinha(sede)}</b> · da ficha do escritório
                        </>
                      ) : (
                        <>
                          <b>A sede ainda não está completa na ficha.</b> Até completar o CEP, a rua, o número e o bairro, o boleto não registra e a fatura sai só com o Pix.
                        </>
                      )}
                    </p>
                  ) : null}
                </div>
              ) : null}
              {mesmo ? null : (
              <div className="end-grade">
                {campoEnd("cep", "CEP", "e2", "postal-code",
                  digitosCep && digitosCep !== 8 ? `O CEP tem 8 números; aqui há ${digitosCep}. Confira, como em 50050-000.` : "Escreva o CEP, com 8 números, como em 50050-000.",
                  "Só números ou com hífen.")}
                {campoEnd("logradouro", "Rua, avenida ou travessa", "e4", "address-line1", "Escreva a rua, avenida ou travessa.")}
                {campoEnd("numero", "Número", "e2", "off", "Escreva o número. Se não houver, escreva S/N.")}
                {campoEnd("complemento", "Complemento", "e2", "address-line2", "O complemento cabe em até 60 letras.")}
                {campoEnd("bairro", "Bairro", "e2", "address-level3", "Escreva o bairro.")}
                {campoEnd("cidade", "Cidade", "e4", "address-level2", "Escreva a cidade.")}
                {campoEnd("uf", "UF", "e2", "address-level1", "Escolha a UF.")}
              </div>
              )}
            </fieldset>
          ) : null}
          <div className="campo c2">
            <label htmlFor={`${ids}-pct`}>
              Desconto na mensalidade (%) <span className="opcional">(opcional)</span>
            </label>
            <input className="entrada" id={`${ids}-pct`} inputMode="numeric" autoComplete="off" value={v.pct} onChange={(e) => muda("pct")(e.target.value)}
              aria-invalid={inv("descontoPct")} aria-describedby={descritoPor(erros.has("descontoPct") && `${ids}-descontoPct-e`, `${ids}-pct-a`)} />
            {erro("descontoPct", "O desconto é um número inteiro de 1 a 100.")}
            <p className="ajuda" id={`${ids}-pct-a`}>
              De 0 a 100. Use 0 para sem desconto.
            </p>
          </div>
          <div className="campo c2">
            <label htmlFor={`${ids}-ate`}>Até a fatura de</label>
            <select className="entrada" id={`${ids}-ate`} value={v.ate} onChange={(e) => muda("ate")(e.target.value)} aria-invalid={inv("descontoAte")}>
              {meses.map((m) => (
                <option key={m} value={m}>
                  {mesPorExtenso(m)}
                </option>
              ))}
            </select>
          </div>
          <div className="campo c2">
            <label htmlFor={`${ids}-ini`}>Início da cobrança</label>
            <input className="entrada" id={`${ids}-ini`} readOnly value={a?.inicioCobranca ? dataBr(a.inicioCobranca) : "Quando passar para Ativo"} aria-describedby={`${ids}-ini-a`} />
            <p className="ajuda" id={`${ids}-ini-a`}>
              {a?.inicioCobranca ? "Não muda depois da primeira fatura." : "Nenhuma fatura sai antes disso."}
            </p>
          </div>
          {v.pct.trim() && v.pct.trim() !== "0" ? (
            <div className="campo c6">
              <label htmlFor={`${ids}-mot`}>Motivo do desconto</label>
              <textarea className="entrada" id={`${ids}-mot`} rows={2} maxLength={MOTIVO_MAX} value={v.motivo} onChange={(e) => muda("motivo")(e.target.value)}
                aria-invalid={inv("descontoMotivo")} aria-describedby={descritoPor(erros.has("descontoMotivo") && `${ids}-descontoMotivo-e`, `${ids}-mot-a`)} />
              {erro("descontoMotivo", "Escreva o motivo do desconto. Ele fica no histórico da assinatura.")}
              <p className="ajuda" id={`${ids}-mot-a`}>
                Obrigatório quando há desconto. Fica no histórico da assinatura.
              </p>
            </div>
          ) : null}
          {carneEmUso ? (
            <div className="c6">
              <Aviso tom="info" titulo="Com o carnê em uso, mudar o dia, a forma ou o valor gera um carnê novo.">
                Ele começa na próxima parcela ainda sem fatura. As parcelas seguintes do carnê de hoje são canceladas com o motivo, nunca apagadas. As faturas já emitidas
                continuam valendo. Ao salvar, você confirma numa janela.
              </Aviso>
            </div>
          ) : null}
          <div className="form-pe">
            <p className="esq-pe">
              {criar
                ? r.estagio === "IMPLANTACAO"
                  ? "Nenhuma fatura sai antes de o cliente passar para Ativo."
                  : "Com o cliente já Ativo, a cobrança começa hoje."
                : carneEmUso
                  ? "Mudar só o e-mail ou o CNPJ não mexe no carnê."
                  : `Vale a partir da próxima fatura ainda não emitida (${mesPorExtenso(proxima)}).`}
            </p>
            <button className="btn btn-fantasma" type="button" onClick={aoCancelar} disabled={enviando}>
              Cancelar
            </button>
            <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}>
              <Icone nome="check" className="ico" />
              {enviando ? "Salvando…" : criar ? "Preparar a assinatura" : "Salvar a assinatura"}
            </button>
          </div>
        </form>
      </div>
      {confirmarCarne ? (
        <Janela id={`${ids}-cc`} aberta alerta aoFechar={() => setConfirmarCarne(false)} sobretitulo={`Assinatura · ${nome}`} titulo="Gerar um carnê novo ao salvar?"
          descricao={`${ids}-cc-d`} aoEnviar={() => void enviar(true)}
          pe={
            <>
              <button className="btn btn-fantasma" type="button" onClick={() => setConfirmarCarne(false)} data-foco="">
                Cancelar
              </button>
              <button className="btn btn-pri" type="submit">
                <Icone nome="carne" className="ico" />
                Salvar e trocar o carnê
              </button>
            </>
          }>
          <p id={`${ids}-cc-d`}>
            {v.forma !== "CARNE"
              ? "A forma deixa de ser Carnê: as parcelas ainda sem fatura são canceladas, com o motivo, e ficam na assinatura como Canceladas."
              : "O dia de vencimento mudou: sai um carnê novo a partir da próxima parcela ainda sem fatura. As parcelas seguintes do carnê de hoje são canceladas, nunca apagadas."}
          </p>
        </Janela>
      ) : null}
    </section>
  );
}

function MiniHistorico({ r }: { r: AssinaturaResposta }) {
  const lista = r.assinatura?.mudancas ?? [];
  if (!lista.length) return null;
  return (
    <div className="cb-mini-hist">
      <h3>Mudanças da assinatura</h3>
      <ul>
        {lista.map((e) => {
          const t = textoEvento(e);
          return (
            <li key={e.id}>
              <span>{dataBr(diaBrasilia(e.em))}</span>
              {t.quem} {t.acao}
              {t.detalhe ? ` · ${t.detalhe}` : ""}
              {t.motivo ? (
                <>
                  {" · "}
                  <span className="cb-motivo" style={{ display: "inline", border: 0, padding: 0 }}>
                    “{t.motivo}”
                  </span>
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Dados({ r, socio, aoPreencher }: { r: AssinaturaResposta; socio: string | null; aoPreencher?: () => void }) {
  const a = r.assinatura!;
  const semEndereco = r.valores && !a.enderecoCobranca;
  const p = textoPessoas(r.pessoasAtivas, a.pessoasIncluidas);
  const carne = a.carne?.emUso[0];
  return (
    <dl className="dados-ficha">
      <div>
        <dt>Plano</dt>
        <dd>
          <span className="cb-plano-nome">{a.plano.nome}</span>
          <span className="selo selo-neutro">
            até {a.pessoasIncluidas} pessoas{a.plano.arquivado ? " · arquivado" : ""}
          </span>
        </dd>
      </div>
      {r.valores ? (
        <div>
          <dt>Mensalidade</dt>
          <dd>
            {brl(a.precoCentavos ?? 0)} por mês
            {a.precoDoPlanoHojeCentavos !== undefined && a.precoDoPlanoHojeCentavos !== a.precoCentavos ? <span className="cb-peq">preço de quando assinou</span> : null}
          </dd>
        </div>
      ) : null}
      <div>
        <dt>Pessoas ativas hoje</dt>
        <dd>
          {p.conta}
          {p.extra ? (
            <span className="cb-peq">
              {p.extra}
              {r.valores && r.pessoaAMaisCentavos !== null ? `, ${brl((r.pessoasAtivas - a.pessoasIncluidas) * r.pessoaAMaisCentavos)} por mês` : ""}
            </span>
          ) : null}
        </dd>
      </div>
      <div>
        <dt>Dia de vencimento</dt>
        <dd>{r.estagio === "ENCERRADO" ? `Era todo dia ${a.diaVencimento}` : `Todo dia ${a.diaVencimento}`}</dd>
      </div>
      {r.valores ? (
        <div>
          <dt>Forma de pagamento</dt>
          <dd>
            {semEndereco && a.forma === "PIX" ? (
              <>
                Só Pix por enquanto <span className="cb-peq">o boleto volta quando o endereço estiver preenchido</span>
              </>
            ) : (
              <>
            {FORMAS_ASSINATURA[a.forma]}
            <span className="cb-peq">
              {a.forma === "CARNE" && carne
                ? `${carne.parcelas} parcelas, de ${mesPorExtenso(carne.primeiraCompetencia)} a ${mesPorExtenso(carne.ultimaCompetencia)}`
                : AJUDA_FORMA[a.forma].replace(/^O /, "o ")}
            </span>
              </>
            )}
          </dd>
        </div>
      ) : null}
      <div>
        <dt>Início da cobrança</dt>
        <dd>
          {a.inicioCobranca ? (
            <>
              {dataBr(a.inicioCobranca)} <span className="cb-peq">quando passou para Ativo</span>
            </>
          ) : (
            "Quando passar para Ativo"
          )}
        </dd>
      </div>
      {r.valores ? (
        <>
          <div className="inteira">
            <dt>E-mail de cobrança</dt>
            <dd>
              {a.emailCobranca}
              {socio ? <span className="cb-peq">com cópia para {socio}, sócio dono</span> : null}
            </dd>
          </div>
          <div className="inteira">
            <dt>Endereço de cobrança</dt>
            {a.enderecoCobranca ? (
              <dd>
                {enderecoEmLinha(a.enderecoCobranca)} <span className="cb-peq">{a.mesmoDaSede ? "o mesmo da sede, " : ""}vai no boleto como endereço do pagador</span>
              </dd>
            ) : (
              <dd className="end-falta">
                <span className="selo selo-atencao">
                  <Icone nome="alerta" className="ico ico-s" />
                  Falta o endereço
                </span>
                {aoPreencher ? (
                  <button className="end-link" type="button" onClick={aoPreencher}>
                    Preencher o endereço
                    <Icone nome="dir" className="ico ico-s" />
                  </button>
                ) : null}
                <span className="cb-peq">Sem ele o boleto não sai, só o Pix.{r.fichaTemEndereco ? " A ficha tem a rua, mas não tem o CEP." : ""}</span>
              </dd>
            )}
          </div>
          <div>
            <dt>CNPJ de cobrança</dt>
            <dd>
              <span className="num">{a.cnpjNota ? formatarCnpj(a.cnpjNota) : "Não informado"}</span>
            </dd>
          </div>
          <div>
            <dt>Desconto</dt>
            <dd>
              {a.desconto ? (
                <>
                  {a.desconto.pct}% na mensalidade <span className="cb-peq">{textoDesconto(a.desconto.ate, a.proxima?.competencia)}</span>
                </>
              ) : (
                "Sem desconto"
              )}
            </dd>
          </div>
          {a.desconto?.motivo ? (
            <div className="inteira">
              <dt>Motivo do desconto</dt>
              <dd>
                <span className="cb-motivo" style={{ margin: 0 }}>
                  “{a.desconto.motivo}”
                </span>
              </dd>
            </div>
          ) : null}
        </>
      ) : null}
    </dl>
  );
}

type JanelaAberta = "plano" | "consulta" | "devolver" | "carne" | null;

export function AbaAssinatura({ id, nome, socio, consultaAoAbrir, aoMudarAcesso }: {
  id: string;
  nome: string;
  socio: string | null;
  /** Abrir já a janela de só consulta (atalho da fatura em atraso). */
  consultaAoAbrir?: boolean;
  /** O Portal passou para só consulta ou voltou: a ficha atualiza a faixa. */
  aoMudarAcesso?: () => void;
}) {
  const ids = useId();
  const [r, setR] = useState<AssinaturaResposta | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [editando, setEditando] = useState(false);
  const [janela, setJanela] = useState<JanelaAberta>(null);
  const [feito, setFeito] = useState<{ titulo: string; texto: string } | null>(null);
  const doc = useBaixarDoc((caminho) => chamarConsole<{ url: string }>(caminho));
  const abriuConsulta = useRef(false);

  const carregar = useCallback(async () => {
    setErro(null);
    const res = await chamarConsole<AssinaturaResposta>(`/v1/clientes/${id}/assinatura`);
    if (res.ok) setR(res.dados);
    else if (res.status !== 401) setErro(res.erro);
  }, [id]);
  const carregou = useRef(false);
  useEffect(() => {
    if (carregou.current) return;
    carregou.current = true;
    void carregar();
  }, [carregar]);
  useEffect(() => {
    if (!consultaAoAbrir || abriuConsulta.current || !r?.assinatura?.proporConsulta || !r.permissoes.soConsulta) return;
    abriuConsulta.current = true;
    setJanela("consulta");
  }, [consultaAoAbrir, r]);

  if (erro) {
    return <ErroAoCarregar oque="a assinatura" aoTentar={() => void carregar()} texto="O servidor não respondeu. Nada do que estava salvo se perdeu. Tente de novo em instantes." />;
  }
  if (!r) return <Carregando rotulo="Carregando a assinatura…" linhas={4} />;

  const a = r.assinatura;
  const encerrado = r.estagio === "ENCERRADO" || !["ABERTO", "MARCADO"].includes(r.contrato);
  const podeEditar = r.valores && r.permissoes.editar && !encerrado;
  const carneEmUso = a?.carne?.emUso[0] ?? null;
  const fechar = () => setJanela(null);
  const pronto = (titulo: string, texto: string, acesso = false) => {
    setJanela(null);
    setEditando(false);
    setFeito({ titulo, texto });
    void carregar();
    if (acesso) aoMudarAcesso?.();
  };

  const lateral = (
    <aside className="col" aria-label="Situação da cobrança">
      <Situacao r={r} />
      <ComoFunciona carne={a?.forma === "CARNE"} />
    </aside>
  );

  if (!a && !editando) {
    return (
      <div className="grade">
        <div className="col">
          <section className="folha" aria-labelledby={`${ids}-t`} style={{ overflow: "hidden" }}>
            <div className="cb-ass-topo">
              <div>
                <h2 id={`${ids}-t`}>Assinatura</h2>
                <p className="sub">Ainda não começou.</p>
              </div>
            </div>
            <div className="estado sem-moldura" role="status" style={{ paddingTop: 12 }}>
              <span className="icone-estado">
                <Icone nome="fatura" className="ico" />
              </span>
              <h3>Sem assinatura ainda</h3>
              <p>
                {r.estagio === "IMPLANTACAO"
                  ? `A cobrança começa quando a ${nome} passar para Ativo. Dá para deixar o plano, o dia e o desconto escolhidos agora; nenhuma fatura sai antes disso.`
                  : encerrado
                    ? "O contrato terminou sem assinatura. Nenhuma fatura foi emitida."
                    : "Escolha o plano, o dia e a forma. Com o cliente já Ativo, a cobrança começa ao salvar."}
              </p>
              {podeEditar && (r.planos?.length ?? 0) > 0 ? (
                <div className="acoes">
                  <button className="btn btn-pri" type="button" onClick={() => { setFeito(null); setEditando(true); }}>
                    <Icone nome="planos" className="ico" />
                    Preparar a assinatura
                  </button>
                </div>
              ) : podeEditar ? (
                <p className="permissao" style={{ justifyContent: "center" }}>
                  <Icone nome="ajuda" className="ico" />
                  Ainda não há plano para assinar. Crie um em Cobrança › Planos.
                </p>
              ) : !encerrado ? (
                <p className="permissao" style={{ justifyContent: "center" }}>
                  <Icone nome="cadeado" className="ico" />
                  Quem prepara a assinatura é a Administração ou o Financeiro.
                </p>
              ) : null}
            </div>
          </section>
        </div>
        {lateral}
      </div>
    );
  }

  if (editando) {
    return (
      <div className="grade">
        <div className="col">
          <FormAssinatura id={id} r={r} nome={nome} socio={socio} aoCancelar={() => setEditando(false)}
            aoSalvar={(preparada) =>
              pronto(preparada ? "Assinatura preparada." : "Assinatura salva.", preparada
                ? r.estagio === "IMPLANTACAO" ? "Nenhuma fatura sai antes de o cliente passar para Ativo." : "A cobrança começou. A primeira fatura já está em Cobrança."
                : "As mudanças valem a partir da próxima fatura ainda não emitida. Ficou no histórico.")} />
          {carneEmUso ? <FolhaCarne carne={carneEmUso} rodape="Cada parcela é a fatura do mês, com o Pix e o boleto da página do carnê." /> : null}
        </div>
        {lateral}
      </div>
    );
  }

  const s = a!;
  const dias = s.atrasoDias ?? 0;
  const abertas = s.abertas;
  const valorMudou = carneEmUso && a!.carne?.valorHojeCentavos !== null && a!.carne?.valorHojeCentavos !== undefined && a!.carne.valorHojeCentavos !== carneEmUso.valorParcelaCentavos;

  return (
    <>
      {s.situacao === "SO_CONSULTA" ? (
        <section className="cb-atraso" aria-labelledby={`${ids}-atr`}>
          <p className="cb-dias" aria-hidden="true">
            <b>{dias}</b>
            <small>{dias === 1 ? "dia" : "dias"}</small>
          </p>
          <div className="cb-txt">
            <p className="sobretitulo">Portal só para consulta</p>
            <h2 id={`${ids}-atr`}>
              A equipe da {nome} só consulta, desde {diaBrasilia(s.soConsultaDesde!) === r.hoje ? "hoje" : dataBr(s.soConsultaDesde!)}
            </h2>
            <p>
              Todos veem tudo e o sócio dono baixa os dados, mas ninguém cria nem muda nada.{" "}
              {abertas ? (
                <>
                  Quando {abertas.faturas === 1 ? "a fatura em atraso" : `as ${abertas.faturas} faturas em atraso`} (<b>{brl(abertas.totalCentavos)}</b>){" "}
                  {abertas.faturas === 1 ? "for paga" : "forem pagas"},{" "}
                </>
              ) : (
                "Quando as faturas em atraso forem pagas, "
              )}
              o Portal volta ao normal sozinho. <b>Nenhum dado foi apagado.</b>
            </p>
            <p className="sr">{dias} dias em atraso.</p>
          </div>
          <div className="cb-botoes">
            {r.permissoes.soConsulta ? (
              <>
                <button className="btn btn-sec" type="button" onClick={() => { setFeito(null); setJanela("devolver"); }}>
                  <Icone nome="abrir" className="ico" />
                  Devolver o acesso agora
                </button>
                <p className="cb-peq">Antes do pagamento, com motivo. Por exemplo, se o sócio mandou o comprovante.</p>
              </>
            ) : (
              <p className="permissao">
                <Icone nome="cadeado" className="ico" />
                Quem devolve o acesso antes do pagamento é a Administração.
              </p>
            )}
          </div>
        </section>
      ) : s.situacao === "EM_ATRASO" ? (
        <section className={dias >= 30 ? "cb-atraso" : "cb-atraso cb-ate30"} aria-labelledby={`${ids}-atr`}>
          <p className="cb-dias" aria-hidden="true">
            <b>{dias}</b>
            <small>{dias === 1 ? "dia" : "dias"}</small>
          </p>
          <div className="cb-txt">
            <p className="sobretitulo">{dias >= 30 ? "Em atraso há mais de 30 dias" : "Em atraso"}</p>
            <h2 id={`${ids}-atr`}>
              {abertas && abertas.faturas > 1 ? `${abertas.faturas} faturas em aberto` : "Uma fatura em aberto"}
            </h2>
            <p>
              {r.valores && abertas ? (
                <>
                  Total em atraso: <b>{brl(abertas.totalCentavos)}</b>.{" "}
                </>
              ) : null}
              {encerrado
                ? "O contrato terminou: a régua parou e os lembretes agora são manuais. Ainda dá para registrar o pagamento ou cancelar a fatura, com motivo."
                : s.proporConsulta
                  ? "O Portal mostra um aviso ao sócio dono. Passou de 30 dias: a Administração decide se o Portal fica só para consulta até o pagamento. "
                  : s.avisoPortal
                    ? "Desde o 7º dia, o Portal mostra um aviso ao sócio dono. "
                    : "A régua manda os lembretes por e-mail ao sócio dono. "}
              {!encerrado ? (
                <>
                  <b>Nenhum dado é apagado</b> e a exportação continua liberada.
                </>
              ) : null}
            </p>
            <p className="sr">{dias} dias em atraso.</p>
          </div>
          {s.proporConsulta && !encerrado ? (
            <div className="cb-botoes">
              {r.permissoes.soConsulta ? (
                <button className="btn btn-perigo" type="button" onClick={() => { setFeito(null); setJanela("consulta"); }}>
                  <Icone nome="cadeado" className="ico" />
                  Passar o Portal para só consulta
                </button>
              ) : (
                <p className="permissao">
                  <Icone nome="cadeado" className="ico" />
                  Quem passa o Portal para só consulta é a Administração.
                </p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}
      {feito ? (
        <Aviso tom="sucesso" className="toast" titulo={feito.titulo}>
          {feito.texto}
        </Aviso>
      ) : null}
      <div className="grade">
        <div className="col">
          <section className="folha" aria-labelledby={`${ids}-t`} style={{ overflow: "hidden" }}>
            <div className="cb-ass-topo">
              <div>
                <h2 id={`${ids}-t`}>Assinatura</h2>
                <p className="sub">
                  {encerrado
                    ? "Encerrada com o contrato."
                    : s.inicioCobranca
                      ? `Desde ${dataBr(s.inicioCobranca)}.${s.forma === "CARNE" ? " Paga por carnê." : " A cobrança começou quando o cliente passou para Ativo."}`
                      : "Preparada. A cobrança começa quando o cliente passar para Ativo."}
                </p>
              </div>
              {podeEditar ? (
                <div className="acoes">
                  {(r.planos?.length ?? 0) > 1 || r.planos?.some((p) => p.id !== s.plano.id) ? (
                    <button className="btn btn-sec" type="button" onClick={() => { setFeito(null); setJanela("plano"); }}>
                      <Icone nome="planos" className="ico" />
                      Mudar de plano
                    </button>
                  ) : null}
                  <button className="btn btn-sec" type="button" onClick={() => { setFeito(null); setEditando(true); }}>
                    <Icone nome="lapis" className="ico" />
                    Editar
                  </button>
                </div>
              ) : null}
            </div>
            {podeEditar && r.valores && !s.enderecoCobranca && !encerrado ? (
              <div style={{ padding: "0 24px 16px" }}>
                <Aviso tom="atencao" icone="alerta" titulo="Falta o endereço: sem ele o boleto não sai, só o Pix."
                  acoes={
                    <button className="btn btn-sec btn-compacto" type="button" onClick={() => { setFeito(null); setEditando(true); }}>
                      <Icone nome="lapis" className="ico ico-s" />
                      Preencher o endereço
                    </button>
                  }>
                  O Banco Inter só registra o boleto com o endereço do pagador. Até preencher, a fatura
                  {s.proxima?.competencia ? ` de ${mesPorExtenso(s.proxima.competencia, true).toLowerCase()}` : ""} vai só com o Pix.
                </Aviso>
              </div>
            ) : null}
            <Dados r={r} socio={socio} aoPreencher={podeEditar && !encerrado ? () => { setFeito(null); setEditando(true); } : undefined} />
            {!r.valores ? (
              <p className="cb-so-ver">
                <Icone nome="olho" className="ico" />
                <span>Você vê o plano e a situação da cobrança. Valores, faturas e mudanças ficam com a Administração e o Financeiro.</span>
              </p>
            ) : encerrado ? (
              <p className="cb-so-ver">
                <Icone nome="ajuda" className="ico" />
                <span>Assinatura encerrada com o contrato. Nenhuma fatura nova é emitida e a régua parou.</span>
              </p>
            ) : null}
            {r.valores ? <MiniHistorico r={r} /> : null}
          </section>
          {r.valores && carneEmUso ? (
            <FolhaCarne carne={carneEmUso}
              aviso={valorMudou ? (
                <Aviso tom="atencao" titulo={`A mensalidade hoje é ${brl(a!.carne!.valorHojeCentavos!)}, e o carnê está em ${brl(carneEmUso.valorParcelaCentavos)}.`}>
                  O valor da parcela fica fixo. A mensalidade nova só entra com um carnê novo, a partir da próxima parcela sem fatura.
                </Aviso>
              ) : undefined}
              acoes={
                <>
                  <BotaoBaixarDoc doc={doc} chave="carne" caminho={`/v1/clientes/${id}/carnes/${carneEmUso.id}/pdf`} rotulo="Baixar o carnê (PDF)" />
                  {podeEditar ? (
                    <button className="btn btn-sec" type="button" onClick={() => { setFeito(null); setJanela("carne"); }}>
                      <Icone nome="reenviar" className="ico" />
                      Gerar novo carnê
                    </button>
                  ) : null}
                  <SituacaoDoc doc={doc} chave="carne" de={`do carnê ${carneEmUso.numero}`} nadaMudou="Nada mudou no carnê." contato="o suporte" />
                  <p className="permissao" id={`${ids}-pdf`}>
                    <Icone nome="doc" className="ico" />
                    O carnê sai como está hoje: parcela paga ou cancelada vem marcada e sem códigos. Até o Banco Inter ser ligado, sai sem os códigos e o escritório não o vê no Portal.
                  </p>
                </>
              }
              rodape="Cada parcela é a fatura do mês, com o Pix e o boleto da página do carnê. Pagar adiantado pode: a parcela fica paga e a fatura do mês já nasce paga." />
          ) : null}
          {r.valores && s.faturas ? (
            <FaturasDoEscritorio faturas={s.faturas} hoje={r.hoje} nome={nome} id={id} encerrado={encerrado} proxima={encerrado ? null : s.proxima?.competencia ?? null} />
          ) : null}
        </div>
        {lateral}
      </div>
      {janela === "plano" ? (
        <JanelaMudarPlano id={id} r={r} a={s} nome={nome} aoFechar={fechar}
          aoFeito={(plano) => pronto(`A ${nome} passa para o plano ${plano}.`, "Vale na próxima fatura ainda não emitida. O motivo ficou no histórico.")} />
      ) : janela === "consulta" ? (
        <JanelaMotivo titulo={`Passar o Portal da ${nome} para só consulta?`} sobretitulo={`Assinatura · ${nome}`} perigo icone="cadeado" botao="Passar para só consulta"
          descricao={`São ${dias} dias de atraso${abertas ? `, em ${abertas.faturas} ${abertas.faturas === 1 ? "fatura" : "faturas"}, ${brl(abertas.totalCentavos)}` : ""}. É o mesmo modo só consulta do fim do contrato, mas o contrato continua.`}
          caminho={`/v1/clientes/${id}/portal-so-consulta`} versao={s.versao} ajuda="Obrigatório. Fica no histórico do cliente, com seu nome e a hora. O escritório não vê."
          aoFechar={fechar} aoFeito={() => pronto(`O Portal da ${nome} está só para consulta.`, `${socio ?? "O sócio dono"} recebeu um e-mail com as faturas em aberto e como pagar. O motivo ficou no histórico.`, true)}>
          <div className="fc-passagem" aria-hidden="true">
            <span className="selo selo-ativo">
              <span className="bolinha" />
              Portal normal
            </span>
            <Icone nome="seta" className="ico" />
            <span className="selo selo-consulta">
              <Icone nome="cadeado" className="ico" />
              Só consulta
            </span>
          </div>
          <ul className="tratar" style={{ padding: 0, margin: 0 }}>
            <li>A equipe da {nome} continua entrando e vendo tudo. Ninguém cria nem muda nada.</li>
            <li>Nenhum dado é apagado. O sócio dono continua baixando os dados e pagando pelo Portal.</li>
            <li>Ao pagar as faturas em atraso, o Portal volta ao normal sozinho, assim que o pagamento é confirmado.</li>
            <li>{socio ?? "O sócio dono"} recebe um e-mail; a equipe vê uma faixa pedindo para falar com o sócio dono.</li>
            <li>Encerrar o contrato é outra ação, na aba Contrato e documentos.</li>
          </ul>
        </JanelaMotivo>
      ) : janela === "devolver" ? (
        <JanelaMotivo titulo={`Devolver o acesso da ${nome} agora?`} sobretitulo={`Assinatura · ${nome}`} icone="abrir" botao="Devolver o acesso"
          descricao="O Portal volta ao normal antes do pagamento. As faturas continuam em aberto e a régua segue mandando os lembretes."
          caminho={`/v1/clientes/${id}/portal-normal`} versao={s.versao} ajuda="Obrigatório. Por exemplo: o sócio mandou o comprovante. Fica no histórico do cliente."
          aoFechar={fechar} aoFeito={() => pronto("O Portal voltou ao normal.", "A equipe do escritório já pode criar e mudar. O motivo ficou no histórico.", true)} />
      ) : janela === "carne" && carneEmUso ? (
        <JanelaMotivo titulo={`Gerar um carnê novo para a ${nome}?`} sobretitulo={`Assinatura · ${nome}`} icone="carne" botao="Gerar o carnê novo"
          descricao={`O carnê novo começa na próxima parcela ainda sem fatura${s.proxima ? `: ${mesPorExtenso(s.proxima.competencia)}` : ""}${a!.carne?.valorHojeCentavos ? `, a ${brl(a!.carne.valorHojeCentavos)} por parcela` : ""}.`}
          caminho={`/v1/clientes/${id}/assinatura/carne-novo`} versao={s.versao} ajuda="Obrigatório. Fica no histórico da assinatura e das parcelas canceladas. O escritório não vê."
          aoFechar={fechar} aoFeito={() => pronto("Carnê novo gerado.", `O carnê vai para ${s.emailCobranca ?? "o e-mail de cobrança"} e aparece no Portal. As parcelas trocadas ficaram como Canceladas.`)}>
          <ul className="tratar" style={{ padding: 0, margin: 0 }}>
            <li>As faturas já emitidas continuam valendo, pelo valor delas.</li>
            <li>As parcelas ainda sem fatura do carnê {carneEmUso.numero} são canceladas, com o motivo. Nada é apagado: elas ficam na assinatura como Canceladas.</li>
            <li>O carnê novo vai para {s.emailCobranca}{socio ? `, com cópia para ${socio}` : ""}, e aparece no Portal.</li>
            <li>Parcela paga adiantada no carnê antigo continua paga, sem diferença a cobrar.</li>
          </ul>
        </JanelaMotivo>
      ) : null}
    </>
  );
}

function FaturasDoEscritorio({ faturas, hoje, nome, id, encerrado, proxima }: {
  faturas: FaturaCb[];
  hoje: string;
  nome: string;
  id: string;
  encerrado: boolean;
  proxima: string | null;
}) {
  const ids = useId();
  return (
    <section className="folha" aria-labelledby={`${ids}-f`} style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id={`${ids}-f`}>Faturas do escritório</h2>
          <p className="sub">Da mais nova para a mais antiga. Todas ficam em Cobrança também.</p>
        </div>
      </div>
      {faturas.length ? (
        <TabelaDoEscritorio faturas={faturas} hoje={hoje} escritorio={id} legenda={`Faturas da ${nome}`}
          acoes={encerrado ? (f) =>
            f.situacao === "EM_ATRASO" || f.situacao === "A_VENCER" || f.situacao === "VENCE_HOJE" ? (
              <a className="btn btn-sec" href={hrefFatura(id, f.id)}>
                <Icone nome="pagar" className="ico" />
                Registrar ou cancelar<span className="sr"> a fatura de {mesPorExtenso(f.competencia)}</span>
              </a>
            ) : null
          : undefined} />
      ) : (
        <p style={{ padding: "0 24px 20px" }}>Nenhuma fatura ainda.</p>
      )}
      {proxima ? (
        <p className="docs-pe">
          <Icone nome="relogio" className="ico" />
          <span>A próxima fatura é a de {mesPorExtenso(proxima)}, emitida 20 dias antes do vencimento.</span>
        </p>
      ) : null}
    </section>
  );
}
