// script.js - COMPREHENSIVE AI FITNESS PLATFORM
// ===== DOM ELEMENTS =====
const video = document.getElementById('video');
const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');
const startCameraBtn = document.getElementById('startCamera');
const toggleCountingBtn = document.getElementById('toggleCounting');
const saveSessionBtn = document.getElementById('saveSession');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const loading = document.getElementById('loading');

// Display elements
const repsDisplay = document.getElementById('reps');
const kneeDisplay = document.getElementById('kneeAngle');
const feedbackDisplay = document.getElementById('feedback');
const performanceScoreDisplay = document.getElementById('performanceScore');
const symmetryScoreDisplay = document.getElementById('symmetryScore');
const romScoreDisplay = document.getElementById('romScore');
const stageDisplay = document.getElementById('stage');
const backAngleDisplay = document.getElementById('backAngle');

// State management
let streaming = false;
let counting = false;
let pollingInterval = null;
let currentStream = null;
const clientId = 'client_' + Math.random().toString(36).substr(2, 9);
let sessionData = {
    startTime: null,
    reps: 0,
    performanceScores: [],
    formData: []
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    initApplication();
    setupEventListeners();
    loadUserPreferences();
    updateDashboard();
});

function initApplication() {
    updateStatus('System Ready', true);
    checkBrowserSupport();
    setupNavigation();
    initializeCharts();
    updateWorkoutCalendar();
    
    // Initialize button selectors
    setupButtonSelectors();
    setupIntensitySelectors();
}

function setupEventListeners() {
    setupButtonSelectors();
    setupIntensitySelectors();
    // Camera controls
    startCameraBtn.addEventListener('click', startCamera);
    toggleCountingBtn.addEventListener('click', toggleCounting);
    saveSessionBtn.addEventListener('click', saveSession);
    
    // Diet coach
    document.getElementById('generateDietPlan').addEventListener('click', generateDietPlan);
    
    // Habit tracker
    document.getElementById('logWorkoutBtn').addEventListener('click', logWorkout);
    
    // Gym buddy
    document.getElementById('sendMessage').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    // Quick questions
    document.querySelectorAll('.quick-question').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('chatInput').value = btn.dataset.question;
            sendMessage();
        });
    });
    
    // Gym planner
    document.getElementById('findGymsBtn').addEventListener('click', findGyms);
    document.getElementById('generateWorkout').addEventListener('click', generateWorkout);
    
    // Modal
    document.querySelector('.close-modal').addEventListener('click', () => {
        document.getElementById('sessionModal').classList.remove('active');
    });
    
    // Tab switching
    document.querySelectorAll('[data-tab]').forEach(element => {
        element.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = element.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Quick actions
    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            switchTab(tabName);
        });
    });
}
// ===== BUTTON SELECTOR FUNCTIONS =====
function setupButtonSelectors() {
    // Goal buttons in diet coach
    document.querySelectorAll('.goal-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all goal buttons
            document.querySelectorAll('.goal-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
        });
    });
    
    // Diet preference buttons in diet coach
    document.querySelectorAll('.diet-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all diet buttons
            document.querySelectorAll('.diet-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
        });
    });
}

function setupIntensitySelectors() {
    // Intensity buttons in habit tracker
    document.querySelectorAll('.intensity-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove active class from all intensity buttons
            document.querySelectorAll('.intensity-btn').forEach(b => b.classList.remove('active'));
            // Add active class to clicked button
            this.classList.add('active');
        });
    });
}

// Update the logWorkout function to get intensity properly
function logWorkout(customData = null) {
    let workoutData;
    
    if (customData) {
        workoutData = customData;
    } else {
        const type = document.getElementById('workoutType').value;
        const duration = parseInt(document.getElementById('workoutDuration').value);
        const intensityBtn = document.querySelector('.intensity-btn.active');
        const intensity = intensityBtn ? parseInt(intensityBtn.dataset.intensity) : 3;
        const notes = document.getElementById('workoutNotes').value;
        
        workoutData = {
            type: type,
            duration: duration,
            intensity: intensity,
            notes: notes,
            reps: 0,
            score: 0
        };
    }
    
    // ... rest of the function remains the same
}
// ===== NAVIGATION =====
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    const tabContents = document.querySelectorAll('.tab-content');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            link.classList.add('active');
            
            // Hide all tab contents
            tabContents.forEach(tab => tab.classList.remove('active'));
            
            // Show selected tab
            const tabId = link.getAttribute('href').substring(1);
            document.getElementById(tabId).classList.add('active');
            
            // Update URL hash
            window.location.hash = tabId;
        });
    });
    
    // Check for hash on load
    if (window.location.hash) {
        const tabId = window.location.hash.substring(1);
        const tabLink = document.querySelector(`.nav-link[href="#${tabId}"]`);
        if (tabLink) {
            tabLink.click();
        }
    }
}

