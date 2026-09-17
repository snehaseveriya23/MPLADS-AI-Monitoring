import { useEffect, useState } from 'react'
import axios from 'axios'
import indiaMap from '@svg-maps/india'

const API_BASE = 'https://mplads-ai-monitoring-g3m7.onrender.com'  // TODO: Change to the actual API base URL 

const RISK_CONFIG = [
  {
    name: 'Critical Risk',
    color: '#ef4444',
  },
  {
    name: 'High Risk',
    color: '#f97316',
  },
  {
    name: 'Medium Risk',
    color: '#f59e0b',
  },
  {
    name: 'Low Risk',
    color: '#22c55e',
  },
]

// Low-to-high color scale for expenditure utilization ranges, matching
// the color logic already used in the source Streamlit dashboard (app.py).
const UTILIZATION_COLORS = {
  '0–20%': '#388E3C',
  '20–40%': '#8BC34A',
  '40–60%': '#FBC02D',
  '60–80%': '#F57C00',
  '80–100%': '#D32F2F',
}

function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [states, setStates] = useState([])
  const [selectedState, setSelectedState] = useState('')
  const [selectedRisk, setSelectedRisk] = useState('')
  const [filteredTotal, setFilteredTotal] = useState(null)
  const [filteredWorks, setFilteredWorks] = useState([])
  const [riskDistribution, setRiskDistribution] = useState([])
  const [expenditureUtilization, setExpenditureUtilization] = useState([])
  const [stateRisk, setStateRisk] = useState([])
  const [topRiskyWorks, setTopRiskyWorks] = useState([])
  const [priorityAlerts, setPriorityAlerts] = useState({ total: 0, alerts: [] })

  const [riskIndicators, setRiskIndicators] = useState([])
  const [hoveredMapState, setHoveredMapState] = useState(null)

  const [searchId, setSearchId] = useState('')
  const [investigation, setInvestigation] = useState(null)
  const [investigationError, setInvestigationError] = useState('')
  const [investigationLoading, setInvestigationLoading] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const filterParams = () => {
    const params = {}

    if (selectedState) {
      params.state = selectedState
    }

    if (selectedRisk) {
      params.risk = selectedRisk
    }

    return params
  }

  // --------------------------------------------------
  // INITIAL DATA
  // --------------------------------------------------

  useEffect(() => {
    Promise.all([
      axios.get(`${API_BASE}/api/dashboard/summary`),
      axios.get(`${API_BASE}/api/dashboard/filters`),
      axios.get(`${API_BASE}/api/dashboard/risk-distribution`),
    ])
    .then(([summaryResponse, filtersResponse, riskResponse]) => {
      setSummary(summaryResponse.data)
      setStates(filtersResponse.data.states)

      setRiskDistribution(
        Array.isArray(riskResponse.data)
          ? riskResponse.data
          : []
      )

      setLoading(false)
    })
    .catch(() => {
      setError('Unable to connect to the MPLADS monitoring API.')
      setLoading(false)
    })
  }, [])

  // --------------------------------------------------
  // FILTER DATA
  // --------------------------------------------------

  useEffect(() => {
    const params = filterParams()

    axios
      .get(`${API_BASE}/api/dashboard/works`, { params })
      .then((response) => {
        setFilteredTotal(response.data.total)
        setFilteredWorks(
          Array.isArray(response.data.works)
            ? response.data.works
            : []
        )
      })
      .catch(() => {
        setFilteredTotal(null)
        setFilteredWorks([])
      })

    axios
      .get(`${API_BASE}/api/dashboard/risk-distribution`, { params })
      .then((response) => {
        setRiskDistribution(
          Array.isArray(response.data)
            ? response.data
            : []
        )
      })
      .catch(() => {
        setRiskDistribution([])
      })

    axios
      .get(`${API_BASE}/api/dashboard/expenditure-utilization`, { params })
      .then((response) => {
        setExpenditureUtilization(
          Array.isArray(response.data) ? response.data : []
        )
      })
      .catch(() => {
        setExpenditureUtilization([])
      })

    axios
      .get(`${API_BASE}/api/dashboard/state-risk`, { params })
      .then((response) => {
        setStateRisk(Array.isArray(response.data) ? response.data : [])
      })
      .catch(() => {
        setStateRisk([])
      })

    axios
      .get(`${API_BASE}/api/dashboard/top-risky-works`, { params })
      .then((response) => {
        setTopRiskyWorks(Array.isArray(response.data) ? response.data : [])
      })
      .catch(() => {
        setTopRiskyWorks([])
      })

    axios
      .get(`${API_BASE}/api/dashboard/priority-alerts`, { params })
      .then((response) => {
        setPriorityAlerts({
          total: Number(response.data?.total ?? 0),
          alerts: Array.isArray(response.data?.alerts)
            ? response.data.alerts
            : [],
        })
      })
      .catch(() => {
        setPriorityAlerts({ total: 0, alerts: [] })
      })

    axios
      .get(`${API_BASE}/api/dashboard/risk-indicators`, { params })
      .then((response) => {
        setRiskIndicators(Array.isArray(response.data) ? response.data : [])
      })
      .catch(() => {
        setRiskIndicators([])
      })
  }, [selectedState, selectedRisk])

  // --------------------------------------------------
  // GET RISK COUNT
  // --------------------------------------------------

  const getRiskCount = (riskName) => {
    const item = riskDistribution.find((entry) => {
      const apiRiskName = String(
        entry.risklevel ?? entry.riskLevel ?? ''
      )
        .trim()
        .toLowerCase()

      return (
        apiRiskName === riskName.toLowerCase()
      )
    })

    return Number(item?.works ?? 0)
  }

  const critical = getRiskCount('Critical Risk')
  const high = getRiskCount('High Risk')
  const medium = getRiskCount('Medium Risk')
  const low = getRiskCount('Low Risk')

  const riskTotal =
    critical +
    high +
    medium +
    low

  const riskPercent = (value) =>
    riskTotal ? Math.round((value / riskTotal) * 1000) / 10 : 0

  // --------------------------------------------------
  // DONUT GEOMETRY
  // --------------------------------------------------

  const rawAngles = [
    critical,
    high,
    medium,
    low,
  ].map((value) =>
    riskTotal
      ? (value / riskTotal) * 360
      : 0
  )

  const minimumAngle = 4

  const visibleAngles = [...rawAngles]

  if (riskTotal > 0) {
    let extraRequired = 0

    visibleAngles.forEach((angle, index) => {
      if (rawAngles[index] > 0 && angle < minimumAngle) {
        extraRequired += minimumAngle - angle
        visibleAngles[index] = minimumAngle
      }
    })

    const adjustable = visibleAngles
      .map((angle, index) =>
        rawAngles[index] >= minimumAngle
          ? index
          : null
      )
      .filter((index) => index !== null)

    if (extraRequired > 0 && adjustable.length > 0) {
      const adjustableTotal = adjustable.reduce(
        (total, index) =>
          total + visibleAngles[index],
        0
      )

      adjustable.forEach((index) => {
        const reduction =
          extraRequired *
          (visibleAngles[index] /
            adjustableTotal)

        visibleAngles[index] -= reduction
      })
    }
  }

  const donutItems = RISK_CONFIG.map(
    (risk, index) => ({
      ...risk,
      works: [
        critical,
        high,
        medium,
        low,
      ][index],
      angle: visibleAngles[index],
      actualAngle: rawAngles[index],
    })
  )

  const describeArc = (
    startAngle,
    endAngle,
    radius
  ) => {
    const startRadians =
      ((startAngle - 90) * Math.PI) / 180

    const endRadians =
      ((endAngle - 90) * Math.PI) / 180

    const startX =
      110 + radius * Math.cos(startRadians)

    const startY =
      110 + radius * Math.sin(startRadians)

    const endX =
      110 + radius * Math.cos(endRadians)

    const endY =
      110 + radius * Math.sin(endRadians)

    const largeArcFlag =
      endAngle - startAngle > 180
        ? 1
        : 0

    return [
      `M 110 110`,
      `L ${startX} ${startY}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `Z`,
    ].join(' ')
  }

  // --------------------------------------------------
  // CLICK RISK
  // --------------------------------------------------

  // Clicking a donut segment or legend entry toggles the same Risk
  // Level filter as the dropdown, so every section (works table, top
  // risky works, priority alerts, state chart, indicator chart) stays
  // consistent with what the donut is showing.
  const toggleRiskFilter = (riskName) => {
    setSelectedRisk((current) =>
      current === riskName ? '' : riskName
    )
  }

  const handleWorkSearch = (event) => {
    event.preventDefault()

    const value = searchId.trim()

    if (!value) {
      setInvestigation(null)
      setInvestigationError('Enter a Work ID to investigate.')
      return
    }

    setInvestigationLoading(true)
    setInvestigationError('')
    setInvestigation(null)

    axios
      .get(`${API_BASE}/api/dashboard/work`, {
        params: { work_id: value },
      })
      .then((response) => {
        const rows = Array.isArray(response.data)
          ? response.data
          : []

        if (rows.length === 0) {
          setInvestigationError('No work found with this Work ID.')
          return
        }

        setInvestigation(rows)
      })
      .catch((requestError) => {
        const detail = requestError.response?.data?.detail
        setInvestigationError(
          detail || 'No work found with this Work ID.'
        )
      })
      .finally(() => {
        setInvestigationLoading(false)
      })
  }

  const formatNumber = (value, digits = 0) => {
    const amount = Number(value)

    if (!Number.isFinite(amount)) {
      return '—'
    }

    return amount.toLocaleString(undefined, {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    })
  }

  // --------------------------------------------------
  // CHART RENDERERS (self-contained SVG, no chart library)
  // --------------------------------------------------

  const renderColumnChart = (
    rows,
    { labelKey, valueKey, colorFn, height = 260 }
  ) => {
    const chartWidth = 640
    const chartHeight = height
    const paddingBottom = 52
    const paddingTop = 24
    const usableHeight = chartHeight - paddingBottom - paddingTop
    const max = Math.max(1, ...rows.map((row) => Number(row[valueKey]) || 0))
    const gap = 20
    const count = Math.max(rows.length, 1)
    const barWidth = (chartWidth - gap * (count + 1)) / count

    return (
      <svg
        className="chart-svg"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label="Bar chart"
        preserveAspectRatio="xMidYMid meet"
      >
        <line
          x1="0"
          y1={chartHeight - paddingBottom}
          x2={chartWidth}
          y2={chartHeight - paddingBottom}
          className="chart-baseline"
        />

        {rows.map((row, index) => {
          const value = Number(row[valueKey]) || 0
          const barHeight = (value / max) * usableHeight
          const x = gap + index * (barWidth + gap)
          const y = chartHeight - paddingBottom - barHeight

          return (
            <g key={String(row[labelKey])}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, value > 0 ? 2 : 0)}
                rx="4"
                fill={colorFn ? colorFn(row, index) : '#3b82f6'}
                className="chart-bar"
              >
                <title>
                  {`${row[labelKey]}: ${formatNumber(value)}`}
                </title>
              </rect>

              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                className="chart-bar-value"
              >
                {formatNumber(value)}
              </text>

              <text
                x={x + barWidth / 2}
                y={chartHeight - paddingBottom + 20}
                textAnchor="middle"
                className="chart-bar-label"
              >
                {row[labelKey]}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  const normalizeStateName = (name) => (
    String(name || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
  )

  const renderIndiaMap = () => {
    const stateRiskByName = new Map(
      stateRisk.map((item) => [
        normalizeStateName(item.state),
        Number(item.works) || 0,
      ])
    )

    const selectedStateName = normalizeStateName(selectedState)
    const maxWorks = Math.max(
      1,
      ...stateRisk.map((item) => Number(item.works) || 0)
    )

    const getMapStateName = (name) => (
      name === 'Andaman and Nicobar Islands'
        ? 'Andaman And Nicobar Islands'
        : name
    )

    return (
      <div className="india-map-wrapper">
        <svg
          className="india-map"
          viewBox={indiaMap.viewBox}
          role="img"
          aria-label="India map showing high and critical risk works by state"
        >
          {indiaMap.locations.map((location) => {
            const apiStateName = getMapStateName(location.name)
            const normalizedName = normalizeStateName(apiStateName)
            const works = stateRiskByName.get(normalizedName)
            const isSelected = selectedStateName === normalizedName
            const hasSelectedState = Boolean(selectedStateName)
            const fill = works
              ? `rgba(239, 68, 68, ${0.32 + (works / maxWorks) * 0.58})`
              : '#12263a'

            return (
              <path
                key={location.id}
                d={location.path}
                className={`india-map-state${
                  isSelected ? ' india-map-state--selected' : ''
                }${hasSelectedState && !isSelected ? ' india-map-state--muted' : ''}`}
                fill={fill}
                onMouseEnter={() => setHoveredMapState({
                  name: apiStateName,
                  works,
                })}
                onMouseLeave={() => setHoveredMapState(null)}
                onFocus={() => setHoveredMapState({
                  name: apiStateName,
                  works,
                })}
                onBlur={() => setHoveredMapState(null)}
                tabIndex={0}
                role="img"
                aria-label={apiStateName}
              />
            )
          })}
        </svg>

        {hoveredMapState && (
          <div className="india-map-tooltip" role="status">
            <strong>{hoveredMapState.name}</strong>
            {hoveredMapState.works !== undefined && (
              <span>
                High/Critical risk works:{' '}
                {formatNumber(hoveredMapState.works)}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <>
      {/*
        Layout-only styling for the Dashboard page.
        Scoped to ".dashboard-view" (an extra class added only on this
        page's <main>) so nothing here can affect the Home, Insights,
        or About pages, which don't carry that class.
      */}
      <style>{`
        .inner-page.dashboard-view {
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 72px);
          width: 100%;
        }

        .inner-page.dashboard-view .inner-page__panel {
          width: min(1200px, 94%);
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: 30px 0 44px;
        }

        .inner-page.dashboard-view > .inner-page__panel > h1 {
          font-size: clamp(1.65rem, 3vw, 2.25rem);
          line-height: 1.15;
        }

        .inner-page.dashboard-view > .inner-page__panel > .section-kicker {
          margin-bottom: 7px;
        }

        .inner-page.dashboard-view .dashboard-kpis {
          margin-top: 24px;
          margin-bottom: 22px;
        }

        .inner-page.dashboard-view .dashboard-filters {
          margin-top: 18px;
          margin-bottom: 22px;
          gap: 14px;
        }

        .inner-page.dashboard-view .dashboard-section {
          margin-top: 24px;
          margin-bottom: 24px;
          padding: 20px;
          border-radius: 14px;
        }

        .inner-page.dashboard-view .dashboard-section:last-of-type {
          margin-bottom: 0;
        }

        .inner-page.dashboard-view .dashboard-kpis > div {
          min-height: 96px;
          padding: 17px 18px;
          border-radius: 12px;
          gap: 7px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
        }

        .inner-page.dashboard-view .dashboard-kpis strong {
          font-size: 1.7rem;
        }

        .inner-page.dashboard-view .dashboard-filter select {
          padding: 10px 12px;
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .inner-page.dashboard-view .dashboard-filter-result {
          margin-top: 12px;
          font-size: 0.85rem;
        }

        .inner-page.dashboard-view .risk-distribution {
          margin-top: 24px;
          padding: 22px;
          border-radius: 14px;
        }

        .inner-page.dashboard-view .risk-distribution__header {
          margin-bottom: 20px;
        }

        .inner-page.dashboard-view .risk-distribution__content {
          grid-template-columns: 230px 1fr;
          gap: 28px;
        }

        .inner-page.dashboard-view .risk-donut-wrapper,
        .inner-page.dashboard-view .risk-donut-svg {
          width: 200px;
          height: 200px;
        }

        .inner-page.dashboard-view .risk-legend {
          gap: 8px;
        }

        .inner-page.dashboard-view .risk-legend__item {
          min-height: 50px;
          padding: 0 14px;
        }

        .inner-page.dashboard-view .chart-card {
          padding: 14px 12px 6px;
          border-radius: 11px;
        }

        .inner-page.dashboard-view .india-map-wrapper {
          position: relative;
          width: min(100%, 620px);
          margin: 0 auto;
          padding: 4px 0;
        }

        .inner-page.dashboard-view .india-map {
          display: block;
          width: 100%;
          max-height: 390px;
          fill: #12263a;
        }

        .inner-page.dashboard-view .india-map-state {
          cursor: pointer;
          stroke: #5d7892;
          stroke-width: 0.8;
          vector-effect: non-scaling-stroke;
          transition: opacity 0.15s ease, stroke 0.15s ease;
        }

        .inner-page.dashboard-view .india-map-state:hover,
        .inner-page.dashboard-view .india-map-state:focus {
          stroke: #dceeff;
          stroke-width: 1.5;
          outline: none;
        }

        .inner-page.dashboard-view .india-map-state--selected {
          stroke: #f4f7fb;
          stroke-width: 2;
        }

        .inner-page.dashboard-view .india-map-state--muted {
          opacity: 0.38;
        }

        .inner-page.dashboard-view .india-map-tooltip {
          position: absolute;
          top: 14px;
          right: 14px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-width: 220px;
          padding: 9px 11px;
          color: #dce8f2;
          background: rgba(8, 18, 34, 0.96);
          border: 1px solid #31516d;
          border-radius: 8px;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.28);
          font-size: 11px;
          pointer-events: none;
        }

        .inner-page.dashboard-view .india-map-tooltip span {
          color: #91a8bd;
        }

        .inner-page.dashboard-view .dashboard-section h2 {
          margin: 0 0 12px;
          font-size: 1.2rem;
          line-height: 1.25;
        }

        .inner-page.dashboard-view .dashboard-section > .section-kicker {
          margin-bottom: 6px;
        }

        .inner-page.dashboard-view .dashboard-table-wrap {
          max-height: min(560px, 62vh);
          overflow-y: auto;
        }

        @media (max-width: 900px) {
          .inner-page.dashboard-view .inner-page__panel {
            width: 100%;
            padding-left: 24px;
            padding-right: 24px;
          }

          .inner-page.dashboard-view .risk-distribution__content {
            grid-template-columns: 1fr;
          }

          .inner-page.dashboard-view .risk-donut-wrapper {
            margin-bottom: 0;
          }
        }

        @media (max-width: 700px) {
          .inner-page.dashboard-view {
            min-height: auto;
          }

          .inner-page.dashboard-view .inner-page__panel {
            padding: 24px 16px 36px;
          }

          .inner-page.dashboard-view .risk-distribution,
          .inner-page.dashboard-view .dashboard-section {
            padding: 18px;
          }

          .inner-page.dashboard-view .india-map {
            max-height: 330px;
          }

          .inner-page.dashboard-view .dashboard-table-wrap {
            max-height: none;
            overflow-y: visible;
          }
        }

        .inner-page.dashboard-view .risk-legend__value {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .inner-page.dashboard-view .risk-legend__percent {
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.55);
        }

        .inner-page.dashboard-view .chart-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 11px;
          padding: 14px 12px 6px;
        }

        .inner-page.dashboard-view .chart-svg {
          width: 100%;
          height: auto;
          display: block;
        }

        .inner-page.dashboard-view .chart-baseline {
          stroke: rgba(255, 255, 255, 0.12);
          stroke-width: 1;
        }

        .inner-page.dashboard-view .chart-bar {
          transition: opacity 0.15s ease;
        }

        .inner-page.dashboard-view .chart-bar:hover {
          opacity: 0.82;
        }

        .inner-page.dashboard-view .chart-bar-value {
          fill: rgba(255, 255, 255, 0.85);
          font-size: 12px;
        }

        .inner-page.dashboard-view .chart-bar-value--ranked {
          fill: rgba(255, 255, 255, 0.85);
          font-size: 13px;
          dominant-baseline: middle;
        }

        .inner-page.dashboard-view .chart-bar-label {
          fill: rgba(255, 255, 255, 0.6);
          font-size: 12px;
        }

        .inner-page.dashboard-view .chart-bar-label--ranked {
          font-size: 12px;
          dominant-baseline: middle;
        }

        .inner-page.dashboard-view .chart-empty {
          color: rgba(255, 255, 255, 0.5);
          font-size: 0.9rem;
          padding: 24px 0;
          margin: 0;
          text-align: center;
        }
      `}</style>

      <main className="inner-page dashboard-view">
      <div className="inner-page__panel">

        <p className="section-kicker">
          Operations
        </p>

        <h1>
          MPLADS Monitoring Dashboard
        </h1>

        {loading && (
          <p>
            Loading live monitoring data...
          </p>
        )}

        {error && (
          <p>
            {error}
          </p>
        )}

        {summary && (
          <>

            {/* KPI CARDS */}

            <div className="dashboard-kpis">

              <div>
                <span>
                  Total Works
                </span>

                <strong>
                  {summary.totalWorks.toLocaleString()}
                </strong>
              </div>

              <div>
                <span>
                  AI Anomalies
                </span>

                <strong>
                  {summary.aiAnomalies.toLocaleString()}
                </strong>
              </div>

              <div>
                <span>
                  Priority Alerts
                </span>

                <strong>
                  {summary.priorityAlerts.toLocaleString()}
                </strong>
              </div>

              <div>
                <span>
                  Critical Risk
                </span>

                <strong>
                  {summary.criticalRisk.toLocaleString()}
                </strong>
              </div>

            </div>

            {/* FILTERS */}

            <div className="dashboard-filters">

              <div className="dashboard-filter">

                <label htmlFor="state-filter">
                  State
                </label>

                <select
                  id="state-filter"
                  value={selectedState}
                  onChange={(event) =>
                    setSelectedState(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    All States
                  </option>

                  {states.map((state) => (
                    <option
                      key={state}
                      value={state}
                    >
                      {state}
                    </option>
                  ))}
                </select>

              </div>

              <div className="dashboard-filter">

                <label htmlFor="risk-filter">
                  Risk Level
                </label>

                <select
                  id="risk-filter"
                  value={selectedRisk}
                  onChange={(event) =>
                    setSelectedRisk(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    All Risk Levels
                  </option>

                  <option value="Critical Risk">
                    Critical Risk
                  </option>

                  <option value="High Risk">
                    High Risk
                  </option>

                  <option value="Medium Risk">
                    Medium Risk
                  </option>

                  <option value="Low Risk">
                    Low Risk
                  </option>
                </select>

              </div>

            </div>

            {/* FILTER RESULT */}

            {filteredTotal !== null && (
              <p className="dashboard-filter-result">
                Showing{' '}
                <strong>
                  {filteredTotal.toLocaleString()}
                </strong>{' '}
                works
              </p>
            )}

            {/* RISK DISTRIBUTION */}

            <div className="risk-distribution">

              <div className="risk-distribution__header">

                <div>
                  <p className="section-kicker">
                    Risk Intelligence
                  </p>

                  <h2>
                    Risk Distribution
                  </h2>

                  <p className="risk-distribution__description">
                    Click a risk level to investigate its
                    distribution and indicators.
                  </p>
                </div>

              </div>

              <div className="risk-distribution__content">

                {/* INTERACTIVE DONUT */}

                <div className="risk-donut-wrapper">

                  <svg
                    className="risk-donut-svg"
                    viewBox="0 0 220 220"
                    role="img"
                    aria-label="Interactive risk distribution chart"
                  >

                    {riskTotal === 0 && (
                      <circle
                        cx="110"
                        cy="110"
                        r="82"
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth="34"
                      />
                    )}

                    {riskTotal > 0 &&
                      donutItems.map(
                        (risk, index) => {
                          const startAngle =
                            donutItems
                              .slice(0, index)
                              .reduce(
                                (total, item) =>
                                  total + item.angle,
                                0
                              )

                          const endAngle =
                            startAngle +
                            risk.angle

                          const isSelected =
                            selectedRisk ===
                            risk.name

                          const isOtherSelected =
                            selectedRisk &&
                            !isSelected

                          return (
                            <path
                              key={risk.name}
                              d={describeArc(
                                startAngle,
                                endAngle,
                                82
                              )}
                              fill={risk.color}
                              className={`risk-donut-segment ${
                                isSelected
                                  ? 'risk-donut-segment--selected'
                                  : ''
                              } ${
                                isOtherSelected
                                  ? 'risk-donut-segment--muted'
                                  : ''
                              }`}
                              onClick={() =>
                                toggleRiskFilter(
                                  risk.name
                                )
                              }
                              role="button"
                              tabIndex={0}
                              onKeyDown={(event) => {
                                if (
                                  event.key ===
                                    'Enter' ||
                                  event.key ===
                                    ' '
                                ) {
                                  toggleRiskFilter(
                                    risk.name
                                  )
                                }
                              }}
                            />
                          )
                        }
                      )}

                    <circle
                      cx="110"
                      cy="110"
                      r="62"
                      fill="#0d1622"
                    />

                  </svg>

                  <div className="risk-donut__center">

                    <strong>
                      {riskTotal.toLocaleString()}
                    </strong>

                    <span>
                      Total Works
                    </span>

                  </div>

                </div>

                {/* RISK LEGEND */}

                <div className="risk-legend">

                  {donutItems.map((risk) => {

                    const isSelected =
                      selectedRisk ===
                      risk.name

                    return (
                      <button
                        type="button"
                        className={`risk-legend__item ${
                          isSelected
                            ? 'risk-legend__item--selected'
                            : ''
                        }`}
                        key={risk.name}
                        onClick={() =>
                          toggleRiskFilter(
                            risk.name
                          )
                        }
                      >

                        <span className="risk-legend__label">

                          <span
                            className="risk-legend__dot"
                            style={{
                              background:
                                risk.color,
                            }}
                          />

                          <span>
                            {risk.name}
                          </span>

                        </span>

                        <span className="risk-legend__value">
                          <strong>
                            {risk.works.toLocaleString()}
                          </strong>
                          <span className="risk-legend__percent">
                            {riskPercent(risk.works)}%
                          </span>
                        </span>

                      </button>
                    )
                  })}

                </div>

              </div>

            </div>

            <section className="dashboard-section">
              <p className="section-kicker">Expenditure</p>
              <h2>Expenditure Utilization</h2>
              <div className="chart-card">
                {expenditureUtilization.length > 0 ? (
                  renderColumnChart(expenditureUtilization, {
                    labelKey: 'range',
                    valueKey: 'works',
                    height: 220,
                    colorFn: (item) =>
                      UTILIZATION_COLORS[item.range] || '#3b82f6',
                  })
                ) : (
                  <p className="chart-empty">No data for the current filters.</p>
                )}
              </div>
            </section>

            <section className="dashboard-section">
              <p className="section-kicker">Geography</p>
              <h2>State-wise High/Critical Risk Works</h2>
              <div className="chart-card">
                {renderIndiaMap()}
              </div>
            </section>

            <section className="dashboard-section">
              <p className="section-kicker">Diagnostics</p>
              <h2>Risk Indicator Breakdown</h2>
              <div className="chart-card">
                {riskIndicators.length > 0 ? (
                  renderColumnChart(
                    [...riskIndicators].sort(
                      (a, b) => Number(b.works) - Number(a.works)
                    ),
                    {
                      labelKey: 'indicator',
                      valueKey: 'works',
                      height: 220,
                      colorFn: () => '#f97316',
                    }
                  )
                ) : (
                  <p className="chart-empty">No data for the current filters.</p>
                )}
              </div>
            </section>

            <section className="dashboard-section">
              <p className="section-kicker">Priority</p>
              <h2>Top Risky Works</h2>
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Work ID</th>
                      <th>Risk Score</th>
                      <th>Risk Level</th>
                      <th>Risk Reasons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRiskyWorks.map((work) => (
                      <tr key={work.work_id}>
                        <td>{work.work_id}</td>
                        <td>{formatNumber(work.risk_score, 2)}</td>
                        <td>{work.final_risk_category}</td>
                        <td>{work.risk_reasons || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="dashboard-section">
              <p className="section-kicker">Alerts</p>
              <h2>Priority Alerts</h2>
              <p className="dashboard-filter-result">
                Total Priority Alerts:{' '}
                <strong>
                  {formatNumber(priorityAlerts.total)}
                </strong>
              </p>
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Work ID</th>
                      <th>Risk Score</th>
                      <th>Risk Level</th>
                      <th>Alert Type</th>
                      <th>Risk Reasons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priorityAlerts.alerts.map((alert) => (
                      <tr key={alert.work_id}>
                        <td>{alert.work_id}</td>
                        <td>{formatNumber(alert.risk_score, 2)}</td>
                        <td>{alert.final_risk_category}</td>
                        <td>{alert.alert_type}</td>
                        <td>{alert.risk_reasons || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="dashboard-section">
              <p className="section-kicker">Investigation</p>
              <h2>Work Investigation</h2>
              <form
                className="dashboard-search"
                onSubmit={handleWorkSearch}
              >
                <label htmlFor="work-id-search">Work ID</label>
                <div>
                  <input
                    id="work-id-search"
                    value={searchId}
                    onChange={(event) =>
                      setSearchId(event.target.value)
                    }
                    placeholder="Example: WS/MP620/2025-2026/133191"
                  />
                  <button type="submit">Investigate</button>
                </div>
              </form>

              {investigationLoading && (
                <p>Loading work details...</p>
              )}

              {investigationError && (
                <p>{investigationError}</p>
              )}

              {investigation &&
                investigation.map((work) => (
                  <div
                    className="dashboard-investigation"
                    key={work.work_id}
                  >
                    <p>
                      <strong>Work ID:</strong> {work.work_id}
                    </p>
                    <p>
                      <strong>Description:</strong>{' '}
                      {work['Work description'] || '—'}
                    </p>
                    <p>
                      <strong>Category:</strong>{' '}
                      {work['Work category'] || '—'}
                    </p>
                    <p>
                      <strong>State:</strong>{' '}
                      {work.State_x || '—'}
                    </p>
                    <p>
                      <strong>Constituency:</strong>{' '}
                      {work.Constituency_x || '—'}
                    </p>
                    <p>
                      <strong>Progress:</strong>{' '}
                      {work.progress || '—'}
                    </p>
                    <p>
                      <strong>Sanction Date:</strong>{' '}
                      {work['Sanction Date'] || 'N/A'}
                    </p>
                    <p>
                      <strong>Completion Date:</strong>{' '}
                      {work['Completion Date'] || 'Not Completed'}
                    </p>
                    <p>
                      <strong>Risk Score:</strong>{' '}
                      {formatNumber(work.risk_score, 2)}
                    </p>
                    <p>
                      <strong>Risk Level:</strong>{' '}
                      {work.final_risk_category}
                    </p>
                    <p>
                      <strong>Alert Type:</strong>{' '}
                      {work.alert_type}
                    </p>
                    <p>
                      <strong>Expenditure Ratio:</strong>{' '}
                      {Number.isFinite(
                        Number(work.expenditure_ratio)
                      )
                        ? `${(Number(work.expenditure_ratio) * 100).toFixed(1)}%`
                        : '—'}
                    </p>
                    <p>
                      <strong>Duration:</strong>{' '}
                      {formatNumber(work.duration_days)} days
                    </p>
                    <p>
                      <strong>Risk Reasons:</strong>{' '}
                      {work.risk_reasons || '—'}
                    </p>
                  </div>
                ))}
            </section>

            <section className="dashboard-section">
              <p className="section-kicker">Live Data</p>
              <h2>Filtered Works</h2>
              <div className="dashboard-table-wrap">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Work ID</th>
                      <th>Description</th>
                      <th>State</th>
                      <th>Progress</th>
                      <th>Risk Score</th>
                      <th>Risk Level</th>
                      <th>Risk Reasons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorks.map((work) => (
                      <tr key={work.work_id}>
                        <td>{work.work_id}</td>
                        <td>{work['Work description'] || '—'}</td>
                        <td>{work.State_x || '—'}</td>
                        <td>{work.progress || '—'}</td>
                        <td>{formatNumber(work.risk_score, 2)}</td>
                        <td>{work.final_risk_category}</td>
                        <td>{work.risk_reasons || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

          </>
        )}

      </div>
      </main>
    </>
  )
}

export default Dashboard