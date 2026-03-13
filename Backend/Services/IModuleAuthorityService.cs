using Backend.DTOs;

namespace Backend.Services;

public interface IModuleAuthorityService
{
    Task<List<ModuleAuthorityRowDto>> GetModuleAuthorityDataAsync(string product);
    Task<object> SaveModuleAuthorityAsync(List<ModuleAuthoritySaveDto> modules, string product);
}
