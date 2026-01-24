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
            if (headName == "ALL")
            {
                var all = await _moduleService.GetAllModulesAsync();
                return Ok(all);
            }

            var modules = await _moduleService.GetModulesByHeadNameAsync(headName);
            return Ok(modules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching modules");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("GetAll")]
    public async Task<IActionResult> GetAllModules()
    {
        try
        {
            var modules = await _moduleService.GetAllModulesAsync();
            return Ok(modules);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("DebugDB")]
    public async Task<IActionResult> DebugDB()
    {
        try 
        {
             // Use dynamic query to fetch whatever is there
             var result = await _moduleService.GetDebugModuleData();
             return Ok(result);
        }
        catch(Exception ex)
        {
             return Ok(new { Error = ex.Message });
        }
    }

    [HttpPost("Create")]
    public async Task<IActionResult> CreateModule([FromBody] ModuleDto module)
    {
        try
        {
            var id = await _moduleService.CreateModuleAsync(module);
            return Ok(new { Message = "Module created successfully", ModuleId = id });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPut("Update")]
    public async Task<IActionResult> UpdateModule([FromBody] ModuleDto module)
    {
        try
        {
            var success = await _moduleService.UpdateModuleAsync(module);
            if (success) return Ok(new { Message = "Module updated successfully" });
            return BadRequest(new { Message = "Failed to update module" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpDelete("Delete/{id}")]
    public async Task<IActionResult> DeleteModule(int id)
    {
        try
        {
            var success = await _moduleService.DeleteModuleAsync(id);
            if (success) return Ok(new { Message = "Module deleted successfully" });
            return BadRequest(new { Message = "Failed to delete module" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("GetHeads")]
    public async Task<IActionResult> GetModuleHeads()
    {
        try
        {
            var heads = await _moduleService.GetUniqueModuleHeadsAsync();
            return Ok(heads);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
