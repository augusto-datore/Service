const STORAGE_KEY = "serviceDeskTickets";

const seedTickets = [
  {
    id: 1001,
    requester: "Marina Costa",
    email: "marina.costa@empresa.com",
    category: "Acesso",
    priority: "Alta",
    status: "Aberto",
    title: "Senha expirada no sistema de vendas",
    description: "Ao tentar entrar no sistema de vendas, recebo a mensagem de senha expirada e não consigo redefinir pelo portal.",
    correction: "",
    createdAt: "2026-06-18T11:20:00.000Z",
    updatedAt: "2026-06-18T11:20:00.000Z",
    events: ["Chamado aberto por Marina Costa."]
  },
  {
    id: 1002,
    requester: "Rafael Lima",
    email: "rafael.lima@empresa.com",
    category: "Hardware",
    priority: "Média",
    status: "Em atendimento",
    title: "Notebook reiniciando sozinho",
    description: "O notebook reinicia durante reuniões e apresentações. Isso ocorreu quatro vezes nesta semana.",
    correction: "Equipamento em análise para troca preventiva de memória.",
    createdAt: "2026-06-17T14:40:00.000Z",
    updatedAt: "2026-06-18T09:15:00.000Z",
    events: [
      "Chamado aberto por Rafael Lima.",
      "Status alterado para Em atendimento."
    ]
  }
];

const allowedStatuses = [
  "Aberto",
  "Em atendimento",
  "Aguardando usuário",
  "Resolvido"
];

const allowedPriorities = ["Baixa", "Média", "Alta", "Crítica"];

let tickets = loadTickets();
let selectedTicketId = tickets[0]?.id ?? null;
let toastTimeout;

const views = document.querySelectorAll(".view");
const tabs = document.querySelectorAll(".tab");
const ticketForm = document.querySelector("#ticketForm");
const ticketList = document.querySelector("#ticketList");
const ticketDetails = document.querySelector("#ticketDetails");
const ticketCounter = document.querySelector("#ticketCounter");
const historyTable = document.querySelector("#historyTable");
const searchInput = document.querySelector("#searchInput");
const clearData = document.querySelector("#clearData");
const toast = document.querySelector("#toast");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const targetView = document.getElementById(tab.dataset.view);
    if (!targetView) return;

    tabs.forEach((item) => {
      item.classList.remove("is-active");
      item.setAttribute("aria-selected", "false");
    });

    views.forEach((view) => view.classList.remove("is-active"));

    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");
    targetView.classList.add("is-active");
    render();
  });
});

ticketForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const requester = document.querySelector("#requester").value.trim();
  const email = document.querySelector("#email").value.trim();
  const category = document.querySelector("#category").value;
  const priority = document.querySelector("#priority").value;
  const title = document.querySelector("#title").value.trim();
  const description = document.querySelector("#description").value.trim();

  if (!requester || !email || !category || !priority || !title || !description) {
    showToast("Preencha todos os campos antes de enviar.");
    return;
  }

  const now = new Date().toISOString();

  const newTicket = {
    id: nextId(),
    requester,
    email,
    category,
    priority,
    status: "Aberto",
    title,
    description,
    correction: "",
    createdAt: now,
    updatedAt: now,
    events: [`Chamado aberto por ${requester}.`]
  };

  tickets.unshift(newTicket);
  selectedTicketId = newTicket.id;

  if (!saveTickets()) {
    tickets.shift();
    selectedTicketId = tickets[0]?.id ?? null;
    return;
  }

  ticketForm.reset();
  showToast(`Chamado #${newTicket.id} aberto com sucesso.`);
  render();
});

searchInput.addEventListener("input", renderTicketList);

clearData.addEventListener("click", () => {
  const confirmed = window.confirm(
    "Isso apagará os chamados salvos neste navegador e restaurará os dados de demonstração. Deseja continuar?"
  );

  if (!confirmed) return;

  const previousTickets = tickets;
  tickets = seedTickets.map((ticket) => ({
    ...ticket,
    events: [...ticket.events]
  }));
  selectedTicketId = tickets[0]?.id ?? null;

  if (!saveTickets()) {
    tickets = previousTickets;
    selectedTicketId = tickets[0]?.id ?? null;
    render();
    return;
  }

  showToast("Base local restaurada.");
  render();
});

