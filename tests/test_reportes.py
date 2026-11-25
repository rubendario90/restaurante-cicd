def test_health(client):
    assert client.get("/health").json()["status"] == "ok"


def test_reporte_vacio(client, headers):
    r = client.get("/reportes/resumen", headers=headers).json()
    assert r == {"total_reservas": 0, "total_pedidos": 0, "ingresos": 0, "plato_mas_vendido": None}


def test_reporte_con_datos(client, headers, manana):
    client.post("/reservas", json={"fecha": manana, "turno": "19:00", "personas": 2}, headers=headers)
    client.post("/pedidos", json={"items": [{"plato": "sancocho", "cantidad": 3}]}, headers=headers)
    client.post("/pedidos", json={"items": [{"plato": "ajiaco", "cantidad": 1}]}, headers=headers)
    r = client.get("/reportes/resumen", headers=headers).json()
    assert r["total_reservas"] == 1
    assert r["total_pedidos"] == 2
    assert r["ingresos"] == 3 * 24000 + 25000
    assert r["plato_mas_vendido"] == "sancocho"