function switchTab(tabName) {
    const tabLink = document.querySelector(`.nav-link[href="#${tabName}"]`);
    if (tabLink) {
        tabLink.click();
    }
}

// ===== DASHBOARD =====
function updateDashboard() {
    fetch('/api/dashboard_data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId })
    })
    .then(response => response.json())
    .then(data => {
        document.getElementById('weeklyWorkouts').textContent = data.weekly_workouts;
        document.getElementById('weeklyCalories').textContent = data.weekly_calories;
        document.getElementById('consistencyScore').textContent = data.consistency_score + '%';
        document.getElementById('performanceTrend').textContent = data.performance_trend;
        
        // Update streak
        const streakElement = document.getElementById('workoutStreak');
        if (streakElement) streakElement.textContent = data.current_streak + ' days';
        
        // Update weekly chart
        updateWeeklyChart(data);
    })
    .catch(error => console.error('Dashboard update error:', error));
}

function updateWeeklyChart(data) {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx) return;
    
    const chart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Performance',
                data: [65, 75, 80, 85, 78, 82, 88],
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0, 212, 255, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#a0a0c0' }
                },
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#a0a0c0' }
                }
            }
        }
    });
}

// ===== SQUAT COUNTER =====
async function startCamera() {
    if (streaming) {
        stopCamera();
        return;
    }

    try {
        loading.classList.add('active');
        updateStatus('Accessing camera...', false);
        startCameraBtn.disabled = true;
        
        const constraints = {
            video: {
                width: { ideal: 640 },
                height: { ideal: 480 },
                facingMode: 'user'
            },
            audio: false
        };

        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (!currentStream) {
            throw new Error('Could not access camera');
        }

        video.srcObject = currentStream;
        video.classList.remove('offline');
        
        await new Promise((resolve) => {
            if (video.readyState >= 3) {
                resolve();
            } else {
                video.onloadedmetadata = resolve;
                video.onloadeddata = resolve;
                setTimeout(resolve, 500);
            }
        });

        try {
            await video.play();
        } catch (playErr) {
            video.muted = true;
            video.play();
        }

        streaming = true;
        updateStatus('Camera active - Ready for counting', true);
        
        startCameraBtn.innerHTML = '<i class="fas fa-video-slash"></i> Stop Camera';
        startCameraBtn.disabled = false;
        toggleCountingBtn.disabled = false;
        saveSessionBtn.disabled = false;
        
        showToast('Camera started! Stand in frame for analysis.', 'success');
        
    } catch (error) {
        console.error('Camera error:', error);
        updateStatus('Camera access failed', false);
        
        let errorMessage = 'Failed to access camera. ';
        
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            errorMessage = 'Camera permission denied. Please allow camera access.';
        } else if (error.name === 'NotFoundError') {
            errorMessage = 'No camera found. Please check your camera connection.';
        } else if (error.name === 'NotReadableError') {
            errorMessage = 'Camera is in use by another app.';
        }
        
        showToast(errorMessage, 'error');
        startCameraBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
        startCameraBtn.disabled = false;
    } finally {
        loading.classList.remove('active');
    }
}

function stopCamera() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    
    streaming = false;
    counting = false;
    video.srcObject = null;
    video.classList.add('offline');
    
    if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
    }
    
    updateStatus('Camera stopped', false);
    startCameraBtn.innerHTML = '<i class="fas fa-video"></i> Start Camera';
    toggleCountingBtn.innerHTML = '<i class="fas fa-play"></i> Start Counting';
    toggleCountingBtn.disabled = true;
    saveSessionBtn.disabled = true;
    
    // Reset displays
    repsDisplay.textContent = '0';
    kneeDisplay.textContent = '-';
    feedbackDisplay.innerHTML = '<p>Stand in frame to begin analysis...</p>';
    performanceScoreDisplay.textContent = '-';
    
    showToast('Camera stopped', 'info');
}

function toggleCounting() {
    if (!streaming) {
        showToast('Please start camera first', 'warning');
        return;
    }
    
    counting = !counting;
    
    if (counting) {
        // Start session
        sessionData = {
            startTime: new Date(),
            reps: 0,
            performanceScores: [],
            formData: []
        };
        
        // Start counting
        pollingInterval = setInterval(processFrame, 500);
        toggleCountingBtn.innerHTML = '<i class="fas fa-pause"></i> Stop Counting';
        toggleCountingBtn.classList.remove('btn-secondary');
        toggleCountingBtn.classList.add('btn-primary');
        updateStatus('Counting reps...', true);
        showToast('AI analysis started! Perform squats in frame.', 'success');
    } else {
        // Stop counting
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
        toggleCountingBtn.innerHTML = '<i class="fas fa-play"></i> Start Counting';
        toggleCountingBtn.classList.remove('btn-primary');
        toggleCountingBtn.classList.add('btn-secondary');
        updateStatus('Camera active - Ready for counting', true);
        showToast('Analysis stopped', 'info');
    }
}

