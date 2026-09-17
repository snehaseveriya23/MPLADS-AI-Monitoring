import streamlit as st
import pandas as pd
import altair as alt


# ============================================================
# LOAD DATA
# ============================================================

data = pd.read_csv("MPLADS_dashboard_data.csv")

# ============================================================
# DASHBOARD TITLE
# ============================================================

st.title("MPLADS AI Monitoring & Risk Dashboard")

st.write(
    "AI-powered monitoring of MPLADS works, expenditure and project risks."
)

st.write("Total Works:", len(data))


# ============================================================
# KPI CALCULATIONS
# ============================================================

total_works = len(data)

# Total AI anomalies = standalone AI anomalies + priority alerts
ai_anomalies = (
    (data["alert_type"] == "AI Anomaly").sum()
    + (data["alert_type"] == "Priority Alert").sum()
)

priority_alerts = (
    (data["alert_type"] == "Priority Alert").sum()
)

critical_risk = (
    (data["final_risk_category"] == "Critical Risk").sum()
)


# ============================================================
# KPI CARDS
# ============================================================

col1, col2, col3, col4 = st.columns(4)

col1.metric("Total Works", f"{total_works:,}")
col2.metric("AI Anomalies", f"{ai_anomalies:,}")
col3.metric("Priority Alerts", f"{priority_alerts:,}")
col4.metric("Critical Risk", f"{critical_risk:,}")


# ============================================================
# FILTERS
# ============================================================

st.subheader("Filters")

col1, col2 = st.columns(2)

with col1:
    states = ["All States"] + sorted(
        data["State_x"].dropna().unique().tolist()
    )

    selected_state = st.selectbox(
        "Select State",
        states
    )


with col2:
    risk_categories = ["All Risk Levels"] + sorted(
        data["final_risk_category"].dropna().unique().tolist()
    )

    selected_risk = st.selectbox(
        "Select Risk Level",
        risk_categories
    )


# ============================================================
# APPLY FILTERS
# ============================================================

filtered_data = data.copy()

if selected_state != "All States":
    filtered_data = filtered_data[
        filtered_data["State_x"] == selected_state
    ]

if selected_risk != "All Risk Levels":
    filtered_data = filtered_data[
        filtered_data["final_risk_category"] == selected_risk
    ]

st.write(
    f"Showing **{len(filtered_data):,}** works"
)


# ============================================================
# WORK INVESTIGATION
# ============================================================

st.subheader("Work Investigation")

search_id = st.text_input(
    "Enter Work ID",
    placeholder="Example: WS/MP620/2025-2026/133191"
)


if search_id:

    result = data[
        data["work_id"].str.contains(
            search_id,
            case=False,
            na=False
        )
    ]

    if not result.empty:

        st.dataframe(
            result[
                [
                    "work_id",
                    "risk_score",
                    "final_risk_category",
                    "risk_reasons"
                ]
            ],
            use_container_width=True
        )

        st.subheader("Investigation Details")

        col1, col2, col3 = st.columns(3)

        with col1:

            st.metric(
                "Risk Score",
                round(
                    result["risk_score"].iloc[0],
                    2
                )
            )

        with col2:

            st.metric(
                "Expenditure Ratio",
                f"{result['expenditure_ratio'].iloc[0] * 100:.1f}%"
            )

        with col3:

            st.metric(
                "Duration",
                f"{result['duration_days'].iloc[0]:.0f} days"
            )

    else:

        st.warning(
            "No work found with this Work ID."
        )


# ============================================================
# RISK DISTRIBUTION
# ============================================================

st.subheader("Risk Distribution")

risk_order = [
    "Critical Risk",
    "High Risk",
    "Medium Risk",
    "Low Risk"
]

risk_counts = (
    filtered_data["final_risk_category"]
    .value_counts()
    .reindex(risk_order, fill_value=0)
    .reset_index()
)

risk_counts.columns = [
    "Risk Level",
    "Works"
]


risk_colors = {
    "Critical Risk": "#D32F2F",
    "High Risk": "#F57C00",
    "Medium Risk": "#FBC02D",
    "Low Risk": "#388E3C"
}


risk_chart = (
    alt.Chart(risk_counts)
    .mark_bar()
    .encode(
        x=alt.X(
            "Risk Level:N",
            sort=risk_order,
            title=None,
            axis=alt.Axis(labelAngle=0)
        ),
        y=alt.Y(
            "Works:Q",
            title="Number of Works"
        ),
        color=alt.Color(
            "Risk Level:N",
            scale=alt.Scale(
                domain=list(risk_colors.keys()),
                range=list(risk_colors.values())
            ),
            legend=None
        ),
        tooltip=[
            alt.Tooltip(
                "Risk Level:N",
                title="Risk Level"
            ),
            alt.Tooltip(
                "Works:Q",
                title="Works",
                format=","
            )
        ]
    )
    .properties(
        height=400
    )
)

st.altair_chart(
    risk_chart,
    use_container_width=True
)


# ============================================================
# EXPENDITURE UTILIZATION
# ============================================================

st.subheader("Expenditure Utilization")

utilization = (
    filtered_data["expenditure_ratio"]
    .clip(upper=1)
)

bins = [
    0,
    0.2,
    0.4,
    0.6,
    0.8,
    1.0
]

labels = [
    "0–20%",
    "20–40%",
    "40–60%",
    "60–80%",
    "80–100%"
]

