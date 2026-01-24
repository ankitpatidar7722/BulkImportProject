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
                        0 as ModuleId, 
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
                        0 as ModuleId, 
                        LedgerGroupName as ModuleName, 
                        LedgerGroupName as ModuleDisplayName, 
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
                        0 as ModuleId, 
                        ToolGroupName as ModuleName, 
                        ToolGroupName as ModuleDisplayName, 
                        'Tool Master' as ModuleHeadName 
                    FROM ToolGroupMaster";
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
                logLines.Add("Matched: NO LOGIC (Returning Debug 404)");
                Console.WriteLine($"[ModuleService] NO MATCH FOUND for '{headName}'.");
                var debugList = new List<ModuleDto> 
                { 
                    new ModuleDto 
                    { 
                        ModuleId = -404, 
                        ModuleName = "Debug", 
                        ModuleDisplayName = $"[DEBUG] Valid Logic Not Found For: '{headName}'", 
                        ModuleHeadName = headName 
                    } 
                };
                await File.AppendAllLinesAsync("debug_log.txt", logLines);
                return debugList;
            }

            var modules = await _connection.QueryAsync<ModuleDto>(query, new { HeadName = headName });
            var moduleList = modules.ToList();
            logLines.Add($"Query Result Count: {moduleList.Count}");

            if (moduleList.Count == 0 && headName != "Masters")
            {
                logLines.Add("Zero rows & Not Masters -> Injecting DEBUG Item (-1)");
                moduleList.Add(new ModuleDto 
                { 
                    ModuleId = -1, 
                    ModuleName = $"DEBUG: No Data Found in Table for '{headName}'", 
                    ModuleDisplayName = $"[DEBUG] No Rows Found for '{headName}'. Check Database Table!", 
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
            return new List<ModuleDto> 
            { 
                new ModuleDto 
                { 
                    ModuleId = -99, 
                    ModuleName = "Error", 
                    ModuleDisplayName = $"[ERROR] {ex.Message}", 
                    ModuleHeadName = headName 
                } 
            };
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
}
