#!/bin/bash

# =============================================================================
# Fluid-Calendar ADHD Edition - Setup Script
# =============================================================================
# Este script automatiza la configuración inicial del proyecto
#
# Uso:
#   chmod +x scripts/setup.sh
#   ./scripts/setup.sh
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  Fluid-Calendar ADHD Edition - Setup                    ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if Docker is running
docker_running() {
    docker ps >/dev/null 2>&1
}

# =============================================================================
# STEP 1: Check Prerequisites
# =============================================================================
check_prerequisites() {
    print_info "Checking prerequisites..."

    local missing_deps=0

    # Check Node.js
    if command_exists node; then
        NODE_VERSION=$(node -v)
        print_success "Node.js installed: $NODE_VERSION"

        # Check if Node version is 18 or higher
        MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
        if [ "$MAJOR_VERSION" -lt 18 ]; then
            print_warning "Node.js 18+ recommended (you have $NODE_VERSION)"
        fi
    else
        print_error "Node.js not found. Please install Node.js 18+"
        missing_deps=1
    fi

    # Check npm
    if command_exists npm; then
        NPM_VERSION=$(npm -v)
        print_success "npm installed: $NPM_VERSION"
    else
        print_error "npm not found"
        missing_deps=1
    fi

    # Check Docker (optional)
    if command_exists docker; then
        if docker_running; then
            print_success "Docker installed and running"
        else
            print_warning "Docker installed but not running (will use local PostgreSQL)"
        fi
    else
        print_warning "Docker not found (will use local PostgreSQL)"
    fi

    # Check PostgreSQL (if Docker not running)
    if ! docker_running; then
        if command_exists psql; then
            PSQL_VERSION=$(psql --version | cut -d' ' -f3)
            print_success "PostgreSQL installed: $PSQL_VERSION"
        else
            print_error "PostgreSQL not found. Install Docker or PostgreSQL"
            missing_deps=1
        fi
    fi

    # Check openssl for generating secrets
    if command_exists openssl; then
        print_success "OpenSSL installed"
    else
        print_warning "OpenSSL not found (will use random string for NEXTAUTH_SECRET)"
    fi

    if [ $missing_deps -eq 1 ]; then
        print_error "Missing required dependencies. Please install them and try again."
        exit 1
    fi

    echo ""
}

# =============================================================================
# STEP 2: Install Dependencies
# =============================================================================
install_dependencies() {
    print_info "Installing npm dependencies..."

    if [ -d "node_modules" ]; then
        print_warning "node_modules already exists, skipping npm install"
    else
        npm install
        print_success "Dependencies installed"
    fi

    echo ""
}

# =============================================================================
# STEP 3: Setup Database
# =============================================================================
setup_database() {
    print_info "Setting up database..."

    # Check if Docker is available and running
    if docker_running; then
        print_info "Starting PostgreSQL with Docker Compose..."

        if [ -f "docker-compose.yml" ]; then
            docker compose up db -d
            print_success "PostgreSQL container started"

            # Wait for PostgreSQL to be ready
            print_info "Waiting for PostgreSQL to be ready..."
            sleep 5

            DATABASE_URL="postgresql://fluid:fluid@localhost:5432/fluid_calendar"
        else
            print_error "docker-compose.yml not found"
            exit 1
        fi
    else
        print_warning "Docker not running, using local PostgreSQL"

        # Ask for PostgreSQL credentials
        read -p "PostgreSQL host (default: localhost): " PG_HOST
        PG_HOST=${PG_HOST:-localhost}

        read -p "PostgreSQL port (default: 5432): " PG_PORT
        PG_PORT=${PG_PORT:-5432}

        read -p "PostgreSQL user (default: postgres): " PG_USER
        PG_USER=${PG_USER:-postgres}

        read -sp "PostgreSQL password: " PG_PASSWORD
        echo ""

        read -p "Database name (default: fluid_calendar): " PG_DB
        PG_DB=${PG_DB:-fluid_calendar}

        DATABASE_URL="postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DB}"

        # Try to create database
        print_info "Creating database $PG_DB..."
        PGPASSWORD=$PG_PASSWORD createdb -h $PG_HOST -p $PG_PORT -U $PG_USER $PG_DB 2>/dev/null || print_warning "Database may already exist"
    fi

    echo ""
}

