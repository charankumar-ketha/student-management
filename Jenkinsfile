pipeline {
    agent any

    environment {
        AWS_REGION     = 'us-east-1'
        AWS_ACCOUNT_ID = '132597215056'
        ECR_REGISTRY   = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        IMAGE_TAG      = "${env.BUILD_NUMBER}"
        BACKEND_REPO   = 'student-management-backend'
        FRONTEND_REPO  = 'student-management-frontend'
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
                    docker build -t ${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG} ./backend
                    docker build -t ${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG} ./frontend
                    docker tag ${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG} ${ECR_REGISTRY}/${BACKEND_REPO}:latest
                    docker tag ${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG} ${ECR_REGISTRY}/${FRONTEND_REPO}:latest
                """
            }
        }

        stage('Push to AWS ECR') {
            steps {
                sh """
                    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
                    docker push ${ECR_REGISTRY}/${BACKEND_REPO}:${IMAGE_TAG}
                    docker push ${ECR_REGISTRY}/${FRONTEND_REPO}:${IMAGE_TAG}
                    docker push ${ECR_REGISTRY}/${BACKEND_REPO}:latest
                    docker push ${ECR_REGISTRY}/${FRONTEND_REPO}:latest
                """
            }
        }

        stage('Deploy via Docker Compose') {
            steps {
                sh """
                    export IMAGE_TAG=${IMAGE_TAG}
                    docker compose -f docker-compose.prod.yml pull
                    docker compose -f docker-compose.prod.yml up -d --remove-orphans
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
