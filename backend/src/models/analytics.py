from datetime import datetime
from typing import Dict, List, Optional, Union
from pydantic import BaseModel, Field

class AnalyticsRequest(BaseModel):
    """Request model for analytics API"""
    timeRange: str = "30d"  # Options: 7d, 30d, 90d, 1y, all

class VerdictDistribution(BaseModel):
    """Model for verdict distribution data"""
    safe: int = 0
    suspicious: int = 0
    phishing: int = 0

class AccuracyMetrics(BaseModel):
    """Model for accuracy metrics data"""
    currentAccuracy: float = 98.2
    falsePositives: float = 1.1
    falseNegatives: float = 0.7

class PhishingDomain(BaseModel):
    """Model for phishing domain data"""
    domain: str
    count: int

class TimeSeriesPoint(BaseModel):
    """Model for a single point in time series data"""
    date: str
    safe: int = 0
    suspicious: int = 0
    phishing: int = 0

class AnalyticsResponse(BaseModel):
    """Response model for analytics API"""
    verdictDistribution: VerdictDistribution
    languageDistribution: Dict[str, int]
    topPhishingDomains: List[PhishingDomain]
    accuracyMetrics: AccuracyMetrics
    scansOverTime: List[TimeSeriesPoint] 