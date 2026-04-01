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

    // Create Module Form helpers
    Task<List<ModuleDto>> GetIndusModulesAsync();
    Task<List<string>> GetIndusModuleNamesAsync();
    Task<IndusModuleInfoDto?> GetIndusModuleInfoAsync(string moduleName);
    Task<ModuleSystemDefaultsDto> GetSystemDefaultsAsync();
    Task<int> GetNextDisplayOrderAsync(int setGroupIndex);
    Task<bool> CheckModuleExistsAsync(string moduleName);
    Task<bool> CheckDisplayOrderExistsAsync(int order, int setGroupIndex);
    Task ShiftDisplayOrdersAsync(int fromOrder, int setGroupIndex);
}
