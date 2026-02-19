using Backend.DTOs;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Backend.Services;

public class SparePartService : ISparePartService
{
    private readonly SqlConnection _connection;

    public SparePartService(SqlConnection connection)
    {
        _connection = connection;
    }

    public async Task<List<SparePartMasterDto>> GetAllSparePartsAsync()
    {
        var query = @"
            SELECT 
                sp.SparePartID,
                sp.SparePartName,
                sp.SparePartGroup,
                sp.HSNGroup,
                sp.Unit,
                sp.Rate,
                sp.SparePartType,
                sp.MinimumStockQty,
                sp.PurchaseOrderQuantity,
                sp.StockRefCode,
                sp.SupplierReference,
                sp.Narration,
                CAST(ISNULL(sp.IsDeletedTransaction, 0) AS BIT) as IsDeletedTransaction
            FROM SparePartMaster sp
            WHERE (sp.IsDeletedTransaction IS NULL OR sp.IsDeletedTransaction = 0)
            ORDER BY sp.SparePartName";

        var spareParts = await _connection.QueryAsync<SparePartMasterDto>(query);
        return spareParts.ToList();
    }

    public async Task<bool> SoftDeleteSparePartAsync(int sparePartId)
    {
        var query = @"
            UPDATE SparePartMaster 
            SET IsDeletedTransaction = 1
            WHERE SparePartID = @SparePartId";

        var rowsAffected = await _connection.ExecuteAsync(query, new { SparePartId = sparePartId });
        return rowsAffected > 0;
    }

    public async Task<SparePartValidationResultDto> ValidateSparePartsAsync(List<SparePartMasterDto> spareParts)
    {
        var result = new SparePartValidationResultDto
        {
            Summary = new ValidationSummary
            {
                TotalRows = spareParts.Count
            }
        };

        // Get existing spare parts from database for duplicate check
        var existingSpareParts = await GetAllSparePartsAsync();

        // Get valid HSN Groups
        var validHSNGroups = await GetHSNGroupsAsync();
        var hsnGroupLookup = new HashSet<string>(
            validHSNGroups.Select(h => h.DisplayName.Trim()),
            StringComparer.OrdinalIgnoreCase
        );

        // Get valid Units
        var validUnits = await GetUnitsAsync();
        var unitLookup = new HashSet<string>(
            validUnits.Select(u => u.UnitSymbol.Trim()),
            StringComparer.OrdinalIgnoreCase
        );

        // Fixed SparePartType values
        var validSparePartTypes = new HashSet<string>(
            new[] { "Electronics", "Electrical", "Mechanical", "Others" },
            StringComparer.OrdinalIgnoreCase
        );

        // Required fields
        var requiredFields = new[] { "SparePartName", "SparePartGroup", "HSNGroup", "Unit", "SparePartType" };

        for (int i = 0; i < spareParts.Count; i++)
        {
            var sparePart = spareParts[i];
            var rowValidation = new SparePartRowValidation
            {
                RowIndex = i,
                Data = sparePart,
                RowStatus = ValidationStatus.Valid
            };

            // Track if row has validation issues
            bool hasMissingData = false;
            bool hasMismatch = false;
            bool hasInvalidContent = false;

            // 1. Check for missing data (BLUE)
            foreach (var field in requiredFields)
            {
                var value = GetPropertyValue(sparePart, field);
                if (string.IsNullOrWhiteSpace(value?.ToString()))
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

            // Check Rate field (numeric field)
            if (!sparePart.Rate.HasValue || sparePart.Rate.Value <= 0)
            {
                rowValidation.CellValidations.Add(new CellValidation
                {
                    ColumnName = "Rate",
                    ValidationMessage = "Rate is required and must be greater than 0",
                    Status = ValidationStatus.MissingData
                });

                if (rowValidation.RowStatus != ValidationStatus.Duplicate)
                    rowValidation.RowStatus = ValidationStatus.MissingData;

                hasMissingData = true;
            }

            // 2. Check for duplicates (RED)
            // Duplicate logic: SparePartName + SparePartGroup + SparePartType
            bool IsDuplicate(SparePartMasterDto a, SparePartMasterDto b)
            {
                var nameA = a.SparePartName?.Trim() ?? "";
                var groupA = a.SparePartGroup?.Trim() ?? "";
                var typeA = a.SparePartType?.Trim() ?? "";

                var nameB = b.SparePartName?.Trim() ?? "";
                var groupB = b.SparePartGroup?.Trim() ?? "";
                var typeB = b.SparePartType?.Trim() ?? "";

                return string.Equals(nameA, nameB, StringComparison.OrdinalIgnoreCase) &&
                       string.Equals(groupA, groupB, StringComparison.OrdinalIgnoreCase) &&
                       string.Equals(typeA, typeB, StringComparison.OrdinalIgnoreCase);
            }

            var isDuplicate = existingSpareParts.Any(e => IsDuplicate(e, sparePart));

            // Also check within the current batch
            var duplicateInBatch = spareParts.Take(i).Any(s => IsDuplicate(s, sparePart));

            if (isDuplicate || duplicateInBatch)
            {
                rowValidation.RowStatus = ValidationStatus.Duplicate;
                rowValidation.ErrorMessage = "Duplicate record found";
            }

            // 3. Check HSNGroup mismatch (YELLOW)
            if (!string.IsNullOrWhiteSpace(sparePart.HSNGroup))
            {
                // Exact match check
                var isValidHSNGroup = hsnGroupLookup.Contains(sparePart.HSNGroup.Trim());

                if (!isValidHSNGroup)
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = "HSNGroup",
                        ValidationMessage = "HSNGroup does not match ProductHSNMaster DisplayName",
                        Status = ValidationStatus.Mismatch
                    });

                    if (rowValidation.RowStatus == ValidationStatus.Valid)
                        rowValidation.RowStatus = ValidationStatus.Mismatch;

                    hasMismatch = true;
                }
            }

