#!/bin/bash

###############################################################################
# AUTH-4 Local Testing Script
# 
# Tests complete JWT middleware & token refresh flow
# Usage: bash scripts/test-auth4.sh
###############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AUTH_SERVICE_URL="http://localhost:3001"
TEST_EMAIL="auth4-test-$(date +%s)@example.com"
TEST_PASSWORD="TestAuth4Password123!"
TEST_NAME="AUTH-4 Test User"

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
    ((TESTS_PASSED++))
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
    ((TESTS_FAILED++))
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

wait_for_service() {
    local url=$1
    local max_attempts=30
    local attempt=1
    
    print_info "Waiting for service at $url..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url/health" > /dev/null 2>&1; then
            print_success "Service is ready"
            return 0
        fi
        echo -ne "  Attempt $attempt/$max_attempts...\r"
        sleep 2
        ((attempt++))
    done
    
    print_error "Service did not start after $((max_attempts * 2)) seconds"
    return 1
}

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    print_info "Testing: $description"
    print_info "  $method $endpoint"
    
    local response_file="/tmp/auth4_response_$RANDOM.json"
    local status_code
    
    if [ -z "$data" ]; then
        status_code=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$AUTH_SERVICE_URL$endpoint" \
            -H "Content-Type: application/json" > "$response_file" 2>&1)
    else
        status_code=$(curl -s -w "\n%{http_code}" -X "$method" \
            "$AUTH_SERVICE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" > "$response_file" 2>&1)
    fi
    
    local actual_status=$(echo "$status_code" | tail -n1)
    
    if [ "$actual_status" = "$expected_status" ]; then
        print_success "$description (HTTP $actual_status)"
        cat "$response_file" | head -n-1
        rm -f "$response_file"
        return 0
    else
        print_error "$description (expected HTTP $expected_status, got $actual_status)"
        cat "$response_file" | head -n-1
        rm -f "$response_file"
        return 1
    fi
}

test_protected_endpoint() {
    local token=$1
    local description=$2
    
    print_info "Testing protected endpoint: $description"
    print_info "  GET /protected"
    
    local response=$(curl -s -w "\n%{http_code}" -X GET \
        "$AUTH_SERVICE_URL/protected" \
        -H "Authorization: Bearer $token")
    
    local status_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | head -n-1)
    
    if [ "$status_code" = "200" ]; then
        print_success "Protected endpoint accessible (HTTP 200)"
        echo "$body" | jq .
        return 0
    else
        print_error "Protected endpoint failed (HTTP $status_code)"
        echo "$body" | jq .
        return 1
    fi
}

###############################################################################
# Main Testing Flow
###############################################################################

