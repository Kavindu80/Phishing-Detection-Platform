#!/bin/bash

# Blue-Green Deployment Switch Script
# This script handles switching traffic between blue and green environments

set -e

# Configuration
NAMESPACE="phishguard"
BACKEND_BLUE="phishguard-backend-blue"
BACKEND_GREEN="phishguard-backend-green"
FRONTEND_BLUE="phishguard-frontend-blue"
FRONTEND_GREEN="phishguard-frontend-green"
LOADBALANCER="phishguard-loadbalancer"
BACKEND_HPA="phishguard-backend-hpa"
FRONTEND_HPA="phishguard-frontend-hpa"
HEALTH_CHECK_ENDPOINT="/health"
FRONTEND_ENDPOINT="/"
MAX_RETRIES=10
RETRY_DELAY=30

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a deployment is ready
check_deployment_ready() {
    local deployment_name=$1
    local max_attempts=$2
    
    log_info "Checking if deployment $deployment_name is ready..."
    
    for i in $(seq 1 $max_attempts); do
        if kubectl get deployment $deployment_name -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' | grep -q "$(kubectl get deployment $deployment_name -n $NAMESPACE -o jsonpath='{.spec.replicas}')"; then
            log_success "Deployment $deployment_name is ready!"
            return 0
        fi
        
        log_warning "Attempt $i/$max_attempts: Deployment $deployment_name not ready yet..."
        sleep $RETRY_DELAY
    done
    
    log_error "Deployment $deployment_name failed to become ready after $max_attempts attempts"
    return 1
}

