using Backend.DTOs;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Backend.Services;

public class ModuleAuthorityService : IModuleAuthorityService
{
    private readonly SqlConnection _connection;

    private const string SourceConnStr =
        "Data Source=13.200.122.70,1433;Initial Catalog=IndusEnterpriseNewInstallation;" +
        "User ID=indus;Password=Param@99811;Persist Security Info=True;TrustServerCertificate=True";

    public ModuleAuthorityService(SqlConnection connection)
    {
        _connection = connection;
    }

    /// <summary>
    /// Fetches modules from the source DB (IndusEnterpriseNewInstallation) and compares
    /// them against the login DB to determine checkbox status.
    /// </summary>
    public async Task<List<ModuleAuthorityRowDto>> GetModuleAuthorityDataAsync(string product)
    {
        // 1. Fetch source modules
        await using var sourceConn = new SqlConnection(SourceConnStr);
        var sourceModules = (await sourceConn.QueryAsync<dynamic>(
            "SELECT ModuleHeadName, ModuleName, ModuleDisplayName FROM ModuleMaster WHERE IsDeletedTransaction = 0"
        )).ToList();

        // 2. Fetch login DB modules (all, including soft-deleted). ISNULL handles NULL values.
        var loginModules = (await _connection.QueryAsync<dynamic>(
            "SELECT ModuleHeadName, ModuleDisplayName, ISNULL(IsDeletedTransaction, 0) AS IsDeletedTransaction FROM ModuleMaster"
        )).ToList();

        // 3. Build lookup from login DB: key = HeadName|DisplayName, value = IsDeletedTransaction (bool)
        var loginLookup = new Dictionary<string, bool>();
        foreach (var lm in loginModules)
        {
            string key = $"{lm.ModuleHeadName}|{lm.ModuleDisplayName}";
            if (!loginLookup.ContainsKey(key))
                loginLookup[key] = (bool)lm.IsDeletedTransaction;
        }

        // 4. Build result rows
        var result = new List<ModuleAuthorityRowDto>();
        foreach (var src in sourceModules)
        {
            string key = $"{src.ModuleHeadName}|{src.ModuleDisplayName}";
            bool existsInLogin = loginLookup.ContainsKey(key);
            bool status = false;

            if (existsInLogin)
            {
                // IsDeletedTransaction = false means active -> status checked
                status = !loginLookup[key];
            }

            result.Add(new ModuleAuthorityRowDto
            {
                ModuleHeadName = src.ModuleHeadName ?? "",
                ModuleName = src.ModuleName ?? "",
                ModuleDisplayName = src.ModuleDisplayName ?? "",
                Status = status,
                ExistsInLoginDb = existsInLogin
            });
        }

        return result;
    }

