#!/bin/bash

# Branch Manager Script for Phishing Detector Project
# This script automates branch creation, management, and merge policies

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Show usage
show_usage() {
    echo "Branch Manager for Phishing Detector Project"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  create <type> <name>    Create a new branch"
    echo "  merge <branch>          Merge branch to main"
    echo "  cleanup                 Clean up merged branches"
    echo "  status                  Show branch status"
    echo "  protect <branch>        Set up branch protection"
    echo ""
    echo "Branch Types:"
    echo "  feature                 Feature branch (feature/name)"
    echo "  bugfix                  Bug fix branch (bugfix/name)"
    echo "  hotfix                  Hot fix branch (hotfix/name)"
    echo "  release                 Release branch (release/name)"
    echo ""
    echo "Examples:"
    echo "  $0 create feature user-authentication"
    echo "  $0 merge feature/user-authentication"
    echo "  $0 cleanup"
    echo "  $0 status"
}

# Create a new branch
create_branch() {
    local type=$1
    local name=$2
    
    if [ -z "$type" ] || [ -z "$name" ]; then
        print_error "Branch type and name are required"
        show_usage
        exit 1
    fi
    
    # Validate branch type
    case $type in
        "feature"|"bugfix"|"hotfix"|"release")
            ;;
        *)
            print_error "Invalid branch type: $type"
            print_error "Valid types: feature, bugfix, hotfix, release"
            exit 1
            ;;
    esac
    
    # Validate branch name
    if [[ ! "$name" =~ ^[a-z0-9-]+$ ]]; then
        print_error "Invalid branch name: $name"
        print_error "Use only lowercase letters, numbers, and hyphens"
        exit 1
    fi
    
    # Check if we're on main branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
        print_warning "Not on main branch. Switching to main..."
        git checkout main
        git pull origin main
    fi
    
    # Create branch name
    BRANCH_NAME="$type/$name"
    
    # Check if branch already exists
    if git show-ref --verify --quiet refs/heads/$BRANCH_NAME; then
        print_error "Branch $BRANCH_NAME already exists"
        exit 1
    fi
    
    # Create and switch to new branch
    git checkout -b $BRANCH_NAME
    print_status "Created and switched to branch: $BRANCH_NAME"
    
    # Push to remote
    git push -u origin $BRANCH_NAME
    print_status "Pushed branch to remote"
    
    # Create branch description
    case $type in
        "feature")
            echo "Feature: $name" > .git/BRANCH_DESCRIPTION
            ;;
        "bugfix")
            echo "Bug Fix: $name" > .git/BRANCH_DESCRIPTION
            ;;
        "hotfix")
            echo "Hot Fix: $name" > .git/BRANCH_DESCRIPTION
            ;;
        "release")
            echo "Release: $name" > .git/BRANCH_DESCRIPTION
            ;;
    esac
    
    print_info "Branch setup complete!"
    print_info "Next steps:"
    print_info "1. Make your changes"
    print_info "2. Commit with conventional commit format"
    print_info "3. Push changes: git push"
    print_info "4. Create pull request when ready"
}

# Merge branch to main
merge_branch() {
    local branch=$1
    
    if [ -z "$branch" ]; then
        print_error "Branch name is required"
        show_usage
        exit 1
    fi
    
    # Check if branch exists
    if ! git show-ref --verify --quiet refs/heads/$branch; then
        print_error "Branch $branch does not exist"
        exit 1
    fi
    
    # Check if we're on main branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
        print_warning "Not on main branch. Switching to main..."
        git checkout main
        git pull origin main
    fi
    
    # Check if branch is up to date
    git fetch origin
    LOCAL_COMMIT=$(git rev-parse $branch)
    REMOTE_COMMIT=$(git rev-parse origin/$branch)
    
    if [ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]; then
        print_warning "Branch is not up to date with remote"
        print_info "Updating branch..."
        git checkout $branch
        git pull origin $branch
        git checkout main
    fi
    
    # Check for merge conflicts
    print_status "Checking for merge conflicts..."
    if git merge-tree $(git merge-base main $branch) main $branch | grep -q "<<<<<<<"; then
        print_error "Merge conflicts detected"
        print_info "Please resolve conflicts manually"
        exit 1
    fi
    
    # Run pre-merge checks
    print_status "Running pre-merge checks..."
    
    # Check if all tests pass
    if [ -f ".git/hooks/pre-commit" ]; then
        bash .git/hooks/pre-commit
    fi
    
    # Merge branch
    print_status "Merging $branch to main..."
    git merge --no-ff $branch -m "Merge $branch into main"
    
    # Push to remote
    git push origin main
    print_status "Merged and pushed to remote"
    
    # Delete local branch
    git branch -d $branch
    print_status "Deleted local branch: $branch"
    
    # Delete remote branch
    git push origin --delete $branch
    print_status "Deleted remote branch: $branch"
    
    print_info "Merge completed successfully!"
}

