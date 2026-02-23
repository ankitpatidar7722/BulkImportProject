using Backend.DTOs;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Backend.Services;

public class ToolService : IToolService
{
    private readonly SqlConnection _connection;

    public ToolService(SqlConnection connection)
    {
        _connection = connection;
    }

    public async Task<List<ToolMasterDto>> GetAllToolsAsync(int toolGroupId)
    {
        var query = @"
            SELECT
                t.ToolID,
                t.ToolName,
                t.ToolCode,
                t.ToolGroupID,
                tg.ToolGroupName,
                t.ToolType,
                t.ProductHSNID,
                hsn.DisplayName as ProductHSNName,
                hsn.HSNCode,
                t.SizeL,
                t.SizeW,
                t.SizeH,
                t.UpsL as UpsAround,
                t.UpsW as UpsAcross,
                t.TotalUps,
                t.PurchaseUnit,
                t.PurchaseRate,
                t.StockUnit,
                CAST(ISNULL(t.IsDeletedTransaction, 0) AS BIT) as IsDeletedTransaction
            FROM ToolMaster t
            LEFT JOIN ToolGroupMaster tg ON t.ToolGroupID = tg.ToolGroupID
            LEFT JOIN ProductHSNMaster hsn ON t.ProductHSNID = hsn.ProductHSNID
            WHERE t.ToolGroupID = @ToolGroupID
              AND (t.IsDeletedTransaction IS NULL OR t.IsDeletedTransaction = 0)
            ORDER BY t.ToolName";

        var tools = await _connection.QueryAsync<ToolMasterDto>(query, new { ToolGroupID = toolGroupId });

        // Deduplicate
        var toolsList = tools.GroupBy(t => t.ToolID).Select(g => g.First()).ToList();

        // Load ALL detail fields in a single batch query
        var toolIds = toolsList.Where(t => t.ToolID.HasValue).Select(t => t.ToolID!.Value).ToList();

        if (toolIds.Count > 0)
        {
            var allDetailsQuery = @"
                SELECT ToolID, FieldName, FieldValue
                FROM ToolMasterDetails
                WHERE ToolID IN @ToolIDs AND ISNULL(IsDeletedTransaction, 0) = 0";

            var allDetails = await _connection.QueryAsync<dynamic>(allDetailsQuery, new { ToolIDs = toolIds });

            var detailsByToolId = allDetails
                .GroupBy(d => (int)d.ToolID)
                .ToDictionary(g => g.Key, g => g.ToList());

            foreach (var tool in toolsList)
            {
                if (!tool.ToolID.HasValue || !detailsByToolId.TryGetValue(tool.ToolID.Value, out var details))
                    continue;

                foreach (var detail in details)
                {
                    string fieldName = detail.FieldName;
                    string fieldValue = detail.FieldValue;

                    switch (fieldName)
                    {
                        case "SizeL":
                            if (decimal.TryParse(fieldValue, out decimal sizeL)) tool.SizeL = sizeL;
                            break;
                        case "SizeW":
                            if (decimal.TryParse(fieldValue, out decimal sizeW)) tool.SizeW = sizeW;
                            break;
                        case "SizeH":
                            if (decimal.TryParse(fieldValue, out decimal sizeH)) tool.SizeH = sizeH;
                            break;
                        case "UpsAround":
                            if (int.TryParse(fieldValue, out int upsAround)) tool.UpsAround = upsAround;
                            break;
                        case "UpsAcross":
                            if (int.TryParse(fieldValue, out int upsAcross)) tool.UpsAcross = upsAcross;
                            break;
                        case "TotalUps":
                            if (int.TryParse(fieldValue, out int totalUps)) tool.TotalUps = totalUps;
                            break;
                        case "PurchaseUnit":
                            tool.PurchaseUnit = fieldValue;
                            break;
                        case "PurchaseRate":
                            if (decimal.TryParse(fieldValue, out decimal purchaseRate)) tool.PurchaseRate = purchaseRate;
                            break;
                        case "ManufecturerItemCode":
                            tool.ManufecturerItemCode = fieldValue;
                            break;
                        case "PurchaseOrderQuantity":
                            if (decimal.TryParse(fieldValue, out decimal poQty)) tool.PurchaseOrderQuantity = poQty;
                            break;
                        case "ShelfLife":
                            if (int.TryParse(fieldValue, out int shelfLife)) tool.ShelfLife = shelfLife;
                            break;
                        case "StockUnit":
                            tool.StockUnit = fieldValue;
                            break;
                        case "MinimumStockQty":
                            if (decimal.TryParse(fieldValue, out decimal minStock)) tool.MinimumStockQty = minStock;
                            break;
                        case "IsStandardItem":
                            if (bool.TryParse(fieldValue, out bool isStandard)) tool.IsStandardItem = isStandard;
                            break;
                        case "IsRegularItem":
                            if (bool.TryParse(fieldValue, out bool isRegular)) tool.IsRegularItem = isRegular;
                            break;
                        case "ProductHSNName":
                            // ProductHSNName in details stores the ID, actual name already mapped from JOIN
                            break;
                    }
                }
            }
        }

        return toolsList;
    }

