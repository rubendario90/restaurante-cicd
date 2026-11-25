# Imagen de la API del restaurante
FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv

# Parches de seguridad del sistema base y herramientas de empaquetado actualizadas
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir --upgrade pip \
    && pip uninstall -y setuptools wheel || true

# setuptools y wheel no se necesitan en tiempo de ejecución; se eliminan para reducir la superficie de ataque
RUN find / -path /proc -prune -o \( -name "setuptools*" -o -name "wheel-*" \) -print -exec rm -rf {} + 2>/dev/null || true

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Se ejecuta con un usuario sin privilegios
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/health')"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
