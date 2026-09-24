You are acting as a senior DevOps engineer, Django production engineer, and React/TypeScript production engineer.

I have one production application called TRUST.

Domain:
https://trust.hendaxis.com

Stack:
- Django backend/API
- React frontend
- TypeScript
- PostgreSQL
- Redis
- Celery
- Celery Beat
- Gunicorn
- Nginx
- Ubuntu VPS
- Docker / Docker Compose preferred

The application will be deployed on its own Hetzner VPS.

The React frontend should be built for production and served through Nginx.

---

# Objective

Set up production-grade monitoring for TRUST using:

1. Better Stack
2. Sentry

The setup should be:

- simple
- secure
- production-ready
- inexpensive
- suitable for the free tiers initially
- easy to maintain
- easy to troubleshoot

Do NOT introduce:

- Grafana
- Prometheus
- Uptime Kuma
- ELK
- Kubernetes
- Loki
- other monitoring platforms

unless there is a strong technical reason.

---

# IMPORTANT: INSPECT BEFORE CHANGING ANYTHING

Before modifying code or infrastructure:

1. Inspect the repository structure.

2. Inspect the existing:
   - Django settings
   - environment variable configuration
   - Dockerfile(s)
   - docker-compose.yml / docker-compose.production.yml
   - Nginx configuration
   - Gunicorn configuration
   - PostgreSQL configuration
   - Redis configuration
   - Celery configuration
   - Celery Beat configuration
   - React/Vite configuration
   - TypeScript configuration
   - logging configuration
   - deployment scripts
   - CI/CD configuration if present

3. Determine what is already implemented.

4. Do not unnecessarily rewrite working infrastructure.

5. Preserve the existing project architecture wherever reasonable.

6. Before applying significant modifications, explain:
   - what currently exists
   - what is missing
   - what you intend to change
   - why

Do not blindly generate a completely new deployment architecture.

---

# SECURITY RULES

Never hardcode:

- Sentry DSNs
- Better Stack tokens
- API keys
- passwords
- database credentials
- Redis credentials
- Django SECRET_KEY
- authentication tokens

Use environment variables.

Do not expose publicly:

- PostgreSQL port 5432
- Redis port 6379
- Django development server
- Celery internals
- database credentials
- internal stack traces

Only Nginx should normally expose:

80
443

to the public internet.

---

# PART 1 — SENTRY BACKEND MONITORING

Integrate Sentry into the Django backend.

Monitor:

- unhandled Django exceptions
- API errors
- HTTP 500 errors
- database-related application exceptions
- Redis-related exceptions
- Gunicorn/application errors
- Celery task exceptions
- Celery task failures
- Celery retries
- scheduled task failures
- useful performance information

Use environment variables such as:

SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=

Configure Sentry only when SENTRY_DSN exists.

Do not cause local development to fail if the variable is missing.

Example concept:

if SENTRY_DSN:
    sentry_sdk.init(...)

Use:

send_default_pii=False

Do not send sensitive personally identifiable information unnecessarily.

---

# SENTRY PERFORMANCE MONITORING

Enable tracing conservatively.

Do NOT use:

traces_sample_rate=1.0

in production unless there is a very strong reason.

Start with something reasonable such as:

0.05

or:

0.10

depending on expected traffic.

If using a custom traces_sampler would be better, implement that instead.

Explain your choice.

Avoid wasting the Sentry free-tier quota.

---

# CELERY + SENTRY

Ensure Sentry properly captures Celery errors.

Verify that:

- failed Celery tasks appear in Sentry
- stack traces are useful
- task names are visible
- retry information is available where possible
- Celery errors are distinguishable from normal Django request errors

Do not create a completely separate Sentry implementation if the official Sentry Celery integration already handles this correctly.

Prefer official integrations.

---

# PART 2 — REACT + TYPESCRIPT SENTRY

Integrate Sentry into the React frontend.

Monitor:

