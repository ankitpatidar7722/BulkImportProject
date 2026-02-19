using Microsoft.Data.SqlClient;
using Dapper;
using Microsoft.Extensions.Configuration;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Backend.DTOs;

namespace Backend.Services;

public class AuthService : IAuthService
{
    private readonly IConfiguration _config;
    private readonly ICompanySessionStore _sessionStore;

    public AuthService(IConfiguration config, ICompanySessionStore sessionStore)
    {
        _config = config;
        _sessionStore = sessionStore;
    }

    public async Task<CompanyLoginResponse> CompanyLoginAsync(CompanyLoginRequest request)
    {
        var indusConnString = _config.GetConnectionString("IndusConnection");
        if (string.IsNullOrEmpty(indusConnString))
            return new CompanyLoginResponse { Success = false, Message = "Indus Connection String not configured." };

        using var conn = new SqlConnection(indusConnString);
        
        // Query to match legacy CompanyLogin.aspx logic
        var appName = _config["AppSettings:ApplicationName"] ?? "estimoprime";

        var query = @"
            SELECT CompanyUserID, Password, Conn_String, CompanyName 
            FROM Indus_Company_Authentication_For_Web_Modules 
            WHERE CompanyUserID = @User AND ISNULL(Password, '') = @Pass
            AND ISNULL(NULLIF(ApplicationName, ''), 'estimoprime') = @AppName";

        var result = await conn.QueryFirstOrDefaultAsync<dynamic>(query, new { User = request.CompanyUserID, Pass = request.Password, AppName = appName });

        if (result == null)
        {
            return new CompanyLoginResponse { Success = false, Message = "Invalid Company UserID or Password" };
        }

        string connString = result.Conn_String;
        string companyName = result.CompanyName;
        string companyUserId = result.CompanyUserID;

        // Create Session (stores connection string server-side)
        var sessionId = _sessionStore.CreateSession(companyUserId, connString, companyName);

        // Generate Step-1 Token (contains sessionId but NO user claims yet)
        var token = GenerateJwtToken(sessionId, 1, companyUserId, companyName);

        return new CompanyLoginResponse 
        { 
            Success = true, 
            CompanyToken = token,
            CompanyName = companyName,
            Message = "Company Login Successful"
        };
    }

    public async Task<UserLoginResponse> UserLoginAsync(UserLoginRequest request, Guid sessionId)
    {
        try
        {
            if (!_sessionStore.TryGetSession(sessionId, out var session) || session == null)
            {
                 return new UserLoginResponse { Success = false, Message = "Session expired or invalid. Please login again." };
            }

            // Ensure connection string is valid and trusts server certificate
            var builder = new SqlConnectionStringBuilder(session.ConnectionString);
            builder.TrustServerCertificate = true; 
            var connectionString = builder.ConnectionString;

            using var conn = new SqlConnection(connectionString);
            
            // Use custom PasswordEncoder to match legacy logic
            var encodedPass = PasswordEncoder.ChangePassword(request.Password);
            
            // Query to match legacy Login.aspx logic
            // We select fields needed for token and session
            var query = @"
                SELECT u.UserID, u.UserName, u.CompanyID, u.BranchID, u.IsAdmin, u.FYear, c.CompanyName
                FROM UserMaster u
                INNER JOIN CompanyMaster c ON u.CompanyID = c.CompanyID
                WHERE u.UserName = @User AND ISNULL(u.Password,'') = @Pass AND ISNULL(u.IsBlocked,0) = 0";

            Console.WriteLine($"Executing UserLogin Query: {query}");

            var user = await conn.QueryFirstOrDefaultAsync<dynamic>(query, 
                new { User = request.UserName, Pass = encodedPass });
            
            if (user == null)
            {
                return new UserLoginResponse { Success = false, Message = "Invalid Username or Password" };
            }

            // Update session with user details
            session.UserID = (user.UserID != null) ? (int)user.UserID : 0;
            // Handle UserMasterID if used elsewhere, but for now stick to UserID
            
            session.CompanyID = (int)user.CompanyID;
            session.BranchID = (int)user.BranchID;
            // Handle IsAdmin being null or bool/int
            session.IsAdmin = user.IsAdmin != null && (bool)user.IsAdmin;
            session.FYear = request.FYear;
            session.LoginStep = 2; // Step 2 completed
            
            _sessionStore.UpdateSession(sessionId, session);
            
            // Generate Step-2 Token (Full Access)
            var token = GenerateJwtToken(sessionId, 2, session.CompanyUserID, session.CompanyName, 
                                         session.UserID, session.CompanyID, session.BranchID, session.IsAdmin);
            
            return new UserLoginResponse
            {
                Success = true,
                Token = token,
                UserID = session.UserID,
                UserName = (string)user.UserName,
                CompanyID = session.CompanyID,
                BranchID = session.BranchID,
                IsAdmin = session.IsAdmin,
                FYear = session.FYear,
                CompanyName = session.CompanyName,
                Message = "Login Successful"
            };
        }
        catch (Exception ex)
        {
            // Log the error (console for now)
            Console.WriteLine($"UserLogin Error: {ex}");
            return new UserLoginResponse { Success = false, Message = $"Login Error: {ex.Message}" };
        }
    }

    private string GenerateJwtToken(Guid sessionId, int step, string userName, string companyName, 
                                    int userId = 0, int companyId = 0, int branchId = 0, bool isAdmin = false)
    {
        var keyStr = _config["Jwt:Key"] ?? "ThisIsSamplesecretKey12345678901234567890";
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyStr));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new Claim("sessionId", sessionId.ToString()),
            new Claim("loginStep", step.ToString()),
            new Claim(ClaimTypes.Name, userName), // This is username or companyUserId
            new Claim("companyName", companyName)
        };
        
        if (step == 2)
        {
            claims.Add(new Claim("userId", userId.ToString()));
            claims.Add(new Claim("companyId", companyId.ToString()));
            claims.Add(new Claim("branchId", branchId.ToString()));
            claims.Add(new Claim("isAdmin", isAdmin.ToString()));
        }

        var issuer = _config["Jwt:Issuer"] ?? "estimoprime";
        var audience = _config["Jwt:Audience"] ?? "estimoprime";
        var expirationHours = double.Parse(_config["Jwt:ExpirationHours"] ?? "240");

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.Now.AddHours(expirationHours),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token); // WriteToken returns string
    }
}