# Clean up merged branches
cleanup_branches() {
    print_status "Cleaning up merged branches..."
    
    # Fetch latest changes
    git fetch --prune
    
    # Get list of merged branches
    MERGED_BRANCHES=$(git branch --merged main | grep -v "main\|master\|develop" | sed 's/^[[:space:]]*//')
    
    if [ -z "$MERGED_BRANCHES" ]; then
        print_info "No merged branches to clean up"
        return
    fi
    
    echo "Merged branches to delete:"
    echo "$MERGED_BRANCHES"
    echo ""
    
    read -p "Do you want to delete these branches? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        for branch in $MERGED_BRANCHES; do
            print_status "Deleting branch: $branch"
            git branch -d $branch
        done
        print_status "Cleanup completed!"
    else
        print_info "Cleanup cancelled"
    fi
}

# Show branch status
show_status() {
    print_status "Branch Status"
    echo "=============="
    
    # Current branch
    CURRENT_BRANCH=$(git branch --show-current)
    print_info "Current branch: $CURRENT_BRANCH"
    
    # All branches
    echo ""
    echo "All branches:"
    git branch -a --format="%(refname:short) %(upstream:short) %(committerdate:relative)"
    
    # Recent commits
    echo ""
    echo "Recent commits:"
    git log --oneline -10
    
    # Branch statistics
    echo ""
    echo "Branch statistics:"
    TOTAL_BRANCHES=$(git branch | wc -l)
    MERGED_BRANCHES=$(git branch --merged main | grep -v "main\|master" | wc -l)
    UNMERGED_BRANCHES=$(git branch --no-merged main | grep -v "main\|master" | wc -l)
    
    print_info "Total branches: $TOTAL_BRANCHES"
    print_info "Merged branches: $MERGED_BRANCHES"
    print_info "Unmerged branches: $UNMERGED_BRANCHES"
}

# Set up branch protection
protect_branch() {
    local branch=$1
    
    if [ -z "$branch" ]; then
        print_error "Branch name is required"
        show_usage
        exit 1
    fi
    
    print_status "Setting up protection for branch: $branch"
    
    # Create branch protection configuration
    cat > .github/branch-protection/$branch.yml << EOF
# Branch protection rules for $branch
name: Protect $branch
on:
  push:
    branches: [$branch]
  pull_request:
    branches: [$branch]

jobs:
  protection:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Run tests
        run: |
          # Add your test commands here
          echo "Running tests for $branch"
          
      - name: Check code quality
        run: |
          # Add your quality checks here
          echo "Running quality checks for $branch"
EOF
    
    print_status "Created branch protection configuration"
    print_info "Branch protection rules will be applied on next push"
}

# Main script logic
case "${1:-}" in
    "create")
        create_branch "$2" "$3"
        ;;
    "merge")
        merge_branch "$2"
        ;;
    "cleanup")
        cleanup_branches
        ;;
    "status")
        show_status
        ;;
    "protect")
        protect_branch "$2"
        ;;
    "help"|"-h"|"--help"|"")
        show_usage
        ;;
    *)
        print_error "Unknown command: $1"
        show_usage
        exit 1
        ;;
esac 