using Backend.DTOs;
using Dapper;
using Microsoft.Data.SqlClient;
using System.Data;

namespace Backend.Services;

public class HSNService : IHSNService
{
    private readonly SqlConnection _connection;
    public HSNService(SqlConnection connection)
    {
        _connection = connection;
    }

    public async Task<List<HSNMasterDto>> GetHSNListAsync(int companyId)
    {
        await EnsureConnectionOpenAsync();
        
        string query = @"
            SELECT 
                PH.ProductHSNID,
                PH.ProductHSNName,
                PH.DisplayName,
                PH.HSNCode,
                PH.GSTTaxPercentage,
                PH.CGSTTaxPercentage,
                PH.SGSTTaxPercentage,
                PH.IGSTTaxPercentage,
                PH.ProductCategory,
                IG.ItemGroupName,
                PH.ItemGroupID,
                PH.CompanyID,
                PH.IsDeletedTransaction,
                PH.CreatedBy,
                PH.CreatedDate
            FROM ProductHSNMaster PH
            LEFT JOIN ItemGroupMaster IG ON PH.ItemGroupID = IG.ItemGroupID
            WHERE PH.CompanyID = @CompanyId AND PH.IsDeletedTransaction = 0";

        var result = await _connection.QueryAsync<HSNMasterDto>(query, new { CompanyId = companyId });
        return result.ToList();
    }

    public async Task<List<string>> GetItemGroupsAsync(int companyId)
    {
        await EnsureConnectionOpenAsync();
        var result = await _connection.QueryAsync<string>(
            "SELECT ItemGroupName FROM ItemGroupMaster WHERE IsDeletedTransaction = 0 AND CompanyID = @CompanyId ORDER BY ItemGroupName", new { CompanyId = companyId });
        return result.ToList();
    }

