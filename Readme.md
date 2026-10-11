# 🎓 Student Management System — Automated CI/CD on AWS

An enterprise-ready, three-tier web application featuring a fully automated Continuous Integration and Continuous Deployment (CI/CD) pipeline built with **Jenkins**, **Docker Compose**, **AWS ECR**, and **AWS EC2**.

## 📌 Architecture \& Pipeline Flow

Whenever code is pushed to the `main` branch, an automated GitHub Webhook triggers the Jenkins pipeline on AWS EC2. The pipeline compiles multi-stage Docker images, pushes versioned container artifacts to Amazon ECR using dynamic IAM instance authentication, performs rolling container updates with Docker Compose, and executes automated health validation checks.

```
 Developer / Git Client
         │
         │  git push origin main
         ▼
    GitHub Repository
         │
         │  HTTP Webhook POST (/github-webhook/)
         ▼
  AWS EC2 Host (Jenkins Controller :8080)
    ├── Stage 1: Checkout SCM
    ├── Stage 2: Build Docker Images (Backend \& Frontend)
    ├── Stage 3: AWS IAM Auth \& Push to AWS ECR
    ├── Stage 4: Docker Compose Rolling Deployment (-p student-management)
    └── Stage 5: Health Check Verification (curl http://localhost/api/health)
                │
                ▼
      AWS ECR Private Registry
        ├── student-management-backend:TAG / :latest
        └── student-management-frontend:TAG / :latest
                │
                ▼ (Pull and Deploy)
      Docker Runtime (EC2 Host)
        ├── Nginx / React Frontend (Port 80)
        ├── FastAPI Backend (Port 8000, internal network)
        └── PostgreSQL 15 Database (Internal network + Persistent EBS Volume)

```

## 🛠️ Tech Stack \& Infrastructure

|Tier|Technology|Purpose|
|-|-|-|
|**Frontend**|React.js, Nginx Alpine|Responsive UI served via optimized multi-stage static Nginx|
|**Backend**|FastAPI, Python 3.11-slim, Psycopg|High-performance asynchronous REST API running as non-root user|
|**Database**|PostgreSQL 15 Alpine|Relational storage backed by persistent Docker volume|
|**CI/CD Automation**|Jenkins 2.580+ (Java 21)|Declarative multi-stage pipeline triggered via GitHub webhooks|
|**Container Engine**|Docker Engine \& Docker Compose v2|Multi-container lifecycle, isolation, and health monitoring|
|**Cloud Registry**|AWS ECR (`us-east-1`)|Immutable image versioning with build-number tags|
|**Compute \& Host**|AWS EC2 (Ubuntu 24.04 LTS)|Attached IAM Role `EC2-Jenkins-ECR-Role` with 30GB EBS gp3 storage|

## 📁 Repository Structure

```
student-management/
├── .env.example                # Sample environment variables template
├── .gitignore                  # Git ignore rules
├── Jenkinsfile                 # Jenkins Declarative Pipeline definition
├── docker-compose.prod.yml     # Production multi-container orchestration
├── docker-compose.yml          # Local development compose file
├── backend/
│   ├── app/                    # FastAPI application code \& endpoints
│   ├── Dockerfile              # Multi-stage Python 3.11 Dockerfile
│   └── requirements.txt        # Backend dependencies
├── frontend/
│   ├── public/                 # Static assets \& index.html
│   ├── src/                    # React components \& UI logic
│   ├── Dockerfile              # Multi-stage Node.js build \& Nginx runtime
│   ├── nginx.conf              # Production reverse proxy configuration
│   └── package.json            # Node.js dependencies
└── README.md                   # Project documentation

```

## ⚙️ Configuration \& Environment Setup

### 1\. Environment Variables (`.env`)

Create a `.env` file in the project root:

```
POSTGRES\_USER=student\_user
POSTGRES\_PASSWORD=SecurePassword2026!
POSTGRES\_DB=student\_management\_db
POSTGRES\_HOST=db
POSTGRES\_PORT=5432

```

### 2\. Multi-Container Orchestration (`docker-compose.prod.yml`)

```
name: student-management

services:
  db:
    image: postgres:15-alpine
    container\_name: student\_db
    restart: always
    env\_file:
      - .env
    volumes:
      - student\_prod\_postgres\_data:/var/lib/postgresql/data
    networks:
      - backend\_net
    healthcheck:
      test: \["CMD-SHELL", "pg\_isready -U ${POSTGRES\_USER} -d ${POSTGRES\_DB}"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    image: 132597215056.dkr.ecr.us-east-1.amazonaws.com/student-management-backend:${IMAGE\_TAG}
    container\_name: student\_backend
    restart: always
    env\_file:
      - .env
    environment:
      DATABASE\_URL: postgresql+psycopg://${POSTGRES\_USER}:${POSTGRES\_PASSWORD}@db:5432/${POSTGRES\_DB}
    depends\_on:
      db:
        condition: service\_healthy
    networks:
      - backend\_net
      - frontend\_net
    healthcheck:
      test: \["CMD", "python3", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health')"]
      interval: 10s
      timeout: 5s
      retries: 3

  frontend:
    image: 132597215056.dkr.ecr.us-east-1.amazonaws.com/student-management-frontend:${IMAGE\_TAG}
    container\_name: student\_frontend
    restart: always
    ports:
      - "80:80"
    depends\_on:
      backend:
        condition: service\_healthy
    networks:
      - frontend\_net
    healthcheck:
      test: \["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1/"]
      interval: 15s
      timeout: 3s
      retries: 3

volumes:
  student\_prod\_postgres\_data:
    external: true

networks:
  frontend\_net:
    driver: bridge
  backend\_net:
    internal: true

```

