const $ = id => document.getElementById(id);
const storageKey = "focus-station-tasks-v1";
let tasks = [];

// 验证本地数据，避免损坏的记录影响页面。
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) || "[]");

  if (Array.isArray(saved)) {
    tasks = saved.filter(task =>
      task &&
      typeof task.id === "string" &&
      typeof task.text === "string" &&
      typeof task.done === "boolean"
    );
  }
} catch {
  $("notice").textContent = "暂时无法读取历史记录，仍可正常添加任务。";
}

function saveTasks() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(tasks));
    $("notice").textContent = "";
  } catch {
    $("notice").textContent = "浏览器未能保存数据，关闭页面后任务可能丢失。";
  }
}

function renderTasks() {
  $("taskList").replaceChildren();

  for (const task of tasks) {
    const item = document.createElement("li");
    item.classList.toggle("done", task.done);

    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;

    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      saveTasks();
      renderTasks();
    });

    const text = document.createElement("span");
    text.textContent = task.text;
    label.append(checkbox, text);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "delete";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `删除任务：${task.text}`);

    remove.addEventListener("click", () => {
      tasks = tasks.filter(t => t.id !== task.id);
      saveTasks();
      renderTasks();
    });

    item.append(label, remove);
    $("taskList").append(item);
  }

  const completed = tasks.filter(task => task.done).length;
  $("count").textContent = `${completed} / ${tasks.length} 完成`;
  $("progress").style.width =
    `${tasks.length ? completed / tasks.length * 100 : 0}%`;
  $("empty").hidden = tasks.length > 0;
}

$("taskForm").addEventListener("submit", event => {
  event.preventDefault();

  const text = $("taskInput").value.trim();
  if (!text) return;

  tasks.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    text,
    done: false
  });

  saveTasks();
  renderTasks();
  $("taskInput").value = "";
  $("taskInput").focus();
});

let mode = "focus";
let duration = 25 * 60;
let remaining = duration;
let running = false;
let deadline = 0;
let interval = null;

function renderTimer() {
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");
  const display = `${minutes}:${seconds}`;

  $("time").textContent = display;
  document.title = running ? `${display} · 专注小站` : "专注小站";

  const progress = (1 - remaining / duration) * 100;
  $("clock").style.background =
    `conic-gradient(var(--accent) ${progress}%, var(--line) ${progress}%)`;

  $("toggle").textContent = running
    ? "暂停"
    : remaining === 0
      ? "再来一轮"
      : remaining < duration
        ? "继续"
        : mode === "focus" ? "开始专注" : "开始休息";
}

function tick() {
  // 使用截止时间计算，减少后台标签页限速带来的计时偏差。
  remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

  if (remaining === 0) {
    running = false;
    clearInterval(interval);

    $("timerStatus").textContent = mode === "focus"
      ? "这一轮完成了，起来活动一下吧！"
      : "休息结束，准备迎接下一个小目标。";
  }

  renderTimer();
}

function resetTimer(nextMode = mode) {
  clearInterval(interval);
  mode = nextMode;
  running = false;
  duration = mode === "focus" ? 25 * 60 : 5 * 60;
  remaining = duration;

  $("focusMode").setAttribute("aria-pressed", String(mode === "focus"));
  $("breakMode").setAttribute("aria-pressed", String(mode === "break"));
  $("timerStatus").textContent = mode === "focus"
    ? "准备好开始了吗？"
    : "让大脑放个小假。";

  renderTimer();
}

$("toggle").addEventListener("click", () => {
  if (running) {
    tick();

    if (running) {
      running = false;
      clearInterval(interval);
      $("timerStatus").textContent = "已暂停，按自己的节奏来。";
    }
  } else {
    if (remaining === 0) remaining = duration;

    deadline = Date.now() + remaining * 1000;
    running = true;

    $("timerStatus").textContent = mode === "focus"
      ? "专注当下，你正在向前。"
      : "放松一下，看看远处。";

    interval = setInterval(tick, 250);
  }

  renderTimer();
});

$("reset").addEventListener("click", () => resetTimer());
$("focusMode").addEventListener("click", () => resetTimer("focus"));
$("breakMode").addEventListener("click", () => resetTimer("break"));

document.addEventListener("visibilitychange", () => {
  if (running) tick();
});

renderTasks();
renderTimer();
