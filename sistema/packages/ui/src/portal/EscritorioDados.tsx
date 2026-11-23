"use client";
// Os dados do escritório para os documentos (PA-07), tela aprovada em
// docs/design/aprovadas/escritorio-dados-documentos (Carol, 22/11/2026): o cabeçalho com a frase
// como o escritório sai no contrato, a folha dos dados, a edição com a prévia do contrato e do
// timbrado, e o resumo dos advogados. Só a sócia dona muda; a equipe T3jus muda no Console.
// O servidor confere tudo de novo (0860_escritorio_dados_documentos.sql).

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  conferirFormEscritorio, dadosDoForm, dadosQueContamEscritorio, faltasDoEscritorio, formDoEscritorio, linhaDaSede, linhasTimbrado,
  listaFaltasEscritorio, qualificacaoDoEscritorio, telefoneNoTexto, TEXTO_ERRO_ESCRITORIO, TIPOS_ESCRITORIO, UFS,
  type CampoEscritorio, type DadoQueConta, type DadosDocumentoPessoa, type DadosEscritorioDocumentos, type EnderecoEscritorio, type FormEscritorio,
  type InscricaoOab, type TipoEscritorio,
} from "@t3jus/domain";
import { Icone, type NomeIcone } from "../Icone.tsx";
import { Aviso, descritoPor, ErroCampo, faltaAcertar, focarPrimeiroErro } from "../console/pecas.tsx";
import { formatarCnpj } from "../console/ficha.ts";
import { chamarPortal, ROTAS_PORTAL, type EscritorioPortal } from "./Moldura.tsx";
import { ROTAS_ESCRITORIO } from "./WhatsApp.tsx";