function captureFrame() {
    if (!streaming || !video.videoWidth) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();
    
    return canvas.toDataURL('image/jpeg', 0.8);
}

async function processFrame() {
    if (!streaming || !counting) return;
    
    const frame = captureFrame();
    if (!frame) return;
    
    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                image: frame, 
                client_id: clientId,
                timestamp: Date.now()
            })
        });
        
        const data = await response.json();
        
        if (data.ok) {
            updateSquatDisplay(data);
            updateSessionData(data);
            
            // Live overlay updates
            document.getElementById('liveKneeAngle').textContent = data.knee_angle + '°';
            document.getElementById('liveSymmetry').textContent = data.symmetry_score + '%';
            
        } else {
            handleSquatError(data);
        }
        
    } catch (error) {
        console.error('Processing error:', error);
        feedbackDisplay.innerHTML = '<p>Connection error - try refreshing</p>';
    }
}

function updateSquatDisplay(data) {
    // Update main displays
    repsDisplay.textContent = data.reps || 0;
    kneeDisplay.textContent = data.knee_angle + '°';
    stageDisplay.textContent = data.stage === 'down' ? 'DOWN' : 'UP';
    stageDisplay.style.color = data.stage === 'down' ? 'var(--warning)' : 'var(--success)';
    
    if (data.back_angle) {
        backAngleDisplay.textContent = data.back_angle + '°';
    }
    
    // Update scores
    performanceScoreDisplay.textContent = data.performance_score || data.form_score;
    symmetryScoreDisplay.textContent = data.symmetry_score + '%';
    romScoreDisplay.textContent = data.rom_score + '%';
    
    // Update feedback
    feedbackDisplay.innerHTML = `<p>${data.feedback}</p>`;
    
    // Update color based on form quality
    const formScore = parseInt(data.performance_score || data.form_score);
    if (formScore >= 85) {
        performanceScoreDisplay.style.color = 'var(--success)';
    } else if (formScore >= 70) {
        performanceScoreDisplay.style.color = 'var(--primary)';
    } else if (formScore >= 50) {
        performanceScoreDisplay.style.color = 'var(--warning)';
    } else {
        performanceScoreDisplay.style.color = 'var(--danger)';
    }
    
    // Update progress bars
    updateProgressBars(data);
}

function updateSessionData(data) {
    if (data.reps > sessionData.reps) {
        // New rep completed
        sessionData.reps = data.reps;
        sessionData.performanceScores.push(data.performance_score || data.form_score);
        sessionData.formData.push({
            timestamp: new Date().toISOString(),
            knee_angle: data.knee_angle,
            symmetry: data.symmetry_score,
            rom: data.rom_score,
            back_angle: data.back_angle
        });
        
        // Limit stored data
        if (sessionData.performanceScores.length > 50) {
            sessionData.performanceScores.shift();
            sessionData.formData.shift();
        }
    }
}

function handleSquatError(data) {
    let errorMessage = 'Adjust position';
    if (data.reason === 'no_pose') {
        errorMessage = 'No person detected - stand in frame';
    } else if (data.reason === 'low_visibility') {
        errorMessage = data.message || 'Can\'t see knees clearly';
    }
    
    feedbackDisplay.innerHTML = `<p style="color: var(--danger)">${errorMessage}</p>`;
}

function saveSession() {
    if (sessionData.reps === 0) {
        showToast('No workout data to save', 'warning');
        return;
    }
    
    const avgScore = sessionData.performanceScores.length > 0 ?
        Math.round(sessionData.performanceScores.reduce((a, b) => a + b) / sessionData.performanceScores.length) : 0;
    
    // Log workout
    logWorkout({
        type: 'squat',
        duration: Math.round((new Date() - sessionData.startTime) / 60000),
        reps: sessionData.reps,
        score: avgScore,
        notes: `Squat session with ${sessionData.reps} reps`
    });
    
    // Show session summary
    showSessionSummary(avgScore);
    
    showToast(`Session saved! ${sessionData.reps} reps completed.`, 'success');
}

