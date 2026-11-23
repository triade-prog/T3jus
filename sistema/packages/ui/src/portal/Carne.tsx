"use client";
// Carnê de pagamento dos honorários parcelados (FI-23), tela aprovada em
// docs/design/aprovadas/portal-carne. Três peças:
// - Escritório › Recebimento: a chave Pix do escritório, o nome do recebedor, a cidade e as
//   instruções de pagamento. Só a sócia dona muda; quem tem o Escritório vê para ler.
// - A folha "Carnê" e a janela "Gerar carnê", na ficha do contrato (Financeiro › A receber e
//   Contratos › Recebimentos).
// - O carnê em A4 para imprimir ou salvar em PDF (/carnes/:id), com canhoto e via do cliente.
// Sem provedor de pagamento: o Pix é o estático do escritório (BR Code) e a baixa continua em
// "Registrar recebimento". O servidor confere quem pode e guarda cada carnê (0450_portal_carne.sql).

import qrcode from "qrcode-generator";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  brCodePix, chavePixParaLer, dataBr, hojeBrasilia, LIMITE_CIDADE, LIMITE_INSTRUCOES, LIMITE_RECEBEDOR, normalizarChavePix, pixDaParcela,
  camposDoEscritorioNaCapa, fraseOabSociedade, identificacaoDoCarne, razaoLonga, reais, subMarcaAdvocacia, telefoneBr, textoPix, TIPOS_CHAVE_PIX, timbradoDoEscritorio, txidParcela,
  type AreaCarne, type CarneGerado, type CarneParaImprimir, type FormatoCarne, type MudancaCarne, type OpcoesCarne, type ParcelaParaCarne, type PdfDoCarne, type PedidoChavePix, type PreviaEnvioCarne, type EnvioCarne,
  type RecebimentoEscritorio, type RecebimentoSalvo, type TipoChavePix,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { Simbolo } from "../Marca.tsx";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { contar, diaCurto, nomeDoMes } from "./agenda.ts";
import { ROTAS_CONTRATOS } from "./contratos.ts";
import { Toast, type Feito } from "./FichaCliente.tsx";
import { ROTAS_FINANCEIRO } from "./financeiro.ts";
import { chamarPortal, MolduraPortal, useEscritorioPortal, type EscritorioPortal } from "./Moldura.tsx";
import { BarraEscritorio, ROTAS_ESCRITORIO } from "./WhatsApp.tsx";
import { Pedacos } from "./Recibo.tsx";
import { JanelaRemoverLogo, LogoNoDocumento, MarcaParaLer, MarcaTimbrado, type DadosTimbrado, type EstadoMarca } from "./MarcaTimbrado.tsx";

/** A página do carnê para imprimir. `imprimir` abre a impressão assim que a folha carrega. */
export function rotaCarne(id: string, area: AreaCarne, imprimir = false): string {
  return `/carnes/${id}?area=${area.toLowerCase()}${imprimir ? "&imprimir=1" : ""}`;
}

const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDoInstante = (em: string) => new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h");
const maiuscula = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const mesRef = (v: string) => `${maiuscula(nomeDoMes(v))} de ${v.slice(0, 4)}`;
/** "Dez/2026": na lista da capa, para a linha caber numa só (o mês por extenso quebrava a linha). */
const mesRefCurto = (v: string) => `${maiuscula(nomeDoMes(v).slice(0, 3))}/${v.slice(0, 4)}`;
const ORDEM_TIPOS = Object.keys(TIPOS_CHAVE_PIX) as TipoChavePix[];
const nomeTipo = (t: TipoChavePix) => TIPOS_CHAVE_PIX[t];

/** "Parcelas 4/6 a 6/6", "Parcela 3/6" ou "Parcelas 2/6, 4/6 e 6/6". */
export function faixaDeParcelas(ps: { ordem: number; total: number }[]): string {
  const o = [...ps].sort((a, b) => a.ordem - b.ordem);
  if (!o.length) return "Nenhuma parcela";
  const n = (p: { ordem: number; total: number }) => `${p.ordem}/${p.total}`;
  if (o.length === 1) return `Parcela ${n(o[0]!)}`;
  const seguidas = o.every((p, i) => i === 0 || p.ordem === o[i - 1]!.ordem + 1);
  if (seguidas) return `Parcelas ${n(o[0]!)} a ${n(o.at(-1)!)}`;
  return `Parcelas ${o.slice(0, -1).map(n).join(", ")} e ${n(o.at(-1)!)}`;
}

// A capa (a 1ª faixa) traz a lista "As parcelas deste carnê". Com muitas parcelas a lista não
// cabe numa faixa: a capa cresce uma faixa por vez até a folha inteira e, passando disso, a lista
// continua em folhas só dela, em 2 colunas. As medidas são as da folha impressa (mm), com folga;
// o teste de ponta a ponta confere que nada passa da faixa, de 1 a 120 parcelas.
const FAIXA_MM = 277 / 3;
const LINHA_MM = 6.4; // uma linha da lista
const LINHA_VENCIDA_MM = 9.4; // a linha com "vencida" embaixo da data
const CAPA_RESTO_MM = 38; // título, cabeçalho, total e "Gerado em", mais os respiros da faixa
const CONTINUACAO_COLUNA_MM = 277 - 34; // a folha de continuação, tirando o título e o total

/** Um pedaço da capa: as parcelas [de, ate), quantas faixas ocupa e, na continuação, onde cada coluna acaba. */
export type BlocoDaCapa = { de: number; ate: number; faixas: 1 | 2 | 3; continuacao: boolean; colunas: number[] };

const alturaLinha = (p: { semValor?: boolean }) => (p.semValor ? LINHA_VENCIDA_MM : LINHA_MM);

/** Quantas linhas, a partir de `de`, cabem em `espaco` mm (pelo menos uma). */
function quantasCabem(ps: { semValor?: boolean }[], de: number, espaco: number): number {
  let i = de, usado = 0;
  while (i < ps.length && (i === de || usado + alturaLinha(ps[i]!) <= espaco)) usado += alturaLinha(ps[i++]!);
  return i;
}

/** Como a capa se divide: a capa (1 a 3 faixas) e, se a lista for longa, folhas de continuação. */
export function blocosDaCapa(ps: { semValor?: boolean }[]): BlocoDaCapa[] {
  const espaco = (k: number) => k * FAIXA_MM - CAPA_RESTO_MM;
  const k = ([1, 2, 3] as const).find((x) => quantasCabem(ps, 0, espaco(x)) >= ps.length);
  if (k) return [{ de: 0, ate: ps.length, faixas: k, continuacao: false, colunas: [] }];
  const blocos: BlocoDaCapa[] = [{ de: 0, ate: quantasCabem(ps, 0, espaco(3)), faixas: 3, continuacao: false, colunas: [] }];
  while (blocos.at(-1)!.ate < ps.length) {
    const de = blocos.at(-1)!.ate, colunas: number[] = [];
    let i = de;
    while (colunas.length < 2 && i < ps.length) colunas.push((i = quantasCabem(ps, i, CONTINUACAO_COLUNA_MM)));
    blocos.push({ de, ate: i, faixas: 3, continuacao: true, colunas });
  }
  return blocos;
}

/** Quantas folhas A4: 3 faixas por folha (a capa ocupa de 1 faixa a algumas folhas) ou uma parcela por folha. */
export function folhasDoCarne(ps: { semValor?: boolean }[], formato: FormatoCarne, capa: boolean): number {
  if (formato === "UM") return ps.length;
  const faixasDaCapa = capa ? blocosDaCapa(ps).reduce((s, b) => s + b.faixas, 0) : 0;
  return Math.ceil((ps.length + faixasDaCapa) / 3);
}

/** O que mudou depois do carnê, em frases ("a 5/6 passou de 25/12 para 30/12"). */
export function textoMudanca(m: MudancaCarne): string {
  const p = (m.parcela ?? "").toLowerCase();
  if (m.tipo === "CHAVE_PIX") return "a chave Pix do escritório mudou";
  if (m.tipo === "CANCELADA") return `a ${p} foi cancelada`;
  if (m.tipo === "VENCIMENTO") return `o vencimento da ${p} passou de ${diaCurto(m.era!)} para ${diaCurto(m.agora!)}`;
  return `o valor da ${p} passou de ${reais(Number(m.era))} para ${reais(Number(m.agora))}`;
}

// ------------------------------------------------------------------------------- QR Code

/** QR Code em SVG, preto no branco, com a margem que os leitores pedem. */
export function QrPix({ texto, rotulo, className }: { texto: string; rotulo: string; className?: string }) {
  const { d, lado } = useMemo(() => {
    const q = qrcode(0, "M");
    q.addData(texto, "Byte");
    q.make();
    const n = q.getModuleCount();
    let s = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) s += `M${c + 2} ${r + 2}h1v1h-1z`;
    return { d: s, lado: n + 4 };
  }, [texto]);
  return (
    <svg className={className} viewBox={`0 0 ${lado} ${lado}`} role="img" aria-label={rotulo} shapeRendering="crispEdges" focusable="false">
      <rect width={lado} height={lado} fill="#fff" />
      <path d={d} fill="#000" />
    </svg>
  );
}

// ------------------------------------------------------------------------------- o carnê em A4

function Tesoura({ topo }: { topo?: boolean }) {
  return (
    <svg className={topo ? "ca-tesoura ca-tesoura-topo" : "ca-tesoura"} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><path d="M8.6 7.5 20 18M8.6 16.5 20 6M13.5 12h0" />
    </svg>
  );
}

type Impressa = CarneParaImprimir["parcelas"][number];

/** O carnê gerado com o timbrado do dia (F3.133, 0890). Sem ele (carnê antigo), o desenho de antes. */
const comTimbrado = (c: CarneParaImprimir) => !!c.escritorio.comTimbrado;
/** Razão social com mais de 90 letras: a linha da identificação e o logo um pouco menores (decisão 13). */
const identLonga = (c: CarneParaImprimir) => comTimbrado(c) && razaoLonga(timbradoDoEscritorio(c.escritorio).nome);

/** O alto da via e da capa: o logo do dia do carnê (F3.81) ou o nome em letra. Com o timbrado, embaixo
 *  a linha da identificação (decisão 8: **razão social** · CNPJ · OAB), e na capa só a marca (decisão 10);
 *  sem ele, o CNPJ e a OAB, como antes. */
