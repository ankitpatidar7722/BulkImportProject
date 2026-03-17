using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.DTOs;
using Backend.Services;

namespace Backend.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class CompanySubscriptionController : ControllerBase
{
    private readonly ICompanySubscriptionService _service;

    public CompanySubscriptionController(ICompanySubscriptionService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var response = await _service.GetAllAsync();
        return Ok(response);
    }

    [HttpGet("{companyUserID}")]
    public async Task<IActionResult> GetByKey(string companyUserID)
    {
        var response = await _service.GetByKeyAsync(companyUserID);
        return Ok(response);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CompanySubscriptionSaveRequest request)
    {
        var response = await _service.CreateAsync(request);
        return Ok(response);
    }

    [HttpPut]
    public async Task<IActionResult> Update([FromBody] CompanySubscriptionSaveRequest request)
    {
        var response = await _service.UpdateAsync(request);
        return Ok(response);
    }

    [HttpDelete("{companyUserID}")]
    public async Task<IActionResult> Delete(string companyUserID)
    {
        var response = await _service.DeleteAsync(companyUserID);
        return Ok(response);
    }

    [HttpGet("servers")]
    public async Task<IActionResult> GetServers()
    {
        var response = await _service.GetServersAsync();
        return Ok(response);
    }

    [HttpPost("setup-database")]
    public async Task<IActionResult> SetupDatabase([FromBody] SetupDatabaseRequest request)
    {
        var response = await _service.SetupDatabaseAsync(request);
        return Ok(response);
    }
}
