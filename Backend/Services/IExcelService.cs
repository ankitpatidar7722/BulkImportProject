using Backend.DTOs;

namespace Backend.Services;

public interface IExcelService
{
    Task<ExcelPreviewDto> PreviewExcelAsync(Stream fileStream);
    Task<ImportResultDto> ImportExcelAsync(Stream fileStream, string tableName);
    Task<List<LedgerGroupDto>> GetLedgerGroupsAsync();
    Task<List<MasterColumnDto>> GetMasterColumnsAsync(int ledgerGroupId);
    Task<ImportResultDto> ImportLedgerMasterWithValidationAsync(Stream fileStream, int ledgerGroupId);
    
    // Item Master import methods
    Task<List<ItemGroupDto>> GetItemGroupsAsync();
    Task<List<MasterColumnDto>> GetItemMasterColumnsAsync(int itemGroupId);
    Task<ImportResultDto> ImportItemMasterWithValidationAsync(Stream fileStream, int itemGroupId);
}