function MarcaEscritorio({ c, identificacao = true }: { c: CarneParaImprimir; identificacao?: boolean }) {
  const m = c.marca;
  if (comTimbrado(c)) {
    const id = identificacao ? identificacaoDoCarne(c.escritorio) : null;
    const sub = subMarcaAdvocacia(c.escritorio.nome);
    return (
      <div className="ca-marca">
        {m?.tipo === "LOGO" && m.logoId
          ? <LogoNoDocumento marca={m} nome={c.escritorio.nome} classe="ca-logo" />
          : <><span className="ca-esc">{c.escritorio.nome}</span>{sub ? <span className="ca-esc-sub">{sub}</span> : null}</>}
        {id ? (
          <p className="ca-ident">
            {id.nome ? <b>{id.nome}</b> : null}{id.nome && id.documento.length ? " · " : null}<Pedacos l={id.documento} classe="ca-nw" />
          </p>
        ) : null}
      </div>
    );
  }
  const cnpj = c.escritorio.cnpj ? `CNPJ ${c.escritorio.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}` : null;
  const oab = m?.oab ?? c.escritorio.oab ?? null;
  return (
    <div className="ca-marca">
      {m?.tipo === "LOGO" && m.logoId ? <LogoNoDocumento marca={m} nome={c.escritorio.nome} classe="ca-logo" /> : <span className="ca-esc">{c.escritorio.nome}</span>}
      {cnpj || oab ? <span className="ca-doc">{[cnpj, oab].filter(Boolean).join(" · ")}</span> : null}
    </div>
  );
}

function Pe({ c }: { c: CarneParaImprimir }) {
  const w = c.escritorio.whatsapp ? telefoneBr(c.escritorio.whatsapp) : null;
  return (
    <p className="ca-pe">
      <span>
        Pagando depois do vencimento, fale antes com o escritório: multa e juros seguem o contrato.{" "}
        {w ? <>Pagou? O recibo chega pelo WhatsApp do escritório, <b>{w}</b>.</> : <>Pagou? Guarde o comprovante: o escritório dá o recibo.</>}
      </span>
      <span className="ca-t3"><Simbolo tom="vinho" className="ca-simb" />Modelo T3jus</span>
    </p>
  );
}

function Canhoto({ c, p }: { c: CarneParaImprimir; p: Impressa }) {
  return (
    <div className="ca-canhoto">
      <p className="ca-rot">Canhoto · fica com o escritório</p>
      <p className="ca-esc-c">{c.escritorio.nome}</p>
      <p className="ca-parc">Parcela {p.ordem} de {p.total}<small>{mesRef(p.vencimento)}</small></p>
      <dl>
        <div><dt>Cliente</dt><dd>{c.cliente.nome}</dd></div>
        <div><dt>Contrato</dt><dd>{c.contrato.numero}</dd></div>
        <div><dt>Vencimento</dt><dd>{dataBr(p.vencimento)}{p.semValor ? " (vencida)" : ""}</dd></div>
        <div><dt>Valor</dt><dd>{reais(p.valor)}{p.semValor ? " + encargos" : ""}</dd></div>
        <div><dt>Identificador</dt><dd style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>{p.txid}</dd></div>
      </dl>
      <div className="ca-pago"><span>Pago em <i />/<i />/<i /></span><span>Forma <i /></span><span>Visto <i /></span></div>
    </div>
  );
}

const instrucoesOuPadrao = (c: CarneParaImprimir) => c.instrucoes ?? "Combine com o escritório a forma de pagamento.";

function Passos({ c }: { c: CarneParaImprimir }) {
  return (
    <ol className="ca-passos">
      <li><span>Abra o app do seu banco e escolha Pix: ler QR Code, ou Pix copia e cola.</span></li>
      <li><span>Leia o QR ou copie o código da parcela.</span></li>
      <li><span>Antes de confirmar, veja se aparece <b>{c.pix!.recebedor}</b> e o valor.</span></li>
    </ol>
  );
}

function Via({ c, p, grande }: { c: CarneParaImprimir; p: Impressa; grande?: boolean }) {
  const doc = c.cliente.documento ? <small> · {c.cliente.tipo === "PJ" ? "CNPJ" : "CPF"} {c.cliente.documento}</small> : null;
  const comPix = !!(c.pix && p.pix);
  const w = c.escritorio.whatsapp ? telefoneBr(c.escritorio.whatsapp) : null;
  return (
    <section className={identLonga(c) ? "ca-via ca-longo" : "ca-via"} aria-label={`Via do cliente, parcela ${p.ordem} de ${p.total}`}>
      <header className="ca-cab">
        <MarcaEscritorio c={c} />
        <div className="ca-num">
          <span className="ca-rot">Via do cliente · parcela</span>
          <b>{p.ordem} de {p.total}</b>
          {p.semValor ? <span className="ca-venc-box">Vencida em {diaCurto(p.vencimento)}</span> : null}
        </div>
      </header>
      <div className="ca-fio" />
      <div className="ca-corpo">
        <dl className="ca-dados">
          <div className="ca-largo"><dt>Cliente</dt><dd>{c.cliente.nome}{doc}</dd></div>
          <div className="ca-largo"><dt>Contrato</dt><dd>{c.contrato.numero} <small>· {c.contrato.objeto}</small></dd></div>
          <div><dt>Mês de referência</dt><dd>{mesRef(p.vencimento)}</dd></div>
          <div><dt>Vencimento</dt><dd>{dataBr(p.vencimento)}</dd></div>
          <div className="ca-valor"><dt>Valor</dt><dd>{reais(p.valor)}</dd></div>
          {p.semValor ? <div className="ca-enc"><dt>Encargos</dt><dd>+ multa e juros, valor a combinar com o escritório</dd></div> : null}
        </dl>
        {comPix ? (
          <div className="ca-pix">
            <QrPix className="ca-qr" texto={p.pix!} rotulo={`QR Code do Pix da parcela ${p.ordem} de ${p.total}${p.semValor ? ", sem valor definido" : `, ${reais(p.valor)}`}`} />
            <div className="ca-pix-txt">
              <p className="ca-pix-t">Pague com Pix</p>
              <dl>
                <dt>Chave ({nomeTipo(c.pix!.tipo)})</dt><dd>{chavePixParaLer(c.pix!.tipo, c.pix!.chave)}</dd>
                <dt style={{ marginTop: "1mm" }}>Recebedor</dt><dd>{c.pix!.recebedor}</dd>
              </dl>
            </div>
          </div>
        ) : (
          <div className="ca-como"><p className="ca-pix-t">Como pagar</p><p>{instrucoesOuPadrao(c)}</p></div>
        )}
      </div>
      {comPix ? (
        <>
          <div className="ca-cc"><span className="ca-rot">Pix copia<br />e cola</span><code>{p.pix}</code></div>
          <p className="ca-id">
            <span>Identificador da parcela: <b>{p.txid}</b></span>
            <span>{p.semValor ? "O Pix abre sem valor: digite o valor combinado com o escritório." : `Confira no app: ${c.pix!.recebedor}, ${reais(p.valor)}.`}</span>
          </p>
        </>
      ) : (
        <p className="ca-id"><span>Identificador da parcela: <b>{p.txid}</b></span><span>Escreva-o na descrição do pagamento.</span></p>
      )}
      {grande ? (
        <div className="ca-como-uma">
          <div>
            <p className="ca-pix-t">Como pagar{comPix ? " com Pix" : ""}</p>
            {comPix ? <Passos c={c} /> : <p>{instrucoesOuPadrao(c)}</p>}
          </div>
          <p className="ca-caixa">
            Depois de pagar, <b>{w ? "o recibo chega pelo WhatsApp" : "o escritório dá o recibo"}</b>{w ? " do escritório" : ""}.
            {w ? <> Dúvidas? Escreva para <b>{w}</b>.</> : null}
          </p>
        </div>
      ) : null}
      <Pe c={c} />
    </section>
  );
}

function TabelaParcelas({ ps, total }: { ps: Impressa[]; total: number | null }) {
  return (
    <table className="ca-tab">
      <thead><tr><th scope="col">Parcela</th><th scope="col">Referência</th><th scope="col">Vence</th><th scope="col">Valor</th></tr></thead>
      <tbody>
        {ps.map((p) => (
          <tr key={p.txid}>
            <td>{p.ordem} de {p.total}</td><td><abbr title={mesRef(p.vencimento)}>{mesRefCurto(p.vencimento)}</abbr></td>
            <td>{dataBr(p.vencimento)}{p.semValor ? <span className="ca-v">vencida</span> : null}</td><td>{reais(p.valor)}</td>
          </tr>
        ))}
      </tbody>
      {total !== null ? <tfoot><tr><td colSpan={2}>Total deste carnê</td><td colSpan={2}>{reais(total)}</td></tr></tfoot> : null}
    </table>
  );
}

const classeFaixas = (b: BlocoDaCapa) => (b.faixas > 1 ? ` ca-f${b.faixas}` : "");

function Gerado({ c }: { c: CarneParaImprimir }) {
  return (
    <p className="ca-gerado">
      Gerado em {dataBr(diaDoInstante(c.geradoEm))}. As parcelas já pagas não entram.{c.pix ? " Cada parcela tem o seu Pix; pague uma de cada vez." : ""}
    </p>
  );
}

/** O campo "Escritório" da capa com o timbrado (decisões 10 e 11): o nome, "CNPJ · OAB", a sede com CEP,
 *  telefone e e-mail (sem o site). */
function CampoEscritorio({ c }: { c: CarneParaImprimir }) {
  const t = camposDoEscritorioNaCapa(c.escritorio);
  if (!t.nome && !t.linhas.length) return null;
  return (
    <div className="ca-tim-esc">
      <dt>Escritório</dt>
      <dd>{t.nome ? <b>{t.nome}</b> : null}{t.linhas.map((l, i) => <span key={i}><Pedacos l={l} classe="ca-nw" /></span>)}</dd>
    </div>
  );
}

