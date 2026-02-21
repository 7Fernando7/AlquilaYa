"""
User profile management endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import (
    UserProfileResponse, PublicUserProfileResponse, UpdateProfileRequest, ErrorResponse
)
from app.services.user import UserService
from app.api.dependencies import get_current_user
from app.models import User

router = APIRouter(prefix="/users", tags=["profile"])


@router.get(
    "/{user_id}/profile",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    responses={
        404: {"model": ErrorResponse, "description": "User not found"},
    }
)
async def get_own_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get user profile (private - only user's own data)

    **Parameters**:
    - `user_id`: User ID

    **Note**: User can only view their own profile (authorization required)
    """
    # Verify user is accessing their own profile
    if str(current_user.id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other user's profile",
        )

    user = UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


@router.put(
    "/{user_id}/profile",
    response_model=UserProfileResponse,
    status_code=status.HTTP_200_OK,
    responses={
        404: {"model": ErrorResponse, "description": "User not found"},
        403: {"model": ErrorResponse, "description": "Unauthorized"},
    }
)
async def update_own_profile(
    user_id: str,
    request: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update user profile

    **Parameters**:
    - `user_id`: User ID
    - `name`: Full name (optional)
    - `phone`: Phone number (optional)
    - `bio`: User bio/description (optional)
    - `profile_photo_url`: Profile photo URL (optional)

    **Returns**: Updated user profile

    **Note**: User can only update their own profile (authorization required)
    """
    # Verify user is updating their own profile
    if str(current_user.id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot update other user's profile",
        )

    try:
        updated_user = UserService.update_profile(
            db=db,
            user_id=user_id,
            name=request.name,
            phone=request.phone,
            bio=request.bio,
            profile_photo_url=request.profile_photo_url,
        )
        return updated_user

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to update profile",
        )


@router.get(
    "/{user_id}",
    response_model=PublicUserProfileResponse,
    status_code=status.HTTP_200_OK,
    responses={
        404: {"model": ErrorResponse, "description": "User not found"},
    }
)
async def get_public_profile(
    user_id: str,
    db: Session = Depends(get_db),
):
    """
    Get public user profile (no authentication required)

    **Parameters**:
    - `user_id`: User ID

    **Returns**: Public profile information (name, bio, photo, user_type - no email)

    **Note**: This endpoint is public and returns limited profile information
    """
    user = UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return {
        "id": user.id,
        "name": user.name,
        "bio": user.bio,
        "profile_photo_url": user.profile_photo_url,
        "user_type": user.user_type.value,
    }
