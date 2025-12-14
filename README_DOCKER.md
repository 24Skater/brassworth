# Docker Quick Start

## 🚀 One-Command Deployment

```bash
docker-compose up -d
```

That's it! The application will be available at http://localhost

## 📋 Prerequisites

- Docker and Docker Compose installed
- Port 80 available (or change in docker-compose.yml)

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
PORT=80
VITE_STORAGE_PROVIDER=localStorage
```

### Custom Port

```bash
PORT=3000 docker-compose up -d
```

## 📚 More Information

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for:

- Production deployment with SSL
- Advanced configuration
- Backup and restore
- Troubleshooting

## 🛑 Stop the Application

```bash
docker-compose down
```

## 📊 View Logs

```bash
docker-compose logs -f
```

## 🔄 Update

```bash
git pull
docker-compose up -d --build
```

---

For detailed deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
