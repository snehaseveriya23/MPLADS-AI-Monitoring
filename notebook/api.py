from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np

from mplads_pipeline import run_mplads_pipeline


app = FastAPI(
    title="MPLADS AI MONITOR API",
    description="AI-Powered Monitoring & Risk Intelligence for MPLADS",
    version="1.0.0"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


RISK_ORDER = [
    "Critical Risk",
    "High Risk",
    "Medium Risk",
    "Low Risk"
]

# Independent indicator definitions. Counts are computed separately
# from pipeline flags / risk_reasons, never copied from the risk total.
INDICATORS = [
    ("High Cost", "_high_cost_flag"),
    ("Long Duration", "_long_duration_flag"),
    ("Long Sanction Delay", "_long_sanction_delay"),
    ("High Expenditure", "_high_expenditure_flag"),
    ("Late First Payment", "_late_first_payment_flag"),
]

WORK_TABLE_COLUMNS = [
    "work_id",
    "Work description",
    "Work category",
    "State_x",
    "Constituency_x",
    "Sanction Date",
    "Completion Date",
    "progress",
    "Sanction Amount ( ₹ )",
    "Fund Disbursed Amount ( ₹ )",
    "expenditure_ratio",
    "risk_score",
    "final_risk_category",
    "risk_reasons"
]

INSIGHTS_COLUMNS = [
    "work_id",
    "Work description",
    "Work category",
    "State_x",
    "Constituency_x",
    "risk_score",
    "final_risk_category",
    "alert_type",
    "risk_reasons",
    "Sanction Amount ( ₹ )",
    "expenditure_ratio",
    "progress",
    "duration_days",
    "sanction_delay_days",
]

INVESTIGATION_COLUMNS = [
    "work_id",
    "Work description",
    "Work category",
    "State_x",
    "Constituency_x",
    "Sanction Date",
    "Completion Date",
    "progress",
    "Sanction Amount ( ₹ )",
    "Fund Disbursed Amount ( ₹ )",
    "expenditure_ratio",
    "duration_days",
    "sanction_delay_days",
    "payment_count",
    "vendor_count",
    "cost_vs_category_avg",
    "risk_score",
    "final_risk_category",
    "alert_type",
    "risk_reasons"
]


_cached_data = None


def clean_value(value):
    """Convert pandas/numpy values into JSON-safe Python values."""
    if value is None:
        return None

    if isinstance(value, (float, np.floating)):
        if not np.isfinite(value):
            return None
        return float(value)

    try:
        if pd.isna(value):
            return None
    except (ValueError, TypeError):
        pass

    if isinstance(value, (np.integer,)):
        return int(value)

    if isinstance(value, (np.bool_,)):
        return bool(value)

    if isinstance(value, pd.Timestamp):
        return value.strftime("%d-%b-%Y")

    return value


def dataframe_to_records(df):
    records = df.to_dict(orient="records")

    return [
        {
            key: clean_value(value)
            for key, value in record.items()
        }
        for record in records
    ]


def _reason_has_label(series, label):
    tokens = (
        series.fillna("")
        .astype(str)
        .str.split(";")
        .apply(
            lambda parts: {
                part.strip().lower()
                for part in parts
                if str(part).strip()
            }
        )
    )
    target = label.lower()
    return tokens.apply(lambda found: target in found)


def _attach_independent_flags(data):
    """
    Attach per-work indicator flags using the same thresholds as
    mplads_pipeline.py, counted independently of the risk total.

    late_first_payment_flag is recovered from risk_reasons because
    first_payment_delay_days is not in the pipeline dashboard output.
    """
    flagged = data.copy()

    flagged["_high_cost_flag"] = (
        flagged["cost_vs_category_avg"] > 2
    ).fillna(False)

    flagged["_long_duration_flag"] = (
        flagged["duration_days"] > 260
    ).fillna(False)

    flagged["_long_sanction_delay"] = (
        flagged["sanction_delay_days"] > 140
    ).fillna(False)

    flagged["_high_expenditure_flag"] = (
        flagged["expenditure_ratio"] >= 0.90
    ).fillna(False)

    flagged["_late_first_payment_flag"] = _reason_has_label(
        flagged["risk_reasons"],
        "Late First Payment"
    )

    return flagged


def prepare_dashboard_data():
    """Run the MPLADS pipeline once per process and reuse the DataFrame."""
    global _cached_data

    if _cached_data is not None:
        return _cached_data

    try:
        data = run_mplads_pipeline()

        if data is None or data.empty:
            raise ValueError("MPLADS pipeline returned no data.")

        _cached_data = _attach_independent_flags(data)
        return _cached_data

    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"MPLADS pipeline error: {str(error)}"
        )


