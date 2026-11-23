"use client";
// Ficha do cliente no Portal (AP-01, AP-02, AP-04, AP-06), tela aprovada em
// docs/design/aprovadas/portal-clientes: o cabeçalho da ficha do Console, com o próximo contato
// no âmbar (ou, para quem não tem Comercial, quanto da procuração está pronto); abas Ficha e
// Atendimentos; editar no lugar, com conflito (PT-19); inativar e reativar com motivo (PT-03).
// O servidor decide o que cada pessoa vê; a tela só não mostra o que não veio.

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  CANAIS, ESTADOS_CIVIS, formatarDocumento, hojeBrasilia, MOTIVOS_SAIDA_FUNIL, ORIGENS, TIPOS_CLIENTE,
  type Atendimento, type Canal, type ClienteFunil, type SaidaFunil, type ContatoCliente, type FichaCliente, type PessoaRef,
} from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { formatarTelefone } from "../console/ficha.ts";
import { FaixaFez18, FolhaQuemAssina, FolhaQuemAssinava, FolhaTempo, JanelaAssinaPorSi, SeloQuemAssina } from "./ResponsavelLegal.tsx";
import { ROTAS_DOCUMENTOS } from "./procuracoes.ts";
import { Aviso, Carregando, descritoPor, ErroAoCarregar, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { dataLonga, hora } from "../console/tempo.ts";
import {
  agoraBrasilia, dataBr, diferencasCliente, juntarComE, lerData, lerHora, prontosParaProcuracao, rascunhoDaFicha, rotuloProx,
  type RascunhoCliente,
} from "./clientes.ts";
import { agruparEventosPorDia, primeiroNome } from "./equipe.ts";
import { ROTAS_JURIDICO } from "./juridico.ts";
import { FolhaDocumentosPessoais } from "./DocumentosPessoais.tsx";
import { FormularioCliente, type Conflito } from "./FormCliente.tsx";
import { erroDoCodigoDoTermo } from "./termoCuratela.ts";
import { chamarPortal, irPara, MolduraPortal, ROTAS_PORTAL, soConsulta, useEscritorioPortal } from "./Moldura.tsx";
import { OrigemPlanilha } from "./Importacao.tsx";
import { FolhaSistemaAntigo } from "./ImportacaoFinanceiro.tsx";
import { FolhaFunilCliente } from "./FunilSaida.tsx";
import { FolhaSemAvisos, SeloSemAvisos, useAvisosCliente } from "./SemAvisos.tsx";
import { AbaItensCliente, DirPasso, NoEscritorio, type JanelaLigada } from "./FichaLigada.tsx";
import { JanelaAbrirCaso, JanelaAssinaturaCaso, type FimDaAssinatura } from "./CasoDaAssinatura.tsx";
import type { AbaLigada } from "./fichaLigada.ts";
import { AcaoLgpd, DadosExcluidos, FaixaPedido, JanelaArquivar, JanelaExcluir, JanelaPedir, JanelaRecusar, RegistroExclusao, RegistroNoCabecalho } from "./ExclusaoCliente.tsx";

export type AbaCliente = "ficha" | "atendimentos" | AbaLigada;
export type Feito = { titulo: string; texto: string; acoes?: ReactNode };

export function Toast({ feito, aoFechar }: { feito: Feito; aoFechar: () => void }) {
  return (
    <div className="aviso aviso-sucesso toast" role="status">
      <Icone nome="check" className="ico" />
      <div>
        <strong className="aviso-titulo">{feito.titulo}</strong>
        <p>{feito.texto}</p>
        {feito.acoes ? <div className="aviso-acoes">{feito.acoes}</div> : null}
      </div>
      <button className="fechar" type="button" aria-label="Fechar aviso" onClick={aoFechar}>
        <Icone nome="xis" className="ico" />
      </button>
    </div>
  );
}

function Grade({ principal, lateral }: { principal: ReactNode; lateral: ReactNode }) {
  return (
    <div className="cl-grade">
      <div className="cl-col">{principal}</div>
      <aside className="cl-col" aria-label="Contexto do cliente">
        {lateral}
      </aside>
    </div>
  );
}

function Folha({ titulo, sub, acoes, pequena, children, estilo, classe }: { titulo: string; sub?: string; acoes?: ReactNode; pequena?: boolean; children: ReactNode; estilo?: React.CSSProperties; classe?: string }) {
  const id = useId();
  return (
    <section className={classe ? `folha ${classe}` : "folha"} aria-labelledby={id} style={estilo}>
      <div className="folha-cab" style={pequena ? { paddingBottom: 8 } : undefined}>
        <div>
          <h2 id={id} style={pequena ? { fontSize: 20 } : undefined}>
            {titulo}
          </h2>
          {sub ? <p className="sub">{sub}</p> : null}
        </div>
        {acoes ? <div className="acoes">{acoes}</div> : null}
      </div>
      {children}
    </section>
  );
}

const falta = (
  <dd className="falta cl-falta-dd">
    Falta
    <span className="selo selo-atencao">
      <Icone nome="pena" className="ico" />
      pede para a procuração
    </span>
  </dd>
);

function endereco(f: Pick<FichaCliente, "endereco" | "bairro" | "cidade" | "uf" | "cep">): string {
  const partes = [f.endereco, f.bairro, f.cidade, f.uf].filter(Boolean).join(", ");
  const cep = f.cep ? `CEP\u00a0${f.cep.slice(0, 5)}\u2011${f.cep.slice(5)}` : "";
  return [partes, cep].filter(Boolean).join(" · ");
}

function Dados({ f, aoEditar }: { f: FichaCliente; aoEditar?: () => void }) {
  const pf = f.tipo === "PF";
  const conf = (
    <span className="selo selo-ok">
      <Icone nome="check" className="ico" />
      Dígitos conferidos
    </span>
  );
  const item = (rotulo: string, valor: ReactNode | null, opc?: { inteira?: boolean; pede?: boolean }) => (
    <div className={opc?.inteira ? "inteira" : undefined}>
      <dt>{rotulo}</dt>
      {valor ? <dd>{valor}</dd> : opc?.pede === false ? <dd className="falta">Não informado</dd> : falta}
    </div>
  );
  const end = f.endereco && f.cidade && f.uf ? endereco(f) : null;
  // F3.98: do menor, a data e a idade; abaixo de 16, estado civil e profissão não vão no documento.
  const menor = pf && (f.assina?.situacao === "REPRESENTADO" || f.assina?.situacao === "ASSISTIDO");
  const menor16 = menor && f.assina?.situacao === "REPRESENTADO";
  return (
    <Folha titulo="Dados e qualificação" sub={f.situacao === "INATIVO" ? "Guardados como estavam ao inativar." : f.situacao === "ARQUIVADO" ? "Guardados como estavam ao arquivar, só leitura." : "O que vai na procuração e no contrato."}
      acoes={aoEditar ? (
        <button data-muda className="btn btn-sec" type="button" onClick={aoEditar}>
          <Icone nome="lapis" className="ico" />
          Editar
        </button>
      ) : undefined}>
      <dl className="dados-ficha">
        {item(pf ? "Nome completo" : "Razão social", f.nome, { inteira: true })}
        {item(pf ? "CPF" : "CNPJ", f.documento ? <><span className="num">{formatarDocumento(f.documento)}</span>{conf}</> : null)}
        {pf ? (
          <>
            {menor ? item("Data de nascimento", f.nascimento ? `${dataBr(f.nascimento)}${typeof f.assina?.idade === "number" ? ` · ${f.assina.idade} anos` : ""}` : null) : null}
            {item("Nacionalidade", f.nacionalidade)}
            {menor && !f.rg ? (
              <div>
                <dt>RG</dt>
                <dd className="falta">Não tem · opcional para menor</dd>
              </div>
            ) : item("RG", f.rg ? `${f.rg}${f.rgOrgao ? ` · ${f.rgOrgao}` : ""}` : null)}
            {menor16 ? null : item("Estado civil", f.estadoCivil ? ESTADOS_CIVIS[f.estadoCivil] : null, { pede: !menor })}
            {menor16 ? null : item("Profissão", f.profissao, { pede: !menor })}
            {item("Endereço", end, { inteira: true })}
          </>
        ) : (
          <>
            {item("Sede", end, { inteira: true })}
            {item("Representante legal", f.repNome ? `${f.repNome}${f.repCargo ? `, ${f.repCargo}` : ""}` : null)}
            {item("CPF do representante", f.repDocumento ? <span className="num">{formatarDocumento(f.repDocumento)}</span> : null)}
            {item("Estado civil do representante", f.repEstadoCivil ? ESTADOS_CIVIS[f.repEstadoCivil] : null)}
            {item("Profissão do representante", f.repProfissao)}
          </>
        )}
      </dl>
    </Folha>
  );
}

function Contatos({ f, aoEditar }: { f: FichaCliente; aoEditar?: () => void }) {
  const n = f.contatos.length;
  const papel = (c: ContatoCliente) => c.papel ?? (c.nome.trim().toLowerCase() === f.nome.trim().toLowerCase() ? (f.tipo === "PF" ? "O próprio cliente" : "") : "");
  return (
    <Folha titulo="Contatos" sub={`${n} ${n === 1 ? "contato" : "contatos"}${n > 1 ? " · o principal é quem o escritório procura primeiro" : ""}`}
      acoes={aoEditar ? (
        <button data-muda className="btn btn-sec" type="button" onClick={aoEditar}>
          <Icone nome="mais" className="ico" />
          Adicionar contato
        </button>
      ) : undefined}>
      <ul className="lista">
        {[...f.contatos].sort((a, b) => Number(b.principal) - Number(a.principal)).map((c) => (
          <li key={c.id} className="contato">
            <div>
              <strong>{c.nome}</strong>
              <small className="cl-papel">
                {papel(c)}
                {c.principal && n > 1 ? <span className="selo selo-ativo">Principal</span> : null}
              </small>
            </div>
            {c.telefone ? (
              <a href={`tel:${c.telefone}`}>
                <Icone nome="telefone" className="ico" />
                <span className="num">{formatarTelefone(c.telefone)}</span>
              </a>
            ) : (
              <span className="sem">Sem telefone</span>
            )}
            {c.email ? (
              <a href={`mailto:${c.email}`}>
                <Icone nome="envelope" className="ico" />
                {c.email}
              </a>
            ) : (
              <span className="sem">Sem e-mail</span>
            )}
          </li>
        ))}
      </ul>
    </Folha>
  );
}

function Procuracao({ f, aoEditar }: { f: FichaCliente; aoEditar?: () => void }) {
  const p = prontosParaProcuracao(f);
  return (
    <Folha titulo="Para gerar a procuração" pequena>
      <div className="cl-proc-num">
        <strong>
          {p.prontos} de {p.total}
        </strong>
        <span>dados prontos</span>
      </div>
      {p.faltam.length ? (
        <ul className="cl-proc">
          {p.faltam.map((x) => (
            <li key={x} className="cl-falta">
              <Icone nome="alerta" className="ico" />
              <span>
                <b>{x}</b>: falta
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="cl-folha-acao">
        <p>
          {p.faltam.length
            ? "Quando a área Contratos chegar, a procuração sai com estes dados e os do advogado (nome e OAB)."
            : "Tudo pronto para quando a área Contratos chegar."}
        </p>
        {p.faltam.length && aoEditar ? (
          <button data-muda className="btn btn-sec" type="button" onClick={aoEditar}>
            <Icone nome="lapis" className="ico" />
            Completar qualificação
          </button>
        ) : null}
      </div>
    </Folha>
  );
}

function Origem({ f }: { f: FichaCliente }) {
  return (
    <Folha titulo="Origem" pequena>
      <dl className="cl-origem">
        <div>
          <dt>Como chegou</dt>
          <dd>{f.origem ? ORIGENS[f.origem] : "Não informado"}</dd>
        </div>
        {f.origemIndicacao ? (
          <div>
            <dt>Quem indicou</dt>
            <dd>{f.origemIndicacao}</dd>
          </div>
        ) : null}
        {f.primeiroAtendimento ? (
          <div>
            <dt>Primeiro contato</dt>
            <dd>
              {dataLonga(f.primeiroAtendimento.em)}, por {CANAIS[f.primeiroAtendimento.canal].toLowerCase()}
            </dd>
          </div>
        ) : null}
        {f.criadoPor ? (
          <div>
            <dt>Cadastrado por</dt>
            <dd>{f.criadoPor.nome}</dd>
          </div>
        ) : null}
      </dl>
    </Folha>
  );
}

// ------------------------------------------------------------------------- janelas

export function JanelaRegistrar({ aberta, f, pessoas, eu, aoFechar, aoFeito }: {
  aberta: boolean;
  f: FichaCliente;
  pessoas: PessoaRef[];
  eu: string | null;
  aoFechar: () => void;
  aoFeito: (feito: Feito) => void;
}) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const agora = agoraBrasilia();
  const outra = "__outra";
  const [v, setV] = useState({
    data: agora.data, hora: agora.hora, canal: "WHATSAPP" as Canal, quem: pessoas.find((p) => p.nome === eu)?.id ?? "",
    com: f.contatos.find((c) => c.principal)?.id ?? outra, outraPessoa: "", resumo: "", pdata: "", presp: "", poque: "", sem: false,
  });
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const mudar = (k: keyof typeof v, x: string | boolean) => setV((o) => ({ ...o, [k]: x }));
  const hoje = hojeBrasilia();
  const marcado = f.proxContato;

  async function registrar() {
    setErro(null);
    const e: Record<string, string> = {};
    const data = lerData(v.data);
    const h = lerHora(v.hora);
    if (!data) e.data = "Escreva a data como dd/mm/aaaa.";
    if (!h) e.hora = "Escreva a hora como hh:mm.";
    const ocorridoEm = data && h ? `${data}T${h}:00-03:00` : null;
    if (ocorridoEm && new Date(ocorridoEm).getTime() > Date.now() + 5 * 60_000) e.data = "O atendimento não pode ser no futuro.";
    if (!v.resumo.trim()) e.resumo = "Escreva um resumo do que foi conversado, mesmo que curto.";
    if (v.com === outra && !v.outraPessoa.trim()) e.outraPessoa = "Escreva com quem você falou.";
    const marcar = !v.sem && (v.pdata.trim() || v.presp || v.poque.trim());
    const pdata = v.pdata.trim() ? lerData(v.pdata) : null;
    if (marcar) {
      if (!pdata) e.pdata = v.pdata.trim() ? "Escreva a data como dd/mm/aaaa." : "Escolha a data do próximo contato, ou marque “Sem próximo contato”.";
      else if (pdata < hoje) e.pdata = "Esta data já passou. Escolha hoje ou um dia depois.";
      if (!v.presp) e.presp = "Escolha quem fica responsável.";
      if (!v.poque.trim()) e.poque = "Diga o que fazer, como “ligar para confirmar os documentos”.";
    }
    setErros(e);
    if (Object.keys(e).length) return focarPrimeiroErro(corpo.current);
    const contato = f.contatos.find((c) => c.id === v.com);
    const comQuem = v.com === outra ? v.outraPessoa.trim() : contato ? `${contato.nome}${contato.papel ? ` (${contato.papel.toLowerCase()})` : ""}` : null;
    setEnviando(true);
    const r = await chamarPortal<{ id: string }>(`/v1/escritorio/clientes/${f.id}/atendimentos`, {
      corpo: {
        ocorridoEm, canal: v.canal, comQuem: comQuem?.slice(0, 120) || null, ...(v.quem ? { atendidoPor: v.quem } : {}), resumo: v.resumo,
        ...(marcar ? { proxEm: pdata, proxResponsavel: v.presp, proxOque: v.poque } : {}),
      },
    });
    setEnviando(false);
    if (!r.ok) {
      const campos = r.erro.detalhes?.campos;
      if (Array.isArray(campos) && campos.includes("proxEm")) {
        setErros({ pdata: "Esta data já passou. Escolha hoje ou um dia depois." });
        return focarPrimeiroErro(corpo.current);
      }
      return setErro(r.erro);
    }
    const resp = pessoas.find((p) => p.id === v.presp)?.nome;
    aoFeito({
      titulo: "Atendimento registrado.",
      texto: marcar && pdata
        ? `O próximo contato agora é ${dataBr(pdata).slice(0, 5)}, com ${resp}.${marcado ? ` O de ${dataBr(marcado.em).slice(0, 5)} foi encerrado.` : ""}`
        : marcado ? `O próximo contato de ${dataBr(marcado.em).slice(0, 5)} foi encerrado.` : "Ficou no histórico de atendimento.",
    });
  }

  const n = Object.keys(erros).length;
  const entrada = (k: "data" | "hora" | "pdata" | "outraPessoa" | "poque", rotulo: string, o: { ajuda?: string; foco?: boolean; numerico?: boolean; opcional?: boolean; classe?: string }) => {
    const id = `${ids}-${k}`;
    const e = erros[k];
    return (
      <div className={`campo ${o.classe ?? ""}`}>
        <label htmlFor={id}>
          {rotulo}
          {o.opcional ? <span className="opcional"> (opcional)</span> : null}
        </label>
        <input className="entrada" id={id} value={v[k]} autoComplete="off" inputMode={o.numerico ? "numeric" : undefined} data-foco={o.foco ? true : undefined}
          onChange={(ev) => mudar(k, ev.target.value)} aria-invalid={e ? true : undefined}
          aria-describedby={descritoPor(!e && o.ajuda && `${id}-aj`, e && `${id}-er`)} />
        {!e && o.ajuda ? (
          <p className="ajuda" id={`${id}-aj`}>
            {o.ajuda}
          </p>
        ) : null}
        {e ? <ErroCampo id={`${id}-er`}>{e}</ErroCampo> : null}
      </div>
    );
  };
  const escolha = (k: "canal" | "quem" | "com" | "presp", rotulo: string, opcoes: [string, string][], ajuda?: string) => {
    const id = `${ids}-${k}`;
    const e = erros[k];
    return (
      <div className="campo">
        <label htmlFor={id}>{rotulo}</label>
        <select className="entrada" id={id} value={v[k]} onChange={(ev) => mudar(k, ev.target.value)} aria-invalid={e ? true : undefined}
          aria-describedby={descritoPor(!e && ajuda && `${id}-aj`, e && `${id}-er`)}>
          {k === "presp" ? <option value="">Escolha</option> : null}
          {opcoes.map(([valor, texto]) => (
            <option key={valor} value={valor}>
              {texto}
            </option>
          ))}
        </select>
        {!e && ajuda ? (
          <p className="ajuda" id={`${id}-aj`}>
            {ajuda}
          </p>
        ) : null}
        {e ? <ErroCampo id={`${id}-er`}>{e}</ErroCampo> : null}
      </div>
    );
  };
  const equipe: [string, string][] = pessoas.map((p) => [p.id, p.nome === eu ? `${p.nome} (você)` : p.nome]);

  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={aoFechar} sobretitulo={f.nome} titulo="Registrar atendimento" descricao={`${ids}-d`}
      aoEnviar={() => void registrar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" disabled={enviando}>
            <Icone nome="check" className="ico" />
            {enviando ? "Registrando…" : "Registrar"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "contents" }}>
        <p id={`${ids}-d`}>Fica no histórico de atendimento com seu nome e a hora. Não se edita nem se apaga depois.</p>
        {n ? <Aviso tom="urgencia" titulo={faltaAcertar(n)}>O atendimento ainda não foi registrado.</Aviso> : null}
        {erro ? <Aviso tom="urgencia" titulo="O atendimento não foi registrado.">{textoDoErro(erro)} O que você escreveu continua aqui.</Aviso> : null}
        <div className="cl-dois">
          {entrada("data", "Data", { ajuda: "dd/mm/aaaa", foco: true, numerico: true })}
          {entrada("hora", "Hora", { ajuda: "hh:mm", numerico: true })}
        </div>
        <div className="cl-dois">
          {escolha("canal", "Canal", Object.entries(CANAIS))}
          {escolha("quem", "Quem atendeu", equipe)}
        </div>
        {escolha("com", "Com quem falou", [
          ...f.contatos.map((c): [string, string] => [c.id, `${c.nome}${c.papel ? ` (${c.papel.toLowerCase()})` : ""}`]),
          [outra, "Outra pessoa"],
        ], "Os contatos da ficha. “Outra pessoa” pede o nome.")}
        {v.com === outra ? entrada("outraPessoa", "Nome de quem falou", {}) : null}
        <div className="campo">
          <div className="campo-linha">
            <label htmlFor={`${ids}-resumo`}>Resumo</label>
            <span className="contador" aria-hidden="true">
              {v.resumo.length} de 2000
            </span>
          </div>
          <textarea className="entrada" id={`${ids}-resumo`} value={v.resumo} maxLength={2000} onChange={(ev) => mudar("resumo", ev.target.value)}
            aria-invalid={erros.resumo ? true : undefined}
            aria-describedby={descritoPor(`${ids}-resumo-aj`, erros.resumo && `${ids}-resumo-er`)} />
          <p className="ajuda" id={`${ids}-resumo-aj`}>
            O que foi conversado e combinado. Fica no histórico e não se apaga.
          </p>
          {erros.resumo ? <ErroCampo id={`${ids}-resumo-er`}>{erros.resumo}</ErroCampo> : null}
        </div>
        <fieldset className="cl-prox-grupo">
          <legend>
            Próximo contato
            <small>{marcado ? `substitui o que está marcado (${dataBr(marcado.em).slice(0, 5)})` : "o que fica combinado"}</small>
          </legend>
          {v.sem ? null : (
            <>
              <div className="cl-dois">
                {entrada("pdata", "Data", { ajuda: "dd/mm/aaaa", numerico: true })}
                {escolha("presp", "Responsável", equipe)}
              </div>
              {entrada("poque", "O que fazer", {})}
            </>
          )}
          <label className="opcao">
            <input className="marcar" type="checkbox" checked={v.sem} onChange={(ev) => mudar("sem", ev.target.checked)} />
            <span>
              Sem próximo contato
              <small>O acompanhamento deste cliente fica sem data.</small>
            </span>
          </label>
        </fieldset>
      </div>
    </Janela>
  );
}

function JanelaSituacao({ modo, f, escritorio, aoFechar, aoFeito, aoConflito }: {
  modo: "inativar" | "reativar" | null;
  f: FichaCliente;
  escritorio: string;
  aoFechar: () => void;
  aoFeito: (feito: Feito) => void;
  aoConflito: () => void;
}) {
  const ids = useId();
  const [motivo, setMotivo] = useState("");
  const [erroMotivo, setErroMotivo] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const campo = useRef<HTMLTextAreaElement>(null);
  const primeiro = primeiroNome(f.nome);
  const inativar = modo === "inativar";

  async function enviar() {
    setErro(null);
    if (inativar && !motivo.trim()) {
      setErroMotivo(true);
      return requestAnimationFrame(() => campo.current?.focus());
    }
    setErroMotivo(false);
    setEnviando(true);
    const r = await chamarPortal<{ versao: number }>(`/v1/escritorio/clientes/${f.id}/${inativar ? "inativar" : "reativar"}`, {
      corpo: { versao: f.versao, motivo: motivo.trim() || null },
    });
    setEnviando(false);
    if (!r.ok) {
      if (r.erro.codigo === "VERSION_CONFLICT") return aoConflito();
      return setErro(r.erro);
    }
    aoFeito(inativar
      ? { titulo: `${f.nome} inativado.`, texto: "Saiu da lista de ativos. Os dados e os atendimentos continuam guardados, e dá para reativar." }
      : { titulo: `${f.nome} reativado.`, texto: "Voltou para a lista de ativos com os dados, contatos e atendimentos de antes." });
  }

  return (
    <Janela id={`${ids}-j`} aberta={modo !== null} aoFechar={aoFechar} alerta={inativar} sobretitulo={`Clientes · ${escritorio}`}
      titulo={inativar ? `Inativar ${f.nome}?` : `Reativar ${f.nome}?`} descricao={`${ids}-d`} aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          {inativar ? (
            <button className="btn btn-perigo" type="submit" disabled={enviando}>
              {enviando ? "Inativando…" : `Inativar ${primeiro}`}
            </button>
          ) : (
            <button className="btn btn-pri" type="submit" disabled={enviando}>
              <Icone nome="reenviar" className="ico" />
              {enviando ? "Reativando…" : "Reativar"}
            </button>
          )}
        </>
      }>
      <p id={`${ids}-d`}>{inativar ? "Sai da lista de clientes ativos e da busca do dia a dia." : "Volta a aparecer entre os clientes ativos."}</p>
      {erroMotivo ? <Aviso tom="urgencia" titulo={faltaAcertar(1)}>{`${primeiro} continua ativo.`}</Aviso> : null}
      {erro ? <Aviso tom="urgencia" titulo={inativar ? "O cliente não foi inativado." : "O cliente não foi reativado."}>{textoDoErro(erro)}</Aviso> : null}
      <div className="campo">
        <label htmlFor={`${ids}-m`}>
          Motivo{inativar ? null : <span className="opcional"> (opcional)</span>}
        </label>
        <textarea ref={campo} className="entrada" id={`${ids}-m`} value={motivo} maxLength={300} data-foco onChange={(e) => setMotivo(e.target.value)}
          aria-invalid={erroMotivo ? true : undefined} aria-describedby={descritoPor(`${ids}-m-aj`, erroMotivo && `${ids}-m-er`)} />
        <p className="ajuda" id={`${ids}-m-aj`}>
          {inativar ? "Ex.: caso encerrado e sem novos serviços; desistiu da ação." : "Ex.: voltou a procurar o escritório para um caso novo."}
        </p>
        {erroMotivo ? <ErroCampo id={`${ids}-m-er`}>Escreva o motivo. Ele fica no histórico e ajuda quem for reativar.</ErroCampo> : null}
      </div>
      <p className="pt-comuns">
        <Icone nome="historico" className="ico" />
        <span>
          {inativar
            ? `Nada é apagado: dados, contatos e atendimentos ficam guardados e aparecem no filtro “Inativos”.${f.proxContato ? ` O próximo contato marcado (${dataBr(f.proxContato.em).slice(0, 5)}) é encerrado.` : ""} Para voltar, use Reativar na ficha.`
            : `${primeiro} volta para a lista de ativos com os dados, contatos e atendimentos de antes. A reativação fica no histórico.`}
        </span>
      </p>
    </Janela>
  );
}

// ------------------------------------------------------------------------- abas

type LinhaHist = { ocorridoEm: string; a?: Atendimento; funil?: { tipo: "saiu" | "voltou"; s: SaidaFunil } };

function Historico({ atendimentos, funil = [], f, hoje, destaque, acoes }: {
  atendimentos: Atendimento[];
  /** Saídas do funil (F3.8): entram como linhas da equipe no histórico. */
  funil?: SaidaFunil[];
  f: FichaCliente;
  hoje: string;
  destaque: string | null;
  /** O botão do próximo passo e "Registrar atendimento" (F3.110). */
  acoes: ReactNode;
}) {
  const p = f.proxContato;
  const r = p ? rotuloProx(p, hoje) : null;
  const linhas: LinhaHist[] = [
    ...atendimentos.map((a) => ({ ocorridoEm: a.ocorridoEm, a })),
    ...funil.flatMap((x) => [
      { ocorridoEm: x.marcadoEm, funil: { tipo: "saiu" as const, s: x } },
      ...(x.voltouEm ? [{ ocorridoEm: x.voltouEm, funil: { tipo: "voltou" as const, s: x } }] : []),
    ]),
  ].sort((x, y) => (x.ocorridoEm < y.ocorridoEm ? 1 : x.ocorridoEm > y.ocorridoEm ? -1 : 0));
  const dias = agruparEventosPorDia(linhas);
  const primeiro = f.nome.split(" ")[0];
  const excluido = f.situacao === "EXCLUIDO";
  return (
    <Folha titulo="Histórico de atendimento" classe="cl-hist" estilo={{ overflow: "hidden" }}
      sub={excluido
        ? "Ficam a data, o canal, quem atendeu e o resumo, como foi escrito. Com quem se falou foi excluído com os dados do cliente."
        : "Cada conversa com o cliente ou a família: quando, por onde, quem atendeu e o combinado. Nada aqui é apagado."}
      acoes={acoes || undefined}>
      {p && r?.tipo === "vencido" ? (
        <div className="cl-venc-aviso">
          <Aviso tom="urgencia" titulo={`O próximo contato venceu há ${r.dias === 1 ? "1 dia" : `${r.dias} dias`}.`}>
            {`Era ${r.data}: ${p.oque.replace(/\.$/, "")}, com ${p.responsavel.nome}. Registre o atendimento ou marque outra data.`}
          </Aviso>
        </div>
      ) : null}
      {dias.length ? (
        dias.map((d) => (
          <div key={d.dia} className="eventos-dia">
            <h3>{d.dia}</h3>
            <ol className="eventos">
              {d.eventos.map(({ a, funil: fx }) => fx ? (
                <li key={`${fx.s.id}-${fx.tipo}`}>
                  <time dateTime={fx.tipo === "saiu" ? fx.s.marcadoEm : fx.s.voltouEm}>{hora(fx.tipo === "saiu" ? fx.s.marcadoEm : fx.s.voltouEm!)}</time>
                  <span className="pto" aria-hidden="true" />
                  <div>
                    {fx.tipo === "saiu" ? (
                      <>
                        <p><b>{fx.s.marcadoPor.nome}</b> tirou {primeiro} do funil</p>
                        <small>Motivo: {MOTIVOS_SAIDA_FUNIL[fx.s.motivo].titulo.toLowerCase()}</small>
                        {fx.s.nota ? <span className="cl-resumo">“{fx.s.nota}”</span> : null}
                      </>
                    ) : (
                      <>
                        <p><b>{fx.s.voltouPor?.nome}</b> voltou {primeiro} ao funil</p>
                        <small>O motivo de antes ({MOTIVOS_SAIDA_FUNIL[fx.s.motivo].curto}) ficou guardado.</small>
                      </>
                    )}
                  </div>
                </li>
              ) : a ? (
                <li key={a.id} className={a.id === destaque ? "cl-novo" : undefined}>
                  <time dateTime={a.ocorridoEm}>{hora(a.ocorridoEm)}</time>
                  <span className={a.id === destaque ? "pto forte" : "pto"} aria-hidden="true" />
                  <div>
                    <p>
                      <b>{a.atendidoPor.nome}</b> atendeu por {CANAIS[a.canal].toLowerCase() === "whatsapp" ? "WhatsApp" : CANAIS[a.canal].toLowerCase()}
                      <span className="selo selo-neutro">{CANAIS[a.canal]}</span>
                      {a.id === destaque ? <span className="selo selo-ativo">Novo</span> : null}
                    </p>
                    {a.comQuem ? <small>com {a.comQuem}</small> : null}
                    <span className="cl-resumo">“{a.resumo}”</span>
                    {excluido ? <span className="pd-x-resumo">Com quem se falou e o próximo contato excluídos a pedido do titular (LGPD).</span> : null}
                    {a.proxContato ? (
                      <p className="cl-pc">
                        <Icone nome="relogio" className="ico" />
                        Próximo contato marcado:{" "}
                        <b>
                          {dataBr(a.proxContato.em)} · {a.proxContato.oque} · com {a.proxContato.responsavel.nome}
                        </b>
                      </p>
                    ) : null}
                  </div>
                </li>
              ) : null)}
            </ol>
          </div>
        ))
      ) : (
        <div className="estado sem-moldura">
          <span className="icone-estado">
            <Icone nome="conversas" className="ico" />
          </span>
          <h3>Nenhum atendimento registrado</h3>
          <p>Registre cada conversa com o cliente: quando, por onde, com quem e o que ficou combinado.</p>
        </div>
      )}
      {atendimentos.length ? (
        <div className="mais">
          <span>{atendimentos.length === 1 ? "Mostrando o único atendimento" : `Mostrando todos os ${atendimentos.length} atendimentos`}</span>
        </div>
      ) : null}
    </Folha>
  );
}

const ExplicaHistorico = () => {
  const id = useId();
  return (
    <section className="explica campo-ambar" aria-labelledby={id}>
      <p className="sobretitulo">Atendimentos</p>
      <h2 id={id}>O que foi dito fica com o escritório.</h2>
      <ul>
        <li>
          <Icone nome="relogio" className="ico" />
          <span>Cada atendimento pode marcar o próximo contato, com data e responsável. Vencido, ele aparece em destaque aqui e na lista.</span>
        </li>
        <li>
          <Icone nome="historico" className="ico" />
          <span>Não se edita nem se apaga um atendimento. Para corrigir, registre outro dizendo o que mudou.</span>
        </li>
        <li>
          <Icone nome="cadeado" className="ico" />
          <span>O resumo é sigiloso: só quem tem a área Comercial vê esta aba.</span>
        </li>
      </ul>
    </section>
  );
};

const ExplicaEditar = () => {
  const id = useId();
  return (
    <section className="explica campo-ambar" aria-labelledby={id}>
      <p className="sobretitulo">Editando</p>
      <h2 id={id}>A ficha é do escritório.</h2>
      <ul>
        <li>
          <Icone nome="historico" className="ico" />
          <span>Cada mudança vai para o histórico, com seu nome e os campos alterados.</span>
        </li>
        <li>
          <Icone nome="pessoas" className="ico" />
          <span>Se outra pessoa salvar antes, avisamos quem foi e a hora, e você escolhe qual versão fica.</span>
        </li>
        <li>
          <Icone nome="escudo" className="ico" />
          <span>Cada dado da qualificação serve à procuração e ao contrato. Não peça o que não vai usar.</span>
        </li>
      </ul>
    </section>
  );
};

// ------------------------------------------------------------------------- a página

export function FichaClientePortal({ id, aba, editarAoAbrir = false, cadastrado = false, termo = null }: {
  id: string; aba: AbaCliente; editarAoAbrir?: boolean; cadastrado?: boolean;
  /** O código do erro do termo de curatela que não subiu depois do cadastro (F3.118). */
  termo?: string | null;
}) {
  const { escritorio, erro: erroEscritorio, recarregar: recarregarEscritorio } = useEscritorioPortal();
  const [f, setF] = useState<FichaCliente | null>(null);
  const [erro, setErro] = useState<"NOT_FOUND" | "OUTRO" | null>(null);
  const [atendimentos, setAtendimentos] = useState<Atendimento[] | null>(null);
  const [erroAt, setErroAt] = useState(false);
  const [pessoas, setPessoas] = useState<PessoaRef[]>([]);
  const [editando, setEditando] = useState(editarAoAbrir);
  const [conflito, setConflito] = useState<Conflito | null>(null);
  const [meu, setMeu] = useState<RascunhoCliente | null>(null);
  const [meuTermo, setMeuTermo] = useState<File | null>(null);
  const [janela, setJanela] = useState<"registrar" | "inativar" | "reativar" | "pedir" | "excluir" | "recusar" | "por-si" | null>(null);
  const [abertura, setAbertura] = useState(0);
  const [feito, setFeito] = useState<Feito | null>(null);
  const [destaque, setDestaque] = useState<string | null>(null);
  // A assinatura e o caso abrem na própria ficha (F3.111, decisões 15 a 20).
  const [ligada, setLigada] = useState<JanelaLigada | null>(null);
  const [vezAba, setVezAba] = useState(0);
  const hoje = hojeBrasilia();
  const avisos = useAvisosCliente(id, aba === "ficha");

  const carregar = useCallback(async () => {
    const r = await chamarPortal<FichaCliente>(`/v1/escritorio/clientes/${id}`);
    if (!r.ok) {
      setErro(r.erro.codigo === "NOT_FOUND" ? "NOT_FOUND" : "OUTRO");
      return null;
    }
    setErro(null);
    setF(r.dados);
    return r.dados;
  }, [id]);

  const carregarAtendimentos = useCallback(async () => {
    setErroAt(false);
    const r = await chamarPortal<{ atendimentos: Atendimento[] }>(`/v1/escritorio/clientes/${id}/atendimentos`);
    if (r.ok) setAtendimentos(r.dados.atendimentos);
    else setErroAt(true);
    return r.ok ? r.dados.atendimentos : null;
  }, [id]);

  useEffect(() => {
    void Promise.resolve().then(() => carregar());
  }, [carregar]);
  const comercial = f?.comercial ?? false;
  const [funil, setFunil] = useState<ClienteFunil | null | "erro">(null);
  const carregarFunil = useCallback(async () => {
    const r = await chamarPortal<ClienteFunil>(`/v1/escritorio/clientes/${id}/funil`);
    setFunil(r.ok ? r.dados : "erro");
  }, [id]);
  useEffect(() => {
    if (!comercial || aba !== "atendimentos") return;
    void Promise.resolve().then(() => carregarFunil());
  }, [comercial, aba, carregarFunil]);
  useEffect(() => {
    if (!comercial) return;
    void Promise.resolve().then(async () => {
      if (aba === "atendimentos") await carregarAtendimentos();
      const r = await chamarPortal<{ pessoas: PessoaRef[] }>("/v1/escritorio/pessoas");
      if (r.ok) setPessoas(r.dados.pessoas);
    });
  }, [comercial, aba, carregarAtendimentos]);
  useEffect(() => {
    if (!cadastrado || !f) return;
    const erroTermo = erroDoCodigoDoTermo(termo);
    void Promise.resolve().then(() => setFeito({
      titulo: `${f.nome} cadastrado.`,
      // TODO(F3.118): o aviso do termo que não subiu espera o ok da Carol
      // (docs/design/propostas/portal-termo-curatela/NOTAS.md, item 1); até lá, o texto do erro.
      texto: erroTermo ? textoDoErro(erroTermo) : "A ficha está pronta para usar. A qualificação pode ficar para quando for preparar a procuração.",
    }));
    const u = new URL(window.location.href);
    u.searchParams.delete("cadastrado");
    u.searchParams.delete("termo");
    window.history.replaceState(null, "", u);
  }, [cadastrado, termo, f]);

  const abrir = (j: typeof janela) => {
    setFeito(null);
    setAbertura((n) => n + 1);
    setJanela(j);
  };

  const abrirLigada = (j: JanelaLigada) => {
    setFeito(null);
    setAbertura((n) => n + 1);
    setLigada(j);
  };

  async function assinado(r: FimDaAssinatura) {
    if (r.casoId && r.podeVerCaso) return irPara(`${ROTAS_JURIDICO.caso(r.casoId)}?assinado=1`);
    setLigada(null);
    setFeito({
      titulo: "Assinatura registrada.",
      texto: r.semCaso
        ? "O contrato está ativo e os recebimentos passam a existir. Ele ficou sem caso; dá para abrir o caso depois."
        : `O contrato está ativo e o caso abriu em Jurídico${r.responsavel ? `, com ${r.responsavel}, que recebeu o aviso no sino` : ""}.`,
    });
    await carregar();
    setVezAba((n) => n + 1);
  }

  async function concluir(x: Feito, depois?: () => Promise<unknown>) {
    setJanela(null);
    setFeito(x);
    await carregar();
    if (depois) await depois();
  }

  async function aoConflitoEditar(rascunho: RascunhoCliente, arquivo: File | null) {
    const novo = await carregar();
    if (!novo) return;
    setMeu(rascunho);
    setMeuTermo(arquivo);
    const quem = novo.alterado?.por && novo.alterado.em ? `${novo.alterado.por} salvou esta ficha às ${hora(novo.alterado.em)}, enquanto você editava.` : "Outra pessoa salvou esta ficha enquanto você editava.";
    setConflito({ titulo: quem, diferencas: diferencasCliente(rascunhoDaFicha(novo), rascunho) });
  }

  const nomeEsc = escritorio?.nome ?? "";
  const trilha = [{ nome: "Clientes", href: ROTAS_PORTAL.clientes }, { nome: f?.nome ?? "Cliente" }];

  if (erroEscritorio || erro === "OUTRO") {
    return (
      <MolduraPortal atual="clientes" trilha={trilha} escritorio={escritorio} pagina="co-ficha">
        <ErroAoCarregar oque="a ficha do cliente" aoTentar={() => { recarregarEscritorio(); void carregar(); }} />
      </MolduraPortal>
    );
  }
  if (erro === "NOT_FOUND") {
    return (
      <MolduraPortal atual="clientes" trilha={[{ nome: "Clientes", href: ROTAS_PORTAL.clientes }, { nome: "Não encontrado" }]} escritorio={escritorio} pagina="co-ficha">
        <div className="estado" role="status">
          <span className="icone-estado">
            <Icone nome="busca" className="ico" />
          </span>
          <h1 style={{ fontSize: 28 }}>Cliente não encontrado</h1>
          <p>Este endereço não é de um cliente deste escritório. Volte para a lista e busque pelo nome, CPF ou telefone.</p>
          <div className="acoes">
            <a className="btn btn-pri" href={ROTAS_PORTAL.clientes}>
              <Icone nome="pessoas" className="ico" />
              Ir para Clientes
            </a>
          </div>
        </div>
      </MolduraPortal>
    );
  }
  if (!f || !escritorio) {
    return (
      <MolduraPortal atual="clientes" trilha={trilha} escritorio={escritorio} pagina="co-ficha">
        <Carregando rotulo="Carregando a ficha do cliente…" linhas={5} />
      </MolduraPortal>
    );
  }

  const ativo = f.situacao === "ATIVO";
  const excluido = f.situacao === "EXCLUIDO";
  // Arquivado a pedido (F1.16): os dados ficam, só leitura, com o registro do arquivamento.
  const arquivado = f.situacao === "ARQUIVADO";
  const fimLgpd = excluido || arquivado;
  const cont = f.contagens ?? {};
  const temAba = (a: AbaCliente) =>
    a === "ficha" || (a === "atendimentos" ? comercial : !fimLgpd && cont[a] !== undefined);
  const abaAtual: AbaCliente = temAba(aba) ? aba : "ficha";
  const editar = ativo ? () => { setFeito(null); setEditando(true); } : undefined;
  const p = f.proxContato;
  const r = p ? rotuloProx(p, hoje) : null;
  const proc = prontosParaProcuracao(f);
  const dona = escritorio.socios[0];
  const nomeDona = dona ?? "a sócia dona";

  // O âmbar vira "Próximo passo" (F3.110, decisão 1) para quem pode dar o passo, para quem tem
  // Comercial e, com o caso aberto ou no fechamento (decisão 16 da jornada), para todos; os outros veem a procuração, como antes.
  const passo = ativo ? f.passo : undefined;
  const comPasso = !!passo && (comercial || passo.pode || passo.tipo === "CASO" || passo.tipo === "DOCUMENTOS" || passo.tipo === "FECHAMENTO");
  const dir = fimLgpd ? (
    <RegistroNoCabecalho f={f} />
  ) : passo && comPasso ? (
    <DirPasso f={f} passo={passo} comercial={comercial} hoje={hoje} editando={editando} aoRegistrar={comercial ? () => abrir("registrar") : null}
      aoJanela={abrirLigada} escritorio={nomeEsc} />
  ) : comercial ? (
    <section className="dir campo-ambar" aria-labelledby="cl-t-prox">
      <p className="sobretitulo" id="cl-t-prox">
        Próximo contato
      </p>
      {p && r ? (
        <>
          <div className="cl-dir-linha">
            <p className="grande">{r.data}</p>
            {r.tipo === "vencido" ? (
              <span className="selo selo-urgente">
                <Icone nome="alerta" className="ico" />
                {r.rotulo}
              </span>
            ) : (
              <span className={r.tipo === "hoje" ? "selo selo-atencao" : "selo selo-ativo"}>{r.rotulo}</span>
            )}
          </div>
          <p className="cl-oque">
            <b>{p.oque}</b>
            <br />
            com {p.responsavel.nome}
          </p>
        </>
      ) : (
        <>
          <p className="grande" style={{ fontSize: 30 }}>
            Nenhum
          </p>
          <p className="cl-oque">
            {ativo
              ? "Registre um atendimento e marque quando falar de novo."
              : `Encerrado ao inativar${f.inativadoEm ? `, em ${dataLonga(f.inativadoEm)}` : ""}.`}
          </p>
        </>
      )}
      {ativo && !editando ? (
        <button data-muda className="btn btn-pri" type="button" onClick={() => abrir("registrar")}>
          <Icone nome="mais" className="ico" />
          Registrar atendimento
        </button>
      ) : null}
    </section>
  ) : (
    <section className="dir campo-ambar" aria-labelledby="cl-t-proc">
      <p className="sobretitulo" id="cl-t-proc">
        Para a procuração
      </p>
      <p className="grande">
        {proc.prontos} de {proc.total}
        <small>dados</small>
      </p>
      <p className="cl-oque">{proc.faltam.length ? <>Falta: <b>{juntarComE(proc.faltam.map((x) => x.toLowerCase()))}</b></> : "Tudo pronto."}</p>
      {proc.faltam.length && editar && !editando ? (
        <button data-muda className="btn btn-pri" type="button" onClick={editar}>
          <Icone nome="lapis" className="ico" />
          Completar qualificação
        </button>
      ) : null}
    </section>
  );

  const cab = (
    <div className="ficha-cab">
      <div className="esq campo-vinho">
        <Icone nome={fimLgpd ? "escudo" : "balanca"} className="ico estatua" />
        <a className="voltar" href={fimLgpd ? `${ROTAS_PORTAL.clientes}?filtro=inativos` : ROTAS_PORTAL.clientes}>
          <Icone nome="esquerda" className="ico ico-s" />
          Clientes
        </a>
        <div className="ident">
          <div>
            <p className="sobretitulo">Cliente · {TIPOS_CLIENTE[f.tipo].toLowerCase()}</p>
            <h1 className={excluido ? "pd-excl-h1" : undefined}>{f.nome}</h1>
            <p className="meta">
              {excluido ? (
                <span className="selo selo-excl">
                  <Icone nome="escudo" className="ico" />
                  Excluído (LGPD)
                </span>
              ) : arquivado ? (
                <span className="selo selo-excl">
                  <Icone nome="pasta" className="ico" />
                  Arquivado (LGPD)
                </span>
              ) : ativo ? (
                <>
                  <span className="selo selo-ativo">Ativo</span>
                  <SeloSemAvisos ativo={avisos.dados?.ativo} />
                  <SeloQuemAssina f={f} />
                </>
              ) : (
                <span className="selo selo-neutro">Inativo</span>
              )}
              <span>
                {excluido
                  ? `a pedido do titular em ${f.exclusao ? dataLonga(f.exclusao.em) : ""}`
                  : arquivado
                    ? `arquivado a pedido do titular em ${f.arquivamento ? dataLonga(f.arquivamento.em) : ""}`
                    : `cliente desde ${dataLonga(f.criadoEm)}`}
              </span>
              {f.documento ? (
                <>
                  <span className="sep" aria-hidden="true" />
                  <span className="num">{formatarDocumento(f.documento)}</span>
                </>
              ) : null}
              <OrigemPlanilha id={excluido ? null : f.id} />
            </p>
          </div>
        </div>
      </div>
      {dir}
    </div>
  );

  const base = `${ROTAS_PORTAL.clientes}/${f.id}`;
  const abas = (
    <nav className="abas" aria-label="Seções da ficha">
      <a href={base} aria-current={abaAtual === "ficha" ? "page" : undefined}>
        Ficha
      </a>
      {comercial ? (
        <a href={`${base}?aba=atendimentos`} aria-current={abaAtual === "atendimentos" ? "page" : undefined}>
          Atendimentos<span className="q">{f.atendimentos ?? 0}</span>
        </a>
      ) : null}
      {(["propostas", "contratos", "casos"] as const).filter(temAba).map((a) => (
        <a key={a} href={`${base}?aba=${a}`} aria-current={abaAtual === a ? "page" : undefined}>
          {a === "propostas" ? "Propostas" : a === "contratos" ? "Contratos" : "Casos"}
          <span className="q">{cont[a] ?? 0}</span>
        </a>
      ))}
    </nav>
  );

  const faixaInativo = !ativo && !fimLgpd ? (
    <div className="aviso aviso-info cl-inativo-faixa" role="status">
      <Icone nome="pasta" className="ico" />
      <div>
        <strong className="aviso-titulo">Cliente inativo desde {f.inativadoEm ? dataLonga(f.inativadoEm) : ""}.</strong>
        <p>
          {f.inativadoPor ? `${f.inativadoPor.nome} inativou` : "Inativado"}
          {f.motivoInativacao ? `: “${f.motivoInativacao}”` : "."} Os dados e os atendimentos continuam aqui.
        </p>
      </div>
      {f.podeInativar ? (
        <button data-muda className="btn btn-sec" type="button" onClick={() => abrir("reativar")}>
          <Icone nome="reenviar" className="ico" />
          Reativar
        </button>
      ) : null}
    </div>
  ) : null;

  const notaSemComercial = (
    <Folha titulo="Atendimentos" pequena>
      <p className="pt-pe-folha" style={{ borderTop: 0 }}>
        <Icone nome="cadeado" className="ico" />
        <span>
          O histórico de atendimento, a origem e o próximo contato ficam na área Comercial, que não está liberada para você.
          {dona ? ` Quem libera as áreas é ${dona}.` : " Quem libera as áreas é o sócio dono."}
        </span>
      </p>
    </Folha>
  );

  const lgpd = (
    <div data-muda style={{ display: "contents" }}>
      <AcaoLgpd f={f} dona={nomeDona} aoExcluir={() => abrir("excluir")} aoPedir={() => abrir("pedir")} />
    </div>
  );
  const situacao = excluido ? (
    <Folha titulo="Situação" pequena>
      <div className="cl-sit">
        <p>Não dá para editar, reativar nem registrar atendimento em cliente excluído. Se a pessoa voltar a procurar o escritório, cadastre de novo, como cliente novo.</p>
      </div>
    </Folha>
  ) : arquivado ? (
    <Folha titulo="Situação" pequena>
      <div className="cl-sit">
        <p>
          Arquivado a pedido do titular (LGPD). A ficha fica só leitura: não dá para editar, reativar nem registrar atendimento. Os dados continuam guardados
          porque há contrato ou processo, e só aparecem em Inativos.
        </p>
      </div>
    </Folha>
  ) : ativo ? (
    <Folha titulo="Situação" pequena>
      <div className="cl-sit">
        <p>Ativo desde {dataLonga(f.criadoEm)}. Inativar tira o cliente da lista do dia a dia e encerra o próximo contato. Nada é apagado, e dá para reativar.</p>
        {f.podeInativar ? (
          <button data-muda className="btn btn-perigo" type="button" onClick={() => abrir("inativar")}>
            <Icone nome="pasta" className="ico" />
            Inativar cliente
          </button>
        ) : null}
        {lgpd}
      </div>
    </Folha>
  ) : (
    <Folha titulo="Situação" pequena>
      <div className="cl-sit">
        <p>Inativo não aparece na lista do dia a dia nem gera próximo contato. Continua na busca, pelo filtro “Inativos”, e na exportação dos dados do escritório.</p>
        {lgpd}
      </div>
    </Folha>
  );

  let corpo: ReactNode;
  if (editando) {
    corpo = (
      <Grade
        principal={
          <FormularioCliente key={conflito ? `c-${f.versao}` : "e"} modo="editar" inicial={meu ?? rascunhoDaFicha(f)} comercial={comercial} versao={f.versao}
            idCliente={f.id} conflito={conflito} termoAtual={f.termoCuratela ?? null} termoInicial={meuTermo}
            aoSalvo={(r) => {
              // Mesmo com o termo que não subiu, sai do formulário: a versão mudou com o PUT.
              setEditando(false);
              setConflito(null);
              setMeu(null);
              setMeuTermo(null);
              const historico = "A mudança ficou no histórico, com seu nome e os campos alterados.";
              const guardado = "O termo de curatela ficou guardado na ficha.";
              void concluir({
                titulo: "Ficha salva.",
                // TODO(F3.118): o aviso do termo que não subiu espera o ok da Carol
                // (docs/design/propostas/portal-termo-curatela/NOTAS.md, item 1); até lá, o texto do erro.
                texto: r.termo && r.termo !== "ENVIADO" ? textoDoErro(r.termo.erro)
                  : r.termo === "ENVIADO" ? (r.fichaMudou ? `${historico} ${guardado}` : guardado) : historico,
              });
            }}
            aoCancelar={() => { setEditando(false); setConflito(null); setMeu(null); setMeuTermo(null); }}
            aoConflito={(x, t) => void aoConflitoEditar(x, t)}
            aoFicarComSalva={() => { setEditando(false); setConflito(null); setMeu(null); setMeuTermo(null); }} />
        }
        lateral={<ExplicaEditar />}
      />
    );
  } else if (abaAtual === "propostas" || abaAtual === "contratos" || abaAtual === "casos") {
    corpo = (
      <AbaItensCliente aba={abaAtual} f={f} passo={passo} hoje={hoje} vez={vezAba} juridico={cont.casos !== undefined} aoJanela={abrirLigada} />
    );
  } else if (abaAtual === "atendimentos") {
    corpo = (
      <Grade
        principal={
          erroAt ? (
            <ErroAoCarregar oque="os atendimentos" aoTentar={() => void carregarAtendimentos()} />
          ) : atendimentos === null ? (
            <Carregando rotulo="Carregando os atendimentos…" linhas={4} />
          ) : (
            <Historico atendimentos={atendimentos} funil={funil && funil !== "erro" ? funil.eventos : []} f={f} hoje={hoje} destaque={destaque}
              acoes={ativo ? (
                <button data-muda className="btn btn-pri" type="button" onClick={() => abrir("registrar")}>
                  <Icone nome="mais" className="ico" />
                  Registrar atendimento
                </button>
              ) : null} />
          )
        }
        lateral={fimLgpd ? <RegistroExclusao f={f} /> : (
          <>
            {comercial && !excluido ? (
              <FolhaFunilCliente dados={funil} recarregar={() => void carregarFunil()} id={f.id} nome={f.nome} hoje={hoje}
                detalhe={atendimentos?.[0] ? `Último atendimento em ${dataLonga(atendimentos[0].ocorridoEm)}` : undefined}
                podeEscrever={!soConsulta(escritorio) && ativo}
                aoFeito={(titulo, texto) => { setFeito({ titulo, texto }); void carregarFunil(); }} />
            ) : null}
            <ExplicaHistorico />
          </>
        )}
      />
    );
  } else {
    corpo = (
      <Grade
        principal={
          excluido ? (
            <DadosExcluidos f={f} />
          ) : (
            <>
              <Dados f={f} aoEditar={editar} />
              {!arquivado ? <FolhaDocumentosPessoais f={f} escritorio={escritorio.nome} aoFeito={(x) => setFeito(x)} /> : null}
              {f.tipo === "PF" ? (
                <>
                  <FolhaQuemAssina f={f} aoEditar={editar} />
                  <FolhaQuemAssinava f={f} />
                </>
              ) : null}
              <Contatos f={f} aoEditar={editar} />
              <FolhaSemAvisos f={f} dados={avisos.dados} eu={escritorio.pessoa} podeEscrever={!soConsulta(escritorio) && !arquivado}
                aoFeito={(x) => { setFeito(x); avisos.recarregar(); }} />
              <FolhaSistemaAntigo cliente={f.id} podeCriarContrato={!soConsulta(escritorio) && !arquivado && escritorio.areas.includes("CONTRATOS")} />
            </>
          )
        }
        lateral={
          <>
            {fimLgpd ? <RegistroExclusao f={f} /> : null}
            {ativo ? <Procuracao f={f} aoEditar={editar} /> : null}
            {f.tipo === "PF" && !excluido ? <FolhaTempo f={f} /> : null}
            {comercial ? <Origem f={f} /> : notaSemComercial}
            {situacao}
            {fimLgpd ? null : <NoEscritorio f={f} />}
          </>
        }
      />
    );
  }

  return (
    <MolduraPortal atual="clientes" trilha={trilha} escritorio={escritorio} pagina="co-ficha">
      <div className="cl">
        {cab}
        {fimLgpd ? null : <FaixaPedido f={f} aoExcluir={() => abrir("excluir")} aoRecusar={() => abrir("recusar")} />}
        {abas}
        {faixaInativo}
        {ativo && !editando ? (
          <FaixaFez18 f={f} aoAtualizar={editar ? () => abrir("por-si") : undefined} gerarHref={ROTAS_DOCUMENTOS.gerar()} />
        ) : null}
        {corpo}
      </div>
      {feito ? <Toast feito={feito} aoFechar={() => setFeito(null)} /> : null}
      {comercial && ativo ? (
        <JanelaRegistrar key={`r-${abertura}`} aberta={janela === "registrar"} f={f} pessoas={pessoas} eu={escritorio.pessoa} aoFechar={() => setJanela(null)}
          aoFeito={(x) => void concluir(x, async () => {
            const lista = await carregarAtendimentos();
            setDestaque(lista?.[0]?.id ?? null);
            if (abaAtual !== "atendimentos") irPara(`${base}?aba=atendimentos`);
          })} />
      ) : null}
      {ligada && ligada.tipo === "assinar" ? (
        <JanelaAssinaturaCaso key={`as-${abertura}`} aberta contrato={ligada.contrato} aoFechar={() => setLigada(null)} aoFeito={(r) => void assinado(r)} />
      ) : null}
      {ligada && ligada.tipo === "caso" ? (
        <JanelaAbrirCaso key={`ac-${abertura}`} aberta contrato={ligada.contrato} modoInicial={ligada.modo} aoFechar={() => setLigada(null)}
          aoFeito={(r) => (r.casoId ? irPara(`${ROTAS_JURIDICO.caso(r.casoId)}?aberto=1`) : void carregar())} />
      ) : null}
      {f.podeInativar ? (
        <JanelaSituacao key={`s-${abertura}`} modo={janela === "inativar" || janela === "reativar" ? janela : null} f={f} escritorio={nomeEsc}
          aoFechar={() => setJanela(null)} aoFeito={(x) => void concluir(x)}
          aoConflito={() => { setJanela(null); void carregar().then(() => setFeito(null)); }} />
      ) : null}
      {ativo && f.assina?.situacao === "FEZ_18" ? (
        <JanelaAssinaPorSi key={`ps-${abertura}`} aberta={janela === "por-si"} f={f} aoFechar={() => setJanela(null)} aoFeito={(x) => void concluir(x)}
          aoConflito={() => { setJanela(null); void carregar().then(() => setFeito(null)); }} />
      ) : null}
      {fimLgpd ? null : (
        <>
          <JanelaPedir key={`p-${abertura}`} aberta={janela === "pedir"} f={f} dona={nomeDona} hoje={hoje} aoFechar={() => setJanela(null)}
            aoFeito={(x) => void concluir(x)} />
          {f.dono ? (
            <>
              {f.vinculosLgpd ? (
                <JanelaArquivar key={`a-${abertura}`} aberta={janela === "excluir"} f={f} hoje={hoje} aoFechar={() => setJanela(null)}
                  aoFeito={(x) => void concluir(x)}
                  aoConflito={() => { setJanela(null); void carregar().then(() => setFeito(null)); }} />
              ) : (
                <JanelaExcluir key={`x-${abertura}`} aberta={janela === "excluir"} f={f} hoje={hoje} aoFechar={() => setJanela(null)}
                  aoFeito={(x) => void concluir(x, async () => { if (abaAtual === "atendimentos") await carregarAtendimentos(); })}
                  aoConflito={() => { setJanela(null); void carregar().then(() => setFeito(null)); }} />
              )}
              <JanelaRecusar key={`n-${abertura}`} aberta={janela === "recusar"} f={f} aoFechar={() => setJanela(null)} aoFeito={(x) => void concluir(x)} />
            </>
          ) : null}
        </>
      )}
    </MolduraPortal>
  );
}
