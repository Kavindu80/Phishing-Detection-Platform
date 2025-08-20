#!/bin/bash

# Git Automation Setup Script for Phishing Detector Project
# This script sets up all Git automation tools and hooks

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

echo "🚀 Setting up Git Automation for Phishing Detector Project"
echo "=========================================================="

# Check if we're in a Git repository
if [ ! -d ".git" ]; then
    print_error "Not in a Git repository. Please run this script from the project root."
    exit 1
fi

# 1. Make all scripts executable
print_status "Making scripts executable..."
chmod +x scripts/*.sh
chmod +x .git/hooks/*

# 2. Install Git hooks
print_status "Installing Git hooks..."
if [ ! -f ".git/hooks/pre-commit" ]; then
    print_error "Pre-commit hook not found. Please ensure hooks are properly installed."
    exit 1
fi

# 3. Configure Git
print_status "Configuring Git..."
git config core.hooksPath .git/hooks
git config commit.template .gitmessage
git config pull.rebase true
git config push.followTags true

# 4. Create necessary directories
print_status "Creating necessary directories..."
mkdir -p .github/branch-protection
mkdir -p scripts/logs

# 5. Create initial changelog if it doesn't exist
if [ ! -f "CHANGELOG.md" ]; then
    print_status "Creating initial changelog..."
    cat > CHANGELOG.md << EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial project setup
- Git automation tools
- Pre-commit and post-commit hooks
- Automated versioning and changelog generation
- Branch management automation
- Release automation

### Changed
- N/A

### Deprecated
- N/A

### Removed
- N/A

### Fixed
- N/A

### Security
- N/A
EOF
    print_status "Created initial CHANGELOG.md"
fi

# 6. Create backend version file if it doesn't exist
if [ ! -f "backend/version.txt" ]; then
    print_status "Creating backend version file..."
    echo "0.1.0" > backend/version.txt
fi

# 7. Set up Git aliases
print_status "Setting up Git aliases..."
git config alias.st status
git config alias.co checkout
git config alias.br branch
git config alias.ci commit
git config alias.ca 'commit -a'
git config alias.cm 'commit -m'
git config alias.unstage 'reset HEAD --'
git config alias.last 'log -1 HEAD'
git config alias.lg 'log --graph --pretty=format:"%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset" --abbrev-commit'
git config alias.lga 'log --graph --pretty=format:"%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset" --abbrev-commit --all'
git config alias.hist 'log --pretty=format:"%h %ad | %s%d [%an]" --graph --date=short'
git config alias.branch-name '!git rev-parse --abbrev-ref HEAD'
git config alias.dev-start '!git checkout main && git pull origin main && bash scripts/branch-manager.sh create feature'
git config alias.dev-finish '!bash scripts/branch-manager.sh merge'
git config alias.dev-cleanup '!bash scripts/branch-manager.sh cleanup'
git config alias.release-create '!bash scripts/release-manager.sh create'
git config alias.release-list '!bash scripts/release-manager.sh list'
git config alias.release-notes '!bash scripts/release-manager.sh notes'
git config alias.release-publish '!bash scripts/release-manager.sh publish'
git config alias.changelog '!bash scripts/update-changelog.sh'

# 8. Create initial tag if none exists
if ! git describe --tags --abbrev=0 >/dev/null 2>&1; then
    print_status "Creating initial tag..."
    git tag -a "v0.1.0" -m "Initial release"
    print_info "Created initial tag v0.1.0"
fi

# 9. Set up branch protection for main
print_status "Setting up branch protection..."
cat > .github/branch-protection/main.yml << EOF
# Branch protection rules for main
name: Protect main branch
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  protection:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Run tests
        run: |
          # Frontend tests
          cd frontend
          npm test -- --watchAll=false
          cd ..
          
          # Backend tests
          cd backend
          python -m pytest tests/ -v
          cd ..
          
      - name: Check code quality
        run: |
          # Frontend linting
          cd frontend
          npm run lint
          cd ..
          
          # Backend linting
          cd backend
          flake8 src/ --max-line-length=120 --ignore=E501,W503
          cd ..
EOF

# 10. Create development workflow documentation
print_status "Creating development workflow documentation..."
cat > GIT_WORKFLOW.md << EOF
# Git Workflow Guide

This document describes the Git workflow and automation tools for the Phishing Detector project.

## Quick Start

### Creating a Feature Branch
\`\`\`bash
# Option 1: Using the branch manager script
bash scripts/branch-manager.sh create feature my-feature

# Option 2: Using Git alias
git dev-start my-feature
\`\`\`

### Making Changes
1. Make your changes
2. Commit with conventional commit format:
   \`\`\`bash
   git commit -m "feat(frontend): add new authentication component"
   \`\`\`

### Finishing a Feature
\`\`\`bash
# Option 1: Using the branch manager script
bash scripts/branch-manager.sh merge feature/my-feature

# Option 2: Using Git alias
git dev-finish feature/my-feature
\`\`\`

## Commit Message Format

We use [Conventional Commits](https://www.conventionalcommits.org/) format:

\`\`\`
<type>(<scope>): <subject>

<body>

<footer>
\`\`\`

### Types
- \`feat\`: New feature
- \`fix\`: Bug fix
- \`docs\`: Documentation changes
- \`style\`: Code style changes
- \`refactor\`: Code refactoring
- \`test\`: Test changes
- \`chore\`: Maintenance tasks
- \`perf\`: Performance improvements
- \`ci\`: CI/CD changes
- \`build\`: Build system changes
- \`revert\`: Revert changes

### Scopes
- \`frontend\`: Frontend changes
- \`backend\`: Backend changes
- \`extension\`: Chrome extension changes
- \`ml\`: Machine learning changes
- \`security\`: Security changes
- \`deployment\`: Deployment changes

## Branch Strategy

### Branch Types
- \`main\`: Production-ready code
- \`feature/*\`: New features
- \`bugfix/*\`: Bug fixes
- \`hotfix/*\`: Critical fixes
- \`release/*\`: Release preparation

### Branch Naming
- Use kebab-case: \`feature/user-authentication\`
- Be descriptive: \`bugfix/memory-leak-fix\`

## Release Process

### Creating a Release
\`\`\`bash
# Create a new release
bash scripts/release-manager.sh create minor

# List all releases
bash scripts/release-manager.sh list

# Generate release notes
bash scripts/release-manager.sh notes v1.2.0

# Publish release
bash scripts/release-manager.sh publish v1.2.0
\`\`\`

### Version Bumping
- \`major\`: Breaking changes (1.0.0 → 2.0.0)
- \`minor\`: New features (1.0.0 → 1.1.0)
- \`patch\`: Bug fixes (1.0.0 → 1.0.1)

## Automation Features

### Pre-commit Hook
- Checks for sensitive files
- Validates commit message format
- Runs linting and tests
- Checks for large files

### Post-commit Hook
- Updates version numbers
- Generates changelog entries
- Creates release tags

### Pre-push Hook
- Runs comprehensive tests
- Checks code coverage
- Validates security
- Performs performance checks

## Useful Commands

### Git Aliases
- \`git st\`: Status
- \`git co\`: Checkout
- \`git br\`: Branch
- \`git ci\`: Commit
- \`git lg\`: Pretty log
- \`git dev-start\`: Start feature development
- \`git dev-finish\`: Finish feature development
- \`git release-create\`: Create release
- \`git changelog\`: Update changelog

### Branch Management
- \`bash scripts/branch-manager.sh status\`: Show branch status
- \`bash scripts/branch-manager.sh cleanup\`: Clean up merged branches

### Release Management
- \`bash scripts/release-manager.sh list\`: List all releases
- \`bash scripts/release-manager.sh notes v1.2.0\`: Generate release notes

## Troubleshooting

### Hook Issues
If hooks are not working:
\`\`\`bash
# Make hooks executable
chmod +x .git/hooks/*

# Reinstall hooks
bash scripts/setup-git-automation.sh
\`\`\`

### Version Issues
If version files are out of sync:
\`\`\`bash
# Update frontend version
cd frontend && npm version patch && cd ..

# Update backend version
echo "1.0.1" > backend/version.txt
\`\`\`

### Changelog Issues
To regenerate changelog:
\`\`\`bash
bash scripts/update-changelog.sh
\`\`\`
EOF

# 11. Create a simple test to verify setup
print_status "Running setup verification..."
if [ -x "scripts/branch-manager.sh" ] && [ -x "scripts/release-manager.sh" ] && [ -x "scripts/update-changelog.sh" ]; then
    print_status "All scripts are executable"
else
    print_error "Some scripts are not executable"
    exit 1
fi

if [ -x ".git/hooks/pre-commit" ] && [ -x ".git/hooks/post-commit" ] && [ -x ".git/hooks/pre-push" ]; then
    print_status "All hooks are executable"
else
    print_error "Some hooks are not executable"
    exit 1
fi

# 12. Final setup summary
echo ""
echo "🎉 Git Automation Setup Complete!"
echo "================================"
print_status "✓ Git hooks installed and configured"
print_status "✓ Scripts made executable"
print_status "✓ Git aliases configured"
print_status "✓ Initial changelog created"
print_status "✓ Branch protection rules set up"
print_status "✓ Development workflow documented"

echo ""
print_info "Next steps:"
print_info "1. Review GIT_WORKFLOW.md for usage instructions"
print_info "2. Test the setup with: git dev-start test-feature"
print_info "3. Make a test commit to verify hooks work"
print_info "4. Push to remote to test pre-push hooks"

echo ""
print_info "Useful commands:"
print_info "- git dev-start <feature-name>    # Start new feature"
print_info "- git dev-finish <branch-name>    # Finish feature"
print_info "- git release-create <type>       # Create release"
print_info "- git changelog                   # Update changelog"
print_info "- bash scripts/branch-manager.sh status  # Check branch status"

echo ""
print_warning "Remember to:"
print_warning "- Use conventional commit format"
print_warning "- Create feature branches for new work"
print_warning "- Run tests before pushing"
print_warning "- Update documentation for significant changes" 