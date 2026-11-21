// Formulário de demonstração no navegador: confere os campos, envia ao servidor do
// próprio site e mostra os estados aprovados (erros, enviando, enviado, falha).
import { normalizar, resumoErros, validar, type Campo, type Erros } from "../lib/pedido";

const form = document.getElementById("form-pedido") as HTMLFormElement | null;
const cartao = document.getElementById("cartao-form");
const aviso = document.getElementById("aviso-form");
const status = document.getElementById("status-form");
const abertoEm = Date.now();

const ALERTA = '<svg class="ico" aria-hidden="true"><use href="#i-alerta"/></svg>';
const esc = (t: string) =>
  t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

function limparErros() {
  if (!form) return;
  form.querySelectorAll(".erro-msg[data-gerado]").forEach((e) => e.remove());
  form.querySelectorAll("[aria-invalid]").forEach((e) => e.removeAttribute("aria-invalid"));
  form.querySelectorAll(".tamanhos.erro, .aceite.erro").forEach((e) => e.classList.remove("erro"));
  form.querySelectorAll<HTMLElement>("[data-descrito]").forEach((e) => {
    e.setAttribute("aria-describedby", e.dataset.descrito ?? "");
    if (!e.dataset.descrito) e.removeAttribute("aria-describedby");
    delete e.dataset.descrito;
  });
  if (aviso) aviso.innerHTML = "";
}

function marcar(el: HTMLElement, idErro: string) {
  const antes = el.getAttribute("aria-describedby") ?? "";
  el.dataset.descrito = antes;
  el.setAttribute("aria-describedby", (idErro + " " + antes).trim());
  el.setAttribute("aria-invalid", "true");
}

function mostrarErros(erros: Erros) {
  if (!form || !aviso) return;
  const campos = Object.keys(erros) as Campo[];
  for (const campo of campos) {
    const caixa = form.querySelector<HTMLElement>(`[data-campo="${campo}"]`);
    if (!caixa) continue;
    const id = `${campo}-erro`;
    const p = document.createElement("p");
    p.className = "erro-msg";
    p.id = id;
    p.dataset.gerado = "1";
    p.innerHTML = ALERTA + esc(erros[campo] ?? "");
    if (campo === "tamanho") {
      caixa.querySelector(".tamanhos")?.classList.add("erro");
      caixa.querySelectorAll<HTMLInputElement>("input").forEach((i) => marcar(i, id));
      caixa.appendChild(p);
    } else if (campo === "aceite") {
      caixa.classList.add("erro");
      marcar(caixa.querySelector("input") as HTMLElement, id);
      caixa.appendChild(p);
    } else {
      const entrada = caixa.querySelector<HTMLElement>(".entrada");
      if (entrada) marcar(entrada, id);
      caixa.appendChild(p);
    }
  }
  aviso.innerHTML = `<div class="aviso aviso-erro" role="alert" tabindex="-1" id="resumo-erros">${ALERTA}<div><b>${esc(
    resumoErros(campos.length),
  )}</b><p>Nada foi enviado ainda.</p></div></div>`;
  (aviso.firstElementChild as HTMLElement).focus();
}

function falha(texto: string) {
  if (!aviso) return;
  aviso.innerHTML = `<div class="aviso aviso-erro" role="alert" tabindex="-1">${ALERTA}<div><b>Não deu para enviar agora.</b><p>${texto} O que você escreveu continua aqui: tente de novo em instantes ou escreva para <a href="mailto:contato@t3jus.pro">contato@t3jus.pro</a>.</p></div></div>`;
  (aviso.firstElementChild as HTMLElement).focus();
}

function ocupado(sim: boolean) {
  if (!form) return;
  const botao = form.querySelector<HTMLButtonElement>("button[type=submit]");
  form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select").forEach((c) => {
    if (c.name === "site") return;
    if (c instanceof HTMLInputElement && (c.type === "radio" || c.type === "checkbox")) c.disabled = sim;
    else if (c instanceof HTMLSelectElement) c.disabled = sim;
    else c.readOnly = sim;
  });
  if (botao) {
    if (sim) {
      botao.setAttribute("aria-busy", "true");
      botao.setAttribute("aria-disabled", "true");
      botao.dataset.antes = botao.innerHTML;
      botao.innerHTML = '<span class="giro" aria-hidden="true"></span>Enviando o pedido…';
    } else {
      botao.removeAttribute("aria-busy");
      botao.removeAttribute("aria-disabled");
      if (botao.dataset.antes) botao.innerHTML = botao.dataset.antes;
    }
  }
  if (status) status.textContent = sim ? "Enviando o pedido…" : "";
}

function enviado(nome: string, escritorio: string, email: string, whats: string, tamanho: string) {
  if (!cartao) return;
  const primeiro = nome.split(" ")[0];
  const equipe = tamanho === "Só eu" ? "Só eu" : `${tamanho} pessoas`;
  cartao.innerHTML = `<div class="sucesso" role="status" tabindex="-1"><span class="disco"><svg class="ico" aria-hidden="true"><use href="#i-check"/></svg></span><h2 id="t-form">Pedido recebido, ${esc(primeiro)}.</h2>
<p>A nossa equipe responde em até 1 dia útil, pelo e-mail ou pelo WhatsApp que você deixou, para marcar um horário. Mandamos uma cópia do pedido para o seu e-mail.</p>
<dl class="resumo"><div><dt>Escritório</dt><dd>${esc(escritorio)}</dd></div><div><dt>E-mail</dt><dd>${esc(email)}</dd></div><div><dt>WhatsApp</dt><dd>${esc(whats)}</dd></div><div><dt>Equipe</dt><dd>${esc(equipe)}</dd></div></dl>
<p>Enquanto isso, veja <a href="/como-funciona">como o T3jus funciona</a>, etapa por etapa.</p></div>`;
  (cartao.querySelector(".sucesso") as HTMLElement).focus();
}

let enviando = false;
form?.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  if (enviando) return;
  limparErros();
  const dados = Object.fromEntries(new FormData(form).entries());
  const pedido = normalizar({ ...dados, aceite: (form.elements.namedItem("aceite") as HTMLInputElement).checked });
  const erros = validar(pedido);
  if (Object.keys(erros).length) return mostrarErros(erros);

  const busca = new URLSearchParams(location.search);
  const origem = {
    pagina: location.pathname,
    referencia: document.referrer ? new URL(document.referrer).hostname : "",
    campanha: busca.get("utm_campaign") ?? "",
    fonte: busca.get("utm_source") ?? "",
    meio: busca.get("utm_medium") ?? "",
  };
  enviando = true;
  ocupado(true);
  try {
    const r = await fetch(form.action, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...pedido, site: dados.site ?? "", tempo: Date.now() - abertoEm, origem }),
    });
    if (r.ok) return enviado(pedido.nome, pedido.escritorio, pedido.email, pedido.whats, pedido.tamanho);
    ocupado(false);
    if (r.status === 422) {
      const corpo = (await r.json().catch(() => ({}))) as { erros?: Erros };
      if (corpo.erros && Object.keys(corpo.erros).length) return mostrarErros(corpo.erros);
    }
    if (r.status === 429) return falha("Recebemos muitos pedidos seguidos daqui.");
    falha("O pedido não chegou até nós.");
  } catch {
    ocupado(false);
    falha("A conexão caiu antes de o pedido chegar.");
  } finally {
    enviando = false;
  }
});
