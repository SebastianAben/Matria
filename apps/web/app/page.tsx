const workflowItems = [
  'Encounter capture',
  'Rules-first preflight',
  'Clinician review',
  'Approval-gated export',
];

export default function HomePage() {
  return (
    <main className="workspace">
      <section className="statusBar" aria-label="System status">
        <div>
          <p className="eyebrow">Matria clinical workspace</p>
          <h1>Antenatal encounter review</h1>
        </div>
        <span className="statusPill">Decision support only</span>
      </section>

      <section className="panelGrid" aria-label="Clinical workflow">
        <div className="primaryPanel">
          <p className="sectionLabel">Phase 1 shell</p>
          <h2>Rules stay visible before AI synthesis.</h2>
          <p>
            This scaffold keeps deterministic safety checks, uncertainty, approval gates, and
            auditability as first-class product surfaces from the start.
          </p>
        </div>

        <div className="workflowPanel">
          {workflowItems.map((item, index) => (
            <div className="workflowRow" key={item}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{item}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