utilization_ranges = pd.cut(
    utilization,
    bins=bins,
    labels=labels,
    include_lowest=True
)

utilization_counts = (
    utilization_ranges
    .value_counts()
    .reindex(labels, fill_value=0)
    .reset_index()
)

utilization_counts.columns = [
    "Utilization Range",
    "Works"
]


utilization_colors = {
    "0–20%": "#388E3C",
    "20–40%": "#8BC34A",
    "40–60%": "#FBC02D",
    "60–80%": "#F57C00",
    "80–100%": "#D32F2F"
}


utilization_chart = (
    alt.Chart(utilization_counts)
    .mark_bar()
    .encode(
        x=alt.X(
            "Utilization Range:N",
            sort=labels,
            title=None,
            axis=alt.Axis(labelAngle=0)
        ),
        y=alt.Y(
            "Works:Q",
            title="Number of Works"
        ),
        color=alt.Color(
            "Utilization Range:N",
            scale=alt.Scale(
                domain=list(utilization_colors.keys()),
                range=list(utilization_colors.values())
            ),
            legend=None
        ),
        tooltip=[
            alt.Tooltip(
                "Utilization Range:N",
                title="Utilization"
            ),
            alt.Tooltip(
                "Works:Q",
                title="Works",
                format=","
            )
        ]
    )
    .properties(
        height=400
    )
)

st.altair_chart(
    utilization_chart,
    use_container_width=True
)


# ============================================================
# STATE-WISE HIGH / CRITICAL RISK WORKS
# ============================================================

st.subheader("State-wise High/Critical Risk Works")

high_risk_states = (
    filtered_data[
        filtered_data["final_risk_category"].isin(
            ["High Risk", "Critical Risk"]
        )
    ]
    .groupby("State_x")
    .size()
    .sort_values(ascending=False)
    .head(15)
    .reset_index()
)

high_risk_states.columns = [
    "State",
    "Works"
]


state_chart = (
    alt.Chart(high_risk_states)
    .mark_bar(color="#D32F2F")
    .encode(
        x=alt.X(
            "State:N",
            sort="-y",
            title=None,
            axis=alt.Axis(
                labelAngle=-45
            )
        ),
        y=alt.Y(
            "Works:Q",
            title="High/Critical Risk Works"
        ),
        tooltip=[
            alt.Tooltip(
                "State:N",
                title="State"
            ),
            alt.Tooltip(
                "Works:Q",
                title="Risky Works",
                format=","
            )
        ]
    )
    .properties(
        height=450
    )
)

st.altair_chart(
    state_chart,
    use_container_width=True
)


# ============================================================
# RISK INDICATOR BREAKDOWN
# ============================================================

st.subheader("Risk Indicator Breakdown")

reason_counts = {

    "High Expenditure":
        filtered_data["risk_reasons"]
        .str.contains(
            "High Expenditure",
            case=False,
            na=False
        )
        .sum(),

    "Late First Payment":
        filtered_data["risk_reasons"]
        .str.contains(
            "Late First Payment",
            case=False,
            na=False
        )
        .sum(),

    "Long Duration":
        filtered_data["risk_reasons"]
        .str.contains(
            "Long Duration",
            case=False,
            na=False
        )
        .sum(),

    "High Cost":
        filtered_data["risk_reasons"]
        .str.contains(
            "High Cost",
            case=False,
            na=False
        )
        .sum(),

    "Long Sanction Delay":
        filtered_data["risk_reasons"]
        .str.contains(
            "Long Sanction Delay",
            case=False,
            na=False
        )
        .sum()
}


reason_counts = (
    pd.Series(reason_counts)
    .sort_values(ascending=False)
    .reset_index()
)

reason_counts.columns = [
    "Risk Indicator",
    "Works"
]


indicator_chart = (
    alt.Chart(reason_counts)
    .mark_bar(color="#F57C00")
    .encode(
        x=alt.X(
            "Risk Indicator:N",
            sort="-y",
            title=None,
            axis=alt.Axis(
                labelAngle=-25
            )
        ),
        y=alt.Y(
            "Works:Q",
            title="Number of Works"
        ),
        tooltip=[
            alt.Tooltip(
                "Risk Indicator:N",
                title="Indicator"
            ),
            alt.Tooltip(
                "Works:Q",
                title="Works",
                format=","
            )
        ]
    )
    .properties(
        height=400
    )
)

st.altair_chart(
    indicator_chart,
    use_container_width=True
)


# ============================================================
# TOP RISKY WORKS
# ============================================================

st.subheader("Top Risky Works")

top_risky = (
    filtered_data[
        filtered_data["final_risk_category"].isin(
            ["High Risk", "Critical Risk"]
        )
    ]
    .sort_values(
        "risk_score",
        ascending=False
    )
    .head(20)
)


st.dataframe(
    top_risky[
        [
            "work_id",
            "risk_score",
            "final_risk_category",
            "risk_reasons"
        ]
    ],
    use_container_width=True
)


# ============================================================
# PRIORITY ALERTS
# ============================================================

st.subheader("Priority Alerts")

priority_alerts = filtered_data[
    filtered_data["alert_type"] == "Priority Alert"
].copy()

st.write(
    f"Total Priority Alerts: {len(priority_alerts):,}"
)


st.dataframe(
    priority_alerts[
        [
            "work_id",
            "risk_score",
            "final_risk_category",
            "alert_type",
            "risk_reasons"
        ]
    ].head(20),
    use_container_width=True
)
