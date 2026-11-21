"use client";
// O recibo em PDF de um recebimento (FI-14, F3.19), desenho aprovado em
// docs/design/aprovadas/portal-recibo-recorrente (recibo-a4.html; decisões 1.1 a 1.10). Uma
// folha A4 do escritório; o PDF sai da impressão do navegador ("Salvar como PDF") e o título da
// página vira o nome do arquivo. Abre quem tem a área Financeiro ou Contratos; o servidor confere.

import { useEffect, useState } from "react";
import {
  dataBr, documentoComNome, FORMAS_PAGAMENTO, linhasTimbrado, localEData, mesDeReferencia, numeroDoRecibo, parcelaDoRecibo, reais,
  textoDoRecibo, tituloDoRecibo, totalDoRecibo, type ReciboParaImprimir,
} from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { Simbolo } from "../Marca.tsx";
import { Carregando, ErroAoCarregar } from "../console/pecas.tsx";
import { ROTAS_CONTRATOS } from "./contratos.ts";
import { ROTAS_FINANCEIRO } from "./financeiro.ts";
import { chamarPortal } from "./Moldura.tsx";
import { LogoNoDocumento } from "./MarcaTimbrado.tsx";

const fuso = { timeZone: "America/Sao_Paulo" } as const;
const horaDe = (em: string) => new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit" }).format(new Date(em)).replace(":", "h");
const diaDe = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));

/** A folha A4 do recibo. */
export function FolhaRecibo({ r }: { r: ReciboParaImprimir }) {
  const total = totalDoRecibo(r);
  const n = numeroDoRecibo(r);
  const linhas = linhasTimbrado({ ...r.escritorio, oab: r.marca?.oab ?? r.escritorio.oab ?? null, contatos: r.escritorio.contatos ?? undefined });
  const docCli = documentoComNome(r.cliente.documento);
  const venc = dataBr(r.parcela.vencimento);
  return (
    <article className="rb-folha" aria-label={`Recibo nº ${n}`}>
      <header className="rb-timbre">
        {/* O logo do dia do recibo (F3.81, decisão 24), na caixa de até 92 × 20 mm; sem ele, o nome em letra. */}
        {r.marca?.tipo === "LOGO" && r.marca.logoId
          ? <div className="rb-marca"><LogoNoDocumento marca={r.marca} nome={r.escritorio.nome} classe="rb-logo" /></div>
          : <div className="rb-marca"><span className="rb-esc">{r.escritorio.nome}</span><span className="rb-esc-sub">Advocacia</span></div>}
        <p className="rb-ender">
          {linhas.slice(1).map((l, i) => <span key={i}>{i ? <br /> : null}{l}</span>)}
          {r.escritorio.whatsapp ? <><br />WhatsApp {r.escritorio.whatsapp}</> : null}
        </p>
      </header>
      <div className="rb-fio" />
      <div className="rb-topo">
        <div className="rb-titulo"><p className="rb-rot">Recibo de honorários</p><h2>Recibo</h2><p>Nº <b>{n}</b></p></div>
        <div className="rb-valor"><span className="rb-rot">Valor recebido</span><b>{reais(total)}</b></div>
      </div>
      <p className="rb-texto">
        {textoDoRecibo(r).map((p, i) => (p.forte ? <b key={i}>{p.texto}</b> : p.extenso ? <span key={i} className="rb-ext">{p.texto}</span> : <span key={i}>{p.texto}</span>))}
      </p>
      <section className="rb-sec" aria-label="Discriminação do valor">
        <h3>Discriminação</h3>
        <table className="rb-tab">
          <thead><tr><th scope="col">Descrição</th><th scope="col">Valor</th></tr></thead>
          <tbody>
            <tr><td>Honorários · {parcelaDoRecibo(r)}<small>Mês de referência: {mesDeReferencia(r.parcela.vencimento)} · vencimento {venc}</small></td><td>{reais(r.valor)}</td></tr>
            {r.multaJuros ? <tr><td>Multa e juros<small>Pelo atraso, como registrado no recebimento</small></td><td>{reais(r.multaJuros)}</td></tr> : null}
          </tbody>
          <tfoot><tr><td>Total recebido</td><td>{reais(total)}</td></tr></tfoot>
        </table>
      </section>
      <section className="rb-sec" aria-label="Dados do pagamento">
        <dl className="rb-dados">
          <div className={r.pagador ? undefined : "rb-largo"}><dt>Cliente</dt><dd>{r.cliente.nome}{docCli ? <small>{docCli}</small> : null}</dd></div>
          {r.pagador ? (
            <div><dt>Quem pagou</dt><dd>{r.pagador.nome}<small>{[documentoComNome(r.pagador.documento), r.pagador.papel].filter(Boolean).join(" · ") || "em favor do cliente"}</small></dd></div>
          ) : null}
          <div><dt>Contrato</dt><dd>{r.contrato.numero}<small>Honorários · {r.contrato.objeto}</small></dd></div>
          <div><dt>Parcela</dt><dd>{r.parcela.ordem && r.parcela.total ? `${r.parcela.ordem} de ${r.parcela.total}` : r.parcela.descricao}<small>{mesDeReferencia(r.parcela.vencimento)}</small></dd></div>
          <div><dt>Forma</dt><dd>{FORMAS_PAGAMENTO[r.forma] ?? r.forma}<small>registrada no escritório</small></dd></div>
          <div><dt>Data do pagamento</dt><dd>{dataBr(r.pagoEm)}<small>vencia em {venc}</small></dd></div>
        </dl>
      </section>
      <div className="rb-fim">
        <div>
          <p className="rb-local">{localEData(r)}</p>
          <p className="rb-quit">Este recibo dá quitação somente da parcela e dos valores descritos acima. As demais parcelas do contrato seguem como combinado.</p>
        </div>
        <div className="rb-ass">
          <div className="rb-linha" />
          <b>{r.escritorio.nome}</b>
          {r.escritorio.cnpj ? <span>{documentoComNome(r.escritorio.cnpj)}</span> : null}
          <p className="rb-reg">
            Recebimento registrado por <b>{r.registradoPor.nome}</b>{r.registradoPor.oab ? `, ${r.registradoPor.oab}` : ""}, em {dataBr(diaDe(r.registradoEm))}, às {horaDe(r.registradoEm)}.
          </p>
        </div>
      </div>
      <p className="rb-pe">
        <span>Recibo nº {n} · emitido pelo escritório em {dataBr(diaDe(r.registradoEm))} · 1 página</span>
        <span className="rb-t3"><Simbolo tom="vinho" className="rb-simb" />Modelo T3jus</span>
      </p>
    </article>
  );
}

