"use client";
// A OAB dos advogados no contrato (EX-12, F3.74), desenho aprovado em
// docs/design/aprovadas/portal-equipe-oab (estados novo-sem-oab, novo-inscricoes,
// novo-inscricao-erro, contrato-inscricoes, contrato-inscricoes-mudar e contrato-sem-oab;
// decisões 14 a 21): só quem tem OAB na Equipe entra como advogado; de quem tem mais de uma
// inscrição se escolhem as que vão (todas marcadas de início, pelo menos uma); a ficha mostra
// o que vai no documento e o que fica fora, e "Mudar inscrições" abre a janela.

import { useRef, useState } from "react";
import type { AdvogadoNoContrato, FichaContrato, InscricaoOab, PessoaComOab } from "@t3jus/domain";
import { textoDoErro } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, ErroCampo, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { iniciais } from "../console/tempo.ts";
import { Selo } from "./Comercial.tsx";
import { chamarPortal, ROTAS_PORTAL } from "./Moldura.tsx";

const primeiroNome = (n: string) => n.split(/\s+/)[0] ?? n;

/** "OAB/SP nº 287.104 e OAB/RJ nº 245.880-S" a partir das inscrições, na ordem em que vêm. */
export function fraseInscricoes(lista: Pick<InscricaoOab, "documento">[]): string {
  const d = lista.map((i) => i.documento);
  return d.length <= 1 ? (d[0] ?? "") : `${d.slice(0, -1).join(", ")} e ${d[d.length - 1]}`;
}

/** As escolhidas de uma pessoa, na ordem da Equipe (a principal primeiro). */
export function escolhidasDe(p: PessoaComOab, ids: string[] | undefined): InscricaoOab[] {
  return ids ? p.oab.filter((i) => ids.includes(i.id)) : p.oab;
}

/** A prévia "No contrato e na procuração: …" dos advogados marcados. */
export function previaAdvogados(marcados: PessoaComOab[], escolha: Record<string, string[]>): { nome: string; frase: string | null }[] {
  return marcados.map((p) => {
    const e = escolhidasDe(p, escolha[p.id]);
    return { nome: p.nome, frase: p.oab.length === 0 ? null : e.length ? fraseInscricoes(e) : "" };
  });
}

function Previa({ itens }: { itens: { nome: string; frase: string | null }[] }) {
  if (!itens.length) return null;
  return (
    <p className="oe-previa oe-previa-c" aria-live="polite">
      <Icone nome="pena" className="ico" />
      <span>
        No contrato e na procuração:{" "}
        {itens.map((x, i) => (
          <span key={x.nome}>
            {i ? (i === itens.length - 1 ? "; e " : "; ") : null}
            {x.frase ? <b>{x.nome}, {x.frase}</b>
              : x.frase === "" ? <><b>{x.nome}</b>, <mark className="oe-falta-i">[falta escolher a inscrição]</mark></>
              : <><b>{x.nome}</b>, <mark className="oe-falta-i">[OAB: falta]</mark></>}
          </span>
        ))}
        .
      </span>
    </p>
  );
}

/** As caixas das inscrições de um advogado marcado (só de quem tem mais de uma). */
function GrupoInscricoes({ p, ids, pref, erro, aoMudar }: {
  p: PessoaComOab; ids: string[] | undefined; pref: string; erro: boolean; aoMudar: (ids: string[]) => void;
}) {
  const marc = ids ?? p.oab.map((i) => i.id);
  const sl = `${pref}-ins-${p.id.slice(0, 8)}`;
  const pn = primeiroNome(p.nome);
  return (
    <fieldset className="oe-ins" aria-describedby={`${sl}-aj${erro ? ` ${sl}-er` : ""}`}>
      <legend>Inscrições de {pn} que vão no documento</legend>
      <div className="oe-ins-ops">
        {p.oab.map((i, n) => (
          <label className="opcao" key={i.id}>
            <input className="marcar" type="checkbox" id={`${sl}-${n}`} name={sl} value={i.uf} checked={marc.includes(i.id)}
              aria-invalid={erro || undefined} data-foco={erro && n === 0 ? "" : undefined}
              onChange={(ev) => aoMudar(ev.target.checked ? p.oab.filter((x) => x.id === i.id || marc.includes(x.id)).map((x) => x.id) : marc.filter((x) => x !== i.id))} />
            <span>{i.texto}<small>{i.tipo === "PRINCIPAL" ? "Principal · vem primeiro" : "Suplementar"}</small></span>
          </label>
        ))}
      </div>
      <p className="ajuda" id={`${sl}-aj`}>Vêm todas marcadas. Desmarque a que não deve ir neste contrato, como a de outra UF.</p>
      {erro ? <ErroCampo id={`${sl}-er`}>Marque pelo menos uma inscrição de {pn}. Se {pn} não deve assinar este contrato, desmarque o nome acima.</ErroCampo> : null}
    </fieldset>
  );
}