# Function to check health endpoint
check_health_endpoint() {
    local service_name=$1
    local endpoint=$2
    local max_attempts=$3
    
    log_info "Checking health endpoint for $service_name..."
    
    for i in $(seq 1 $max_attempts); do
        # Get the service IP
        local service_ip=$(kubectl get service $service_name -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
        
        if [ -z "$service_ip" ]; then
            log_warning "Attempt $i/$max_attempts: Service IP not available yet..."
            sleep $RETRY_DELAY
            continue
        fi
        
        # Check health endpoint
        local response=$(curl -s -o /dev/null -w "%{http_code}" http://$service_ip$endpoint || echo "000")
        
        if [ "$response" = "200" ]; then
            log_success "Health check passed for $service_name (HTTP $response)"
            return 0
        else
            log_warning "Attempt $i/$max_attempts: Health check failed for $service_name (HTTP $response)"
            sleep $RETRY_DELAY
        fi
    done
    
    log_error "Health check failed for $service_name after $max_attempts attempts"
    return 1
}

# Function to determine current active environment
get_current_environment() {
    local current_env=$(kubectl get service $LOADBALANCER -n $NAMESPACE -o jsonpath='{.spec.selector.environment}')
    echo $current_env
}

# Function to switch traffic to target environment
switch_traffic() {
    local target_env=$1
    
    log_info "Switching traffic to $target_env environment..."
    
    # Update load balancer selector
    kubectl patch service $LOADBALANCER -n $NAMESPACE -p "{\"spec\":{\"selector\":{\"environment\":\"$target_env\"}}}"
    
    # Update HPA target
    kubectl patch hpa $BACKEND_HPA -n $NAMESPACE -p "{\"spec\":{\"scaleTargetRef\":{\"name\":\"phishguard-backend-$target_env\"}}}"
    kubectl patch hpa $FRONTEND_HPA -n $NAMESPACE -p "{\"spec\":{\"scaleTargetRef\":{\"name\":\"phishguard-frontend-$target_env\"}}}"
    
    log_success "Traffic switched to $target_env environment"
}

# Function to scale down old environment
scale_down_old_environment() {
    local old_env=$1
    
    log_info "Scaling down $old_env environment..."
    
    # Scale down backend
    kubectl scale deployment phishguard-backend-$old_env -n $NAMESPACE --replicas=0
    
    # Scale down frontend
    kubectl scale deployment phishguard-frontend-$old_env -n $NAMESPACE --replicas=0
    
    log_success "$old_env environment scaled down"
}

# Function to rollback to previous environment
rollback() {
    local current_env=$1
    local previous_env=$2
    
    log_error "Rolling back from $current_env to $previous_env..."
    
    # Switch traffic back
    switch_traffic $previous_env
    
    # Scale down failed environment
    scale_down_old_environment $current_env
    
    log_success "Rollback completed to $previous_env environment"
}

# Main deployment function
deploy_to_environment() {
    local target_env=$1
    local current_env=$(get_current_environment)
    
    log_info "Starting blue-green deployment to $target_env environment"
    log_info "Current active environment: $current_env"
    
    # Validate target environment
    if [ "$target_env" != "blue" ] && [ "$target_env" != "green" ]; then
        log_error "Invalid target environment: $target_env. Must be 'blue' or 'green'"
        exit 1
    fi
    
    # Check if target environment is already active
    if [ "$target_env" = "$current_env" ]; then
        log_warning "Target environment $target_env is already active"
        return 0
    fi
    
    # Step 1: Ensure target environment is ready
    log_info "Step 1: Checking target environment readiness..."
    
    if ! check_deployment_ready "phishguard-backend-$target_env" $MAX_RETRIES; then
        log_error "Backend deployment for $target_env environment is not ready"
        exit 1
    fi
    
    if ! check_deployment_ready "phishguard-frontend-$target_env" $MAX_RETRIES; then
        log_error "Frontend deployment for $target_env environment is not ready"
        exit 1
    fi
    
    # Step 2: Health check target environment
    log_info "Step 2: Performing health checks on $target_env environment..."
    
    if ! check_health_endpoint "phishguard-backend-$target_env" $HEALTH_CHECK_ENDPOINT $MAX_RETRIES; then
        log_error "Health check failed for $target_env backend"
        exit 1
    fi
    
    if ! check_health_endpoint "phishguard-frontend-$target_env" $FRONTEND_ENDPOINT $MAX_RETRIES; then
        log_error "Health check failed for $target_env frontend"
        exit 1
    fi
    
    # Step 3: Switch traffic
    log_info "Step 3: Switching traffic to $target_env environment..."
    
    if ! switch_traffic $target_env; then
        log_error "Failed to switch traffic to $target_env environment"
        exit 1
    fi
    
    # Step 4: Verify traffic switch
    log_info "Step 4: Verifying traffic switch..."
    
    sleep 30  # Wait for traffic to stabilize
    
    # Check if new environment is responding
    if ! check_health_endpoint $LOADBALANCER $HEALTH_CHECK_ENDPOINT 5; then
        log_error "Traffic switch verification failed"
        log_error "Initiating rollback..."
        rollback $target_env $current_env
        exit 1
    fi
    
    # Step 5: Scale down old environment
    log_info "Step 5: Scaling down $current_env environment..."
    
    scale_down_old_environment $current_env
    
    log_success "Blue-green deployment to $target_env environment completed successfully!"
}

# Function to show deployment status
show_status() {
    log_info "Current deployment status:"
    
    echo ""
    echo "=== Deployments ==="
    kubectl get deployments -n $NAMESPACE -l app=phishguard-backend
    kubectl get deployments -n $NAMESPACE -l app=phishguard-frontend
    
    echo ""
    echo "=== Services ==="
    kubectl get services -n $NAMESPACE -l app=phishguard
    
    echo ""
    echo "=== Current Active Environment ==="
    local current_env=$(get_current_environment)
    echo "Active: $current_env"
    
    echo ""
    echo "=== Pod Status ==="
    kubectl get pods -n $NAMESPACE -l app=phishguard-backend
    kubectl get pods -n $NAMESPACE -l app=phishguard-frontend
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND] [ENVIRONMENT]"
    echo ""
    echo "Commands:"
    echo "  deploy <blue|green>  - Deploy to specified environment"
    echo "  status               - Show current deployment status"
    echo "  rollback <blue|green> - Rollback to specified environment"
    echo "  help                 - Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 deploy green     - Deploy to green environment"
    echo "  $0 status           - Show deployment status"
    echo "  $0 rollback blue    - Rollback to blue environment"
}

# Main script logic
case "${1:-}" in
    "deploy")
        if [ -z "${2:-}" ]; then
            log_error "Environment not specified"
            show_usage
            exit 1
        fi
        deploy_to_environment $2
        ;;
    "status")
        show_status
        ;;
    "rollback")
        if [ -z "${2:-}" ]; then
            log_error "Environment not specified"
            show_usage
            exit 1
        fi
        local current_env=$(get_current_environment)
        rollback $current_env $2
        ;;
    "help"|"--help"|"-h")
        show_usage
        ;;
    *)
        log_error "Unknown command: ${1:-}"
        show_usage
        exit 1
        ;;
esac 