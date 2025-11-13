# train_model.py

import pandas as pd
import sqlite3
import pickle
import os
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
import xgboost as xgb

# --- Configuration ---
DB_FILE_PATH = 'data/student_performance.db'
MODEL_PATH = 'model.pkl'
VISUALIZATIONS_DIR = 'doc_visualizations'

def train_regression_model():
    """
    Loads relational data, engineers features for each student,
    trains an XGBoost Regressor to predict average GPA, and saves artifacts.
    """
    # --- 1. Load and Join Data from Relational Database ---
    print("Loading and joining data from database...")
    conn = sqlite3.connect(DB_FILE_PATH)
    # SQL query to join all three tables into a single flat view
    query = """
        SELECT
            s.student_id,
            s.student_name,
            sub.subject_name,
            g.prev_gpa,
            g.current_gpa,
            g.attendance_pct,
            g.assignment_rate,
            g.participation_score
        FROM students s
        JOIN grades g ON s.student_id = g.student_id
        JOIN subjects sub ON g.subject_id = sub.subject_id
    """
    df = pd.read_sql_query(query, conn)
    conn.close()
    print(f"Loaded {len(df)} grade records.")

    # --- 2. Feature Engineering: Aggregate data for each student ---
    # We group by student to get their average performance across all subjects
    student_agg = df.groupby('student_id').agg(
        avg_prev_gpa=('prev_gpa', 'mean'),
        avg_attendance=('attendance_pct', 'mean'),
        avg_assignments=('assignment_rate', 'mean'),
        avg_participation=('participation_score', 'mean'),
        # The target variable we want to predict
        avg_current_gpa=('current_gpa', 'mean') 
    ).reset_index()

    print(f"Aggregated data for {len(student_agg)} unique students.")

    # --- 3. Feature and Target Selection ---
    features = [
        'avg_prev_gpa',
        'avg_attendance',
        'avg_assignments',
        'avg_participation'
    ]
    target = 'avg_current_gpa'

    X = student_agg[features]
    y = student_agg[target]

    # --- 4. Train-Test Split ---
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # --- 5. Model Training (Using XGBoost Regressor) ---
    print("Training XGBoost Regressor model...")
    # We use XGBRegressor for predicting a continuous value (GPA)
    model = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100, learning_rate=0.1, max_depth=5)
    model.fit(X_train, y_train)

    # --- 6. Model Evaluation ---
    print("Evaluating regression model...")
    y_pred = model.predict(X_test)
    
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)

    print(f"\nModel Mean Absolute Error (MAE): {mae:.4f}")
    print(f"Model R-squared (R2) Score: {r2:.4f}")
    print("\n(MAE: On average, the model's GPA prediction is off by this amount.)")
    print("(R2 Score: Represents the proportion of variance in the GPA that is predictable from the features. Closer to 1 is better.)")

    # --- 7. Save the Model ---
    print(f"\nSaving regression model to {MODEL_PATH}...")
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)

    # --- 8. Generate and Save New Visualizations ---
    print("Generating and saving new visualizations...")
    os.makedirs(VISUALIZATIONS_DIR, exist_ok=True)

    # a) Feature Importance
    plt.figure(figsize=(10, 6))
    xgb.plot_importance(model, height=0.6)
    plt.title('Feature Importance for Predicting Average GPA')
    plt.tight_layout()
    plt.savefig(os.path.join(VISUALIZATIONS_DIR, 'regression_feature_importance.png'))
    plt.close()

    # b) Predicted vs. Actual GPA Plot
    plt.figure(figsize=(8, 8))
    sns.scatterplot(x=y_test, y=y_pred, alpha=0.7)
    plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], '--r', linewidth=2) # 45-degree line
    plt.xlabel('Actual Average GPA')
    plt.ylabel('Predicted Average GPA')
    plt.title('Predicted vs. Actual GPA')
    plt.tight_layout()
    plt.savefig(os.path.join(VISUALIZATIONS_DIR, 'predicted_vs_actual.png'))
    plt.close()

    print(f"\n✅ All new visualizations saved in the '{VISUALIZATIONS_DIR}' folder.")

if __name__ == "__main__":
    train_regression_model()