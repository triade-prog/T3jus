"use client";
// Os contratos assinados que ficaram sem caso (CH-11, F3.125), desenho aprovado em
// docs/design/aprovadas/portal-jornada-fechamento (grupo 2, decisões 7 a 10): o filtro
// "Assinados sem caso" na lista de Contratos e o aviso no alto de Jurídico › Casos e processos.
// "Abrir o caso" usa a janela curta com a escolha "não tem caso" (decisão 8). Quem não tem a
// área Jurídico vê a lista, sem o botão, e a linha diz quem abre (decisão 10).

import { useState } from "react";
import { type ContratoSemCaso, type ContratosSemCaso } from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { Aviso, Estado } from "../console/pecas.tsx";
import { contar, diaCurto } from "./agenda.ts";
import { JanelaAbrirCaso } from "./CasoDaAssinatura.tsx";
import { Selo, useCarga } from "./Comercial.tsx";
import { ROTAS_CONTRATOS } from "./contratos.ts";
import { juntarNomes, ROTAS_JURIDICO } from "./juridico.ts";
import { irPara } from "./Moldura.tsx";

export const CAMINHO_SEM_CASO = "/v1/escritorio/contratos/sem-caso";

export function useSemCaso() {
  const { dados, recarregar } = useCarga<ContratosSemCaso>(CAMINHO_SEM_CASO);
  return { semCaso: dados && dados !== "erro" ? dados : null, recarregarSemCaso: recarregar };
}

/** A janela do caso aberta destas listas: com "não tem caso"; ao abrir ou juntar, vai ao caso. */
function useJanelaDoCaso(aoMarcado: () => void) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [vez, setVez] = useState(0);
  const janela = aberto ? (
    <JanelaAbrirCaso key={`sc-${vez}`} aberta contrato={aberto} comSem aoFechar={() => setAberto(null)}
      aoFeito={(r) => {
        setAberto(null);
        if (r.casoId) return irPara(`${ROTAS_JURIDICO.caso(r.casoId)}?aberto=1`);
        aoMarcado();
      }} />
  ) : null;
  return { abrir: (id: string) => { setVez((v) => v + 1); setAberto(id); }, janela };
}

const BotaoAbrir = ({ c, aoAbrir, compacto = true }: { c: ContratoSemCaso; aoAbrir: (id: string) => void; compacto?: boolean }) => (
  <button className={`btn ${compacto ? "btn-sec btn-compacto" : "btn-pri btn-compacto"}`} type="button" onClick={() => aoAbrir(c.id)}>
    <Icone nome="balanca" className="ico ico-s" />
    Abrir o caso<span className="sr">: contrato {c.numero}, {c.cliente.nome}</span>
  </button>
);

/** Contratos › "Assinados sem caso" (decisão 7). */
export function TabelaSemCaso({ d, aoMudou, aoVerTodos }: { d: ContratosSemCaso; aoMudou: () => void; aoVerTodos: () => void }) {
  const { abrir, janela } = useJanelaDoCaso(aoMudou);
  const n = d.contratos.length;
  if (!n) {
    return (
      <Estado icone="balanca" titulo="Nenhum contrato assinado sem caso"
        acoes={<button className="btn btn-sec" type="button" onClick={aoVerTodos}><Icone nome="esquerda" className="ico" />Ver todos os contratos</button>}>
        Todo contrato ativo está num caso ou foi marcado “não tem caso”, como consultoria e mensalidade. Quando a assinatura pular a pergunta do caso, ele aparece aqui.
      </Estado>
    );
  }
  return (
    <>
      <p className="hn-cont" role="status">
        <b>{contar(n, "contrato assinado sem caso", "contratos assinados sem caso")}</b> · ativos, sem caso no Jurídico e sem a marca “não tem caso”
      </p>
      <Aviso tom="atencao" className="jf-aviso" titulo="Estes contratos foram assinados sem a pergunta do caso.">
        Para cada um, abra o caso, junte a um caso que já existe ou marque que o contrato não tem caso. Tudo pela mesma janela.
        {d.podeAbrir ? "" : ` Quem abre o caso tem a área Jurídico: ${juntarNomes(d.quemAbre ?? [])}.`}
      </Aviso>
      <table className="hn-tab" data-prio-tabela="contratos-sem-caso" data-sai3="640" data-sai2="640" data-cartoes="560">
        <caption className="sr">Contratos assinados sem caso</caption>
        <colgroup>{["34%", "18%", "22%", "26%"].map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
        <thead><tr>{["Contrato", "Responsável", "Assinado em", "Caso"].map((t) => <th key={t} scope="col">{t}</th>)}</tr></thead>
        <tbody>
          {d.contratos.map((c) => (
            <tr key={c.id} className="hn-venc">
              <td>
                <div className="esc">
                  <div>
                    <a href={ROTAS_CONTRATOS.contrato(c.id)}>{c.cliente.nome}</a>
                    <small>{c.numero} · {c.objeto}</small>
                  </div>
                </div>
              </td>
              <td data-r="Responsável">{c.responsavel?.nome ?? "—"}</td>
              <td data-r="Assinado em"><b className="num">{c.assinadoEm ? diaCurto(c.assinadoEm) : "—"}</b></td>
              <td data-r="Caso">
                <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
                  <Selo tom="atencao" icone="alerta">Sem caso</Selo>
                  {d.podeAbrir ? <BotaoAbrir c={c} aoAbrir={abrir} /> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {janela}
    </>
  );
}

/** Jurídico › Casos e processos: o aviso no alto, que some quando não há nenhum (decisão 9). */
export function AvisoSemCasoJuridico() {
  const { semCaso, recarregarSemCaso } = useSemCaso();
  const { abrir, janela } = useJanelaDoCaso(recarregarSemCaso);
  if (!semCaso || !semCaso.contratos.length) return null;
  const n = semCaso.contratos.length;
  return (
    <div className="jf-aviso">
      <Aviso tom="atencao" titulo={n === 1 ? "1 contrato assinado ainda não tem caso." : `${n} contratos assinados ainda não têm caso.`}
        acoes={
          <>
            <ul className="jf-sc" aria-label="Contratos assinados sem caso">
              {semCaso.contratos.map((c) => (
                <li key={c.id}>
                  <span>
                    <b>{c.cliente.nome}</b>
                    <small>{c.numero} · {c.objeto}{c.assinadoEm ? ` · assinado em ${diaCurto(c.assinadoEm)}` : ""}{c.responsavel ? `, com ${c.responsavel.nome}` : ""}</small>
                  </span>
                  {semCaso.podeAbrir ? <span className="acoes"><BotaoAbrir c={c} aoAbrir={abrir} compacto={false} /></span> : null}
                </li>
              ))}
            </ul>
            <a className="btn btn-fantasma" href={`${ROTAS_CONTRATOS.contratos}?mostrar=sem-caso`}>Ver na lista de Contratos</a>
          </>
        }>
        {n === 1 ? "O cliente está" : "Os clientes estão"} com contrato ativo, mas fora de Casos e processos. Abra o caso, junte a um que já existe ou marque que o contrato não tem caso.
      </Aviso>
      {janela}
    </div>
  );
}
