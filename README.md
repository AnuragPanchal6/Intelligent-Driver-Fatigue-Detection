# 🚗 Intelligent Driver Drowsiness Detection

**Intelligent Driver Drowsiness Detection (IDDD)** is a real-time system that monitors driver behavior to prevent accidents caused by fatigue and distractions. Using computer vision and deep learning, the system tracks eye movements, yawning, and distracted activities (like phone use), triggering alerts to keep drivers safe.

---

## ✨ Key Features

- 👀 **Eye Closure Monitoring** – Detects eye closure to identify early signs of drowsiness.  
- 😮 **Yawn Detection** – Analyzes facial landmarks to detect yawning.  
- 📱 **Distraction Recognition** – Uses YOLOv3 to spot risky activities such as phone usage, smoking, or eating while driving.  
- ⚡ **Real-Time Alerts** – Instant visual/audio feedback when unsafe behavior is detected.  

---

## 🛠 Tech Stack

- **Programming Language:** Python 3.x  
- **Computer Vision:** OpenCV, imutils  
- **Deep Learning Frameworks:** dlib, YOLOv3  
- **Numerical & Scientific Libraries:** NumPy, SciPy  
- **Alert System:** Real-time visual/audio notifications  

---

## 🚀 Installation

1. Clone the repository:


## ▶️ Usage
- **Start the system with your webcam:
- **python main.py -w 0
- **Press 'q' to exit

## 🔍 How It Works
Frame Capture (OpenCV): Continuously reads video from the webcam.
Facial Landmark Detection (dlib): Tracks eyes and lips for blink/yawn analysis.
Object Detection (YOLOv3): Identifies distractions such as phone use.
Decision Logic: If drowsiness, yawning, or distractions are detected → trigger real-time alert.

