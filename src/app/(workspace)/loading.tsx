export default function Loading() {
  return (
    <section className="view-grid">
      <div className="metrics-row">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="metric-block" key={index}>
            <span>Loading workspace</span>
            <strong>...</strong>
            <small>Preparing clinic console</small>
          </div>
        ))}
      </div>
    </section>
  );
}
