using Backend.DTOs;
using Dapper;
using Microsoft.Data.SqlClient;
using OfficeOpenXml;

namespace Backend.Services;

public class ExcelService : IExcelService
{
    private readonly SqlConnection _connection;

    public ExcelService(SqlConnection connection)
    {
        _connection = connection;
    }

    public async Task<ExcelPreviewDto> PreviewExcelAsync(Stream fileStream)
    {
        try
        {
            using var package = new ExcelPackage(fileStream);
            var worksheet = package.Workbook.Worksheets[0]; // Get first worksheet

            if (worksheet.Dimension == null)
            {
                throw new Exception("The Excel file is empty.");
            }

            var preview = new ExcelPreviewDto
            {
                TotalRows = worksheet.Dimension.Rows,
                TotalColumns = worksheet.Dimension.Columns
            };

            // Read headers from first row
            for (int col = 1; col <= worksheet.Dimension.Columns; col++)
            {
                var headerValue = worksheet.Cells[1, col].Value?.ToString() ?? $"Column{col}";
                preview.Headers.Add(headerValue);
            }

            // Read all data rows
            for (int row = 2; row <= worksheet.Dimension.Rows; row++)
            {
                var rowData = new List<object>();
                for (int col = 1; col <= worksheet.Dimension.Columns; col++)
                {
                    var cellValue = worksheet.Cells[row, col].Value ?? "";
                    rowData.Add(cellValue);
                }
                preview.Rows.Add(rowData);
            }

            return await Task.FromResult(preview);
        }
        catch (Exception ex)
        {
            throw new Exception($"Error reading Excel file: {ex.Message}", ex);
        }
    }

    public async Task<ImportResultDto> ImportExcelAsync(Stream fileStream, string tableName)
    {
        // Debug: Log the incoming table name
        try 
        {
            File.AppendAllText("import_debug.log", $"{DateTime.Now}: Starting Import for TableName: '{tableName}'{Environment.NewLine}");
        }
        catch {}

        // Special handling for Product Group Master
        // Loosen check to catch variations
        if (tableName.Equals("Product Group Master", StringComparison.OrdinalIgnoreCase) || 
            tableName.Equals("ProductGroupMaster", StringComparison.OrdinalIgnoreCase) ||
            tableName.Contains("Product Group", StringComparison.OrdinalIgnoreCase) ||
            tableName.Equals("ProductGroupMasterForGST.aspx", StringComparison.OrdinalIgnoreCase) ||
            tableName.Equals("ProductGroupMasterForGST", StringComparison.OrdinalIgnoreCase))
        {
            return await ImportProductGroupMasterAsync(fileStream);
        }

        var result = new ImportResultDto();
        
        try
        {
            using var package = new ExcelPackage(fileStream);
            var worksheet = package.Workbook.Worksheets[0];

            if (worksheet.Dimension == null)
            {
                result.Success = false;
                result.ErrorMessages.Add("The Excel file is empty.");
                return result;
            }

            // Read headers
            var headers = new List<string>();
            for (int col = 1; col <= worksheet.Dimension.Columns; col++)
            {
                headers.Add(worksheet.Cells[1, col].Value?.ToString() ?? $"Column{col}");
            }

            result.TotalRows = worksheet.Dimension.Rows - 1; // Exclude header row

            // Get existing records to check for duplicates
            var existingRecords = await GetExistingRecordsAsync(tableName, headers);

            int importedCount = 0;
            int duplicateCount = 0;
            int errorCount = 0;

            // Process each row
            for (int row = 2; row <= worksheet.Dimension.Rows; row++)
            {
                try
                {
                    var rowData = new Dictionary<string, object>();
                    
                    for (int col = 1; col <= worksheet.Dimension.Columns; col++)
                    {
                        var value = worksheet.Cells[row, col].Value;
                        rowData[headers[col - 1]] = value ?? DBNull.Value;
                    }

                    // Check for duplicates
                    if (IsDuplicate(rowData, existingRecords))
                    {
                        duplicateCount++;
                        continue;
                    }

                    // Insert record
                    await InsertRecordAsync(tableName, rowData);
                    importedCount++;
                }
                catch (Exception ex)
                {
                    errorCount++;
                    result.ErrorMessages.Add($"Row {row}: {ex.Message}");
                }
            }

            result.Success = errorCount == 0;
            result.ImportedRows = importedCount;
            result.DuplicateRows = duplicateCount;
            result.ErrorRows = errorCount;
            result.ErrorMessages = result.ErrorMessages; // Ensure these are set

            if (result.Success)
                result.Message = $"Import completed. Imported: {importedCount}, Duplicates: {duplicateCount}, Errors: {errorCount}";
            else 
            {
                var firstError = result.ErrorMessages.FirstOrDefault() ?? "Unknown";
                result.Message = $"Generic Import Failed. Errors: {errorCount}. First Error: {firstError}";
                 try 
                 {
                    File.AppendAllText("import_debug.log", $"{DateTime.Now}: Generic Import Failed. Table: {tableName}. First Error: {firstError}{Environment.NewLine}");
                 }
                 catch {}
            }

            return result;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.ErrorMessages.Add($"Import failed: {ex.Message}");
            return result;
        }
    }

