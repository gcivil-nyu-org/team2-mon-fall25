"""
Auth0 JWT Token Validator
Fetches public keys from Auth0 and validates JWT tokens.
"""
import json
import jwt
import requests
from functools import lru_cache
from typing import Dict, Optional
from django.conf import settings


class Auth0TokenValidator:
    """Validates Auth0 JWT tokens"""

    def __init__(self):
        self.domain = settings.AUTH0_DOMAIN
        self.audience = settings.AUTH0_AUDIENCE
        self.issuer = f"https://{self.domain}/"
        self.algorithms = ["RS256"]

    @lru_cache(maxsize=1)
    def get_jwks(self) -> Dict:
        """Fetch JSON Web Key Set from Auth0 (cached)"""
        jwks_url = f"https://{self.domain}/.well-known/jwks.json"
        try:
            response = requests.get(jwks_url, timeout=10)
            response.raise_for_status()
            return response.json()
        except requests.RequestException as e:
            raise ValueError(f"Failed to fetch JWKS: {str(e)}")

    def get_public_key(self, token: str) -> str:
        """Extract public key from JWKS based on token's kid"""
        try:
            # Decode header without verification to get kid
            unverified_header = jwt.get_unverified_header(token)
            kid = unverified_header.get("kid")

            if not kid:
                raise ValueError("Token missing 'kid' in header")

            # Find matching key in JWKS
            jwks = self.get_jwks()
            for key in jwks.get("keys", []):
                if key.get("kid") == kid:
                    # Convert JWK to PEM format
                    return jwt.algorithms.RSAAlgorithm.from_jwk(json.dumps(key))

            raise ValueError(f"Public key not found for kid: {kid}")
        except Exception as e:
            raise ValueError(f"Error extracting public key: {str(e)}")

    def validate_token(self, token: str) -> Optional[Dict]:
        """
        Validate JWT token and return decoded payload
        Returns None if validation fails
        """
        try:
            # Get the public key for this token
            public_key = self.get_public_key(token)

            # Decode and verify the token
            payload = jwt.decode(
                token,
                public_key,
                algorithms=self.algorithms,
                audience=self.audience,
                issuer=self.issuer,
            )

            return payload
        except jwt.ExpiredSignatureError:
            raise ValueError("Token has expired")
        except jwt.InvalidAudienceError:
            raise ValueError("Invalid audience")
        except jwt.InvalidIssuerError:
            raise ValueError("Invalid issuer")
        except jwt.InvalidTokenError as e:
            raise ValueError(f"Invalid token: {str(e)}")
        except Exception as e:
            raise ValueError(f"Token validation failed: {str(e)}")


# Singleton instance
_validator = None

def get_token_validator() -> Auth0TokenValidator:
    """Get or create the token validator singleton"""
    global _validator
    if _validator is None:
        _validator = Auth0TokenValidator()
    return _validator