const subOab = (p: PessoaComOab, marcado: boolean) =>
  !p.oab.length ? "Sem OAB cadastrada"
    : !marcado ? p.oab.map((i) => i.texto).join(" · ")
    : p.oab.length === 1 ? `${p.oab[0]!.texto} · única inscrição, vai sempre`
    : `${p.oab.length} inscrições na OAB`;

/** O id do primeiro campo de um erro de inscrição, para o resumo de erros no topo. */
export const idErroInscricao = (pessoaId: string, pref = "nv") => `${pref}-ins-${pessoaId.slice(0, 8)}-0`;

/** Advogados no contrato e na procuração, no Novo contrato e em Mudar contrato (decisão 14). */
export function AdvogadosOab({ pessoas, eu, marcados, escolha, erros, dono, socios, aoMarcar, aoEscolher }: {
  pessoas: PessoaComOab[] | null;
  eu: string;
  marcados: string[];
  escolha: Record<string, string[]>;
  /** Campos com erro: "advogados" e "inscricoes.<pessoa>". */
  erros: string[];
  dono: boolean;
  socios: string[];
  aoMarcar: (id: string, sim: boolean) => void;
  aoEscolher: (id: string, ids: string[]) => void;
}) {
  const lista = pessoas ?? [];
  // Quem já está marcado (um contrato antigo, de antes da OAB) continua à vista para desmarcar.
  const com = lista.filter((p) => p.oab.length > 0 || marcados.includes(p.id));
  const sem = lista.filter((p) => p.oab.length === 0 && !marcados.includes(p.id));
  const eAdv = erros.includes("advogados");
  const nome = (p: PessoaComOab) => (p.nome === eu ? `${p.nome} (você)` : p.nome);
  const marcadas = com.filter((p) => marcados.includes(p.id));
  return (
    <fieldset className="grupo-opcoes c6" id="nv-adv" tabIndex={-1} aria-describedby={["nv-adv-aj", sem.length ? "nv-adv-sem" : "", eAdv ? "nv-adv-er" : ""].filter(Boolean).join(" ")}>
      <legend>Advogados no contrato e na procuração</legend>
      <p className="ajuda" id="nv-adv-aj">Nome e OAB saem da Equipe. Vão como contratados e outorgados. De quem tem mais de uma inscrição, escolha quais vão.</p>
      {pessoas === null ? <p className="ajuda">Carregando a equipe…</p> : null}
      <div className="oe-advs">
        {com.map((p) => {
          const on = marcados.includes(p.id);
          const eIns = erros.includes(`inscricoes.${p.id}`);
          return (
            <div key={p.id} className={`oe-adv${on ? " oe-adv-on" : ""}${eIns ? " oe-adv-erro" : ""}`}>
              <label className="opcao">
                <input className="marcar" type="checkbox" name="nv-adv" checked={on} onChange={(ev) => aoMarcar(p.id, ev.target.checked)} />
                <span>{nome(p)}<small>{subOab(p, on)}</small></span>
              </label>
              {on && p.oab.length > 1 ? <GrupoInscricoes p={p} ids={escolha[p.id]} pref="nv" erro={eIns} aoMudar={(ids) => aoEscolher(p.id, ids)} /> : null}
            </div>
          );
        })}
      </div>
      {sem.length ? (
        <p className="oe-sem-oab" id="nv-adv-sem">
          <Icone nome="balanca" className="ico" />
          <span>
            <b>Sem OAB cadastrada:</b> {sem.length === 1 ? sem[0]!.nome : `${sem.slice(0, -1).map((p) => p.nome).join(", ")} e ${sem[sem.length - 1]!.nome}`}.
            {" "}Quem é advogado entra nesta lista quando a OAB estiver na Equipe.
            {dono ? <> <a href={ROTAS_PORTAL.equipe}>Cadastrar a OAB na Equipe</a></> : ` Quem cadastra é ${socios[0] ?? "a sócia dona"}, sócia dona.`}
          </span>
        </p>
      ) : null}
      <Previa itens={previaAdvogados(marcadas, escolha)} />
      {eAdv ? <ErroCampo id="nv-adv-er">Marque pelo menos um advogado. Sem ele, o contrato e a procuração não têm quem assine pelo escritório.</ErroCampo> : null}
    </fieldset>
  );
}

