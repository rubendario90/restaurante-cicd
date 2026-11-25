const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, Footer, Header, PageNumber, LevelFormat, PageBreak,
} = require("docx");

// Uso: npm install docx && node scripts/generar_documento.js
const REPO = path.resolve(__dirname, "..");
const IMG = path.join(REPO, "evidencias", "img");
const OUT = process.env.OUT || path.join(REPO, "docs", "AA2_Pipeline_SistemaRestaurante.docx");

const FONT = "Calibri";
const MONO = "Consolas";
const AZUL = "0D3B66";
const W = 9360; // ancho útil (Carta, márgenes de 1")

// ---------- helpers
function runs(text, base = {}) {
  // **negrita** y `código`
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const t = m[0];
    if (t.startsWith("**")) out.push(new TextRun({ text: t.slice(2, -2), bold: true, ...base }));
    else out.push(new TextRun({ text: t.slice(1, -1), font: MONO, size: 20, ...base }));
    last = m.index + t.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}
const P = (text, opts = {}) => new Paragraph({ children: runs(text), alignment: AlignmentType.JUSTIFIED, spacing: { after: 120, line: 276 }, ...opts });
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const B = (text, level = 0) => new Paragraph({ numbering: { reference: "vinetas", level }, children: runs(text), spacing: { after: 60, line: 264 }, alignment: AlignmentType.JUSTIFIED });
const N = (text) => new Paragraph({ numbering: { reference: "numeros", level: 0 }, children: runs(text), spacing: { after: 60, line: 264 } });
const CAP = (t) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 200 }, children: [new TextRun({ text: t, italics: true, size: 19, color: "555555" })] });

function IMGP(file, widthIn) {
  const buf = fs.readFileSync(path.join(IMG, file));
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const px = widthIn * 96;
  return new Paragraph({
    alignment: AlignmentType.CENTER, spacing: { before: 120, after: 0 }, keepNext: true,
    children: [new ImageRun({ type: "png", data: buf, transformation: { width: px, height: Math.round(px * h / w) },
      altText: { title: file, description: file, name: file } })],
  });
}

const borde = { style: BorderStyle.SINGLE, size: 4, color: "B0BEC5" };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };
function TABLA(headers, rows, widths) {
  const sum = widths.reduce((a, b) => a + b, 0);
  widths = widths.map((x) => Math.round((x * W) / sum));
  widths[widths.length - 1] = W - widths.slice(0, -1).reduce((a, b) => a + b, 0);
  const celda = (t, i, head) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA }, borders: bordes,
    shading: head ? { type: ShadingType.CLEAR, fill: AZUL, color: "auto" } : undefined,
    margins: { top: 50, bottom: 50, left: 90, right: 90 },
    children: [new Paragraph({ children: head ? [new TextRun({ text: t, bold: true, color: "FFFFFF", size: 20 })] : runs(t, { size: 20 }) })],
  });
  return new Table({
    width: { size: W, type: WidthType.DXA }, columnWidths: widths,
    rows: [
      new TableRow({ tableHeader: true, children: headers.map((h, i) => celda(h, i, true)) }),
      ...rows.map((r, ri) => new TableRow({ cantSplit: true, children: r.map((c, i) => {
        const cell = celda(c, i, false);
        return ri % 2 ? cell : new TableCell({ ...cell.options, width: { size: widths[i], type: WidthType.DXA }, borders: bordes,
          shading: { type: ShadingType.CLEAR, fill: "F3F7FB", color: "auto" }, margins: { top: 50, bottom: 50, left: 90, right: 90 },
          children: [new Paragraph({ children: runs(c, { size: 20 }) })] });
      }) })),
    ],
  });
}
const CAPT = (t) => ({ __cap: t });
function ordenar(arr) {
  const out = [];
  for (const el of arr) {
    if (el && el.__cap) {
      const tabla = out.pop();
      out.push(new Paragraph({ alignment: AlignmentType.CENTER, keepNext: true, spacing: { before: 160, after: 80 },
        children: [new TextRun({ text: el.__cap, italics: true, size: 19, color: "555555" })] }));
      out.push(tabla, new Paragraph({ spacing: { after: 120 }, children: [] }));
    } else out.push(el);
  }
  return out;
}
const ESP = () => new Paragraph({ spacing: { after: 80 }, children: [] });