function showSessionSummary(avgScore) {
    const modal = document.getElementById('sessionModal');
    const summaryDiv = document.getElementById('sessionSummary');
    
    summaryDiv.innerHTML = `
        <div class="session-stats">
            <div class="stat">
                <span>Total Reps:</span>
                <strong>${sessionData.reps}</strong>
            </div>
            <div class="stat">
                <span>Average Score:</span>
                <strong>${avgScore}%</strong>
            </div>
            <div class="stat">
                <span>Duration:</span>
                <strong>${Math.round((new Date() - sessionData.startTime) / 60000)} min</strong>
            </div>
            <div class="stat">
                <span>Best Rep:</span>
                <strong>${Math.max(...sessionData.performanceScores)}%</strong>
            </div>
        </div>
        <div class="session-insights">
            <h4>AI Insights:</h4>
            <p>${getSessionInsights(avgScore)}</p>
        </div>
    `;
    
    modal.classList.add('active');
}

function getSessionInsights(score) {
    if (score >= 90) return "Excellent session! Your form was near perfect. Keep up the great work!";
    if (score >= 80) return "Great session! Minor improvements in depth consistency could boost your score.";
    if (score >= 70) return "Good effort! Focus on maintaining back alignment throughout the movement.";
    return "Solid start! Consider working on your range of motion for better results.";
}

// ===== DIET COACH =====
function generateDietPlan() {
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const age = parseInt(document.getElementById('age').value);
    const gender = document.getElementById('gender').value;
    const activityLevel = parseInt(document.getElementById('activityLevel').value);
    
    // Get selected goal
    const goalBtn = document.querySelector('.goal-btn.active');
    const goal = goalBtn ? goalBtn.dataset.goal : 'maintain';
    
    // Get selected diet
    const dietBtn = document.querySelector('.diet-btn.active');
    const dietaryPreference = dietBtn ? dietBtn.dataset.diet : 'balanced';
    
    // Map activity level
    const activityMap = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
    
    fetch('/api/diet_recommendation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: clientId,
            weight: weight,
            height: height,
            age: age,
            gender: gender,
            goal: goal,
            dietary_preference: dietaryPreference,
            activity_level: activityMap[activityLevel - 1] || 'moderate'
        })
    })
    .then(response => response.json())
    .then(data => {
        updateDietDisplay(data);
        showToast('Diet plan generated successfully!', 'success');
    })
    .catch(error => {
        console.error('Diet plan error:', error);
        showToast('Failed to generate diet plan', 'error');
    });
}

function updateDietDisplay(data) {
    // Update nutrition overview
    document.getElementById('dailyCalories').textContent = data.daily_calories;
    document.getElementById('proteinAmount').textContent = data.macronutrients.protein_g + ' g';
    document.getElementById('carbsAmount').textContent = data.macronutrients.carbs_g + ' g';
    document.getElementById('fatsAmount').textContent = data.macronutrients.fat_g + ' g';
    
    // Update meal plan
    const mealPlanDiv = document.getElementById('mealPlan');
    mealPlanDiv.innerHTML = '';
    
    Object.entries(data.meal_plan).forEach(([meal, description]) => {
        const mealCard = document.createElement('div');
        mealCard.className = 'meal-card';
        mealCard.innerHTML = `
            <div class="meal-time">${meal.charAt(0).toUpperCase() + meal.slice(1)}</div>
            <div class="meal-content">${description}</div>
            <div class="meal-calories">~${getMealCalories(meal, data.daily_calories)} kcal</div>
        `;
        mealPlanDiv.appendChild(mealCard);
    });
    
    // Update grocery list
    const groceryListDiv = document.getElementById('groceryList');
    groceryListDiv.innerHTML = `
        <ul>
            ${data.grocery_list.map(item => `<li><input type="checkbox"> ${item}</li>`).join('')}
        </ul>
        <button class="btn btn-sm btn-secondary" onclick="printGroceryList()">
            <i class="fas fa-print"></i> Print List
        </button>
    `;
    
    // Update calorie chart
    updateCalorieChart(data);
}

function getMealCalories(meal, totalCalories) {
    const distribution = {
        breakfast: 0.25,
        lunch: 0.35,
        dinner: 0.30,
        snacks: 0.10
    };
    return Math.round(totalCalories * (distribution[meal] || 0.25));
}