- uncaught JavaScript exceptions
- TypeScript/runtime exceptions
- React rendering errors
- frontend application crashes
- network/application failures where appropriate
- browser performance where appropriate

Use environment variables according to the existing React build system.

If Vite is used, this may look similar to:

VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=

Follow the project's actual build setup rather than assuming Vite.

---

# REACT ERROR BOUNDARY

Implement or verify that there is an appropriate React error boundary.

It should:

- catch major React rendering failures
- report them to Sentry
- show a user-friendly fallback UI

Do not expose technical stack traces to users.

---

# FRONTEND SECURITY / PRIVACY

Ensure Sentry does NOT unnecessarily send:

- passwords
- authentication tokens
- authorization headers
- cookies containing secrets
- sensitive form values
- financial/private user information

Configure:

beforeSend

or equivalent filtering where appropriate.

Also review:

beforeSendTransaction

if sensitive transaction information could be captured.

---

# SOURCE MAPS

Configure production source maps properly so frontend Sentry errors can point to the real TypeScript/React source.

Use Sentry's recommended source-map upload mechanism.

Do not expose source maps publicly if they can be uploaded privately to Sentry.

If the project uses Vite, inspect whether:

@sentry/vite-plugin

is appropriate.

If Webpack or another build system is used, use the appropriate official integration.

---

# SENTRY RELEASES

Where possible, use the Git commit SHA as the release identifier.

Example:

SENTRY_RELEASE=<git-commit-sha>

The backend and frontend deployed together should use a sensible release strategy.

The release used during source-map upload must match the release used by the production frontend.

Document exactly how the release value should be supplied during deployment.

---

# PART 3 — HEALTH CHECK ENDPOINT

Create a lightweight Django production health endpoint.

Preferred path:

/api/health/

unless the project's URL structure makes another location cleaner.

It should check:

- Django application availability
- PostgreSQL connectivity
- Redis connectivity

Do NOT execute expensive operations.

For PostgreSQL, use a minimal check such as:

SELECT 1

For Redis, use:

PING

or equivalent.

---

# HEALTHY RESPONSE

Example:

{
  "status": "healthy",
  "database": "healthy",
  "redis": "healthy"
}

Return:

HTTP 200

---

# UNHEALTHY RESPONSE

Example:

{
  "status": "unhealthy",
  "database": "unhealthy",
  "redis": "healthy"
}

Return:

HTTP 503 Service Unavailable

when a critical dependency is unavailable.

---

# HEALTH ENDPOINT SECURITY

Do NOT expose:

- database hostname
- database name
- Redis URL
- credentials
- connection strings
- stack traces
- exception messages
- internal IP addresses

Log detailed failures internally instead.

The public endpoint should only return basic component status.

---

# PART 4 — CELERY HEALTH

Celery requires monitoring beyond simply checking whether Django is alive.

I want monitoring for:

1. Celery Worker
2. Celery Beat
3. scheduled jobs
4. important background jobs

Do NOT make every HTTP request to:

/api/health/

perform an expensive Celery worker inspection.

Instead design a lightweight health strategy.

Evaluate approaches such as:

- Celery worker ping
- heartbeat storage in Redis
- periodic heartbeat task
- Better Stack heartbeat
- worker inspection from an internal monitoring process

Choose the simplest reliable solution.

Explain the tradeoffs.

---

# CELERY BEAT HEARTBEAT

Create a lightweight periodic Celery task whose purpose is to confirm that:

- Celery Beat is scheduling tasks
- the Celery worker is consuming tasks

A good pattern would be:

Celery Beat
     ↓
heartbeat task
     ↓
Celery Worker
     ↓
Better Stack heartbeat URL

For example, every 5 or 10 minutes.

Do NOT hardcode the Better Stack URL.

Use:

BETTERSTACK_CELERY_HEARTBEAT_URL=

If the environment variable does not exist, the application should continue functioning.

Use a short HTTP timeout.

A monitoring failure should not crash Celery.