// ------------------------------------------------------------------ ficha do contrato

const comoPessoa = (a: AdvogadoNoContrato, nome: string): PessoaComOab => ({ id: a.pessoaId, nome, oab: a.inscricoes });

/** Responsáveis da ficha, com o que vai no documento (decisões 16, 18 e 20). */
export function PessoasOab({ f, dono, socios, aoMudar }: { f: FichaContrato; dono: boolean; socios: string[]; aoMudar: () => void }) {
  const ins = new Map((f.inscricoes ?? []).map((a) => [a.pessoaId, a]));
  const respAdv = f.advogados.some((a) => a.id === f.responsavel.id);
  const ordem = [...f.advogados.filter((a) => a.id === f.responsavel.id), ...f.advogados.filter((a) => a.id !== f.responsavel.id)];
  const semOab = ordem.filter((a) => !ins.get(a.id)?.frase);
  const todas = ordem.filter((a) => ins.get(a.id)?.usaTodas);
  const algumaEscolha = ordem.some((a) => (ins.get(a.id)?.inscricoes.length ?? 0) > 1);
  const aberto = f.situacao !== "ENCERRADO";
  const quem = dono ? null : ` Quem cadastra é ${socios[0] ?? "a sócia dona"}, sócia dona.`;
  const linha = (id: string) => {
    const a = ins.get(id);
    if (!a?.frase) return null;
    const fora = a.inscricoes.filter((i) => !i.escolhida);
    return (
      <>
        <small className="oe-no-doc">No documento: {a.inscricoes.filter((i) => i.escolhida).map((i) => i.texto).join(" e ")}</small>
        {fora.length ? <small className="oe-fora">{fora.map((i) => i.texto).join(" e ")} fica fora deste contrato</small> : null}
      </>
    );
  };
  return (
    <section className="folha" aria-labelledby="t-rs">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div><h2 id="t-rs" style={{ fontSize: 20 }}>Responsáveis</h2></div>
      </div>
      <ul className="hn-pessoas oe-pes">
        {!respAdv ? (
          <li>
            <span className="av-p forte" aria-hidden="true">{iniciais(f.responsavel.nome)}</span>
            <div><strong>{f.responsavel.nome}</strong><small>Responsável</small></div>
            <Selo tom="ativo">Recebe os lembretes</Selo>
          </li>
        ) : null}
        {ordem.map((a) => {
          const resp = a.id === f.responsavel.id;
          const sem = !ins.get(a.id)?.frase;
          return (
            <li key={a.id}>
              <span className="av-p forte" aria-hidden="true">{iniciais(a.nome)}</span>
              <div><strong>{a.nome}</strong><small>{resp ? "Responsável e advogado no contrato" : "Advogado no contrato"}</small>{linha(a.id)}</div>
              {resp ? <Selo tom="ativo">Recebe os lembretes</Selo> : sem ? <Selo tom="atencao" icone="alerta">Sem OAB</Selo> : null}
            </li>
          );
        })}
      </ul>
      {semOab.length ? (
        <p className="oe-pe-falta">
          <Icone nome="alerta" className="ico" />
          <span>
            {semOab.map((a) => primeiroNome(a.nome)).join(" e ")} {semOab.length === 1 ? "está" : "estão"} sem OAB na Equipe. Até ser cadastrada,
            o contrato e a procuração gerados daqui em diante saem com “[OAB: falta]” ao lado do nome. Os já gerados não mudam.
            {quem ?? <> <a href={ROTAS_PORTAL.equipe}>Cadastrar na Equipe</a></>}
          </span>
        </p>
      ) : null}
      {todas.length ? (
        <p className="oe-pe-falta">
          <Icone nome="alerta" className="ico" />
          <span>A inscrição escolhida de {todas.map((a) => primeiroNome(a.nome)).join(" e ")} foi removida da Equipe. O contrato passou a usar as que restam.</span>
        </p>
      ) : null}
      {aberto && algumaEscolha ? (
        <div className="oe-pe-ins">
          <p><Icone nome="pena" className="ico" /><span>Inscrições escolhidas ao criar o contrato. Valem para os documentos gerados daqui em diante; os já gerados guardam as do dia.</span></p>
          <button className="btn btn-sec btn-compacto" type="button" onClick={aoMudar}>
            <Icone nome="lapis" className="ico ico-s" />
            Mudar inscrições<span className="sr"> deste contrato</span>
          </button>
        </div>
      ) : null}
    </section>
  );
}

