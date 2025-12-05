# app.py - COMPREHENSIVE AI FITNESS PLATFORM
from flask import Flask, request, jsonify, session
from flask_cors import CORS
import base64, cv2, numpy as np
import os, json, random, datetime, math, time
from collections import defaultdict
import statistics

# Mediapipe import
try:
    import mediapipe as mp
except ImportError:
    mp = None
    print("⚠ Install mediapipe: pip install mediapipe")

app = Flask(__name__)
CORS(app)
app.secret_key = 'ai_fitness_super_secret_key_2024'

POSE = None
if mp:
    POSE = mp.solutions.pose.Pose()

# ===== GLOBAL DATA STORES =====
CLIENTS = {}
USER_DATA = defaultdict(lambda: {
    "workout_history": [],
    "diet_preferences": {},
    "emotional_state": [],
    "performance_scores": [],
    "workout_skip_probability": 0.3,
    "last_activity": None,
    "gym_preferences": {}
})

# ===== UTILITY FUNCTIONS =====
def decode_b64_image(b64str):
    if "," in b64str:
        b64str = b64str.split(",", 1)[1]
    img_data = base64.b64decode(b64str)
    arr = np.frombuffer(img_data, dtype=np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)

def angle(a, b, c):
    a, b, c = np.array(a), np.array(b), np.array(c)
    ba = a - b
    bc = c - b
    cosv = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
    cosv = np.clip(cosv, -1, 1)
    return float(np.degrees(np.arccos(cosv)))

def get_points(landmarks, w, h):
    pts = {}
    for i, lm in enumerate(landmarks.landmark):
        pts[i] = (lm.x * w, lm.y * h)
    return pts

def calculate_bmi(weight_kg, height_m):
    if height_m > 0:
        return round(weight_kg / (height_m ** 2), 1)
    return 0

def calculate_bmr(weight_kg, height_cm, age, gender):
    if gender == 'male':
        return 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:
        return 10 * weight_kg + 6.25 * height_cm - 5 * age - 161

def analyze_sentiment(text):
    """Simple sentiment analysis"""
    positive_words = ['good', 'great', 'happy', 'excited', 'motivated', 'strong', 'ready', 'yes', 'yeah']
    negative_words = ['bad', 'sad', 'tired', 'exhausted', 'unmotivated', 'no', 'not', "can't"]
    
    text_lower = text.lower()
    positive_score = sum(1 for word in positive_words if word in text_lower)
    negative_score = sum(1 for word in negative_words if word in text_lower)
    
    if positive_score > negative_score:
        return "positive", 0.7
    elif negative_score > positive_score:
        return "negative", 0.3
    else:
        return "neutral", 0.5

def calculate_performance_score(knee_angle, back_angle, symmetry_score, range_of_motion):
    """Calculate comprehensive performance score"""
    # Normalize scores
    knee_score = max(0, min(100, 100 - abs(knee_angle - 100) * 0.5))
    back_score = max(0, min(100, 100 - back_angle * 2))
    symmetry_score = symmetry_score * 100
    rom_score = range_of_motion * 100
    
    weights = {
        'knee': 0.3,
        'back': 0.25,
        'symmetry': 0.25,
        'rom': 0.2
    }
    
    total_score = (
        knee_score * weights['knee'] +
        back_score * weights['back'] +
        symmetry_score * weights['symmetry'] +
        rom_score * weights['rom']
    )
    
    return int(total_score)

# ===== CORE AI FEATURES =====