function CODE(text) {
  const lines = text.replace(/\r/g, "").split("\n");
  return lines.map((ln, i) => new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: "F4F4F4", color: "auto" },
    border: { left: { style: BorderStyle.SINGLE, size: 18, color: "1E88E5", space: 6 } },
    spacing: { before: i === 0 ? 80 : 0, after: i === lines.length - 1 ? 160 : 0, line: 228 },
    keepNext: i < lines.length - 1 && (lines.length < 20 || i < 8 || i > lines.length - 6), keepLines: true,
    indent: { left: 120 },
    children: [new TextRun({ text: ln.length ? ln : " ", font: MONO, size: 16 })],
  }));
}

// ---------- contenido
const YAML = `name: CI-CD Restaurante
on:
  push:          { branches: [main, develop] }
  pull_request:  { branches: [main] }
  workflow_dispatch:
env:
  IMAGE: ghcr.io/\${{ github.repository_owner }}/restaurante-api
jobs:
  build:                                   # 1. Construcción y análisis estático
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.10", cache: pip }
      - run: pip install -r requirements-dev.txt
      - run: flake8 app tests
      - run: python -m compileall -q app
  test:                                    # 2. Pruebas + cobertura mínima
    needs: build
    steps:
      - run: pytest --cov=app --cov-fail-under=80 --junitxml=reporte-pruebas.xml
      - uses: actions/upload-artifact@v4   # publica reportes aunque falle
        if: always()
  security:                                # 3. SAST + dependencias (paralelo a test)
    needs: build
    steps:
      - run: bandit -r app -ll
      - run: pip-audit -r requirements.txt
  package:                                 # 4. Imagen Docker + escaneo
    needs: [test, security]
    steps:
      - run: docker build -t $IMAGE:\${{ github.sha }} .
      - run: >                             # escaneo: falla si hay CRITICAL/HIGH
          docker run aquasec/trivy:0.57.1 image --ignore-unfixed
          --severity CRITICAL,HIGH --exit-code 1 $IMAGE:\${{ github.sha }}
      - run: docker push $IMAGE:\${{ github.sha }}
  deploy-staging:                          # 5. Staging + humo + carga
    needs: package
    environment: staging
    steps:
      - run: >                             # credenciales del registro (secreto)
          echo "\${{ secrets.GITHUB_TOKEN }}" |
          docker login ghcr.io -u \${{ github.actor }} --password-stdin
      - run: IMAGE_TAG=\${{ github.sha }} docker compose -f docker-compose.staging.yml up -d
      - run: curl -fs --retry 10 http://localhost:8000/health
      - run: python tests/performance/prueba_carga.py --url http://localhost:8000 --p95-max-ms 300
      - if: failure()                      # rollback automático
        run: IMAGE_TAG=stable docker compose -f docker-compose.staging.yml up -d
  deploy-production:                       # 6-7. Aprobación manual + blue-green
    needs: deploy-staging
    if: github.ref == 'refs/heads/main'
    environment: production                # requiere revisor
    steps:
      - run: echo "Despliegue blue-green de \${{ github.sha }}"`;

// Portada con el mismo formato institucional usado en las demás entregas del curso
const C = (text, { size = 22, bold = false, font = "Arial", before = 0, after = 0 } = {}) =>
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before, after, line: 240 },
    children: [new TextRun({ text, size, bold, font, color: "000000" })] });
