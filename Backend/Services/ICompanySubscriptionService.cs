using Backend.DTOs;

namespace Backend.Services;

public interface ICompanySubscriptionService
{
    Task<CompanySubscriptionListResponse> GetAllAsync();
    Task<CompanySubscriptionResponse> GetByKeyAsync(string companyUserID);
    Task<CompanySubscriptionResponse> CreateAsync(CompanySubscriptionSaveRequest request);
    Task<CompanySubscriptionResponse> UpdateAsync(CompanySubscriptionSaveRequest request);
    Task<CompanySubscriptionResponse> DeleteAsync(string companyUserID);
    Task<NextClientCodeResponse> GetNextClientCodeAsync();
    Task<ServerListResponse> GetServersAsync();
    Task<DynamicBackupDatabaseResponse> GetBackupDatabasesAsync(string applicationName);
    Task<SetupDatabaseResponse> SetupDatabaseAsync(SetupDatabaseRequest request);
    Task<CompanyMasterResponse> SaveCompanyMasterAsync(CompanyMasterRequest request);
    Task<BranchMasterResponse> SaveBranchMasterAsync(BranchMasterRequest request);
    Task<ProductionUnitResponse> SaveProductionUnitAsync(ProductionUnitRequest request);
    Task<CompleteSetupResponse> CompleteSetupAsync(CompleteSetupRequest request);
    Task<ModuleSettingsResponse> GetModuleSettingsAsync(GetModuleSettingsRequest request);
    Task<SaveModuleSettingsResponse> SaveModuleSettingsAsync(SaveModuleSettingsRequest request);
    Task<ClientDropdownResponse> GetClientDropdownAsync();
    Task<CopyModulesResponse> CopyModulesAsync(CopyModulesRequest request);
}
