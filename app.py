# app.py

from flask import Flask, render_template, jsonify
import pandas as pd
import sqlite3

# --- Initialize the Flask App ---
app = Flask(__name__)

# --- Define Routes ---

@app.route('/')
def homepage():
    """Serves the homepage."""
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    """Serves the main dashboard page."""
    return render_template('dashboard.html')

@app.route('/search')
def search():
    """Serves the student search page."""
    return render_template('search.html')
    
@app.route('/insights')
def insights():
    """Serves the page for overall class-wide graphs."""
    return render_template('insights.html')

@app.route('/api/students')
def get_students():
    """API endpoint to get all student data, including nested subject-level grades."""
    conn = sqlite3.connect('data/student_performance.db')
    query = """
        SELECT
            s.student_id,
            s.student_name,
            s.gender,
            s.age,
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

    # Restructure the flat dataframe into a nested JSON structure
    students_dict = {}
    for _, row in df.iterrows():
        student_id = row['student_id']
        if student_id not in students_dict:
            students_dict[student_id] = {
                "student_id": student_id,
                "student_name": row['student_name'],
                "gender": row['gender'],
                "age": row['age'],
                "grades": []
            }
        
        students_dict[student_id]['grades'].append({
            "subject_name": row['subject_name'],
            "prev_gpa": row['prev_gpa'],
            "current_gpa": row['current_gpa'],
            "attendance_pct": row['attendance_pct'],
            "assignment_rate": row['assignment_rate'],
            "participation_score": row['participation_score']
        })
        
    return jsonify(list(students_dict.values()))

# --- Run the App ---
if __name__ == '__main__':
    app.run(debug=True)