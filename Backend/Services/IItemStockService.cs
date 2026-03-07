using Backend.DTOs;

namespace Backend.Services;

public interface IItemStockService
{
    Task<List<WarehouseDto>> GetWarehousesAsync();
    Task<List<WarehouseDto>> GetBinsByWarehouseAsync(string warehouseName);
    Task<ItemStockEnrichResult> EnrichStockRowsAsync(List<ItemStockEnrichRowDto> rows, int itemGroupId);
    Task<ItemStockImportResult> ImportItemStockAsync(List<ItemStockRowDto> rows, int itemGroupId);
    Task<ItemStockValidationResult> ValidateStockRowsAsync(List<ItemStockEnrichedRow> rows, int itemGroupId);
    Task<List<ItemStockEnrichedRow>> GetStockDataAsync(int itemGroupId);
    Task<ItemStockImportResult> ResetItemStockAsync(int itemGroupId);
    Task<ItemStockImportResult> ResetFloorStockAsync(int itemGroupId);
}
