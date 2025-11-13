document.addEventListener('DOMContentLoaded', () => {
    // --- Dark Mode Logic ---
    const themeToggle = document.getElementById('checkbox');
    const currentTheme = localStorage.getItem('theme');

    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.checked = true;
    }

    themeToggle.addEventListener('change', () => {
        document.body.classList.toggle('dark-mode');
        let theme = 'light';
        if (document.body.classList.contains('dark-mode')) {
            theme = 'dark';
        }
        localStorage.setItem('theme', theme);
    });

    // --- Page Router ---
    const path = window.location.pathname;
    if (path === '/dashboard') initDashboardPage();
    else if (path === '/search') initSearchPage();
    else if (path === '/insights') initInsightsPage();
});

let allStudents = [];

const resources = {
    "Data Structures & Algorithms": "https://visualgo.net/en",
    "Database Management Systems": "https://www.hackerrank.com/domains/sql",
    "Operating Systems": "https://www.docker.com/get-started/",
    "Computer Networks": "https://www.netacad.com/courses/packet-tracer",
    "Object-Oriented Programming": "https://refactoring.guru/design-patterns",
    "Discrete Mathematics": "https://www.youtube.com/playlist?list=PLDDGPdw7e6Ag1EIruYsvIuD-KddiIuLgB"
};

async function fetchStudents() {
    if (allStudents.length > 0) return allStudents;
    const loader = document.getElementById('loader');
    if(loader) loader.style.display = 'block'; // Show loader

    try {
        const response = await fetch('/api/students');
        if (!response.ok) throw new Error('Network response was not ok');
        allStudents = await response.json();
        if(loader) loader.style.display = 'none'; // Hide loader
        return allStudents;
    } catch (error) { 
        console.error("Failed to fetch students:", error); 
        if(loader) loader.style.display = 'none'; // Hide loader on error
        return []; 
    }
}

function calculateSubjectAverages(students) {
    const subjectData = {};
    students.forEach(student => {
        student.grades.forEach(grade => {
            if (!subjectData[grade.subject_name]) {
                subjectData[grade.subject_name] = { totalGpa: 0, totalAttendance: 0, count: 0 };
            }
            subjectData[grade.subject_name].totalGpa += grade.current_gpa;
            subjectData[grade.subject_name].totalAttendance += grade.attendance_pct;
            subjectData[grade.subject_name].count++;
        });
    });

    const subjectAverages = Object.keys(subjectData).map(name => ({
        name: name,
        avgGpa: subjectData[name].totalGpa / subjectData[name].count,
        avgAttendance: subjectData[name].totalAttendance / subjectData[name].count
    }));
    return subjectAverages;
}

async function initDashboardPage() {
    const students = await fetchStudents();
    renderKPIs(students);
    renderStudentLists(students);
    setupDownloadButton(students);
    const subjectAverages = calculateSubjectAverages(students);
    createSubjectAttendanceChart(subjectAverages);
    createSubjectGpaChart(subjectAverages);
}

function renderKPIs(students) {
    const container = document.getElementById('kpi-container');
    if (!container) return;
    const totalStudents = students.length;
    const overallAvgAttendance = students.reduce((acc, student) => acc + student.grades.reduce((s, g) => s + g.attendance_pct, 0), 0) / (totalStudents * 6);
    const overallAvgGpa = students.reduce((acc, student) => acc + student.grades.reduce((s, g) => s + g.current_gpa, 0), 0) / (totalStudents * 6);
    container.innerHTML = `<div class="card kpi-card fade-in"><h3>Total Students</h3><p>${totalStudents}</p></div><div class="card kpi-card fade-in-delay"><h3>Avg. Attendance</h3><p>${overallAvgAttendance.toFixed(1)}%</p></div><div class="card kpi-card fade-in-delay-2"><h3>Avg. GPA</h3><p>${overallAvgGpa.toFixed(2)}</p></div>`;
}

function renderStudentLists(students) {
    const container = document.getElementById('student-lists');
    if (!container) return;
    students.forEach(s => {
        s.avgGpa = s.grades.reduce((sum, g) => sum + g.current_gpa, 0) / s.grades.length;
    });
    const topPerformers = [...students].sort((a, b) => b.avgGpa - a.avgGpa).slice(0, 5);
    const atRiskStudents = students.filter(s => {
        const lowGpaSubjects = s.grades.filter(g => g.current_gpa < 5.5).length;
        return lowGpaSubjects >= 2;
    }).sort((a, b) => a.avgGpa - b.avgGpa).slice(0, 5);
    container.innerHTML = `<div><h3>Top 5 Performing Students</h3><table><thead><tr><th>Name</th><th>Avg. GPA</th></tr></thead><tbody>${topPerformers.map(s => `<tr><td>${s.student_name}</td><td>${s.avgGpa.toFixed(2)}</td></tr>`).join('')}</tbody></table></div><div><h3>Top 5 At-Risk Students</h3><table><thead><tr><th>Name</th><th>Avg. GPA</th></tr></thead><tbody>${atRiskStudents.map(s => `<tr><td>${s.student_name}</td><td>${s.avgGpa.toFixed(2)}</td></tr>`).join('')}</tbody></table></div>`;
}