def apply_filters(
    data,
    state=None,
    risk=None,
    category=None,
    alert_type=None,
    constituency=None,
):
    filtered = data

    if state:
        filtered = filtered[
            filtered["State_x"].astype(str) == state
        ]

    if risk:
        filtered = filtered[
            filtered["final_risk_category"].astype(str) == risk
        ]

    if category:
        filtered = filtered[
            filtered["Work category"].astype(str) == category
        ]

    if alert_type:
        filtered = filtered[
            filtered["alert_type"].astype(str) == alert_type
        ]

    if constituency:
        filtered = filtered[
            filtered["Constituency_x"].astype(str) == constituency
        ]

    return filtered


def public_columns(data):
    return data[[
        column
        for column in data.columns
        if not str(column).startswith("_")
    ]]


@app.get("/")
def root():
    return {
        "name": "MPLADS AI MONITOR API",
        "status": "running",
        "description": (
            "AI-Powered Monitoring & Risk Intelligence "
            "for MPLADS"
        )
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "MPLADS AI MONITOR API"
    }


@app.get("/api/dashboard/summary")
def dashboard_summary():
    data = prepare_dashboard_data()

    total_works = len(data)

    ai_anomalies = int(
        (data["alert_type"] == "AI Anomaly").sum()
        +
        (data["alert_type"] == "Priority Alert").sum()
    )

    priority_alerts = int(
        (data["alert_type"] == "Priority Alert").sum()
    )

    critical_risk = int(
        (data["final_risk_category"] == "Critical Risk").sum()
    )

    return {
        "totalWorks": total_works,
        "aiAnomalies": ai_anomalies,
        "priorityAlerts": priority_alerts,
        "criticalRisk": critical_risk
    }


@app.get("/api/dashboard/filters")
def dashboard_filters():
    data = prepare_dashboard_data()

    states = sorted(
        data["State_x"]
        .dropna()
        .astype(str)
        .unique()
        .tolist()
    )

    return {
        "states": states,
        "riskLevels": RISK_ORDER
    }


@app.get("/api/dashboard/risk-distribution")
def risk_distribution(
    state: str | None = Query(default=None),
    risk: str | None = Query(default=None)
):
    data = apply_filters(prepare_dashboard_data(), state=state, risk=risk)

    counts = (
        data["final_risk_category"]
        .value_counts()
        .reindex(RISK_ORDER, fill_value=0)
    )

    return [
        {
            "riskLevel": risk,
            "works": int(counts[risk])
        }
        for risk in RISK_ORDER
    ]


@app.get("/api/dashboard/expenditure-utilization")
def expenditure_utilization(
    state: str | None = Query(default=None),
    risk: str | None = Query(default=None)
):
    data = apply_filters(
        prepare_dashboard_data(),
        state=state,
        risk=risk
    )

    utilization = data["expenditure_ratio"].clip(upper=1)

    bins = [0, 0.2, 0.4, 0.6, 0.8, 1.0]
    labels = [
        "0–20%",
        "20–40%",
        "40–60%",
        "60–80%",
        "80–100%"
    ]

    ranges = pd.cut(
        utilization,
        bins=bins,
        labels=labels,
        include_lowest=True
    )

    counts = (
        ranges
        .value_counts()
        .reindex(labels, fill_value=0)
    )

    return [
        {
            "range": label,
            "works": int(counts[label])
        }
        for label in labels
    ]