function Capa({ c, b, ultimo }: { c: CarneParaImprimir; b: BlocoDaCapa; ultimo: boolean }) {
  const w = c.escritorio.whatsapp ? telefoneBr(c.escritorio.whatsapp) : null;
  const total = c.parcelas.reduce((s, p) => s + p.valor, 0);
  const local = [c.escritorio.endereco, [c.escritorio.cidade, c.escritorio.uf].filter(Boolean).join("/")].filter(Boolean).join(" · ");
  if (b.continuacao) {
    const colunas = b.colunas.map((ate, k) => c.parcelas.slice(k ? b.colunas[k - 1]! : b.de, ate));
    return (
      <article className={`ca-faixa ca-capa ca-capa-cont${classeFaixas(b)}`} aria-label="As parcelas deste carnê, continuação">
        <Tesoura topo />
        <h3>As parcelas deste carnê <small>(continuação, {b.de + 1} a {b.ate} de {c.parcelas.length})</small></h3>
        <div className="ca-cont-cols">
          {colunas.map((ps, k) => <TabelaParcelas key={k} ps={ps} total={ultimo && k === colunas.length - 1 ? total : null} />)}
        </div>
        {ultimo ? <Gerado c={c} /> : <p className="ca-gerado">A lista continua na folha seguinte.</p>}
        <Tesoura />
      </article>
    );
  }
  return (
    <article className={`ca-faixa ca-capa${classeFaixas(b)}`}>
      <Tesoura topo />
      <div className="ca-col">
        <MarcaEscritorio c={c} identificacao={!comTimbrado(c)} />
        <div className="ca-fio" />
        <h2>Carnê de honorários</h2>
        <dl>
          <div><dt>Cliente</dt><dd>{c.cliente.nome}{c.cliente.documento ? ` · ${c.cliente.tipo === "PJ" ? "CNPJ" : "CPF"} ${c.cliente.documento}` : ""}</dd></div>
          <div><dt>Contrato</dt><dd>{c.contrato.numero} · {c.contrato.objeto}</dd></div>
          {comTimbrado(c) ? <CampoEscritorio c={c} /> : local ? <div><dt>Escritório</dt><dd style={{ fontWeight: 400 }}>{local}</dd></div> : null}
        </dl>
      </div>
      <div className="ca-col">
        <h3>As parcelas deste carnê</h3>
        <TabelaParcelas ps={c.parcelas.slice(b.de, b.ate)} total={ultimo ? total : null} />
        {ultimo ? <Gerado c={c} /> : <p className="ca-gerado">A lista continua na folha seguinte ({b.ate + 1} a {c.parcelas.length} de {c.parcelas.length}).</p>}
      </div>
      <div className="ca-col">
        {c.pix ? <><h3>Como pagar com Pix</h3><Passos c={c} /></> : <><h3>Como pagar</h3><p>{instrucoesOuPadrao(c)}</p></>}
        {c.pix && c.instrucoes ? <p style={{ fontSize: "6.8pt" }}>{c.instrucoes}</p> : null}
        <p className="ca-caixa">
          Depois de pagar, <b>{w ? "o recibo chega pelo WhatsApp" : "o escritório dá o recibo"}</b>{w ? " do escritório" : ""}.
          {w ? <> Dúvidas? Escreva para <b>{w}</b>.</> : null}
        </p>
        <p style={{ fontSize: "6.8pt", color: "var(--tinta-2)" }}>Pagando depois do vencimento, multa e juros seguem o contrato. Fale antes com o escritório.</p>
      </div>
      <Tesoura />
    </article>
  );
}

function Faixa({ c, p, topo }: { c: CarneParaImprimir; p: Impressa; topo: boolean }) {
  return (
    <article className="ca-faixa">
      {topo ? <Tesoura topo /> : null}
      <Canhoto c={c} p={p} />
      <div className="ca-corte-v"><Tesoura /></div>
      <Via c={c} p={p} />
      <Tesoura />
    </article>
  );
}

/** As folhas A4 do carnê. `ate` limita quantas folhas (a prévia da janela mostra só a primeira). */
export function FolhasCarne({ c, ate }: { c: CarneParaImprimir; ate?: number }) {
  if (c.formato === "UM") {
    const tot = c.parcelas.length;
    return (
      <>
        {c.parcelas.slice(0, ate).map((p, j) => (
          <div key={p.txid} className={`ca-folha ca-uma${comTimbrado(c) ? " ca-tim" : ""}`} role="region" aria-label={`Folha ${j + 1} de ${tot}`}>
            <Via c={c} p={p} grande />
            <div className="ca-corte-h"><Tesoura /></div>
            <Canhoto c={c} p={p} />
          </div>
        ))}
      </>
    );
  }
  // Cada folha tem 3 faixas. A capa pode ocupar mais de uma (lista longa), e a parcela vai
  // para a folha seguinte quando a faixa não cabe mais na folha.
  const blocos = c.capa ? blocosDaCapa(c.parcelas) : [];
  const itens: ({ capa: BlocoDaCapa; ultimo: boolean } | Impressa)[] = [
    ...blocos.map((b, i) => ({ capa: b, ultimo: i === blocos.length - 1 })), ...c.parcelas,
  ];
  const folhas: (typeof itens)[] = [];
  let usadas = 3;
  for (const x of itens) {
    const n = "capa" in x ? x.capa.faixas : 1;
    if (usadas + n > 3) { folhas.push([]); usadas = 0; }
    folhas.at(-1)!.push(x);
    usadas += n;
  }
  return (
    <>
      {folhas.slice(0, ate).map((f, j) => (
        <div key={j} className={comTimbrado(c) ? "ca-folha ca-tim" : "ca-folha"} role="region" aria-label={`Folha ${j + 1} de ${folhas.length}`}>
          {f.map((x, k) => ("capa" in x
            ? <Capa key={`capa-${x.capa.de}`} c={c} b={x.capa} ultimo={x.ultimo} />
            : <Faixa key={x.txid} c={c} p={x} topo={k === 0} />))}
        </div>
      ))}
    </>
  );
}

/** A página do carnê, para imprimir ou salvar em PDF (o destino "Salvar como PDF" da impressão). */
export function CarneImprimir({ id, area }: { id: string; area: AreaCarne }) {
  const [c, setC] = useState<CarneParaImprimir | null | "erro" | "nao">(null);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<CarneParaImprimir>(`/v1/escritorio/carnes/${id}?area=${area.toLowerCase()}`).then((r) => {
      if (vivo) setC(r.ok ? r.dados : r.status === 404 ? "nao" : "erro");
    });
    return () => { vivo = false; };
  }, [id, area, vez]);
  const carregado = c && typeof c === "object";
  useEffect(() => {
    if (!carregado) return;
    const q = new URLSearchParams(window.location.search);
    if (!q.has("imprimir")) return;
    q.delete("imprimir");
    window.history.replaceState(null, "", `${window.location.pathname}?${q}`);
    void document.fonts.ready.then(() => window.print());
  }, [carregado]);

  if (c === null) return <div className="ca-pagina"><div style={{ maxWidth: 640, margin: "0 auto", padding: 32 }}><Carregando rotulo="Montando o carnê…" linhas={4} /></div></div>;
  if (c === "erro" || c === "nao") {
    return (
      <div className="ca-pagina">
        <div style={{ maxWidth: 640, margin: "0 auto", padding: 32 }}>
          <ErroAoCarregar oque="o carnê" aoTentar={() => { setC(null); setVez((v) => v + 1); }}
            texto={c === "nao" ? "Ele não existe ou é de outro escritório. Volte à ficha do contrato e abra de novo." : undefined} />
        </div>
      </div>
    );
  }
  const voltar = area === "CONTRATOS" ? ROTAS_CONTRATOS.recebimentos(c.contrato.id) : ROTAS_FINANCEIRO.contrato(c.contrato.id);
  const folhas = folhasDoCarne(c.parcelas, c.formato, c.capa);
  return (
    <div className="ca-pagina">
      <header className="ca-barra">
        <h1>Carnê de {c.cliente.nome}<small>{c.contrato.numero} · {faixaDeParcelas(c.parcelas)} · {contar(folhas, "folha A4", "folhas A4")}</small></h1>
        <nav aria-label="Carnê">
          <a className="ca-voltar" href={voltar}><Icone nome="esquerda" className="ico ico-s" />Voltar à ficha</a>
        </nav>
        <button type="button" onClick={() => window.print()}><Icone nome="impressora" className="ico ico-s" />Imprimir ou salvar em PDF</button>
        <p className="ca-dica">Para guardar o PDF, escolha “Salvar como PDF” no destino da impressão. Papel A4, sem margens, escala 100%.</p>
      </header>
      <main className="ca-folhas">
        {c.mudancas.length ? (
          <p className="ca-aviso-tela" role="note">
            <b>Este carnê está desatualizado:</b> {c.mudancas.map(textoMudanca).join("; ")}. Gere de novo na ficha do contrato antes de entregar.
          </p>
        ) : null}
        <FolhasCarne c={c} />
      </main>
    </div>
  );
}

// ------------------------------------------------------------------------------- folha "Carnê" e janela

function SeloCarne({ tom, icone, children }: { tom: "ativo" | "atencao" | "neutro"; icone?: NomeIcone; children: ReactNode }) {
  return <span className={`selo selo-${tom}`}>{icone ? <Icone nome={icone} className="ico" /> : null}{children}</span>;
}

function LinhaChave({ o }: { o: OpcoesCarne }) {
  const r = o.recebimento;
  if (r.pixTipo && r.pixChave) {
    return (
      <p className="cn-chave">
        <Icone nome="moeda" className="ico" />
        <span>Sai com o Pix do escritório: chave {nomeTipo(r.pixTipo)} <b className="num">{chavePixParaLer(r.pixTipo, r.pixChave)}</b>. A baixa continua em Registrar recebimento.</span>
      </p>
    );
  }
  return (
    <p className="cn-chave">
      <Icone nome="alerta" className="ico" />
      <span><b>Sem chave Pix cadastrada.</b> O carnê sai com as instruções de pagamento em texto.</span>
    </p>
  );
}

/** O botão "Gerar carnê" do cabeçalho das parcelas. */
export function BotaoCarne({ aoAbrir }: { aoAbrir: () => void }) {
  return <button className="btn btn-sec" type="button" onClick={aoAbrir}><Icone nome="carne" className="ico" />Gerar carnê</button>;
}

/**
 * A folha "Carnê" da ficha do contrato, com o histórico e o aviso de carnê desatualizado, e a
 * janela "Gerar carnê". Quem abre a janela pode ser o botão do cabeçalho (aberta/aoAbrir).
 */