## 🚀 The CI/CD Pipeline (`Jenkinsfile`)

```
pipeline {
    agent any

    environment {
        AWS\_REGION     = 'us-east-1'
        AWS\_ACCOUNT\_ID = '132597215056'
        ECR\_REGISTRY   = "${AWS\_ACCOUNT\_ID}.dkr.ecr.${AWS\_REGION}.amazonaws.com"
        IMAGE\_TAG      = "${env.BUILD\_NUMBER}"
        BACKEND\_REPO   = 'student-management-backend'
        FRONTEND\_REPO  = 'student-management-frontend'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Images') {
            steps {
                sh """
                    docker build -t ${ECR\_REGISTRY}/${BACKEND\_REPO}:${IMAGE\_TAG} ./backend
                    docker build -t ${ECR\_REGISTRY}/${FRONTEND\_REPO}:${IMAGE\_TAG} ./frontend
                    docker tag ${ECR\_REGISTRY}/${BACKEND\_REPO}:${IMAGE\_TAG} ${ECR\_REGISTRY}/${BACKEND\_REPO}:latest
                    docker tag ${ECR\_REGISTRY}/${FRONTEND\_REPO}:${IMAGE\_TAG} ${ECR\_REGISTRY}/${FRONTEND\_REPO}:latest
                """
            }
        }

        stage('Push to AWS ECR') {
            steps {
                sh """
                    aws ecr get-login-password --region ${AWS\_REGION} | docker login --username AWS --password-stdin ${ECR\_REGISTRY}
                    docker push ${ECR\_REGISTRY}/${BACKEND\_REPO}:${IMAGE\_TAG}
                    docker push ${ECR\_REGISTRY}/${FRONTEND\_REPO}:${IMAGE\_TAG}
                    docker push ${ECR\_REGISTRY}/${BACKEND\_REPO}:latest
                    docker push ${ECR\_REGISTRY}/${FRONTEND\_REPO}:latest
                """
            }
        }

        stage('Deploy via Docker Compose') {
            steps {
                sh """
                    cp -n /home/ubuntu/student-management/.env .env || true
                    export IMAGE\_TAG=${IMAGE\_TAG}
                    docker compose -p student-management -f docker-compose.prod.yml pull
                    docker compose -p student-management -f docker-compose.prod.yml up -d --remove-orphans
                """
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                    sleep 12
                    curl -f http://localhost/api/health || exit 1
                '''
            }
        }
    }

    post {
        always {
            sh "docker image prune -f"
        }
    }
}

```

## 🔧 Engineering Challenges \& Solutions

* **Disk Exhaustion during Build Layers:**

  * *Issue:* The default 8 GB root EBS volume ran out of space during image compilation.
  * *Solution:* Expanded EBS disk to 30 GB in AWS EC2 Console, extended partitions online with `growpart` and `resize2fs`, and created a 2 GB swapfile.
* **Declarative Pipeline Engine Support:**

  * *Issue:* Build failed with `NoSuchMethodError: No such DSL method 'pipeline'`.
  * *Solution:* Installed missing `pipeline-model-definition` and `pipeline-stage-view` plugins.
* **Docker Compose Workspace Collisions:**

  * *Issue:* Container name `/student\_db` collided between manual runs and Jenkins job workspaces.
  * *Solution:* Pinned the project name explicitly with `-p student-management` and defined persistent database volume as `external: true`.
* **Zero-Credential IAM Authentication:**

  * *Solution:* Attached the `EC2-Jenkins-ECR-Role` with `AmazonEC2ContainerRegistryFullAccess` directly to the EC2 instance, eliminating static AWS secrets from the code repository.

## 📈 Verification \& Deployment Status

* **CI/CD Status:** Automated trigger on Git push verified and operational.
* **Artifacts:** Tagged images pushed to AWS ECR on every build cycle.
* **Health Check Endpoint:** `http://<EC2\_PUBLIC\_IP>/api/health` returning `{"status":"ok"}`.
* **Web Interface:** Live and serving student records on port `80`.

## 👤 Author

* **Ketha Charan Kumar** — [GitHub Profile](https://github.com/charankumar-ketha)