function setupDownloadButton(students) {
    const button = document.getElementById('download-report-btn');
    if (!button) return;
    button.addEventListener('click', () => {
        let csvContent = "data:text/csv;charset=utf-8,Student ID,Name,Subject,Issue,Recommendation,Resource\n";
        students.forEach(s => {
            const lowGpaSubjects = s.grades.filter(g => g.current_gpa < 5.5).length;
            if (lowGpaSubjects >= 2) {
                s.grades.forEach(g => {
                    if (g.current_gpa < 5.5) {
                        const row = [s.student_id, `"${s.student_name}"`, g.subject_name, `"Low GPA (${g.current_gpa})"`, `"Focus on foundational topics"`, `"${resources[g.subject_name] || ''}"`].join(',');
                        csvContent += row + '\n';
                    }
                });
            }
        });
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "at_risk_students_report.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
}

function createSubjectAttendanceChart(subjectAverages) {
    const container = document.getElementById('subjectAttendanceChart');
    if (!container) return;
    const ctx = container.getContext('2d');
    const sortedByAttendance = [...subjectAverages].sort((a, b) => b.avgAttendance - a.avgAttendance);
    new Chart(ctx, { type: 'bar', data: { labels: sortedByAttendance.map(s => s.name), datasets: [{ label: 'Average Attendance %', data: sortedByAttendance.map(s => s.avgAttendance.toFixed(2)), backgroundColor: 'rgba(52, 152, 219, 0.6)', borderColor: 'rgba(52, 152, 219, 1)', borderWidth: 1 }] }, options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } } });
}

function createSubjectGpaChart(subjectAverages) {
    const container = document.getElementById('subjectGpaChart');
    if (!container) return;
    const ctx = container.getContext('2d');
    const sortedByGpa = [...subjectAverages].sort((a, b) => b.avgGpa - a.avgGpa);
    new Chart(ctx, { type: 'bar', data: { labels: sortedByGpa.map(s => s.name), datasets: [{ label: 'Average GPA', data: sortedByGpa.map(s => s.avgGpa.toFixed(2)), backgroundColor: 'rgba(46, 204, 113, 0.6)', borderColor: 'rgba(46, 204, 113, 1)', borderWidth: 1 }] }, options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } } });
}

async function initSearchPage() {
    const students = await fetchStudents();
    const searchInput = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results-container');
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        document.getElementById('profile-container').classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        if (query.length < 2) { resultsContainer.innerHTML = ''; return; }
        const filteredStudents = students.filter(s => s.student_name.toLowerCase().includes(query) || s.student_id.toLowerCase().includes(query));
        displaySearchResults(filteredStudents);
    });
    resultsContainer.addEventListener('click', (e) => {
        if (e.target && e.target.matches('.view-profile-btn')) {
            const studentId = e.target.dataset.id;
            const student = students.find(s => s.student_id === studentId);
            if (student) displayStudentProfile(student);
        }
    });
}

function displaySearchResults(results) {
    const container = document.getElementById('search-results-container');
    if (!results.length) { container.innerHTML = '<div class="card"><p>No students found.</p></div>'; return; }
    container.innerHTML = `<div class="card"><h3>Search Results</h3><table><thead><tr><th>Name</th><th>Student ID</th><th>Action</th></tr></thead><tbody>${results.map(s => `<tr><td>${s.student_name}</td><td>${s.student_id}</td><td><button class="cta-button view-profile-btn" data-id="${s.student_id}">View Profile</button></td></tr>`).join('')}</tbody></table></div>`;
}

function displayStudentProfile(student) {
    const resultsContainer = document.getElementById('search-results-container');
    const profileContainer = document.getElementById('profile-container');
    resultsContainer.classList.add('hidden');
    profileContainer.classList.remove('hidden');
    const overallGpa = student.grades.reduce((sum, g) => sum + g.current_gpa, 0) / student.grades.length;
    const overallAttendance = student.grades.reduce((sum, g) => sum + g.attendance_pct, 0) / student.grades.length;
    const gradesHtml = student.grades.map(g => `<tr><td>${g.subject_name}</td><td>${g.prev_gpa}</td><td>${g.current_gpa}</td><td>${g.attendance_pct}%</td><td>${g.assignment_rate}%</td></tr>`).join('');
    const insightsHtml = generateInsights(student);
    profileContainer.innerHTML = `<div class="card fade-in"><div class="profile-header"><div><h2>${student.student_name}</h2><p>${student.student_id}</p></div><div class="profile-overall-stats"><div class="kpi-card" style="text-align:center;"><h3>Overall CGPA</h3><p>${overallGpa.toFixed(2)}</p></div><div class="tiny-chart-container"><canvas id="overallAttendanceDonut"></canvas></div></div></div><h3>Subject-wise Performance</h3><table><thead><tr><th>Subject</th><th>Previous GPA</th><th>Current GPA</th><th>Attendance</th><th>Assignments</th></tr></thead><tbody>${gradesHtml}</tbody></table><h3 style="margin-top: 2rem;">Key Insights & Recommended Actions</h3>${insightsHtml ? insightsHtml : '<div class="insight-card"><p>No significant areas of concern identified. Keep up the great work!</p></div>'}</div>`;
    createOverallAttendanceDonut(overallAttendance);
}

