# Contributing to QuantaPilot™

First off, thank you for considering contributing to QuantaPilot™! It's people like you that make
QuantaPilot™ such a great tool for autonomous software development.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Process](#development-process)
- [Style Guidelines](#style-guidelines)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating,
you are expected to uphold this code. Please report unacceptable behavior to
[conduct@quantapilot.com](mailto:conduct@quantapilot.com).

### Our Pledge

We are committed to making participation in this project a harassment-free experience for everyone,
regardless of age, body size, disability, ethnicity, gender identity and expression, level of
experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

## Getting Started

### Prerequisites

- Node.js 18+ and npm 9+
- Docker 20.10+ and Docker Compose v2
- Git
- Basic understanding of microservices architecture
- Familiarity with n8n workflows (helpful but not required)

### Development Setup

1. **Fork and Clone**

   ```bash
   git clone https://github.com/your-username/quantapilot.git
   cd quantapilot
   ```

2. **Environment Setup**

   ```bash
   ./scripts/setup.sh
   cp .env.example .env
   # Edit .env with your development values
   ```

3. **Start Development Environment**

   ```bash
   npm run dev
   ```

4. **Verify Setup**
   ```bash
   ./scripts/health-check.sh
   ```

### Development Environment

The development environment includes:

- Hot reload for all services
- Debug logging enabled
- Mock external APIs (optional)
- Local database with test data
- Monitoring dashboard (optional)

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the issue list as you might find that you don't need to
create one. When you are creating a bug report, please include as many details as possible:

**Use the Bug Report Template:**

- **Summary**: Clear and descriptive title
- **Environment**: OS, Docker version, Node.js version
- **Steps to Reproduce**: Numbered list of exact steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Logs**: Relevant error messages or logs
- **Screenshots**: If applicable

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion,
please include:

- **Clear title and description**
- **Step-by-step description** of the suggested enhancement
- **Specific examples** to demonstrate the steps
- **Current behavior** vs **desired behavior**
- **Rationale** for why this enhancement would be useful

### Pull Requests

1. **Create Feature Branch**

   ```bash
   git checkout -b feature/amazing-feature
   ```

2. **Make Changes**
   - Follow our coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Changes**

   ```bash
   npm run test
   npm run lint
   ./scripts/health-check.sh
   ```

4. **Commit Changes**

   ```bash
   git commit -m "feat: add amazing feature"
   ```

   Follow [Conventional Commits](https://conventionalcommits.org/) format.

5. **Push and Create PR**
   ```bash
   git push origin feature/amazing-feature
   ```

## Development Process

### Branching Strategy

We use GitFlow branching model:

- **main**: Production-ready code
- **develop**: Integration branch for features
- **feature/**: New features and enhancements
- **hotfix/**: Critical fixes for production
- **release/**: Release preparation

### Commit Message Format

We follow [Conventional Commits](https://conventionalcommits.org/):

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```
feat(cursor): add token usage optimization
fix(github): resolve webhook signature validation
docs(api): update authentication documentation
```

### Release Process

1. **Feature Development**: Features developed in feature branches
2. **Integration**: Features merged to develop branch
3. **Release Branch**: Created from develop for release preparation
4. **Testing**: Comprehensive testing on release branch
5. **Release**: Merge to main and tag with version
6. **Deployment**: Automated deployment to production

## Style Guidelines

### Code Style

We use automated tools to maintain consistent code style:

- **ESLint**: JavaScript/TypeScript linting
- **Prettier**: Code formatting
- **Husky**: Git hooks for quality checks

**Configuration files:**

- `.eslintrc.js`: ESLint configuration
- `.prettierrc`: Prettier configuration
- `package.json`: lint-staged configuration

### Architecture Guidelines

1. **Service Independence**: Each service should be independently deployable
2. **API First**: Design APIs before implementation
3. **Error Handling**: Comprehensive error handling and logging
4. **Security**: Security considerations in all code
5. **Performance**: Consider performance implications
6. **Documentation**: Code should be self-documenting

### Database Guidelines

1. **Migrations**: All schema changes via migrations
2. **Indexing**: Proper indexing for performance
3. **Constraints**: Use database constraints for data integrity
4. **Transactions**: Use transactions for multi-step operations

## Testing Guidelines

### Test Structure

```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── fixtures/      # Test data and mocks
```

### Testing Requirements

- **Unit Tests**: 80%+ code coverage for new code
- **Integration Tests**: Test service interactions
- **E2E Tests**: Test complete user workflows
- **Performance Tests**: Test performance requirements

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Writing Tests

1. **Descriptive Names**: Test names should describe what is being tested
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Mock External Dependencies**: Use mocks for external services
4. **Test Edge Cases**: Include edge cases and error conditions

**Example:**

```javascript
describe('Project Creation', () => {
  it('should create project when valid repository URL provided', async () => {
    // Arrange
    const validRepoUrl = 'https://github.com/user/repo';
    const mockGithubService = jest.mock('./github-service');

    // Act
    const result = await projectService.create(validRepoUrl);

    // Assert
    expect(result).toHaveProperty('project_id');
    expect(result.status).toBe('initializing');
  });
});
```

## Documentation

### Documentation Types

1. **Code Documentation**: Inline comments and JSDoc
2. **API Documentation**: OpenAPI/Swagger specifications
3. **User Documentation**: User guides and tutorials
4. **Developer Documentation**: Architecture and development guides

### Documentation Standards

- **Clear and Concise**: Easy to understand
- **Up-to-Date**: Maintained with code changes
- **Examples**: Include practical examples
- **Searchable**: Organized for easy searching

### Writing Documentation

1. **Target Audience**: Consider who will read the documentation
2. **Structure**: Use clear headings and organization
3. **Examples**: Provide code examples and use cases
4. **Links**: Link to related documentation
5. **Maintenance**: Update documentation with code changes

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and discussions
- **Discord**: Real-time chat and community support
- **Email**: [community@quantapilot.com](mailto:community@quantapilot.com)

### Getting Help

1. **Documentation**: Check existing documentation first
2. **Search Issues**: Search existing GitHub issues
3. **Ask Questions**: Create GitHub discussion or issue
4. **Discord**: Join our Discord for real-time help

### Code Reviews

All contributions go through code review:

1. **Automated Checks**: CI/CD pipeline runs tests and checks
2. **Peer Review**: Core team member reviews code
3. **Feedback**: Constructive feedback for improvements
4. **Approval**: Approval required before merge

### Review Criteria

- **Functionality**: Does the code work as expected?
- **Quality**: Is the code well-written and maintainable?
- **Tests**: Are there adequate tests?
- **Documentation**: Is documentation updated?
- **Performance**: Any performance implications?
- **Security**: Any security considerations?

## Recognition

Contributors are recognized in several ways:

1. **Contributors List**: Listed in README.md
2. **Release Notes**: Mentioned in release notes
3. **Hall of Fame**: Featured contributors page
4. **Swag**: QuantaPilot swag for significant contributions

## Questions?

Don't hesitate to ask questions! We're here to help:

- **Email**: [contributors@quantapilot.com](mailto:contributors@quantapilot.com)
- **Discord**: Join our Discord community
- **GitHub**: Create a discussion or issue

Thank you for contributing to QuantaPilot™! 🚀