---

# PART 5 — BETTER STACK UPTIME MONITORING

Prepare TRUST for Better Stack external monitoring.

Recommended monitors:

1. Main site

https://trust.hendaxis.com

2. Backend health

https://trust.hendaxis.com/api/health/

3. Celery heartbeat

4. Database backup heartbeat

5. SSL certificate monitoring

If appropriate, also monitor a meaningful API endpoint separately.

---

# MAIN WEBSITE MONITOR

Configure Better Stack to verify:

https://trust.hendaxis.com

Expected:

HTTP 200

This verifies:

- DNS
- Nginx
- TLS
- React site delivery

---

# API HEALTH MONITOR

Monitor:

https://trust.hendaxis.com/api/health/

Expected:

HTTP 200

This verifies:

- Nginx routing
- Gunicorn
- Django
- PostgreSQL
- Redis

If PostgreSQL or Redis is unavailable, it should return 503.

---

# PART 6 — DATABASE BACKUP MONITORING

Assume PostgreSQL backups will run periodically.

Create or update the backup process so a successful backup can notify Better Stack.

The sequence should be:

pg_dump succeeds
    ↓
backup compression succeeds
    ↓
off-server upload succeeds
    ↓
Better Stack heartbeat ping

Only send the success heartbeat after the entire backup workflow succeeds.

Use:

BETTERSTACK_BACKUP_HEARTBEAT_URL=

Do not send the heartbeat when:

- pg_dump failed
- compression failed
- upload failed

This ensures Better Stack alerts me when database backups silently stop.

---

# PART 7 — LOGGING

Review Django and Celery logging.

Ensure production logs contain useful information including:

- timestamp
- log level
- logger/module
- meaningful message
- exception stack trace when appropriate

Avoid logging:

- passwords
- tokens
- session cookies
- authorization headers
- secret keys
- database credentials

Use stdout/stderr where appropriate for Dockerized services.

Avoid writing unlimited logs inside Docker containers.

Configure Docker log rotation if it is not already configured.

For example, review whether something like:

json-file
max-size
max-file

should be configured.

Do not apply values blindly. Choose sensible defaults.

---

# PART 8 — BETTER STACK LOGS

If Better Stack log ingestion can be added cleanly without unnecessary infrastructure, configure it.

Prefer simple methods such as:

- Vector
- Better Stack recommended Docker logging mechanism
- supported system agent

Do NOT add an unnecessarily complicated log pipeline.

Before installing anything, explain:

- which agent/tool is needed
- resource overhead
- where it runs
- what logs it collects
- how secrets are supplied

Monitor logs from:

- Django/Gunicorn
- Celery Worker
- Celery Beat
- Nginx

Avoid sending unnecessary PostgreSQL logs unless justified.

---

# PART 9 — SERVER METRICS

Configure Better Stack infrastructure/server metrics if supported by the selected setup.

Important metrics:

- CPU usage
- RAM usage
- disk usage
- disk I/O where available
- load average
- network
- container resource usage

Pay particular attention to:

- Django container
- PostgreSQL container
- Redis container
- Celery Worker container

I especially want alerts for:

High RAM:
> 85% for sustained period

High disk:
> 80%

Critical disk:
> 90%

High CPU:
> 90% for sustained period

Do not alert on brief spikes unless appropriate.

---

# PART 10 — POSTGRESQL

Do not expose PostgreSQL publicly.

Ensure:

5432

is only accessible internally.

If using Docker, PostgreSQL generally should not have a public host port unless there is a clear reason.

Review:

- persistent volume
- restart policy
- connection settings
- backup process
- healthcheck

Do not make destructive database changes.

---

# PART 11 — REDIS

Do not expose:

6379

to the public internet.

Ensure Redis is only accessible over the internal Docker/network environment.

Review whether Redis persistence is actually required based on how this project uses Redis.

If Redis is only being used as:

- cache
- Celery broker

do not assume persistence settings without inspecting the project.

