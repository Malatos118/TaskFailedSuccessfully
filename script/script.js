/**
 * Task Flow — Profils d'espaces, Priorités & Gestion de tâches (Compact & Optimisé)
 */
"use strict";

const STORAGE_KEY = "taskflow_data";
const SESSION_KEY = "taskflow_password_session";
const PRIORITIES = {
  high: { label: "Haute", icon: "🔴", weight: 1, next: "medium" },
  medium: { label: "Moyenne", icon: "🟡", weight: 2, next: "low" },
  low: { label: "Basse", icon: "🟢", weight: 3, next: "high" },
};

const accountPrefix = "taskflow_account:";
const accountKey = email => accountPrefix + email.toLowerCase();

function emptyWorkspace() {
  return {
    profile: null,
    workspaces: { "💼 Pro": [], "🎓 Étudiant": [], "🏠 Perso": [] },
  };
}

function loadData() {
  const def = emptyWorkspace();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
    const old = localStorage.getItem("taskflow_simple_tasks");
    if (old) def.workspaces["💼 Pro"] = JSON.parse(old);
    return def;
  } catch {
    return def;
  }
}

const legacy = loadData();
let data = legacy;
function findAccount(email) {
  if (!email) return null;
  const stored = localStorage.getItem(accountKey(email));
  if (stored) return JSON.parse(stored);
  return legacy.account?.credentials && accountKey(legacy.account.email) === accountKey(email)
    ? legacy : null;
}
let currentFilter = "all";
let editingTask = null;

const $ = (id) => document.getElementById(id);
const profileSubtitle = $("profile-subtitle");
const loginPanel = $("login-panel");
const loginForm = $("login-form");
const loginError = $("login-error");
const signOut = $("sign-out");
const taskForm = $("task-form");
const taskInput = $("task-input");
const taskDueDate = $("task-due-date");
const taskSubmit = $("task-submit");
const cancelTaskEdit = $("cancel-task-edit");
const prioritySelect = $("priority-select");
const priorityFilters = $("priority-filters");
const taskList = $("task-list");
const taskCount = $("task-count");
const emptyState = $("empty-state");
const clearCompletedBtn = $("clear-completed-btn");

const getTasks = () => data.workspaces[data.profile] || (data.workspaces[data.profile] = []);
const save = () => localStorage.setItem(accountKey(data.account.email), JSON.stringify(data));
const HTML_ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => HTML_ENTITIES[char]);

function openWorkspace() {
  $("profile-setup").hidden = true;
  loginPanel.hidden = true;
  signOut.hidden = false;
  $("task-workspace").hidden = false;
  profileSubtitle.textContent = data.account
    ? `${data.account.name} · Espace ${data.profile}`
    : `Espace ${data.profile}`;
  render();
  taskInput.focus();
}

function showLogin() {
  $("profile-setup").hidden = true;
  $("task-workspace").hidden = true;
  signOut.hidden = true;
  profileSubtitle.textContent = "";
  loginForm.reset();
  loginError.hidden = true;
  loginPanel.hidden = false;
  loginForm.elements.email.focus();
}

function signIn() {
  sessionStorage.setItem(SESSION_KEY, data.account.email);
  openWorkspace();
}

async function hashPassword(password, salt) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits({
    name: "PBKDF2", hash: "SHA-256", salt: Uint8Array.from(salt), iterations: 600000,
  }, key, 256);
  return Array.from(new Uint8Array(bits)).join(",");
}

const passwordRules = [
  ["De 8 à 128 caractères", password => password.length >= 8 && password.length <= 128],
  ["Une lettre majuscule", password => /\p{Lu}/u.test(password)],
  ["Une lettre minuscule", password => /\p{Ll}/u.test(password)],
  ["Un chiffre", password => /\p{Nd}/u.test(password)],
  ["Un caractère spécial", password => /[\p{P}\p{S}]/u.test(password)],
  ["Évite les suites courantes et les motifs répétés", password =>
    !/^(.{1,5})\1+$/iu.test(password) &&
    !/^(?:123456|azerty|qwerty|password|motdepasse|admin)[\d!?.]*$/i.test(password)],
];

function passwordStrength(password, missingRule) {
  if (missingRule) return [1, `Condition à remplir : ${missingRule}.`];
  return password.length >= 20
    ? [3, "Robustesse estimée : élevée."]
    : [2, "Longueur suffisante. Quelques caractères de plus peuvent aider."];
}

loginForm.onsubmit = async (event) => {
  event.preventDefault();
  const button = event.submitter;
  if (button.disabled) return;
  const email = loginForm.elements.email.value.trim();

  button.disabled = true;
  loginError.hidden = true;
  try {
    const candidate = findAccount(email);
    const credentials = candidate?.account.credentials;
    if (credentials &&
        await hashPassword(loginForm.elements.password.value, credentials.salt) === credentials.hash) {
      data = candidate;
      loginForm.reset();
      signIn();
      return;
    }
    loginError.hidden = false;
  } catch {
    loginError.hidden = false;
  } finally {
    button.disabled = false;
  }
};

