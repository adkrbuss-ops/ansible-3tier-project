# 3-Tier App on AWS EC2 with Ansible + Jenkins + Docker

```
Internet -> [Web EC2: nginx container] -> [App EC2: Node.js container] -> [DB EC2: PostgreSQL container]
                       ^ Jenkins EC2 builds images, pushes to Docker Hub, runs ansible deploy
```

## Prerequisites
- Ansible >= 2.15, Python `boto3`/`botocore`
- AWS credentials (`export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=...`)
- An EC2 key pair; `export ANSIBLE_PRIVATE_KEY_FILE=~/.ssh/my-ec2-keypair.pem`
- Docker Hub account + access token

## Setup
```bash
ansible-galaxy collection install -r requirements.yml
# edit group_vars/all/vars.yml  (region, key_name, docker_hub_user)
# edit group_vars/all/vault.yml (passwords) then:
ansible-vault encrypt group_vars/all/vault.yml
```

## Step 1 - Provision + configure (creates 4 EC2s, installs Docker/Jenkins)
```bash
ansible-playbook playbooks/provision.yml --ask-vault-pass
ansible-playbook playbooks/configure.yml --ask-vault-pass
```
The output prints the Jenkins URL and initial admin password.

## Step 2 - First deployment (manual, to test)
```bash
docker build -t <user>/threetier-backend:latest  app/backend  && docker push <user>/threetier-backend:latest
docker build -t <user>/threetier-frontend:latest app/frontend && docker push <user>/threetier-frontend:latest
ansible-playbook playbooks/deploy.yml --ask-vault-pass
```
Open `http://<web-public-ip>/` - the visit counter should increment on each refresh.

## Step 3 - CI/CD with Jenkins
1. Open Jenkins, install suggested plugins.
2. Add credentials (Manage Jenkins -> Credentials):
   - `dockerhub-creds` (Username/Password)
   - `aws-creds` (Username=Access key, Password=Secret key)
   - `ec2-ssh-key` (Secret file: your .pem)
   - `vault-pass` (Secret file containing the vault password)
3. New Item -> Pipeline -> "Pipeline script from SCM" -> your Git repo containing this project.
4. Build. Pipeline: build images -> push -> `ansible-playbook playbooks/deploy.yml -e image_tag=<build#>`.
   Add a GitHub webhook / "Poll SCM" for automatic builds.

## Cleanup
```bash
ansible-playbook playbooks/destroy.yml
```

## Production hardening ideas
Restrict SSH CIDRs, use a custom VPC with private subnets for app/db, put an ALB + ACM cert
in front of the web tier, move Postgres to RDS, use an IAM instance role instead of static keys.
