"use client";
// Escritório › Ajustes do financeiro (F3.50, F3.46, F3.49), desenho aprovado em
// docs/design/aprovadas/portal-comercial-financeiro-pendencias (estados es-ajustes, es-vazio,
// es-erros, es-falha, es-salvo, es-abertura, es-equipe e es-sem-area).
// - O contador, onde o caixa começa, o prazo para repassar e a meta (só o resumo; muda no Resumo).
// - Só a sócia dona muda; quem tem o Financeiro vê; quem não tem não vê a seção.
// - O saldo de abertura, uma vez lançado, muda só por "Corrigir", com motivo; o anterior fica.

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  emailCompleto, normalizarTelefone, reais,
  type AjustesFinanceiro, type MetaReceita, type SalvarAjustes,
} from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { formatarTelefone } from "../console/ficha.ts";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, Estado, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { diaBr, lerDia } from "./agenda.ts";
import { Toast } from "./FichaCliente.tsx";
import { ROTAS_FINANCEIRO } from "./financeiro.ts";
import { centavos as lerCentavos } from "./honorarios.ts";
import { chamarPortal, MolduraPortal, useEscritorioPortal } from "./Moldura.tsx";
import { BarraEscritorio, ROTAS_ESCRITORIO } from "./WhatsApp.tsx";
import { mesAno } from "./ACaminho.tsx";

