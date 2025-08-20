# 🚀 PhishGuard Blue-Green Deployment Guide

This guide covers the implementation of blue-green deployment for PhishGuard with comprehensive monitoring and alerting.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Deployment Process](#deployment-process)
- [Monitoring & Alerting](#monitoring--alerting)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## 🎯 Overview

Blue-green deployment is a technique that reduces downtime and risk by running two identical production environments called Blue and Green. At any time, only one of the environments is live, serving all production traffic.

### Key Benefits

- ✅ **Zero Downtime**: No service interruption during deployments
- ✅ **Instant Rollback**: Quick rollback to previous version if issues arise
- ✅ **Risk Mitigation**: Test new version before switching traffic
- ✅ **Gradual Rollout**: Canary deployments and A/B testing capabilities

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Load Balancer │
│   (Active)      │    │   (Standby)     │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│   Blue Environment │    │  Green Environment │
│   (Production)   │    │   (Staging)     │
│                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   Frontend  │ │    │ │   Frontend  │ │
│ │   (3 pods)  │ │    │ │   (3 pods)  │ │
│ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │   Backend   │ │    │ │   Backend   │ │
│ │   (3 pods)  │ │    │ │   (3 pods)  │ │
│ └─────────────┘ │    │ └─────────────┘ │
└─────────────────┘    └─────────────────┘
```

## 📋 Prerequisites

### Infrastructure Requirements

- **Kubernetes Cluster** (v1.20+)
- **kubectl** configured and authenticated
- **Docker Registry** (GitHub Container Registry)
- **Load Balancer** (cloud provider or MetalLB)
- **Ingress Controller** (NGINX Ingress)
- **SSL Certificate Manager** (cert-manager)

### Required Secrets

- MongoDB connection string
- JWT secret key
- Google Gemini API key
- OAuth credentials (for Gmail integration)

## 🚀 Installation

### 1. Create Namespace

```bash
kubectl create namespace phishguard
```

### 2. Apply Secrets

```bash
# Edit secrets.yaml with your actual values
kubectl apply -f deployment/kubernetes/secrets.yaml
```

### 3. Deploy Infrastructure

```bash
# Apply blue-green deployment manifests
kubectl apply -f deployment/kubernetes/blue-green-deployment.yaml
```

### 4. Verify Installation

```bash
# Check all resources
kubectl get all -n phishguard

# Check deployment status
./deployment/scripts/blue-green-switch.sh status
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGO_URI` | MongoDB connection string | Yes |
| `JWT_SECRET_KEY` | JWT signing secret | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `FLASK_ENV` | Flask environment | Yes |
| `GOOGLE_TRANSLATE_KEY` | Google Translate API key | No |

### Resource Limits

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|----------------|--------------|
| Backend   | 250m        | 500m      | 256Mi          | 512Mi        |
| Frontend  | 100m        | 200m      | 128Mi          | 256Mi        |

### Scaling Configuration

- **Minimum Replicas**: 3 per environment
- **Maximum Replicas**: 10 per environment
- **CPU Threshold**: 70% utilization
- **Memory Threshold**: 80% utilization

## 🔄 Deployment Process

### Automated Deployment

The blue-green deployment is triggered automatically via GitHub Actions:

1. **Build & Test**: New images are built and tested
2. **Deploy to Inactive Environment**: Deploy to the non-active environment
3. **Health Checks**: Verify the new deployment is healthy
4. **Switch Traffic**: Route traffic to the new environment
5. **Verify**: Confirm the switch was successful
6. **Cleanup**: Scale down the old environment

### Manual Deployment

```bash
# Deploy to green environment
./deployment/scripts/blue-green-switch.sh deploy green

# Check status
./deployment/scripts/blue-green-switch.sh status

# Rollback if needed
./deployment/scripts/blue-green-switch.sh rollback blue
```

### Deployment Steps

1. **Pre-deployment Validation**
   - Check current environment status
   - Validate target environment readiness
   - Ensure sufficient resources

2. **Deploy to Target Environment**
   - Update deployment with new image
   - Wait for pods to be ready
   - Perform health checks

3. **Switch Traffic**
   - Update load balancer selector
   - Update HPA targets
   - Verify traffic routing

4. **Post-deployment Verification**
   - Monitor application health
   - Check performance metrics
   - Validate functionality

5. **Cleanup**
   - Scale down old environment
   - Update monitoring targets
   - Archive old images

## 📊 Monitoring & Alerting

### Monitoring Workflow

The monitoring workflow runs every 15 minutes and tracks:

- **Workflow Status**: Success/failure rates
- **Deployment Health**: Application availability
- **Performance Metrics**: Response times
- **Resource Utilization**: CPU, memory usage

### Alerting Rules

| Metric | Threshold | Action |
|--------|-----------|--------|
| Workflow Failure Rate | > 20% | Slack notification + GitHub issue |
| Multiple Failures | > 3 in 24h | Slack notification + GitHub issue |
| Deployment Failure | Any | Critical GitHub issue + Slack |
| Production Unhealthy | Any | Critical GitHub issue + Slack |
| Slow Backend | > 5s response | Slack notification |
| Slow Frontend | > 3s response | Slack notification |

### Alert Channels

1. **Slack Notifications**
   - Real-time alerts for critical issues
   - Detailed error information
   - Quick action links

2. **GitHub Issues**
   - Critical failure tracking
   - Detailed investigation steps
   - Resolution tracking

3. **Email Notifications** (Optional)
   - Daily summary reports
   - Weekly performance reviews

### Monitoring Dashboard

Key metrics to monitor:

- **Deployment Success Rate**: Target > 95%
- **Application Response Time**: Target < 2s
- **Error Rate**: Target < 1%
- **Resource Utilization**: CPU < 70%, Memory < 80%

## 🔧 Troubleshooting

### Common Issues

#### 1. Deployment Stuck

```bash
# Check pod status
kubectl get pods -n phishguard

# Check pod logs
kubectl logs -n phishguard <pod-name>

# Check events
kubectl get events -n phishguard --sort-by='.lastTimestamp'
```

#### 2. Health Check Failures

```bash
# Check service endpoints
kubectl get endpoints -n phishguard

# Test health endpoint directly
kubectl port-forward -n phishguard svc/phishguard-backend-blue 8080:80
curl http://localhost:8080/health
```

#### 3. Traffic Not Switching

```bash
# Check load balancer configuration
kubectl get service phishguard-loadbalancer -n phishguard -o yaml

# Verify selector labels
kubectl get pods -n phishguard --show-labels
```

#### 4. Resource Issues

```bash
# Check resource usage
kubectl top pods -n phishguard

# Check HPA status
kubectl get hpa -n phishguard
```

### Rollback Procedures

#### Automatic Rollback

The deployment script automatically rolls back if:

- Health checks fail after traffic switch
- Response time exceeds thresholds
- Error rate increases significantly

#### Manual Rollback

```bash
# Rollback to previous environment
./deployment/scripts/blue-green-switch.sh rollback blue

# Verify rollback
./deployment/scripts/blue-green-switch.sh status
```

## 🔒 Security Considerations

### Secret Management

- All secrets are stored in Kubernetes secrets
- Secrets are base64 encoded
- Access is restricted via RBAC
- Regular secret rotation recommended

### Network Security

- All traffic encrypted with TLS
- Internal services use ClusterIP
- External access via LoadBalancer with SSL termination
- Network policies restrict pod-to-pod communication

### Access Control

- RBAC configured for namespace isolation
- Service accounts with minimal permissions
- Audit logging enabled
- Regular security scans

### Compliance

- GDPR compliance for data handling
- SOC 2 compliance for security controls
- Regular security assessments
- Incident response procedures

## 📈 Performance Optimization

### Resource Optimization

- **Horizontal Pod Autoscaling**: Automatic scaling based on demand
- **Resource Limits**: Prevent resource exhaustion
- **Pod Disruption Budgets**: Ensure availability during updates
- **Node Affinity**: Optimize pod placement

### Monitoring Optimization

- **Metrics Collection**: Prometheus integration
- **Log Aggregation**: Centralized logging
- **Tracing**: Distributed tracing for debugging
- **Alerting**: Intelligent alerting to reduce noise

## 🚀 Next Steps

1. **Set up monitoring dashboards** (Grafana/Prometheus)
2. **Configure log aggregation** (ELK stack)
3. **Implement canary deployments** for gradual rollouts
4. **Add chaos engineering** for resilience testing
5. **Set up automated backups** for disaster recovery

## 📞 Support

For issues or questions:

1. Check the troubleshooting section
2. Review GitHub Actions logs
3. Create a GitHub issue with detailed information
4. Contact the development team

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Maintainer**: PhishGuard Development Team 