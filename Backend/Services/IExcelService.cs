using Backend.DTOs;

namespace Backend.Services;

public interface IExcelService
{
    Task<ExcelPreviewDto> PreviewExcelAsync(Stream fileStream);
    Task<ImportResultDto> ImportExcelAsync(Stream fileStream, string tableName);
}
