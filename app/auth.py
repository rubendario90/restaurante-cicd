"""Módulo de autenticación de usuarios (tokens simples para el entorno de pruebas)."""
import hashlib
import secrets

from fastapi import Header, HTTPException

_usuarios: dict[str, str] = {}
_tokens: dict[str, str] = {}


def _hash(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def registrar(usuario: str, password: str) -> None:
    if usuario in _usuarios:
        raise HTTPException(status_code=409, detail="El usuario ya existe")
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="La contraseña debe tener al menos 8 caracteres")
    _usuarios[usuario] = _hash(password)


def login(usuario: str, password: str) -> str:
    if _usuarios.get(usuario) != _hash(password):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    token = secrets.token_hex(16)
    _tokens[token] = usuario
    return token


def usuario_actual(authorization: str = Header(default="")) -> str:
    token = authorization.removeprefix("Bearer ").strip()
    if token not in _tokens:
        raise HTTPException(status_code=401, detail="Token inválido o ausente")
    return _tokens[token]


def reiniciar() -> None:
    _usuarios.clear()
    _tokens.clear()
