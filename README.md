# Bulk Import Project - Excel Data Import Tool

A full-stack web application for importing Excel data into MS SQL Server with duplicate checking, data validation, and a modern React UI.

## 🚀 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **Tailwind CSS v3** for styling
- **React Router** for navigation
- **Axios** for API calls
- **React Hot Toast** for notifications
- **Lucide React** for icons

### Backend
- **ASP.NET Core Web API** (.NET 8)
- **Dapper** for database operations
- **EPPlus** for Excel file processing
- **SQL Server** for data storage
- **Swagger** for API documentation

## 📁 Project Structure

```
BulkImportProject/
├── Backend/
│   ├── Controllers/
│   │   ├── ModuleController.cs
│   │   └── ExcelController.cs
│   ├── Services/
│   │   ├── IModuleService.cs
│   │   ├── ModuleService.cs
│   │   ├── IExcelService.cs
│   │   └── ExcelService.cs
│   ├── DTOs/
│   │   ├── ModuleDto.cs
│   │   ├── ExcelPreviewDto.cs
│   │   └── ImportResultDto.cs
│   ├── Program.cs
│   ├── appsettings.json
│   └── Backend.csproj
└── Frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Sidebar.tsx
    │   │   └── Header.tsx
    │   ├── pages/
    │   │   ├── Dashboard.tsx
    │   │   ├── ImportMaster.tsx
    │   │   ├── CompanyMaster.tsx
    │   │   └── ModuleAuthority.tsx
    │   ├── context/
    │   │   └── ThemeContext.tsx
    │   ├── services/
    │   │   └── api.ts
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css
    ├── package.json
    └── vite.config.ts
```

## 🔧 Prerequisites

