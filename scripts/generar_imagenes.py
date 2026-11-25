"""Genera el diagrama del pipeline y las capturas de consola (a partir de evidencias/*.log)."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "evidencias" / "img"
FUENTES = Path("C:/Windows/Fonts")


def fuente(nombre: str, tam: int):
    return ImageFont.truetype(str(FUENTES / nombre), tam)


# ---------------------------------------------------------------- diagrama
def caja(d, x, y, w, h, titulo, lineas, color, borde):
    d.rounded_rectangle([x, y, x + w, y + h], radius=22, fill=color, outline=borde, width=4)
    d.text((x + w / 2, y + 38), titulo, font=fuente("segoeuib.ttf", 34), fill="#1b1b1b", anchor="mm")
    for i, ln in enumerate(lineas):
        d.text((x + w / 2, y + 86 + i * 34), ln, font=fuente("segoeui.ttf", 26), fill="#333333", anchor="mm")


def flecha(d, x1, y1, x2, y2, color="#455a64", w=6):
    d.line([x1, y1, x2, y2], fill=color, width=w)
    import math
    ang = math.atan2(y2 - y1, x2 - x1)
    L = 22
    p1 = (x2 - L * math.cos(ang - 0.45), y2 - L * math.sin(ang - 0.45))
    p2 = (x2 - L * math.cos(ang + 0.45), y2 - L * math.sin(ang + 0.45))
    d.polygon([(x2, y2), p1, p2], fill=color)


def diagrama():
    W, H = 2020, 1280
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    d.text((W / 2, 50), "Pipeline CI/CD – Sistema de Pedidos y Reservas del Restaurante",
           font=fuente("segoeuib.ttf", 44), fill="#0d3b66", anchor="mm")

    azul, azulb = "#e3f2fd", "#1e88e5"
    verde, verdeb = "#e8f5e9", "#43a047"
    nar, narb = "#fff3e0", "#fb8c00"
    mor, morb = "#f3e5f5", "#8e24aa"
    bw, bh = 400, 230

    # Fila 1: integración continua
    d.text((60, 120), "INTEGRACIÓN CONTINUA (CI)", font=fuente("segoeuib.ttf", 30), fill=azulb)
    y1 = 170
    caja(d, 60, y1, bw, bh, "1. Código", ["Git (rama feature)", "Pull Request", "Revisión de código"], azul, azulb)
    caja(d, 560, y1, bw, bh, "2. Build y lint", ["GitHub Actions", "flake8 · compileall", "pip install"], azul, azulb)
    caja(d, 1060, y1 - 20, bw, 150, "3a. Pruebas", ["pytest · cobertura ≥ 80 %"], verde, verdeb)
    caja(d, 1060, y1 + 150, bw, 150, "3b. Seguridad", ["Bandit · pip-audit"], verde, verdeb)
    caja(d, 1560, y1, bw, bh, "4. Empaquetado", ["Docker build", "Escaneo Trivy", "Push a GHCR"], azul, azulb)
    flecha(d, 460, y1 + bh / 2, 556, y1 + bh / 2)
    flecha(d, 960, y1 + bh / 2, 1056, y1 + 55)
    flecha(d, 960, y1 + bh / 2, 1056, y1 + 225)
    flecha(d, 1460, y1 + 55, 1556, y1 + bh / 2)
    flecha(d, 1460, y1 + 225, 1556, y1 + bh / 2)
    d.text((1260, y1 + 310), "(en paralelo)", font=fuente("segoeuii.ttf", 24), fill="#666666", anchor="mm")

    # conexión a fila 2
    flecha(d, 1760, y1 + bh, 1760, 600)
    d.line([1760, 560, 1760, 600], fill="#455a64", width=6)

    # Fila 2: entrega continua
    d.text((60, 520), "ENTREGA / DESPLIEGUE CONTINUO (CD)", font=fuente("segoeuib.ttf", 30), fill=narb)
    y2 = 600
    caja(d, 1560, y2, bw, bh, "5. Staging", ["docker compose up", "Prueba de humo /health", "Carga: p95 < 300 ms"], nar, narb)
    caja(d, 1060, y2, bw, bh, "6. Aprobación", ["Environment protegido", "Revisor autoriza", "(solo rama main)"], nar, narb)
    caja(d, 560, y2, bw, bh, "7. Producción", ["Blue-green", "Cambio de tráfico", "Monitoreo"], mor, morb)
    caja(d, 60, y2, bw, bh, "Usuario final", ["Reservas · Pedidos", "Confirmaciones", "Reportes"], "#eceff1", "#607d8b")
    flecha(d, 1560, y2 + bh / 2, 1464, y2 + bh / 2)
    flecha(d, 1060, y2 + bh / 2, 964, y2 + bh / 2)
    flecha(d, 560, y2 + bh / 2, 464, y2 + bh / 2)

    # Ruta de fallo
    yf = 950
    d.rounded_rectangle([60, yf, 1960, yf + 150], radius=22, fill="#ffebee", outline="#e53935", width=4)
    d.text((W / 2, yf + 45), "Si cualquier etapa falla → el pipeline se detiene",
           font=fuente("segoeuib.ttf", 34), fill="#b71c1c", anchor="mm")
    d.text((W / 2, yf + 100),
           "Las etapas siguientes se omiten · se notifica al autor del commit · no se despliega · rollback a la versión estable",
           font=fuente("segoeui.ttf", 27), fill="#5d1010", anchor="mm")
    for x in (1260, 1760):
        flecha(d, x, 840, x, yf - 2, color="#e53935", w=4)

    # Leyenda
    ly = 1150
    items = [(azul, azulb, "Construcción / empaquetado"), (verde, verdeb, "Validación de calidad y seguridad"),
             (nar, narb, "Despliegue controlado"), (mor, morb, "Producción")]
    x = 90
    for c, b, t in items:
        d.rounded_rectangle([x, ly, x + 44, ly + 44], radius=8, fill=c, outline=b, width=3)
        d.text((x + 60, ly + 22), t, font=fuente("segoeui.ttf", 28), fill="#333333", anchor="lm")
        x += 470
    d.text((W / 2, 1240), "Disparadores: push a main/develop · pull request a main · ejecución manual",
           font=fuente("segoeuii.ttf", 26), fill="#555555", anchor="mm")
    img.save(SALIDA / "diagrama_pipeline.png")


# --------------------------------------------------------- capturas consola
def consola(lineas: list[str], nombre: str, titulo: str):
    f = fuente("consola.ttf", 26)
    alto_linea = 34
    ancho = 1900
    alto = 90 + alto_linea * len(lineas) + 30
    img = Image.new("RGB", (ancho, alto), "#1e1e1e")
    d = ImageDraw.Draw(img)
    d.rectangle([0, 0, ancho, 56], fill="#323233")
    for i, c in enumerate(("#ff5f56", "#ffbd2e", "#27c93f")):
        d.ellipse([22 + i * 36, 18, 42 + i * 36, 38], fill=c)
    d.text((ancho / 2, 28), titulo, font=fuente("segoeui.ttf", 24), fill="#cccccc", anchor="mm")
    y = 80
    for ln in lineas:
        color = "#d4d4d4"
        if ln.startswith("$"):
            color = "#9cdcfe"
        elif "ETAPA" in ln or ln.startswith("====="):
            color = "#c586c0"
        if any(k in ln for k in ("FALL", "FAILED", "Error", ">> Issue", "Severity: High", "E    ")):
            color = "#f48771"
        if any(k in ln for k in (": OK", " OK ", "passed", "CUMPLIDO", "ÉXITO", "-> 200", "reached")):
            color = "#89d185"
        if "OMITIDA" in ln:
            color = "#808080"
        if ln.startswith("[commit simulado]"):
            color = "#dcdcaa"
        d.text((28, y), ln[:118], font=f, fill=color)
        y += alto_linea
    img.save(SALIDA / nombre)


def leer(nombre: str) -> list[str]:
    texto = (RAIZ / "evidencias" / nombre).read_text(encoding="utf-8")
    return [ln.replace("\t", "    ") for ln in texto.splitlines()]


def recortar(lineas, desde, hasta=None):
    i = next(k for k, ln in enumerate(lineas) if desde in ln)
    j = len(lineas) if hasta is None else next(k for k, ln in enumerate(lineas) if hasta in ln and k > i)
    return lineas[i:j]


def capturas():
    ok = leer("pipeline_exitoso.log")
    ok = [ln for ln in ok if "generated xml" not in ln and "coverage: platform" not in ln]
    consola(ok[:2] + recortar(ok, "ETAPA: 1.", "Name ") + ["   ...   (tabla de cobertura: 7 módulos al 100 %)"]
            + recortar(ok, "Required test coverage", "ETAPA: 5"), "consola_exitoso_1.png",
            "Ejecución 1 — camino feliz (etapas 1 a 4)")
    consola(recortar(ok, "ETAPA: 5"), "consola_exitoso_2.png", "Ejecución 1 — staging y resumen")

    pr = leer("pipeline_pruebas.log")
    pr = [ln for ln in pr if "generated xml" not in ln
          and not ln.startswith(("client =", "headers =", "manana ="))]
    consola(pr[1:3] + recortar(pr, "ETAPA: 2.", "tests coverage") + recortar(pr, "short test summary"),
            "consola_fallo_pruebas.png", "Ejecución 2 — fallo en pruebas unitarias")

    se = leer("pipeline_seguridad.log")
    consola(se[1:3] + recortar(se, "ETAPA: 3.", "Run started") + recortar(se, ">> Issue", "-----")
            + recortar(se, "---> 3."), "consola_fallo_seguridad.png", "Ejecución 3 — fallo en análisis de seguridad")

    re_ = leer("pipeline_rendimiento.log")
    consola(re_[1:4] + recortar(re_, "ETAPA: 5."), "consola_fallo_rendimiento.png",
            "Ejecución 4 — fallo en prueba de rendimiento")


if __name__ == "__main__":
    SALIDA.mkdir(parents=True, exist_ok=True)
    diagrama()
    capturas()
    print("Imágenes generadas en", SALIDA)
