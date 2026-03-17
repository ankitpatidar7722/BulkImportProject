using Backend.DTOs;

namespace Backend.Services;

public interface ICompanySubscriptionService
{
    Task<CompanySubscriptionListResponse> GetAllAsync();
    Task<CompanySubscriptionResponse> GetByKeyAsync(string companyUserID);
    Task<CompanySubscriptionResponse> CreateAsync(CompanySubscriptionSaveRequest request);
    Task<CompanySubscriptionResponse> UpdateAsync(CompanySubscriptionSaveRequest request);
    Task<CompanySubscriptionResponse> DeleteAsync(string companyUserID);
    Task<ServerListResponse> GetServersAsync();
    Task<SetupDatabaseResponse> SetupDatabaseAsync(SetupDatabaseRequest request);
}
