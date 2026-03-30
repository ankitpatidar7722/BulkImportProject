-- Check all Warehouses and their Bins in the system
-- This will help you see what WarehouseName and BinName combinations exist

-- 1. Show all warehouses
SELECT DISTINCT WarehouseName
FROM WarehouseMaster
WHERE ISNULL(IsDeletedTransaction, 0) = 0
ORDER BY WarehouseName;

-- 2. Show all warehouse-bin combinations
SELECT WarehouseID, WarehouseName, BinName
FROM WarehouseMaster
WHERE ISNULL(IsDeletedTransaction, 0) = 0
ORDER BY WarehouseName, BinName;

-- 3. Check if 'INK' bin exists (case-insensitive search)
SELECT WarehouseID, WarehouseName, BinName
FROM WarehouseMaster
WHERE BinName LIKE '%INK%'
  AND ISNULL(IsDeletedTransaction, 0) = 0
ORDER BY WarehouseName, BinName;

-- 4. Check warehouses that contain 'STORE' in their name
SELECT WarehouseID, WarehouseName, BinName
FROM WarehouseMaster
WHERE WarehouseName LIKE '%STORE%'
  AND ISNULL(IsDeletedTransaction, 0) = 0
ORDER BY WarehouseName, BinName;

-- 5. Show bins for a specific warehouse (replace 'YOUR_WAREHOUSE_NAME' with actual name)
-- SELECT WarehouseID, WarehouseName, BinName
-- FROM WarehouseMaster
-- WHERE WarehouseName = 'STORE WAREHOUSE'  -- Use exact name from your Excel
--   AND ISNULL(IsDeletedTransaction, 0) = 0
-- ORDER BY BinName;