function generateInsights(student) {
    let insights = '';
    student.grades.forEach(g => {
        let insight = '', action = '', resourceHtml = '';
        if (g.current_gpa < 5.5) {
            insight = `Struggling with Core Concepts in <strong>${g.subject_name}</strong>.`;
            action = `Focus on foundational topics to build confidence.`;
            if (resources[g.subject_name]) { resourceHtml = `<a href="${resources[g.subject_name]}" target="_blank" class="cta-button">View Resource</a>`; }
        } else if (g.assignment_rate < 70) {
            insight = `Difficulty with Coursework Deadlines in <strong>${g.subject_name}</strong>.`;
            action = `Recommend academic support resources and time management strategies.`;
        } else if (g.attendance_pct < 60) {
            insight = `Disengaged with lectures in <strong>${g.subject_name}</strong>.`;
            action = `Schedule a one-on-one meeting to discuss potential barriers to attendance.`;
        }
        if (insight) {
            insights += `<div class="insight-card"><div class="insight-content"><p><strong>Insight:</strong> ${insight}</p><p><strong>Action:</strong> ${action}</p></div>${resourceHtml}</div>`;
        }
    });
    return insights;
}

function createOverallAttendanceDonut(attendance) {
    const ctx = document.getElementById('overallAttendanceDonut').getContext('2d');
    new Chart(ctx, { type: 'doughnut', data: { labels: ['Attended', 'Missed'], datasets: [{ data: [attendance, 100 - attendance], backgroundColor: ['#3498db', '#ecf0f1'], borderWidth: 0 }] }, options: { responsive: true, cutout: '70%', plugins: { legend: { display: false }, tooltip: { enabled: false }, title: { display: true, text: `Avg. Attendance: ${attendance.toFixed(1)}%` } } } });
}

async function initInsightsPage() {
    const students = await fetchStudents();
    createScatterChart(students);
    createImprovementHistogram(students);
    const subjectAverages = calculateSubjectAverages(students);
    createSubjectDifficultyChart(subjectAverages);
}

function createScatterChart(students) {
    const container = document.getElementById('scatterChart');
    if (!container) return;
    const ctx = container.getContext('2d');
    const scatterData = students.flatMap(s => s.grades.map(g => ({ x: g.attendance_pct, y: g.current_gpa })));
    new Chart(ctx, { type: 'scatter', data: { datasets: [{ label: 'Student-Subject Performance', data: scatterData, backgroundColor: 'rgba(52, 152, 219, 0.6)', }] }, options: { responsive: true, maintainAspectRatio: true, scales: { x: { title: { display: true, text: 'Attendance (%)' } }, y: { title: { display: true, text: 'Current GPA' } } } } });
}

function createImprovementHistogram(students) {
    const container = document.getElementById('improvementHistogram');
    if (!container) return;
    const ctx = container.getContext('2d');
    const improvements = students.flatMap(s => s.grades.map(g => g.current_gpa - g.prev_gpa));
    const bins = { 'Decline (<-0.5)': 0, 'Slight Decline (-0.5 to 0)': 0, 'Maintained (~0)': 0, 'Slight Improvement (0 to 0.5)': 0, 'Improved (>0.5)': 0 };
    improvements.forEach(imp => { if (imp <= -0.5) bins['Decline (<-0.5)']++; else if (imp < 0) bins['Slight Decline (-0.5 to 0)']++; else if (Math.abs(imp) < 0.1) bins['Maintained (~0)']++; else if (imp <= 0.5) bins['Slight Improvement (0 to 0.5)']++; else bins['Improved (>0.5)']++; });
    new Chart(ctx, { type: 'bar', data: { labels: Object.keys(bins), datasets: [{ label: '# of Student-Subject Records', data: Object.values(bins), backgroundColor: ['#e74c3c', '#f39c12', '#bdc3c7', '#a9dfbf', '#2ecc71'] }] }, options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, title: { display: true, text: 'Number of Records' } } } } });
}

function createSubjectDifficultyChart(subjectAverages) {
    const container = document.getElementById('subjectDifficultyChart');
    if (!container) return;
    const ctx = container.getContext('2d');
    const sortedByDifficulty = [...subjectAverages].sort((a, b) => a.avgGpa - b.avgGpa);
    new Chart(ctx, { type: 'bar', data: { labels: sortedByDifficulty.map(s => s.name), datasets: [{ label: 'Average GPA', data: sortedByDifficulty.map(s => s.avgGpa.toFixed(2)), backgroundColor: 'rgba(231, 76, 60, 0.6)', borderColor: 'rgba(231, 76, 60, 1)', borderWidth: 1 }] }, options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false }, title: { display: true, text: 'Subjects ranked from lowest to highest average GPA' } } } });
}