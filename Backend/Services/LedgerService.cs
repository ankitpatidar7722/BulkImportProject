using Backend.DTOs;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Backend.Services;

public class LedgerService : ILedgerService
{
    private readonly SqlConnection _connection;

    public LedgerService(SqlConnection connection)
    {
        _connection = connection;
    }

    public async Task<List<LedgerMasterDto>> GetLedgersByGroupAsync(int ledgerGroupId)
    {
        var query = @"
            SELECT 
                l.LedgerID,
                l.LedgerGroupID,
                l.LedgerName,
                l.MailingName,
                l.Address1,
                l.Address2,
                l.Address3,
                l.Country,
                l.State,
                l.City,
                l.Pincode,
                l.TelephoneNo,
                l.Email,
                l.MobileNo,
                l.Website,
                l.PANNo,
                l.GSTNo,
                sr.LedgerName as SalesRepresentative,
                l.SupplyTypeCode,
                CAST(l.GSTApplicable AS BIT) as GSTApplicable,
                CASE WHEN ISNUMERIC(l.DeliveredQtyTolerance) = 1 THEN CAST(l.DeliveredQtyTolerance AS DECIMAL(18,2)) ELSE NULL END as DeliveredQtyTolerance,
                CAST(ISNULL(l.IsDeletedTransaction, 0) AS BIT) as IsDeletedTransaction
            FROM LedgerMaster l
            LEFT JOIN (
                SELECT LedgerID, LedgerName 
                FROM LedgerMaster 
                WHERE ISNULL(IsDeletedTransaction,0) <> 1
                AND LedgerGroupID IN (
                    SELECT DISTINCT LedgerGroupID 
                    FROM LedgerGroupMaster 
                    WHERE CompanyID = 2 AND LedgerGroupNameID = 27
                )
                AND LedgerID IN (
                    SELECT DISTINCT LedgerID 
                    FROM LedgerMasterDetails 
                    WHERE CompanyID = 2 
                    AND FieldName = 'Designation' 
                    AND FieldValue = 'JOB COORDINATOR' 
                    AND IsDeletedTransaction = 0
                )
            ) sr ON l.RefSalesRepresentativeID = sr.LedgerID
            WHERE l.LedgerGroupID = @LedgerGroupId 
            AND (l.IsDeletedTransaction IS NULL OR l.IsDeletedTransaction = 0)
            ORDER BY l.LedgerName";

        var ledgers = await _connection.QueryAsync<LedgerMasterDto>(query, new { LedgerGroupId = ledgerGroupId });
        return ledgers.ToList();
    }

    public async Task<bool> SoftDeleteLedgerAsync(int ledgerId)
    {
        var query = @"
            UPDATE LedgerMaster 
            SET IsDeletedTransaction = 1
            WHERE LedgerID = @LedgerId";

        var rowsAffected = await _connection.ExecuteAsync(query, new { LedgerId = ledgerId });
        return rowsAffected > 0;
    }

