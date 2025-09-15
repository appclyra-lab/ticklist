// src/components/Auth.jsx
import { useState } from "react";
import { auth, googleProvider } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

export default function Auth() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      if (mode === "signin") {
        await signInWithEmailAndPassword(auth, email, pass);
      } else {
        await createUserWithEmailAndPassword(auth, email, pass);
      }
    } catch (e) {
      setErr(e.message || "Giriş/Kayıt hatası");
    }
  };

  const google = async () => {
    setErr("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setErr(e.message || "Google ile giriş hatası");
    }
  };

  return (
    <div className="container">
      <h1>{mode === "signin" ? "Giriş Yap" : "Kayıt Ol"}</h1>

      <form className="new-form" onSubmit={submit}>
        <input
          type="email"
          placeholder="E-posta"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Şifre (en az 6 karakter)"
          value={pass}
          onChange={(e)=>setPass(e.target.value)}
          required
        />
        <button type="submit">
          {mode === "signin" ? "Giriş Yap" : "Kayıt Ol"}
        </button>
      </form>

      <div className="toolbar">
        <div className="filters">
          <button onClick={()=>setMode(mode==="signin"?"signup":"signin")}>
            {mode === "signin" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}
          </button>
          <button onClick={google}>Google ile devam et</button>
        </div>
        {err && <div className="empty" style={{color:"#ef4444"}}>{err}</div>}
      </div>
    </div>
  );
}
