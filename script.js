(() => {
  // --- Constants & State ---
  const K_TPL = "bt.templates.v1";
  const K_DAYS = "bt.days.v1";
  const K_CFG = "bt.cfg.v1";

  // Translations
  const translations = {
    de: {
      // Static
      templates: "Templates",
      new: "+ Neu",
      regen: "Tagesplan generieren",
      regenWarn: "Warnung: Überschreibt den heutigen Plan komplett.",
      data: "Datenverwaltung",
      export: "Export",
      import: "Import",
      wipe: "Alles zurücksetzen",
      today: "Heute",
      history: "Verlauf (Letzte 7 Tage)",
      notifyTitle: "Benachrichtigungen aktivieren",
      soundTitle: "Sound an/aus",

      // Modals
      tplModalTitle: "Template bearbeiten",
      name: "Name",
      placeholder: "z. B. Deep Work",
      duration: "Dauer (Min)",
      reps: "Wdh.",
      cancel: "Abbrechen",
      save: "Speichern",
      confirmTitle: "Bestätigen",
      confirmText: "Bist du sicher?",
      confirmOk: "Bestätigen",

      // Dynamic / JS
      emptyTpl: "Keine Templates. Erstelle dein erstes!",
      addSingle: "+ Einmalig zu heute hinzufügen",
      delTplTitle: "Template löschen?",
      delTplText: (name) => `Möchtest du "${name}" wirklich löschen?`,
      tplDeleted: "Template gelöscht",
      addedToToday: "Zu heute hinzugefügt",

      emptyToday: "Heute steht nichts an. Generiere aus Templates oder füge einzelne hinzu.",
      done: "erledigt",
      running: "läuft",

      badgeTodo: "Offen",
      badgeRunning: "Läuft",
      badgePaused: "Pause",
      badgeDone: "Fertig",

      btnMarkDone: "Als erledigt markieren",
      btnReset: "Reset",
      btnStart: "Start",
      btnPause: "Pause",

      onlyOne: "Nur ein Timer gleichzeitig!",
      blockFinished: "Block beendet!",
      blockFinishedBody: (name) => `"${name}" ist fertig.`,

      wipeTitle: "Alles löschen?",
      wipeText: "Wirklich ALLES löschen?",
      exportStarted: "Export gestartet",
      importError: "Import fehlerhaft",
      emptyHistory: "Noch kein Verlauf.",
      resetLocked: (name) => `Erst '${name}' beenden oder zurücksetzen!`,
      errTotalExceeded: "24h Limit erreicht! Tagesplan ist voll.",
      errBlockTooLong: "Block darf max. 24h lang sein.",
    },
    en: {
      templates: "Templates",
      new: "+ New",
      regen: "Generate Daily Plan",
      regenWarn: "Warning: Overwrites today's plan completely.",
      data: "Data Management",
      export: "Export",
      import: "Import",
      wipe: "Reset Everything",
      today: "Today",
      history: "History (Last 7 Days)",
      notifyTitle: "Enable Notifications",
      soundTitle: "Toggle Sound",

      tplModalTitle: "Edit Template",
      name: "Name",
      placeholder: "e.g. Deep Work",
      duration: "Duration (Min)",
      reps: "Reps",
      cancel: "Cancel",
      save: "Save",
      confirmTitle: "Confirm",
      confirmText: "Are you sure?",
      confirmOk: "Confirm",

      emptyTpl: "No templates. Create your first!",
      addSingle: "+ Add single block to today",
      delTplTitle: "Delete Template?",
      delTplText: (name) => `Really delete "${name}"?`,
      tplDeleted: "Template deleted",
      addedToToday: "Added to today",

      emptyToday: "Nothing planned. Generate from templates or add single blocks.",
      done: "done",
      running: "running",

      badgeTodo: "Todo",
      badgeRunning: "Running",
      badgePaused: "Paused",
      badgeDone: "Done",

      btnMarkDone: "Mark as done",
      btnReset: "Reset",
      btnStart: "Start",
      btnPause: "Pause",

      onlyOne: "Only one timer at a time!",
      blockFinished: "Block finished!",
      blockFinishedBody: (name) => `"${name}" is done.`,

      wipeTitle: "Delete everything?",
      wipeText: "Really delete EVERYTHING?",
      exportStarted: "Export started",
      importError: "Import failed",
      emptyHistory: "No history yet.",
      resetLocked: (name) => `Finish or reset '${name}' first!`,
      errTotalExceeded: "24h limit reached! Day plan is full.",
      errBlockTooLong: "Block max duration is 24h.",
    }
  };

  // Elements
  const $ = (id) => document.getElementById(id);

  // State
  let templates = [];
  let days = {};
  let cfg = { sound: true, notifications: false, lang: "de" }; // Default lang
  let audioCtx = null;

  // --- Helpers ---
  const t = (key, ...args) => {
    const val = translations[cfg.lang][key];
    if (typeof val === "function") return val(...args);
    return val || key;
  };

  // --- Helpers ---
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const pad = (n) => String(n).padStart(2, "0");
  const dateKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const formatDate = (d) => new Date(d).toLocaleDateString(cfg.lang === "de" ? "de-DE" : "en-US", { weekday: "short", day: "numeric", month: "long" });
  const formatTime = (ms) => {
    if (!ms || ms < 0) return "00:00";
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    if (m >= 60) {
      const h = Math.floor(m / 60);
      return `${h}:${pad(m % 60)}:${pad(sec)}`;
    }
    return `${pad(m)}:${pad(sec)}`;
  };

  const formatDuration = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  };

  // --- Storage ---
  const load = () => {
    try {
      templates = JSON.parse(localStorage.getItem(K_TPL)) || [];
      days = JSON.parse(localStorage.getItem(K_DAYS)) || {};
      cfg = { ...cfg, ...JSON.parse(localStorage.getItem(K_CFG) || "{}") };
    } catch (e) { console.error("Load error", e); }
  };
  const save = () => {
    localStorage.setItem(K_TPL, JSON.stringify(templates));
    localStorage.setItem(K_DAYS, JSON.stringify(days));
    localStorage.setItem(K_CFG, JSON.stringify(cfg));
  };

  // --- Toast & Modal ---
  const toast = (msg, duration = 3000) => {
    const t = $("toast");
    t.textContent = msg;
    t.classList.add("visible");
    setTimeout(() => t.classList.remove("visible"), duration);
  };

  const confirmDialog = (title, text, onOk) => {
    const d = $("confirmModal");
    $("confirmTitle").textContent = title;
    $("confirmText").textContent = text;

    // Cleanup old listeners
    const okBtn = $("confirmOk");
    const cancelBtn = $("confirmCancel");
    const newOk = okBtn.cloneNode(true);
    const newCancel = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOk, okBtn);
    cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

    newOk.onclick = () => { d.close(); onOk(); };
    newCancel.onclick = () => d.close();

    d.showModal();
  };

  // --- Audio & Notifications ---
  const beep = () => {
    if (!cfg.sound) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(audioCtx.destination);
      o.start();
      setTimeout(() => o.stop(), 200);
    } catch (e) { }
  };

  const notify = (title, body) => {
    if (cfg.notifications && Notification.permission === "granted") {
      new Notification(title, { body, icon: "" }); // icon could be added
    }
    beep();
  };

  const requestNotify = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  // --- Logic ---
  const ensureToday = (force = false) => {
    const dk = dateKey();
    if (!days[dk] || force) {
      const tasks = [];

      // Validate Total Time for Display Warning (soft check)
      let totalMin = 0;
      templates.forEach(t => totalMin += (Number(t.minutes) * Number(t.reps || 1)));
      if (totalMin > 1440) setTimeout(() => toast(t("errTotalExceeded")), 500);

      templates.forEach(t => {
        const reps = Math.max(1, Number(t.reps || 1)); // Removed max 10 limit
        const grp = uid();
        for (let i = 1; i <= reps; i++) {
          tasks.push({
            id: uid(),
            groupId: grp,
            repIdx: i,
            name: t.name + (reps > 1 ? ` (${i}/${reps})` : ""),
            minutes: Number(t.minutes),
            status: "todo",
            startedAt: null, endsAt: null, remainingMs: null, completedAt: null, duration: Number(t.minutes) * 60000
          });
        }
      });
      days[dk] = { tasks, createdAt: Date.now() };
      save();
    }
  };

  const getToday = () => days[dateKey()]?.tasks || [];
  const setToday = (tasks) => {
    const dk = dateKey();
    if (!days[dk]) days[dk] = { createdAt: Date.now(), tasks: [] };
    days[dk].tasks = tasks;
    save();
  };

  // --- Render ---
  const renderLanguage = () => {
    // Toggle Button
    $("langToggle").textContent = cfg.lang.toUpperCase();

    // Static Text
    $("lblTemplates").textContent = t("templates");
    $("openTplModalBtn").textContent = t("new");
    $("regenTodayBtn").textContent = t("regen");
    $("lblRegenWarn").textContent = t("regenWarn");
    $("lblData").textContent = t("data");
    $("exportBtn").textContent = t("export");
    $("importBtn").textContent = t("import");
    $("wipeBtn").textContent = t("wipe");
    $("lblToday").textContent = t("today");
    $("lblHistory").textContent = t("history");

    // Header Toggles
    $("lblNotify").title = t("notifyTitle");
    $("lblSound").title = t("soundTitle");

    // Modals
    $("lblTplModalTitle").textContent = t("tplModalTitle");
    $("lblTplName").textContent = t("name");
    $("tplName").placeholder = t("placeholder");
    $("lblTplDuration").textContent = t("duration");
    $("lblTplReps").textContent = t("reps");
    $("btnTplCancel").textContent = t("cancel");
    $("btnTplSave").textContent = t("save");

    $("confirmTitle").textContent = t("confirmTitle");
    $("confirmText").textContent = t("confirmText");
    $("confirmOk").textContent = t("confirmOk");
    $("confirmCancel").textContent = t("cancel");
  };

  const renderTemplates = () => {
    const list = $("tplList");
    list.innerHTML = "";

    // Calculate Total
    const total = templates.reduce((acc, t) => acc + (t.minutes * (t.reps || 1)), 0);
    $("lblTemplates").textContent = `${t("templates")} (${formatDuration(total)})`;

    const newBtn = $("openTplModalBtn");
    if (total >= 1440) {
      newBtn.disabled = true;
      newBtn.title = t("errTotalExceeded");
    } else {
      newBtn.disabled = false;
      newBtn.title = "";
    }

    if (!templates.length) return list.innerHTML = `<div class="empty-state">${t("emptyTpl")}</div>`;

    templates.forEach(tobj => {
      const el = document.createElement("div");
      el.className = "item";
      el.innerHTML = `
    <div class="item-header">
      <div class="item-title">${tobj.name}</div>
      <div class="row" style="gap:4px">
        <button class="icon-btn edit-btn">✏️</button>
        <button class="icon-btn del-btn" style="color:var(--danger)">🗑️</button>
      </div>
    </div>
    <div class="item-meta">
      <span>⏱ ${tobj.minutes} Min</span>
      <span>↻ ${tobj.reps}x</span>
    </div>
    <div style="margin-top:12px">
        <button class="ghost add-single-btn" style="font-size:11px; width:100%">${t("addSingle")}</button>
    </div>
  `;

      // Events
      el.querySelector(".del-btn").onclick = () => {
        confirmDialog(t("delTplTitle"), t("delTplText", tobj.name), () => {
          templates = templates.filter(x => x.id !== tobj.id);
          save();
          renderTemplates();
          toast(t("tplDeleted"));
        });
      };
      el.querySelector(".edit-btn").onclick = () => openTplModal(tobj);
      el.querySelector(".add-single-btn").onclick = () => {
        const tasks = getToday();
        // Check limit
        const currentTotal = tasks.reduce((acc, t) => acc + (t.duration / 60000), 0);
        const newBlock = Number(tobj.minutes);

        if (currentTotal + newBlock > 1440) {
          return toast(t("errTotalExceeded"));
        }

        tasks.push({
          id: uid(),
          name: tobj.name,
          minutes: Number(tobj.minutes),
          status: "todo",
          startedAt: null, endsAt: null, remainingMs: null, completedAt: null, duration: Number(tobj.minutes) * 60000
        });
        setToday(tasks);
        renderToday();
        toast(t("addedToToday"));
      };

      list.appendChild(el);
    });
  };

  const renderToday = () => {
    const tasks = getToday();
    const list = $("todayList");

    // Update Header Summary
    const doneCount = tasks.filter(t => t.status === "done").length;
    const runningCount = tasks.filter(t => t.status === "running").length;
    const totalMin = Math.round(tasks.reduce((acc, t) => acc + (t.duration / 60000), 0));

    $("summaryLabel").textContent = `${doneCount}/${tasks.length} ${t("done")}` +
      (runningCount ? ` • ${runningCount} ${t("running")}` : "") +
      ` • ${formatDuration(totalMin)}`;

    // Render List
    list.innerHTML = "";
    if (!tasks.length) return list.innerHTML = `<div class="empty-state">${t("emptyToday")}</div>`;

    // Smart Sort for Display
    const sortedTasks = tasks
      .map((t, i) => ({ t, i })) // Keep index
      .sort((a, b) => {
        // 1. Running -> Top
        if (a.t.status === "running" && b.t.status !== "running") return -1;
        if (a.t.status !== "running" && b.t.status === "running") return 1;

        // 2. Done -> Bottom
        if (a.t.status === "done" && b.t.status !== "done") return 1;
        if (a.t.status !== "done" && b.t.status === "done") return -1;

        // 3. Original Index (Flow)
        return a.i - b.i;
      })
      .map(x => x.t);

    sortedTasks.forEach(tobj => {
      const el = document.createElement("div");
      el.className = `item ${tobj.status}`;

      let badge = "todo", badgeText = t("badgeTodo"), timeLeft = "", progress = 0;
      let isLocked = false;

      // Check Sequential Lock (Forward)
      if (tobj.groupId && tobj.repIdx > 1) {
        const prev = tasks.find(x => x.groupId === tobj.groupId && x.repIdx === tobj.repIdx - 1);
        if (prev && prev.status !== "done") isLocked = true;
      }

      // Check Reverse Lock (Successor Active?)
      let isRevLocked = false;
      let successorName = "";
      if (tobj.groupId && tobj.status === "done") {
        const next = tasks.find(x => x.groupId === tobj.groupId && x.repIdx === tobj.repIdx + 1);
        if (next && next.status !== "todo") {
          isRevLocked = true;
          successorName = next.name;
        }
      }

      if (tobj.status === "running") {
        badge = "running"; badgeText = t("badgeRunning");
        const left = Math.max(0, tobj.endsAt - Date.now());
        timeLeft = formatTime(left);
        progress = 100 - (left / tobj.duration * 100);
      } else if (tobj.status === "paused") {
        badge = "paused"; badgeText = t("badgePaused");
        timeLeft = formatTime(tobj.remainingMs);
        progress = 100 - (tobj.remainingMs / tobj.duration * 100);
      } else if (tobj.status === "done") {
        badge = "done"; badgeText = t("badgeDone");
        progress = 100;
        timeLeft = new Date(tobj.completedAt).toLocaleTimeString(cfg.lang === "de" ? "de-DE" : "en-US", { hour: "2-digit", minute: "2-digit" });
      } else {
        // Todo: Show mm:ss instead of "25 Min" for consistency
        timeLeft = formatTime(tobj.minutes * 60000);
      }

      if (isLocked) {
        badge = "todo";
        badgeText = "🔒";
        el.style.opacity = "0.5";
      }

      el.innerHTML = `
    <div class="progress-bar" id="bar-${tobj.id}" style="width:${progress}%"></div>
    <div class="item-header">
      <div class="item-title">${tobj.name}</div>
      <span class="badge ${badge}">${badgeText}</span>
    </div>
    <div class="item-meta spread">
      <span class="time-large" id="time-${tobj.id}">${timeLeft}</span>
      <div class="row" style="gap:8px">
         ${tobj.status === "running" ? `<button class="primary pause-btn" title="${t("btnPause")}">⏸</button>` : ""}
         ${(tobj.status === "paused" || tobj.status === "todo") ? `<button class="primary play-btn" title="${t("btnStart")}" ${isLocked ? "disabled" : ""}>▶</button>` : ""}
         ${tobj.status !== "done" ? `<button class="ghost done-btn" title="${t("btnMarkDone")}" ${isLocked ? "disabled" : ""}>✓</button>` : ""}
         <button class="ghost undo-btn" 
           title="${isRevLocked ? t("resetLocked", successorName) : t("btnReset")}" 
           ${tobj.status === "todo" ? "disabled" : ""}
           style="${isRevLocked ? "opacity:0.5;" : ""}"
         >↺</button>
      </div>
    </div>
  `;

      // Actions
      if (tobj.status === "running") el.querySelector(".pause-btn").onclick = () => {
        tobj.status = "paused";
        tobj.remainingMs = tobj.endsAt - Date.now();
        tobj.endsAt = null;
        updateTask(tobj);
      };
      if (tobj.status === "paused" || tobj.status === "todo") el.querySelector(".play-btn").onclick = () => {
        if (getToday().some(x => x.status === "running")) return toast(t("onlyOne"));

        const isResuming = tobj.status === "paused" && tobj.remainingMs > 0;
        const ms = isResuming ? tobj.remainingMs : (tobj.minutes * 60000);

        tobj.status = "running";
        tobj.duration = tobj.duration || ms; // ensure duration is set
        tobj.endsAt = Date.now() + ms;
        tobj.startedAt = tobj.startedAt || Date.now();
        tobj.remainingMs = null;
        updateTask(tobj);
        beep();
      };
      if (tobj.status !== "done") el.querySelector(".done-btn").onclick = () => {
        tobj.status = "done";
        tobj.completedAt = Date.now();
        tobj.endsAt = null;
        updateTask(tobj);
      };
      if (true) el.querySelector(".undo-btn").onclick = () => {
        if (tobj.status === "todo" || isRevLocked) return;
        tobj.status = "todo";
        tobj.endsAt = null;
        tobj.remainingMs = null;
        tobj.completedAt = null;
        updateTask(tobj);
      };

      list.appendChild(el);
    });
  };

  const updateTask = (t) => {
    const tasks = getToday();
    const idx = tasks.findIndex(x => x.id === t.id);
    if (idx >= 0) tasks[idx] = t;
    setToday(tasks);
    renderToday();
  };

  const renderHistory = () => {
    const list = $("historyList");
    list.innerHTML = "";

    // Sort keys desc
    const keys = Object.keys(days).sort().reverse();
    // Exclude today
    const pastKeys = keys.filter(k => k !== dateKey()).slice(0, 7);

    if (!pastKeys.length) return list.innerHTML = `<div class="empty-state">${t("emptyHistory")}</div>`;

    pastKeys.forEach(k => {
      const day = days[k];
      const done = day.tasks.filter(t => t.status === "done").length;
      const total = day.tasks.length;

      const el = document.createElement("div");
      el.className = "item";
      el.style.padding = "10px 14px";
      el.innerHTML = `
    <div class="row spread">
      <strong>${formatDate(k)}</strong>
      <span class="badge ${done === total ? 'done' : 'todo'}">${done}/${total}</span>
    </div>
  `;
      list.appendChild(el);
    });
  };

  $("tplForm").onsubmit = (e) => {
    // e.preventDefault() handled by dialog method="dialog" but we need to guard
    const data = {
      id: $("tplId").value || uid(),
      name: $("tplName").value,
      minutes: Number($("tplMinutes").value),
      reps: Number($("tplReps").value)
    };

    // Check 24h limit for single block config
    if (data.minutes * data.reps > 1440) {
      return toast(t("errBlockTooLong"));
    }

    // Check if TOTAL templates duration exceeds 24h
    let currentTotal = 0;
    templates.forEach(t => {
      if ($("tplId").value && t.id === $("tplId").value) return; // Ignore self if editing
      currentTotal += (t.minutes * (t.reps || 1));
    });

    if (currentTotal + (data.minutes * data.reps) > 1440) {
      return toast(t("errTotalExceeded"));
    }

    if ($("tplId").value) {
      // Edit
      const idx = templates.findIndex(t => t.id === data.id);
      if (idx >= 0) templates[idx] = data;
    } else {
      // New
      templates.push(data);
    }
    save();
    renderTemplates();
    toast(t("save"));
  };

  const validateTpl = () => {
    const min = Number($("tplMinutes").value) || 0;
    const reps = Number($("tplReps").value) || 0;
    const currentBlock = min * reps;
    const saveBtn = $("btnTplSave");

    // 1. Single block limit
    if (currentBlock > 1440) {
      saveBtn.disabled = true;
      saveBtn.title = t("errBlockTooLong");
      return;
    }

    // 2. Total limit
    let otherTotal = 0;
    const id = $("tplId").value;
    templates.forEach(t => {
      if (id && t.id === id) return;
      otherTotal += (t.minutes * (t.reps || 1));
    });

    if (otherTotal + currentBlock > 1440) {
      saveBtn.disabled = true;
      saveBtn.title = t("errTotalExceeded");
      return;
    }

    saveBtn.disabled = false;
    saveBtn.title = "";
  };

  $("tplMinutes").oninput = validateTpl;
  $("tplReps").oninput = validateTpl;

  const openTplModal = (tpl = null) => {
    $("tplId").value = tpl ? tpl.id : "";
    $("tplName").value = tpl ? tpl.name : "";
    $("tplMinutes").value = tpl ? tpl.minutes : 25;
    $("tplReps").value = tpl ? tpl.reps : 1;
    validateTpl(); // Validate initial state
    $("tplModal").showModal();
  };

  $("openTplModalBtn").onclick = () => openTplModal();

  $("regenTodayBtn").onclick = () => {
    confirmDialog(t("regen"), t("regenWarn"), () => {
      ensureToday(true);
      renderToday();
      toast(t("regen"));
    });
  };

  // --- Global Toggles ---
  $("soundToggle").onchange = (e) => {
    cfg.sound = e.target.checked;
    save();
  };
  $("notifyToggle").onchange = (e) => {
    cfg.notifications = e.target.checked;
    save();
    if (cfg.notifications) requestNotify();
  };

  $("langToggle").onclick = () => {
    cfg.lang = cfg.lang === "de" ? "en" : "de";
    save();
    location.reload();
  };

  // --- Import/Export ---
  $("wipeBtn").onclick = () => confirmDialog(t("wipeTitle"), t("wipeText"), () => {
    localStorage.clear();
    location.reload();
  });

  $("exportBtn").onclick = () => {
    const data = JSON.stringify({ templates, days, cfg });
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `blocktimer-${dateKey()}.json`;
    a.click();
    toast(t("exportStarted"));
  };

  $("importBtn").onclick = () => $("importFile").click();
  $("importFile").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      if (json.templates) templates = json.templates;
      if (json.days) days = json.days;
      if (json.cfg) cfg = json.cfg;
      save();
      location.reload();
    } catch (err) {
      toast(t("importError"));
    }
  };

  // --- Loop ---
  const tick = () => {
    const now = Date.now();
    const tasks = getToday();
    let changed = false;
    const running = tasks.find(t => t.status === "running");

    if (running) {
      // Check finish
      if (now >= running.endsAt) {
        running.status = "done";
        running.completedAt = now;
        running.endsAt = null;
        changed = true;
        notify(t("blockFinished"), t("blockFinishedBody", running.name));
      } else {
        // Update Title
        const m = Math.ceil((running.endsAt - now) / 60000);
        document.title = `(${m}m) ${running.name}`;
      }
    } else {
      document.title = "Blocktimer";
    }

    if (changed) {
      setToday(tasks);
      renderToday();
    } else if (running) {
      updateRunningUI(running);
    }
  };

  // --- Init ---
  load();
  ensureToday();

  renderLanguage(); // Initial render of static text

  $("soundToggle").checked = !!cfg.sound;
  $("notifyToggle").checked = !!cfg.notifications;
  $("todayLabel").textContent = formatDate(new Date());

  renderTemplates();
  renderToday();
  renderHistory();

  const updateRunningUI = (t) => {
    const left = Math.max(0, t.endsAt - Date.now());
    const timeStr = formatTime(left);

    document.title = `${timeStr} - ${t.name}`;

    const timeEl = document.getElementById(`time-${t.id}`);
    const barEl = document.getElementById(`bar-${t.id}`);

    if (timeEl) timeEl.textContent = timeStr;
    if (barEl) {
      const progress = 100 - (left / t.duration * 100);
      barEl.style.width = `${progress}%`;
    }
  };

  setInterval(tick, 1000);

})();