            // 4. Check Unit mismatch (YELLOW)
            if (!string.IsNullOrWhiteSpace(sparePart.Unit))
            {
                // Exact match check
                var isValidUnit = unitLookup.Contains(sparePart.Unit.Trim());

                if (!isValidUnit)
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = "Unit",
                        ValidationMessage = "Unit does not match UnitMaster UnitSymbol",
                        Status = ValidationStatus.Mismatch
                    });

                    if (rowValidation.RowStatus == ValidationStatus.Valid)
                        rowValidation.RowStatus = ValidationStatus.Mismatch;

                    hasMismatch = true;
                }
            }

            // 5. Check SparePartType mismatch (YELLOW)
            if (!string.IsNullOrWhiteSpace(sparePart.SparePartType))
            {
                var isValidType = validSparePartTypes.Contains(sparePart.SparePartType.Trim());

                if (!isValidType)
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = "SparePartType",
                        ValidationMessage = "SparePartType must be: Electronics, Electrical, Mechanical, or Others",
                        Status = ValidationStatus.Mismatch
                    });

                    if (rowValidation.RowStatus == ValidationStatus.Valid)
                        rowValidation.RowStatus = ValidationStatus.Mismatch;

                    hasMismatch = true;
                }
            }

            // 6. Check for Special Characters (InvalidContent)
            var stringProperties = typeof(SparePartMasterDto)
                .GetProperties()
                .Where(p => p.PropertyType == typeof(string) && p.Name != "Narration");

            foreach (var prop in stringProperties)
            {
                var val = prop.GetValue(sparePart) as string;
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

            // Count this row only once for each issue type
            if (rowValidation.RowStatus == ValidationStatus.Duplicate)
                result.Summary.DuplicateCount++;
            else if (hasMissingData)
                result.Summary.MissingDataCount++;
            else if (hasMismatch)
                result.Summary.MismatchCount++;
            else if (hasInvalidContent)
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

    public async Task<ImportResultDto> ImportSparePartsAsync(List<SparePartMasterDto> spareParts)
    {
        var result = new ImportResultDto();
        if (_connection.State != System.Data.ConnectionState.Open) await _connection.OpenAsync();
        
        // Fetch lookup data BEFORE starting transaction
        var hsnGroups = await GetHSNGroupsAsync();
        var hsnGroupMapping = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var hsn in hsnGroups)
        {
            if (!string.IsNullOrWhiteSpace(hsn.DisplayName) && !hsnGroupMapping.ContainsKey(hsn.DisplayName))
            {
                hsnGroupMapping[hsn.DisplayName.Trim()] = hsn.ProductHSNID;
            }
        }
        
        var transaction = await _connection.BeginTransactionAsync();

        try
        {
            // Get Max Spare Part Code
            var maxSparePartCode = await _connection.ExecuteScalarAsync<int?>(
                "SELECT MAX(MaxSparePartCode) FROM SparePartMaster WHERE IsDeletedTransaction = 0",
                transaction: transaction
            ) ?? 0;

            int successCount = 0;

            var insertSql = @"
                INSERT INTO SparePartMaster (
                    SparePartName, SparePartCode, MaxSparePartCode, ProductHSNID, 
                    SparePartGroup, SparePartType, HSNCode, Unit, Rate, HSNGroup,
                    SupplierReference, StockRefCode, PurchaseOrderQuantity,
                    MinimumStockQty, Narration,
                    VoucherPrefix, CompanyID, UserID,
                    VoucherDate, CreatedBy, CreatedDate, IsDeletedTransaction
                ) VALUES (
                    @SparePartName, @SparePartCode, @MaxSparePartCode, @ProductHSNID,
                    @SparePartGroup, @SparePartType, @Unit, @Rate, @HSNGroup,
                    @SupplierReference, @StockRefCode, @PurchaseOrderQuantity,
                    @MinimumStockQty, @Narration,
                    @VoucherPrefix, @CompanyID, @UserID,
                    @VoucherDate, @CreatedBy, @CreatedDate, 0
                )";

            foreach (var sparePart in spareParts)
            {
                maxSparePartCode++;
                string sparePartCode = $"SPM{maxSparePartCode.ToString().PadLeft(5, '0')}";

                // Lookup ProductHSNID
                int productHSNID = 0;
                if (!string.IsNullOrWhiteSpace(sparePart.HSNGroup) && 
                    hsnGroupMapping.TryGetValue(sparePart.HSNGroup.Trim(), out int hsnId))
                {
                    productHSNID = hsnId;
                }

                await _connection.ExecuteAsync(insertSql, new
                {
                    SparePartName = sparePart.SparePartName ?? (object)DBNull.Value,
                    SparePartCode = sparePartCode,
                    MaxSparePartCode = maxSparePartCode,
                    ProductHSNID = productHSNID,
                    SparePartGroup = sparePart.SparePartGroup ?? (object)DBNull.Value,
                    SparePartType = sparePart.SparePartType ?? (object)DBNull.Value,
                    Unit = sparePart.Unit ?? (object)DBNull.Value,
                    Rate = sparePart.Rate ?? (object)DBNull.Value,
                    HSNGroup = sparePart.HSNGroup ?? (object)DBNull.Value,
                    SupplierReference = sparePart.SupplierReference ?? (object)DBNull.Value,
                    StockRefCode = sparePart.StockRefCode ?? (object)DBNull.Value,
                    PurchaseOrderQuantity = sparePart.PurchaseOrderQuantity ?? (object)DBNull.Value,
                    MinimumStockQty = sparePart.MinimumStockQty ?? (object)DBNull.Value,
                    Narration = sparePart.Narration ?? (object)DBNull.Value,
                    VoucherPrefix = "SPM",
                    CompanyID = 2,
                    UserID = 2,
                    VoucherDate = DateTime.Now,
                    CreatedBy = 2,
                    CreatedDate = DateTime.Now
                }, transaction: transaction);

                successCount++;
            }

            await transaction.CommitAsync();

            result.Success = true;
            result.Message = $"Successfully imported {successCount} spare part(s)";
            result.ImportedRows = successCount;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            result.Success = false;
            result.Message = $"Import failed: {ex.Message}";
            try { System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] SparePartService Import Exception: {ex.Message}\nStack: {ex.StackTrace}\n"); } catch { }
        }

        return result;
    }

    public async Task<List<HSNGroupDto>> GetHSNGroupsAsync()
    {
        var query = @"
            SELECT ProductHSNID, DisplayName
            FROM ProductHSNMaster
            WHERE IsDeletedTransaction = 0 
            AND DisplayName IS NOT NULL 
            AND DisplayName <> ''
            AND ProductCategory = 'Spare Parts'
            ORDER BY DisplayName";

        var results = await _connection.QueryAsync<HSNGroupDto>(query);
        return results.ToList();
    }

    public async Task<List<UnitDto>> GetUnitsAsync()
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

    public async Task<int> ClearAllSparePartDataAsync(string username, string password, string reason)
    {
        if (_connection.State != System.Data.ConnectionState.Open) await _connection.OpenAsync();

        // 1. Validate Credentials
        var userCheckQuery = @"
            SELECT COUNT(1) 
            FROM UserMaster 
            WHERE UserName = @Username AND ISNULL(Password, '') = @Password";

        var isValidUser = await _connection.ExecuteScalarAsync<bool>(userCheckQuery, new { Username = username, Password = password });

        if (!isValidUser)
        {
            try { await System.IO.File.AppendAllTextAsync("debug_log.txt", $"[{DateTime.Now}] ClearAllSparePartData Failed: Invalid credentials for user '{username}'. Reason: {reason}\n"); } catch { }
            throw new UnauthorizedAccessException("Invalid username or password.");
        }

        // 2. Perform Transactional Delete
        int deletedCount = 0;
        var transaction = await _connection.BeginTransactionAsync();
        try
        {
            // Delete from Master
            var deleteMasterQuery = "Truncate Table  SparePartMaster";
            deletedCount = await _connection.ExecuteAsync(deleteMasterQuery, transaction: transaction);

            await transaction.CommitAsync();

            // 3. Log Audit
            try
            {
                var logMessage = $"[{DateTime.Now}] AUDIT: User '{username}' cleared {deletedCount} Spare Part records. Reason: {reason}\n";
                await System.IO.File.AppendAllTextAsync("debug_log.txt", logMessage);
            }
            catch { }

            return deletedCount;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            try { await System.IO.File.AppendAllTextAsync("debug_log.txt", $"[{DateTime.Now}] ClearAllSparePartData Exception: {ex.Message}\n"); } catch { }
            throw;
        }
    }

    private object? GetPropertyValue(object obj, string propertyName)
    {
        return obj.GetType().GetProperty(propertyName)?.GetValue(obj);
    }
}