# =============================================================================
# STEP 4: Setup Environment Variables
# =============================================================================
setup_env() {
    print_info "Setting up environment variables..."

    if [ -f ".env.local" ]; then
        read -p ".env.local already exists. Overwrite? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Keeping existing .env.local"
            echo ""
            return
        fi
    fi

    # Generate NEXTAUTH_SECRET
    if command_exists openssl; then
        NEXTAUTH_SECRET=$(openssl rand -base64 32)
    else
        NEXTAUTH_SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
    fi

    # Create .env.local
    cat > .env.local << EOF
# =============================================================================
# FLUID-CALENDAR ADHD EDITION - ENVIRONMENT CONFIGURATION
# =============================================================================
# Generated by setup script on $(date)
#
# IMPORTANT: This file contains secrets. Do NOT commit to Git!
# =============================================================================

# Database
DATABASE_URL="$DATABASE_URL"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
NEXTAUTH_SECRET="$NEXTAUTH_SECRET"

# Feature Flags
NEXT_PUBLIC_ENABLE_SAAS_FEATURES=false
PUBLIC_SIGNUP_ENABLED=true

# Development
NODE_ENV="development"
LOG_LEVEL="info"

# =============================================================================
# TODO: Add your API keys below
# =============================================================================

# Google OAuth (REQUIRED for Calendar/Tasks sync)
# Get from: https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Microsoft OAuth (OPTIONAL for Outlook)
# Get from: https://portal.azure.com/
AZURE_AD_CLIENT_ID=""
AZURE_AD_CLIENT_SECRET=""
AZURE_AD_TENANT_ID="common"

# Email Service (OPTIONAL)
# Get from: https://resend.com
RESEND_API_KEY=""
RESEND_FROM_EMAIL=""

# Wearables (PHASE 2 - not needed yet)
# Get from: https://dev.fitbit.com/apps
FITBIT_CLIENT_ID=""
FITBIT_CLIENT_SECRET=""

# AI/LLM (PHASE 2 - not needed yet)
# Get from: https://platform.openai.com/api-keys or https://console.groq.com/keys
OPENAI_API_KEY=""
GROQ_API_KEY=""

EOF

    print_success ".env.local created"
    print_warning "⚠️  IMPORTANT: Add your Google OAuth credentials to .env.local"
    print_info "See SETUP.md for detailed instructions on getting Google API keys"

    echo ""
}

# =============================================================================
# STEP 5: Run Prisma Migration
# =============================================================================
run_migration() {
    print_info "Running Prisma migration..."

    # Check if migration already exists
    if [ -d "prisma/migrations" ] && [ "$(ls -A prisma/migrations)" ]; then
        read -p "Migrations already exist. Reset database? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            print_warning "Resetting database (this will delete all data)..."
            npx prisma migrate reset --force
        else
            print_info "Applying existing migrations..."
            npx prisma migrate deploy
        fi
    else
        print_info "Creating initial migration..."
        npx prisma migrate dev --name add_adhd_features
    fi

    print_success "Database migration completed"

    # Generate Prisma Client
    print_info "Generating Prisma Client..."
    npx prisma generate
    print_success "Prisma Client generated"

    echo ""
}

# =============================================================================
# STEP 6: Verify Setup
# =============================================================================
verify_setup() {
    print_info "Verifying setup..."

    local errors=0

    # Check .env.local exists
    if [ -f ".env.local" ]; then
        print_success ".env.local exists"
    else
        print_error ".env.local not found"
        errors=1
    fi

    # Check node_modules
    if [ -d "node_modules" ]; then
        print_success "node_modules exists"
    else
        print_error "node_modules not found"
        errors=1
    fi

    # Check Prisma Client
    if [ -d "node_modules/.prisma/client" ]; then
        print_success "Prisma Client generated"
    else
        print_error "Prisma Client not generated"
        errors=1
    fi

    # Check database connection
    print_info "Testing database connection..."
    if npx prisma db execute --stdin <<< "SELECT 1;" >/dev/null 2>&1; then
        print_success "Database connection successful"
    else
        print_error "Database connection failed"
        errors=1
    fi

    if [ $errors -eq 0 ]; then
        print_success "All checks passed!"
    else
        print_warning "Some checks failed. Please review and fix."
    fi

    echo ""
}

# =============================================================================
# STEP 7: Next Steps
# =============================================================================
show_next_steps() {
    echo ""
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║${NC}  Setup Complete! 🎉                                      ${GREEN}║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo ""
    echo "1. Add your Google OAuth credentials to .env.local:"
    echo "   - GOOGLE_CLIENT_ID"
    echo "   - GOOGLE_CLIENT_SECRET"
    echo "   See SETUP.md for detailed instructions"
    echo ""
    echo "2. Start the development server:"
    echo -e "   ${YELLOW}npm run dev${NC}"
    echo ""
    echo "3. Open in browser:"
    echo -e "   ${BLUE}http://localhost:3000${NC}"
    echo ""
    echo "4. (Optional) Open Prisma Studio to view database:"
    echo -e "   ${YELLOW}npx prisma studio${NC}"
    echo ""
    echo "📖 Documentation:"
    echo "   - SETUP.md - Detailed setup guide"
    echo "   - ADHD_IMPLEMENTATION.md - Implementation details"
    echo ""
    echo -e "${GREEN}Happy coding! 🚀${NC}"
    echo ""
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================
main() {
    print_header

    check_prerequisites
    install_dependencies
    setup_database
    setup_env
    run_migration
    verify_setup
    show_next_steps
}

# Run main function
main
