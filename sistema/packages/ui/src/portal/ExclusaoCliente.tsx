"use client";
// Pedido de exclusão do titular (F1.15, PT-11). Desenho aprovado em
// docs/design/aprovadas/portal-clientes-pendencias (estados excluir-* e excluido-*), com as
// decisões da Carol de 18/11/2026: quem não é a sócia dona pede a exclusão a ela (decisão 2);
// dos atendimentos ficam a data, o canal, quem atendeu e o resumo (decisão 3); o excluído
// fica em Inativos com a data e o protocolo (decisão 4). Com contrato ou processo, o cliente
// só se arquiva (decisão 5), quando Contratos e Jurídico existirem.

import { useId, useRef, useState } from "react";
import { CANAIS_PEDIDO, nomeConfere, QUEM_PEDIU, type CanalPedido, type FichaCliente, type PedidoExclusao, type QuemPediu } from "@t3jus/domain";
import { textoDoErro, type ErroApi } from "../api.ts";
import { Icone } from "../Icone.tsx";
import { Aviso, descritoPor, ErroCampo, faltaAcertar, focarPrimeiroErro, Janela } from "../console/pecas.tsx";
import { dataLonga, hora } from "../console/tempo.ts";
import { agoraBrasilia, dataBr, lerData } from "./clientes.ts";
import { primeiroNome } from "./equipe.ts";
import type { Feito } from "./FichaCliente.tsx";
import { chamarPortal } from "./Moldura.tsx";

const SOBRE = "Pedido do titular · LGPD";
const CANAIS: [CanalPedido, string][] = [["EMAIL", "E-mail"], ["WHATSAPP", "WhatsApp"], ["PRESENCIAL", "Presencial"], ["TELEFONE", "Telefone"], ["CARTA", "Carta"]];
const ddmm = (iso: string) => dataBr(iso).slice(0, 5);
const canalMinusculo = (c: CanalPedido) => (c === "WHATSAPP" || c === "EMAIL" ? CANAIS_PEDIDO[c] : CANAIS_PEDIDO[c].toLowerCase());

