# generate_data.py

import sqlite3
import random
import numpy as np
import os

# --- Configuration ---
DB_FOLDER = 'data'
DB_FILE_PATH = os.path.join(DB_FOLDER, 'student_performance.db')
NUM_STUDENTS = 150
SUBJECTS = [
    "Data Structures & Algorithms", "Database Management Systems", "Operating Systems",
    "Computer Networks", "Object-Oriented Programming", "Discrete Mathematics"
]

# --- Name Lists ---
MALE_FIRST_NAMES = ["Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Reyansh", "Ayaan", "Krishna", "Ishaan", "Rohan", "Aryan", "Advik", "Kabir", "Ansh"]
FEMALE_FIRST_NAMES = ["Ananya", "Diya", "Saanvi", "Aadhya", "Myra", "Aarohi", "Isha", "Priya", "Riya", "Siya", "Kiara", "Anika", "Navya", "Zara", "Avni"]
LAST_NAMES = ["Sharma", "Verma", "Gupta", "Singh", "Kumar", "Patel", "Shah", "Mehta", "Iyer", "Reddy", "Joshi", "Khan", "Chopra", "Malhotra", "Kapoor"]


def create_database():
    """Creates the database and the required tables with relationships."""
    conn = sqlite3.connect(DB_FILE_PATH)
    cursor = conn.cursor()

    cursor.execute("DROP TABLE IF EXISTS grades")
    cursor.execute("DROP TABLE IF EXISTS subjects")
    cursor.execute("DROP TABLE IF EXISTS students")

    cursor.execute("""
        CREATE TABLE students (
            student_id TEXT PRIMARY KEY,
            student_name TEXT NOT NULL,
            gender TEXT,
            age INTEGER
        );
    """)
    cursor.execute("""
        CREATE TABLE subjects (
            subject_id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject_name TEXT NOT NULL UNIQUE
        );
    """)
    cursor.execute("""
        CREATE TABLE grades (
            grade_id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id TEXT,
            subject_id INTEGER,
            prev_gpa REAL,
            current_gpa REAL,
            attendance_pct INTEGER,
            assignment_rate INTEGER,
            participation_score INTEGER,
            FOREIGN KEY (student_id) REFERENCES students (student_id),
            FOREIGN KEY (subject_id) REFERENCES subjects (subject_id)
        );
    """)

    conn.commit()
    conn.close()
    print("✅ Database and tables created successfully.")

def populate_data():
    """Populates the database with complex, realistic student and grade data."""
    conn = sqlite3.connect(DB_FILE_PATH)
    cursor = conn.cursor()

    for subject in SUBJECTS:
        cursor.execute("INSERT INTO subjects (subject_name) VALUES (?)", (subject,))
    
    used_names = set()

    for i in range(NUM_STUDENTS):
        student_id = f"23WU{str(i+1).zfill(6)}"
        
        while True:
            gender = random.choice(['Male', 'Female'])
            first_name = random.choice(MALE_FIRST_NAMES if gender == 'Male' else FEMALE_FIRST_NAMES)
            student_name = f"{first_name} {random.choice(LAST_NAMES)}"
            if student_name not in used_names:
                used_names.add(student_name)
                break
        
        age = random.randint(18, 22)
        cursor.execute("INSERT INTO students (student_id, student_name, gender, age) VALUES (?, ?, ?, ?)",
                       (student_id, student_name, gender, age))

        aptitude = random.choices(['High', 'Medium', 'Low'], weights=[0.3, 0.5, 0.2], k=1)[0]

        if aptitude == 'High':
            avg_attendance_habit = random.randint(85, 95)
        elif aptitude == 'Medium':
            avg_attendance_habit = random.randint(70, 85)
        else: # Low
            avg_attendance_habit = random.randint(55, 70)

        shuffled_subjects = random.sample(SUBJECTS, len(SUBJECTS))
        strength_subject = shuffled_subjects[0]
        weakness_subject = shuffled_subjects[1]

        # --- DEBUG: Store first student's data to print it ---
        first_student_sample_data = []

        for subject_id, subject_name in enumerate(SUBJECTS, 1):
            if aptitude == 'High':
                base_gpa = np.random.normal(loc=8.0, scale=0.7)
            elif aptitude == 'Medium':
                base_gpa = np.random.normal(loc=6.5, scale=1.0)
            else: # Low
                base_gpa = np.random.normal(loc=5.0, scale=1.2)
            
            # --- FINAL FIX: Increased variance for attendance ---
            subject_attendance = avg_attendance_habit + random.randint(-15, 10)
            
            if subject_name == strength_subject:
                base_gpa += random.uniform(1.0, 2.0)
            elif subject_name == weakness_subject:
                base_gpa -= random.uniform(1.0, 2.0)
            
            prev_gpa = round(np.clip(base_gpa, 2.0, 10.0), 2)
            final_attendance = int(np.clip(subject_attendance, 30, 100))
            improvement = (final_attendance - 75) / 50.0
            current_gpa = round(np.clip(prev_gpa + improvement + np.random.normal(0, 0.25), 2.0, 10.0), 2)
            assignment_rate = int(np.clip(current_gpa * 10 + random.randint(-10, 10), 40, 100))
            participation_score = int(np.clip(final_attendance * 0.8 + random.randint(-15, 15), 30, 100))

            cursor.execute("""
                INSERT INTO grades (student_id, subject_id, prev_gpa, current_gpa, attendance_pct, assignment_rate, participation_score)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (student_id, subject_id, prev_gpa, current_gpa, final_attendance, assignment_rate, participation_score))
            
            if i == 0: # If it's the first student, save their data
                first_student_sample_data.append(f"  - {subject_name}: {final_attendance}%")

    # --- DEBUG: Print the first student's attendance data ---
    if NUM_STUDENTS > 0:
        first_student_name = next(iter(used_names))
        print("\n--- SAMPLE DATA ---")
        print(f"Generated sample attendance for '{first_student_name}':")
        for line in first_student_sample_data:
            print(line)
        print("-------------------\n")

    conn.commit()
    conn.close()
    print(f"✅ Populated database with {NUM_STUDENTS} unique student profiles.")

if __name__ == "__main__":
    os.makedirs(DB_FOLDER, exist_ok=True)
    create_database()
    populate_data()