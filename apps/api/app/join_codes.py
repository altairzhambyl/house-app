"""Flat join codes: the credential a resident types to link their account to a flat.

Mirrors public.generate_join_code() in supabase/migrations; the flats.join_code
check constraint rejects anything outside this alphabet.
"""

import re
import secrets

# No look-alikes: 0/O and 1/I/L are left out.
ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
LENGTH = 10
_VALID = re.compile(rf"^[{ALPHABET}]{{{LENGTH}}}$")
_SEPARATORS = re.compile(r"[\s-]+")


def generate() -> str:
    return "".join(secrets.choice(ALPHABET) for _ in range(LENGTH))


def normalize(raw: str) -> str | None:
    """The code as stored, or None if it cannot be one.

    Case-insensitive; spaces and dashes (as in "HVWX-A234-5B") are ignored.
    """
    code = _SEPARATORS.sub("", raw).upper()
    return code if _VALID.match(code) else None
