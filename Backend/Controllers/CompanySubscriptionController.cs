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

    [HttpGet("next-client-code")]
    public async Task<IActionResult> GetNextClientCode()
    {
        var response = await _service.GetNextClientCodeAsync();
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

    [HttpPost("save-company-master")]
    public async Task<IActionResult> SaveCompanyMaster([FromBody] CompanyMasterRequest request)
    {
        var response = await _service.SaveCompanyMasterAsync(request);
        return Ok(response);
    }

    [HttpPost("save-branch-master")]
    public async Task<IActionResult> SaveBranchMaster([FromBody] BranchMasterRequest request)
    {
        var response = await _service.SaveBranchMasterAsync(request);
        return Ok(response);
    }

    [HttpPost("save-production-unit")]
    public async Task<IActionResult> SaveProductionUnit([FromBody] ProductionUnitRequest request)
    {
        var response = await _service.SaveProductionUnitAsync(request);
        return Ok(response);
    }

    [HttpPost("complete-setup")]
    public async Task<IActionResult> CompleteSetup([FromBody] CompleteSetupRequest request)
    {
        var response = await _service.CompleteSetupAsync(request);
        return Ok(response);
    }

    [HttpPost("get-module-settings")]
    public async Task<IActionResult> GetModuleSettings([FromBody] GetModuleSettingsRequest request)
    {
        var response = await _service.GetModuleSettingsAsync(request);
        return Ok(response);
    }

    [HttpPost("save-module-settings")]
    public async Task<IActionResult> SaveModuleSettings([FromBody] SaveModuleSettingsRequest request)
    {
        var response = await _service.SaveModuleSettingsAsync(request);
        return Ok(response);
    }

    [HttpGet("client-dropdown")]
    public async Task<IActionResult> GetClientDropdown()
    {
        var response = await _service.GetClientDropdownAsync();
        return Ok(response);
    }

    [HttpPost("copy-modules")]
    public async Task<IActionResult> CopyModules([FromBody] CopyModulesRequest request)
    {
        var response = await _service.CopyModulesAsync(request);
        return Ok(response);
    }
}
