"use client";

import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import { apiRequest } from "../../lib/api";
import { ActionButton, Field } from "../components/clinical-ui";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@matriacare.site");
  const [password, setPassword] = useState("change-me-in-local-dev");
  const [message, setMessage] = useState("Use an authorized clinical or admin account.");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("Signing in...");
    const response = await apiRequest<{ user: { email: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setMessage(response.success ? `Signed in as ${response.data.user.email}` : response.error.message);
  }

  return (
    <section className="login-panel">
      <div className="brand-mark" style={{ placeItems: "start", marginBottom: 18 }}>
        <span className="brand-symbol">M</span>
        <span>Matria</span>
      </div>
      <h1>Clinical Sign In</h1>
      <p>{message}</p>
      <form onSubmit={onSubmit}>
        <Field label="Email">
          <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Password">
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </Field>
        <ActionButton type="submit">
          <LogIn size={15} />
          Sign in
        </ActionButton>
      </form>
    </section>
  );
}
