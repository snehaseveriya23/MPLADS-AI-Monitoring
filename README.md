# MPLADS AI MONITOR

**AI-Powered Monitoring and Risk Intelligence for MPLADS**

An AI-powered work-level monitoring system developed for **Smart India Hackathon 2026 – Problem Statement SIH26102**.

The system integrates MPLADS sanctioned works, completed works, and expenditure data to identify unusual patterns, calculate risk indicators, classify works by risk level, and prioritize works requiring further verification.

## Project Overview

MPLADS AI MONITOR combines:

- Work-level data integration
- Expenditure and project monitoring
- Isolation Forest-based anomaly detection
- Rule-based risk indicators
- Risk scoring and classification
- Priority alerts
- Work-level investigation support
- Actionable investigation recommendations

The system is designed to support **Members of Parliament and government authorities** in identifying works that may require closer review.

> The system identifies risk and anomaly signals for verification. It does not establish fraud or wrongdoing.

## Key Features

- Work-level integration of MPLADS datasets
- Expenditure utilization analysis
- Isolation Forest-based anomaly detection
- Rule-based risk assessment
- Low, Medium, High and Critical risk classification
- Priority Alerts
- State-wise risk analysis
- Risk indicator breakdown
- Work ID-based investigation
- Top priority investigation works
- Work-specific investigation recommendations
- Field verification guidance
- Interactive monitoring dashboard
- Filtering by State, Risk Level, Work Category, Alert Type and Constituency

## Technical Approach

### 1. Data Collection

MPLADS datasets used:

- Works Sanctioned
- Works Completed
- Expenditure on Completed and On-going Works

### 2. Data Processing & Integration

The datasets are cleaned, normalized and integrated using **Work ID**.

### 3. Feature Engineering

The system calculates indicators including:

- Expenditure Ratio
- Project Duration
- Sanction Delay
- Payment Indicators
- Cost vs Category Average

### 4. Anomaly Detection

**Isolation Forest** is used as an unsupervised anomaly detection method to identify unusual work-level patterns.

### 5. Rule-Based Risk Assessment

The system evaluates indicators such as:

- High Cost
- Long Duration
- Long Sanction Delay
- High Expenditure
- Late First Payment
- Over Expenditure

### 6. Risk Classification

Works are classified into:

- Low Risk
- Medium Risk
- High Risk
- Critical Risk

Priority Alerts are generated when an AI anomaly is combined with a sufficiently high risk score.

### 7. Investigation Support

The Insights workspace prioritizes works requiring attention and provides:

- Triggered risk indicators
- Financial and project details
- Reason for attention
- Recommended review actions
- Field verification checklist

## System Architecture

```text
MPLADS Data
     │
     ▼
Data Cleaning & Integration
     │
     ▼
Feature Engineering
     │
     ├───────────────┐
     ▼               ▼
Isolation Forest   Rule-Based Risk Indicators
     │               │
     └───────┬───────┘
             ▼
      Risk Scoring &
      Classification
             │
             ▼
       FastAPI Backend
             │
             ▼
       React Frontend
             │
       ┌─────┴─────┐
       ▼           ▼
   Dashboard    Insights
## Technology Stack

### Frontend

- React
- Vite
- JavaScript
- CSS

### Backend

- Python
- FastAPI
- Pandas
- NumPy
- Joblib
- Scikit-learn

### Data Science

- Jupyter Notebook
- Pandas
- NumPy
- Isolation Forest
- Feature Engineering
- Rule-Based Risk Scoring
