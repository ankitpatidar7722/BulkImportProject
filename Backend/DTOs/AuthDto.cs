namespace Backend.DTOs;

public class CompanyLoginRequest
{
    public string CompanyUserID { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class CompanyLoginResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string CompanyToken { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
}

public class UserLoginRequest
{
    public string UserName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FYear { get; set; } = string.Empty;
}

public class UserLoginResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public string Token { get; set; } = string.Empty;
    public int UserID { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int CompanyID { get; set; }
    public int BranchID { get; set; }
    public string FYear { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
    public string CompanyName { get; set; } = string.Empty;
}

public class UserInfoResponse
{
    public int UserID { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int CompanyID { get; set; }
    public int BranchID { get; set; }
    public string FYear { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }
    public string CompanyName { get; set; } = string.Empty;
}
