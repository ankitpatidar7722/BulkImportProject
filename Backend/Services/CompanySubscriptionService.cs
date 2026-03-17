using Microsoft.Data.SqlClient;
using Dapper;
using Backend.DTOs;
using System.Text;

namespace Backend.Services;

public class CompanySubscriptionService : ICompanySubscriptionService
{
    private readonly IConfiguration _config;

    public CompanySubscriptionService(IConfiguration config)
    {
        _config = config;
    }

    private SqlConnection GetIndusConnection()
    {
        var connString = _config.GetConnectionString("IndusConnection");
        return new SqlConnection(connString);
    }

    public async Task<CompanySubscriptionListResponse> GetAllAsync()
    {
        try
        {
            using var conn = GetIndusConnection();
            var query = @"SELECT * FROM Indus_Company_Authentication_For_Web_Modules ORDER BY CompanyName";

            var data = (await conn.QueryAsync<CompanySubscriptionDto>(query)).ToList();

            Console.WriteLine($"[CompanySubscription] GetAll returned {data.Count} rows");

            return new CompanySubscriptionListResponse { Success = true, Data = data };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CompanySubscription] GetAll Error: {ex.Message}");
            return new CompanySubscriptionListResponse { Success = false, Message = ex.Message };
        }
    }

    public async Task<CompanySubscriptionResponse> GetByKeyAsync(string companyUserID)
    {
        try
        {
            using var conn = GetIndusConnection();
            var query = @"SELECT * FROM Indus_Company_Authentication_For_Web_Modules WHERE CompanyUserID = @CompanyUserID";

            var data = await conn.QueryFirstOrDefaultAsync<CompanySubscriptionDto>(query, new { CompanyUserID = companyUserID });

            if (data == null)
                return new CompanySubscriptionResponse { Success = false, Message = "Record not found." };

            return new CompanySubscriptionResponse { Success = true, Data = data };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CompanySubscription] GetByKey Error: {ex.Message}");
            return new CompanySubscriptionResponse { Success = false, Message = ex.Message };
        }
    }

    public async Task<CompanySubscriptionResponse> CreateAsync(CompanySubscriptionSaveRequest request)
    {
        try
        {
            using var conn = GetIndusConnection();

            // Check if CompanyUserID already exists
            var existsQuery = "SELECT COUNT(*) FROM Indus_Company_Authentication_For_Web_Modules WHERE CompanyUserID = @CompanyUserID";
            var exists = await conn.ExecuteScalarAsync<int>(existsQuery, new { request.CompanyUserID });
            if (exists > 0)
                return new CompanySubscriptionResponse { Success = false, Message = $"CompanyUserID '{request.CompanyUserID}' already exists." };

            var query = @"
                INSERT INTO Indus_Company_Authentication_For_Web_Modules
                    (CompanyUserID, Password, Conn_String, CompanyName, ApplicationName, ApplicationVersion,
                     SubscriptionStatus, StatusDescription, SubscriptionStatusMessage,
                     Address, Country, State, City, CompanyCode, CompanyUniqueCode,
                     GSTIN, Email, Mobile, LoginAllowed, FromDate, ToDate, PaymentDueDate, FYear)
                VALUES
                    (@CompanyUserID, @Password, @Conn_String, @CompanyName, @ApplicationName, @ApplicationVersion,
                     @SubscriptionStatus, @StatusDescription, @SubscriptionStatusMessage,
                     @Address, @Country, @State, @City, @CompanyCode, @CompanyUniqueCode,
                     @GSTIN, @Email, @Mobile, @LoginAllowed, @FromDate, @ToDate, @PaymentDueDate, @FYear)";

            await conn.ExecuteAsync(query, request);

            Console.WriteLine($"[CompanySubscription] Created CompanyUserID={request.CompanyUserID}, Company={request.CompanyName}");

            return await GetByKeyAsync(request.CompanyUserID);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CompanySubscription] Create Error: {ex.Message}");
            return new CompanySubscriptionResponse { Success = false, Message = ex.Message };
        }
    }

    public async Task<CompanySubscriptionResponse> UpdateAsync(CompanySubscriptionSaveRequest request)
    {
        try
        {
            using var conn = GetIndusConnection();

            var keyToUpdate = request.OriginalCompanyUserID ?? request.CompanyUserID;

            var query = @"
                UPDATE Indus_Company_Authentication_For_Web_Modules SET
                    CompanyUserID = @CompanyUserID,
                    Password = @Password,
                    Conn_String = @Conn_String,
                    CompanyName = @CompanyName,
                    ApplicationName = @ApplicationName,
                    ApplicationVersion = @ApplicationVersion,
                    SubscriptionStatus = @SubscriptionStatus,
                    StatusDescription = @StatusDescription,
                    SubscriptionStatusMessage = @SubscriptionStatusMessage,
                    Address = @Address,
                    Country = @Country,
                    State = @State,
                    City = @City,
                    CompanyCode = @CompanyCode,
                    CompanyUniqueCode = @CompanyUniqueCode,
                    GSTIN = @GSTIN,
                    Email = @Email,
                    Mobile = @Mobile,
                    LoginAllowed = @LoginAllowed,
                    FromDate = @FromDate,
                    ToDate = @ToDate,
                    PaymentDueDate = @PaymentDueDate,
                    FYear = @FYear
                WHERE CompanyUserID = @OriginalKey";

            var affected = await conn.ExecuteAsync(query, new
            {
                request.CompanyUserID,
                request.Password,
                request.Conn_String,
                request.CompanyName,
                request.ApplicationName,
                request.ApplicationVersion,
                request.SubscriptionStatus,
                request.StatusDescription,
                request.SubscriptionStatusMessage,
                request.Address,
                request.Country,
                request.State,
                request.City,
                request.CompanyCode,
                request.CompanyUniqueCode,
                request.GSTIN,
                request.Email,
                request.Mobile,
                request.LoginAllowed,
                request.FromDate,
                request.ToDate,
                request.PaymentDueDate,
                request.FYear,
                OriginalKey = keyToUpdate
            });

            if (affected == 0)
                return new CompanySubscriptionResponse { Success = false, Message = "Record not found." };

            Console.WriteLine($"[CompanySubscription] Updated CompanyUserID={request.CompanyUserID}, Company={request.CompanyName}");

            return await GetByKeyAsync(request.CompanyUserID);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CompanySubscription] Update Error: {ex.Message}");
            return new CompanySubscriptionResponse { Success = false, Message = ex.Message };
        }
    }

    public async Task<CompanySubscriptionResponse> DeleteAsync(string companyUserID)
    {
        try
        {
            using var conn = GetIndusConnection();
            var query = "DELETE FROM Indus_Company_Authentication_For_Web_Modules WHERE CompanyUserID = @CompanyUserID";
            var affected = await conn.ExecuteAsync(query, new { CompanyUserID = companyUserID });

            if (affected == 0)
                return new CompanySubscriptionResponse { Success = false, Message = "Record not found." };

            Console.WriteLine($"[CompanySubscription] Deleted CompanyUserID={companyUserID}");

            return new CompanySubscriptionResponse { Success = true, Message = "Record deleted successfully." };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CompanySubscription] Delete Error: {ex.Message}");
            return new CompanySubscriptionResponse { Success = false, Message = ex.Message };
        }
    }

    private static readonly string[] AvailableServers = new[]
    {
        "13.200.122.70,1433",
        "15.206.241.195,1433"
    };

    private const string DbUser = "INDUS";
    private const string DbPassword = "Param@99811";

    public Task<ServerListResponse> GetServersAsync()
    {
        return Task.FromResult(new ServerListResponse { Success = true, Servers = AvailableServers.ToList() });
    }

    private static (string sourceServer, string sourceDb) GetSourceInfo(string applicationName)
    {
        return applicationName.ToLower() switch
        {
            "desktop" or "estimoprime" => ("13.200.122.70,1433", "IndusEnterpriseNewInstallation"),
            "multiunit" => ("15.206.241.195,1433", "IndusEnterprisemultiunitdemo"),
            "printuderp" => ("15.206.241.195,1433", "IndusPrintudeDemo"),
            _ => throw new Exception($"Unknown application: {applicationName}")
        };
    }

    private static SqlConnection MasterConnection(string server)
    {
        var cs = $"Data Source={server};Initial Catalog=master;User ID={DbUser};Password={DbPassword};TrustServerCertificate=True;Connect Timeout=30";
        return new SqlConnection(cs);
    }

    public async Task<SetupDatabaseResponse> SetupDatabaseAsync(SetupDatabaseRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Server))
                return new SetupDatabaseResponse { Success = false, Message = "Server is required." };
            if (string.IsNullOrWhiteSpace(request.ApplicationName))
                return new SetupDatabaseResponse { Success = false, Message = "Application Name is required." };
            if (string.IsNullOrWhiteSpace(request.DatabaseName))
                return new SetupDatabaseResponse { Success = false, Message = "Database Name is required." };

            var (sourceServer, sourceDb) = GetSourceInfo(request.ApplicationName);
            var targetServer = request.Server;
            var newDbName = request.DatabaseName.Trim();

            Console.WriteLine($"[SetupDB] Starting: App={request.ApplicationName}, Source={sourceServer}/{sourceDb}, Target={targetServer}/{newDbName}");

            // Step 1: Backup source DB on source server
            string backupPath;
            using (var sourceConn = MasterConnection(sourceServer))
            {
                await sourceConn.OpenAsync();

                // Get default backup directory
                var defaultBackupPath = await sourceConn.ExecuteScalarAsync<string>(
                    "SELECT CAST(SERVERPROPERTY('InstanceDefaultBackupPath') AS NVARCHAR(500))");
                if (string.IsNullOrEmpty(defaultBackupPath))
                {
                    var defaultDataPath = await sourceConn.ExecuteScalarAsync<string>(
                        "SELECT CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS NVARCHAR(500))");
                    defaultBackupPath = defaultDataPath ?? @"C:\Temp\";
                }
                if (!defaultBackupPath.EndsWith(@"\")) defaultBackupPath += @"\";

                backupPath = $@"{defaultBackupPath}{newDbName}_{DateTime.Now:yyyyMMddHHmmss}.bak";

                Console.WriteLine($"[SetupDB] Backing up [{sourceDb}] to {backupPath}");
                await sourceConn.ExecuteAsync(
                    $"BACKUP DATABASE [{sourceDb}] TO DISK = N'{backupPath}' WITH FORMAT, INIT, SKIP, NOUNLOAD, STATS = 10",
                    commandTimeout: 600);
                Console.WriteLine($"[SetupDB] Backup complete");
            }

            // Step 2: Restore on target server
            // For cross-server: try UNC path if servers differ
            var restorePath = backupPath;
            if (sourceServer != targetServer)
            {
                var sourceIp = sourceServer.Replace(",1433", "");
                var driveLetter = backupPath.Substring(0, 1);
                var pathAfterDrive = backupPath.Substring(2);
                restorePath = $@"\\{sourceIp}\{driveLetter}${pathAfterDrive}";
                Console.WriteLine($"[SetupDB] Cross-server restore from UNC: {restorePath}");
            }

            using (var targetConn = MasterConnection(targetServer))
            {
                await targetConn.OpenAsync();

                // Check if DB already exists
                var exists = await targetConn.ExecuteScalarAsync<int>(
                    "SELECT COUNT(*) FROM sys.databases WHERE name = @Name",
                    new { Name = newDbName });
                if (exists > 0)
                    return new SetupDatabaseResponse { Success = false, Message = $"Database '{newDbName}' already exists on {targetServer}." };

                // Get logical file names from backup
                var files = (await targetConn.QueryAsync(
                    $"RESTORE FILELISTONLY FROM DISK = N'{restorePath}'",
                    commandTimeout: 120)).ToList();

                // Get default data/log paths on target
                var dataPath = await targetConn.ExecuteScalarAsync<string>(
                    "SELECT CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS NVARCHAR(500))") ?? @"C:\SQLData\";
                var logPath = await targetConn.ExecuteScalarAsync<string>(
                    "SELECT CAST(SERVERPROPERTY('InstanceDefaultLogPath') AS NVARCHAR(500))") ?? dataPath;
                if (!dataPath.EndsWith(@"\")) dataPath += @"\";
                if (!logPath.EndsWith(@"\")) logPath += @"\";

                // Build MOVE clauses
                var moveClause = new StringBuilder();
                int dataFileIndex = 0;
                foreach (IDictionary<string, object> file in files)
                {
                    var logicalName = file["LogicalName"]?.ToString();
                    var type = file["Type"]?.ToString();
                    string physicalPath;
                    if (type == "L")
                    {
                        physicalPath = $"{logPath}{newDbName}_log.ldf";
                    }
                    else
                    {
                        var suffix = dataFileIndex == 0 ? ".mdf" : $"_{dataFileIndex}.ndf";
                        physicalPath = $"{dataPath}{newDbName}{suffix}";
                        dataFileIndex++;
                    }
                    moveClause.Append($", MOVE N'{logicalName}' TO N'{physicalPath}'");
                }

                // Restore
                var restoreSql = $"RESTORE DATABASE [{newDbName}] FROM DISK = N'{restorePath}' WITH REPLACE{moveClause}";
                Console.WriteLine($"[SetupDB] Restoring database [{newDbName}]...");
                await targetConn.ExecuteAsync(restoreSql, commandTimeout: 600);
                Console.WriteLine($"[SetupDB] Restore complete: [{newDbName}] on {targetServer}");
            }

            // Cleanup backup file
            try
            {
                using var cleanConn = MasterConnection(sourceServer);
                await cleanConn.OpenAsync();
                await cleanConn.ExecuteAsync(
                    $"EXEC master.dbo.xp_cmdshell 'del \"{backupPath}\"'", commandTimeout: 30);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SetupDB] Cleanup warning (non-critical): {ex.Message}");
            }

            // Build connection string for the new DB
            var connString = $"Password={DbPassword};Persist Security Info=True;User ID=indus;Initial Catalog={newDbName};Data Source={targetServer}";

            return new SetupDatabaseResponse
            {
                Success = true,
                Message = $"Database '{newDbName}' created and restored successfully.",
                ConnectionString = connString,
                DatabaseName = newDbName,
                Server = targetServer,
                ApplicationName = request.ApplicationName,
                ClientName = request.ClientName
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[SetupDB] Error: {ex.Message}");
            return new SetupDatabaseResponse { Success = false, Message = $"Database setup failed: {ex.Message}" };
        }
    }
}
