"""
Authentication endpoints (registration, login, token refresh, logout)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import (
    RegisterRequest, RegisterResponse,
    VerifyEmailRequest, VerifyEmailResponse,
    ResendVerificationRequest,
    LoginRequest, LoginResponse, TokenResponse,
    ErrorResponse
)
from app.services.auth import AuthService
from app.services.user import UserService
from app.models import User

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        400: {"model": ErrorResponse, "description": "Validation error"},
        409: {"model": ErrorResponse, "description": "Email already registered"},
    }
)
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
):
    """
    Register a new user

    **User Types**: 'seeker' (renter) or 'owner' (landlord)
    **Password Requirements**:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)

    **Returns**: User object (unverified - email verification required)
    """
    try:
        user = AuthService.register(
            db=db,
            email=request.email,
            password=request.password,
            name=request.name,
            user_type=request.user_type,
        )

        return RegisterResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            user_type=user.user_type.value,
            created_at=user.created_at,
        )

    except ValueError as e:
        if "Email already registered" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed",
        )


@router.post(
    "/verify-email",
    response_model=VerifyEmailResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid or expired token"},
    }
)
async def verify_email(
    request: VerifyEmailRequest,
    db: Session = Depends(get_db),
):
    """
    Verify user email address

    **Parameters**:
    - `verification_token`: Token from verification email link

    **Returns**: Success message

    **Note**: After verification, user can log in
    """
    try:
        AuthService.verify_email(db, request.verification_token)
        return VerifyEmailResponse(message="Email verified successfully")

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email verification failed",
        )


@router.post(
    "/resend-verification",
    response_model=VerifyEmailResponse,
    responses={
        400: {"model": ErrorResponse, "description": "User not found or already verified"},
    }
)
async def resend_verification(
    request: ResendVerificationRequest,
    db: Session = Depends(get_db),
):
    """
    Resend email verification link

    **Parameters**:
    - `email`: User email address

    **Returns**: Success message

    **Note**: Previous verification links will be invalidated
    """
    try:
        AuthService.resend_verification_email(db, request.email)
        return VerifyEmailResponse(
            message="Verification email sent. Please check your inbox."
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to resend verification email",
        )


@router.post(
    "/login",
    response_model=LoginResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid credentials"},
        403: {"model": ErrorResponse, "description": "Email not verified"},
    }
)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Login with email and password

    **Parameters**:
    - `email`: User email
    - `password`: User password

    **Returns**: JWT access token, refresh token, and user info

    **Note**: Email must be verified before login
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Login endpoint coming in Phase 4",
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid refresh token"},
    }
)
async def refresh_token(
    request: dict,
    db: Session = Depends(get_db),
):
    """
    Refresh access token

    **Parameters**:
    - `refresh_token`: JWT refresh token from login

    **Returns**: New access token with updated expiry

    **Note**: Implement in Phase 5
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Refresh endpoint coming in Phase 5",
    )


@router.post(
    "/logout",
    responses={
        200: {"description": "Successfully logged out"},
        401: {"model": ErrorResponse, "description": "Not authenticated"},
    }
)
async def logout(
    current_user: User = Depends(lambda: None),
    db: Session = Depends(get_db),
):
    """
    Logout user

    **Returns**: Success message

    **Note**: Implement in Phase 7
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Logout endpoint coming in Phase 7",
    )