---

# PART 12 — DOCKER HEALTHCHECKS

Where useful, add Docker healthchecks for services.

Consider:

- Django
- PostgreSQL
- Redis

Do NOT create healthchecks that generate heavy load.

Example concepts:

PostgreSQL:
pg_isready

Redis:
redis-cli ping

Django:
internal health endpoint

Be careful not to create a circular dependency where Django's health endpoint depends on something unavailable before startup.

---

# PART 13 — CELERY CONCURRENCY

Inspect the VPS resources and existing Celery configuration.

Do NOT blindly start Celery with the default concurrency if it may exhaust memory.

Recommend a suitable Celery concurrency setting based on:

- available CPU
- available RAM
- expected task characteristics
- whether tasks are CPU-bound or I/O-bound

For example:

celery -A config worker --concurrency=<N>

Explain the recommendation.

Do not oversubscribe the VPS.

---

# PART 14 — GUNICORN

Inspect Gunicorn worker configuration.

Recommend appropriate values for:

- workers
- threads if used
- timeout
- graceful_timeout
- keepalive

Do not blindly use:

workers = (2 * CPU) + 1

without considering RAM and application workload.

Remember Django, PostgreSQL, Redis and Celery share the VPS.

---

# PART 15 — NGINX

Verify production Nginx configuration.

It should handle:

https://trust.hendaxis.com

Frontend requests:
React production build

Backend requests:
likely /api/

Proxy backend requests to Gunicorn.

Ensure headers such as:

X-Forwarded-For
X-Forwarded-Proto
Host

are configured correctly.

Review:

- static files
- media files if applicable
- gzip/brotli where appropriate
- request body limits
- proxy timeouts
- security headers

Do not make security-header changes that break the React app.

---

# PART 16 — HTTPS

Verify HTTPS using Let's Encrypt or the existing TLS solution.

Ensure:

HTTP
    ↓
301
    ↓
HTTPS

Do not interfere with existing valid TLS configuration.

Monitor certificate expiry through Better Stack.

---

# PART 17 — ENVIRONMENT VARIABLES

Create or update documentation for the environment variables required for monitoring.

At minimum:

SENTRY_DSN=
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=

VITE_SENTRY_DSN=
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_RELEASE=

BETTERSTACK_CELERY_HEARTBEAT_URL=
BETTERSTACK_BACKUP_HEARTBEAT_URL=

Add other Better Stack credentials/tokens only if required by the selected log/metrics agent.

Do not commit real values.

Update:

.env.example

with placeholders.

---

# PART 18 — DJANGO ENVIRONMENT SETTINGS

Confirm production Django settings include appropriate values for:

DEBUG=False

ALLOWED_HOSTS

CSRF_TRUSTED_ORIGINS

SECURE_PROXY_SSL_HEADER

SESSION_COOKIE_SECURE

CSRF_COOKIE_SECURE

SECURE_SSL_REDIRECT

where appropriate for the deployment.

Do not modify security settings without understanding Nginx/proxy behavior.

---

# PART 19 — ALERT STRATEGY

Recommend Better Stack alerts for:

CRITICAL:

- trust.hendaxis.com unavailable
- /api/health/ unavailable
- PostgreSQL unavailable
- Redis unavailable
- disk > 90%
- database backup missed
- Celery heartbeat missed

WARNING:

- disk > 80%
- sustained RAM > 85%
- sustained CPU > 90%
- elevated response times

Avoid excessive alert noise.

---

# PART 20 — SENTRY ALERT STRATEGY

Configure or recommend alerts for:

- new production errors
- sudden error spikes
- repeated Celery failures
- frontend crash spikes
- backend HTTP 500 spikes

Do not alert me for every individual exception.

Group related issues.

---

# PART 21 — DEPLOYMENT SAFETY

Do not make destructive production changes.

Before production deployment:

1. Validate Django configuration.

Run:

python manage.py check --deploy

