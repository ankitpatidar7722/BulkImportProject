using Backend.DTOs;

namespace Backend.Services;

public interface ILedgerService
{
    Task<List<LedgerMasterDto>> GetLedgersByGroupAsync(int ledgerGroupId);
    Task<bool> SoftDeleteLedgerAsync(int ledgerId);
    Task<LedgerValidationResultDto> ValidateLedgersAsync(List<LedgerMasterDto> ledgers, int ledgerGroupId);
    Task<ImportResultDto> ImportLedgersAsync(List<LedgerMasterDto> ledgers, int ledgerGroupId);
    Task<List<CountryStateDto>> GetCountryStatesAsync();
}
