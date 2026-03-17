namespace Backend.DTOs;

public class CompanySubscriptionDto
{
    public string CompanyUserID { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string? Conn_String { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? ApiCompanyUserName { get; set; }
    public string? ApiCompanyPassword { get; set; }
    public string? ApplicationName { get; set; }
    public string? ApplicationVersion { get; set; }
    public string? DataBaseLocation { get; set; }
    public DateTime? LastLoginDateTime { get; set; }
    public bool? IsActive { get; set; }
    public string? Country { get; set; }
    public string? State { get; set; }
    public string? City { get; set; }
    public string? ApplicationBaseURL { get; set; }
    public string? CompanyCode { get; set; }
    public string? CompanyUniqueCode { get; set; }
    public int? MaxCompanyUniqueCode { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? FYear { get; set; }
    public DateTime? PaymentDueDate { get; set; }
    public string? SubscriptionStatus { get; set; }
    public string? StatusDescription { get; set; }
    public string? SubscriptionStatusMessage { get; set; }
    public long? LoginAllowed { get; set; }
    public string? GSTIN { get; set; }
    public string? LatestVersion { get; set; }
    public long? LoginAllowedOldVersion { get; set; }
    public string? OldVersion { get; set; }
    public string? Email { get; set; }
    public string? Mobile { get; set; }
    public string? Address { get; set; }
}

public class CompanySubscriptionListResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<CompanySubscriptionDto> Data { get; set; } = new();
}

public class CompanySubscriptionResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public CompanySubscriptionDto? Data { get; set; }
}

public class CompanySubscriptionSaveRequest
{
    public string CompanyUserID { get; set; } = string.Empty;
    public string? OriginalCompanyUserID { get; set; }
    public string Password { get; set; } = string.Empty;
    public string? Conn_String { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public string? ApplicationName { get; set; }
    public string? ApplicationVersion { get; set; }
    public string? SubscriptionStatus { get; set; }
    public string? StatusDescription { get; set; }
    public string? SubscriptionStatusMessage { get; set; }
    public string? Address { get; set; }
    public string? Country { get; set; }
    public string? State { get; set; }
    public string? City { get; set; }
    public string? CompanyCode { get; set; }
    public string? CompanyUniqueCode { get; set; }
    public string? GSTIN { get; set; }
    public string? Email { get; set; }
    public string? Mobile { get; set; }
    public long? LoginAllowed { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public DateTime? PaymentDueDate { get; set; }
    public string? FYear { get; set; }
}

public class SetupDatabaseRequest
{
    public string Server { get; set; } = string.Empty;
    public string ApplicationName { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = string.Empty;
}

public class SetupDatabaseResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string ConnectionString { get; set; } = string.Empty;
    public string DatabaseName { get; set; } = string.Empty;
    public string Server { get; set; } = string.Empty;
    public string ApplicationName { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
}

public class ServerListResponse
{
    public bool Success { get; set; }
    public List<string> Servers { get; set; } = new();
}
