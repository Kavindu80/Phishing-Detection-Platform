# PhishGuard Backend API

This is the backend API for the PhishGuard phishing email detection tool. It provides endpoints for scanning emails, retrieving scan history, and generating analytics.

## Features

- Email scanning using machine learning
- Language detection
- URL and domain analysis
- Analytics and reporting
- Scan history tracking
- User authentication and management
- MongoDB database integration

## Technology Stack

- Python 3.8+
- Flask web framework
- MongoDB for data storage
- JWT for authentication
- Machine learning with scikit-learn
- NLTK for natural language processing
- TLD Extract for domain analysis

## Folder Structure

```
backend/
├── ML_MODEL/              # Trained machine learning model files
├── test_data/             # Sample emails for testing
├── src/                   # Source code
│   ├── config/            # Configuration files
│   │   ├── config.py      # Application configuration
│   │   └── database.py    # Database connection
│   ├── controllers/       # Controller logic
│   │   ├── analytics_controller.py
│   │   ├── scan_controller.py
│   │   └── user_controller.py
│   ├── middleware/        # Middleware components
│   │   └── auth.py        # Authentication middleware
│   ├── models/            # Data models
│   │   ├── analytics.py
│   │   ├── scan.py
│   │   └── user.py
│   ├── routes/            # API routes
│   │   ├── analytics_routes.py
│   │   ├── auth_routes.py
│   │   └── scan_routes.py
│   └── utils/             # Utility functions
│       ├── email_parser.py
│       ├── language_detector.py
│       └── url_analyzer.py
├── test_model.py          # Script to test the ML model
├── init_db.py             # Database initialization script
└── app.py                 # Main application entry point
```

## Setup Instructions

1. Make sure you have Python 3.8+ and MongoDB installed
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file with the following variables:
   ```
   FLASK_APP=app.py
   FLASK_ENV=development
   SECRET_KEY=your-secret-key-for-development
   JWT_SECRET_KEY=jwt-secret-key-for-development
   MONGO_URI=mongodb://localhost:27017/phishguard
   ```
5. Run the application:
   ```bash
   python app.py
   ```

## Quick Start

### Windows
```bash
run.bat                # Run the backend
run_with_test.bat      # Test the ML model and run the backend
```

### Unix/Mac
```bash
chmod +x run.sh        # Make the script executable
./run.sh               # Run the backend

chmod +x run_with_test.sh
./run_with_test.sh     # Test the ML model and run the backend
```

## Testing the ML Model

You can test the ML model directly using the `test_model.py` script:

```bash
python test_model.py
```

This script will:
1. Load the ML model and its components
2. Test the model with sample phishing and legitimate emails
3. Output detailed results including predictions, confidence scores, and extracted features

The sample emails are located in the `test_data` directory:
- `phishing_email_sample.txt`: A sample phishing email
- `legitimate_email_sample.txt`: A sample legitimate email

## API Endpoints

### Authentication

```
POST /api/auth/register
POST /api/auth/login
GET /api/auth/user/:id
PUT /api/auth/user/:id
GET /api/auth/me
```

### Email Scanning

```
POST /api/scan           # Public endpoint
POST /api/scan/auth      # Authenticated endpoint
GET /api/history         # Get scan history
GET /api/history/:id     # Get scan details
POST /api/feedback       # Submit feedback on scan
```

### Analytics

```
GET /api/analytics       # Get analytics data
```

### Utilities

```
GET /api/health          # Health check
GET /api/model/status    # Check ML model status
```

## MongoDB Collections

The application uses the following MongoDB collections:

### Users Collection

Stores user information and authentication details.

### Scans Collection

Stores the history of email scans and their results.

## Integration with Frontend

This backend is designed to work with the PhishGuard React frontend. The API endpoints match the expected format of the frontend's requests. 