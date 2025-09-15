import { useEffect, useState } from "react";
import "./styles.css";
import Auth from "./components/Auth.jsx";
import AuthedApp from "./components/AuthedApp.jsx";
import { auth } from "./lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  return (
    <>
      <h1>TickList App v2 🚀</h1>
      {user ? <AuthedApp user={user} /> : <Auth />}
    </>
  );
}
