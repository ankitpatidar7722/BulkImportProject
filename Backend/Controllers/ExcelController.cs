using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExcelController : ControllerBase
{
    private readonly IExcelService _excelService;
    private readonly ILogger<ExcelController> _logger;

    public ExcelController(IExcelService excelService, ILogger<ExcelController> logger)
    {
        _excelService = excelService;
        _logger = logger;
    }

    [HttpPost("Preview")]
    public async Task<IActionResult> PreviewExcel(IFormFile file)
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "No file uploaded." });
            }

            // Validate file extension
            var extension = Path.GetExtension(file.FileName).ToLower();
            if (extension != ".xlsx" && extension != ".xls")
            {
                return BadRequest(new { error = "Only Excel files (.xlsx, .xls) are allowed." });
            }

            using var stream = file.OpenReadStream();
            var preview = await _excelService.PreviewExcelAsync(stream);
            
            return Ok(preview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error previewing Excel file");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("Import")]
    public async Task<IActionResult> ImportExcel(IFormFile file, [FromQuery] string tableName)
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "No file uploaded." });
            }

            if (string.IsNullOrWhiteSpace(tableName))
            {
                return BadRequest(new { error = "Table name is required." });
            }

            // Validate file extension
            var extension = Path.GetExtension(file.FileName).ToLower();
            if (extension != ".xlsx" && extension != ".xls")
            {
                return BadRequest(new { error = "Only Excel files (.xlsx, .xls) are allowed." });
            }

            using var stream = file.OpenReadStream();
            var result = await _excelService.ImportExcelAsync(stream, tableName);
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing Excel file");
            return StatusCode(500, new { error = ex.Message });
        }
    }
}
