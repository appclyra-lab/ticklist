// src/components/TodoItem.jsx
import { useRef, useState } from "react";
import { storage } from "../lib/firebase";
import {
  ref as sRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

export default function TodoItem({
  todo,
  userId,
  onToggle,
  onRemove,
  onSave,
  colorOf = () => "",
  getRemindAt = () => null,
  onTest = null,
}) {
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editNote, setEditNote] = useState(todo.note || "");
  const [editPriority, setEditPriority] = useState(todo.priority || "medium");
  const [editDue, setEditDue] = useState(todo.dueDate || "");
  const [editLabel, setEditLabel] = useState(todo.label || "Genel");
  const [editRemind, setEditRemind] = useState(!!todo.remind);
  const [editTime, setEditTime] = useState(todo.remindTime || "09:00"); // ⏰

  // ALT GÖREVLER
  const [newSub, setNewSub] = useState("");
  const subtasks = Array.isArray(todo.subtasks) ? todo.subtasks : [];

  // DOSYALAR
  const fileInput = useRef(null);
  const attachments = Array.isArray(todo.attachments) ? todo.attachments : [];

  const commit = (patch) => onSave?.(todo.id, patch);

  const addSubtask = () => {
    const t = newSub.trim();
    if (!t) return;
    const next = [
      ...subtasks,
      { id: Math.random().toString(36).slice(2), title: t, done: false },
    ];
    commit({ subtasks: next });
    setNewSub("");
  };
  const toggleSubtask = (sid) => {
    const next = subtasks.map((s) => (s.id === sid ? { ...s, done: !s.done } : s));
    commit({ subtasks: next });
  };
  const removeSubtask = (sid) => {
    const next = subtasks.filter((s) => s.id !== sid);
    commit({ subtasks: next });
  };
  const renameSubtask = (sid, title) => {
    const next = subtasks.map((s) => (s.id === sid ? { ...s, title } : s));
    commit({ subtasks: next });
  };

  const daysUntil = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const d = new Date(dateStr + "T00:00:00");
    return Math.round((d - today) / 86400000);
  };

  const du = daysUntil(todo.dueDate);
  const dueClass = typeof du === "number"
    ? du < 0 ? "due-badge overdue" : du <= 1 ? "due-badge soon" : "due-badge ok"
    : "due-badge";

  const subDone = subtasks.filter(s=>s.done).length;
  const subTotal = subtasks.length;

  const saveEdit = () => {
    commit({
      title: (editTitle.trim() || "Adsız"),
      note: editNote,
      priority: editPriority,
      dueDate: editDue,
      label: editLabel,
      remind: !!editRemind,
      remindTime: editTime,
    });
    setEditing(false);
  };

  const toggleRemind = () => commit({ remind: !todo.remind });

  // ===== Dosya Yükleme / Silme =====
  const handleUploadClick = () => fileInput.current?.click();

  const handleFilesChosen = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const uploaded = [];

    for (const f of files) {
      const path = `users/${userId}/attachments/${todo.id}/${Date.now()}_${f.name}`;
      const ref = sRef(storage, path);
      await uploadBytes(ref, f);
      const url = await getDownloadURL(ref);
      uploaded.push({
        name: f.name,
        url,
        path,                 // storage'ta silmek için
        size: f.size,
        type: f.type || "",
      });
    }

    commit({ attachments: [...attachments, ...uploaded] });
    e.target.value = ""; // input'u sıfırla
  };

  const deleteAttachment = async (path) => {
    try { await deleteObject(sRef(storage, path)); } catch {}
    commit({ attachments: attachments.filter((a) => a.path !== path) });
  };

  return (
    <li className={`item ${todo.done ? "done" : ""}`}>
      <label className="check">
        <input type="checkbox" checked={!!todo.done} onChange={() => onToggle?.(todo.id, todo.done)} />
        <span />
      </label>

      <div className="content">
        {editing ? (
          <>
            <input className="title-input" value={editTitle} onChange={(e)=>setEditTitle(e.target.value)} onKeyDown={(e)=>e.key==="Enter" && saveEdit()} />
            <textarea className="note-input" value={editNote} onChange={(e)=>setEditNote(e.target.value)} placeholder="Not (opsiyonel)" />
            <div className="row" style={{gap:8, alignItems:"center"}}>
              <select value={editPriority} onChange={(e)=>setEditPriority(e.target.value)}>
                <option value="low">Düşük</option><option value="medium">Orta</option><option value="high">Yüksek</option>
              </select>
              <input type="date" value={editDue} onChange={(e)=>setEditDue(e.target.value)} />
              <input type="time" value={editTime} onChange={(e)=>setEditTime(e.target.value)} disabled={!editRemind} title="Hatırlatma saati" />
              <input value={editLabel} onChange={(e)=>setEditLabel(e.target.value)} placeholder="Etiket" />
              <span className="label-badge" style={colorOf(editLabel) ? { backgroundColor: colorOf(editLabel), color: "#0b1220" } : {}}>#{editLabel}</span>
              <label style={{ display:"inline-flex", gap: 6, alignItems:"center", marginLeft:8 }}>
                <input type="checkbox" checked={editRemind} onChange={(e)=>setEditRemind(e.target.checked)} />
                <span>Hatırlat</span>
              </label>
            </div>

            {/* ALT GÖREVLER – düzenleme görünümü */}
            <div className="subtasks">
              <div className="sub-header">Alt görevler</div>
              {subtasks.length === 0 && <div className="sub-empty">Henüz alt görev yok.</div>}
              {subtasks.map((s) => (
                <div key={s.id} className="sub-row">
                  <input className="sub-check" type="checkbox" checked={!!s.done} onChange={()=>toggleSubtask(s.id)} />
                  <input className="sub-title" value={s.title} onChange={(e)=>renameSubtask(s.id, e.target.value)} placeholder="Alt görev adı…" />
                  <button className="btn danger sub-del" onClick={()=>removeSubtask(s.id)}>Sil</button>
                </div>
              ))}
              <div className="sub-add">
                <input value={newSub} onChange={(e)=>setNewSub(e.target.value)} onKeyDown={(e)=> e.key==="Enter" && addSubtask()} placeholder="Alt görev ekle ve Enter’a bas…" />
                <button className="btn" onClick={addSubtask}>Ekle</button>
              </div>
            </div>

            {/* DOSYALAR – düzenleme */}
            <div className="attachments">
              <div className="att-header">
                <span>Dosyalar</span>
                <div className="att-actions">
                  <input ref={fileInput} type="file" multiple style={{ display: "none" }} onChange={handleFilesChosen} />
                  <button className="btn" onClick={handleUploadClick}>📎 Dosya ekle</button>
                </div>
              </div>
              {attachments.length === 0 && <div className="att-empty">Bu görevle ilişkilendirilmiş dosya yok.</div>}
              {attachments.length > 0 && (
                <ul className="att-list">
                  {attachments.map((a) => (
                    <li key={a.path}>
                      <a href={a.url} target="_blank" rel="noreferrer">{a.name}</a>
                      <button className="btn danger" onClick={()=>deleteAttachment(a.path)}>Sil</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="title">
              {todo.title}
              <span className={`pri-badge ${todo.priority || "medium"}`}>
                {todo.priority === "high" ? "Yüksek" : todo.priority === "low" ? "Düşük" : "Orta"}
              </span>
              {todo.dueDate && <span className={dueClass}>{todo.dueDate}</span>}
              {todo.label && (
                <span className="label-badge" style={colorOf(todo.label) ? { backgroundColor: colorOf(todo.label), color: "#0b1220" } : {}}>
                  #{todo.label}
                </span>
              )}
              {todo.remind && <span className="label-badge" title="Hatırlatıcı açık">🔔</span>}
              {todo.remind && todo.dueDate && (() => {
                const at = getRemindAt(todo);
                if (!at) return null;
                const d = new Date(at);
                const hh = String(d.getHours()).padStart(2,"0");
                const mm = String(d.getMinutes()).padStart(2,"0");
                return <span className="label-badge" title="Planlanan hatırlatıcı">⏰ {hh}:{mm}</span>;
              })()}
              {subTotal > 0 && <span className="sub-progress">{subDone}/{subTotal}</span>}
            </div>
            {todo.note && <div className="note">{todo.note}</div>}

            {/* ALT GÖREVLER – görüntüleme + hızlı ekleme */}
            <div className="subtasks">
              {subtasks.length > 0 && (
                <ul className="sub-list">
                  {subtasks.map((s) => (
                    <li key={s.id}>
                      <label>
                        <input type="checkbox" checked={!!s.done} onChange={()=>toggleSubtask(s.id)} />
                        <span className={s.done ? "done" : ""}>{s.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
              <div className="sub-add inline">
                <input value={newSub} onChange={(e)=>setNewSub(e.target.value)} onKeyDown={(e)=> e.key==="Enter" && addSubtask()} placeholder="Alt görev ekle…" />
                <button className="btn" onClick={addSubtask}>Ekle</button>
              </div>
            </div>

            {/* DOSYALAR – görüntüleme */}
            {attachments.length > 0 && (
              <div className="attachments">
                <ul className="att-list">
                  {attachments.map((a) => (
                    <li key={a.path}>
                      <a href={a.url} target="_blank" rel="noreferrer">📎 {a.name}</a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      <div className="actions">
        {editing ? (
          <>
            <button className="btn" onClick={saveEdit}>Kaydet</button>
            <button className="btn ghost" onClick={()=>setEditing(false)}>Vazgeç</button>
          </>
        ) : (
          <>
            <button className="btn" onClick={()=>setEditing(true)}>Düzenle</button>
            <button className="btn" onClick={toggleRemind} title={todo.remind ? "Hatırlatıcıyı kapat" : "Hatırlatıcıyı aç"}>
              {todo.remind ? "🔕 Kapat" : "🔔 Hatırlat"}
            </button>
            {onTest && <button className="btn ghost" onClick={()=>onTest(todo)}>Şimdi dene</button>}
            <button className="btn danger" onClick={()=>onRemove?.(todo.id)}>Sil</button>
          </>
        )}
      </div>
    </li>
  );
}
