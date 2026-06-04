const stateKey = "kolo-suisse-state";

const defaults = {
  dataVersion: 2,
  memberCount: 156,
  paidTotal: 15600,
  registeredTotal: 156,
  publicTotal: 8430,
  refundTotal: 0,
  selectedPlan: "donation",
  registrations: [{ id: "KOLO-70000", amount: 100, plan: "questionnaire", active: true }],
  votes: { yes: 1280, no: 214, skip: 396 },
  votedBy: {},
  authorizedId: "",
  topics: [
    {
      title: "Совместная ярмарка в Zurich",
      category: "Торговля",
      body: "Собираем производителей, ремесленников и координаторов для общей торговой площадки."
    },
    {
      title: "Конкурс Фонда поддержки талантов",
      category: "Совместный проект",
      body: "Готовим проекты на конкурс микрогрантов для членов кооператива."
    }
  ],
  activity: ["KOLO-70000 активен, базовый счетчик готов."]
};

let state = loadState();

const formatNumber = new Intl.NumberFormat("ru-RU");
const formatMoney = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "CHF",
  maximumFractionDigits: 0
});

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(stateKey));
    if (!saved) return structuredClone(defaults);

    if (saved.dataVersion !== defaults.dataVersion) {
      return {
        ...defaults,
        registrations: saved.registrations ?? defaults.registrations,
        votes: saved.votes ?? defaults.votes,
        votedBy: saved.votedBy ?? defaults.votedBy,
        topics: saved.topics ?? defaults.topics,
        activity: saved.activity ?? defaults.activity
      };
    }

    return { ...defaults, ...saved };
  } catch {
    return structuredClone(defaults);
  }
}

function saveState() {
  localStorage.setItem(stateKey, JSON.stringify(state));
}

function nextId() {
  const highest = state.registrations
    .map((entry) => Number(entry.id.replace("KOLO-", "")))
    .filter(Number.isFinite)
    .reduce((max, value) => Math.max(max, value), 70000);
  return `KOLO-${highest + 1}`;
}

function renderStats() {
  document.querySelector("#memberCount").textContent = formatNumber.format(state.memberCount);
  document.querySelector("#paidTotal").textContent = formatMoney.format(state.paidTotal);
  document.querySelector("#registeredTotal").textContent = formatNumber.format(state.registeredTotal);
  document.querySelector("#publicTotal").textContent = formatNumber.format(state.publicTotal);
  document.querySelector("#refundTotal").textContent = formatMoney.format(state.refundTotal);
  document.querySelector("#issuedId").textContent = state.registrations.at(-1)?.id ?? "KOLO-70000";
}

function renderPlans() {
  document.querySelectorAll(".plan").forEach((button) => {
    button.classList.toggle("active", button.dataset.plan === state.selectedPlan);
  });

  document.querySelectorAll(".conditional").forEach((field) => {
    const visibleFor = field.dataset.for.split(" ");
    field.hidden = !visibleFor.includes(state.selectedPlan);
  });
}

function renderActivity() {
  const list = document.querySelector("#activityLog");
  list.innerHTML = "";
  state.activity.slice(-4).reverse().forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    list.append(li);
  });
}

function renderVotes() {
  const labels = { yes: "Да", no: "Нет", skip: "Не компетентен" };
  const total = Object.values(state.votes).reduce((sum, value) => sum + value, 0);
  const bars = document.querySelector("#voteBars");
  bars.innerHTML = "";

  Object.entries(state.votes).forEach(([key, value]) => {
    const percent = total ? Math.round((value / total) * 100) : 0;
    const row = document.createElement("div");
    row.className = "bar-row";
    row.innerHTML = `
      <span>${labels[key]}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${percent}%"></span></span>
      <strong>${percent}%</strong>
    `;
    bars.append(row);
  });

  const authState = document.querySelector("#authState");
  authState.textContent = state.authorizedId
    ? `Статус: авторизован как ${state.authorizedId}.`
    : "Статус: не авторизован.";
}

