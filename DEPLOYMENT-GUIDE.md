# Deployment Guide - Bulk Import Project

## 🚀 Production URLs
- **Backend (IIS)**: https://exceljet.indusanalytics.co.in
- **Frontend (Vercel)**: https://bulkimport.vercel.app

---

## 📋 Prerequisites

### Backend Requirements
- Windows Server with IIS installed
- .NET 8.0 Runtime installed on server
- SQL Server accessible from server
- Valid SSL certificate for `exceljet.indusanalytics.co.in`

### Frontend Requirements
- Vercel account
- Node.js 18+ installed locally

---

## 🔧 Backend Deployment to IIS

### Step 1: Build and Publish

1. **Clean and Build** (in Backend directory):
   ```bash
   cd d:\BulkImportProject\Backend
   dotnet clean
   dotnet build --configuration Release
   ```

2. **Publish the Application**:
   ```bash
   dotnet publish --configuration Release --output "bin\Release\net8.0\publish"
   ```

   Or use the publish profile:
   ```bash
   dotnet publish /p:PublishProfile=IIS-Production
   ```

   This will create publish files in: `d:\BulkImportProject\Backend\bin\Release\net8.0\publish`

### Step 2: Transfer Files to Server

1. Copy the entire `publish` folder to your Windows Server
2. Recommended server path: `C:\inetpub\wwwroot\BulkImportBackend`

### Step 3: Configure IIS

1. **Create Application Pool**:
   - Open IIS Manager
   - Right-click "Application Pools" → "Add Application Pool"
   - Name: `BulkImportAppPool`
   - .NET CLR Version: **No Managed Code**
   - Managed Pipeline Mode: Integrated
   - Click OK

2. **Configure Application Pool**:
   - Right-click `BulkImportAppPool` → Advanced Settings
   - Set "Start Mode" to `AlwaysRunning`
   - Set "Idle Time-out" to `0` (or higher value like 1740 for 29 hours)

3. **Create Website**:
   - Right-click "Sites" → "Add Website"
   - Site name: `BulkImportBackend`
   - Application pool: Select `BulkImportAppPool`
   - Physical path: `C:\inetpub\wwwroot\BulkImportBackend`
   - Binding:
     - Type: `https`
     - IP address: All Unassigned (or specific IP)
     - Port: `443`
     - Host name: `exceljet.indusanalytics.co.in`
     - SSL certificate: Select your certificate

4. **Set Permissions**:
   - Right-click the website folder → Properties → Security
   - Add `IIS_IUSRS` with Read & Execute permissions
   - Add `IIS AppPool\BulkImportAppPool` with Read & Execute permissions

### Step 4: Update appsettings.json on Server

Update `appsettings.json` on the server with production connection strings:

```json
{
  "ConnectionStrings": {
    "IndusConnection": "Server=YOUR_PROD_SERVER;Database=Indus;User Id=YOUR_USER;Password=YOUR_PASSWORD;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "YOUR_PRODUCTION_SECRET_KEY_HERE_MUST_BE_AT_LEAST_32_CHARACTERS_LONG",
    "Issuer": "BulkImportBackend",
    "Audience": "BulkImportFrontend"
  },
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*"
}
```

**⚠️ Important**:
- Replace database credentials with production values
- Use a strong, unique JWT secret key (minimum 32 characters)
- Keep this file secure - never commit it to version control

### Step 5: Test Backend

1. Open browser and navigate to: `https://exceljet.indusanalytics.co.in/api/health` (if you have a health endpoint)
2. Or test with: `https://exceljet.indusanalytics.co.in/api/auth/check-status`
3. Verify no CORS errors in browser console

---

## 🌐 Frontend Deployment to Vercel

### Step 1: Prepare Frontend

1. **Update Environment File**:
   The `.env.production` file has been created with:
   ```env
   VITE_API_BASE_URL=https://exceljet.indusanalytics.co.in/api
   NODE_ENV=production
   ```

2. **Test Build Locally**:
   ```bash
   cd d:\BulkImportProject\Frontend
   npm run build
   ```

   This should create a `dist` folder with production-optimized files.

### Step 2: Deploy to Vercel