    public async Task<bool> SoftDeleteToolAsync(int toolId)
    {
        var query = @"
            UPDATE ToolMaster
            SET IsDeletedTransaction = 1
            WHERE ToolID = @ToolId;

            UPDATE ToolMasterDetails
            SET IsDeletedTransaction = 1
            WHERE ToolID = @ToolId;";

        var rowsAffected = await _connection.ExecuteAsync(query, new { ToolId = toolId });
        return rowsAffected > 0;
    }

    public async Task<ToolValidationResultDto> ValidateToolsAsync(List<ToolMasterDto> tools, int toolGroupId)
    {
        var result = new ToolValidationResultDto
        {
            Summary = new ValidationSummary { TotalRows = tools.Count }
        };

        // Get existing tools from database for duplicate check
        var existingTools = await GetAllToolsAsync(toolGroupId);

        // Get valid HSN Groups (Tool category)
        var validHSNGroups = await GetToolHSNGroupsAsync();
        var hsnGroupLookup = new HashSet<string>(
            validHSNGroups.Select(h => h.DisplayName.Trim())
        );

        // Get valid Units
        var validUnits = await GetToolUnitsAsync();
        var unitLookup = new HashSet<string>(
            validUnits.Select(u => u.UnitSymbol.Trim())
        );

        // Required fields for PLATES (and default for all tool groups)
        string[] requiredFields = new[] {
            "SizeL", "SizeW", "PurchaseUnit", "PurchaseRate",
            "StockUnit", "ProductHSNName"
        };

        for (int i = 0; i < tools.Count; i++)
        {
            var tool = tools[i];
            var rowValidation = new ToolRowValidation
            {
                RowIndex = i,
                Data = tool,
                RowStatus = ValidationStatus.Valid
            };

            bool hasMissingData = false;
            bool hasMismatch = false;
            bool hasInvalidContent = false;

            // 1. Check for missing data (BLUE)
            foreach (var field in requiredFields)
            {
                if (tool.RawValues != null && tool.RawValues.ContainsKey(field))
                    continue;

                var value = GetPropertyValue(tool, field);
                bool isMissing = false;

                var numericFields = new[] { "SizeL", "SizeW", "SizeH", "PurchaseRate",
                    "PurchaseOrderQuantity", "MinimumStockQty", "ShelfLife" };

                if (numericFields.Contains(field))
                {
                    isMissing = value == null || string.IsNullOrWhiteSpace(value.ToString()) ||
                                Convert.ToDecimal(value) <= 0;
                }
                else
                {
                    isMissing = string.IsNullOrWhiteSpace(value?.ToString());
                }

                if (isMissing)
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = field,
                        ValidationMessage = $"{field} is required",
                        Status = ValidationStatus.MissingData
                    });

                    if (rowValidation.RowStatus != ValidationStatus.Duplicate)
                        rowValidation.RowStatus = ValidationStatus.MissingData;

                    hasMissingData = true;
                }
            }

            // 2. Check for duplicates (RED) - SizeL + SizeW + SizeH + ManufecturerItemCode
            bool IsDuplicate(ToolMasterDto a, ToolMasterDto b)
            {
                var sizeLa = a.SizeL?.ToString() ?? "";
                var sizeLb = b.SizeL?.ToString() ?? "";
                var sizeWa = a.SizeW?.ToString() ?? "";
                var sizeWb = b.SizeW?.ToString() ?? "";
                var sizeHa = a.SizeH?.ToString() ?? "";
                var sizeHb = b.SizeH?.ToString() ?? "";
                var micA = a.ManufecturerItemCode?.Trim() ?? "";
                var micB = b.ManufecturerItemCode?.Trim() ?? "";

                return string.Equals(sizeLa, sizeLb, StringComparison.OrdinalIgnoreCase) &&
                       string.Equals(sizeWa, sizeWb, StringComparison.OrdinalIgnoreCase) &&
                       string.Equals(sizeHa, sizeHb, StringComparison.OrdinalIgnoreCase) &&
                       string.Equals(micA, micB, StringComparison.OrdinalIgnoreCase);
            }

            var isDuplicate = existingTools.Any(e => IsDuplicate(e, tool));
            var duplicateInBatch = tools.Take(i).Any(s => IsDuplicate(s, tool));

            if (isDuplicate || duplicateInBatch)
            {
                rowValidation.RowStatus = ValidationStatus.Duplicate;
                rowValidation.ErrorMessage = "Duplicate record found";
            }

            // 3. Check ProductHSNName mismatch (YELLOW)
            if (!string.IsNullOrWhiteSpace(tool.ProductHSNName))
            {
                if (!hsnGroupLookup.Contains(tool.ProductHSNName.Trim()))
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = "ProductHSNName",
                        ValidationMessage = "ProductHSNName does not match ProductHSNMaster DisplayName (Tool category)",
                        Status = ValidationStatus.Mismatch
                    });

                    if (rowValidation.RowStatus == ValidationStatus.Valid)
                        rowValidation.RowStatus = ValidationStatus.Mismatch;

                    hasMismatch = true;
                }
            }

            // 4. Check Unit mismatches (YELLOW)
            var unitFields = new[] { "PurchaseUnit", "StockUnit" };
            foreach (var unitField in unitFields)
            {
                var unitValue = GetPropertyValue(tool, unitField)?.ToString();
                if (!string.IsNullOrWhiteSpace(unitValue))
                {
                    if (!unitLookup.Contains(unitValue.Trim()))
                    {
                        rowValidation.CellValidations.Add(new CellValidation
                        {
                            ColumnName = unitField,
                            ValidationMessage = $"{unitField} does not match UnitMaster UnitSymbol",
                            Status = ValidationStatus.Mismatch
                        });

                        if (rowValidation.RowStatus == ValidationStatus.Valid)
                            rowValidation.RowStatus = ValidationStatus.Mismatch;

                        hasMismatch = true;
                    }
                }
            }

            // 5. Check for Special Characters (InvalidContent)
            var stringProperties = typeof(ToolMasterDto)
                .GetProperties()
                .Where(p => p.PropertyType == typeof(string) &&
                           p.Name != "ToolName" && p.Name != "ToolCode");

            foreach (var prop in stringProperties)
            {
                var val = prop.GetValue(tool) as string;
                if (!string.IsNullOrEmpty(val) && (val.Contains('\'') || val.Contains('\"')))
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = prop.Name,
                        ValidationMessage = "Special characters are found in this row and column.",
                        Status = ValidationStatus.InvalidContent
                    });

                    if (rowValidation.RowStatus == ValidationStatus.Valid)
                        rowValidation.RowStatus = ValidationStatus.InvalidContent;

                    hasInvalidContent = true;
                }
            }

            // 6. Validate RawValues
            if (tool.RawValues != null && tool.RawValues.Count > 0)
            {
                foreach (var rawEntry in tool.RawValues)
                {
                    var rawFieldName = rawEntry.Key;
                    var rawValue = rawEntry.Value;

                    // Infer type from the DTO property type
                    string expectedType = "unknown";
                    var prop = typeof(ToolMasterDto).GetProperty(rawFieldName);
                    if (prop != null)
                    {
                        var underlyingType = Nullable.GetUnderlyingType(prop.PropertyType) ?? prop.PropertyType;
                        if (underlyingType == typeof(decimal) || underlyingType == typeof(double) || underlyingType == typeof(float))
                            expectedType = "decimal";
                        else if (underlyingType == typeof(int) || underlyingType == typeof(long))
                            expectedType = "integer";
                        else if (underlyingType == typeof(bool))
                            expectedType = "boolean";
                    }

                    string validationMsg = expectedType switch
                    {
                        "integer" or "int" => $"Invalid Content in {rawFieldName} — \"{rawValue}\" is not a valid Integer.",
                        "real" or "decimal" or "float" or "numeric" or "money" => $"Invalid Content in {rawFieldName} — \"{rawValue}\" is not a valid Number.",
                        "bit" or "boolean" => $"Invalid Content in {rawFieldName} — \"{rawValue}\" is not a valid True/False value.",
                        _ => $"Invalid Content in {rawFieldName} — \"{rawValue}\" is not a valid value."
                    };

                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = rawFieldName,
                        ValidationMessage = validationMsg,
                        Status = ValidationStatus.InvalidContent
                    });

                    if (rowValidation.RowStatus == ValidationStatus.Valid)
                        rowValidation.RowStatus = ValidationStatus.InvalidContent;

                    hasInvalidContent = true;
                }
            }

            // Count each category independently — a single row can appear in multiple categories
            if (rowValidation.RowStatus == ValidationStatus.Duplicate)
                result.Summary.DuplicateCount++;
            if (hasMissingData)
                result.Summary.MissingDataCount++;
            if (hasMismatch)
                result.Summary.MismatchCount++;
            if (hasInvalidContent)
                result.Summary.InvalidContentCount++;

            result.Rows.Add(rowValidation);
        }

        result.Summary.ValidRows = result.Rows.Count(r => r.RowStatus == ValidationStatus.Valid);
        result.IsValid = result.Summary.DuplicateCount == 0 &&
                        result.Summary.MissingDataCount == 0 &&
                        result.Summary.MismatchCount == 0 &&
                        result.Summary.InvalidContentCount == 0;

        return result;
    }

    public async Task<ImportResultDto> ImportToolsAsync(List<ToolMasterDto> tools, int toolGroupId)
    {
        var result = new ImportResultDto();
        if (_connection.State != System.Data.ConnectionState.Open) await _connection.OpenAsync();

        // Fetch lookup data BEFORE starting transaction
        var hsnGroups = await GetToolHSNGroupsAsync();
        var hsnGroupMapping = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var hsn in hsnGroups)
        {
            if (!string.IsNullOrWhiteSpace(hsn.DisplayName) && !hsnGroupMapping.ContainsKey(hsn.DisplayName))
                hsnGroupMapping[hsn.DisplayName.Trim()] = hsn.ProductHSNID;
        }

        // Get ToolGroup info
        var toolGroupQuery = @"
            SELECT ToolGroupID, ToolGroupName
            FROM ToolGroupMaster
            WHERE ToolGroupID = @ToolGroupID";

        var toolGroup = await _connection.QueryFirstOrDefaultAsync<ToolGroupDto>(toolGroupQuery, new { ToolGroupID = toolGroupId });

        if (toolGroup == null)
        {
            result.Success = false;
            result.Message = $"ToolGroup with ID {toolGroupId} not found.";
            return result;
        }

        // Get Max Tool No (outside transaction)
        var maxToolNo = await _connection.ExecuteScalarAsync<int?>(
            "SELECT MAX(MaxToolNo) FROM ToolMaster WHERE ToolGroupID = @ToolGroupID AND ISNULL(IsDeletedTransaction, 0) = 0",
            new { ToolGroupID = toolGroupId }
        ) ?? 0;

        int successCount = 0;
        result.TotalRows = tools.Count;

        var insertMasterSql = @"
            INSERT INTO ToolMaster (
                ToolName, ToolDescription, ToolCode, MaxToolNo, Prefix,
                ToolGroupID, ToolSubGroupID, ToolType, ProductHSNID, IsToolActive,
                SizeL, SizeW, SizeH, UpsL, UpsW, TotalUps,
                PurchaseUnit, PurchaseRate, EstimationUnit, EstimationRate,
                StockUnit,
                CompanyID, UserID, CreatedBy, CreatedDate, IsDeletedTransaction
            )
            OUTPUT INSERTED.ToolID
            VALUES (
                @ToolName, @ToolDescription, @ToolCode, @MaxToolNo, @Prefix,
                @ToolGroupID, 0, @ToolType, @ProductHSNID, 1,
                @SizeL, @SizeW, @SizeH, @UpsL, @UpsW, @TotalUps,
                @PurchaseUnit, @PurchaseRate, @EstimationUnit, @EstimationRate,
                @StockUnit,
                @CompanyID, @UserID, @CreatedBy, @CreatedDate, 0
            )";

        var insertDetailSql = @"
            INSERT INTO ToolMasterDetails (
                ParentToolID, ParentFieldName, ParentFieldValue, ToolID, FieldID,
                FieldName, FieldValue, SequenceNo, ToolGroupID,
                CompanyID, UserID, IsBlocked, IsLocked,
                CreatedBy, CreatedDate, ModifiedBy, ModifiedDate,
                IsActive, IsDeletedTransaction
            ) VALUES (
                0, @ParentFieldName, @ParentFieldValue, @ToolID, 0,
                @FieldName, @FieldValue, @SequenceNo, @ToolGroupID,
                2, 2, 0, 0,
                2, GETDATE(), 2, GETDATE(),
                0, 0
            )";

        // Derive prefix from ToolGroupName (first 2 chars uppercase, e.g. PLATES -> PL)
        string prefix = toolGroup.ToolGroupName?.Length >= 2
            ? toolGroup.ToolGroupName.Substring(0, 2).ToUpper()
            : "TL";

        // Row-by-row insert with per-row transaction
        for (int rowIndex = 0; rowIndex < tools.Count; rowIndex++)
        {
            var tool = tools[rowIndex];
            var transaction = await _connection.BeginTransactionAsync();

            try
            {
                maxToolNo++;
                string toolCode = $"{prefix}{maxToolNo.ToString().PadLeft(5, '0')}";

                string toolType = tool.ToolType ?? toolGroup.ToolGroupName;

                int? totalUps = tool.TotalUps;
                if (!totalUps.HasValue && tool.UpsAround.HasValue && tool.UpsAcross.HasValue)
                    totalUps = tool.UpsAround.Value * tool.UpsAcross.Value;

                int? shelfLife = tool.ShelfLife ?? 365;
                bool? isStandardItem = tool.IsStandardItem ?? true;
                bool? isRegularItem = tool.IsRegularItem ?? true;

                var nameParts = new List<string>();
                if (!string.IsNullOrEmpty(toolType)) nameParts.Add(toolType);
                if (tool.SizeL.HasValue) nameParts.Add($"{tool.SizeL}");
                if (tool.SizeW.HasValue) nameParts.Add($"x{tool.SizeW}");
                if (tool.SizeH.HasValue) nameParts.Add($"x{tool.SizeH}");
                string toolName = tool.ToolName ?? string.Join(" ", nameParts);

                int productHSNID = 0;
                if (!string.IsNullOrWhiteSpace(tool.ProductHSNName) &&
                    hsnGroupMapping.TryGetValue(tool.ProductHSNName.Trim(), out int hsnId))
                {
                    productHSNID = hsnId;
                }

                // INSERT INTO ToolMaster
                var toolIdObj = await _connection.ExecuteScalarAsync<object>(insertMasterSql, new
                {
                    ToolName = toolName ?? (object)DBNull.Value,
                    ToolDescription = toolName ?? (object)DBNull.Value,
                    ToolCode = toolCode,
                    MaxToolNo = maxToolNo,
                    Prefix = prefix,
                    ToolGroupID = toolGroupId,
                    ToolType = toolType ?? (object)DBNull.Value,
                    ProductHSNID = productHSNID > 0 ? productHSNID : (object)DBNull.Value,
                    SizeL = tool.SizeL ?? (object)DBNull.Value,
                    SizeW = tool.SizeW ?? (object)DBNull.Value,
                    SizeH = tool.SizeH ?? (object)DBNull.Value,
                    UpsL = tool.UpsAround ?? (object)DBNull.Value,
                    UpsW = tool.UpsAcross ?? (object)DBNull.Value,
                    TotalUps = totalUps ?? (object)DBNull.Value,
                    PurchaseUnit = tool.PurchaseUnit ?? (object)DBNull.Value,
                    PurchaseRate = tool.PurchaseRate ?? (object)DBNull.Value,
                    EstimationUnit = tool.PurchaseUnit ?? (object)DBNull.Value,
                    EstimationRate = tool.PurchaseRate ?? (object)DBNull.Value,
                    StockUnit = tool.StockUnit ?? (object)DBNull.Value,
                    CompanyID = 2,
                    UserID = 2,
                    CreatedBy = 2,
                    CreatedDate = DateTime.Now
                }, transaction: transaction);

                int newToolId = Convert.ToInt32(toolIdObj);

                // INSERT INTO ToolMasterDetails row-by-row
                int seq = 1;
                var detailFields = new List<(string FieldName, string FieldValue)>();

                if (tool.SizeL.HasValue) detailFields.Add(("SizeL", tool.SizeL.ToString()!));
                if (tool.SizeW.HasValue) detailFields.Add(("SizeW", tool.SizeW.ToString()!));
                if (tool.SizeH.HasValue) detailFields.Add(("SizeH", tool.SizeH.ToString()!));
                if (tool.UpsAround.HasValue) detailFields.Add(("UpsAround", tool.UpsAround.ToString()!));
                if (tool.UpsAcross.HasValue) detailFields.Add(("UpsAcross", tool.UpsAcross.ToString()!));
                if (totalUps.HasValue) detailFields.Add(("TotalUps", totalUps.ToString()!));
                if (!string.IsNullOrEmpty(tool.PurchaseUnit)) detailFields.Add(("PurchaseUnit", tool.PurchaseUnit));
                if (tool.PurchaseRate.HasValue) detailFields.Add(("PurchaseRate", tool.PurchaseRate.ToString()!));
                if (!string.IsNullOrEmpty(tool.ManufecturerItemCode)) detailFields.Add(("ManufecturerItemCode", tool.ManufecturerItemCode));
                if (tool.PurchaseOrderQuantity.HasValue) detailFields.Add(("PurchaseOrderQuantity", tool.PurchaseOrderQuantity.ToString()!));
                if (shelfLife.HasValue) detailFields.Add(("ShelfLife", shelfLife.ToString()!));
                if (!string.IsNullOrEmpty(tool.StockUnit)) detailFields.Add(("StockUnit", tool.StockUnit));
                if (tool.MinimumStockQty.HasValue) detailFields.Add(("MinimumStockQty", tool.MinimumStockQty.ToString()!));
                if (isStandardItem.HasValue) detailFields.Add(("IsStandardItem", isStandardItem.ToString()!));
                if (isRegularItem.HasValue) detailFields.Add(("IsRegularItem", isRegularItem.ToString()!));
                if (productHSNID > 0)
                {
                    detailFields.Add(("ProductHSNID", productHSNID.ToString()));
                    detailFields.Add(("ProductHSNName", productHSNID.ToString()));
                }
                if (!string.IsNullOrEmpty(toolType)) detailFields.Add(("ToolType", toolType));

                foreach (var field in detailFields)
                {
                    await _connection.ExecuteAsync(insertDetailSql, new
                    {
                        ParentFieldName = field.FieldName,
                        ParentFieldValue = field.FieldValue,
                        ToolID = newToolId,
                        FieldName = field.FieldName,
                        FieldValue = field.FieldValue,
                        SequenceNo = seq++,
                        ToolGroupID = toolGroupId
                    }, transaction: transaction);
                }

                await transaction.CommitAsync();
                successCount++;
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                maxToolNo--; // Revert the incremented number since this row failed
                result.ErrorRows++;
                result.ErrorMessages.Add($"Row {rowIndex + 1} ({tool.ToolName}): {ex.Message}");
                try { System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] Tool Row {rowIndex + 1} Failed: {ex.Message}\n"); } catch { }
            }
        }

        result.ImportedRows = successCount;
        if (result.ErrorRows > 0)
        {
            result.Success = successCount > 0;
            result.Message = $"Imported {successCount} of {tools.Count} tool(s). {result.ErrorRows} row(s) failed.";
        }
        else
        {
            result.Success = true;
            result.Message = $"Successfully imported {successCount} tool(s)";
        }

        return result;
    }

    public async Task<List<ToolGroupDto>> GetToolGroupsAsync()
    {
        var query = @"
            SELECT ToolGroupID, ToolGroupName
            FROM ToolGroupMaster
            WHERE ISNULL(IsDeletedTransaction, 0) = 0
            ORDER BY ToolGroupName";

        var results = await _connection.QueryAsync<ToolGroupDto>(query);
        return results.ToList();
    }

    public async Task<List<HSNGroupDto>> GetToolHSNGroupsAsync()
    {
        var query = @"
            SELECT ProductHSNID, DisplayName, HSNCode
            FROM ProductHSNMaster
            WHERE IsDeletedTransaction = 0
              AND ProductCategory = 'Tool'
              AND DisplayName IS NOT NULL
              AND DisplayName <> ''
            ORDER BY DisplayName";

        var results = await _connection.QueryAsync<HSNGroupDto>(query);
        return results.ToList();
    }

    public async Task<List<UnitDto>> GetToolUnitsAsync()
    {
        var query = @"
            SELECT UnitID, UnitSymbol
            FROM UnitMaster
            WHERE UnitSymbol IS NOT NULL
              AND UnitSymbol <> ''
            ORDER BY UnitSymbol";

        var results = await _connection.QueryAsync<UnitDto>(query);
        return results.ToList();
    }

    public async Task<int> ClearAllToolDataAsync(string username, string password, string reason, int toolGroupId)
    {
        if (_connection.State != System.Data.ConnectionState.Open) await _connection.OpenAsync();

        // Validate Credentials
        var userCheckQuery = @"
            SELECT COUNT(1)
            FROM UserMaster
            WHERE UserName = @Username AND ISNULL(Password, '') = @Password";

        var isValidUser = await _connection.ExecuteScalarAsync<bool>(userCheckQuery, new { Username = username, Password = password ?? string.Empty });

        if (!isValidUser)
        {
            try { await System.IO.File.AppendAllTextAsync("debug_log.txt", $"[{DateTime.Now}] ClearAllToolData Failed: Invalid credentials for user '{username}'. Reason: {reason}\n"); } catch { }
            throw new UnauthorizedAccessException("Invalid username or password.");
        }

        int deletedCount = 0;
        var transaction = await _connection.BeginTransactionAsync();
        try
        {
            // Delete from Details first
            var deleteDetailQuery = @"
                DELETE tmd
                FROM ToolMasterDetails tmd
                INNER JOIN ToolMaster tm ON tmd.ToolID = tm.ToolID
                WHERE tm.ToolGroupID = @ToolGroupID";

            await _connection.ExecuteAsync(deleteDetailQuery, new { ToolGroupID = toolGroupId }, transaction: transaction);

            // Delete from Master
            var deleteMasterQuery = "DELETE FROM ToolMaster WHERE ToolGroupID = @ToolGroupID";
            deletedCount = await _connection.ExecuteAsync(deleteMasterQuery, new { ToolGroupID = toolGroupId }, transaction: transaction);

            await transaction.CommitAsync();

            try
            {
                var logMessage = $"[{DateTime.Now}] AUDIT: User '{username}' cleared {deletedCount} Tool records for ToolGroupID {toolGroupId}. Reason: {reason}\n";
                await System.IO.File.AppendAllTextAsync("debug_log.txt", logMessage);
            }
            catch { }

            return deletedCount;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            try { await System.IO.File.AppendAllTextAsync("debug_log.txt", $"[{DateTime.Now}] ClearAllToolData Exception: {ex.Message}\n"); } catch { }
            throw;
        }
    }

    private object? GetPropertyValue(object obj, string propertyName)
    {
        return obj.GetType().GetProperty(propertyName)?.GetValue(obj);
    }
}