function loadTickets() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      const initialTickets = seedTickets.map((ticket) => ({
        ...ticket,
        events: [...ticket.events]
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialTickets));
      return initialTickets;
    }

    const parsedTickets = JSON.parse(stored);

    if (!Array.isArray(parsedTickets)) {
      throw new Error("O conteúdo salvo não é uma lista de chamados.");
    }

    return parsedTickets.filter(isValidTicket);
  } catch (error) {
    console.error("Não foi possível carregar os chamados:", error);
    showToast("Não foi possível ler os dados salvos. A base de demonstração será carregada.");

    return seedTickets.map((ticket) => ({
      ...ticket,
      events: [...ticket.events]
    }));
  }
}

function isValidTicket(ticket) {
  return (
    ticket &&
    Number.isFinite(Number(ticket.id)) &&
    typeof ticket.requester === "string" &&
    typeof ticket.title === "string" &&
    typeof ticket.status === "string" &&
    typeof ticket.priority === "string" &&
    typeof ticket.createdAt === "string" &&
    typeof ticket.updatedAt === "string"
  );
}

function saveTickets() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
    return true;
  } catch (error) {
    console.error("Não foi possível salvar os chamados:", error);
    showToast("Erro ao salvar. Verifique o armazenamento do navegador.");
    return false;
  }
}

function nextId() {
  if (tickets.length === 0) return 1001;

  const highestId = Math.max(
    ...tickets.map((ticket) => Number(ticket.id) || 0)
  );

  return highestId + 1;
}

function render() {
  renderTicketList();
  renderTicketDetails();
  renderHistory();
}

function renderTicketList() {
  const term = searchInput.value.trim().toLocaleLowerCase("pt-BR");

  const filteredTickets = tickets.filter((ticket) => {
    const searchableText = [
      ticket.id,
      ticket.title,
      ticket.requester
    ].join(" ").toLocaleLowerCase("pt-BR");

    return searchableText.includes(term);
  });

  ticketCounter.textContent =
    `${filteredTickets.length} chamado${filteredTickets.length === 1 ? "" : "s"}`;

  if (filteredTickets.length === 0) {
    ticketList.innerHTML =
      '<div class="empty-state"><p>Nenhum chamado encontrado.</p></div>';
    return;
  }

  ticketList.innerHTML = filteredTickets.map((ticket) => `
    <button
      class="ticket-card ${ticket.id === selectedTicketId ? "is-selected" : ""}"
      data-ticket-id="${Number(ticket.id)}"
      type="button"
      aria-pressed="${ticket.id === selectedTicketId}"
    >
      <span class="ticket-title">#${Number(ticket.id)} - ${escapeHtml(ticket.title)}</span>
      <span class="ticket-meta">${escapeHtml(ticket.requester)} • ${formatDate(ticket.updatedAt)}</span>
      <span class="badge-row">
        <span class="badge ${statusClass(ticket.status)}">${escapeHtml(ticket.status)}</span>
        <span class="badge ${priorityClass(ticket.priority)}">${escapeHtml(ticket.priority)}</span>
      </span>
    </button>
  `).join("");

  ticketList.querySelectorAll(".ticket-card").forEach((card) => {
    card.addEventListener("click", () => {
      selectedTicketId = Number(card.dataset.ticketId);
      renderTicketList();
      renderTicketDetails();
    });
  });
}

