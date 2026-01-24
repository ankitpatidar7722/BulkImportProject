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
            result.Message = $"Import completed. Imported: {importedCount}, Duplicates: {duplicateCount}, Errors: {errorCount}";

            return result;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.ErrorMessages.Add($"Import failed: {ex.Message}");
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
        var parameters = string.Join(", ", data.Keys.Select(k => $"@{k}"));
        
        var query = $"INSERT INTO [{tableName}] ({columns}) VALUES ({parameters})";
        
        await _connection.ExecuteAsync(query, data);
    }
}
