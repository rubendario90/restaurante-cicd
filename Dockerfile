# Imagen de la API del restaurante (construcción en dos etapas)

# --- Etapa 1: instalar dependencias en un entorno virtual
FROM python:3.12-slim AS build
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY requirements.txt .
# pip, setuptools y wheel no se necesitan en ejecución: se quitan del entorno final
RUN pip install --no-cache-dir -r requirements.txt \
    && pip uninstall -y pip setuptools wheel

# --- Etapa 2: imagen final mínima, sin herramientas de instalación
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PATH="/opt/venv/bin:$PATH"
WORKDIR /srv

# Parches de seguridad del sistema base y eliminación de pip/setuptools del Python global
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && python -m pip uninstall -y pip setuptools wheel || true

COPY --from=build /opt/venv /opt/venv
COPY app ./app

# Se ejecuta con un usuario sin privilegios
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/health')"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
