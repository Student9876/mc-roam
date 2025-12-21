# Contributing to MC Roam

Thank you for considering contributing to MC Roam! This document provides guidelines and steps for contributing.

## Getting Started

### Prerequisites

- Go 1.21 or higher
- Node.js 20 or higher
- Python 3.x (for icon generation)
- Git
- MongoDB Atlas account (for testing)

### Setting Up Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR_USERNAME/mc-roam.git
   cd mc-roam
   ```

2. **Install Wails**
   ```bash
   go install github.com/wailsapp/wails/v2/cmd/wails@latest
   ```

3. **Install Dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install
   cd ..
   
   # Go modules
   go mod download
   ```

4. **Setup Environment**
   ```bash
   copy .env.example .env
   # Edit .env with your MongoDB test connection string
   ```

5. **Run in Development Mode**
   ```bash
   wails dev
   ```

## Development Workflow

### Branch Naming

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/what-changed` - Documentation
- `refactor/component-name` - Code refactoring

### Commit Messages

Follow conventional commits:
- `feat: add player teleport feature`
- `fix: resolve cloud sync timeout`
- `docs: update installation guide`
- `refactor: simplify server card component`

### Code Style

**Go**
- Run `go fmt` before committing
- Follow Go best practices
- Add comments for exported functions

**JavaScript/React**
- Use functional components with hooks
- Keep components small and focused
- Use meaningful variable names

### Testing

Before submitting a PR:
1. Test locally with `wails dev`
2. Build with `wails build` to ensure no errors
3. Test the built executable
4. Verify cloud sync functionality
5. Check MongoDB connections work

## Pull Request Process

1. Update README.md if adding new features
2. Ensure all tests pass
3. Update documentation as needed
4. Request review from maintainers
5. Address review comments promptly

## Areas for Contribution

### High Priority
- macOS and Linux support
- Automated backups
- Server templates
- Plugin management
- Multi-language support

### Medium Priority
- Better error handling
- Performance optimizations
- UI/UX improvements
- More server types (Forge, Fabric)

### Documentation
- Video tutorials
- Screenshots for README
- API documentation
- Troubleshooting guides

## Reporting Issues

When reporting bugs, include:
- OS and version
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if applicable
- Relevant log output

## Questions?

Open a discussion on GitHub or reach out to maintainers.

Thank you for contributing! 🎉