    /// <summary>
    /// Saves Module Authority changes: insert missing modules, enable/disable existing ones.
    /// </summary>
    public async Task<object> SaveModuleAuthorityAsync(List<ModuleAuthoritySaveDto> modules, string product)
    {
        int inserted = 0, deleted = 0, maintained = 0;

        await _connection.OpenAsync();
        using var transaction = _connection.BeginTransaction();

        try
        {
            // 1. Fetch all existing local modules for lookup
            var loginModules = (await _connection.QueryAsync<dynamic>(
                "SELECT ModuleId, ModuleHeadName, ModuleDisplayName, ISNULL(IsDeletedTransaction, 0) AS IsDeletedTransaction FROM ModuleMaster",
                transaction: transaction
            )).ToList();

            var loginLookup = new Dictionary<string, (int ModuleId, bool IsDeletedTransaction)>();
            foreach (var lm in loginModules)
            {
                string key = $"{lm.ModuleHeadName}|{lm.ModuleDisplayName}";
                if (!loginLookup.ContainsKey(key))
                    loginLookup[key] = ((int)lm.ModuleId, (bool)lm.IsDeletedTransaction);
            }

            await using var sourceConn = new SqlConnection(SourceConnStr);
            await sourceConn.OpenAsync();

            // 2. Process all modules in the payload
            foreach (var mod in modules)
            {
                string key = $"{mod.ModuleHeadName}|{mod.ModuleDisplayName}";
                bool existsLocally = loginLookup.TryGetValue(key, out var loginInfo);

                if (mod.Status) // Checkbox ticked -> Should exist in local DB
                {
                    if (!existsLocally)
                    {
                        // Case A: Insert from source DB
                        var sourceRow = await sourceConn.QueryFirstOrDefaultAsync<dynamic>(
                            @"SELECT * FROM ModuleMaster 
                              WHERE ModuleHeadName = @ModuleHeadName 
                                AND ModuleDisplayName = @ModuleDisplayName 
                                AND IsDeletedTransaction = 0",
                            new { mod.ModuleHeadName, mod.ModuleDisplayName });

                        if (sourceRow != null)
                        {
                            var srcDict = (IDictionary<string, object>)sourceRow;
                            // Remove identity/calculated columns
                            srcDict.Remove("ModuleId");
                            srcDict.Remove("ModuleID");

                            var columns = srcDict.Keys.ToList();
                            var colList = string.Join(", ", columns);
                            var paramList = string.Join(", ", columns.Select(c => "@" + c));

                            var insertQuery = $"INSERT INTO ModuleMaster ({colList}) VALUES ({paramList}); SELECT CAST(SCOPE_IDENTITY() as int);";
                            var newModuleId = await _connection.ExecuteScalarAsync<int>(insertQuery, new DynamicParameters(srcDict), transaction: transaction);
                            
                            // Also give admin full permission for this new module
                            var adminUserId = await _connection.ExecuteScalarAsync<int?>(
                                "SELECT TOP 1 UserID FROM UserMaster WHERE UserName = 'admin' AND ISNULL(IsBlocked, 0) = 0", 
                                transaction: transaction);
                            
                            if (adminUserId.HasValue)
                            {
                                await _connection.ExecuteAsync(@"
                                    INSERT INTO UserModuleAuthentication 
                                    (UserID, ModuleID, ModuleName, CanView, CanSave, CanEdit, CanDelete, CanPrint, CanExport, CanCancel, IsHomePage, CompanyID, IsLocked, CreatedBy)
                                    VALUES (@UserID, @ModuleID, @ModuleName, 1, 1, 1, 1, 1, 1, 1, 0, 2, 0, @UserID)",
                                    new { UserID = adminUserId.Value, ModuleID = newModuleId, ModuleName = mod.ModuleName },
                                    transaction: transaction);
                            }

                            inserted++;
                        }
                    }
                    else 
                    {
                        // Module exists. If it was previously soft-deleted, we should restore it?
                        // Actually, the user wants hard deletes, so there shouldn't be soft-deleted modules.
                        // But for safety, ensure IsDeletedTransaction is 0 if it exists.
                        if (loginInfo.IsDeletedTransaction)
                        {
                            await _connection.ExecuteAsync(
                                "UPDATE ModuleMaster SET IsDeletedTransaction = 0 WHERE ModuleId = @ModuleId",
                                new { ModuleId = loginInfo.ModuleId }, transaction: transaction);
                        }
                        maintained++;
                    }
                }
                else // Checkbox unticked -> Should be hard deleted
                {
                    if (existsLocally)
                    {
                        // HARD DELETE: Remove from UserModuleAuthentication first, then ModuleMaster
                        await _connection.ExecuteAsync(
                            "DELETE FROM UserModuleAuthentication WHERE ModuleID = @ModuleId",
                            new { ModuleId = loginInfo.ModuleId }, transaction: transaction);

                        await _connection.ExecuteAsync(
                            "DELETE FROM ModuleMaster WHERE ModuleId = @ModuleId",
                            new { ModuleId = loginInfo.ModuleId }, transaction: transaction);
                        
                        deleted++;
                    }
                }
            }

            transaction.Commit();
            return new { inserted, deleted, maintained, total = modules.Count };
        }
        catch (Exception ex)
        {
            transaction.Rollback();
            throw;
        }
    }

}