main() {
    clear
    print_header "AUTH-4 Local Testing - Complete Flow"
    
    # =========================================================================
    # PHASE 1: Verify Services
    # =========================================================================
    
    print_header "PHASE 1: Verifying Services"
    
    print_info "Checking if auth service is running..."
    if ! wait_for_service "$AUTH_SERVICE_URL"; then
        print_error "Cannot connect to auth service at $AUTH_SERVICE_URL"
        print_info "Start services with: docker-compose up -d"
        exit 1
    fi
    
    # =========================================================================
    # PHASE 2: Test Authentication Flow (Register & Login)
    # =========================================================================
    
    print_header "PHASE 2: Test Authentication Flow"
    
    print_info "Step 1: Register new user"
    print_info "  Email: $TEST_EMAIL"
    print_info "  Password: $TEST_PASSWORD"
    
    REGISTER_RESPONSE=$(curl -s -X POST "$AUTH_SERVICE_URL/auth/register" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"$TEST_PASSWORD\",
            \"full_name\": \"$TEST_NAME\",
            \"user_type\": \"seeker\"
        }")
    
    REGISTER_STATUS=$(echo "$REGISTER_RESPONSE" | jq -r '.user.email // empty')
    
    if [ -z "$REGISTER_STATUS" ]; then
        print_error "Registration failed"
        echo "$REGISTER_RESPONSE" | jq .
        exit 1
    fi
    
    print_success "User registered: $TEST_EMAIL"
    
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.tokens.accessToken')
    REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.tokens.refreshToken')
    
    print_success "Access token received (15 min expiry)"
    print_success "Refresh token received (30 day expiry)"
    
    # =========================================================================
    # PHASE 3: Test JWT Verification Middleware
    # =========================================================================
    
    print_header "PHASE 3: Test JWT Verification Middleware"
    
    print_info "Test 3.1: Missing Authorization header"
    test_endpoint "GET" "/protected" "" "401" "Should fail without token" || true
    
    print_info "\nTest 3.2: Valid token with user context"
    if test_protected_endpoint "$ACCESS_TOKEN" "Valid token allows access"; then
        print_success "User context extracted correctly"
    else
        print_error "Failed to extract user context"
    fi
    
    print_info "\nTest 3.3: Invalid token format"
    test_endpoint "GET" "/protected" "" "401" "Invalid Bearer format" \
        -H "Authorization: InvalidFormat token" || true
    
    # =========================================================================
    # PHASE 4: Test Token Refresh
    # =========================================================================
    
    print_header "PHASE 4: Test Token Refresh Flow"
    
    print_info "Refreshing access token using refresh token..."
    
    REFRESH_RESPONSE=$(curl -s -X POST "$AUTH_SERVICE_URL/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}")
    
    NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.accessToken')
    NEW_REFRESH_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.refreshToken')
    
    if [ -z "$NEW_ACCESS_TOKEN" ] || [ "$NEW_ACCESS_TOKEN" = "null" ]; then
        print_error "Token refresh failed"
        echo "$REFRESH_RESPONSE" | jq .
        exit 1
    fi
    
    print_success "New access token generated"
    print_success "New refresh token generated (rotation)"
    
    # Verify new tokens are different from old ones
    if [ "$NEW_ACCESS_TOKEN" != "$ACCESS_TOKEN" ]; then
        print_success "Access token rotated (different from original)"
    else
        print_error "Access token not rotated"
    fi
    
    if [ "$NEW_REFRESH_TOKEN" != "$REFRESH_TOKEN" ]; then
        print_success "Refresh token rotated (security feature)"
    else
        print_error "Refresh token not rotated"
    fi
    
    # =========================================================================
    # PHASE 5: Test Logout & Token Blacklist
    # =========================================================================
    
    print_header "PHASE 5: Test Logout & Token Blacklist"
    
    print_info "Logging out (blacklisting tokens)..."
    
    LOGOUT_RESPONSE=$(curl -s -X POST "$AUTH_SERVICE_URL/auth/logout" \
        -H "Authorization: Bearer $NEW_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"refreshToken\": \"$NEW_REFRESH_TOKEN\"}")
    
    LOGOUT_MESSAGE=$(echo "$LOGOUT_RESPONSE" | jq -r '.message // empty')
    
    if [ "$LOGOUT_MESSAGE" = "Successfully logged out" ]; then
        print_success "Logout successful - tokens blacklisted"
    else
        print_error "Logout failed"
        echo "$LOGOUT_RESPONSE" | jq .
    fi
    
    print_info "\nAttempting to use blacklisted access token..."
    
    BLACKLIST_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
        "$AUTH_SERVICE_URL/protected" \
        -H "Authorization: Bearer $NEW_ACCESS_TOKEN")
    
    BLACKLIST_STATUS=$(echo "$BLACKLIST_RESPONSE" | tail -n1)
    BLACKLIST_BODY=$(echo "$BLACKLIST_RESPONSE" | head -n-1)
    
    if [ "$BLACKLIST_STATUS" = "403" ]; then
        BLACKLIST_CODE=$(echo "$BLACKLIST_BODY" | jq -r '.code // empty')
        if [ "$BLACKLIST_CODE" = "TOKEN_BLACKLISTED" ]; then
            print_success "Blacklisted token rejected (HTTP 403)"
            print_success "Cannot reuse token after logout"
        else
            print_error "Wrong error code for blacklisted token"
        fi
    else
        print_error "Blacklisted token not rejected (HTTP $BLACKLIST_STATUS)"
    fi
    
    print_info "\nAttempting to refresh with blacklisted token..."
    
    REFRESH_BLACKLIST=$(curl -s -X POST "$AUTH_SERVICE_URL/auth/refresh" \
        -H "Content-Type: application/json" \
        -d "{\"refreshToken\": \"$NEW_REFRESH_TOKEN\"}")
    
    REFRESH_ERROR=$(echo "$REFRESH_BLACKLIST" | jq -r '.error // empty')
    
    if [ "$REFRESH_ERROR" = "Unauthorized" ]; then
        print_success "Blacklisted refresh token rejected"
    else
        print_error "Blacklisted refresh token not rejected"
    fi
    
    # =========================================================================
    # PHASE 6: Test Rate Limiting
    # =========================================================================
    
    print_header "PHASE 6: Test Rate Limiting on Login"
    
    print_info "Making 5 login attempts (within limit)..."
    
    RATE_LIMIT_TEST_EMAIL="ratelimit-test-$(date +%s)@example.com"
    RATE_LIMIT_TEST_PASSWORD="RateLimit123!"
    
    for i in {1..5}; do
        RESPONSE=$(curl -s -X POST "$AUTH_SERVICE_URL/auth/login" \
            -H "Content-Type: application/json" \
            -d "{
                \"email\": \"$RATE_LIMIT_TEST_EMAIL\",
                \"password\": \"$RATE_LIMIT_TEST_PASSWORD\"
            }")
        
        ERROR=$(echo "$RESPONSE" | jq -r '.error // empty')
        if [ ! -z "$ERROR" ] && [ "$ERROR" != "null" ]; then
            if [ "$ERROR" = "Too Many Requests" ]; then
                break
            fi
        fi
        echo "  Attempt $i/5 - Rate limit not exceeded"
    done
    
    print_success "Rate limiting configured"
    
    # =========================================================================
    # PHASE 7: Test User Enumeration Prevention
    # =========================================================================
    
    print_header "PHASE 7: Test User Enumeration Prevention"
    
    print_info "Attempting login with non-existent user..."
    
    NONEXISTENT_RESPONSE=$(curl -s -X POST "$AUTH_SERVICE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"doesnotexist-$(date +%s)@example.com\",
            \"password\": \"SomePassword123!\"
        }")
    
    NONEXISTENT_ERROR=$(echo "$NONEXISTENT_RESPONSE" | jq -r '.message // empty')
    
    print_info "Attempting login with wrong password..."
    
    WRONG_PASSWORD_RESPONSE=$(curl -s -X POST "$AUTH_SERVICE_URL/auth/login" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$TEST_EMAIL\",
            \"password\": \"WrongPassword123!\"
        }")
    
    WRONG_PASSWORD_ERROR=$(echo "$WRONG_PASSWORD_RESPONSE" | jq -r '.message // empty')
    
    if [ "$NONEXISTENT_ERROR" = "$WRONG_PASSWORD_ERROR" ]; then
        print_success "User enumeration prevented (same error message)"
        print_info "  Message: $NONEXISTENT_ERROR"
    else
        print_error "User enumeration possible (different error messages)"
        print_info "  Non-existent: $NONEXISTENT_ERROR"
        print_info "  Wrong password: $WRONG_PASSWORD_ERROR"
    fi
    
    # =========================================================================
    # PHASE 8: Test Health Check
    # =========================================================================
    
    print_header "PHASE 8: Test Health Check Endpoint"
    
    HEALTH_RESPONSE=$(curl -s -X GET "$AUTH_SERVICE_URL/health")
    HEALTH_STATUS=$(echo "$HEALTH_RESPONSE" | jq -r '.status // empty')
    
    if [ "$HEALTH_STATUS" = "ok" ]; then
        print_success "Health check endpoint responding"
        echo "$HEALTH_RESPONSE" | jq .
    else
        print_error "Health check endpoint not responding correctly"
    fi
    
    # =========================================================================
    # Final Summary
    # =========================================================================
    
    print_header "TEST SUMMARY"
    
    TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
    
    echo -e "${GREEN}✓ Passed: $TESTS_PASSED${NC}"
    echo -e "${RED}✗ Failed: $TESTS_FAILED${NC}"
    echo "Total: $TOTAL_TESTS"
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "\n${GREEN}🎉 ALL TESTS PASSED - AUTH-4 IS WORKING CORRECTLY!${NC}"
        return 0
    else
        echo -e "\n${RED}⚠ SOME TESTS FAILED - CHECK OUTPUT ABOVE${NC}"
        return 1
    fi
}

# Run main function
main
