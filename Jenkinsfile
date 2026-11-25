// Alternativa equivalente al workflow de GitHub Actions, para un servidor Jenkins
pipeline {
    agent any
    environment {
        IMAGE = "registry.local/restaurante-api"
        TAG   = "${env.GIT_COMMIT?.take(7) ?: 'local'}"
    }
    options { timeout(time: 30, unit: 'MINUTES') }

    stages {
        stage('Checkout') { steps { checkout scm } }

        stage('Build') {
            steps {
                sh 'python -m venv .venv && . .venv/bin/activate && pip install -r requirements-dev.txt'
                sh '. .venv/bin/activate && flake8 app tests && python -m compileall -q app'
            }
        }

        stage('Pruebas y seguridad') {
            parallel {
                stage('Pruebas') {
                    steps {
                        sh '. .venv/bin/activate && pytest --cov=app --cov-fail-under=80 --junitxml=reporte-pruebas.xml'
                    }
                    post { always { junit 'reporte-pruebas.xml' } }
                }
                stage('Seguridad') {
                    steps {
                        sh '. .venv/bin/activate && bandit -r app -ll && pip-audit -r requirements.txt'
                    }
                }
            }
        }

        stage('Empaquetado') {
            steps {
                sh 'docker build -t $IMAGE:$TAG .'
                sh 'trivy image --severity CRITICAL,HIGH --exit-code 1 $IMAGE:$TAG'
            }
        }

        stage('Staging') {
            steps {
                sh 'IMAGE_TAG=$TAG docker compose -f docker-compose.staging.yml up -d'
                sh 'curl -fs --retry 10 --retry-delay 3 --retry-all-errors http://localhost:8000/health'
                sh '. .venv/bin/activate && python tests/performance/prueba_carga.py --url http://localhost:8000'
            }
        }

        stage('Producción') {
            when { branch 'main' }
            steps {
                input message: '¿Aprobar despliegue a producción?', ok: 'Desplegar'
                echo "Desplegando $IMAGE:$TAG en producción (blue-green)"
            }
        }
    }

    post {
        failure { echo 'Pipeline fallido: se notifica al equipo y se conserva la versión estable.' }
        success { echo 'Pipeline completado correctamente.' }
    }
}
