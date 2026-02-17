using Backend.DTOs;
using Dapper;
using Microsoft.Data.SqlClient;
using System.Text.RegularExpressions;

namespace Backend.Services;

public class ItemService : IItemService
{
    private readonly SqlConnection _connection;

    public ItemService(SqlConnection connection)
    {
        _connection = connection;
    }

    public async Task<List<ItemMasterDto>> GetAllItemsAsync(int itemGroupId)
    {
        var query = @"
            SELECT
                i.ItemID,
                i.ItemName,
                i.ItemCode,
                i.ItemGroupID,
                ig.ItemGroupName,
                i.ProductHSNID,
                hsn.DisplayName as HSNGroup,
                hsn.DisplayName as ProductHSNName,
                i.StockUnit,
                i.PurchaseUnit,
                i.EstimationUnit,
                i.EstimationRate,
                i.UnitPerPacking,
                i.WtPerPacking,
                i.ConversionFactor,
                i.ItemSubGroupID,
                isg.ItemSubGroupName,
                i.ItemType,
                i.StockType,
                i.StockCategory,
                i.SizeW,
                i.SizeL,
                i.ItemSize,
                i.PurchaseRate,
                i.StockRefCode,
                i.ItemDescription,
                i.Quality,
                i.GSM,
                i.Manufecturer,
                i.Finish,
                i.ManufecturerItemCode,
                i.Caliper,
                i.ShelfLife,
                i.MinimumStockQty,
                i.IsStandardItem,
                i.IsRegularItem,
                i.PackingType,
                i.BF,
                i.InkColour,
                i.PantoneCode,
                i.PurchaseOrderQuantity,
                i.Thickness,
                i.Density,
                i.ReleaseGSM,
                i.AdhesiveGSM,
                i.TotalGSM,
                hsn.HSNCode,
                CAST(ISNULL(i.IsDeletedTransaction, 0) AS BIT) as IsDeletedTransaction
            FROM ItemMaster i
            LEFT JOIN ItemGroupMaster ig ON i.ItemGroupID = ig.ItemGroupID
            LEFT JOIN ProductHSNMaster hsn ON i.ProductHSNID = hsn.ProductHSNID
            LEFT JOIN ItemSubGroupMaster isg ON i.ItemSubGroupID = isg.ItemSubGroupID
            WHERE i.ItemGroupID = @ItemGroupID
              AND (i.IsDeletedTransaction IS NULL OR i.IsDeletedTransaction = 0)
            ORDER BY i.ItemName";

        var items = await _connection.QueryAsync<ItemMasterDto>(query, new { ItemGroupID = itemGroupId });

        // Load additional fields from ItemMasterDetails for each item
        foreach (var item in items)
        {
            var detailQuery = @"
                SELECT FieldName, FieldValue
                FROM ItemMasterDetails
                WHERE ItemID = @ItemID AND IsDeletedTransaction = 0";

            var details = await _connection.QueryAsync<dynamic>(detailQuery, new { ItemID = item.ItemID });

            // Map detail fields back to item properties
            foreach (var detail in details)
            {
                string fieldName = detail.FieldName;
                string fieldValue = detail.FieldValue;

                switch (fieldName)
                {
                    case "Quality":
                        item.Quality = fieldValue;
                        break;
                    case "GSM":
                        if (decimal.TryParse(fieldValue, out decimal gsm))
                            item.GSM = gsm;
                        break;
                    case "Manufecturer":
                        item.Manufecturer = fieldValue;
                        break;
                    case "Finish":
                        item.Finish = fieldValue;
                        break;
                    case "ManufecturerItemCode":
                        item.ManufecturerItemCode = fieldValue;
                        break;
                    case "Caliper":
                        if (decimal.TryParse(fieldValue, out decimal caliper))
                            item.Caliper = caliper;
                        break;
                    case "ShelfLife":
                        if (int.TryParse(fieldValue, out int shelfLife))
                            item.ShelfLife = shelfLife;
                        break;
                    case "EstimationRate":
                        if (decimal.TryParse(fieldValue, out decimal estRate))
                            item.EstimationRate = estRate;
                        break;
                    case "MinimumStockQty":
                        if (decimal.TryParse(fieldValue, out decimal minStock))
                            item.MinimumStockQty = minStock;
                        break;
                    case "IsStandardItem":
                        if (bool.TryParse(fieldValue, out bool isStandard))
                            item.IsStandardItem = isStandard;
                        break;
                    case "IsRegularItem":
                        if (bool.TryParse(fieldValue, out bool isRegular))
                            item.IsRegularItem = isRegular;
                        break;
                    case "PackingType":
                        item.PackingType = fieldValue;
                        break;
                    case "CertificationType":
                        item.CertificationType = fieldValue;
                        break;
                    case "BF":
                        item.BF = fieldValue;
                        break;
                    case "InkColour":
                        item.InkColour = fieldValue;
                        break;
                    case "PantoneCode":
                        item.PantoneCode = fieldValue;
                        break;
                    case "ItemType":
                        item.ItemType = fieldValue;
                        break;
                    case "PurchaseOrderQuantity":
                        if (decimal.TryParse(fieldValue, out decimal poQty))
                            item.PurchaseOrderQuantity = poQty;
                        break;
                    case "Thickness":
                        if (decimal.TryParse(fieldValue, out decimal thickness))
                            item.Thickness = thickness;
                        break;
                    case "Density":
                        if (decimal.TryParse(fieldValue, out decimal density))
                            item.Density = density;
                        break;
                    case "ReleaseGSM":
                        if (decimal.TryParse(fieldValue, out decimal releaseGsm))
                            item.ReleaseGSM = releaseGsm;
                        break;
                    case "AdhesiveGSM":
                        if (decimal.TryParse(fieldValue, out decimal adhesiveGsm))
                            item.AdhesiveGSM = adhesiveGsm;
                        break;
                    case "TotalGSM":
                        if (decimal.TryParse(fieldValue, out decimal totalGsm))
                            item.TotalGSM = totalGsm;
                        break;
                }
            }
        }

        return items.ToList();
    }

