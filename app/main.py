"""API REST del sistema de restaurante."""
from datetime import date

from fastapi import Depends, FastAPI
from pydantic import BaseModel

from app import __version__, auth, pedidos, reportes, reservas

app = FastAPI(title="Restaurante API", version=__version__)


class Credenciales(BaseModel):
    usuario: str
    password: str


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": __version__}


@app.post("/auth/registro", status_code=201)
def registro(c: Credenciales) -> dict:
    auth.registrar(c.usuario, c.password)
    return {"mensaje": "Usuario registrado"}


@app.post("/auth/login")
def login(c: Credenciales) -> dict:
    return {"token": auth.login(c.usuario, c.password)}


@app.get("/mesas/disponibles")
def disponibilidad(fecha: date, turno: str, personas: int = 1) -> dict:
    return {"mesas": reservas.mesas_disponibles(fecha, turno, personas)}


@app.post("/reservas", status_code=201)
def nueva_reserva(s: reservas.SolicitudReserva, usuario: str = Depends(auth.usuario_actual)) -> dict:
    return reservas.crear_reserva(usuario, s)


@app.get("/reservas")
def mis_reservas(usuario: str = Depends(auth.usuario_actual)) -> list[dict]:
    return reservas.listar(usuario)


@app.get("/menu")
def menu() -> dict:
    return pedidos.MENU


@app.post("/pedidos", status_code=201)
def nuevo_pedido(s: pedidos.SolicitudPedido, usuario: str = Depends(auth.usuario_actual)) -> dict:
    return pedidos.crear_pedido(usuario, s)


@app.patch("/pedidos/{pedido_id}/estado")
def avanzar(pedido_id: int, usuario: str = Depends(auth.usuario_actual)) -> dict:
    return pedidos.avanzar_estado(pedido_id)


@app.get("/reportes/resumen")
def resumen(usuario: str = Depends(auth.usuario_actual)) -> dict:
    return reportes.resumen()
