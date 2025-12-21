# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| Latest  | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please follow these steps:

1. **DO NOT** open a public issue
2. Email security details to: shouvik9876@gmail.com
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will respond within 48 hours and work on a fix as soon as possible.

## Security Best Practices for Users

### Environment Variables
- **Never** commit `.env` files to version control
- Keep MongoDB credentials secure
- Use strong passwords for MongoDB users
- Enable IP whitelisting on MongoDB Atlas

### Cloud Storage
- Use read/write permissions carefully
- Don't share Rclone configs publicly
- Regularly review authorized applications

### Network Security
- Be cautious with public tunneling
- Use whitelist when possible
- Keep Playit.gg accounts secure

### Application Updates
- Always use the latest version
- Check release notes for security fixes
- Verify downloads from official sources only

## Known Security Considerations

1. **Cloud Credentials**: Rclone configs are stored in MongoDB per-server. Ensure your MongoDB instance is properly secured.

2. **Password Storage**: User passwords are hashed using bcrypt with cost 14.

3. **Local Data**: Server files are stored locally in `mc_roam_data/instances/`. Secure your file system accordingly.

4. **Network Exposure**: When using Playit.gg, your server becomes publicly accessible. Use whitelist and proper authentication.

## Security Updates

Security fixes are released as soon as possible and will be clearly marked in release notes.