export function FolhaCarne({ contrato, area, escritorio, aberta, aoAbrir, aoFechar }: {
  contrato: string; area: AreaCarne; escritorio: EscritorioPortal; aberta: boolean; aoAbrir: () => void; aoFechar: () => void;
}) {
  const [o, setO] = useState<OpcoesCarne | null | "erro">(null);
  const [vez, setVez] = useState(0);
  const [whats, setWhats] = useState<string | null>(null);
  const [feito, setFeito] = useState<Feito | null>(null);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<OpcoesCarne>(`/v1/escritorio/contratos/${contrato}/carnes?area=${area.toLowerCase()}`).then((r) => {
      if (vivo) setO(r.ok ? r.dados : "erro");
    });
    return () => { vivo = false; };
  }, [contrato, area, vez]);

  let corpo: ReactNode;
  if (o === "erro") corpo = <ErroAoCarregar oque="os carnês" aoTentar={() => { setO(null); setVez((v) => v + 1); }} />;
  else if (!o) corpo = <Carregando rotulo="Carregando os carnês…" linhas={2} />;
  else {
    const vigente = o.contrato.situacao === "ATIVO";
    const abertas = o.parcelas.some((p) => p.situacao !== "PAGA" && p.situacao !== "CANCELADA");
    const pode = vigente && abertas;
    const btn = pode ? <BotaoCarne aoAbrir={aoAbrir} /> : null;
    const porque = !vigente ? "O carnê sai só de contrato vigente." : !abertas ? "Todas as parcelas com valor já foram pagas." : null;
    if (!o.carnes.length) {
      corpo = (
        <>
          <p>Nenhum carnê gerado para este contrato. O carnê sai das parcelas a vencer, em folhas A4 para imprimir ou salvar em PDF e mandar ao cliente.</p>
          <LinhaChave o={o} />
          {porque ? <p>{porque}</p> : btn}
        </>
      );
    } else {
      const [ultimo] = o.carnes;
      const desat = ultimo!.mudancas.length > 0;
      corpo = (
        <>
          {desat ? (
            <Aviso tom="atencao" titulo={`Carnê desatualizado: ${ultimo!.mudancas.length === 1 ? "uma coisa mudou" : `${ultimo!.mudancas.length} coisas mudaram`}.`}
              acoes={pode ? <button className="btn btn-pri" type="button" onClick={aoAbrir}><Icone nome="reenviar" className="ico" />Gerar de novo</button> : undefined}>
              {maiuscula(ultimo!.mudancas.map(textoMudanca).join("; "))}. O carnê de {diaCurto(diaDoInstante(ultimo!.geradoEm))} ainda mostra o que era. Gere de novo e entregue o novo ao cliente.
            </Aviso>
          ) : null}
          <ul className="cn-hist" aria-label="Carnês gerados">
            {o.carnes.map((k, i) => <ItemCarne key={k.id} k={k} area={area} ultimo={i === 0} substituidoEm={i > 0 ? o.carnes[i - 1]!.geradoEm : null}
              aoGerar={i === 0 && pode && !desat ? aoAbrir : undefined} aoMandar={i === 0 && vigente && !desat ? () => setWhats(k.id) : undefined} />)}
          </ul>
          {desat ? null : <LinhaChave o={o} />}
        </>
      );
    }
  }
  return (
    <section className="folha cn-folha" aria-labelledby="t-cn">
      <div className="folha-cab">
        <div>
          <h2 id="t-cn"><Icone nome="carne" className="ico" />Carnê</h2>
          <p className="sub">{o && o !== "erro" ? `Contrato ${o.contrato.numero} · ` : ""}modelo T3jus</p>
        </div>
      </div>
      <div className="cn-folha-corpo">{corpo}</div>
      {aberta && o && o !== "erro" ? (
        <JanelaCarne o={o} area={area} escritorio={escritorio} aoFechar={aoFechar}
          aoFeito={(id) => { window.location.href = rotaCarne(id, area, true); }} />
      ) : null}
      {whats ? (
        <JanelaWhats carne={whats} area={area} aoFechar={() => setWhats(null)}
          aoEnviado={(para) => {
            setWhats(null);
            setFeito({ titulo: "Carnê na fila do WhatsApp", texto: `A mensagem para ${para} sai pelo número do escritório e fica na ficha, com a situação do envio.` });
            setVez((v) => v + 1);
          }} />
      ) : null}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </section>
  );
}

/** Baixa o PDF gerado no servidor (F3.79) pelo link curto. */
async function baixarPdf(id: string, area: AreaCarne): Promise<string | null> {
  const r = await chamarPortal<PdfDoCarne>(`/v1/escritorio/carnes/${id}/pdf?area=${area.toLowerCase()}`);
  if (!r.ok) return textoDoErro(r.erro);
  const a = document.createElement("a");
  a.href = r.dados.url;
  a.download = r.dados.nome;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  return null;
}

const SITUACAO_ENVIO: Record<string, string> = {
  NA_FILA: "na fila, esperando a ligação do WhatsApp com a Meta", ENVIADA: "enviado", ENTREGUE: "entregue", LIDA: "lido", FALHOU: "não foi entregue",
};

function LinhaEnvios({ envios }: { envios: EnvioCarne[] }) {
  if (!envios.length) return null;
  return (
    <small className="cn-envios">
      <Icone nome="whats" className="ico ico-s" />
      {envios.map((e) => `${e.para} em ${diaCurto(diaDoInstante(e.em))}, às ${horaDoInstante(e.em)}: ${SITUACAO_ENVIO[e.envio ?? "NA_FILA"] ?? "na fila"}`).join(" · ")}
    </small>
  );
}

function ItemCarne({ k, area, ultimo, substituidoEm, aoGerar, aoMandar }: {
  k: CarneGerado; area: AreaCarne; ultimo: boolean; substituidoEm: string | null; aoGerar?: () => void; aoMandar?: () => void;
}) {
  const folhas = folhasDoCarne(k.parcelas, k.formato, k.capa);
  const desat = k.mudancas.length > 0;
  const [baixando, setBaixando] = useState(false);
  const [falhaPdf, setFalhaPdf] = useState<string | null>(null);
  return (
    <li>
      <Icone nome="carne" className="ico" />
      <div>
        <strong>{faixaDeParcelas(k.parcelas)}{k.formato === "TRES" && k.capa ? " · com capa" : ""} · {contar(folhas, "folha A4", "folhas A4")}</strong>
        <small>Gerado por {k.geradoPor.nome} em {diaCurto(diaDoInstante(k.geradoEm))}, às {horaDoInstante(k.geradoEm)}{k.comPix ? "" : " · sem Pix, com as instruções em texto"}</small>
        {!ultimo && substituidoEm ? <SeloCarne tom="neutro">Substituído pelo de {diaCurto(diaDoInstante(substituidoEm))}</SeloCarne>
          : desat ? <SeloCarne tom="atencao" icone="alerta">Desatualizado</SeloCarne>
          : <SeloCarne tom="ativo" icone="check">Em dia com as parcelas</SeloCarne>}
        <LinhaEnvios envios={k.envios ?? []} />
      </div>
      <div className="cn-acoes">
        <a className="btn btn-sec btn-compacto" href={rotaCarne(k.id, area)}><Icone nome="impressora" className="ico" />Abrir para imprimir</a>
        <button className="btn btn-sec btn-compacto" type="button" disabled={baixando} aria-busy={baixando || undefined}
          onClick={async () => { setBaixando(true); setFalhaPdf(await baixarPdf(k.id, area)); setBaixando(false); }}>
          <Icone nome={baixando ? "relogio" : "baixar"} className="ico" />{baixando ? "Gerando o PDF…" : "Baixar PDF"}
        </button>
        {aoMandar ? <button className="btn btn-sec btn-compacto" type="button" onClick={aoMandar}><Icone nome="whats" className="ico" />Mandar pelo WhatsApp</button> : null}
        {aoGerar ? <button className="btn btn-sec btn-compacto" type="button" onClick={aoGerar}><Icone nome="reenviar" className="ico" />Gerar de novo</button> : null}
      </div>
      {falhaPdf ? <p className="erro-campo" role="alert" style={{ gridColumn: "1 / -1" }}>Não deu para gerar o PDF. {falhaPdf}</p> : null}
    </li>
  );
}

const BLOQUEIOS: Record<string, (nome: string) => string> = {
  WHATSAPP_NAO_LIGADO: () => "O WhatsApp do escritório ainda não está ligado ao T3jus. Quando a ligação com a Meta ficar pronta, o carnê sai daqui. Enquanto isso, baixe o PDF e mande por fora.",
  SEM_WHATSAPP: () => "O contato principal da ficha não tem celular. Cadastre um celular na ficha do cliente, ou baixe o PDF e entregue por outro meio.",
  JANELA_FECHADA_SEM_MODELO: (nome) => `${nome} não escreve ao escritório há mais de 24 horas. Fora dessa janela, o WhatsApp só aceita aviso aprovado pela Meta, e o aviso “Carnê de pagamento” ainda não foi aprovado. Peça para ${nome} escrever, ou baixe o PDF e mande por fora.`,
};

