@echo off
attrib -r -s -h d:\BulkImportProject\.git\index
del /F /Q d:\BulkImportProject\.git\index
echo Status Index:
if exist d:\BulkImportProject\.git\index echo Index Still Exists
if not exist d:\BulkImportProject\.git\index echo Index Deleted

del /F /Q \\.\d:\BulkImportProject\nul
echo Status Nul:
if exist \\.\d:\BulkImportProject\nul echo Nul Still Exists
if not exist \\.\d:\BulkImportProject\nul echo Nul Deleted
