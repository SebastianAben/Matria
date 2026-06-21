export default function WorkspacePage() {
  return (
    <div className="grid">
      <div className="topbar">
        <div>
          <h1 className="page-title">Clinical Workspace</h1>
          <p className="muted">ANC encounter capture is available under Patients.</p>
        </div>
        <span className="status">Ambient intelligence pending later phases</span>
      </div>
      <section className="panel">
        <h2>Current Scope</h2>
        <p className="muted">
          This workspace shell is ready for patient, pregnancy episode, encounter, consent,
          observation, and session note capture. Live transcript, Gemini synthesis, MedGemma
          evidence, rules, approvals, and FHIR exports are intentionally deferred to later phases.
        </p>
      </section>
    </div>
  );
}
