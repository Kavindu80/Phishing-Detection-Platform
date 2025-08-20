#!/bin/bash

# Changelog Update Script for Phishing Detector Project
# This script automatically updates CHANGELOG.md based on commit messages

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
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

# Get the current version
CURRENT_VERSION=$(get_current_version)
print_info "Current version: $CURRENT_VERSION"

# Get the last tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "v0.0.0")
print_info "Last tag: $LAST_TAG"

# Get commits since last tag
COMMITS_SINCE_TAG=$(git log --pretty=format:"%h %s" ${LAST_TAG}..HEAD)

if [ -z "$COMMITS_SINCE_TAG" ]; then
    print_info "No new commits since last tag"
    exit 0
fi

# Create changelog entries
FEATURES=""
FIXES=""
BREAKING_CHANGES=""
DOCS=""
STYLE=""
REFACTOR=""
PERF=""
TEST=""
CHORE=""

# Parse commits and categorize them
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
- **$SCOPE:** $DESCRIPTION ([$HASH](https://github.com/your-repo/commit/$HASH))"
    else
        case $TYPE in
            "feat")
                FEATURES="$FEATURES
- **$SCOPE:** $DESCRIPTION ([$HASH](https://github.com/your-repo/commit/$HASH))"
                ;;
            "fix")
                FIXES="$FIXES
- **$SCOPE:** $DESCRIPTION ([$HASH](https://github.com/your-repo/commit/$HASH))"
                ;;
            "docs")
                DOCS="$DOCS
- **$SCOPE:** $DESCRIPTION ([$HASH](https://github.com/your-repo/commit/$HASH))"
                ;;
            "style")
                STYLE="$STYLE
- **$SCOPE:** $DESCRIPTION ([$HASH](https://github.com/your-repo/commit/$HASH))"
                ;;
            "refactor")
                REFACTOR="$REFACTOR
- **$SCOPE:** $DESCRIPTION ([$HASH](https://github.com/your-repo/commit/$HASH))"
                ;;
            "perf")
                PERF="$PERF
- **$SCOPE:** $DESCRIPTION ([$HASH](https://github.com/your-repo/commit/$HASH))"
                ;;
            "test")
                TEST="$TEST
- **$SCOPE:** $DESCRIPTION ([$HASH](https://github.com/your-repo/commit/$HASH))"
                ;;
            "chore")
                CHORE="$CHORE
- **$SCOPE:** $DESCRIPTION ([$HASH](https://github.com/your-repo/commit/$HASH))"
                ;;
        esac
    fi
done <<< "$COMMITS_SINCE_TAG"

# Create changelog content
CHANGELOG_CONTENT=""

if [ ! -z "$BREAKING_CHANGES" ]; then
    CHANGELOG_CONTENT="$CHANGELOG_CONTENT

## 🚨 Breaking Changes
$BREAKING_CHANGES"
fi

if [ ! -z "$FEATURES" ]; then
    CHANGELOG_CONTENT="$CHANGELOG_CONTENT

## ✨ Features
$FEATURES"
fi

if [ ! -z "$FIXES" ]; then
    CHANGELOG_CONTENT="$CHANGELOG_CONTENT

## 🐛 Bug Fixes
$FIXES"
fi

if [ ! -z "$PERF" ]; then
    CHANGELOG_CONTENT="$CHANGELOG_CONTENT

## ⚡ Performance Improvements
$PERF"
fi

if [ ! -z "$REFACTOR" ]; then
    CHANGELOG_CONTENT="$CHANGELOG_CONTENT

## 🔧 Refactoring
$REFACTOR"
fi

if [ ! -z "$DOCS" ]; then
    CHANGELOG_CONTENT="$CHANGELOG_CONTENT

## 📚 Documentation
$DOCS"
fi

if [ ! -z "$TEST" ]; then
    CHANGELOG_CONTENT="$CHANGELOG_CONTENT

## 🧪 Tests
$TEST"
fi

if [ ! -z "$STYLE" ]; then
    CHANGELOG_CONTENT="$CHANGELOG_CONTENT

## 💄 Styles
$STYLE"
fi

if [ ! -z "$CHORE" ]; then
    CHANGELOG_CONTENT="$CHANGELOG_CONTENT

## 🔧 Chores
$CHORE"
fi

# Add release header
RELEASE_DATE=$(date +"%Y-%m-%d")
RELEASE_HEADER="## [v$CURRENT_VERSION] - $RELEASE_DATE"

# Update CHANGELOG.md
if [ ! -f "CHANGELOG.md" ]; then
    # Create new changelog
    cat > CHANGELOG.md << EOF
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

$RELEASE_HEADER$CHANGELOG_CONTENT

EOF
    print_status "Created new CHANGELOG.md"
else
    # Update existing changelog
    # Create temporary file
    TEMP_FILE=$(mktemp)
    
    # Add new release at the top (after the header)
    awk -v release="$RELEASE_HEADER" -v content="$CHANGELOG_CONTENT" '
    /^## \[Unreleased\]/ {
        print
        print ""
        print release content
        print ""
        next
    }
    { print }
    ' CHANGELOG.md > "$TEMP_FILE"
    
    # Replace original file
    mv "$TEMP_FILE" CHANGELOG.md
    print_status "Updated CHANGELOG.md"
fi

# Add changelog to git
git add CHANGELOG.md
print_status "Changelog staged for commit"

print_info "Changelog updated for version v$CURRENT_VERSION" 