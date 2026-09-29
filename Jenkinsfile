pipeline {
  agent any

  environment {
    DOCKER_USER = 'yourdockerhubuser'          // must match docker_hub_user in vars.yml
    IMAGE_TAG   = "${env.BUILD_NUMBER}"
    ANSIBLE_HOST_KEY_CHECKING = 'False'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build images') {
      steps {
        sh '''
          docker build -t $DOCKER_USER/threetier-backend:$IMAGE_TAG  app/backend
          docker build -t $DOCKER_USER/threetier-frontend:$IMAGE_TAG app/frontend
        '''
      }
    }

    stage('Push images') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                         usernameVariable: 'U', passwordVariable: 'P')]) {
          sh '''
            echo "$P" | docker login -u "$U" --password-stdin
            docker push $DOCKER_USER/threetier-backend:$IMAGE_TAG
            docker push $DOCKER_USER/threetier-frontend:$IMAGE_TAG
          '''
        }
      }
    }

    stage('Deploy with Ansible') {
      steps {
        withCredentials([
          usernamePassword(credentialsId: 'aws-creds',
                           usernameVariable: 'AWS_ACCESS_KEY_ID', passwordVariable: 'AWS_SECRET_ACCESS_KEY'),
          file(credentialsId: 'ec2-ssh-key',   variable: 'ANSIBLE_PRIVATE_KEY_FILE'),
          file(credentialsId: 'vault-pass',    variable: 'VAULT_FILE')
        ]) {
          sh '''
            export ANSIBLE_COLLECTIONS_PATH=/var/lib/jenkins/.ansible/collections
            ansible-playbook playbooks/deploy.yml \
              --vault-password-file $VAULT_FILE \
              -e image_tag=$IMAGE_TAG
          '''
        }
      }
    }
  }

  post {
    always  { sh 'docker logout || true' }
    success { echo 'Deployed build ' + env.BUILD_NUMBER }
  }
}
