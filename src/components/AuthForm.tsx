import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { supabase } from "../lib/supabase";

export function AuthForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function signInWithEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/game` },
    });

    setIsLoading(false);
    setMessage(error ? error.message : "Проверь почту: туда пришла ссылка для входа.");
  }

  async function signInWithGoogle() {
    setIsLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/game` },
    });

    if (error) {
      setIsLoading(false);
      setMessage(error.message);
    }
  }

  return (
    <section className="panel auth-panel">
      <Link className="menu-alt-game" href="/game">В меню 1 игры</Link>
      <h1>Вход</h1>
      <button className="google-button" disabled={isLoading} onClick={signInWithGoogle}>
        {isLoading ? "Открываем Google..." : "Войти через Google"}
      </button>
      <p className="auth-hint">После входа Google вернет тебя в меню 1 игры.</p>
      <form className="auth-form" onSubmit={signInWithEmail}>
        <label>
          <span>Email</span>
          <input
            type="email"
            required
            value={email}
            placeholder="you@example.com"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button disabled={isLoading}>{isLoading ? "Подожди..." : "Войти по email"}</button>
      </form>
      {message && <p className="auth-message">{message}</p>}
    </section>
  );
}