- **.NET 8 SDK** - [Download](https://dotnet.microsoft.com/download/dotnet/8.0)
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **SQL Server** (MSSQLSERVER03 instance or update connection string)
- **Git** (optional)

## 📦 Installation

### 1. Backend Setup

```bash
# Navigate to Backend directory
cd Backend

# Restore NuGet packages
dotnet restore

# Update database connection string in appsettings.json if needed
# Default: Server=DESKTOP-L96U5S2\MSSQLSERVER03;Database=IndusDemo;Trusted_Connection=True;TrustServerCertificate=True;

# Build the project
dotnet build

# Run the API (default port: 5000)
dotnet run
```

The backend API will be available at `http://localhost:5000`  
Swagger documentation: `http://localhost:5000/swagger`

### 2. Frontend Setup

```bash
# Navigate to Frontend directory
cd Frontend

# Install dependencies
npm install

# Start development server (port: 3000)
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🗄️ Database Setup

### Required Table: ModuleMaster

Create the `ModuleMaster` table in your SQL Server database:

```sql
CREATE TABLE ModuleMaster (
    ModuleId INT PRIMARY KEY IDENTITY(1,1),
    ModuleName NVARCHAR(100) NOT NULL,
    ModuleHeadName NVARCHAR(100),
    Description NVARCHAR(500)
);

-- Insert sample data
INSERT INTO ModuleMaster (ModuleName, ModuleHeadName, Description)
VALUES 
    ('Employee Master', 'Masters', 'Employee information'),
    ('Product Master', 'Masters', 'Product catalog'),
    ('Customer Master', 'Masters', 'Customer details');
```

### Target Tables for Import

Create tables matching your Excel structure. For example:

```sql
CREATE TABLE [Employee Master] (
    EmployeeId INT,
    EmployeeName NVARCHAR(100),
    Department NVARCHAR(100),
    Salary DECIMAL(18,2)
);
```

The table name should match the `ModuleName` from `ModuleMaster`.

## 🎯 Features

### Import Master Page

1. **Module Selection**
   - Dropdown loads modules from `ModuleMaster` table
   - Filters by `ModuleHeadName = 'Masters'`

2. **File Upload**
   - Accepts only `.xlsx` and `.xls` files
   - Enabled after module selection
   - Drag-and-drop UI

3. **Excel Preview**
   - Click **Show** button (RED) to preview
   - Displays full Excel data in scrollable table
   - Horizontal and vertical scrolling
   - Shows row and column counts

4. **Data Import**
   - Click **Import** button (GREEN)
   - Validates Excel data
   - Checks for duplicate records
   - Inserts only non-duplicate rows
   - Shows success/error notifications with counts

### Other Features

- **Dark/Light Theme** - Toggle in header
- **Responsive Design** - Works on all screen sizes
- **Dashboard** - Statistics and recent activity
- **Company Master** - Company information management
- **Module Authority** - User permissions management

## 🔌 API Endpoints

### Module Endpoints

```
GET /api/module/GetModules?headName=Masters
```

### Excel Endpoints

```
POST /api/excel/Preview
Content-Type: multipart/form-data
Body: file (Excel file)

POST /api/excel/Import?tableName=Employee Master
Content-Type: multipart/form-data
Body: file (Excel file)
```

## 🎨 UI/UX Highlights

- ✨ **Modern Design** with smooth animations
- 🌓 **Dark Mode** support
- 📱 **Responsive** layout
- 🎯 **Intuitive** navigation
- 🔔 **Toast Notifications** for user feedback
- 📊 **Scrollable Tables** with custom scrollbars
- 🎨 **Inter Font** from Google Fonts
- 💎 **Premium Color Palette**

## ⚙️ Configuration

### Backend (appsettings.json)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=YOUR_SERVER;Database=YOUR_DB;Trusted_Connection=True;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Key": "YourSecretKeyHere",
    "Issuer": "BulkImportBackend",
    "Audience": "BulkImportFrontend"
  }
}
```

### Frontend Environment Variables

**Development** (`.env`):
```env
VITE_API_BASE_URL=http://localhost:5050/api
NODE_ENV=development
```

**Production** (`.env.production`):
```env
VITE_API_BASE_URL=https://exceljet.indusanalytics.co.in/api
NODE_ENV=production
```

### CORS Configuration

The backend is configured to allow these origins:
- `https://bulkimport.vercel.app` (Production)
- `http://localhost:3000` (Development)
- `http://localhost:5173` (Vite default)

## 🧪 Testing

1. **Start both backend and frontend**
2. Navigate to Import Master page
3. Select a module from dropdown
4. Upload an Excel file
5. Click **Show** to preview data
6. Click **Import** to import data
7. Check toast notifications for results

## 📝 Duplicate Checking Logic

The system checks duplicates by comparing **all column values**:
- If all values in a row match an existing record, it's marked as duplicate
- Only non-duplicate rows are inserted
- Duplicate count is reported in the import result

## 🎬 Production Deployment

### Production URLs
- **Backend (IIS)**: https://exceljet.indusanalytics.co.in
- **Frontend (Vercel)**: https://bulkimport.vercel.app

### Quick Deploy

**Backend to IIS** (Windows PowerShell):
```powershell
cd Backend
.\publish-iis.ps1
```

**Frontend to Vercel** (Windows PowerShell):
```powershell
cd Frontend
.\deploy-vercel.ps1
```

### Manual Build

**Frontend**:
```bash
cd Frontend
npm run build
```
Output: `Frontend/dist/`

**Backend**:
```bash
cd Backend
dotnet publish -c Release
```
Output: `Backend/bin/Release/net8.0/publish/`

📖 **For detailed deployment instructions**, see [DEPLOYMENT-GUIDE.md](./DEPLOYMENT-GUIDE.md)

## 📚 Dependencies

### Backend NuGet Packages
- `Dapper` (2.1.28)
- `EPPlus` (7.0.5)
- `Microsoft.Data.SqlClient` (5.1.5)
- `Swashbuckle.AspNetCore` (6.5.0)

### Frontend NPM Packages
- `react` (^18.2.0)
- `react-router-dom` (^6.22.0)
- `axios` (^1.6.7)
- `react-hot-toast` (^2.4.1)
- `lucide-react` (^0.323.0)
- `tailwindcss` (^3.4.1)

## 🐛 Troubleshooting

### CORS Issues
Ensure the backend `Program.cs` has CORS configured properly. The current setup allows all origins.

### Database Connection
- Verify SQL Server is running
- Check connection string in `appsettings.json`
- Ensure database and tables exist

### Port Conflicts
- Backend default: `5000`
- Frontend default: `3000`
- Change in `Program.cs` (backend) or `vite.config.ts` (frontend)

## 📄 License

This project uses **EPPlus** with NonCommercial license. For commercial use, purchase an EPPlus license.

## 👥 Author

Built with ❤️ by Antigravity AI

---

**Happy Importing! 🚀**
