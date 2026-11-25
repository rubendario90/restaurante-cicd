# Restaurante API – Pipeline CI/CD

Sistema de gestión de pedidos y reservas para un restaurante (FastAPI) con su pipeline de integración y entrega continua.

## Módulos
| Módulo | Archivo | Responsabilidad |
|---|---|---|
| Autenticación | `app/auth.py` | Registro, login y tokens |
| Reservas | `app/reservas.py` | Disponibilidad de mesas y reservas |
| Pedidos | `app/pedidos.py` | Menú, pedidos y estados |
| Notificaciones | `app/notificaciones.py` | Confirmaciones automáticas |
| Reportes | `app/reportes.py` | Resumen de operación |

## Pipeline
- `.github/workflows/deploy.yml` – pipeline principal (GitHub Actions)
- `Jenkinsfile` – alternativa equivalente para Jenkins
- `Dockerfile`, `docker-compose.staging.yml` – empaquetado y entorno de staging

Etapas: build y lint → pruebas + seguridad (en paralelo) → empaquetado Docker → staging (humo + carga) → aprobación → producción.

## Ejecutar localmente
```bash
pip install -r requirements-dev.txt
pytest --cov=app                      # 22 pruebas
uvicorn app.main:app --reload         # API en http://localhost:8000/docs
```

## Simular el pipeline
```bash
python scripts/simular_pipeline.py                      # camino feliz
python scripts/simular_pipeline.py --fallo pruebas      # bug en cálculo del total
python scripts/simular_pipeline.py --fallo seguridad    # hash MD5 detectado por Bandit
python scripts/simular_pipeline.py --fallo rendimiento  # consulta lenta, p95 > 300 ms
python scripts/generar_imagenes.py                      # diagrama y capturas en evidencias/img
```
Los registros de cada ejecución quedan en `evidencias/`.

## Documento de entrega
El informe AA2 está en [`docs/AA2_Pipeline_SistemaRestaurante.pdf`](docs/AA2_Pipeline_SistemaRestaurante.pdf) (también en `.docx`). Se regenera con `node scripts/generar_documento.js` (requiere `npm install docx`).

Autor: Ruben Dario Bayona Galvis · Gestión del Software · Tecnológica del Oriente
