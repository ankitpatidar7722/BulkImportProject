-- ============================================================
-- Performance Indexes for BulkImport Project
-- Run these once on the SQL Server database.
-- Each is guarded with IF NOT EXISTS so safe to re-run.
-- ============================================================

-- 1. LedgerMaster: speed up filtering by LedgerGroupID (Load Data / Validate)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE  name = 'IX_LedgerMaster_LedgerGroupID'
      AND  object_id = OBJECT_ID('LedgerMaster')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_LedgerMaster_LedgerGroupID
    ON LedgerMaster (LedgerGroupID)
    INCLUDE (LedgerName, GSTNo, IsDeletedTransaction);
    PRINT 'Index IX_LedgerMaster_LedgerGroupID created.';
END
ELSE
    PRINT 'Index IX_LedgerMaster_LedgerGroupID already exists.';

-- 2. LedgerMasterDetails: speed up the batch fetch by LedgerID + FieldName
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE  name = 'IX_LedgerMasterDetails_LedgerID_FieldName'
      AND  object_id = OBJECT_ID('LedgerMasterDetails')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_LedgerMasterDetails_LedgerID_FieldName
    ON LedgerMasterDetails (LedgerID, FieldName)
    INCLUDE (FieldValue, IsDeletedTransaction);
    PRINT 'Index IX_LedgerMasterDetails_LedgerID_FieldName created.';
END
ELSE
    PRINT 'Index IX_LedgerMasterDetails_LedgerID_FieldName already exists.';

-- 3. ItemMaster: speed up filtering by ItemGroupID (Load Data)
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE  name = 'IX_ItemMaster_ItemGroupID'
      AND  object_id = OBJECT_ID('ItemMaster')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_ItemMaster_ItemGroupID
    ON ItemMaster (ItemGroupID)
    INCLUDE (ItemName, IsDeletedTransaction);
    PRINT 'Index IX_ItemMaster_ItemGroupID created.';
END
ELSE
    PRINT 'Index IX_ItemMaster_ItemGroupID already exists.';

-- 4. ItemMasterDetails: speed up batch detail fetch by ItemID
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE  name = 'IX_ItemMasterDetails_ItemID'
      AND  object_id = OBJECT_ID('ItemMasterDetails')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_ItemMasterDetails_ItemID
    ON ItemMasterDetails (ItemID)
    INCLUDE (FieldName, FieldValue, IsDeletedTransaction);
    PRINT 'Index IX_ItemMasterDetails_ItemID created.';
END
ELSE
    PRINT 'Index IX_ItemMasterDetails_ItemID already exists.';
