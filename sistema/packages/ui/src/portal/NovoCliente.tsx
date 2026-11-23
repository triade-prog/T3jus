"use client";
// Novo cliente (AP-01): uma página, não uma janela, porque a qualificação deixa o formulário
// longo. Desenho aprovado em docs/design/aprovadas/portal-clientes (estados novo-*).
// Pela conversa (AP-07, ?conversa=<id>): o nome e o telefone vêm dela, o cadastro liga a conversa
// à ficha e a pessoa volta para a conversa (docs/design/aprovadas/portal-jornada-fechamento, grupo 7).

import { useEffect, useId, useState } from "react";
import type { ContatoDaConversa } from "@t3jus/domain";
import { Icone } from "../Icone.tsx";
import { Carregando, ErroAoCarregar } from "../console/pecas.tsx";
import { formatarTelefone } from "../console/ficha.ts";
import { rascunhoVazio, type RascunhoCliente } from "./clientes.ts";
import { FormularioCliente, type CadastroDaConversa } from "./FormCliente.tsx";
import { chamarPortal, irPara, MolduraPortal, ROTAS_PORTAL, useEscritorioPortal } from "./Moldura.tsx";

export function NovoClientePortal() {
  const ids = useId();
  const { escritorio, erro, recarregar } = useEscritorioPortal();
  const [inicial, setInicial] = useState<RascunhoCliente>(() => rascunhoVazio("PF"));
  // undefined: sem conversa; null: ainda lendo o endereço ou a conversa.
  const [conversa, setConversa] = useState<CadastroDaConversa | null | undefined>(null);
  useEffect(() => {
    const id = idDaConversa();
    if (!id) return void Promise.resolve().then(() => setConversa(undefined));
    void chamarPortal<ContatoDaConversa>(`/v1/escritorio/conversas/${id}/contato`).then((r) => {
      // Conversa que não carrega ou que já tem ficha: o cadastro de sempre.
      if (!r.ok || r.dados.clienteId) return setConversa(undefined);
      const c = r.dados;
      setInicial((x) => ({
        ...x, nome: c.nome ?? "",
        contatos: x.contatos.map((k, i) => (i === 0 ? { ...k, nome: c.nome ?? "", telefone: formatarTelefone(c.telefone) } : k)),
      }));
      setConversa({ id: c.id, telefone: c.telefone, nome: c.nome });
    });
  }, []);
  const voltar = conversa ? `${ROTAS_PORTAL.conversas}?c=${conversa.id}` : ROTAS_PORTAL.clientes;
  const trilha = [{ nome: "Clientes", href: ROTAS_PORTAL.clientes }, { nome: "Novo cliente" }];
  if (erro) {
    return (
      <MolduraPortal atual="clientes" trilha={trilha} escritorio={null}>
        <ErroAoCarregar oque="o cadastro" aoTentar={recarregar} />
      </MolduraPortal>
    );
  }
  return (
    <MolduraPortal atual="clientes" trilha={trilha} escritorio={escritorio}>
      <div className="cl">
        <div className="pt-cab">
          <div>
            <p className="sobretitulo">Clientes</p>
            <h1>Novo cliente</h1>
            <span className="fio" aria-hidden="true" />
          </div>
        </div>
        {escritorio && conversa !== null ? (
          <div className="cl-grade">
            <div className="cl-col">
              {/* A origem é da área Comercial; o servidor ignora o campo de quem não a tem. */}
              <FormularioCliente modo="novo" inicial={inicial} comercial={escritorio.areas.includes("COMERCIAL")} daConversa={conversa}
                aoSalvo={(r) => irPara(conversa ? `${voltar}&cadastrado=1` : `${ROTAS_PORTAL.clientes}/${r.id}?cadastrado=1`)}
                aoCancelar={() => irPara(voltar)} />
            </div>
            <aside className="cl-col" aria-label="Como funciona o cadastro">
              <section className="explica campo-ambar" aria-labelledby={`${ids}-ex`}>
                <p className="sobretitulo">Cadastro mínimo</p>
                <h2 id={`${ids}-ex`}>Pede só o que vai usar.</h2>
                <ul>
                  <li>
                    <Icone nome="pessoaMais" className="ico" />
                    <span>Para cadastrar bastam o nome e um telefone ou e-mail.</span>
                  </li>
                  <li>
                    <Icone nome="pena" className="ico" />
                    <span>A qualificação (estado civil, profissão, RG, endereço) serve à procuração e ao contrato. A ficha mostra o que falta.</span>
                  </li>
                  <li>
                    <Icone nome="pessoas" className="ico" />
                    <span>Se o CPF, o CNPJ ou o telefone já estiverem em outro cliente, avisamos. Você decide se é a mesma pessoa.</span>
                  </li>
                  <li>
                    <Icone nome="escudo" className="ico" />
                    <span>O escritório é o controlador destes dados (LGPD).</span>
                  </li>
                </ul>
              </section>
            </aside>
          </div>
        ) : (
          <Carregando rotulo="Carregando o cadastro…" linhas={4} />
        )}
      </div>
    </MolduraPortal>
  );
}

function idDaConversa(): string | null {
  const c = new URLSearchParams(window.location.search).get("conversa");
  return c && /^[0-9a-f-]{36}$/i.test(c) ? c.toLowerCase() : null;
}