const plural = (n: number, s: string, p: string) => (n === 1 ? s : p);
const MARCA = /(\[[^[\]]{1,80}: (?:falta|confira)\])/;
const horaBr = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { timeZone: "America/Bahia" })} às ${d.toLocaleTimeString("pt-BR", { timeZone: "America/Bahia", hour: "2-digit", minute: "2-digit" }).replace(":", "h")}`;
};

/** "Rua A, 1, Centro, Cidade/UF, CEP 00000-000"; sem as partes, o texto antigo. */
function sedeNaTela(d: DadosEscritorioDocumentos): string | null {
  return linhaDaSede(d);
}

function emailQuebra(email: string): ReactNode {
  const [u, dom = ""] = email.split("@");
  return (
    <>
      {u}@<wbr />
      {dom}
    </>
  );
}

/** Um texto com as marcas [X: falta] destacadas e o nome em negrito. */
function ComMarcas({ texto, forte }: { texto: string; forte?: string | null }) {
  const partes = texto.split(MARCA);
  return (
    <>
      {partes.map((p, i) => {
        if (!p) return null;
        if (MARCA.test(p)) return <mark key={i} className="cd-falta">{p}</mark>;
        if (i === 0 && forte && p.startsWith(forte)) {
          return (
            <span key={i}>
              <strong>{forte}</strong>
              {p.slice(forte.length)}
            </span>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

/** O parágrafo da contratada, como sai no contrato padrão (decisões 3, 7 e 17). */
export function FraseContratada({ d }: { d: DadosEscritorioDocumentos }) {
  const sem = d.tipo === "SEM_SOCIEDADE";
  if (sem && !d.dona?.dados) {
    // Quem não é a sócia dona não vê CPF e RG dela: a frase mostra só de onde vem.
    return (
      <>
        <b>CONTRATADA:</b> <strong>{(d.dona?.nome ?? d.nome).toUpperCase()}</strong>,{" "}
        <span className="ed-ref" title="Vem de Advogados nos documentos">[QUALIFICAÇÃO DA ADVOGADA]</span>.
      </>
    );
  }
  const forte = sem ? d.dona?.dados?.nomeCompleto?.trim().toUpperCase() : (d.razaoSocial?.trim() || d.nome).toUpperCase();
  return (
    <>
      <b>CONTRATADA:</b> <ComMarcas texto={qualificacaoDoEscritorio(d)} forte={forte} />
      {sem ? null : (
        <>
          , por seus advogados, <span className="ed-ref" title="Vem de Advogados nos documentos">[QUALIFICAÇÃO DOS ADVOGADOS]</span>
        </>
      )}
      .
    </>
  );
}

function Disco({ d }: { d: DadosEscritorioDocumentos }) {
  const tot = dadosQueContamEscritorio(d).length;
  const f = faltasDoEscritorio(d);
  const n = tot - f.length;
  return (
    <div className="cd-conta">
      <span className={`disco${f.length ? "" : " cd-ok"}`} aria-hidden="true">
        <span>{n}</span>
      </span>
      <p>
        <b>de {tot} dados</b>
        {f.length ? `${plural(f.length, "falta", "faltam")} ${f.length} para os documentos` : "completos para os documentos"}
        <span className="sr">: {n} de {tot} dados preenchidos</span>
      </p>
    </div>
  );
}

/** O cabeçalho: vinho (quem é) e âmbar (como sai no contrato). */
export function CabecalhoEscritorio({ d, dona, nomeDona, editando, aoCompletar }: {
  d: DadosEscritorioDocumentos;
  dona: boolean;
  nomeDona: string;
  editando?: boolean;
  aoCompletar?: () => void;
}) {
  const f = faltasDoEscritorio(d);
  const tot = dadosQueContamEscritorio(d).length;
  const topo = (
    <div className="cd-topo campo-vinho">
      <Icone nome="coluna" className="ico estatua" />
      <div className="cd-quem">
        <p className="sobretitulo">{editando ? "Escritório · editando os dados" : "Escritório · dados para os documentos"}</p>
        <h1>{d.nome}</h1>
        <p className="cd-meta">
          <span className="selo">{d.tipo ? TIPOS_ESCRITORIO[d.tipo].nome : "Tipo não informado"}</span>
          {d.cidade ? <span>{d.cidade}{d.uf ? `, ${d.uf}` : ""}</span> : null}
          {d.cnpj ? <span className="cd-nw">CNPJ {formatarCnpj(d.cnpj)}</span> : <span>Sem CNPJ</span>}
        </p>
      </div>
      {editando ? null : <Disco d={d} />}
    </div>
  );
  if (editando) return <header className="cd-cab">{topo}</header>;
  let txt: ReactNode;
  if (d.tipo === "SEM_SOCIEDADE") {
    txt = (
      <>
        <b>Sem sociedade, quem contrata é a advogada:</b> a frase vem da qualificação de {nomeDona}, em Advogados nos documentos, com o endereço deste
        escritório. Não sai CNPJ.
      </>
    );
  } else if (f.length) {
    txt = (
      <>
        <b>
          {plural(f.length, "Falta", "Faltam")} {f.length} de {tot}: {listaFaltasEscritorio(f)}.
        </b>{" "}
        Dá para gerar documentos assim: o que falta sai marcado, para completar à mão ou no Word.
      </>
    );
  } else {
    txt = "É assim que o escritório sai no contrato de honorários. A sede também vai na procuração, nas petições e no timbrado do carnê e do recibo.";
  }
  return (
    <header className="cd-cab">
      {topo}
      <section className="cd-faixa campo-ambar" aria-labelledby="t-sai">
        <p className="sobretitulo" id="t-sai">Como o escritório sai no contrato</p>
        <p className="cd-frase">
          <FraseContratada d={d} />
        </p>
        <div className="cd-faixa-pe">
          <p>{txt}</p>
          {f.length && dona && aoCompletar ? (
            <button className="btn btn-pri" type="button" data-muda onClick={aoCompletar}>
              <Icone nome="lapis" className="ico" />
              Completar agora
            </button>
          ) : null}
        </div>
      </section>
    </header>
  );
}

function Falta({ o, oque }: { o: string; oque?: string }) {
  return (
    <>
      <span className="selo selo-atencao">Falta</span>
      <span className="cd-sai">
        {oque ?? (
          <>
            sai como <span className="cd-nw">[{o}: falta]</span>
          </>
        )}
      </span>
    </>
  );
}

const Uso = ({ t }: { t: string }) => (
  <span className="ed-uso">
    Sai em: <b>{t}</b>
  </span>
);
const OPC = <span className="cd-opc">Não informado (opcional)</span>;

function Progresso({ d }: { d: DadosEscritorioDocumentos }) {
  const tot = dadosQueContamEscritorio(d).length;
  const f = faltasDoEscritorio(d);
  const n = tot - f.length;
  return (
    <div className={`cd-prog${f.length ? "" : " ok"}`}>
      <div className="cd-tons" aria-hidden="true" style={{ gridTemplateColumns: `repeat(${tot},1fr)`, flexBasis: 23 * tot }}>
        {Array.from({ length: tot }, (_, i) => (
          <i key={i} className={i < n ? undefined : "v"} />
        ))}
      </div>
      <p>
        {f.length ? (
          <>
            <b>
              {plural(f.length, "Falta", "Faltam")} {f.length} de {tot} dados:
            </b>{" "}
            {listaFaltasEscritorio(f)}. Não bloqueia: os documentos saem com a marca no lugar.
          </>
        ) : (
          <>
            <b>{tot} de {tot} dados preenchidos.</b> O escritório sai completo nos documentos.
          </>
        )}
      </p>
    </div>
  );
}

function Dl({ xs }: { xs: [string, ReactNode][] }) {
  return (
    <dl className="cd-dl">
      {xs.map(([a, b]) => (
        <div key={a}>
          <dt>{a}</dt>
          <dd>{b}</dd>
        </div>
      ))}
    </dl>
  );
}

/** As duas colunas de leitura: quem é, onde fica e como falar (decisões 4 a 9). */
function LinhasEscritorio({ d, nomeDona }: { d: DadosEscritorioDocumentos; nomeDona: string }) {
  const sem = d.tipo === "SEM_SOCIEDADE";
  const q: [string, ReactNode][] = [
    ["Nome no T3jus", <>{d.nome}<small>Aparece no Portal, no menu e nas conversas. Não sai nos documentos.</small></>],
    ["Tipo", d.tipo ? <>{TIPOS_ESCRITORIO[d.tipo].nome}<small>{TIPOS_ESCRITORIO[d.tipo].explica}</small></> : <Falta o="TIPO" oque="muda a frase do contrato" />],
  ];
  if (sem) {
    q.push(["Contratada", <>{nomeDona}, como advogada<small>A qualificação dela, de Advogados nos documentos.</small><Uso t="contrato" /></>]);
  } else {
    q.push(
      ["Razão social", d.razaoSocial ? <>{d.razaoSocial}<Uso t="contrato, recibo e carnê" /></> : (
        <>
          <Falta o="RAZÃO SOCIAL" />
          <small>Até lá, sai o nome no T3jus: “{d.nome.toUpperCase()}”.</small>
        </>
      )],
      ["CNPJ", d.cnpj ? <><span className="cd-nw">{formatarCnpj(d.cnpj)}</span><Uso t="contrato, recibo e carnê" /></> : <Falta o="CNPJ" />],
      ["Registro da sociedade na OAB", d.oab ? <>{d.oab}<Uso t="contrato, recibo e carnê" /></> : <Falta o="OAB DA SOCIEDADE" />],
    );
  }
  const linha = sedeNaTela(d);
  let end: ReactNode;
  if (linha) {
    end = (
      <>
        {linha}
        <Uso t="contrato, procuração, petições, recibo e carnê" />
        <small>É também o endereço profissional de quem usa o do escritório.</small>
      </>
    );
  } else if (d.enderecoConfira && d.endereco) {
    end = (
      <>
        {d.endereco}
        <span className="selo selo-atencao" style={{ marginLeft: 6 }}>Confira</span>
        <small>Veio do cadastro antigo, num texto só. Separe em CEP, rua, número e bairro.</small>
      </>
    );
  } else {
    end = (
      <>
        <Falta o="ENDEREÇO DO ESCRITÓRIO" />
        {d.cidade ? <small>Já guardado: {d.cidade}{d.uf ? `, ${d.uf}` : ""}.</small> : null}
      </>
    );
  }
  const c: [string, ReactNode][] = [
    ["Telefone", d.telefone ? <>{telefoneNoTexto(d.telefone)}<Uso t="recibo, carnê e petições, se o modelo pedir" /></> : OPC],
    ["E-mail", d.email ? <>{emailQuebra(d.email)}<Uso t="recibo, carnê e petições, se o modelo pedir" /></> : OPC],
    ["Site", d.site ? <>{d.site}<Uso t="recibo" /></> : OPC],
  ];
  return (
    <div className="ed-grupos">
      <div>
        <h3 className="cd-h3">Quem é o escritório</h3>
        <Dl xs={q} />
      </div>
      <div>
        <h3 className="cd-h3">Onde fica</h3>
        <Dl xs={[["Endereço da sede", end]]} />
        <h3 className="cd-h3">Como falar com o escritório</h3>
        <Dl xs={c} />
      </div>
    </div>
  );
}

/** A folha "Dados do escritório", só para ler. */
export function FolhaDadosEscritorio({ e, d, aoEditar, rodape }: {
  e: EscritorioPortal;
  d: DadosEscritorioDocumentos;
  aoEditar?: () => void;
  /** Quando o Portal está só para consulta, o aviso no lugar do pé. */
  rodape?: ReactNode;
}) {
  const nomeDona = d.dona?.nome ?? e.socios[0] ?? "a sócia dona";
  const m = e.dadosMudados;
  return (
    <section className="folha" aria-labelledby="t-dados" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-dados">
            <Icone nome="coluna" className="ico" />
            Dados do escritório
          </h2>
          <p className="sub">Saem no contrato, na procuração, nas petições e no timbrado do recibo e do carnê.</p>
        </div>
        {aoEditar ? (
          <div className="acoes">
            <button className="btn btn-sec" type="button" data-muda onClick={aoEditar}>
              <Icone nome="lapis" className="ico" />
              Editar dados
            </button>
          </div>
        ) : null}
      </div>
      <Progresso d={d} />
      <LinhasEscritorio d={d} nomeDona={nomeDona} />
      {rodape ?? (e.dono ? (
        <p className="cd-pe">
          <Icone nome="historico" className="ico" />
          <span>
            Quem muda: você, como sócia dona, aqui; e a equipe T3jus, no Console. Cada mudança fica no histórico do escritório, com quem fez e quando.
            {m ? ` Última mudança: ${m.por ?? "equipe T3jus"}, ${m.onde === "CONSOLE" ? "no Console" : "no Portal"}, em ${horaBr(m.em)}.` : null}
          </span>
        </p>
      ) : (
        <div className="pt-muda">
          <Icone nome="cadeado" className="ico" />
          <p>
            Só para ler. <b>Quem muda estes dados é {nomeDona}, sócia dona</b>, aqui no Portal (ou a equipe T3jus, no Console). Algo errado no contrato? Fale com
            ela.
          </p>
        </div>
      ))}
    </section>
  );
}

/** Os contatos com a equipe T3jus: não saem nos documentos. */
export function FolhaContatos({ e }: { e: EscritorioPortal }) {
  if (!e.contatos.length) return null;
  return (
    <section className="folha" aria-labelledby="t-cont" style={{ overflow: "hidden" }}>
      <div className="folha-cab">
        <div>
          <h2 id="t-cont" style={{ fontSize: 20 }}>
            <Icone nome="pessoas" className="ico" />
            Contatos com a equipe T3jus
          </h2>
          <p className="sub">As pessoas com quem a equipe T3jus fala. Não saem nos documentos.</p>
        </div>
      </div>
      <ul className="ed-cont">
        {e.contatos.map((c, i) => (
          <li key={`${c.nome}-${i}`}>
            <div>
              <strong>{c.nome}</strong>
              {c.papel ? <small>{c.papel}</small> : null}
            </div>
            {c.telefone ? (
              <a href={`tel:${c.telefone}`}>
                <Icone nome="telefone" className="ico" />
                {telefoneNoTexto(c.telefone)}
              </a>
            ) : <span />}
            {c.email ? (
              <a href={`mailto:${c.email}`}>
                <Icone nome="envelope" className="ico" />
                {emailQuebra(c.email)}
              </a>
            ) : <span />}
          </li>
        ))}
      </ul>
      <p className="cd-pe">
        <Icone nome="ajuda" className="ico" />
        <span>
          Para mudar os contatos, <a href={ROTAS_PORTAL.ajuda}>fale com a equipe T3jus</a> pela Ajuda.
        </span>
      </p>
    </section>
  );
}

const USOS: [NomeIcone, string, string][] = [
  ["pena", "Contrato de honorários", "“CONTRATADA:” razão social, CNPJ, registro na OAB e sede."],
  ["doc", "Procuração", "A sede, como endereço onde os advogados recebem intimações."],
  ["balanca", "Petições", "“Com escritório em ...”; telefone e e-mail só se o modelo pedir."],
  ["carteira", "Recibo e carnê", "No timbrado: razão social, CNPJ, OAB, sede, telefone, e-mail e site."],
];

/** A lateral "Onde estes dados entram". */
export function UsosEscritorio() {
  return (
    <section className="folha" aria-labelledby="t-usos">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div>
          <h2 id="t-usos" style={{ fontSize: 20 }}>Onde estes dados entram</h2>
        </div>
      </div>
      <ul className="cd-usos">
        {USOS.map(([ico, t, s]) => (
          <li key={t}>
            <span className="cd-ic" aria-hidden="true">
              <Icone nome={ico} className="ico" />
            </span>
            <div>
              <strong>{t}</strong>
              <span>{s}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="cd-pe">
        <Icone nome="historico" className="ico" />
        <span>Documentos já gerados não mudam: cada arquivo guarda os dados do dia.</span>
      </p>
    </section>
  );
}

/** Um advogado na lista (GET /v1/escritorio/advogados). */
export interface AdvogadoNosDocumentos {
  pessoaId: string;
  nome: string;
  socioDono: boolean;
  inscricoes: InscricaoOab[];
  frase: string | null;
  faltas: DadoQueConta[];
  dados: DadosDocumentoPessoa | null;
}
export interface ListaAdvogados {
  dono: boolean;
  eu: string;
  socios: string[];
  escritorio: EnderecoEscritorio;
  advogados: AdvogadoNosDocumentos[];
  semOab: { pessoaId: string; nome: string }[];
}

/** O resumo dos advogados, na lateral (decisão 5). */
export function ResumoAdvogados() {
  const [l, setL] = useState<ListaAdvogados | null>(null);
  useEffect(() => {
    let vivo = true;
    void chamarPortal<ListaAdvogados>("/v1/escritorio/advogados").then((r) => {
      if (vivo && r.ok) setL(r.dados);
    });
    return () => {
      vivo = false;
    };
  }, []);
  return (
    <section className="folha" aria-labelledby="t-advr">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div>
          <h2 id="t-advr" style={{ fontSize: 20 }}>Advogados nos documentos</h2>
          <p className="sub">A qualificação de quem assina pelo escritório.</p>
        </div>
      </div>
      <div className="ed-resumo-adv">
        {l?.advogados.length ? (
          <ul>
            {l.advogados.map((a) => (
              <li key={a.pessoaId}>
                <span>{a.nome}</span>
                {a.faltas.length ? (
                  <span className="selo selo-atencao">
                    {plural(a.faltas.length, "Falta", "Faltam")} {a.faltas.length}
                  </span>
                ) : (
                  <span className="selo selo-ok">
                    <Icone nome="check" className="ico" />
                    Completo
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : l ? (
          <p className="pt-ultima">Ninguém da equipe tem OAB cadastrada ainda.</p>
        ) : null}
        <a className="btn btn-sec" href={ROTAS_ESCRITORIO.advogados}>
          <Icone nome="cracha" className="ico" />
          Ver os advogados
        </a>
      </div>
    </section>
  );
}

// ------------------------------------------------------------------------------- edição

const ROTULO_CAMPO: Record<CampoEscritorio, string> = {
  nome: "Nome no T3jus", tipo: "Tipo", razaoSocial: "Razão social", cnpj: "CNPJ", oabUf: "Registro na OAB: seccional", oabNumero: "Registro na OAB: número",
  cep: "CEP", logradouro: "Rua", numero: "Número", complemento: "Complemento", bairro: "Bairro", cidade: "Cidade", uf: "UF", telefone: "Telefone", email: "E-mail",
  site: "Site",
};

function cnpjMascara(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
}
function cepMascara(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** A prévia: o contrato e o timbrado, enquanto digita. */
function Previa({ d }: { d: DadosEscritorioDocumentos }) {
  const f = faltasDoEscritorio(d);
  const tot = dadosQueContamEscritorio(d).length;
  const [l1, ...resto] = linhasTimbrado(d);
  return (
    <section className="folha" aria-labelledby="t-prev">
      <div className="folha-cab" style={{ paddingBottom: 10 }}>
        <div>
          <h2 id="t-prev" style={{ fontSize: 20 }}>Como o escritório sai no papel</h2>
          <p className="sub">Prévia do contrato e do timbrado. Muda enquanto você digita.</p>
        </div>
      </div>
      <div aria-live="polite">
        <div className="cd-papel">
          <p className="cd-tim">
            <span>{d.tipo === "SEM_SOCIEDADE" ? l1 : d.razaoSocial || d.nome}</span>
            <span>Contrato de honorários</span>
          </p>
          <p>
            <FraseContratada d={d} />
          </p>
        </div>
        <p className="ed-tim-rot">Timbrado do recibo e do carnê</p>
        <div className="ed-tim">
          <strong>{l1}</strong>
          {resto.map((x) => <span key={x}>{x}</span>)}
        </div>
        <p className="cd-conta-prev">
          <b>{tot - f.length} de {tot} dados.</b> {f.length ? `${plural(f.length, "Falta", "Faltam")}: ${listaFaltasEscritorio(f)}. Dá para salvar assim.` : "O escritório sai completo."}
        </p>
      </div>
    </section>
  );
}

/** A edição dos dados do escritório, com a prévia ao lado (decisões 10 a 18). */
export function FormEscritorioDados({ e, d, aoCancelar, aoSalvo }: {
  e: EscritorioPortal;
  d: DadosEscritorioDocumentos;
  aoCancelar: () => void;
  aoSalvo: () => void;
}) {
  const ids = useId();
  const [f, setF] = useState<FormEscritorio>(() => formDoEscritorio(d));
  const [erros, setErros] = useState<Partial<Record<CampoEscritorio, string>>>({});
  const [resumo, setResumo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const [conflito, setConflito] = useState(false);
  const [versao, setVersao] = useState(e.versao ?? 0);
  const form = useRef<HTMLFormElement>(null);
  const antigo = d.enderecoConfira ? d.endereco : null;
  const sem = f.tipo === "SEM_SOCIEDADE";
  const nomeDona = d.dona?.nome ?? e.socios[0] ?? "a sócia dona";

  useEffect(() => {
    form.current?.querySelector<HTMLElement>("input")?.focus();
  }, []);

  const mudar = <K extends CampoEscritorio>(k: K, v: FormEscritorio[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    if (erros[k]) setErros((x) => ({ ...x, [k]: undefined }));
  };

  async function salvar(ev: FormEvent) {
    ev.preventDefault();
    if (enviando) return;
    setFalhou(false);
    const er = conferirFormEscritorio(f);
    if (Object.values(er).some(Boolean)) {
      setErros(er);
      setResumo(true);
      focarPrimeiroErro(form.current);
      return;
    }
    setEnviando(true);
    const t = (s: string) => (s.trim() ? s.trim() : null);
    const r = await chamarPortal<{ versao: number }>("/v1/escritorio/dados", {
      metodo: "PUT",
      corpo: {
        versao, nome: f.nome.trim(), tipo: f.tipo || null, razaoSocial: sem ? null : t(f.razaoSocial), cnpj: sem ? null : t(f.cnpj.replace(/\D/g, "")),
        oabUf: sem ? null : t(f.oabUf), oabNumero: sem ? null : t(f.oabNumero.replace(/\D/g, "")), cep: t(f.cep.replace(/\D/g, "")), logradouro: t(f.logradouro),
        numero: t(f.numero), complemento: t(f.complemento), bairro: t(f.bairro), cidade: t(f.cidade), uf: t(f.uf), telefone: t(f.telefone.replace(/\D/g, "")),
        email: t(f.email), site: t(f.site),
      },
    });
    setEnviando(false);
    if (r.ok) {
      aoSalvo();
      return;
    }
    if (r.status === 409) {
      // Outra pessoa salvou antes: o que está escrito continua; a próxima tentativa vale sobre a versão nova.
      const novo = await chamarPortal<EscritorioPortal>("/v1/escritorio");
      if (novo.ok) setVersao(novo.dados.versao ?? versao);
      setConflito(true);
      return;
    }
    const motivos = r.erro.detalhes?.motivos as Record<string, string> | undefined;
    if (motivos) {
      setErros(motivos as Partial<Record<CampoEscritorio, string>>);
      setResumo(true);
      focarPrimeiroErro(form.current);
      return;
    }
    setFalhou(true);
  }

  const msg = (k: CampoEscritorio) => (erros[k] ? TEXTO_ERRO_ESCRITORIO[erros[k]!] ?? "Confira este campo." : undefined);
  const campo = (k: Exclude<CampoEscritorio, "tipo" | "oabUf" | "uf">, rotulo: string, o: {
    classe: string; ajuda?: string; modo?: "numeric" | "tel" | "email" | "url"; auto?: string; tipo?: string; opcional?: boolean; mascara?: (v: string) => string;
  }) => {
    const id = `${ids}-${k}`;
    const er = msg(k);
    return (
      <div className={`campo ${o.classe}`}>
        <label htmlFor={id}>
          {rotulo}
          {o.opcional ? <span className="opcional"> (opcional)</span> : null}
        </label>
        <input className="entrada" id={id} type={o.tipo ?? "text"} value={f[k]} inputMode={o.modo} autoComplete={o.auto ?? "off"}
          onChange={(x) => mudar(k, o.mascara ? o.mascara(x.target.value) : x.target.value)}
          aria-invalid={er ? true : undefined} aria-describedby={descritoPor(!er && o.ajuda && `${id}-aj`, er && `${id}-er`)} />
        {!er && o.ajuda ? <p className="ajuda" id={`${id}-aj`}>{o.ajuda}</p> : null}
        {er ? <ErroCampo id={`${id}-er`}>{er}</ErroCampo> : null}
      </div>
    );
  };
  const selecao = (k: "oabUf" | "uf", rotulo: string, classe: string, auto?: string) => {
    const id = `${ids}-${k}`;
    const er = msg(k);
    return (
      <div className={`campo ${classe}`}>
        <label htmlFor={id}>{rotulo}</label>
        <select className="entrada" id={id} value={f[k]} autoComplete={auto} onChange={(x) => mudar(k, x.target.value)}
          aria-invalid={er ? true : undefined} aria-describedby={descritoPor(er && `${id}-er`)}>
          <option value="">Escolha</option>
          {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
        </select>
        {er ? <ErroCampo id={`${id}-er`}>{er}</ErroCampo> : null}
      </div>
    );
  };
  const comErro = (Object.keys(erros) as CampoEscritorio[]).filter((k) => erros[k]);
  const erTipo = msg("tipo");

  return (
    <div className="cd-ed">
      <section className="folha cd-a-form" aria-labelledby="t-form">
        <div className="folha-cab">
          <div>
            <h2 id="t-form">Dados do escritório</h2>
            <p className="sub">
              Os campos sem “(opcional)” entram nos documentos. Só o nome no T3jus e o tipo são obrigatórios; o que ficar em branco sai marcado como falta.
            </p>
          </div>
        </div>
        <form ref={form} className="form-folha" id={`${ids}-form`} noValidate onSubmit={(x) => void salvar(x)}>
          {conflito ? (
            <div className="c6">
              <Aviso tom="atencao" titulo="Os dados mudaram enquanto você editava.">
                Outra pessoa salvou antes. O que você escreveu continua aqui: salve de novo para ficar com a sua versão, ou cancele para ver a dela.
              </Aviso>
            </div>
          ) : null}
          {falhou ? (
            <div className="c6">
              <Aviso tom="urgencia" titulo="Não deu para salvar agora.">Os dados do escritório não foram salvos. Tente de novo em instantes.</Aviso>
            </div>
          ) : null}
          {resumo && comErro.length ? (
            <div className="c6">
              <Aviso tom="urgencia" titulo={faltaAcertar(comErro.length)}
                acoes={
                  <ul>
                    {comErro.map((k) => (
                      <li key={k}><a href={`#${ids}-${k === "tipo" ? "tipo-SOCIEDADE" : k}`}>{ROTULO_CAMPO[k]}</a></li>
                    ))}
                  </ul>
                }>
                Os dados do escritório ainda não foram salvos.
              </Aviso>
            </div>
          ) : null}
          <h3 className="cd-h3 cd-sec c6">Quem é o escritório</h3>
          {campo("nome", "Nome no T3jus", { classe: "c6", ajuda: "O nome curto do Portal, do menu e das conversas. Não sai nos documentos." })}
          <fieldset className="ed-tipo" aria-invalid={erTipo ? true : undefined} aria-describedby={descritoPor(`${ids}-tipo-aj`, erTipo && `${ids}-tipo-er`)}>
            <legend>Tipo</legend>
            <div className="ed-tipo-ops">
              {(Object.keys(TIPOS_ESCRITORIO) as TipoEscritorio[]).map((t) => (
                <label key={t} className="opcao">
                  <input className="marcar" type="radio" id={`${ids}-tipo-${t}`} name={`${ids}-tipo`} checked={f.tipo === t} onChange={() => mudar("tipo", t)} />
                  <span>
                    {TIPOS_ESCRITORIO[t].nome}
                    <small>{TIPOS_ESCRITORIO[t].explica}</small>
                  </span>
                </label>
              ))}
            </div>
            {erTipo ? <ErroCampo id={`${ids}-tipo-er`}>{erTipo}</ErroCampo> : null}
            <p className="ajuda" id={`${ids}-tipo-aj`}>Muda a frase do contrato. Sem sociedade, razão social, CNPJ e registro na OAB somem.</p>
          </fieldset>
          {sem ? (
            <div className="ed-sem-nota">
              <Icone nome="balanca" className="ico" />
              <span>
                Sem sociedade, quem contrata é a advogada. O contrato sai com <b>{nomeDona}</b> como contratada, com a qualificação dela em{" "}
                <a href={ROTAS_ESCRITORIO.advogados}>Advogados nos documentos</a> e o endereço abaixo. Sem CNPJ.
              </span>
            </div>
          ) : (
            <>
              {campo("razaoSocial", "Razão social", { classe: "c6", auto: "organization", ajuda: "Como no registro da OAB e no cartão do CNPJ. No contrato, sai em maiúsculas." })}
              {campo("cnpj", "CNPJ", { classe: "c2", modo: "numeric", ajuda: "Conferimos os dígitos.", mascara: cnpjMascara })}
              {selecao("oabUf", "Registro na OAB: seccional", "c2")}
              {campo("oabNumero", "Registro na OAB: número", { classe: "c2", modo: "numeric", ajuda: "O da sociedade, não o de cada advogado." })}
            </>
          )}
          <h3 className="cd-h3 cd-sec c6">Onde fica</h3>
          <fieldset className="end-grupo" aria-describedby={`${ids}-end-aj`}>
            <legend>Endereço da sede</legend>
            <p className="ajuda" id={`${ids}-end-aj`}>
              Sai no contrato, na procuração, nas petições e no timbrado. Também é o endereço profissional de quem usa o do escritório.
            </p>
            {antigo ? (
              <div className="ed-antigo">
                <Aviso tom="atencao" icone="alerta" titulo="Confira o endereço: ele estava num texto só.">
                  Pusemos o texto antigo inteiro em “Rua”. Deixe ali só a rua e passe o número, o complemento e o bairro para os campos certos, e escreva o CEP. Até
                  salvar, o contrato sai com a marca [ENDEREÇO DO ESCRITÓRIO: confira].
                </Aviso>
                <blockquote>
                  <small>Texto antigo</small>
                  {antigo}
                </blockquote>
              </div>
            ) : null}
            <div className="end-grade">
              {campo("cep", "CEP", { classe: "e2", modo: "numeric", auto: "postal-code", ajuda: "Só números ou com hífen.", mascara: cepMascara })}
              {campo("logradouro", "Rua, avenida ou travessa", { classe: "e4", auto: "address-line1", ajuda: antigo ? "Veio do texto antigo: deixe só a rua." : undefined })}
              {campo("numero", "Número", { classe: "e1", ajuda: "Sem número: S/N." })}
              {campo("complemento", "Complemento", { classe: "e2", opcional: true, auto: "address-line2" })}
              {campo("bairro", "Bairro", { classe: "e3", auto: "address-level3" })}
              {campo("cidade", "Cidade", { classe: "e4", auto: "address-level2" })}
              {selecao("uf", "UF", "e2", "address-level1")}
            </div>
          </fieldset>
          <h3 className="cd-h3 cd-sec c6">Como falar com o escritório</h3>
          {campo("telefone", "Telefone", { classe: "c3", tipo: "tel", modo: "tel", auto: "tel", opcional: true, ajuda: "Vai no timbrado do recibo e do carnê." })}
          {campo("email", "E-mail", { classe: "c3", tipo: "email", auto: "email", opcional: true, ajuda: "Vai no timbrado; nas petições, só se o modelo pedir." })}
          {campo("site", "Site", { classe: "c6", modo: "url", auto: "url", opcional: true, ajuda: "Só no timbrado do recibo." })}
        </form>
      </section>
      <aside className="cd-a-prev" aria-label="Prévia">
        <Previa d={dadosDoForm(f, d)} />
      </aside>
      <section className="folha cd-a-pe" aria-label="Salvar">
        <div className="cd-pe-bts">
          <p>Vale para os próximos documentos; os já gerados não mudam. A mudança fica no histórico do escritório.</p>
          <div className="cd-bts">
            <button className="btn btn-fantasma" type="button" onClick={aoCancelar}>
              Cancelar
            </button>
            <button className="btn btn-pri" type="submit" form={`${ids}-form`} aria-busy={enviando || undefined}>
              <Icone nome="check" className="ico" />
              {enviando ? "Salvando…" : "Salvar dados do escritório"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
