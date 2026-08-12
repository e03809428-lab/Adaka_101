import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { Link } from "wouter";
import { AuthForm } from "../components/AuthForm";
import { supabase } from "../lib/supabase";
import "../game/game.css";

export function ProfilePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsChecking(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsChecking(false);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (isChecking) {
    return (
      <main className="shell">
        <section className="panel">
          <p>Проверяем вход...</p>
        </section>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="shell">
        <AuthForm />
      </main>
    );
  }

  const user = session.user;
  const name = user.user_metadata.full_name as string | undefined;
  const avatarUrl = user.user_metadata.avatar_url as string | undefined;

  return (
    <main className="shell">
      <section className="panel profile-panel">
        <Link className="menu-alt-game" href="/">На главную</Link>
        <h1>Профиль</h1>
        {avatarUrl && <img className="profile-avatar" src={avatarUrl} alt="" />}
        <p>{name ?? "Игрок"}</p>
        <p className="profile-email">{user.email}</p>
        <button onClick={signOut}>Выйти</button>
      </section>
    </main>
  );
}
