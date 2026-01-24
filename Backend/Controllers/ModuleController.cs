using Backend.Services;
using Microsoft.AspNetCore.Mvc;
using Backend.DTOs;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ModuleController : ControllerBase
{
    private readonly IModuleService _moduleService;
    private readonly ILogger<ModuleController> _logger;

    public ModuleController(IModuleService moduleService, ILogger<ModuleController> logger)
    {
        _moduleService = moduleService;
        _logger = logger;
    }

    [HttpGet("GetModules")]
    public async Task<IActionResult> GetModules([FromQuery] string headName = "Masters")
    {
        try
        {
            // DEBUG: BYPASSING SERVICE TO PROVE CONTROL
            if (headName == "TEST_CONTROL")
            {
                 return Ok(new List<ModuleDto> 
                 { 
                     new ModuleDto { ModuleName = "I_AM_IN_CONTROL", ModuleId = 9999, ModuleDisplayName = "I AM IN CONTROL" } 
                 });
            }



            var modules = await _moduleService.GetModulesByHeadNameAsync(headName);
            return Ok(modules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching modules");
            System.IO.File.WriteAllText("error_log.txt", ex.ToString());
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
