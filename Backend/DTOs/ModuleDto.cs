namespace Backend.DTOs;

public class ModuleDto
{
    public int ModuleId { get; set; }
    public string ModuleName { get; set; } = string.Empty;
    public string? ModuleHeadName { get; set; }
    public string? ModuleDisplayName { get; set; }
    public string? Description { get; set; }
}