/** A linha da folha Situação: a dona atende o pedido; os outros pedem a ela. */
export function AcaoLgpd({ f, dona, aoExcluir, aoPedir }: { f: FichaCliente; dona: string; aoExcluir: () => void; aoPedir: () => void }) {
  const p = f.pedidoExclusao;
  if (f.dono) {
    return (
      <div className="pd-lgpd-acao">
        {p ? (
          <p>
            <b>Pedido de exclusão dos dados (LGPD)</b>Há um pedido esperando você, no alto da ficha.
          </p>
        ) : (
          <>
            <p>
              <b>Pedido de exclusão dos dados (LGPD)</b>Se o cliente pedir para apagar os dados, atenda aqui. Só a sócia dona vê esta ação.
            </p>
            <button className="btn btn-fantasma" type="button" onClick={aoExcluir}>
              <Icone nome="escudo" className="ico" />
              Atender pedido de exclusão
            </button>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="pd-lgpd-acao">
      {p ? (
        <p>
          <b>Pedido de exclusão enviado</b>
          {dona}, a sócia dona, já recebeu o pedido de {ddmm(p.pedidoEm)}. Não precisa pedir de novo.
        </p>
      ) : (
        <>
          <p>
            <b>O cliente pediu para apagar os dados?</b>Quem atende o pedido (LGPD) é {dona}, a sócia dona. Registre o pedido aqui: ela recebe no Início e decide.
          </p>
          <button className="btn btn-fantasma" type="button" onClick={aoPedir}>
            <Icone nome="escudo" className="ico" />
            Pedir a exclusão à sócia dona
          </button>
        </>
      )}
    </div>
  );
}

/** A faixa do pedido no alto da ficha, para todos; a dona vê as duas ações. */
export function FaixaPedido({ f, aoExcluir, aoRecusar }: { f: FichaCliente; aoExcluir: () => void; aoRecusar: () => void }) {
  const p = f.pedidoExclusao;
  const r = f.ultimaRecusa;
  if (!p && r) {
    return (
      <div className="pd-faixa">
        <Aviso tom="info" titulo={`Pedido de exclusão recusado em ${ddmm(r.resolvidoEm ?? r.registradoEm)}${r.resolvidoPor ? ` por ${r.resolvidoPor.nome}` : ""}.`}>
          Motivo: “{r.motivoRecusa}” Os dados continuam como estavam. O pedido e a recusa ficam no histórico do escritório.
        </Aviso>
      </div>
    );
  }
  if (!p) return null;
  return (
    <div className="pd-faixa">
      <Aviso tom="atencao" titulo={`Exclusão pedida em ${ddmm(p.pedidoEm)} por ${p.registradoPor.nome}, aguardando a sócia dona.`}
        acoes={
          f.dono ? (
            <>
              <button className="btn btn-perigo" type="button" onClick={aoExcluir}>
                <Icone nome="escudo" className="ico" />
                Excluir os dados
              </button>
              <button className="btn btn-sec" type="button" onClick={aoRecusar}>
                Recusar o pedido
              </button>
            </>
          ) : undefined
        }>
        O pedido chegou por {canalMinusculo(p.canal)} em {dataBr(p.pedidoEm)}.{p.observacao ? ` Observação: “${p.observacao}”` : ""}
        {f.dono ? " Quem decide é você: excluir os dados ou recusar o pedido, com o motivo." : ""}
      </Aviso>
    </div>
  );
}

type Erros = Record<string, string>;

function useCamposPedido(inicial: { data?: string; canal?: CanalPedido | "" }) {
  const [data, setData] = useState(inicial.data ?? agoraBrasilia().data);
  const [canal, setCanal] = useState<CanalPedido | "">(inicial.canal ?? "");
  const [obs, setObs] = useState("");
  return { data, setData, canal, setCanal, obs, setObs };
}

function CamposPedido({ ids, c, erros, focoData }: { ids: string; c: ReturnType<typeof useCamposPedido>; erros: Erros; focoData?: boolean }) {
  return (
    <>
      <div className="pd-dois">
        <div className="campo">
          <label htmlFor={`${ids}-data`}>Data do pedido</label>
          <input className="entrada" id={`${ids}-data`} value={c.data} inputMode="numeric" autoComplete="off" data-foco={focoData ? true : undefined}
            onChange={(e) => c.setData(e.target.value)} aria-invalid={erros.data ? true : undefined}
            aria-describedby={descritoPor(!erros.data && `${ids}-data-aj`, erros.data && `${ids}-data-er`)} />
          {erros.data ? <ErroCampo id={`${ids}-data-er`}>{erros.data}</ErroCampo> : <p className="ajuda" id={`${ids}-data-aj`}>dd/mm/aaaa</p>}
        </div>
        <div className="campo">
          <label htmlFor={`${ids}-canal`}>Como o pedido chegou</label>
          <select className="entrada" id={`${ids}-canal`} value={c.canal} onChange={(e) => c.setCanal(e.target.value as CanalPedido | "")}
            aria-invalid={erros.canal ? true : undefined} aria-describedby={erros.canal ? `${ids}-canal-er` : undefined}>
            <option value="">Escolha</option>
            {CANAIS.map(([k, r]) => (
              <option key={k} value={k}>
                {r}
              </option>
            ))}
          </select>
          {erros.canal ? <ErroCampo id={`${ids}-canal-er`}>{erros.canal}</ErroCampo> : null}
        </div>
      </div>
    </>
  );
}

function Observacao({ ids, c, ajuda, erro }: { ids: string; c: ReturnType<typeof useCamposPedido>; ajuda: string; erro?: string }) {
  return (
    <div className="campo">
      <label htmlFor={`${ids}-obs`}>
        Observação<span className="opcional"> (opcional)</span>
      </label>
      <input className="entrada" id={`${ids}-obs`} value={c.obs} maxLength={300} autoComplete="off" onChange={(e) => c.setObs(e.target.value)}
        aria-invalid={erro ? true : undefined} aria-describedby={descritoPor(`${ids}-obs-aj`, erro && `${ids}-obs-er`)} />
      <p className="ajuda" id={`${ids}-obs-aj`}>
        {ajuda}
      </p>
      {erro ? <ErroCampo id={`${ids}-obs-er`}>{erro}</ErroCampo> : null}
    </div>
  );
}

/** Confere data e canal; devolve a data em aaaa-mm-dd. */
function conferirPedido(c: ReturnType<typeof useCamposPedido>, hoje: string, e: Erros): string | null {
  const d = lerData(c.data);
  if (!d) e.data = "Escreva a data como dd/mm/aaaa.";
  else if (d > hoje) e.data = "O pedido não pode ser de uma data futura.";
  if (!c.canal) e.canal = "Escolha por onde o pedido chegou.";
  return d;
}

/** Os campos que o servidor recusou viram mensagens no lugar certo. */
function errosDoServidor(erro: ErroApi): Erros | null {
  const campos = erro.detalhes?.campos;
  if (!Array.isArray(campos)) return null;
  const m: Record<string, [string, string]> = {
    pedidoEm: ["data", "Confira a data: não pode ser futura nem de mais de um ano atrás."],
    canal: ["canal", "Escolha por onde o pedido chegou."],
    quemPediu: ["quem", "Diga quem pediu."],
    conferido: ["conf", "Confirme quem pediu antes de excluir."],
    nomeConfirmado: ["nome", "O nome não confere."],
    observacao: ["obs", "A observação passou de 300 letras."],
    motivo: ["motivo", "Escreva o motivo."],
  };
  const e: Erros = {};
  for (const c of campos) if (typeof c === "string" && m[c]) e[m[c][0]] = m[c][1];
  return Object.keys(e).length ? e : null;
}

/** Quem não é a dona registra o pedido para ela (decisão 2). */
export function JanelaPedir({ aberta, f, dona, hoje, aoFechar, aoFeito }: {
  aberta: boolean; f: FichaCliente; dona: string; hoje: string; aoFechar: () => void; aoFeito: (x: Feito) => void;
}) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const c = useCamposPedido({});
  const [erros, setErros] = useState<Erros>({});
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar() {
    setErro(null);
    const e: Erros = {};
    const pedidoEm = conferirPedido(c, hoje, e);
    setErros(e);
    if (Object.keys(e).length) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const r = await chamarPortal<PedidoExclusao>(`/v1/escritorio/clientes/${f.id}/exclusao/pedido`, {
      corpo: { pedidoEm, canal: c.canal, observacao: c.obs.trim() || null },
    });
    setEnviando(false);
    if (!r.ok) {
      const s = errosDoServidor(r.erro);
      if (s) {
        setErros(s);
        return focarPrimeiroErro(corpo.current);
      }
      return setErro(r.erro);
    }
    aoFeito({ titulo: `Pedido enviado a ${dona}.`, texto: "Ela vê o pedido no Início. A faixa no alto da ficha mostra que ele está esperando." });
  }

  const n = Object.keys(erros).length;
  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={aoFechar} sobretitulo={SOBRE} titulo="Pedir a exclusão à sócia dona" descricao={`${ids}-d`}
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-pri" type="submit" disabled={enviando}>
            <Icone nome="check" className="ico" />
            {enviando ? "Enviando…" : "Enviar o pedido"}
          </button>
        </>
      }>
      <div ref={corpo} style={{ display: "grid", gap: 14 }}>
        <p id={`${ids}-d`}>{f.nome} pediu para apagar os dados. Registre quando e como o pedido chegou.</p>
        {n ? <Aviso tom="urgencia" titulo={faltaAcertar(n)}>O pedido ainda não foi enviado.</Aviso> : null}
        {erro ? <Aviso tom="urgencia" titulo="O pedido não foi enviado.">{erro.detalhes?.motivo === "PEDIDO_ABERTO" ? "Já há um pedido esperando a sócia dona." : textoDoErro(erro)}</Aviso> : null}
        <CamposPedido ids={ids} c={c} erros={erros} focoData />
        <Observacao ids={ids} c={c} erro={erros.obs} ajuda="Sem dado pessoal. Ex.: “pediu por mensagem, do número que está na ficha”." />
        <p className="pt-comuns">
          <Icone nome="escudo" className="ico" />
          <span>
            Nada é apagado agora. {dona}, a sócia dona, recebe o pedido no Início e decide. O prazo da LGPD conta da data do pedido, por isso registre no mesmo dia.
          </span>
        </p>
      </div>
    </Janela>
  );
}