const portada = [
  C("Tecnológica del Oriente", { size: 32, before: 600 }),
  C("Programa de Ingeniería de Software", { size: 22 }),
  C("ABP – Construcción de un Pipeline CI/CD para un sistema de restaurante", { size: 30, bold: true, font: FONT, before: 2600, after: 200 }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 0 }, children: [
    new TextRun({ text: "AA2 · Proyecto Integrador (ABP): ", bold: true, size: 23, font: "Times New Roman" }),
    new TextRun({ text: "Diseño, documentación y simulación de un pipeline de integración y entrega continua", size: 23, font: "Times New Roman" }),
  ] }),
  C("Estudiante", { before: 1500 }),
  C("Ruben Dario Bayona Galvis"),
  C("Asignatura: Gestión del Software", { before: 1700, after: 120 }),
  C("AA2 – Integración y entrega continua (CI/CD) · Sistema de pedidos y reservas"),
  C("Tutor: Helio Ruber Lopez Carreno", { before: 1300 }),
  C("Medellín"),
  C("24/11/2026", { before: 280 }),
  new Paragraph({ children: [new PageBreak()] }),
];

const cuerpo = [
  H1("1. Introducción"),
  H2("1.1 Contexto del sistema de restaurante"),
  P("El sistema objeto de este proyecto es una aplicación web (API REST) para la gestión de pedidos y reservas de un restaurante. Permite a los clientes registrarse e iniciar sesión, consultar la disponibilidad de mesas por fecha y turno, realizar reservas, consultar el menú, hacer pedidos en línea y recibir confirmaciones automáticas. El personal del restaurante actualiza el estado de los pedidos y consulta reportes de operación (reservas, pedidos, ingresos y plato más vendido)."),
  P("Para que el proyecto no se quedara en el papel, el sistema se implementó de forma funcional en Python con el framework **FastAPI**, junto con 22 pruebas automatizadas y los archivos reales del pipeline (`.github/workflows/deploy.yml`, `Jenkinsfile`, `Dockerfile`). Todo el código está en la carpeta `restaurante-cicd/` que acompaña este documento."),
  H2("1.2 Justificación de un pipeline automatizado"),
  P("En un restaurante, un error en producción tiene un costo inmediato: una reserva duplicada deja a un cliente sin mesa, un total mal calculado genera pérdidas o reclamos y una caída del servicio en hora pico detiene los pedidos en línea. Si la compilación, las pruebas y el despliegue se hacen a mano, dependen de que alguien recuerde ejecutarlos y lo haga siempre igual. Un pipeline CI/CD resuelve esto porque:"),
  B("**Detecta errores temprano:** cada cambio se compila y se prueba automáticamente antes de integrarse a la rama principal."),
  B("**Estandariza la entrega:** el mismo proceso, con los mismos controles, se ejecuta en cada versión, sin pasos manuales olvidados."),
  B("**Bloquea versiones defectuosas:** si una etapa falla, el despliegue no ocurre y se mantiene la versión estable."),
  B("**Acelera el ciclo de vida:** el equipo puede entregar cambios pequeños y frecuentes con confianza."),

  H1("2. Análisis del sistema"),
  H2("2.1 Funcionalidades principales"),
  TABLA(["Funcionalidad", "Descripción", "Endpoint(s)"], [
    ["Registro y autenticación", "Alta de usuarios con contraseña de mínimo 8 caracteres (hash SHA-256) y emisión de tokens de sesión.", "`POST /auth/registro`, `POST /auth/login`"],
    ["Disponibilidad de mesas", "Consulta de mesas libres según fecha, turno (13:00, 15:00, 19:00, 21:00) y número de personas.", "`GET /mesas/disponibles`"],
    ["Reservas", "Asigna la mesa más pequeña que alcance para el grupo; rechaza fechas pasadas, turnos inválidos y sobrecupo.", "`POST /reservas`, `GET /reservas`"],
    ["Pedidos en línea", "Pedido sobre el menú con cálculo del total y flujo de estados: recibido → en preparación → listo → entregado.", "`GET /menu`, `POST /pedidos`, `PATCH /pedidos/{id}/estado`"],
    ["Confirmaciones automáticas", "Envío de confirmación al crear una reserva o un pedido.", "(interno)"],
    ["Reportes", "Total de reservas, pedidos, ingresos y plato más vendido.", "`GET /reportes/resumen`"],
  ], [2.2, 4.6, 2.8]),
  CAPT("Tabla 1. Funcionalidades del sistema"),
  H2("2.2 Módulos incluidos en el pipeline"),
  P("Todos los módulos de la aplicación pasan por el pipeline; ninguno se despliega sin validación. La siguiente tabla resume qué se verifica en cada uno:"),
  TABLA(["Módulo", "Archivo", "Pruebas", "Validaciones principales"], [
    ["Autenticación", "`app/auth.py`", "5", "Registro, duplicados, contraseña corta, credenciales inválidas, acceso sin token. Revisado por Bandit (algoritmos de hash)."],
    ["Reservas", "`app/reservas.py`", "8", "Asignación de mesa, mesa ocupada, sin disponibilidad, turno inválido, fecha pasada, confirmación enviada."],
    ["Pedidos", "`app/pedidos.py`", "6", "Cálculo del total, plato inexistente, pedido vacío, transición de estados, pedido no encontrado."],
    ["Reportes y salud", "`app/reportes.py`, `app/main.py`", "3", "Reporte vacío y con datos; endpoint `/health` usado por la prueba de humo."],
    ["Notificaciones", "`app/notificaciones.py`", "(indirectas)", "Verificadas desde las pruebas de reservas y pedidos."],
  ], [1.6, 2.4, 1.0, 4.6]),
  CAPT("Tabla 2. Módulos del sistema y cobertura de pruebas"),
  H2("2.3 Puntos críticos del flujo de desarrollo que se automatizan"),
  TABLA(["Punto crítico", "Riesgo si se hace manualmente", "Automatización"], [
    ["Integración de cambios a `main`", "Código sin revisar o que no compila llega a la rama principal.", "Pull request obligatorio + pipeline en cada push/PR."],
    ["Reglas de negocio (totales, mesas)", "Errores de cálculo o reservas duplicadas en producción.", "Pruebas unitarias y de integración con cobertura mínima del 80 %."],
    ["Seguridad del código y dependencias", "Contraseñas mal protegidas o librerías vulnerables.", "Bandit, pip-audit y escaneo de imagen con Trivy."],
    ["Empaquetado", "\"En mi máquina funciona\": diferencias entre entornos.", "Imagen Docker inmutable etiquetada con el hash del commit."],
    ["Despliegue y verificación", "Versión caída o lenta en hora pico.", "Staging automático, prueba de humo, prueba de carga y rollback."],
    ["Paso a producción", "Despliegues no autorizados.", "Aprobación manual en un entorno protegido y estrategia blue-green."],
  ], [2.3, 3.4, 3.9]),
  CAPT("Tabla 3. Puntos críticos automatizados"),

  H1("3. Diseño del pipeline CI/CD"),
  H2("3.1 Etapas del pipeline"),
  P("El pipeline se dispara con cada push a `main` o `develop`, con cada pull request hacia `main` y de forma manual. Las etapas se encadenan con dependencias (`needs`): una etapa solo empieza si las anteriores terminaron con éxito."),
  TABLA(["#", "Etapa", "Qué hace", "Criterio para continuar"], [
    ["1", "Código", "El desarrollador trabaja en una rama, abre un pull request y otro integrante revisa el código.", "PR aprobado por al menos un revisor."],
    ["2", "Build y lint", "Instala dependencias, revisa el estilo con flake8 y verifica que todo compile.", "Cero errores de lint y de compilación."],
    ["3a", "Pruebas", "Ejecuta las 22 pruebas con pytest y mide cobertura; publica reportes JUnit y XML.", "100 % de pruebas exitosas y cobertura ≥ 80 %."],
    ["3b", "Seguridad", "Análisis estático (Bandit) y auditoría de dependencias (pip-audit). Corre en paralelo con 3a.", "Sin hallazgos de severidad media o alta."],
    ["4", "Empaquetado", "Construye la imagen Docker, la escanea con Trivy y la publica en el registro.", "Sin vulnerabilidades CRITICAL/HIGH."],
    ["5", "Staging", "Levanta la imagen con Docker Compose, ejecuta la prueba de humo y la de carga.", "`/health` responde 200 y p95 < 300 ms sin errores 5xx."],
    ["6", "Aprobación", "Un responsable autoriza el paso a producción (solo desde `main`).", "Aprobación registrada."],
    ["7", "Producción", "Despliegue blue-green: se publica en el entorno inactivo y se cambia el tráfico.", "Monitoreo sin alertas; si falla, se revierte el tráfico."],
  ], [0.5, 1.4, 4.4, 3.0]),
  CAPT("Tabla 4. Etapas del pipeline y criterios de aprobación"),
  H2("3.2 Herramientas utilizadas"),
  TABLA(["Necesidad", "Herramienta", "Uso en el pipeline"], [
    ["Control de versiones", "Git + GitHub", "Ramas, pull requests, revisión de código y disparo del pipeline."],
    ["Orquestación", "GitHub Actions (alternativa: Jenkins)", "Ejecuta las etapas; se incluye un `Jenkinsfile` equivalente."],
    ["Lenguaje y framework", "Python 3.10, FastAPI, Uvicorn", "Implementación de la API del restaurante."],
    ["Calidad de código", "flake8", "Estilo y errores comunes (líneas de máximo 120 caracteres)."],
    ["Pruebas", "pytest, pytest-cov, TestClient", "Pruebas unitarias e integración de la API; umbral de cobertura."],
    ["Seguridad", "Bandit, pip-audit, Trivy", "SAST, vulnerabilidades en dependencias y en la imagen."],
    ["Empaquetado", "Docker, GitHub Container Registry", "Imagen inmutable, usuario sin privilegios y healthcheck."],
    ["Despliegue", "Docker Compose, environments de GitHub", "Staging automático y producción con aprobación."],
    ["Rendimiento", "`prueba_carga.py` (httpx + hilos); k6 o Locust en producción", "Carga concurrente y verificación del percentil 95."],
  ], [2.0, 3.2, 4.4]),
  CAPT("Tabla 5. Herramientas por etapa"),
  H2("3.3 Diagrama del pipeline"),
  IMGP("diagrama_pipeline.png", 6.5),
  CAP("Figura 1. Diagrama del pipeline CI/CD completo, con la ruta de fallo"),
  H2("3.4 Archivo de configuración"),
  P("A continuación se presenta una versión resumida del archivo `.github/workflows/deploy.yml`. El archivo completo y el `Jenkinsfile` equivalente se entregan en la carpeta del proyecto."),
  ...CODE(YAML),

  H1("4. Simulación de la ejecución del pipeline"),
  H2("4.1 Cómo se simuló"),
  P("Como no se contaba con un repositorio remoto ni con Docker instalado en el equipo de trabajo, se construyó el script `scripts/simular_pipeline.py`, que reproduce localmente las mismas etapas del workflow con las herramientas reales (flake8, pytest, Bandit, Uvicorn). Para cada ejecución el script:"),
  N("Copia el proyecto a una carpeta temporal, que hace las veces de agente de CI limpio."),
  N("Opcionalmente aplica un “commit defectuoso” para provocar un fallo controlado."),
  N("Ejecuta las etapas en orden; si una falla, marca las siguientes como **OMITIDA** y bloquea el despliegue."),
  N("En la etapa de staging levanta la API con Uvicorn, hace la prueba de humo a `/health` y lanza 500 peticiones concurrentes."),
  N("Guarda el registro completo en `evidencias/pipeline_<escenario>.log`."),
  P("La etapa de empaquetado es la única simulada: al no haber Docker, se valida la existencia del `Dockerfile` y se genera el artefacto `dist/restaurante-api.zip`. En GitHub Actions esta etapa ejecuta `docker build` y Trivy de verdad."),
  ...CODE(`$ python scripts/simular_pipeline.py                      # camino feliz
$ python scripts/simular_pipeline.py --fallo pruebas      # bug en el cálculo del total
$ python scripts/simular_pipeline.py --fallo seguridad    # hash MD5 en autenticación
$ python scripts/simular_pipeline.py --fallo rendimiento  # consulta lenta de disponibilidad`),
  H2("4.2 Resultados esperados y obtenidos por etapa"),
  TABLA(["Etapa", "Resultado esperado", "Resultado obtenido (ejecución 1)"], [
    ["1. Build y lint", "flake8 sin hallazgos y compilación correcta.", "OK: cero hallazgos."],
    ["2. Pruebas", "22 pruebas exitosas y cobertura ≥ 80 %.", "OK: 22 aprobadas, cobertura del 100 %."],
    ["3. Seguridad", "Bandit sin hallazgos de severidad media o alta.", "OK: sin hallazgos."],
    ["4. Empaquetado", "Imagen (o artefacto) generado.", "OK: artefacto `restaurante-api.zip` (simulado)."],
    ["5. Staging", "Humo HTTP 200; p95 < 300 ms; 0 errores 5xx.", "OK: HTTP 200; media 88,5 ms; p95 147,7 ms; 0 errores."],
  ], [1.8, 3.8, 4.0]),
  CAPT("Tabla 6. Resultados de la ejecución exitosa"),
  H2("4.3 Evidencia: ejecución exitosa"),
  IMGP("consola_exitoso_1.png", 6.2),
  CAP("Figura 2. Etapas 1 a 4 de la ejecución exitosa"),
  IMGP("consola_exitoso_2.png", 6.2),
  CAP("Figura 3. Staging (prueba de humo y de carga) y resumen del pipeline"),
  H2("4.4 Fallos simulados y medidas de corrección"),
  P("**Fallo 1 – Pruebas unitarias.** Se simuló un commit en el que el desarrollador quitó la multiplicación por la cantidad al calcular el total del pedido. El código compila y pasa el lint, pero dos pruebas detectan el error: un pedido de 2 ajiacos y 2 limonadas devolvió $32.000 en lugar de $64.000, y el reporte de ingresos también quedó mal. El pipeline se detuvo en la etapa 2 y no se desplegó nada."),
  IMGP("consola_fallo_pruebas.png", 5.6),
  CAP("Figura 4. Fallo en la etapa de pruebas: seguridad, empaquetado y staging se omiten"),
  P("**Corrección:** el autor recibe la notificación del fallo, revisa el reporte JUnit, restaura `MENU[item.plato] * item.cantidad`, ejecuta `pytest` localmente y vuelve a hacer push; el pipeline se ejecuta de nuevo desde el inicio. Como medida preventiva, se protege la rama `main` para que no se pueda fusionar un PR con el pipeline en rojo."),
  P("**Fallo 2 – Análisis de seguridad.** Se simuló un cambio que reemplaza SHA-256 por MD5 para el hash de contraseñas. Las 22 pruebas siguen pasando, porque el comportamiento funcional no cambia; sin embargo, Bandit detecta el problema (B324, severidad alta, CWE-327) y bloquea el pipeline en la etapa 3."),
  IMGP("consola_fallo_seguridad.png", 6.2),
  CAP("Figura 5. Bandit detecta el uso de MD5 y detiene el pipeline"),
  P("**Corrección:** volver a un algoritmo robusto. En una versión productiva se recomienda una función de derivación de claves con sal, como `bcrypt` o `argon2`, en lugar de SHA-256 simple. Este caso muestra que las pruebas funcionales no bastan: la seguridad necesita su propia etapa."),
  P("**Fallo 3 – Rendimiento.** Se simuló una consulta de disponibilidad sin optimizar que tarda unos 400 ms. Todas las etapas anteriores pasan, pero en staging la prueba de carga mide un p95 de 478,2 ms, por encima del umbral de 300 ms, y el despliegue se bloquea."),
  IMGP("consola_fallo_rendimiento.png", 6.2),
  CAP("Figura 6. La prueba de carga en staging detecta la degradación de rendimiento"),
  P("**Corrección:** perfilar el endpoint, indexar o cachear la consulta de mesas ocupadas por fecha y turno, y volver a ejecutar la prueba de carga. Mientras tanto, el paso `if: failure()` del workflow restaura en staging la imagen etiquetada como `stable`."),
  TABLA(["Escenario", "Etapa que falla", "Detectado por", "Efecto en el pipeline"], [
    ["Bug en cálculo del total", "2. Pruebas", "pytest (2 de 22 fallan)", "Etapas 3 a 5 omitidas; sin despliegue."],
    ["Hash MD5 en contraseñas", "3. Seguridad", "Bandit B324 (alta)", "Etapas 4 y 5 omitidas; sin despliegue."],
    ["Consulta lenta", "5. Staging", "Prueba de carga (p95 478 ms)", "Despliegue bloqueado; rollback a `stable`."],
  ], [2.4, 1.6, 2.6, 3.0]),
  CAPT("Tabla 7. Resumen de los fallos simulados"),

  H1("5. Validación de requisitos no funcionales"),
  P("Además de comprobar que el sistema hace lo que debe, el pipeline verifica cómo lo hace. Cada requisito no funcional tiene un umbral medible y una etapa que lo hace cumplir:"),
  TABLA(["Requisito", "Técnica / herramienta", "Umbral", "Etapa"], [
    ["Rendimiento", "Prueba de carga concurrente (`prueba_carga.py`; k6/Locust a mayor escala)", "p95 < 300 ms con 20 usuarios concurrentes; 0 errores 5xx", "5. Staging"],
    ["Seguridad del código", "Análisis estático (SAST) con Bandit", "Cero hallazgos de severidad media o alta", "3b. Seguridad"],
    ["Seguridad de dependencias", "pip-audit (base de datos de vulnerabilidades de PyPI)", "Cero vulnerabilidades conocidas", "3b. Seguridad"],
    ["Seguridad de la imagen", "Trivy; contenedor con usuario sin privilegios", "Cero CRITICAL/HIGH", "4. Empaquetado"],
    ["Disponibilidad", "Prueba de humo, `HEALTHCHECK` en Docker, `restart: unless-stopped`, blue-green y rollback", "`/health` = 200 en ≤ 30 s; sin caída al desplegar", "5 y 7"],
    ["Mantenibilidad", "flake8 y cobertura de pruebas", "Cero errores de lint; cobertura ≥ 80 %", "2 y 3a"],
  ], [1.8, 3.6, 2.6, 1.6]),
  CAPT("Tabla 8. Requisitos no funcionales validados en el pipeline"),
  P("Las dos técnicas centrales son el **análisis estático de seguridad** y las **pruebas de carga**. La simulación demostró que ambas aportan algo que las pruebas funcionales no cubren: el fallo de MD5 y el de rendimiento pasaron las 22 pruebas unitarias y solo fueron detectados por estas validaciones."),

  H1("6. Buenas prácticas y automatización sugerida"),
  H2("6.1 Buenas prácticas implementadas"),
  B("**Revisión de código obligatoria** mediante pull requests y protección de la rama `main`."),
  B("**Pruebas automatizadas** en cada cambio, con un umbral de cobertura que hace fallar el pipeline (`--cov-fail-under=80`)."),
  B("**Fallar rápido:** el lint y la compilación corren primero porque son las etapas más baratas; pruebas y seguridad van en paralelo para ahorrar tiempo."),
  B("**Artefacto inmutable:** la imagen se construye una sola vez, se etiqueta con el hash del commit y es la misma que pasa por staging y producción."),
  B("**Seguridad integrada (DevSecOps):** SAST, auditoría de dependencias, escaneo de imagen, contenedor sin root y secretos gestionados por la plataforma (`secrets.GITHUB_TOKEN`), nunca escritos en el código."),
  B("**Despliegue controlado:** staging automático, aprobación manual para producción, blue-green y rollback ante fallos."),
  B("**Trazabilidad:** se conservan los reportes de pruebas y cobertura como artefactos, aunque la ejecución falle (`if: always()`)."),
  H2("6.2 Estrategias para escalar el pipeline"),
  B("**Entornos múltiples:** `develop` despliega automáticamente a un entorno de desarrollo; `main` a staging y luego a producción. La infraestructura de cada entorno se define como código con Terraform."),
  B("**Orquestación de contenedores:** pasar de Docker Compose a Kubernetes, con réplicas, autoescalado y despliegues canary (por ejemplo, 10 % del tráfico a la versión nueva antes de liberarla por completo)."),
  B("**Colaboración a escala:** flujo trunk-based con ramas de vida corta, `CODEOWNERS` para asignar revisores por módulo y feature flags para activar funcionalidades sin redesplegar."),
  B("**Velocidad:** caché de dependencias, matriz de pruebas por versión de Python y ejecución de pruebas solo en los módulos afectados cuando el repositorio crezca."),
  B("**Calidad continua:** incorporar SonarQube como quality gate, pruebas end-to-end del flujo de reserva y pruebas de carga programadas antes de temporadas altas (fines de semana y fechas especiales)."),
  B("**Observabilidad:** métricas y alertas con Prometheus y Grafana conectadas al rollback automático, y notificaciones del pipeline al canal del equipo."),

  H1("7. Conclusiones"),
  H2("7.1 La importancia de los pipelines en el desarrollo moderno"),
  P("Un pipeline CI/CD convierte la calidad en una condición para entregar: ninguna versión llega a los usuarios sin haber sido compilada, probada, revisada en seguridad y validada en un entorno similar al de producción. En un negocio como un restaurante, donde un error se traduce en clientes sin mesa o pedidos mal cobrados, esto reduce los errores en producción y permite entregar mejoras con frecuencia sin aumentar el riesgo. Además, el pipeline documenta el proceso: cualquier integrante del equipo puede ver qué se validó y por qué una versión fue aceptada o rechazada."),
  H2("7.2 Aprendizajes adquiridos"),
  B("Las pruebas funcionales son necesarias, pero no suficientes. En la simulación, dos de los tres fallos (MD5 y la consulta lenta) pasaron todas las pruebas unitarias y solo los detectaron el análisis de seguridad y la prueba de carga."),
  B("El orden de las etapas importa: las validaciones rápidas van primero y las costosas al final, para dar retroalimentación en segundos y no en minutos."),
  B("Un fallo del pipeline es una buena noticia: significa que el error se detuvo antes de llegar al cliente. Para que sea útil, el mensaje debe indicar con claridad qué falló y dónde."),
  B("Los requisitos no funcionales deben expresarse como umbrales medibles (p95 < 300 ms, cobertura ≥ 80 %); un requisito como “que sea rápido” no se puede automatizar."),
  B("Implementar y ejecutar el pipeline, en lugar de solo describirlo, obligó a resolver detalles reales: reiniciar el estado entre pruebas, esperar a que el servicio arrancara antes de la prueba de humo y elegir umbrales realistas."),

  H1("Referencias"),
  P("Humble, J. y Farley, D. (2010). *Continuous Delivery: Reliable Software Releases through Build, Test, and Deployment Automation*. Addison-Wesley.".replace(/\*/g, "")),
  P("Kim, G., Humble, J., Debois, P. y Willis, J. (2016). The DevOps Handbook. IT Revolution Press."),
  P("GitHub. (2024). GitHub Actions documentation. https://docs.github.com/actions"),
  P("PyCQA. (2024). Bandit documentation. https://bandit.readthedocs.io"),
  P("OWASP Foundation. (2021). OWASP Top 10. https://owasp.org/Top10"),
];

const doc = new Document({
  creator: "Ruben Dario Bayona Galvis",
  title: "AA2 – Pipeline CI/CD Sistema de Restaurante",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 32, bold: true, color: AZUL },
        paragraph: { spacing: { before: 320, after: 140 }, keepNext: true, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "1E88E5", space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: FONT, size: 26, bold: true, color: "1E5A8A" },
        paragraph: { spacing: { before: 220, after: 100 }, keepNext: true, outlineLevel: 1 } },
    ],
  },
  numbering: { config: [
    { reference: "vinetas", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] },
    { reference: "numeros", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] },
  ] },
  sections: [{
    properties: { titlePage: true, page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
    headers: {
      first: new Header({ children: [new Paragraph("")] }),
      default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "AA2 – Pipeline CI/CD · Sistema de Restaurante", size: 18, color: "777777" })] })] }),
    },
    footers: {
      first: new Footer({ children: [new Paragraph("")] }),
      default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "777777" })] })] }),
    },
    children: [...portada, ...ordenar(cuerpo)],
  }],
});

Packer.toBuffer(doc).then((b) => { fs.writeFileSync(OUT, b); console.log("OK", OUT); });
