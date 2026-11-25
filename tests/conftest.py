from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from app import auth, notificaciones, pedidos, reservas
from app.main import app


@pytest.fixture(autouse=True)
def estado_limpio():
    auth.reiniciar()
    reservas.reiniciar()
    pedidos.reiniciar()
    notificaciones.enviadas.clear()
    yield


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def token(client):
    client.post("/auth/registro", json={"usuario": "ana", "password": "secreta123"})
    return client.post("/auth/login", json={"usuario": "ana", "password": "secreta123"}).json()["token"]


@pytest.fixture
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def manana():
    return (date.today() + timedelta(days=1)).isoformat()
