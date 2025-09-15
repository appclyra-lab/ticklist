// src/components/AuthedApp.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { auth, db } from "../lib/firebase";
import { signOut } from "firebase/auth";
import {
  addDoc, setDoc, updateDoc, deleteDoc,
  collection, doc, onSnapshot, query, orderBy, getDoc
} from "firebase/firestore";
import TodoItem from "./TodoItem.jsx";
import { registerSW } from "virtual:pwa-register";
import { setBadge, clearBadge } from "../lib/badge";

// ufak yardımcılar
const rid = () => Math.random().toString(36).slice(2);
const rank = { high: 0, medium: 1, low: 2 };

export default function AuthedApp({ user }) {
  // ----- Tema / Ses (mevcut ayarlar) -----
  const [theme, setTheme] = useState(localStorage.getItem("ticklist_theme") || "dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ticklist_theme", theme);
  }, [theme]);

  const [sound, setSound] = useState(() => {
    const v = localStorage.getItem("ticklist_sound");
    return v === null ? "on" : v;
  });
  useEffect(() => { localStorage.setItem("ticklist_sound", sound); }, [sound]);

  // ----- PWA install/update -----
  const [installPrompt, setInstallPrompt] = useState(null);
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const updateSWRef = useRef(null);
  useEffect(() => {
    const updateSW = registerSW({
      onNeedRefresh() { setNeedRefresh(true); },
      onOfflineReady() { setOfflineReady(true); setTimeout(()=>setOfflineReady(false), 2500); },
    });
    updateSWRef.current = updateSW;
  }, []);

  // ----- Form -----
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("medium");
  const [dueDate, setDueDate] = useState("");
  const [label, setLabel] = useState("Genel");
  const [newLabelCustom, setNewLabelCustom] = useState(false);
  const [newLabelText, setNewLabelText] = useState("");

  // ----- Filtre / Arama -----
  const [qText, setQText] = useState("");
  const [filter, setFilter] = useState("all");
  const [labelFilter, setLabelFilter] = useState("ALL");

  // ----- Etiket renkleri -----
  const [labelColors, setLabelColors] = useState({});
  const colorOf = (name) => (labelColors && labelColors[name]) || "";

  // ----- Firestore -----
  const [todos, setTodos] = useState([]);
  const colRef = collection(db, "users", user.uid, "todos");

  useEffect(() => {
    const q = query(colRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = []; snap.forEach(d => arr.push({ id: d.id, ...d.data() })); setTodos(arr);
    });
    return () => unsub();
    // eslint-disable-next-line
  }, [user.uid]);

  useEffect(() => {
    (async () => {
      const metaRef = doc(db, "users", user.uid, "meta", "prefs");
      const s = await getDoc(metaRef);
      if (s.exists()) setLabelColors((s.data() || {}).labelColors || {});
    })();
    // eslint-disable-next-line
  }, [user.uid]);

  const setLabelColor = async (labelName, color) => {
    const next = { ...(labelColors || {}), [labelName]: color };
    setLabelColors(next);
    await setDoc(doc(db, "users", user.uid, "meta", "prefs"), { labelColors: next }, { merge: true });
  };

  // ----- Etiket seçenekleri -----
  const labelOptions = useMemo(() => {
    const base = new Set(["Genel", "İş", "Kişisel", "Okul"]);
    for (const t of todos) if (t.label) base.add(t.label);
    return Array.from(base);
  }, [todos]);

  // ----- Ekle / Güncelle / Sil -----
  const addTodo = async (e) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return alert("Bir başlık yaz 🙏");
    await addDoc(colRef, {
      title: t, note: "", done: false, createdAt: Date.now(),
      priority, dueDate: dueDate || "", label: label || "Genel",
      subtasks: [],
      remind: false,
      remindTime: "09:00",
    });
    setTitle(""); setPriority("medium"); setDueDate(""); setLabel("Genel");
    setNewLabelCustom(false); setNewLabelText("");
  };
  const toggle = async (id, done) => updateDoc(doc(colRef, id), { done: !done });
  const removeTodo = async (id) => deleteDoc(doc(colRef, id));
  const saveTodo = async (id, updates) => updateDoc(doc(colRef, id), updates);

  // ----- Arama/Filtre/Sıralama -----
  const searched = useMemo(() => {
    const q = qText.trim().toLowerCase();
    if (!q) return todos;
    return todos.filter(t =>
      (t.title || "").toLowerCase().includes(q) ||
      (t.note || "").toLowerCase().includes(q) ||
      (t.label || "").toLowerCase().includes(q)
    );
  }, [todos, qText]);

  const filtered = useMemo(() => {
    let arr = searched;
    if (labelFilter !== "ALL") arr = arr.filter(t => (t.label || "Genel") === labelFilter);
    if (filter === "active") return arr.filter(t => !t.done);
    if (filter === "done")   return arr.filter(t =>  t.done);
    return arr;
  }, [searched, filter, labelFilter]);

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(dateStr + "T00:00:00");
    return Math.round((d - today) / 86400000);
  };

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      if (!!a.done !== !!b.done) return a.done ? 1 : -1;
      const da = daysUntil(a.dueDate), db = daysUntil(b.dueDate);
      if (da !== null || db !== null) {
        if (da === null && db !== null) return 1;
        if (db === null && da !== null) return -1;
        if (da !== db) return da - db;
      }
      const pa = rank[a.priority || "medium"], pb = rank[b.priority || "medium"];
      if (pa !== pb) return pa - pb;
      return (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0);
    });
    return arr;
  }, [filtered]);

  // ====== ROZET (BADGE) ======
  const openCount = useMemo(() => (todos || []).filter(t => !t.done).length, [todos]);

  useEffect(() => {
    setBadge(openCount);                 // OS rozet veya başlıkta (N)
    return () => clearBadge();           // component kapanırken temizle
  }, [openCount]);

  useEffect(() => {
    const onVis = () => setBadge(openCount);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [openCount]);
  // ===========================

  // ----- JSON dışa/İçe aktar -----
  const exportJSON = () => {
    const data = JSON.stringify(todos ?? [], null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ticklist.json"; a.click();
    URL.revokeObjectURL(url);
  };
  const [fileInputEl, setFileInputEl] = useState(null);
  const importJSON = (file) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arr = JSON.parse(e.target.result);
        if (!Array.isArray(arr)) throw new Error("not array");
        const safe = arr.filter(x => x && typeof x.title === "string").map(x => ({
          id: x.id || rid(),
          title: x.title,
          note: typeof x.note === "string" ? x.note : "",
          done: !!x.done,
          createdAt: Number(x.createdAt) || Date.now(),
          priority: ["low","medium","high"].includes(x.priority) ? x.priority : "medium",
          dueDate: typeof x.dueDate === "string" ? x.dueDate : "",
          label: typeof x.label === "string" && x.label ? x.label : "Genel",
          subtasks: Array.isArray(x.subtasks)
            ? x.subtasks.filter(s => s && typeof s.title === "string").map(s => ({
                id: s.id || rid(), title: s.title, done: !!s.done
              }))
            : [],
          remind: !!x.remind,
          remindTime: typeof x.remindTime === "string" ? x.remindTime : "09:00",
        }));
        await Promise.all(safe.map(item => setDoc(doc(colRef, item.id), item, { merge: true })));
      } catch { alert("Geçersiz JSON dosyası."); }
    };
    reader.readAsText(file);
  };

  return (
    <div className="container">
      {/* PWA update banner */}
      {needRefresh && (
        <div className="pwa-banner">
          <span>Yeni sürüm hazır.</span>
          <button className="btn primary" onClick={() => { updateSWRef.current?.(); setNeedRefresh(false); }}>
            Güncelle
          </button>
          <button className="btn ghost" onClick={() => setNeedRefresh(false)}>Kapat</button>
        </div>
      )}
      {offlineReady && <div className="pwa-toast">Uygulama çevrimdışı kullanılabilir ✅</div>}

      <h1>
        TickList
        {/* Ekranda görünen rozet (OS rozeti yanında görsel geri dönüş) */}
        <span className="badge-pill">{openCount}</span>

        <div className="right">
          <button className="btn" title={theme === "dark" ? "Açık tema" : "Koyu tema"}
                  onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}>
            {theme === "dark" ? "☀️ Açık" : "🌙 Koyu"}
          </button>

          {"Notification" in window && Notification.permission !== "granted" && (
            <button className="btn ghost" onClick={async ()=>{ try { await Notification.requestPermission(); } catch {} }}>
              🔔 İzin ver
            </button>
          )}

          <button className="btn" title="Hatırlatıcı sesi" onClick={() => setSound(s => (s === "on" ? "off" : "on"))}>
            {sound === "on" ? "🔊 Ses açık" : "🔈 Ses kapalı"}
          </button>

          <button className="btn ghost" onClick={() => signOut(auth)}>Çıkış</button>
        </div>
      </h1>

      {/* yeni görev */}
      <form className="new-form" onSubmit={addTodo}>
        <input autoFocus value={title} onChange={(e)=>setTitle(e.target.value)}
               placeholder="Yeni görev yaz ve Enter’a bas..." />
        <select value={priority} onChange={(e)=>setPriority(e.target.value)} title="Öncelik">
          <option value="low">Düşük</option>
          <option value="medium">Orta</option>
          <option value="high">Yüksek</option>
        </select>
        <input type="date" value={dueDate} onChange={(e)=>setDueDate(e.target.value)} />

        {/* Etiket */}
        {newLabelCustom ? (
          <input
            autoFocus value={newLabelText} onChange={(e)=>setNewLabelText(e.target.value)} placeholder="Yeni etiket yaz…"
            onKeyDown={(e)=>{ if(e.key==="Enter"){ e.preventDefault(); const v=(newLabelText||"").trim();
              if(v){ setLabel(v); setLabelColors(p=>({...(p||{}), [v]:(p?.[v]||"#3b82f6")})); }
              setNewLabelCustom(false);
            }}}
            onBlur={()=>{ const v=(newLabelText||"").trim();
              if(v){ setLabel(v); setLabelColors(p=>({...(p||{}), [v]:(p?.[v]||"#3b82f6")})); }
              setNewLabelCustom(false);
            }}
          />
        ) : (
          <select value={label} onChange={(e)=>{ const v=e.target.value; if(v==="__custom"){ setNewLabelCustom(true); setNewLabelText(""); } else setLabel(v); }}>
            {labelOptions.map(l => <option key={l} value={l}>{l}</option>)}
            <option value="__custom">+ Yeni etiket…</option>
          </select>
        )}

        <button className="btn primary" type="submit">Ekle</button>
      </form>

      {/* arama */}
      <form className="new-form" onSubmit={(e)=>e.preventDefault()}>
        <input value={qText} onChange={(e)=>setQText(e.target.value)} placeholder="Ara (başlık/not/etiket)..." />
      </form>

      {/* toolbar */}
      <div className="toolbar">
        <div className="labels">
          <button className={labelFilter==="ALL" ? "active" : ""} onClick={()=>setLabelFilter("ALL")}>Tümü</button>
          {labelOptions.map(l => (
            <span key={l} style={{ display:"inline-flex", alignItems:"center", gap:6 }}>
              <button
                className={labelFilter===l ? "active" : ""}
                onClick={()=>setLabelFilter(l)}
                style={colorOf(l) ? { backgroundColor: colorOf(l), borderColor:"transparent", color:"#06101c" } : {}}
              >{l}</button>
              <input
                type="color" title={`${l} rengi`}
                value={colorOf(l) || "#3b82f6"}
                onChange={(e)=>setLabelColor(l, e.target.value)}
                style={{ width:22, height:22, padding:0, border:"none", background:"transparent", cursor:"pointer" }}
              />
            </span>
          ))}
        </div>

        <div className="filters">
          <button className={filter==="all"?"active":""}   onClick={()=>setFilter("all")}>Hepsi</button>
          <button className={filter==="active"?"active":""}onClick={()=>setFilter("active")}>Aktif</button>
          <button className={filter==="done"?"active":""}  onClick={()=>setFilter("done")}>Bitti</button>
        </div>

        <div className="meta">
          <span>{openCount} açık</span>
          {(todos || []).some(t=>!t.done)
            ? <button onClick={async()=>{ const arr=todos.filter(t=>!t.done); await Promise.all(arr.map(t=>updateDoc(doc(colRef,t.id),{done:true}))); }}>
                Tümünü tamamla
              </button>
            : <button onClick={async()=>{ const arr=todos.filter(t=> t.done); await Promise.all(arr.map(t=>updateDoc(doc(colRef,t.id),{done:false}))); }}>
                Tümünü geri al
              </button>
          }
          <button onClick={async()=>{ const arr=todos.filter(t=>t.done); await Promise.all(arr.map(t=>deleteDoc(doc(colRef,t.id)))); }}>
            Bitenleri temizle
          </button>

          <button onClick={exportJSON}>Dışa aktar (JSON)</button>
          <input type="file" accept="application/json" style={{ display:"none" }} ref={setFileInputEl}
                 onChange={(e)=>{ const f=e.target.files?.[0]; if (f) importJSON(f); e.target.value=""; }} />
          <button onClick={()=>fileInputEl?.click()}>İçe aktar</button>
        </div>
      </div>

      {/* liste */}
      {sorted.length === 0 ? (
        <div className="empty">Henüz görev yok. Yukarıdan ekle 👆</div>
      ) : (
        <ul className="list">
          {sorted.map((t) => (
            <TodoItem
              key={t.id}
              todo={t}
              userId={user.uid}
              onToggle={toggle}
              onRemove={removeTodo}
              onSave={saveTodo}
              colorOf={colorOf}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