/** Prévia da mensagem antes de mandar o carnê pelo WhatsApp (estado carne-whats). */
function JanelaWhats({ carne, area, aoFechar, aoEnviado }: { carne: string; area: AreaCarne; aoFechar: () => void; aoEnviado: (para: string) => void }) {
  const [p, setP] = useState<PreviaEnvioCarne | null | "erro">(null);
  const [tambem, setTambem] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<PreviaEnvioCarne>(`/v1/escritorio/carnes/${carne}/envio?area=${area.toLowerCase()}`).then((r) => { if (vivo) setP(r.ok ? r.dados : "erro"); });
    return () => { vivo = false; };
  }, [carne, area]);
  const pronta = p && p !== "erro" ? p : null;
  const nome = pronta?.para ? pronta.para.nome.split(" ")[0]! : "o cliente";
  async function enviar() {
    if (!pronta || pronta.bloqueio) return;
    setEnviando(true);
    setFalha(null);
    const r = await chamarPortal<{ envios: EnvioCarne[] }>(`/v1/escritorio/carnes/${carne}/envios`, { corpo: { area, texto: pronta.texto, tambemCliente: tambem } });
    setEnviando(false);
    if (r.ok) aoEnviado(pronta.para!.nome);
    else setFalha(textoDoErro(r.erro));
  }
  let corpo: ReactNode;
  if (p === "erro") corpo = <ErroAoCarregar oque="a prévia da mensagem" aoTentar={() => setP(null)} />;
  else if (!pronta) corpo = <Carregando rotulo="Gerando o PDF e a prévia…" linhas={3} />;
  else {
    const kb = Math.max(1, Math.round(pronta.arquivo.tamanho / 1024));
    corpo = (
      <>
        <p id="janela-whats-d">Confira a mensagem antes de enviar.</p>
        {falha ? <Aviso tom="urgencia" titulo="Não deu para mandar.">{falha} Nada foi enviado.</Aviso> : null}
        {pronta.bloqueio ? <Aviso tom="atencao" titulo="O carnê ainda não pode ir pelo WhatsApp.">{BLOQUEIOS[pronta.bloqueio]!(nome)}</Aviso> : null}
        <div className="fi-zap">
          <p className="fi-zap-cab"><Icone nome="whats" className="ico" />
            {pronta.para ? <>Para {pronta.para.nome}{pronta.para.papel ? ` (${pronta.para.papel} de ${pronta.cliente.nome.split(" ")[0]})` : ""} · {telefoneBr(pronta.para.telefone)} · WhatsApp do escritório</> : "Sem celular no contato principal"}
          </p>
          <div className="fi-balao">
            {pronta.texto.split("\n\n").map((t, i) => <p key={i} style={i ? { marginTop: 6 } : undefined}>{t}</p>)}
            <div className="cn-anexo"><Icone nome="doc" className="ico" /><span><b>{pronta.arquivo.nome}</b>{contar(pronta.arquivo.folhas, "folha A4", "folhas A4")} · {kb} KB</span></div>
            <small>Prévia · ainda não enviada</small>
          </div>
        </div>
        {!pronta.bloqueio && pronta.ultimaDoCliente ? (
          <p className="fi-ref"><Icone nome="check" className="ico" />
            <span>A conversa está aberta: {nome} escreveu ao escritório em {diaCurto(diaDoInstante(pronta.ultimaDoCliente))}, às {horaDoInstante(pronta.ultimaDoCliente)}. A mensagem vai agora, com o PDF.</span></p>
        ) : null}
        {pronta.titular ? (
          <label className="opcao"><input className="marcar" type="checkbox" checked={tambem} disabled={!!pronta.bloqueio} onChange={(e) => setTambem(e.target.checked)} />
            <span>Mandar também a {pronta.titular.nome.split(" ")[0]}<small>{telefoneBr(pronta.titular.telefone)}, o número do cliente na ficha</small></span></label>
        ) : null}
      </>
    );
  }
  return (
    <Janela id="janela-whats" aberta aoFechar={aoFechar} sobretitulo="Carnê" titulo="Mandar o carnê pelo WhatsApp" descricao="janela-whats-d" aoEnviar={() => void enviar()}
      pe={
        <>
          {pronta?.bloqueio ? (
            <button className="btn btn-sec" type="button" onClick={async () => { const e = await baixarPdf(carne, area); if (e) setFalha(e); }}>
              <Icone nome="baixar" className="ico" />Baixar PDF
            </button>
          ) : null}
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Voltar</button>
          <button className="btn btn-pri" type="submit" disabled={!pronta || !!pronta.bloqueio || enviando} aria-busy={enviando || undefined}>
            <Icone nome={enviando ? "relogio" : "whats"} className="ico" />{enviando ? "Enviando…" : `Enviar a ${nome}`}
          </button>
        </>
      }>
      <div style={{ display: "grid", gap: 16 }}>{corpo}</div>
    </Janela>
  );
}

type Modo = "A_VENCER" | "ESCOLHER";

const podeEntrar = (p: ParcelaParaCarne) => p.situacao !== "PAGA" && p.situacao !== "CANCELADA";

/** O carnê como vai sair, montado na tela para a prévia da janela (o servidor guarda o de verdade). */
function previaDoCarne(o: OpcoesCarne, escritorio: EscritorioPortal, ps: ParcelaParaCarne[], formato: FormatoCarne, capa: boolean, hoje: string): CarneParaImprimir {
  const r = o.recebimento;
  const pix = r.pixTipo && r.pixChave && r.recebedor && r.cidade ? { tipo: r.pixTipo, chave: r.pixChave, recebedor: r.recebedor, cidade: r.cidade } : null;
  return {
    id: "previa", formato, capa: formato === "TRES" && capa, geradoEm: new Date().toISOString(),
    // Com a 0890, o timbrado de hoje (com o WhatsApp que vai sair); antes dela, o nome e a sede da sessão.
    escritorio: o.timbrado ?? { nome: escritorio.nome, cnpj: escritorio.cnpj, endereco: escritorio.endereco, cidade: escritorio.cidade, uf: escritorio.uf, whatsapp: null },
    cliente: { nome: o.cliente.nome, documento: null, tipo: "PF" },
    contrato: { id: o.contrato.id, numero: o.contrato.numero, objeto: o.contrato.objeto },
    pix, instrucoes: r.instrucoes,
    parcelas: ps.map((p) => {
      const base = { descricao: p.descricao, ordem: p.ordem, total: p.total, vencimento: p.vencimento, valor: p.valor, semValor: p.vencimento < hoje, txid: txidParcela(o.contrato.numero, p.ordem) };
      return { ...base, pix: pixDaParcela(pix, base, o.contrato.numero) };
    }),
    mudancas: [],
  };
}