/** A dona recusa o pedido, com o motivo. */
export function JanelaRecusar({ aberta, f, aoFechar, aoFeito }: { aberta: boolean; f: FichaCliente; aoFechar: () => void; aoFeito: (x: Feito) => void }) {
  const ids = useId();
  const campo = useRef<HTMLTextAreaElement>(null);
  const [motivo, setMotivo] = useState("");
  const [falta, setFalta] = useState(false);
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const p = f.pedidoExclusao;

  async function enviar() {
    setErro(null);
    if (!motivo.trim()) {
      setFalta(true);
      return requestAnimationFrame(() => campo.current?.focus());
    }
    setFalta(false);
    setEnviando(true);
    const r = await chamarPortal<PedidoExclusao>(`/v1/escritorio/clientes/${f.id}/exclusao/recusar`, { corpo: { motivo: motivo.trim() } });
    setEnviando(false);
    if (!r.ok) return setErro(r.erro);
    aoFeito({ titulo: "Pedido de exclusão recusado.", texto: "Os dados continuam como estavam. Avise o cliente do motivo pelo canal do pedido." });
  }

  return (
    <Janela id={`${ids}-j`} aberta={aberta} aoFechar={aoFechar} alerta sobretitulo={SOBRE} titulo="Recusar o pedido de exclusão?" descricao={`${ids}-d`}
      aoEnviar={() => void enviar()}
      pe={
        <>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn btn-perigo" type="submit" disabled={enviando}>
            {enviando ? "Recusando…" : "Recusar o pedido"}
          </button>
        </>
      }>
      <p id={`${ids}-d`}>
        O pedido{p ? ` de ${ddmm(p.pedidoEm)}, registrado por ${p.registradoPor.nome},` : ""} é encerrado sem excluir os dados de {primeiroNome(f.nome)}.
      </p>
      {falta ? <Aviso tom="urgencia" titulo={faltaAcertar(1)}>O pedido continua esperando.</Aviso> : null}
      {erro ? <Aviso tom="urgencia" titulo="O pedido não foi recusado.">{textoDoErro(erro)}</Aviso> : null}
      <div className="campo">
        <label htmlFor={`${ids}-m`}>Motivo</label>
        <textarea ref={campo} className="entrada" id={`${ids}-m`} value={motivo} maxLength={300} data-foco onChange={(e) => setMotivo(e.target.value)}
          aria-invalid={falta ? true : undefined} aria-describedby={descritoPor(`${ids}-m-aj`, falta && `${ids}-m-er`)} />
        <p className="ajuda" id={`${ids}-m-aj`}>
          Obrigatório. Ex.: não deu para confirmar que o pedido veio do cliente. Não escreva dado pessoal.
        </p>
        {falta ? <ErroCampo id={`${ids}-m-er`}>Escreva o motivo. Ele fica no histórico do escritório.</ErroCampo> : null}
      </div>
      <p className="pt-comuns">
        <Icone nome="historico" className="ico" />
        <span>Nada é apagado. A faixa do pedido sai da ficha e a recusa fica no histórico do escritório, com o motivo. Avise o cliente do motivo pelo canal do pedido.</span>
      </p>
    </Janela>
  );
}

