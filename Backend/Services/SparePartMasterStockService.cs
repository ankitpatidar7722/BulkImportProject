using Backend.DTOs;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Backend.Services;

public class SparePartMasterStockService : ISparePartMasterStockService
{
    private readonly SqlConnection _connection;

    public SparePartMasterStockService(SqlConnection connection)
    {
        _connection = connection;
    }

    private async Task EnsureOpenAsync()
    {
        if (_connection.State != System.Data.ConnectionState.Open)
            await _connection.OpenAsync();
    }

    // ─── Warehouse List ─────────────────────────────────────────────────────────
    public async Task<List<WarehouseDto>> GetWarehousesAsync()
    {
        await EnsureOpenAsync();
        var result = await _connection.QueryAsync<WarehouseDto>(
            @"SELECT DISTINCT WarehouseName
              FROM WarehouseMaster
              WHERE ISNULL(IsDeletedTransaction, 0) = 0
              ORDER BY WarehouseName");
        return result.ToList();
    }

    // ─── Bins by Warehouse ──────────────────────────────────────────────────────
    public async Task<List<WarehouseDto>> GetBinsByWarehouseAsync(string warehouseName)
    {
        await EnsureOpenAsync();
        var result = await _connection.QueryAsync<WarehouseDto>(
            @"SELECT WarehouseID, WarehouseName, BinName
              FROM WarehouseMaster
              WHERE WarehouseName = @Name
                AND ISNULL(IsDeletedTransaction, 0) = 0
              ORDER BY BinName",
            new { Name = warehouseName });
        return result.ToList();
    }

    // ─── Enrich: validate SparePartNames, fill SpareID/BatchNo/StockUnit ────────
    public async Task<SparePartStockEnrichResult> EnrichStockRowsAsync(List<SparePartStockEnrichRowDto> rows)
    {
        await EnsureOpenAsync();

        var enrichResult = new SparePartStockEnrichResult();

        // Fetch all active spare parts
        var spareLookup = await _connection.QueryAsync<dynamic>(
            @"SELECT SparePartID, SparePartName, ISNULL(Unit, '') AS Unit, ISNULL(Rate, 0) AS Rate
              FROM SparePartMaster
              WHERE ISNULL(IsDeletedTransaction, 0) = 0");

        var byName = new Dictionary<string, dynamic>(StringComparer.OrdinalIgnoreCase);
        foreach (var spare in spareLookup)
        {
            string name = spare.SparePartName?.ToString() ?? "";
            if (!string.IsNullOrEmpty(name) && !byName.ContainsKey(name))
                byName[name] = spare;
        }

        var dateStr = DateTime.Now.ToString("dd-MM-yy");

        foreach (var row in rows)
        {
            var enriched = new SparePartStockEnrichedRow
            {
                SparePartName = row.SparePartName?.Trim(),
                ReceiptQuantity = row.ReceiptQuantity,
                PurchaseRate = row.PurchaseRate,
                WarehouseName = row.WarehouseName,
                BinName = row.BinName
            };

            if (string.IsNullOrWhiteSpace(row.SparePartName))
            {
                enriched.IsValid = false;
                enriched.Error = "SparePartName is empty";
                enrichResult.Rows.Add(enriched);
                continue;
            }

            if (!byName.TryGetValue(row.SparePartName.Trim(), out var matched))
            {
                enriched.IsValid = false;
                enriched.Error = "SparePartName not found";
                enrichResult.InvalidSparePartNames.Add(row.SparePartName.Trim());
                enrichResult.Rows.Add(enriched);
                continue;
            }

            enriched.SpareID = (int)matched.SparePartID;
            enriched.StockUnit = !string.IsNullOrWhiteSpace(row.StockUnit)
                ? row.StockUnit
                : matched.Unit?.ToString() ?? "";

            // Default PurchaseRate from master if not provided
            if (enriched.PurchaseRate <= 0)
            {
                enriched.PurchaseRate = (decimal)matched.Rate;
            }

            // Generate BatchNo: PHY_dd-MM-yy_SparePartName_SparePartID
            enriched.BatchNo = $"PHY_{dateStr}_{matched.SparePartName}_{matched.SparePartID}";
            enriched.IsValid = true;

            enrichResult.Rows.Add(enriched);
        }

        return enrichResult;
    }

    // ─── Import: final save to database ─────────────────────────────────────────
    public async Task<SparePartStockImportResult> ImportSparePartStockAsync(List<SparePartStockRowDto> rows)
    {
        var result = new SparePartStockImportResult { TotalRows = rows.Count };

        if (rows.Count == 0)
        {
            result.Message = "No rows to import.";
            return result;
        }

        try
        {
            await EnsureOpenAsync();

            // ─── 1. Fetch spare parts for SparePartID resolution ─────────────────
            var spareLookup = await _connection.QueryAsync<dynamic>(
                @"SELECT SparePartID, SparePartName, ISNULL(Unit, '') AS Unit, ISNULL(Rate, 0) AS Rate
                  FROM SparePartMaster
                  WHERE ISNULL(IsDeletedTransaction, 0) = 0");

            var byName = new Dictionary<string, dynamic>(StringComparer.OrdinalIgnoreCase);
            foreach (var spare in spareLookup)
            {
                string name = spare.SparePartName?.ToString() ?? "";
                if (!string.IsNullOrEmpty(name) && !byName.ContainsKey(name))
                    byName[name] = spare;
            }

            // ─── 2. Fetch warehouse lookup ──────────────────────────────────────
            var warehouseLookup = await _connection.QueryAsync<dynamic>(
                @"SELECT WarehouseID, WarehouseName, BinName
                  FROM WarehouseMaster
                  WHERE ISNULL(IsDeletedTransaction, 0) = 0");

            var whMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            foreach (var wh in warehouseLookup)
            {
                string key = $"{wh.WarehouseName}|{wh.BinName ?? ""}";
                if (!whMap.ContainsKey(key))
                    whMap[key] = (int)wh.WarehouseID;
            }

            // ─── 3. Validate and resolve each row ───────────────────────────────
            var validRows = new List<SparePartStockRowDto>();
            var dateStr = DateTime.Now.ToString("dd-MM-yy");

            for (int i = 0; i < rows.Count; i++)
            {
                var row = rows[i];
                row.RowIndex = i + 1;

                if (string.IsNullOrWhiteSpace(row.SparePartName))
                {
                    result.FailedRows++;
                    result.ErrorMessages.Add($"Row {row.RowIndex} → SparePartName is empty");
                    continue;
                }

                if (!byName.TryGetValue(row.SparePartName.Trim(), out var matched))
                {
                    result.FailedRows++;
                    result.ErrorMessages.Add($"Row {row.RowIndex} → SparePartName not found: {row.SparePartName}");
                    continue;
                }

                if (row.ReceiptQuantity <= 0)
                {
                    result.FailedRows++;
                    result.ErrorMessages.Add($"Row {row.RowIndex} → Invalid ReceiptQuantity ({row.ReceiptQuantity})");
                    continue;
                }

                row.SpareID = (int)matched.SparePartID;
                row.SpareGroupID = (int)matched.SparePartID; // SpareGroupID = SparePartID (legacy pattern)

                if (string.IsNullOrWhiteSpace(row.StockUnit))
                    row.StockUnit = matched.Unit?.ToString() ?? "";

                if (row.PurchaseRate < 0) row.PurchaseRate = 0;

                if (string.IsNullOrWhiteSpace(row.BatchNo))
                    row.BatchNo = $"PHY_{dateStr}_{matched.SparePartName}_{matched.SparePartID}";

                if (!string.IsNullOrWhiteSpace(row.WarehouseName))
                {
                    string whKey = $"{row.WarehouseName}|{row.BinName ?? ""}";
                    if (whMap.TryGetValue(whKey, out int whId))
                        row.WarehouseID = whId;
                }

                validRows.Add(row);
            }

            if (validRows.Count == 0)
            {
                result.Message = $"No valid rows to import. {result.FailedRows} row(s) failed.";
                return result;
            }

            // ─── 4. Generate Voucher Number ─────────────────────────────────────
            const string prefix = "PHY";
            const int voucherId = -118;
            const int companyId = 2;
            const int userId = 2;
            const string fYear = "2025-2026";

            var maxVoucherNo = await _connection.ExecuteScalarAsync<long?>(
                @"SELECT ISNULL(MAX(MaxVoucherNo), 0) FROM SpareTransactionMain
                  WHERE ISNULL(IsDeletedTransaction, 0) = 0
                    AND VoucherPrefix = @Prefix
                    AND VoucherID = @VoucherId
                    AND CompanyID = @CompanyId
                    AND FYear = @FYear",
                new { Prefix = prefix, VoucherId = voucherId, CompanyId = companyId, FYear = fYear }) ?? 0;

            maxVoucherNo++;
            var voucherNo = $"{prefix}{maxVoucherNo:00000}";

            // ─── 5. Calculate totals ────────────────────────────────────────────
            decimal totalQuantity = validRows.Sum(r => Math.Round(r.ReceiptQuantity, 2));

            // ─── 6. INSERT SpareTransactionMain ──────────────────────────────────
            var transactionId = await _connection.ExecuteScalarAsync<int>(
                @"INSERT INTO SpareTransactionMain
                    (TotalQuantity, Particular, Narration,
                     VoucherDate, CreatedDate, UserID, CompanyID, FYear, CreatedBy,
                     VoucherID, VoucherPrefix, MaxVoucherNo, VoucherNo)
                  VALUES
                    (@TotalQty, 'Stock Verification', '',
                     GETDATE(), GETDATE(), @UserId, @CompanyId, @FYear, @UserId,
                     @VoucherId, @Prefix, @MaxNo, @VoucherNo);
                  SELECT CAST(SCOPE_IDENTITY() AS INT);",
                new
                {
                    TotalQty = totalQuantity,
                    UserId = userId,
                    CompanyId = companyId,
                    FYear = fYear,
                    VoucherId = voucherId,
                    Prefix = prefix,
                    MaxNo = maxVoucherNo,
                    VoucherNo = voucherNo
                });

            // ─── 7. Bulk INSERT SpareTransactionDetail ───────────────────────────
            var detailTable = new System.Data.DataTable();
            detailTable.Columns.Add("TransID", typeof(int));
            detailTable.Columns.Add("SpareID", typeof(int));
            detailTable.Columns.Add("SpareGroupID", typeof(int));
            detailTable.Columns.Add("ReceiptQuantity", typeof(decimal));
            detailTable.Columns.Add("NewStockQuantity", typeof(decimal));
            detailTable.Columns.Add("OldStockQuantity", typeof(decimal));
            detailTable.Columns.Add("PurchaseRate", typeof(decimal));
            detailTable.Columns.Add("BatchNo", typeof(string));
            detailTable.Columns.Add("StockUnit", typeof(string));
            detailTable.Columns.Add("WarehouseID", typeof(int));
            detailTable.Columns.Add("TransactionID", typeof(int));
            detailTable.Columns.Add("ParentTransactionID", typeof(int));
            detailTable.Columns.Add("ModifiedDate", typeof(DateTime));
            detailTable.Columns.Add("CreatedDate", typeof(DateTime));
            detailTable.Columns.Add("UserID", typeof(int));
            detailTable.Columns.Add("CompanyID", typeof(int));
            detailTable.Columns.Add("FYear", typeof(string));
            detailTable.Columns.Add("CreatedBy", typeof(int));
            detailTable.Columns.Add("ModifiedBy", typeof(int));

            var now = DateTime.Now;
            for (int i = 0; i < validRows.Count; i++)
            {
                var r = validRows[i];
                var qty = Math.Round(r.ReceiptQuantity, 2);
                var rate = Math.Round(r.PurchaseRate, 2);

                detailTable.Rows.Add(
                    i + 1, r.SpareID, r.SpareGroupID,
                    qty, qty, qty, rate,
                    r.BatchNo ?? "", r.StockUnit ?? "", r.WarehouseID,
                    transactionId, transactionId,
                    now, now, userId, companyId, fYear, userId, userId
                );
            }

            using var bulkCopy = new SqlBulkCopy(_connection)
            {
                DestinationTableName = "SpareTransactionDetail",
                BatchSize = 1000,
                BulkCopyTimeout = 300
            };
            foreach (System.Data.DataColumn col in detailTable.Columns)
                bulkCopy.ColumnMappings.Add(col.ColumnName, col.ColumnName);

            await bulkCopy.WriteToServerAsync(detailTable);

            // ─── 8. Build result ───────────────────────────────────────────────
            // NOTE: No UPDATE_ITEM_STOCK_VALUES call for spare parts
            // NOTE: No ItemTransactionBatchDetail insert for spare parts
            result.Success = true;
            result.ImportedRows = validRows.Count;
            result.Message = result.FailedRows > 0
                ? $"Stock Upload Completed. {validRows.Count} imported, {result.FailedRows} failed."
                : $"Stock Upload Completed Successfully. {validRows.Count} row(s) imported.";
        }
        catch (Exception ex)
        {
            try { System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] SparePartStock Import Error: {ex.Message}\n{ex.StackTrace}\n"); } catch { }
            result.Success = false;
            result.Message = $"Stock import failed: {ex.Message}";
        }

        return result;
    }

    // ─── Validate: structured validation matching Import Master pattern ───────
    public async Task<SparePartStockValidationResult> ValidateStockRowsAsync(List<SparePartStockEnrichedRow> rows)
    {
        await EnsureOpenAsync();

        var validationResult = new SparePartStockValidationResult();
        validationResult.Summary.TotalRows = rows.Count;

        if (rows.Count == 0)
        {
            validationResult.IsValid = true;
            return validationResult;
        }

        // ─── 1. Fetch lookup data ────────────────────────────────────────────
        var spareLookup = await _connection.QueryAsync<dynamic>(
            @"SELECT SparePartID, SparePartName, ISNULL(Unit, '') AS Unit
              FROM SparePartMaster
              WHERE ISNULL(IsDeletedTransaction, 0) = 0");

        var validSpareNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var spare in spareLookup)
        {
            string name = spare.SparePartName?.ToString() ?? "";
            if (!string.IsNullOrEmpty(name))
                validSpareNames.Add(name);
        }

        // Fetch distinct warehouse names
        var warehouseNames = await _connection.QueryAsync<string>(
            @"SELECT DISTINCT WarehouseName
              FROM WarehouseMaster
              WHERE ISNULL(IsDeletedTransaction, 0) = 0");
        var validWarehouses = new HashSet<string>(warehouseNames, StringComparer.OrdinalIgnoreCase);

        // Fetch warehouse → bin mapping
        var warehouseBins = await _connection.QueryAsync<dynamic>(
            @"SELECT WarehouseName, BinName
              FROM WarehouseMaster
              WHERE ISNULL(IsDeletedTransaction, 0) = 0");
        var binsByWarehouse = new Dictionary<string, HashSet<string>>(StringComparer.OrdinalIgnoreCase);
        foreach (var wb in warehouseBins)
        {
            string wName = wb.WarehouseName?.ToString() ?? "";
            string bName = wb.BinName?.ToString() ?? "";
            if (!string.IsNullOrEmpty(wName))
            {
                if (!binsByWarehouse.ContainsKey(wName))
                    binsByWarehouse[wName] = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                if (!string.IsNullOrEmpty(bName))
                    binsByWarehouse[wName].Add(bName);
            }
        }

        // ─── 2. Duplicate detection by (SpareID, BatchNo, WarehouseName, BinName) ─
        var compositeKeyCounts = new Dictionary<string, List<int>>(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < rows.Count; i++)
        {
            var r = rows[i];
            var spareId = r.SpareID.ToString();
            var batchNo = r.BatchNo?.Trim() ?? "";
            var whName = r.WarehouseName?.Trim() ?? "";
            var binNm = r.BinName?.Trim() ?? "";
            var compositeKey = $"{spareId}|{batchNo}|{whName}|{binNm}";
            if (!compositeKeyCounts.ContainsKey(compositeKey))
                compositeKeyCounts[compositeKey] = new List<int>();
            compositeKeyCounts[compositeKey].Add(i);
        }
        var duplicateRowIndices = new HashSet<int>(
            compositeKeyCounts.Where(kv => kv.Value.Count > 1).SelectMany(kv => kv.Value.Skip(1)));

        // ─── 3. Per-row validation ───────────────────────────────────────────
        for (int i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            var rowValidation = new SparePartStockRowValidation { RowIndex = i };
            var cellIssues = new List<SparePartStockCellValidation>();

            var name = row.SparePartName?.Trim() ?? "";
            var isDuplicate = duplicateRowIndices.Contains(i);

            if (isDuplicate)
            {
                cellIssues.Add(new SparePartStockCellValidation
                {
                    ColumnName = "SparePartName",
                    Status = "Duplicate",
                    ValidationMessage = "Duplicate row: same SpareID, BatchNo, WarehouseName, BinName"
                });
            }

            // Missing: SparePartName
            if (string.IsNullOrEmpty(name))
            {
                cellIssues.Add(new SparePartStockCellValidation
                {
                    ColumnName = "SparePartName",
                    Status = "MissingData",
                    ValidationMessage = "SparePartName is required"
                });
            }
            else if (!validSpareNames.Contains(name))
            {
                cellIssues.Add(new SparePartStockCellValidation
                {
                    ColumnName = "SparePartName",
                    Status = "Mismatch",
                    ValidationMessage = $"SparePartName '{name}' not found in SparePartMaster"
                });
            }

            // Missing/Invalid: ReceiptQuantity
            if (row.ReceiptQuantity <= 0)
            {
                cellIssues.Add(new SparePartStockCellValidation
                {
                    ColumnName = "ReceiptQuantity",
                    Status = "MissingData",
                    ValidationMessage = "ReceiptQuantity must be greater than 0"
                });
            }

            // Missing: WarehouseName
            var whName = row.WarehouseName?.Trim() ?? "";
            if (string.IsNullOrEmpty(whName))
            {
                cellIssues.Add(new SparePartStockCellValidation
                {
                    ColumnName = "WarehouseName",
                    Status = "MissingData",
                    ValidationMessage = "WarehouseName is required"
                });
            }
            else if (!validWarehouses.Contains(whName))
            {
                cellIssues.Add(new SparePartStockCellValidation
                {
                    ColumnName = "WarehouseName",
                    Status = "Mismatch",
                    ValidationMessage = $"WarehouseName '{whName}' not found in WarehouseMaster"
                });
            }

            // Missing: BinName
            var binName = row.BinName?.Trim() ?? "";
            if (string.IsNullOrEmpty(binName))
            {
                cellIssues.Add(new SparePartStockCellValidation
                {
                    ColumnName = "BinName",
                    Status = "MissingData",
                    ValidationMessage = "BinName is required"
                });
            }
            else if (!string.IsNullOrEmpty(whName) && validWarehouses.Contains(whName))
            {
                if (!binsByWarehouse.ContainsKey(whName) || !binsByWarehouse[whName].Contains(binName))
                {
                    cellIssues.Add(new SparePartStockCellValidation
                    {
                        ColumnName = "BinName",
                        Status = "Mismatch",
                        ValidationMessage = $"BinName '{binName}' not found under Warehouse '{whName}'"
                    });
                }
            }

            // Set row status based on cell issues
            if (cellIssues.Count > 0)
            {
                rowValidation.CellValidations = cellIssues;

                bool hasDuplicate2 = cellIssues.Any(c => c.Status == "Duplicate");
                bool hasMissing = cellIssues.Any(c => c.Status == "MissingData");
                bool hasMismatch = cellIssues.Any(c => c.Status == "Mismatch");
                bool hasInvalid = cellIssues.Any(c => c.Status == "InvalidContent");

                if (hasDuplicate2) validationResult.Summary.DuplicateCount++;
                if (hasMissing) validationResult.Summary.MissingDataCount++;
                if (hasMismatch) validationResult.Summary.MismatchCount++;
                if (hasInvalid) validationResult.Summary.InvalidContentCount++;

                if (hasDuplicate2)
                    rowValidation.RowStatus = "Duplicate";
                else if (hasMissing)
                    rowValidation.RowStatus = "MissingData";
                else if (hasMismatch)
                    rowValidation.RowStatus = "Mismatch";
                else if (hasInvalid)
                    rowValidation.RowStatus = "InvalidContent";
            }
            else
            {
                rowValidation.RowStatus = "Valid";
                validationResult.Summary.ValidRows++;
            }

            validationResult.Rows.Add(rowValidation);
        }

        // ─── 4. Final summary ────────────────────────────────────────────────
        validationResult.IsValid = validationResult.Summary.DuplicateCount == 0
            && validationResult.Summary.MissingDataCount == 0
            && validationResult.Summary.MismatchCount == 0
            && validationResult.Summary.InvalidContentCount == 0;

        return validationResult;
    }

    // ─── Load Stock: fetch existing spare part stock data from DB ────────────
    // Returns actual batch-wise closing stock (ReceiptQuantity - IssueQuantity > 0)
    public async Task<List<SparePartStockEnrichedRow>> GetStockDataAsync()
    {
        await EnsureOpenAsync();

        var rows = await _connection.QueryAsync<SparePartStockEnrichedRow>(
            @"SELECT
                MAX(SPM.SparePartName) AS SparePartName,
                ISNULL(SPM.SparePartID, 0) AS SpareID,
                ROUND(
                    ISNULL(SUM(ISNULL(STD.ReceiptQuantity, 0)), 0)
                  - ISNULL(SUM(ISNULL(STD.IssueQuantity, 0)), 0), 2
                ) AS ReceiptQuantity,
                MAX(ISNULL(STD.PurchaseRate, 0)) AS PurchaseRate,
                MAX(NULLIF(STD.BatchNo, '')) AS BatchNo,
                MAX(NULLIF(SPM.Unit, '')) AS StockUnit,
                MAX(NULLIF(WM.WarehouseName, '')) AS WarehouseName,
                MAX(NULLIF(WM.BinName, '')) AS BinName,
                CAST(1 AS BIT) AS IsValid
              FROM SparePartMaster AS SPM
              INNER JOIN SpareTransactionDetail AS STD
                ON STD.SpareID = SPM.SparePartID
                AND STD.CompanyID = SPM.CompanyID
                AND ISNULL(STD.IsDeletedTransaction, 0) = 0
                AND (ISNULL(STD.ReceiptQuantity, 0) > 0 OR ISNULL(STD.IssueQuantity, 0) > 0)
              INNER JOIN SpareTransactionMain AS STM
                ON STM.TransactionID = STD.TransactionID
                AND STM.CompanyID = STD.CompanyID
                AND STM.VoucherID NOT IN (-8, -9, -11)
              INNER JOIN WarehouseMaster AS WM
                ON WM.WarehouseID = STD.WarehouseID
                AND WM.CompanyID = STD.CompanyID
              WHERE STD.CompanyID = 2
                AND ISNULL(SPM.IsDeletedTransaction, 0) = 0
              GROUP BY
                ISNULL(SPM.SparePartID, 0),
                ISNULL(STD.ParentTransactionID, 0),
                ISNULL(STD.WarehouseID, 0)
              HAVING ROUND(
                ISNULL(SUM(ISNULL(STD.ReceiptQuantity, 0)), 0)
              - ISNULL(SUM(ISNULL(STD.IssueQuantity, 0)), 0), 2) > 0
              ORDER BY ISNULL(STD.ParentTransactionID, 0)",
            commandTimeout: 120);

        return rows.ToList();
    }
}
