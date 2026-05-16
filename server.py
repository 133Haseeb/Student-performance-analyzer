from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    mean_absolute_error, r2_score
)
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor, IsolationForest
 
app = Flask(__name__)
CORS(app, origins=["https://133haseeb.github.io"])
 
@app.route('/analyze', methods=['POST'])
def analyze():
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
 
    file = request.files['file']
    data = pd.read_csv(file)
 
    df = data[[
        'Attendance (%)',
        'Internal Test 1 (out of 40)',
        'Internal Test 2 (out of 40)',
        'Assignment Score (out of 10)',
        'Daily Study Hours',
        'Final Exam Marks (out of 100)'
    ]].copy()
 
    df.columns = df.columns.str.replace('[^a-zA-Z0-9_]', '', regex=True)
    df.columns = df.columns.str.lower().str.replace(' ', '_')
 
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    df = df.dropna()
 
    target_column = 'finalexammarksoutof100'
    train_df, test_df = train_test_split(df, test_size=0.2, random_state=42)
 
    X_train_reg = train_df.drop(columns=[target_column])
    y_train_reg = train_df[target_column]
    X_test_reg = test_df.drop(columns=[target_column])
    y_test_reg = test_df[target_column]
 
    reg_model = RandomForestRegressor(n_estimators=100, random_state=42)
    reg_model.fit(X_train_reg, y_train_reg)
    y_pred = reg_model.predict(X_test_reg)
 
    mae = mean_absolute_error(y_test_reg, y_pred)
    r2 = r2_score(y_test_reg, y_pred)
 
    comparison_df = pd.DataFrame({
        'Reported_Score': y_test_reg.values,
        'AI_Score': y_pred.round(2)
    })
 
    threshold = 15
    comparison_df['Score_Difference'] = abs(comparison_df['Reported_Score'] - comparison_df['AI_Score'])
    comparison_df['Comparison_Result'] = np.where(
        comparison_df['Score_Difference'] >= threshold, 'Suspicious', 'Normal'
    )
 
    iso_forest = IsolationForest(random_state=42, contamination='auto')
    iso_forest.fit(comparison_df[['Score_Difference']])
    comparison_df['Anomaly_Flag'] = iso_forest.predict(comparison_df[['Score_Difference']])
 
    final_anomalies = comparison_df[comparison_df['Comparison_Result'] == 'Suspicious'].copy()
 
    if 'Student_ID' in data.columns:
        test_ids = data.loc[y_test_reg.index, 'Student_ID'].values
        final_anomalies['Student_ID'] = test_ids[:len(final_anomalies)] if len(test_ids) >= len(final_anomalies) else [f'S{i}' for i in range(len(final_anomalies))]
    else:
        final_anomalies['Student_ID'] = [f'Student {i+1}' for i in range(len(final_anomalies))]
 
    suspicious_list = final_anomalies[['Student_ID', 'Reported_Score', 'AI_Score', 'Score_Difference']].to_dict(orient='records')
 
    sample = comparison_df.head(10).reset_index(drop=True)
    chart_data = {
        'labels': [f'S{i+1}' for i in range(len(sample))],
        'actual': sample['Reported_Score'].tolist(),
        'predicted': sample['AI_Score'].tolist()
    }
 
    diffs = comparison_df['Score_Difference'].round(0).astype(int)
    diff_counts = diffs.value_counts().sort_index()
    diff_distribution = {
        'labels': diff_counts.index.tolist(),
        'counts': diff_counts.values.tolist()
    }
 
    data['Pass_Fail'] = data['Final Exam Marks (out of 100)'].apply(lambda x: 1 if x >= 50 else 0)
 
    drop_cols = ['Final Exam Marks (out of 100)', 'Pass_Fail']
    if 'Student_ID' in data.columns:
        drop_cols.append('Student_ID')
 
    X_class = data.drop(drop_cols, axis=1)
    y_class = data['Pass_Fail']
 
    for col in X_class.columns:
        X_class[col] = pd.to_numeric(X_class[col], errors='coerce')
    X_class = X_class.fillna(X_class.mean())
 
    def evaluate(y_true, y_pred_vals, name):
        return {
            'Model': name,
            'Accuracy': round(accuracy_score(y_true, y_pred_vals), 4),
            'Precision': round(precision_score(y_true, y_pred_vals, zero_division=0), 4),
            'Recall': round(recall_score(y_true, y_pred_vals, zero_division=0), 4),
            'F1-score': round(f1_score(y_true, y_pred_vals, zero_division=0), 4)
        }
 
    if y_class.nunique() < 2:
        evaluation_metrics = [
            {'Model': 'Logistic Regression', 'Accuracy': 'N/A', 'Precision': 'N/A', 'Recall': 'N/A', 'F1-score': 'N/A'},
            {'Model': 'Random Forest', 'Accuracy': 'N/A', 'Precision': 'N/A', 'Recall': 'N/A', 'F1-score': 'N/A'}
        ]
    else:
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_class)
 
        X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
            X_scaled, y_class, test_size=0.2, random_state=42, stratify=y_class
        )
 
        log_model = LogisticRegression(max_iter=1000)
        log_model.fit(X_train_c, y_train_c)
        y_pred_log = log_model.predict(X_test_c)
 
        rf = RandomForestClassifier(random_state=42)
        rf.fit(X_train_c, y_train_c)
        y_pred_rf = rf.predict(X_test_c)
 
        evaluation_metrics = [
            evaluate(y_test_c, y_pred_log, 'Logistic Regression'),
            evaluate(y_test_c, y_pred_rf, 'Random Forest')
        ]
 
    return jsonify({
        'total_students': len(data),
        'suspicious_count': len(final_anomalies),
        'regression_stats': {'mae': round(mae, 2), 'r2': round(r2, 4)},
        'chart_data': chart_data,
        'diff_distribution': diff_distribution,
        'suspicious_students': suspicious_list,
        'evaluation_metrics': evaluation_metrics
    })
 
 
if __name__ == '__main__':
    app.run(debug=True, port=5000)
