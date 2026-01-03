---
description: Safe guide for modifying security.js or any middleware file
---

# Safe Middleware Modification Workflow

## Before Modifying Any Middleware File:

### 1. Check What's Being Exported
```powershell
# Run this to see all exports
node -e "const m = require('./src/middleware/security.js'); console.log('Exports:', Object.keys(m));"
```

### 2. Find All Import References
```powershell
# Search for all files that import from this middleware
grep -r "require.*security" src/ --include="*.js"
# Or on Windows PowerShell:
Select-String -Path "src/**/*.js" -Pattern "security" -Recurse
```

### 3. Document Current Exports
Before making changes, note down:
- [ ] All function names being exported
- [ ] All files importing those functions
- [ ] Any inter-dependencies

### 4. When Adding New Code
- **NEVER overwrite** - use replace/edit to add code
- **ALWAYS preserve** existing exports
- **ADD to exports** don't replace the module.exports object

### 5. After Modification - Verify
```powershell
# Test the module loads without error
node -e "require('./src/middleware/security.js'); console.log('✅ Module loads OK');"

# Test the server starts
node src/index.js
```

## Critical Files That Break Everything If Missing Exports:
- `middleware/security.js` - auth, rate limiting, sanitization
- `middleware/auth.js` - protect middleware for routes
- `middleware/validators.js` - input validation rules
- `config/db.js` - database connection

// turbo-all
