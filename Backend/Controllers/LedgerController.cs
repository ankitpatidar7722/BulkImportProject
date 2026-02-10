using Backend.DTOs;
using Backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LedgerController : ControllerBase
{
    private readonly ILedgerService _ledgerService;

    public LedgerController(ILedgerService ledgerService)
    {
        _ledgerService = ledgerService;
    }

    [HttpGet("country-states")]
    public async Task<IActionResult> GetCountryStates()
    {
        try
        {
            var countryStates = await _ledgerService.GetCountryStatesAsync();
            return Ok(countryStates);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpGet("bygroup/{ledgerGroupId}")]
    public async Task<IActionResult> GetLedgersByGroup(int ledgerGroupId)
    {
        try
        {
            var ledgers = await _ledgerService.GetLedgersByGroupAsync(ledgerGroupId);
            return Ok(ledgers);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpDelete("soft-delete/{ledgerId}")]
    public async Task<IActionResult> SoftDeleteLedger(int ledgerId)
    {
        try
        {
            var success = await _ledgerService.SoftDeleteLedgerAsync(ledgerId);
            if (success)
            {
                return Ok(new { message = "Ledger soft deleted successfully", ledgerId });
            }
            return NotFound(new { message = "Ledger not found" });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("validate")]
    public async Task<IActionResult> ValidateLedgers([FromBody] ValidateLedgersRequest request)
    {
        try
        {
            var validationResult = await _ledgerService.ValidateLedgersAsync(request.Ledgers, request.LedgerGroupId);
            return Ok(validationResult);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    [HttpPost("import")]
    public async Task<IActionResult> ImportLedgers([FromBody] ImportLedgersRequest request)
    {
        try
        {
            // First validate
            var validationResult = await _ledgerService.ValidateLedgersAsync(request.Ledgers, request.LedgerGroupId);
            
            if (!validationResult.IsValid)
            {
                return BadRequest(new 
                { 
                    message = "Validation failed. Please fix errors before importing.",
                    validationResult
                });
            }

            // Then import
            var importResult = await _ledgerService.ImportLedgersAsync(request.Ledgers, request.LedgerGroupId);
            
            if (importResult.Success)
            {
                return Ok(importResult);
            }
            
            return BadRequest(importResult);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }
}

public class ValidateLedgersRequest
{
    public List<LedgerMasterDto> Ledgers { get; set; } = new();
    public int LedgerGroupId { get; set; }
}

public class ImportLedgersRequest
{
    public List<LedgerMasterDto> Ledgers { get; set; } = new();
    public int LedgerGroupId { get; set; }
}
