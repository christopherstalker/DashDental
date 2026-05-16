"use client";

import { useMemo, useState } from "react";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
});

function clamp(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function CalculatorField({
  label,
  max,
  min,
  onChange,
  suffix,
  value,
}: {
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  suffix?: string;
  value: number;
}) {
  return (
    <label className="roi-field">
      <span>{label}</span>
      <div>
        <input
          max={max}
          min={min}
          onChange={(event) => onChange(clamp(Number(event.target.value), min, max))}
          type="number"
          value={value}
        />
        {suffix ? <b>{suffix}</b> : null}
      </div>
    </label>
  );
}

export function RoiCalculator() {
  const [monthlyMessages, setMonthlyMessages] = useState(120);
  const [missedLateRate, setMissedLateRate] = useState(15);
  const [averageTreatmentValue, setAverageTreatmentValue] = useState(450);
  const [recoveryToConsultRate, setRecoveryToConsultRate] = useState(25);
  const [treatmentAcceptanceRate, setTreatmentAcceptanceRate] = useState(35);

  const result = useMemo(() => {
    const messagesAtRisk = monthlyMessages * (missedLateRate / 100);
    const potentialRecoveredConsults = messagesAtRisk * (recoveryToConsultRate / 100);
    const estimatedMonthlyRecoveryValue =
      potentialRecoveredConsults *
      averageTreatmentValue *
      (treatmentAcceptanceRate / 100);

    return {
      estimatedMonthlyRecoveryValue,
      messagesAtRisk,
      potentialRecoveredConsults,
    };
  }, [
    averageTreatmentValue,
    missedLateRate,
    monthlyMessages,
    recoveryToConsultRate,
    treatmentAcceptanceRate,
  ]);

  return (
    <section className="roi-calculator" aria-label="Missed lead recovery calculator">
      <div className="roi-calculator-copy">
        <h3>Estimate missed-message recovery value</h3>
        <p>
          Adjust conservative assumptions for your clinic. This is a planning estimate,
          not a booking or treatment-value promise.
        </p>
      </div>

      <div className="roi-fields">
        <CalculatorField
          label="Monthly inbound patient messages"
          max={5000}
          min={0}
          onChange={setMonthlyMessages}
          value={monthlyMessages}
        />
        <CalculatorField
          label="Missed or late response rate"
          max={100}
          min={0}
          onChange={setMissedLateRate}
          suffix="%"
          value={missedLateRate}
        />
        <CalculatorField
          label="Average treatment opportunity"
          max={50000}
          min={0}
          onChange={setAverageTreatmentValue}
          suffix="USD"
          value={averageTreatmentValue}
        />
        <CalculatorField
          label="Recovery-to-consult rate"
          max={100}
          min={0}
          onChange={setRecoveryToConsultRate}
          suffix="%"
          value={recoveryToConsultRate}
        />
        <CalculatorField
          label="Treatment acceptance rate"
          max={100}
          min={0}
          onChange={setTreatmentAcceptanceRate}
          suffix="%"
          value={treatmentAcceptanceRate}
        />
      </div>

      <div className="roi-results">
        <article>
          <span>Messages at risk</span>
          <strong>{numberFormatter.format(result.messagesAtRisk)}</strong>
        </article>
        <article>
          <span>Potential recovered consults</span>
          <strong>{numberFormatter.format(result.potentialRecoveredConsults)}</strong>
        </article>
        <article className="highlight">
          <span>Estimated monthly recovery value</span>
          <strong>{currencyFormatter.format(result.estimatedMonthlyRecoveryValue)}</strong>
        </article>
      </div>

      <p className="roi-disclaimer">
        Estimates are for planning only. Actual bookings and treatment value depend on
        your team, market, treatment mix, and patient decisions.
      </p>
    </section>
  );
}
