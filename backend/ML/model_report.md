# Phishing Detection Model Analysis Report

## Model Overview
- Model Type: XGBoost
- Vectorizer Type: TfidfVectorizer
- Vocabulary Size: 10000

## Top Phishing Indicators
- 'wrote': 1311.0615
- 'enron': 552.9167
- 'cc': 413.3737
- 'date': 388.7618
- 'university': 346.9602
- 'money': 268.3742
- 'file': 253.3351
- 'im': 246.3449
- 'company': 231.7428
- 'aug 2008': 216.6877
- 'attached': 214.5372
- 'replica': 212.8586
- 'pm': 208.3428
- 'agreed receive': 199.9604
- 'group': 182.0215
- 'log': 180.9118
- 'list': 180.1887
- 'let know': 180.0152
- 'account': 178.1625
- '2001': 175.6320

## Test Results
### Phishing Email Sample
- Prediction: Phishing
- Confidence: 97.32%

### Legitimate Email Sample
- Prediction: Legitimate
- Confidence: 5.06%