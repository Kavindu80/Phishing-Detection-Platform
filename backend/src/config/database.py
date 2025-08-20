from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import logging
from .config import get_config

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Database:
    """MongoDB database connection manager"""
    _instance = None
    _client = None
    _db = None
    
    def __new__(cls):
        """Singleton pattern to ensure only one database connection"""
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._connect()
        return cls._instance
    
    def _connect(self):
        """Connect to MongoDB"""
        config = get_config()
        try:
            self._client = MongoClient(config.MONGO_URI)
            # Extract database name from URI
            db_name = config.MONGO_URI.split('/')[-1]
            self._db = self._client[db_name]
            
            # Test the connection
            self._client.admin.command('ping')
            logger.info(f"Successfully connected to MongoDB: {config.MONGO_URI}")
            
            # Create indexes for collections
            self._create_indexes()
            
        except ConnectionFailure as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            raise
    
    def _create_indexes(self):
        """Create indexes for collections to improve query performance"""
        try:
            # Users collection indexes
            self._db.users.create_index("email", unique=True)
            self._db.users.create_index("username", unique=True)
            
            # Scans collection indexes
            self._db.scans.create_index("user_id")
            self._db.scans.create_index("date")
            self._db.scans.create_index([("user_id", 1), ("date", -1)])
            
            logger.info("Database indexes created successfully")
        except Exception as e:
            logger.error(f"Error creating indexes: {str(e)}")
    
    @property
    def db(self):
        """Get the database instance"""
        if self._db is None:
            self._connect()
        return self._db
    
    def close(self):
        """Close the database connection"""
        if self._client is not None:
            self._client.close()
            logger.info("MongoDB connection closed")

# Create a singleton instance
db_instance = Database()

def get_db():
    """Get the database instance"""
    return db_instance.db 