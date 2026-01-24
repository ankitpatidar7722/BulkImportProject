using System.Text.Json.Serialization;

namespace Backend.DTOs;

public class CompanyDto
{
    [JsonPropertyName("companyId")]
    public int CompanyId { get; set; }
    [JsonPropertyName("companyName")]
    public string CompanyName { get; set; } = string.Empty;
    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;
    [JsonPropertyName("phone")]
    public string Phone { get; set; } = string.Empty;
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;
    [JsonPropertyName("website")]
    public string Website { get; set; } = string.Empty;
    [JsonPropertyName("gstin")]
    public string GSTIN { get; set; } = string.Empty;
    [JsonPropertyName("isActive")]
    public bool IsActive { get; set; }
    [JsonPropertyName("isGstApplicable")]
    public bool IsGstApplicable { get; set; }
    [JsonPropertyName("isEinvoiceApplicable")]
    public bool IsEinvoiceApplicable { get; set; }
    [JsonPropertyName("isInternalApprovalRequired")]
    public bool IsInternalApprovalRequired { get; set; }
    [JsonPropertyName("isRequisitionApproval")]
    public bool IsRequisitionApproval { get; set; }
    [JsonPropertyName("isPOApprovalRequired")]
    public bool IsPOApprovalRequired { get; set; }
    [JsonPropertyName("isInvoiceApprovalRequired")]
    public bool IsInvoiceApprovalRequired { get; set; }
    [JsonPropertyName("isGRNApprovalRequired")]
    public bool IsGRNApprovalRequired { get; set; }
    [JsonPropertyName("jobScheduleReleaseRequired")]
    public bool JobScheduleReleaseRequired { get; set; }
    [JsonPropertyName("isSalesOrderApprovalRequired")]
    public bool IsSalesOrderApprovalRequired { get; set; }
    [JsonPropertyName("isJobReleaseFeatureRequired")]
    public bool IsJobReleaseFeatureRequired { get; set; }
    [JsonPropertyName("showPlanUptoWastagePerc")]
    public bool ShowPlanUptoWastagePerc { get; set; }
    [JsonPropertyName("byPassCostApproval")]
    public bool ByPassCostApproval { get; set; }
}