@app.get("/api/dashboard/state-risk")
def state_risk(
    state: str | None = Query(default=None),
    risk: str | None = Query(default=None)
):
    data = apply_filters(
        prepare_dashboard_data(),
        state=state,
        risk=risk
    )

    high_risk = data[
        data["final_risk_category"].isin(
            ["High Risk", "Critical Risk"]
        )
    ]

    state_counts = (
        high_risk
        .groupby("State_x")
        .size()
        .sort_values(ascending=False)
        .head(15)
    )

    return [
        {
            "state": str(name),
            "works": int(count)
        }
        for name, count in state_counts.items()
    ]


@app.get("/api/dashboard/risk-indicators")
def risk_indicators(
    state: str | None = Query(default=None),
    risk: str | None = Query(default=None)
):
    data = apply_filters(
        prepare_dashboard_data(),
        state=state,
        risk=risk
    )

    return [
        {
            "indicator": name,
            "works": int(
                data[flag_column].fillna(False).astype(bool).sum()
            )
        }
        for name, flag_column in INDICATORS
    ]


@app.get("/api/dashboard/top-risky-works")
def top_risky_works(
    state: str | None = Query(default=None),
    risk: str | None = Query(default=None)
):
    data = apply_filters(
        prepare_dashboard_data(),
        state=state,
        risk=risk
    )

    risky = (
        data[
            data["final_risk_category"].isin(
                ["High Risk", "Critical Risk"]
            )
        ]
        .sort_values("risk_score", ascending=False)
        .head(20)
    )

    columns = [
        "work_id",
        "risk_score",
        "final_risk_category",
        "risk_reasons"
    ]

    return dataframe_to_records(risky[columns])


@app.get("/api/dashboard/priority-alerts")
def priority_alerts(
    state: str | None = Query(default=None),
    risk: str | None = Query(default=None)
):
    data = apply_filters(
        prepare_dashboard_data(),
        state=state,
        risk=risk
    )

    alerts = data[
        data["alert_type"] == "Priority Alert"
    ].copy()

    columns = [
        "work_id",
        "risk_score",
        "final_risk_category",
        "alert_type",
        "risk_reasons"
    ]

    return {
        "total": int(len(alerts)),
        "alerts": dataframe_to_records(alerts[columns].head(20))
    }


def _find_work(work_id: str):
    search = (work_id or "").strip()

    if not search:
        raise HTTPException(
            status_code=400,
            detail="Work ID is required."
        )

    data = prepare_dashboard_data()

    result = data[
        data["work_id"]
        .astype(str)
        .str.contains(
            search,
            case=False,
            na=False,
            regex=False
        )
    ]

    if result.empty:
        raise HTTPException(
            status_code=404,
            detail="No work found with this Work ID."
        )

    return dataframe_to_records(result[INVESTIGATION_COLUMNS])


@app.get("/api/dashboard/work")
def work_investigation_query(
    work_id: str = Query(..., min_length=1)
):
    return _find_work(work_id)


@app.get("/api/dashboard/work/{work_id:path}")
def work_investigation(work_id: str):
    return _find_work(work_id)


@app.get("/api/dashboard/works")
def dashboard_works(
    state: str | None = Query(default=None),
    risk: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=200)
):
    data = apply_filters(
        prepare_dashboard_data(),
        state=state,
        risk=risk
    )

    preview = data.head(limit)

    return {
        "total": int(len(data)),
        "works": dataframe_to_records(preview[WORK_TABLE_COLUMNS])
    }


def _parse_risk_indicators(risk_reasons):
    return [
        token.strip()
        for token in str(risk_reasons or "").split(";")
        if token.strip()
    ]


