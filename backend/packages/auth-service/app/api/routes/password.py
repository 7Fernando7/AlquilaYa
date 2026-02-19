"""
Password management endpoints (reset, change)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import (
    PasswordResetRequest, PasswordResetConfirmRequest,
    PasswordResetResponse, ErrorResponse
)
from app.services.auth import AuthService

router = APIRouter(prefix="/auth/password", tags=["password"])


@router.post(
    "/reset-request",
    response_model=PasswordResetResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "User not found"},
    }
)
async def request_password_reset(
    request: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    """
    Request password reset email

    **Parameters**:
    - `email`: User email address

    **Returns**: Confirmation message

    **Note**: Password reset email contains token valid for 1 hour
    """
    try:
        AuthService.request_password_reset(db=db, email=request.email)

        return PasswordResetResponse(
            message="Password reset email sent. Please check your inbox."
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to send password reset email",
        )


@router.post(
    "/confirm-reset",
    response_model=PasswordResetResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse, "description": "Invalid or expired token"},
    }
)
async def confirm_password_reset(
    request: PasswordResetConfirmRequest,
    db: Session = Depends(get_db),
):
    """
    Confirm password reset with new password

    **Parameters**:
    - `reset_token`: Token from password reset email
    - `new_password`: New password (must meet requirements)

    **Returns**: Confirmation message

    **Note**: After successful reset, user can login with new password
    """
    try:
        AuthService.confirm_password_reset(
            db=db,
            reset_token=request.reset_token,
            new_password=request.new_password,
        )

        return PasswordResetResponse(
            message="Password reset successfully. You can now login with your new password."
        )

    except ValueError as e:
        error_msg = str(e)
        if "expired" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset token has expired",
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg,
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset failed",
        )
