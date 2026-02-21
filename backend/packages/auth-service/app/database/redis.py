"""
Redis client configuration and utilities
"""

import redis
from typing import Optional, Any

from app.config import get_settings

settings = get_settings()

# Global Redis client
redis_client: Optional[redis.Redis] = None


def init_redis() -> redis.Redis:
    """Initialize Redis client"""
    global redis_client
    redis_client = redis.from_url(
        settings.redis_url,
        decode_responses=True,
        health_check_interval=30,
    )
    return redis_client


def get_redis() -> redis.Redis:
    """Get Redis client (create if not exists)"""
    global redis_client
    if redis_client is None:
        redis_client = init_redis()
    return redis_client


def close_redis():
    """Close Redis connection"""
    global redis_client
    if redis_client:
        redis_client.close()
        redis_client = None


class RedisCache:
    """Simple Redis cache wrapper"""

    def __init__(self, redis_connection: redis.Redis = None):
        self.redis = redis_connection or get_redis()

    def get(self, key: str) -> Optional[str]:
        """Get value from cache"""
        return self.redis.get(key)

    def set(self, key: str, value: str, ex: int = None) -> bool:
        """Set value in cache with optional expiry"""
        if ex:
            self.redis.setex(key, ex, value)
        else:
            self.redis.set(key, value)
        return True

    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        self.redis.delete(key)
        return True

    def exists(self, key: str) -> bool:
        """Check if key exists"""
        return bool(self.redis.exists(key))

    def incr(self, key: str) -> int:
        """Increment counter"""
        return self.redis.incr(key)

    def expire(self, key: str, seconds: int) -> bool:
        """Set expiry on key"""
        return bool(self.redis.expire(key, seconds))
