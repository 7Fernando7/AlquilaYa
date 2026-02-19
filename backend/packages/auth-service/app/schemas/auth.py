"""
Pydantic schemas for authentication endpoints
"""

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional


class RegisterRequest(BaseModel):
    """User registration request"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, description="User password")
    name: str = Field(..., min_length=1, max_length=255, description="User full name")
    user_type: str = Field(..., description="User type: 'seeker' or 'owner'")

    class Config:
        example = {
            "email": "john@example.com",
            "password": "SecurePass123!",
            "name": "John Doe",
            "user_type": "seeker"
        }


class RegisterResponse(BaseModel):
    """User registration response"""
    id: str
    email: str
    name: str
    user_type: str
    created_at: datetime

    class Config:
        from_attributes = True
        example = {
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "john@example.com",
            "name": "John Doe",
            "user_type": "seeker",
            "created_at": "2026-02-19T10:30:00Z"
        }


class VerifyEmailRequest(BaseModel):
    """Email verification request"""
    verification_token: str = Field(..., description="Verification token from email")

    class Config:
        example = {"verification_token": "token_value_here"}


class VerifyEmailResponse(BaseModel):
    """Email verification response"""
    message: str

    class Config:
        example = {"message": "Email verified successfully"}


class ResendVerificationRequest(BaseModel):
    """Resend verification email request"""
    email: EmailStr = Field(..., description="User email address")

    class Config:
        example = {"email": "john@example.com"}


class LoginRequest(BaseModel):
    """User login request"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")

    class Config:
        example = {
            "email": "john@example.com",
            "password": "SecurePass123!"
        }


class TokenResponse(BaseModel):
    """JWT token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds

    class Config:
        example = {
            "access_token": "eyJhbGc...",
            "refresh_token": "eyJhbGc...",
            "token_type": "bearer",
            "expires_in": 900
        }


class LoginResponse(TokenResponse):
    """Login response with user info"""
    user: Optional[RegisterResponse] = None

    class Config:
        example = {
            "access_token": "eyJhbGc...",
            "refresh_token": "eyJhbGc...",
            "token_type": "bearer",
            "expires_in": 900,
            "user": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "email": "john@example.com",
                "name": "John Doe",
                "user_type": "seeker",
                "created_at": "2026-02-19T10:30:00Z"
            }
        }


class PasswordResetRequest(BaseModel):
    """Password reset request"""
    email: EmailStr = Field(..., description="User email address")

    class Config:
        example = {"email": "john@example.com"}


class PasswordResetConfirmRequest(BaseModel):
    """Password reset confirmation request"""
    reset_token: str = Field(..., description="Reset token from email")
    new_password: str = Field(..., min_length=8, description="New password")

    class Config:
        example = {
            "reset_token": "token_value_here",
            "new_password": "NewSecurePass123!"
        }


class PasswordResetResponse(BaseModel):
    """Password reset response"""
    message: str

    class Config:
        example = {"message": "Password reset email sent successfully"}


class ErrorResponse(BaseModel):
    """Standard error response"""
    detail: str
    code: Optional[str] = None

    class Config:
        example = {
            "detail": "Email already registered",
            "code": "EMAIL_EXISTS"
        }