# 1. SQUAT COUNTER (Enhanced with performance tracking)
def squat_counter(img, client_id="c_default"):
    global CLIENTS, USER_DATA

    h, w = img.shape[:2]
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    res = POSE.process(rgb)

    if not res.pose_landmarks:
        return {"ok": False, "reason": "no_pose", "message": "No person detected"}

    pts = get_points(res.pose_landmarks, w, h)
    
    # Get visibility scores
    vis = {}
    for i, lm in enumerate(res.pose_landmarks.landmark):
        vis[i] = lm.visibility
    
    # Landmark definitions
    left_leg_landmarks = [23, 25, 27]
    right_leg_landmarks = [24, 26, 28]
    
    left_leg_visible = all(idx in pts and vis.get(idx, 0) > 0.3 for idx in left_leg_landmarks)
    right_leg_visible = all(idx in pts and vis.get(idx, 0) > 0.3 for idx in right_leg_landmarks)
    
    if not left_leg_visible and not right_leg_visible:
        return {"ok": False, "reason": "low_visibility", "message": "Can't see legs clearly"}
    
    # Calculate knee angles
    knee_angles = {}
    symmetry_score = 0.5
    range_of_motion = 0.5
    
    if left_leg_visible:
        left_hip, left_knee, left_ankle = pts[23], pts[25], pts[27]
        knee_angles["left"] = angle(left_hip, left_knee, left_ankle)
    
    if right_leg_visible:
        right_hip, right_knee, right_ankle = pts[24], pts[26], pts[28]
        knee_angles["right"] = angle(right_hip, right_knee, right_ankle)
    
    # Calculate symmetry
    if left_leg_visible and right_leg_visible:
        symmetry_score = 1.0 - abs(knee_angles["left"] - knee_angles["right"]) / 180
        knee_ang = (knee_angles["left"] + knee_angles["right"]) / 2
        which_leg = "both"
    elif left_leg_visible:
        knee_ang = knee_angles["left"]
        which_leg = "left"
        symmetry_score = 0.5
    else:
        knee_ang = knee_angles["right"]
        which_leg = "right"
        symmetry_score = 0.5
    
    # Calculate range of motion
    state = CLIENTS.get(client_id, {"stage": "up", "reps": 0, "min_angle": 180, "max_angle": 0})
    stage, reps, min_angle, max_angle = state["stage"], state["reps"], state["min_angle"], state["max_angle"]
    
    # Update ROM tracking
    if knee_ang < min_angle:
        min_angle = knee_ang
    if knee_ang > max_angle:
        max_angle = knee_ang
    
    range_of_motion = max(0.1, (max_angle - min_angle) / 160)
    
    # Rep counting logic
    if knee_ang < 100 and stage == "up":
        stage = "down"
    
    if knee_ang > 150 and stage == "down":
        stage = "up"
        reps += 1
        
        # Save rep data for performance analysis
        user_data = USER_DATA[client_id]
        rep_data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "knee_angle": round(knee_ang, 1),
            "symmetry": symmetry_score,
            "rom": range_of_motion
        }
        user_data["workout_history"].append(rep_data)
        
        # Limit history
        if len(user_data["workout_history"]) > 100:
            user_data["workout_history"] = user_data["workout_history"][-100:]
    
    # Calculate back angle
    back_angle = 0
    if 11 in pts and 12 in pts and 23 in pts and 24 in pts:
        left_shoulder = pts[11]
        right_shoulder = pts[12]
        left_hip = pts[23]
        right_hip = pts[24]
        shoulder_mid = ((left_shoulder[0] + right_shoulder[0]) / 2, (left_shoulder[1] + right_shoulder[1]) / 2)
        hip_mid = ((left_hip[0] + right_hip[0]) / 2, (left_hip[1] + right_hip[1]) / 2)
        dx = shoulder_mid[0] - hip_mid[0]
        dy = shoulder_mid[1] - hip_mid[1]
        back_angle = abs(np.degrees(np.arctan2(dx, dy)))
    
    # Calculate performance score
    performance_score = calculate_performance_score(
        knee_ang, back_angle, symmetry_score, range_of_motion
    )
    
    # Store state
    CLIENTS[client_id] = {
        "stage": stage, 
        "reps": reps, 
        "min_angle": min_angle, 
        "max_angle": max_angle,
        "last_knee_angle": knee_ang
    }
    
    # Update performance scores
    user_data = USER_DATA[client_id]
    user_data["performance_scores"].append(performance_score)
    if len(user_data["performance_scores"]) > 50:
        user_data["performance_scores"] = user_data["performance_scores"][-50:]
    
    # Feedback generation
    feedback = generate_feedback(knee_ang, back_angle, symmetry_score, range_of_motion)
    
    return {
        "ok": True, 
        "reps": reps, 
        "knee_angle": round(knee_ang, 1), 
        "feedback": feedback,
        "form_quality": "good" if performance_score > 70 else "needs_improvement",
        "form_score": performance_score,
        "stage": stage,
        "which_leg": which_leg,
        "symmetry_score": round(symmetry_score * 100),
        "rom_score": round(range_of_motion * 100),
        "performance_score": performance_score,
        "back_angle": round(back_angle, 1),
        "weekly_trend": calculate_weekly_trend(user_data["performance_scores"])
    }

def generate_feedback(knee_angle, back_angle, symmetry, rom):
    feedback_parts = []
    
    if knee_angle < 80:
        feedback_parts.append("Excellent depth!")
    elif knee_angle < 100:
        feedback_parts.append("Good depth")
    elif knee_angle < 120:
        feedback_parts.append("Go deeper for full ROM")
    else:
        feedback_parts.append("Squat deeper for better results")
    
    if back_angle > 20:
        feedback_parts.append("Keep chest up and back straight")
    
    if symmetry < 0.7:
        feedback_parts.append("Focus on symmetrical movement")
    
    if rom < 0.6:
        feedback_parts.append("Increase your range of motion")
    
    return ". ".join(feedback_parts)

