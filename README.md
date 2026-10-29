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

```bash
git clone https://github.com/AnuragPanchal6/Intelligent-Driver-Fatigue-Detection.git
cd Intelligent-Driver-Fatigue-Detection
```

2. Install the Python dependencies:

```bash
pip install -r requirements.txt
```

3. Download the model files and place them in the project root (next to `DriverDetection.py`):

- `shape_predictor_68_face_landmarks.dat` (~96 MB) — dlib facial landmarks model:
  http://dlib.net/files/shape_predictor_68_face_landmarks.dat.bz2
- `yolov3.weights` (~236 MB) — YOLOv3 weights:
  https://pjreddie.com/media/files/yolov3.weights
- `yolov3.cfg` (~8 KB) — already included in this repository.

> The large model binaries (`*.dat`, `*.weights`) are not committed to git due to GitHub's file-size limits.

---

## 🌐 Browser Demo (`frontend/`)

A companion web dashboard runs eye-closure (EAR) and yawn detection entirely in the browser using MediaPipe FaceLandmarker — no backend and no video upload. It is a plain static site (no build step).

```bash
python -m http.server 8000 --directory frontend
```

Then open http://localhost:8000 and click **Start Camera**. To deploy on Vercel, set the project Root Directory to `frontend`.

---

## ▶️ Usage

Start the desktop system with your webcam:

```bash
python DriverDetection.py -w 0
```

Press **q** to exit.


## 🔍 How It Works
Frame Capture (OpenCV): Continuously reads video from the webcam.
Facial Landmark Detection (dlib): Tracks eyes and lips for blink/yawn analysis.
Object Detection (YOLOv3): Identifies distractions such as phone use.
Decision Logic: If drowsiness, yawning, or distractions are detected → trigger real-time alert.

