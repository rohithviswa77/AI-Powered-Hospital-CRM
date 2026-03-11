# AI-Powered Hospital CRM

An intelligent, clinical-grade CRM designed to solve manual data overload and fragmented information in hospital environments. By leveraging Multi-Agent AI Orchestration, the system centralizes patient data and provides actionable insights for doctors and hospital staff.

## 🚀 Overview

Traditional hospital management systems are often rule-based and lack the intelligence to prioritize medical urgency. This system bridges that gap by integrating **Google Gemini API** for natural language processing and **Logistic Regression** for predictive behavior modeling.

## ✨ Key Features

- **Smart Medical Summarization**: Automatically converts long patient records into concise, professional summaries using Gemini AI to save clinical time.
- **Intelligent Triage (Lead Scoring)**: Ranks incoming inquiries based on medical intent and urgency to prioritize high-risk cases.
- **Predictive No-Show Alerts**: Utilizes a predictive model to identify patients likely to miss appointments, enabling proactive resource management.
- **Centralized Patient Hub**: Tracks the entire patient journey from initial inquiry to final treatment, replacing fragmented spreadsheets.
- **Gated Confirmation UI**: Implements "Safety First" logic by requiring staff to validate AI insights before data is committed to the database.

## 🛠 Tech Stack

- **Frontend**: React.js / Vite / Tailwind CSS
- **Backend / Serverless**: Node.js (via Firebase Functions / Orchestrator)
- **Database**: Firebase Real-time DB & Firestore (Structured in 3NF)
- **AI Engine**: Google Gemini API & Logistic Regression models
- **Authentication**: Firebase Auth

## 🏗 System Architecture

The system follows a modular design to ensure stability and clinical traceability:
- **Request & Reasoning Flow**: The Orchestrator (Node.js) manages intent routing, auth validation, and audit logging.
- **Reasoning Layer (AI Agents)**: Specialized agents for Summarization, Urgency Detection, and Predictive Forecasting.
- **Execution Layer**: Handles secure data commitment to Firebase and triggers notification services.

## 📋 Database Design

The database follows Third Normal Form (3NF) principles to ensure a clean data structure with zero redundancy.

| Table Name | Description | Key Fields |
| --- | --- | --- |
| **Patient Table** | Stores clinical history and treatment status. | `patientID` (PK), `medicalHistory`, `vitals` |
| **Lead Table** | Manages inquiries and AI urgency scores. | `contactID` (PK), `treatmentSought`, `urgencyScore` |
| **Appointment Table** | Maintains scheduling and visit status. | `appointmentID` (FK), `doctorName`, `status` |
| **Outreach Table** | Records AI-summarized interaction notes. | `logID` (PK), `rawNotes`, `aiSummary` (Gemini) |

## 💻 Installation & Setup

### Prerequisites
- Node.js (v18+ recommended)
- Firebase Account for Database and Auth
- Google Gemini API Key

### Step 1: Clone the Repository
```bash
git clone https://github.com/rohithviswa77/AI-Powered-Hospital-CRM.git
cd AI-Powered-Hospital-CRM
```

### Step 2: Install Dependencies
```bash
# Install frontend dependencies
cd client
npm install

# Install backend dependencies (if applicable)
cd ../server
npm install
```

### Step 3: Run the Application
```bash
# Start backend (if applicable)
npm start

# Start frontend (in a separate terminal)
cd client
npm run dev
```
