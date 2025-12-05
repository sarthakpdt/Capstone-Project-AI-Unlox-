# 🌟 AI Gym Assistant

AI Gym Assistant is a cutting-edge fitness platform that integrates **7 AI modules** to provide real-time workout analysis, personalized diet planning, habit tracking, and motivational support. Using computer vision, natural language processing, and machine learning, it delivers actionable insights to help users reach their fitness goals effectively.

---

## ✨ Key Features

---

### 🏋️ 1. AI Squat Counter with Performance Analysis
- Real-time pose detection using MediaPipe  
- Form feedback with knee angle tracking (optimal: **90°–100°**)  
- Rep counting with automatic stage detection  
- Symmetry scoring for balanced development  
- Range of motion analysis  
- Live camera overlay with metrics display  

---

### 🍎 2. AI Dietician & Calorie Coach
- Personalized meal plans based on BMI and goals  
- Macronutrient calculator (protein, carbs, fats)  
- Supports Balanced, Vegetarian, Vegan, and Keto diets  
- Auto-generated grocery lists  
- Hydration tracking  
- Calorie intake optimization  

---

### 📊 3. AI Fitness Habit Tracker
- Skip-probability prediction using behavioural data  
- Consistency scoring with weekly insights  
- Optimal workout time suggestions  
- Motivational nudges using emotional state  
- Workout calendar with progress visualization  
- Streaks & achievement badges  

---

### 🤖 4. Virtual Gym Buddy (AI Chat Companion)
- Conversational chat-based guidance  
- Sentiment and emotion analysis  
- Personalized motivational messages  
- Technique & posture suggestions  
- Nutritional guidance  
- Celebrates user progress  

---

### 📈 5. Pose-to-Performance Analyzer
- Motion efficiency scoring  
- Weekly performance analytics  
- Detailed form breakdown  
- Personalized improvement suggestions  
- Milestone tracking  
- Trend visualization charts  

---

### 🗺️ 6. Gym Recommender & Planner
- Location-based gym recommendations  
- Filter by features (24/7 access, classes, pool, etc.)  
- Budget-friendly options  
- Personalized weekly workout plan  
- Gym comparison tool  

---

### 🎯 7. Interactive Dashboard
- All fitness insights in one place  
- Quick access to AI modules  
- Weekly statistics & charts  
- AI-powered recommendations  
- Goal tracking & analytics  

---

## 🛠️ Tech Stack

### **Backend**
- Python 3.8+  
- Flask  
- Flask-CORS  
- OpenCV  
- MediaPipe  
- NumPy  

### **Frontend**
- HTML5  
- CSS3  
- JavaScript (ES6+)  
- Chart.js  
- Font Awesome  
- Google Fonts (Inter)  

### **AI / ML**
- MediaPipe Pose  
- Custom NLP sentiment analyzer  
- Behaviour prediction models  
- Recommendation engines  

---

## 🚀 Installation & Setup

### **Prerequisites**
- Python 3.8+  
- Webcam  
- Modern browser (Chrome recommended)

---

### **Step-by-step Installation**

#### 1. Clone the repository
```bash
git clone https://github.com/yourusername/ai-gym-assistant.git
cd ai-gym-assistant
```

#### 2. Create virtual environment
```bash
python -m venv venv
```

**Windows**
```bash
venv\Scripts\activate
```

**macOS/Linux**
```bash
source venv/bin/activate
```

#### 3. Install dependencies
```bash
pip install flask flask-cors opencv-python mediapipe numpy
```

#### 4. Run the application
```bash
python app.py
```

#### 5. Access the platform
Open:
```
http://localhost:5000
```

---

## 📁 Project Structure

```
ai-gym-assistant/
├── app.py                    
├── index.html
├── styles.css           
└── script.js            

```

---

## 🔧 Usage Guide

### **1. First-Time Setup**
- Run `python app.py`  
- Open browser at `http://localhost:5000`  
- Allow camera access  

---

### **Using the Squat Counter**
1. Open **Squat Counter** tab  
2. Click **Start Camera**  
3. Stand 6–8 feet away  
4. Click **Start Counting**  
5. Perform squats and get:
   - Real-time feedback  
   - Rep count  
   - Form analysis  

---

### **Creating a Diet Plan**
- Open **Diet Coach**  
- Enter weight, height, age, gender  
- Choose dietary preference & goal  
- Click **Generate Diet Plan**  
- View:
  - Full meal plan  
  - Macronutrients  
  - Grocery List  

---

### **Habit Tracking**
- Open **Habit Tracker**  
- View skip probability  
- Log workouts  
- See weekly consistency  
- Track streaks  

---

### **Chat with Virtual Gym Buddy**
- Ask fitness, diet, or form questions  
- Receive emotional/motivational guidance  

---

## 🔌 API Endpoints

| Endpoint | Method | Description | Request Body |
|---------|--------|-------------|--------------|
| `/` | GET | Main interface | - |
| `/api/predict` | POST | Squat image processing | `{ "image": "base64", "client_id": "string" }` |
| `/api/diet_recommendation` | POST | Diet generation | User metrics |
| `/api/habit_analysis` | POST | Habit insights | Workout data |
| `/api/chat` | POST | AI Chat | `{ "message": "text", "client_id": "string" }` |
| `/api/performance_analysis` | POST | Performance metrics | Client ID |
| `/api/gym_recommendations` | POST | Gym finder | Location & filters |
| `/api/dashboard_data` | POST | Dashboard info | Client ID |

---

## 🎨 User Interface

### **Dashboard**
- Unified fitness view  
- AI module shortcuts  
- Weekly performance charts  

### **Design**
- Glassmorphism UI  
- Dark theme  
- Smooth animations  
- Fully responsive  
- Real-time updates  

---

## 📱 Browser Compatibility
- ✔ Chrome (recommended)  
- ✔ Firefox  
- ✔ Edge  
- ✔ Safari (limited camera support)  

---

## 🔒 Privacy & Security
- No user data stored  
- Camera used **only** for pose detection  
- Works offline (localhost)  
- No login/sign-up required  

---

## 🚀 Future Enhancements

### **Planned Features**
- Mobile app (React Native)  
- Social sharing  
- More exercises (push-ups, planks, etc.)  
- Wearable integration  
- Voice commands  
- Multi-user accounts  
- Advanced ML analytics  

### **Technical Improvements**
- Full database support  
- OAuth login  
- Cloud deployment  
- Swagger documentation  
- CI/CD + test suite  

---

## 🤝 Contributing

1. Fork the repo  
2. Create a feature branch  
```bash
git checkout -b feature/amazing-feature
```
3. Commit changes  
```bash
git commit -m "Add amazing feature"
```
4. Push  
```bash
git push origin feature/amazing-feature
```
5. Open a Pull Request  

---

## 🙏 Acknowledgments
- Google MediaPipe Team  
- Flask Community  
- OpenCV Contributors  
- Chart.js Team  
- Fitness enthusiasts who inspired this project  

---

## ⭐ Show Your Support
If you find this project helpful, please **star the repository!** ⭐

