using Backend.Services;
using Microsoft.Data.SqlClient;


Console.WriteLine("!!! BACKEND STARTING - VERSION DEBUG !!!");

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://localhost:5050");

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Register connection string
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
builder.Services.AddScoped(_ => new SqlConnection(connectionString));

// Register services
builder.Services.AddScoped<IModuleService, ModuleService>();
builder.Services.AddScoped<IExcelService, ExcelService>();
builder.Services.AddScoped<ICompanyService, CompanyService>();

// Configure EPPlus license
OfficeOpenXml.ExcelPackage.LicenseContext = OfficeOpenXml.LicenseContext.NonCommercial;

// Ensure Company Object Exists (Auto-Migration)
#pragma warning disable ASP0000 // Disable warning for BuildServiceProvider in startup code
using (var scope = builder.Services.BuildServiceProvider().CreateScope())
#pragma warning restore ASP0000
{
    try
    {
        var conn = scope.ServiceProvider.GetRequiredService<SqlConnection>();
        conn.Open();
        System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] DB Init Started\n");

        // 1. Ensure Table Exists (Basic Schema)
        var createTableCmd = @"
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[CompanyMaster]') AND type in (N'U'))
            BEGIN
                CREATE TABLE [CompanyMaster] (
                    [CompanyId] INT PRIMARY KEY IDENTITY(1,1),
                    [CompanyName] NVARCHAR(200) NOT NULL,
                    [Address] NVARCHAR(MAX),
                    -- Core columns only to avoid validation errors if schema drifts
                    [IsActive] BIT DEFAULT 1
                );
            END";
        using (var cmd = new SqlCommand(createTableCmd, conn)) cmd.ExecuteNonQuery();

        // 2. Ensure Columns Exist (One by one or batched safe ALTERs)
        var columns = new[]
        {
            "Phone NVARCHAR(50)", "Email NVARCHAR(100)", "Website NVARCHAR(100)", "GSTIN NVARCHAR(50)",
            "IsGstApplicable BIT DEFAULT 0 NOT NULL", "IsEinvoiceApplicable BIT DEFAULT 0 NOT NULL",
            "IsInternalApprovalRequired BIT DEFAULT 0 NOT NULL", "IsRequisitionApproval BIT DEFAULT 0 NOT NULL",
            "IsPOApprovalRequired BIT DEFAULT 0 NOT NULL", "IsInvoiceApprovalRequired BIT DEFAULT 0 NOT NULL",
            "IsGRNApprovalRequired BIT DEFAULT 0 NOT NULL", "JobScheduleReleaseRequired BIT DEFAULT 0 NOT NULL",
            "IsSalesOrderApprovalRequired BIT DEFAULT 0 NOT NULL", "IsJobReleaseFeatureRequired BIT DEFAULT 0 NOT NULL",
            "ShowPlanUptoWastagePerc BIT DEFAULT 0 NOT NULL", "ByPassCostApproval BIT DEFAULT 0 NOT NULL",
            "IsDeletedTransaction BIT DEFAULT 0 NOT NULL"
        };

        foreach (var colDef in columns)
        {
            var colName = colDef.Split(' ')[0];
            var alterCmd = $@"
                IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'{colName}' AND Object_ID = Object_ID(N'CompanyMaster'))
                BEGIN
                    ALTER TABLE CompanyMaster ADD {colDef};
                END";
            using (var cmd = new SqlCommand(alterCmd, conn)) cmd.ExecuteNonQuery();
        }

        // 3. Ensure Default Data (using dynamic SQL to verify columns exist before insert, or just skipping if table populated)
        // Check if empty
        var countCmd = "SELECT COUNT(*) FROM CompanyMaster";
        using (var cmd = new SqlCommand(countCmd, conn))
        {
            int count = (int)cmd.ExecuteScalar();
            if (count == 0)
            {
                var insertCmd = @"
                    INSERT INTO [CompanyMaster] (CompanyName, Address, Phone, Email, Website, GSTIN, IsActive)
                    VALUES ('Indus Technologies', '123 Business Park, Tech City', '+1 234 567 8900', 'info@industech.com', 'www.industech.com', 'GST123456789', 1)";
                using (var iCmd = new SqlCommand(insertCmd, conn)) iCmd.ExecuteNonQuery();
            }
        }
        
        conn.Close();
        System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] DB Init Completed\n");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"DB Init Error: {ex.Message}");
        System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] DB Init Error: {ex.Message}\n");
    }

    try
    {
        var conn = scope.ServiceProvider.GetRequiredService<SqlConnection>();
        conn.Open();
        System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] Module Master Init Started\n");

        var moduleCols = new[]
        {
            "ModuleHeadDisplayName NVARCHAR(200)", 
            "ModuleHeadDisplayOrder INT DEFAULT 0", 
            "ModuleDisplayOrder INT DEFAULT 0",
            "SetGroupIndex INT DEFAULT 0",
            "Description NVARCHAR(MAX)"
        };

        foreach (var colDef in moduleCols)
        {
            var colName = colDef.Split(' ')[0];
            var alterCmd = $@"
                IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[ModuleMaster]') AND type in (N'U'))
                BEGIN
                    IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'{colName}' AND Object_ID = Object_ID(N'ModuleMaster'))
                    BEGIN
                        ALTER TABLE ModuleMaster ADD {colDef};
                    END
                END";
            using (var cmd = new SqlCommand(alterCmd, conn)) cmd.ExecuteNonQuery();
        }
        
        conn.Close();
    }
    catch(Exception ex) {
         Console.WriteLine($"Module Init Error: {ex.Message}");
    }

    // SparePartMaster Schema Migration
    try
    {
        var conn = scope.ServiceProvider.GetRequiredService<SqlConnection>();
        conn.Open();
        System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] SparePartMaster Init Started\n");

        // Check if SparePartMaster table exists
        var tableExistsCmd = "SELECT COUNT(*) FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[SparePartMaster]') AND type in (N'U')";
        using (var cmd = new SqlCommand(tableExistsCmd, conn))
        {
            int tableExists = (int)cmd.ExecuteScalar();
            if (tableExists > 0)
            {
                // Add required columns for import functionality
                var sparePartCols = new[]
                {
                    "HSNCode NVARCHAR(50) NULL",
                    "HSNGroup NVARCHAR(100) NULL",
                    "SupplierReference NVARCHAR(100) NULL",
                    "StockRefCode NVARCHAR(50) NULL",
                    "PurchaseOrderQuantity DECIMAL(18, 2) DEFAULT 0 NULL",
                    "SparePartGroup NVARCHAR(100) NULL",
                    "SparePartType NVARCHAR(100) NULL"
                };

                foreach (var colDef in sparePartCols)
                {
                    var colName = colDef.Split(' ')[0];
                    var alterCmd = $@"
                        IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'{colName}' AND Object_ID = Object_ID(N'SparePartMaster'))
                        BEGIN
                            ALTER TABLE SparePartMaster ADD {colDef};
                        END";
                    using (var cmd2 = new SqlCommand(alterCmd, conn))
                    {
                        cmd2.ExecuteNonQuery();
                    }
                }
                System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] SparePartMaster columns check/add completed\n");
            }
        }

        conn.Close();
        System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] SparePartMaster Init Completed\n");
    }
    catch(Exception ex) {
         Console.WriteLine($"SparePartMaster Init Error: {ex.Message}");
         System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] SparePartMaster Init Error: {ex.Message}\n");
    }

    // LedgerMaster Schema Migration (Consignee support)
    try
    {
        var conn = scope.ServiceProvider.GetRequiredService<SqlConnection>();
        conn.Open();
        System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] LedgerMaster Init Started\n");

        // Check if LedgerMaster table exists
        var tableExistsCmd = "SELECT COUNT(*) FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[LedgerMaster]') AND type in (N'U')";
        using (var cmd = new SqlCommand(tableExistsCmd, conn))
        {
            int tableExists = (int)cmd.ExecuteScalar();
            if (tableExists > 0)
            {
                // Add RefClientID column for Consignee support
                var alterCmd = @"
                    IF NOT EXISTS(SELECT * FROM sys.columns WHERE Name = N'RefClientID' AND Object_ID = Object_ID(N'LedgerMaster'))
                    BEGIN
                        ALTER TABLE LedgerMaster ADD RefClientID INT NULL;
                    END";
                using (var cmd2 = new SqlCommand(alterCmd, conn))
                {
                    cmd2.ExecuteNonQuery();
                }
                System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] LedgerMaster RefClientID column check/add completed\n");
            }
        }

        conn.Close();
        System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] LedgerMaster Init Completed\n");
    }
    catch(Exception ex) {
         Console.WriteLine($"LedgerMaster Init Error: {ex.Message}");
         System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] LedgerMaster Init Error: {ex.Message}\n");
    }
}

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");

app.UseAuthorization();

app.MapControllers();

app.Run();
