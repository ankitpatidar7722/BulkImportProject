Imports System.Web
Imports System.Web.Services
Imports System.Web.Services.Protocols
Imports System.Data
Imports System.Data.SqlClient
Imports System.Web.Script.Services
Imports System.Web.Script.Serialization
Imports Connection

' To allow this Web Service to be called from script, using ASP.NET AJAX, uncomment the following line.
<System.Web.Script.Services.ScriptService()>
<WebService(Namespace:="http://tempuri.org/")>
<WebServiceBinding(ConformsTo:=WsiProfiles.BasicProfile1_1)>
<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Public Class WebServiceItemPhysicalVerification
    Inherits System.Web.Services.WebService

    Dim db As New DBConnection
    Dim js As New JavaScriptSerializer()
    Dim data As New HelloWorldData()
    Dim dataTable As New DataTable()
    Dim str As String

    Dim GBLUserID As String
    Dim GBLUserName As String
    Dim GBLCompanyID As String
    Dim GBLFYear As String
    Dim DBType As String = ""

    Private Function ConvertDataTableTojSonString(ByVal dataTable As DataTable) As String
        Dim serializer As New System.Web.Script.Serialization.JavaScriptSerializer With {
            .MaxJsonLength = 2147483647
        }
        Dim tableRows As New List(Of Dictionary(Of [String], [Object]))()
        Dim row As Dictionary(Of [String], [Object])
        For Each dr As DataRow In dataTable.Rows
            row = New Dictionary(Of [String], [Object])()
            For Each col As DataColumn In dataTable.Columns
                row.Add(col.ColumnName, dr(col))
                System.Console.WriteLine(dr(col))
            Next
            tableRows.Add(row)
        Next
        Return serializer.Serialize(tableRows)
    End Function

    '-----------------------------------Get Supplier List From Purchase------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function PhysicalStockData() As String
        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            'str = "SELECT Isnull(Temp.GRNTransactionID,0) AS ParentTransactionID,Isnull(IM.ItemID,0) AS ItemID,Isnull(IM.ItemGroupID,0) AS ItemGroupID,Isnull(ISGM.ItemSubGroupID,0) AS ItemSubGroupID,Isnull(Temp.WarehouseID,0) AS WarehouseID,Nullif(IGM.ItemGroupName,'') AS ItemGroupName,Nullif(ISGM.ItemSubGroupName,'') AS ItemSubGroupName,Nullif(IM.ItemCode,'') AS ItemCode,Nullif(IM.ItemName,'') AS ItemName,Nullif(IM.ItemDescription,'') AS ItemDescription,Nullif(IM.StockUnit,'') AS StockUnit,Isnull(Temp.ClosingQty,0) AS BatchStock,Isnull(IM.PhysicalStock,0) AS TotalPhysicalStock,Isnull(IM.BookedStock,0) AS TotalBookedStock,Isnull(IM.AllocatedStock,0) AS TotalAllocatedStock,Isnull(IM.UnapprovedStock,0) AS TotalUnapprovedStock,0 AS TotalFreeStock,Isnull(IM.IncomingStock,0) AS TotalIncomingStock,0 AS TotalOutgoingStock,Isnull(IM.FloorStock,0) AS TotalFloorStock,0 AS TotalTheoriticalStock,0 AS TotalPhysicalStockValue,0 AS TotalBookedStockValue,0 AS TotalAllocatedStockValue,0 AS TotalUnapprovedStockValue,0 AS TotalFreeStockValue,0 AS TotalIncomingStockValue,0 AS TotalOutgoingStockValue,0 AS TotalFloorStockValue,0 AS TotalTheoriticalStockValue,Nullif(Temp.GRNNo,'') AS GRNNo,Nullif(Temp.GRNDate,'') AS GRNDate,Nullif(Temp.BatchNo,'') AS BatchNo,Nullif(Temp.WarehouseName,'') AS Warehouse,Nullif(Temp.BinName,'') AS Bin,Isnull(IM.WtPerPacking,0) AS WtPerPacking,Isnull(IM.UnitPerPacking,1) AS UnitPerPacking,Isnull(IM.ConversionFactor,1) AS ConversionFactor,Isnull(UOM.DecimalPlace,0) AS UnitDecimalPlace  " &
            '      " From ItemMaster AS IM INNER JOIN ItemGroupMaster AS IGM ON IGM.ItemGroupID=IM.ItemGroupID AND IGM.CompanyID=IM.CompanyID LEFT JOIN ItemSubGroupMaster AS ISGM ON ISGM.ItemSubGroupID=IM.ItemSubGroupID AND ISGM.CompanyID=IM.CompanyID LEFT JOIN UnitMaster AS UOM ON UOM.UnitSymbol=IM.StockUnit AND UOM.CompanyID=IM.CompanyID LEFT JOIN (Select Isnull(IM.CompanyID,0) AS CompanyID,Isnull(IM.ItemID,0) AS ItemID,Isnull(ITD.ParentTransactionID,0) AS GRNTransactionID,ISNULL(SUM(Isnull(ITD.ReceiptQuantity,0)), 0) - ISNULL(SUM(Isnull(ITD.IssueQuantity,0)), 0) AS ClosingQty,Nullif(ITD.BatchNo,'') AS BatchNo,Nullif('','') AS Pallet_No,Isnull(ITD.WarehouseID,0) AS WarehouseID,Nullif(WM.WarehouseName,'') AS WarehouseName,Nullif(WM.BinName,'') AS BinName,Nullif(IT.VoucherNo,'') AS GRNNo,Replace(Convert(varchar(13),IT.VoucherDate,106),' ','-') AS GRNDate From ItemTransactionMain AS ITM INNER JOIN ItemTransactionDetail AS ITD ON ITM.TransactionID=ITD.TransactionID AND ITM.CompanyID=ITD.CompanyID AND ITM.VoucherID NOT IN(-8,-9,-11) AND Isnull(ITD.IsDeletedTransaction,0)=0 INNER JOIN ItemMaster AS IM ON IM.ItemID=ITD.ItemID AND IM.CompanyID=ITD.CompanyID  " &
            '      " INNER JOIN ItemTransactionMain AS IT ON IT.TransactionID=ITD.ParentTransactionID AND IT.CompanyID=ITD.CompanyID INNER JOIN WarehouseMaster AS WM ON WM.WarehouseID=ITD.WarehouseID AND WM.CompanyID=ITD.CompanyID Where IM.CompanyID=" & GBLCompanyID & " GROUP BY Isnull(IM.ItemID,0),Isnull(ITD.ParentTransactionID,0),Nullif(ITD.BatchNo,''),Isnull(ITD.WarehouseID,0),Nullif(WM.WarehouseName,''),Nullif(WM.BinName,''),Nullif(IT.VoucherNo,''),Replace(Convert(varchar(13),IT.VoucherDate,106),' ','-'),Isnull(IM.CompanyID,0) HAVING ((ISNULL(SUM(Isnull(ITD.ReceiptQuantity,0)), 0) - ISNULL(SUM(Isnull(ITD.IssueQuantity,0)), 0)) > 0)) AS Temp ON Temp.ItemID=IM.ItemID AND Temp.CompanyID=IM.CompanyID Where IM.CompanyID=" & GBLCompanyID & " Order by Isnull(Temp.ClosingQty,0) Desc,Isnull(IM.ItemGroupID,0),Nullif(IM.ItemName,'')"

            If DBType = "MYSQL" Then
                str = "SELECT 0 AS ParentTransactionID,IFNULL(IM.ItemID,0) AS ItemID,IFNULL(IM.ItemGroupID,0) AS ItemGroupID,IFNULL(ISGM.ItemSubGroupID,0) AS ItemSubGroupID,0 AS WarehouseID,Nullif(IM.ItemCode,'') AS ItemCode,Nullif(IGM.ItemGroupName,'') AS ItemGroupName,Nullif(ISGM.ItemSubGroupName,'') AS ItemSubGroupName,Nullif(IM.ItemName,'') AS ItemName,Nullif(IM.ItemDescription,'') AS ItemDescription,Nullif(IM.StockUnit,'') AS StockUnit,0 AS BatchStock,IFNULL(IM.PhysicalStock,0) AS PhysicalStock,IFNULL(IM.BookedStock,0) AS BookedStock,IFNULL(IM.AllocatedStock,0) AS AllocatedStock,IFNULL(IM.UnapprovedStock,0) AS UnapprovedStock,0 AS FreeStock,IFNULL(IM.IncomingStock,0) AS IncomingStock,0 AS OutgoingStock,IFNULL(IM.FloorStock,0) AS FloorStock,0 AS TheoriticalStock,0 AS PhysicalStockValue,0 AS BookedStockValue,0 AS AllocatedStockValue,0 AS UnapprovedStockValue,0 AS FreeStockValue,0 AS IncomingStockValue,0 AS OutgoingStockValue,0 AS FloorStockValue,0 AS TheoriticalStockValue,Nullif('','') AS GRNNo,Nullif('','') AS GRNDate,0 AS BatchID,Nullif('','') AS BatchNo,Nullif('','') AS SupplierBatchNo,Null as MfgDate,Null AS ExpiryDate,Nullif('','') AS Warehouse,Nullif('','') AS Bin,IFNULL(IM.WtPerPacking,0) AS WtPerPacking,IFNULL(IM.UnitPerPacking,1) AS UnitPerPacking,IFNULL(IM.ConversionFactor,1) AS ConversionFactor,IFNULL(UOM.DecimalPlace,0) AS UnitDecimalPlace " &
                      " From ItemMaster AS IM INNER JOIN ItemGroupMaster AS IGM ON IGM.ItemGroupID=IM.ItemGroupID AND IGM.CompanyID=IM.CompanyID And IFNULL(IM.IsDeletedTransaction,0)=0 LEFT JOIN ItemSubGroupMaster AS ISGM ON ISGM.ItemSubGroupID=IM.ItemSubGroupID AND ISGM.CompanyID=IM.CompanyID LEFT JOIN UnitMaster AS UOM ON UOM.UnitSymbol=IM.StockUnit AND UOM.CompanyID=IM.CompanyID " &
                      " Where IM.CompanyID=" & GBLCompanyID & " Order By IFNULL(IM.ItemGroupID,0),Nullif(IM.ItemName,'')"
            Else
                'str = "SELECT Distinct 0 AS ParentTransactionID,Isnull(IM.ItemID,0) AS ItemID,Isnull(IM.ItemGroupID,0) AS ItemGroupID,Isnull(ISGM.ItemSubGroupID,0) AS ItemSubGroupID,0 AS WarehouseID,Nullif(IM.ItemCode,'') AS ItemCode,IM.Quality,IM.GSM,IM.Manufecturer,IM.Finish,IM.SizeW,IM.SizeL,Nullif(IGM.ItemGroupName,'') AS ItemGroupName,Nullif(ISGM.ItemSubGroupName,'') AS ItemSubGroupName,Nullif(IM.ItemName,'') AS ItemName,Nullif(IM.ItemDescription,'') AS ItemDescription,Nullif(IM.StockUnit,'') AS StockUnit,Nullif(IM.PurchaseUnit,'') AS PurchaseUnit,0 AS BatchStock,Isnull(IM.PhysicalStock,0) AS PhysicalStock,Isnull(IM.BookedStock,0) AS BookedStock,Isnull(IM.AllocatedStock,0) AS AllocatedStock,Isnull(IM.UnapprovedStock,0) AS UnapprovedStock,0 AS FreeStock,Isnull(IM.IncomingStock,0) AS IncomingStock,0 AS OutgoingStock,Isnull(IM.FloorStock,0) AS FloorStock,0 AS TheoriticalStock,0 AS PhysicalStockValue,0 AS BookedStockValue,0 AS AllocatedStockValue,0 AS UnapprovedStockValue,0 AS FreeStockValue,0 AS IncomingStockValue,0 AS OutgoingStockValue,0 AS FloorStockValue,0 AS TheoriticalStockValue,Nullif('','') AS GRNNo,Nullif('','') AS GRNDate,0 AS BatchID,Nullif('','') AS BatchNo,Nullif('','') AS SupplierBatchNo,Null as MfgDate,Null AS ExpiryDate,Nullif('','') AS Warehouse,Nullif('','') AS Bin,Isnull(IM.WtPerPacking,0) AS WtPerPacking,Isnull(IM.UnitPerPacking,1) AS UnitPerPacking,Isnull(IM.ConversionFactor,1) AS ConversionFactor,Isnull(UOM.DecimalPlace,0) AS UnitDecimalPlace,   CAST(ISNULL(IM.PhysicalStock, 0) / NULLIF(IM.UnitPerPacking, 0) AS VARCHAR(50))  + ISNULL(IM.PackingType, '') +'('+ CAST(ISNULL(IM.UnitPerPacking, 0) AS VARCHAR(50)) + ')' AS PhysicalStockPerUnitWithPackingType  " &
                '  " From ItemMaster AS IM INNER JOIN ItemGroupMaster AS IGM ON IGM.ItemGroupID=IM.ItemGroupID AND IGM.CompanyID=IM.CompanyID And Isnull(IGM.IsDeletedTransaction,0)=0 LEFT JOIN ItemSubGroupMaster AS ISGM ON ISGM.ItemSubGroupID=IM.ItemSubGroupID AND ISGM.CompanyID=IM.CompanyID And Isnull(ISGM.IsDeletedTransaction,0)=0 LEFT JOIN UnitMaster AS UOM ON UOM.UnitSymbol=IM.StockUnit AND UOM.CompanyID=IM.CompanyID And Isnull(UOM.IsDeletedTransaction,0)=0 Where IM.CompanyID=" & GBLCompanyID & " And Isnull(IM.IsDeletedTransaction,0)=0 Order By Isnull(IM.ItemGroupID,0),Nullif(IM.ItemName,'')"
                str = "SELECT Distinct 0 AS ParentTransactionID,Isnull(IM.ItemID,0) AS ItemID, Isnull(IM.ItemGroupID,0) AS ItemGroupID,Isnull(ISGM.ItemSubGroupID,0) AS ItemSubGroupID,0 AS WarehouseID,Nullif(IM.ItemCode,'') AS ItemCode,Nullif(IGM.ItemGroupName,'') AS ItemGroupName,Nullif(ISGM.ItemSubGroupName,'') AS ItemSubGroupName,Nullif(IM.ItemName,'') AS ItemName,IM.Quality,IM.GSM,IM.Manufecturer,IM.Finish,IM.SizeW,IM.SizeL,Nullif(IM.StockUnit,'') AS StockUnit,0 AS BatchStock,Isnull(IM.PhysicalStock,0) AS PhysicalStock,CASE WHEN ISNULL(IM.PhysicalStock, 0) = 0 THEN 0 ELSE ([dbo].CONVERT_UNIT_QUANTITY_UNIT1_TO_UNIT2(Isnull(IM.ItemID,0), Isnull(IM.PhysicalStock,0),Isnull(IM.WtPerPacking,0),ISNULL(IM.StockUnit,''),ISnull(IM.PurchaseUnit,''))) END AS PhysicalStockPU,Isnull(IM.BookedStock,0) AS BookedStock,Isnull(IM.AllocatedStock,0) AS AllocatedStock,Isnull(IM.UnapprovedStock,0) AS UnapprovedStock,ISNULL(IM.PurchaseUnit,0) as  PurchaseUnit,Isnull(IM.PhysicalStock,0)-Isnull(IM.AllocatedStock,0) AS FreeStock,Isnull(IM.IncomingStock,0) AS IncomingStock,isnull(IM.PackingType,'') As PackingType,0 AS OutgoingStock,Isnull(IM.FloorStock,0) AS FloorStock,Isnull(IM.PhysicalStock,0)-Isnull(IM.AllocatedStock,0)+Isnull(IM.IncomingStock,0)-Isnull(IM.BookedStock,0) AS TheoriticalStock,Isnull(IM.WtPerPacking,0) AS WtPerPacking,Isnull(IM.UnitPerPacking,1) AS UnitPerPacking,Isnull(IM.ConversionFactor,1) AS ConversionFactor,Isnull(UOM.DecimalPlace,0) AS UnitDecimalPlace,IM.ManufecturerItemCode, Nullif(IM. StockRefCode,'') AS  StockRefCode, CASE WHEN ISNULL(IM.IncomingStock, 0) = 0 THEN 0 ELSE ([dbo].CONVERT_UNIT_QUANTITY_UNIT1_TO_UNIT2(Isnull(IM.ItemID,0), Isnull(IM.IncomingStock,0),Isnull(IM.WtPerPacking,0),ISNULL(IM.PurchaseUnit,0),ISnull(IM.StockUnit,0))) END AS IncomingStockInSU,CASE WHEN ISNULL(IM.UnitPerPacking, 0) = 0 THEN '0'ELSE CAST(ISNULL(IM.PhysicalStock, 0) / IM.UnitPerPacking AS VARCHAR(50)) END + ISNULL(IM.PackingType, '') + '( ' + CAST(ISNULL(IM.UnitPerPacking, 0) AS VARCHAR(50)) + ')' AS PhysicalStockPerUnitWithPackingType" &
                      " From ItemMaster AS IM INNER JOIN ItemGroupMaster AS IGM ON IGM.ItemGroupID=IM.ItemGroupID AND IGM.CompanyID=IM.CompanyID And Isnull(IGM.IsDeletedTransaction,0)=0 LEFT JOIN ItemSubGroupMaster AS ISGM ON ISGM.ItemSubGroupID=IM.ItemSubGroupID AND ISGM.CompanyID=IM.CompanyID And ISNULL(ISGM.IsDeletedTransaction,0) = 0 LEFT JOIN UnitMaster AS UOM ON UOM.UnitSymbol=IM.StockUnit AND UOM.CompanyID=IM.CompanyID And ISNULL(UOM.IsDeletedTransaction,0) = 0 " &
                      " Where IM.CompanyID= " & GBLCompanyID & " And ISNULL(IM.IsDeletedTransaction,0) = 0Order By Nullif(IGM.ItemGroupName,'') ,Nullif(ISGM.ItemSubGroupName,'') , Nullif(IM.ItemCode,'')"
            End If

            db.FillDataTable(dataTable, str)
            data.Message = ConvertDataTableTojSonString(dataTable)
            js.MaxJsonLength = 2147483647
            Return js.Serialize(data.Message)
        Catch ex As Exception
            Return ex.Message
        End Try

    End Function

    '-----------------------------------Get Stock Batch wise Item List------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetStockBatchWise(ByVal ItemId As String) As String
        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            If DBType = "MYSQL" Then
                str = "SELECT IFNULL(IM.ItemID,0) AS ItemID,IFNULL(IM.ItemGroupID,0) AS ItemGroupID,IFNULL(IGM.ItemGroupNameID,0) AS ItemGroupNameID,IFNULL(ISGM.ItemSubGroupID,0) AS ItemSubGroupID,   IFNULL(Temp.ParentTransactionID,0) As ParentTransactionID,IFNULL(Temp.WarehouseID,0) As WarehouseID,Nullif(IGM.ItemGroupName,'') AS ItemGroupName,Nullif(ISGM.ItemSubGroupName,'') AS ItemSubGroupName,Nullif(IM.ItemCode,'') AS ItemCode,Nullif(IM.ItemName,'') AS ItemName,Nullif(IM.ItemDescription,'') AS ItemDescription, Nullif(IM.StockUnit,'') AS StockUnit,IFNULL(Temp.ClosingQty,0) AS BatchStock,0 AS IssueQuantity,Nullif(Temp.GRNNo,'') AS GRNNo,Convert(date_format(IfNULL(Temp.GRNDate,CURRENT_TIMESTAMP),'%d-%b-%Y'),char(13)) /*Replace(Convert(varchar(13),Temp.GRNDate,106),' ','-')*/ AS GRNDate,IFNULL(Temp.BatchID,0) AS BatchID,Nullif(Temp.BatchNo,'') AS BatchNo,Nullif(Temp.SupplierBatchNo,'') AS SupplierBatchNo,Nullif(Temp.MfgDate,'') AS MfgDate,Nullif(Temp.ExpiryDate,'') AS ExpiryDate,Nullif(Temp.WarehouseName,'') AS Warehouse,Nullif(Temp.BinName,'') AS Bin,IFNULL(IM.WtPerPacking,0) AS WtPerPacking,IFNULL(IM.UnitPerPacking,1) AS UnitPerPacking,IFNULL(IM.ConversionFactor,1) AS ConversionFactor   " &
                  " From ItemMaster As IM INNER JOIN ItemGroupMaster AS IGM ON IGM.ItemGroupID=IM.ItemGroupID And IGM.CompanyID=IM.CompanyID And IFNULL(IM.IsDeletedTransaction,0)=0 INNER JOIN (Select IFNULL(IM.CompanyID,0) AS CompanyID,IFNULL(IM.ItemID,0) AS ItemID,IFNULL(ITD.WarehouseID,0) AS WarehouseID,IFNULL(ITD.ParentTransactionID,0) AS ParentTransactionID,IFNULL(SUM(IFNULL(ITD.ReceiptQuantity,0)), 0) - IFNULL(SUM(IFNULL(ITD.IssueQuantity,0)), 0) - IFNULL(SUM(IFNULL(ITD.RejectedQuantity,0)), 0) AS ClosingQty,IFNULL(ITD.BatchID,0) AS BatchID,Nullif(ITD.BatchNo,'') AS BatchNo,Nullif(IBD.SupplierBatchNo,'') AS SupplierBatchNo,date_format(IBD.MfgDate,'%d-%b-%Y') AS MfgDate,date_format(IBD.ExpiryDate,'%d-%b-%Y') AS ExpiryDate,Nullif('','') AS Pallet_No,Nullif(WM.WarehouseName,'') AS WarehouseName,Nullif(WM.BinName,'') AS BinName,Nullif(IT.VoucherNo,'') AS GRNNo,date_format(IfNULL(IT.VoucherDate,CURRENT_TIMESTAMP),'%d-%b-%Y') /*Replace(Convert(varchar(13),IT.VoucherDate,106),' ','-')*/ AS GRNDate From ItemMaster As IM INNER JOIN ItemTransactionDetail As ITD On ITD.ItemID=IM.ItemID And ITD.CompanyID=IM.CompanyID And IFNULL(ITD.IsDeletedTransaction, 0)=0 And (IFNULL(ITD.ReceiptQuantity,0)>0 Or IFNULL(ITD.IssueQuantity,0)>0) INNER JOIN ItemTransactionMain As ITM On ITM.TransactionID=ITD.TransactionID And ITM.CompanyID=ITD.CompanyID And ITM.VoucherID Not In(-8, -9, -11)  INNER JOIN ItemTransactionMain AS IT ON IT.TransactionID=ITD.ParentTransactionID And IT.CompanyID=ITD.CompanyID INNER JOIN WarehouseMaster AS WM ON WM.WarehouseID=ITD.WarehouseID And WM.CompanyID=ITD.CompanyID INNER JOIN ItemTransactionBatchDetail AS IBD ON IBD.BatchID=ITD.BatchID And IBD.CompanyID=ITD.CompanyID " &
                  " Where ITD.CompanyID=" & GBLCompanyID & " And ITD.ItemID=" & ItemId & " Group BY IFNULL(IM.ItemID, 0),IFNULL(ITD.ParentTransactionID,0),IFNULL(ITD.BatchID,0),Nullif(ITD.BatchNo,''),Nullif(IBD.SupplierBatchNo,''),date_format(IBD.MfgDate,'%d-%b-%Y'),date_format(IBD.ExpiryDate,'%d-%b-%Y'),IFNULL(ITD.WarehouseID,0),Nullif(WM.WarehouseName,''),Nullif(WM.BinName,''),Nullif(IT.VoucherNo,''),date_format(IfNULL(IT.VoucherDate,CURRENT_TIMESTAMP),'%d-%b-%Y'),IFNULL(IM.CompanyID,0) HAVING(Round(IFNULL(SUM(IFNULL(ITD.ReceiptQuantity, 0)), 0) - IFNULL(SUM(IFNULL(ITD.IssueQuantity, 0)), 0) - IFNULL(SUM(IFNULL(ITD.RejectedQuantity, 0)), 0),2) > 0 )) As Temp On Temp.ItemID=IM.ItemID And Temp.CompanyID=IM.CompanyID LEFT JOIN ItemSubGroupMaster AS ISGM ON ISGM.ItemSubGroupID=IM.ItemSubGroupID And ISGM.CompanyID=IM.CompanyID  " &
                  " Where IM.CompanyID =" & GBLCompanyID & "  and IM.ItemID=" & ItemId & "  Order by ParentTransactionID"
            Else

                'str = "SELECT ISNULL(IM.ItemID, 0) AS ItemID, ISNULL(IM.ItemGroupID, 0) AS ItemGroupID, ISNULL(IGM.ItemGroupNameID, 0) AS ItemGroupNameID, ISNULL(ISGM.ItemSubGroupID, 0) AS ItemSubGroupID,ISNULL(Temp.ParentTransactionID, 0) AS  ParentTransactionID, ISNULL(Temp.WarehouseID, 0) AS WarehouseID,  NULLIF (IGM.ItemGroupName, '') AS ItemGroupName,NULLIF (ISGM.ItemSubGroupName, '') AS ItemSubGroupName,NULLIF (IM.ItemCode, '') AS ItemCode,   NULLIF (IM.ItemName, '') AS ItemName, NULLIF (IM.ItemDescription, '') AS ItemDescription,NULLIF (IM.StockUnit, '') AS StockUnit,  ISNULL(Temp.ClosingQty, 0) AS BatchStock, ISNULL(Temp.LandedRate, 0) AS LandedRate, 0 AS IssueQuantity, NULLIF (Temp.GRNNo, '') AS GRNNo,REPLACE(CONVERT(varchar(13), Temp.GRNDate, 106), ' ', '-') AS GRNDate, NULLIF (Temp.BatchNo, '') AS BatchNo,  ISNULL(Temp.BatchID, 0) AS BatchID,  NULLIF (Temp.SupplierBatchNo, '') AS SupplierBatchNo,REPLACE(CONVERT(varchar(13), Temp.MfgDate, 106), ' ', '-') AS MfgDate, REPLACE(CONVERT(varchar(13), Temp.ExpiryDate, 106), ' ', '-') AS ExpiryDate,  NULLIF (Temp.WarehouseName, '') AS Warehouse, NULLIF (Temp.BinName, '') AS Bin, ISNULL(IM.WtPerPacking, 0) AS WtPerPacking,  ISNULL(IM.UnitPerPacking, 1) AS UnitPerPacking,  ISNULL(IM.ConversionFactor, 1) AS ConversionFactor   " &
                '      "FROM  ItemMaster AS IM  INNER JOIN ItemGroupMaster AS IGM ON IGM.ItemGroupID = IM.ItemGroupID AND IGM.CompanyID = IM.CompanyID  " &
                '      "INNER JOIN (Select Isnull(IM.CompanyID,0) As CompanyID,Isnull(IM.ItemID,0) As ItemID,Isnull(ITD.WarehouseID,0) As WarehouseID,Isnull(ITD.ParentTransactionID,0) As ParentTransactionID, ISNULL(ID.LandedRate, 0) AS LandedRate,Round(ISNULL(SUM(Isnull(ITD.ReceiptQuantity,0)), 0) - ISNULL(SUM(Isnull(ITD.IssueQuantity,0)), 0) - Isnull(SUM(ITD.RejectedQuantity),0),3) As ClosingQty, ISNULL(ITD.BatchID, 0) AS BatchID,Nullif(ITD.BatchNo,'') AS BatchNo, Null AS Pallet_No,Nullif(WM.WarehouseName,'') AS WarehouseName,Nullif(WM.BinName,'') AS BinName,Nullif(IT.VoucherNo,'') AS GRNNo,Replace(Convert(varchar(13),IT.VoucherDate,106),' ','-') AS GRNDate , NULLIF (ID.SupplierBatchNo, '') AS SupplierBatchNo,REPLACE(CONVERT(varchar(13), ID.MfgDate, 106), ' ', '-') AS MfgDate, REPLACE(CONVERT(varchar(13), ID.ExpiryDate, 106), ' ', '-') AS ExpiryDate " &
                '      "From ItemMaster As IM  INNER JOIN ItemTransactionDetail As ITD On ITD.ItemID=IM.ItemID And ITD.CompanyID=IM.CompanyID And Isnull(ITD.IsDeletedTransaction, 0)=0 And (Isnull(ITD.ReceiptQuantity,0)>0 Or Isnull(ITD.IssueQuantity,0)>0)  " &
                '      "INNER JOIN ItemTransactionMain As ITM On ITM.TransactionID=ITD.TransactionID And ITM.CompanyID=ITD.CompanyID And ITM.VoucherID Not In(-8, -9, -11) AND Isnull(ITM.IsDeletedTransaction,0)=0 AND Isnull(ITD.IsDeletedTransaction,0)=0   " &
                '      "INNER JOIN ItemTransactionMain AS IT ON IT.TransactionID=ITD.ParentTransactionID And IT.CompanyID=ITD.CompanyID AND Isnull(IT.IsDeletedTransaction,0)=0   " &
                '      "INNER JOIN ItemTransactionDetail AS ID ON IT.TransactionID = ID.TransactionID AND ID.ItemID=ITD.ItemID AND ID.BatchNo=ITD.BatchNo AND (ISNULL(ITD.BatchID,0) = 0 OR ITD.BatchID = ID.BatchID) AND IT.CompanyID = ID.CompanyID AND ISNULL(ID.IsDeletedTransaction, 0) = 0  " &
                '      "INNER JOIN WarehouseMaster AS WM ON WM.WarehouseID=ITD.WarehouseID And WM.CompanyID=ITD.CompanyID AND Isnull(WM.IsDeletedTransaction,0)=0  " &
                '      "Where ITD.CompanyID= '" & GBLCompanyID & "' And ITD.ItemID='" & ItemId & "' And ISNULL(IM.IsDeletedTransaction,0) = 0  " &
                '      "Group BY Isnull(IM.ItemID, 0),Isnull(ITD.ParentTransactionID,0),Nullif(ITD.BatchNo,''),Isnull(ITD.WarehouseID,0),Nullif(WM.WarehouseName,''),Nullif(WM.BinName,''),Nullif(IT.VoucherNo,''), Replace(Convert(varchar(13),IT.VoucherDate,106),' ','-'),Isnull(IM.CompanyID,0), ISNULL(ID.LandedRate, 0) , ISNULL(ITD.BatchID, 0) ,NULLIF (ID.SupplierBatchNo, ''), ID.MfgDate, ID.ExpiryDate HAVING((ISNULL(SUM(Isnull(ITD.ReceiptQuantity, 0)), 0) - ISNULL(SUM(Isnull(ITD.IssueQuantity, 0)), 0) - Isnull(SUM(ITD.RejectedQuantity),0)) > 0))  AS Temp ON Temp.ItemID = IM.ItemID AND Temp.CompanyID = IM.CompanyID  " &
                '      "LEFT OUTER JOIN ItemSubGroupMaster AS ISGM ON ISGM.ItemSubGroupID = IM.ItemSubGroupID AND ISGM.CompanyID = IM.CompanyID   " &
                '      "WHERE (IM.CompanyID =  '" & GBLCompanyID & "') AND (IM.ItemID ='" & ItemId & "')  and  (ISNULL(ISGM.IsDeletedTransaction, 0) <> 1)  ORDER BY ParentTransactionID "

                ' Batch Stock Query Correction by Anshu 30-Jan-2026'
                str = " Select  Round(Isnull(Isnull(Sum(ITD.ReceiptQuantity),0) - Isnull(ISS.IssueQuantity,0) - Isnull(Sum(ITD.RejectedQuantity),0),0),3) As BatchStock, ISS.IssueQuantity, ITD.ItemID,IM.ItemGroupID,IGM.ItemGroupNameID,ISGM.ItemSubGroupID,ITD.ParentTransactionID,ITD.WarehouseID, NULLIF (IGM.ItemGroupName, '') AS ItemGroupName,NULLIF (ISGM.ItemSubGroupName, '') AS ItemSubGroupName, NULLIF (IM.ItemCode, '') AS ItemCode,   NULLIF (IM.ItemName, '') AS ItemName, NULLIF (IM.ItemDescription, '') AS ItemDescription, NULLIF (IM.StockUnit, '') AS StockUnit, GRN.LandedRate,   GRN.GRNNo,GRN.GRNDate,ITD.BatchNo,ITD.BatchID,GRN.SupplierBatchNo,GRN.MfgDate,GRN.ExpiryDate, NULLIF (WM.WarehouseName, '') AS Warehouse, NULLIF (WM.BinName, '') AS Bin, ISNULL(IM.WtPerPacking, 0) AS WtPerPacking,  ISNULL(IM.UnitPerPacking, 1) AS UnitPerPacking,  ISNULL(IM.ConversionFactor, 1) AS ConversionFactor,Isnull(GRN.SupplierName,'-') As SupplierName " &
                      " from ItemTransactionMain As ITM " &
                      " INNER JOIN ItemTransactionDetail As ITD ON ITM.TransactionID = ITD.TransactionID And ITM.CompanyID = ITD.CompanyID  And (ISNULL(ITD.ReceiptQuantity,0)>0 Or ISNULL(ITD.RejectedQuantity,0)>0) And ISNULL(ITD.IsDeletedTransaction,0)=0  " &
                      " INNER JOIN ( Select Distinct ITM.TransactionID,ITD.ParentTransactionID,ITD.ItemID, ISNULL(ITD.LandedRate, 0) AS LandedRate,Nullif(ITM.VoucherNo,'') AS GRNNo, Replace(Convert(varchar(13),ITM.VoucherDate,106),' ','-') AS GRNDate ,  NULLIF (ITD.SupplierBatchNo, '') AS SupplierBatchNo,REPLACE(CONVERT(varchar(13), ITD.MfgDate, 106), ' ', '-') AS MfgDate,  REPLACE(CONVERT(varchar(13), ITD.ExpiryDate, 106), ' ', '-') AS ExpiryDate,  ITD.BatchID,ITD.WarehouseID,LM.LedgerName As SupplierName  " &
                      " from ItemTransactionMain As ITM  INNER JOIN ItemTransactionDetail As ITD On ITD.TransactionID = ITM.TransactionID And ITD.CompanyID = ITM.CompanyID And ISNULL(ITD.IsDeletedTransaction,0)=0  LEFT JOIN LedgerMaster As LM ON LM.LedgerID = ITM.LedgerID And LM.CompanyID = ITM.CompanyID And Isnull(LM.IsDeletedTransaction,0)=0 " &
                      " Where Isnull(ITM.IsDeletedTransaction,0)=0 And VoucherID IN(-16,-14,-71) ) As GRN ON GRN.TransactionID = ITD.ParentTransactionID And GRN.ItemID = ITD.ItemID And GRN.BatchID = ITD.BatchID  " &
                      " INNER JOIN WarehouseMaster As WM ON WM.WarehouseID = ITD.WarehouseID And WM.CompanyID = ITD.CompanyID And ISNULL(WM.IsDeletedTransaction,0)=0  " &
                      " INNER JOIN ItemMaster As IM ON IM.ItemID = ITD.ItemID And IM.CompanyID = ITD.CompanyID And ISNULL(IM.IsDeletedTransaction,0)=0 " &
                      " LEFT JOIN ItemGroupMaster As IGM ON IGM.ItemGroupID = IM.ItemGroupID And IGM.CompanyID = IM.CompanyID And ISNULL(IGM.IsDeletedTransaction,0)=0 " &
                      " LEFT JOIN ItemSubGroupMaster AS ISGM ON ISGM.ItemSubGroupID = IM.ItemSubGroupID AND ISGM.CompanyID = IM.CompanyID And ISNULL(ISGM.IsDeletedTransaction,0)=0 " &
                      " LEFT JOIN ( Select ID.ParentTransactionID,ID.ItemID,ID.WarehouseID,ID.BatchID,ID.BatchNo,Isnull(Sum(ID.IssueQuantity),0) As IssueQuantity " &
                      "  from ItemTransactionMain As IT  " &
                      "  INNER JOIN ItemTransactionDetail As ID ON IT.TransactionID = ID.TransactionID And IT.CompanyID = ID.CompanyID And ISNULL(ID.IsDeletedTransaction,0)=0 " &
                      "  And ISNULL(ID.IssueQuantity,0)>0 WHERE ISNULL(IT.IsDeletedTransaction,0)=0  Group by ID.ParentTransactionID,ID.ItemID,ID.WarehouseID,ID.BatchID,ID.BatchNo  " &
                      " ) As ISS On ISS.ParentTransactionID = ITD.ParentTransactionID And  ISS.BatchID = ITD.BatchID And ISS.ItemID = ITD.ItemID And ISS.WarehouseID = ITD.WarehouseID " &
                      " Where ISNULL(ITM.IsDeletedTransaction,0)=0 And ITD.ItemID='" & ItemId & "'  " &
                      " Group by ITD.ItemID,IM.ItemGroupID,IGM.ItemGroupNameID,ISGM.ItemSubGroupID, ITD.ParentTransactionID,NULLIF (IGM.ItemGroupName, ''),NULLIF (ISGM.ItemSubGroupName, ''), NULLIF (IM.ItemCode, ''),NULLIF (IM.ItemName, ''), NULLIF (IM.ItemDescription, ''),NULLIF (IM.StockUnit, ''), ITD.WarehouseID,ITD.BatchID,ITD.BatchNo, GRN.GRNNo,GRN.GRNDate,GRN.LandedRate, GRN.SupplierBatchNo,GRN.MfgDate,GRN.ExpiryDate, NULLIF (WM.WarehouseName, ''), NULLIF (WM.BinName, ''), ISNULL(IM.WtPerPacking, 0),ISNULL(IM.UnitPerPacking, 1),ISNULL(IM.ConversionFactor, 1) , ISS.IssueQuantity,Isnull(GRN.SupplierName,'-') " &
                      " Having(Round(Isnull(Isnull(Sum(ITD.ReceiptQuantity),0) - Isnull(ISS.IssueQuantity,0) - Isnull(Sum(ITD.RejectedQuantity),0),0),3)>0) "
            End If

            db.FillDataTable(dataTable, str)
            data.Message = ConvertDataTableTojSonString(dataTable)
            Return js.Serialize(data.Message)
        Catch ex As Exception
            Return ex.Message
        End Try

    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GenerateVoucherNo() As String
        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))

            Return db.GeneratePrefixedNo("ItemTransactionMain", "PHY", "MaxVoucherNo", 0, GBLFYear, " Where VoucherPrefix='PHY' AND VoucherID=-16 And Isnull(IsDeletedTransaction,0)=0 And CompanyID=" & GBLCompanyID & " And FYear='" & GBLFYear & "' ")
        Catch ex As Exception
            Return ex.Message
        End Try
    End Function
    '-----------------------------------Get Warehouse List------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetWarehouseList() As String
        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            If DBType = "MYSQL" Then
                str = "Select DISTINCT WarehouseName AS Warehouse From WarehouseMaster Where IFNULL(WarehouseName,'') <> '' AND IsDeletedTransaction=0 AND CompanyID=" & GBLCompanyID & " AND IFNULL(IsFloorWarehouse,0)=0  Order By WarehouseName"
            Else
                str = "Select DISTINCT WarehouseName AS Warehouse From WarehouseMaster Where Isnull(WarehouseName,'') <> '' AND IsDeletedTransaction=0 AND CompanyID=" & GBLCompanyID & " AND Isnull(IsFloorWarehouse,0)=0 Order By WarehouseName"
            End If
            db.FillDataTable(dataTable, str)
            data.Message = ConvertDataTableTojSonString(dataTable)
            Return js.Serialize(data.Message)
        Catch ex As Exception
            Return ex.Message
        End Try

    End Function

    '-----------------------------------Get Bins List------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetBinsList(ByVal warehousename As String) As String
        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            If DBType = "MYSQL" Then
                str = "SELECT Distinct BinName AS Bin,IFNULL(WarehouseID,0) AS WarehouseID FROM WarehouseMaster Where WarehouseName='" & warehousename & "' AND IFNULL(BinName,'')<>'' AND IsDeletedTransaction=0 AND CompanyID=" & GBLCompanyID & " Order By BinName"
            Else
                str = "SELECT Distinct BinName AS Bin,Isnull(WarehouseID,0) AS WarehouseID FROM WarehouseMaster Where WarehouseName='" & warehousename & "' AND Isnull(BinName,'')<>'' AND IsDeletedTransaction=0 AND CompanyID=" & GBLCompanyID & " Order By BinName"
            End If
            db.FillDataTable(dataTable, str)
            data.Message = ConvertDataTableTojSonString(dataTable)
            Return js.Serialize(data.Message)
        Catch ex As Exception
            Return ex.Message
        End Try

    End Function

    '-----------------------------------Get Show List------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function RefreshVouchersList() As String
        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            str = "SELECT ITD.TransactionDetailID,ITM.TransactionID, ITD.ParentTransactionID, ITD.ItemID,ITD.ItemGroupID, 0 AS ItemSubGroupID, ITD.WarehouseID, ITM.MaxVoucherNo,ITM.VoucherNo, REPLACE(CONVERT(varchar(13),ITM.VoucherDate, 106), ' ', '-') AS VoucherDate, IGM.ItemGroupName, ISGM.ItemSubGroupName, IM.ItemCode, IM.ItemName,ITD.StockUnit, ITD.OldStockQuantity,ITD.NewStockQuantity, CASE WHEN Isnull(ITD.ReceiptQuantity, 0) > 0 THEN Isnull(ITD.ReceiptQuantity, 0) ELSE Isnull(ITD.IssueQuantity, 0) END AS AdjustedStockQty, CASE WHEN Isnull(ITD.ReceiptQuantity, 0) > 0 THEN ITD.OldStockQuantity+Isnull(ITD.ReceiptQuantity, 0) ELSE ITD.OldStockQuantity-Isnull(ITD.IssueQuantity, 0) END As ClosingQty,NULLIF (IT.VoucherNo, '') AS GRNNo, REPLACE(CONVERT(varchar(13), IT.VoucherDate, 106), ' ', '-') AS GRNDate, Isnull(ITD.BatchID, 0) AS BatchID,NULLIF (ITD.BatchNo, '') AS BatchNo,NULLIF (IBD.SupplierBatchNo, '') AS SupplierBatchNo,NULLIF (IBD.MfgDate, '') AS MfgDate,NULLIF (IBD.ExpiryDate, '') AS ExpiryDate, NULLIF (WM.WarehouseName, '') AS Warehouse, NULLIF (WM.BinName, '') AS Bin, NULLIF (ITM.Narration, '') AS Narration, ISNULL(IM.WtPerPacking, 0) AS WtPerPacking, ISNULL(IM.UnitPerPacking, 1) AS UnitPerPacking, ISNULL(IM.ConversionFactor, 1) AS ConversionFactor, NULLIF (UM.UserName, '') AS CreatedBy ,ISNULL(ITM.FYear, 0) AS  FYear" &
                  " FROM ItemTransactionMain AS ITM INNER JOIN ItemTransactionDetail AS ITD ON ITM.TransactionID=ITD.TransactionID AND ITM.CompanyID=ITD.CompanyID INNER JOIN ItemTransactionMain AS IT ON IT.TransactionID=ITD.ParentTransactionID AND IT.CompanyID=ITD.CompanyID INNER JOIN ItemMaster AS IM ON IM.ItemID=ITD.ItemID AND IM.CompanyID=ITD.CompanyID INNER JOIN ItemGroupMaster AS IGM ON IGM.ItemGroupID=IM.ItemGroupID AND IGM.CompanyID=IM.CompanyID INNER JOIN UserMaster AS UM ON UM.UserID=ITM.CreatedBy AND UM.CompanyID=ITM.CompanyID INNER JOIN WarehouseMaster AS WM ON WM.WarehouseID=ITD.WarehouseID AND WM.CompanyID=ITD.CompanyID INNER JOIN ItemTransactionBatchDetail AS IBD ON IBD.BatchID=ITD.BatchID AND IBD.CompanyID=ITD.CompanyID  LEFT JOIN ItemSubGroupMaster AS ISGM ON ISGM.ItemSubGroupID=IM.ItemSubGroupID AND ISGM.CompanyID=IM.CompanyID Where ITM.VoucherID=-16 AND ITM.CompanyID=" & GBLCompanyID & " And Isnull(ITD.IsDeletedTransaction,0)=0 /*AND ITM.FYEAR IN('2018-2019','2017-2018')*/ Order By FYear Desc, ITM.MaxVoucherNo Desc"
            db.FillDataTable(dataTable, str)
            data.Message = ConvertDataTableTojSonString(dataTable)
            js.MaxJsonLength = 2147483647
            Return js.Serialize(data.Message)
        Catch ex As Exception
            Return ex.Message
        End Try

    End Function

    ''----------------------------Save Stock Verification Voucher ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SaveStockVerificationVoucher(ByVal prefix As String, ByVal voucherid As Integer, ByVal jsonObjectsTransactionMain As Object, ByVal jsonObjectsTransactionDetail As Object) As String

        Dim dt As New DataTable
        Dim VoucherNo As String = ""
        Dim MaxVoucherNo As Long = 0
        Dim KeyField, TransactionID As String
        Dim AddColName, AddColValue, TableName As String
        AddColName = ""
        AddColValue = ""

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try

            VoucherNo = db.GeneratePrefixedNo("ItemTransactionMain", prefix, "MaxVoucherNo", MaxVoucherNo, GBLFYear, " Where VoucherPrefix='" & prefix & "' AND VoucherID=" & voucherid & " And IsDeletedTransaction =0 And CompanyID=" & GBLCompanyID & " And FYear='" & GBLFYear & "' ")
            If (db.CheckAuthories("ItemPhysicalVerification.aspx", GBLUserID, GBLCompanyID, "CanSave", VoucherNo) = False) Then Return "You are not authorized to save..!, Can't Save"

            TableName = "ItemTransactionMain"
            AddColName = "CreatedDate,UserID,CompanyID,FYear,CreatedBy,VoucherPrefix,MaxVoucherNo,VoucherNo"
            If DBType = "MYSQL" Then
                AddColValue = "Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & prefix & "','" & MaxVoucherNo & "','" & VoucherNo & "'"
            Else
                AddColValue = "GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & prefix & "','" & MaxVoucherNo & "','" & VoucherNo & "'"
            End If
            TransactionID = db.InsertDatatableToDatabase(jsonObjectsTransactionMain, TableName, AddColName, AddColValue)
            If IsNumeric(TransactionID) = False Then
                Return "Error: Main" & TransactionID
            End If

            TableName = "ItemTransactionDetail"
            AddColName = "CreatedDate,UserID,CompanyID,FYear,CreatedBy,TransactionID"
            If DBType = "MYSQL" Then
                AddColValue = "Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & TransactionID & "'"
            Else
                AddColValue = "GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & TransactionID & "'"
            End If
            str = db.InsertDatatableToDatabase(jsonObjectsTransactionDetail, TableName, AddColName, AddColValue, "", TransactionID)
            If IsNumeric(str) = False Then
                db.ExecuteNonSQLQuery("Delete From ItemTransactionMain Where CompanyID=" & GBLCompanyID & " And TransactionID=" & TransactionID)
                Return "Error: Details" & str
            End If

            If DBType = "MYSQL" Then
                db.ExecuteNonSQLQuery("Update ItemTransactionDetail Set BatchID=TransactionDetailID Where TransactionID=" & TransactionID & " AND CompanyID=" & GBLCompanyID & " AND IFNULL(BatchID,0)=0 AND ParentTransactionID=TransactionID")
                db.ExecuteNonSQLQuery("INSERT INTO ItemTransactionBatchDetail(BatchID, BatchNo, SupplierBatchNo, MfgDate, ExpiryDate, CompanyID, FYear, CreatedBy, CreatedDate)(Select BatchID,BatchNo,SupplierBatchNo, MfgDate, ExpiryDate, CompanyID, FYear, CreatedBy, CreatedDate From ItemTransactionDetail Where CompanyID = " & GBLCompanyID & " AND TransactionID = " & TransactionID & " AND ParentTransactionID=TransactionID)")

                db.ExecuteNonSQLQuery("CALL UPDATE_ITEM_STOCK_VALUES( " & GBLCompanyID & "," & TransactionID & ",0);")
            Else
                db.ExecuteNonSQLQuery("Update ItemTransactionDetail Set BatchID=TransactionDetailID Where TransactionID=" & TransactionID & " AND TransactionID = ParentTransactionID AND CompanyID=" & GBLCompanyID & " ")
                db.ExecuteNonSQLQuery("INSERT INTO ItemTransactionBatchDetail(BatchID, BatchNo, SupplierBatchNo, MfgDate, ExpiryDate, CompanyID, FYear, CreatedBy, CreatedDate)(Select BatchID,BatchNo,SupplierBatchNo, MfgDate, ExpiryDate, CompanyID, FYear, CreatedBy, CreatedDate From ItemTransactionDetail Where CompanyID = " & GBLCompanyID & " AND TransactionID = " & TransactionID & " AND ParentTransactionID=TransactionID)")

                db.ExecuteNonSQLQuery("EXEC UPDATE_ITEM_STOCK_VALUES " & GBLCompanyID & "," & TransactionID & ",0")
            End If

            KeyField = "Success"

        Catch ex As Exception
            KeyField = "Error: " & ex.Message
        End Try
        Return KeyField

    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function DeletePhysicalVerification(ByVal TransID As Integer, ByVal ItemID As Long, ByVal ObjvalidateLoginUser As Object) As String
        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
            If db.ValidUserAuthentication("", ObjvalidateLoginUser("userName"), ObjvalidateLoginUser("password")) = False Then
                Return "InvalidUser"
            End If

            If (db.CheckAuthories("ItemPhysicalVerification.aspx", GBLUserID, GBLCompanyID, "CanDelete", TransID, ObjvalidateLoginUser("transactionRemark")) = False) Then Return "You are not authorized to delete..!, Can't Delete"

            'db.ExecuteNonSQLQuery("Update ItemTransactionMain Set IsDeletedTransaction=1,DeletedBy =" & GBLUserID & ",DeletedDate=Getdate() Where CompanyID=" & GBLCompanyID & " And TransactionID=" & TransID)

            If DBType = "MYSQL" Then
                db.ExecuteNonSQLQuery("Update ItemTransactionDetail Set IsDeletedTransaction=1,DeletedBy =" & GBLUserID & ",DeletedDate=Now() Where CompanyID=" & GBLCompanyID & " And TransactionDetailID=" & TransID)
                db.ExecuteNonSQLQuery("CALL UPDATE_ITEM_STOCK_VALUES( " & GBLCompanyID & ",0," & ItemID & ");")
            Else
                db.ExecuteNonSQLQuery("Update ItemTransactionDetail Set IsDeletedTransaction=1,DeletedBy =" & GBLUserID & ",DeletedDate=Getdate() Where CompanyID=" & GBLCompanyID & " And TransactionDetailID=" & TransID)
                db.ExecuteNonSQLQuery("Exec UPDATE_ITEM_STOCK_VALUES " & GBLCompanyID & ",0," & ItemID & "")
            End If

            Return "Success"
        Catch ex As Exception
            Return ex.Message
        End Try
    End Function

    ''----------------------------Save Stock Verification Voucher ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function ImportStockVerificationData(ByVal jsonObjectsTransactionMain As Object, ByVal jsonObjectsTransactionDetail As Object) As String

        Dim dt As New DataTable
        Dim VoucherNo As String = ""
        Dim MaxVoucherNo As Long = 0
        Dim KeyField, TransactionID As String
        Dim AddColName, AddColValue, TableName As String
        AddColName = ""
        AddColValue = ""
        Dim prefix As String = "PHY"
        Dim voucherid As Integer = -16

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try

            VoucherNo = db.GeneratePrefixedNo("ItemTransactionMain", prefix, "MaxVoucherNo", MaxVoucherNo, GBLFYear, " Where IsDeletedTransaction=0 And VoucherPrefix='" & prefix & "' AND VoucherID=" & voucherid & " And  CompanyID=" & GBLCompanyID & " And FYear='" & GBLFYear & "' ")
            If (db.CheckAuthories("ItemPhysicalVerification.aspx", GBLUserID, GBLCompanyID, "CanSave", VoucherNo) = False) Then Return "You are not authorized to save..!, Can't Save"
            Using SqlTrans As New Transactions.TransactionScope(Transactions.TransactionScopeOption.Required, New System.TimeSpan(0, 60, 0))
                TableName = "ItemTransactionMain"
                AddColName = "VoucherDate,CreatedDate,UserID,CompanyID,FYear,CreatedBy,VoucherID,VoucherPrefix,MaxVoucherNo,VoucherNo"
                If DBType = "MYSQL" Then
                    AddColValue = "Now(),Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "'," & voucherid & ",'" & prefix & "','" & MaxVoucherNo & "','" & VoucherNo & "'"
                Else
                    AddColValue = "Getdate(),Getdate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "'," & voucherid & ",'" & prefix & "','" & MaxVoucherNo & "','" & VoucherNo & "'"
                End If
                TransactionID = db.InsertDatatableToDatabase(jsonObjectsTransactionMain, TableName, AddColName, AddColValue)
                If IsNumeric(TransactionID) = False Then
                    SqlTrans.Dispose()
                    Return "Error: Main" & TransactionID
                End If

                TableName = "ItemTransactionDetail"
                AddColName = "ModifiedDate,CreatedDate,UserID,CompanyID,FYear,CreatedBy,ModifiedBy,TransactionID,ParentTransactionID"
                If DBType = "MYSQL" Then
                    AddColValue = "Now(),Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & TransactionID & "','" & TransactionID & "'"
                Else
                    AddColValue = "GetDate(),Getdate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & TransactionID & "','" & TransactionID & "'"
                End If
                str = db.InsertDatatableToDatabase(jsonObjectsTransactionDetail, TableName, AddColName, AddColValue, "", TransactionID)

                db.ExecuteNonSQLQuery("Update ItemTransactionDetail Set BatchID = TransactionDetailID  Where TransactionID = " & TransactionID & "")
                db.ExecuteNonSQLQuery("INSERT INTO ItemTransactionBatchDetail(BatchID, BatchNo, SupplierBatchNo, MfgDate, ExpiryDate, CompanyID, FYear, CreatedBy, CreatedDate)(Select BatchID,BatchNo,SupplierBatchNo, MfgDate, ExpiryDate, CompanyID, FYear, CreatedBy, CreatedDate From ItemTransactionDetail Where CompanyID = " & GBLCompanyID & " AND TransactionID = " & TransactionID & " AND ParentTransactionID=TransactionID)")

                If IsNumeric(str) = False Then
                    SqlTrans.Dispose()
                    Return "Error: Details" & str
                End If
                If DBType = "MYSQL" Then
                    db.ExecuteNonSQLQuery("CALL UPDATE_ITEM_STOCK_VALUES( " & GBLCompanyID & "," & TransactionID & ",0);")
                Else
                    db.ExecuteNonSQLQuery("EXEC UPDATE_ITEM_STOCK_VALUES " & GBLCompanyID & "," & TransactionID & ",0")
                End If
                SqlTrans.Complete()
                KeyField = "Success"
            End Using

        Catch ex As Exception
            KeyField = "Error: " & ex.Message
        End Try
        Return KeyField

    End Function


    '///////////////////////// Spare Part Physical Verification...////////////////////

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function ImportSpareStockVerificationData(ByVal jsonObjectsTransactionMain As Object, ByVal jsonObjectsTransactionDetail As Object) As String

        Dim dt As New DataTable
        Dim VoucherNo As String = ""
        Dim MaxVoucherNo As Long = 0
        Dim KeyField, TransactionID As String
        Dim AddColName, AddColValue, TableName As String
        AddColName = ""
        AddColValue = ""
        Dim prefix As String = "PHY"
        Dim voucherid As Integer = -118

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try

            VoucherNo = db.GeneratePrefixedNo("SpareTransactionMain", prefix, "MaxVoucherNo", MaxVoucherNo, GBLFYear, " Where IsDeletedTransaction=0 And VoucherPrefix='" & prefix & "' AND VoucherID=" & voucherid & " And  CompanyID=" & GBLCompanyID & " And FYear='" & GBLFYear & "' ")
            If (db.CheckAuthories("SparePhysicalVerification.aspx", GBLUserID, GBLCompanyID, "CanSave", VoucherNo) = False) Then Return "You are not authorized to save..!, Can't Save"
            Using SqlTrans As New Transactions.TransactionScope(Transactions.TransactionScopeOption.Required, New System.TimeSpan(0, 60, 0))
                TableName = "SpareTransactionMain"
                AddColName = "VoucherDate,CreatedDate,UserID,CompanyID,FYear,CreatedBy,VoucherID,VoucherPrefix,MaxVoucherNo,VoucherNo"
                If DBType = "MYSQL" Then
                    AddColValue = "Now(),Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "'," & voucherid & ",'" & prefix & "','" & MaxVoucherNo & "','" & VoucherNo & "'"
                Else
                    AddColValue = "Getdate(),Getdate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "'," & voucherid & ",'" & prefix & "','" & MaxVoucherNo & "','" & VoucherNo & "'"
                End If
                TransactionID = db.InsertDatatableToDatabase(jsonObjectsTransactionMain, TableName, AddColName, AddColValue)
                If IsNumeric(TransactionID) = False Then
                    SqlTrans.Dispose()
                    Return "Error: Main" & TransactionID
                End If

                TableName = "SpareTransactionDetail"
                AddColName = "ModifiedDate,CreatedDate,UserID,CompanyID,FYear,CreatedBy,ModifiedBy,TransactionID,ParentTransactionID"
                If DBType = "MYSQL" Then
                    AddColValue = "Now(),Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & TransactionID & "','" & TransactionID & "'"
                Else
                    AddColValue = "GetDate(),Getdate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & TransactionID & "','" & TransactionID & "'"
                End If
                str = db.InsertDatatableToDatabase(jsonObjectsTransactionDetail, TableName, AddColName, AddColValue, "", TransactionID)
                If IsNumeric(str) = False Then
                    SqlTrans.Dispose()
                    Return "Error: Details" & str
                End If

                'db.ExecuteNonSQLQuery("EXEC UPDATE_ITEM_STOCK_VALUES " & GBLCompanyID & "," & TransactionID & ",0")
                SqlTrans.Complete()
                KeyField = "Success"
            End Using

        Catch ex As Exception
            KeyField = "Error: " & ex.Message
        End Try
        Return KeyField


    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetLastTransactionDate() As String
        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("ReportFYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
        Dim Str As String = ""
        Dim lastTransactionDate As String = ""
        Dim whereCondition As String = " VoucherID=-16 AND CompanyID=" & GBLCompanyID & " AND Isnull(IsDeletedTransaction,0)=0 "

        Str = db.getLastVoucherDate("ItemTransactionMain", "VoucherDate", whereCondition)
        Dim parsedDate As DateTime
        If DateTime.TryParse(Str, parsedDate) Then
            lastTransactionDate = parsedDate.ToString("dd-MMM-yyyy")
        End If
        Return js.Serialize(lastTransactionDate)
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetUnitDecimalPlace(ByVal stockUnit As Object) As String
        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            If DBType = "MYSQL" Then
                str = "SELECT ISNULL(DecimalPlace, 0) AS DecimalPlace FROM UnitMaster WHERE UnitSymbol =  '" & stockUnit & "' AND ISNULL(IsDeletedTransaction, 0) = 0"
            Else
                str = "SELECT ISNULL(DecimalPlace, 0) AS DecimalPlace FROM UnitMaster WHERE UnitSymbol =  '" & stockUnit & "' AND ISNULL(IsDeletedTransaction, 0) = 0"
            End If
            db.FillDataTable(dataTable, str)
            data.Message = ConvertDataTableTojSonString(dataTable)
            Return js.Serialize(data.Message)
        Catch ex As Exception
            Return ex.Message
        End Try

    End Function

    ''End Spare Part Physical Veri..///////////
    Public Class HelloWorldData
        Public Message As [String]
    End Class
End Class