def _build_insight_recommendation(work):
    """
    Build work-specific investigation and field-verification guidance
    using the actual work category, description, progress, and triggered
    risk indicators from the MPLADS monitoring pipeline.
    """
    indicators = {
        item.lower()
        for item in _parse_risk_indicators(work.get("risk_reasons"))
    }

    category = str(work.get("Work category") or "").lower()
    description = str(work.get("Work description") or "").lower()
    progress = str(work.get("progress") or "").strip().lower()

    has_high_expenditure = "high expenditure" in indicators
    has_high_cost = "high cost" in indicators
    has_long_duration = "long duration" in indicators
    has_late_payment = "late first payment" in indicators
    has_sanction_delay = "long sanction delay" in indicators
    low_progress = progress == "in progress"

    actions = []

    if has_high_expenditure or has_high_cost:
        actions.append(
            "Review expenditure, bills, payment records, and supporting documents."
        )

    if has_long_duration or (has_high_expenditure and low_progress):
        actions.append(
            "Verify the reported physical progress against the actual work completed."
        )

    if has_late_payment:
        actions.append(
            "Review payment dates and supporting records to understand the delayed first payment."
        )

    if has_sanction_delay:
        actions.append(
            "Review the sanction and commencement timeline and verify the documented reason for delay."
        )

    if indicators:
        actions.append(
            "Conduct a field visit to verify the physical status of the work."
        )

    road_or_infrastructure = any(
        keyword in category or keyword in description
        for keyword in (
            "road",
            "path",
            "bridge",
            "drain",
            "culvert",
            "infrastructure",
            "building",
            "construction",
            "class room",
            "classroom",
            "anganwadi",
            "community hall",
        )
    )

    lighting_or_electrical = any(
        keyword in category or keyword in description
        for keyword in (
            "light",
            "lighting",
            "electrical",
            "electric",
            "solar",
            "lamp",
            "street light",
        )
    )

    water_or_civil = any(
        keyword in category or keyword in description
        for keyword in (
            "water",
            "pipeline",
            "pipe",
            "tank",
            "borewell",
            "bore well",
            "drinking water",
        )
    )

    field_visit_checklist = [
        "Visit the work site and verify the current physical status of the work.",
        "Compare the physical progress observed on site with the progress reported in the records.",
    ]

    if road_or_infrastructure:
        field_visit_checklist.extend([
            "Verify the physical dimensions, visible completion, and usable condition of the constructed infrastructure.",
            "Compare the completed physical work with the sanctioned scope and reported expenditure.",
        ])
    elif lighting_or_electrical:
        field_visit_checklist.extend([
            "Verify that the reported lights/electrical installations are physically installed at the stated locations.",
            "Check whether the installed equipment is operational and usable at the time of inspection.",
            "Compare the number and type of installations observed with the reported work and expenditure records.",
        ])
    elif water_or_civil:
        field_visit_checklist.extend([
            "Verify the physical installation and current operational status of the water-related infrastructure.",
            "Compare the installed components and visible work with the sanctioned scope and reported expenditure.",
        ])
    else:
        field_visit_checklist.append(
            "Verify that the work visible on site corresponds to the sanctioned work description and reported completion."
        )

    if has_high_expenditure or has_high_cost:
        field_visit_checklist.append(
            "Compare the physical work actually observed with the expenditure incurred and supporting records."
        )

    if has_long_duration:
        field_visit_checklist.append(
            "Verify the actual project timeline and whether the work remains incomplete or required extended execution time."
        )

    if has_sanction_delay:
        field_visit_checklist.append(
            "Verify the documented reason for the sanction delay and its effect on work commencement."
        )

    if has_late_payment:
        field_visit_checklist.append(
            "Review the payment timeline and verify the supporting records for the delayed first payment."
        )

    field_visit_checklist = list(dict.fromkeys(field_visit_checklist))

    alert_type = str(work.get("alert_type") or "")
    risk_category = str(work.get("final_risk_category") or "")

    if alert_type == "Priority Alert" or risk_category == "Critical Risk":
        status = "Flagged for Investigation"
    else:
        status = "Potential Irregularity — Verification Required"

    if not actions:
        actions.append(
            "Review the triggered risk indicators and supporting records."
        )

    recommendation_text = (
        status
        + ". "
        + " ".join(actions)
        + " These checks are intended for verification and do not by themselves establish wrongdoing."
    )

    return {
        "status": status,
        "actions": actions,
        "text": recommendation_text,
        "fieldVisitRequired": bool(indicators),
        "fieldVisitChecklist": field_visit_checklist,
    }


