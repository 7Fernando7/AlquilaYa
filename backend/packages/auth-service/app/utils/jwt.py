"""
JWT token utilities for authentication
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from pathlib import Path
import json

from jose import JWTError, jwt
from jose.exceptions import JWTError as JoseJWTError

from app.config import get_settings

settings = get_settings()


def load_rsa_keys():
    """Load RSA private and public keys from files"""
    private_key_path = Path(settings.jwt_private_key_path)
    public_key_path = Path(settings.jwt_public_key_path)

    if not private_key_path.exists() or not public_key_path.exists():
        raise FileNotFoundError("JWT key files not found. Generate with: openssl genrsa -out private.pem 2048")

    with open(private_key_path, "r") as f:
        private_key = f.read()
    with open(public_key_path, "r") as f:
        public_key = f.read()

    return private_key, public_key


# Load keys once at module import
try:
    PRIVATE_KEY, PUBLIC_KEY = load_rsa_keys()
except FileNotFoundError as e:
    print(f"Warning: {e}")
    PRIVATE_KEY = None
    PUBLIC_KEY = None


def create_access_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token

    Args:
        user_id: User ID to encode in token
        expires_delta: Custom expiry time (default from config)

    Returns:
        Encoded JWT token
    """
    if not PRIVATE_KEY:
        raise RuntimeError("JWT private key not loaded. Check key files exist.")

    if expires_delta is None:
        expires_delta = timedelta(minutes=settings.access_token_expire_minutes)

    expire = datetime.utcnow() + expires_delta
    to_encode = {
        "sub": user_id,
        "type": "access",
        "exp": expire,
        "iat": datetime.utcnow(),
    }

    encoded_jwt = jwt.encode(
        to_encode,
        PRIVATE_KEY,
        algorithm=settings.jwt_algorithm,
    )
    return encoded_jwt


def create_refresh_token(user_id: str, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT refresh token

    Args:
        user_id: User ID to encode in token
        expires_delta: Custom expiry time (default from config)

    Returns:
        Encoded JWT token
    """
    if not PRIVATE_KEY:
        raise RuntimeError("JWT private key not loaded. Check key files exist.")

    if expires_delta is None:
        expires_delta = timedelta(days=settings.refresh_token_expire_days)

    expire = datetime.utcnow() + expires_delta
    to_encode = {
        "sub": user_id,
        "type": "refresh",
        "exp": expire,
        "iat": datetime.utcnow(),
    }

    encoded_jwt = jwt.encode(
        to_encode,
        PRIVATE_KEY,
        algorithm=settings.jwt_algorithm,
    )
    return encoded_jwt


def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify and decode JWT token

    Args:
        token: JWT token to verify

    Returns:
        Decoded token payload

    Raises:
        JWTError: If token is invalid or expired
    """
    if not PUBLIC_KEY:
        raise RuntimeError("JWT public key not loaded. Check key files exist.")

    try:
        payload = jwt.decode(
            token,
            PUBLIC_KEY,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JoseJWTError as e:
        raise JWTError(f"Invalid token: {str(e)}")


def get_user_id_from_token(token: str) -> str:
    """
    Extract user ID from JWT token

    Args:
        token: JWT token

    Returns:
        User ID from token

    Raises:
        JWTError: If token is invalid
    """
    payload = verify_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise JWTError("Invalid token: missing user ID")
    return user_id


def get_jwks():
    """
    Get JWKS (JSON Web Key Set) for token verification

    This endpoint can be used by other services to fetch the public key
    for verifying tokens signed by this service.
    """
    if not PUBLIC_KEY:
        raise RuntimeError("JWT public key not loaded.")

    # Return public key in JWKS format
    # In production, you'd convert PEM to JWKS format
    return {
        "keys": [
            {
                "alg": settings.jwt_algorithm,
                "kty": "RSA",
                "use": "sig",
                "kid": "default",
                "n": PUBLIC_KEY,  # In production: proper JWK encoding
                "e": "AQAB",
            }
        ]
    }
