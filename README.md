# Video Proctoring System 🎥🤖

A comprehensive video proctoring system built with **Node.js**, **MongoDB**, **React**, and **AI-powered detection** for remote interview monitoring.

## 🌐 Live Demo

**🔗 [Live Application](https://your-app-name.vercel.app)**

---

## ⚡ Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or MongoDB Atlas)
- Git

### 🛠️ Installation

Clone the repository
git clone https://github.com/yourusername/video-proctoring-system.git
cd video-proctoring-system

Install backend dependencies
cd backend
npm install

Install frontend dependencies
cd ../frontend
npm install


### 🔧 Environment Setup

**⚠️ Environment files are not included in the repository for security reasons.**

#### Backend Environment (`backend/.env`)

Database
MONGODB_URI=mongodb://localhost:27017/video_proctoring

or use MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net/video_proctoring
Server
PORT=5005
NODE_ENV=development

Security
JWT_SECRET=your-super-secret-jwt-key-here
BCRYPT_SALT_ROUNDS=10

CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173


#### Frontend Environment (`frontend/.env`)

API Configuration
REACT_APP_API_URL=http://localhost:5005/api

Development
GENERATE_SOURCEMAP=false


### 🚀 Running the Application

#### Option 1: Run Both Services Separately

Terminal 1 - Start Backend
cd backend
npm run dev

Backend runs on http://localhost:5005
Terminal 2 - Start Frontend
cd frontend
npm run dev

Frontend runs on http://localhost:5173


#### Option 2: Run Both Services Together (if you have concurrently)

