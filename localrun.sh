#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if a service is running
is_service_running() {
    if command_exists pg_isready; then
        pg_isready -q -h localhost -p 5432 >/dev/null 2>&1
    else
        # Fallback: try to connect
        psql -h localhost -p 5432 -U postgres -c "SELECT 1" >/dev/null 2>&1
    fi
}

is_redis_running() {
    if command_exists redis-cli; then
        redis-cli ping >/dev/null 2>&1
    else
        return 1
    fi
}

# Function to wait for service
wait_for_service() {
    local service_name=$1
    local check_func=$2
    local max_attempts=30
    local attempt=1

    print_info "Waiting for $service_name to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if $check_func; then
            print_success "$service_name is ready!"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    print_error "$service_name is not ready after $max_attempts attempts"
    return 1
}

# Function to open a new terminal window (macOS)
open_terminal() {
    local title=$1
    local command=$2
    local dir=$3
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        osascript -e "tell application \"Terminal\"" \
                  -e "do script \"cd '$dir' && $command\"" \
                  -e "set custom title of front window to \"$title\"" \
                  -e "end tell" > /dev/null 2>&1
    else
        # For Linux, try to use gnome-terminal or xterm
        if command_exists gnome-terminal; then
            gnome-terminal --title="$title" -- bash -c "cd '$dir' && $command; exec bash" > /dev/null 2>&1
        elif command_exists xterm; then
            xterm -T "$title" -e bash -c "cd '$dir' && $command; exec bash" > /dev/null 2>&1 &
        else
            print_warning "Could not open separate terminal. Running in background instead."
            return 1
        fi
    fi
}

# Function to cleanup background processes on exit
cleanup() {
    if [ "$SEPARATE_TERMINALS" = false ]; then
        print_info "Cleaning up background processes..."
        if [ ! -z "$DAPHNE_PID" ]; then
            kill $DAPHNE_PID 2>/dev/null
        fi
        if [ ! -z "$CELERY_PID" ]; then
            kill $CELERY_PID 2>/dev/null
        fi
        if [ ! -z "$FRONTEND_PID" ]; then
            kill $FRONTEND_PID 2>/dev/null
        fi
    fi
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM EXIT

# Parse command line arguments
RUN_BACKGROUND=false
SKIP_CHECKS=false
SKIP_MIGRATIONS=false
SEPARATE_TERMINALS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --background|-b)
            RUN_BACKGROUND=true
            shift
            ;;
        --terminals|-t)
            SEPARATE_TERMINALS=true
            shift
            ;;
        --skip-checks|-s)
            SKIP_CHECKS=true
            shift
            ;;
        --skip-migrations|-m)
            SKIP_MIGRATIONS=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -b, --background        Run all services in background (logs to /tmp)"
            echo "  -t, --terminals         Run each service in a separate terminal window"
            echo "  -s, --skip-checks       Skip PostgreSQL and Redis checks"
            echo "  -m, --skip-migrations   Skip database migrations"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

print_info "Starting Greaby Shorts Studio local development environment..."
echo ""

# Check prerequisites
if [ "$SKIP_CHECKS" = false ]; then
    print_info "Checking prerequisites..."
    
    # Check PostgreSQL
    if ! is_service_running; then
        print_warning "PostgreSQL doesn't seem to be running on localhost:5432"
        print_info "Please ensure PostgreSQL is running before continuing"
        print_info "You can start it with: brew services start postgresql (macOS) or sudo systemctl start postgresql (Linux)"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "PostgreSQL is running"
    fi
    
    # Check Redis
    if ! is_redis_running; then
        print_warning "Redis doesn't seem to be running"
        print_info "Please ensure Redis is running before continuing"
        print_info "You can start it with: brew services start redis (macOS) or sudo systemctl start redis (Linux)"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    else
        print_success "Redis is running"
    fi
fi

# Get the script directory (project root)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR" || { print_error "Failed to change to script directory"; exit 1; }

# Check and activate Python virtual environment
print_info "Checking Python environment..."
if [ -d ".venv" ]; then
    print_info "Activating existing .venv virtual environment..."
    source .venv/bin/activate || { print_error "Failed to activate .venv virtual environment"; exit 1; }
    print_success "Virtual environment activated"
elif [ -d "greaby_backend/venv" ]; then
    print_info "Activating greaby_backend/venv virtual environment..."
    source greaby_backend/venv/bin/activate || { print_error "Failed to activate virtual environment"; exit 1; }
    print_success "Virtual environment activated"
else
    print_warning "No virtual environment found (.venv or greaby_backend/venv)"
    print_info "Please create and activate a virtual environment before running this script"
    exit 1
fi

# Check greaby_backend directory exists
if [ ! -d "greaby_backend" ]; then
    print_error "greaby_backend directory not found!"
    exit 1
fi

# Run migrations
if [ "$SKIP_MIGRATIONS" = false ]; then
    print_info "Running database migrations..."
    cd greaby_backend || { print_error "Failed to change to greaby_backend directory"; exit 1; }
    python manage.py migrate --noinput || { print_error "Failed to run migrations"; exit 1; }
    cd "$SCRIPT_DIR" || { print_error "Failed to return to project root"; exit 1; }
    print_success "Database migrations completed"
fi




