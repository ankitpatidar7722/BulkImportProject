using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using BulkImport.DTOs;
using BulkImport.Services;
using System.Security.Claims;

namespace BulkImport.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly ICompanySessionStore _sessionStore;

    public AuthController(IAuthService authService, ICompanySessionStore sessionStore)
    {
        _authService = authService;
        _sessionStore = sessionStore;
    }

    [HttpPost("company-login")]
    [AllowAnonymous]
    public async Task<IActionResult> CompanyLogin([FromBody] CompanyLoginRequest request)
    {
        var response = await _authService.CompanyLoginAsync(request);
        if (!response.Success)
            return Unauthorized(response);
            
        return Ok(response);
    }

    [HttpPost("user-login")]
    [Authorize]
    public async Task<IActionResult> UserLogin([FromBody] UserLoginRequest request)
    {
        // Extract SessionID from claims (from Step 1 Token)
        var sessionIdClaim = User.FindFirst("sessionId")?.Value;
        if (string.IsNullOrEmpty(sessionIdClaim) || !Guid.TryParse(sessionIdClaim, out var sessionId))
        {
            return Unauthorized(new { Message = "Invalid Session ID. Please re-login." });
        }

        var response = await _authService.UserLoginAsync(request, sessionId);
        if (!response.Success)
            return Unauthorized(response);

        return Ok(response);
    }
    
    [HttpPost("logout")]
    [Authorize]
    public IActionResult Logout()
    {
        var sessionIdClaim = User.FindFirst("sessionId")?.Value;
        if (!string.IsNullOrEmpty(sessionIdClaim) && Guid.TryParse(sessionIdClaim, out var sessionId))
        {
            _sessionStore.RemoveSession(sessionId);
        }
        return Ok(new { Message = "Logged out successfully" });
    }

    [HttpGet("me")]
    [Authorize]
    public IActionResult Me()
    {
        return Ok(new 
        { 
            User = User.Identity?.Name,
            Claims = User.Claims.Select(c => new { c.Type, c.Value })
        });
    }
}
