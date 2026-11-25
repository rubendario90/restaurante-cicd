from datetime import date, timedelta

from app import notificaciones


def test_disponibilidad_inicial(client, manana):
    r = client.get("/mesas/disponibles", params={"fecha": manana, "turno": "19:00", "personas": 4})
    assert r.json()["mesas"] == [3, 4, 5, 6]


def test_crear_reserva_asigna_mesa_adecuada(client, headers, manana):
    r = client.post("/reservas", json={"fecha": manana, "turno": "19:00", "personas": 3}, headers=headers)
    assert r.status_code == 201
    assert r.json()["mesa"] == 3  # la mesa más pequeña con capacidad >= 3


def test_reserva_envia_confirmacion(client, headers, manana):
    client.post("/reservas", json={"fecha": manana, "turno": "13:00", "personas": 2}, headers=headers)
    assert notificaciones.enviadas[-1]["asunto"] == "Reserva confirmada"


def test_mesa_ocupada_no_aparece_disponible(client, headers, manana):
    client.post("/reservas", json={"fecha": manana, "turno": "21:00", "personas": 8}, headers=headers)
    r = client.get("/mesas/disponibles", params={"fecha": manana, "turno": "21:00", "personas": 8})
    assert r.json()["mesas"] == []


def test_sin_mesas_disponibles(client, headers, manana):
    client.post("/reservas", json={"fecha": manana, "turno": "21:00", "personas": 8}, headers=headers)
    r = client.post("/reservas", json={"fecha": manana, "turno": "21:00", "personas": 7}, headers=headers)
    assert r.status_code == 409


def test_turno_invalido(client, headers, manana):
    r = client.post("/reservas", json={"fecha": manana, "turno": "03:00", "personas": 2}, headers=headers)
    assert r.status_code == 422


def test_fecha_pasada(client, headers):
    ayer = (date.today() - timedelta(days=1)).isoformat()
    r = client.post("/reservas", json={"fecha": ayer, "turno": "13:00", "personas": 2}, headers=headers)
    assert r.status_code == 422


def test_listar_mis_reservas(client, headers, manana):
    client.post("/reservas", json={"fecha": manana, "turno": "15:00", "personas": 2}, headers=headers)
    assert len(client.get("/reservas", headers=headers).json()) == 1
