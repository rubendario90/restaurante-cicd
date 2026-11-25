"""Módulo de pedidos en línea."""
from fastapi import HTTPException
from pydantic import BaseModel, Field

from app import notificaciones

MENU = {
    "bandeja_paisa": 32000,
    "ajiaco": 25000,
    "sancocho": 24000,
    "limonada": 7000,
    "postre_del_dia": 9000,
}
ESTADOS = ("recibido", "en_preparacion", "listo", "entregado")

_pedidos: list[dict] = []


class Item(BaseModel):
    plato: str
    cantidad: int = Field(gt=0, le=20)


class SolicitudPedido(BaseModel):
    items: list[Item] = Field(min_length=1)


def calcular_total(items: list[Item]) -> int:
    total = 0
    for item in items:
        if item.plato not in MENU:
            raise HTTPException(status_code=422, detail=f"El plato '{item.plato}' no está en el menú")
        total += MENU[item.plato] * item.cantidad
    return total


def crear_pedido(usuario: str, solicitud: SolicitudPedido) -> dict:
    total = calcular_total(solicitud.items)
    pedido = {
        "id": len(_pedidos) + 1,
        "usuario": usuario,
        "items": [i.model_dump() for i in solicitud.items],
        "total": total,
        "estado": "recibido",
    }
    _pedidos.append(pedido)
    notificaciones.enviar_confirmacion(usuario, "Pedido recibido", f"Pedido #{pedido['id']} por ${total:,}")
    return pedido


def avanzar_estado(pedido_id: int) -> dict:
    pedido = next((p for p in _pedidos if p["id"] == pedido_id), None)
    if pedido is None:
        raise HTTPException(status_code=404, detail="Pedido no encontrado")
    i = ESTADOS.index(pedido["estado"])
    if i == len(ESTADOS) - 1:
        raise HTTPException(status_code=409, detail="El pedido ya fue entregado")
    pedido["estado"] = ESTADOS[i + 1]
    return pedido


def listar(usuario: str | None = None) -> list[dict]:
    return [p for p in _pedidos if usuario is None or p["usuario"] == usuario]


def reiniciar() -> None:
    _pedidos.clear()
