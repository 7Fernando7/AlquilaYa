"""
Password utilities for hashing and validation
"""

import re
from passlib.context import CryptContext

from app.config import get_settings

settings = get_settings()

# Password hashing context with bcrypt
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12,  # ~100ms per hash on modern hardware
)


class PasswordValidator:
    """Validates passwords against security requirements"""

    def __init__(self):
        self.min_length = settings.password_min_length
        self.require_uppercase = settings.password_require_uppercase
        self.require_lowercase = settings.password_require_lowercase
        self.require_digit = settings.password_require_digit
        self.require_special = settings.password_require_special
        self.special_chars = "!@#$%^&*()_+-=[]{}|;:,.<>?"

    def validate(self, password: str) -> tuple[bool, str]:
        """
        Validate password against requirements

        Returns:
            (is_valid, error_message)
        """
        if len(password) < self.min_length:
            return False, f"Password must be at least {self.min_length} characters long"

        if self.require_uppercase and not any(c.isupper() for c in password):
            return False, "Password must contain at least one uppercase letter"

        if self.require_lowercase and not any(c.islower() for c in password):
            return False, "Password must contain at least one lowercase letter"

        if self.require_digit and not any(c.isdigit() for c in password):
            return False, "Password must contain at least one digit (0-9)"

        if self.require_special and not any(c in self.special_chars for c in password):
            special_str = "".join(self.special_chars)
            return False, f"Password must contain at least one special character ({special_str})"

        return True, ""

    def get_requirements_text(self) -> str:
        """Get human-readable password requirements"""
        requirements = []

        requirements.append(f"At least {self.min_length} characters")

        if self.require_uppercase:
            requirements.append("At least one uppercase letter (A-Z)")
        if self.require_lowercase:
            requirements.append("At least one lowercase letter (a-z)")
        if self.require_digit:
            requirements.append("At least one digit (0-9)")
        if self.require_special:
            special_str = "".join(self.special_chars)
            requirements.append(f"At least one special character ({special_str})")

        return "\n".join(f"• {req}" for req in requirements)


# Global password validator instance
password_validator = PasswordValidator()


def hash_password(password: str) -> str:
    """
    Hash a password using bcrypt

    Args:
        password: Plain text password

    Returns:
        Hashed password
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hash

    Args:
        plain_password: Plain text password
        hashed_password: Bcrypt hash

    Returns:
        True if password matches hash
    """
    return pwd_context.verify(plain_password, hashed_password)


def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password against security requirements

    Args:
        password: Password to validate

    Returns:
        (is_valid, error_message)
    """
    return password_validator.validate(password)


def get_password_requirements() -> str:
    """Get human-readable password requirements"""
    return password_validator.get_requirements_text()


def is_password_strong(password: str) -> bool:
    """Check if password meets requirements"""
    is_valid, _ = validate_password(password)
    return is_valid
