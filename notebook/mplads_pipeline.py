import pandas as pd
import joblib


def run_mplads_pipeline():

    print("Starting MPLADS live pipeline...")

    # Load trained ML artifacts
    scaler = joblib.load("mplads_scaler.pkl")
    model = joblib.load("mplads_isolation_forest.pkl")
    category_avg = joblib.load("mplads_category_avg.pkl")

    print("ML artifacts loaded.")

    # Load raw MPLADS datasets
    sanctioned = pd.read_csv(
        "../data/csv/Works Sanctioned.csv",
        skiprows=1
    )

    completed = pd.read_csv(
        "../data/csv/Works Completed.csv",
        skiprows=1
    )

    expenditure = pd.read_csv(
        "../data/csv/Expenditure on Completed and On-going Works as on Date.csv",
        skiprows=1
    )

    print("Raw datasets loaded.")

    # Clean sanctioned works
    sanctioned = sanctioned.dropna(subset=["Work"])

    parts = sanctioned["Work"].str.split("/")

    sanctioned["work_id"] = (
        parts.str[0] + "/" +
        parts.str[1] + "/" +
        parts.str[2] + "/" +
        parts.str[3].str.split("-").str[0]
    )

    sanctioned["work_id"] = (
        sanctioned["work_id"].str.replace(" ", "")
    )

    # Clean completed works
    completed = completed.drop(
        columns=["Sr. No.", "Image"]
    )

    parts = completed["Work"].str.split("/")

    completed["work_id"] = (
        parts.str[0] + "/" +
        parts.str[1] + "/" +
        parts.str[2] + "/" +
        parts.str[3].str.split("-").str[0]
    )

    completed["work_id"] = (
        completed["work_id"].str.replace(" ", "")
    )

    # Clean expenditure data
    expenditure = expenditure.drop(
        columns=["Sr. No."]
    )

    expenditure = expenditure.rename(
        columns={"Work ID": "work_id"}
    )

    expenditure["work_id"] = (
        expenditure["work_id"].str.replace(" ", "")
    )

    # Remove rows without Work ID
    sanctioned = sanctioned.dropna(
        subset=["work_id"]
    )

    completed = completed.dropna(
        subset=["work_id"]
    )

    expenditure = expenditure.dropna(
        subset=["work_id"]
    )

    print("Datasets cleaned and Work IDs created.")

    print("Sanctioned:", sanctioned.shape)
    print("Completed:", completed.shape)
    print("Expenditure:", expenditure.shape)

    # Merge sanctioned and completed works
    merged = pd.merge(
        sanctioned,
        completed,
        on="work_id",
        how="left"
    )

    print("Sanctioned + completed data merged.")
    print("Merged shape:", merged.shape)

    # Aggregate expenditure by Work ID
    expenditure_total = (
        expenditure
        .groupby("work_id")["Fund Disbursed Amount ( ₹ )"]
        .sum()
    )

    merged = merged.merge(
        expenditure_total.rename("live_total_expenditure"),
        on="work_id",
        how="left"
    )

    merged["live_total_expenditure"] = (
        merged["live_total_expenditure"].fillna(0)
    )

    print("Expenditure data aggregated and added.")

    # Calculate expenditure ratio
    merged["expenditure_ratio"] = (
        merged["live_total_expenditure"]
        / merged["Sanction Amount ( ₹ )"]
    )

    # Calculate remaining sanctioned amount
    merged["remaining_amount"] = (
        merged["Sanction Amount ( ₹ )"]
        - merged["live_total_expenditure"]
    )

    # Detect over-expenditure
    merged["over_expenditure"] = (
        merged["expenditure_ratio"] > 1
    )

    print("Live expenditure features calculated.")

    # Calculate payment count
    payment_count = (
        expenditure
        .groupby("work_id")
        .size()
    )

    merged = merged.merge(
        payment_count.rename("payment_count"),
        on="work_id",
        how="left"
    )

    # Calculate unique vendor count
    vendor_count = (
        expenditure
        .groupby("work_id")["Vendor Name"]
        .nunique()
    )

    merged = merged.merge(
        vendor_count.rename("vendor_count"),
        on="work_id",
        how="left"
    )

    # Calculate average payment
    avg_payment = (
        expenditure
        .groupby("work_id")["Fund Disbursed Amount ( ₹ )"]
        .mean()
    )

    merged = merged.merge(
        avg_payment.rename("avg_payment"),
        on="work_id",
        how="left"
    )

    # Calculate maximum payment
    max_payment = (
        expenditure
        .groupby("work_id")["Fund Disbursed Amount ( ₹ )"]
        .max()
    )

    merged = merged.merge(
        max_payment.rename("max_payment"),
        on="work_id",
        how="left"
    )

    print("Live payment features calculated.")

    # Calculate payment status counts
    payment_status = (
        expenditure
        .groupby(["work_id", "Payment Status"])
        .size()
        .unstack(fill_value=0)
    )

    merged = merged.merge(
        payment_status,
        on="work_id",
        how="left"
    )

    print("Live payment status features calculated.")

    # Calculate first payment date
    first_payment = (
        expenditure
        .groupby("work_id")["Expenditure Date"]
        .min()
    )

    merged = merged.merge(
        first_payment.rename("first_payment_date"),
        on="work_id",
        how="left"
    )

    # Convert first payment date to datetime
    merged["first_payment_date"] = pd.to_datetime(
        merged["first_payment_date"],
        errors="coerce"
    )

    # Calculate delay between sanction and first payment
    merged["first_payment_delay_days"] = (
        merged["first_payment_date"]
        - pd.to_datetime(
            merged["Sanction Date"],
            format="%d-%b-%y",
            errors="coerce"
        )
    ).dt.days

    print("Live first payment delay calculated.")

    # Convert date columns
    merged["Recommended date"] = pd.to_datetime(
        merged["Recommended date"],
        format="%d-%b-%y",
        errors="coerce"
    )

    merged["Sanction Date"] = pd.to_datetime(
        merged["Sanction Date"],
        format="%d-%b-%y",
        errors="coerce"
    )

    merged["Completion Date"] = pd.to_datetime(
        merged["Completion Date"],
        format="%d-%b-%Y",
        errors="coerce"
    )

    # Calculate sanction delay
    merged["sanction_delay_days"] = (
        merged["Sanction Date"]
        - merged["Recommended date"]
    ).dt.days

    # Calculate project age
    today = pd.Timestamp.today().normalize()

    merged["project_age_days"] = (
        today - merged["Sanction Date"]
    ).dt.days

    # Calculate completion duration
    merged["completion_days"] = (
        merged["Completion Date"]
        - merged["Sanction Date"]
    ).dt.days

    # Use project age for ongoing works
    merged["duration_days"] = (
        merged["completion_days"]
        .fillna(merged["project_age_days"])
    )

    print("Live date features calculated.")

    # Calculate cost compared with historical category average
    category_avg_aligned = (
        merged["Work category"]
        .map(category_avg)
    )

    merged["cost_vs_category_avg"] = (
        merged["Sanction Amount ( ₹ )"]
        / category_avg_aligned
    )

    print("Live cost vs category average calculated.")

    # Prepare live ML features
    merged["Fund Disbursed Amount ( ₹ )"] = (
        merged["live_total_expenditure"]
    )

    ml_features = [
        "Sanction Amount ( ₹ )",
        "Fund Disbursed Amount ( ₹ )",
        "expenditure_ratio",
        "remaining_amount",
        "duration_days",
        "sanction_delay_days",
        "payment_count",
        "vendor_count",
        "avg_payment",
        "max_payment",
        "project_age_days",
        "Payment In-Progress",
        "Payment Success",
        "first_payment_delay_days",
        "cost_vs_category_avg"
    ]

    live_X = merged[ml_features].copy()

    print("Live ML features prepared.")
    print("Feature count:", len(ml_features))
    print("Feature shape:", live_X.shape)

    # Handle missing values in live ML features
    payment_features = [
        "Fund Disbursed Amount ( ₹ )",
        "expenditure_ratio",
        "remaining_amount",
        "payment_count",
        "vendor_count",
        "avg_payment",
        "max_payment",
        "Payment In-Progress",
        "Payment Success",
        "first_payment_delay_days"
    ]

    merged[payment_features] = (
        merged[payment_features].fillna(0)
    )

    merged["duration_days"] = (
        merged["duration_days"].fillna(0)
    )

    merged["project_age_days"] = (
        merged["project_age_days"].fillna(0)
    )

    merged["cost_vs_category_avg"] = (
        merged["cost_vs_category_avg"].fillna(1)
    )

    live_X = merged[ml_features].copy()

    print("Live missing values handled.")
    print(
        "Remaining missing values:",
        live_X.isna().sum().sum()
    )

    # Scale live features using the saved scaler
    live_X_scaled = scaler.transform(live_X)

    # Generate anomaly predictions
    merged["anomaly_prediction"] = (
        model.predict(live_X_scaled)
    )

    # Generate anomaly scores
    merged["anomaly_score"] = (
        model.decision_function(live_X_scaled)
    )

    print("Live anomaly predictions generated.")

    print(
        merged["anomaly_prediction"]
        .value_counts()
    )

    # Calculate risk indicators

    merged["long_sanction_delay"] = (
        merged["sanction_delay_days"] > 140
    )

    merged["high_cost_flag"] = (
        merged["cost_vs_category_avg"] > 2
    )

    merged["long_duration_flag"] = (
        merged["duration_days"] > 260
    )

    merged["high_expenditure_flag"] = (
        merged["expenditure_ratio"] >= 0.90
    )

    merged["late_first_payment_flag"] = (
        merged["first_payment_delay_days"] > 90
    )

    print("Live risk indicators calculated.")

    # Generate risk reasons
    merged["risk_reasons"] = ""

    merged.loc[
        merged["high_cost_flag"],
        "risk_reasons"
    ] += "High Cost; "

    merged.loc[
        merged["long_duration_flag"],
        "risk_reasons"
    ] += "Long Duration; "

    merged.loc[
        merged["long_sanction_delay"],
        "risk_reasons"
    ] += "Long Sanction Delay; "

    merged.loc[
        merged["over_expenditure"] == True,
        "risk_reasons"
    ] += "Over Expenditure; "

    merged.loc[
        merged["high_expenditure_flag"],
        "risk_reasons"
    ] += "High Expenditure; "

    merged.loc[
        merged["late_first_payment_flag"],
        "risk_reasons"
    ] += "Late First Payment; "

    print("Live risk reasons generated.")

    # Calculate live risk score
    risk_flags = [
        "high_cost_flag",
        "long_duration_flag",
        "long_sanction_delay",
        "over_expenditure",
        "high_expenditure_flag",
        "late_first_payment_flag"
    ]

    merged["risk_score"] = (
        merged[risk_flags]
        .fillna(False)
        .astype(int)
        .sum(axis=1)
        / len(risk_flags)
        * 100
    )

    print("Live risk score calculated.")

    # Assign live risk category
    def assign_risk_category(score):
        if score <= 16.67:
            return "Low Risk"
        elif score <= 33.34:
            return "Medium Risk"
        elif score <= 66.67:
            return "High Risk"
        else:
            return "Critical Risk"

    merged["final_risk_category"] = (
        merged["risk_score"].apply(assign_risk_category)
    )

    print("Live risk categories assigned.")

    # Identify priority alerts
    merged["priority_alert"] = (
        (merged["anomaly_prediction"] == -1) &
        (merged["risk_score"] >= 50)
    )

    print("Live priority alerts calculated.")

    # Assign alert type
    def assign_alert_type(row):
        if row["priority_alert"]:
            return "Priority Alert"
        elif row["anomaly_prediction"] == -1:
            return "AI Anomaly"
        elif row["risk_score"] >= 50:
            return "Rule-Based High Risk"
        else:
            return "Normal"

    merged["alert_type"] = (
        merged.apply(assign_alert_type, axis=1)
    )

    print("Live alert types assigned.")

    # Prepare dashboard-ready data
    dashboard_columns = [
    "work_id",
    "Work category",
    "Work description",
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

    # Determine current work progress
    merged["progress"] = (
        merged["Completion Date"]
        .notna()
        .map({
            True: "Completed",
            False: "In Progress"
        })
    )

    dashboard_data = merged[dashboard_columns].copy()

    print("Live dashboard dataset prepared.")
    print("Dashboard shape:", dashboard_data.shape)

    return dashboard_data



if __name__ == "__main__":
    data = run_mplads_pipeline()

    print("\nPipeline completed successfully.")
    print("Final shape:", data.shape)
    print("\nColumns:")
    print(data.columns.tolist())