2. Validate migrations.

3. Run tests.

4. Build React production bundle.

5. Validate Docker Compose.

6. Validate Nginx configuration.

7. Confirm environment variables exist.

8. Ensure PostgreSQL backup exists before significant infrastructure changes.

9. Verify Redis/Celery connectivity.

10. Verify Sentry integration using a controlled test error.

11. Verify Better Stack health endpoint.

12. Verify Celery heartbeat.

---

# PART 22 — CONTROLLED SENTRY TEST

Create temporary, controlled ways to verify Sentry for:

- Django
- Celery
- React

Do NOT leave public test-error endpoints enabled in production.

Testing can be done through:

- Django shell
- temporary authenticated/internal endpoint
- Celery shell/task
- temporary frontend action

Remove temporary testing code after verification.

---

# PART 23 — TEST FAILURE SCENARIOS

Where safe, document how to test:

1. PostgreSQL unavailable
2. Redis unavailable
3. Celery worker unavailable
4. Celery Beat unavailable
5. backend returns HTTP 500
6. React throws an exception
7. backup heartbeat is missed

For each scenario explain:

- expected Better Stack behavior
- expected Sentry behavior
- expected application behavior

Do not intentionally break production services without approval.

---

# PART 24 — FINAL ARCHITECTURE

The expected architecture should roughly be:

Internet
   |
   v
Nginx
   |
   +-----------------------------+
   |                             |
   v                             v
React static files            /api/
                                 |
                                 v
                              Gunicorn
                                 |
                                 v
                              Django
                         /        |        \
                        /         |         \
                       v          v          v
                 PostgreSQL    Redis      Celery
                                 |           |
                                 |           v
                                 |       Celery Worker
                                 |
                                 +------> Celery Beat


External monitoring:

                  Better Stack
                 /      |       \
                /       |        \
               v        v         v
             Uptime   Metrics   Logs
               |
               +--> Site
               +--> /api/health/
               +--> Celery heartbeat
               +--> Backup heartbeat


Application monitoring:

                     Sentry
                  /     |      \
                 /      |       \
                v       v        v
             Django   Celery    React

---

# PART 25 — FINAL DELIVERABLE

After inspecting and implementing the monitoring setup, give me a final report containing:

## 1. Existing architecture

Describe what existed before changes.

## 2. Files changed

List every file modified.

Example:

backend/config/settings/production.py
backend/config/urls.py
backend/core/views.py
frontend/src/main.tsx
frontend/vite.config.ts
docker-compose.production.yml
nginx/trust.conf
.env.example

Use the actual project paths.

## 3. Packages added

List every Python and Node dependency added.

Explain why each was needed.

## 4. Environment variables

Give me the full list of new environment variables.

Do not include secrets.

## 5. Better Stack setup

Tell me exactly which monitors I need to create in the Better Stack dashboard.

Include:

- monitor name
- URL
- expected response
- frequency recommendation
- alert recommendation

## 6. Sentry setup

Tell me exactly which Sentry projects I should create.

Recommended initial structure:

TRUST Backend
TRUST Frontend

Celery may remain part of TRUST Backend unless there is a strong reason to separate it.

## 7. Deployment steps

Give exact commands needed to deploy the changes.

## 8. Verification steps

Tell me how to verify:

- Django Sentry
- React Sentry
- Celery Sentry
- Better Stack uptime
- health endpoint
- PostgreSQL health
- Redis health
- Celery heartbeat
- backup heartbeat
- server metrics
- logs

## 9. Rollback plan

Explain how to safely revert the monitoring changes if something goes wrong.

---

# IMPORTANT FINAL RULE

Do not simply generate configuration files without inspecting the existing project.

Work with the current TRUST architecture.

Prefer minimal, maintainable changes.

If the project already has a good implementation of any requested feature, keep it and improve it only where necessary.

Prioritize:

1. production stability
2. security
3. observability
4. simplicity
5. low cost
6. maintainability