    private async Task<ImportResultDto> ImportProductGroupMasterAsync(Stream fileStream)
    {
        var result = new ImportResultDto();
        try
        {
            using var package = new ExcelPackage(fileStream);
            var worksheet = package.Workbook.Worksheets[0];

            if (worksheet.Dimension == null)
            {
                result.Success = false;
                result.ErrorMessages.Add("The Excel file is empty.");
                return result;
            }

            result.TotalRows = worksheet.Dimension.Rows - 1;
            int importedCount = 0;
            int errorCount = 0;
            var errorMessages = new List<string>();

            // Get Headers mapping
            var headerMap = new Dictionary<string, int>();
            for (int col = 1; col <= worksheet.Dimension.Columns; col++)
            {
                var header = worksheet.Cells[1, col].Value?.ToString()?.Trim();
                if (!string.IsNullOrEmpty(header))
                {
                    headerMap[header] = col;
                }
            }

            // Helper to get value securely
            string GetValue(string colName, int rowIdx)
            {
                // Try exact match first, then case-insensitive
                var colIndex = headerMap.ContainsKey(colName) ? headerMap[colName] : 
                               headerMap.FirstOrDefault(k => k.Key.Equals(colName, StringComparison.OrdinalIgnoreCase)).Value;
                
                if (colIndex == 0) return null; // Column not found
                
                return worksheet.Cells[rowIdx, colIndex].Value?.ToString()?.Trim();
            }

            // Loop rows
            for (int row = 2; row <= worksheet.Dimension.Rows; row++)
            {
                try 
                {
                    // 0. Check for Empty Row
                    bool isRowEmpty = true;
                    for (int c = 1; c <= worksheet.Dimension.Columns; c++)
                    {
                        if (!string.IsNullOrWhiteSpace(worksheet.Cells[row, c].Value?.ToString()))
                        {
                            isRowEmpty = false;
                            break;
                        }
                    }

                    if (isRowEmpty) continue;

                    // 1. Read Excel Values
                    var groupName = GetValue("Group Name", row);
                    var hsnCode = GetValue("HSN Code", row);
                    var displayName = GetValue("Display Name", row);
                    var productType = GetValue("ProductType", row); // Maps to ProductCategory
                    var gst = GetValue("GST %", row);
                    var cgst = GetValue("CGST %", row);
                    var sgst = GetValue("SGST %", row);
                    var igst = GetValue("IGST %", row);
                    var itemGroupName = GetValue("ItemGroupName", row) ?? GetValue("Item Group Name", row);

                    // 2. Validations
                    if (string.IsNullOrEmpty(displayName))
                        throw new Exception("Display Name is required.");

                    if (string.IsNullOrEmpty(hsnCode))
                        throw new Exception("HSN Code is required.");

                    if (string.IsNullOrEmpty(productType))
                        throw new Exception("Product Category is required.");

                    // Check Unique Display Name
                    var existingName = await _connection.ExecuteScalarAsync<int>(
                        "SELECT COUNT(1) FROM ProductHSNMaster WHERE DisplayName = @DisplayName", 
                        new { DisplayName = displayName });

                    if (existingName > 0)
                        throw new Exception($"Display Name '{displayName}' already exists.");

                    // 3. Dynamic Lookup for ItemGroupID
                    int? itemGroupId = null;
                    if (string.Equals(productType, "Raw Material", StringComparison.OrdinalIgnoreCase))
                    {
                        if (!string.IsNullOrEmpty(itemGroupName))
                        {
                            itemGroupId = await _connection.QueryFirstOrDefaultAsync<int?>(
                                "SELECT ItemGroupID FROM ItemGroupMaster WHERE ItemGroupName = @ItemGroupName",
                                new { ItemGroupName = itemGroupName });
                            
                            if (itemGroupId == null)
                                throw new Exception($"ItemGroupName '{itemGroupName}' not found in ItemGroupMaster.");
                        }
                    }

                    // 4. Prepare Data for Insert
                    var insertParams = new DynamicParameters();
                    insertParams.Add("@ProductHSNName", groupName);
                    insertParams.Add("@HSNCode", hsnCode ?? "");
                    insertParams.Add("@UnderProductHSNID", 0);
                    insertParams.Add("@GroupLevel", 0);
                    insertParams.Add("@CompanyID", 2);
                    insertParams.Add("@DisplayName", displayName);
                    insertParams.Add("@TariffNo", "");
                    insertParams.Add("@ProductCategory", productType ?? "");
                    insertParams.Add("@GSTTaxPercentage", decimal.TryParse(gst?.Replace("%",""), out var dGst) ? dGst : 0);
                    insertParams.Add("@CGSTTaxPercentage", decimal.TryParse(cgst?.Replace("%",""), out var dCgst) ? dCgst : 0);
                    insertParams.Add("@SGSTTaxPercentage", decimal.TryParse(sgst?.Replace("%",""), out var dSgst) ? dSgst : 0);
                    insertParams.Add("@IGSTTaxPercentage", decimal.TryParse(igst?.Replace("%",""), out var dIgst) ? dIgst : 0);
                    insertParams.Add("@TallyProductHSNName", "");
                    insertParams.Add("@TallyGUID", 0);
                    insertParams.Add("@ItemGroupID", itemGroupId); // Can be null
                    insertParams.Add("@UserID", 2);
                    insertParams.Add("@ModifiedDate", DateTime.Now);
                    insertParams.Add("@CreatedBy", 2);
                    insertParams.Add("@CreatedDate", DateTime.Now);
                    insertParams.Add("@ModifiedBy", 2);
                    insertParams.Add("@DeletedBy", 0);
                    insertParams.Add("@DeletedDate", null);
                    insertParams.Add("@IsDeletedTransaction", 0);
                    insertParams.Add("@FYear", "2025-2026");

                    // 5. Insert
             string insertQuery = @"
                        INSERT INTO ProductHSNMaster (
                            ProductHSNName, HSNCode, UnderProductHSNID, GroupLevel, CompanyID, 
                            DisplayName, TariffNo, ProductCategory, GSTTaxPercentage, 
                            CGSTTaxPercentage, SGSTTaxPercentage, IGSTTaxPercentage, 
                            TallyProductHSNName, TallyGUID, ItemGroupID, UserID, 
                            ModifiedDate, CreatedBy, CreatedDate, ModifiedBy, 
                            DeletedBy, DeletedDate, IsDeletedTransaction, FYear
                        ) VALUES (
                            @ProductHSNName, @HSNCode, @UnderProductHSNID, @GroupLevel, @CompanyID, 
                            @DisplayName, @TariffNo, @ProductCategory, @GSTTaxPercentage, 
                            @CGSTTaxPercentage, @SGSTTaxPercentage, @IGSTTaxPercentage, 
                            @TallyProductHSNName, @TallyGUID, @ItemGroupID, @UserID, 
                            @ModifiedDate, @CreatedBy, @CreatedDate, @ModifiedBy, 
                            @DeletedBy, @DeletedDate, @IsDeletedTransaction, @FYear
                        )";

                    await _connection.ExecuteAsync(insertQuery, insertParams);
                    importedCount++;
                }
                catch (Exception ex)
                {
                    errorCount++;
                    var errorMsg = $"Row {row}: {ex.Message}";
                    errorMessages.Add(errorMsg);
                    
                    // Debug: Log first 5 errors to file to help diagnose
                    if (errorCount <= 5)
                    {
                        try 
                        {
                            File.AppendAllText("import_debug.log", $"{DateTime.Now}: {errorMsg}{Environment.NewLine}");
                        }
                        catch {}
                    }
                }
            }

            result.Success = errorCount == 0;
            result.ImportedRows = importedCount;
            result.ErrorRows = errorCount;
            result.ErrorMessages = errorMessages;
            
            if (result.Success)
                result.Message = $"Successfully imported {importedCount} rows into Product Group Master.";
            else
            {
                var firstError = errorMessages.FirstOrDefault() ?? "Unknown error";
                result.Message = $"Import failed. Errors: {errorCount}. First Error: {firstError}";
                
                if (errorCount > 0)
                {
                     try 
                     {
                        File.AppendAllText("import_debug.log", $"{DateTime.Now}: Total Errors: {errorCount}. First few errors: {string.Join(", ", errorMessages.Take(3))}{Environment.NewLine}");
                     }
                     catch {}
                }
            }
                
            return result;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.ErrorMessages.Add($"Critical Import Error: {ex.Message}");
            return result;
        }
    }

