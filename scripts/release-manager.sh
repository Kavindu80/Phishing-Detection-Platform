#!/bin/bash

# Release Manager Script for Phishing Detector Project
# This script automates the release process

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
    echo "Release Manager for Phishing Detector Project"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  create <type>           Create a new release"
    echo "  list                    List all releases"
    echo "  notes <version>         Generate release notes"
    echo "  publish <version>       Publish release to GitHub"
    echo "  rollback <version>      Rollback to previous version"
    echo ""
    echo "Release Types:"
    echo "  major                   Major version bump (1.0.0 -> 2.0.0)"
    echo "  minor                   Minor version bump (1.0.0 -> 1.1.0)"
    echo "  patch                   Patch version bump (1.0.0 -> 1.0.1)"
    echo ""
    echo "Examples:"
    echo "  $0 create minor"
    echo "  $0 list"
    echo "  $0 notes v1.2.0"
    echo "  $0 publish v1.2.0"
}

# Get current version
get_current_version() {
    if [ -f "frontend/package.json" ]; then
        node -p "require('./frontend/package.json').version"
    elif [ -f "backend/version.txt" ]; then
        cat backend/version.txt
    else
        echo "0.1.0"
    fi
}

# Calculate new version
calculate_new_version() {
    local current_version=$1
    local release_type=$2
    
    case $release_type in
        "major")
            echo "$current_version" | awk -F. '{print $1+1 ".0.0"}'
            ;;
        "minor")
            echo "$current_version" | awk -F. '{print $1 "." $2+1 ".0"}'
            ;;
        "patch")
            echo "$current_version" | awk -F. '{print $1 "." $2 "." $3+1}'
            ;;
        *)
            print_error "Invalid release type: $release_type"
            exit 1
            ;;
    esac
}

# Create a new release
create_release() {
    local release_type=$1
    
    if [ -z "$release_type" ]; then
        print_error "Release type is required"
        show_usage
        exit 1
    fi
    
    # Validate release type
    case $release_type in
        "major"|"minor"|"patch")
            ;;
        *)
            print_error "Invalid release type: $release_type"
            print_error "Valid types: major, minor, patch"
            exit 1
            ;;
    esac
    
    # Check if we're on main branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
        print_error "Must be on main branch to create a release"
        exit 1
    fi
    
    # Check for uncommitted changes
    if [ -n "$(git status --porcelain)" ]; then
        print_error "There are uncommitted changes. Please commit or stash them first."
        exit 1
    fi
    
    # Get current version
    CURRENT_VERSION=$(get_current_version)
    NEW_VERSION=$(calculate_new_version "$CURRENT_VERSION" "$release_type")
    
    print_info "Current version: $CURRENT_VERSION"
    print_info "New version: $NEW_VERSION"
    print_info "Release type: $release_type"
    
    # Confirm release
    read -p "Do you want to create release v$NEW_VERSION? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Release cancelled"
        exit 0
    fi
    
    # Create release branch
    RELEASE_BRANCH="release/v$NEW_VERSION"
    git checkout -b "$RELEASE_BRANCH"
    print_status "Created release branch: $RELEASE_BRANCH"
    
    # Update versions
    print_status "Updating versions..."
    
    # Update frontend version
    if [ -f "frontend/package.json" ]; then
        cd frontend
        npm version "$NEW_VERSION" --no-git-tag-version
        cd ..
        print_status "Updated frontend version to $NEW_VERSION"
    fi
    
    # Update backend version
    if [ -f "backend/version.txt" ]; then
        echo "$NEW_VERSION" > backend/version.txt
        print_status "Updated backend version to $NEW_VERSION"
    fi
    
    # Update changelog
    print_status "Updating changelog..."
    if [ -f "scripts/update-changelog.sh" ]; then
        bash scripts/update-changelog.sh
    fi
    
    # Commit changes
    git add .
    git commit -m "chore(release): prepare release v$NEW_VERSION"
    print_status "Committed release changes"
    
    # Create tag
    git tag -a "v$NEW_VERSION" -m "Release version $NEW_VERSION"
    print_status "Created tag v$NEW_VERSION"
    
    # Push changes
    git push origin "$RELEASE_BRANCH"
    git push origin "v$NEW_VERSION"
    print_status "Pushed release branch and tag"
    
    print_info "Release v$NEW_VERSION created successfully!"
    print_info "Next steps:"
    print_info "1. Review the release branch: $RELEASE_BRANCH"
    print_info "2. Create pull request to merge to main"
    print_info "3. Run: $0 publish v$NEW_VERSION"
}

# List all releases
list_releases() {
    print_status "Release History"
    echo "================"
    
    # Get all tags
    TAGS=$(git tag --sort=-version:refname)
    
    if [ -z "$TAGS" ]; then
        print_info "No releases found"
        return
    fi
    
    echo "Version | Date | Commit"
    echo "--------|------|-------"
    
    for tag in $TAGS; do
        DATE=$(git log -1 --format=%cd --date=short "$tag")
        COMMIT=$(git rev-parse --short "$tag")
        echo "$tag | $DATE | $COMMIT"
    done
    
    echo ""
    print_info "Total releases: $(echo "$TAGS" | wc -l)"
}

