"use client";
// Novo cliente (AP-01): uma página, não uma janela, porque a qualificação deixa o formulário
// longo. Desenho aprovado em docs/design/aprovadas/portal-clientes (estados novo-*).

import { useId, useState } from "react";
import { Icone } from "../Icone.tsx";
import { Carregando, ErroAoCarregar } from "../console/pecas.tsx";
import { rascunhoVazio } from "./clientes.ts";
import { FormularioCliente } from "./FormCliente.tsx";
import { irPara, MolduraPortal, ROTAS_PORTAL, useEscritorioPortal } from "./Moldura.tsx";

export function NovoClientePortal() {
  const ids = useId();
  const { escritorio, erro, recarregar } = useEscritorioPortal();
  const [inicial] = useState(() => rascunhoVazio("PF"));
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
        {escritorio ? (
          <div className="cl-grade">
            <div className="cl-col">
              {/* A origem é da área Comercial; o servidor ignora o campo de quem não a tem. */}
              <FormularioCliente modo="novo" inicial={inicial} comercial={escritorio.areas.includes("COMERCIAL")}
                aoSalvo={(r) => irPara(`${ROTAS_PORTAL.clientes}/${r.id}?cadastrado=1`)}
                aoCancelar={() => irPara(ROTAS_PORTAL.clientes)} />
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
