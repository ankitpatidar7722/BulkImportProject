using Backend.DTOs;

namespace Backend.Services;

public interface IModuleService
{
    Task<List<ModuleDto>> GetModulesByHeadNameAsync(string headName);
    
    // CRUD
    Task<List<ModuleDto>> GetAllModulesAsync();
    Task<int> CreateModuleAsync(ModuleDto module);
    Task<bool> UpdateModuleAsync(ModuleDto module);
    Task<bool> DeleteModuleAsync(int moduleId);
    Task<List<string>> GetUniqueModuleHeadsAsync();
    Task<IEnumerable<dynamic>> GetDebugModuleData();
}
