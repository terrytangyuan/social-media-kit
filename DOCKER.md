# Docker Deployment Guide

This guide covers deploying and running the Social Media Kit using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) 20.10+ installed
- [Docker Compose](https://docs.docker.com/compose/install/) 1.29+ (optional but recommended)
- OAuth credentials for the platforms you want to use (see [SETUP.md](SETUP.md))

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/terrytangyuan/social-media-kit.git
cd social-media-kit
```

2. Copy `.env.example` to `.env` and configure your OAuth credentials:
```bash
cp .env.example .env
# Edit .env with your favorite editor and add your OAuth credentials
```

3. Start the application:
```bash
docker-compose up -d
```

4. Access the application at http://localhost:3000

5. View logs:
```bash
docker-compose logs -f
```

6. Stop the application:
```bash
docker-compose down
```

### Option 2: Using Docker CLI

1. Clone the repository and configure environment variables as above

2. Build the image:
```bash
docker build -t social-media-kit .
```

3. Run the container:
```bash
docker run -d \
  --name social-media-kit \
  -p 3000:3000 \
  --env-file .env \
  social-media-kit
```

4. Access the application at http://localhost:3000

5. View logs:
```bash
docker logs -f social-media-kit
```

6. Stop the container:
```bash
docker stop social-media-kit
docker rm social-media-kit
```

### Option 3: Using Pre-built Image from GitHub Container Registry

Once published, you can use the pre-built image:

```bash
# Pull the latest image
docker pull ghcr.io/terrytangyuan/social-media-kit:latest

# Run the container
docker run -d \
  --name social-media-kit \
  -p 3000:3000 \
  --env-file .env \
  ghcr.io/terrytangyuan/social-media-kit:latest
```

## Environment Variables

The application requires OAuth credentials to function. You can provide these via:

1. **`.env` file** (recommended for local development)
2. **Environment variables** (recommended for production)
3. **Docker secrets** (recommended for Docker Swarm/Kubernetes)

### Required Environment Variables

#### LinkedIn (Required for LinkedIn posting)
- `LINKEDIN_CLIENT_ID` - Your LinkedIn OAuth app client ID
- `LINKEDIN_CLIENT_SECRET` - Your LinkedIn OAuth app client secret

#### Twitter/X (Required for Twitter posting)
- `TWITTER_CLIENT_ID` - OAuth 2.0 client ID
- `TWITTER_CLIENT_SECRET` - OAuth 2.0 client secret
- `TWITTER_API_KEY` - OAuth 1.0a consumer key (for image uploads)
- `TWITTER_API_SECRET` - OAuth 1.0a consumer secret (for image uploads)
- `TWITTER_ACCESS_TOKEN` - OAuth 1.0a access token (for image uploads)
- `TWITTER_ACCESS_TOKEN_SECRET` - OAuth 1.0a access token secret (for image uploads)

#### Mastodon (Optional)
- `MASTODON_CLIENT_ID` - Your Mastodon app client ID
- `MASTODON_CLIENT_SECRET` - Your Mastodon app client secret
- `MASTODON_INSTANCE_URL` - Your Mastodon instance URL (default: https://mastodon.social)

#### Server Configuration
- `PORT` - Port to run the server on (default: 3000)

### Example `.env` File

See [`.env.example`](.env.example) for a complete template.

## Building the Image

### Standard Build

```bash
docker build -t social-media-kit .
```

### Build with BuildKit (Faster)

```bash
DOCKER_BUILDKIT=1 docker build -t social-media-kit .
```

### Multi-platform Build

To build for multiple architectures (e.g., for deployment on ARM-based servers):

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t social-media-kit .
```

## Image Details

### What's Included

- **Node.js 22 Alpine Linux** - Minimal base image (~50MB)
- **Production dependencies only** - No dev tools
- **Built application** - Pre-compiled TypeScript and Vite build
- **Non-root user** - Runs as `nodejs` (UID 1001) for security
- **Health check** - Automatic monitoring of application health

### Image Size

- **Final image**: ~200-250MB
- **Builder stage**: ~500-600MB (not included in final image)

### Image Layers

The Dockerfile uses a multi-stage build:
1. **Builder stage**: Installs all dependencies and builds the application
2. **Runtime stage**: Copies only built artifacts and production dependencies

This approach minimizes the final image size and improves security.

## Production Deployment

### Using Environment Variables

For production, it's more secure to pass environment variables directly rather than using a `.env` file:

```bash
docker run -d \
  --name social-media-kit \
  -p 3000:3000 \
  -e LINKEDIN_CLIENT_ID="your-client-id" \
  -e LINKEDIN_CLIENT_SECRET="your-client-secret" \
  -e TWITTER_CLIENT_ID="your-twitter-client-id" \
  -e TWITTER_CLIENT_SECRET="your-twitter-client-secret" \
  # ... add other environment variables
  ghcr.io/terrytangyuan/social-media-kit:latest
```

### Using Docker Secrets (Docker Swarm)

For Docker Swarm deployments:

1. Create secrets:
```bash
echo "your-linkedin-secret" | docker secret create linkedin_client_secret -
echo "your-twitter-secret" | docker secret create twitter_client_secret -
```

2. Create a stack file (`docker-stack.yml`):
```yaml
version: '3.8'

services:
  social-media-kit:
    image: ghcr.io/terrytangyuan/social-media-kit:latest
    ports:
      - "3000:3000"
    environment:
      - LINKEDIN_CLIENT_ID=${LINKEDIN_CLIENT_ID}
    secrets:
      - linkedin_client_secret
      - twitter_client_secret
    deploy:
      replicas: 2
      update_config:
        parallelism: 1
        delay: 10s
      restart_policy:
        condition: on-failure

secrets:
  linkedin_client_secret:
    external: true
  twitter_client_secret:
    external: true
```

3. Deploy:
```bash
docker stack deploy -c docker-stack.yml social-media-kit
```

### Reverse Proxy Setup

#### Nginx

```nginx
upstream social-media-kit {
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://social-media-kit;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Traefik

```yaml
version: '3.8'

services:
  social-media-kit:
    image: ghcr.io/terrytangyuan/social-media-kit:latest
    env_file:
      - .env
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.social-media-kit.rule=Host(`yourdomain.com`)"
      - "traefik.http.routers.social-media-kit.entrypoints=websecure"
      - "traefik.http.routers.social-media-kit.tls.certresolver=letsencrypt"
      - "traefik.http.services.social-media-kit.loadbalancer.server.port=3000"
    networks:
      - traefik

networks:
  traefik:
    external: true
```

## Health Checks

The Docker image includes a built-in health check that verifies the application is running correctly.

### Health Check Details

- **Endpoint**: `/api/oauth/config`
- **Interval**: 30 seconds
- **Timeout**: 3 seconds
- **Start period**: 40 seconds (allows time for build/startup)
- **Retries**: 3

### Checking Container Health

```bash
# View health status
docker ps

# Inspect detailed health check results
docker inspect --format='{{json .State.Health}}' social-media-kit | jq
```

### Customizing Health Check

You can override the health check in `docker-compose.yml`:

```yaml
services:
  social-media-kit:
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/oauth/config"]
      interval: 60s
      timeout: 5s
      retries: 3
      start_period: 60s
```

## Troubleshooting

### Container Won't Start

1. Check logs:
```bash
docker logs social-media-kit
```

2. Verify environment variables:
```bash
docker inspect social-media-kit | grep -A 20 Env
```

3. Check if port 3000 is already in use:
```bash
lsof -i :3000
# Or use a different port
docker run -p 3001:3000 ...
```

### Health Check Failing

1. Check if the application is actually running:
```bash
docker exec social-media-kit ps aux
```

2. Test the health check endpoint manually:
```bash
docker exec social-media-kit wget -O- http://localhost:3000/api/oauth/config
```

3. Increase the start period if the application takes longer to build/start:
```yaml
healthcheck:
  start_period: 60s
```

### Build Errors

1. **npm ci fails**: Make sure `package-lock.json` is present and committed
2. **Out of memory**: Increase Docker memory limit in Docker Desktop settings
3. **Build timeout**: Use BuildKit for faster builds:
   ```bash
   DOCKER_BUILDKIT=1 docker build -t social-media-kit .
   ```

### Permission Errors

The container runs as a non-root user (`nodejs`, UID 1001). If you need to modify files:

```bash
# Run as root for debugging
docker run --user root -it social-media-kit sh
```

### OAuth Callback URL Issues

When running in Docker, make sure your OAuth app callback URLs match your container's public URL:

- **Local development**: `http://localhost:3000`
- **Production**: `https://yourdomain.com`

Update your OAuth app settings accordingly in the platform developer consoles.

## Advanced Usage

### Running Tests in Container

```bash
# Build and run tests
docker run --rm social-media-kit npm test

# Using docker-compose
docker-compose run --rm social-media-kit npm test
```

### Debugging

```bash
# Get a shell inside the container
docker exec -it social-media-kit sh

# Run as root for troubleshooting
docker exec -it --user root social-media-kit sh
```

### Viewing Real-time Logs

```bash
# Docker Compose
docker-compose logs -f

# Docker CLI
docker logs -f social-media-kit

# Last 100 lines
docker logs --tail 100 social-media-kit
```

### Updating the Container

```bash
# Pull latest image
docker pull ghcr.io/terrytangyuan/social-media-kit:latest

# Recreate container
docker-compose down
docker-compose pull
docker-compose up -d
```

## Security Best Practices

1. **Never commit `.env` files** - Keep credentials out of version control
2. **Use secrets management** - For production, use Docker secrets or a vault service
3. **Keep images updated** - Regularly rebuild to get security patches
4. **Run as non-root** - Already configured in the Dockerfile
5. **Scan for vulnerabilities**:
   ```bash
   docker scan social-media-kit:latest
   ```
6. **Use HTTPS** - Always use TLS/SSL in production with a reverse proxy
7. **Limit container resources**:
   ```yaml
   services:
     social-media-kit:
       deploy:
         resources:
           limits:
             cpus: '1'
             memory: 512M
   ```

## Performance Optimization

### Resource Limits

Set appropriate resource limits for your deployment:

```yaml
services:
  social-media-kit:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Logging

For production, consider using a logging driver:

```yaml
services:
  social-media-kit:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Support

For issues related to:
- **Docker setup**: Open an issue at [GitHub Issues](https://github.com/terrytangyuan/social-media-kit/issues)
- **OAuth configuration**: See [SETUP.md](SETUP.md)
- **General usage**: See [README.md](README.md)

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Node.js Docker Best Practices](https://github.com/nodejs/docker-node/blob/main/docs/BestPractices.md)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)