type Feito = { titulo: string; texto: string };
const fuso = { timeZone: "America/Sao_Paulo" } as const;
const diaDoInstante = (em: string) => new Intl.DateTimeFormat("en-CA", { ...fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(em));
const horaDoInstante = (em: string) => {
  const [h, m] = new Intl.DateTimeFormat("pt-BR", { ...fuso, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(em)).split(":");
  return `${Number(h)}h${m}`;
};
/** "12.480,00" para o campo de valor (com sinal, se negativo). */
const valorCampo = (c: number) => (c < 0 ? "-" : "") + new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(c) / 100);
/** Valor do campo, aceitando sinal de menos (saldo negativo no banco). */
function lerValor(t: string): number | null {
  const neg = t.trim().startsWith("-");
  const v = lerCentavos(t.replace("-", ""));
  return v === null ? (t.replace(/[\s-]/g, "") === "0" || t.replace(/[\s-]/g, "") === "0,00" ? 0 : null) : neg ? -v : v;
}
const diasUteis = (n: number) => (n === 1 ? "1 dia útil" : `${n} dias úteis`);

function textoMeta(m: MetaReceita): string {
  return m.soMes ? `${mesAno(m.deMes)}: ${reais(m.valor)}, só este mês` : `${reais(m.valor)} todo mês, desde ${mesAno(m.deMes)}`;
}

// ------------------------------------------------------------------------- O lado

function frase(h: AjustesFinanceiro["historico"][number]): { fez: string; detalhe: string | null } {
  const d = h.dados as Record<string, string | number | boolean | undefined>;
  switch (h.acao) {
    case "financeiro.contador":
      return d.situacao === "CADASTRADO" ? { fez: "cadastrou o contador", detalhe: d.firma ? String(d.firma) : null }
        : { fez: d.trocouContador ? "trocou o contador" : "mudou os dados do contador", detalhe: `${d.mandar ? "Recebe a exportação por e-mail" : "Não recebe por e-mail"}${d.lembrar ? "; lembrete no dia 5" : ""}.` };
    case "financeiro.saldo_abertura":
      return d.deValor !== undefined
        ? { fez: "corrigiu o saldo de abertura", detalhe: `De ${reais(Number(d.deValor))} para ${reais(Number(d.valor))}, em ${diaBr(String(d.data))}.${d.motivo ? ` ${d.motivo}` : ""}` }
        : { fez: "lançou o saldo de abertura", detalhe: `${reais(Number(d.valor))} em ${diaBr(String(d.data))}` };
    case "financeiro.prazo_repasse":
      return { fez: "mudou o prazo para repassar", detalhe: `De ${d.de ?? 3} para ${diasUteis(Number(d.para))}. Vale para o que entrar a partir de então.` };
    case "financeiro.meta":
      return {
        fez: d.de ? "mudou a meta" : "definiu a meta",
        detalhe: `${d.de ? `De ${reais(Number(d.de))} para ` : ""}${reais(Number(d.valor))}, ${d.soMes ? `só em ${mesAno(String(d.mes))}` : `todo mês, a partir de ${mesAno(String(d.mes))}`}.`,
      };
    default:
      return { fez: "mudou um ajuste", detalhe: null };
  }
}

function Lado({ a, hoje }: { a: AjustesFinanceiro; hoje: string }) {
  const dona = a.socioDono?.nome ?? "a sócia dona";
  const dias = [...new Set(a.historico.map((h) => diaDoInstante(h.em)))];
  return (
    <aside className="fi-col" aria-label="Sobre os ajustes">
      <section className="folha" aria-labelledby="t-onde" style={{ overflow: "hidden" }}>
        <div className="folha-cab"><div><h2 id="t-onde">Onde isso aparece</h2></div></div>
        <div className="pd-corpo">
          <ul className="es-lista">
            <li><Icone nome="envelope" className="ico" /><span><b>Caixa › Exportar para o contador</b>: o e-mail sai para o contador, com a planilha anexada.</span></li>
            <li><Icone nome="moeda" className="ico" /><span><b>Caixa</b>: o saldo do escritório começa no saldo de abertura.</span></li>
            <li><Icone nome="relogio" className="ico" /><span><b>Repasses</b>: o prazo de cada parte, os atrasos e o Início de quem cuida.</span></li>
            <li><Icone nome="funcoes" className="ico" /><span><b>Resumo</b>: a meta ao lado do que entrou e dos meses anteriores.</span></li>
          </ul>
        </div>
        <p className="pt-pe-folha"><Icone nome="cadeado" className="ico" /><span>Quem muda: só {dona}, a sócia dona. Quem tem o Financeiro vê.</span></p>
      </section>
      <section className="folha" aria-labelledby="t-h" style={{ overflow: "hidden" }}>
        <div className="folha-cab"><div><h2 id="t-h"><Icone nome="historico" className="ico" />Histórico</h2><p className="sub">Nada é apagado</p></div></div>
        {a.historico.length ? dias.map((dia) => (
          <div key={dia} className="eventos-dia" style={dia === dias[0] ? { paddingTop: 0 } : undefined}>
            <h3>{diaBr(dia)}{dia === hoje ? " · hoje" : ""}</h3>
            <ol className="eventos">
              {a.historico.filter((h) => diaDoInstante(h.em) === dia).map((h, i) => {
                const f = frase(h);
                return (
                  <li key={`${h.em}-${i}`}>
                    <time dateTime={h.em}>{horaDoInstante(h.em)}</time>
                    <span className="pto" aria-hidden="true" />
                    <div><p><b>{h.por?.nome ?? "Alguém da equipe"}</b> {f.fez}</p>{f.detalhe ? <small>{f.detalhe}</small> : null}</div>
                  </li>
                );
              })}
            </ol>
          </div>
        )) : <p className="pd-corpo" style={{ fontSize: 13, color: "var(--texto-2)" }}>Nada mudou ainda. Cada ajuste vai aparecer aqui, com quem mudou e quando.</p>}
      </section>
    </aside>
  );
}

// ------------------------------------------------------------------------- Só para ler

function SoLeitura({ a }: { a: AjustesFinanceiro }) {
  const dona = a.socioDono?.nome ?? "a sócia dona";
  const c = a.contador;
  return (
    <div className="fi-col">
      <Aviso tom="info" icone="cadeado" titulo="Você vê esta página só para ler.">
        Quem muda o contador, o saldo de abertura, o prazo e a meta é {dona}, a sócia dona. Se algo estiver errado, fale com ela.
      </Aviso>
      <section className="folha" aria-labelledby="t-ro" style={{ overflow: "hidden" }}>
        <div className="folha-cab"><div><h2 id="t-ro"><Icone nome="ajustes" className="ico" />Ajustes do financeiro</h2></div></div>
        <dl className="pd-ro">
          <div><dt>Contador</dt><dd>{c ? <>{c.nome}{c.firma ? ` · ${c.firma}` : ""}<small>{c.email}{c.mandarAoExportar ? " · recebe a exportação por e-mail" : ""}</small></> : "Nenhum cadastrado"}</dd></div>
          <div><dt>Saldo de abertura</dt><dd className="num">{a.abertura ? <>{reais(a.abertura.valor)}<small>em {diaBr(a.abertura.data)}</small></> : "Não lançado: o Caixa começa em R$ 0,00"}</dd></div>
          <div><dt>Prazo para repassar</dt><dd>{diasUteis(a.prazoRepasseDias)}</dd></div>
          <div><dt>Meta de receita</dt><dd className="num">{a.meta.todoMes || a.meta.umMes.length
            ? <>{a.meta.todoMes ? `${reais(a.meta.todoMes.valor)} todo mês` : "Sem meta de todo mês"}{a.meta.umMes.map((m) => <small key={m.deMes}>{textoMeta(m)}</small>)}</>
            : "Sem meta"}</dd></div>
        </dl>
      </section>
    </div>
  );
}

// ------------------------------------------------------------------------- O formulário da dona

type Campo = "nome" | "firma" | "email" | "telefone" | "prazoRepasseDias" | "aberturaData" | "aberturaValor";

function FormAjustes({ a, aoSalvo, aoCorrigir }: { a: AjustesFinanceiro; aoSalvo: (novo: AjustesFinanceiro, f: Feito) => void; aoCorrigir: () => void }) {
  const c = a.contador;
  const [nome, setNome] = useState(c?.nome ?? "");
  const [firma, setFirma] = useState(c?.firma ?? "");
  const [email, setEmail] = useState(c?.email ?? "");
  const [tel, setTel] = useState(c?.telefone ? formatarTelefone(c.telefone) : "");
  const [mandar, setMandar] = useState(c ? c.mandarAoExportar : true);
  const [lembrar, setLembrar] = useState(c ? c.lembrarDia5 : true);
  const [prazo, setPrazo] = useState(String(a.prazoRepasseDias));
  const sugestao = a.primeiroLancamento ? (() => { const d = new Date(`${a.primeiroLancamento}T12:00:00Z`); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); })() : null;
  const [abData, setAbData] = useState(sugestao ? diaBr(sugestao) : "");
  const [abValor, setAbValor] = useState("");
  const [erros, setErros] = useState<Campo[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const tem = (x: Campo) => erros.includes(x);
  const limpar = (...cs: Campo[]) => setErros((e) => (e.some((x) => cs.includes(x)) ? e.filter((x) => !cs.includes(x)) : e));
  const temContador = !!(nome.trim() || email.trim() || firma.trim() || tel.trim());
  const vazio = !c && !a.abertura;

  function conferir(): Campo[] {
    const e: Campo[] = [];
    if (temContador || c) {
      if (nome.trim().length < 2) e.push("nome");
      if (firma.trim() && firma.trim().length < 2) e.push("firma");
      if (!emailCompleto(email)) e.push("email");
      if (tel.trim() && !/^\+[1-9]\d{7,14}$/.test(normalizarTelefone(tel))) e.push("telefone");
    }
    const p = Number(prazo);
    if (!/^\d{1,2}$/.test(prazo.trim()) || p < 1 || p > 30) e.push("prazoRepasseDias");
    if (!a.abertura && abValor.trim()) {
      const d = lerDia(abData);
      if (!d || d > new Intl.DateTimeFormat("en-CA", fuso).format(new Date())) e.push("aberturaData");
      if (lerValor(abValor) === null) e.push("aberturaValor");
    }
    return e;
  }

  async function salvar() {
    if (salvando) return;
    setFalha(null);
    const e = conferir();
    setErros(e);
    if (e.length) return focarPrimeiroErro(form.current);
    setSalvando(true);
    const corpo: SalvarAjustes = {
      contador: temContador || c ? { nome: nome.trim(), firma: firma.trim() || null, email: email.trim(), telefone: tel.trim() ? normalizarTelefone(tel) : null, mandarAoExportar: mandar, lembrarDia5: lembrar } : null,
      prazoRepasseDias: Number(prazo),
      abertura: !a.abertura && abValor.trim() ? { data: lerDia(abData), valor: lerValor(abValor) } : null,
    };
    const r = await chamarPortal<AjustesFinanceiro>("/v1/escritorio/financeiro/ajustes", { metodo: "PUT", corpo });
    setSalvando(false);
    if (r.ok) {
      const mudouPrazo = Number(prazo) !== a.prazoRepasseDias;
      return aoSalvo(r.dados, {
        titulo: "Ajustes salvos.",
        texto: mudouPrazo ? `O prazo para repassar agora é de ${diasUteis(Number(prazo))}, para o que entrar a partir de agora.`
          : corpo.abertura ? `O Caixa agora começa no saldo de abertura de ${reais(corpo.abertura.valor ?? 0)}.` : "O que mudou ficou no histórico.",
      });
    }
    const cs = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(cs) && cs.length) {
      setErros(cs.map(String) as Campo[]);
      return focarPrimeiroErro(form.current);
    }
    setFalha(`${textoDoErro(r.erro)} Nada foi salvo: o contador, o prazo e o saldo continuam como estavam. O que você mudou continua aqui; tente de novo.`);
  }

  const campo = (id: string, k: Campo, rot: string, v: string, set: (x: string) => void, o: { erro: string; ajuda?: string; opc?: boolean; tipo?: string; ac?: string; im?: "numeric" | "decimal" | "tel" | "email" } ) => (
    <div className="campo">
      <label htmlFor={id}>{rot}{o.opc ? <span className="opcional"> (opcional)</span> : null}</label>
      <input className="entrada" id={id} type={o.tipo ?? "text"} autoComplete={o.ac ?? "off"} inputMode={o.im} value={v}
        onChange={(e) => { set(e.target.value); limpar(k); }}
        aria-invalid={tem(k) || undefined} aria-describedby={descritoPor(!tem(k) && !!o.ajuda && `${id}-aj`, tem(k) && `${id}-er`)} />
      {tem(k) ? <ErroCampo id={`${id}-er`}>{o.erro}</ErroCampo> : o.ajuda ? <p className="ajuda" id={`${id}-aj`}>{o.ajuda}</p> : null}
    </div>
  );

  return (
    <form ref={form} className="fi-col" noValidate aria-label="Ajustes do financeiro" onSubmit={(e) => { e.preventDefault(); void salvar(); }}>
      {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>Os ajustes ainda não foram salvos. O resto do que você mudou continua aqui.</Aviso>
        : falha ? <Aviso tom="urgencia" titulo="Não deu para salvar os ajustes.">{falha}</Aviso>
        : vazio ? (
          <Aviso tom="info" titulo="Falta o saldo de abertura e o contador.">
            Sem o saldo de abertura, o Caixa começa em R$ 0,00 e o saldo do escritório não bate com o do banco. Sem o contador, a exportação só baixa no seu aparelho.
          </Aviso>
        ) : null}
      <section className="folha" aria-labelledby="t-cont" style={{ overflow: "hidden" }}>
        <div className="folha-cab"><div><h2 id="t-cont"><Icone nome="doc" className="ico" />Contador do escritório</h2><p className="sub">Quem recebe a exportação mensal do Financeiro</p></div></div>
        <div className="pd-corpo">
          <div className="fi-dois">
            {campo("es-nome", "nome", "Nome do contador", nome, setNome, { erro: "Escreva o nome do contador.", ac: "off" })}
            {campo("es-firma", "firma", "Escritório de contabilidade", firma, setFirma, { erro: "Escreva o nome do escritório de contabilidade, ou deixe em branco.", opc: true })}
          </div>
          <div className="fi-dois">
            {campo("es-mail", "email", "E-mail do contador", email, setEmail, { erro: "Este e-mail está incompleto: falta o final, como .com.br.", ajuda: "Para onde vai a exportação do mês.", tipo: "email", ac: "off", im: "email" })}
            {campo("es-tel", "telefone", "Telefone", tel, setTel, { erro: "Escreva o telefone com DDD, como (11) 3456-7890.", opc: true, tipo: "tel", im: "tel" })}
          </div>
          <fieldset className="fi-grupo-op">
            <legend>Envio</legend>
            <label className="opcao">
              <input className="marcar" type="checkbox" checked={mandar} onChange={(e) => setMandar(e.target.checked)} />
              <span>Mandar por e-mail quando alguém exportar o mês<small>A planilha vai anexada. Quem exporta confere antes e manda: o T3jus não manda sozinho.</small></span>
            </label>
            <label className="opcao">
              <input className="marcar" type="checkbox" checked={lembrar} onChange={(e) => setLembrar(e.target.checked)} />
              <span>Lembrar no dia 5 de exportar o mês anterior<small>O lembrete aparece no sino de quem tem o Financeiro.</small></span>
            </label>
          </fieldset>
          <p className="pd-nota"><Icone nome="cadeado" className="ico" /><span>O contador não entra no T3jus. Ele recebe só o e-mail, que sai de <b>T3jus &lt;nao-responda@t3jus.pro&gt;</b> em nome do escritório, com resposta para quem exportou.</span></p>
        </div>
      </section>
      <section className="folha" aria-labelledby="t-ab" style={{ overflow: "hidden" }}>
        <div className="folha-cab"><div><h2 id="t-ab"><Icone nome="moeda" className="ico" />Saldo de abertura do caixa</h2><p className="sub">Onde o Caixa do escritório começa</p></div></div>
        {a.abertura ? (
          <div className="pd-corpo">
            <div className="es-ab">
              <div><p className="es-ab-v num">{reais(a.abertura.valor)}</p><p className="es-ab-d">em {diaBr(a.abertura.data)}</p></div>
              <button className="btn btn-sec" type="button" onClick={aoCorrigir}><Icone nome="lapis" className="ico" />Corrigir</button>
            </div>
            <p>
              {a.abertura.motivo ? "Corrigido" : "Lançado"} por {a.abertura.por?.nome ?? "alguém da equipe"} em {diaBr(diaDoInstante(a.abertura.em))}.
              {" "}O saldo do Caixa é este valor mais o que entrou e menos o que saiu depois de {diaBr(a.abertura.data)}. Lançamentos com data anterior ficam no histórico, mas não mudam o saldo.
            </p>
          </div>
        ) : (
          <div className="pd-corpo">
            <div className="fi-dois">
              {campo("es-abd", "aberturaData", "Data", abData, setAbData, { erro: "Escreva a data, hoje ou antes, no formato dd/mm/aaaa.", ajuda: "O dia antes do primeiro lançamento no T3jus. dd/mm/aaaa", im: "numeric" })}
              {campo("es-abv", "aberturaValor", "Saldo na conta nesse dia", abValor, setAbValor, { erro: "Escreva o saldo como está no extrato, por exemplo 12.480,00.", ajuda: "Como está no extrato do banco, só o que é do escritório.", im: "decimal" })}
            </div>
            <p className="pd-nota"><Icone nome="escudo" className="ico" /><span>Dinheiro de clientes que já estava na conta não entra aqui: registre em Repasses, como alvará ou acordo, com o dia em que entrou.</span></p>
          </div>
        )}
      </section>
      <section className="folha" aria-labelledby="t-pz" style={{ overflow: "hidden" }}>
        <div className="folha-cab"><div><h2 id="t-pz"><Icone nome="relogio" className="ico" />Prazo para repassar</h2><p className="sub">Depois que um alvará, RPV ou acordo entra</p></div></div>
        <div className="pd-corpo">
          <div className="es-prazo">
            {campo("es-prazo", "prazoRepasseDias", "Dias úteis para repassar", prazo, setPrazo, { erro: "Escreva de 1 a 30 dias úteis. O padrão é 3.", ajuda: "De 1 a 30. Conta de segunda a sexta, fora os feriados nacionais, a partir do dia em que o dinheiro entrou.", im: "numeric" })}
          </div>
          <p>Vale para o dinheiro que entrar depois de salvar. Os repasses já registrados mantêm o prazo que tinham; para um repasse atrasado, anote o motivo e a próxima ação nele.</p>
        </div>
      </section>
      <FolhaMeta a={a} />
      <div className="form-pe es-pe">
        <span className="esq-pe">O que você mudar fica no histórico, com o antes e o depois.</span>
        <button className="btn btn-pri" type="submit" aria-busy={salvando || undefined}><Icone nome="check" className="ico" />Salvar</button>
      </div>
    </form>
  );
}

