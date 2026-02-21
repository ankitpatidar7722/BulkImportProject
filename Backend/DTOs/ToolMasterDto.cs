using System.ComponentModel.DataAnnotations;

namespace Backend.DTOs;

public class ToolMasterDto
{
    public int? ToolID { get; set; }
    public string? ToolName { get; set; }
    public string? ToolCode { get; set; }
    public int? ToolGroupID { get; set; }
    public string? ToolGroupName { get; set; }
    public string? ToolType { get; set; }
    public int? ProductHSNID { get; set; }
    public string? ProductHSNName { get; set; }
    public string? HSNCode { get; set; }

    // PLATES-specific fields
    public decimal? SizeL { get; set; }
    public decimal? SizeW { get; set; }
    public decimal? SizeH { get; set; }
    public int? UpsAround { get; set; }
    public int? UpsAcross { get; set; }
    public int? TotalUps { get; set; }
    public string? PurchaseUnit { get; set; }
    public decimal? PurchaseRate { get; set; }
    public string? ManufecturerItemCode { get; set; }
    public decimal? PurchaseOrderQuantity { get; set; }
    public int? ShelfLife { get; set; }
    public string? StockUnit { get; set; }
    public decimal? MinimumStockQty { get; set; }
    public bool? IsStandardItem { get; set; }
    public bool? IsRegularItem { get; set; }

    public bool? IsDeletedTransaction { get; set; }

    // Raw string values for fields that failed client-side type parsing
    public Dictionary<string, string>? RawValues { get; set; }
}

public class ToolValidationResultDto
{
    public bool IsValid { get; set; }
    public List<ToolRowValidation> Rows { get; set; } = new();
    public ValidationSummary Summary { get; set; } = new();
}

public class ToolRowValidation
{
    public int RowIndex { get; set; }
    public ToolMasterDto Data { get; set; } = new();
    public List<CellValidation> CellValidations { get; set; } = new();
    public ValidationStatus RowStatus { get; set; }
    public string? ErrorMessage { get; set; }
}

public class ImportToolsRequest
{
    [Required]
    public List<ToolMasterDto> Tools { get; set; } = new();

    [Required]
    public int ToolGroupId { get; set; }
}

public class ClearToolDataRequestDto
{
    public string Username { get; set; } = string.Empty;
    public string? Password { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public int ToolGroupId { get; set; }
}
