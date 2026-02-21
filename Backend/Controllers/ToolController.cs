using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ToolController : ControllerBase
{
    private readonly IToolService _toolService;

    public ToolController(IToolService toolService)
    {
        _toolService = toolService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAllTools([FromQuery] int toolGroupId)
    {
        try
        {
            if (toolGroupId <= 0)
                return BadRequest(new { message = "ToolGroupId is required" });

            var tools = await _toolService.GetAllToolsAsync(toolGroupId);
            return Ok(tools);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("groups")]
    public async Task<IActionResult> GetToolGroups()
    {
        try
        {
            var groups = await _toolService.GetToolGroupsAsync();
            return Ok(groups);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("hsn-groups")]
    public async Task<IActionResult> GetHSNGroups()
    {
        try
        {
            var hsnGroups = await _toolService.GetToolHSNGroupsAsync();
            return Ok(hsnGroups);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("units")]
    public async Task<IActionResult> GetUnits()
    {
        try
        {
            var units = await _toolService.GetToolUnitsAsync();
            return Ok(units);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> SoftDeleteTool(int id)
    {
        try
        {
            var success = await _toolService.SoftDeleteToolAsync(id);
            if (success)
                return Ok(new { message = "Tool deleted successfully" });
            return NotFound(new { message = "Tool not found" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("validate")]
    public async Task<IActionResult> ValidateTools([FromBody] System.Text.Json.JsonElement payload)
    {
        ImportToolsRequest request;
        try
        {
            var rawPayload = payload.GetRawText();
            try
            {
                var preview = rawPayload.Length > 1000 ? rawPayload.Substring(0, 1000) + "..." : rawPayload;
                System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] TOOL VALIDATE Payload: {preview}\n");
            }
            catch { }

            var options = new System.Text.Json.JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString |
                                System.Text.Json.Serialization.JsonNumberHandling.AllowNamedFloatingPointLiterals
            };
            request = System.Text.Json.JsonSerializer.Deserialize<ImportToolsRequest>(rawPayload, options);
        }
        catch (System.Text.Json.JsonException jex)
        {
            return BadRequest(new { message = "Invalid JSON format", error = jex.Message, path = jex.Path, line = jex.LineNumber });
        }

        if (request == null || request.Tools == null || request.Tools.Count == 0)
            return BadRequest(new { message = "No tools provided" });

        if (request.ToolGroupId <= 0)
            return BadRequest(new { message = "ToolGroupId is required" });

        try
        {
            var result = await _toolService.ValidateToolsAsync(request.Tools, request.ToolGroupId);
            return Ok(new { validationResult = result });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("import")]
    public async Task<IActionResult> ImportTools([FromBody] System.Text.Json.JsonElement payload)
    {
        ImportToolsRequest request;
        try
        {
            var rawPayload = payload.GetRawText();
            try { System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] Tool Import Raw Payload: {rawPayload.Substring(0, Math.Min(500, rawPayload.Length))}...\n"); } catch { }

            var options = new System.Text.Json.JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString |
                                System.Text.Json.Serialization.JsonNumberHandling.AllowNamedFloatingPointLiterals
            };
            request = System.Text.Json.JsonSerializer.Deserialize<ImportToolsRequest>(rawPayload, options);
        }
        catch (System.Text.Json.JsonException jex)
        {
            return BadRequest(new { message = "Invalid JSON format", error = jex.Message });
        }

        if (request == null || request.Tools == null || request.Tools.Count == 0)
            return BadRequest(new { message = "No tools provided" });

        if (request.ToolGroupId <= 0)
            return BadRequest(new { message = "ToolGroupId is required" });

        try
        {
            // First validate
            var validationResult = await _toolService.ValidateToolsAsync(request.Tools, request.ToolGroupId);

            if (!validationResult.IsValid)
                return BadRequest(new { message = "Validation failed. Please fix errors before importing.", validationResult });

            // Then import
            var importResult = await _toolService.ImportToolsAsync(request.Tools, request.ToolGroupId);

            if (importResult.Success)
                return Ok(importResult);

            return BadRequest(importResult);
        }
        catch (Exception ex)
        {
            try { System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] Tool Import Exception: {ex.Message}\nStack: {ex.StackTrace}\n"); } catch { }
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("clear-all-data")]
    public async Task<IActionResult> ClearAllToolData([FromBody] ClearToolDataRequestDto request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Reason))
            return BadRequest(new { message = "Username and Reason are required." });

        if (request.ToolGroupId <= 0)
            return BadRequest(new { message = "ToolGroupId is required." });

        var password = request.Password ?? string.Empty;

        try
        {
            var deletedCount = await _toolService.ClearAllToolDataAsync(request.Username, password, request.Reason, request.ToolGroupId);
            return Ok(new { message = "All data cleared successfully.", deletedCount });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(new { message = "Invalid credentials." });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
