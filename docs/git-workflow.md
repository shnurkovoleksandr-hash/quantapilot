# Git Workflow & Branching Strategy

## Overview

This document defines the Git workflow and branching strategy for QuantaPilot™ development, ensuring consistent collaboration and code quality across the team.

## Branching Strategy

### Main Branches

#### `main` (Production)
- **Purpose**: Production-ready code
- **Protection**: Direct commits disabled, requires PR review
- **Deployment**: Automatic deployment to production
- **Merge**: Only from `develop` or hotfix branches

#### `develop` (Integration)
- **Purpose**: Integration branch for features
- **Protection**: Direct commits disabled, requires PR review
- **Deployment**: Automatic deployment to staging
- **Merge**: From feature branches and hotfixes

### Supporting Branches

#### Feature Branches
- **Naming**: `feature/ISSUE-123-description`
- **Source**: `develop`
- **Target**: `develop`
- **Lifecycle**: Created → Developed → PR → Merged → Deleted

#### Release Branches
- **Naming**: `release/v1.2.0`
- **Source**: `develop`
- **Target**: `main` and `develop`
- **Purpose**: Final testing and bug fixes before release

#### Hotfix Branches
- **Naming**: `hotfix/ISSUE-456-critical-bug`
- **Source**: `main`
- **Target**: `main` and `develop`
- **Purpose**: Critical production fixes

## Commit Message Convention

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or auxiliary tool changes
- `perf`: Performance improvements
- `ci`: CI/CD changes
- `build`: Build system changes
- `revert`: Revert previous commit

### Examples
```
feat(api): add project creation endpoint

fix(workflow): resolve n8n connection timeout

docs(readme): update installation instructions

test(integration): add end-to-end tests for project creation
```

## Pull Request Process

### PR Requirements
1. **Title**: Clear, descriptive title
2. **Description**: Detailed description of changes
3. **Linked Issues**: Reference related issues
4. **Tests**: Include relevant tests
5. **Documentation**: Update docs if needed
6. **Screenshots**: For UI changes

### PR Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Related Issues
Closes #123
```

### Review Process
1. **Automated Checks**: CI/CD pipeline must pass
2. **Code Review**: At least 2 approvals required
3. **Documentation Review**: Docs team approval for doc changes
4. **Security Review**: Security team approval for sensitive changes

## Release Process

### Release Preparation
1. **Feature Freeze**: Stop merging features to `develop`
2. **Testing**: Comprehensive testing on staging
3. **Documentation**: Update release notes
4. **Version Bump**: Update version in package.json

### Release Execution
1. **Create Release Branch**: `release/v1.2.0`
2. **Final Testing**: Bug fixes only
3. **Merge to Main**: Create PR from release to main
4. **Tag Release**: Create Git tag
5. **Deploy**: Automatic deployment to production
6. **Merge Back**: Merge release to develop

### Hotfix Process
1. **Create Hotfix Branch**: `hotfix/ISSUE-456`
2. **Fix Issue**: Implement critical fix
3. **Test**: Verify fix works
4. **Merge to Main**: Create PR
5. **Deploy**: Immediate production deployment
6. **Merge Back**: Merge to develop

## Code Quality Gates

### Pre-commit Hooks
- Linting (ESLint)
- Formatting (Prettier)
- Type checking (TypeScript)
- Test execution
- Documentation validation

### CI/CD Checks
- Unit tests
- Integration tests
- Security scans
- Documentation build
- Docker image build
- Performance tests

## Conflict Resolution

### Merge Conflicts
1. **Identify Conflicts**: Git will mark conflicts
2. **Resolve Locally**: Fix conflicts in local branch
3. **Test**: Ensure code works after resolution
4. **Commit**: Commit resolved conflicts
5. **Push**: Push updated branch

### Rebase vs Merge
- **Feature Branches**: Use rebase to keep history clean
- **Release/Hotfix**: Use merge commits
- **Main/Develop**: Use merge commits

## Best Practices

### General Guidelines
1. **Small, Focused Commits**: One logical change per commit
2. **Regular Pushes**: Push frequently to avoid conflicts
3. **Clear Messages**: Write descriptive commit messages
4. **Branch Cleanup**: Delete merged branches
5. **Documentation**: Keep docs in sync with code

### Team Collaboration
1. **Communication**: Discuss major changes before implementation
2. **Code Reviews**: Provide constructive feedback
3. **Pair Programming**: For complex features
4. **Knowledge Sharing**: Document decisions and patterns

### Security Considerations
1. **No Secrets**: Never commit secrets or credentials
2. **Access Control**: Use branch protection rules
3. **Audit Trail**: Maintain clear history of changes
4. **Security Reviews**: Mandatory for security-related changes

## Tools and Automation

### Required Tools
- **Git**: Version control
- **GitHub**: Repository hosting and PR management
- **Husky**: Git hooks
- **Lint-staged**: Pre-commit linting
- **GitHub Actions**: CI/CD automation

### Automation Scripts
- `npm run pre-commit`: Run pre-commit checks
- `npm run validate-branch`: Validate branch naming
- `npm run create-release`: Automated release creation
- `npm run cleanup-branches`: Clean up merged branches

## Troubleshooting

### Common Issues
1. **Merge Conflicts**: Use `git status` to identify conflicts
2. **Failed CI**: Check logs and fix issues locally
3. **Branch Protection**: Ensure PR meets requirements
4. **Permission Issues**: Contact repository admin

### Emergency Procedures
1. **Revert Changes**: Use `git revert` for safe rollback
2. **Force Push**: Only in emergencies, with team approval
3. **Hotfix Deployment**: Follow hotfix process
4. **Rollback**: Use deployment rollback procedures
