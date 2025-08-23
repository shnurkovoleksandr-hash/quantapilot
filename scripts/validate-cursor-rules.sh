#!/bin/bash

# QuantaPilot™ .cursor/rules Validation Script
# Validates that all Cursor rules are properly formatted and complete

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Function to validate .mdc file format
validate_mdc_file() {
    local file=$1
    local errors=0
    
    print_status "Validating $file..."
    
    # Check if file exists
    if [ ! -f "$file" ]; then
        print_error "File does not exist: $file"
        return 1
    fi
    
    # Check if file starts with YAML frontmatter
    if ! head -n 1 "$file" | grep -q "^---$"; then
        print_error "File must start with YAML frontmatter: $file"
        errors=$((errors + 1))
    fi
    
    # Check for required frontmatter fields
    if ! grep -q "^description:" "$file"; then
        print_error "Missing 'description' field in frontmatter: $file"
        errors=$((errors + 1))
    fi
    
    if ! grep -q "^globs:" "$file"; then
        print_error "Missing 'globs' field in frontmatter: $file"
        errors=$((errors + 1))
    fi
    
    if ! grep -q "^alwaysApply:" "$file"; then
        print_error "Missing 'alwaysApply' field in frontmatter: $file"
        errors=$((errors + 1))
    fi
    
    # Check if alwaysApply is set to false as required
    if ! grep -q "^alwaysApply: false$" "$file"; then
        print_error "'alwaysApply' must be set to 'false': $file"
        errors=$((errors + 1))
    fi
    
    # Check if description is not empty
    if grep -q "^description: *$" "$file"; then
        print_error "Description cannot be empty: $file"
        errors=$((errors + 1))
    fi
    
    # Check if globs array is not empty
    if grep -q "^globs: \[\]$" "$file"; then
        print_error "Globs array cannot be empty: $file"
        errors=$((errors + 1))
    fi
    
    # Check for proper YAML frontmatter closure
    if ! sed -n '2,/^---$/p' "$file" | tail -n 1 | grep -q "^---$"; then
        print_error "YAML frontmatter not properly closed: $file"
        errors=$((errors + 1))
    fi
    
    # Check file has content after frontmatter
    local content_lines=$(sed -n '/^---$/,$p' "$file" | tail -n +2 | wc -l)
    if [ "$content_lines" -lt 10 ]; then
        print_error "File appears to have insufficient content: $file"
        errors=$((errors + 1))
    fi
    
    # Check for documentation compliance mentions
    if [ "$(basename "$file")" = "documentation-compliance.mdc" ]; then
        if ! grep -q "MANDATORY DOCUMENTATION REQUIREMENTS" "$file"; then
            print_error "Documentation compliance file missing mandatory requirements section: $file"
            errors=$((errors + 1))
        fi
    fi
    
    # Check for code documentation standards
    if [ "$(basename "$file")" = "code-documentation.mdc" ]; then
        if ! grep -q "MANDATORY INLINE DOCUMENTATION" "$file"; then
            print_error "Code documentation file missing mandatory inline documentation section: $file"
            errors=$((errors + 1))
        fi
    fi
    
    # Check for API documentation standards
    if [ "$(basename "$file")" = "api-documentation.mdc" ]; then
        if ! grep -q "MANDATORY API DOCUMENTATION REQUIREMENTS" "$file"; then
            print_error "API documentation file missing mandatory API requirements section: $file"
            errors=$((errors + 1))
        fi
    fi
    
    # Check for architecture documentation standards
    if [ "$(basename "$file")" = "architecture-documentation.mdc" ]; then
        if ! grep -q "MANDATORY ARCHITECTURAL DOCUMENTATION" "$file"; then
            print_error "Architecture documentation file missing mandatory architectural documentation section: $file"
            errors=$((errors + 1))
        fi
    fi
    
    if [ $errors -eq 0 ]; then
        print_success "✓ $file is valid"
        return 0
    else
        print_error "✗ $file has $errors error(s)"
        return 1
    fi
}

