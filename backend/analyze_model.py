import os
import json
import numpy as np
import pandas as pd
from pathlib import Path
import logging
import joblib
from sklearn import metrics
import matplotlib.pyplot as plt
import xgboost as xgb
from sklearn.feature_extraction.text import TfidfVectorizer

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def analyze_model():
    """Analyze the ML model and its characteristics"""
    try:
        # Get the base directory
        base_dir = Path(__file__).parent
        
        # Define the paths to the model files
        model_path = base_dir / "ML" / "xgboost_phishing_model.json"
        vectorizer_path = base_dir / "ML" / "tfidf_vectorizer.joblib"
        scaler_path = base_dir / "ML" / "scaler.joblib"
        
        logger.info(f"Loading model from {model_path}")
        logger.info(f"Loading vectorizer from {vectorizer_path}")
        logger.info(f"Loading scaler from {scaler_path}")
        
        # Load the XGBoost model
        model = xgb.Booster()
        model.load_model(str(model_path))
        
        # Load the vectorizer and scaler
        vectorizer = joblib.load(vectorizer_path)
        scaler = joblib.load(scaler_path)
        
        # Get model information
        model_info = {
            "model_type": "XGBoost",
            "model_params": {
                "booster": model.attr("booster") if model.attr("booster") else "gbtree",
                "objective": model.attr("objective") if model.attr("objective") else "binary:logistic",
                "num_features": model.num_features()
            },
            "vectorizer_type": str(type(vectorizer).__name__),
            "vectorizer_params": {
                k: (str(v) if not isinstance(v, (int, float, bool, str, list, dict)) else v) 
                for k, v in vectorizer.get_params().items()
            }
        }
        
        # Extract feature names (vocabulary)
        feature_names = vectorizer.get_feature_names_out() if hasattr(vectorizer, 'get_feature_names_out') else vectorizer.get_feature_names()
        
        # Get vocabulary size
        model_info["vocabulary_size"] = len(feature_names)
        
        # Get feature importance if available
        try:
            # For XGBoost, we can get feature importance
            importance = model.get_score(importance_type='gain')
            feature_importance = []
            
            # Map feature indices to feature names
            for feat_id, score in importance.items():
                idx = int(feat_id.replace('f', ''))
                if idx < len(feature_names):
                    feature_importance.append((feature_names[idx], float(score)))
            
            # Sort by importance score
            feature_importance.sort(key=lambda x: x[1], reverse=True)
            
            # Get top phishing features
            top_phishing_indicators = {str(k): float(v) for k, v in dict(feature_importance[:20]).items()}
            model_info["top_phishing_indicators"] = top_phishing_indicators
        except Exception as imp_err:
            logger.warning(f"Could not extract feature importance: {str(imp_err)}")
        
        # If test data exists, compute and include performance metrics
        test_email_path = base_dir / "test_data" / "phishing_email_sample.txt"
        legitimate_email_path = base_dir / "test_data" / "legitimate_email_sample.txt"
        
        if test_email_path.exists() and legitimate_email_path.exists():
            # Load test emails
            with open(test_email_path, 'r', encoding='utf-8', errors='ignore') as f:
                phishing_email = f.read()
            
            with open(legitimate_email_path, 'r', encoding='utf-8', errors='ignore') as f:
                legitimate_email = f.read()
            
            # Vectorize
            phishing_vec = vectorizer.transform([phishing_email])
            legitimate_vec = vectorizer.transform([legitimate_email])
            
            # Create DMatrix for XGBoost prediction
            phishing_dmatrix = xgb.DMatrix(phishing_vec)
            legitimate_dmatrix = xgb.DMatrix(legitimate_vec)
            
            # Predict
            phishing_prob = float(model.predict(phishing_dmatrix)[0])
            phishing_pred = int(1 if phishing_prob >= 0.5 else 0)
            
            legitimate_prob = float(model.predict(legitimate_dmatrix)[0])
            legitimate_pred = int(1 if legitimate_prob >= 0.5 else 0)
            
            model_info["test_results"] = {
                "phishing_sample_prediction": phishing_pred,
                "phishing_sample_probability": phishing_prob,
                "legitimate_sample_prediction": legitimate_pred,
                "legitimate_sample_probability": legitimate_prob
            }
        
        # Save the model analysis to a JSON file
        output_path = base_dir / "ML" / "model_analysis.json"
        with open(output_path, 'w') as f:
            json.dump(model_info, f, indent=2)
            
        logger.info(f"Model analysis saved to {output_path}")
        return model_info
    
    except Exception as e:
        logger.error(f"Error analyzing model: {str(e)}")
        raise Exception(f"Failed to analyze ML model: {str(e)}")

def generate_model_report():
    """Generate a Markdown report about the model"""
    try:
        base_dir = Path(__file__).parent
        analysis_path = base_dir / "ML" / "model_analysis.json"
        
        if not analysis_path.exists():
            analyze_model()
        
        with open(analysis_path, 'r') as f:
            model_info = json.load(f)
        
        # Create a markdown report
        report = [
            "# Phishing Detection Model Analysis Report",
            "\n## Model Overview",
            f"- Model Type: {model_info.get('model_type', 'XGBoost')}",
            f"- Vectorizer Type: {model_info.get('vectorizer_type', 'TfidfVectorizer')}",
            f"- Vocabulary Size: {model_info.get('vocabulary_size', 'Unknown')}",
            "\n## Top Phishing Indicators",
        ]
        
        # Add top phishing indicators
        if "top_phishing_indicators" in model_info:
            # Sort the items by their values (weights) in descending order
            sorted_items = sorted(
                model_info["top_phishing_indicators"].items(), 
                key=lambda item: float(item[1]), 
                reverse=True
            )[:20]
            
            # Add each feature to the report
            for feature, weight in sorted_items:
                report.append(f"- '{feature}': {float(weight):.4f}")
        
        # Add test results
        if "test_results" in model_info:
            report.append("\n## Test Results")
            test_results = model_info["test_results"]
            
            report.append("### Phishing Email Sample")
            report.append(f"- Prediction: {'Phishing' if test_results.get('phishing_sample_prediction') == 1 else 'Legitimate'}")
            if test_results.get('phishing_sample_probability') is not None:
                report.append(f"- Confidence: {float(test_results.get('phishing_sample_probability', 0)):.2%}")
            
            report.append("\n### Legitimate Email Sample")
            report.append(f"- Prediction: {'Phishing' if test_results.get('legitimate_sample_prediction') == 1 else 'Legitimate'}")
            if test_results.get('legitimate_sample_probability') is not None:
                report.append(f"- Confidence: {float(test_results.get('legitimate_sample_probability', 0)):.2%}")
        
        # Save the report
        output_path = base_dir / "ML" / "model_report.md"
        with open(output_path, 'w') as f:
            f.write("\n".join(report))
            
        logger.info(f"Model report saved to {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"Error generating model report: {str(e)}")
        raise Exception(f"Failed to generate model report: {str(e)}")

if __name__ == "__main__":
    print("Analyzing ML model...")
    analyze_model()
    report_path = generate_model_report()
    print(f"Model analysis complete. Report saved to {report_path}") 