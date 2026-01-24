using Backend.Services;
using Microsoft.Data.SqlClient;

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
using (var scope = builder.Services.BuildServiceProvider().CreateScope())
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