    public async Task<bool> SoftDeleteItemAsync(int itemId)
    {
        var query = @"
            UPDATE ItemMaster 
            SET IsDeletedTransaction = 1
            WHERE ItemID = @ItemId";

        var rowsAffected = await _connection.ExecuteAsync(query, new { ItemId = itemId });
        return rowsAffected > 0;
    }

    public async Task<ItemValidationResultDto> ValidateItemsAsync(List<ItemMasterDto> items, int itemGroupId)
    {
        var result = new ItemValidationResultDto
        {
            Summary = new ValidationSummary
            {
                TotalRows = items.Count
            }
        };

        // Get existing items from database for duplicate check
        var existingItems = await GetAllItemsAsync(itemGroupId);

        // Get valid HSN Groups
        var validHSNGroups = await GetHSNGroupsAsync();
        var hsnGroupLookup = new HashSet<string>(
            validHSNGroups.Select(h => h.DisplayName.Trim())
        );

        // Get valid Units
        var validUnits = await GetUnitsAsync();
        var unitLookup = new HashSet<string>(
            validUnits.Select(u => u.UnitSymbol.Trim())
        );

        // Get valid Packing Types
        var validPackingTypes = new HashSet<string>(
            new[] { "Ream", "Box", "Bundle", "Carton", "Pallet", "Roll", "Sheet" }
        );

        // Get valid Item Sub Groups (dynamic from ItemGroupFieldMaster)
        var validItemSubGroups = await GetItemSubGroupsAsync(itemGroupId);
        var itemSubGroupLookup = new HashSet<string>(
            validItemSubGroups.Select(sg => sg.ItemSubGroupName.Trim()),
            StringComparer.OrdinalIgnoreCase
        );

        // Item group-specific required fields
        string[] requiredFields;

        if (itemGroupId == 2) // REEL
        {
            requiredFields = new[] {
                "Quality", "BF", "SizeW", "GSM", "Manufecturer", "Finish",
                "PurchaseUnit", "PurchaseRate", "EstimationUnit", "EstimationRate",
                "StockUnit", "ProductHSNName"
            };
        }
        else if (itemGroupId == 3) // INK & ADDITIVES
        {
            requiredFields = new[] {
                "ItemSubGroupName", "ItemType", "Manufecturer",
                "PurchaseUnit", "PurchaseRate", "EstimationUnit", "EstimationRate",
                "StockUnit", "ProductHSNName"
            };
        }
        else if (itemGroupId == 4) // VARNISHES & COATINGS
        {
            requiredFields = new[] {
                "ItemType", "Quality", "ItemSubGroupName",
                "PurchaseUnit", "PurchaseRate", "EstimationUnit", "EstimationRate",
                "StockUnit", "ProductHSNName"
            };
        }
        else if (itemGroupId == 5) // LAMINATION FILM
        {
            requiredFields = new[] {
                "Quality", "ItemSubGroupName",
                "PurchaseUnit", "PurchaseRate", "EstimationUnit", "EstimationRate",
                "StockUnit", "ProductHSNName"
            };
        }
        else if (itemGroupId == 8) // OTHER MATERIAL
        {
            requiredFields = new[] {
                "ItemSubGroupName", "Quality",
                "PurchaseUnit", "PurchaseRate", "EstimationUnit", "EstimationRate",
                "StockUnit", "ProductHSNName"
            };
        }
        else if (itemGroupId == 13) // ROLL
        {
            requiredFields = new[] {
                "ItemType", "Quality", "Manufecturer", "GSM",
                "PurchaseUnit", "PurchaseRate", "EstimationUnit", "EstimationRate",
                "StockUnit", "ProductHSNName"
            };
        }
        else // PAPER (default) and other item groups
        {
            requiredFields = new[] {
                "Quality", "GSM", "Manufecturer", "Finish", "SizeL", "SizeW",
                "PurchaseRate", "StockUnit", "PurchaseUnit", "EstimationRate",
                "EstimationUnit", "PackingType", "UnitPerPacking"
            };
        }

        for (int i = 0; i < items.Count; i++)
        {
            var item = items[i];
            var rowValidation = new ItemRowValidation
            {
                RowIndex = i,
                Data = item,
                RowStatus = ValidationStatus.Valid
            };

            // Track if row has validation issues
            bool hasMissingData = false;
            bool hasMismatch = false;
            bool hasInvalidContent = false;

            // 1. Check for missing data (BLUE)
            foreach (var field in requiredFields)
            {
                var value = GetPropertyValue(item, field);
                bool isMissing = false;

                // Handle numeric fields
                var numericFields = new[] { "GSM", "SizeL", "SizeW", "PurchaseRate", "EstimationRate",
                                           "UnitPerPacking", "MinimumStockQty", "ShelfLife" };

                if (numericFields.Contains(field))
                {
                    isMissing = value == null || string.IsNullOrWhiteSpace(value.ToString()) ||
                                Convert.ToDecimal(value) <= 0;
                }
                else
                {
                    isMissing = string.IsNullOrWhiteSpace(value?.ToString());
                }

                if (isMissing)
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = field,
                        ValidationMessage = $"{field} is required",
                        Status = ValidationStatus.MissingData
                    });

                    if (rowValidation.RowStatus != ValidationStatus.Duplicate)
                        rowValidation.RowStatus = ValidationStatus.MissingData;

                    hasMissingData = true;
                }
            }

            // 2. Check for duplicates (RED) - Item group specific logic
            bool IsDuplicate(ItemMasterDto a, ItemMasterDto b)
            {
                if (itemGroupId == 2) // REEL: BF + Quality + GSM + Manufacturer + Finish + SizeW
                {
                    var bfA = a.BF?.Trim() ?? "";
                    var bfB = b.BF?.Trim() ?? "";

                    var qualityA = a.Quality?.Trim() ?? "";
                    var qualityB = b.Quality?.Trim() ?? "";

                    var gsmA = a.GSM?.ToString() ?? "";
                    var gsmB = b.GSM?.ToString() ?? "";

                    var manufA = a.Manufecturer?.Trim() ?? "";
                    var manufB = b.Manufecturer?.Trim() ?? "";

                    var finishA = a.Finish?.Trim() ?? "";
                    var finishB = b.Finish?.Trim() ?? "";

                    var sizeWA = a.SizeW?.ToString() ?? "";
                    var sizeWB = b.SizeW?.ToString() ?? "";

                    return string.Equals(bfA, bfB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(qualityA, qualityB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(gsmA, gsmB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(manufA, manufB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(finishA, finishB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(sizeWA, sizeWB, StringComparison.OrdinalIgnoreCase);
                }
                else if (itemGroupId == 3) // INK & ADDITIVES: ItemType + InkColour + PantoneCode
                {
                    var itemTypeA = a.ItemType?.Trim() ?? "";
                    var itemTypeB = b.ItemType?.Trim() ?? "";

                    var inkColourA = a.InkColour?.Trim() ?? "";
                    var inkColourB = b.InkColour?.Trim() ?? "";

                    var pantoneCodeA = a.PantoneCode?.Trim() ?? "";
                    var pantoneCodeB = b.PantoneCode?.Trim() ?? "";

                    return string.Equals(itemTypeA, itemTypeB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(inkColourA, inkColourB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(pantoneCodeA, pantoneCodeB, StringComparison.OrdinalIgnoreCase);
                }
                else if (itemGroupId == 4) // VARNISHES & COATINGS: ItemType + Quality
                {
                    var itemTypeA = a.ItemType?.Trim() ?? "";
                    var itemTypeB = b.ItemType?.Trim() ?? "";

                    var qualityA = a.Quality?.Trim() ?? "";
                    var qualityB = b.Quality?.Trim() ?? "";

                    return string.Equals(itemTypeA, itemTypeB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(qualityA, qualityB, StringComparison.OrdinalIgnoreCase);
                }
                else if (itemGroupId == 5) // LAMINATION FILM: Quality + SizeW + Thickness
                {
                    var qualityA = a.Quality?.Trim() ?? "";
                    var qualityB = b.Quality?.Trim() ?? "";

                    var sizeWA = a.SizeW?.ToString() ?? "";
                    var sizeWB = b.SizeW?.ToString() ?? "";

                    var thicknessA = a.Thickness?.ToString() ?? "";
                    var thicknessB = b.Thickness?.ToString() ?? "";

                    return string.Equals(qualityA, qualityB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(sizeWA, sizeWB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(thicknessA, thicknessB, StringComparison.OrdinalIgnoreCase);
                }
                else if (itemGroupId == 8) // OTHER MATERIAL: ItemSubGroupName + Quality + Manufacturer
                {
                    var subGroupA = a.ItemSubGroupName?.Trim() ?? "";
                    var subGroupB = b.ItemSubGroupName?.Trim() ?? "";

                    var qualityA = a.Quality?.Trim() ?? "";
                    var qualityB = b.Quality?.Trim() ?? "";

                    var manufA = a.Manufecturer?.Trim() ?? "";
                    var manufB = b.Manufecturer?.Trim() ?? "";

                    return string.Equals(subGroupA, subGroupB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(qualityA, qualityB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(manufA, manufB, StringComparison.OrdinalIgnoreCase);
                }
                else if (itemGroupId == 13) // ROLL: Quality + GSM + Manufacturer + SizeW
                {
                    var qualityA = a.Quality?.Trim() ?? "";
                    var qualityB = b.Quality?.Trim() ?? "";

                    var gsmA = a.GSM?.ToString() ?? "";
                    var gsmB = b.GSM?.ToString() ?? "";

                    var manufA = a.Manufecturer?.Trim() ?? "";
                    var manufB = b.Manufecturer?.Trim() ?? "";

                    var sizeWA = a.SizeW?.ToString() ?? "";
                    var sizeWB = b.SizeW?.ToString() ?? "";

                    return string.Equals(qualityA, qualityB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(gsmA, gsmB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(manufA, manufB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(sizeWA, sizeWB, StringComparison.OrdinalIgnoreCase);
                }
                else // PAPER (default): Quality + GSM + Manufacturer + Finish + ItemSize
                {
                    var qualityA = a.Quality?.Trim() ?? "";
                    var qualityB = b.Quality?.Trim() ?? "";

                    var gsmA = a.GSM?.ToString() ?? "";
                    var gsmB = b.GSM?.ToString() ?? "";

                    var manufA = a.Manufecturer?.Trim() ?? "";
                    var manufB = b.Manufecturer?.Trim() ?? "";

                    var finishA = a.Finish?.Trim() ?? "";
                    var finishB = b.Finish?.Trim() ?? "";

                    // Calculate ItemSize for comparison
                    var itemSizeA = (a.SizeW.HasValue && a.SizeL.HasValue) ? $"{a.SizeW} X {a.SizeL}" : "";
                    var itemSizeB = (b.SizeW.HasValue && b.SizeL.HasValue) ? $"{b.SizeW} X {b.SizeL}" : "";

                    return string.Equals(qualityA, qualityB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(gsmA, gsmB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(manufA, manufB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(finishA, finishB, StringComparison.OrdinalIgnoreCase) &&
                           string.Equals(itemSizeA, itemSizeB, StringComparison.OrdinalIgnoreCase);
                }
            }

            var isDuplicate = existingItems.Any(e => IsDuplicate(e, item));

            // Also check within the current batch
            var duplicateInBatch = items.Take(i).Any(s => IsDuplicate(s, item));

            if (isDuplicate || duplicateInBatch)
            {
                rowValidation.RowStatus = ValidationStatus.Duplicate;
                rowValidation.ErrorMessage = "Duplicate record found";
            }

            // 3. Check HSNGroup mismatch (YELLOW)
            if (!string.IsNullOrWhiteSpace(item.HSNGroup))
            {
                var isValidHSNGroup = hsnGroupLookup.Contains(item.HSNGroup.Trim());

                if (!isValidHSNGroup)
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = "HSNGroup",
                        ValidationMessage = "HSNGroup does not match ProductHSNMaster DisplayName",
                        Status = ValidationStatus.Mismatch
                    });

                    if (rowValidation.RowStatus == ValidationStatus.Valid)
                        rowValidation.RowStatus = ValidationStatus.Mismatch;

                    hasMismatch = true;
                }
            }

            // 4. Check Unit mismatches (YELLOW)
            var unitFields = new[] { "PurchaseUnit", "StockUnit", "EstimationUnit" };
            foreach (var unitField in unitFields)
            {
                var unitValue = GetPropertyValue(item, unitField)?.ToString();
                if (!string.IsNullOrWhiteSpace(unitValue))
                {
                    var isValidUnit = unitLookup.Contains(unitValue.Trim());

                    if (!isValidUnit)
                    {
                        rowValidation.CellValidations.Add(new CellValidation
                        {
                            ColumnName = unitField,
                            ValidationMessage = $"{unitField} does not match UnitMaster UnitSymbol",
                            Status = ValidationStatus.Mismatch
                        });

                        if (rowValidation.RowStatus == ValidationStatus.Valid)
                            rowValidation.RowStatus = ValidationStatus.Mismatch;

                        hasMismatch = true;
                    }
                }
            }

            // 4b. Check PackingType mismatch (YELLOW)
            if (!string.IsNullOrWhiteSpace(item.PackingType))
            {
                var isValidPackingType = validPackingTypes.Contains(item.PackingType.Trim());

                if (!isValidPackingType)
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = "PackingType",
                        ValidationMessage = "PackingType does not match valid values (Ream, Box, Bundle, Carton, Pallet, Roll, Sheet)",
                        Status = ValidationStatus.Mismatch
                    });

                    if (rowValidation.RowStatus == ValidationStatus.Valid)
                        rowValidation.RowStatus = ValidationStatus.Mismatch;

                    hasMismatch = true;
                }
            }

            // 4c. Check ItemSubGroupName mismatch (YELLOW) - for groups with ItemSubGroupName
            if ((itemGroupId == 3 || itemGroupId == 4 || itemGroupId == 5 || itemGroupId == 8) && !string.IsNullOrWhiteSpace(item.ItemSubGroupName))
            {
                var isValidSubGroup = itemSubGroupLookup.Contains(item.ItemSubGroupName.Trim());

                if (!isValidSubGroup)
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = "ItemSubGroupName",
                        ValidationMessage = "ItemSubGroupName does not match valid values from database",
                        Status = ValidationStatus.Mismatch
                    });

                    if (rowValidation.RowStatus == ValidationStatus.Valid)
                        rowValidation.RowStatus = ValidationStatus.Mismatch;

                    hasMismatch = true;
                }
            }

            // 4d. Check ProductHSNName (HSNGroup) mismatch - rename for clarity
            if (!string.IsNullOrWhiteSpace(item.ProductHSNName))
            {
                var isValidProductHSN = hsnGroupLookup.Contains(item.ProductHSNName.Trim());

                if (!isValidProductHSN)
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = "ProductHSNName",
                        ValidationMessage = "ProductHSNName does not match ProductHSNMaster DisplayName",
                        Status = ValidationStatus.Mismatch
                    });

                    if (rowValidation.RowStatus == ValidationStatus.Valid)
                        rowValidation.RowStatus = ValidationStatus.Mismatch;

                    hasMismatch = true;
                }
            }

            // 5. Check for Special Characters (InvalidContent)
            var stringProperties = typeof(ItemMasterDto)
                .GetProperties()
                .Where(p => p.PropertyType == typeof(string) && 
                           p.Name != "ItemDescription" && 
                           p.Name != "StockRefCode");

            foreach (var prop in stringProperties)
            {
                var val = prop.GetValue(item) as string;
                if (!string.IsNullOrEmpty(val) && (val.Contains('\'') || val.Contains('\"')))
                {
                    rowValidation.CellValidations.Add(new CellValidation
                    {
                        ColumnName = prop.Name,
                        ValidationMessage = "Special characters are found in this row and column.",
                        Status = ValidationStatus.InvalidContent
                    });

                    if (rowValidation.RowStatus == ValidationStatus.Valid)
                        rowValidation.RowStatus = ValidationStatus.InvalidContent;

                    hasInvalidContent = true;
                }
            }

            // Count this row only once for each issue type
            if (rowValidation.RowStatus == ValidationStatus.Duplicate)
                result.Summary.DuplicateCount++;
            else if (hasMissingData)
                result.Summary.MissingDataCount++;
            else if (hasMismatch)
                result.Summary.MismatchCount++;
            else if (hasInvalidContent)
                result.Summary.InvalidContentCount++;

            result.Rows.Add(rowValidation);
        }

        result.Summary.ValidRows = result.Rows.Count(r => r.RowStatus == ValidationStatus.Valid);
        result.IsValid = result.Summary.DuplicateCount == 0 &&
                        result.Summary.MissingDataCount == 0 &&
                        result.Summary.MismatchCount == 0 &&
                        result.Summary.InvalidContentCount == 0;

        return result;
    }

    public async Task<ImportResultDto> ImportItemsAsync(List<ItemMasterDto> items, int itemGroupId)
    {
        var result = new ImportResultDto();
        if (_connection.State != System.Data.ConnectionState.Open) await _connection.OpenAsync();

        // Fetch lookup data BEFORE starting transaction
        var hsnGroups = await GetHSNGroupsAsync();
        var hsnGroupMapping = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var hsn in hsnGroups)
        {
            if (!string.IsNullOrWhiteSpace(hsn.DisplayName) && !hsnGroupMapping.ContainsKey(hsn.DisplayName))
            {
                hsnGroupMapping[hsn.DisplayName.Trim()] = hsn.ProductHSNID;
            }
        }

        var itemSubGroups = await GetItemSubGroupsAsync(itemGroupId);
        var itemSubGroupMapping = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        foreach (var subGroup in itemSubGroups)
        {
            if (!string.IsNullOrWhiteSpace(subGroup.ItemSubGroupName) && !itemSubGroupMapping.ContainsKey(subGroup.ItemSubGroupName))
            {
                itemSubGroupMapping[subGroup.ItemSubGroupName.Trim()] = subGroup.ItemSubGroupID;
            }
        }

        // Get ItemGroup info
        var itemGroupQuery = @"
            SELECT ItemGroupID, ItemGroupName, ItemGroupPrefix, 
                   ItemNameFormula, ItemDescriptionFormula
            FROM ItemGroupMaster
            WHERE ItemGroupID = @ItemGroupID AND CompanyID = 2 AND IsDeletedTransaction = 0";
        
        var itemGroup = await _connection.QueryFirstOrDefaultAsync<ItemGroupDto>(itemGroupQuery, new { ItemGroupID = itemGroupId });
        
        if (itemGroup == null)
        {
            result.Success = false;
            result.Message = $"ItemGroup with ID {itemGroupId} not found.";
            return result;
        }

        var transaction = await _connection.BeginTransactionAsync();

        try
        {
            // Get Max Item No
            var maxItemNo = await _connection.ExecuteScalarAsync<int?>(
                "SELECT MAX(MaxItemNo) FROM ItemMaster WHERE ItemGroupID = @ItemGroupID AND IsDeletedTransaction = 0",
                new { ItemGroupID = itemGroupId },
                transaction: transaction
            ) ?? 0;

            int successCount = 0;

            var insertMasterSql = @"
                INSERT INTO ItemMaster (
                    ItemName, ItemCode, MaxItemNo, ItemCodePrefix, ItemGroupID, ProductHSNID,
                    StockUnit, PurchaseUnit, EstimationUnit, EstimationRate,
                    UnitPerPacking, WtPerPacking, ConversionFactor,
                    ItemSubGroupID, StockType, StockCategory, ItemType,
                    SizeW, SizeL, ItemSize, PurchaseRate, StockRefCode, ItemDescription,
                    Quality, GSM, Manufecturer, Finish, ManufecturerItemCode, Caliper,
                    ShelfLife, MinimumStockQty, IsStandardItem, IsRegularItem, PackingType, BF,
                    InkColour, PantoneCode, PurchaseOrderQuantity,
                    Thickness, Density,
                    ReleaseGSM, AdhesiveGSM, TotalGSM,
                    ISItemActive, CompanyID, UserID, FYear, CreatedBy, CreatedDate, IsDeletedTransaction
                )
                OUTPUT INSERTED.ItemID
                VALUES (
                    @ItemName, @ItemCode, @MaxItemNo, @ItemCodePrefix, @ItemGroupID, @ProductHSNID,
                    @StockUnit, @PurchaseUnit, @EstimationUnit, @EstimationRate,
                    @UnitPerPacking, @WtPerPacking, @ConversionFactor,
                    @ItemSubGroupID, @StockType, @StockCategory, @ItemType,
                    @SizeW, @SizeL, @ItemSize, @PurchaseRate, @StockRefCode, @ItemDescription,
                    @Quality, @GSM, @Manufecturer, @Finish, @ManufecturerItemCode, @Caliper,
                    @ShelfLife, @MinimumStockQty, @IsStandardItem, @IsRegularItem, @PackingType, @BF,
                    @InkColour, @PantoneCode, @PurchaseOrderQuantity,
                    @Thickness, @Density,
                    @ReleaseGSM, @AdhesiveGSM, @TotalGSM,
                    @ISItemActive, @CompanyID, @UserID, @FYear, @CreatedBy, @CreatedDate, 0
                )";

            var insertDetailSql = @"
                INSERT INTO ItemMasterDetails (
                    ItemID, ParentFieldName, ParentFieldValue, FieldName, FieldValue, SequenceNo,
                    ItemGroupID, CompanyID, UserID, FYear, CreatedBy, CreatedDate, IsDeletedTransaction
                ) VALUES (
                    @ItemID, @ParentFieldName, @ParentFieldValue, @FieldName, @FieldValue, @SequenceNo,
                    @ItemGroupID, @CompanyID, @UserID, @FYear, @CreatedBy, @CreatedDate, 0
                )";

            foreach (var item in items)
            {
                maxItemNo++;
                string itemCode = $"{itemGroup.ItemGroupPrefix}{maxItemNo.ToString().PadLeft(5, '0')}";

                // Calculate or use existing ItemSize
                // Use ItemSize from frontend if already set, otherwise calculate from SizeW and SizeL
                string? itemSize = item.ItemSize;
                if (string.IsNullOrEmpty(itemSize) && item.SizeW.HasValue && item.SizeL.HasValue)
                {
                    itemSize = $"{item.SizeW} X {item.SizeL}";
                }

                // Generate ItemDescription from formula pattern
                var descriptionParts = new List<string>();
                if (!string.IsNullOrEmpty(item.ItemType)) descriptionParts.Add($"ItemType:{item.ItemType}");
                if (!string.IsNullOrEmpty(item.InkColour)) descriptionParts.Add($"InkColour:{item.InkColour}");
                if (!string.IsNullOrEmpty(item.PantoneCode)) descriptionParts.Add($"PantoneCode:{item.PantoneCode}");
                if (!string.IsNullOrEmpty(item.Quality)) descriptionParts.Add($"Quality:{item.Quality}");
                if (item.GSM.HasValue) descriptionParts.Add($"GSM:{item.GSM}");
                if (item.ReleaseGSM.HasValue) descriptionParts.Add($"ReleaseGSM:{item.ReleaseGSM}");
                if (item.AdhesiveGSM.HasValue) descriptionParts.Add($"AdhesiveGSM:{item.AdhesiveGSM}");
                if (!string.IsNullOrEmpty(item.Manufecturer)) descriptionParts.Add($"Manufecturer:{item.Manufecturer}");
                if (!string.IsNullOrEmpty(item.Finish)) descriptionParts.Add($"Finish:{item.Finish}");
                if (item.SizeW.HasValue) descriptionParts.Add($"SizeW:{item.SizeW}");
                if (item.SizeL.HasValue) descriptionParts.Add($"SizeL:{item.SizeL}");
                if (item.Caliper.HasValue) descriptionParts.Add($"Caliper:{item.Caliper}");
                string itemDescription = string.Join(", ", descriptionParts);

                // Use provided ItemType or derive from context
                string itemType = item.ItemType ?? item.StockCategory?.ToUpper() ??
                    (itemGroupId == 4 ? "Varnish" : itemGroupId == 5 ? "LAMINATION FILM" : itemGroupId == 8 ? "OTHER MATERIAL" : itemGroupId == 13 ? "Paper" : "PAPER");

                // Lookup ProductHSNID
                int productHSNID = 0;
                if (!string.IsNullOrWhiteSpace(item.HSNGroup) &&
                    hsnGroupMapping.TryGetValue(item.HSNGroup.Trim(), out int hsnId))
                {
                    productHSNID = hsnId;
                }
                else if (!string.IsNullOrWhiteSpace(item.ProductHSNName) &&
                         hsnGroupMapping.TryGetValue(item.ProductHSNName.Trim(), out int hsnIdByName))
                {
                     // Fallback to ProductHSNName if HSNGroup is empty
                     productHSNID = hsnIdByName;
                }

                // Lookup ItemSubGroupID
                int itemSubGroupID = 0;
                if (!string.IsNullOrWhiteSpace(item.ItemSubGroupName) &&
                    itemSubGroupMapping.TryGetValue(item.ItemSubGroupName.Trim(), out int subGroupId))
                {
                    itemSubGroupID = subGroupId;
                }

                // INSERT INTO ItemMaster
                var itemIdObj = await _connection.ExecuteScalarAsync<object>(insertMasterSql, new
                {
                    ItemName = item.ItemName ?? (object)DBNull.Value,
                    ItemCode = itemCode,
                    MaxItemNo = maxItemNo,
                    ItemCodePrefix = itemGroup.ItemGroupPrefix ?? (object)DBNull.Value,
                    ItemGroupID = itemGroupId,
                    ProductHSNID = productHSNID > 0 ? productHSNID : (object)DBNull.Value,
                    StockUnit = item.StockUnit ?? (object)DBNull.Value,
                    PurchaseUnit = item.PurchaseUnit ?? (object)DBNull.Value,
                    EstimationUnit = item.EstimationUnit ?? (object)DBNull.Value,
                    EstimationRate = item.EstimationRate ?? (object)DBNull.Value,
                    UnitPerPacking = item.UnitPerPacking ?? (object)DBNull.Value,
                    WtPerPacking = item.WtPerPacking ?? (object)DBNull.Value,
                    ConversionFactor = item.ConversionFactor ?? (object)DBNull.Value,
                    ItemSubGroupID = itemSubGroupID > 0 ? itemSubGroupID : (object)DBNull.Value,
                    StockType = item.StockType ?? (object)DBNull.Value,
                    StockCategory = item.StockCategory ?? (object)DBNull.Value,
                    ItemType = itemType,
                    SizeW = item.SizeW ?? (object)DBNull.Value,
                    SizeL = item.SizeL ?? (object)DBNull.Value,
                    ItemSize = itemSize ?? (object)DBNull.Value,
                    PurchaseRate = item.PurchaseRate ?? (object)DBNull.Value,
                    StockRefCode = item.StockRefCode ?? (object)DBNull.Value,
                    ItemDescription = itemDescription ?? (object)DBNull.Value,
                    Quality = item.Quality ?? (object)DBNull.Value,
                    GSM = item.GSM ?? (object)DBNull.Value,
                    Manufecturer = item.Manufecturer ?? (object)DBNull.Value,
                    Finish = item.Finish ?? (object)DBNull.Value,
                    ManufecturerItemCode = item.ManufecturerItemCode ?? (object)DBNull.Value,
                    Caliper = item.Caliper ?? (object)DBNull.Value,
                    ShelfLife = item.ShelfLife ?? (object)DBNull.Value,
                    MinimumStockQty = item.MinimumStockQty ?? (object)DBNull.Value,
                    IsStandardItem = item.IsStandardItem ?? (object)DBNull.Value,
                    IsRegularItem = item.IsRegularItem ?? (object)DBNull.Value,
                    PackingType = item.PackingType ?? (object)DBNull.Value,
                    BF = item.BF ?? (object)DBNull.Value,
                    InkColour = item.InkColour ?? (object)DBNull.Value,
                    PantoneCode = item.PantoneCode ?? (object)DBNull.Value,
                    PurchaseOrderQuantity = item.PurchaseOrderQuantity ?? (object)DBNull.Value,
                    Thickness = item.Thickness ?? (object)DBNull.Value,
                    Density = item.Density ?? (object)DBNull.Value,
                    ReleaseGSM = item.ReleaseGSM ?? (object)DBNull.Value,
                    AdhesiveGSM = item.AdhesiveGSM ?? (object)DBNull.Value,
                    TotalGSM = item.TotalGSM ?? (object)DBNull.Value,
                    ISItemActive = 1,
                    CompanyID = 2,
                    UserID = 2,
                    FYear = "2025-2026",
                    CreatedBy = 2,
                    CreatedDate = DateTime.Now
                }, transaction: transaction);

                int newItemId = Convert.ToInt32(itemIdObj);

                // INSERT INTO ItemMasterDetails - Add ALL fields as separate rows
                int seq = 1;
                var detailFields = new List<(string FieldName, string FieldValue)>();

                // Add all Excel fields to ItemMasterDetails
                if (!string.IsNullOrEmpty(item.BF))
                    detailFields.Add(("BF", item.BF));
                if (!string.IsNullOrEmpty(item.InkColour))
                    detailFields.Add(("InkColour", item.InkColour));
                if (!string.IsNullOrEmpty(item.PantoneCode))
                    detailFields.Add(("PantoneCode", item.PantoneCode));
                if (!string.IsNullOrEmpty(item.ItemType))
                    detailFields.Add(("ItemType", item.ItemType));
                if (itemSubGroupID > 0)
                    detailFields.Add(("ItemSubGroupID", itemSubGroupID.ToString()));
                if (!string.IsNullOrEmpty(item.StockType))
                    detailFields.Add(("StockType", item.StockType));
                if (item.PurchaseOrderQuantity.HasValue)
                    detailFields.Add(("PurchaseOrderQuantity", item.PurchaseOrderQuantity.ToString()!));
                if (!string.IsNullOrEmpty(item.Quality))
                    detailFields.Add(("Quality", item.Quality));
                if (item.GSM.HasValue)
                    detailFields.Add(("GSM", item.GSM.ToString()!));
                if (!string.IsNullOrEmpty(item.Manufecturer))
                    detailFields.Add(("Manufecturer", item.Manufecturer));
                if (!string.IsNullOrEmpty(item.Finish))
                    detailFields.Add(("Finish", item.Finish));
                if (!string.IsNullOrEmpty(item.ManufecturerItemCode))
                    detailFields.Add(("ManufecturerItemCode", item.ManufecturerItemCode));
                if (item.Caliper.HasValue)
                    detailFields.Add(("Caliper", item.Caliper.ToString()!));
                if (item.SizeW.HasValue)
                    detailFields.Add(("SizeW", item.SizeW.ToString()!));
                if (item.SizeL.HasValue)
                    detailFields.Add(("SizeL", item.SizeL.ToString()!));
                if (!string.IsNullOrEmpty(item.PurchaseUnit))
                    detailFields.Add(("PurchaseUnit", item.PurchaseUnit));
                if (item.PurchaseRate.HasValue)
                    detailFields.Add(("PurchaseRate", item.PurchaseRate.ToString()!));
                if (item.ShelfLife.HasValue)
                    detailFields.Add(("ShelfLife", item.ShelfLife.ToString()!));
                if (!string.IsNullOrEmpty(item.EstimationUnit))
                    detailFields.Add(("EstimationUnit", item.EstimationUnit));
                if (item.EstimationRate.HasValue)
                    detailFields.Add(("EstimationRate", item.EstimationRate.ToString()!));
                if (!string.IsNullOrEmpty(item.StockUnit))
                    detailFields.Add(("StockUnit", item.StockUnit));
                if (item.MinimumStockQty.HasValue)
                    detailFields.Add(("MinimumStockQty", item.MinimumStockQty.ToString()!));
                if (item.IsStandardItem.HasValue)
                    detailFields.Add(("IsStandardItem", item.IsStandardItem.ToString()!));
                if (item.IsRegularItem.HasValue)
                    detailFields.Add(("IsRegularItem", item.IsRegularItem.ToString()!));
                if (!string.IsNullOrEmpty(item.PackingType))
                    detailFields.Add(("PackingType", item.PackingType));
                if (item.UnitPerPacking.HasValue)
                    detailFields.Add(("UnitPerPacking", item.UnitPerPacking.ToString()!));
                if (item.WtPerPacking.HasValue)
                    detailFields.Add(("WtPerPacking", item.WtPerPacking.ToString()!));
                if (!string.IsNullOrEmpty(itemSize))
                    detailFields.Add(("ItemSize", itemSize));
                if (productHSNID > 0)
                {
                    detailFields.Add(("ProductHSNID", productHSNID.ToString()));
                    // Insert ProductHSNName with ProductHSNID as value
                    detailFields.Add(("ProductHSNName", productHSNID.ToString()));
                }
                if (item.Thickness.HasValue)
                    detailFields.Add(("Thickness", item.Thickness.ToString()!));
                if (item.Density.HasValue)
                    detailFields.Add(("Density", item.Density.ToString()!));
                if (item.ReleaseGSM.HasValue)
                    detailFields.Add(("ReleaseGSM", item.ReleaseGSM.ToString()!));
                if (item.AdhesiveGSM.HasValue)
                    detailFields.Add(("AdhesiveGSM", item.AdhesiveGSM.ToString()!));
                if (item.TotalGSM.HasValue)
                    detailFields.Add(("TotalGSM", item.TotalGSM.ToString()!));
                if (!string.IsNullOrEmpty(item.StockRefCode))
                    detailFields.Add(("StockRefCode", item.StockRefCode));
                if (!string.IsNullOrEmpty(item.CertificationType))
                    detailFields.Add(("CertificationType", item.CertificationType));

                // Add ISItemActive as default
                detailFields.Add(("ISItemActive", "True"));

                // Insert all detail fields
                foreach (var field in detailFields)
                {
                    await _connection.ExecuteAsync(insertDetailSql, new
                    {
                        ItemID = newItemId,
                        ParentFieldName = field.FieldName,
                        ParentFieldValue = field.FieldValue,
                        FieldName = field.FieldName,
                        FieldValue = field.FieldValue,
                        SequenceNo = seq++,
                        ItemGroupID = itemGroupId,
                        CompanyID = 2,
                        UserID = 2,
                        FYear = "2025-2026",
                        CreatedBy = 2,
                        CreatedDate = DateTime.Now
                    }, transaction: transaction);
                }

                successCount++;
            }

            await transaction.CommitAsync();

            result.Success = true;
            result.Message = $"Successfully imported {successCount} item(s)";
            result.ImportedRows = successCount;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            result.Success = false;
            result.Message = $"Import failed: {ex.Message}";
            try { System.IO.File.AppendAllText("debug_log.txt", $"[{DateTime.Now}] ItemService Import Exception: {ex.Message}\nStack: {ex.StackTrace}\n"); } catch { }
        }

        return result;
    }

    public async Task<List<ItemGroupDto>> GetItemGroupsAsync()
    {
        var query = @"
            SELECT ItemGroupID, ItemGroupName, ItemGroupPrefix,
                   ItemNameFormula, ItemDescriptionFormula
            FROM ItemGroupMaster
            WHERE CompanyID = 2 
              AND IsDeletedTransaction = 0
            ORDER BY ItemGroupName";

        var results = await _connection.QueryAsync<ItemGroupDto>(query);
        return results.ToList();
    }

    public async Task<List<HSNGroupDto>> GetHSNGroupsAsync()
    {
        var query = @"
            SELECT ProductHSNID, DisplayName, HSNCode
            FROM ProductHSNMaster
            WHERE IsDeletedTransaction = 0 
            AND DisplayName IS NOT NULL 
            AND DisplayName <> ''
            ORDER BY DisplayName";

        var results = await _connection.QueryAsync<HSNGroupDto>(query);
        return results.ToList();
    }

    public async Task<List<UnitDto>> GetUnitsAsync()
    {
        var query = @"
            SELECT UnitID, UnitSymbol
            FROM UnitMaster
            WHERE UnitSymbol IS NOT NULL 
            AND UnitSymbol <> ''
            ORDER BY UnitSymbol";

        var results = await _connection.QueryAsync<UnitDto>(query);
        return results.ToList();
    }

    public async Task<int> ClearAllItemDataAsync(string username, string password, string reason, int itemGroupId)
    {
        if (_connection.State != System.Data.ConnectionState.Open) await _connection.OpenAsync();

        // 1. Validate Credentials
        var userCheckQuery = @"
            SELECT COUNT(1) 
            FROM UserMaster 
            WHERE UserName = @Username AND ISNULL(Password, '') = @Password";

        var isValidUser = await _connection.ExecuteScalarAsync<bool>(userCheckQuery, new { Username = username, Password = password ?? string.Empty });

        if (!isValidUser)
        {
            try { await System.IO.File.AppendAllTextAsync("debug_log.txt", $"[{DateTime.Now}] ClearAllItemData Failed: Invalid credentials for user '{username}'. Reason: {reason}\n"); } catch { }
            throw new UnauthorizedAccessException("Invalid username or password.");
        }

        // 2. Perform Transactional Delete
        int deletedCount = 0;
        var transaction = await _connection.BeginTransactionAsync();
        try
        {
            // Delete from Details first (foreign key constraint)
            var deleteDetailQuery = @"
                DELETE imd 
                FROM ItemMasterDetails imd
                INNER JOIN ItemMaster im ON imd.ItemID = im.ItemID
                WHERE im.ItemGroupID = @ItemGroupID";
            
            await _connection.ExecuteAsync(deleteDetailQuery, new { ItemGroupID = itemGroupId }, transaction: transaction);

            // Delete from Master
            var deleteMasterQuery = "DELETE FROM ItemMaster WHERE ItemGroupID = @ItemGroupID";
            deletedCount = await _connection.ExecuteAsync(deleteMasterQuery, new { ItemGroupID = itemGroupId }, transaction: transaction);

            await transaction.CommitAsync();

            // 3. Log Audit
            try
            {
                var logMessage = $"[{DateTime.Now}] AUDIT: User '{username}' cleared {deletedCount} Item records for ItemGroupID {itemGroupId}. Reason: {reason}\n";
                await System.IO.File.AppendAllTextAsync("debug_log.txt", logMessage);
            }
            catch { }

            return deletedCount;
        }
        catch (Exception ex)
        {
            await transaction.RollbackAsync();
            try { await System.IO.File.AppendAllTextAsync("debug_log.txt", $"[{DateTime.Now}] ClearAllItemData Exception: {ex.Message}\n"); } catch { }
            throw;
        }
    }

    public async Task<List<ItemSubGroupDto>> GetItemSubGroupsAsync(int itemGroupId)
    {
        // Step 1: Fetch the dynamic query from ItemGroupFieldMaster
        var fieldQuery = @"
            SELECT SelectBoxQueryDB
            FROM ItemGroupFieldMaster
            WHERE ItemGroupID = @ItemGroupID
            AND FieldName = 'ItemSubGroupID'
            AND ISNULL(IsDeletedTransaction, 0) <> 1";

        var selectBoxQuery = await _connection.QueryFirstOrDefaultAsync<string>(
            fieldQuery, new { ItemGroupID = itemGroupId });

        if (string.IsNullOrWhiteSpace(selectBoxQuery))
        {
            return new List<ItemSubGroupDto>();
        }

        // Step 2: Replace # placeholders with single quotes (legacy DB pattern)
        var dynamicQuery = selectBoxQuery.Replace("#", "'");

        // Step 3: Execute the dynamic query and map results
        var results = await _connection.QueryAsync<ItemSubGroupDto>(dynamicQuery);
        return results.ToList();
    }

    private object? GetPropertyValue(object obj, string propertyName)
    {
        return obj.GetType().GetProperty(propertyName)?.GetValue(obj);
    }
}
