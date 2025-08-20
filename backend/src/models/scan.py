from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class PyObjectId(ObjectId):
    """Custom ObjectId class for Pydantic models"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate
    
    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)
    
    @classmethod
    def __get_pydantic_json_schema__(cls, _schema_generator, _field_schema):
        return {"type": "string"}

class SuspiciousElement(BaseModel):
    """Model for suspicious elements in a scan"""
    type: str  # 'domain', 'url', 'keyword'
    value: str
    reason: str

class ScanRequest(BaseModel):
    """Model for scan request"""
    emailText: str
    language: str = "auto"

class ScanResult(BaseModel):
    """Model for scan results"""
    verdict: str  # 'safe', 'suspicious', 'phishing'
    confidence: float
    translatedText: str
    originalLanguage: str
    suspiciousElements: List[SuspiciousElement] = []
    explanation: str
    recommendedAction: str

class ScanInDB(BaseModel):
    """Scan model as stored in the database"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: Optional[PyObjectId] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    subject: str
    sender: str
    verdict: str
    confidence: float
    language: str
    email_text: str
    suspicious_elements: List[Dict[str, str]] = []
    explanation: str
    recommended_action: str
    feedback: Optional[bool] = None
    
    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str
        }

class ScanResponse(BaseModel):
    """Scan model for API responses"""
    id: str
    date: datetime
    subject: str
    sender: str
    verdict: str
    confidence: float
    language: str
    
    class Config:
        orm_mode = True

class ScanDetailResponse(ScanResponse):
    """Detailed scan model for API responses"""
    email_text: str
    suspicious_elements: List[Dict[str, str]] = []
    explanation: str
    recommended_action: str
    feedback: Optional[bool] = None

class ScanFeedback(BaseModel):
    """Model for scan feedback"""
    scanId: str
    isPositive: bool 