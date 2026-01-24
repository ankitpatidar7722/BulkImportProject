using Backend.DTOs;
using Dapper;
using Microsoft.Data.SqlClient;

namespace Backend.Services;

public class CompanyService : ICompanyService
{
    private readonly SqlConnection _connection;

    public CompanyService(SqlConnection connection)
    {
        _connection = connection;
    }

    public async Task<CompanyDto> GetCompanyAsync()
    {
        // Get the latest active company record not marked as deleted
        // Get the latest active company record not marked as deleted
        var query = @"
            SELECT TOP 1 
                CompanyId, CompanyName, Address, Phone, Email, Website, GSTIN, IsActive,
                IsGstApplicable, IsEinvoiceApplicable, IsInternalApprovalRequired, 
                IsRequisitionApproval, IsPOApprovalRequired, IsInvoiceApprovalRequired, 
                IsGRNApprovalRequired, JobScheduleReleaseRequired, IsSalesOrderApprovalRequired, 
                IsJobReleaseFeatureRequired, ShowPlanUptoWastagePerc, ByPassCostApproval
            FROM CompanyMaster 
            WHERE IsDeletedTransaction = 0 
            ORDER BY CompanyId DESC";
            
        if (_connection.State != System.Data.ConnectionState.Open)
            await _connection.OpenAsync();
            
        var company = await _connection.QueryFirstOrDefaultAsync<CompanyDto>(query);
        
        // Return default if no company exists (or handle auto-creation)
        return company ?? new CompanyDto { CompanyName = "New Company" };
    }

    public async Task<bool> UpdateCompanyAsync(CompanyDto company)
    {
        var query = @"
            UPDATE CompanyMaster 
            SET CompanyName = @CompanyName,
                Address = @Address,
                Phone = @Phone,
                Email = @Email,
                Website = @Website,
                GSTIN = @GSTIN,
                IsActive = @IsActive,
                IsGstApplicable = @IsGstApplicable,
                IsEinvoiceApplicable = @IsEinvoiceApplicable,
                IsInternalApprovalRequired = @IsInternalApprovalRequired,
                IsRequisitionApproval = @IsRequisitionApproval,
                IsPOApprovalRequired = @IsPOApprovalRequired,
                IsInvoiceApprovalRequired = @IsInvoiceApprovalRequired,
                IsGRNApprovalRequired = @IsGRNApprovalRequired,
                JobScheduleReleaseRequired = @JobScheduleReleaseRequired,
                IsSalesOrderApprovalRequired = @IsSalesOrderApprovalRequired,
                IsJobReleaseFeatureRequired = @IsJobReleaseFeatureRequired,
                ShowPlanUptoWastagePerc = @ShowPlanUptoWastagePerc,
                ByPassCostApproval = @ByPassCostApproval
            WHERE CompanyId = @CompanyId";

        if (_connection.State != System.Data.ConnectionState.Open)
            await _connection.OpenAsync();
        var rows = await _connection.ExecuteAsync(query, company);
        return rows > 0;
    }
}