function FolhaMeta({ a }: { a: AjustesFinanceiro }) {
  const m = a.meta;
  return (
    <section className="folha" aria-labelledby="t-mt" style={{ overflow: "hidden" }}>
      <div className="folha-cab"><div><h2 id="t-mt"><Icone nome="funcoes" className="ico" />Meta de receita</h2><p className="sub">Honorários que o escritório quer receber no mês</p></div></div>
      {m.todoMes || m.umMes.length ? (
        <>
          <dl className="pd-ro">
            {m.todoMes ? <div><dt>Todo mês</dt><dd className="num">{reais(m.todoMes.valor)}<small>desde {mesAno(m.todoMes.deMes)}{m.antes && m.antes.deMes !== m.todoMes.deMes ? `; antes, ${reais(m.antes.valor)}` : ""}</small></dd></div> : null}
            {m.umMes.map((x) => <div key={x.deMes}><dt>Só em um mês</dt><dd className="num">{mesAno(x.deMes)}: {reais(x.valor)}</dd></div>)}
          </dl>
          <div className="pd-corpo"><a className="btn btn-sec" href={`${ROTAS_FINANCEIRO.resumo}#t-meta`}><Icone nome="lapis" className="ico" />Mudar no Resumo</a></div>
        </>
      ) : (
        <div className="pd-corpo">
          <p>Sem meta. Defina no Resumo do Financeiro, onde ela é comparada com o que entrou.</p>
          <a className="btn btn-sec" href={`${ROTAS_FINANCEIRO.resumo}#t-meta`}><Icone nome="dir" className="ico" />Definir no Resumo</a>
        </div>
      )}
    </section>
  );
}