def calculate_weekly_trend(scores):
    if len(scores) < 2:
        return "No trend data yet"
    
    recent = scores[-7:] if len(scores) >= 7 else scores
    older = scores[:-7] if len(scores) >= 14 else scores[:len(scores)//2]
    
    if len(older) == 0:
        return "Establishing baseline"
    
    avg_recent = sum(recent) / len(recent)
    avg_older = sum(older) / len(older)
    
    if avg_recent > avg_older + 5:
        return "↑ Improving steadily"
    elif avg_recent > avg_older:
        return "↗ Slight improvement"
    elif avg_recent < avg_older - 5:
        return "↓ Needs attention"
    else:
        return "→ Stable performance"

# 2. AI DIETICIAN & CALORIE COACH
def get_diet_recommendation(user_data):
    """Generate personalized diet plan based on user metrics"""
    weight = user_data.get("weight", 70)
    height_cm = user_data.get("height", 175)
    age = user_data.get("age", 30)
    gender = user_data.get("gender", "male")
    goal = user_data.get("goal", "maintain")
    activity_level = user_data.get("activity_level", "moderate")
    dietary_pref = user_data.get("dietary_preference", "balanced")
    
    # Calculate BMI
    bmi = calculate_bmi(weight, height_cm/100)
    
    # Calculate BMR and TDEE
    bmr = calculate_bmr(weight, height_cm, age, gender)
    activity_multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9
    }
    tdee = bmr * activity_multipliers.get(activity_level, 1.55)
    
    # Adjust calories based on goal
    goal_adjustments = {
        "loss": -500,
        "maintain": 0,
        "gain": 300
    }
    daily_calories = tdee + goal_adjustments.get(goal, 0)
    
    # Macronutrient distribution
    if goal == "loss":
        macros = {"protein": 0.4, "carbs": 0.3, "fat": 0.3}
    elif goal == "gain":
        macros = {"protein": 0.35, "carbs": 0.45, "fat": 0.2}
    else:
        macros = {"protein": 0.3, "carbs": 0.4, "fat": 0.3}
    
    # Dietary preference adjustments
    meal_plans = {
        "balanced": {
            "breakfast": "Oatmeal with berries and almonds, Greek yogurt",
            "lunch": "Grilled chicken breast, quinoa, mixed vegetables",
            "dinner": "Salmon, sweet potato, broccoli",
            "snacks": "Apple with peanut butter, protein shake"
        },
        "vegetarian": {
            "breakfast": "Tofu scramble with vegetables, whole grain toast",
            "lunch": "Lentil soup, mixed salad with chickpeas",
            "dinner": "Vegetable stir-fry with tofu and brown rice",
            "snacks": "Greek yogurt, handful of nuts"
        },
        "vegan": {
            "breakfast": "Chia seed pudding with fruits, almond milk",
            "lunch": "Chickpea salad, vegetable soup",
            "dinner": "Black bean burgers with sweet potato fries",
            "snacks": "Hummus with vegetables, fruit smoothie"
        },
        "keto": {
            "breakfast": "Avocado and eggs, bacon",
            "lunch": "Chicken salad with olive oil dressing",
            "dinner": "Steak with asparagus and butter",
            "snacks": "Cheese cubes, almonds"
        }
    }
    
    meal_plan = meal_plans.get(dietary_pref, meal_plans["balanced"])
    
    # Generate grocery list
    grocery_list = generate_grocery_list(meal_plan, dietary_pref)
    
    return {
        "bmi": bmi,
        "daily_calories": round(daily_calories),
        "macronutrients": {
            "protein_g": round(daily_calories * macros["protein"] / 4),
            "carbs_g": round(daily_calories * macros["carbs"] / 4),
            "fat_g": round(daily_calories * macros["fat"] / 9)
        },
        "meal_plan": meal_plan,
        "grocery_list": grocery_list,
        "hydration": "2-3 liters of water daily",
        "recommendations": get_diet_recommendations(bmi, goal)
    }

def generate_grocery_list(meal_plan, dietary_pref):
    base_items = [
        "Fresh vegetables (broccoli, spinach, bell peppers)",
        "Fresh fruits (berries, apples, bananas)",
        "Lean protein sources",
        "Whole grains (quinoa, brown rice, oats)",
        "Healthy fats (avocado, olive oil, nuts)",
        "Dairy or alternatives"
    ]
    
    if dietary_pref == "vegetarian":
        base_items.extend(["Tofu", "Lentils", "Chickpeas", "Greek yogurt"])
    elif dietary_pref == "vegan":
        base_items.extend(["Tofu", "Tempeh", "Lentils", "Nutritional yeast"])
    elif dietary_pref == "keto":
        base_items.extend(["Avocados", "Coconut oil", "Cheese", "Eggs"])
    
    return base_items