    public async Task<HSNValidationResultDto> ValidateHSNsAsync(List<HSNMasterDto> hsns)
    {
        var result = new HSNValidationResultDto();
        result.IsValid = true;
        result.Summary.TotalRows = hsns.Count;

        // Fetch existing DisplayNames for duplicate check
        await EnsureConnectionOpenAsync();
        var existingDisplayNames = await _connection.QueryAsync<string>(
            "SELECT DisplayName FROM ProductHSNMaster WHERE IsDeletedTransaction = 0 AND DisplayName IS NOT NULL AND DisplayName <> ''");
        
        var existingNamesSet = new HashSet<string>(existingDisplayNames);
        
        // Fetch valid Item Groups for Lookup Validation
        var existingItemGroups = await _connection.QueryAsync<(int Id, string Name)>(
            "SELECT ItemGroupID, ItemGroupName FROM ItemGroupMaster WHERE IsDeletedTransaction = 0");
        
        var itemGroupsMap = existingItemGroups
            .Where(x => !string.IsNullOrWhiteSpace(x.Name))
            .GroupBy(x => x.Name)
            .ToDictionary(g => g.Key, g => g.First().Id);

        // Required columns validation configuration
        // Group Name (ProductHSNName), Display Name, HSN Code, Product Type (ProductCategory), GST % (GSTTaxPercentage)
        var requiredColumns = new List<string> { "ProductHSNName", "DisplayName", "HSNCode", "ProductCategory", "GSTTaxPercentage" };

        for (int i = 0; i < hsns.Count; i++)
        {
            var hsn = hsns[i];
            var rowValidation = new HSNRowValidation { RowIndex = i, Data = hsn, RowStatus = ValidationStatus.Valid };
            
            bool hasMissing = false;
            bool hasDuplicate = false;
            bool hasHSNMismatch = false;
            bool hasHSNInvalidContent = false;
            
            // 1. Missing Fields Check
            foreach (var col in requiredColumns)
            {
                var value = GetPropertyValue(hsn, col)?.ToString();
                if (string.IsNullOrWhiteSpace(value))
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = col,
                        ValidationMessage = $"{col} is required",
                        Status = ValidationStatus.MissingData
                    });
                    rowValidation.RowStatus = ValidationStatus.MissingData;
                    hasMissing = true;
                }
            }

            // Conditional Validation: Item Group Name
            bool isRawMaterial = string.Equals(hsn.ProductCategory, "Raw Material", StringComparison.OrdinalIgnoreCase);
            
            if (isRawMaterial)
            {
                if (string.IsNullOrWhiteSpace(hsn.ItemGroupName))
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = "itemGroupName",
                        ValidationMessage = "Item Group Name is required for Raw Material",
                        Status = ValidationStatus.MissingData
                    });
                    if(rowValidation.RowStatus != ValidationStatus.MissingData) 
                        rowValidation.RowStatus = ValidationStatus.MissingData;
                    hasMissing = true;
                }
                else
                {
                     // Validate existence - exact match required
                     if (itemGroupsMap.TryGetValue(hsn.ItemGroupName, out int igId))
                    {
                        hsn.ItemGroupID = igId; // Auto-map ID
                        
                        // Debug log for verification
                        try { 
                            await System.IO.File.AppendAllTextAsync("debug_log.txt", 
                                $"[{DateTime.Now}] Row {i}: '{hsn.ItemGroupName}' matched to ID {igId}\n"); 
                        } catch {}
                    }
                    else
                    {
                        // Debug log for mismatch
                        try { 
                            var availableGroups = string.Join(", ", itemGroupsMap.Keys);
                            await System.IO.File.AppendAllTextAsync("debug_log.txt", 
                                $"[{DateTime.Now}] Row {i}: '{hsn.ItemGroupName}' NOT FOUND. Available: {availableGroups}\n"); 
                        } catch {}
                        
                        rowValidation.CellValidations.Add(new CellValidation
                        {
                            ColumnName = "itemGroupName",
                            ValidationMessage = "Item Group not found in Master",
                            Status = ValidationStatus.Mismatch
                        });
                        
                        if (rowValidation.RowStatus != ValidationStatus.Duplicate && rowValidation.RowStatus != ValidationStatus.MissingData)
                        {
                            rowValidation.RowStatus = ValidationStatus.Mismatch;
                        }
                        hasHSNMismatch = true;
                    }
                }
            }
            else
            {
                // If NOT Raw Material, keep Item Group Name empty. 
                // We enforce this by clearing it if present, so it doesn't get imported incorrectly?
                // Or just ignore it. Let's clear it to be safe and consistent with "Keep Item Group Name empty".
                if (!string.IsNullOrEmpty(hsn.ItemGroupName))
                {
                     hsn.ItemGroupName = null;
                     hsn.ItemGroupID = null;
                }
            }

            // 2. Duplicate Check (DisplayName unique)
            if (!string.IsNullOrWhiteSpace(hsn.DisplayName))
            {
                // Check in DB
                if (existingNamesSet.Contains(hsn.DisplayName))
                {
                    rowValidation.RowStatus = ValidationStatus.Duplicate;
                    rowValidation.ErrorMessage = "Duplicate DisplayName in Database";
                    hasDuplicate = true;
                }
                
                // Check in current batch (previous rows)
                if (hsns.Take(i).Any(x => string.Equals(x.DisplayName, hsn.DisplayName, StringComparison.Ordinal)))
                {
                    rowValidation.RowStatus = ValidationStatus.Duplicate;
                    rowValidation.ErrorMessage = "Duplicate DisplayName in File";
                    hasDuplicate = true;
                }
            }

            // 4. Invalid Content (Special Characters) - Check All String Fields
            bool hasInvalidContent = false;
            var stringProperties = typeof(HSNMasterDto)
                .GetProperties()
                .Where(p => p.PropertyType == typeof(string));

            foreach (var prop in stringProperties)
            {
                var val = prop.GetValue(hsn) as string;
                if (!string.IsNullOrEmpty(val) && (val.Contains('\'') || val.Contains('"')))
                {
                    // Convert PascalCase to camelCase for frontend compatibility
                    string camelCaseName = char.ToLowerInvariant(prop.Name[0]) + prop.Name.Substring(1);
                    
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = camelCaseName,
                        ValidationMessage = "Special characters (quotes) are not allowed.",
                        Status = ValidationStatus.InvalidContent
                    });
                    
                    if (rowValidation.RowStatus == ValidationStatus.Valid)
                        rowValidation.RowStatus = ValidationStatus.InvalidContent;

                    hasInvalidContent = true;
                    hasHSNInvalidContent = true;
                }
            }

            // Count each category independently — a single row can appear in multiple categories
            if (hasDuplicate)
                result.Summary.DuplicateCount++;
            if (hasMissing)
                result.Summary.MissingDataCount++;
            if (hasHSNMismatch)
                result.Summary.MismatchCount++;
            if (hasHSNInvalidContent)
                result.Summary.InvalidContentCount++;

            if (rowValidation.RowStatus != ValidationStatus.Valid)
            {
                result.IsValid = false;
            }

            result.Rows.Add(rowValidation);
        }

        result.Summary.ValidRows = result.Rows.Count(r => r.RowStatus == ValidationStatus.Valid);

        return result;
    }

    public async Task<ImportResultDto> ImportHSNsAsync(List<HSNMasterDto> hsns, int userId)
    {
        var result = new ImportResultDto();
        result.TotalRows = hsns.Count;
        await EnsureConnectionOpenAsync();

        string insertQuery = @"
            INSERT INTO ProductHSNMaster (
                ProductHSNName, HSNCode, UnderProductHSNID, GroupLevel, CompanyID,
                DisplayName, TariffNo, ProductCategory, GSTTaxPercentage,
                CGSTTaxPercentage, SGSTTaxPercentage, IGSTTaxPercentage,
                TallyProductHSNName, TallyGUID, ItemGroupID, UserID,
                ModifiedDate, CreatedBy, CreatedDate, ModifiedBy,
                DeletedBy, DeletedDate, IsDeletedTransaction, FYear
            ) VALUES (
                @ProductHSNName, @HSNCode, 0, 0, @CompanyID,
                @DisplayName, '', @ProductCategory, @GSTTaxPercentage,
                @CGSTTaxPercentage, @SGSTTaxPercentage, @IGSTTaxPercentage,
                '', 0, @ItemGroupID, @UserID,
                GETDATE(), @UserID, GETDATE(), @UserID,
                0, NULL, 0, '2025-2026'
            )";

        int imported = 0;

        // Row-by-row insert with per-row transaction
        for (int rowIndex = 0; rowIndex < hsns.Count; rowIndex++)
        {
            var hsn = hsns[rowIndex];
            using var transaction = _connection.BeginTransaction();

            try
            {
                if (hsn.CompanyID == 0) hsn.CompanyID = 2;

                await _connection.ExecuteAsync(insertQuery, new
                {
                    ProductHSNName = hsn.ProductHSNName,
                    HSNCode = hsn.HSNCode,
                    CompanyID = hsn.CompanyID,
                    DisplayName = hsn.DisplayName,
                    ProductCategory = hsn.ProductCategory,
                    GSTTaxPercentage = hsn.GSTTaxPercentage ?? 0,
                    CGSTTaxPercentage = hsn.CGSTTaxPercentage ?? 0,
                    SGSTTaxPercentage = hsn.SGSTTaxPercentage ?? 0,
                    IGSTTaxPercentage = hsn.IGSTTaxPercentage ?? 0,
                    ItemGroupID = hsn.ItemGroupID,
                    UserID = userId
                }, transaction);

                transaction.Commit();
                imported++;
            }
            catch (Exception ex)
            {
                transaction.Rollback();
                result.ErrorRows++;
                result.ErrorMessages.Add($"Row {rowIndex + 1} ({hsn.DisplayName}): {ex.Message}");
            }
        }

        result.ImportedRows = imported;
        if (result.ErrorRows > 0)
        {
            result.Success = imported > 0;
            result.Message = $"Imported {imported} of {hsns.Count} HSN record(s). {result.ErrorRows} row(s) failed.";
        }
        else
        {
            result.Success = true;
            result.Message = $"Successfully imported {imported} HSN records.";
        }

        return result;
    }

    public async Task<ImportResultDto> ClearHSNDataAsync(int companyId, string username, string password, string reason)
    {
        await EnsureConnectionOpenAsync();
        // Use async-compatible transaction handling if Dapper supports it fully, but ADO.NET transaction
        // implies the underlying connection must remain open.
        using var transaction = _connection.BeginTransaction(); 

        try
        {
            // 1. Authenticate User
            // Note: Password should be hashed in production. Here we assume plain text as per existing patterns or simple requirement.
            var user = await _connection.QueryFirstOrDefaultAsync<dynamic>(
                "SELECT UserID, Password FROM UserMaster WHERE UserName = @Username ",
                new { Username = username }, transaction: transaction);

            // Normalize passwords for comparison (treat null as empty string)
            string dbPassword = (user?.Password as string) ?? string.Empty;
            string inputPassword = password ?? string.Empty;

            if (user == null || dbPassword != inputPassword)
            {
                throw new UnauthorizedAccessException("Invalid credentials");
            }
            
            // 2. Audit Log (File based as DB structure is unknown)
            try 
            {
                // Appending to shared log file
                string logEntry = $"[{DateTime.Now}] User: {username}, Module: HSN Master, Action: Clear Data, Reason: {reason}{Environment.NewLine}";
                await System.IO.File.AppendAllTextAsync("audit_log.txt", logEntry);
            }
            catch {}

            // 3. Count rows before clearing
            var rowCount = await _connection.ExecuteScalarAsync<int>(
                "SELECT COUNT(*) FROM ProductHSNMaster", transaction: transaction);

            // 4. Clear Data
            await _connection.ExecuteAsync("DELETE FROM ProductHSNMaster", transaction: transaction);

            transaction.Commit();
            return new ImportResultDto { Success = true, Message = $"Successfully deleted {rowCount} rows from HSN Master.", ImportedRows = rowCount };
        }
        catch (Exception ex)
        {
             transaction.Rollback();
             // Log error
             try { await System.IO.File.AppendAllTextAsync("debug_log.txt", $"[{DateTime.Now}] Clear HSN Error: {ex.Message}\n"); } catch {}
             throw; // Controller will handle 500 or Unauthorized
        }
    }


    public async Task<ImportResultDto> SoftDeleteHSNAsync(int hsnId, int userId)
    {
         await EnsureConnectionOpenAsync();
         try
         {
             var result = await _connection.ExecuteAsync(
                 "UPDATE ProductHSNMaster SET IsDeletedTransaction = 1, DeletedBy = @UserId, DeletedDate = GETDATE() WHERE ProductHSNID = @Id",
                 new { Id = hsnId, UserId = userId });
             
             return new ImportResultDto { Success = true, Message = "Record deleted successfully." };
         }
         catch (Exception ex)
         {
             return new ImportResultDto { Success = false, Message = "Failed to delete: " + ex.Message };
         }
    }

    // Helpers
    private async Task EnsureConnectionOpenAsync()
    {
        if (_connection.State != ConnectionState.Open)
            await _connection.OpenAsync();
    }

    private object? GetPropertyValue(object obj, string propName)
    {
        return obj.GetType().GetProperty(propName)?.GetValue(obj, null);
    }

    private void UpdateSummary(ValidationSummary summary, ValidationStatus status)
    {
        switch (status)
        {
            case ValidationStatus.Valid: summary.ValidRows++; break;
            case ValidationStatus.Duplicate: summary.DuplicateCount++; break;
            case ValidationStatus.MissingData: summary.MissingDataCount++; break;
            case ValidationStatus.Mismatch: summary.MismatchCount++; break;
            case ValidationStatus.InvalidContent: summary.InvalidContentCount++; break;
        }
    }
}
