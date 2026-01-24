using Backend.DTOs;

namespace Backend.Services;

public interface IModuleService
{
    Task<List<ModuleDto>> GetModulesByHeadNameAsync(string headName);
}
