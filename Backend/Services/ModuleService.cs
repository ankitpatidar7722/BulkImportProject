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
}
