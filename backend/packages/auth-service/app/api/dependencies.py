"""
FastAPI dependencies for authentication and database sessions
"""

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError

from app.database import get_db, SessionLocal
from app.utils.jwt import verify_token, get_user_id_from_token
from app.models import User


async def get_current_user(
    token: str = None,
    db: Session = Depends(get_db),
) -> User:
    """
    Get current authenticated user from JWT token

    Usage in FastAPI routes:
        @app.get("/protected")
        async def protected_route(current_user: User = Depends(get_current_user)):
            return {"user": current_user}
    """
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_id = get_user_id_from_token(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


async def get_optional_user(
    token: str = None,
    db: Session = Depends(get_db),
) -> User:
    """
    Get current user if authenticated, otherwise None

    Usage: For endpoints that work with or without authentication
    """
    if not token:
        return None

    try:
        return await get_current_user(token=token, db=db)
    except HTTPException:
        return None
