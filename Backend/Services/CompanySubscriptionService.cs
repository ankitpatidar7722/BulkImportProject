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
                     Address, Country, State, City, CompanyCode, CompanyUniqueCode, MaxCompanyUniqueCode,
                     GSTIN, Email, Mobile, LoginAllowed, FromDate, ToDate, PaymentDueDate, FYear)
                VALUES
                    (@CompanyUserID, @Password, @Conn_String, @CompanyName, @ApplicationName, @ApplicationVersion,
                     @SubscriptionStatus, @StatusDescription, @SubscriptionStatusMessage,
                     @Address, @Country, @State, @City, @CompanyCode, @CompanyUniqueCode, @MaxCompanyUniqueCode,
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

    public async Task<NextClientCodeResponse> GetNextClientCodeAsync()
    {
        try
        {
            using var conn = GetIndusConnection();
            var nextCode = await conn.ExecuteScalarAsync<int>(
                "SELECT ISNULL(MAX(MaxCompanyUniqueCode), 0) + 1 FROM Indus_Company_Authentication_For_Web_Modules");

            var companyUniqueCode = $"IA{nextCode:D4}";

            Console.WriteLine($"[NextClientCode] Generated: {companyUniqueCode} (MaxCompanyUniqueCode={nextCode})");

            return new NextClientCodeResponse
            {
                Success = true,
                CompanyUniqueCode = companyUniqueCode,
                MaxCompanyUniqueCode = nextCode
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[NextClientCode] Error: {ex.Message}");
            return new NextClientCodeResponse { Success = false, Message = ex.Message };
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

    // ─── Helper: Connect to client DB using their connection string ───
    private static SqlConnection ClientConnection(string connString)
    {
        var builder = new SqlConnectionStringBuilder(connString)
        {
            TrustServerCertificate = true,
            ConnectTimeout = 30
        };
        return new SqlConnection(builder.ConnectionString);
    }

    // ─── Step 3: Company Master ───
    public async Task<CompanyMasterResponse> SaveCompanyMasterAsync(CompanyMasterRequest request)
    {
        try
        {
            using var conn = ClientConnection(request.ConnectionString);
            await conn.OpenAsync();

            var exists = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM CompanyMaster WHERE CompanyID = @CompanyID",
                new { request.CompanyID });

            if (exists > 0)
            {
                var query = @"
                    UPDATE CompanyMaster SET
                        CompanyName = @CompanyName,
                        Address1 = @Address1, Address2 = @Address2, Address3 = @Address3,
                        City = @City, State = @State, Country = @Country, Pincode = @Pincode,
                        ContactNO = @ContactNO, MobileNO = @MobileNO, Email = @Email,
                        Website = @Website, StateTinNo = @StateTinNo, CINNo = @CINNo,
                        ProductionUnitAddress = @ProductionUnitAddress, Address = @Address,
                        GSTIN = @GSTIN, ProductionUnitName = @ProductionUnitName, PAN = @PAN
                    WHERE CompanyID = @CompanyID";

                await conn.ExecuteAsync(query, new
                {
                    request.CompanyID, request.CompanyName,
                    request.Address1, request.Address2, request.Address3,
                    request.City, request.State, request.Country, request.Pincode,
                    request.ContactNO, request.MobileNO, request.Email,
                    request.Website, request.StateTinNo, request.CINNo,
                    request.ProductionUnitAddress, request.Address,
                    request.GSTIN, request.ProductionUnitName, request.PAN
                });

                Console.WriteLine($"[CompanyMaster] Updated CompanyID={request.CompanyID}");
            }
            else
            {
                var query = @"
                    SET IDENTITY_INSERT CompanyMaster ON;
                    INSERT INTO CompanyMaster (CompanyID, CompanyName, Address1, Address2, Address3,
                        City, State, Country, Pincode, ContactNO, MobileNO, Email,
                        Website, StateTinNo, CINNo, ProductionUnitAddress, Address,
                        GSTIN, ProductionUnitName, PAN)
                    VALUES (@CompanyID, @CompanyName, @Address1, @Address2, @Address3,
                        @City, @State, @Country, @Pincode, @ContactNO, @MobileNO, @Email,
                        @Website, @StateTinNo, @CINNo, @ProductionUnitAddress, @Address,
                        @GSTIN, @ProductionUnitName, @PAN);
                    SET IDENTITY_INSERT CompanyMaster OFF;";

                await conn.ExecuteAsync(query, new
                {
                    request.CompanyID, request.CompanyName,
                    request.Address1, request.Address2, request.Address3,
                    request.City, request.State, request.Country, request.Pincode,
                    request.ContactNO, request.MobileNO, request.Email,
                    request.Website, request.StateTinNo, request.CINNo,
                    request.ProductionUnitAddress, request.Address,
                    request.GSTIN, request.ProductionUnitName, request.PAN
                });

                Console.WriteLine($"[CompanyMaster] Inserted CompanyID={request.CompanyID}");
            }

            return new CompanyMasterResponse { Success = true, Message = "Company Master saved.", CompanyID = request.CompanyID };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CompanyMaster] Error: {ex.Message}");
            return new CompanyMasterResponse { Success = false, Message = ex.Message };
        }
    }

    // ─── Step 4: Branch Master ───
    public async Task<BranchMasterResponse> SaveBranchMasterAsync(BranchMasterRequest request)
    {
        try
        {
            using var conn = ClientConnection(request.ConnectionString);
            await conn.OpenAsync();

            var companyID = request.CompanyID;
            if (companyID == null || companyID == 0)
            {
                companyID = await conn.ExecuteScalarAsync<int?>(
                    "SELECT TOP 1 CompanyID FROM CompanyMaster ORDER BY CompanyID DESC");
            }

            var exists = await conn.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM BranchMaster WHERE BranchID = @BranchID",
                new { request.BranchID });

            if (exists > 0)
            {
                var query = @"
                    UPDATE BranchMaster SET
                        BranchName = @BranchName, MailingName = @MailingName,
                        Address1 = @Address1, Address2 = @Address2, Address3 = @Address3,
                        Address = @Address, City = @City, District = @District,
                        State = @State, Country = @Country, Pincode = @Pincode,
                        MobileNo = @MobileNo, Email = @Email,
                        StateTinNo = @StateTinNo, GSTIN = @GSTIN,
                        CompanyID = @CompanyID
                    WHERE BranchID = @BranchID";

                await conn.ExecuteAsync(query, new
                {
                    request.BranchID, request.BranchName,
                    MailingName = request.MailingName ?? request.BranchName,
                    request.Address1, request.Address2, request.Address3,
                    request.Address, request.City, request.District,
                    request.State, request.Country, request.Pincode,
                    request.MobileNo, request.Email,
                    request.StateTinNo, request.GSTIN,
                    CompanyID = companyID
                });

                Console.WriteLine($"[BranchMaster] Updated BranchID={request.BranchID}");
            }
            else
            {
                var query = @"
                    SET IDENTITY_INSERT BranchMaster ON;
                    INSERT INTO BranchMaster (BranchID, BranchName, MailingName,
                        Address1, Address2, Address3, Address, City, District,
                        State, Country, Pincode, MobileNo, Email,
                        StateTinNo, GSTIN, CompanyID)
                    VALUES (@BranchID, @BranchName, @MailingName,
                        @Address1, @Address2, @Address3, @Address, @City, @District,
                        @State, @Country, @Pincode, @MobileNo, @Email,
                        @StateTinNo, @GSTIN, @CompanyID);
                    SET IDENTITY_INSERT BranchMaster OFF;";

                await conn.ExecuteAsync(query, new
                {
                    request.BranchID, request.BranchName,
                    MailingName = request.MailingName ?? request.BranchName,
                    request.Address1, request.Address2, request.Address3,
                    request.Address, request.City, request.District,
                    request.State, request.Country, request.Pincode,
                    request.MobileNo, request.Email,
                    request.StateTinNo, request.GSTIN,
                    CompanyID = companyID
                });

                Console.WriteLine($"[BranchMaster] Inserted BranchID={request.BranchID}");
            }

            return new BranchMasterResponse { Success = true, Message = "Branch Master saved." };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[BranchMaster] Error: {ex.Message}");
            return new BranchMasterResponse { Success = false, Message = ex.Message };
        }
    }

    // ─── Step 5: Production Unit Master ───
    public async Task<ProductionUnitResponse> SaveProductionUnitAsync(ProductionUnitRequest request)
    {
        try
        {
            using var conn = ClientConnection(request.ConnectionString);
            await conn.OpenAsync();

            var companyID = await conn.ExecuteScalarAsync<int?>(
                "SELECT TOP 1 CompanyID FROM CompanyMaster ORDER BY CompanyID DESC") ?? 2;
            var branchID = await conn.ExecuteScalarAsync<int?>(
                "SELECT TOP 1 BranchID FROM BranchMaster ORDER BY BranchID DESC") ?? 1;
            var userID = await conn.ExecuteScalarAsync<int?>(
                "SELECT TOP 1 UserID FROM UserMaster WHERE UserName = 'admin'") ?? 1;

            var maxNo = await conn.ExecuteScalarAsync<int?>(
                "SELECT ISNULL(MAX(MaxProductionUnitNo), 0) FROM ProductionUnitMaster") ?? 0;
            var newNo = maxNo + 1;
            var productionUnitCode = $"PU{newNo:D5}";

            // DELETE all existing records then INSERT
            await conn.ExecuteAsync("DELETE FROM ProductionUnitMaster");
            Console.WriteLine("[ProductionUnit] Deleted all existing records");

            var query = @"
                INSERT INTO ProductionUnitMaster
                    (ProductionUnitName, Address, City, State, GSTNo, Pincode, Country,
                     CompanyID, BranchID, UserID, IsLocked, IsDeletedTransaction,
                     MaxProductionUnitNo, ProductionUnitCode, PAN)
                VALUES
                    (@ProductionUnitName, @Address, @City, @State, @GSTNo, @Pincode, @Country,
                     @CompanyID, @BranchID, @UserID, 0, 0,
                     @MaxProductionUnitNo, @ProductionUnitCode, @PAN)";

            await conn.ExecuteAsync(query, new
            {
                request.ProductionUnitName, request.Address,
                request.City, request.State,
                GSTNo = request.GSTNo,
                request.Pincode, request.Country,
                CompanyID = companyID, BranchID = branchID, UserID = userID,
                MaxProductionUnitNo = newNo,
                ProductionUnitCode = productionUnitCode,
                request.PAN
            });

            Console.WriteLine($"[ProductionUnit] Inserted: {request.ProductionUnitName}, Code={productionUnitCode}");
            return new ProductionUnitResponse { Success = true, Message = "Production Unit saved." };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ProductionUnit] Error: {ex.Message}");
            return new ProductionUnitResponse { Success = false, Message = ex.Message };
        }
    }

    // ─── Module Settings ───
    private static string GetMasterModuleTable(string applicationName)
    {
        return applicationName.ToLower() switch
        {
            "estimoprime" or "desktop" => "EstimoprimeModuleMaster",
            "printudeerp" => "PrintudeERPModuleMaster",
            "multiunit" => "MultiUnitModuleMaster",
            _ => throw new Exception($"Unknown application for module table: {applicationName}")
        };
    }

    public async Task<ModuleSettingsResponse> GetModuleSettingsAsync(GetModuleSettingsRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.ApplicationName))
                return new ModuleSettingsResponse { Success = false, Message = "ApplicationName is required." };
            if (string.IsNullOrWhiteSpace(request.ConnectionString))
                return new ModuleSettingsResponse { Success = false, Message = "ConnectionString is required." };

            var masterTable = GetMasterModuleTable(request.ApplicationName);

            // 1. Fetch all rows from master module table (Indus DB)
            using var indusConn = GetIndusConnection();
            await indusConn.OpenAsync();

            var masterRows = (await indusConn.QueryAsync<dynamic>(
                $"SELECT ModuleHeadName, ModuleDisplayName, ModuleName FROM [{masterTable}] ORDER BY ModuleHeadName, ModuleDisplayName"
            )).ToList();

            // 2. Fetch company DB ModuleMaster to compare
            using var clientConn = ClientConnection(request.ConnectionString);
            await clientConn.OpenAsync();

            var clientModules = (await clientConn.QueryAsync<dynamic>(
                "SELECT ModuleName, ISNULL(IsDeletedTransaction, 0) AS IsDeletedTransaction FROM ModuleMaster"
            )).ToList();

            // Build lookup: ModuleName → IsDeletedTransaction
            var clientLookup = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var cm in clientModules)
            {
                string modName = cm.ModuleName?.ToString() ?? "";
                int isDel = Convert.ToInt32(cm.IsDeletedTransaction);
                clientLookup[modName] = isDel;
            }

            // 3. Build result with Status
            var result = new List<ModuleSettingsRow>();
            foreach (var row in masterRows)
            {
                string moduleName = row.ModuleName?.ToString() ?? "";
                bool status = false;

                if (clientLookup.TryGetValue(moduleName, out int isDeleted))
                {
                    // Match found: checked only if IsDeletedTransaction = 0
                    status = isDeleted == 0;
                }

                result.Add(new ModuleSettingsRow
                {
                    ModuleHeadName = row.ModuleHeadName?.ToString() ?? "",
                    ModuleDisplayName = row.ModuleDisplayName?.ToString() ?? "",
                    ModuleName = moduleName,
                    Status = status
                });
            }

            Console.WriteLine($"[ModuleSettings] Loaded {result.Count} modules for {request.ApplicationName}, {result.Count(r => r.Status)} active");
            return new ModuleSettingsResponse { Success = true, Data = result };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ModuleSettings] GetModuleSettings Error: {ex.Message}");
            return new ModuleSettingsResponse { Success = false, Message = ex.Message };
        }
    }

    public async Task<SaveModuleSettingsResponse> SaveModuleSettingsAsync(SaveModuleSettingsRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.ApplicationName))
                return new SaveModuleSettingsResponse { Success = false, Message = "ApplicationName is required." };
            if (string.IsNullOrWhiteSpace(request.ConnectionString))
                return new SaveModuleSettingsResponse { Success = false, Message = "ConnectionString is required." };

            var masterTable = GetMasterModuleTable(request.ApplicationName);

            // 1. Get all master rows from Indus DB
            using var indusConn = GetIndusConnection();
            await indusConn.OpenAsync();
            var masterRows = (await indusConn.QueryAsync<dynamic>(
                $"SELECT * FROM [{masterTable}]"
            )).ToList();

            // Build master lookup by ModuleName
            var masterLookup = new Dictionary<string, IDictionary<string, object>>(StringComparer.OrdinalIgnoreCase);
            foreach (IDictionary<string, object> row in masterRows)
            {
                var modName = row["ModuleName"]?.ToString() ?? "";
                if (!string.IsNullOrEmpty(modName))
                    masterLookup[modName] = row;
            }

            // 2. Connect to client DB
            using var clientConn = ClientConnection(request.ConnectionString);
            await clientConn.OpenAsync();

            // Fetch admin UserID and CompanyID for UserModuleAuthentication sync
            var adminUserId = await clientConn.ExecuteScalarAsync<int?>(
                "SELECT TOP 1 UserID FROM UserMaster WHERE UserName = 'admin'");
            var companyId = await clientConn.ExecuteScalarAsync<int?>(
                "SELECT TOP 1 CompanyID FROM CompanyMaster");

            // Get existing client modules
            var existingModules = (await clientConn.QueryAsync<dynamic>(
                "SELECT ModuleName, ISNULL(IsDeletedTransaction, 0) AS IsDeletedTransaction FROM ModuleMaster"
            )).ToList();
            var existingLookup = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var em in existingModules)
            {
                string modName = em.ModuleName?.ToString() ?? "";
                existingLookup[modName] = Convert.ToInt32(em.IsDeletedTransaction);
            }

            int inserted = 0, deleted = 0;

            foreach (var mod in request.Modules)
            {
                bool existsInClient = existingLookup.ContainsKey(mod.ModuleName);

                if (mod.Status)
                {
                    // Should be active
                    if (existsInClient)
                    {
                        // Exists but may be soft-deleted → undelete
                        if (existingLookup[mod.ModuleName] == 1)
                        {
                            await clientConn.ExecuteAsync(
                                "UPDATE ModuleMaster SET IsDeletedTransaction = 0 WHERE ModuleName = @ModuleName",
                                new { mod.ModuleName });

                            // Sync UserModuleAuthentication: insert if not exists
                            if (adminUserId.HasValue)
                            {
                                var moduleId = await clientConn.ExecuteScalarAsync<int?>(
                                    "SELECT ModuleID FROM ModuleMaster WHERE ModuleName = @ModuleName",
                                    new { mod.ModuleName });
                                if (moduleId.HasValue)
                                {
                                    await clientConn.ExecuteAsync(@"
                                        IF NOT EXISTS (SELECT 1 FROM UserModuleAuthentication WHERE ModuleID = @ModuleID AND UserID = @UserID)
                                        INSERT INTO UserModuleAuthentication
                                        (UserID, ModuleID, ModuleName, CanView, CanSave, CanEdit, CanDelete, CanPrint, CanExport, CanCancel, IsHomePage, CompanyID, IsLocked, CreatedBy, IsDeletedTransaction)
                                        VALUES (@UserID, @ModuleID, @ModuleName, 1, 1, 1, 1, 1, 1, 1, 0, @CompanyID, 0, @UserID, 0)",
                                        new { UserID = adminUserId.Value, ModuleID = moduleId.Value, mod.ModuleName, CompanyID = companyId ?? 2 });
                                }
                            }
                            inserted++;
                        }
                        // Already active, skip
                    }
                    else
                    {
                        // INSERT: copy all columns from master
                        if (masterLookup.TryGetValue(mod.ModuleName, out var masterRow))
                        {
                            // Build dynamic INSERT from master columns, excluding identity ModuleID
                            var columns = masterRow.Keys.Where(k => !k.Equals("ModuleID", StringComparison.OrdinalIgnoreCase)).ToList();
                            var colNames = string.Join(", ", columns.Select(c => $"[{c}]"));
                            var paramNames = string.Join(", ", columns.Select(c => $"@{c}"));

                            var paramObj = new DynamicParameters();
                            foreach (var col in columns)
                            {
                                paramObj.Add(col, masterRow[col]);
                            }

                            // Insert into ModuleMaster and get the new ModuleID
                            var newModuleId = await clientConn.ExecuteScalarAsync<int>(
                                $"INSERT INTO ModuleMaster ({colNames}) OUTPUT INSERTED.ModuleID VALUES ({paramNames})", paramObj);

                            // Sync UserModuleAuthentication: insert with full permissions
                            if (adminUserId.HasValue)
                            {
                                await clientConn.ExecuteAsync(@"
                                    INSERT INTO UserModuleAuthentication
                                    (UserID, ModuleID, ModuleName, CanView, CanSave, CanEdit, CanDelete, CanPrint, CanExport, CanCancel, IsHomePage, CompanyID, IsLocked, CreatedBy, IsDeletedTransaction)
                                    VALUES (@UserID, @ModuleID, @ModuleName, 1, 1, 1, 1, 1, 1, 1, 0, @CompanyID, 0, @UserID, 0)",
                                    new { UserID = adminUserId.Value, ModuleID = newModuleId, mod.ModuleName, CompanyID = companyId ?? 2 });
                            }
                            inserted++;
                        }
                    }
                }
                else
                {
                    // Should be inactive
                    if (existsInClient && existingLookup[mod.ModuleName] == 0)
                    {
                        // Get ModuleID before deleting
                        var moduleId = await clientConn.ExecuteScalarAsync<int?>(
                            "SELECT ModuleID FROM ModuleMaster WHERE ModuleName = @ModuleName",
                            new { mod.ModuleName });

                        // Delete from UserModuleAuthentication first
                        if (moduleId.HasValue)
                        {
                            await clientConn.ExecuteAsync(
                                "DELETE FROM UserModuleAuthentication WHERE ModuleID = @ModuleID AND ModuleName = @ModuleName",
                                new { ModuleID = moduleId.Value, mod.ModuleName });
                        }

                        // DELETE from ModuleMaster
                        await clientConn.ExecuteAsync(
                            "DELETE FROM ModuleMaster WHERE ModuleName = @ModuleName",
                            new { mod.ModuleName });
                        deleted++;
                    }
                }
            }

            Console.WriteLine($"[ModuleSettings] Save complete: {inserted} inserted/activated, {deleted} deleted");
            return new SaveModuleSettingsResponse
            {
                Success = true,
                Message = $"Module settings saved. {inserted} activated, {deleted} removed.",
                Inserted = inserted,
                Deleted = deleted
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ModuleSettings] Save Error: {ex.Message}");
            return new SaveModuleSettingsResponse { Success = false, Message = ex.Message };
        }
    }

    // ─── Copy Modules ───
    public async Task<ClientDropdownResponse> GetClientDropdownAsync()
    {
        try
        {
            using var conn = GetIndusConnection();
            await conn.OpenAsync();
            var clients = (await conn.QueryAsync<ClientDropdownItem>(
                "SELECT CompanyName, CompanyUserID, ISNULL(ApplicationName,'') AS ApplicationName FROM Indus_Company_Authentication_For_Web_Modules WHERE ISNULL(ApplicationName,'') <> 'Desktop' ORDER BY CompanyName"
            )).ToList();

            return new ClientDropdownResponse { Success = true, Data = clients };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CopyModules] GetClientDropdown Error: {ex.Message}");
            return new ClientDropdownResponse { Success = false, Message = ex.Message };
        }
    }

    public async Task<CopyModulesResponse> CopyModulesAsync(CopyModulesRequest request)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.SourceConnectionString))
                return new CopyModulesResponse { Success = false, Message = "Source connection string is required." };
            if (string.IsNullOrWhiteSpace(request.TargetCompanyUserID))
                return new CopyModulesResponse { Success = false, Message = "Target client is required." };

            // 1. Get target Conn_String from Indus DB
            using var indusConn = GetIndusConnection();
            await indusConn.OpenAsync();
            var targetConnStr = await indusConn.ExecuteScalarAsync<string>(
                "SELECT Conn_String FROM Indus_Company_Authentication_For_Web_Modules WHERE CompanyUserID = @CompanyUserID",
                new { CompanyUserID = request.TargetCompanyUserID });

            if (string.IsNullOrWhiteSpace(targetConnStr))
                return new CopyModulesResponse { Success = false, Message = "Target client connection string not found." };

            // 2. Fetch ALL rows from source ModuleMaster
            using var sourceConn = ClientConnection(request.SourceConnectionString);
            await sourceConn.OpenAsync();
            var sourceRows = (await sourceConn.QueryAsync<dynamic>("SELECT * FROM ModuleMaster")).ToList();

            if (sourceRows.Count == 0)
                return new CopyModulesResponse { Success = false, Message = "No modules found in source database." };

            // 3. Connect to target and copy in a transaction
            using var targetConn = ClientConnection(targetConnStr);
            await targetConn.OpenAsync();
            using var transaction = targetConn.BeginTransaction();

            try
            {
                // Fetch admin UserID and CompanyID for UserModuleAuthentication sync
                var adminUserId = await targetConn.ExecuteScalarAsync<int?>(
                    "SELECT TOP 1 UserID FROM UserMaster WHERE UserName = 'admin'", transaction: transaction);
                var companyId = await targetConn.ExecuteScalarAsync<int?>(
                    "SELECT TOP 1 CompanyID FROM CompanyMaster", transaction: transaction);

                // Delete existing data (UserModuleAuthentication first, then ModuleMaster)
                await targetConn.ExecuteAsync("DELETE FROM UserModuleAuthentication", transaction: transaction);
                await targetConn.ExecuteAsync("DELETE FROM ModuleMaster", transaction: transaction);

                // Insert all source rows (exclude identity ModuleID)
                int copiedCount = 0;
                foreach (IDictionary<string, object> row in sourceRows)
                {
                    var columns = row.Keys.Where(k => !k.Equals("ModuleID", StringComparison.OrdinalIgnoreCase)).ToList();
                    var colNames = string.Join(", ", columns.Select(c => $"[{c}]"));
                    var paramNames = string.Join(", ", columns.Select(c => $"@{c}"));

                    var paramObj = new DynamicParameters();
                    foreach (var col in columns)
                    {
                        paramObj.Add(col, row[col]);
                    }

                    // Insert into ModuleMaster and get new ModuleID
                    var newModuleId = await targetConn.ExecuteScalarAsync<int>(
                        $"INSERT INTO ModuleMaster ({colNames}) OUTPUT INSERTED.ModuleID VALUES ({paramNames})",
                        paramObj, transaction: transaction);

                    // Sync UserModuleAuthentication: insert with full permissions for admin
                    if (adminUserId.HasValue)
                    {
                        string moduleName = row.ContainsKey("ModuleName") ? row["ModuleName"]?.ToString() ?? "" : "";
                        await targetConn.ExecuteAsync(@"
                            INSERT INTO UserModuleAuthentication
                            (UserID, ModuleID, ModuleName, CanView, CanSave, CanEdit, CanDelete, CanPrint, CanExport, CanCancel, IsHomePage, CompanyID, IsLocked, CreatedBy, IsDeletedTransaction)
                            VALUES (@UserID, @ModuleID, @ModuleName, 1, 1, 1, 1, 1, 1, 1, 0, @CompanyID, 0, @UserID, 0)",
                            new { UserID = adminUserId.Value, ModuleID = newModuleId, ModuleName = moduleName, CompanyID = companyId ?? 2 },
                            transaction: transaction);
                    }

                    copiedCount++;
                }

                transaction.Commit();
                Console.WriteLine($"[CopyModules] Copied {copiedCount} modules (+ UserModuleAuthentication) to target {request.TargetCompanyUserID}");
                return new CopyModulesResponse
                {
                    Success = true,
                    Message = $"Modules copied successfully to selected client. ({copiedCount} modules)",
                    CopiedCount = copiedCount
                };
            }
            catch
            {
                transaction.Rollback();
                throw;
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CopyModules] Error: {ex.Message}");
            return new CopyModulesResponse { Success = false, Message = ex.Message };
        }
    }

    // ─── Final Step: Complete Setup ───
    public async Task<CompleteSetupResponse> CompleteSetupAsync(CompleteSetupRequest request)
    {
        try
        {
            // 1. Update UserMaster with City, State, Country on client DB
            using (var conn = ClientConnection(request.ConnectionString))
            {
                await conn.OpenAsync();
                await conn.ExecuteAsync(
                    @"UPDATE UserMaster SET City = @City, State = @State, Country = @Country
                      WHERE UserName = 'admin'",
                    new { request.City, request.State, request.Country });
                Console.WriteLine("[CompleteSetup] Updated UserMaster for admin");
            }

            // 2. Fetch CompanyUserID and Password from Indus DB
            using var indusConn = GetIndusConnection();
            var sub = await indusConn.QueryFirstOrDefaultAsync<dynamic>(
                "SELECT CompanyUserID, Password FROM Indus_Company_Authentication_For_Web_Modules WHERE CompanyUserID = @CompanyUserID",
                new { request.CompanyUserID });

            if (sub == null)
                return new CompleteSetupResponse { Success = false, Message = "Subscription record not found." };

            Console.WriteLine($"[CompleteSetup] SUCCESS for CompanyUserID={sub.CompanyUserID}");

            return new CompleteSetupResponse
            {
                Success = true,
                Message = "Setup completed successfully!",
                CompanyUserID = sub.CompanyUserID,
                Password = sub.Password
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[CompleteSetup] Error: {ex.Message}");
            return new CompleteSetupResponse { Success = false, Message = ex.Message };
        }
    }
}
