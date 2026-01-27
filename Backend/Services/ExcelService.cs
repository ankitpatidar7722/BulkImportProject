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

        if (tableName.Equals("Spare Part Master", StringComparison.OrdinalIgnoreCase) ||
            tableName.Equals("SparePartMaster", StringComparison.OrdinalIgnoreCase) ||
            tableName.Equals("SparePartMaster.aspx", StringComparison.OrdinalIgnoreCase) ||
            tableName.Contains("Spare Part", StringComparison.OrdinalIgnoreCase))
        {
            return await ImportSparePartMasterAsync(fileStream, 2); // Default user 2 as per existing code
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
                var colIndex = headerMap.ContainsKey(colName) ? headerMap[colName] : 
                               headerMap.FirstOrDefault(k => k.Key.Equals(colName, StringComparison.OrdinalIgnoreCase)).Value;
                
                if (colIndex == 0) return null;
                return worksheet.Cells[rowIdx, colIndex].Value?.ToString()?.Trim();
            }

            // ==========================================
            // PHASE 1: Validation
            // ==========================================
            var insertList = new List<DynamicParameters>();
            var rowsToProcess = new List<int>();
            
            // To track unique names within the file itself
            var fileDisplayNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            // Pre-fetch existing DisplayNames to minimize DB calls (optional but better for bulk)
            // Or just check per row. For safety and stricter transactional check, checking per row is fine 
            // but since we are doing "all or nothing", fetching all existing names first might be faster if dataset is small.
            // However, let's stick to the current logic pattern but run it purely for validation first.

            for (int row = 2; row <= worksheet.Dimension.Rows; row++)
            {
                bool rowHasError = false;
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
                    var productType = GetValue("ProductType", row); 
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

                    // Check for duplicate in THIS file
                    if (fileDisplayNames.Contains(displayName))
                        throw new Exception($"Duplicate Display Name '{displayName}' found within the uploaded file.");
                    
                    fileDisplayNames.Add(displayName);

                    // Check Unique Display Name in DB
                    await EnsureConnectionOpenAsync();
                    var existingName = await _connection.ExecuteScalarAsync<int>(
                        "SELECT COUNT(1) FROM ProductHSNMaster WHERE DisplayName = @DisplayName AND IsDeletedTransaction = 0", 
                        new { DisplayName = displayName });

                    if (existingName > 0)
                        throw new Exception($"Display Name '{displayName}' already exists in the database.");

                    // 3. Dynamic Lookup for ItemGroupID
                    int? itemGroupId = null;
                    if (string.Equals(productType, "Raw Material", StringComparison.OrdinalIgnoreCase))
                    {
                        if (!string.IsNullOrEmpty(itemGroupName))
                        {
                            await EnsureConnectionOpenAsync();
                            itemGroupId = await _connection.QueryFirstOrDefaultAsync<int?>(
                                "SELECT ItemGroupID FROM ItemGroupMaster WHERE ItemGroupName = @ItemGroupName",
                                new { ItemGroupName = itemGroupName });
                            
                            if (itemGroupId == null)
                                throw new Exception($"ItemGroupName '{itemGroupName}' not found in ItemGroupMaster.");
                        }
                    }

                    // 4. Prepare Data for Later Insert
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
                    insertParams.Add("@ItemGroupID", itemGroupId);
                    insertParams.Add("@UserID", 2);
                    insertParams.Add("@ModifiedDate", DateTime.Now);
                    insertParams.Add("@CreatedBy", 2);
                    insertParams.Add("@CreatedDate", DateTime.Now);
                    insertParams.Add("@ModifiedBy", 2);
                    insertParams.Add("@DeletedBy", 0);
                    insertParams.Add("@DeletedDate", null);
                    insertParams.Add("@IsDeletedTransaction", 0);
                    insertParams.Add("@FYear", "2025-2026");

                    insertList.Add(insertParams);
                }
                catch (Exception ex)
                {
                    rowHasError = true;
                    errorCount++;
                    var errorMsg = $"Row {row}: {ex.Message}";
                    errorMessages.Add(errorMsg);
                }
            }

            // ==========================================
            // PHASE 2: Execution (Only if no errors)
            // ==========================================
            result.ErrorRows = errorCount;
            result.ErrorMessages = errorMessages;

            if (errorCount == 0 && insertList.Any())
            {
                await EnsureConnectionOpenAsync();

                using var transaction = _connection.BeginTransaction();
                try
                {
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

                    foreach (var paramsObj in insertList)
                    {
                        await _connection.ExecuteAsync(insertQuery, paramsObj, transaction: transaction);
                    }

                    transaction.Commit();
                    
                    result.Success = true;
                    result.ImportedRows = insertList.Count;
                    result.Message = $"Successfully imported {insertList.Count} rows into Product Group Master.";
                }
                catch (Exception ex)
                {
                    transaction.Rollback();
                    result.Success = false;
                    result.Message = $"Transaction Failed: {ex.Message}";
                    result.ErrorMessages.Add($"Critical Transaction Error: {ex.Message}");
                    
                    try { File.AppendAllText("import_debug.log", $"{DateTime.Now}: Transaction Rolled back. {ex.Message}{Environment.NewLine}"); } catch {}
                }
            }
            else if (errorCount > 0)
            {
                result.Success = false;
                result.ImportedRows = 0;
                var firstError = errorMessages.FirstOrDefault() ?? "Unknown error";
                result.Message = $"Validation Failed. {errorCount} errors found. No data inserted. First Error: {firstError}";
                
                try { File.AppendAllText("import_debug.log", $"{DateTime.Now}: Validation Failed. {errorCount} errors.{Environment.NewLine}"); } catch {}
            }
            else
            {
                // No errors but no data (maybe all empty rows?)
                result.Success = true;
                result.ImportedRows = 0;
                result.Message = "No valid data found to import.";
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

    private async Task<ImportResultDto> ImportSparePartMasterAsync(Stream fileStream, int createdBy)
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

            string GetValue(string colName, int rowIdx)
            {
                var colIndex = headerMap.ContainsKey(colName) ? headerMap[colName] : 
                               headerMap.FirstOrDefault(k => k.Key.Equals(colName, StringComparison.OrdinalIgnoreCase)).Value;
                
                if (colIndex == 0) return null;
                return worksheet.Cells[rowIdx, colIndex].Value?.ToString()?.Trim();
            }

            // ==========================================
            // PHASE 1: Validation
            // ==========================================
            var validRows = new List<Dictionary<string, object>>();
            // Track duplicates in file: Combination of Name + Group
            var fileDuplicateCheck = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

            // Fetch Lookups
            // ProductHSNID Lookup (HSNGroup -> ID) mapping to ProductHSNName in DB
            var hsnLookup = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            try
            {
                await EnsureConnectionOpenAsync();
                var hsnList = await _connection.QueryAsync<(int Id, string Name)>("SELECT ProductHSNID, ProductHSNName FROM ProductHSNMaster WHERE IsDeletedTransaction = 0");
                foreach (var hsn in hsnList)
                {
                    if (hsn.Name != null && !hsnLookup.ContainsKey(hsn.Name))
                        hsnLookup.Add(hsn.Name, hsn.Id);
                }
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.ErrorMessages.Add("Failed to fetch Product HSN Master data: " + ex.Message);
                return result;
            }

            // Fetch Existing Spare Parts for Duplicate Check (Name + Group + Type)
            var existingSpareParts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            try
            {
                var spList = await _connection.QueryAsync<(string Name, string Group, string Type)>("SELECT SparePartName, SparePartGroup, SparePartType FROM SparePartMaster WHERE IsDeletedTransaction = 0");
                foreach (var sp in spList)
                {
                    if (sp.Name != null && sp.Group != null) 
                        existingSpareParts.Add($"{sp.Name}|{sp.Group}|{sp.Type ?? ""}");
                }
            }
            catch (Exception ex)
            {
                result.Success = false;
                result.ErrorMessages.Add("Failed to fetch existing Spare Parts (Check if 'SparePartGroup' or 'SparePartType' columns exist): " + ex.Message);
                return result;
            }

            for (int row = 2; row <= worksheet.Dimension.Rows; row++)
            {
                bool rowHasError = false;
                // Check empty row
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

                var sparePartName = GetValue("SparePartName", row) ?? GetValue("Spare Part Name", row);
                var sparePartGroup = GetValue("SparePartGroup", row) ?? GetValue("Spare Part Group", row);
                var sparePartType = GetValue("SparePartType", row) ?? GetValue("Spare Part Type", row);
                var hsnCode = GetValue("HSNCode", row) ?? GetValue("HSN Code", row);
                var unit = GetValue("Unit", row);
                var rateStr = GetValue("Rate", row);
                
                // New Columns Mapping
                var hsnGroup = GetValue("HSNGroup", row) ?? GetValue("HSN Group", row);
                var supplierReference = GetValue("SupplierReference", row) ?? GetValue("Supplier Reference", row);
                var stockRefCode = GetValue("StockRefCode", row) ?? GetValue("Stock Ref Code", row);
                var poQtyStr = GetValue("PurchaseOrderQuantity", row) ?? GetValue("Purchase Order Quantity", row);

                // Safe parsing
                decimal rate = 0;
                if (!string.IsNullOrEmpty(rateStr) && decimal.TryParse(rateStr, out var r)) rate = r;
                
                decimal purchaseOrderQuantity = 0;
                if (!string.IsNullOrEmpty(poQtyStr) && decimal.TryParse(poQtyStr, out var poq)) purchaseOrderQuantity = poq;

                var rowErrors = new List<string>();

                // Required Fields Validation
                if (string.IsNullOrEmpty(sparePartName))
                    rowErrors.Add($"Row {row}: SparePartName is required.");
                
                if (string.IsNullOrEmpty(sparePartGroup))
                    rowErrors.Add($"Row {row}: SparePartGroup is required.");
                
                if (string.IsNullOrEmpty(hsnGroup)) // Changed from HSNCode to HSNGroup as requirement implies lookup by group
                    rowErrors.Add($"Row {row}: HSNGroup is required.");
                
                if (string.IsNullOrEmpty(unit))
                    rowErrors.Add($"Row {row}: Unit is required.");

                // Combination Duplicate Validation (Name + Group + Type)
                if (!string.IsNullOrEmpty(sparePartName) && !string.IsNullOrEmpty(sparePartGroup))
                {
                    string compositeKey = $"{sparePartName}|{sparePartGroup}|{sparePartType ?? ""}";

                    if (existingSpareParts.Contains(compositeKey))
                        rowErrors.Add($"Duplicate SparePartName + SparePartGroup + SparePartType '{sparePartName} - {sparePartGroup} - {sparePartType}' already exists in database.");
                    
                    if (fileDuplicateCheck.Contains(compositeKey))
                        rowErrors.Add($"Duplicate SparePartName + SparePartGroup + SparePartType '{sparePartName} - {sparePartGroup} - {sparePartType}' found in file.");
                    else
                        fileDuplicateCheck.Add(compositeKey);
                }

                // ProductHSNID Lookup using HSNGroup
                int productHSNID = 0;
                if (!string.IsNullOrEmpty(hsnGroup))
                {
                    if (hsnLookup.TryGetValue(hsnGroup, out int id))
                        productHSNID = id;
                    else
                        rowErrors.Add($"Row {row}: HSN Group '{hsnGroup}' not found in ProductHSNMaster.");
                }
                else
                {
                   // Fallback or just error if HSNGroup is strictly required for ID
                   // rowErrors.Add($"Row {row}: HSN Group is required to determine ProductHSNID.");
                }

                if (rowErrors.Any())
                {
                    rowHasError = true;
                    errorCount++;
                    errorMessages.AddRange(rowErrors);
                }
                else
                {
                    var validRow = new Dictionary<string, object>();
                    validRow["SparePartName"] = sparePartName;
                    validRow["SparePartGroup"] = sparePartGroup;
                    validRow["SparePartType"] = sparePartType;
                    validRow["Unit"] = unit;
                    validRow["ProductHSNID"] = productHSNID;
                    validRow["Rate"] = rate;
                    validRow["HSNGroup"] = hsnGroup;
                    validRow["SupplierReference"] = supplierReference;
                    validRow["StockRefCode"] = stockRefCode;
                    validRow["PurchaseOrderQuantity"] = purchaseOrderQuantity;
                    validRows.Add(validRow);
                }
            }

            if (errorCount > 0)
            {
                result.Success = false;
                result.ErrorRows = errorCount;
                result.ErrorMessages = errorMessages;
                result.Message = $"Validation Failed with {errorCount} errors. No data imported.";
                return result;
            }

             if (!validRows.Any())
            {
                result.Success = true;
                result.Message = "No valid data found to import.";
                return result;
            }

            // ==========================================
            // PHASE 2: Execution
            // ==========================================
            await EnsureConnectionOpenAsync();
            using var transaction = _connection.BeginTransaction();
            try
            {
                // Get Max Code
                int currentMaxCode = await _connection.ExecuteScalarAsync<int?>("SELECT MAX(MaxSparePartCode) FROM SparePartMaster WHERE IsDeletedTransaction = 0", transaction: transaction) ?? 0;

                string insertSql = @"
                    INSERT INTO SparePartMaster 
                    (SparePartName, SparePartCode, MaxSparePartCode, ProductHSNID, SparePartGroup, SparePartType, Unit, Rate, 
                     HSNGroup, SupplierReference, StockRefCode, PurchaseOrderQuantity,
                     VoucherPrefix, CompanyID, UserID,
                     VoucherDate, CreatedBy, CreatedDate, IsDeletedTransaction)
                    VALUES 
                    (@SparePartName, @SparePartCode, @MaxSparePartCode, @ProductHSNID, @SparePartGroup, @SparePartType, @Unit, @Rate, 
                     @HSNGroup, @SupplierReference, @StockRefCode, @PurchaseOrderQuantity,
                     @VoucherPrefix, @CompanyID, @UserID,
                     @VoucherDate, @CreatedBy, @CreatedDate, 0)";

                foreach (var row in validRows)
                {
                    currentMaxCode++;
                    string sparePartCode = "SPM" + currentMaxCode.ToString().PadLeft(5, '0');

                    await _connection.ExecuteAsync(insertSql, new {
                        SparePartName = row["SparePartName"],
                        SparePartCode = sparePartCode,
                        MaxSparePartCode = currentMaxCode,
                        ProductHSNID = row["ProductHSNID"],
                        SparePartGroup = row["SparePartGroup"],
                        SparePartType = row["SparePartType"],
                        Unit = row["Unit"],
                        Rate = row["Rate"],
                        HSNGroup = row["HSNGroup"],
                        SupplierReference = row["SupplierReference"],
                        StockRefCode = row["StockRefCode"],
                        PurchaseOrderQuantity = row["PurchaseOrderQuantity"],
                        VoucherPrefix = "SPM",
                        CompanyID = 2,
                        UserID = 2,
                        VoucherDate = DateTime.Now,
                        CreatedBy = createdBy,
                        CreatedDate = DateTime.Now
                    }, transaction: transaction);
                }

                transaction.Commit();
                result.Success = true;
                result.ImportedRows = validRows.Count;
                result.Message = $"Successfully imported {validRows.Count} Spare Parts.";
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                result.Success = false;
                 result.ErrorMessages.Add("Database Error: " + ex.Message);
                 result.Message = "Database error during import. Ensure columns 'SparePartGroup', 'SparePartType' and 'Unit' exist.";
            }

            return result;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.ErrorMessages.Add($"Critical Error: {ex.Message}");
            return result;
        }
    }

    private async Task EnsureConnectionOpenAsync()
    {
        if (_connection.State == System.Data.ConnectionState.Broken)
        {
            _connection.Close();
        }
        
        if (_connection.State != System.Data.ConnectionState.Open)
        {
             await _connection.OpenAsync();
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