signOut.onclick = () => {
  sessionStorage.removeItem(SESSION_KEY);
  resetTaskForm();
  priorityFilters.querySelector('[data-filter="all"]').click();
  taskList.replaceChildren();
  showLogin();
};

const dateFormat = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" });
function localDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function render() {
  const tasks = getTasks();
  const today = localDateKey(new Date());
  const counts = { all: tasks.length, high: 0, medium: 0, low: 0, completed: 0 };
  const visible = [];
  for (const task of tasks) {
    if (task.completed) counts.completed++;
    if (Object.hasOwn(PRIORITIES, task.priority)) counts[task.priority]++;
    if (currentFilter === "all" || task.priority === currentFilter) visible.push(task);
  }

  Object.keys(counts).forEach((k) => {
    const el = $("count-" + k);
    if (el) el.textContent = counts[k];
  });

  visible.sort(
    (a, b) => (a.completed - b.completed) ||
      (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31") ||
      ((PRIORITIES[a.priority]?.weight || 2) - (PRIORITIES[b.priority]?.weight || 2))
  );

  emptyState.classList.toggle("hidden", visible.length > 0);
  taskList.innerHTML = visible.map((t) => {
    const p = PRIORITIES[t.priority] || PRIORITIES.medium;
    const due = t.dueDate && new Date(`${t.dueDate}T12:00:00`);
    const status = !t.completed && t.dueDate < today ? "En retard"
      : !t.completed && t.dueDate === today ? "Aujourd’hui" : "";
    const deadline = due && Number.isFinite(due.getTime())
      ? `<time class="task-date ${status ? "task-date-urgent" : ""}" datetime="${esc(t.dueDate)}">${dateFormat.format(due)}${status ? ` · ${status}` : ""}</time>`
      : "";
    return `
      <li class="task-item ${t.completed ? "completed" : ""}" data-id="${t.id}">
        <input type="checkbox" class="task-checkbox" ${t.completed ? "checked" : ""}>
        <div class="task-summary">
          <span class="task-title" data-act="edit" title="Cliquer pour modifier">${esc(t.title)}</span>
          ${deadline}
        </div>
        <span class="badge priority-${t.priority}" data-act="prio" title="Changer la priorité">${p.icon} ${p.label}</span>
        <button type="button" class="btn icon-btn" data-act="edit" title="Modifier">✏️</button>
        <button type="button" class="btn danger-icon" data-act="del" title="Supprimer">×</button>
      </li>
    `;
  }).join("");

  const remaining = counts.all - counts.completed;
  taskCount.textContent = counts.all === 0 ? "0 tâche" : `${remaining} restante${remaining > 1 ? "s" : ""}${counts.completed ? ` · ${counts.completed} terminée${counts.completed > 1 ? "s" : ""}` : ""}`;
  clearCompletedBtn.classList.toggle("hidden", counts.completed === 0);
}

function resetTaskForm() {
  editingTask = null;
  taskForm.reset();
  taskSubmit.textContent = "Ajouter";
  cancelTaskEdit.hidden = true;
}

cancelTaskEdit.onclick = () => {
  resetTaskForm();
  taskInput.focus();
};

taskForm.onsubmit = (e) => {
  e.preventDefault();
  const title = taskInput.value.trim();
  if (!title) return;
  const fields = { title, priority: prioritySelect.value, dueDate: taskDueDate.value };
  if (editingTask) {
    Object.assign(editingTask, fields);
  } else {
    getTasks().unshift({ id: crypto.randomUUID(), ...fields, completed: false });
  }
  save();
  render();
  resetTaskForm();
  taskInput.focus();
};

// Actions déléguées (supprimer, priorité, cocher)
taskList.onclick = (e) => {
  const li = e.target.closest(".task-item");
  if (!li) return;
  const tasks = getTasks();
  const task = tasks.find((t) => t.id === li.dataset.id);
  if (!task) return;

  const act = e.target.dataset.act;
  if (act === "del") {
    if (editingTask === task) resetTaskForm();
    data.workspaces[data.profile] = tasks.filter((t) => t.id !== task.id);
  } else if (act === "edit") {
    editingTask = task;
    taskInput.value = task.title;
    prioritySelect.value = task.priority;
    taskDueDate.value = task.dueDate || "";
    taskSubmit.textContent = "Enregistrer";
    cancelTaskEdit.hidden = false;
    taskInput.focus();
    return;
  } else if (act === "prio") {
    task.priority = PRIORITIES[task.priority]?.next || "medium";
  } else if (e.target.classList.contains("task-checkbox")) {
    task.completed = e.target.checked;
  } else return;

  save();
  render();
};

// Filtres
priorityFilters.onclick = (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;
  priorityFilters.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
  chip.classList.add("active");
  currentFilter = chip.dataset.filter;
  render();
};

// Vider les terminées
clearCompletedBtn.onclick = () => {
  if (editingTask?.completed) resetTaskForm();
  data.workspaces[data.profile] = getTasks().filter((t) => !t.completed);
  save();
  render();
};

function showRegistration(workspace, canReturn) {
  loginPanel.hidden = true;
  $("back-to-login").hidden = !canReturn;
  const choices = $("profile-choices");
  const options = $("profile-options");
  const accountError = $("account-error");
  choices.reset();
  options.replaceChildren();
  accountError.hidden = true;
  const passwordInput = choices.elements.password;
  const ruleList = $("password-rules");
  const ruleItems = passwordRules.map(() => document.createElement("li"));
  ruleList.replaceChildren(...ruleItems);
  const confirmation = choices.elements.passwordConfirmation;
  confirmation.setCustomValidity("");
  function checkConfirmation() {
    confirmation.setCustomValidity(
      confirmation.value && confirmation.value !== passwordInput.value
        ? "Les mots de passe doivent être identiques."
        : ""
    );
    return confirmation.validity.valid;
  }
  function updatePasswordStrength() {
    const password = passwordInput.value;
    let missingRule;
    passwordRules.forEach(([label, passes], index) => {
      const valid = Boolean(password) && passes(password);
      if (!valid && !missingRule) missingRule = label;
      ruleItems[index].textContent = `${valid ? "✓" : "○"} ${label}`;
      ruleItems[index].classList.toggle("met", valid);
    });
    const [score, message] = passwordStrength(password, missingRule);
    $("password-meter").value = password ? score : 0;
    $("password-strength").textContent = password ? message : "";
    const error = password && score < 2 ? message : "";
    passwordInput.setCustomValidity(error);
    return !error && score >= 2;
  }
  passwordInput.oninput = () => {
    updatePasswordStrength();
    checkConfirmation();
  };
  confirmation.oninput = checkConfirmation;
  updatePasswordStrength();
  if (workspace.account) {
    $("profile-heading").textContent = "Ajoute un mot de passe";
    choices.elements.name.value = workspace.account.name;
    choices.elements.email.value = workspace.account.email;
    choices.querySelector("button").textContent = "Enregistrer le mot de passe";
  }
  const descriptions = {
    "💼 Pro": "Projets, réunions et échéances.",
    "🎓 Étudiant": "Cours, révisions et devoirs.",
    "🏠 Perso": "Courses, projets et quotidien.",
  };
  if (workspace.profile) {
    $("profile-picker").hidden = true;
    $("account-intro").textContent = `Renseigne tes coordonnées pour créer ton compte et conserver ton espace ${workspace.profile}.`;
  }
  for (const profile of workspace.profile ? [] : Object.keys(workspace.workspaces)) {
    const card = document.createElement("label");
    card.className = "profile-card";
    const [icon, name] = profile.split(" ");
    card.innerHTML = `
      <span class="profile-icon" aria-hidden="true">${esc(icon)}</span>
      <span class="profile-details">
        <strong>${esc(name)}</strong>
        <span>${esc(descriptions[profile])}</span>
      </span>
      <input type="radio" name="profile" value="${esc(profile)}" required>
    `;
    options.append(card);
  }
  choices.onsubmit = async (event) => {
    event.preventDefault();
    const button = event.submitter;
    if (button.disabled) return;
    if (!updatePasswordStrength()) {
      passwordInput.reportValidity();
      return;
    }
    if (!checkConfirmation()) {
      confirmation.reportValidity();
      return;
    }
    const fields = new FormData(choices);
    const profile = workspace.profile || fields.get("profile");
    if (!Object.hasOwn(workspace.workspaces, profile)) return;
    button.disabled = true;
    accountError.hidden = true;
    try {
      const salt = Array.from(crypto.getRandomValues(new Uint8Array(16)));
      const hash = await hashPassword(fields.get("password"), salt);
      if ($("profile-setup").hidden) return;
      const email = fields.get("email").trim();
      if (findAccount(email)) {
        accountError.textContent = "Cette adresse e-mail est déjà utilisée.";
        accountError.hidden = false;
        return;
      }
      const account = {
        name: fields.get("name").trim(),
        email,
        credentials: { salt, hash },
      };
      const updatedData = { ...workspace, account, profile };
      localStorage.setItem(accountKey(email), JSON.stringify(updatedData));
      data = updatedData;
      choices.reset();
      signIn();
    } catch {
      accountError.textContent = "Impossible d’enregistrer ce compte dans ce navigateur.";
      accountError.hidden = false;
    } finally {
      button.disabled = false;
    }
  };
  $("profile-setup").hidden = false;
}

$("new-account").onclick = () => showRegistration(emptyWorkspace(), true);
$("back-to-login").onclick = showLogin;

const sessionAccount = findAccount(sessionStorage.getItem(SESSION_KEY));
if (sessionAccount) {
  data = sessionAccount;
  openWorkspace();
} else if (legacy.account?.credentials || Object.keys(localStorage).some(key => key.startsWith(accountPrefix))) {
  showLogin();
} else {
  showRegistration(legacy, false);
}