# Generate release notes
generate_release_notes() {
    local version=$1
    
    if [ -z "$version" ]; then
        print_error "Version is required"
        show_usage
        exit 1
    fi
    
    # Remove 'v' prefix if present
    VERSION_NUM=${version#v}
    
    print_status "Generating release notes for v$VERSION_NUM..."
    
    # Get the previous tag
    PREVIOUS_TAG=$(git describe --tags --abbrev=0 "$version"^ 2>/dev/null || echo "")
    
    if [ -z "$PREVIOUS_TAG" ]; then
        print_warning "No previous tag found, using all commits"
        COMMITS=$(git log --pretty=format:"%h %s" --reverse)
    else
        COMMITS=$(git log --pretty=format:"%h %s" --reverse "$PREVIOUS_TAG".."$version")
    fi
    
    # Create release notes file
    RELEASE_NOTES_FILE="RELEASE_NOTES_v$VERSION_NUM.md"
    
    cat > "$RELEASE_NOTES_FILE" << EOF
# Release Notes - v$VERSION_NUM

**Release Date:** $(date +"%Y-%m-%d")

## Overview

This release includes various improvements and bug fixes.

## Changes

EOF
    
    # Categorize commits
    FEATURES=""
    FIXES=""
    BREAKING_CHANGES=""
    DOCS=""
    STYLE=""
    REFACTOR=""
    PERF=""
    TEST=""
    CHORE=""
    
    while IFS= read -r commit; do
        HASH=$(echo "$commit" | cut -d' ' -f1)
        MESSAGE=$(echo "$commit" | cut -d' ' -f2-)
        
        # Extract commit type
        TYPE=$(echo "$MESSAGE" | sed -E 's/^([a-z]+)(\(.+\))?:.*/\1/')
        SCOPE=$(echo "$MESSAGE" | sed -n 's/^[a-z]*(\([^)]*\)):.*/\1/p')
        DESCRIPTION=$(echo "$MESSAGE" | sed -E 's/^[a-z]*(\([^)]*\))?: (.+)/\2/')
        
        # Check for breaking changes
        if echo "$MESSAGE" | grep -q "BREAKING CHANGE"; then
            BREAKING_CHANGES="$BREAKING_CHANGES
- **$SCOPE:** $DESCRIPTION"
        else
            case $TYPE in
                "feat")
                    FEATURES="$FEATURES
- **$SCOPE:** $DESCRIPTION"
                    ;;
                "fix")
                    FIXES="$FIXES
- **$SCOPE:** $DESCRIPTION"
                    ;;
                "docs")
                    DOCS="$DOCS
- **$SCOPE:** $DESCRIPTION"
                    ;;
                "style")
                    STYLE="$STYLE
- **$SCOPE:** $DESCRIPTION"
                    ;;
                "refactor")
                    REFACTOR="$REFACTOR
- **$SCOPE:** $DESCRIPTION"
                    ;;
                "perf")
                    PERF="$PERF
- **$SCOPE:** $DESCRIPTION"
                    ;;
                "test")
                    TEST="$TEST
- **$SCOPE:** $DESCRIPTION"
                    ;;
                "chore")
                    CHORE="$CHORE
