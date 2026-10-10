"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="flex w-full max-w-[320px] flex-col gap-4">
      <h1 className="text-[15px] font-semibold">BETONPOLI · вход</h1>
      <label className="label">
        Логин
        <input name="login" autoComplete="username" required className="field" />
      </label>
      <label className="label">
        Пароль
        <input name="password" type="password" autoComplete="current-password" required className="field" />
      </label>
      {state.error && <p className="text-danger">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Вход…" : "Войти"}
      </button>
    </form>
  );
}
