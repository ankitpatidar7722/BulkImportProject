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
            "SELECT ModuleHeadName, ModuleDisplayName FROM ModuleMaster WHERE IsDeletedTransaction = 0"
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
        int inserted = 0, enabled = 0, disabled = 0;

        // 1. Fetch all existing local modules at once for faster lookups
        var loginModules = (await _connection.QueryAsync<dynamic>(
            "SELECT ModuleId, ModuleHeadName, ModuleDisplayName, ISNULL(IsDeletedTransaction, 0) AS IsDeletedTransaction FROM ModuleMaster"
        )).ToList();

        var loginLookup = new Dictionary<string, (int ModuleId, bool IsDeletedTransaction)>();
        foreach (var lm in loginModules)
        {
            string key = $"{lm.ModuleHeadName}|{lm.ModuleDisplayName}";
            if (!loginLookup.ContainsKey(key))
                loginLookup[key] = ((int)lm.ModuleId, (bool)lm.IsDeletedTransaction);
        }

        await using var sourceConn = new SqlConnection(SourceConnStr);

        // 2. Process changes
        foreach (var mod in modules)
        {
            string key = $"{mod.ModuleHeadName}|{mod.ModuleDisplayName}";
            bool existsLocally = loginLookup.TryGetValue(key, out var loginInfo);

            if (mod.Status) // Checkbox ticked
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
                        srcDict.Remove("ModuleId");
                        srcDict.Remove("ModuleID");

                        var columns = srcDict.Keys.ToList();
                        var colList = string.Join(", ", columns);
                        var paramList = string.Join(", ", columns.Select(c => "@" + c));

                        var insertQuery = $"INSERT INTO ModuleMaster ({colList}) VALUES ({paramList})";
                        await _connection.ExecuteAsync(insertQuery, new DynamicParameters(srcDict));
                        inserted++;
                    }
                }
                else if (loginInfo.IsDeletedTransaction)
                {
                    // Case B: Module exists but disabled -> enable it
                    await _connection.ExecuteAsync(
                        "UPDATE ModuleMaster SET IsDeletedTransaction = 0 WHERE ModuleId = @ModuleId",
                        new { ModuleId = loginInfo.ModuleId });
                    enabled++;
                }
            }
            else // Checkbox unticked
            {
                if (existsLocally && !loginInfo.IsDeletedTransaction)
                {
                    // Case C: Disable module
                    await _connection.ExecuteAsync(
                        "UPDATE ModuleMaster SET IsDeletedTransaction = 1 WHERE ModuleId = @ModuleId",
                        new { ModuleId = loginInfo.ModuleId });
                    disabled++;
                }
            }
        }

        return new { inserted, enabled, disabled, total = modules.Count };
    }
}