/** Janela "Inscrições no contrato e na procuração" (decisão 19): só as caixas das inscrições. */
export function JanelaInscricoes({ f, aberta, aoFechar, aoFeito }: { f: FichaContrato; aberta: boolean; aoFechar: () => void; aoFeito: () => void }) {
  const advs = f.advogados
    .map((a) => ({ a, x: (f.inscricoes ?? []).find((i) => i.pessoaId === a.id) }))
    .filter((v): v is { a: (typeof f.advogados)[number]; x: AdvogadoNoContrato } => !!v.x && v.x.inscricoes.length > 0);
  const inicial = Object.fromEntries(advs.map(({ x }) => [x.pessoaId, x.inscricoes.filter((i) => i.escolhida).map((i) => i.id)]));
  const [escolha, setEscolha] = useState<Record<string, string[]>>(inicial);
  const [erros, setErros] = useState<string[]>([]);
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const corpo = useRef<HTMLDivElement>(null);

  async function enviar() {
    const vazios = advs.filter(({ x }) => !(escolha[x.pessoaId] ?? []).length).map(({ x }) => `inscricoes.${x.pessoaId}`);
    if (vazios.length) {
      setErros(vazios);
      return requestAnimationFrame(() => focarPrimeiroErro(corpo.current));
    }
    setErros([]);
    setFalha(null);
    setEnviando(true);
    let versao = f.versao;
    for (const { x } of advs) {
      const ids = escolha[x.pessoaId] ?? [];
      const antes = inicial[x.pessoaId] ?? [];
      if (ids.length === antes.length && ids.every((i) => antes.includes(i))) continue;
      const r = await chamarPortal<{ versao: number }>(`/v1/escritorio/contratos/${f.id}/advogados/${x.pessoaId}/inscricoes`, { metodo: "PUT", corpo: { versao, inscricoes: ids } });
      if (!r.ok) {
        setEnviando(false);
        const campos = r.erro.detalhes?.campos;
        if (r.erro.codigo === "VALIDATION_ERROR" && Array.isArray(campos) && campos.length) {
          setErros(campos.map(String));
          return requestAnimationFrame(() => focarPrimeiroErro(corpo.current));
        }
        return setFalha(r.erro.codigo === "VERSION_CONFLICT" ? "Alguém mudou este contrato agora há pouco. Feche, recarregue a página e tente de novo." : textoDoErro(r.erro));
      }
      versao = r.dados.versao;
    }
    setEnviando(false);
    aoFeito();
  }

  const pessoas = advs.map(({ a, x }) => comoPessoa(x, a.nome));
  return (
    <Janela id="janela-ins" aberta={aberta} aoFechar={aoFechar} sobretitulo={`Contrato ${f.numero} · ${f.cliente.nome}`} titulo="Inscrições no contrato e na procuração"
      descricao="janela-ins-d" aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>Cancelar</button>
          <button className="btn btn-pri" type="submit" disabled={enviando} aria-busy={enviando || undefined}>
            <Icone nome="check" className="ico" />
            Salvar inscrições
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 12 }}>
        <p id="janela-ins-d">Escolha quais inscrições de cada advogado vão nos documentos deste contrato. Fica pelo menos uma por advogado.</p>
        {falha ? <Aviso tom="urgencia" titulo="As inscrições não foram salvas.">{falha}</Aviso> : null}
        <div className="oe-advs">
          {pessoas.map((p) => {
            const e = erros.includes(`inscricoes.${p.id}`);
            return (
              <div key={p.id} className={`oe-adv oe-adv-on${e ? " oe-adv-erro" : ""}`}>
                <p className="oe-adv-nome">{p.nome}<small>{subOab(p, true)}</small></p>
                {p.oab.length > 1 ? (
                  <GrupoInscricoes p={p} ids={escolha[p.id]} pref="ji" erro={e} aoMudar={(ids) => setEscolha((v) => ({ ...v, [p.id]: ids }))} />
                ) : null}
              </div>
            );
          })}
        </div>
        <Previa itens={previaAdvogados(pessoas, escolha)} />
        <p className="pt-comuns"><Icone nome="historico" className="ico" /><span>A mudança fica no histórico do contrato, com seu nome e a hora.</span></p>
      </div>
    </Janela>
  );
}