/** A página do recibo, para imprimir ou salvar em PDF. */
export function ReciboImprimir({ id, area }: { id: string; area: "FINANCEIRO" | "CONTRATOS" }) {
  const [r, setR] = useState<ReciboParaImprimir | null | "erro" | "nao">(null);
  const [vez, setVez] = useState(0);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<ReciboParaImprimir>(`/v1/escritorio/recibos/${id}`).then((x) => {
      if (vivo) setR(x.ok ? x.dados : x.status === 404 ? "nao" : "erro");
    });
    return () => { vivo = false; };
  }, [id, vez]);
  const carregado = r && typeof r === "object" ? r : null;
  useEffect(() => {
    if (carregado) document.title = tituloDoRecibo(carregado);
  }, [carregado]);

  if (r === null) return <div className="rb-pagina"><div style={{ maxWidth: 640, margin: "0 auto", padding: 32 }}><Carregando rotulo="Montando o recibo…" linhas={4} /></div></div>;
  if (r === "erro" || r === "nao") {
    return (
      <div className="rb-pagina">
        <div style={{ maxWidth: 640, margin: "0 auto", padding: 32 }}>
          <ErroAoCarregar oque="o recibo" aoTentar={() => { setR(null); setVez((v) => v + 1); }}
            texto={r === "nao" ? "Ele não existe ou é de outro escritório. Volte à ficha do contrato e abra de novo." : undefined} />
        </div>
      </div>
    );
  }
  const voltar = area === "CONTRATOS" ? ROTAS_CONTRATOS.recebimentos(r.contrato.id) : ROTAS_FINANCEIRO.contrato(r.contrato.id);
  return (
    <div className="rb-pagina">
      <header className="rb-barra">
        <a className="rb-voltar" href={voltar}><Icone nome="esquerda" className="ico" />Voltar ao contrato</a>
        <h1>Recibo nº {numeroDoRecibo(r)}<small>{r.cliente.nome} · {r.contrato.numero} · {parcelaDoRecibo(r)}</small></h1>
        <div className="rb-acoes">
          <p className="rb-dica" id="rb-dica">Na janela que abrir, escolha <b>Salvar como PDF</b> para baixar, ou a impressora.</p>
          <button type="button" onClick={() => window.print()} aria-describedby="rb-dica"><Icone nome="impressora" className="ico" />Baixar PDF ou imprimir</button>
        </div>
      </header>
      <main className="rb-folhas"><FolhaRecibo r={r} /></main>
    </div>
  );
}
