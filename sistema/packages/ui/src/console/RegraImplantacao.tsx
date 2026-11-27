"use client";
// Cobrança › Planos › folha "Implantação assistida" (CO-08, F1.47): a regra global, a prévia de como
// aparece na 1ª fatura, as mudanças e a janela de editar (só a Administração; o Financeiro lê).
// Desenho aprovado em docs/design/aprovadas/console-implantacao (cobranca.html, estados im-regra*;
// gerador em _fonte/cobranca_im.py). O banco confere tudo e devolve os campos errados juntos (1180).

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CondicaoImplantacao, RegraImplantacao } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { ContaImplantacao } from "./AbaImplantacao.tsx";
import { brl, centavosDe, dataBr, reaisDe } from "./cobranca.ts";
import { lerDia, linhasDaImplantacao } from "./implantacao.ts";
import { chamarConsole } from "./Moldura.tsx";
import { Aviso, descritoPor, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "./pecas.tsx";

/** GET /v1/cobranca/implantacao (`console_implantacao_regras`). */
export interface RegraImplantacaoResposta {
  podeEditar: boolean;
  regra: RegraImplantacao;
  hoje: { dia: string; condicao: CondicaoImplantacao; condicaoTexto: string | null };
  historico: { id: number; em: string; autor: string; antes: Partial<RegraImplantacao> | null; depois: Partial<RegraImplantacao> | null }[];
}

const TEXTO_MAX = 60;
const DESC_MAX = 120;

/** "R$ 1.490,00, isenta até 31/05/2027, 30 dias" (o histórico da regra). */
export function resumoDaRegra(r: Partial<RegraImplantacao> | null): string {
  if (!r) return "";
  const cond = r.condicaoPadrao === "COBRADA" ? "cobrada à vista" : r.isencaoAte ? `isenta até ${dataBr(r.isencaoAte)}` : "isenta, sem data de fim";
  return [typeof r.valorCentavos === "number" ? brl(r.valorCentavos) : null, cond, r.prazoDias ? `${r.prazoDias} dias` : null].filter(Boolean).join(", ");
}

/** Um dia depois (ou antes) de uma data ISO. */
export function somarDias(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

function Previa({ r }: { r: Pick<RegraImplantacao, "descricao" | "valorCentavos" | "isencaoTexto"> & { isenta: boolean } }) {
  const linhas = linhasDaImplantacao({ descricao: r.descricao, valorCentavos: r.valorCentavos, isenta: r.isenta, texto: r.isencaoTexto });
  return (
    <ContaImplantacao rotulo="Como aparece na 1ª fatura" linhas={linhas}
      total={{ texto: "Efeito na 1ª fatura", valor: r.isenta ? "R$ 0,00" : `+ ${brl(r.valorCentavos)}` }} />
  );
}

function JanelaRegra({ dados, aoFechar, aoSalvar }: { dados: RegraImplantacaoResposta; aoFechar: () => void; aoSalvar: () => void }) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const r = dados.regra;
  const hoje = dados.hoje.dia;
  const [valor, setValor] = useState(reaisDe(r.valorCentavos));
  const [prazo, setPrazo] = useState(String(r.prazoDias));
  const [cond, setCond] = useState<CondicaoImplantacao>(r.condicaoPadrao);
  const [ate, setAte] = useState(r.isencaoAte ? dataBr(r.isencaoAte) : "");
  const [texto, setTexto] = useState(r.isencaoTexto);
  const [desc, setDesc] = useState(r.descricao);
  const [erros, setErros] = useState<Set<string>>(new Set());
  const [falha, setFalha] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const cobrada = cond === "COBRADA";
  const c = centavosDe(valor);
  const ateIso = ate.trim() ? lerDia(ate) : null;

  async function enviar() {
    setFalha(null);
    const e = new Set<string>();
    if (c === null || c < 0 || c > 10_000_000 || !/,\d{2}\s*$/.test(valor)) e.add("valor");
    const p = /^\d{1,3}$/.test(prazo.trim()) ? Number(prazo) : NaN;
    if (!(p >= 1 && p <= 90)) e.add("prazoDias");
    if (!cobrada && ate.trim() && (!ateIso || ateIso < hoje)) e.add("isencaoAte");
    if (!cobrada && (texto.trim().length < 1 || texto.trim().length > TEXTO_MAX)) e.add("isencaoTexto");
    if (desc.trim().length < 1 || desc.trim().length > DESC_MAX) e.add("descricao");
    setErros(e);
    if (e.size) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const res = await chamarConsole("/v1/cobranca/implantacao", {
      metodo: "PUT",
      corpo: {
        versao: r.versao, nome: r.nome, descricao: desc.trim(), valorCentavos: c, condicaoPadrao: cond,
        isencaoAte: cobrada ? null : ateIso, isencaoTexto: cobrada ? r.isencaoTexto : texto.trim(), prazoDias: p,
      },
    });
    setEnviando(false);
    if (!res.ok) {
      const campos = res.erro.detalhes?.campos;
      if (Array.isArray(campos) && campos.length) {
        setErros(new Set(campos.map((x) => (x === "condicao" ? "condicaoPadrao" : String(x)))));
        return focarPrimeiroErro(corpo.current);
      }
      return setFalha(res.erro);
    }
    aoSalvar();
  }

  const n = erros.size;
  const inv = (k: string) => erros.has(k) || undefined;
  const efeitoIsenta = !cobrada && c !== null;
  return (
    <Janela id={`${ids}-j`} aberta classe="im-larga" aoFechar={aoFechar} sobretitulo="Planos" titulo="Editar a implantação assistida" descricao={`${ids}-d`}
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar} data-foco={n ? undefined : ""}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            {enviando ? "Salvando…" : "Salvar a regra"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id={`${ids}-d`}>
          A mudança fica no histórico de Planos, com o seu nome e os dados de antes e de depois. Não mexe em nenhuma implantação já aberta.
        </p>
        {n ? (
          <Aviso tom="urgencia" titulo={faltaAcertar(n)}>
            A regra não mudou.
          </Aviso>
        ) : falha ? (
          <Aviso tom="urgencia" titulo="A regra não mudou.">
            {falha.codigo === "VERSION_CONFLICT" ? "Outra pessoa mudou a regra enquanto você editava. Feche a janela para ver a regra salva e edite de novo." : textoDoErro(falha)}
          </Aviso>
        ) : null}
        <div className="im-janela-grade">
          <div className="campo im-campo">
            <label htmlFor={`${ids}-v`}>Valor da implantação</label>
            <div className="cb-campo-valor">
              <span className="cb-rs" aria-hidden="true">
                R$
              </span>
              <input className="entrada" id={`${ids}-v`} inputMode="decimal" autoComplete="off" value={valor} onChange={(e) => setValor(e.target.value)}
                aria-invalid={inv("valor")} aria-describedby={descritoPor(erros.has("valor") && `${ids}-v-e`, `${ids}-v-a`)} />
            </div>
            {erros.has("valor") ? <ErroCampo id={`${ids}-v-e`}>Escreva o valor com os centavos, por exemplo 1.490,00.</ErroCampo> : null}
            <p className="ajuda" id={`${ids}-v-a`}>
              Em reais, com centavos. Cobrado à vista na 1ª fatura.
            </p>
          </div>
          <div className="campo im-campo">
            <label htmlFor={`${ids}-p`}>Prazo, em dias</label>
            <input className="entrada" id={`${ids}-p`} inputMode="numeric" autoComplete="off" value={prazo} onChange={(e) => setPrazo(e.target.value)}
              aria-invalid={inv("prazoDias")} aria-describedby={descritoPor(erros.has("prazoDias") && `${ids}-p-e`, `${ids}-p-a`)} />
            {erros.has("prazoDias") ? <ErroCampo id={`${ids}-p-e`}>Escreva um prazo entre 1 e 90 dias.</ErroCampo> : null}
            <p className="ajuda" id={`${ids}-p-a`}>
              De 1 a 90 dias, contados do primeiro acesso de um sócio.
            </p>
          </div>
          <fieldset className="grupo-opcoes im-grupo im-inteira" aria-describedby={erros.has("condicaoPadrao") ? `${ids}-c-e` : undefined}>
            <legend>Condição para as implantações que abrirem daqui em diante</legend>
            {([["ISENTA", "Isenta", "O valor aparece na 1ª fatura junto com a isenção, e as duas linhas somam zero."],
              ["COBRADA", "Cobrada à vista", "O valor entra inteiro na 1ª fatura, por Pix ou boleto."]] as const).map(([k, t, s]) => (
              <label className="opcao" key={k}>
                <input className="marcar" type="radio" name={`${ids}-cond`} checked={cond === k} onChange={() => setCond(k)} />
                <span>
                  {t}
                  <small>{s}</small>
                </span>
              </label>
            ))}
            {erros.has("condicaoPadrao") ? <ErroCampo id={`${ids}-c-e`}>Escolha a condição.</ErroCampo> : null}
          </fieldset>
          <div className="campo im-campo">
            <label htmlFor={`${ids}-a`}>
              Isenta até <span className="opcional">(opcional)</span>
            </label>
            <input className="entrada" id={`${ids}-a`} inputMode="numeric" autoComplete="off" value={cobrada ? "" : ate} disabled={cobrada}
              onChange={(e) => setAte(e.target.value)} aria-invalid={inv("isencaoAte")}
              aria-describedby={descritoPor(erros.has("isencaoAte") && `${ids}-a-e`, `${ids}-a-a`)} />
            {erros.has("isencaoAte") ? <ErroCampo id={`${ids}-a-e`}>A data precisa ser de hoje em diante, como dd/mm/aaaa.</ErroCampo> : null}
            <p className="ajuda" id={`${ids}-a-a`}>
              {cobrada ? "Não vale com “Cobrada à vista”." : "dd/mm/aaaa. Vazio: isenta sem data de fim. Depois dessa data, quem abrir a implantação paga."}
            </p>
          </div>
          <div className="campo im-campo">
            <div className="im-rot-linha">
              <label htmlFor={`${ids}-t`}>Texto da isenção na fatura</label>
              <span className="im-contador" aria-hidden="true">
                {texto.length} de {TEXTO_MAX}
              </span>
            </div>
            <input className="entrada" id={`${ids}-t`} autoComplete="off" maxLength={TEXTO_MAX} value={texto} disabled={cobrada} onChange={(e) => setTexto(e.target.value)}
              aria-invalid={inv("isencaoTexto")} aria-describedby={descritoPor(erros.has("isencaoTexto") && `${ids}-t-e`, `${ids}-t-a`)} />
            {erros.has("isencaoTexto") ? <ErroCampo id={`${ids}-t-e`}>Escreva o texto da isenção, até 60 caracteres.</ErroCampo> : null}
            <p className="ajuda" id={`${ids}-t-a`}>
              Público. Vai depois de “Isenção da implantação ·”.
            </p>
          </div>
          <div className="campo im-campo im-inteira">
            <div className="im-rot-linha">
              <label htmlFor={`${ids}-o`}>O que a implantação inclui</label>
              <span className="im-contador" aria-hidden="true">
                {desc.length} de {DESC_MAX}
              </span>
            </div>
            <input className="entrada" id={`${ids}-o`} autoComplete="off" maxLength={DESC_MAX} value={desc} onChange={(e) => setDesc(e.target.value)}
              aria-invalid={inv("descricao")} aria-describedby={descritoPor(erros.has("descricao") && `${ids}-o-e`, `${ids}-o-a`)} />
            {erros.has("descricao") ? <ErroCampo id={`${ids}-o-e`}>Escreva o que a implantação inclui, até 120 caracteres.</ErroCampo> : null}
            <p className="ajuda" id={`${ids}-o-a`}>
              Vai na linha da implantação, na fatura.
            </p>
          </div>
        </div>
        {cobrada ? (
          <Aviso tom="atencao" titulo="Antes de cobrar, resolva a nota fiscal com o contador.">
            Hoje o T3jus não emite nota pelo sistema (F1.24), e a 1ª fatura passa de R$ 1.800,00 com a mensalidade. Cobrado, o carnê não leva a implantação: quem paga
            por carnê precisa da 1ª fatura por Pix ou boleto.
          </Aviso>
        ) : null}
        <div className="im-efeito">
          <h3>
            <Icone nome="olho" className="ico" />
            Prévia: vale para as implantações que abrirem depois de salvar
          </h3>
          <p>
            {cobrada ? (
              "As já abertas continuam como estão. A partir de hoje, a 1ª fatura de quem abrir traz:"
            ) : ateIso && ateIso >= hoje ? (
              <>
                As já abertas continuam como estão. Quem abrir <b>até {dataBr(ateIso)}</b> fica isento; a partir de <b>{dataBr(somarDias(ateIso, 1))}</b>, paga{" "}
                {c !== null ? brl(c) : "o valor"} à vista na 1ª fatura. O sino avisa a Administração em {dataBr(somarDias(ateIso, -30))}, 30 dias antes.
              </>
            ) : (
              "As já abertas continuam como estão. Toda implantação que abrir fica isenta, sem data de fim, até alguém gravar a data."
            )}
          </p>
          {c !== null ? <Previa r={{ descricao: desc.trim() || r.descricao, valorCentavos: c, isencaoTexto: texto.trim() || r.isencaoTexto, isenta: efeitoIsenta }} /> : null}
        </div>
      </div>
    </Janela>
  );
}

/** A folha da regra, na aba Planos (entre "Pessoa a mais" e os arquivados). */
export function FolhaRegraImplantacao() {
  const ids = useId();
  const [dados, setDados] = useState<RegraImplantacaoResposta | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [aberta, setAberta] = useState(false);
  const [feito, setFeito] = useState(false);
  const [semAcesso, setSemAcesso] = useState(false);
  const carregar = useCallback(async () => {
    setErro(null);
    const r = await chamarConsole<RegraImplantacaoResposta>("/v1/cobranca/implantacao");
    if (r.ok) setDados(r.dados);
    else if (r.status === 403) setSemAcesso(true);
    else if (r.status !== 401) setErro(r.erro);
  }, []);
  const leu = useRef(false);
  useEffect(() => {
    if (leu.current) return;
    leu.current = true;
    void carregar();
  }, [carregar]);

  if (semAcesso) return null;
  if (erro) {
    return (
      <section className="folha" aria-labelledby={`${ids}-t`}>
        <div className="im-cab-folha">
          <h2 id={`${ids}-t`}>Implantação assistida</h2>
        </div>
        <div style={{ padding: "0 24px 20px" }}>
          <Aviso tom="urgencia" titulo="Não deu para carregar a regra da implantação."
            acoes={
              <button className="btn btn-sec btn-compacto" type="button" onClick={() => void carregar()}>
                <Icone nome="reenviar" className="ico ico-s" />
                Tentar de novo
              </button>
            }>
            {textoDoErro(erro)}
          </Aviso>
        </div>
      </section>
    );
  }
  if (!dados) {
    return (
      <section className="folha" aria-busy="true" style={{ padding: 24, display: "grid", gap: 14 }}>
        <p className="sr" role="status">
          Carregando a regra da implantação…
        </p>
        <span className="esqueleto esq-linha" style={{ width: "30%", height: 22 }} aria-hidden="true" />
        <span className="esqueleto esq-linha" style={{ width: "70%", height: 44 }} aria-hidden="true" />
      </section>
    );
  }
  const r = dados.regra;
  const isentaHoje = dados.hoje.condicao === "ISENTA";
  return (
    <section className="folha im-regra" aria-labelledby={`${ids}-t`}>
      <div className="im-cab-folha">
        <div>
          <h2 id={`${ids}-t`}>{r.nome}</h2>
          <p className="sub">Vale para todo escritório novo. Cada implantação copia a regra do dia em que abre e fica congelada.</p>
        </div>
        {dados.podeEditar ? (
          <button className="btn btn-sec" type="button" onClick={() => { setFeito(false); setAberta(true); }}>
            <Icone nome="lapis" className="ico" />
            Editar<span className="sr"> a regra da implantação</span>
          </button>
        ) : null}
      </div>
      {feito ? (
        <div style={{ padding: "0 24px 16px" }}>
          <Aviso tom="sucesso" titulo="Regra da implantação salva.">
            Vale para as implantações que abrirem daqui em diante. As já abertas continuam como estão.
          </Aviso>
        </div>
      ) : null}
      <div className="im-regra-corpo">
        <div>
          <p className="cb-preco">
            {brl(r.valorCentavos)}
            <small>à vista, na 1ª fatura</small>
          </p>
          <dl className="im-dl">
            <div>
              <dt>Para quem abrir hoje</dt>
              <dd>
                {isentaHoje ? (
                  <span className="selo selo-isenta">
                    <Icone nome="isencao" className="ico" />
                    Isenta · {dados.hoje.condicaoTexto ?? r.isencaoTexto}
                  </span>
                ) : (
                  <span className="selo selo-cobrada">
                    <Icone nome="fatura" className="ico" />
                    Cobrada à vista
                  </span>
                )}
              </dd>
            </div>
            {r.condicaoPadrao === "ISENTA" ? (
              <div>
                <dt>Isenta até</dt>
                <dd>
                  {r.isencaoAte ? dataBr(r.isencaoAte) : "Sem data de fim"}
                  <small>
                    {r.isencaoAte
                      ? `A partir de ${dataBr(somarDias(r.isencaoAte, 1))}, quem abrir paga. O sino avisa a Administração 30 dias antes.`
                      : "Enquanto não houver data, toda implantação nova sai isenta. O sino avisa 30 dias antes da data, quando houver."}
                  </small>
                </dd>
              </div>
            ) : null}
            <div>
              <dt>Texto na fatura</dt>
              <dd>
                “Isenção da implantação · {r.isencaoTexto}”<small>Público: o escritório lê na fatura, no PDF e no Portal.</small>
              </dd>
            </div>
            <div>
              <dt>O que inclui</dt>
              <dd>
                “{r.descricao}”<small>Vai na linha da implantação, na fatura.</small>
              </dd>
            </div>
            <div>
              <dt>Prazo</dt>
              <dd>
                {r.prazoDias} {r.prazoDias === 1 ? "dia" : "dias"}
                <small>Contados do primeiro acesso de um sócio ao Portal.</small>
              </dd>
            </div>
          </dl>
        </div>
        <div>
          <p className="im-rot">Como aparece na 1ª fatura</p>
          <Previa r={{ ...r, isenta: isentaHoje }} />
          <p className="im-peq">O desconto de entrada vale só sobre a mensalidade, nunca sobre a implantação.</p>
        </div>
      </div>
      <div className="cb-mini-hist" style={{ marginTop: 0, paddingTop: 14 }}>
        <h3>Mudanças da regra</h3>
        {dados.historico.length ? (
          <ul className="im-hist" style={{ padding: 0 }}>
            {dados.historico.map((h) => (
              <li key={h.id}>
                <span>{dataBr(h.em)}</span>
                <span>
                  <b style={{ fontWeight: 600 }}>{h.autor}</b> mudou a regra: {resumoDaRegra(h.depois)}
                  {h.antes ? <small>Antes: {resumoDaRegra(h.antes)}.</small> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="im-peq" style={{ padding: "0 0 12px" }}>
            A regra ainda não mudou desde que foi criada{r.alteradoPor ? `, por ${r.alteradoPor}` : ""}.
          </p>
        )}
      </div>
      {!dados.podeEditar ? (
        <p className="permissao" style={{ margin: "0 24px 18px" }}>
          <Icone nome="cadeado" className="ico" />
          Quem muda a regra da implantação é a Administração.
        </p>
      ) : null}
      {aberta ? (
        <JanelaRegra dados={dados} aoFechar={() => { setAberta(false); void carregar(); }}
          aoSalvar={() => {
            setAberta(false);
            setFeito(true);
            void carregar();
          }} />
      ) : null}
    </section>
  );
}
