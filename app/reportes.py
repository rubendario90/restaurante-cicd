"""Módulo de reportes de operación."""
from collections import Counter

from app import pedidos, reservas


def resumen() -> dict:
    lista_pedidos = pedidos.listar()
    platos: Counter = Counter()
    for p in lista_pedidos:
        for item in p["items"]:
            platos[item["plato"]] += item["cantidad"]
    return {
        "total_reservas": len(reservas.listar()),
        "total_pedidos": len(lista_pedidos),
        "ingresos": sum(p["total"] for p in lista_pedidos),
        "plato_mas_vendido": platos.most_common(1)[0][0] if platos else None,
    }