// ------------------------------------------------------------------------- Corrigir o saldo

function JanelaAbertura({ a, aoFechar, aoFeito }: { a: AjustesFinanceiro; aoFechar: () => void; aoFeito: (novo: AjustesFinanceiro, f: Feito) => void }) {
  const ab = a.abertura!;
  const [data, setData] = useState(diaBr(ab.data));
  const [valor, setValor] = useState(valorCampo(ab.valor));
  const [motivo, setMotivo] = useState("");
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);
  const tem = (c: string) => erros.includes(c);
  const v = lerValor(valor);
  const d = lerDia(data);
  const novoHoje = v !== null && d === ab.data ? a.saldoHoje + (v - ab.valor) : null;

  async function enviar() {
    if (enviando) return;
    const e = [...(!d ? ["data"] : []), ...(v === null ? ["valor"] : []), ...(motivo.trim().length < 5 ? ["motivo"] : [])];
    setFalha(null);
    if (e.length) { setErros(e); return focarPrimeiroErro(corpo.current); }
    setEnviando(true);
    const r = await chamarPortal<AjustesFinanceiro>("/v1/escritorio/financeiro/ajustes/abertura", { metodo: "POST", corpo: { data: d, valor: v, motivo: motivo.trim() } });
    setEnviando(false);
    if (r.ok) return aoFeito(r.dados, { titulo: "Saldo de abertura corrigido.", texto: `O Caixa de hoje agora mostra ${reais(r.dados.saldoHoje)}. O valor anterior ficou no histórico.` });
    const cs = r.erro.detalhes?.campos;
    if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(cs) && cs.length) { setErros(cs.map(String)); return focarPrimeiroErro(corpo.current); }
    setFalha(`${textoDoErro(r.erro)} Nada mudou; tente de novo.`);
  }

  return (
    <Janela id="j-ab" aberta aoFechar={aoFechar} sobretitulo="Ajustes do financeiro" titulo="Corrigir o saldo de abertura" descricao="j-ab-d" aoEnviar={() => void enviar()}
      pe={<><button className="btn btn-sec" type="button" onClick={aoFechar}>Cancelar</button><button className="btn btn-pri" type="submit" aria-busy={enviando || undefined}><Icone nome="check" className="ico" />Corrigir o saldo</button></>}>
      <div ref={corpo} style={{ display: "grid", gap: 16 }}>
        <p id="j-ab-d">O valor anterior não se apaga: fica no histórico.</p>
        {erros.length ? <Aviso tom="urgencia" titulo={faltaAcertar(erros.length)}>O saldo ainda não mudou.</Aviso> : null}
        {falha ? <Aviso tom="urgencia" titulo="Não deu para corrigir o saldo.">{falha}</Aviso> : null}
        <div className="fi-alvo">
          <Icone nome="moeda" className="ico" />
          <div><strong>Saldo de abertura de hoje</strong><small>em {diaBr(ab.data)} · lançado por {ab.por?.nome ?? "alguém da equipe"} em {diaBr(diaDoInstante(ab.em))}</small></div>
          <span className="fi-v num">{reais(ab.valor)}</span>
        </div>
        <div className="fi-dois">
          <div className="campo">
            <label htmlFor="ab-d">Data</label>
            <input className="entrada" id="ab-d" inputMode="numeric" autoComplete="off" value={data} onChange={(e) => setData(e.target.value)}
              aria-invalid={tem("data") || undefined} aria-describedby={descritoPor(!tem("data") && "ab-d-aj", tem("data") && "ab-d-er")} />
            {tem("data") ? <ErroCampo id="ab-d-er">Escreva a data, hoje ou antes, no formato dd/mm/aaaa.</ErroCampo> : <p className="ajuda" id="ab-d-aj">dd/mm/aaaa</p>}
          </div>
          <div className="campo">
            <label htmlFor="ab-v">Saldo certo</label>
            <input className="entrada" id="ab-v" inputMode="decimal" autoComplete="off" value={valor} onChange={(e) => setValor(e.target.value)} data-foco=""
              aria-invalid={tem("valor") || undefined} aria-describedby={descritoPor(tem("valor") && "ab-v-er")} />
            {tem("valor") ? <ErroCampo id="ab-v-er">Escreva o saldo como está no extrato, por exemplo 13.180,00.</ErroCampo> : null}
          </div>
        </div>
        <div className="campo">
          <div className="pd-campo-linha"><label htmlFor="ab-m">Por que corrigir</label><span className="contador" aria-hidden="true">{motivo.length} de 300</span></div>
          <textarea className="entrada" id="ab-m" rows={3} maxLength={300} value={motivo} onChange={(e) => setMotivo(e.target.value)}
            aria-invalid={tem("motivo") || undefined} aria-describedby={descritoPor(!tem("motivo") && "ab-m-aj", tem("motivo") && "ab-m-er")} />
          {tem("motivo") ? <ErroCampo id="ab-m-er">Escreva o motivo, com pelo menos 5 letras.</ErroCampo> : <p className="ajuda" id="ab-m-aj">Obrigatório. Fica no histórico, com o valor anterior.</p>}
        </div>
        {novoHoje !== null && v !== ab.valor ? (
          <p className="fi-ref">
            <Icone nome="moeda" className="ico" />
            <span>O saldo do Caixa de hoje passa de <b>{reais(a.saldoHoje)}</b> para <b>{reais(novoHoje)}</b>, e a previsão dos próximos meses {v! > ab.valor ? "sobe" : "desce"} {reais(Math.abs(v! - ab.valor))}. As exportações já enviadas ao contador não mudam: o histórico diz que o saldo foi corrigido depois.</span>
          </p>
        ) : null}
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- A página

export function AjustesDoFinanceiro() {
  const { escritorio, erro: erroEsc } = useEscritorioPortal();
  const [a, setA] = useState<AjustesFinanceiro | null | "erro" | "sem-area">(null);
  const [vez, setVez] = useState(0);
  const [corrigir, setCorrigir] = useState(false);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [hoje] = useState(() => new Intl.DateTimeFormat("en-CA", fuso).format(new Date()));
  const semArea = escritorio && !escritorio.areas.includes("FINANCEIRO");
  useEffect(() => {
    if (!escritorio || semArea) return;
    let vivo = true;
    void chamarPortal<AjustesFinanceiro>("/v1/escritorio/financeiro/ajustes").then((x) => {
      if (vivo) setA(x.ok ? x.dados : x.erro.detalhes?.motivo === "AREA_NAO_LIBERADA" ? "sem-area" : "erro");
    });
    return () => { vivo = false; };
  }, [vez, escritorio, semArea]);

  const trilha = [{ nome: "Escritório", href: ROTAS_ESCRITORIO.dados }, { nome: "Ajustes do financeiro" }];
  const cab = (
    <div className="pt-cab">
      <div>
        <p className="sobretitulo">Escritório</p>
        <h1>Ajustes do financeiro</h1>
        <span className="fio" aria-hidden="true" />
        <p className="lede">O contador, onde o caixa começa, o prazo para repassar e a meta do mês. Só a sócia dona muda.</p>
      </div>
    </div>
  );
  let corpo: ReactNode;
  if (semArea || a === "sem-area") {
    corpo = (
      <div className="fi">{cab}
        <Estado icone="cadeado" titulo="Os ajustes do financeiro são da área Financeiro"
          acoes={<a className="btn btn-pri" href={ROTAS_ESCRITORIO.dados}><Icone nome="coluna" className="ico" />Ver os dados do escritório</a>}>
          O contador, o saldo do caixa, o prazo de repasse e a meta ficam com quem tem a área Financeiro. Quem libera é a sócia dona.
        </Estado>
      </div>
    );
  } else if (a === "erro" || erroEsc) corpo = <div className="fi">{cab}<ErroAoCarregar oque="os ajustes do financeiro" aoTentar={() => { setA(null); setVez((v) => v + 1); }} /></div>;
  else if (!a || !escritorio) corpo = <div className="fi">{cab}<Carregando rotulo="Carregando os ajustes…" linhas={5} /></div>;
  else {
    corpo = (
      <div className="fi">
        {cab}
        <div className="fi-grade">
          {a.dono
            ? <FormAjustes key={vez} a={a} aoCorrigir={() => setCorrigir(true)} aoSalvo={(n, f) => { setA(n); setFeito(f); setVez((v) => v + 1); }} />
            : <SoLeitura a={a} />}
          <Lado a={a} hoje={hoje} />
        </div>
        {corrigir && a.abertura ? <JanelaAbertura a={a} aoFechar={() => setCorrigir(false)} aoFeito={(n, f) => { setCorrigir(false); setA(n); setFeito(f); setVez((v) => v + 1); }} /> : null}
      </div>
    );
  }
  return (
    <MolduraPortal atual="escritorio" trilha={trilha} escritorio={escritorio} pagina="co-equipe co-carteira"
      barra={<BarraEscritorio secao="financeiro" financeiro={!semArea} />}>
      {corpo}
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
    </MolduraPortal>
  );
}

