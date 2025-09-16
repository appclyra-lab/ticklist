import React, { useState } from "react";
import "./styles.css";

function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [filter, setFilter] = useState("Tümü");

  // Tema değiştirme
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    document.body.classList.toggle("dark-mode", !darkMode);
  };

  // Ses aç/kapa
  const toggleSound = () => {
    setSoundOn(!soundOn);
  };

  // Görev ekleme
  const addTask = () => {
    if (newTask.trim() === "") return;
    setTasks([...tasks, { text: newTask, done: false }]);
    setNewTask("");
  };

  // Görev durumunu değiştirme
  const toggleTask = (index) => {
    const updated = [...tasks];
    updated[index].done = !updated[index].done;
    setTasks(updated);
  };

  // Filtre
  const filteredTasks =
    filter === "Aktif"
      ? tasks.filter((t) => !t.done)
      : filter === "Tamamlanan"
      ? tasks.filter((t) => t.done)
      : tasks;

  return (
    <div className={`app ${darkMode ? "dark" : ""}`}>
      {/* Tema */}
      <button onClick={toggleTheme} className="btn">
        {darkMode ? "🌙 Koyu Tema" : "☀️ Açık Tema"}
      </button>

      {/* Ses */}
      <button onClick={toggleSound} className="btn">
        {soundOn ? "🔊 Ses açık" : "🔇 Ses kapalı"}
      </button>

      {/* Çıkış */}
      <button className="btn">Çıkış</button>

      <h1>TickList1</h1>

      {/* Görev ekleme */}
      <input
        type="text"
        placeholder="Yeni görev yaz ve Enter’a bas..."
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && addTask()}
      />
      <button onClick={addTask} className="btn">
        Ekle
      </button>

      {/* Filtreler */}
      <div>
        <button onClick={() => setFilter("Tümü")} className="btn">
          Tümü
        </button>
        <button onClick={() => setFilter("Aktif")} className="btn">
          Aktif
        </button>
        <button onClick={() => setFilter("Tamamlanan")} className="btn">
          Tamamlanan
        </button>
      </div>

      {/* Görev listesi */}
      <ul>
        {filteredTasks.map((task, i) => (
          <li
            key={i}
            onClick={() => toggleTask(i)}
            style={{ textDecoration: task.done ? "line-through" : "none" }}
          >
            {task.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
