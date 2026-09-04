# MPLADS AI Monitoring

AI-powered system for detecting anomalies, identifying project risks, and monitoring MPLADS works.

## Smart India Hackathon

**Problem Statement ID:** SIH26102

**Problem Statement:** Development of an AI-powered system to detect anomalies, fraud, and inefficiencies in MPLAD Scheme implementation regd.

**Theme:** Smart Automation

**Category:** Software

**Team:** The DataMiners

## Project Overview

This project provides a work-level monitoring system for MPLADS works by integrating sanctioned works, completed works, and expenditure data.

The system combines rule-based risk indicators with Isolation Forest-based anomaly detection to identify unusual work patterns and prioritize works requiring further investigation.

## Key Features

- Work-level integration of MPLADS datasets
- Expenditure utilization analysis
- Isolation Forest-based anomaly detection
- Rule-based risk scoring
- Low, Medium, High and Critical risk classification
- Priority alerts for high-risk works
- State-wise risk analysis
- Risk indicator breakdown
- Work ID-based investigation
- Interactive Streamlit dashboard

## Technology Stack

- Python
- Pandas
- Scikit-learn
- Streamlit
- Jupyter Notebook

## Dashboard

The application provides:

- Risk distribution
- Expenditure utilization
- State-wise High/Critical risk analysis
- Risk indicator breakdown
- Top risky works
- Priority alerts
- State and risk-level filters
- Individual work investigation

## Anomaly Detection

Isolation Forest is used as an unsupervised anomaly detection technique to identify unusual work-level patterns.

Detected anomalies should be treated as **potential anomalies requiring investigation**, and not as confirmed cases of fraud.

## Dataset

The project uses MPLADS data containing:

- Works Sanctioned
- Works Completed
- Expenditure data

The datasets are integrated at the **Work ID level** for analysis.

## Project Structure

```text
MPLADS-AI-Monitoring/
│
├── app.py
├── requirements.txt
├── MPLADS_dashboard_data.csv
├── SIH26102_ds.ipynb
└── README.md
