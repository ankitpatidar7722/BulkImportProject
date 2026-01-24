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
}
