import re
import string
import nltk
from nltk.corpus import stopwords
from nltk.stem import PorterStemmer, WordNetLemmatizer

# Ensure NLTK resources are downloaded
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')
    
try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')
    
try:
    nltk.data.find('corpora/wordnet')
except LookupError:
    nltk.download('wordnet')

class TextPreprocessor:
    """Text preprocessing utility for email content"""
    
    def __init__(self):
        """Initialize the text preprocessor"""
        self.stemmer = PorterStemmer()
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))
        
    def clean_text(self, text):
        """Clean and normalize text"""
        # Convert to lowercase
        text = text.lower()
        
        # Remove URLs
        text = re.sub(r'https?://\S+', ' URL ', text)
        
        # Remove email addresses
        text = re.sub(r'\S+@\S+', ' EMAIL ', text)
        
        # Remove phone numbers
        text = re.sub(r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', ' PHONE ', text)
        
        # Remove numbers
        text = re.sub(r'\d+', ' NUM ', text)
        
        # Remove punctuation
        text = re.sub(f'[{string.punctuation}]', ' ', text)
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        return text
        
    def remove_stopwords(self, text):
        """Remove stop words from text"""
        words = text.split()
        filtered_words = [word for word in words if word not in self.stop_words]
        return ' '.join(filtered_words)
        
    def stem_text(self, text):
        """Apply stemming to text"""
        words = text.split()
        stemmed_words = [self.stemmer.stem(word) for word in words]
        return ' '.join(stemmed_words)
        
    def lemmatize_text(self, text):
        """Apply lemmatization to text"""
        words = text.split()
        lemmatized_words = [self.lemmatizer.lemmatize(word) for word in words]
        return ' '.join(lemmatized_words)
        
    def transform(self, texts):
        """Transform a list of texts by applying all preprocessing steps"""
        processed_texts = []
        for text in texts:
            # Apply cleaning and normalization
            clean_text = self.clean_text(text)
            
            # Remove stopwords
            clean_text = self.remove_stopwords(clean_text)
            
            # Apply lemmatization
            clean_text = self.lemmatize_text(clean_text)
            
            processed_texts.append(clean_text)
            
        return processed_texts 