function updateCalorieChart(data) {
    const ctx = document.getElementById('calorieChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Protein', 'Carbs', 'Fats'],
            datasets: [{
                data: [
                    data.macronutrients.protein_g * 4,
                    data.macronutrients.carbs_g * 4,
                    data.macronutrients.fat_g * 9
                ],
                backgroundColor: [
                    '#00d4ff',
                    '#8a2be2',
                    '#00ff88'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
}

function printGroceryList() {
    const listItems = Array.from(document.querySelectorAll('#groceryList input:not(:checked)'))
        .map(input => input.nextSibling.textContent.trim())
        .join('\n');
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>Grocery List</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #333; }
                    ul { list-style: none; padding: 0; }
                    li { padding: 5px 0; border-bottom: 1px solid #eee; }
                </style>
            </head>
            <body>
                <h1>Grocery List</h1>
                <ul>${listItems.split('\n').map(item => `<li>${item}</li>`).join('')}</ul>
                <p>Generated by AI Gym Assistant on ${new Date().toLocaleDateString()}</p>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.print();
}

// ===== HABIT TRACKER =====
function logWorkout(customData = null) {
    let workoutData;
    
    if (customData) {
        workoutData = customData;
    } else {
        const type = document.getElementById('workoutType').value;
        const duration = parseInt(document.getElementById('workoutDuration').value);
        const intensityBtn = document.querySelector('.intensity-btn.active');
        const intensity = intensityBtn ? parseInt(intensityBtn.dataset.intensity) : 3;
        const notes = document.getElementById('workoutNotes').value;
        
        workoutData = {
            type: type,
            duration: duration,
            intensity: intensity,
            notes: notes,
            reps: 0,
            score: 0
        };
    }
    
    fetch('/api/habit_analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: clientId,
            workout_data: workoutData
        })
    })
    .then(response => response.json())
    .then(data => {
        updateHabitDisplay(data);
        updateWorkoutHistory(workoutData);
        updateDashboard();
        showToast('Workout logged successfully!', 'success');
        
        // Clear form
        if (!customData) {
            document.getElementById('workoutNotes').value = '';
        }
    })
    .catch(error => {
        console.error('Log workout error:', error);
        showToast('Failed to log workout', 'error');
    });
}

function updateHabitDisplay(data) {
    document.getElementById('skipProbability').textContent = data.skip_probability + '%';
    document.getElementById('consistencyScore').textContent = data.consistency_score + '%';
    document.getElementById('optimalTime').textContent = data.optimal_workout_time;
    document.getElementById('weeklyTrend').textContent = data.weekly_trend;
    
    // Update progress bars
    document.getElementById('skipBar').style.width = data.skip_probability + '%';
    document.getElementById('consistencyBar').style.width = data.consistency_score + '%';
    
    // Update motivation nudge
    const nudgeDiv = document.getElementById('motivationNudge');
    nudgeDiv.querySelector('.motivation-text p').textContent = data.motivational_nudge;
    
    // Update trend tip
    document.getElementById('trendTip').textContent = data.recommendations?.[0] || 'Based on your patterns';
    
    // Update skip tip
    if (data.skip_probability > 70) {
        document.getElementById('skipTip').textContent = 'High risk - consider scheduling reminder';
    } else if (data.skip_probability > 40) {
        document.getElementById('skipTip').textContent = 'Moderate risk - stay consistent';
    } else {
        document.getElementById('skipTip').textContent = 'Low risk - great consistency!';
    }
}

function updateWorkoutHistory(workoutData) {
    const historyDiv = document.getElementById('workoutHistory');
    const workoutItem = document.createElement('div');
    workoutItem.className = 'workout-item';
    
    const typeMap = {
        'squat': 'Squat Session',
        'cardio': 'Cardio',
        'strength': 'Strength Training',
        'flexibility': 'Flexibility',
        'hiit': 'HIIT'
    };
    
    workoutItem.innerHTML = `
        <div class="workout-type">${typeMap[workoutData.type] || workoutData.type}</div>
        <div class="workout-details">
            <span>${workoutData.duration} min</span>
            ${workoutData.reps ? `<span>${workoutData.reps} reps</span>` : ''}
            ${workoutData.score ? `<span>${workoutData.score}% score</span>` : ''}
        </div>
        <div class="workout-date">Today</div>
    `;
    
    historyDiv.insertBefore(workoutItem, historyDiv.firstChild);
    
    // Limit history
    if (historyDiv.children.length > 10) {
        historyDiv.removeChild(historyDiv.lastChild);
    }
}

function updateWorkoutCalendar() {
    const calendarGrid = document.getElementById('workoutCalendar');
    if (!calendarGrid) return;
    
    const today = new Date();
    const currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    let calendarHTML = '';
    
    // Add empty cells for days before first of month
    const firstDay = currentDate.getDay();
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day"></div>';
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
        const hasWorkout = Math.random() > 0.7; // Simulate workout days
        const dayClass = hasWorkout ? 'calendar-day workout' : 'calendar-day';
        calendarHTML += `<div class="${dayClass}">${day}</div>`;
    }
    
    calendarGrid.innerHTML = calendarHTML;
}

