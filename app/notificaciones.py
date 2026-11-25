"""Módulo de confirmaciones automáticas (simulado: registra los mensajes enviados)."""
enviadas: list[dict] = []


def enviar_confirmacion(usuario: str, asunto: str, detalle: str) -> dict:
    mensaje = {"para": usuario, "asunto": asunto, "detalle": detalle}
    enviadas.append(mensaje)
    return mensaje