/** A sócia dona exclui os dados (decisões 3 e 4). */
export function JanelaExcluir({ aberta, f, hoje, aoFechar, aoFeito, aoConflito }: {
  aberta: boolean; f: FichaCliente; hoje: string; aoFechar: () => void; aoFeito: (x: Feito) => void; aoConflito: () => void;
}) {
  const ids = useId();
  const corpo = useRef<HTMLDivElement>(null);
  const p = f.pedidoExclusao;
  const c = useCamposPedido(p ? { data: dataBr(p.pedidoEm), canal: p.canal } : { canal: "" });
  const [quem, setQuem] = useState<QuemPediu>(p?.quemPediu ?? "TITULAR");
  const [conf, setConf] = useState(false);
  const [nome, setNome] = useState("");
  const [erros, setErros] = useState<Erros>({});
  const [erro, setErro] = useState<ErroApi | null>(null);
  const [enviando, setEnviando] = useState(false);
  const primeiro = primeiroNome(f.nome);
  const confere = nomeConfere(nome, f.nome);
  const contatos = f.contatos;
  const prox = f.proxContato;
  const n = f.atendimentos ?? 0;

  async function enviar() {
    setErro(null);
    const e: Erros = {};
    const pedidoEm = conferirPedido(c, hoje, e);
    if (!conf) e.conf = "Confirme quem pediu antes de excluir.";
    if (!confere) e.nome = nome.trim() ? `O nome não confere. Escreva exatamente: ${f.nome}.` : `Escreva o nome: ${f.nome}.`;
    setErros(e);
    if (Object.keys(e).length) return focarPrimeiroErro(corpo.current);
    setEnviando(true);
    const r = await chamarPortal<{ protocolo: string; versao: number }>(`/v1/escritorio/clientes/${f.id}/exclusao`, {
      corpo: { versao: f.versao, pedidoEm, canal: c.canal, quemPediu: quem, conferido: true, nomeConfirmado: nome, observacao: c.obs.trim() || p?.observacao || null },
    });
    setEnviando(false);
    if (!r.ok) {
      if (r.erro.codigo === "VERSION_CONFLICT") return aoConflito();
      const s = errosDoServidor(r.erro);
      if (s) {
        setErros(s);
        return focarPrimeiroErro(corpo.current);
      }
      return setErro(r.erro);
    }
    aoFeito({ titulo: "Dados excluídos.", texto: `Protocolo ${r.dados.protocolo}. Informe ao cliente que o pedido foi atendido. O registro ficou no histórico do escritório.` });
  }

  const nErros = Object.keys(erros).length;
  return (
    <Janela id={`${ids}-j`} classe="pd-janela" aberta={aberta} aoFechar={aoFechar} alerta sobretitulo={SOBRE} titulo={`Excluir os dados de ${f.nome}?`}
      descricao={`${ids}-d`} aoEnviar={() => void enviar()}
      pe={
        <>
          <span className="pd-pe-nota">A exclusão fica no histórico do escritório com o protocolo, sem dado pessoal.</span>
          <button className="btn btn-fantasma" type="button" onClick={aoFechar}>
            Cancelar
          </button>
          <button className="btn pd-perigo-cheio" type="submit" disabled={enviando}>
            <Icone nome="xis" className="ico" />
            {enviando ? "Excluindo…" : "Excluir os dados para sempre"}
          </button>
        </>
      }>
      <p id={`${ids}-d`}>A pedido do cliente, os dados pessoais são apagados agora e não voltam. Fica só o registro de que o pedido foi atendido.</p>
      <div className="pd-j" ref={corpo}>
        {nErros ? (
          <div className="pd-inteira">
            <Aviso tom="urgencia" titulo={faltaAcertar(nErros)}>
              Nada foi excluído.
            </Aviso>
          </div>
        ) : erro ? (
          <div className="pd-inteira">
            <Aviso tom="urgencia" titulo="A exclusão não foi feita, e nada foi apagado.">
              {erro.detalhes?.motivo === "CLIENTE_EXCLUIDO"
                ? "Os dados deste cliente já foram excluídos."
                : `A exclusão acontece inteira ou não acontece, então os dados de ${primeiro} estão como antes. ${textoDoErro(erro)}`}
            </Aviso>
          </div>
        ) : p ? (
          <div className="pd-inteira">
            <Aviso tom="info" titulo={`Pedido registrado por ${p.registradoPor.nome} em ${ddmm(p.pedidoEm)}.`}>
              A data e o canal vêm do pedido. Confira quem pediu e confirme.
            </Aviso>
          </div>
        ) : null}
        <div className="pd-col">
          <div className="pd-lado pd-some">
            <h3>
              <Icone nome="xis" className="ico" />O que é apagado
            </h3>
            <ul>
              <li>
                Nome, {f.tipo === "PJ" ? "CNPJ, o representante" : "CPF, RG"} e a qualificação
                <small>{f.tipo === "PJ" ? "endereço da sede e quem assina pela empresa" : "nacionalidade, estado civil, profissão e endereço"}</small>
              </li>
              <li>
                {contatos.length === 1 ? "O contato" : `Os ${contatos.length} contatos`}
                <small>{contatos.map((x) => x.nome).join(", ")}, com telefones e e-mails</small>
              </li>
              {f.origemIndicacao ? (
                <li>
                  Quem indicou<small>{f.origemIndicacao}</small>
                </li>
              ) : null}
              {n ? <li>Com quem se falou, {n === 1 ? "no atendimento" : `nos ${n} atendimentos`}</li> : null}
              {prox ? (
                <li>
                  O próximo contato de {ddmm(prox.em)}
                  <small>sai também do Início de {prox.responsavel.nome}</small>
                </li>
              ) : null}
            </ul>
          </div>
          <div className="pd-lado pd-fica">
            <h3>
              <Icone nome="check" className="ico" />O que fica, sem dado pessoal
            </h3>
            <ul>
              <li>
                O registro da exclusão
                <small>quem fez, quando, como o pedido chegou e o protocolo. Prova que o escritório atendeu o pedido (LGPD, art. 18 e 37).</small>
              </li>
              {n ? (
                <li>
                  Data, canal, quem atendeu e o resumo, {n === 1 ? "no atendimento" : `nos ${n} atendimentos`}
                  <small>sem com quem se falou. O trabalho da equipe e o que foi tratado continuam no histórico.</small>
                  <span className="pd-dica">
                    <Icone nome="alerta" className="ico" />
                    <span>O resumo fica como foi escrito. Resumo de atendimento não deve ter dado pessoal desnecessário, como CPF, endereço ou saúde.</span>
                  </span>
                </li>
              ) : null}
              {f.origem ? (
                <li>
                  A origem, como categoria<small>sem quem indicou. Conta no relatório de origem.</small>
                </li>
              ) : null}
            </ul>
          </div>
          <p className="pt-comuns">
            <Icone nome="escudo" className="ico" />
            <span>
              <b>Nada aqui precisa ser guardado por lei.</b> Ainda não há contratos nem processos no T3jus; quando houver, o pedido de quem tiver um deles será
              atendido arquivando, sem apagar. Documentos fora do T3jus (papel, e-mail, pastas) ficam com o escritório, que é o controlador.
            </span>
          </p>
        </div>
        <div className="pd-col">
          <fieldset className="pd-pedido">
            <legend>O pedido</legend>
            <CamposPedido ids={ids} c={c} erros={erros} focoData />
            <fieldset className="pd-quem">
              <legend>Quem pediu</legend>
              {(Object.keys(QUEM_PEDIU) as QuemPediu[]).map((k) => (
                <label className="opcao" key={k}>
                  <input className="marcar" type="radio" name={`${ids}-quem`} checked={quem === k} onChange={() => setQuem(k)} />
                  <span>
                    {k === "TITULAR" ? "O próprio cliente" : "Alguém em nome do cliente"}
                    {k === "REPRESENTANTE" ? <small>procurador ou responsável legal, com o documento que mostra isso</small> : null}
                  </span>
                </label>
              ))}
            </fieldset>
            <div>
              <label className="opcao" style={{ margin: "0 -8px" }}>
                <input className="marcar" type="checkbox" checked={conf} onChange={(e) => setConf(e.target.checked)} aria-invalid={erros.conf ? true : undefined}
                  aria-describedby={erros.conf ? `${ids}-conf-er` : undefined} />
                <span>
                  Conferi que o pedido veio do cliente ou de quem fala por ele
                  <small>Pelo telefone ou e-mail que já estão na ficha, ou com documento.</small>
                </span>
              </label>
              {erros.conf ? <ErroCampo id={`${ids}-conf-er`}>{erros.conf}</ErroCampo> : null}
            </div>
            <Observacao ids={ids} c={c} erro={erros.obs} ajuda="Não escreva dados pessoais: este texto fica guardado no registro da exclusão." />
          </fieldset>
          <div className="pd-confirma">
            <p className="pd-irrev">
              <Icone nome="alerta" className="ico" />
              <span>
                <b>Não dá para desfazer.</b> Nem a equipe do escritório nem o suporte T3jus conseguem recuperar os dados depois.
              </span>
            </p>
            <div className="campo">
              <label htmlFor={`${ids}-nome`}>Para confirmar, escreva o nome do cliente</label>
              <p className="pd-nome" id={`${ids}-nome-aj`}>
                {f.nome}
              </p>
              <input className="entrada" id={`${ids}-nome`} value={nome} autoComplete="off" spellCheck={false} onChange={(e) => setNome(e.target.value)}
                aria-invalid={erros.nome ? true : undefined} aria-describedby={descritoPor(`${ids}-nome-aj`, erros.nome && `${ids}-nome-er`)} />
              {confere ? (
                <p className="cl-ok">
                  <Icone nome="check" className="ico" />O nome confere
                </p>
              ) : null}
              {erros.nome ? <ErroCampo id={`${ids}-nome-er`}>{erros.nome}</ErroCampo> : null}
            </div>
          </div>
        </div>
      </div>
    </Janela>
  );
}

