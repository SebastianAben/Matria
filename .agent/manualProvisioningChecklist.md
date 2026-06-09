# Matria Manual Provisioning Checklist

Document status: Draft  
Created: 2026-06-09  
Purpose: short checklist for external resources that cannot be fully created by code

## 1. VM

- Provision Linux VM.
- Create deploy user.
- Install Docker Engine.
- Install Docker Compose plugin.
- Open inbound ports `22`, `80`, and `443`.
- Create `/opt/matria/hosted`.
- Ensure deploy user can write `/opt/matria/hosted`.
- Ensure deploy user can run Docker.

## 2. DNS

- Choose production web domain.
- Choose production API domain.
- Create A records pointing both domains to the VM.
- Verify DNS from outside the VM.

## 3. GitHub Secrets

Create production environment secrets:

- `PRODUCTION_VM_HOST`
- `PRODUCTION_VM_USER`
- `PRODUCTION_VM_SSH_PORT`
- `PRODUCTION_VM_SSH_PRIVATE_KEY`
- `PRODUCTION_VM_SSH_KNOWN_HOSTS`
- `PRODUCTION_CADDY_EMAIL`
- `PRODUCTION_POSTGRES_DB`
- `PRODUCTION_POSTGRES_USER`
- `PRODUCTION_POSTGRES_PASSWORD`
- `PRODUCTION_SESSION_SECRET`
- `PRODUCTION_ENCRYPTION_KEY`
- `PRODUCTION_GEMINI_API_KEY`
- `PRODUCTION_MEDGEMMA_ENDPOINT`
- `PRODUCTION_MEDGEMMA_API_KEY`
- `PRODUCTION_ADMIN_BOOTSTRAP_EMAIL`
- `PRODUCTION_ADMIN_BOOTSTRAP_PASSWORD`

## 4. AI Providers

- Confirm Gemini API access.
- Confirm MedGemma endpoint or hosting strategy.
- Confirm provider terms allow the intended clinical support use.
- Confirm no patient data is used for provider training.
- Document any data retention settings required by the provider.

## 5. Hospital Operations

- Confirm authorized production users.
- Confirm initial admin account owner.
- Confirm clinical approval workflow owner.
- Confirm audit review owner.
- Confirm incident response contact.
- Confirm privacy and legal approval before real patient data is processed.

## 6. Before First Production Deploy

- Confirm CI passes.
- Confirm runtime env names match deployment workflow.
- Confirm Compose config validates.
- Confirm Caddy domains are configured.
- Confirm backup approach is documented or explicitly deferred.
- Confirm first release has a rollback plan, even if rollback target is initially unavailable.