def get_diet_recommendations(bmi, goal):
    recommendations = []
    
    if bmi < 18.5:
        recommendations.append("Consider increasing calorie intake with nutrient-dense foods")
        recommendations.append("Focus on strength training to build muscle mass")
    elif bmi > 25:
        recommendations.append("Focus on portion control and regular exercise")
        recommendations.append("Increase protein intake to preserve muscle while losing fat")
    else:
        recommendations.append("Maintain current habits for optimal health")
    
    if goal == "loss":
        recommendations.append("Aim for 1-2 lbs weight loss per week")
        recommendations.append("Track food intake for awareness")
    elif goal == "gain":
        recommendations.append("Consume protein within 30 minutes post-workout")
        recommendations.append("Increase calorie intake by 300-500 calories daily")
    
    return recommendations

# 3. AI FITNESS HABIT TRACKER
def analyze_workout_habits(user_data, client_id):
    """Analyze workout patterns and predict skip probability"""
    workout_history = user_data.get("workout_history", [])
    emotional_state = user_data.get("emotional_state", [])
    
    if not workout_history:
        return {
            "skip_probability": 0.5,
            "next_workout_time": "Not enough data",
            "motivation_level": 0.5,
            "recommendations": ["Start tracking your workouts!"]
        }
    
    # Calculate consistency
    workouts_per_week = len([w for w in workout_history 
                           if datetime.datetime.fromisoformat(w["timestamp"]).date() > 
                           (datetime.datetime.now().date() - datetime.timedelta(days=7))])
    
    # Analyze time patterns
    workout_times = []
    for workout in workout_history[-10:]:
        dt = datetime.datetime.fromisoformat(workout["timestamp"])
        workout_times.append(dt.hour)
    
    # Most common workout time
    if workout_times:
        common_hour = max(set(workout_times), key=workout_times.count)
    else:
        common_hour = 18  # Default evening
    
    # Calculate skip probability
    base_probability = 0.3
    consistency_factor = min(1.0, workouts_per_week / 5)  # 5 workouts per week is excellent
    
    # Emotional factor
    if emotional_state:
        recent_emotions = emotional_state[-3:]
        avg_sentiment = sum(e[1] for e in recent_emotions) / len(recent_emotions)
        emotional_factor = 1.0 - avg_sentiment  # Lower sentiment = higher skip chance
    else:
        emotional_factor = 0.5
    
    skip_probability = base_probability * (1.0 - consistency_factor * 0.5) + emotional_factor * 0.2
    skip_probability = max(0.1, min(0.9, skip_probability))
    
    # Generate personalized recommendations
    recommendations = []
    if consistency_factor < 0.6:
        recommendations.append(f"Aim for at least {max(3, workouts_per_week + 1)} workouts per week")
    
    if skip_probability > 0.6:
        recommendations.append("Schedule workouts at your peak energy times")
        recommendations.append("Try shorter, more frequent workouts")
    
    # Check for burnout
    if len(workout_history) > 20:
        recent_intensity = [w.get('intensity', 0.5) for w in workout_history[-5:]]
        avg_intensity = sum(recent_intensity) / len(recent_intensity)
        if avg_intensity > 0.8:
            recommendations.append("Consider active recovery or deload week")
    
    # Optimal next workout time
    hour_options = [(common_hour + i) % 24 for i in [0, -2, 2, -4, 4]]
    next_workout_time = f"{hour_options[0]}:00"
    
    return {
        "skip_probability": round(skip_probability * 100),
        "consistency_score": round(consistency_factor * 100),
        "workouts_this_week": workouts_per_week,
        "optimal_workout_time": next_workout_time,
        "motivational_nudge": get_motivational_nudge(skip_probability, consistency_factor),
        "recommendations": recommendations,
        "weekly_trend": "Improving" if consistency_factor > 0.7 else "Needs attention"
    }

def get_motivational_nudge(skip_probability, consistency):
    nudges_high_skip = [
        "Remember your goals! Even 15 minutes is better than nothing.",
        "Your future self will thank you for this workout.",
        "Progress happens one rep at a time. You've got this!",
        "Don't let today's excuses become tomorrow's regrets."
    ]
    
    nudges_consistent = [
        "Amazing consistency! Keep building that momentum.",
        "You're building powerful habits. Stay the course!",
        "Your dedication is inspiring. Keep up the great work!",
        "Consistency beats intensity. You're doing fantastic!"
    ]
    
    if skip_probability > 0.7:
        return random.choice(nudges_high_skip)
    elif consistency > 0.8:
        return random.choice(nudges_consistent)
    else:
        return "Every workout counts. You're making progress!"

