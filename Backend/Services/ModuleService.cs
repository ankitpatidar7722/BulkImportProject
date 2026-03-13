using Backend.DTOs;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Backend.Services;

public class ModuleService : IModuleService
{
    private readonly SqlConnection _connection;

    public ModuleService(SqlConnection connection)
    {
        _connection = connection;
    }

    public async Task<List<ModuleDto>> GetModulesByHeadNameAsync(string headName)
    {
        var logLines = new List<string>();
        logLines.Add($"[{DateTime.Now}] Request: '{headName}'");

        try
        {
            Console.WriteLine($"[ModuleService] Fetching modules for HeadName: '{headName}'");
            string query = "";

            headName = headName?.Trim() ?? "";

            if (headName == "ALL")
            {
                return await GetAllModulesAsync();
            }

            // 1. Item Masters
            if (string.Equals(headName, "Item Masters", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(headName, "Masters.aspx", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(headName, "ItemMaster.aspx", StringComparison.OrdinalIgnoreCase) ||
                headName.Contains("Item", StringComparison.OrdinalIgnoreCase))
            {
                logLines.Add("Matched: Item Masters Logic");
                query = @"
                    SELECT
                        ItemGroupID as ModuleId,
                        ItemGroupName as ModuleName,
                        ItemGroupName as ModuleDisplayName,
                        'Item Masters' as ModuleHeadName
                    FROM ItemGroupMaster";
            }
            // 2. Ledger Master
            else if (string.Equals(headName, "Ledger Master", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(headName, "LedgerMaster.aspx", StringComparison.OrdinalIgnoreCase) ||
                     headName.Contains("Ledger", StringComparison.OrdinalIgnoreCase))
            {
                logLines.Add("Matched: Ledger Master Logic");
                query = @"
                    SELECT
                        LedgerGroupID as ModuleId,
                        LedgerGroupName as ModuleName,
                        LedgerGroupNameDisplay as ModuleDisplayName,
                        'Ledger Master' as ModuleHeadName
                    FROM LedgerGroupMaster";
            }
            // 3. Tool Master
            else if (string.Equals(headName, "Tool Master", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(headName, "ToolMaster.aspx", StringComparison.OrdinalIgnoreCase) ||
                     headName.Contains("Tool", StringComparison.OrdinalIgnoreCase))
            {
                logLines.Add("Matched: Tool Master Logic");
                query = @"
                    SELECT
                        ToolGroupID as ModuleId,
                        ToolGroupName as ModuleName,
                        ToolGroupName as ModuleDisplayName,
                        'Tool Master' as ModuleHeadName
                    FROM ToolGroupMaster";
            }
            // 4. Product Group Master
            else if (string.Equals(headName, "Product Group Master", StringComparison.OrdinalIgnoreCase) ||
                     headName.Contains("Product Group", StringComparison.OrdinalIgnoreCase))
            {
                logLines.Add("Matched: Product Group Master Logic");
                // Since this is a specialized import with its own logic, we return a virtual module definition
                // The actual data might come from ProductHSNMaster, but for the dropdown we just need the entry.
                // We'll return a single item that represents the module itself.
                var productGroupModule = new ModuleDto
                {
                    ModuleId = 0,
                    ModuleName = "Product Group Master",
                    ModuleDisplayName = "Product Group Master",
                    ModuleHeadName = "Product Group Master"
                };

                await File.AppendAllLinesAsync("debug_log.txt", logLines);
                return new List<ModuleDto> { productGroupModule };
            }
            // 5. Spare Part Master
            else if (string.Equals(headName, "Spare Part Master", StringComparison.OrdinalIgnoreCase) ||
                     headName.Contains("Spare Part", StringComparison.OrdinalIgnoreCase))
            {
                logLines.Add("Matched: Spare Part Master Logic");
                var sparePartModule = new ModuleDto
                {
                    ModuleId = 0,
                    ModuleName = "Spare Part Master",
                    ModuleDisplayName = "Spare Part Master",
                    ModuleHeadName = "Spare Part Master"
                };

                await File.AppendAllLinesAsync("debug_log.txt", logLines);
                return new List<ModuleDto> { sparePartModule };
            }
            else if (string.Equals(headName, "Masters", StringComparison.OrdinalIgnoreCase))
            {
                 logLines.Add("Matched: Masters Logic (ModuleMaster)");
                 query = @"
                    SELECT
                        ModuleId,
                        ModuleName,
                        ModuleDisplayName,
                        ModuleHeadName
                    FROM ModuleMaster
                    WHERE ModuleHeadName = @HeadName
                    ORDER BY ModuleName";
            }
            else
            {
                logLines.Add($"Matched: Generic Module Logic (Returning virtual sub-module for '{headName}')");
                Console.WriteLine($"[ModuleService] Generic module handling for '{headName}' - creating virtual sub-module.");

                // For all other modules, create a virtual sub-module with the same name
                // This ensures consistent behavior across all modules
                var genericModule = new ModuleDto
                {
                    ModuleId = 0,
                    ModuleName = headName,
                    ModuleDisplayName = headName,
                    ModuleHeadName = headName
                };

                await File.AppendAllLinesAsync("debug_log.txt", logLines);
                return new List<ModuleDto> { genericModule };
            }

            var modules = await _connection.QueryAsync<ModuleDto>(query, new { HeadName = headName });
            var moduleList = modules.ToList();
            logLines.Add($"Query Result Count: {moduleList.Count}");

            if (moduleList.Count == 0 && headName != "Masters")
            {
                logLines.Add($"Zero rows found in database table - creating virtual sub-module for '{headName}'");
                // Create a virtual sub-module to maintain consistent behavior
                moduleList.Add(new ModuleDto
                {
                    ModuleId = 0,
                    ModuleName = headName,
                    ModuleDisplayName = headName,
                    ModuleHeadName = headName
                });
            }

            logLines.Add($"Final Return Count: {moduleList.Count}");
            await File.AppendAllLinesAsync("debug_log.txt", logLines);
            return moduleList;
        }
        catch (Exception ex)
        {
            logLines.Add($"EXCEPTION: {ex.Message}");
            await File.AppendAllLinesAsync("debug_log.txt", logLines);

            Console.WriteLine($"[ModuleService] Error: {ex.Message}");
            // Return empty list on error - error is logged for debugging
            return new List<ModuleDto>();
        }
    }

    public async Task<List<ModuleDto>> GetAllModulesAsync()
    {
        var query = @"
            SELECT
                ModuleId, ModuleName, ModuleHeadName, ModuleDisplayName,
                ModuleHeadDisplayName, ModuleHeadDisplayOrder, ModuleDisplayOrder, SetGroupIndex
            FROM ModuleMaster where IsDeletedTransaction=0";

        var modules = await _connection.QueryAsync<ModuleDto>(query);
        return modules.ToList();
    }

    public async Task<int> CreateModuleAsync(ModuleDto module)
    {
        var query = @"
            INSERT INTO ModuleMaster (
                ModuleName, ModuleHeadName, ModuleDisplayName,
                ModuleHeadDisplayName, ModuleHeadDisplayOrder, ModuleDisplayOrder, SetGroupIndex, CompanyID
            ) VALUES (
                @ModuleName, @ModuleHeadName, @ModuleDisplayName,
                @ModuleHeadDisplayName, @ModuleHeadDisplayOrder, @ModuleDisplayOrder, @SetGroupIndex,2
            );
            SELECT CAST(SCOPE_IDENTITY() as int);";

        return await _connection.ExecuteScalarAsync<int>(query, module);
    }

    public async Task<bool> UpdateModuleAsync(ModuleDto module)
    {
        var query = @"
            UPDATE ModuleMaster SET
                ModuleName = @ModuleName,
                ModuleHeadName = @ModuleHeadName,
                ModuleDisplayName = @ModuleDisplayName,
                ModuleHeadDisplayName = @ModuleHeadDisplayName,
                ModuleHeadDisplayOrder = @ModuleHeadDisplayOrder,
                ModuleDisplayOrder = @ModuleDisplayOrder,
                SetGroupIndex = @SetGroupIndex
            WHERE ModuleId = @ModuleId";

        var rows = await _connection.ExecuteAsync(query, module);
        return rows > 0;
    }

    public async Task<bool> DeleteModuleAsync(int moduleId)
    {
        var query = "Update ModuleMaster SET IsDeletedTransaction =1 WHERE ModuleId = @ModuleId";
        var rows = await _connection.ExecuteAsync(query, new { ModuleId = moduleId });
        return rows > 0;
    }

    public async Task<List<string>> GetUniqueModuleHeadsAsync()
    {
        var query = "SELECT DISTINCT ModuleHeadName FROM ModuleMaster WHERE ModuleHeadName IS NOT NULL ORDER BY ModuleHeadName";
        var heads = await _connection.QueryAsync<string>(query);
        return heads.ToList();
    }

    public async Task<IEnumerable<dynamic>> GetDebugModuleData()
    {
        return await _connection.QueryAsync<dynamic>("SELECT TOP 1 * FROM ModuleMaster");
    }

    // ─────────────────────────────────────────────────────────
    // Create Module Form Helpers
    // ─────────────────────────────────────────────────────────

    private const string IndusConnStr =
        "Data Source=13.200.122.70,1433;Initial Catalog=IndusEnterpriseDemo;" +
        "User ID=indus;Password=Param@99811;Persist Security Info=True;TrustServerCertificate=True";

    /// <summary>Gets the list of distinct ModuleNames from IndusEnterpriseDemo.ModuleMaster.</summary>
    public async Task<List<string>> GetIndusModuleNamesAsync()
    {
        try
        {
            await using var indusConn = new SqlConnection(IndusConnStr);
            var names = await indusConn.QueryAsync<string>(
                "SELECT DISTINCT ModuleName FROM ModuleMaster WHERE IsDeletedTransaction = 0 ORDER BY ModuleName");
            return names.ToList();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ModuleService] GetIndusModuleNamesAsync error: {ex.Message}");
            return new List<string>();
        }
    }

    /// <summary>
    /// Returns auto-fill info for a specific ModuleName from IndusEnterpriseDemo,
    /// then enriches SetGroupIndex from the current (login) DB if the ModuleHeadName already exists.
    /// </summary>
    public async Task<IndusModuleInfoDto?> GetIndusModuleInfoAsync(string moduleName)
    {
        try
        {
            await using var indusConn = new SqlConnection(IndusConnStr);
            var row = await indusConn.QueryFirstOrDefaultAsync<dynamic>(
                @"SELECT TOP 1 ModuleName, ModuleDisplayName, ModuleHeadName, ModuleHeadDisplayName
                  FROM ModuleMaster
                  WHERE ModuleName = @ModuleName AND IsDeletedTransaction = 0",
                new { ModuleName = moduleName });

            if (row == null) return null;

            var info = new IndusModuleInfoDto
            {
                ModuleName          = row.ModuleName,
                ModuleDisplayName   = row.ModuleDisplayName,
                ModuleHeadName      = row.ModuleHeadName,
                ModuleHeadDisplayName = row.ModuleHeadDisplayName,
            };

            // Look up SetGroupIndex in the current (login) DB
            if (!string.IsNullOrWhiteSpace(info.ModuleHeadName))
            {
                var existingSetGroup = await _connection.QueryFirstOrDefaultAsync<int?>(
                    @"SELECT TOP 1 SetGroupIndex FROM ModuleMaster
                      WHERE ModuleHeadName = @HeadName AND IsDeletedTransaction = 0",
                    new { HeadName = info.ModuleHeadName });

                if (existingSetGroup.HasValue)
                {
                    info.SetGroupIndex = existingSetGroup.Value;

                    // Suggest the next display order for this group
                    var maxOrder = await _connection.QueryFirstOrDefaultAsync<int?>(
                        @"SELECT MAX(ModuleHeadDisplayOrder) FROM ModuleMaster
                          WHERE SetGroupIndex = @SetGroupIndex AND IsDeletedTransaction = 0",
                        new { SetGroupIndex = existingSetGroup.Value });

                    info.SuggestedHeadDisplayOrder = (maxOrder ?? 0) + 1;
                }
            }

            return info;
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ModuleService] GetIndusModuleInfoAsync error: {ex.Message}");
            return null;
        }
    }

    /// <summary>Gets default system values: CompanyID, UserID (admin), and FYear.</summary>
    public async Task<ModuleSystemDefaultsDto> GetSystemDefaultsAsync()
    {
        try
        {
            var companyId = await _connection.QueryFirstOrDefaultAsync<int>(
                "SELECT TOP 1 CompanyID FROM CompanyMaster WHERE IsDeletedTransaction = 0 ORDER BY CompanyID DESC");

            var userId = await _connection.QueryFirstOrDefaultAsync<int>(
                "SELECT TOP 1 UserID FROM UserMaster WHERE UserName = 'admin' AND IsDeletedTransaction = 0");

            var now = DateTime.Now;
            var fYear = $"{now.Year - 1}-{now.Year}";
            // Financial year logic: if month >= April, use current-next, else prev-current
            if (now.Month >= 4)
                fYear = $"{now.Year}-{now.Year + 1}";

            return new ModuleSystemDefaultsDto
            {
                CompanyID = companyId,
                UserID    = userId,
                FYear     = fYear
            };
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ModuleService] GetSystemDefaultsAsync error: {ex.Message}");
            return new ModuleSystemDefaultsDto { FYear = $"{DateTime.Now.Year - 1}-{DateTime.Now.Year}" };
        }
    }

    /// <summary>Returns MAX(ModuleHeadDisplayOrder) + 1 for the given SetGroupIndex.</summary>
    public async Task<int> GetNextDisplayOrderAsync(int setGroupIndex)
    {
        var max = await _connection.QueryFirstOrDefaultAsync<int?>(
            @"SELECT MAX(ModuleHeadDisplayOrder) FROM ModuleMaster
              WHERE SetGroupIndex = @SetGroupIndex AND IsDeletedTransaction = 0",
            new { SetGroupIndex = setGroupIndex });
        return (max ?? 0) + 1;
    }

    /// <summary>Returns true if a module with this name already exists in the current DB.</summary>
    public async Task<bool> CheckModuleExistsAsync(string moduleName)
    {
        var count = await _connection.QueryFirstOrDefaultAsync<int>(
            "SELECT COUNT(*) FROM ModuleMaster WHERE ModuleName = @ModuleName AND IsDeletedTransaction = 0",
            new { ModuleName = moduleName });
        return count > 0;
    }

    /// <summary>Returns true if the given display order is already used for this SetGroupIndex.</summary>
    public async Task<bool> CheckDisplayOrderExistsAsync(int order, int setGroupIndex)
    {
        var count = await _connection.QueryFirstOrDefaultAsync<int>(
            @"SELECT COUNT(*) FROM ModuleMaster
              WHERE ModuleHeadDisplayOrder = @Order AND SetGroupIndex = @SetGroupIndex AND IsDeletedTransaction = 0",
            new { Order = order, SetGroupIndex = setGroupIndex });
        return count > 0;
    }

    /// <summary>Increments all display orders >= fromOrder for the given SetGroupIndex by 1 to free up a slot.</summary>
    public async Task ShiftDisplayOrdersAsync(int fromOrder, int setGroupIndex)
    {
        await _connection.ExecuteAsync(
            @"UPDATE ModuleMaster
              SET ModuleHeadDisplayOrder = ModuleHeadDisplayOrder + 1,
                  ModuleDisplayOrder     = ModuleDisplayOrder + 1
              WHERE ModuleHeadDisplayOrder >= @FromOrder
                AND SetGroupIndex = @SetGroupIndex
                AND IsDeletedTransaction = 0",
            new { FromOrder = fromOrder, SetGroupIndex = setGroupIndex });
    }
}
