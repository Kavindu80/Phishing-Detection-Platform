# 🔐 PhishGuard Credentials Setup Guide

## 📋 Required Credentials

### 1. **MongoDB Database**
- **Local Development**: No credentials needed (uses local MongoDB)
- **Production**: MongoDB Atlas or cloud MongoDB instance
  - **Connection String**: `mongodb+srv://username:password@cluster.mongodb.net/phishguard`
  - **Username**: Your MongoDB username
  - **Password**: Your MongoDB password

### 2. **Google API Keys**
- **Gemini AI API Key**: For AI-powered phishing detection
  - Get from: https://makersuite.google.com/app/apikey
  - Used for: Advanced text analysis and threat detection

- **Google Translate API Key**: For multi-language support
  - Get from: https://console.cloud.google.com/apis/credentials
  - Used for: Translating phishing content from different languages

- **Google OAuth Credentials**: For Gmail integration
  - **Client ID**: From Google Cloud Console
  - **Client Secret**: From Google Cloud Console
  - Used for: Connecting to Gmail inbox for email scanning

### 3. **JWT Secret Keys**
- **JWT Secret Key**: For user authentication tokens
- **Secret Key**: For Flask session management
- **Generate**: Use strong random strings (32+ characters)

## 🛠️ Environment Variables Setup

### **Local Development (.env file)**

Create a `.env` file in the `backend/` directory:

```bash
# Flask Configuration
SECRET_KEY=your-super-secret-key-here-32-characters-minimum
FLASK_ENV=development
DEBUG=True

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key-here-32-characters-minimum

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/phishguard

# Google API Keys
GEMINI_API_KEY=your-gemini-api-key-here
GOOGLE_TRANSLATE_API_KEY=your-google-translate-api-key-here

# Google OAuth (for Gmail integration)
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/inbox/oauth2callback

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

### **Production Environment**

Set these environment variables in your production server:

```bash
# Required for production
SECRET_KEY=your-production-secret-key
JWT_SECRET_KEY=your-production-jwt-secret-key
MONGO_URI=your-production-mongodb-connection-string
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_TRANSLATE_API_KEY=your-google-translate-api-key

# Optional for production
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/inbox/oauth2callback
FRONTEND_URL=https://yourdomain.com
```

## 🔑 How to Get API Keys

### **1. Gemini AI API Key**
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### **2. Google Translate API Key**
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable the "Cloud Translation API"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the generated key

### **3. Google OAuth Credentials**
1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable the "Gmail API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/inbox/oauth2callback` (development)
   - `https://yourdomain.com/api/inbox/oauth2callback` (production)
7. Copy Client ID and Client Secret

## 🚀 Quick Start (No Docker Required)

### **1. Install Dependencies**

**Backend (Python):**
```bash
cd backend
pip install -r requirements.txt
```

**Frontend (Node.js):**
```bash
cd frontend
npm install --legacy-peer-deps
```

### **2. Set Up MongoDB**

**Option A: Local MongoDB**
```bash
# Install MongoDB locally
# On Windows: Download from https://www.mongodb.com/try/download/community
# On Mac: brew install mongodb-community
# On Ubuntu: sudo apt install mongodb

# Start MongoDB
mongod
```

**Option B: MongoDB Atlas (Cloud)**
1. Go to https://www.mongodb.com/atlas
2. Create free cluster
3. Get connection string
4. Update MONGO_URI in .env file

### **3. Create .env File**
```bash
cd backend
cp .env.example .env  # if exists
# Or create .env manually with the variables above
```

### **4. Run the Application**

**Backend:**
```bash
cd backend
python app.py
```

**Frontend:**
```bash
cd frontend
npm run dev
```
