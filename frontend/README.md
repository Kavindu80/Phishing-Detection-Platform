# PhishGuard - Phishing Email Detection Web App

PhishGuard is a sophisticated web application designed to detect and analyze phishing emails using advanced machine learning techniques. This repository contains the frontend code for the application, built with React, Vite, and Tailwind CSS.

## Features

- **Email Scanner**: Upload or paste email content to analyze for phishing attempts
- **Multilingual Support**: Works across different languages with automatic translation
- **Detailed Analysis**: Get comprehensive reports on suspicious elements in emails
- **Dashboard & Analytics**: Track and visualize your email security metrics
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **State Management**: React Context API
- **Form Handling**: Formik with Yup validation
- **Routing**: React Router
- **UI Components**: Custom components with Tailwind CSS
- **Icons**: React Icons
- **Notifications**: React Toastify

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/phishing-detector.git
   cd phishing-detector
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
phishing-detector/
├── public/                  # Public assets
├── src/
│   ├── assets/              # Images and static assets
│   ├── components/
│   │   ├── analytics/       # Analytics-related components
│   │   ├── auth/            # Authentication components
│   │   ├── common/          # Reusable UI components
│   │   ├── dashboard/       # Dashboard components
│   │   ├── layout/          # Layout components (header, footer)
│   │   ├── scanner/         # Email scanner components
│   │   └── settings/        # Settings components
│   ├── context/             # React context providers
│   ├── hooks/               # Custom React hooks
│   ├── pages/               # Page components
│   ├── services/            # API services
│   ├── utils/               # Utility functions
│   ├── App.jsx              # Main App component
│   ├── index.css            # Global styles
│   └── main.jsx             # Entry point
├── .gitignore
├── index.html
├── package.json
├── README.md
├── tailwind.config.js       # Tailwind CSS configuration
└── vite.config.js           # Vite configuration
```

## Connecting to Backend

This frontend is designed to connect to a Python-based ML backend. To connect to your backend:

1. Update the API endpoints in the services directory
2. Ensure CORS is properly configured on your backend
3. Update the environment variables for different environments

## Deployment

To build the application for production:

```bash
npm run build
```

This will generate a `dist` folder that can be deployed to any static hosting service.

## Future Enhancements

- Integration with email clients via browser extensions
- Real-time email monitoring
- Enhanced visualization of phishing patterns
- User feedback system for improving ML model accuracy

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- This project was developed as a final year project at SLTC Research University
- Special thanks to [Supervisor Name] for guidance and support