- **$SCOPE:** $DESCRIPTION"
                    ;;
            esac
        fi
    done <<< "$COMMITS"
    
    # Add sections to release notes
    if [ ! -z "$BREAKING_CHANGES" ]; then
        echo "## 🚨 Breaking Changes" >> "$RELEASE_NOTES_FILE"
        echo "$BREAKING_CHANGES" >> "$RELEASE_NOTES_FILE"
        echo "" >> "$RELEASE_NOTES_FILE"
    fi
    
    if [ ! -z "$FEATURES" ]; then
        echo "## ✨ New Features" >> "$RELEASE_NOTES_FILE"
        echo "$FEATURES" >> "$RELEASE_NOTES_FILE"
        echo "" >> "$RELEASE_NOTES_FILE"
    fi
    
    if [ ! -z "$FIXES" ]; then
        echo "## 🐛 Bug Fixes" >> "$RELEASE_NOTES_FILE"
        echo "$FIXES" >> "$RELEASE_NOTES_FILE"
        echo "" >> "$RELEASE_NOTES_FILE"
    fi
    
    if [ ! -z "$PERF" ]; then
        echo "## ⚡ Performance Improvements" >> "$RELEASE_NOTES_FILE"
        echo "$PERF" >> "$RELEASE_NOTES_FILE"
        echo "" >> "$RELEASE_NOTES_FILE"
    fi
    
    if [ ! -z "$REFACTOR" ]; then
        echo "## 🔧 Refactoring" >> "$RELEASE_NOTES_FILE"
        echo "$REFACTOR" >> "$RELEASE_NOTES_FILE"
        echo "" >> "$RELEASE_NOTES_FILE"
    fi
    
    if [ ! -z "$DOCS" ]; then
        echo "## 📚 Documentation" >> "$RELEASE_NOTES_FILE"
        echo "$DOCS" >> "$RELEASE_NOTES_FILE"
        echo "" >> "$RELEASE_NOTES_FILE"
    fi
    
    if [ ! -z "$TEST" ]; then
        echo "## 🧪 Tests" >> "$RELEASE_NOTES_FILE"
        echo "$TEST" >> "$RELEASE_NOTES_FILE"
        echo "" >> "$RELEASE_NOTES_FILE"
    fi
    
    if [ ! -z "$STYLE" ]; then
        echo "## 💄 Styles" >> "$RELEASE_NOTES_FILE"
        echo "$STYLE" >> "$RELEASE_NOTES_FILE"
        echo "" >> "$RELEASE_NOTES_FILE"
    fi
    
    if [ ! -z "$CHORE" ]; then
        echo "## 🔧 Chores" >> "$RELEASE_NOTES_FILE"
        echo "$CHORE" >> "$RELEASE_NOTES_FILE"
        echo "" >> "$RELEASE_NOTES_FILE"
    fi
    
    # Add installation instructions
    cat >> "$RELEASE_NOTES_FILE" << EOF
## Installation

\`\`\`bash
# Clone the repository
git clone https://github.com/your-repo/phishing-detector.git
cd phishing-detector

# Checkout the release
git checkout v$VERSION_NUM

# Install dependencies
cd frontend && npm install
cd ../backend && pip install -r requirements.txt

# Run the application
docker-compose up
\`\`\`

## Migration Guide

If you're upgrading from a previous version, please check the migration guide in the documentation.

## Support

For support, please open an issue on GitHub or contact the development team.
EOF
    
    print_status "Release notes generated: $RELEASE_NOTES_FILE"
}

# Publish release to GitHub
publish_release() {
    local version=$1
    
    if [ -z "$version" ]; then
        print_error "Version is required"
        show_usage
        exit 1
    fi
    
    # Remove 'v' prefix if present
    VERSION_NUM=${version#v}
    
    print_status "Publishing release v$VERSION_NUM to GitHub..."
    
    # Check if tag exists
    if ! git rev-parse "$version" >/dev/null 2>&1; then
        print_error "Tag $version does not exist"
        exit 1
    fi
    
    # Check if release notes exist
    RELEASE_NOTES_FILE="RELEASE_NOTES_v$VERSION_NUM.md"
    if [ ! -f "$RELEASE_NOTES_FILE" ]; then
        print_warning "Release notes not found, generating them..."
        generate_release_notes "$version"
    fi
    
    # Read release notes
    RELEASE_NOTES=$(cat "$RELEASE_NOTES_FILE")
    
    # Create GitHub release using gh CLI
    if command -v gh >/dev/null 2>&1; then
        gh release create "$version" \
            --title "Release v$VERSION_NUM" \
            --notes "$RELEASE_NOTES" \
            --target main
        print_status "Release published to GitHub"
    else
        print_warning "GitHub CLI not found"
        print_info "Please install GitHub CLI and run:"
        print_info "gh release create $version --title 'Release v$VERSION_NUM' --notes-file $RELEASE_NOTES_FILE"
    fi
}

# Rollback to previous version
rollback_release() {
    local version=$1
    
    if [ -z "$version" ]; then
        print_error "Version is required"
        show_usage
        exit 1
    fi
    
    print_warning "Rolling back to version $version..."
    print_warning "This will reset the main branch to version $version"
    
    read -p "Are you sure you want to rollback? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Rollback cancelled"
        exit 0
    fi
    
    # Check if we're on main branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
        print_error "Must be on main branch to rollback"
        exit 1
    fi
    
    # Check if tag exists
    if ! git rev-parse "$version" >/dev/null 2>&1; then
        print_error "Tag $version does not exist"
        exit 1
    fi
    
    # Create rollback branch
    ROLLBACK_BRANCH="rollback/to-$version"
    git checkout -b "$ROLLBACK_BRANCH"
    
    # Reset to the specified version
    git reset --hard "$version"
    
    # Force push to main
    git checkout main
    git reset --hard "$version"
    git push --force origin main
    
    print_status "Rollback completed"
    print_warning "The main branch has been reset to version $version"
    print_info "Please notify team members to reset their local main branch"
}

# Main script logic
case "${1:-}" in
    "create")
        create_release "$2"
        ;;
    "list")
        list_releases
        ;;
    "notes")
        generate_release_notes "$2"
        ;;
    "publish")
        publish_release "$2"
        ;;
    "rollback")
        rollback_release "$2"
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