// ===== GYM BUDDY =====
async function sendMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat(message, 'user');
    input.value = '';
    
    // Get response from AI
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: clientId,
                message: message
            })
        });
        
        const data = await response.json();
        
        // Add bot response to chat
        addMessageToChat(data.response, 'bot');
        
        // Update sentiment display
        updateSentimentDisplay(data);
        
        // Update topic suggestions
        updateTopicSuggestions(data.suggested_topics);
        
    } catch (error) {
        console.error('Chat error:', error);
        addMessageToChat('Sorry, I encountered an error. Please try again.', 'bot');
    }
}

function addMessageToChat(message, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${sender === 'bot' ? '🤖' : '👤'}</div>
        <div class="message-content">
            <p>${message}</p>
            <div class="message-time">${time}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Limit messages
    if (chatMessages.children.length > 50) {
        chatMessages.removeChild(chatMessages.firstChild);
    }
}

function updateSentimentDisplay(data) {
    const fillElement = document.getElementById('sentimentFill');
    const currentState = document.getElementById('currentState');
    const energyLevel = document.getElementById('energyLevel');
    const motivationLevel = document.getElementById('motivationLevel');
    
    if (data.sentiment === 'positive') {
        fillElement.style.width = '80%';
        currentState.textContent = 'Motivated';
        energyLevel.textContent = 'High';
        motivationLevel.textContent = '85%';
    } else if (data.sentiment === 'negative') {
        fillElement.style.width = '20%';
        currentState.textContent = 'Tired';
        energyLevel.textContent = 'Low';
        motivationLevel.textContent = '45%';
    } else {
        fillElement.style.width = '50%';
        currentState.textContent = 'Neutral';
        energyLevel.textContent = 'Medium';
        motivationLevel.textContent = '65%';
    }
}

function updateTopicSuggestions(topics) {
    const container = document.getElementById('topicSuggestions');
    if (!container || !topics) return;
    
    container.innerHTML = topics.map(topic => 
        `<button class="topic-btn" onclick="suggestTopic('${topic}')">${topic}</button>`
    ).join('');
}

function suggestTopic(topic) {
    const questions = {
        'Workout Form Tips': 'What are the most important form tips for squats?',
        'Nutrition Guidance': 'What should I eat before and after workout?',
        'Motivation Boost': 'I need motivation to workout today',
        'Progress Tracking': 'How do I track my fitness progress effectively?'
    };
    
    document.getElementById('chatInput').value = questions[topic] || topic;
    sendMessage();
}

// ===== PERFORMANCE ANALYZER =====
function updatePerformanceData() {
    fetch('/api/performance_analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId })
    })
    .then(response => response.json())
    .then(data => {
        updatePerformanceDisplay(data);
        updatePerformanceChart(data);
    })
    .catch(error => console.error('Performance update error:', error));
}

function updatePerformanceDisplay(data) {
    document.getElementById('overallScore').textContent = data.overall_score;
    document.getElementById('formScore').textContent = data.overall_score;
    document.getElementById('consistencyMetric').textContent = data.average_score;
    document.getElementById('progressMetric').textContent = data.improvement > 0 ? `+${data.improvement}%` : `${data.improvement}%`;
    
    // Update performance circle
    const circle = document.getElementById('performanceCircle');
    const circumference = 502; // 2 * π * 80
    const offset = circumference - (data.overall_score / 100) * circumference;
    circle.style.strokeDashoffset = offset;
    
    // Update metrics
    document.getElementById('symmetryMetric').textContent = '92%';
    document.getElementById('romMetric').textContent = '88%';
    document.getElementById('stabilityMetric').textContent = '85%';
    document.getElementById('repConsistency').textContent = '90%';
    
    // Update weekly report
    document.getElementById('bestDay').textContent = 'Monday (' + (data.overall_score + 7) + '%)';
    document.getElementById('totalWorkouts').textContent = data.total_sessions;
    document.getElementById('avgScore').textContent = data.average_score + '%';
}

function updatePerformanceChart(data) {
    const ctx = document.getElementById('weeklyProgressChart');
    if (!ctx) return;
    
    new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            datasets: [{
                label: 'Performance Score',
                data: [75, 82, 78, data.overall_score || 85],
                backgroundColor: [
                    'rgba(0, 212, 255, 0.6)',
                    'rgba(0, 212, 255, 0.6)',
                    'rgba(0, 212, 255, 0.6)',
                    'rgba(0, 255, 136, 0.6)'
                ],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#a0a0c0' }
                },
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.1)' },
                    ticks: { color: '#a0a0c0' }
                }
            }
        }
    });
}