function JanelaCarne({ o, area, escritorio, aoFechar, aoFeito }: {
  o: OpcoesCarne; area: AreaCarne; escritorio: EscritorioPortal; aoFechar: () => void; aoFeito: (id: string) => void;
}) {
  const hoje = hojeBrasilia();
  const possiveis = o.parcelas.filter(podeEntrar);
  const aVencer = possiveis.filter((p) => p.vencimento >= hoje);
  const [modo, setModo] = useState<Modo>(aVencer.length ? "A_VENCER" : "ESCOLHER");
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set((aVencer.length ? aVencer : possiveis).map((p) => p.id)));
  const [formato, setFormato] = useState<FormatoCarne>("TRES");
  const [capa, setCapa] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [falha, setFalha] = useState<string | null>(null);
  const [semEscolha, setSemEscolha] = useState(false);
  // F3.80: o pedido da chave à sócia dona (aviso no sino dela).
  const [pedido, setPedido] = useState<"nao" | "pedindo" | "pedido" | string>(o.chavePedida ? "pedido" : "nao");
  const corpo = useRef<HTMLDivElement>(null);

  const escolhidas = modo === "A_VENCER" ? aVencer : possiveis.filter((p) => marcadas.has(p.id));
  const total = escolhidas.reduce((s, p) => s + p.valor, 0);
  const folhas = folhasDoCarne(escolhidas.map((p) => ({ semValor: p.vencimento < hoje })), formato, capa);
  const r = o.recebimento;
  const comPix = !!(r.pixTipo && r.pixChave);
  const dona = o.socioDono?.nome ?? "a sócia dona";
  const chaves = escolhidas.map((p) => p.id).join();
  const previa = useMemo(() => {
    const ps = o.parcelas.filter((p) => chaves.split(",").includes(p.id));
    return ps.length ? previaDoCarne(o, escritorio, ps, formato, capa, hoje) : null;
  }, [o, escritorio, chaves, formato, capa, hoje]);

  function marcar(id: string, sim: boolean) {
    setSemEscolha(false);
    setMarcadas((m) => {
      const n = new Set(m);
      if (sim) n.add(id); else n.delete(id);
      return n;
    });
  }

  async function pedirChave() {
    setPedido("pedindo");
    const res = await chamarPortal<PedidoChavePix>("/v1/escritorio/recebimento/pedido", { corpo: { area, contratoId: o.contrato.id } });
    setPedido(res.ok ? "pedido" : textoDoErro(res.erro));
  }

  async function gerar() {
    setFalha(null);
    if (!escolhidas.length) {
      setSemEscolha(true);
      return focarPrimeiroErro(corpo.current);
    }
    setEnviando(true);
    const res = await chamarPortal<{ id: string; parcelas: number }>(`/v1/escritorio/contratos/${o.contrato.id}/carnes`, {
      corpo: { area, parcelas: escolhidas.map((p) => p.id), formato, capa: formato === "TRES" && capa },
    });
    if (res.ok) return aoFeito(res.dados.id);
    setEnviando(false);
    setFalha(textoDoErro(res.erro));
  }

  const descParcelas = (p: ParcelaParaCarne) =>
    p.situacao === "PAGA" ? `Paga${p.pagaEm ? ` em ${diaCurto(p.pagaEm)}` : ""}: não entra.`
      : p.vencimento < hoje ? `Venceu em ${diaCurto(p.vencimento)}. Sai marcada "vencida", com o Pix sem valor, para o valor com multa e juros combinado.`
      : p.situacao === "PARCIAL" ? `Vence em ${dataBr(p.vencimento)}. Já entrou parte: o carnê mostra o valor cheio.`
      : `Vence em ${dataBr(p.vencimento)}`;

  return (
    <Janela id="janela-carne" classe="cn-janela" aberta aoFechar={aoFechar} sobretitulo={`${area === "CONTRATOS" ? "Contratos" : "A receber"} · ${o.contrato.numero}`}
      titulo="Gerar carnê" descricao="janela-carne-d" aoEnviar={() => void gerar()}
      pe={
        <>
          <span className="cn-sobre-pe">O carnê fica guardado na ficha, com quem gerou e quando. Na página dele, imprima ou salve em PDF.</span>
          <button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome={enviando ? "relogio" : "impressora"} className="ico" />
            {enviando ? "Gerando o carnê…" : falha ? "Tentar de novo" : "Gerar e imprimir"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="janela-carne-d">{o.cliente.nome} · {o.contrato.objeto} · {contar(o.parcelas.length, "parcela", "parcelas")}.</p>
        {falha ? <Aviso tom="urgencia" titulo="Não deu para gerar o carnê.">{falha} Nada foi guardado.</Aviso> : null}
        {semEscolha ? <Aviso tom="urgencia" titulo={faltaAcertar(1)}>Escolha ao menos uma parcela para o carnê.</Aviso> : null}
        {!comPix ? (
          <Aviso tom="atencao" titulo="O escritório ainda não tem chave Pix no T3jus."
            acoes={o.dono ? <a className="btn btn-sec" href={ROTAS_ESCRITORIO.recebimento}><Icone nome="moeda" className="ico" />Cadastrar a chave Pix</a>
              : o.socioDono ? (
                <button className="btn btn-sec" type="button" onClick={() => void pedirChave()} disabled={pedido === "pedindo" || pedido === "pedido"}
                  aria-busy={pedido === "pedindo" || undefined}>
                  <Icone nome={pedido === "pedido" ? "check" : "sino"} className="ico" />
                  {pedido === "pedido" ? `Pedido a ${dona}` : pedido === "pedindo" ? "Pedindo…" : `Pedir a ${dona}`}
                </button>
              ) : undefined}>
            {o.dono ? "Sem ela, o carnê sai com as instruções de pagamento em texto. Com a chave, cada parcela ganha o QR e o Pix copia e cola."
              : `Quem cadastra é ${dona}, a sócia dona. Enquanto isso, o carnê sai com as instruções de pagamento em texto.`}
            {!o.dono ? (
              <span className="cn-pedido" role="status">
                {pedido === "pedido" ? ` ${dona} recebeu o pedido no sino. Quando ela cadastrar, gere o carnê de novo para ter o QR.`
                  : pedido !== "nao" && pedido !== "pedindo" ? ` Não deu para pedir: ${pedido}` : ""}
              </span>
            ) : null}
          </Aviso>
        ) : null}
        <div className="cn-j">
          <div className="cn-j-op">
            <fieldset className="fi-grupo-op">
              <legend>Parcelas</legend>
              <label className="opcao">
                <input className="marcar" type="radio" name="cn-p" checked={modo === "A_VENCER"} disabled={!aVencer.length} data-foco={modo === "A_VENCER" ? "" : undefined}
                  onChange={() => { setModo("A_VENCER"); setSemEscolha(false); }} />
                <span>As que ainda vão vencer<small>{aVencer.length ? `${faixaDeParcelas(aVencer)} · ${contar(aVencer.length, "parcela", "parcelas")} · ${reais(aVencer.reduce((s, p) => s + p.valor, 0))}` : "Nenhuma parcela a vencer neste contrato."}</small></span>
              </label>
              <label className="opcao">
                <input className="marcar" type="radio" name="cn-p" checked={modo === "ESCOLHER"} data-foco={modo === "ESCOLHER" ? "" : undefined}
                  onChange={() => setModo("ESCOLHER")} />
                <span>Escolher as parcelas<small>Para incluir uma vencida ou deixar alguma de fora</small></span>
              </label>
              {modo === "ESCOLHER" ? (
                <ul className="cn-parcs" aria-label="Parcelas do contrato">
                  {o.parcelas.map((p) => {
                    const ok = podeEntrar(p);
                    return (
                      <li key={p.id} className={ok ? undefined : "cn-paga"}>
                        <label className="opcao">
                          <input className="marcar" type="checkbox" disabled={!ok} checked={ok && marcadas.has(p.id)} onChange={(e) => marcar(p.id, e.target.checked)}
                            aria-invalid={semEscolha || undefined} />
                          <span>
                            <b>Parcela {p.ordem}/{p.total} · {maiuscula(nomeDoMes(p.vencimento))}</b>
                            <span className="num">{reais(p.valor)}</span>
                            <small>{descParcelas(p)}</small>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </fieldset>
            <div className="cn-dois">
              <fieldset className="fi-grupo-op">
                <legend>Formato</legend>
                <label className="opcao">
                  <input className="marcar" type="radio" name="cn-f" checked={formato === "TRES"} onChange={() => setFormato("TRES")} />
                  <span>3 parcelas por folha<small>Recomendado. Canhoto e via do cliente lado a lado.</small></span>
                </label>
                <label className="opcao">
                  <input className="marcar" type="radio" name="cn-f" checked={formato === "UM"} onChange={() => setFormato("UM")} />
                  <span>1 parcela por folha<small>Maior, para imprimir ou mandar uma por mês. Cada folha já explica como pagar.</small></span>
                </label>
              </fieldset>
              <fieldset className="fi-grupo-op">
                <legend>Capa</legend>
                <label className="opcao">
                  <input className="marcar" type="checkbox" checked={formato === "TRES" && capa} disabled={formato === "UM"} onChange={(e) => setCapa(e.target.checked)} />
                  <span>Incluir a capa<small>{formato === "UM" ? "Só no formato de 3 por folha." : "Todas as parcelas, o total e como pagar."}</small></span>
                </label>
              </fieldset>
            </div>
            {comPix ? (
              <div className="cn-pixbox">
                <h3><Icone nome="moeda" className="ico" />Pix do escritório</h3>
                <dl>
                  <dt>Chave ({nomeTipo(r.pixTipo!)})</dt><dd>{chavePixParaLer(r.pixTipo!, r.pixChave!)}</dd>
                  <dt>Recebedor</dt><dd>{r.recebedor} · {r.cidade}</dd>
                </dl>
                <p>
                  Cada parcela leva o QR e o Pix copia e cola com o valor e um identificador, como <b className="num">{txidParcela(o.contrato.numero, escolhidas[0]?.ordem ?? 1)}</b>.
                  O Pix do carnê não dá baixa sozinho: quando o cliente pagar, use Registrar recebimento.
                </p>
                {o.dono
                  ? <p className="cn-quem"><Icone nome="lapis" className="ico" /><span>Mudar em <a href={ROTAS_ESCRITORIO.recebimento}>Escritório › Recebimento</a>.</span></p>
                  : <p className="cn-quem"><Icone nome="cadeado" className="ico" /><span>Só {dona}, a sócia dona, muda a chave.</span></p>}
              </div>
            ) : (
              <div className="cn-pixbox">
                <h3><Icone nome="doc" className="ico" />Como pagar (no lugar do Pix)</h3>
                <p>{r.instrucoes ?? "O escritório ainda não escreveu as instruções de pagamento. O carnê pede ao cliente que combine a forma com o escritório."}</p>
                <p className="cn-quem"><Icone nome="cadeado" className="ico" /><span>As do escritório, em Escritório › Recebimento.</span></p>
              </div>
            )}
          </div>
          <aside aria-label="Prévia do carnê">
            <figure className="cn-mini">
              <div className="cn-mini-img" aria-hidden="true">
                {previa ? <div style={{ transform: "scale(0.3276)", width: "210mm" }}><FolhasCarne c={previa} ate={1} /></div> : null}
              </div>
              <figcaption>
                <b>{escolhidas.length ? contar(folhas, "folha A4", "folhas A4") : "Nenhuma parcela escolhida"}</b>
                {escolhidas.length
                  ? <>{formato === "TRES" && capa ? "Capa e " : ""}{faixaDeParcelas(escolhidas).replace(/^P/, formato === "TRES" && capa ? "p" : "P")} · {reais(total)}{comPix ? "" : ". Sem QR: as instruções em texto"}.</>
                  : "Escolha ao menos uma parcela."}
                <br />
                <span style={{ fontSize: 12, color: "var(--texto-2)" }}>Prévia da primeira folha.</span>
              </figcaption>
            </figure>
          </aside>
        </div>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------------- Escritório › Recebimento

type Campo = "pixTipo" | "pixChave" | "recebedor" | "cidade" | "instrucoes";

function Contador({ n, limite }: { n: number; limite: number }) {
  return <span className={n > limite ? "contador cn-passou" : "contador"} aria-hidden="true">{n} de {limite}</span>;
}

function TesteDoPix({ tipo, chave, recebedor, cidade }: { tipo: TipoChavePix | ""; chave: string; recebedor: string; cidade: string }) {
  const norm = tipo ? normalizarChavePix(tipo, chave) : null;
  const rec = textoPix(recebedor);
  const cid = textoPix(cidade);
  const ok = norm && rec && rec.length <= LIMITE_RECEBEDOR && cid && cid.length <= LIMITE_CIDADE;
  if (!ok) {
    return (
      <div className="cn-teste cn-teste-vazio">
        <Icone nome="qr" className="ico" />
        <div><h3>Pix de teste</h3><p>O QR de teste aparece quando a chave, o nome e a cidade estiverem preenchidos e certos.</p></div>
      </div>
    );
  }
  return (
    <div className="cn-teste">
      <QrPix className="cn-qr" texto={brCodePix({ chave: norm, recebedor: rec, cidade: cid, valor: null, txid: "TESTE" })} rotulo="QR Code do Pix de teste, sem valor" />
      <div>
        <h3>Pix de teste</h3>
        <p>Escaneie com o app do banco. Deve aparecer <b>{rec}</b>. Não precisa pagar: é só para conferir.</p>
      </div>
    </div>
  );
}

function OndeAparece({ r }: { r: RecebimentoEscritorio }) {
  const dona = r.socioDono?.nome ?? "a sócia dona";
  return (
    <aside className="fi-col" aria-label="Sobre o recebimento">
      <section className="folha" aria-labelledby="t-ro">
        <div className="folha-cab"><div><h2 id="t-ro">Onde isso aparece</h2></div></div>
        <div className="cn-folha-corpo">
          <ul className="cn-lista">
            <li><Icone nome="carne" className="ico" /><span><b>Carnê de cada contrato</b>: o QR, o Pix copia e cola, a chave e o recebedor em cada parcela.</span></li>
            <li><Icone nome="doc" className="ico" /><span><b>Capa do carnê</b>: as instruções de pagamento. Sem chave Pix, elas vão no lugar do Pix.</span></li>
            <li><Icone nome="doc" className="ico" /><span><b>Recibo de cada recebimento</b>: a marca e o registro na OAB no timbrado.</span></li>
            <li><Icone nome="check" className="ico" /><span><b>A baixa continua manual</b>, em Registrar recebimento. O identificador da parcela ajuda a achar o pagamento no extrato.</span></li>
          </ul>
        </div>
        <p className="pt-pe-folha">
          <Icone nome="cadeado" className="ico" />
          <span>
            Quem muda: só {dona}, a sócia dona. Toda mudança fica no histórico do escritório.
            {r.atualizadoEm ? ` Última mudança: ${r.atualizadoPor?.nome ?? "alguém da equipe"}, em ${diaCurto(diaDoInstante(r.atualizadoEm))}, às ${horaDoInstante(r.atualizadoEm)}.` : ""}
          </span>
        </p>
      </section>
    </aside>
  );
}

/** O que a marca e o timbrado usam do escritório. */
function dadosTimbrado(e: EscritorioPortal, oab: string | null): DadosTimbrado {
  const cnpj = e.cnpj ? e.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : null;
  const local = [e.endereco, [e.cidade, e.uf].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || null;
  return { nome: e.nome, cnpj, oab, local };
}

function estadoDaMarca(r: RecebimentoEscritorio): EstadoMarca {
  const logo = r.marca === "LOGO" ? r.logo ?? null : null;
  return {
    marca: logo ? "LOGO" : "LETRA", logo, jeito: r.logoJeito ?? (logo && logo.largura < 2 * logo.altura ? "LOGO_E_NOME" : "SO_LOGO"),
    cor: r.logoCor ?? "ARQUIVO", oabUf: r.oabUf ?? "", oabNumero: r.oabNumero ?? "",
  };
}

function SoLeitura({ r, escritorio }: { r: RecebimentoEscritorio; escritorio: EscritorioPortal }) {
  const tem = r.pixTipo && r.pixChave;
  return (
    <div className="fi-col">
      <section className="folha" aria-labelledby="t-rb">
        <div className="folha-cab">
          <div>
            <h2 id="t-rb"><Icone nome="moeda" className="ico" />Chave Pix do escritório</h2>
            <p className="sub">{tem && r.atualizadoEm ? `Cadastrada por ${r.atualizadoPor?.nome ?? "a sócia dona"} em ${diaCurto(diaDoInstante(r.atualizadoEm))}` : "Ainda sem chave Pix"}</p>
          </div>
        </div>
        <div className="cn-form">
          <dl className="cn-ro">
            <div><dt>{tem ? `Chave Pix (${nomeTipo(r.pixTipo!)})` : "Chave Pix"}</dt><dd className="num">{tem ? chavePixParaLer(r.pixTipo!, r.pixChave!) : "Nenhuma: o carnê sai com as instruções em texto"}</dd></div>
            <div><dt>Nome do recebedor</dt><dd>{r.recebedor ?? "—"}</dd></div>
            <div><dt>Cidade</dt><dd>{r.cidade ?? "—"}</dd></div>
            <div><dt>Instruções de pagamento</dt><dd style={{ fontWeight: 400 }}>{r.instrucoes ?? "—"}</dd></div>
            <MarcaParaLer e={estadoDaMarca(r)} d={dadosTimbrado(escritorio, r.oab ?? null)}
              desde={r.marca === "LOGO" && r.atualizadoEm ? diaCurto(diaDoInstante(r.atualizadoEm)) : null} />
          </dl>
          {tem ? <TesteDoPix tipo={r.pixTipo!} chave={r.pixChave!} recebedor={r.recebedor ?? ""} cidade={r.cidade ?? ""} /> : null}
        </div>
      </section>
    </div>
  );
}

function FormRecebimento({ r, escritorio, aoSalvo }: { r: RecebimentoEscritorio; escritorio: EscritorioPortal; aoSalvo: (s: RecebimentoSalvo, trocou: boolean, marca: string | null) => void }) {
  const [tipo, setTipo] = useState<TipoChavePix | "">(r.pixTipo ?? "");
  const [chave, setChave] = useState(r.pixTipo && r.pixChave ? chavePixParaLer(r.pixTipo, r.pixChave) : "");
  const [recebedor, setRecebedor] = useState(r.recebedor ?? "");
  const [cidade, setCidade] = useState(r.cidade ?? "");
  const [instrucoes, setInstrucoes] = useState(r.instrucoes ?? "");
  const [erros, setErros] = useState<Campo[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [marca, setMarca] = useState<EstadoMarca>(() => estadoDaMarca(r));
  const [versao, setVersao] = useState(r.versao);
  const [naoSalvo, setNaoSalvo] = useState<number | null>(null);
  const [erroMarca, setErroMarca] = useState(false);
  const [remover, setRemover] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const mudarMarca = (m: Partial<EstadoMarca>) => {
    setMarca((x) => ({ ...x, ...m }));
    if (m.marca || m.logo) setErroMarca(false);
    if (m.cor) setNaoSalvo(null);
  };
  const salvoEm = r.marca === "LOGO" && r.logo && r.atualizadoEm ? `salvo em ${diaCurto(diaDoInstante(r.atualizadoEm))}, às ${horaDoInstante(r.atualizadoEm)}` : null;
  const tem = (c: Campo) => erros.includes(c);
  /** Ao mexer num campo, o erro dele sai (volta no próximo Salvar, se ainda valer). */
  const limpar = (...cs: Campo[]) => setErros((e) => (e.some((x) => cs.includes(x)) ? e.filter((x) => !cs.includes(x)) : e));

  const norm = tipo && chave.trim() ? normalizarChavePix(tipo, chave) : null;
  const rec = textoPix(recebedor);
  const cid = textoPix(cidade);
  const vazio = !r.pixChave;

  function conferir(): Campo[] {
    const e: Campo[] = [];
    const algum = tipo || chave.trim() || recebedor.trim() || cidade.trim();
    if (algum) {
      if (!tipo) e.push("pixTipo");
      if (!chave.trim() || (tipo && !norm)) e.push("pixChave");
      if (!rec || rec.length > LIMITE_RECEBEDOR) e.push("recebedor");
      if (!cid || cid.length > LIMITE_CIDADE) e.push("cidade");
    }
    const i = instrucoes.trim();
    if (i && (i.length < 3 || i.length > LIMITE_INSTRUCOES)) e.push("instrucoes");
    return e;
  }

  /** A marca (F3.81): logo marcado sem arquivo. A OAB da sociedade se muda em Dados do escritório (PA-07). */
  function conferirMarca(): { marca: boolean } {
    return { marca: marca.marca === "LOGO" && !marca.logo };
  }

  const trocaChave = () => !!r.pixChave && (norm !== r.pixChave || rec !== (r.recebedor ?? "") || cid !== (r.cidade ?? ""));

  function pedirSalvar() {
    setFalha(null);
    const e = conferir();
    const m = conferirMarca();
    setErros(e);
    setErroMarca(m.marca);
    if (e.length || m.marca) {
      if (!e.length && m.marca) return requestAnimationFrame(() => document.getElementById("lg-logo")?.querySelector<HTMLElement>("label.btn")?.focus());
      return focarPrimeiroErro(form.current);
    }
    if (trocaChave()) { setConfirmar(true); return; }
    void salvar();
  }

  async function salvar(semLogo = false) {
    setConfirmar(false);
    setRemover(false);
    setSalvando(true);
    const algum = !!tipo;
    const m = semLogo ? { ...marca, marca: "LETRA" as const } : marca;
    const res = await chamarPortal<RecebimentoSalvo>("/v1/escritorio/recebimento", {
      metodo: "PUT",
      corpo: {
        versao, pixTipo: algum ? tipo : null, pixChave: algum ? chave : null, recebedor: algum ? recebedor : null, cidade: algum ? cidade : null, instrucoes: instrucoes.trim() || null,
        marca: m.marca, logoId: m.marca === "LOGO" ? m.logo?.id ?? null : null,
        logoJeito: m.marca === "LOGO" ? m.jeito : null, logoCor: m.marca === "LOGO" ? m.cor : null,
      },
    });
    setSalvando(false);
    if (res.ok && res.dados.naoSalvo) {
      // Pergunta 7: o resto foi salvo e a marca não; a página fica aberta para escolher outra forma.
      setVersao(res.dados.versao);
      setNaoSalvo(res.dados.naoSalvo.contraste);
      return requestAnimationFrame(() => document.querySelector<HTMLElement>('input[name="lg-c"][aria-invalid="true"]')?.focus());
    }
    if (res.ok) return aoSalvo(res.dados, trocaChave(), semLogo ? "remover" : m.marca === "LOGO" && (r.marca !== "LOGO" || r.logo?.id !== m.logo?.id) ? "logo" : null);
    const c = res.erro.detalhes?.campos;
    if (res.erro.codigo === "VALIDATION_ERROR" && Array.isArray(c) && c.length) {
      const cs = c.map(String);
      setErros(cs as Campo[]);
      return focarPrimeiroErro(form.current);
    }
    setFalha(res.erro.codigo === "VERSION_CONFLICT" ? "Outra pessoa mudou o recebimento antes de você. Recarregue a página para ver o que mudou." : textoDoErro(res.erro));
  }

  const ajudaChave = tipo === "CNPJ" ? "O CNPJ cadastrado como chave no banco, na conta do escritório." : tipo === "CELULAR" ? "O celular cadastrado como chave, com DDD." : "A chave cadastrada no banco, na conta do escritório.";
  const erroChave = !chave.trim() ? "Escreva a chave Pix do escritório."
    : tipo === "CNPJ" ? "Este CNPJ não confere: veja os dois últimos números."
    : tipo === "CPF" ? "Este CPF não confere: veja os dois últimos números."
    : tipo === "EMAIL" ? "Escreva um e-mail completo, como financeiro@escritorio.adv.br."
    : tipo === "CELULAR" ? "Escreva o celular com DDD, como (11) 97405-2210."
    : tipo === "ALEATORIA" ? "A chave aleatória tem 32 letras e números, separados por traços. Copie do app do banco."
    : "Escolha primeiro o tipo da chave.";
  const descNova = norm && tipo ? `${nomeTipo(tipo)} ${chavePixParaLer(tipo, norm)}` : "";
  const descHoje = r.pixTipo && r.pixChave ? `${nomeTipo(r.pixTipo)} ${chavePixParaLer(r.pixTipo, r.pixChave)}` : "";

  return (
    <>
    <form ref={form} className="fi-col" noValidate aria-label="Recebimento" onSubmit={(e) => { e.preventDefault(); pedirSalvar(); }}>
      <section className="folha" aria-labelledby="t-rb">
        <div className="folha-cab">
          <div>
            <h2 id="t-rb"><Icone nome="moeda" className="ico" />Chave Pix do escritório</h2>
            <p className="sub">O T3jus monta o Pix de cada parcela com esta chave. O dinheiro vai direto para a conta do escritório.</p>
          </div>
        </div>
        <div className="cn-form">
          {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>{vazio ? "A chave Pix ainda não foi salva." : "Nada foi salvo. Os carnês continuam saindo com a chave anterior."}</Aviso>
            : vazio ? <Aviso tom="info" titulo="Sem chave Pix, o carnê sai só com as instruções em texto.">Com a chave, cada parcela do carnê ganha o QR e o Pix copia e cola, com o valor e o identificador.</Aviso> : null}
          {falha ? <Aviso tom="urgencia" titulo="Não deu para salvar.">{falha}</Aviso> : null}
          <div className="fi-dois">
            <div className="campo">
              <label htmlFor="rb-tipo">Tipo da chave</label>
              <select className="entrada" id="rb-tipo" value={tipo} onChange={(e) => { setTipo(e.target.value as TipoChavePix | ""); limpar("pixTipo", "pixChave"); }}
                aria-invalid={tem("pixTipo") || undefined} aria-describedby={descritoPor(tem("pixTipo") && "rb-tipo-er")} data-foco={vazio ? "" : undefined}>
                <option value="">Escolha o tipo</option>
                {ORDEM_TIPOS.map((t) => <option key={t} value={t}>{nomeTipo(t)}</option>)}
              </select>
              {tem("pixTipo") ? <ErroCampo id="rb-tipo-er">Escolha o tipo da chave: CNPJ, CPF, e-mail, celular ou chave aleatória.</ErroCampo> : null}
            </div>
            <div className="campo">
              <label htmlFor="rb-chave">Chave Pix</label>
              <input className="entrada" id="rb-chave" type="text" autoComplete="off" spellCheck={false} value={chave} onChange={(e) => { setChave(e.target.value); limpar("pixChave"); }} maxLength={120}
                inputMode={tipo === "CNPJ" || tipo === "CPF" || tipo === "CELULAR" ? "numeric" : tipo === "EMAIL" ? "email" : "text"}
                aria-invalid={tem("pixChave") || undefined} aria-describedby={descritoPor(!tem("pixChave") && "rb-chave-aj", tem("pixChave") && "rb-chave-er")} />
              {tem("pixChave") ? <ErroCampo id="rb-chave-er">{erroChave}</ErroCampo> : <p className="ajuda" id="rb-chave-aj">{ajudaChave}</p>}
            </div>
          </div>
          <div className="fi-dois">
            <div className="campo">
              <div className="cn-campo-linha"><label htmlFor="rb-nome">Nome do recebedor</label><Contador n={rec.length} limite={LIMITE_RECEBEDOR} /></div>
              <input className="entrada" id="rb-nome" type="text" autoComplete="off" value={recebedor} onChange={(e) => { setRecebedor(e.target.value); limpar("recebedor"); }} maxLength={60}
                placeholder={textoPix(r.sugestao.recebedor).slice(0, LIMITE_RECEBEDOR)}
                aria-invalid={tem("recebedor") || undefined} aria-describedby={descritoPor(!tem("recebedor") && "rb-nome-aj", tem("recebedor") && "rb-nome-er")} />
              {tem("recebedor")
                ? <ErroCampo id="rb-nome-er">{rec ? `Passa de ${LIMITE_RECEBEDOR} letras. Use como o banco mostra, abreviando se precisar.` : "Escreva o nome como o app do banco mostra a quem paga."}</ErroCampo>
                : <p className="ajuda" id="rb-nome-aj">Como o app do banco mostra a quem paga. Até {LIMITE_RECEBEDOR} letras, sem acento.</p>}
            </div>
            <div className="campo">
              <div className="cn-campo-linha"><label htmlFor="rb-cidade">Cidade</label><Contador n={cid.length} limite={LIMITE_CIDADE} /></div>
              <input className="entrada" id="rb-cidade" type="text" autoComplete="off" value={cidade} onChange={(e) => { setCidade(e.target.value); limpar("cidade"); }} maxLength={60}
                placeholder={r.sugestao.cidade ? textoPix(r.sugestao.cidade).slice(0, LIMITE_CIDADE) : undefined}
                aria-invalid={tem("cidade") || undefined} aria-describedby={descritoPor(!tem("cidade") && "rb-cidade-aj", tem("cidade") && "rb-cidade-er")} />
              {tem("cidade")
                ? <ErroCampo id="rb-cidade-er">{cid ? `Passa de ${LIMITE_CIDADE} letras. Use como o banco mostra.` : "Escreva a cidade da conta, por exemplo SAO PAULO. O Pix exige."}</ErroCampo>
                : <p className="ajuda" id="rb-cidade-aj">A cidade da conta, como o banco mostra. Até {LIMITE_CIDADE} letras.</p>}
            </div>
          </div>
          <TesteDoPix tipo={tipo} chave={chave} recebedor={recebedor} cidade={cidade} />
        </div>
      </section>
      <section className="folha" aria-labelledby="t-ri">
        <div className="folha-cab">
          <div>
            <h2 id="t-ri"><Icone nome="doc" className="ico" />Instruções de pagamento</h2>
            <p className="sub">Vão na capa do carnê. Sem chave Pix, vão no lugar do Pix, em cada parcela.</p>
          </div>
        </div>
        <div className="cn-form">
          <div className="campo">
            <div className="cn-campo-linha">
              <label htmlFor="rb-instr">Texto para o cliente <span className="opcional">(opcional)</span></label>
              <Contador n={instrucoes.trim().length} limite={LIMITE_INSTRUCOES} />
            </div>
            <textarea className="entrada" id="rb-instr" rows={3} value={instrucoes} onChange={(e) => { setInstrucoes(e.target.value); limpar("instrucoes"); }} maxLength={1000}
              aria-invalid={tem("instrucoes") || undefined} aria-describedby={descritoPor(!tem("instrucoes") && "rb-instr-aj", tem("instrucoes") && "rb-instr-er")} />
            {tem("instrucoes")
              ? <ErroCampo id="rb-instr-er">Escreva de 3 a {LIMITE_INSTRUCOES} letras, ou deixe em branco.</ErroCampo>
              : <p className="ajuda" id="rb-instr-aj">Banco, agência e conta, ou outra forma que o escritório aceite. Até {LIMITE_INSTRUCOES} letras.</p>}
          </div>
        </div>
      </section>
      <MarcaTimbrado e={marca} mudar={mudarMarca} d={dadosTimbrado(escritorio, fraseOabSociedade(marca.oabUf, marca.oabNumero))}
        salvoEm={salvoEm} erroMarca={erroMarca} naoSalvo={naoSalvo} aoRemover={() => setRemover(true)} />
      <div className="form-pe">
        <span className="esq-pe">Cada mudança fica no histórico do escritório. Os carnês novos já saem com ela.</span>
        <button className="btn btn-pri" type="submit" disabled={salvando} aria-busy={salvando || undefined}>
          <Icone nome="check" className="ico" />{salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </form>
      <Janela id="janela-trocar" aberta={confirmar} aoFechar={() => setConfirmar(false)} alerta sobretitulo="Recebimento" titulo="Trocar a chave Pix?"
        descricao="janela-trocar-d" aoEnviar={() => void salvar()}
        pe={
          <>
            <button className="btn btn-sec" type="button" onClick={() => setConfirmar(false)} data-foco="">Voltar</button>
            <button className="btn btn-pri" type="submit"><Icone nome="trocar" className="ico" />Trocar a chave</button>
          </>
        }>
        <p id="janela-trocar-d">Os carnês novos saem com a chave nova.</p>
        <ul className="cn-lista" style={{ marginTop: 12 }}>
          <li><Icone nome="moeda" className="ico" /><span>Hoje: <b>{descHoje}</b>{r.recebedor ? ` · ${r.recebedor}` : ""}<br />Depois: <b>{descNova}</b> · {rec}</span></li>
          <li><Icone nome="carne" className="ico" /><span><b>Os carnês já gerados ficam marcados como desatualizados</b>, para gerar de novo. O QR deles continua pagando na chave antiga enquanto ela existir no banco.</span></li>
        </ul>
      </Janela>
      <JanelaRemoverLogo aberta={remover} aoFechar={() => setRemover(false)} aoRemover={() => void salvar(true)} />
    </>
  );
}

export function RecebimentoPortal() {
  const { escritorio, erro: erroEsc } = useEscritorioPortal();
  const [r, setR] = useState<RecebimentoEscritorio | null | "erro">(null);
  const [vez, setVez] = useState(0);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [desat, setDesat] = useState(0);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<RecebimentoEscritorio>("/v1/escritorio/recebimento").then((x) => {
      if (vivo) setR(x.ok ? x.dados : "erro");
    });
    return () => { vivo = false; };
  }, [vez]);

  const trilha = [{ nome: "Escritório", href: ROTAS_ESCRITORIO.dados }, { nome: "Recebimento" }];
  let corpo: ReactNode;
  if (r === "erro" || erroEsc) corpo = <ErroAoCarregar oque="o recebimento" aoTentar={() => { setR(null); setVez((v) => v + 1); }} />;
  else if (!r || !escritorio) corpo = <Carregando rotulo="Carregando o recebimento…" linhas={4} />;
  else {
    const dona = r.socioDono?.nome ?? "a sócia dona";
    corpo = (
      <div className="fi">
        <div className="pt-cab">
          <div>
            <p className="sobretitulo">Escritório</p>
            <h1>Recebimento</h1>
            <span className="fio" aria-hidden="true" />
            <p className="lede">Como os clientes pagam o escritório: a chave Pix, as instruções do carnê e a marca que vai no carnê e no recibo.</p>
          </div>
        </div>
        {!r.dono ? (
          <Aviso tom="info" icone="cadeado" titulo="Você vê esta página só para ler.">
            Quem muda a chave Pix, as instruções e a marca é {dona}, a sócia dona. Se algo estiver errado, fale com ela.
          </Aviso>
        ) : null}
        {desat ? (
          <Aviso tom="atencao" titulo={`${contar(desat, "carnê ficou desatualizado", "carnês ficaram desatualizados")} com a troca da chave.`}>
            Na ficha de cada contrato, a folha Carnê mostra o aviso e o botão Gerar de novo. O carnê novo sai com a chave nova.
          </Aviso>
        ) : null}
        <div className="fi-grade">
          {r.dono
            ? <FormRecebimento key={r.versao} r={r} escritorio={escritorio} aoSalvo={(s, trocou, m) => {
                setDesat(trocou ? s.desatualizados : 0);
                setFeito(m === "logo" ? { titulo: "Marca salva: o logo do escritório.", texto: "Os próximos carnês e recibos já saem com o logo. Os já emitidos ficam como saíram." }
                  : m === "remover" ? { titulo: "Logo removido.", texto: "Os próximos carnês e recibos saem com o nome em letra. Os já emitidos ficam como saíram." }
                  : { titulo: trocou ? "Chave Pix trocada" : "Recebimento salvo", texto: "Os próximos carnês e recibos já saem assim." });
                setVez((v) => v + 1);
              }} />
            : <SoLeitura r={r} escritorio={escritorio} />}
          <OndeAparece r={r} />
        </div>
      </div>
    );
  }
  return (
    <MolduraPortal atual="escritorio" trilha={trilha} escritorio={escritorio} pagina="co-equipe co-carteira" barra={<BarraEscritorio secao="recebimento" financeiro={!!escritorio?.areas.includes("FINANCEIRO")} />}>
      {corpo}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </MolduraPortal>
  );
}
