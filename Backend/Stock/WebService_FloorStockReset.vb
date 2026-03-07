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
Public Class WebService_FloorStockReset
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
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetAllFloorStock(ByVal ItemGroupID As String) As String
        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            Dim whstr As String = ""
            If ItemGroupID <> "" And ItemGroupID <> "undefined" Then
                whstr = "And IM.ItemGroupID='" & ItemGroupID & "' "
            End If

            If DBType = "MYSQL" Then
                str = "Select Isnull(ITD.JobBookingID,0) AS JobBookingID,Isnull(ITD.ParentTransactionID,0) AS ParentTransactionID,Isnull(ITM.TransactionID,0) AS TransactionID,Isnull(ITM.DepartmentID,0) AS DepartmentID,Isnull(ITD.FloorWarehouseID,0) AS FloorWarehouseID,Isnull(ITD.JobBookingJobCardContentsID,0) AS JobBookingJobCardContentsID,Isnull(ITD.MachineID,0) AS MachineID,Isnull(ITD.ItemID,0) As ItemID,Isnull(IM.ItemGroupID,0) As ItemGroupID,Isnull(IGM.ItemGroupNameID,0) As ItemGroupNameID,Isnull(IM.ItemSubGroupID,0) As ItemSubGroupID,Nullif(ITM.VoucherNo,'') AS VoucherNo,   Replace(Convert(Varchar(13), ITM.VoucherDate, 106),' ','-') AS VoucherDate,Nullif(IM.ItemCode,'') AS ItemCode,Nullif(IGM.ItemGroupName,'') AS ItemGroupName,Nullif(ISGM.ItemSubGroupName,'') AS ItemSubGroupName,Nullif(IM.ItemName,'') AS ItemName,Nullif(IM.StockType,'') AS StockType,  Nullif(IM.StockCategory,'') AS StockCategory,   Nullif(IM.StockUnit,'') AS StockUnit,Isnull(ITD.BatchID,0) AS BatchID,Nullif(ITD.BatchNo,'') AS BatchNo,Nullif(IBD.SupplierBatchNo,'') AS SupplierBatchNo,Nullif(IBD.MfgDate,'') AS MfgDate,Nullif(IBD.ExpiryDate,'') AS ExpiryDate,Nullif(IT.VoucherNo,'') AS GRNNo,Replace(Convert(Varchar(13),IT.VoucherDate,106),' ','-') AS GRNDate,Nullif(JC.JobCardContentNo,'') AS JobCardNo,Isnull(ITD.IssueQuantity,0) AS IssueQuantity,Isnull(CS.ConsumedStock,0) AS ConsumeQuantity,ROUND((Isnull(ITD.IssueQuantity,0)-Isnull(CS.ConsumedStock,0)),3) AS FloorStock,Nullif(WM.WarehouseName,'') AS WarehouseName,Nullif(WM.BinName,'') AS Bin,Nullif(MM.MachineName,'') AS MachineName  " &
                    "From ItemTransactionMain As ITM INNER JOIN ItemTransactionDetail AS ITD ON ITD.TransactionID=ITM.TransactionID And ITD.CompanyID=ITM.CompanyID INNER JOIN ItemMaster AS IM ON IM.ItemID=ITD.ItemID And IM.CompanyID=ITD.CompanyID INNER JOIN ItemGroupMaster AS IGM ON IGM.ItemGroupID=IM.ItemGroupID And IGM.CompanyID=IM.CompanyID INNER JOIN ItemTransactionBatchDetail AS IBD ON IBD.BatchID=ITD.BatchID AND IBD.CompanyID=ITD.CompanyID  LEFT JOIN ItemSubGroupMaster AS ISGM ON ISGM.ItemSubGroupID=IM.ItemSubGroupID And ISGM.CompanyID=IM.CompanyID LEFT JOIN DepartmentMaster AS DM ON DM.DepartmentID=ITM.DepartmentID And DM.CompanyID=ITM.CompanyID LEFT JOIN JobBookingJobCardContents AS JC ON JC.JobBookingJobCardContentsID=ITD.JobBookingJobCardContentsID And JC.CompanyID=ITD.CompanyID LEFT JOIN JobBookingJobCard AS JJ ON JJ.JobBookingID=JC.JobBookingID And JJ.CompanyID=JC.CompanyID LEFT JOIN ItemTransactionMain As IT On IT.TransactionID=ITD.ParentTransactionID And IT.CompanyID=ITD.CompanyID LEFT JOIN WarehouseMaster AS WM ON WM.WarehouseID=ITD.FloorWarehouseID And WM.CompanyID=ITD.CompanyID LEFT JOIN MachineMaster AS MM ON MM.MachineID=ITD.MachineID And MM.CompanyID=ITD.CompanyID  LEFT JOIN (Select Isnull(ICD.IssueTransactionID,0) AS IssueTransactionID,Isnull(ICD.CompanyID,0) AS CompanyID,Isnull(ICD.ItemID,0) AS ItemID,Isnull(ICD.ParentTransactionID,0) AS ParentTransactionID,Isnull(ICD.DepartmentID,0) AS DepartmentID,Isnull(ICD.JobBookingJobCardContentsID,0) AS JobBookingJobCardContentsID ,Isnull(ICD.BatchID,0) AS BatchID,Nullif(ICD.BatchNo,'') AS BatchNo,ROUND((SUM(ISNULL(ICD.ConsumeQuantity,0))+SUM(ISNULL(ICD.ReturnQuantity,0))),3) AS ConsumedStock From ItemConsumptionMain AS ICM INNER JOIN ItemConsumptionDetail AS ICD ON ICM.ConsumptionTransactionID=ICD.ConsumptionTransactionID AND ICM.CompanyID=ICD.CompanyID " &
                    "Where Isnull(ICD.IsDeletedTransaction,0)=0 AND ICD.CompanyID= " & GBLCompanyID & " " &
                    "GROUP BY Isnull(ICD.IssueTransactionID,0),Isnull(ICD.CompanyID,0),Isnull(ICD.ItemID,0),Isnull(ICD.ParentTransactionID,0),Isnull(ICD.DepartmentID,0),Isnull(ICD.JobBookingJobCardContentsID,0),Isnull(ICD.BatchID,0),Nullif(ICD.BatchNo,'')) AS CS ON CS.IssueTransactionID=ITM.TransactionID AND CS.ItemID=ITD.ItemID AND CS.ParentTransactionID=ITD.ParentTransactionID AND CS.BatchID=ITD.BatchID AND CS.CompanyID=ITD.CompanyID  " &
                    "Where ITM.VoucherID = -19  AND Isnull(ITD.IsDeletedTransaction,0)<>1 AND (ROUND((Isnull(ITD.IssueQuantity,0)-Isnull(CS.ConsumedStock,0)),3))>0 Order By TransactionID Desc "
            Else
                str = "Select Isnull(ITD.JobBookingID,0) AS JobBookingID,Isnull(ITD.ParentTransactionID,0) AS ParentTransactionID,Isnull(ITM.TransactionID,0) AS TransactionID,Isnull(ITM.DepartmentID,0) AS DepartmentID,Isnull(ITD.FloorWarehouseID,0) AS FloorWarehouseID,Isnull(ITD.JobBookingJobCardContentsID,0) AS JobBookingJobCardContentsID,Isnull(ITD.MachineID,0) AS MachineID,Isnull(ITD.ItemID,0) As ItemID,Isnull(IM.ItemGroupID,0) As ItemGroupID,Isnull(IGM.ItemGroupNameID,0) As ItemGroupNameID,Isnull(IM.ItemSubGroupID,0) As ItemSubGroupID,Nullif(ITM.VoucherNo,'') AS VoucherNo,   Replace(Convert(Varchar(13), ITM.VoucherDate, 106),' ','-') AS VoucherDate,Nullif(IM.ItemCode,'') AS ItemCode,Nullif(IGM.ItemGroupName,'') AS ItemGroupName,Nullif(ISGM.ItemSubGroupName,'') AS ItemSubGroupName,Nullif(IM.ItemName,'') AS ItemName,Nullif(IM.StockType,'') AS StockType,  Nullif(IM.StockCategory,'') AS StockCategory,   Nullif(IM.StockUnit,'') AS StockUnit,Isnull(ITD.BatchID,0) AS BatchID,Nullif(ITD.BatchNo,'') AS BatchNo,Nullif(IBD.SupplierBatchNo,'') AS SupplierBatchNo,Nullif(IBD.MfgDate,'') AS MfgDate,Nullif(IBD.ExpiryDate,'') AS ExpiryDate,Nullif(IT.VoucherNo,'') AS GRNNo,Replace(Convert(Varchar(13),IT.VoucherDate,106),' ','-') AS GRNDate,Nullif(JC.JobCardContentNo,'') AS JobCardNo,Isnull(ITD.IssueQuantity,0) AS IssueQuantity,Isnull(CS.ConsumedStock,0) AS ConsumeQuantity,ROUND((Isnull(ITD.IssueQuantity,0)-Isnull(CS.ConsumedStock,0)),3) AS FloorStock,Nullif(WM.WarehouseName,'') AS WarehouseName,Nullif(WM.BinName,'') AS Bin,Nullif(MM.MachineName,'') AS MachineName  " &
                    "From ItemTransactionMain As ITM INNER JOIN ItemTransactionDetail AS ITD ON ITD.TransactionID=ITM.TransactionID And ITD.CompanyID=ITM.CompanyID INNER JOIN ItemMaster AS IM ON IM.ItemID=ITD.ItemID And IM.CompanyID=ITD.CompanyID INNER JOIN ItemGroupMaster AS IGM ON IGM.ItemGroupID=IM.ItemGroupID And IGM.CompanyID=IM.CompanyID INNER JOIN ItemTransactionBatchDetail AS IBD ON IBD.BatchID=ITD.BatchID AND IBD.CompanyID=ITD.CompanyID  LEFT JOIN ItemSubGroupMaster AS ISGM ON ISGM.ItemSubGroupID=IM.ItemSubGroupID And ISGM.CompanyID=IM.CompanyID LEFT JOIN DepartmentMaster AS DM ON DM.DepartmentID=ITM.DepartmentID And DM.CompanyID=ITM.CompanyID LEFT JOIN JobBookingJobCardContents AS JC ON JC.JobBookingJobCardContentsID=ITD.JobBookingJobCardContentsID And JC.CompanyID=ITD.CompanyID LEFT JOIN JobBookingJobCard AS JJ ON JJ.JobBookingID=JC.JobBookingID And JJ.CompanyID=JC.CompanyID LEFT JOIN ItemTransactionMain As IT On IT.TransactionID=ITD.ParentTransactionID And IT.CompanyID=ITD.CompanyID LEFT JOIN WarehouseMaster AS WM ON WM.WarehouseID=ITD.FloorWarehouseID And WM.CompanyID=ITD.CompanyID LEFT JOIN MachineMaster AS MM ON MM.MachineID=ITD.MachineID And MM.CompanyID=ITD.CompanyID  LEFT JOIN (Select Isnull(ICD.IssueTransactionID,0) AS IssueTransactionID,Isnull(ICD.CompanyID,0) AS CompanyID,Isnull(ICD.ItemID,0) AS ItemID,Isnull(ICD.ParentTransactionID,0) AS ParentTransactionID,Isnull(ICD.DepartmentID,0) AS DepartmentID,Isnull(ICD.JobBookingJobCardContentsID,0) AS JobBookingJobCardContentsID ,Isnull(ICD.BatchID,0) AS BatchID,Nullif(ICD.BatchNo,'') AS BatchNo,ROUND((SUM(ISNULL(ICD.ConsumeQuantity,0))+SUM(ISNULL(ICD.ReturnQuantity,0))),3) AS ConsumedStock From ItemConsumptionMain AS ICM INNER JOIN ItemConsumptionDetail AS ICD ON ICM.ConsumptionTransactionID=ICD.ConsumptionTransactionID AND ICM.CompanyID=ICD.CompanyID " &
                    "Where Isnull(ICD.IsDeletedTransaction,0)=0 AND ICD.CompanyID= '" & GBLCompanyID & "' " &
                    "GROUP BY Isnull(ICD.IssueTransactionID,0),Isnull(ICD.CompanyID,0),Isnull(ICD.ItemID,0),Isnull(ICD.ParentTransactionID,0),Isnull(ICD.DepartmentID,0),Isnull(ICD.JobBookingJobCardContentsID,0),Isnull(ICD.BatchID,0),Nullif(ICD.BatchNo,'') HAVING ROUND(SUM(ISNULL(ICD.ConsumeQuantity, 0)) + SUM(ISNULL(ICD.ReturnQuantity, 0)), 3) > 0) AS CS ON CS.IssueTransactionID=ITM.TransactionID AND CS.ItemID=ITD.ItemID AND CS.ParentTransactionID=ITD.ParentTransactionID AND CS.BatchID=ITD.BatchID AND CS.CompanyID=ITD.CompanyID  " &
                    "Where ITM.VoucherID = -19 " & whstr & " AND Isnull(ITD.IsDeletedTransaction,0)<>1 AND (ROUND((Isnull(ITD.IssueQuantity,0)-Isnull(CS.ConsumedStock,0)),3))>0 Order By TransactionID Desc "
            End If

            db.FillDataTable(dataTable, str)
            data.Message = db.ConvertDataTableTojSonString(dataTable)
            js.MaxJsonLength = 2147483647
            Return js.Serialize(data.Message)
        Catch ex As Exception
            Return ex.Message
        End Try

    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SaveStockResetVoucher(ByVal prefix As String, ByVal voucherid As Integer, ByVal jsonObjectsTransactionMain As Object, ByVal jsonObjectsTransactionDetail As Object) As String

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

            VoucherNo = db.GeneratePrefixedNo("ItemConsumptionMain", prefix, "MaxVoucherNo", MaxVoucherNo, GBLFYear, " Where VoucherPrefix='" & prefix & "' AND VoucherID=" & voucherid & " And IsDeletedTransaction =0 And CompanyID=" & GBLCompanyID & " And FYear='" & GBLFYear & "' ")
            TableName = "ItemConsumptionMain"
            AddColName = "CreatedDate,UserID,CompanyID,FYear,CreatedBy,voucherDate,VoucherPrefix,MaxVoucherNo,VoucherNo"
            If DBType = "MYSQL" Then
                AddColValue = "Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "',Now(),'" & prefix & "','" & MaxVoucherNo & "','" & VoucherNo & "'"
            Else
                AddColValue = "GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "',GetDate(),'" & prefix & "','" & MaxVoucherNo & "','" & VoucherNo & "'"
            End If
            TransactionID = db.InsertDatatableToDatabase(jsonObjectsTransactionMain, TableName, AddColName, AddColValue)
            If IsNumeric(TransactionID) = False Then
                Return "Error: Main" & TransactionID
            End If

            TableName = "ItemConsumptionDetail"
            AddColName = "CreatedDate,UserID,CompanyID,FYear,CreatedBy,ConsumptionTransactionID"
            If DBType = "MYSQL" Then
                AddColValue = "Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & TransactionID & "'"
            Else
                AddColValue = "GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & TransactionID & "'"
            End If
            str = db.InsertDatatableToDatabase(jsonObjectsTransactionDetail, TableName, AddColName, AddColValue, "", TransactionID)
            If IsNumeric(str) = False Then
                db.ExecuteNonSQLQuery("Delete From ItemConsumptionMain Where CompanyID=" & GBLCompanyID & " And TransactionID=" & TransactionID)
                Return "Error: Details" & str
            End If

            If DBType = "MYSQL" Then
                db.ExecuteNonSQLQuery("Update ItemConsumptionDetail Set BatchID=TransactionDetailID Where ConsumptionTransactionID=" & TransactionID & " AND CompanyID=" & GBLCompanyID & " AND IFNULL(BatchID,0)=0 AND ParentTransactionID=TransactionID")
                'db.ExecuteNonSQLQuery("INSERT INTO ItemTransactionBatchDetail(BatchID, BatchNo, SupplierBatchNo, MfgDate, ExpiryDate, CompanyID, FYear, CreatedBy, CreatedDate)(Select BatchID,BatchNo,SupplierBatchNo, MfgDate, ExpiryDate, CompanyID, FYear, CreatedBy, CreatedDate From ItemTransactionDetail Where CompanyID = " & GBLCompanyID & " AND TransactionID = " & TransactionID & " AND ParentTransactionID=TransactionID)")

                db.ExecuteNonSQLQuery("CALL UPDATE_ITEM_STOCK_VALUES( " & GBLCompanyID & "," & TransactionID & ",0);")
            Else
                db.ExecuteNonSQLQuery("Update ItemConsumptionDetail Set BatchID=TransactionDetailID Where ConsumptionTransactionID=" & TransactionID & " AND CompanyID=" & GBLCompanyID & " AND Isnull(BatchID,0)=0 AND ParentTransactionID=TransactionID")
                ' db.ExecuteNonSQLQuery("INSERT INTO ItemTransactionBatchDetail(BatchID, BatchNo, SupplierBatchNo, MfgDate, ExpiryDate, CompanyID, FYear, CreatedBy, CreatedDate)(Select BatchID,BatchNo,SupplierBatchNo, MfgDate, ExpiryDate, CompanyID, FYear, CreatedBy, CreatedDate From ItemTransactionDetail Where CompanyID = " & GBLCompanyID & " AND TransactionID = " & TransactionID & " AND ParentTransactionID=TransactionID)")

                db.ExecuteNonSQLQuery("EXEC UPDATE_ITEM_STOCK_VALUES " & GBLCompanyID & "," & TransactionID & ",0")
            End If

            KeyField = "Success"

        Catch ex As Exception
            KeyField = "Error: " & ex.Message
        End Try
        Return KeyField

    End Function
    Public Class HelloWorldData
        Public Message As [String]
    End Class
End Class