// ===== GYM PLANNER =====
function findGyms() {
    const location = document.getElementById('location').value;
    const radius = document.getElementById('radius').value;
    const budget = parseInt(document.getElementById('budget').value);
    
    const features = Array.from(document.querySelectorAll('input[name="features"]:checked'))
        .map(input => input.value);
    
    fetch('/api/gym_recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id: clientId,
            location: location,
            radius: radius,
            budget: budget,
            features: features
        })
    })
    .then(response => response.json())
    .then(data => {
        updateGymDisplay(data);
        showToast('Found ' + data.recommended_gyms.length + ' gyms near you', 'success');
    })
    .catch(error => {
        console.error('Gym search error:', error);
        showToast('Failed to search for gyms', 'error');
    });
}

function updateGymDisplay(data) {
    const gymList = document.getElementById('gymList');
    const comparisonTable = document.getElementById('comparisonTable');
    
    // Update gym list
    gymList.innerHTML = data.recommended_gyms.map(gym => `
        <div class="gym-card">
            <div class="gym-header">
                <div class="gym-name">${gym.name}</div>
                <div class="gym-rating">${gym.rating} ★</div>
            </div>
            <div class="gym-details">
                <div class="gym-features">
                    ${gym.features.slice(0, 3).map(feature => 
                        `<span class="feature-tag">${feature}</span>`
                    ).join('')}
                </div>
                <div class="gym-distance">${gym.distance}</div>
            </div>
            <div class="gym-price">${gym.membership_fee}</div>
            <button class="btn btn-sm btn-secondary" onclick="viewGymDetails('${gym.name}')">
                View Details
            </button>
        </div>
    `).join('');
    
    // Update comparison table
    comparisonTable.innerHTML = data.recommended_gyms.map(gym => `
        <tr>
            <td>${gym.name}</td>
            <td>${gym.rating}</td>
            <td>${gym.distance}</td>
            <td>${gym.membership_fee}</td>
            <td>${gym.features.slice(0, 2).join(', ')}</td>
        </tr>
    `).join('');
}

function viewGymDetails(gymName) {
    showToast(`Opening details for ${gymName}...`, 'info');
    // In a real app, this would open a detailed view
}

function generateWorkout() {
    const focusArea = document.getElementById('focusArea').value;
    const duration = document.getElementById('workoutDuration').value;
    const difficulty = document.getElementById('difficulty').value;
    
    const workouts = {
        fullbody: {
            exercises: [
                { name: 'Barbell Squats', sets: '3 × 8-12', rest: '90s' },
                { name: 'Bench Press', sets: '3 × 8-12', rest: '90s' },
                { name: 'Bent Over Rows', sets: '3 × 10-15', rest: '60s' },
                { name: 'Overhead Press', sets: '3 × 10-15', rest: '60s' }
            ]
        },
        lower: {
            exercises: [
                { name: 'Barbell Squats', sets: '4 × 6-10', rest: '120s' },
                { name: 'Romanian Deadlifts', sets: '3 × 8-12', rest: '90s' },
                { name: 'Leg Press', sets: '3 × 12-15', rest: '60s' },
                { name: 'Leg Curls', sets: '3 × 12-15', rest: '60s' }
            ]
        },
        // Add more workout templates...
    };
    
    const workout = workouts[focusArea] || workouts.fullbody;
    const workoutPlan = document.getElementById('generatedWorkout');
    
    workoutPlan.innerHTML = `
        <h4>${focusArea.charAt(0).toUpperCase() + focusArea.slice(1)} Workout (${duration} min)</h4>
        <div class="exercise-list">
            ${workout.exercises.map(ex => `
                <div class="exercise-item">
                    <div class="exercise-name">${ex.name}</div>
                    <div class="exercise-sets">${ex.sets} reps</div>
                    <div class="exercise-rest">Rest: ${ex.rest}</div>
                </div>
            `).join('')}
        </div>
        <div class="workout-tips">
            <h5><i class="fas fa-lightbulb"></i> Pro Tips</h5>
            <ul>
                <li>Warm up for 5-10 minutes before starting</li>
                <li>Focus on form over weight</li>
                <li>Stay hydrated throughout</li>
                <li>Cool down and stretch after</li>
            </ul>
        </div>
    `;
    
    showToast('Workout plan generated!', 'success');
}

// ===== UTILITY FUNCTIONS =====
function updateStatus(message, isActive) {
    statusText.textContent = message;
    statusDot.className = 'status-dot';
    if (isActive) {
        statusDot.classList.add('active');
    }
}

