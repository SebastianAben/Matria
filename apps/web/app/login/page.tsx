"use client";

import { FormEvent, useState } from "react";
import { apiRequest } from "../../lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("admin@matriacare.site");
  const [password, setPassword] = useState("change-me-in-local-dev");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("Signing in...");
    const response = await apiRequest<{ user: { email: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    setMessage(
      response.success ? `Signed in as ${response.data.user.email}` : response.error.message
    );
  }

  return (
    <div className="grid">
      <div className="topbar">
        <h1 className="page-title">Login</h1>
      </div>
      <section className="panel">
        <form className="form-grid" onSubmit={onSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <button className="button" type="submit">
            Sign in
          </button>
          {message ? <p className="muted">{message}</p> : null}
        </form>
      </section>
    </div>
  );
}
