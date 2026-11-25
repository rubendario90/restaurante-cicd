"""Prueba de rendimiento ligera: lanza N peticiones concurrentes y valida el percentil 95.

Uso: python tests/performance/prueba_carga.py --url http://localhost:8000 --peticiones 500 --p95-max-ms 300
Sin --url usa el TestClient en memoria (útil para la simulación local).
"""
import argparse
import statistics
import sys
import time
from concurrent.futures import ThreadPoolExecutor

RUTAS = ["/health", "/menu", "/mesas/disponibles?fecha=2030-01-01&turno=19:00&personas=2"]


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--url", default="")
    p.add_argument("--peticiones", type=int, default=300)
    p.add_argument("--concurrencia", type=int, default=20)
    p.add_argument("--p95-max-ms", type=float, default=300)
    a = p.parse_args()

    if a.url:
        import httpx
        cliente = httpx.Client(base_url=a.url, timeout=5)
    else:
        sys.path.insert(0, ".")
        from fastapi.testclient import TestClient
        from app.main import app
        cliente = TestClient(app)

    def una(i: int) -> tuple[float, int]:
        t0 = time.perf_counter()
        r = cliente.get(RUTAS[i % len(RUTAS)])
        return (time.perf_counter() - t0) * 1000, r.status_code

    with ThreadPoolExecutor(max_workers=a.concurrencia) as ex:
        resultados = list(ex.map(una, range(a.peticiones)))

    tiempos = sorted(t for t, _ in resultados)
    errores = sum(1 for _, s in resultados if s >= 500)
    p95 = tiempos[int(len(tiempos) * 0.95) - 1]
    print(f"Peticiones: {a.peticiones} | Concurrencia: {a.concurrencia}")
    print(f"Media: {statistics.mean(tiempos):.1f} ms | p95: {p95:.1f} ms | Máx: {tiempos[-1]:.1f} ms")
    print(f"Errores 5xx: {errores} | Umbral p95: {a.p95_max_ms} ms")
    if errores or p95 > a.p95_max_ms:
        print("RESULTADO: FALLÓ el criterio de rendimiento")
        return 1
    print("RESULTADO: criterio de rendimiento CUMPLIDO")
    return 0


if __name__ == "__main__":
    sys.exit(main())
