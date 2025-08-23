# Cursor Rules Templates

This directory contains base template files for generating project-specific `.cursor/rules/` for all QuantaPilot™ generated projects.

## Available Templates

### Base Templates
- `project-documentation.mdc` - Documentation structure and maintenance rules
- `general-rules.mdc` - Code quality, testing, and development standards

## Template Structure

Each template includes:

- **Documentation requirements** - Ensures comprehensive project documentation
- **Code quality standards** - Best practices for clean, maintainable code  
- **Testing requirements** - Quality assurance and test coverage standards
- **Security practices** - Security guidelines and validation rules
- **Performance guidelines** - Optimization and monitoring standards

## Template Variables

Templates use the following variables that are replaced during generation:

- `{{PROJECT_NAME}}` - The project name
- `{{LANGUAGE_EXAMPLE}}` - Programming language for code examples

## Usage by QuantaPilot™

1. **PR/Architect Agent** analyzes project requirements
2. **Template Processing** applies both base templates to project
3. **Variable Substitution** replaces template variables with project-specific values
4. **Rules Generation** creates project-specific `.cursor/rules/`
5. **Validation** ensures rules are complete and properly formatted

## Template Validation

Templates are validated using:

```bash
npm run docs:validate-cursor-rules
```

This ensures proper `.mdc` format and required content sections.
