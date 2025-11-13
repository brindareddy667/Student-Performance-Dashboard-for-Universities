# 🎓 Student Performance Prediction & Dashboard

This machine learning project aims to predict student academic performance at an early stage. By analyzing academic, behavioral, and demographic data, the system categorizes students into **High**, **Medium**, or **Low** performance groups to enable proactive faculty intervention.

## 🧠 Key Features

* Multi-Factor Analysis: Considers grades, attendance, online engagement, and participation scores.
* Feature Engineering: Includes custom metrics like "Engagement Ratio," "Attendance Consistency," and "Improvement Trend"
* Predictive Modeling: Compares multiple ML algorithms to find the best fit.
* Data Visualization: EDA visualizations for correlation heatmaps and attendance trends[cite: 596].

## 🤖 Model Performance

We implemented and evaluated three models:
1.  **Logistic Regression:** Baseline model (~70% Accuracy).
2.  **Random Forest:** Improved performance (~80% Accuracy).
3.  **XGBoost:** Best performer (~85% Accuracy).

*Note: XGBoost provided the highest accuracy, particularly in distinguishing between "High" and "Low" performance categories.*

## 🛠️ Tech Stack

* **Core:** Python.
* **Data Manipulation:** Pandas, NumPy.
* **Machine Learning:** Scikit-learn, XGBoost.
* **Database:** SQLite (for storing synthetic student records).
* **Visualization:** Matplotlib, Seaborn.

## 📈 Workflow
1.  **Data Collection:** Synthetic dataset generation based on realistic constraints.
2.  **Preprocessing:** Handling missing values, normalization, and encoding.
3.  **EDA:** analyzing feature importance and class balance.
4.  **Training:** Training models on the processed dataset.
5.  **Deployment (Planned):** Interactive Streamlit dashboard for real-time predictions.