**Option A: Using Vercel CLI** (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   cd d:\BulkImportProject\Frontend
   vercel --prod
   ```

4. **Configure Environment Variables** in Vercel Dashboard:
   - Go to https://vercel.com/dashboard
   - Select your project
   - Go to Settings → Environment Variables
   - Add:
     - Name: `VITE_API_BASE_URL`
     - Value: `https://exceljet.indusanalytics.co.in/api`
     - Environment: Production

**Option B: Using Vercel Dashboard**

1. Go to https://vercel.com/new
2. Import your Git repository
3. Configure build settings:
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. Add environment variables (as described above)
5. Click "Deploy"

### Step 3: Configure Custom Domain (Optional)

If you want to use `bulkimport.vercel.app`:
1. In Vercel Dashboard → Domains
2. Add `bulkimport.vercel.app` or your custom domain
3. Follow DNS configuration steps

---

## ✅ Verification Steps

### 1. Test Backend
```bash
# Test API is responding
curl https://exceljet.indusanalytics.co.in/api/auth/check-status

# Or use browser dev tools to check network tab
```

### 2. Test CORS
1. Open `https://bulkimport.vercel.app` in browser
2. Open Developer Tools (F12) → Console tab
3. Attempt to login
4. Verify **no CORS errors** appear

### 3. Test Full Flow
1. Navigate to `https://bulkimport.vercel.app`
2. Perform Company Login
3. Perform User Login
4. Test main features:
   - Module Group Authority
   - Company Subscription
   - Import Master
   - Dynamic Module pages

---

## 🔍 Troubleshooting

### CORS Errors
**Symptom**: "Access to fetch has been blocked by CORS policy"

**Solution**:
- Verify `Program.cs` CORS configuration includes `https://bulkimport.vercel.app`
- Ensure IIS is not adding additional CORS headers that conflict
- Clear browser cache and retry

### 500 Internal Server Error
**Symptom**: API returns 500 errors

**Solution**:
- Check IIS Event Viewer for ASP.NET Core logs
- Check application logs in the publish folder
- Verify database connection strings are correct
- Ensure .NET 8.0 Runtime is installed

### 404 Not Found on API Routes
**Symptom**: Routes like `/api/auth/login` return 404

**Solution**:
- Verify IIS URL Rewrite module is installed
- Check that `web.config` exists in publish folder
- Ensure ASP.NET Core Module is installed in IIS

### JWT Authentication Fails
**Symptom**: "Unauthorized" errors after login

**Solution**:
- Verify JWT secret key matches in `appsettings.json`
- Check token expiration settings
- Verify browser can store cookies/localStorage

### Database Connection Fails
**Symptom**: "Cannot connect to database" errors

**Solution**:
- Verify SQL Server allows remote connections
- Check firewall rules allow connection from IIS server
- Test connection string with SQL Server Management Studio
- Verify user credentials have appropriate permissions

---

## 📝 Post-Deployment Checklist

- [ ] Backend published to IIS successfully
- [ ] Backend API responding at `https://exceljet.indusanalytics.co.in`
- [ ] SSL certificate valid and working
- [ ] Database connection strings updated with production values
- [ ] JWT secret key configured (production key, not development)
- [ ] Frontend built and deployed to Vercel
- [ ] Frontend environment variables configured
- [ ] CORS working between frontend and backend
- [ ] Login flow working end-to-end
- [ ] All main features tested in production
- [ ] Logs being written and monitored
- [ ] Backup strategy in place for database

---

## 🔒 Security Recommendations

1. **JWT Secret**: Use a strong, random 64-character secret key
2. **Database**: Use separate database user with minimum required permissions
3. **HTTPS Only**: Ensure all traffic uses HTTPS
4. **Connection Strings**: Never commit production credentials to Git
5. **Error Logging**: Configure proper error logging (Azure App Insights, Serilog, etc.)
6. **Regular Updates**: Keep .NET runtime and packages updated
7. **Backup**: Schedule regular database backups

---

## 📞 Support

For deployment issues:
1. Check IIS logs: `C:\inetpub\logs\LogFiles\`
2. Check Application Event Viewer
3. Review `debug_log.txt` in application folder
4. Check browser console for frontend errors

---

## 🔄 Future Deployments

For subsequent updates:

**Backend**:
```bash
cd d:\BulkImportProject\Backend
dotnet publish --configuration Release
# Copy publish folder to server
# Restart IIS Application Pool
```

**Frontend**:
```bash
cd d:\BulkImportProject\Frontend
npm run build
vercel --prod
```

---

**Last Updated**: 2026-03-23