    public async Task<LedgerValidationResultDto> ValidateLedgersAsync(List<LedgerMasterDto> ledgers, int ledgerGroupId)
    {
        var result = new LedgerValidationResultDto
        {
            Summary = new ValidationSummary
            {
                TotalRows = ledgers.Count
            }
        };

        // Get existing ledgers from database for duplicate check
        var existingLedgers = await GetLedgersByGroupAsync(ledgerGroupId);

        // Get valid Country/State combinations
        var validCountryStates = await GetCountryStatesAsync();

        // Required fields
        var requiredFields = new[] { "LedgerName", "MailingName", "Address1", "Country", "State", "City", "MobileNo", "GSTNo" };

        for (int i = 0; i < ledgers.Count; i++)
        {
            var ledger = ledgers[i];
            var rowValidation = new LedgerRowValidation
            {
                RowIndex = i,
                Data = ledger,
                RowStatus = ValidationStatus.Valid
            };

            // Track if row has validation issues
            bool hasMissingData = false;
            bool hasMismatch = false;

            // 1. Check for missing data (BLUE)
            foreach (var field in requiredFields)
            {
                var value = GetPropertyValue(ledger, field);
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

            // 2. Check for duplicates (RED) - LedgerName + Address1 + GSTNo
            var isDuplicate = existingLedgers.Any(e =>
                string.Equals(e.LedgerName, ledger.LedgerName, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(e.Address1, ledger.Address1, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(e.GSTNo, ledger.GSTNo, StringComparison.OrdinalIgnoreCase));

            // Also check within the current batch
            var duplicateInBatch = ledgers.Take(i).Any(l =>
                string.Equals(l.LedgerName, ledger.LedgerName, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(l.Address1, ledger.Address1, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(l.GSTNo, ledger.GSTNo, StringComparison.OrdinalIgnoreCase));

            if (isDuplicate || duplicateInBatch)
            {
                rowValidation.RowStatus = ValidationStatus.Duplicate;
                rowValidation.ErrorMessage = "Duplicate record found";
            }

            // 3. Check Country/State mismatch (YELLOW)
            if (!string.IsNullOrWhiteSpace(ledger.Country) && !string.IsNullOrWhiteSpace(ledger.State))
            {
                var isValidCountryState = validCountryStates.Any(cs =>
                    string.Equals(cs.Country, ledger.Country, StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(cs.State, ledger.State, StringComparison.OrdinalIgnoreCase));

                if (!isValidCountryState)
                {
                    // Add validation for both Country and State columns individually
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = "Country",
                        ValidationMessage = "Invalid Country/State combination",
                        Status = ValidationStatus.Mismatch
                    });

                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = "State",
                        ValidationMessage = "Invalid Country/State combination",
                        Status = ValidationStatus.Mismatch
                    });

                    if (rowValidation.RowStatus == ValidationStatus.Valid)
                        rowValidation.RowStatus = ValidationStatus.Mismatch;

                    hasMismatch = true;
                }
            }

            // Count this row only once for each issue type
            if (rowValidation.RowStatus == ValidationStatus.Duplicate)
                result.Summary.DuplicateCount++;
            else if (hasMissingData)
                result.Summary.MissingDataCount++;
            else if (hasMismatch)
                result.Summary.MismatchCount++;

            result.Rows.Add(rowValidation);
        }

        result.Summary.ValidRows = result.Rows.Count(r => r.RowStatus == ValidationStatus.Valid);
        result.IsValid = result.Summary.DuplicateCount == 0 && 
                        result.Summary.MissingDataCount == 0 && 
                        result.Summary.MismatchCount == 0;

        return result;
    }

    public async Task<ImportResultDto> ImportLedgersAsync(List<LedgerMasterDto> ledgers, int ledgerGroupId)
    {
        var result = new ImportResultDto();
        if (_connection.State != System.Data.ConnectionState.Open) await _connection.OpenAsync();
        var transaction = await _connection.BeginTransactionAsync();

        try
        {
            // 1. Get Ledger Group Prefix
            string prefix = "LGR";
            try 
            {
                var groupPrefix = await _connection.ExecuteScalarAsync<string>(
                    "SELECT LedgerGroupPrefix FROM LedgerGroupMaster WHERE LedgerGroupID = @GID", 
                    new { GID = ledgerGroupId }, transaction: transaction);
                if (!string.IsNullOrEmpty(groupPrefix)) prefix = groupPrefix;
            }
            catch {}

            // 2. Get Max Ledger No
            var maxLedgerNo = await _connection.ExecuteScalarAsync<int?>(
                "SELECT MAX(MaxLedgerNo) FROM LedgerMaster WHERE LedgerGroupID = @GID AND IsDeletedTransaction = 0",
                new { GID = ledgerGroupId },
                transaction: transaction
            ) ?? 0;

            int successCount = 0;

            // Prepare Insert SQL for LedgerMaster (Full Columns)
            var insertMasterSql = @"
                INSERT INTO LedgerMaster (
                    LedgerCode, MaxLedgerNo, LedgerCodePrefix,
                    LedgerGroupID, LedgerName, MailingName, Address1, Address2, Address3,
                    Country, State, City, Pincode, TelephoneNo, Email, MobileNo, Website,
                    PANNo, GSTNo, RefSalesRepresentativeID, SupplyTypeCode, GSTApplicable,
                    DeliveredQtyTolerance, IsDeletedTransaction, CompanyID, UserID, FYear,
                    CreatedDate, CreatedBy, ISLedgerActive
                ) VALUES (
                    @LedgerCode, @MaxLedgerNo, @LedgerCodePrefix,
                    @LedgerGroupID, @LedgerName, @MailingName, @Address1, @Address2, @Address3,
                    @Country, @State, @City, @Pincode, @TelephoneNo, @Email, @MobileNo, @Website,
                    @PANNo, @GSTNo, @RefSalesRepresentativeID, @SupplyTypeCode, @GSTApplicable,
                    @DeliveredQtyTolerance, 0, 2, 2, '2025-2026',
                    GETDATE(), 2, 1
                );
                SELECT SCOPE_IDENTITY();";

            // Prepare Insert SQL for LedgerMasterDetails
            var insertDetailSql = @"
                INSERT INTO LedgerMasterDetails (
                    LedgerID, LedgerGroupID, CompanyID, UserID, FYear,
                    FieldName, FieldValue, ParentFieldName, ParentFieldValue,
                    CreatedDate, CreatedBy, ModifiedDate, ModifiedBy
                ) VALUES (
                    @LedgerID, @LedgerGroupID, @CompanyID, @UserID, @FYear,
                    @FieldName, @FieldValue, @ParentFieldName, @ParentFieldValue,
                    GETDATE(), @CreatedBy, GETDATE(), @CreatedBy
                )";

            foreach (var ledger in ledgers)
            {
                maxLedgerNo++;
                string ledgerCode = $"{prefix}{maxLedgerNo.ToString().PadLeft(5, '0')}";
                
                // Lookup SalesRepresentative ID if name is provided
                int? salesRepId = null;
                if (!string.IsNullOrWhiteSpace(ledger.SalesRepresentative))
                {
                    salesRepId = await _connection.ExecuteScalarAsync<int?>(
                        @"SELECT LedgerID 
                          FROM LedgerMaster 
                          WHERE LedgerName = @Name 
                          AND ISNULL(IsDeletedTransaction,0) <> 1
                          AND LedgerGroupID IN (
                              SELECT DISTINCT LedgerGroupID 
                              FROM LedgerGroupMaster 
                              WHERE CompanyID = 2 AND LedgerGroupNameID = 27
                          )
                          AND LedgerID IN (
                              SELECT DISTINCT LedgerID 
                              FROM LedgerMasterDetails 
                              WHERE CompanyID = 2 
                              AND FieldName = 'Designation' 
                              AND FieldValue = 'JOB COORDINATOR' 
                              AND IsDeletedTransaction = 0
                          )",
                        new { Name = ledger.SalesRepresentative },
                        transaction: transaction
                    );
                }
                
                // INSERT INTO LedgerMaster
                var ledgerIdObj = await _connection.ExecuteScalarAsync<object>(insertMasterSql, new
                {
                    LedgerCode = ledgerCode,
                    MaxLedgerNo = maxLedgerNo,
                    LedgerCodePrefix = prefix,
                    ledger.LedgerGroupID,
                    ledger.LedgerName,
                    ledger.MailingName,
                    ledger.Address1,
                    ledger.Address2,
                    ledger.Address3,
                    ledger.Country,
                    ledger.State,
                    ledger.City,
                    ledger.Pincode,
                    ledger.TelephoneNo,
                    ledger.Email,
                    ledger.MobileNo,
                    ledger.Website,
                    ledger.PANNo,
                    ledger.GSTNo,
                    RefSalesRepresentativeID = salesRepId,
                    ledger.SupplyTypeCode,
                    ledger.GSTApplicable,
                    ledger.DeliveredQtyTolerance
                }, transaction: transaction);

                int newLedgerId = Convert.ToInt32(ledgerIdObj);

                // INSERT INTO LedgerMasterDetails (Reflection)
                var properties = typeof(LedgerMasterDto).GetProperties();
                foreach (var prop in properties)
                {
                    // Skip system fields in details if needed, or include all
                    if (prop.Name == "LedgerID" || prop.Name == "LedgerGroupID" || prop.Name == "IsDeletedTransaction") continue;

                    var val = prop.GetValue(ledger)?.ToString();
                    
                    // Always insert, even if null/empty (as DBNull or empty string), matching loosely with ExcelService logic
                    // which inserted all mapped keys.
                    
                    await _connection.ExecuteAsync(insertDetailSql, new {
                        LedgerID = newLedgerId,
                        LedgerGroupID = ledgerGroupId,
                        CompanyID = 2,
                        UserID = 2,
                        FYear = "2025-2026",
                        FieldName = prop.Name,
                        FieldValue = val ?? (object)DBNull.Value,
                        ParentFieldName = prop.Name,
                        ParentFieldValue = val ?? (object)DBNull.Value,
                        CreatedBy = 2
                    }, transaction: transaction);
                }

                // Explicit ISLedgerActive for Details
                await _connection.ExecuteAsync(insertDetailSql, new {
                    LedgerID = newLedgerId,
                    LedgerGroupID = ledgerGroupId,
                    CompanyID = 2,
                    UserID = 2,
                    FYear = "2025-2026",
                    FieldName = "ISLedgerActive",
                    FieldValue = "True",
                    ParentFieldName = "ISLedgerActive",
                    ParentFieldValue = "True",
                    CreatedBy = 2
                }, transaction: transaction);

                successCount++;
            }

            await transaction.CommitAsync();

            result.Success = true;
            result.Message = $"Successfully imported {successCount} ledger(s)";
            result.ImportedRows = successCount;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            result.Success = false;
            result.Message = $"Import failed: {ex.Message}";
        }

        return result;
    }

    public async Task<List<CountryStateDto>> GetCountryStatesAsync()
    {
        var query = @"
            SELECT DISTINCT Country, State
            FROM CountryStateMaster
            WHERE Country IS NOT NULL AND State IS NOT NULL
            ORDER BY Country, State";

        var results = await _connection.QueryAsync<CountryStateDto>(query);
        return results.ToList();
    }

    private object? GetPropertyValue(object obj, string propertyName)
    {
        return obj.GetType().GetProperty(propertyName)?.GetValue(obj);
    }
}