// ------------------------------------------------------------------------- cliente excluído

/** O âmbar do cabeçalho do excluído: a data e o protocolo. */
export function RegistroNoCabecalho({ f }: { f: FichaCliente }) {
  const x = f.exclusao;
  return (
    <section className="dir campo-ambar" aria-labelledby="pd-t-reg">
      <p className="sobretitulo" id="pd-t-reg">
        Excluído a pedido
      </p>
      <p className="grande" style={{ fontSize: 30 }}>
        {x ? dataLonga(x.em) : ""}
      </p>
      {x ? (
        <p className="cl-oque">
          <b>Protocolo {x.protocolo}</b>
          <br />
          feito por {x.resolvidoPor?.nome ?? "a sócia dona"}, às {hora(x.em)}
        </p>
      ) : null}
    </section>
  );
}

/** A folha "Registro da exclusão", que não se apaga. */
export function RegistroExclusao({ f }: { f: FichaCliente }) {
  const x = f.exclusao;
  const [copiado, setCopiado] = useState(false);
  if (!x) return null;
  return (
    <section className="folha" aria-labelledby="pd-t-regf">
      <div className="folha-cab" style={{ paddingBottom: 8 }}>
        <div>
          <h2 id="pd-t-regf" style={{ fontSize: 20 }}>
            Registro da exclusão
          </h2>
        </div>
      </div>
      <dl className="pd-registro">
        <div>
          <dt>Protocolo</dt>
          <dd className="num">{x.protocolo}</dd>
        </div>
        <div>
          <dt>Pedido</dt>
          <dd>
            {dataBr(x.pedidoEm)}, por {canalMinusculo(x.canal)}
          </dd>
        </div>
        {x.quemPediu ? (
          <div>
            <dt>Quem pediu</dt>
            <dd>{x.quemPediu === "TITULAR" ? "O próprio cliente" : "Alguém em nome do cliente"}</dd>
          </div>
        ) : null}
        <div>
          <dt>Pedido conferido</dt>
          <dd>Sim</dd>
        </div>
        {x.resolvidoPor ? (
          <div>
            <dt>Feita por</dt>
            <dd>{x.resolvidoPor.nome}, sócia dona</dd>
          </div>
        ) : null}
        <div>
          <dt>Quando</dt>
          <dd>
            {dataBr(x.em)}, {hora(x.em)}
          </dd>
        </div>
      </dl>
      <div className="cl-folha-acao">
        <p>Este registro não tem dado pessoal e não se apaga: ele prova que o pedido foi atendido. Se o cliente perguntar, informe o protocolo.</p>
        <button className="btn btn-sec" type="button" onClick={() => void navigator.clipboard?.writeText(x.protocolo ?? "").then(() => setCopiado(true), () => undefined)}>
          <Icone nome={copiado ? "check" : "doc"} className="ico" />
          {copiado ? "Protocolo copiado" : "Copiar o protocolo"}
        </button>
      </div>
    </section>
  );
}