# Function to check glob coverage
check_glob_coverage() {
    print_status "Checking glob pattern coverage..."
    
    local required_patterns=(
        "**/*.js" "**/*.ts" "**/*.tsx" "**/*.jsx"
        "**/*.py" "**/*.java" "**/*.cs" "**/*.go"
        "**/*.rb" "**/*.php" "**/*.cpp" "**/*.c"
        "**/*.rs" "**/*.kt" "**/*.swift" "**/*.dart"
        "**/*.md" "**/*.json" "**/*.yaml" "**/*.yml"
        "**/*.html" "**/*.css" "**/*.scss"
        "**/package.json" "**/requirements.txt"
        "**/Dockerfile" "**/docker-compose.yml"
    )
    
    local missing_patterns=()
    
    for pattern in "${required_patterns[@]}"; do
        if ! grep -r "\"$pattern\"" .cursor/rules/ > /dev/null 2>&1; then
            missing_patterns+=("$pattern")
        fi
    done
    
    if [ ${#missing_patterns[@]} -eq 0 ]; then
        print_success "All required glob patterns are covered"
    else
        print_warning "Missing glob patterns in .cursor/rules files:"
        for pattern in "${missing_patterns[@]}"; do
            echo "  - $pattern"
        done
    fi
}

# Function to validate content quality
validate_content_quality() {
    local file=$1
    print_status "Validating content quality for $file..."
    
    # Check for proper markdown headers
    if ! grep -q "^# " "$file"; then
        print_warning "File should have at least one H1 header: $file"
    fi
    
    # Check for examples
    if ! grep -q "\`\`\`" "$file"; then
        print_warning "File should include code examples: $file"
    fi
    
    # Check for proper sections structure
    if [ "$(basename "$file")" = "documentation-compliance.mdc" ]; then
        local required_sections=(
            "BEFORE ANY CODE CHANGES"
            "DOCUMENTATION STRUCTURE COMPLIANCE"
            "MANDATORY UPDATES FOR EVERY CHANGE"
            "DOCUMENTATION QUALITY STANDARDS"
            "VALIDATION REQUIREMENTS"
        )
        
        for section in "${required_sections[@]}"; do
            if ! grep -q "$section" "$file"; then
                print_warning "Missing required section '$section' in $file"
            fi
        done
    fi
}

# Main validation function
main() {
    echo "======================================"
    echo "  QuantaPilot™ .cursor/rules Validator"
    echo "======================================"
    echo ""
    
    # Check if .cursor/rules directory exists
    if [ ! -d ".cursor/rules" ]; then
        print_error ".cursor/rules directory does not exist"
        exit 1
    fi
    
    # Find all .mdc files
    local mdc_files=($(find .cursor/rules -name "*.mdc" | sort))
    
    if [ ${#mdc_files[@]} -eq 0 ]; then
        print_error "No .mdc files found in .cursor/rules directory"
        exit 1
    fi
    
    print_status "Found ${#mdc_files[@]} .mdc files to validate"
    echo ""
    
    local total_errors=0
    
    # Validate each .mdc file
    for file in "${mdc_files[@]}"; do
        if ! validate_mdc_file "$file"; then
            total_errors=$((total_errors + 1))
        fi
        validate_content_quality "$file"
        echo ""
    done
    
    # Check glob coverage
    check_glob_coverage
    echo ""
    
    # Check for required files
    local required_files=(
        ".cursor/rules/documentation-compliance.mdc"
        ".cursor/rules/code-documentation.mdc"
        ".cursor/rules/api-documentation.mdc"
        ".cursor/rules/architecture-documentation.mdc"
    )
    
    print_status "Checking for required rule files..."
    for required_file in "${required_files[@]}"; do
        if [ -f "$required_file" ]; then
            print_success "Required file exists: $(basename "$required_file")"
        else
            print_error "Missing required file: $required_file"
            total_errors=$((total_errors + 1))
        fi
    done
    
    echo ""
    
    # Summary
    if [ $total_errors -eq 0 ]; then
        print_success "All .cursor/rules files are valid!"
        print_status "QuantaPilot™ documentation compliance rules are properly configured."
    else
        print_error "Validation failed with $total_errors error(s)"
        print_error "Please fix the errors above before proceeding."
        exit 1
    fi
    
    echo ""
    print_status "Validation Summary:"
    echo "  - Files validated: ${#mdc_files[@]}"
    echo "  - Required files: ${#required_files[@]}"
    echo "  - Errors found: $total_errors"
    echo ""
    print_success "✓ .cursor/rules validation completed successfully"
}

# Run validation
main "$@"
