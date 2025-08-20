#!/bin/bash

# Test Automation Script for PhishGuard Project
# This script tests the Git automation workflow

echo "🧪 Testing Git Automation Workflow"
echo "=================================="

# Test 1: Check if we're in a Git repository
if [ -d ".git" ]; then
    echo "✅ Test 1: Git repository detected"
else
    echo "❌ Test 1: Not in a Git repository"
    exit 1
fi

# Test 2: Check if hooks exist
if [ -f ".git/hooks/pre-commit" ]; then
    echo "✅ Test 2: Pre-commit hook exists"
else
    echo "❌ Test 2: Pre-commit hook missing"
fi

if [ -f ".git/hooks/post-commit" ]; then
    echo "✅ Test 3: Post-commit hook exists"
else
    echo "❌ Test 3: Post-commit hook missing"
fi

if [ -f ".git/hooks/pre-push" ]; then
    echo "✅ Test 4: Pre-push hook exists"
else
    echo "❌ Test 4: Pre-push hook missing"
fi

# Test 3: Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "✅ Test 5: Current branch: $CURRENT_BRANCH"

# Test 4: Check Git configuration
if git config --get user.name >/dev/null 2>&1; then
    echo "✅ Test 6: Git user name configured"
else
    echo "❌ Test 6: Git user name not configured"
fi

if git config --get user.email >/dev/null 2>&1; then
    echo "✅ Test 7: Git user email configured"
else
    echo "❌ Test 7: Git user email not configured"
fi

echo ""
echo "🎉 Automation Test Complete!"
echo "==========================="
echo "Next steps:"
echo "1. Make a test commit to verify hooks work"
echo "2. Push to GitHub to test pre-push hook"
echo "3. Create a feature branch to test branch management" 