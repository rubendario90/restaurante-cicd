"""Módulo de reservas y disponibilidad de mesas."""
from datetime import date

from fastapi import HTTPException
from pydantic import BaseModel, Field

from app import notificaciones

MESAS = {1: 2, 2: 2, 3: 4, 4: 4, 5: 6, 6: 8}  # número de mesa -> capacidad
TURNOS = ("13:00", "15:00", "19:00", "21:00")

_reservas: list[dict] = []


class SolicitudReserva(BaseModel):
    fecha: date
    turno: str
    personas: int = Field(gt=0, le=8)


def mesas_disponibles(fecha: date, turno: str, personas: int = 1) -> list[int]:
    ocupadas = {r["mesa"] for r in _reservas if r["fecha"] == fecha and r["turno"] == turno}
    return sorted(m for m, cap in MESAS.items() if m not in ocupadas and cap >= personas)


def crear_reserva(usuario: str, solicitud: SolicitudReserva) -> dict:
    if solicitud.turno not in TURNOS:
        raise HTTPException(status_code=422, detail=f"Turno no válido. Opciones: {', '.join(TURNOS)}")
    if solicitud.fecha < date.today():
        raise HTTPException(status_code=422, detail="No se puede reservar en una fecha pasada")
    libres = mesas_disponibles(solicitud.fecha, solicitud.turno, solicitud.personas)
    if not libres:
        raise HTTPException(status_code=409, detail="No hay mesas disponibles para ese turno")
    # Se asigna la mesa más pequeña que alcance para el grupo
    mesa = min(libres, key=lambda m: MESAS[m])
    reserva = {"id": len(_reservas) + 1, "usuario": usuario, "mesa": mesa, **solicitud.model_dump()}
    _reservas.append(reserva)
    notificaciones.enviar_confirmacion(
        usuario, "Reserva confirmada", f"Mesa {mesa} el {solicitud.fecha} a las {solicitud.turno}"
    )
    return reserva


def listar(usuario: str | None = None) -> list[dict]:
    return [r for r in _reservas if usuario is None or r["usuario"] == usuario]


def reiniciar() -> None:
    _reservas.clear()