# Start Daphne (Django backend) - must run from greaby_backend directory
BACKEND_DIR="$SCRIPT_DIR/greaby_backend"
print_info "Starting Daphne server on port 8000..."
cd "$BACKEND_DIR" || { print_error "Failed to change to greaby_backend directory"; exit 1; }

if [ "$SEPARATE_TERMINALS" = true ]; then
    # Activate venv and run in separate terminal
    if [ -d "$SCRIPT_DIR/.venv" ]; then
        VENV_ACTIVATE="source '$SCRIPT_DIR/.venv/bin/activate' && "
    elif [ -d "$BACKEND_DIR/venv" ]; then
        VENV_ACTIVATE="source '$BACKEND_DIR/venv/bin/activate' && "
    else
        VENV_ACTIVATE=""
    fi
    open_terminal "Daphne - Backend API" \
                  "${VENV_ACTIVATE}daphne -b 0.0.0.0 -p 8000 greaby_project.asgi:application" \
                  "$BACKEND_DIR"
    print_success "Daphne started in separate terminal window"
    sleep 2
elif [ "$RUN_BACKGROUND" = true ]; then
    daphne -b 0.0.0.0 -p 8000 greaby_project.asgi:application > /tmp/daphne.log 2>&1 &
    DAPHNE_PID=$!
    print_success "Daphne started in background (PID: $DAPHNE_PID)"
    sleep 2
else
    daphne -b 0.0.0.0 -p 8000 greaby_project.asgi:application > /tmp/daphne.log 2>&1 &
    DAPHNE_PID=$!
    print_success "Daphne started (PID: $DAPHNE_PID)"
fi

# Start Celery worker - must run from greaby_backend directory
print_info "Starting Celery worker..."
if [ "$SEPARATE_TERMINALS" = true ]; then
    # Activate venv and run in separate terminal
    if [ -d "$SCRIPT_DIR/.venv" ]; then
        VENV_ACTIVATE="source '$SCRIPT_DIR/.venv/bin/activate' && "
    elif [ -d "$BACKEND_DIR/venv" ]; then
        VENV_ACTIVATE="source '$BACKEND_DIR/venv/bin/activate' && "
    else
        VENV_ACTIVATE=""
    fi
    open_terminal "Celery Worker" \
                  "${VENV_ACTIVATE}celery -A greaby_project worker -l info --pool=threads" \
                  "$BACKEND_DIR"
    print_success "Celery worker started in separate terminal window"
    sleep 2
elif [ "$RUN_BACKGROUND" = true ]; then
    celery -A greaby_project worker -l info --pool=threads > /tmp/celery.log 2>&1 &
    CELERY_PID=$!
    print_success "Celery worker started in background (PID: $CELERY_PID)"
    sleep 2
else
    celery -A greaby_project worker -l info --pool=threads > /tmp/celery.log 2>&1 &
    CELERY_PID=$!
    print_success "Celery worker started (PID: $CELERY_PID)"
fi

# Return to project root for frontend
cd "$SCRIPT_DIR" || { print_error "Failed to return to project root"; exit 1; }

# Check Node.js dependencies
print_info "Checking Node.js environment..."
if [ ! -d "node_modules" ]; then
    print_warning "Node modules not found"
    print_info "Installing Node.js dependencies..."
    npm install || { print_error "Failed to install Node.js dependencies"; exit 1; }
    print_success "Node.js dependencies installed"
fi

# Start Frontend dev server
print_info "Starting Vite dev server on port 5173..."
if [ "$SEPARATE_TERMINALS" = true ]; then
    open_terminal "Vite - Frontend Dev Server" \
                  "npm run dev" \
                  "$SCRIPT_DIR"
    print_success "Frontend dev server started in separate terminal window"
    sleep 3
elif [ "$RUN_BACKGROUND" = true ]; then
    npm run dev > /tmp/vite.log 2>&1 &
    FRONTEND_PID=$!
    print_success "Frontend dev server started in background (PID: $FRONTEND_PID)"
    sleep 3
else
    npm run dev &
    FRONTEND_PID=$!
    print_success "Frontend dev server started (PID: $FRONTEND_PID)"
fi

echo ""
print_success "All services started successfully!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Services running:"
echo "  • Backend API:    http://localhost:8000"
echo "  • Frontend:       http://localhost:5173"
echo "  • Celery Worker:  Running"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ "$SEPARATE_TERMINALS" = true ]; then
    echo "  All services are running in separate terminal windows."
    echo "  Close the terminal windows to stop each service."
    echo ""
    echo "  Press Ctrl+C to exit this script (services will continue running)"
    echo ""
    # Don't wait for processes since they're in separate terminals
    # Just wait for user to exit
    read -p "Press Enter to exit (services will continue running in their terminals)..."
elif [ "$RUN_BACKGROUND" = true ]; then
    echo "  Logs:"
    echo "  • Daphne:   tail -f /tmp/daphne.log"
    echo "  • Celery:   tail -f /tmp/celery.log"
    echo "  • Frontend: tail -f /tmp/vite.log"
    echo ""
    echo "  Press Ctrl+C to stop all services"
    echo ""
    # Wait for user interrupt
    wait
else
    echo "  Press Ctrl+C to stop all services"
    echo ""
    # Wait for all background processes
    wait
fi

