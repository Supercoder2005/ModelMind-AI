# 🧠 ModelMind AI

> An end-to-end, automated Machine Learning pipeline and data exploration engine with multi-model competitions, dynamic feature engineering, interactive visualizations, and adaptive multi-tier AI explanations.

---

## 🌟 Key Features

- **🚀 11-Step Automated ML Pipeline:** Guided walkthrough from raw data ingestion to evaluation metrics and automated executive reporting.
- **📊 Comprehensive EDA Profiling:** Automatic missing value imputation, statistical summaries, distribution charts, and outlier detection.
- **⚡ Multi-Model Competition Engine:** Automated parallel training and evaluation of multiple classification and regression algorithms (Random Forest, Gradient Boosting, SVM, Logistic Regression, etc.).
- **⚙️ Dynamic Feature Engineering:** Intelligent interaction term generation and collinearity pruning adapted to dataset scale.
- **🎓 Adaptive "Expertise Level" AI Explanations:** Explains insights dynamically across 4 personas (**Beginner**, **Learner**, **Practitioner**, **Expert**) using LLM integration (Groq & Gemini).
- **📈 Custom Interactive Visualizations:** Dynamic confusion matrices, dataset feeds with missing value highlights, and feature importance breakdowns.
- **📓 Exportable Jupyter Notebooks:** One-click export of clean, self-contained Python code with educational comments explaining *why* each step was taken.

---

## 🏗️ Architecture & Tech Stack

### **Frontend**
- **Framework:** Next.js 16 (React 19, Turbopack)
- **Styling:** Vanilla CSS & TailwindCSS (Dark Glassmorphism UI Design System)
- **Icons & UI:** Lucide React, Radix UI primitives

### **Backend**
- **Framework:** Python FastAPI
- **Machine Learning:** Scikit-Learn, XGBoost, Statsmodels, Pandas, NumPy
- **Database:** SQLite & SQLAlchemy ORM
- **LLM Engine:** Groq API (`llama-3.1-8b-instant`) & Google Gemini API (`gemini-2.5-flash`) with automatic failover fallback

---

## 🚀 Getting Started

### **Prerequisites**
- Node.js (v18+)
- Python (v3.10+)

---

### **1. Backend Setup**

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file inside backend directory
cat <<EOT > .env
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
DATABASE_URL=sqlite:///./modelmind.db
UPLOAD_DIR=./uploads
EOT

# Start the FastAPI backend server
uvicorn main:app --reload --port 8000
```
Backend API will run on `http://localhost:8000` (Docs available at `http://localhost:8000/docs`).

---

### **2. Frontend Setup**

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env.local file
cat <<EOT > .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
EOT

# Start the Next.js development server
npm run dev
```
Frontend will run on `http://localhost:3000`.

---

## 📂 Project Structure

```text
├── backend/
│   ├── db/              # SQLAlchemy models & database configuration
│   ├── routers/         # FastAPI endpoint routes (upload, analysis, models, export, etc.)
│   ├── services/        # Profiler, ML competition runner, LLM client, Notebook builder
│   ├── prompts/         # Structured LLM prompt templates
│   ├── main.py          # Application entry point
│   └── requirements.txt # Python dependencies
├── frontend/
│   ├── app/             # Next.js App Router pages (Dashboard, Analysis, Settings)
│   ├── components/      # UI components (EDA charts, Pipeline walkthrough, Upload zone)
│   ├── lib/             # API client & helper functions
│   └── public/          # Static assets
└── vercel.json          # Vercel deployment configuration
```

---