    private async Task<List<Dictionary<string, object>>> GetExistingRecordsAsync(string tableName, List<string> columns)
    {
        try
        {
            var columnList = string.Join(", ", columns.Select(c => $"[{c}]"));
            var query = $"SELECT {columnList} FROM [{tableName}]";
            
            var records = await _connection.QueryAsync(query);
            
            return records.Select(r => ((IDictionary<string, object>)r).ToDictionary(k => k.Key, v => v.Value)).ToList();
        }
        catch
        {
            // If table doesn't exist or error, return empty list
            return new List<Dictionary<string, object>>();
        }
    }

    private bool IsDuplicate(Dictionary<string, object> newRecord, List<Dictionary<string, object>> existingRecords)
    {
        foreach (var existing in existingRecords)
        {
            bool isDuplicate = true;
            
            foreach (var key in newRecord.Keys)
            {
                if (!existing.ContainsKey(key))
                {
                    isDuplicate = false;
                    break;
                }

                var newValue = newRecord[key]?.ToString() ?? "";
                var existingValue = existing[key]?.ToString() ?? "";

                if (newValue != existingValue)
                {
                    isDuplicate = false;
                    break;
                }
            }

            if (isDuplicate)
                return true;
        }

        return false;
    }

    private async Task InsertRecordAsync(string tableName, Dictionary<string, object> data)
    {
        var columns = string.Join(", ", data.Keys.Select(k => $"[{k}]"));
        // Sanitize parameter names: remove spaces and special chars
        var paramDict = new Dictionary<string, object>();
        var paramNames = new List<string>();

        foreach(var kvp in data)
        {
            var cleanParamName = "@" + System.Text.RegularExpressions.Regex.Replace(kvp.Key, "[^a-zA-Z0-9]", "");
            paramNames.Add(cleanParamName);
            paramDict[cleanParamName.Substring(1)] = kvp.Value; // Dapper expects name without @ in dictionary keys? No, DynamicParameters handles it, but dictionary keys usually don't need @ if passed as object. 
            // Wait, Dapper's ExecuteAsync(sql, paramObject). If paramObject is Dictionary<string, object>, keys should match @ParamName in sql? 
            // Dapper treats Dictionary<string,object> as a bag of parameters where Key = ParamName.
        }
        
        // Actually, simpler way with Dapper and Dictionary:
        // If we use DynamicParameters, it's safer.
        var parameters = new DynamicParameters();
        var paramList = new List<string>();
        
        foreach(var kvp in data)
        {
            var cleanName = System.Text.RegularExpressions.Regex.Replace(kvp.Key, "[^a-zA-Z0-9_]", "_");
            var paramName = $"@{cleanName}";
            
            paramList.Add(paramName);
            parameters.Add(cleanName, kvp.Value);
        }

        var paramString = string.Join(", ", paramList);
        var query = $"INSERT INTO [{tableName}] ({columns}) VALUES ({paramString})";
        
        await _connection.ExecuteAsync(query, parameters);
    }
}
