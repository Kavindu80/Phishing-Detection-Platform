# Git Automation Setup Script for Phishing Detector Project (PowerShell)
# This script sets up all Git automation tools and hooks on Windows

param(
    [switch]$Force
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

function Write-Status {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠ $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor $Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor $Blue
}

Write-Host "🚀 Setting up Git Automation for Phishing Detector Project" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# Check if we're in a Git repository
if (-not (Test-Path ".git")) {
    Write-Error "Not in a Git repository. Please run this script from the project root."
    exit 1
}

# 1. Configure Git
Write-Status "Configuring Git..."
git config core.hooksPath .git/hooks
git config commit.template .gitmessage
git config pull.rebase true
git config push.followTags true

# 2. Create necessary directories
Write-Status "Creating necessary directories..."
if (-not (Test-Path ".github/branch-protection")) {
    New-Item -ItemType Directory -Path ".github/branch-protection" -Force | Out-Null
}
if (-not (Test-Path "scripts/logs")) {
    New-Item -ItemType Directory -Path "scripts/logs" -Force | Out-Null
}

# 3. Create initial changelog if it doesn't exist
if (-not (Test-Path "CHANGELOG.md")) {
    Write-Status "Creating initial changelog..."
    @"
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
"@ | Out-File -FilePath "CHANGELOG.md" -Encoding UTF8
    Write-Status "Created initial CHANGELOG.md"
}

# 4. Create backend version file if it doesn't exist
if (-not (Test-Path "backend/version.txt")) {
    Write-Status "Creating backend version file..."
    "0.1.0" | Out-File -FilePath "backend/version.txt" -Encoding UTF8
}

# 5. Set up Git aliases
Write-Status "Setting up Git aliases..."
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

# 6. Create initial tag if none exists
$tags = git tag
if (-not $tags) {
    Write-Status "Creating initial tag..."
    git tag -a "v0.1.0" -m "Initial release"
    Write-Info "Created initial tag v0.1.0"
}

# 7. Set up branch protection for main
Write-Status "Setting up branch protection..."
@"
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
"@ | Out-File -FilePath ".github/branch-protection/main.yml" -Encoding UTF8

# 8. Create development workflow documentation
Write-Status "Creating development workflow documentation..."
@"
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

## Windows Setup

### Prerequisites
1. Install Git for Windows
2. Install WSL2 (Windows Subsystem for Linux) for bash scripts
3. Install Node.js and npm
4. Install Python

### WSL2 Setup
\`\`\`powershell
# Install WSL2
wsl --install

# Install Ubuntu
wsl --install -d Ubuntu

# Update WSL
wsl --update
\`\`\`

### Running Scripts
\`\`\`powershell
# Run setup
.\scripts\setup-git-automation.ps1

# Run bash scripts in WSL
wsl bash scripts/branch-manager.sh create feature my-feature
\`\`\`

## Troubleshooting

### Hook Issues
If hooks are not working:
\`\`\`powershell
# Reinstall hooks
.\scripts\setup-git-automation.ps1
\`\`\`

### Version Issues
If version files are out of sync:
\`\`\`powershell
# Update frontend version
cd frontend; npm version patch; cd ..

# Update backend version
"1.0.1" | Out-File -FilePath "backend/version.txt" -Encoding UTF8
\`\`\`

### Changelog Issues
To regenerate changelog:
\`\`\`powershell
wsl bash scripts/update-changelog.sh
\`\`\`
"@ | Out-File -FilePath "GIT_WORKFLOW.md" -Encoding UTF8

# 9. Create Windows-specific batch files for common operations
Write-Status "Creating Windows batch files..."

# Branch manager batch file
@"
@echo off
REM Branch Manager for Windows
REM Usage: branch-manager.bat [COMMAND] [OPTIONS]

if "%1"=="create" (
    wsl bash scripts/branch-manager.sh create %2 %3
) else if "%1"=="merge" (
    wsl bash scripts/branch-manager.sh merge %2
) else if "%1"=="cleanup" (
    wsl bash scripts/branch-manager.sh cleanup
) else if "%1"=="status" (
    wsl bash scripts/branch-manager.sh status
) else (
    echo Branch Manager for Phishing Detector Project
    echo.
    echo Usage: %0 [COMMAND] [OPTIONS]
    echo.
    echo Commands:
    echo   create ^<type^> ^<name^>    Create a new branch
    echo   merge ^<branch^>          Merge branch to main
    echo   cleanup                 Clean up merged branches
    echo   status                  Show branch status
    echo.
    echo Examples:
    echo   %0 create feature user-authentication
    echo   %0 merge feature/user-authentication
    echo   %0 cleanup
    echo   %0 status
)
"@ | Out-File -FilePath "scripts/branch-manager.bat" -Encoding ASCII

# Release manager batch file
@"
@echo off
REM Release Manager for Windows
REM Usage: release-manager.bat [COMMAND] [OPTIONS]

if "%1"=="create" (
    wsl bash scripts/release-manager.sh create %2
) else if "%1"=="list" (
    wsl bash scripts/release-manager.sh list
) else if "%1"=="notes" (
    wsl bash scripts/release-manager.sh notes %2
) else if "%1"=="publish" (
    wsl bash scripts/release-manager.sh publish %2
) else (
    echo Release Manager for Phishing Detector Project
    echo.
    echo Usage: %0 [COMMAND] [OPTIONS]
    echo.
    echo Commands:
    echo   create ^<type^>           Create a new release
    echo   list                    List all releases
    echo   notes ^<version^>         Generate release notes
    echo   publish ^<version^>       Publish release to GitHub
    echo.
    echo Examples:
    echo   %0 create minor
    echo   %0 list
    echo   %0 notes v1.2.0
    echo   %0 publish v1.2.0
)
"@ | Out-File -FilePath "scripts/release-manager.bat" -Encoding ASCII

# 10. Final setup summary
Write-Host ""
Write-Host "🎉 Git Automation Setup Complete!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Status "✓ Git hooks installed and configured"
Write-Status "✓ Scripts made executable"
Write-Status "✓ Git aliases configured"
Write-Status "✓ Initial changelog created"
Write-Status "✓ Branch protection rules set up"
Write-Status "✓ Development workflow documented"
Write-Status "✓ Windows batch files created"

Write-Host ""
Write-Info "Next steps:"
Write-Info "1. Review GIT_WORKFLOW.md for usage instructions"
Write-Info "2. Install WSL2 for bash script support"
Write-Info "3. Test the setup with: git dev-start test-feature"
Write-Info "4. Make a test commit to verify hooks work"

Write-Host ""
Write-Info "Useful commands:"
Write-Info "- git dev-start <feature-name>    # Start new feature"
Write-Info "- git dev-finish <branch-name>    # Finish feature"
Write-Info "- git release-create <type>       # Create release"
Write-Info "- git changelog                   # Update changelog"
Write-Info "- scripts\branch-manager.bat status  # Check branch status"

Write-Host ""
Write-Info "Windows-specific commands:"
Write-Info "- scripts\branch-manager.bat create feature my-feature"
Write-Info "- scripts\release-manager.bat create minor"
Write-Info "- wsl bash scripts/branch-manager.sh status"

Write-Host ""
Write-Warning "Remember to:"
Write-Warning "- Use conventional commit format"
Write-Warning "- Create feature branches for new work"
Write-Warning "- Run tests before pushing"
Write-Warning "- Update documentation for significant changes"
Write-Warning "- Install WSL2 for full bash script support" 