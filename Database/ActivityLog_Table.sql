-- Activity Log Table for Company Subscription Module
-- Tracks all user actions and changes in the Company Subscription page

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ActivityLog')
BEGIN
    CREATE TABLE ActivityLog (
        ActivityLogID INT IDENTITY(1,1) PRIMARY KEY,

        -- User Information
        WebUserId INT NULL,
        WebUserName NVARCHAR(100) NOT NULL,
        LoginType NVARCHAR(20) NOT NULL DEFAULT 'indus',

        -- Action Details
        ActionType NVARCHAR(50) NOT NULL, -- 'Create', 'Update', 'Delete', 'View', 'Export', etc.
        ModuleName NVARCHAR(100) NOT NULL DEFAULT 'Company Subscription',
        EntityName NVARCHAR(100) NULL, -- 'Subscription', 'Client', 'Message', etc.
        EntityID INT NULL,

        -- Action Description
        ActionDescription NVARCHAR(500) NOT NULL,

        -- Change Tracking
        OldValue NVARCHAR(MAX) NULL, -- JSON format for old values
        NewValue NVARCHAR(MAX) NULL, -- JSON format for new values

        -- Additional Context
        IPAddress NVARCHAR(50) NULL,
        UserAgent NVARCHAR(500) NULL,

        -- Timestamps
        CreatedDate DATETIME NOT NULL DEFAULT GETDATE(),

        -- Status
        IsSuccess BIT NOT NULL DEFAULT 1,
        ErrorMessage NVARCHAR(MAX) NULL,

        -- Indexing
        INDEX IX_ActivityLog_WebUserId (WebUserId),
        INDEX IX_ActivityLog_WebUserName (WebUserName),
        INDEX IX_ActivityLog_ActionType (ActionType),
        INDEX IX_ActivityLog_CreatedDate (CreatedDate DESC),
        INDEX IX_ActivityLog_EntityName_EntityID (EntityName, EntityID)
    );

    PRINT 'ActivityLog table created successfully.';
END
ELSE
BEGIN
    PRINT 'ActivityLog table already exists.';
END
GO
