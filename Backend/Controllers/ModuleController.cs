using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Backend.DTOs;

namespace Backend.Controllers;

[Authorize]
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
            var result = await _moduleService.GetDebugModuleData();
            return Ok(result);
        }
        catch (Exception ex)
        {
            return Ok(new { Error = ex.Message });
        }
    }

    [HttpPost("Create")]
    public async Task<IActionResult> CreateModule([FromBody] ModuleDto module)
    {
        try
        {
            // If display order already exists, shift existing ones first
            if (module.SetGroupIndex.HasValue && module.ModuleHeadDisplayOrder.HasValue)
            {
                bool orderExists = await _moduleService.CheckDisplayOrderExistsAsync(
                    module.ModuleHeadDisplayOrder.Value, module.SetGroupIndex.Value);
                if (orderExists)
                {
                    await _moduleService.ShiftDisplayOrdersAsync(
                        module.ModuleHeadDisplayOrder.Value, module.SetGroupIndex.Value);
                }
            }

            // ModuleDisplayOrder mirrors ModuleHeadDisplayOrder
            module.ModuleDisplayOrder = module.ModuleHeadDisplayOrder;

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

    // ─────────────────────────────────────────────
    // Create Module Form Endpoints
    // ─────────────────────────────────────────────

    /// <summary>Returns distinct module names from IndusEnterpriseDemo for the searchable dropdown.</summary>
    [HttpGet("IndusModuleNames")]
    public async Task<IActionResult> GetIndusModuleNames()
    {
        try
        {
            var names = await _moduleService.GetIndusModuleNamesAsync();
            return Ok(names);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Indus module names");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>Returns full module details from IndusEnterpriseDemo for interconnected dropdown filtering.</summary>
    [HttpGet("IndusModules")]
    public async Task<IActionResult> GetIndusModules()
    {
        try
        {
            var modules = await _moduleService.GetIndusModulesAsync();
            return Ok(modules);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching full Indus modules list");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>Returns auto-fill data for a given module name from IndusEnterpriseDemo.</summary>
    [HttpGet("IndusModuleInfo")]
    public async Task<IActionResult> GetIndusModuleInfo([FromQuery] string moduleName)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(moduleName))
                return BadRequest(new { error = "moduleName is required" });

            var info = await _moduleService.GetIndusModuleInfoAsync(moduleName);
            if (info == null)
                return NotFound(new { error = $"Module '{moduleName}' not found in IndusEnterpriseDemo" });

            return Ok(info);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching Indus module info for {ModuleName}", moduleName);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>Returns default system values: CompanyID, UserID (admin), FYear.</summary>
    [HttpGet("SystemDefaults")]
    public async Task<IActionResult> GetSystemDefaults()
    {
        try
        {
            var defaults = await _moduleService.GetSystemDefaultsAsync();
            return Ok(defaults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching system defaults");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>Returns the next available display order for a given SetGroupIndex.</summary>
    [HttpGet("NextDisplayOrder")]
    public async Task<IActionResult> GetNextDisplayOrder([FromQuery] int setGroupIndex)
    {
        try
        {
            var next = await _moduleService.GetNextDisplayOrderAsync(setGroupIndex);
            return Ok(new { nextOrder = next });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>Returns { exists: bool } – whether a module name already exists in the current DB.</summary>
    [HttpGet("CheckModuleExists")]
    public async Task<IActionResult> CheckModuleExists([FromQuery] string moduleName)
    {
        try
        {
            var exists = await _moduleService.CheckModuleExistsAsync(moduleName);
            return Ok(new { exists });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    /// <summary>Returns { exists: bool } – whether a display order is taken for this SetGroupIndex.</summary>
    [HttpGet("CheckDisplayOrderExists")]
    public async Task<IActionResult> CheckDisplayOrderExists([FromQuery] int order, [FromQuery] int setGroupIndex)
    {
        try
        {
            var exists = await _moduleService.CheckDisplayOrderExistsAsync(order, setGroupIndex);
            return Ok(new { exists });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
