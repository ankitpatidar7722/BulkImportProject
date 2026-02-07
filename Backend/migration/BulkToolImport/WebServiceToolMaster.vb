Imports System.Web
Imports System.Web.Services
Imports System.Web.Services.Protocols
Imports System.Data
Imports System.Data.SqlClient
Imports System.Web.Script.Services
Imports System.Web.Script.Serialization
Imports Connection
Imports Newtonsoft.Json
Imports FastReport.Table


' To allow this Web Service to be called from script, using ASP.NET AJAX, uncomment the following line.
<System.Web.Script.Services.ScriptService()>
<WebService(Namespace:="http://tempuri.org/")>
<WebServiceBinding(ConformsTo:=WsiProfiles.BasicProfile1_1)>
<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Public Class WebServiceToolMaster
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

    '---------------Open Master code---------------------------------
    '-----------------------------------Get Generate Tool No Using Prefix------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetGenerateToolNo(ByVal prefix As String, ByVal masterid As Integer) As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = db.GeneratePrefixedNo("ToolMaster", prefix, "MaxToolNo", 0, "", " Where IFNULL(IsDeletedTransaction,0)=0 And ToolGroupID=" & masterid & " And Prefix='" & prefix & "' And CompanyID=" & GBLCompanyID & "")
        Else
            str = db.GeneratePrefixedNo("ToolMaster", prefix, "MaxToolNo", 0, "", " Where Isnull(IsDeletedTransaction,0)=0 And ToolGroupID=" & masterid & " And Prefix='" & prefix & "' And CompanyID=" & GBLCompanyID & "")
        End If
        Return str

    End Function

    '-----------------------------------Get Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function MasterList() As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "SELECT  nullif(ToolGroupID,'') as ToolGroupID,nullif(ToolGroupName,'') as ToolGroupName FROM ToolGroupMaster Where CompanyID = '" & GBLCompanyID & "' and IFNULL(IsDeletedTransaction,0)<>1  Order By ToolGroupID"
        Else
            str = "SELECT  nullif(ToolGroupID,'') as ToolGroupID,nullif(ToolGroupName,'') as ToolGroupName FROM ToolGroupMaster Where CompanyID = '" & GBLCompanyID & "' and isnull(IsDeletedTransaction,0)<>1  Order By ToolGroupID "
        End If
        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Get Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function MasterGrid(ByVal masterID As String) As String

        Dim str2, Qery As String
        Dim dt As New DataTable
        js.MaxJsonLength = 2147483647

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str2 = "Select nullif(SelectQuery,'') as SelectQuery From ToolGroupMaster Where CompanyID='" & GBLCompanyID & "' and ToolGroupID='" & masterID & "' and IFNULL(IsDeletedTransaction,0)<>1"
        Else
            str2 = "Select nullif(SelectQuery,'') as SelectQuery From ToolGroupMaster Where CompanyID='" & GBLCompanyID & "' and ToolGroupID='" & masterID & "' and isnull(IsDeletedTransaction,0)<>1"
        End If
        db.FillDataTable(dt, str2)
        Dim i As Integer = dt.Rows.Count
        If i > 0 Then
            If IsDBNull(dt.Rows(0)(0)) = True Then
                Return ""
            Else
                Qery = dt.Rows(0)(0)
            End If
            Try
                If DBType = "MYSQL" Then
                    If Qery.ToUpper().Contains("CALL ") Then
                        str = Qery & " '' " & "," & GBLCompanyID & "," & masterID & ");"
                    Else
                        str = Qery
                    End If
                Else
                    If Qery.ToUpper().Contains("EXECUTE") Then
                        str = Qery & " '' " & "," & GBLCompanyID & "," & masterID
                    Else
                        str = Qery
                    End If
                End If
                db.FillDataTable(dataTable, str)
                data.Message = db.ConvertDataTableTojSonString(dataTable)
            Catch ex As Exception
                Return ex.Message
            End Try

        End If
        Return js.Serialize(data.Message)

    End Function

    '-----------------------------------Get MasterGridColumnHide------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function MasterGridColumnHide(ByVal masterID As String) As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "SELECT  nullif(GridColumnHide,'') as GridColumnHide,nullif(TabName,'') as TabName,nullif(ToolNameFormula,'') as ToolNameFormula,nullif(ToolDescriptionFormula,'') as ToolDescriptionFormula FROM ToolGroupMaster Where CompanyID = '" & GBLCompanyID & "'  and ToolGroupID= '" & masterID & "' and IFNULL(IsDeletedTransaction,0)<>1"
        Else
            str = "SELECT  nullif(GridColumnHide,'') as GridColumnHide,nullif(TabName,'') as TabName,nullif(ToolNameFormula,'') as ToolNameFormula,nullif(ToolDescriptionFormula,'') as ToolDescriptionFormula FROM ToolGroupMaster Where CompanyID = '" & GBLCompanyID & "'  and ToolGroupID= '" & masterID & "' and isnull(IsDeletedTransaction,0)<>1"
        End If
        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function


    '-----------------------------------Get Grid Column Name------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function MasterGridColumn(ByVal masterID As String) As String
        Dim dt As New DataTable

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "select nullif(GridColumnName,'') as GridColumnName,nullif(GridColumnHide,'') as GridColumnHide,nullif(ToolNameFormula,'') as ToolNameFormula,nullif(ToolDescriptionFormula,'') as ToolDescriptionFormula From ToolGroupMaster Where CompanyID='" & GBLCompanyID & "' and ToolGroupID='" & masterID & "' and IFNULL(IsDeletedTransaction,0)<>1"
        Else
            str = "select nullif(GridColumnName,'') as GridColumnName,nullif(GridColumnHide,'') as GridColumnHide,nullif(ToolNameFormula,'') as ToolNameFormula,nullif(ToolDescriptionFormula,'') as ToolDescriptionFormula From ToolGroupMaster Where CompanyID='" & GBLCompanyID & "' and ToolGroupID='" & masterID & "' and isnull(IsDeletedTransaction,0)<>1 "
        End If
        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)

        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Get Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function ToolMaster(ByVal masterID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))


        str = "SELECT Distinct nullif(ToolGroupFieldID,'') as ToolGroupFieldID,nullif(ToolGroupID,'') as ToolGroupID,nullif(FieldName,'') as FieldName,nullif(FieldDataType,'') as FieldDataType,nullif(FieldDescription,'') as FieldDescription,nullif(IsDisplay,'') as IsDisplay,nullif(IsCalculated,'') as IsCalculated,nullif(FieldFormula,'') as FieldFormula,nullif(FieldTabIndex,'') as FieldTabIndex,nullif(FieldDrawSequence,'') as FieldDrawSequence,nullif(FieldDefaultValue,'') as FieldDefaultValue,nullif(CompanyID,'') as CompanyID,nullif(UserID,'') as UserID,nullif(ModifiedDate,'') as ModifiedDate,  nullif(IsActive,'') as IsActive, nullif(FieldDisplayName,'') as FieldDisplayName,nullif(FieldType,'') as FieldType,nullif(SelectBoxQueryDB,'') as SelectBoxQueryDB,nullif(SelectBoxDefault,'') as SelectBoxDefault,nullif(ControllValidation,'') as ControllValidation,nullif(FieldFormulaString,'') as FieldFormulaString,nullif(IsRequiredFieldValidator,'') as IsRequiredFieldValidator,nullif(UnitMeasurement,'') as UnitMeasurement FROM ToolGroupFieldMaster Where CompanyID = " & GBLCompanyID & " and ToolGroupID='" & masterID & "' and isnull(IsDeletedTransaction,0)<>1 Order By FieldDrawSequence "

        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SaveToolMaster(ByVal JsonArrObjMainData As Object, ByVal JsonObjToolDetailRecord As Object, ByVal ToolGroupID As String) As String

        Dim dt As New DataTable
        Dim KeyField As String
        Dim ToolID As String
        Dim AddColName, AddColValue, TableName As String
        AddColName = ""
        AddColValue = ""

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try
            If DuplicateToolGroupValidate(ToolGroupID, JsonObjToolDetailRecord) = True Then
                Return "Duplicate data found"
            End If

            Dim dtToolCode As New DataTable
            Dim MaxToolID As Long
            Dim ToolCodePrefix, ToolCode As String

            ToolCodePrefix = JsonArrObjMainData(0)("Prefix")
            ToolCode = db.GeneratePrefixedNo("ToolMaster", ToolCodePrefix, "MaxToolNo", MaxToolID, "", " Where Prefix='" & ToolCodePrefix & "' And  CompanyID=" & GBLCompanyID & " And Isnull(IsDeletedTransaction,0)=0 ")

            Using SQlTrans As New Transactions.TransactionScope
                TableName = "ToolMaster"
                AddColName = "CreatedDate,UserID,CompanyID,CreatedBy,ToolCode,MaxToolNo"
                If DBType = "MYSQL" Then
                    AddColValue = "NOW(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLUserID & "','" & ToolCode & "'," & MaxToolID & ""
                Else
                    AddColValue = "Getdate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLUserID & "','" & ToolCode & "'," & MaxToolID & ""
                End If
                ToolID = db.InsertDatatableToDatabase(JsonArrObjMainData, TableName, AddColName, AddColValue)

                If IsNumeric(ToolID) = False Then
                    SQlTrans.Dispose()
                    Return "Error: " & ToolID
                End If

                TableName = "ToolMasterDetails"
                AddColName = "ModifiedDate,CreatedDate,UserID,CompanyID,ToolID,CreatedBy,ModifiedBy"
                'AddColValue = "GetDate(),GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & ToolID & "','" & GBLUserID & "','" & GBLUserID & "'"
                If DBType = "MYSQL" Then
                    AddColValue = "NOW(),NOW(),'" & GBLUserID & "','" & GBLCompanyID & "','" & ToolID & "','" & GBLUserID & "','" & GBLUserID & "'"
                Else
                    AddColValue = "Getdate(),Getdate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & ToolID & "','" & GBLUserID & "','" & GBLUserID & "'"
                End If
                str = db.InsertDatatableToDatabase(JsonObjToolDetailRecord, TableName, AddColName, AddColValue)
                If IsNumeric(str) = False Then
                    SQlTrans.Dispose()
                    Return "Error: " & str
                End If



                SQlTrans.Complete()
                KeyField = "Success"
            End Using

        Catch ex As Exception
            KeyField = "Error: " & ex.Message
        End Try
        Return KeyField

    End Function
    ''----------------------------Close Master  Save Data  ------------------------------------------

    ''----------------------------Open Master  Update Data  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function UpdateToolMasterData(ByVal JsonArrObjMainData As Object, ByVal JsonObjToolDetailRecord As Object, ByVal ToolID As String, ByVal ToolGroupID As String, ByVal FilejsonObjectsTransactionMain As Object) As String

        Dim dt As New DataTable
        Dim KeyField, str2 As String
        Dim AddColName, wherecndtn, TableName, AddColValue As String
        AddColName = ""

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try

            TableName = "ToolMaster"
            If DBType = "MYSQL" Then
                AddColName = "ModifiedDate=NOW(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "'"
            Else
                AddColName = "ModifiedDate=GetDate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "'"
            End If
            wherecndtn = "CompanyID=" & GBLCompanyID & " And ToolID=" & ToolID & " And ToolGroupID=" & ToolGroupID & ""
            db.UpdateDatatableToDatabase(JsonArrObjMainData, TableName, AddColName, 0, wherecndtn)

            Dim SomeSpcelCaseColName, SomeSpcelCaseColValue As String
            TableName = "ToolMasterDetails"
            If DBType = "MYSQL" Then
                AddColName = "ModifiedDate=NOW(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "'"
            Else
                AddColName = "ModifiedDate=GetDate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "'"
            End If
            wherecndtn = "CompanyID=" & GBLCompanyID & " And ToolID=" & ToolID & " And ToolGroupID=" & ToolGroupID & ""

            SomeSpcelCaseColName = "ModifiedDate,CreatedDate,UserID,CompanyID,ToolID,CreatedBy,ModifiedBy"
            If DBType = "MYSQL" Then
                SomeSpcelCaseColValue = "NOW(),NOW(),'" & GBLUserID & "','" & GBLCompanyID & "','" & ToolID & "','" & GBLUserID & "','" & GBLUserID & "'"
            Else
                SomeSpcelCaseColValue = "GetDate(),GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & ToolID & "','" & GBLUserID & "','" & GBLUserID & "'"
            End If

            Dim UniqueId, strUniqColName, strUniqColValue As String
            UniqueId = ""
            db.ConvertObjectToDatatable(JsonObjToolDetailRecord, dt)

            Dim Cnt As Integer = 1
            Dim Pvalue As Integer

            For i As Integer = 0 To dt.Rows.Count - 1
                str = ""
                UniqueId = ""
                strUniqColName = ""
                strUniqColValue = ""
                Cnt = 1
                Pvalue = 1
                For Each column In dt.Columns
                    strUniqColName = strUniqColName & column.ColumnName & ","
                    strUniqColValue = strUniqColValue & "'" & dt.Rows(i)(column.ColumnName) & "',"

                    If Cnt <= Pvalue Then
                        UniqueId = UniqueId & column.ColumnName & " ='" & dt.Rows(i)(column.ColumnName) & "' And "
                        Cnt = Cnt + 1
                    Else
                        str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
                    End If
                Next
                str = Left(str, Len(str) - 1)
                If UniqueId <> "" Then
                    UniqueId = Left(UniqueId, Len(UniqueId) - 4)
                End If
                If (wherecndtn <> "") Then
                    If UniqueId <> "" Then
                        UniqueId = UniqueId & " And " & wherecndtn
                    Else
                        UniqueId = wherecndtn
                    End If
                End If

                If (AddColName <> "") Then
                    If str <> "" Then
                        str = str & " , " & AddColName
                    Else
                        str = AddColName
                    End If
                End If

                If DBType = "MYSQL" Then
                    str2 = "Select * From " & TableName & " Where " & UniqueId & " and IFNULL(IsDeletedTransaction,0)<>1"
                Else
                    str2 = "Select * From " & TableName & " Where " & UniqueId & " and isnull(IsDeletedTransaction,0)<>1"
                End If
                Dim dtExistData As New DataTable
                db.FillDataTable(dtExistData, str2)
                Dim k As Integer = dtExistData.Rows.Count
                If k < 1 Then
                    Dim DTExistCol As New DataTable
                    db.FillDataTable(DTExistCol, str2)

                    For Each column In dt.Columns
                        Dim row As DataRow = DTExistCol.Select(column.ColumnName & " = '" & dt.Rows(i)(column.ColumnName) & "'").FirstOrDefault()
                        If row Is Nothing Then
                            Dim strInsert As String
                            strInsert = "Insert into " & TableName & " (" & strUniqColName & SomeSpcelCaseColName & ") Values(" & strUniqColValue & SomeSpcelCaseColValue & ")"
                            db.ExecuteNonSQLQuery(strInsert)
                            Exit For
                        End If
                    Next
                End If

                Dim strUpdate As String
                strUpdate = "Update " & TableName & " Set " & str & " Where " & UniqueId
                db.ExecuteNonSQLQuery(strUpdate)
            Next

            TableName = "ToolMasterFilesAttachments"
            wherecndtn = "ToolID='" & ToolID & "'"
            str = db.ExecuteNonSQLQuery("DELETE FROM " & TableName & " WHERE " & wherecndtn)
            If str <> "Success" Then
                Return "Error:Delete " & str
            End If

            TableName = "ToolMasterFilesAttachments"
            AddColName = "CreatedDate,UserID,CreatedBy,CompanyID,ToolID,ToolGroupID"
            AddColValue = "Getdate(),'" & GBLUserID & "','" & GBLUserID & "','" & GBLCompanyID & "','" & ToolID & "','" & ToolGroupID & "' "
            KeyField = db.InsertDatatableToDatabase(FilejsonObjectsTransactionMain, TableName, AddColName, AddColValue)
            If IsNumeric(KeyField) = False Then
                Return "Error:Main:- " & KeyField
            End If

            KeyField = "Success"
        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function
    ''----------------------------Close Master  Update Data  ------------------------------------------

    ''----------------------------Open Delete  Save Data  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function DeleteToolMasterData(ByVal ToolID As String, ByVal UnderGroupID As String) As String

        Dim dt As New DataTable
        Dim KeyField As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try
            If DBType = "MYSQL" Then
                str = "Update ToolMasterDetails Set DeletedBy='" & GBLUserID & "',DeletedDate=NOW(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and ToolID='" & ToolID & "' And ToolGroupID='" & UnderGroupID & "' "
                db.ExecuteNonSQLQuery(str)

                str = "Update ToolMaster Set DeletedBy='" & GBLUserID & "',DeletedDate=NOW(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and ToolID='" & ToolID & "' And ToolGroupID='" & UnderGroupID & "'  "
                db.ExecuteNonSQLQuery(str)
            Else
                str = "Update ToolMasterDetails Set DeletedBy='" & GBLUserID & "',DeletedDate=GetDate(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and ToolID='" & ToolID & "' And ToolGroupID='" & UnderGroupID & "' "
                db.ExecuteNonSQLQuery(str)

                str = "Update ToolMaster Set DeletedBy='" & GBLUserID & "',DeletedDate=GetDate(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and ToolID='" & ToolID & "' And ToolGroupID='" & UnderGroupID & "'  "
                db.ExecuteNonSQLQuery(str)

                str = "Update ToolMasterFilesAttachments Set DeletedBy='" & GBLUserID & "',DeletedDate=GetDate(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and ToolID='" & ToolID & "' And ToolGroupID='" & UnderGroupID & "'  "
                db.ExecuteNonSQLQuery(str)
            End If

            KeyField = "Success"

        Catch ex As Exception
            KeyField = "Error: " & ex.Message
        End Try
        Return KeyField

    End Function


    '-----------------------------------CheckPermission------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function CheckPermission(ByVal TransactionID As String) As String
        Dim KeyField As String
        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            Dim dtExist As New DataTable
            Dim dtExist1 As New DataTable
            Dim SxistStr As String

            Dim D1 As String = "", D2 As String = ""
            If DBType = "MYSQL" Then
                SxistStr = "select IFNULL(ToolID,0) as ToolID from ToolTransactionDetail where CompanyID='" & GBLCompanyID & "' and  ToolID= '" & TransactionID & "' and IFNULL(IsDeletedTransaction,0)<>1"
            Else
                SxistStr = "select isnull(ToolID,0) as ToolID from ToolTransactionDetail where CompanyID='" & GBLCompanyID & "' and  ToolID= '" & TransactionID & "' and isnull(IsDeletedTransaction,0)<>1"
            End If
            db.FillDataTable(dtExist, SxistStr)
            Dim E As Integer = dtExist.Rows.Count
            If E > 0 Then
                D1 = dtExist.Rows(0)(0)
            End If

            If DBType = "MYSQL" Then
                SxistStr = "Select  * From ToolTransactionDetail Where IFNULL(IsDeletedTransaction, 0) = 0 And IFNULL(QCApprovalNo,'')<>'' AND TransactionID=" & TransactionID & "  AND (IFNULL(ApprovedQuantity,0)>0 OR  IFNULL(RejectedQuantity,0)>0)"
            Else
                SxistStr = "Select  * From ToolTransactionDetail Where Isnull(IsDeletedTransaction, 0) = 0 And isnull(QCApprovalNo,'')<>'' AND TransactionID=" & TransactionID & "  AND (Isnull(ApprovedQuantity,0)>0 OR  Isnull(RejectedQuantity,0)>0)"
            End If
            db.FillDataTable(dtExist1, SxistStr)
            Dim F As Integer = dtExist1.Rows.Count
            If F > 0 Then
                D2 = dtExist1.Rows(0)(0)
            End If

            KeyField = ""

            If D1 <> "" Or D2 <> "" Then
                KeyField = "Exist"
            End If



        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function


    '-----------------------------------Get MasterGridLoadedData (Edit)------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function MasterGridLoadedData(ByVal masterID As String, ByVal Toolid As String) As String
        Dim dt As New DataTable
        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            If DBType = "MYSQL" Then
                If Val(Toolid) <> 0 Then
                    str = "CALL SelectedRowDataTool(" & GBLCompanyID & "," & masterID & "," & Toolid & ");"
                Else
                    str = "Select ToolGroupPrefix,0 AS ToolID," & masterID & " AS ToolGroupID,CompanyID,NULL AS Jobname,NULL AS LedgerName,0 AS ProductHSNID,NULL AS ProductHSNName,0 AS SizeH,0 AS SizeL,0 AS SizeW,0 AS TotalUps,0 AS UpsAcross,0 AS UpsAround,1 AS IsToolActive From ToolGroupMaster Where ToolGroupID =  " & masterID & " and CompanyID = " & GBLCompanyID & " AND IFNULL(IsDeletedTransaction,0)=0"
                End If
            Else
                If Val(Toolid) <> 0 Then
                    str = "Execute SelectedRowDataTool " & GBLCompanyID & "," & masterID & "," & Toolid
                Else
                    str = "Select ToolGroupPrefix as Prefix,0 AS ToolID," & masterID & " AS ToolGroupID,NULL AS JobCardNo,CompanyID,NULL AS Jobname,NULL AS LedgerName,0 AS ProductHSNID,NULL AS ProductHSNName,0 AS SizeH,0 AS SizeL,0 AS SizeW,0 AS TotalUps,0 AS UpsAcross,0 AS UpsAround,1 AS IsToolActive,'' As Category, '' As ProductStyle,'' AS Orientation,'' AS DieType, '' As VendorName,'' As TuckinFlap, '' As DieLife, '' As MachineName,'' As PlateSize, '' As ProcessColors, '' As FrontColors, '' As BackColors, '' As Remark, '' As SpecialFrontColors, '' As SpecialBackColors, '' As SheetSize, '' As PurchaseRate,'' As StockUnit From ToolGroupMaster Where ToolGroupID =  " & masterID & " and CompanyID = " & GBLCompanyID & " AND Isnull(IsDeletedTransaction,0)=0"
                End If
            End If
            db.FillDataTable(dataTable, str)
            'If Toolid = 0 Then
            '    dataTable.Rows.Add()
            'End If
            data.Message = db.ConvertDataTableTojSonString(dataTable)

            Return js.Serialize(data.Message)
        Catch ex As Exception
            Return ex.Message
        End Try

    End Function

    '-----------------------------------Get Tool Master Groups------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetToolGroups() As String
        Try

            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            If DBType = "MYSQL" Then
                str = "SELECT IFNULL(ToolGroupID,0) As ToolGroupID,nullif(ToolGroupNameDisplay,'') As ToolGroupName FROM ToolGroupMaster Where CompanyID = '" & GBLCompanyID & "' And IFNULL(IsDeletedTransaction,0)=0"
            Else
                str = "SELECT ISNULL(ToolGroupID,0) As ToolGroupID,nullif(ToolGroupNameDisplay,'') As ToolGroupName FROM ToolGroupMaster Where CompanyID = '" & GBLCompanyID & "' And Isnull(IsDeletedTransaction,0)=0"
            End If
            db.FillDataTable(dataTable, str)
            data.Message = db.ConvertDataTableTojSonString(dataTable)
            Return js.Serialize(data.Message)

        Catch ex As Exception
            Return "Error: " & ex.Message
        End Try
    End Function

    '-----------------------------------Get Tool Type------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetToolTypes() As String
        Try

            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            If DBType = "MYSQL" Then
                str = "SELECT nullif(ToolType,'') As ToolType FROM ToolMaster Where CompanyID = '" & GBLCompanyID & "' And IFNULL(IsDeletedTransaction,0)=0"
            Else
                str = "SELECT nullif(ToolType,'') As ToolType FROM ToolMaster Where CompanyID = '" & GBLCompanyID & "' And Isnull(IsDeletedTransaction,0)=0"
            End If
            db.FillDataTable(dataTable, str)
            data.Message = db.ConvertDataTableTojSonString(dataTable)
            Return js.Serialize(data.Message)

        Catch ex As Exception
            Return "Error: " & ex.Message
        End Try
    End Function

    '-----------------------------------Get Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetToolGroupFields(ByVal masterID As String) As String
        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "SELECT ToolGroupFieldID,ToolGroupID,nullif(FieldName,'') as FieldName,nullif(FieldDataType,'') as FieldDataType,nullif(FieldDescription,'') as FieldDescription,IsDisplay,IsCalculated,nullif(FieldFormula,'') as FieldFormula,nullif(FieldTabIndex,'') as FieldTabIndex,FieldDrawSequence,nullif(FieldDefaultValue,'') as FieldDefaultValue,UserID,IsActive,nullif(FieldDisplayName,'') as FieldDisplayName,nullif(FieldType,'') as FieldType,nullif(SelectBoxQueryDB,'') as SelectBoxQueryDB,nullif(SelectBoxDefault,'') as SelectBoxDefault,nullif(ControllValidation,'') as ControllValidation,nullif(FieldFormulaString,'') as FieldFormulaString,IsRequiredFieldValidator,nullif(UnitMeasurement,'') as UnitMeasurement FROM ToolGroupFieldMaster Where CompanyID = '" & GBLCompanyID & "' and ToolGroupID='" & masterID & "' and IFNULL(IsDeletedTransaction,0)=0 Order By FieldDrawSequence"
        Else
            str = "SELECT ToolGroupFieldID,ToolGroupID,nullif(FieldName,'') as FieldName,nullif(FieldDataType,'') as FieldDataType,nullif(FieldDescription,'') as FieldDescription,IsDisplay,IsCalculated,nullif(FieldFormula,'') as FieldFormula,nullif(FieldTabIndex,'') as FieldTabIndex,FieldDrawSequence,nullif(FieldDefaultValue,'') as FieldDefaultValue,UserID,IsActive,nullif(FieldDisplayName,'') as FieldDisplayName,nullif(FieldType,'') as FieldType,nullif(SelectBoxQueryDB,'') as SelectBoxQueryDB,nullif(SelectBoxDefault,'') as SelectBoxDefault,nullif(ControllValidation,'') as ControllValidation,nullif(FieldFormulaString,'') as FieldFormulaString,IsRequiredFieldValidator,nullif(UnitMeasurement,'') as UnitMeasurement FROM ToolGroupFieldMaster Where CompanyID = '" & GBLCompanyID & "' and ToolGroupID='" & masterID & "' and isnull(IsDeletedTransaction,0)=0 Order By FieldDrawSequence "
        End If
        db.FillDataTable(dataTable, str)

        data.Message = db.ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Get Dynamic SelectBoxLoad------------------------------------------

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SelectBoxLoad(ByVal Qery As String) As String

        Dim dt As New DataTable()
        Dim i As Integer
        Dim SI As String
        Dim ds As New DataSet()

        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            Dim QSQery, str3 As String
            Dim dtNew As New DataTable()

            If DBType = "MYSQL" Then
                str3 = "Select IFNULL(SelectboxQueryDB,'') As SelectboxQueryDB,FieldName  From ToolGroupFieldMaster Where CompanyID='" & GBLCompanyID & "' And ToolGroupFieldID IN(" & Qery & ") And IFNULL(SelectboxQueryDB,'')<>'' And IFNULL(IsDeletedTransaction,0)<>1"
            Else
                str3 = "Select Isnull(SelectboxQueryDB,'') As SelectboxQueryDB,FieldName  From ToolGroupFieldMaster Where CompanyID='" & GBLCompanyID & "' And ToolGroupFieldID IN(" & Qery & ") And Isnull(SelectboxQueryDB,'')<>'' And isnull(IsDeletedTransaction,0)<>1"
            End If
            db.FillDataTable(dtNew, str3)
            For i = 0 To dtNew.Rows.Count - 1
                If IsDBNull(dtNew.Rows(i)(0)) = True Then
                    Continue For
                Else
                    QSQery = dtNew.Rows(i)(0)
                    SI = dtNew.Rows(i)(1)
                    QSQery = Replace(QSQery, "#", "'")
                End If

                dt = New DataTable()
                db.FillDataTable(dt, QSQery)
                dt.NewRow()
                If dt.Columns.Count = 2 Then
                    If dt.Rows.Count > 0 Then
                        dt.Rows.Add(dt.Rows(0)(dt.Columns(0).ColumnName), SI)
                    Else
                        dt.Rows.Add(i, SI)
                    End If
                ElseIf dt.Columns.Count = 1 Then
                    dt.Rows.Add(SI)
                Else
                    dt.Columns.Add(SI, GetType(String))
                    dt.Rows.Add(SI)
                End If

                dt.TableName = SI
                ds.Tables.Add(dt)
            Next
            data.Message = db.ConvertDataSetsTojSonString(ds)
            Return js.Serialize(data.Message)
        Catch ex As Exception
            Return ex.Message
        End Try

    End Function

    '-----------------------------------Get FieldNameName (SaveAs)------------------------------------------
    Private Function DuplicateToolGroupValidate(ByVal TabelID As String, ByVal tblObj As Object) As Boolean
        Dim str2, ColValue As String
        Dim dtExist As New DataTable
        Dim dt As New DataTable
        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            If DBType = "MYSQL" Then
                str2 = "Select nullif(SaveAsString,'') as SaveAsString From ToolGroupMaster Where CompanyID='" & GBLCompanyID & "' and ToolGroupID='" & TabelID & "' and IFNULL(IsDeletedTransaction,0)<>1"
            Else
                str2 = "Select nullif(SaveAsString,'') as SaveAsString From ToolGroupMaster Where CompanyID='" & GBLCompanyID & "' and ToolGroupID='" & TabelID & "' and Isnull(IsDeletedTransaction,0)<>1"
            End If
            db.FillDataTable(dtExist, str2)
            If dtExist.Rows.Count > 0 Then
                If IsDBNull(dtExist.Rows(0)(0)) = True Then
                    Return False
                Else
                    Dim GetColumn As String
                    GetColumn = dtExist.Rows(0)(0)
                    db.ConvertObjectToDatatable(tblObj, dt)
                    ColValue = ""
                    Dim BrakCount = ""
                    For i As Integer = 0 To dt.Rows.Count - 1
                        If GetColumn.Contains(dt.Rows(i)("FieldName")) Then
                            If ColValue = "" Then
                                If DBType = "MYSQL" Then
                                    ColValue = " And IFNULL(IsDeletedTransaction,0)<>1 And ToolID In(Select Distinct ToolID From ToolMasterDetails Where FieldName='" & dt.Rows(i)("FieldName") & "' And FieldValue='" & dt.Rows(i)("FieldValue") & "'"
                                Else
                                    ColValue = " And Isnull(IsDeletedTransaction,0)<>1 And ToolID In(Select Distinct ToolID From ToolMasterDetails Where FieldName='" & dt.Rows(i)("FieldName") & "' And FieldValue='" & dt.Rows(i)("FieldValue") & "'"
                                End If
                                BrakCount = " )"
                            Else
                                ColValue = ColValue & " And ToolID In(Select Distinct ToolID From ToolMasterDetails Where FieldName='" & dt.Rows(i)("FieldName") & "' And FieldValue='" & dt.Rows(i)("FieldValue") & "'"
                                BrakCount = BrakCount & ")"
                            End If
                        End If
                    Next
                    str2 = "Select Distinct ToolID From ToolMasterDetails Where CompanyID=" & GBLCompanyID & " And ToolGroupID=" & TabelID & ColValue & BrakCount
                    dtExist = New DataTable
                    db.FillDataTable(dtExist, str2)
                    If dtExist.Rows.Count > 0 Then
                        Return True
                    End If
                End If
            Else
                Return False
            End If
            Return False
        Catch ex As Exception
            Return True
        End Try
    End Function


    '--------------------------------------Master Group Creation-------------------------------
    '-----------------------------------Get UnderGroupName------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetUnderGroup() As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))

        str = "Select distinct ToolSubGroupID,ToolSubGroupDisplayName from ToolSubGroupMaster Where CompanyID='" & GBLCompanyID & "'"
        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Get GroupName Grid------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SetDiePWOFieldValue(ByVal JobBookinhNo As String) As String
        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
        str = "SELECT B.AcrossGap,B.AroundGap,B.JobBookingJobCardContentsID,A.ClientName,A.JobBookingID, C.SizeHeight,C.SizeLength,C.SizeWidth, B.UpsL,B.UpsW,B.TotalUps,A.JobName FROM JobBookingJobCard AS A INNER JOIN  JobBookingJobCardContents AS B ON A.JobBookingID = B.JobBookingID AND ISNULL(B.IsDeletedTransaction,0)<>1 INNER JOIN JobBookingJobCardContentsSpecification AS C ON A.JobBookingID = C.JobBookingID AND ISNULL(C.IsDeletedTransaction,0)<>1 Where ISNULL(A.IsDeletedTransaction,0)<>1 AND A.JobBookingNo ='" & JobBookinhNo & "'"
        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Get GroupName Grid------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetGroup() As String
        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "Select distinct ISGM.ToolSubGroupUniqueID,ISGM.ToolSubGroupID,ISGM.ToolSubGroupDisplayName,ISGM.UnderSubGroupID,ISGM.ToolSubGroupName,ISGM.ToolSubGroupLevel ,(select ToolSubGroupDisplayName from ToolSubGroupMaster where ToolSubGroupID=ISGM.UnderSubGroupID and CompanyID=ISGM.CompanyID limit 1) as GroupName from ToolSubGroupMaster  as ISGM  where CompanyID='" & GBLCompanyID & "' and IFNULL(IsDeletedTransaction,0)<>1"
        Else
            str = "Select distinct ISGM.ToolSubGroupUniqueID,ISGM.ToolSubGroupID,ISGM.ToolSubGroupDisplayName,ISGM.UnderSubGroupID,ISGM.ToolSubGroupName,ISGM.ToolSubGroupLevel ,(select top 1 ToolSubGroupDisplayName from ToolSubGroupMaster where ToolSubGroupID=ISGM.UnderSubGroupID and CompanyID=ISGM.CompanyID) as GroupName from ToolSubGroupMaster  as ISGM  where CompanyID='" & GBLCompanyID & "' and Isnull(IsDeletedTransaction,0)<>1"
        End If
        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    ''----------------------------Open Master  Save Data  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SaveGroupData(ByVal CostingDataGroupMaster As Object, ByVal GroupName As String, ByVal UnderGroupID As String) As String

        Dim dt As New DataTable
        Dim KeyField, str2, GroupLevel As String
        Dim AddColName, AddColValue, TableName As String
        AddColName = ""
        AddColValue = ""

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try

            Dim dtExist As New DataTable
            Dim ToolSubGroupID As Integer

            If DBType = "MYSQL" Then
                str2 = "select distinct nullif(ToolSubGroupName,'') as ToolSubGroupName from ToolSubGroupMaster where CompanyID='" & GBLCompanyID & "' and ToolSubGroupName= '" & GroupName & "' and IFNULL(IsDeletedTransaction,0)<>1"
            Else
                str2 = "select distinct nullif(ToolSubGroupName,'') as ToolSubGroupName " &
                "from ToolSubGroupMaster where CompanyID='" & GBLCompanyID & "' and ToolSubGroupName= '" & GroupName & "' " &
                "and isnull(IsDeletedTransaction,0)<>1"
            End If
            db.FillDataTable(dtExist, str2)
            Dim E As Integer = dtExist.Rows.Count
            If E > 0 Then
                KeyField = "Exist"
            Else

                Dim dt1 As New DataTable
                If DBType = "MYSQL" Then
                    str2 = "Select IFNULL(max(ToolSubGroupID),0) + 1 As ToolSubGroupID From ToolSubGroupMaster Where  CompanyID='" & GBLCompanyID & "' and IFNULL(IsDeletedTransaction,0)<>1"
                Else
                    str2 = "Select isnull(max(ToolSubGroupID),0) + 1 As ToolSubGroupID From ToolSubGroupMaster Where  CompanyID='" & GBLCompanyID & "' and Isnull(IsDeletedTransaction,0)<>1"
                End If
                db.FillDataTable(dt1, str2)
                Dim i As Integer = dt1.Rows.Count
                If i > 0 Then
                    ToolSubGroupID = dt1.Rows(0)(0)
                End If

                Dim dt2 As New DataTable
                If DBType = "MYSQL" Then
                    str2 = "Select IFNULL(ToolSubGroupLevel,0) ToolSubGroupLevel From ToolSubGroupMaster Where ToolSubGroupID = '" & UnderGroupID & "' And CompanyID='" & GBLCompanyID & "' and IFNULL(IsDeletedTransaction,0)<>1"
                Else
                    str2 = "Select isnull(ToolSubGroupLevel,0) ToolSubGroupLevel From ToolSubGroupMaster Where ToolSubGroupID = '" & UnderGroupID & "' And CompanyID='" & GBLCompanyID & "' and Isnull(IsDeletedTransaction,0)<>1"
                End If
                db.FillDataTable(dt2, str2)
                Dim k As Integer = dt2.Rows.Count
                GroupLevel = k + 1

                TableName = "ToolSubGroupMaster"
                AddColName = "ModifiedDate,CreatedDate,UserID,CompanyID,ToolSubGroupID,CreatedBy,ModifiedBy,ToolSubGroupLevel"
                If DBType = "MYSQL" Then
                    AddColValue = "NOW(),NOW(),'" & GBLUserID & "','" & GBLCompanyID & "','" & ToolSubGroupID & "','" & GBLUserID & "','" & GBLUserID & "','" & GroupLevel & "'"
                Else
                    AddColValue = "GetDate(),GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & ToolSubGroupID & "','" & GBLUserID & "','" & GBLUserID & "','" & GroupLevel & "'"
                End If
                db.InsertDatatableToDatabase(CostingDataGroupMaster, TableName, AddColName, AddColValue)

                KeyField = "Success"
            End If

        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function

    ''----------------------------Open Master  Update Data  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function UpdatGroupData(ByVal CostingDataGroupMaster As Object, ByVal ToolSubGroupUniqueID As String, ByVal ToolSubGroupLevel As String, ByVal GroupName As String) As String

        Dim dt As New DataTable
        Dim KeyField, str2 As String
        Dim AddColName, wherecndtn, TableName As String
        AddColName = ""

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try
            Dim dtExist As New DataTable
            If DBType = "MYSQL" Then
                str2 = "select distinct nullif(ToolSubGroupName,'') as ToolSubGroupName from ToolSubGroupMaster where CompanyID='" & GBLCompanyID & "' and ToolSubGroupName= '" & GroupName & "' AND ToolSubGroupUniqueID<>" & ToolSubGroupUniqueID & " and IFNULL(IsDeletedTransaction,0)<>1"
            Else
                str2 = "select distinct nullif(ToolSubGroupName,'') as ToolSubGroupName " &
                "from ToolSubGroupMaster where CompanyID='" & GBLCompanyID & "' and ToolSubGroupName= '" & GroupName & "' AND ToolSubGroupUniqueID<>" & ToolSubGroupUniqueID & " " &
                "and isnull(IsDeletedTransaction,0)<>1"
            End If
            db.FillDataTable(dtExist, str2)

            Dim E As Integer = dtExist.Rows.Count
            If E > 0 Then
                KeyField = "Exist"
            Else
                TableName = "ToolSubGroupMaster"
                If DBType = "MYSQL" Then
                    AddColName = "ModifiedDate=NOW(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "',ToolSubGroupLevel='" & ToolSubGroupLevel & "'"
                Else
                    AddColName = "ModifiedDate=GetDate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "',ToolSubGroupLevel='" & ToolSubGroupLevel & "'"
                End If
                wherecndtn = "CompanyID=" & GBLCompanyID & " And ToolSubGroupUniqueID=" & ToolSubGroupUniqueID & " "
                db.UpdateDatatableToDatabase(CostingDataGroupMaster, TableName, AddColName, 0, wherecndtn)

                KeyField = "Success"
            End If

        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField
    End Function

    ''----------------------------Open GroupMaster Delete  Save Data  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function DeleteGroupMasterData(ByVal ToolSubGroupUniqueID As String) As String

        Dim dt As New DataTable
        Dim KeyField As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try
            If DBType = "MYSQL" Then
                str = "Update ToolSubGroupMaster Set DeletedBy='" & GBLUserID & "',DeletedDate=NOW(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and ToolSubGroupUniqueID='" & ToolSubGroupUniqueID & "'"
            Else
                str = "Update ToolSubGroupMaster Set DeletedBy='" & GBLUserID & "',DeletedDate=GetDate(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and ToolSubGroupUniqueID='" & ToolSubGroupUniqueID & "'"
            End If
            db.ExecuteNonSQLQuery(str)

            KeyField = "Success"
        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetFilesAttachmentData(ByVal GblToolID As String) As String
        Dim str As String = "select FileID,ToolID,ToolGroupID,AttachmentFilesName as AttachedFileName ,AttachmentFilesName as AttachedFileUrl ,AttachedFileRemark from ToolMasterFilesAttachments where ToolID = '" & GblToolID & "' And Isnull(IsDeletedTransaction,0)=0 "
        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
        js.MaxJsonLength = 2147483647
        Return js.Serialize(data.Message)
    End Function

    Public Class HelloWorldData
        Public Message As [String]
    End Class


End Class