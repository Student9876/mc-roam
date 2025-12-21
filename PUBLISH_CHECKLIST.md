# Pre-Publication Checklist

## ✅ Security
- [x] MongoDB provided by app owner (hardcoded with dev override)
- [x] Google OAuth credentials support env var injection
- [x] .gitignore updated to exclude sensitive files
- [x] .env.example created for developers
- [x] Security policy documented

## ✅ Documentation
- [x] README.md created with comprehensive guide
- [x] LICENSE file (to be added from GitHub)
- [x] CONTRIBUTING.md guidelines created
- [x] SECURITY.md policy documented

## ✅ Build & CI/CD
- [x] GitHub Actions workflow configured with secrets
- [x] Icon properly generated
- [x] Build process documented

## 🔄 Before First Commit

### 1. Remove Sensitive Data from Git History
If you've committed credentials before, clean history:
```bash
# Check for any remaining sensitive data
git log --all --full-history -- "*credentials*"
```

### 2. Test Build Locally
```bash
wails build
# Ensure it works with hardcoded MongoDB
```

### 3. Initial Commit
```bash
git add .
git commit -m "feat: initial release with cloud-synced Minecraft server management"
git push origin main
```

## 🚀 Publishing Steps

### 1. Create GitHub Repository
- Go to GitHub.com
- Click "New Repository"
- Name: `mc-roam`
- Description: "Cloud-Synced Multiplayer Minecraft Server Manager"
- Public
- Add MIT License from GitHub
- Enable Issues and Discussions

### 2. Configure GitHub Secrets
Before building, add secrets to repository:
- Go to Settings → Secrets and variables → Actions
- Add these secrets:
  - `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
  - `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret

### 3. Push to GitHub
```bash
git remote add origin https://github.com/Student9876/mc-roam.git
git branch -M main
git push -u origin main
```

### 4. Create First Release
```bash
# Tag a version
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0
```

### 5. GitHub Actions will automatically:
- Inject Google credentials from secrets
- Build the application
- Create a release
- Attach the executable

### 6. Update Repository Settings
- Add description and topics
- Enable issues and discussions
- Add README badges

## 📝 Post-Publication Tasks

### Required
- [ ] Monitor GitHub Actions builds
- [ ] Test fresh installation from release
- [ ] Monitor first user issues
- [ ] Create a demo video/GIF

### Optional
- [ ] Create a website/landing page
- [ ] Write blog post about the project
- [ ] Submit to relevant communities
- [ ] Add screenshots to README

## ⚠️ Important Notes

1. **Users get:**
   - Database access (provided by app)
   - Google Drive integration (built-in)
   - No configuration needed

2. **Make sure to mention in README:**
   - This is not affiliated with Mojang/Microsoft
   - Users need valid Minecraft accounts to play
   - Server files are user's responsibility

3. **Legal:**
   - Don't distribute Minecraft server JARs
   - Users download servers themselves
   - Respect Mojang's EULA

4. **For Developers:**
   - MongoDB URI can be overridden with MONGODB_URI env var
   - Google credentials can be overridden with GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET env vars
   - See .env.example for details

## 🎯 Ready to Publish?

Once all checkboxes are complete, you're ready to push to GitHub!

```bash
git add .
git commit -m "feat: initial public release"
git push origin main
git tag v1.0.0
git push origin v1.0.0
```

Good luck! 🚀
