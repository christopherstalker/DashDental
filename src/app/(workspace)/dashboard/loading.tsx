import styles from "@/features/dashboard/components/dashboard-screen.module.css";

export default function DashboardLoading() {
  return (
    <section className={styles.dashboard} aria-busy="true" aria-label="Loading dashboard">
      <header className={`${styles.header} ${styles.loadingBlock}`}>
        <div>
          <span className={styles.kicker}>Live recovery cockpit</span>
          <h1>Dashboard</h1>
          <p className={styles.summaryText}>Preparing clinic signals...</p>
        </div>
      </header>
      <div className={styles.metricStrip}>
        {Array.from({ length: 5 }, (_, index) => (
          <article className={`${styles.metricCard} ${styles.loadingBlock}`} key={index}>
            <span>Loading</span>
            <strong>...</strong>
            <p>Preparing instant shell</p>
          </article>
        ))}
      </div>
      <div className={styles.mainGrid}>
        <section className={`${styles.signalMapPanel} ${styles.loadingBlock}`} />
        <aside className={styles.controlRail}>
          <section className={`${styles.sidePanel} ${styles.loadingBlock}`} />
          <section className={`${styles.sidePanel} ${styles.loadingBlock}`} />
        </aside>
      </div>
    </section>
  );
}
