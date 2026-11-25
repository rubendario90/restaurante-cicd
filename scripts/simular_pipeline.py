"""Simulador local del pipeline CI/CD.

Ejecuta, en una copia temporal del proyecto, las mismas etapas que el workflow
.github/workflows/deploy.yml: build/lint -> pruebas -> seguridad -> empaquetado -> staging.
Permite inyectar fallos para demostrar cómo el pipeline detiene la entrega.

Uso:
    python scripts/simular_pipeline.py                      # ejecución exitosa
    python scripts/simular_pipeline.py --fallo pruebas      # bug en el cálculo del total de pedidos
    python scripts/simular_pipeline.py --fallo seguridad    # hash débil (MD5) en autenticación
    python scripts/simular_pipeline.py --fallo rendimiento  # umbral de latencia imposible de cumplir
"""
import argparse
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request
from datetime import datetime
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
PY = sys.executable

# escenario -> lista de (archivo, texto original, texto defectuoso)
FALLOS = {
    "pruebas": [("app/pedidos.py", "total += MENU[item.plato] * item.cantidad", "total += MENU[item.plato]")],
    "seguridad": [("app/auth.py", 'hashlib.sha256(password.encode("utf-8"))', 'hashlib.md5(password.encode("utf-8"))')],
    # Consulta de disponibilidad sin optimizar: simula un recorrido lento de ~400 ms por petición
    "rendimiento": [("app/reservas.py", "from datetime import date", "import time\nfrom datetime import date"),
                    ("app/reservas.py", "    ocupadas = {", "    time.sleep(0.4)\n    ocupadas = {")],
}


class Pipeline:
    def __init__(self, trabajo: Path, log):
        self.trabajo = trabajo
        self.log = log
        self.resultados: list[tuple[str, str, float]] = []

    def escribir(self, texto: str = "") -> None:
        print(texto)
        self.log.write(texto + "\n")

    def ejecutar(self, comando: list[str]) -> int:
        self.escribir("$ " + " ".join(c.replace(PY, "python") for c in comando))
        p = subprocess.run(comando, cwd=self.trabajo, capture_output=True, text=True,
                           encoding="utf-8", errors="replace")
        salida = (p.stdout + p.stderr).strip()
        if salida:
            self.escribir(salida)
        return p.returncode

    def etapa(self, nombre: str, funcion) -> bool:
        self.escribir(f"\n========== ETAPA: {nombre} ==========")
        t0 = time.perf_counter()
        ok = funcion()
        dur = time.perf_counter() - t0
        estado = "OK" if ok else "FALLÓ"
        self.resultados.append((nombre, estado, dur))
        self.escribir(f"---> {nombre}: {estado} ({dur:.1f} s)")
        return ok


def puerto_libre() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--fallo", choices=["pruebas", "seguridad", "rendimiento"])
    args = ap.parse_args()

    nombre_log = f"pipeline_{args.fallo or 'exitoso'}.log"
    (RAIZ / "evidencias").mkdir(exist_ok=True)
    trabajo = Path(tempfile.mkdtemp(prefix="pipeline_"))
    shutil.copytree(RAIZ, trabajo, dirs_exist_ok=True,
                    ignore=shutil.ignore_patterns(".git", "__pycache__", "evidencias", ".coverage"))

    with open(RAIZ / "evidencias" / nombre_log, "w", encoding="utf-8") as log:
        pl = Pipeline(trabajo, log)
        pl.escribir(f"Pipeline CI/CD Restaurante - ejecución {datetime.now():%Y-%m-%d %H:%M:%S}")
        pl.escribir(f"Escenario: {args.fallo or 'sin fallos (camino feliz)'}")

        for archivo, original, defectuoso in FALLOS.get(args.fallo, []):
            ruta = trabajo / archivo
            ruta.write_text(ruta.read_text(encoding="utf-8").replace(original, defectuoso), encoding="utf-8")
            antes, despues = (t.strip().replace("\n", " ; ") for t in (original, defectuoso))
            pl.escribir(f"[commit simulado] {archivo}: '{antes}' -> '{despues}'")

        p95_max = "300"

        def build():
            return pl.ejecutar([PY, "-m", "flake8", "app", "tests"]) == 0 and \
                pl.ejecutar([PY, "-m", "compileall", "-q", "app"]) == 0

        def pruebas():
            return pl.ejecutar([PY, "-m", "pytest", "-q", "--cov=app", "--cov-fail-under=80",
                                "--cov-report=term", "--junitxml=reporte-pruebas.xml"]) == 0

        def seguridad():
            return pl.ejecutar([PY, "-m", "bandit", "-r", "app", "-ll", "-q"]) == 0

        def empaquetado():
            if shutil.which("docker"):
                return pl.ejecutar(["docker", "build", "-t", "restaurante-api:local", "."]) == 0
            pl.escribir("$ docker build -t restaurante-api:local .")
            pl.escribir("[simulado] Docker no está instalado en este equipo; se valida el Dockerfile y se")
            pl.escribir("           empaqueta la aplicación como artefacto (dist/restaurante-api.zip).")
            shutil.make_archive(str(trabajo / "dist" / "restaurante-api"), "zip", trabajo, "app")
            pl.escribir("Artefacto generado: dist/restaurante-api.zip")
            return (trabajo / "Dockerfile").exists()

        def staging():
            puerto = puerto_libre()
            url = f"http://127.0.0.1:{puerto}"
            pl.escribir(f"$ uvicorn app.main:app --port {puerto}   (entorno de staging local)")
            srv = subprocess.Popen([PY, "-m", "uvicorn", "app.main:app", "--port", str(puerto)], cwd=trabajo,
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            try:
                for _ in range(30):
                    try:
                        with urllib.request.urlopen(url + "/health", timeout=1) as r:  # nosec B310 - URL local
                            pl.escribir(f"Prueba de humo GET /health -> {r.status} {r.read().decode()}")
                            break
                    except OSError:
                        time.sleep(0.3)
                else:
                    pl.escribir("Prueba de humo: el servicio no respondió")
                    return False
                return pl.ejecutar([PY, "tests/performance/prueba_carga.py", "--url", url,
                                    "--peticiones", "500", "--p95-max-ms", p95_max]) == 0
            finally:
                srv.terminate()
                srv.wait()

        etapas = [("1. Build y lint", build), ("2. Pruebas", pruebas), ("3. Seguridad", seguridad),
                  ("4. Empaquetado", empaquetado), ("5. Despliegue a staging", staging)]
        exito = True
        for nombre, f in etapas:
            if not pl.etapa(nombre, f):
                exito = False
                restantes = [n for n, _ in etapas[etapas.index((nombre, f)) + 1:]]
                for n in restantes:
                    pl.resultados.append((n, "OMITIDA", 0.0))
                break

        pl.escribir("\n================ RESUMEN ================")
        for nombre, estado, dur in pl.resultados:
            pl.escribir(f"{nombre:<28} {estado:<8} {dur:5.1f} s")
        if exito:
            pl.escribir("PIPELINE: ÉXITO - versión lista para producción (requiere aprobación)")
        else:
            pl.escribir("PIPELINE: FALLIDO - el despliegue se bloqueó; se mantiene la versión estable")

    shutil.rmtree(trabajo, ignore_errors=True)
    return 0 if exito else 1


if __name__ == "__main__":
    sys.exit(main())
