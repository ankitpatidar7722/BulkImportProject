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
                CAST(ISNULL(l.IsDeletedTransaction, 0) AS BIT) as IsDeletedTransaction,
                (SELECT TOP 1 FieldValue FROM LedgerMasterDetails WHERE LedgerID = l.LedgerID AND FieldName = 'GSTRegistrationType' AND (IsDeletedTransaction IS NULL OR IsDeletedTransaction = 0) AND FieldValue IS NOT NULL ORDER BY LedgerDetailsID DESC) as GSTRegistrationType,
                (SELECT TOP 1 FieldValue FROM LedgerMasterDetails WHERE LedgerID = l.LedgerID AND FieldName = 'RefCode' AND (IsDeletedTransaction IS NULL OR IsDeletedTransaction = 0) AND FieldValue IS NOT NULL ORDER BY LedgerDetailsID DESC) as RefCode,
                (SELECT TOP 1 CASE WHEN ISNUMERIC(FieldValue) = 1 THEN CAST(FieldValue AS INT) ELSE NULL END FROM LedgerMasterDetails WHERE LedgerID = l.LedgerID AND FieldName = 'CreditDays' AND (IsDeletedTransaction IS NULL OR IsDeletedTransaction = 0) AND FieldValue IS NOT NULL ORDER BY LedgerDetailsID DESC) as CreditDays,
                (SELECT TOP 1 FieldValue FROM LedgerMasterDetails WHERE LedgerID = l.LedgerID AND FieldName = 'CurrencyCode' AND (IsDeletedTransaction IS NULL OR IsDeletedTransaction = 0) AND FieldValue IS NOT NULL ORDER BY LedgerDetailsID DESC) as CurrencyCode,
                l.LegalName,
                l.MailingAddress,
                l.DateOfBirth,
                l.Designation,
                l.DepartmentID,
                dm.DepartmentName,
                l.RefClientID,
                client.LedgerName as ClientName
            FROM LedgerMaster l
            LEFT JOIN (
                SELECT LM.LedgerID, LM.LedgerName 
                FROM LedgerMaster AS LM 
                INNER JOIN LedgerGroupMaster AS LG ON LG.LedgerGroupID=LM.LedgerGroupID AND LG.CompanyID=LM.CompanyID 
                WHERE LG.LedgerGroupNameID=27 AND LM.DepartmentID=-50  And ISNULL(LM.IsDeletedTransaction, 0) <> 1 AND LM.CompanyID=2
            ) sr ON l.RefSalesRepresentativeID = sr.LedgerID
            LEFT JOIN DepartmentMaster dm ON l.DepartmentID = dm.DepartmentID
            LEFT JOIN LedgerMaster client ON l.RefClientID = client.LedgerID
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

        // Get Ledger Group Name to check for Supplier
        var ledgerGroupName = await _connection.ExecuteScalarAsync<string>(
            "SELECT LedgerGroupName FROM LedgerGroupMaster WHERE LedgerGroupID = @LedgerGroupId",
            new { LedgerGroupId = ledgerGroupId });
        
        bool isSupplier = ledgerGroupName?.ToLower().Contains("supplier") == true;
        bool isEmployee = ledgerGroupName?.ToLower().Contains("employee") == true;
        bool isConsignee = ledgerGroupName?.ToLower().Contains("consignee") == true;
        bool isVendor = ledgerGroupName?.ToLower().Contains("vendors") == true;
        bool isTransporter = ledgerGroupName?.ToLower().Contains("transporters") == true;

        // Get existing ledgers from database for duplicate check
        var existingLedgers = await GetLedgersByGroupAsync(ledgerGroupId);

        // Get valid Country/State combinations
        var validCountryStates = await GetCountryStatesAsync();

        // Get Valid Clients if needed
        var validClients = new List<ClientDto>();
        if (ledgers.Any(l => !string.IsNullOrWhiteSpace(l.ClientName)))
        {
            validClients = await GetClientsAsync();
        }

        // Required fields
        var requiredList = new List<string> { "LedgerName", "MailingName", "Address1", "Country", "State", "City", "MobileNo" };
        
        if (isEmployee)
        {
            requiredList.Add("DepartmentName");
            requiredList.Add("Designation");
            // GSTNo is not mandatory for employees
        }
        else
        {
            requiredList.Add("GSTNo");
        }

        if (isSupplier || isVendor)
        {
            requiredList.Add("CurrencyCode");
        }
        var requiredFields = requiredList.ToArray();

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

            // 2. Check for duplicates (RED)
            // Helper for composite comparison
            bool IsDuplicate(LedgerMasterDto a, LedgerMasterDto b)
            {
                var nameA = a.LedgerName?.Trim() ?? "";
                var addrA = a.Address1?.Trim() ?? "";
                
                var nameB = b.LedgerName?.Trim() ?? "";
                var addrB = b.Address1?.Trim() ?? "";

                if (isEmployee)
                {
                    // For Employees: LedgerName + Address1 + DepartmentName
                    var deptA = a.DepartmentName?.Trim() ?? "";
                    var deptB = b.DepartmentName?.Trim() ?? "";

                    return string.Equals(nameA, nameB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(addrA, addrB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(deptA, deptB, StringComparison.OrdinalIgnoreCase);
                }
                else if (isConsignee)
                {
                    // For Consignee: LedgerName + ClientName + Address1 + GSTNo
                    var gstA = a.GSTNo?.Trim() ?? "";
                    var gstB = b.GSTNo?.Trim() ?? "";

                    var clientA = a.ClientName?.Trim() ?? "";
                    var clientB = b.ClientName?.Trim() ?? "";

                    return string.Equals(nameA, nameB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(clientA, clientB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(addrA, addrB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(gstA, gstB, StringComparison.OrdinalIgnoreCase);
                }
                else
                {
                    // For Others: LedgerName + Address1 + GSTNo
                    var gstA = a.GSTNo?.Trim() ?? "";
                    var gstB = b.GSTNo?.Trim() ?? "";

                    return string.Equals(nameA, nameB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(addrA, addrB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(gstA, gstB, StringComparison.OrdinalIgnoreCase);
                }
            }

            var isDuplicate = existingLedgers.Any(e => IsDuplicate(e, ledger));

            // Also check within the current batch
            var duplicateInBatch = ledgers.Take(i).Any(l => IsDuplicate(l, ledger));

            if (isDuplicate || duplicateInBatch)
            {
                rowValidation.RowStatus = ValidationStatus.Duplicate;
                rowValidation.ErrorMessage = "Duplicate record found";
            }

             // 3. Check Country/State mismatch (YELLOW)
            if (!string.IsNullOrWhiteSpace(ledger.Country) && !string.IsNullOrWhiteSpace(ledger.State))
            {
                var isValidCountryState = validCountryStates.Any(cs =>
                    string.Equals(cs.Country, ledger.Country, StringComparison.Ordinal) &&
                    string.Equals(cs.State, ledger.State, StringComparison.Ordinal));

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

            // Check ClientName mismatch (Consignee)
            if (!string.IsNullOrWhiteSpace(ledger.ClientName))
            {
                var isValidClient = validClients.Any(c => string.Equals(c.LedgerName, ledger.ClientName, StringComparison.Ordinal));
                
                if (!isValidClient)
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = "ClientName",
                        ValidationMessage = "Client not found in system",
                        Status = ValidationStatus.Mismatch
                    });

                    if (rowValidation.RowStatus == ValidationStatus.Valid)
                         rowValidation.RowStatus = ValidationStatus.Mismatch;
                        
                    hasMismatch = true;
                }
            }

            // 4. Check for Special Characters (InvalidContent)
            bool hasInvalidContent = false;
            var stringProperties = typeof(LedgerMasterDto)
                .GetProperties()
                .Where(p => p.PropertyType == typeof(string) && p.Name != "LegalName" && p.Name != "MailingAddress");

            foreach (var prop in stringProperties)
            {
                var val = prop.GetValue(ledger) as string;
                if (!string.IsNullOrEmpty(val) && (val.Contains('\'') || val.Contains('\"') ))
                {
                     // Skip specific fields if necessary, currently checking all string fields
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

    public async Task<ImportResultDto> ImportLedgersAsync(List<LedgerMasterDto> ledgers, int ledgerGroupId)
    {
        var result = new ImportResultDto();
        if (_connection.State != System.Data.ConnectionState.Open) await _connection.OpenAsync();
        var transaction = await _connection.BeginTransactionAsync();

        try
        {
            // 1. Get Ledger Group Prefix and Name
            string prefix = "LGR";
            string ledgerType = "Suppliers"; // Default
            try 
            {
                var groupData = await _connection.QueryFirstOrDefaultAsync<dynamic>(
                    "SELECT LedgerGroupPrefix, LedgerGroupName FROM LedgerGroupMaster WHERE LedgerGroupID = @GID", 
                    new { GID = ledgerGroupId }, transaction: transaction);
                
                if (groupData != null)
                {
                    if (!string.IsNullOrEmpty(groupData.LedgerGroupPrefix)) prefix = groupData.LedgerGroupPrefix;
                    if (!string.IsNullOrEmpty(groupData.LedgerGroupName)) ledgerType = groupData.LedgerGroupName;
                }
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
            // Prepare Insert SQL for LedgerMaster (Full Columns)
            var insertMasterSql = @"
                INSERT INTO LedgerMaster (
                    LedgerCode, MaxLedgerNo, LedgerCodePrefix,
                    LedgerGroupID, LedgerName, MailingName, Address1, Address2, Address3,
                    Country, State, City, Pincode, TelephoneNo, Email, MobileNo, Website,
                    PANNo, GSTNo, RefSalesRepresentativeID, SupplyTypeCode, GSTApplicable,
                    Distance, DeliveredQtyTolerance, IsDeletedTransaction, CompanyID, UserID, FYear,
                    CreatedDate, CreatedBy, ISLedgerActive, LegalName, MailingAddress,
                    CurrencyCode, DepartmentID, LedgerRefCode, InventoryEffect, MaintainBillWise, IsTaxType,
                    LedgerType, DateOfBirth, Designation, RefClientID
                ) VALUES (
                    @LedgerCode, @MaxLedgerNo, @LedgerCodePrefix,
                    @LedgerGroupID, @LedgerName, @MailingName, @Address1, @Address2, @Address3,
                    @Country, @State, @City, @Pincode, @TelephoneNo, @Email, @MobileNo, @Website,
                    @PANNo, @GSTNo, @RefSalesRepresentativeID, @SupplyTypeCode, @GSTApplicable,
                    @Distance, @DeliveredQtyTolerance, 0, 2, 2, '2025-2026',
                    GETDATE(), 2, 1, @LegalName, @MailingAddress,
                    @CurrencyCode, @DepartmentID, @RefCode, 0, 0, 0,
                    @LedgerType, @DateOfBirth, @Designation, @RefClientID
                );
                SELECT CAST(SCOPE_IDENTITY() as int);";

            // Prepare Insert SQL for LedgerMasterDetails
            var insertDetailSql = @"
                INSERT INTO LedgerMasterDetails (
                    LedgerID, LedgerGroupID, CompanyID, UserID, FYear,
                    FieldName, FieldValue, ParentFieldName, ParentFieldValue,
                    CreatedDate, CreatedBy, ModifiedDate, ModifiedBy,
                    SequenceNo, FieldID
                ) VALUES (
                    @LedgerID, @LedgerGroupID, @CompanyID, @UserID, @FYear,
                    @FieldName, @FieldValue, @ParentFieldName, @ParentFieldValue,
                    GETDATE(), @CreatedBy, GETDATE(), @CreatedBy,
                    @SequenceNo, @FieldID
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
                        @"SELECT LM.LedgerID 
                          FROM LedgerMaster AS LM 
                          INNER JOIN LedgerGroupMaster AS LG ON LG.LedgerGroupID=LM.LedgerGroupID AND LG.CompanyID=LM.CompanyID 
                          WHERE LM.LedgerName = @Name 
                          AND LG.LedgerGroupNameID=27 
                          AND LM.DepartmentID=-50  
                          AND ISNULL(LM.IsDeletedTransaction, 0) <> 1 
                          AND LM.CompanyID=2",
                        new { Name = ledger.SalesRepresentative },
                        transaction: transaction
                    );
                }

                // Lookup Department ID if name is provided
                int? departmentId = null;
                if (!string.IsNullOrWhiteSpace(ledger.DepartmentName))
                {
                     departmentId = await _connection.ExecuteScalarAsync<int?>(
                        "SELECT DepartmentID FROM DepartmentMaster WHERE DepartmentName = @Name",
                        new { Name = ledger.DepartmentName },
                        transaction: transaction
                    );
                }

                // Lookup RefClientID for Consignee
                int? refClientId = null;
                if (ledgerType.ToLower().Contains("consignee") && !string.IsNullOrWhiteSpace(ledger.ClientName))
                {
                     refClientId = await _connection.ExecuteScalarAsync<int?>(
                        "SELECT LedgerID FROM LedgerMaster WHERE LedgerName = @Name AND (IsDeletedTransaction IS NULL OR IsDeletedTransaction = 0)",
                        new { Name = ledger.ClientName },
                        transaction: transaction
                     );
                }

                // Apply Defaults
                string supplyTypeCode = !string.IsNullOrWhiteSpace(ledger.SupplyTypeCode) ? ledger.SupplyTypeCode : "B2B";
                bool gstApplicable = ledger.GSTApplicable ?? true;
                string legalName = !string.IsNullOrWhiteSpace(ledger.MailingName) ? ledger.MailingName : (ledger.LedgerName ?? ""); // LegalName = MailingName
                
                // INSERT INTO LedgerMaster
                var ledgerIdObj = await _connection.ExecuteScalarAsync<object>(insertMasterSql, new
                {
                    LedgerCode = ledgerCode,
                    MaxLedgerNo = maxLedgerNo,
                    LedgerCodePrefix = prefix,
                    ledger.LedgerGroupID,
                    ledger.LedgerName,
                    MailingName = ledger.MailingName ?? ledger.LedgerName,
                    Address1 = ledger.Address1 ?? (object)DBNull.Value,
                    Address2 = ledger.Address2 ?? (object)DBNull.Value,
                    Address3 = ledger.Address3 ?? (object)DBNull.Value,
                    Country = ledger.Country ?? (object)DBNull.Value,
                    State = ledger.State ?? (object)DBNull.Value,
                    City = ledger.City ?? (object)DBNull.Value,
                    Pincode = ledger.Pincode ?? (object)DBNull.Value,
                    TelephoneNo = ledger.TelephoneNo ?? (object)DBNull.Value,
                    Email = ledger.Email ?? (object)DBNull.Value,
                    MobileNo = ledger.MobileNo ?? (object)DBNull.Value,
                    Website = ledger.Website ?? (object)DBNull.Value,
                    PANNo = ledger.PANNo ?? (object)DBNull.Value,
                    GSTNo = ledger.GSTNo ?? (object)DBNull.Value,
                    RefSalesRepresentativeID = salesRepId ?? (object)DBNull.Value,
                    SupplyTypeCode = supplyTypeCode,
                    GSTApplicable = gstApplicable,

                    Distance = ledger.Distance ?? (object)DBNull.Value,
                    DeliveredQtyTolerance = ledger.DeliveredQtyTolerance ?? (object)DBNull.Value,
                    LegalName = legalName, // Set LegalName
                    MailingAddress = ledger.MailingAddress ?? (object)DBNull.Value,
                    CurrencyCode = ledger.CurrencyCode ?? (object)DBNull.Value,
                    DepartmentID = departmentId ?? 0,
                    RefCode = ledger.RefCode ?? (object)DBNull.Value,
                    LedgerType = ledgerType,
                    DateOfBirth = ledger.DateOfBirth ?? (object)DBNull.Value,
                    Designation = ledger.Designation ?? (object)DBNull.Value,
                    RefClientID = refClientId ?? (object)DBNull.Value
                }, transaction: transaction);

                int newLedgerId = Convert.ToInt32(ledgerIdObj);

                // INSERT INTO LedgerMasterDetails (Explicit Sequence)
                var details = new List<(string Name, object? Value, int Seq)>();
                
                // Check if Employee
                bool isEmployee = ledgerType.ToLower().Contains("employee");

                if (isEmployee)
                {
                    details = new List<(string Name, object? Value, int Seq)>
                    {
                        ("LedgerName", ledger.LedgerName, 1),
                        ("MailingName", ledger.MailingName, 2),
                        ("Address1", ledger.Address1, 3),
                        ("Address2", ledger.Address2, 4),
                        ("Address3", ledger.Address3, 5),
                        ("Country", ledger.Country, 6),
                        ("State", ledger.State, 7),
                        ("City", ledger.City, 8),
                        ("Pincode", ledger.Pincode, 9),
                        ("MailingAddress", ledger.MailingAddress, 10),
                        ("DateOfBirth", ledger.DateOfBirth?.ToString("yyyy-MM-dd"), 11),
                        ("TelephoneNo", ledger.TelephoneNo, 12),
                        ("MobileNo", ledger.MobileNo, 13),
                        ("Email", ledger.Email, 14),
                        ("PANNo", ledger.PANNo, 15),
                        ("DepartmentID", departmentId?.ToString(), 16),
                        ("Designation", ledger.Designation, 17),
                        ("ISLedgerActive", "True", 0)
                    };
                }
                else
                {
                    // Default / Supplier / Client
                    details = new List<(string Name, object? Value, int Seq)>
                    {
                        ("LedgerName", ledger.LedgerName, 1),
                        ("MailingName", ledger.MailingName, 2),
                        ("Address1", ledger.Address1, 3),
                        ("Address2", ledger.Address2, 4),
                        ("Address3", ledger.Address3, 5),
                        ("Country", ledger.Country, 6),
                        ("State", ledger.State, 7),
                        ("City", ledger.City, 8),
                        ("Pincode", ledger.Pincode, 9),
                        ("MailingAddress", ledger.MailingAddress, 10),
                        ("TelephoneNo", ledger.TelephoneNo, 11),
                        ("MobileNo", ledger.MobileNo, 12),
                        ("Email", ledger.Email, 13),
                        ("Website", ledger.Website, 14),
                        ("PANNo", ledger.PANNo, 15),
                        ("GSTNo", ledger.GSTNo, 16),
                        ("CurrencyCode", ledger.CurrencyCode, 17),
                        ("GSTApplicable", gstApplicable.ToString(), 18),
                        ("LegalName", legalName, 19),
                        ("SupplyTypeCode", supplyTypeCode, 20),
                        ("RefCode", ledger.RefCode, 21),
                        ("DeliveredQtyTolerance", ledger.DeliveredQtyTolerance?.ToString(), 22),
                        ("ISLedgerActive", "True", 0)
                    };

                    if (refClientId.HasValue)
                    {
                        details.Add(("RefClientID", refClientId.Value, 23));
                    }
                }

                foreach (var item in details)
                {
                    await _connection.ExecuteAsync(insertDetailSql, new {
                        LedgerID = newLedgerId,
                        LedgerGroupID = ledgerGroupId,
                        CompanyID = 2,
                        UserID = 2,
                        FYear = "2025-2026",
                        FieldName = item.Name,
                        FieldValue = item.Value ?? (object)DBNull.Value,
                        ParentFieldName = item.Name,
                        ParentFieldValue = item.Value ?? (object)DBNull.Value,
                        CreatedBy = 2,
                        SequenceNo = item.Seq,
                        FieldID = 0
                    }, transaction: transaction);
                }

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
            try { System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] Service Import Exception: {ex.Message}\nStack: {ex.StackTrace}\n"); } catch {}
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

    public async Task<int> ClearAllLedgerDataAsync(int ledgerGroupId, string username, string password, string reason)
    {
        if (_connection.State != System.Data.ConnectionState.Open) await _connection.OpenAsync();
        
        // 1. Validate Credentials
        // Note: Assuming UserMaster table has UserName and Password columns. 
        // In a production environment, passwords should be hashed.
        var userCheckQuery = @"
            SELECT COUNT(1) 
            FROM UserMaster 
            WHERE UserName = @Username AND ISNULL(Password, '') = @Password";

        var isValidUser = await _connection.ExecuteScalarAsync<bool>(userCheckQuery, new { Username = username, Password = password });

        if (!isValidUser)
        {
            try { await System.IO.File.AppendAllTextAsync("debug_log.txt", $"[{DateTime.Now}] ClearAllLedgerData Failed: Invalid credentials for user '{username}'. Reason: {reason}\n"); } catch {}
            throw new UnauthorizedAccessException("Invalid username or password.");
        }

        // 2. Perform Transactional Delete
        int deletedCount = 0;
        var transaction = await _connection.BeginTransactionAsync();
        try
        {
            // Delete from Details first (FK constraint usually requires this)
            var deleteDetailsQuery = "DELETE FROM LedgerMasterDetails WHERE LedgerGroupID = @LedgerGroupId";
            await _connection.ExecuteAsync(deleteDetailsQuery, new { LedgerGroupId = ledgerGroupId }, transaction: transaction);

            // Delete from Master
            var deleteMasterQuery = "DELETE FROM LedgerMaster WHERE LedgerGroupID = @LedgerGroupId";
            deletedCount = await _connection.ExecuteAsync(deleteMasterQuery, new { LedgerGroupId = ledgerGroupId }, transaction: transaction);

            await transaction.CommitAsync();

            // 3. Log Audit
            try 
            { 
                var logMessage = $"[{DateTime.Now}] AUDIT: User '{username}' cleared {deletedCount} records for LedgerGroupID {ledgerGroupId}. Reason: {reason}\n";
                await System.IO.File.AppendAllTextAsync("debug_log.txt", logMessage); 
            } 
            catch {}

            return deletedCount;
        }

        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            try { await System.IO.File.AppendAllTextAsync("debug_log.txt", $"[{DateTime.Now}] ClearAllLedgerData Exception: {ex.Message}\n"); } catch {}
            throw;
        }
    }

    public async Task<List<ClientDto>> GetClientsAsync()
    {
        try
        {
            var query = @"
                SELECT LedgerID, LedgerName 
                FROM (
                    SELECT LedgerID, FieldName, NULLIF(FieldValue, '') as FieldValue 
                    FROM LedgerMasterDetails 
                    WHERE CompanyID = 2 
                    AND LedgerGroupID IN (
                        SELECT DISTINCT LedgerGroupID 
                        FROM LedgerGroupMaster 
                        WHERE LedgerGroupNameID = 24 AND CompanyID = 2
                    ) 
                    AND ISNULL(IsDeletedTransaction, 0) <> 1 
                ) x 
                PIVOT (
                    MAX(FieldValue) FOR FieldName IN ([LedgerName])
                ) p
                ORDER BY LedgerName";

            var results = await _connection.QueryAsync<ClientDto>(query);
            return results.ToList();
        }
        catch (Exception ex)
        {
             try { await System.IO.File.AppendAllTextAsync("debug_log.txt", $"[{DateTime.Now}] GetClientsAsync Error: {ex.Message}\nStack: {ex.StackTrace}\n"); } catch { }
             throw;
        }
    }

    public async Task<List<SalesRepresentativeDto>> GetSalesRepresentativesAsync()
    {
        var query = @"
            SELECT LM.[LedgerID] AS EmployeeID, LM.[LedgerName] AS EmployeeName 
            FROM LedgerMaster AS LM 
            INNER JOIN LedgerGroupMaster AS LG ON LG.LedgerGroupID=LM.LedgerGroupID AND LG.CompanyID=LM.CompanyID 
            Where LG.LedgerGroupNameID=27 AND LM.DepartmentID=-50  
            And ISNULL(LM.IsDeletedTransaction, 0) <> 1 AND LM.CompanyID=2 
            Order By LM.[LedgerName]";

        var results = await _connection.QueryAsync<SalesRepresentativeDto>(query);
        return results.ToList();
    }

    public async Task<List<DepartmentDto>> GetDepartmentsAsync()
    {
        try 
        {
            var query = @"
                SELECT DepartmentID, DepartmentName 
                FROM DepartmentMaster 
                ORDER BY DepartmentName";

            var results = await _connection.QueryAsync<DepartmentDto>(query);
            return results.ToList();
        }
        catch (Exception ex)
        {
             try { await System.IO.File.AppendAllTextAsync("debug_log.txt", $"[{DateTime.Now}] GetDepartmentsAsync Error: {ex.Message}\nStack: {ex.StackTrace}\n"); } catch { }
             throw;
        }
    }

    private object? GetPropertyValue(object obj, string propertyName)
    {
        return obj.GetType().GetProperty(propertyName)?.GetValue(obj);
    }
}


