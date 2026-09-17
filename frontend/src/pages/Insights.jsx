import React, { useEffect, useState } from 'react';
import axios from 'axios';
import parliamentBackground from '../assets/parliament-hero.png';

const API_BASE = 'https://mplads-ai-monitoring-g3m7.onrender.com';

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------

const getRiskTheme = (risk) => {
  if (risk === 'Critical Risk') {
    return {
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.10)',
      border: 'rgba(239, 68, 68, 0.28)',
    };
  }

  if (risk === 'High Risk') {
    return {
      color: '#f97316',
      bg: 'rgba(249, 115, 22, 0.10)',
      border: 'rgba(249, 115, 22, 0.28)',
    };
  }

  if (risk === 'Medium Risk') {
    return {
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.10)',
      border: 'rgba(245, 158, 11, 0.28)',
    };
  }

  return {
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.10)',
    border: 'rgba(34, 197, 94, 0.28)',
  };
};

const formatCurrency = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    Number.isNaN(Number(value))
  ) {
    return 'N/A';
  }

  return `₹${Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
};

const formatDays = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    Number.isNaN(Number(value))
  ) {
    return 'N/A';
  }

  return `${Number(value).toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })} days`;
};

const formatExpenditure = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === '' ||
    Number.isNaN(Number(value))
  ) {
    return 'N/A';
  }

  return `${(Number(value) * 100).toFixed(1)}%`;
};

// ---------------------------------------------------------
// Field visit checklist
// ---------------------------------------------------------

const buildFieldChecklist = (work) => {
  const category = String(
    work['Work category'] || work.work_category || ''
  ).toLowerCase();

  const description = String(
    work['Work description'] || work.work_description || ''
  ).toLowerCase();

  const indicators = Array.isArray(work.riskIndicators)
    ? work.riskIndicators.map((item) => String(item).toLowerCase())
    : [];

  const progress = String(work.progress || '').toLowerCase();

  const has = (...words) =>
    indicators.some((indicator) =>
      words.some((word) => indicator.includes(word))
    );

  const isInfrastructure =
    category.includes('road') ||
    category.includes('bridge') ||
    category.includes('construction') ||
    category.includes('building') ||
    category.includes('infrastructure') ||
    category.includes('drain') ||
    category.includes('water') ||
    description.includes('road') ||
    description.includes('bridge') ||
    description.includes('building') ||
    description.includes('construction');

  const isElectrical =
    category.includes('light') ||
    category.includes('electric') ||
    category.includes('electrical') ||
    category.includes('solar') ||
    category.includes('power') ||
    description.includes('light') ||
    description.includes('street light') ||
    description.includes('solar') ||
    description.includes('electrical');

  const checklist = [];

  const add = (text) => {
    if (!checklist.includes(text)) {
      checklist.push(text);
    }
  };

  // Basic verification for every flagged work
  add('Visit the work site and verify the current physical status of the work.');
  add(
    'Compare the physical progress observed on site with the progress reported in the records.'
  );

  // Infrastructure-specific checks
  if (isInfrastructure) {
    add(
      'Verify that the reported construction or infrastructure work exists at the site.'
    );
    add(
      'Check the completed physical components against the sanctioned work description.'
    );
  }

  // Electrical / lighting-specific checks
  if (isElectrical) {
    add(
      'Verify that the reported lights, electrical equipment, or installations are actually installed.'
    );
    add('Check whether the installed equipment is operational.');
    add(
      'Compare the observed installation quantity or type with the reported work details.'
    );
  }

  // Financial checks
  if (has('high expenditure', 'high cost', 'expenditure')) {
    add(
      'Compare expenditure incurred with the physical work actually completed.'
    );
    add(
      'Review relevant bills, payment records, and supporting expenditure documents.'
    );
  }

  // Incomplete work + high expenditure
  const incomplete =
    progress.includes('in progress') ||
    progress.includes('ongoing') ||
    progress.includes('not completed');

  if (
    incomplete &&
    has('high expenditure', 'high cost', 'expenditure')
  ) {
    add(
      'Record the actual stage of work and specifically compare physical progress against expenditure.'
    );
  }

  // Duration
  if (has('long duration')) {
    add(
      'Verify the actual project timeline and whether the work remains incomplete despite the recorded duration.'
    );
  }

  // Sanction/payment delays
  if (has('long sanction delay', 'late first payment', 'delay')) {
    add('Review the sanction and payment dates.');
    add(
      'Verify the documented reason for the delay and whether it affected work commencement or progress.'
    );
  }

  return checklist;
};

// ---------------------------------------------------------
// Metric
// ---------------------------------------------------------

const Metric = ({ label, value }) => (
  <div style={styles.metric}>
    <div style={styles.metricLabel}>{label}</div>
    <div style={styles.metricValue}>{value}</div>
  </div>
);

// ---------------------------------------------------------
// Work card
// ---------------------------------------------------------

const InvestigationCard = ({ work, index }) => {
  const [status, setStatus] = useState('');

  const riskTheme = getRiskTheme(work.final_risk_category);

  const description =
    work['Work description'] ||
    work.work_description ||
    'No description available';

  const category =
    work['Work category'] ||
    work.work_category ||
    'N/A';

  const riskIndicators = Array.isArray(work.riskIndicators)
    ? work.riskIndicators
    : [];

  const checklist = buildFieldChecklist(work);

  const recommendation = work.recommendation || {};

  return (
    <article
      style={{
        ...styles.card,
        borderTop: `3px solid ${riskTheme.color}`,
      }}
    >
      {/* Header */}
      <div style={styles.cardHeader}>
        <div>
          <div style={styles.priorityLabel}>
            PRIORITY INVESTIGATION #{index + 1}
          </div>

          <div style={styles.workId}>
            {work.work_id || 'N/A'}
          </div>

          <h3 style={styles.title}>{description}</h3>

          <div style={styles.locationRow}>
            <span>
              <strong>Category:</strong> {category}
            </span>

            <span>
              <strong>State:</strong> {work.State_x || 'N/A'}
            </span>

            <span>
              <strong>Constituency:</strong>{' '}
              {work.Constituency_x || 'N/A'}
            </span>
          </div>
        </div>

        <div style={styles.badgeColumn}>
          <span
            style={{
              ...styles.riskBadge,
              color: riskTheme.color,
              background: riskTheme.bg,
              borderColor: riskTheme.border,
            }}
          >
            {work.final_risk_category || 'Unclassified'}
          </span>

          <span style={styles.scoreBadge}>
            Risk Score{' '}
            {Number(work.risk_score || 0).toFixed(2)}
          </span>

          {work.alert_type && (
            <span style={styles.alertBadge}>
              {work.alert_type}
            </span>
          )}
        </div>
      </div>

      {/* Why flagged */}
      <section style={styles.section}>
        <SectionTitle title="Why This Work Is Flagged" />

        {riskIndicators.length > 0 ? (
          <div style={styles.chipContainer}>
            {riskIndicators.map((indicator, idx) => (
              <span key={idx} style={styles.riskChip}>
                {indicator}
              </span>
            ))}
          </div>
        ) : (
          <p style={styles.mutedText}>
            No individual risk indicators were returned.
          </p>
        )}

        {work.risk_reasons && (
          <p style={styles.explanation}>
            {work.risk_reasons}
          </p>
        )}
      </section>

      {/* Metrics */}
      <section style={styles.section}>
        <SectionTitle title="Project & Financial Details" />

        <div style={styles.metricsGrid}>
          <Metric
            label="Sanction Amount"
            value={formatCurrency(
              work['Sanction Amount ( ₹ )']
            )}
          />

          <Metric
            label="Expenditure Utilisation"
            value={formatExpenditure(
              work.expenditure_ratio
            )}
          />

          <Metric
            label="Reported Progress"
            value={work.progress || 'N/A'}
          />

          <Metric
            label="Project Duration"
            value={formatDays(work.duration_days)}
          />

          <Metric
            label="Sanction Delay"
            value={formatDays(work.sanction_delay_days)}
          />
        </div>
      </section>

      {/* Investigation */}
      <section style={styles.section}>
        <SectionTitle title="Recommended Investigation" />

        <div style={styles.investigationBox}>
          <div style={styles.flagBadge}>
            {recommendation.status ||
              'Flagged for Investigation'}
          </div>

          {recommendation.text && (
            <p style={styles.investigationText}>
              {recommendation.text}
            </p>
          )}

          {Array.isArray(recommendation.actions) &&
            recommendation.actions.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={styles.subLabel}>
                  INITIAL REVIEW ACTIONS
                </div>

                <div style={styles.actionList}>
                  {recommendation.actions.map((action, idx) => (
                    <div key={idx} style={styles.actionItem}>
                      <span style={styles.checkDot}>✓</span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </section>

      {/* Field visit */}
      <section style={styles.section}>
        <div style={styles.fieldHeader}>
          <div>
            <SectionTitle title="Field Verification Recommended" />

            <p style={styles.fieldIntro}>
              Conduct an on-site verification to validate the
              physical status of the work and compare observations
              with reported project and financial records.
            </p>
          </div>

          <span style={styles.fieldBadge}>
            FIELD VISIT
          </span>
        </div>

        <div style={styles.checklistBox}>
          <div style={styles.subLabel}>
            FIELD VISIT CHECKLIST
          </div>

          {checklist.map((item, idx) => (
            <div key={idx} style={styles.checklistItem}>
              <div style={styles.numberCircle}>
                {idx + 1}
              </div>

              <div>{item}</div>
            </div>
          ))}
        </div>

        <div style={styles.verificationNote}>
          These checks are intended to verify the indicators
          identified by the monitoring system. They do not by
          themselves establish fraud or wrongdoing.
        </div>
      </section>

      {/* UI actions */}
      <section style={styles.actionsSection}>
        <div style={styles.subLabel}>INVESTIGATION ACTIONS</div>

        <div style={styles.buttons}>
          <ActionButton
            label="Review Expenditure"
            onClick={() => setStatus('Expenditure review selected')}
          />

          <ActionButton
            label="Verify Documents"
            onClick={() => setStatus('Document verification selected')}
          />

          <ActionButton
            label="Verify Physical Progress"
            onClick={() => setStatus('Physical progress verification selected')}
          />

          <ActionButton
            primary
            label="Conduct Field Visit"
            onClick={() => setStatus('Field visit selected')}
          />

          <ActionButton
            success
            label="Mark as Reviewed"
            onClick={() => setStatus('Work marked as reviewed')}
          />
        </div>

        {status && (
          <div style={styles.statusMessage}>
            {status}
          </div>
        )}
      </section>
    </article>
  );
};

// ---------------------------------------------------------
// Small components
// ---------------------------------------------------------

const SectionTitle = ({ title }) => (
  <div style={styles.sectionTitleRow}>
    <div style={styles.sectionAccent} />
    <h4 style={styles.sectionTitle}>{title}</h4>
  </div>
);

const ActionButton = ({
  label,
  onClick,
  primary,
  success,
}) => {
  let background = '#111d2e';
  let border = '#26364c';

  if (primary) {
    background = '#1769aa';
    border = '#2785cf';
  }

  if (success) {
    background = '#176b4a';
    border = '#23845c';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...styles.button,
        background,
        borderColor: border,
      }}
    >
      {label}
    </button>
  );
};

// ---------------------------------------------------------
// Main Insights page
// ---------------------------------------------------------

const Insights = () => {
  const [works, setWorks] = useState([]);
  const [filterOptions, setFilterOptions] = useState({
    states: [],
    constituencies: [],
    riskLevels: [],
    alertTypes: [],
  });
  const [selectedState, setSelectedState] = useState('');
  const [selectedConstituency, setSelectedConstituency] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');
  const [selectedAlertType, setSelectedAlertType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadFilterOptions = async () => {
      try {
        const response = await axios.get(
          `${API_BASE}/api/insights/filters`
        );

        if (!active) return;

        setFilterOptions({
          states: Array.isArray(response.data?.states)
            ? response.data.states
            : [],
          constituencies: Array.isArray(response.data?.constituencies)
            ? response.data.constituencies
            : [],
          riskLevels: Array.isArray(response.data?.riskLevels)
            ? response.data.riskLevels
            : [],
          alertTypes: Array.isArray(response.data?.alertTypes)
            ? response.data.alertTypes
            : [],
        });
      } catch (err) {
        if (!active) return;

        setError(
          err?.response?.data?.detail ||
            err?.message ||
            'Unable to load insights filters.'
        );
      }
    };

    loadFilterOptions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadInsights = async () => {
      try {
        setLoading(true);
        setError('');

        const params = {};

        if (selectedState) params.state = selectedState;
        if (selectedConstituency) params.constituency = selectedConstituency;
        if (selectedRisk) params.risk = selectedRisk;
        if (selectedAlertType) params.alert_type = selectedAlertType;

        const response = await axios.get(
          `${API_BASE}/api/insights`,
          { params }
        );

        if (!active) return;

        const returnedWorks = Array.isArray(
          response.data?.works
        )
          ? response.data.works
          : [];

        setWorks(returnedWorks.slice(0, 5));
      } catch (err) {
        if (!active) return;

        setError(
          err?.response?.data?.detail ||
            err?.message ||
            'Unable to load priority investigations.'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadInsights();

    return () => {
      active = false;
    };
  }, [
    selectedState,
    selectedConstituency,
    selectedRisk,
    selectedAlertType,
  ]);

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        .insights-page {
          min-height: calc(100vh - 72px);
          background:
            linear-gradient(rgba(3, 11, 22, 0.78), rgba(3, 11, 22, 0.84)),
            url('${parliamentBackground}') center / cover fixed,
            radial-gradient(circle at 15% 10%, rgba(22, 91, 145, 0.14), transparent 30%),
            radial-gradient(circle at 85% 25%, rgba(20, 74, 115, 0.10), transparent 28%),
            #030b16;
          color: #e8eef6;
          padding: 52px 24px 80px;
        }

        .insights-container {
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        .insights-header {
          margin-bottom: 42px;
        }

        .insights-kicker {
          color: #4da3e8;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.24em;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .insights-heading {
          margin: 0 0 14px;
          font-size: clamp(34px, 5vw, 48px);
          line-height: 1;
          font-weight: 750;
          letter-spacing: -0.035em;
        }

        .insights-description {
          max-width: 820px;
          margin: 0;
          color: #8fa1b5;
          font-size: 15px;
          line-height: 1.75;
        }

        .priority-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 20px;
          margin-bottom: 20px;
        }

        .priority-title {
          margin: 0;
          font-size: 23px;
          font-weight: 700;
        }

        .priority-subtitle {
          margin: 7px 0 0;
          color: #687b91;
          font-size: 13px;
        }

        .priority-count {
          color: #6e8298;
          font-size: 12px;
          white-space: nowrap;
        }

        .insights-filters {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 38px;
          padding: 18px;
          background: rgba(10, 20, 34, 0.72);
          border: 1px solid #1d3045;
          border-radius: 14px;
          box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
        }

        .insights-filter {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .insights-filter label {
          color: #8093a8;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .insights-filter select {
          width: 100%;
          min-width: 0;
          padding: 11px 12px;
          color: #dce8f2;
          background: #0b1727;
          border: 1px solid #1b3046;
          border-radius: 9px;
          font: inherit;
          font-size: 12px;
          outline: none;
          cursor: pointer;
        }

        .insights-filter select:hover {
          border-color: #294b68;
        }

        .insights-filter select:focus {
          border-color: #3195d5;
          box-shadow: 0 0 0 3px rgba(49, 149, 213, 0.12);
        }

        .insights-filter select option {
          color: #dce8f2;
          background: #0b1727;
        }

        @media (max-width: 700px) {
          .insights-page {
            padding: 36px 16px 60px;
          }

          .priority-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .insights-filters {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 460px) {
          .insights-filters {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <main className="insights-page">
        <div className="insights-container">

          {/* Header */}
          <header className="insights-header">
            <div className="insights-kicker">
              Risk Intelligence
            </div>

            <h1 className="insights-heading">
              Insights
            </h1>

            <p className="insights-description">
              Model-backed observations on fund utilisation,
              project delays, and geographic concentration are
              translated into priority investigations and
              recommended verification actions for public works.
            </p>
          </header>

          <div className="insights-filters">
            <div className="insights-filter">
              <label htmlFor="insights-state">State</label>
              <select
                id="insights-state"
                value={selectedState}
                onChange={(event) => setSelectedState(event.target.value)}
              >
                <option value="">All</option>
                {filterOptions.states.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div className="insights-filter">
              <label htmlFor="insights-constituency">Constituency</label>
              <select
                id="insights-constituency"
                value={selectedConstituency}
                onChange={(event) => setSelectedConstituency(event.target.value)}
              >
                <option value="">All</option>
                {filterOptions.constituencies.map((constituency) => (
                  <option key={constituency} value={constituency}>{constituency}</option>
                ))}
              </select>
            </div>

            <div className="insights-filter">
              <label htmlFor="insights-risk">Risk Level</label>
              <select
                id="insights-risk"
                value={selectedRisk}
                onChange={(event) => setSelectedRisk(event.target.value)}
              >
                <option value="">All</option>
                {filterOptions.riskLevels.map((risk) => (
                  <option key={risk} value={risk}>{risk}</option>
                ))}
              </select>
            </div>

            <div className="insights-filter">
              <label htmlFor="insights-alert-type">Alert Type</label>
              <select
                id="insights-alert-type"
                value={selectedAlertType}
                onChange={(event) => setSelectedAlertType(event.target.value)}
              >
                <option value="">All</option>
                {filterOptions.alertTypes.map((alertType) => (
                  <option key={alertType} value={alertType}>{alertType}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Priority header */}
          <div className="priority-header">
            <div>
              <h2 className="priority-title">
                Top 5 Priority Investigations
              </h2>

              <p className="priority-subtitle">
                Works requiring further verification based on
                existing risk and anomaly signals.
              </p>
            </div>

            {!loading && !error && (
              <div className="priority-count">
                {works.length} priority works
              </div>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={styles.messageBox}>
              <div style={styles.spinner} />
              <div>Loading priority investigations...</div>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div style={styles.errorBox}>
              <strong>Unable to load insights</strong>
              <p>{error}</p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && works.length === 0 && (
            <div style={styles.messageBox}>
              No priority investigations were returned by the
              monitoring API.
            </div>
          )}

          {/* Works */}
          {!loading && !error && works.length > 0 && (
            <div style={styles.cards}>
              {works.map((work, index) => (
                <InvestigationCard
                  key={work.work_id || index}
                  work={work}
                  index={index}
                />
              ))}
            </div>
          )}

          {/* Footer note */}
          {!loading && !error && works.length > 0 && (
            <div style={styles.footerNote}>
              <strong>Verification note:</strong> Risk scores and
              anomaly signals identify works for further review.
              They are not, by themselves, evidence of fraud or
              wrongdoing.
            </div>
          )}

        </div>
      </main>
    </>
  );
};

// ---------------------------------------------------------
// Styles
// ---------------------------------------------------------

const styles = {
  card: {
    background: 'rgba(10, 20, 34, 0.94)',
    border: '1px solid #1d3045',
    borderRadius: 18,
    overflow: 'hidden',
    boxShadow: '0 18px 50px rgba(0, 0, 0, 0.25)',
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 28,
    padding: 28,
    borderBottom: '1px solid #182a3e',
  },

  priorityLabel: {
    color: '#4da3e8',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.18em',
    marginBottom: 10,
  },

  workId: {
    color: '#8093a8',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 9,
  },

  title: {
    margin: 0,
    color: '#f1f6fb',
    fontSize: 20,
    lineHeight: 1.45,
    fontWeight: 650,
    maxWidth: 760,
  },

  locationRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px 22px',
    marginTop: 15,
    color: '#778ba0',
    fontSize: 12,
    lineHeight: 1.6,
  },

  badgeColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 7,
    minWidth: 145,
  },

  riskBadge: {
    border: '1px solid',
    borderRadius: 999,
    padding: '7px 12px',
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },

  scoreBadge: {
    color: '#65b6f3',
    background: 'rgba(38, 130, 196, 0.10)',
    border: '1px solid rgba(38, 130, 196, 0.25)',
    borderRadius: 999,
    padding: '7px 12px',
    fontSize: 11,
    fontWeight: 650,
    whiteSpace: 'nowrap',
  },

  alertBadge: {
    color: '#c2cfdd',
    background: '#101d2d',
    border: '1px solid #27384d',
    borderRadius: 999,
    padding: '7px 12px',
    fontSize: 11,
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },

  section: {
    padding: '24px 28px',
    borderBottom: '1px solid #182a3e',
  },

  sectionTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 9,
    marginBottom: 15,
  },

  sectionAccent: {
    width: 4,
    height: 19,
    borderRadius: 5,
    background: '#3195d5',
  },

  sectionTitle: {
    margin: 0,
    color: '#dce7f1',
    fontSize: 12,
    fontWeight: 750,
    letterSpacing: '0.11em',
    textTransform: 'uppercase',
  },

  chipContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },

  riskChip: {
    color: '#ffb1b1',
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.22)',
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 11,
    fontWeight: 600,
  },

  explanation: {
    color: '#899caf',
    fontSize: 13,
    lineHeight: 1.7,
    margin: '14px 0 0',
  },

  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: 10,
  },

  metric: {
    background: '#0b1727',
    border: '1px solid #1b3046',
    borderRadius: 11,
    padding: '13px 14px',
    minHeight: 70,
  },

  metricLabel: {
    color: '#64788e',
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.11em',
    textTransform: 'uppercase',
    marginBottom: 7,
  },

  metricValue: {
    color: '#edf4fa',
    fontSize: 14,
    fontWeight: 650,
    lineHeight: 1.4,
  },

  investigationBox: {
    background: 'rgba(245, 158, 11, 0.045)',
    border: '1px solid rgba(245, 158, 11, 0.20)',
    borderRadius: 13,
    padding: 18,
  },

  flagBadge: {
    display: 'inline-block',
    color: '#f7c96b',
    background: 'rgba(245, 158, 11, 0.09)',
    border: '1px solid rgba(245, 158, 11, 0.25)',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.05em',
  },

  investigationText: {
    color: '#a9b7c6',
    fontSize: 13,
    lineHeight: 1.7,
    margin: '13px 0 0',
  },

  subLabel: {
    color: '#62778c',
    fontSize: 9,
    fontWeight: 750,
    letterSpacing: '0.13em',
    marginBottom: 11,
  },

  actionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },

  actionItem: {
    display: 'flex',
    gap: 9,
    color: '#aebdcb',
    fontSize: 12,
    lineHeight: 1.55,
  },

  checkDot: {
    color: '#e5b75b',
    fontWeight: 800,
  },

  fieldHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 15,
  },

  fieldBadge: {
    color: '#5eb3ed',
    background: 'rgba(49, 149, 213, 0.08)',
    border: '1px solid rgba(49, 149, 213, 0.25)',
    borderRadius: 999,
    padding: '6px 10px',
    fontSize: 9,
    fontWeight: 750,
    letterSpacing: '0.1em',
    whiteSpace: 'nowrap',
  },

  fieldIntro: {
    color: '#8397ab',
    fontSize: 12,
    lineHeight: 1.7,
    margin: '-4px 0 16px 13px',
    maxWidth: 820,
  },

  checklistBox: {
    background: '#081525',
    border: '1px solid #1b3047',
    borderRadius: 13,
    padding: 18,
  },

  checklistItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 11,
    color: '#c3cfdb',
    fontSize: 12,
    lineHeight: 1.65,
    padding: '9px 0',
    borderBottom: '1px solid rgba(35, 55, 76, 0.45)',
  },

  numberCircle: {
    flex: '0 0 22px',
    width: 22,
    height: 22,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: 'rgba(49, 149, 213, 0.10)',
    border: '1px solid rgba(49, 149, 213, 0.25)',
    color: '#63b5ed',
    fontSize: 10,
    fontWeight: 700,
  },

  verificationNote: {
    color: '#62768a',
    fontSize: 10,
    lineHeight: 1.65,
    marginTop: 12,
  },

  actionsSection: {
    padding: '22px 28px 26px',
  },

  buttons: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },

  button: {
    color: '#dce8f2',
    border: '1px solid',
    borderRadius: 8,
    padding: '9px 12px',
    fontSize: 10,
    fontWeight: 650,
    cursor: 'pointer',
  },

  statusMessage: {
    marginTop: 12,
    color: '#6faed6',
    fontSize: 11,
  },

  messageBox: {
    minHeight: 180,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    color: '#75899e',
    background: 'rgba(10, 20, 34, 0.85)',
    border: '1px solid #1c3045',
    borderRadius: 16,
    fontSize: 13,
  },

  spinner: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    border: '2px solid #29435c',
    borderTopColor: '#3195d5',
  },

  errorBox: {
    background: 'rgba(127, 29, 29, 0.15)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: 14,
    padding: 20,
    color: '#f3a2a2',
    fontSize: 13,
  },

  footerNote: {
    marginTop: 22,
    padding: '14px 16px',
    color: '#60758a',
    background: 'rgba(9, 18, 30, 0.65)',
    border: '1px solid #15283b',
    borderRadius: 10,
    fontSize: 10,
    lineHeight: 1.65,
  },

  cards: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },

  mutedText: {
    color: '#667a8f',
    fontSize: 12,
  },
};

export default Insights;