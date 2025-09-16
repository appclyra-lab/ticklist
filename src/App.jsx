import { useEffect, useState } from "react";
import "./styles.css";
import Auth from "./components/Auth.jsx";
import AuthedApp from "./components/AuthedApp.jsx";
import { auth } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function App() {
  const [user, setUser] = useState(null);

  // Tema state (light/dark)
  const [theme, setTheme] = useState(() => {
    return (
      localStorage.getItem("theme") ||
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light")
    );
  });

  // Tema class'ını html'e uygula
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Firebase auth değişikliklerini dinle
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  // Tema değiştirme fonksiyonu
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <>
      {/* Üst kısımda tema değiştirme butonu */}
      <div className="toolbar" style={{ padding: "10px", textAlign: "center" }}>
        <button type="button" onClick={toggleTheme}>
          {theme === "dark" ? "🌞 Açık Tema" : "🌙 Koyu Tema"}
        </button>
      </div>

      {/* Kullanıcı varsa uygulama, yoksa login ekranı */}
      {user ? <AuthedApp user={user} /> : <Auth />}
    </>
  );
}