function renderTopics() {
  const holder = document.querySelector("#topics");
  holder.innerHTML = "";
  state.topics.slice().reverse().forEach((topic) => {
    const item = document.createElement("article");
    item.className = "topic";
    item.innerHTML = `
      <small>${escapeHtml(topic.category)}</small>
      <strong>${escapeHtml(topic.title)}</strong>
      <span>${escapeHtml(topic.body)}</span>
    `;
    holder.append(item);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sync() {
  saveState();
  renderStats();
  renderPlans();
  renderActivity();
  renderVotes();
  renderTopics();
}

document.querySelectorAll(".plan").forEach((button) => {
  button.addEventListener("click", () => {
    state.selectedPlan = button.dataset.plan;
    renderPlans();
  });
});

document.querySelector("#joinForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const amount = Math.max(100, Number(data.get("amount") || 100));
  const id = nextId();

  state.memberCount += 1;
  state.paidTotal += amount;
  if (state.selectedPlan !== "donation") state.registeredTotal += 1;
  if (state.selectedPlan === "public") state.publicTotal += 1;

  state.registrations.push({
    id,
    amount,
    plan: state.selectedPlan,
    name: data.get("name"),
    email: data.get("email"),
    active: true
  });
  state.activity.push(
    state.selectedPlan === "donation"
      ? `${id}: поддержка ${amount} CHF подтверждена без оформления членства.`
      : `${id}: заявление члена принято, взнос ${amount} CHF подтвержден.`
  );
  event.currentTarget.reset();
  event.currentTarget.amount.value = 100;
  sync();
});

document.querySelector("#cancelButton").addEventListener("click", () => {
  const id = document.querySelector("#cancelId").value.trim().toUpperCase();
  const registration = state.registrations.find((entry) => entry.id === id);

  if (!registration || !registration.active) {
    state.activity.push(`${id || "ID"} не найден или уже аннулирован.`);
    sync();
    return;
  }

  registration.active = false;
  state.memberCount = Math.max(0, state.memberCount - 1);
  state.paidTotal = Math.max(0, state.paidTotal - registration.amount);
  state.refundTotal += registration.amount;
  state.activity.push(`${id} аннулирован, возврат ${registration.amount} CHF создан.`);
  sync();
});

document.querySelector("#loginButton").addEventListener("click", () => {
  const id = document.querySelector("#loginId").value.trim().toUpperCase();
  const registration = state.registrations.find(
    (entry) => entry.id === id && entry.active && entry.plan !== "donation"
  );
  state.authorizedId = registration ? id : "";
  if (!registration) state.activity.push(`${id || "ID"} не прошел авторизацию как член кооператива.`);
  sync();
});

document.querySelectorAll("[data-vote]").forEach((button) => {
  button.addEventListener("click", () => {
    if (!state.authorizedId) {
      state.activity.push("Голосование отклонено: нужна авторизация по ID.");
      sync();
      return;
    }

    if (state.votedBy[state.authorizedId]) {
      state.activity.push(`${state.authorizedId} уже голосовал.`);
      sync();
      return;
    }

    const vote = button.dataset.vote;
    state.votes[vote] += 1;
    state.votedBy[state.authorizedId] = vote;
    state.activity.push(`${state.authorizedId} проголосовал.`);
    sync();
  });
});

document.querySelector("#topicForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  state.topics.push({
    title: data.get("title"),
    category: data.get("category"),
    body: data.get("body")
  });
  state.activity.push("Новая тема опубликована на площадке общения.");
  event.currentTarget.reset();
  sync();
});

document.querySelector("#pollForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const question = String(data.get("question"));
  const mode = data.get("mode");
  const options = mode === "standard"
    ? ["Да", "Нет", "Не компетентен"]
    : buildContextOptions(question);

  document.querySelector("#pollPreview").innerHTML = `
    <strong>${escapeHtml(question)}</strong>
    ${options.map((option) => `<div class="poll-option">${escapeHtml(option)}</div>`).join("")}
  `;
});

function buildContextOptions(question) {
  const lower = question.toLowerCase();
  if (lower.includes("поддерж") || lower.includes("help")) {
    return ["Финансовая поддержка", "Правовая поддержка", "Интеграционная поддержка"];
  }
  if (lower.includes("работ") || lower.includes("job")) {
    return ["Поиск вакансий", "Признание квалификации", "Языковые курсы"];
  }
  if (lower.includes("жиль") || lower.includes("housing")) {
    return ["Временное жилье", "Долгосрочная аренда", "Консультация по договору"];
  }
  return ["Приоритет высокий", "Приоритет средний", "Нужно больше данных"];
}

document.querySelector("#postButton").addEventListener("click", () => {
  const draft = [
    "Кооператив «Коло» уже объединяет " + formatNumber.format(state.memberCount) + " участников и сторонников.",
    "Мы создаем рабочие места, развиваем совместное производство и торговлю, поддерживаем таланты и социальные проекты в Швейцарии.",
    "Стать членом кооператива или поддержать его работу можно через взнос от 100 CHF."
  ].join("\n\n");
  document.querySelector("#postDraft").textContent = draft;
});

sync();
