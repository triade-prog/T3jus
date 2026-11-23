"use client";
// Quem assina pelo cliente menor ou sob curatela (F3.98; AP-01, CH-08, PT-11), na ficha em
// leitura, como no desenho aprovado em docs/design/aprovadas/portal-responsavel-legal: a folha
// "Quem assina por…", a linha do tempo do menor, a faixa e a janela dos 18 anos (pergunta 3) e a
// folha "Quem assinava com…", que fica guardada depois. A conta de quem assina vem do servidor,
// feita com a data de hoje. O termo de curatela (F3.118) aparece na folha para baixar.

import { useId, useRef, useState, type ReactNode } from "react";
import { ESTADOS_CIVIS, formatarDocumento, PAPEIS_RESPONSAVEL, type FichaCliente } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, descritoPor, ErroCampo, Janela } from "../console/pecas.tsx";
import { dataBr } from "./clientes.ts";
import { chamarPortal } from "./Moldura.tsx";
import { baixarTermoCuratela, metaTermoNaFicha } from "./termoCuratela.ts";

const primeiroNome = (n: string) => n.trim().split(/\s+/)[0] ?? n;
const iniciais = (n: string) => n.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

/** O selo do cabeçalho: "Menor · assina a mãe", "Sob curatela · assina a curadora", "Fez 18 anos em 19/11". */
export function SeloQuemAssina({ f }: { f: FichaCliente }) {
  const a = f.assina;
  if (!a || a.situacao === "PROPRIO") return null;
  const papel = f.rlPapel ? PAPEIS_RESPONSAVEL[f.rlPapel].toLowerCase() : "o responsável";
  const artigo = f.rlPapel && ["MAE", "TUTORA", "CURADORA"].includes(f.rlPapel) ? "a" : "o";
  const texto = a.situacao === "FEZ_18" ? `Fez 18 anos em ${a.faz18 ? dataBr(a.faz18).slice(0, 5) : ""}`
    : a.situacao === "CURATELA" ? `Sob curatela · assina ${artigo} ${papel}` : `Menor · assina ${artigo} ${papel}`;
  return (
    <span className="selo selo-atencao">
      <Icone nome="pessoas" className="ico" />
      {texto}
    </span>
  );
}

