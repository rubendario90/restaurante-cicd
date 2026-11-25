PEDIDO = {"items": [{"plato": "ajiaco", "cantidad": 2}, {"plato": "limonada", "cantidad": 2}]}


def test_menu_publico(client):
    assert "ajiaco" in client.get("/menu").json()


def test_crear_pedido_calcula_total(client, headers):
    r = client.post("/pedidos", json=PEDIDO, headers=headers)
    assert r.status_code == 201
    assert r.json()["total"] == 2 * 25000 + 2 * 7000
    assert r.json()["estado"] == "recibido"


def test_plato_inexistente(client, headers):
    r = client.post("/pedidos", json={"items": [{"plato": "pizza", "cantidad": 1}]}, headers=headers)
    assert r.status_code == 422


def test_pedido_vacio(client, headers):
    assert client.post("/pedidos", json={"items": []}, headers=headers).status_code == 422


def test_flujo_de_estados(client, headers):
    pid = client.post("/pedidos", json=PEDIDO, headers=headers).json()["id"]
    estados = [client.patch(f"/pedidos/{pid}/estado", headers=headers).json()["estado"] for _ in range(3)]
    assert estados == ["en_preparacion", "listo", "entregado"]
    assert client.patch(f"/pedidos/{pid}/estado", headers=headers).status_code == 409


def test_pedido_no_encontrado(client, headers):
    assert client.patch("/pedidos/999/estado", headers=headers).status_code == 404
