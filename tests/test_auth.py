def test_registro_y_login(client):
    r = client.post("/auth/registro", json={"usuario": "luis", "password": "clave1234"})
    assert r.status_code == 201
    r = client.post("/auth/login", json={"usuario": "luis", "password": "clave1234"})
    assert r.status_code == 200
    assert len(r.json()["token"]) == 32


def test_usuario_duplicado(client):
    client.post("/auth/registro", json={"usuario": "luis", "password": "clave1234"})
    r = client.post("/auth/registro", json={"usuario": "luis", "password": "otra12345"})
    assert r.status_code == 409


def test_password_corta_rechazada(client):
    r = client.post("/auth/registro", json={"usuario": "luis", "password": "123"})
    assert r.status_code == 422


def test_credenciales_invalidas(client):
    client.post("/auth/registro", json={"usuario": "luis", "password": "clave1234"})
    r = client.post("/auth/login", json={"usuario": "luis", "password": "incorrecta"})
    assert r.status_code == 401


def test_endpoint_protegido_sin_token(client):
    assert client.get("/reservas").status_code == 401