@app.get("/api/insights/filters")
def insights_filters():
    """
    Dynamic filter options for the Insights page, derived from the
    real MPLADS pipeline data. Separate from /api/dashboard/filters
    so the Dashboard page's filter behaviour is left untouched.
    """
    data = prepare_dashboard_data()

    def unique_sorted(column):
        return sorted(
            data[column]
            .dropna()
            .astype(str)
            .unique()
            .tolist()
        )

    states = unique_sorted("State_x")
    categories = unique_sorted("Work category")
    alert_types = unique_sorted("alert_type")
    constituencies = unique_sorted("Constituency_x")

    constituencies_by_state = {}
    for state in states:
        constituencies_by_state[state] = sorted(
            data.loc[
                data["State_x"].astype(str) == state,
                "Constituency_x",
            ]
            .dropna()
            .astype(str)
            .unique()
            .tolist()
        )

    return {
        "states": states,
        "riskLevels": RISK_ORDER,
        "categories": categories,
        "alertTypes": alert_types,
        "constituencies": constituencies,
        "constituenciesByState": constituencies_by_state,
    }


@app.get("/api/insights")
def insights_priority_works(
    state: str | None = Query(default=None),
    risk: str | None = Query(default=None),
    category: str | None = Query(default=None),
    alert_type: str | None = Query(default=None),
    constituency: str | None = Query(default=None),
):
    data = apply_filters(
        prepare_dashboard_data(),
        state=state,
        risk=risk,
        category=category,
        alert_type=alert_type,
        constituency=constituency,
    )

    if data.empty:
        return {
            "total": 0,
            "works": [],
        }

    # Deterministic investigation priority after all selected filters:
    # 1. Priority Alert
    # 2. Critical Risk
    # 3. High Risk
    # 4. Medium Risk
    # 5. Low Risk
    # Within the same priority tier, use risk score and relevant
    # risk metrics as deterministic tie-breakers.
    priority_rank = np.select(
        [
            data["alert_type"].astype(str) == "Priority Alert",
            data["final_risk_category"].astype(str) == "Critical Risk",
            data["final_risk_category"].astype(str) == "High Risk",
            data["final_risk_category"].astype(str) == "Medium Risk",
            data["final_risk_category"].astype(str) == "Low Risk",
        ],
        [0, 1, 2, 3, 4],
        default=5,
    )

    ranked = (
        data.assign(_priority_rank=priority_rank)
        .sort_values(
            [
                "_priority_rank",
                "risk_score",
                "expenditure_ratio",
                "duration_days",
                "sanction_delay_days",
                "work_id",
            ],
            ascending=[True, False, False, False, False, True],
            kind="mergesort",
        )
        .head(5)
    )

    works = []

    for record in dataframe_to_records(ranked[INSIGHTS_COLUMNS]):
        record["riskIndicators"] = _parse_risk_indicators(
            record.get("risk_reasons")
        )
        record["recommendation"] = _build_insight_recommendation(record)
        works.append(record)

    return {
        "total": len(works),
        "works": works,
    }


@app.get("/api/dashboard")
def full_dashboard():
    data = prepare_dashboard_data()
    public = public_columns(data)

    return {
        "success": True,
        "total": int(len(public)),
        "columns": public.columns.tolist(),
        "summary": dashboard_summary(),
        "riskDistribution": risk_distribution(),
        "riskIndicators": risk_indicators()
    }
