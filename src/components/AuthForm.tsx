import { FormEvent, useState } from "react";
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
      options: { emailRedirectTo: `${window.location.origin}/profile` },
    });

    setIsLoading(false);
    setMessage(error ? error.message : "Проверь почту: туда пришла ссылка для входа.");
  }

  async function signInWithGoogle() {
    setIsLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/profile` },
    });

    if (error) {
      setIsLoading(false);
      setMessage(error.message);
    }
  }

  return (
    <section className="panel auth-panel">
      <h1>Вход</h1>
      <button className="google-button" disabled={isLoading} onClick={signInWithGoogle}>
        Войти через Google
      </button>
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
