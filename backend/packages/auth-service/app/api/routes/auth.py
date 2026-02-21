"""
Authentication endpoints (registration, login, token refresh, logout)
"""

import logging
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

from app.database import get_db
from app.schemas.auth import (
    RegisterRequest, RegisterResponse,
    VerifyEmailRequest, VerifyEmailResponse,
    ResendVerificationRequest,
    LoginRequest, LoginResponse, TokenResponse,
    RefreshTokenRequest, LogoutResponse,
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
        import traceback
        logger.error(f"Unexpected error during registration: {str(e)}")
        logger.error(traceback.format_exc())
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
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid credentials"},
        403: {"model": ErrorResponse, "description": "Email not verified"},
    }
)
async def login(
    request: LoginRequest,
    http_request: Request,
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
    try:
        # Get client IP and user agent
        client_ip = http_request.client.host if http_request.client else "unknown"
        user_agent = http_request.headers.get("user-agent", "unknown")

        # Perform login
        token_data = AuthService.login(
            db=db,
            email=request.email,
            password=request.password,
            ip_address=client_ip,
            user_agent=user_agent,
        )

        # Get user for response
        user = UserService.get_user_by_email(db=db, email=request.email)

        return LoginResponse(
            access_token=token_data["access_token"],
            refresh_token=token_data["refresh_token"],
            expires_in=token_data["expires_in"],
            token_type=token_data["token_type"],
            user=RegisterResponse(
                id=str(user.id),
                email=user.email,
                name=user.name,
                user_type=user.user_type.value,
                created_at=user.created_at,
            )
        )

    except ValueError as e:
        error_msg = str(e)
        if "Email not verified" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Email not verified",
            )
        elif "Account is inactive" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Login failed",
        )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse, "description": "Invalid refresh token"},
    }
)
async def refresh_token(
    request: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    """
    Refresh access token

    **Parameters**:
    - `refresh_token`: JWT refresh token from login

    **Returns**: New access token with updated expiry
    """
    try:
        token_data = AuthService.refresh_access_token(
            db=db,
            refresh_token=request.refresh_token,
        )

        return TokenResponse(
            access_token=token_data["access_token"],
            expires_in=token_data["expires_in"],
            token_type=token_data["token_type"],
            refresh_token=request.refresh_token,  # Return existing refresh token
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token refresh failed",
        )


@router.post(
    "/logout",
    response_model=LogoutResponse,
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse, "description": "Not authenticated"},
    }
)
async def logout(
    http_request: Request,
    db: Session = Depends(get_db),
):
    """
    Logout user and invalidate current session

    **Returns**: Success message

    **Note**: Authorization header with access token required
    """
    try:
        # Extract token from Authorization header
        auth_header = http_request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise ValueError("Invalid authorization header")

        access_token = auth_header.split(" ")[1]

        # Perform logout
        AuthService.logout(db=db, access_token=access_token)

        return LogoutResponse(message="Successfully logged out")

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Logout failed",
        )