# 4. VIRTUAL GYM BUDDY (AI Chat Companion)
class VirtualGymBuddy:
    def __init__(self):
        self.conversation_history = defaultdict(list)
        self.personality_traits = {
            "motivational": 0.8,
            "technical": 0.6,
            "empathetic": 0.7,
            "funny": 0.4
        }
    
    def respond(self, client_id, user_message):
        # Store conversation
        self.conversation_history[client_id].append({
            "role": "user",
            "message": user_message,
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        # Analyze sentiment
        sentiment, score = analyze_sentient(user_message)
        
        # Generate response based on sentiment and conversation history
        if "motivat" in user_message.lower() or "tired" in user_message.lower():
            response = self.get_motivational_response(sentiment)
        elif "form" in user_message.lower() or "technique" in user_message.lower():
            response = self.get_technical_response()
        elif "diet" in user_message.lower() or "food" in user_message.lower():
            response = self.get_diet_response()
        elif "progress" in user_message.lower() or "results" in user_message.lower():
            response = self.get_progress_response()
        else:
            response = self.get_general_response(sentiment)
        
        # Store bot response
        self.conversation_history[client_id].append({
            "role": "bot",
            "message": response,
            "timestamp": datetime.datetime.now().isoformat()
        })
        
        # Limit conversation history
        if len(self.conversation_history[client_id]) > 20:
            self.conversation_history[client_id] = self.conversation_history[client_id][-20:]
        
        return {
            "response": response,
            "sentiment": sentiment,
            "sentiment_score": score,
            "suggested_topics": self.get_suggested_topics(client_id)
        }
    
    def get_motivational_response(self, sentiment):
        if sentiment == "negative":
            responses = [
                "I know it's tough, but remember why you started! Every champion was once a contender who refused to give up.",
                "The only bad workout is the one that didn't happen. Let's do this together!",
                "Your body can stand almost anything. It's your mind you have to convince. You're stronger than you think!",
                "Progress isn't always linear. Some days are hard, but they make the good days even better!"
            ]
        else:
            responses = [
                "That's the spirit! Keep that energy going!",
                "You're unstoppable when you believe in yourself!",
                "The fire inside you is brighter than the fire ahead of you. Keep pushing!",
                "Success is the sum of small efforts, repeated day in and day out. You're doing amazing!"
            ]
        return random.choice(responses)
    
    def get_technical_response(self):
        responses = [
            "Remember to maintain proper form: chest up, back straight, knees tracking over toes.",
            "Focus on mind-muscle connection. Feel the contraction in every rep.",
            "Control the negative (eccentric) portion of each movement for better muscle growth.",
            "Proper breathing is key: exhale on exertion, inhale on the return."
        ]
        return random.choice(responses)
    
    def get_diet_response(self):
        responses = [
            "Nutrition is 80% of the battle. Focus on protein intake and stay hydrated!",
            "Remember: you can't out-train a bad diet. Whole foods are your best friend.",
            "Meal timing matters, but consistency matters more. Find what works for you!",
            "Hydration affects performance. Aim for 2-3 liters of water daily."
        ]
        return random.choice(responses)
    
    def get_progress_response(self):
        responses = [
            "Progress takes time. Trust the process and stay consistent!",
            "Measure progress in multiple ways: strength, endurance, and how you feel.",
            "Plateaus are normal. Try changing your routine or increasing intensity.",
            "Recovery is part of progress. Make sure you're getting enough sleep!"
        ]
        return random.choice(responses)
    
    def get_general_response(self, sentiment):
        responses = {
            "positive": [
                "Great to hear! How can I help you achieve your fitness goals today?",
                "Awesome energy! What's on your fitness agenda?",
                "Love the positivity! Let's make today count!"
            ],
            "negative": [
                "I'm here for you. What's challenging you right now?",
                "Tough days happen. Let's work through this together.",
                "Remember, every fitness journey has ups and downs. You're not alone!"
            ],
            "neutral": [
                "How's your fitness journey going?",
                "What fitness goals are you working on today?",
                "Ready to crush some goals together?"
            ]
        }
        return random.choice(responses.get(sentiment, responses["neutral"]))
    
    def get_suggested_topics(self, client_id):
        topics = ["Workout form tips", "Nutrition advice", "Motivation boost", "Progress tracking", "Recovery strategies"]
        return random.sample(topics, 3)

# Initialize gym buddy
gym_buddy = VirtualGymBuddy()

# 5. GYM RECOMMENDER & PLANNER
def recommend_gyms(location, preferences, client_id):
    """Recommend gyms based on location and preferences"""
    # Mock data - in production, integrate with Google Places API or similar
    gym_database = [
        {
            "name": "Fitness First Premium",
            "address": "123 Fitness St, " + location,
            "rating": 4.8,
            "price_range": "$$$",
            "features": ["24/7 access", "Pool", "Sauna", "Group classes", "Personal trainers"],
            "distance": "0.8 miles",
            "specialties": ["Strength training", "Cardio", "Yoga"],
            "membership_fee": "$99/month"
        },
        {
            "name": "Anytime Fitness",
            "address": "456 Workout Ave, " + location,
            "rating": 4.5,
            "price_range": "$$",
            "features": ["24/7 access", "Basic equipment", "Virtual classes"],
            "distance": "1.2 miles",
            "specialties": ["Convenience", "Basic fitness"],
            "membership_fee": "$49/month"
        },
        {
            "name": "CrossFit Box",
            "address": "789 Intensity Rd, " + location,
            "rating": 4.9,
            "price_range": "$$$$",
            "features": ["CrossFit classes", "Open gym", "Community events"],
            "distance": "2.1 miles",
            "specialties": ["CrossFit", "High-intensity training"],
            "membership_fee": "$150/month"
        },
        {
            "name": "Planet Fitness",
            "address": "101 Beginner Blvd, " + location,
            "rating": 4.2,
            "price_range": "$",
            "features": ["Judgement free zone", "Massage chairs", "Tanning"],
            "distance": "0.5 miles",
            "specialties": ["Beginner friendly", "Cardio"],
            "membership_fee": "$10/month"
        },
        {
            "name": "Equinox Luxury",
            "address": "202 Luxury Ln, " + location,
            "rating": 4.7,
            "price_range": "$$$$$",
            "features": ["Luxury amenities", "Spa", "Restaurant", "Pool", "Basketball court"],
            "distance": "3.0 miles",
            "specialties": ["Luxury fitness", "Holistic wellness"],
            "membership_fee": "$250/month"
        }
    ]
    
    # Filter based on preferences
    filtered_gyms = gym_database
    
    if preferences.get("budget"):
        budget_map = {"$": 1, "$$": 2, "$$$": 3, "$$$$": 4, "$$$$$": 5}
        user_budget = preferences.get("budget", 3)
        filtered_gyms = [g for g in filtered_gyms if budget_map.get(g["price_range"], 3) <= user_budget]
    
    if preferences.get("features"):
        desired_features = preferences["features"]
        filtered_gyms = [g for g in filtered_gyms if any(feat in g["features"] for feat in desired_features)]
    
    if preferences.get("specialties"):
        desired_specialties = preferences["specialties"]
        filtered_gyms = [g for g in filtered_gyms if any(spec in g["specialties"] for spec in desired_specialties)]
    
    # Sort by rating and distance
    filtered_gyms.sort(key=lambda x: (x["rating"], -float(x["distance"].split()[0])), reverse=True)
    
    # Get user history for personalized recommendations
    user_data = USER_DATA[client_id]
    workout_history = user_data.get("workout_history", [])
    
    if workout_history:
        # Analyze workout patterns for better recommendations
        intensity_levels = [w.get('intensity', 0.5) for w in workout_history[-10:]]
        avg_intensity = sum(intensity_levels) / len(intensity_levels) if intensity_levels else 0.5
        
        if avg_intensity > 0.7:
            # High intensity preference
            filtered_gyms = [g for g in filtered_gyms if "High-intensity" in g["specialties"] or "CrossFit" in g["name"]]
        elif avg_intensity < 0.3:
            # Low intensity preference
            filtered_gyms = [g for g in filtered_gyms if "Beginner" in g["specialties"] or "Yoga" in g["specialties"]]
    
    # Generate workout plan based on selected gym
    workout_plan = generate_workout_plan(filtered_gyms[0] if filtered_gyms else gym_database[0], preferences)
    
    return {
        "recommended_gyms": filtered_gyms[:5],
        "workout_plan": workout_plan,
        "comparison_metrics": {
            "total_gyms_analyzed": len(gym_database),
            "best_value": min(filtered_gyms, key=lambda x: x.get("price_score", 3))["name"] if filtered_gyms else "N/A",
            "closest": min(gym_database, key=lambda x: float(x["distance"].split()[0]))["name"]
        }
    }

def generate_workout_plan(gym, preferences):
    """Generate personalized workout plan based on gym features"""
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    
    if "CrossFit" in gym["name"] or "High-intensity" in gym["specialties"]:
        plan = {
            "Monday": "Strength: Squats, Bench Press, Rows",
            "Tuesday": "Metcon: AMRAP Workout",
            "Wednesday": "Active Recovery: Light cardio, Mobility",
            "Thursday": "Strength: Deadlifts, Overhead Press",
            "Friday": "Metcon: EMOM Workout",
            "Saturday": "Skill work: Gymnastics, Olympic lifts"
        }
    elif "Pool" in gym["features"]:
        plan = {
            "Monday": "Strength training: Full body",
            "Tuesday": "Swimming: Endurance laps",
            "Wednesday": "Strength training: Upper body",
            "Thursday": "Swimming: Interval training",
            "Friday": "Strength training: Lower body",
            "Saturday": "Swimming: Technique work"
        }
    else:
        plan = {
            "Monday": "Push: Chest, Shoulders, Triceps",
            "Tuesday": "Pull: Back, Biceps",
            "Wednesday": "Legs: Quads, Hamstrings, Calves",
            "Thursday": "Cardio: 30 minutes HIIT",
            "Friday": "Full body strength",
            "Saturday": "Active recovery: Mobility, Light cardio"
        }
    
    return {
        "weekly_schedule": plan,
        "focus_areas": gym["specialties"],
        "recommended_classes": random.sample(["Yoga", "Spin", "Zumba", "Bootcamp", "Pilates"], 3),
        "progress_tracking": "Track: Strength gains, Endurance improvement, Consistency"
    }

# ===== FLASK ROUTES =====
@app.route("/")
def home():
    with open('index.html', 'r', encoding='utf-8') as f:
        return f.read()

@app.route('/styles.css')
def serve_css():
    with open('styles.css', 'r', encoding='utf-8') as f:
        return f.read(), 200, {'Content-Type': 'text/css'}

@app.route('/script.js')
def serve_js():
    with open('script.js', 'r', encoding='utf-8') as f:
        return f.read(), 200, {'Content-Type': 'application/javascript'}
# ===== API ROUTES =====

# 1. Squat Counter API
@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)

    if "image" not in data:
        return jsonify({"ok": False, "reason": "no_image"}), 400

    try:
        img = decode_b64_image(data["image"])
    except:
        return jsonify({"ok": False, "reason": "bad_image"}), 400

    cid = data.get("client_id", "default")
    result = squat_counter(img, cid)
    return jsonify(result)

# 2. Diet Recommendation API
@app.route("/api/diet_recommendation", methods=["POST"])
def diet_recommendation():
    data = request.get_json()
    client_id = data.get("client_id", "default")
    
    # Store user preferences
    USER_DATA[client_id]["diet_preferences"] = {
        "weight": data.get("weight", 70),
        "height": data.get("height", 175),
        "age": data.get("age", 30),
        "gender": data.get("gender", "male"),
        "goal": data.get("goal", "maintain"),
        "dietary_preference": data.get("dietary_preference", "balanced"),
        "activity_level": data.get("activity_level", "moderate")
    }
    
    recommendation = get_diet_recommendation(USER_DATA[client_id]["diet_preferences"])
    return jsonify(recommendation)

# 3. Habit Tracker API
@app.route("/api/habit_analysis", methods=["POST"])
def habit_analysis():
    data = request.get_json()
    client_id = data.get("client_id", "default")
    
    # Log workout if provided
    if data.get("workout_data"):
        workout_data = {
            "timestamp": datetime.datetime.now().isoformat(),
            "type": data["workout_data"].get("type", "squat"),
            "duration": data["workout_data"].get("duration", 30),
            "intensity": data["workout_data"].get("intensity", 3),
            "notes": data["workout_data"].get("notes", ""),
            "reps": data["workout_data"].get("reps", 0),
            "score": data["workout_data"].get("score", 0)
        }
        USER_DATA[client_id]["workout_history"].append(workout_data)
    
    # Analyze habits
    analysis = analyze_workout_habits(USER_DATA[client_id], client_id)
    return jsonify(analysis)

# 4. Gym Buddy Chat API
@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    client_id = data.get("client_id", "default")
    message = data.get("message", "")
    
    # Store emotional state if provided
    if data.get("sentiment"):
        USER_DATA[client_id]["emotional_state"].append((
            data["sentiment"],
            data.get("sentiment_score", 0.5),
            datetime.datetime.now().isoformat()
        ))
    
    # Get response from gym buddy
    response = gym_buddy.respond(client_id, message)
    return jsonify(response)

# 5. Performance Analysis API
@app.route("/api/performance_analysis", methods=["POST"])
def performance_analysis():
    data = request.get_json()
    client_id = data.get("client_id", "default")
    
    user_data = USER_DATA[client_id]
    performance_scores = user_data.get("performance_scores", [])
    
    if not performance_scores:
        return jsonify({
            "overall_score": 0,
            "weekly_trend": "No data",
            "average_score": 0,
            "best_score": 0,
            "improvement": 0,
            "recommendations": ["Start tracking your workouts!"]
        })
    
    recent_scores = performance_scores[-7:] if len(performance_scores) >= 7 else performance_scores
    older_scores = performance_scores[:-7] if len(performance_scores) >= 14 else performance_scores[:len(performance_scores)//2]
    
    avg_recent = sum(recent_scores) / len(recent_scores) if recent_scores else 0
    avg_older = sum(older_scores) / len(older_scores) if older_scores else 0
    
    improvement = round(((avg_recent - avg_older) / avg_older * 100) if avg_older > 0 else 0, 1)
    
    recommendations = []
    if avg_recent < 60:
        recommendations.append("Focus on form fundamentals before increasing intensity")
    elif avg_recent > 85:
        recommendations.append("Great progress! Consider increasing workout difficulty")
    
    if len(recent_scores) < 3:
        recommendations.append("Track more workouts for better analysis")
    
    return jsonify({
        "overall_score": round(avg_recent),
        "weekly_trend": "↑ Improving" if improvement > 0 else "↓ Declining" if improvement < 0 else "→ Stable",
        "average_score": round(avg_recent),
        "best_score": max(performance_scores) if performance_scores else 0,
        "improvement": improvement,
        "total_sessions": len(performance_scores),
        "recommendations": recommendations,
        "score_history": performance_scores[-10:]  # Last 10 scores
    })

# 6. Gym Recommendation API
@app.route("/api/gym_recommendations", methods=["POST"])
def gym_recommendations():
    data = request.get_json()
    client_id = data.get("client_id", "default")
    
    # Store gym preferences
    USER_DATA[client_id]["gym_preferences"] = {
        "location": data.get("location", "New York"),
        "budget": data.get("budget", 3),
        "features": data.get("features", ["24/7", "pool"]),
        "specialties": data.get("specialties", [])
    }
    
    recommendations = recommend_gyms(
        data.get("location", "New York"),
        USER_DATA[client_id]["gym_preferences"],
        client_id
    )
    
    return jsonify(recommendations)

# 7. User Dashboard API
@app.route("/api/dashboard_data", methods=["POST"])
def dashboard_data():
    data = request.get_json()
    client_id = data.get("client_id", "default")
    
    user_data = USER_DATA[client_id]
    
    # Calculate weekly stats
    weekly_workouts = 0
    weekly_calories = 0
    
    for workout in user_data.get("workout_history", []):
        workout_date = datetime.datetime.fromisoformat(workout["timestamp"]).date()
        days_ago = (datetime.datetime.now().date() - workout_date).days
        
        if days_ago <= 7:
            weekly_workouts += 1
            # Estimate calories burned (MET value * duration in hours * weight in kg)
            if workout["type"] == "squat":
                calories = 5 * (workout["duration"] / 60) * 70  # Assuming 70kg weight
                weekly_calories += calories
    
    # Calculate consistency
    if len(user_data["workout_history"]) > 0:
        dates = set(datetime.datetime.fromisoformat(w["timestamp"]).date() 
                   for w in user_data["workout_history"])
        consistency = min(100, len(dates) * 100 / 30)  # Percentage of days with workouts
    else:
        consistency = 0
    
    # Get latest performance trend
    performance_scores = user_data.get("performance_scores", [])
    if len(performance_scores) >= 2:
        trend = "↑ Improving" if performance_scores[-1] > performance_scores[-2] else "↓ Declining"
    else:
        trend = "→ Starting"
    
    return jsonify({
        "weekly_workouts": weekly_workouts,
        "weekly_calories": round(weekly_calories),
        "consistency_score": round(consistency),
        "performance_trend": trend,
        "current_streak": calculate_streak(user_data["workout_history"]),
        "next_recommended_workout": "Lower Body Strength"
    })

def calculate_streak(workout_history):
    if not workout_history:
        return 0
    
    # Sort by date
    dates = sorted(set(datetime.datetime.fromisoformat(w["timestamp"]).date() 
                      for w in workout_history), reverse=True)
    
    streak = 0
    current_date = datetime.datetime.now().date()
    
    for i, workout_date in enumerate(dates):
        if i == 0:
            # Check if latest workout was today or yesterday
            if (current_date - workout_date).days <= 1:
                streak += 1
            else:
                break
        else:
            # Check if consecutive days
            prev_date = dates[i-1]
            if (prev_date - workout_date).days == 1:
                streak += 1
            else:
                break
    
    return streak

if __name__ == "__main__":
    print("\n🚀 AI Fitness Platform running at: http://127.0.0.1:5000")
    print("📱 Open your browser and go to: http://localhost:5000")
    print("\n✨ Features Available:")
    print("  1. AI Squat Counter with Performance Analysis")
    print("  2. AI Dietician & Calorie Coach")
    print("  3. AI Fitness Habit Tracker")
    print("  4. Virtual Gym Buddy (AI Chat Companion)")
    print("  5. Pose-to-Performance Analyzer")
    print("  6. Gym Recommender & Planner")
    print("  7. Interactive Dashboard")
    app.run(host="0.0.0.0", port=5000, debug=True)