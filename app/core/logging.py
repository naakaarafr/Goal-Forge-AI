import logging
import sys
from app.core.config import settings

def setup_logging():
    # Basic logging configuration
    logging_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    
    logging.basicConfig(
        level=logging_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
    )

    # You could integrate structlog here for enterprise-grade JSON logging
    # For hackathon, clean standard logging is often sufficient and easier to debug
    logger = logging.getLogger("goalforge")
    logger.info("Logging system initialized")
    
    return logger

logger = setup_logging()