function renderTicketDetails() {
  const ticket = tickets.find((item) => Number(item.id) === selectedTicketId);

  if (!ticket) {
    ticketDetails.innerHTML = `
      <div class="empty-state">
        <h3>Selecione um chamado</h3>
        <p>Ao escolher um item da fila, os campos de status, prioridade e correção aparecem aqui.</p>
      </div>
    `;
    return;
  }

  const events = Array.isArray(ticket.events) ? ticket.events : [];

  ticketDetails.innerHTML = `
    <div class="details-header">
      <div>
        <p class="eyebrow">Chamado #${Number(ticket.id)}</p>
        <h3>${escapeHtml(ticket.title)}</h3>
        <p class="ticket-meta">Aberto por ${escapeHtml(ticket.requester)} em ${formatDate(ticket.createdAt)}</p>
      </div>
      <span class="badge ${statusClass(ticket.status)}">${escapeHtml(ticket.status)}</span>
    </div>

    <div class="details-grid">
      <label>
        Status
        <select id="detailStatus">
          ${allowedStatuses.map((status) => `
            <option value="${escapeHtml(status)}" ${ticket.status === status ? "selected" : ""}>
              ${escapeHtml(status)}
            </option>
          `).join("")}
        </select>
      </label>
      <label>
        Prioridade
        <select id="detailPriority">
          ${allowedPriorities.map((priority) => `
            <option value="${escapeHtml(priority)}" ${ticket.priority === priority ? "selected" : ""}>
              ${escapeHtml(priority)}
            </option>
          `).join("")}
        </select>
      </label>
    </div>

    <label class="correction-label">
      Descrever correção
      <textarea id="detailCorrection" rows="5" placeholder="Informe a solução aplicada ou próxima ação.">${escapeHtml(ticket.correction || "")}</textarea>
    </label>

    <div class="description-box">
      <strong>Descrição do usuário</strong>
      <p>${escapeHtml(ticket.description || "")}</p>
      <p class="ticket-meta">${escapeHtml(ticket.category || "")} • ${escapeHtml(ticket.email || "")}</p>
    </div>

    <div class="form-actions">
      <button class="primary" id="saveTicket" type="button">Salvar alterações</button>
    </div>

    <div class="history-box">
      <strong>Histórico deste chamado</strong>
      <ul>
        ${events.length
          ? events.map((item) => `<li class="history-line">${escapeHtml(item)}</li>`).join("")
          : "<li class='history-line'>Nenhuma atualização registrada.</li>"}
      </ul>
    </div>
  `;

  document.querySelector("#saveTicket").addEventListener("click", () => {
    updateSelectedTicket(ticket.id);
  });
}

function updateSelectedTicket(ticketId) {
  const ticket = tickets.find((item) => Number(item.id) === Number(ticketId));
  if (!ticket) return;

  const newStatus = document.querySelector("#detailStatus").value;
  const newPriority = document.querySelector("#detailPriority").value;
  const newCorrection = document.querySelector("#detailCorrection").value.trim();

  const eventList = [];

  if (ticket.status !== newStatus) {
    eventList.push(`Status alterado de ${ticket.status} para ${newStatus}.`);
  }

  if (ticket.priority !== newPriority) {
    eventList.push(`Prioridade alterada de ${ticket.priority} para ${newPriority}.`);
  }

  if (ticket.correction !== newCorrection) {
    eventList.push(
      newCorrection
        ? `Correção registrada: ${newCorrection}`
        : "Registro de correção removido."
    );
  }

  if (eventList.length === 0) {
    showToast("Nenhuma alteração foi realizada.");
    return;
  }

  const previousTicket = { ...ticket, events: [...(ticket.events || [])] };

  ticket.status = newStatus;
  ticket.priority = newPriority;
  ticket.correction = newCorrection;
  ticket.updatedAt = new Date().toISOString();
  ticket.events = [...(ticket.events || []), ...eventList];

  if (!saveTickets()) {
    Object.assign(ticket, previousTicket);
    render();
    return;
  }

  showToast(`Chamado #${ticket.id} atualizado.`);
  render();
}

function renderHistory() {
  if (tickets.length === 0) {
    historyTable.innerHTML =
      '<tr><td colspan="6" class="empty-table">Nenhum chamado registrado.</td></tr>';
    return;
  }

  historyTable.innerHTML = tickets.map((ticket) => `
    <tr>
      <td>#${Number(ticket.id)}</td>
      <td>${escapeHtml(ticket.title)}</td>
      <td>${escapeHtml(ticket.requester)}</td>
      <td><span class="badge ${statusClass(ticket.status)}">${escapeHtml(ticket.status)}</span></td>
      <td><span class="badge ${priorityClass(ticket.priority)}">${escapeHtml(ticket.priority)}</span></td>
      <td>${formatDate(ticket.updatedAt)}</td>
    </tr>
  `).join("");
}

function statusClass(status) {
  const classes = {
    "Aberto": "status-aberto",
    "Em atendimento": "status-em-atendimento",
    "Aguardando usuário": "status-aguardando-usuario",
    "Resolvido": "status-resolvido"
  };

  return classes[status] || "";
}

function priorityClass(priority) {
  const classes = {
    "Baixa": "priority-baixa",
    "Média": "priority-media",
    "Alta": "priority-alta",
    "Crítica": "priority-critica"
  };

  return classes[priority] || "";
}

function formatDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Data indisponível";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");

  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

render();
