# Student Performance Analyzer — Setup Guide

## Files in this project

- index.html   → Main dashboard page
- style.css    → All styling
- app.js       → Frontend logic (charts, tables, API calls)
- server.py    → Flask backend (ML + API)

# Student Performance Analyzer

A web-based dashboard for Administrations to detect suspicious student results using Machine Learning.


## Tech Stack

- Frontend: HTML, CSS, JavaScript, Chart.js
- Backend: Python, Flask
- Machine Learning: scikit-learn (Random Forest, Logistic Regression, Isolation Forest)


## Use the dashboard

1. Click "Drop your CSV file here" and select your student CSV
2. Click Analyze
3. Wait a few seconds for the ML to run
4. View the dashboard: summary cards, charts, suspicious students, model metrics


## CSV Format Required

Your CSV must have these columns (exact names):

- Attendance (%)
- Internal Test 1 (out of 40)
- Internal Test 2 (out of 40)
- Assignment Score (out of 10)
- Daily Study Hours
- Final Exam Marks (out of 100)
- Student_ID  (optional but recommended)