/** Dados e contatos do excluído: cada campo diz "Excluído". */
export function DadosExcluidos({ f }: { f: FichaCliente }) {
  const em = f.exclusao ? dataBr(f.exclusao.em) : "";
  const x = (t = "Excluído") => <dd className="pd-x">{t}</dd>;
  return (
    <>
      <section className="folha" aria-labelledby="pd-t-dados">
        <div className="folha-cab">
          <div>
            <h2 id="pd-t-dados">Dados e qualificação</h2>
            <p className="sub">Apagados a pedido do cliente. Não há o que editar.</p>
          </div>
        </div>
        <dl className="dados-ficha">
          <div className="inteira">
            <dt>Nome completo</dt>
            {x(`Excluído a pedido (LGPD) em ${em}`)}
          </div>
          <div>
            <dt>{f.tipo === "PJ" ? "CNPJ" : "CPF"}</dt>
            {x()}
          </div>
          <div>
            <dt>{f.tipo === "PJ" ? "Quem assina pela empresa" : "RG"}</dt>
            {x()}
          </div>
          <div>
            <dt>{f.tipo === "PJ" ? "Qualificação do representante" : "Nacionalidade, estado civil e profissão"}</dt>
            {x("Excluídos")}
          </div>
          <div className="inteira">
            <dt>Endereço</dt>
            {x()}
          </div>
        </dl>
      </section>
      <section className="folha" aria-labelledby="pd-t-ct">
        <div className="folha-cab">
          <div>
            <h2 id="pd-t-ct">Contatos</h2>
            <p className="sub">Os contatos foram excluídos.</p>
          </div>
        </div>
      </section>
    </>
  );
}