function Folha({ titulo, sub, acoes, children, pequena }: { titulo: string; sub?: string; acoes?: ReactNode; children: ReactNode; pequena?: boolean }) {
  const id = useId();
  return (
    <section className="folha" aria-labelledby={id}>
      <div className="folha-cab" style={pequena ? { paddingBottom: 8 } : undefined}>
        <div>
          <h2 id={id} style={pequena ? { fontSize: 20 } : undefined}>{titulo}</h2>
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

function enderecoRl(f: FichaCliente): string | null {
  if (!f.rlEndereco) return null;
  const partes = [f.rlEndereco, f.rlBairro, f.rlCidade, f.rlUf].filter(Boolean).join(", ");
  return f.rlCep ? `${partes} · CEP\u00a0${f.rlCep.slice(0, 5)}\u2011${f.rlCep.slice(5)}` : partes;
}

/** "Divorciado(a)" vira "Divorciada" para a mãe. */
function civil(f: FichaCliente): string | null {
  if (!f.rlEstadoCivil) return null;
  const fem = !!f.rlPapel && ["MAE", "TUTORA", "CURADORA"].includes(f.rlPapel);
  return ESTADOS_CIVIS[f.rlEstadoCivil].replace(/o\(a\)$/, fem ? "a" : "o");
}

/**
 * "Baixar o termo" (F3.118): pede o link de 60 s, que fica no histórico, e baixa. É botão, e não
 * link, porque faz POST; a aparência é a do desenho. O erro (estado ficha-baixar-erro de
 * docs/design/aprovadas/portal-termo-curatela) vai logo abaixo da linha do arquivo, por isso a
 * peça entrega o botão e o erro separados. O aviso com role="alert" entra no momento do erro e é
 * recriado a cada falha (a chave muda), para o leitor de tela ler também a segunda; o botão
 * continua e aponta para ele.
 */
export function BaixarTermo({ id, compacto = false, children }: {
  id: string; compacto?: boolean;
  children: (botao: ReactNode, erro: ReactNode) => ReactNode;
}) {
  const idErro = useId();
  const vez = useRef(0);
  const [baixando, setBaixando] = useState(false);
  const [falha, setFalha] = useState<{ erro: ErroApi; vez: number } | null>(null);
  async function baixar() {
    setFalha(null);
    setBaixando(true);
    const r = await baixarTermoCuratela(id);
    setBaixando(false);
    if (!r.ok) setFalha({ erro: r.erro, vez: ++vez.current });
  }
  const botao = (
    <button className={`btn btn-sec${compacto ? " btn-compacto" : ""}`} type="button" onClick={() => void baixar()} disabled={baixando}
      aria-busy={baixando || undefined} aria-describedby={descritoPor(falha && idErro)}>
      <Icone nome="baixar" className={compacto ? "ico ico-s" : "ico"} />
      Baixar o termo
    </button>
  );
  const erro = falha ? (
    <div key={falha.vez} className="aviso aviso-urgencia rl-baixar-erro" id={idErro} role="alert">
      <Icone nome="alerta" className="ico" />
      <div>
        <strong className="aviso-titulo">Não deu para baixar o termo.</strong>
        <p>{textoDoErro(falha.erro)}</p>
      </div>
    </div>
  ) : null;
  return <>{children(botao, erro)}</>;
}

/** "Quem assina por Pedro": o responsável, com a qualificação e a regra do dia. */
export function FolhaQuemAssina({ f, aoEditar }: { f: FichaCliente; aoEditar?: () => void }) {
  const idTermo = useId();
  const a = f.assina;
  if (!a || a.situacao === "PROPRIO" || a.situacao === "FEZ_18" || !f.rlNome) return null;
  const pn = primeiroNome(f.nome);
  const curatela = a.situacao === "CURATELA";
  const termo = f.termoCuratela;
  const papel = f.rlPapel ? PAPEIS_RESPONSAVEL[f.rlPapel] : "Responsável";
  const assiste = a.situacao === "ASSISTIDO" || (curatela && a.modo === "ASSISTE");
  const selo = curatela ? `${assiste ? "Assiste" : "Representa"} · como diz o termo`
    : assiste ? `Assiste · ${pn} tem 16 ou 17 anos` : `Representa · ${pn} tem menos de 16 anos`;
  const conf = (
    <span className="selo selo-ok">
      <Icone nome="check" className="ico" />
      Dígitos conferidos
    </span>
  );
  const item = (rotulo: string, valor: ReactNode | null, inteira?: boolean, pede = true) => (
    <div className={inteira ? "inteira" : undefined}>
      <dt>{rotulo}</dt>
      {valor ? <dd>{valor}</dd> : pede ? falta : <dd className="falta">Não informado</dd>}
    </div>
  );
  return (
    <Folha titulo={`Quem assina por ${pn}`}
      sub={curatela ? `${papel} nomeada pelo juiz. Vai na procuração e no contrato, e assina por ${pn}.`.replace("Curador nomeada", "Curador nomeado")
        : `Responsável legal. Vai na procuração e no contrato, e assina ${assiste ? `com ${pn}` : `por ${pn}`}.`}
      acoes={aoEditar ? (
        <button data-muda className="btn btn-sec" type="button" onClick={aoEditar} aria-label={`Mudar quem assina por ${pn}`}>
          <Icone nome="lapis" className="ico" />
          Mudar
        </button>
      ) : undefined}>
      <div className="rl-quem">
        <span className="rl-av" aria-hidden="true">{iniciais(f.rlNome)}</span>
        <div>
          <strong>{f.rlNome}</strong>
          <small>{papel} · assina {assiste ? `com ${pn}` : `por ${pn}`}</small>
          <span className="selo selo-implant">{selo}</span>
        </div>
      </div>
      <dl className="dados-ficha">
        {item("CPF", f.rlDocumento ? <><span className="num">{formatarDocumento(f.rlDocumento)}</span>{conf}</> : null)}
        {item("RG", f.rlRg ? `${f.rlRg}${f.rlRgOrgao ? ` · ${f.rlRgOrgao}` : ""}` : null)}
        {item("Nacionalidade", f.rlNacionalidade ?? null)}
        {item("Estado civil", civil(f))}
        {item("Profissão", f.rlProfissao ?? null)}
        {item("Endereço", f.rlMoraJunto === false ? enderecoRl(f) : `O mesmo de ${pn} (moram juntos)`, f.rlMoraJunto === false)}
        {curatela ? item("Processo da curatela", f.curProcesso ? <span className="num">{f.curProcesso}</span> : null, false, false) : null}
        {curatela ? item("Vara", f.curVara ?? null, false, false) : null}
      </dl>
      {curatela && termo ? (
        <BaixarTermo id={termo.id} compacto>
          {(botao, erro) => (
            <div className="rl-termo-ficha">
              <div className="rl-arq rl-tem" role="group" aria-labelledby={`${idTermo}-t`}>
                <span className="rl-ic" aria-hidden="true">
                  <Icone nome="doc" className="ico" />
                </span>
                <div>
                  <strong id={`${idTermo}-t`}>Termo de curatela</strong>
                  <small>{metaTermoNaFicha(termo)}</small>
                </div>
                {botao}
              </div>
              {erro}
            </div>
          )}
        </BaixarTermo>
      ) : null}
      {a.situacao === "REPRESENTADO" && a.faz16 ? (
        <p className="rl-regra">
          <Icone nome="relogio" className="ico" />
          <span>
            Em <b>{dataBr(a.faz16)}</b>, aos 16 anos, {pn} passa a ser assistido(a): {pn} e {primeiroNome(f.rlNome)} assinam juntos. O T3jus muda sozinho, nos documentos
            gerados a partir dessa data.
          </span>
        </p>
      ) : a.situacao === "ASSISTIDO" && a.faz18 ? (
        <p className="rl-regra">
          <Icone nome="relogio" className="ico" />
          <span>
            Em <b>{dataBr(a.faz18)}</b>, aos 18 anos, {pn} passa a assinar sozinho(a). A ficha avisa, e {primeiroNome(f.rlNome)} sai dos documentos novos.
          </span>
        </p>
      ) : curatela ? (
        <p className="rl-regra">
          <Icone nome="doc" className="ico" />
          <span>Ao gerar, lembre de juntar o termo de curatela à procuração.</span>
        </p>
      ) : null}
    </Folha>
  );
}

/** A linha do tempo do menor: representado, assistido e assina por si. */
export function FolhaTempo({ f }: { f: FichaCliente }) {
  const a = f.assina;
  if (!a || !a.faz16 || !a.faz18 || (a.situacao !== "REPRESENTADO" && a.situacao !== "ASSISTIDO")) return null;
  const pn = primeiroNome(f.nome);
  const rl = f.rlNome ? primeiroNome(f.rlNome) : "quem responde";
  const vespera = (iso: string) => {
    const d = new Date(`${iso}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 1);
    return dataBr(d.toISOString());
  };
  const itens = [
    { agora: a.situacao === "REPRESENTADO", quando: a.situacao === "REPRESENTADO" ? `Hoje até ${vespera(a.faz16)}` : `Até ${vespera(a.faz16)}`, oque: "Representado(a)", txt: `Só ${rl} assina, em nome de ${pn}.` },
    { agora: a.situacao === "ASSISTIDO", quando: a.situacao === "ASSISTIDO" ? `Hoje até ${vespera(a.faz18)}` : `De ${dataBr(a.faz16)}, aos 16 anos`, oque: "Assistido(a)", txt: `${pn} e ${rl} assinam juntos.` },
    { agora: false, quando: `De ${dataBr(a.faz18)}, aos 18 anos`, oque: "Assina por si", txt: `A ficha avisa, e ${rl} sai dos documentos novos.` },
  ];
  return (
    <Folha titulo="Quem assina, ao longo do tempo" pequena>
      <ol className="rl-tempo" aria-label={`Quem assina por ${pn}, por idade`}>
        {itens.map((x) => (
          <li key={x.oque} className={x.agora ? "rl-agora" : undefined} aria-current={x.agora ? "step" : undefined}>
            <span className="rl-pt" aria-hidden="true" />
            <div>
              <span className="rl-quando">{x.quando}</span>
              <b>{x.oque}</b>
              <small>{x.txt}</small>
            </div>
          </li>
        ))}
      </ol>
    </Folha>
  );
}

/** A faixa dos 18 anos (pergunta 3): o cadastro só muda quando alguém confirma. */
export function FaixaFez18({ f, aoAtualizar, gerarHref }: { f: FichaCliente; aoAtualizar?: () => void; gerarHref?: string | null }) {
  const a = f.assina;
  if (!a || a.situacao !== "FEZ_18") return null;
  const pn = primeiroNome(f.nome);
  const papel = f.rlPapel ? PAPEIS_RESPONSAVEL[f.rlPapel].toLowerCase() : "responsável";
  const artigo = f.rlPapel && ["MAE", "TUTORA"].includes(f.rlPapel) ? "a" : "o";
  return (
    <div className="aviso aviso-atencao rl-faixa" role="status">
      <Icone nome="pessoas" className="ico" />
      <div>
        <strong className="aviso-titulo">{pn} fez 18 anos em {a.faz18 ? dataBr(a.faz18) : ""}. Agora assina por si.</strong>
        <p>
          Nos documentos gerados de hoje em diante, {pn} assina sozinho(a) e {f.rlNome ? `${artigo} ${papel}, ${primeiroNome(f.rlNome)},` : "quem assinava"} sai. Para isso,
          a ficha precisa do estado civil e da profissão de {pn}, que não eram pedidos. O contrato e a procuração assinados antes continuam guardados. No caso em
          andamento, o costume é colher uma procuração nova, assinada só por {pn}.
        </p>
        <div className="aviso-acoes">
          {aoAtualizar ? (
            <button data-muda className="btn btn-pri" type="button" onClick={aoAtualizar}>
              <Icone nome="check" className="ico" />
              Atualizar a ficha de {pn}
            </button>
          ) : null}
          {gerarHref ? (
            <a className="btn btn-sec" href={gerarHref}>
              <Icone nome="doc" className="ico" />
              Gerar procuração nova
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** "Quem assinava com Rafaela": fica guardado, mas não entra nos documentos novos. */
export function FolhaQuemAssinava({ f }: { f: FichaCliente }) {
  const q = f.quemAssinava;
  if (!q || !q.nome) return null;
  const pn = primeiroNome(f.nome);
  return (
    <Folha titulo={`Quem assinava com ${pn}`} sub={`Até ${dataBr(q.ate)}. Fica guardado, mas não entra nos documentos novos.`}>
      <div className="rl-quem">
        <span className="rl-av" aria-hidden="true">{iniciais(q.nome)}</span>
        <div>
          <strong>{q.nome}</strong>
          <small>{PAPEIS_RESPONSAVEL[q.papel]} · assinava por {pn}</small>
          <span className="selo selo-neutro">Até {dataBr(q.ate)}</span>
        </div>
      </div>
      <dl className="dados-ficha rl-antes">
        <div>
          <dt>CPF</dt>
          <dd>{q.documento ? <span className="num">{formatarDocumento(q.documento)}</span> : "Não informado"}</dd>
        </div>
        <div>
          <dt>Assinou com {pn}</dt>
          <dd>{q.contratos.length ? `Documentos do contrato ${q.contratos.join(", ")}` : "Nenhum documento gerado no T3jus"}</dd>
        </div>
      </dl>
    </Folha>
  );
}

/** A janela "Agora assina por si": completa estado civil e profissão e guarda quem assinava. */
export function JanelaAssinaPorSi({ aberta, f, aoFechar, aoFeito, aoConflito }: {
  aberta: boolean;
  f: FichaCliente;
  aoFechar: () => void;
  aoFeito: (x: { titulo: string; texto: string }) => void;
  aoConflito: () => void;
}) {
  const ids = useId();
  const [civilEsc, setCivil] = useState<string>(f.estadoCivil ?? "");
  const [prof, setProf] = useState(f.profissao ?? "");
  const [erroProf, setErroProf] = useState<string | null>(null);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [salvando, setSalvando] = useState(false);
  const pn = primeiroNome(f.nome);
  const quem = f.rlNome ? primeiroNome(f.rlNome) : "Quem assinava";

  async function salvar() {
    setErro(null);
    if (prof.trim() && prof.trim().length < 2) {
      setErroProf("Escreva a profissão com ao menos 2 letras.");
      return;
    }
    setErroProf(null);
    setSalvando(true);
    const r = await chamarPortal<{ versao: number }>(`/v1/escritorio/clientes/${f.id}/assina-por-si`, {
      corpo: { versao: f.versao, estadoCivil: civilEsc || null, profissao: prof.trim() || null },
    });
    setSalvando(false);
    if (r.ok) {
      return aoFeito({
        titulo: `${pn} agora assina por si.`,
        texto: `${quem} saiu de “Quem assina” e ficou guardado(a) na ficha. Os documentos gerados antes continuam como estavam.`,
      });
    }
    if (r.erro.codigo === "VERSION_CONFLICT") return aoConflito();
    setErro(r.erro);
  }

  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={aoFechar} sobretitulo={f.nome} titulo={`${pn} agora assina por si`} descricao={`${ids}-d`}
      aoEnviar={() => void salvar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Agora não
          </button>
          <button className="btn btn-pri" type="submit" disabled={salvando}>
            <Icone nome="check" className="ico" />
            {salvando ? "Salvando…" : `Salvar: ${pn} assina por si`}
          </button>
        </>
      }>
      <p id={`${ids}-d`}>
        {pn} fez 18 anos{f.assina?.faz18 ? ` em ${dataBr(f.assina.faz18)}` : ""}. Complete o que passa a ir no documento.
      </p>
      {erro ? <Aviso tom="urgencia" titulo="A ficha não foi salva.">{textoDoErro(erro)}</Aviso> : null}
      <div className="cl-dois">
        <div className="campo">
          <label htmlFor={`${ids}-civil`}>
            Estado civil de {pn} <span className="opcional">(opcional)</span>
          </label>
          <select className="entrada" id={`${ids}-civil`} data-foco value={civilEsc} onChange={(e) => setCivil(e.target.value)}>
            <option value="">Escolha</option>
            {Object.entries(ESTADOS_CIVIS).map(([v, t]) => (
              <option key={v} value={v}>{t}</option>
            ))}
          </select>
        </div>
        <div className="campo">
          <label htmlFor={`${ids}-prof`}>
            Profissão <span className="opcional">(opcional)</span>
          </label>
          <input className="entrada" id={`${ids}-prof`} value={prof} maxLength={120} autoComplete="off" onChange={(e) => setProf(e.target.value)}
            aria-invalid={erroProf ? true : undefined} aria-describedby={descritoPor(`${ids}-prof-aj`, erroProf && `${ids}-prof-er`)} />
          <p className="ajuda" id={`${ids}-prof-aj`}>Ex.: estudante, atendente</p>
          {erroProf ? <ErroCampo id={`${ids}-prof-er`}>{erroProf}</ErroCampo> : null}
        </div>
      </div>
      <p className="pt-comuns">
        <Icone nome="historico" className="ico" />
        <span>{quem} sai de “Quem assina” e fica na ficha, com a data. Nada é apagado. Os documentos gerados antes continuam como estavam.</span>
      </p>
      <p className="ajuda">Se {pn} não pode assinar sozinho(a) por outro motivo, não salve aqui: edite a ficha e marque “Não: está sob curatela”.</p>
    </Janela>
  );
}