function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    });
    
    // Create new toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    
    toast.innerHTML = `
        <i class="fas fa-${icons[type]}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function checkBrowserSupport() {
    const isSecure = window.location.protocol === 'https:' || 
                    window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
    
    if (!isSecure) {
        updateStatus('⚠️ Please use HTTPS or localhost', false);
        startCameraBtn.disabled = true;
        startCameraBtn.innerHTML = '<i class="fas fa-lock"></i> Use HTTPS/localhost';
        showToast('Please access via http://localhost:5000', 'warning');
        return;
    }
    
    const hasMediaSupport = navigator.mediaDevices && navigator.mediaDevices.getUserMedia;
    
    if (!hasMediaSupport) {
        updateStatus('Browser does not support camera', false);
        startCameraBtn.disabled = true;
        startCameraBtn.innerHTML = '<i class="fas fa-video-slash"></i> Unsupported Browser';
        showToast('Please use Chrome, Firefox, or Edge', 'error');
    }
}

function loadUserPreferences() {
    const savedData = localStorage.getItem(`ai_fitness_${clientId}`);
    if (savedData) {
        try {
            const data = JSON.parse(savedData);
            // Load preferences into forms
            if (data.dietPreferences) {
                document.getElementById('weight').value = data.dietPreferences.weight || 70;
                document.getElementById('height').value = data.dietPreferences.height || 175;
                document.getElementById('age').value = data.dietPreferences.age || 30;
                document.getElementById('gender').value = data.dietPreferences.gender || 'male';
            }
        } catch (e) {
            console.error('Error loading preferences:', e);
        }
    }
}

function saveUserPreferences() {
    const preferences = {
        dietPreferences: {
            weight: document.getElementById('weight').value,
            height: document.getElementById('height').value,
            age: document.getElementById('age').value,
            gender: document.getElementById('gender').value
        }
    };
    
    localStorage.setItem(`ai_fitness_${clientId}`, JSON.stringify(preferences));
}

function updateProgressBars(data) {
    const bars = document.querySelectorAll('.progress-bar .progress');
    if (bars[0]) bars[0].style.width = (data.performance_score || 50) + '%';
    if (bars[1]) bars[1].style.width = (data.symmetry_score || 50) + '%';
    if (bars[2]) bars[2].style.width = (data.rom_score || 50) + '%';
}

function initializeCharts() {
    // Initialize any charts that need to be created on load
    updateDashboard();
    updatePerformanceData();
}

// ===== EVENT HANDLERS =====
document.addEventListener('visibilitychange', () => {
    if (document.hidden && pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
        if (counting) {
            counting = false;
            toggleCountingBtn.innerHTML = '<i class="fas fa-play"></i> Start Counting';
            toggleCountingBtn.classList.remove('btn-primary');
            toggleCountingBtn.classList.add('btn-secondary');
            showToast('Analysis paused (tab not visible)', 'info');
        }
    }
});

window.addEventListener('beforeunload', () => {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
    if (pollingInterval) {
        clearInterval(pollingInterval);
    }
    saveUserPreferences();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Space to toggle counting
    if (e.code === 'Space' && streaming) {
        e.preventDefault();
        toggleCounting();
    }
    // C to toggle camera
    if (e.code === 'KeyC' && !e.ctrlKey) {
        e.preventDefault();
        startCamera();
    }
    // Escape to close modal
    if (e.code === 'Escape') {
        document.getElementById('sessionModal').classList.remove('active');
    }
});

// ===== INITIAL SETUP HELP =====
setTimeout(() => {
    if (!localStorage.getItem('ai_fitness_help_shown')) {
        const helpDiv = document.createElement('div');
        helpDiv.className = 'glass-card';
        helpDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            z-index: 10000;
            max-width: 500px;
            text-align: center;
            animation: slideUp 0.5s ease;
        `;
        helpDiv.innerHTML = `
            <h3 style="margin-bottom: 1rem; color: #00d4ff;">Welcome to AI Gym Assistant! 🏋️‍♂️</h3>
            <p style="margin-bottom: 1.5rem;">Here's how to get started:</p>
            <ol style="text-align: left; margin-bottom: 1.5rem; padding-left: 1.5rem;">
                <li>Start with the <strong>Squat Counter</strong> to analyze your form</li>
                <li>Use <strong>Diet Coach</strong> for personalized nutrition plans</li>
                <li>Track habits with <strong>Habit Tracker</strong> AI</li>
                <li>Chat with your <strong>Virtual Gym Buddy</strong></li>
                <li>Analyze performance with detailed metrics</li>
                <li>Find gyms and plan workouts</li>
            </ol>
            <button onclick="this.parentNode.remove(); localStorage.setItem('ai_fitness_help_shown', 'true')" 
                    class="btn btn-primary">
                Get Started!
            </button>
        `;
        document.body.appendChild(helpDiv);
    }
}, 1000);