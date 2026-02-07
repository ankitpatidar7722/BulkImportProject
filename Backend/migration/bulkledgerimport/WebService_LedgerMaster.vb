Imports System.Web
Imports System.Web.Services
Imports System.Web.Services.Protocols
Imports System.Data
Imports System.Data.SqlClient
Imports System.Web.Script.Services
Imports System.Web.Script.Serialization
Imports Connection
Imports System.Web.Configuration

Imports Microsoft.VisualBasic
Imports System.Configuration
Imports Newtonsoft.Json
Imports MySql.Data.MySqlClient
Imports Connection.DBConnection
Imports System.Net.Http
Imports System.Net

' To allow this Web Service to be called from script, using ASP.NET AJAX, uncomment the following line.
<System.Web.Script.Services.ScriptService()>
<WebService(Namespace:="http://tempuri.org/")>
<WebServiceBinding(ConformsTo:=WsiProfiles.BasicProfile1_1)>
<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Public Class WebService_LedgerMaster
    Inherits System.Web.Services.WebService

    Private DA As SqlDataAdapter
    Private MYDA As MySqlDataAdapter
    ReadOnly db As New DBConnection
    ReadOnly js As New JavaScriptSerializer()
    ReadOnly data As New HelloWorldData()
    Dim dataTable As New DataTable()
    Dim str As String

    Dim GBLUserID As String
    Dim GBLUserName As String
    Dim GBLBranchID As String
    Dim GBLCompanyID As String
    Dim GBLFYear As String
    Dim DBType As String = ""

    Public Function ConvertDataTableTojSonString(ByVal dataTable As DataTable) As String
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

    Public Function DataSetToJSONWithJavaScriptSerializer(ByVal dataset As DataSet) As String
        Dim jsSerializer As JavaScriptSerializer = New JavaScriptSerializer()
        Dim ssvalue As Dictionary(Of String, Object) = New Dictionary(Of String, Object)()

        For Each table As DataTable In dataset.Tables
            Dim parentRow As New List(Of Dictionary(Of String, Object))()
            Dim childRow As Dictionary(Of String, Object)
            Dim tablename As String = table.TableName

            For Each row As DataRow In table.Rows
                childRow = New Dictionary(Of String, Object)()

                For Each col As DataColumn In table.Columns
                    childRow.Add(col.ColumnName, row(col))
                Next

                parentRow.Add(childRow)
            Next

            ssvalue.Add(tablename, parentRow)
        Next

        Return jsSerializer.Serialize(ssvalue)
    End Function


    '---------------Open Master code---------------------------------

    '-----------------------------------Get Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function MasterList() As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        str = "SELECT Distinct IGM.LedgerGroupID,IGM.LedgerGroupName,IGM.LedgerGroupNameDisplay,IGM.LedgerGroupNameID FROM LedgerGroupMaster As IGM Inner Join UserSubModuleAuthentication As UMA On UMA.LedgerGroupID=IGM.LedgerGroupID And UMA.CompanyID=IGM.CompanyID And UMA.CanView=1 Where IGM.IsDeletedTransaction=0 And IGM.CompanyID = " & GBLCompanyID & " And UMA.UserID=" & GBLUserID & " Order By IGM.LedgerGroupID"
        'str = "SELECT  nullif(LedgerGroupID,'') as LedgerGroupID,nullif(LedgerGroupName,'') as LedgerGroupName,nullif(LedgerGroupNameDisplay,'') as LedgerGroupNameDisplay ,nullif(LedgerGroupNameID,'') as LedgerGroupNameID FROM LedgerGroupMaster Where CompanyID = '" & GBLCompanyID & "' and isnull(IsDeletedTransaction,0)<>1  Order By LedgerGroupID "
        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Get Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function MasterGrid(ByVal masterID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"
        Dim str2, Qery As String
        Dim dt As New DataTable
        js.MaxJsonLength = 2147483647

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLUserName = Convert.ToString(HttpContext.Current.Session("UserName"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        GBLBranchID = Convert.ToString(HttpContext.Current.Session("BranchId"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        str2 = ""
        If DBType = "MYSQL" Then
            str2 = "Select nullif(SelectQuery,'') as SelectQuery From LedgerGroupMaster Where CompanyID='" & GBLCompanyID & "' and LedgerGroupID='" & masterID & "' and IFNULL(IsDeletedTransaction,0)<>1"
        Else
            str2 = "Select nullif(SelectQuery,'') as SelectQuery From LedgerGroupMaster Where CompanyID='" & GBLCompanyID & "' and LedgerGroupID='" & masterID & "' and isnull(IsDeletedTransaction,0)<>1"
        End If

        db.FillDataTable(dt, str2)
        Dim i As Integer = dt.Rows.Count
        If i > 0 Then
            If IsDBNull(dt.Rows(0)(0)) = True Then
                Return js.Serialize("")
            Else
                Qery = dt.Rows(0)(0)
            End If
            Try
                If DBType = "MYSQL" Then
                    If Qery.ToUpper().Contains("CALL ") Then
                        str = Qery & "( '' " & "," & GBLCompanyID & "," & masterID & ");"
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
                'str = Qery & " '' " & "," & GBLCompanyID & "," & masterID
                db.FillDataTable(dataTable, str)
                data.Message = ConvertDataTableTojSonString(dataTable)
            Catch ex As Exception
                Return ex.Message
            End Try

        End If
        Return js.Serialize(data.Message)

    End Function


    ''************************ Logic Convert Object To DataTable *** Using Newtonsoft *******************************
    Public Function ConvertObjectToDatatableNEW(ByVal jsonObject As Object, ByRef datatable As DataTable) As DataTable
        Try
            Dim st As String = JsonConvert.SerializeObject(jsonObject)
            datatable = JsonConvert.DeserializeObject(Of DataTable)(st)

        Catch ex As Exception
            str = ex.Message
        End Try
        Return datatable
    End Function

    '-----------------------------------Get MasterGridColumnHide------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function MasterGridColumnHide(ByVal masterID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLUserName = Convert.ToString(HttpContext.Current.Session("UserName"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        GBLBranchID = Convert.ToString(HttpContext.Current.Session("BranchId"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "SELECT  nullif(GridColumnHide,'') as GridColumnHide,nullif(TabName,'') as TabName,nullif(ConcernPerson,'') as ConcernPerson,nullif(EmployeeMachineAllocation,'') as EmployeeMachineAllocation FROM LedgerGroupMaster Where CompanyID = '" & GBLCompanyID & "'  and LedgerGroupID= '" & masterID & "' and IFNULL(IsDeletedTransaction,0)<>1"
        Else
            str = "SELECT  nullif(GridColumnHide,'') as GridColumnHide,nullif(TabName,'') as TabName,nullif(ConcernPerson,'') as ConcernPerson,nullif(EmployeeMachineAllocation,'') as EmployeeMachineAllocation FROM LedgerGroupMaster Where CompanyID = '" & GBLCompanyID & "'  and LedgerGroupID= '" & masterID & "' and isnull(IsDeletedTransaction,0)<>1"
        End If

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function


    '-----------------------------------Get Grid Column Name------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function MasterGridColumn(ByVal masterID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"
        Dim dt As New DataTable


        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLUserName = Convert.ToString(HttpContext.Current.Session("UserName"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        GBLBranchID = Convert.ToString(HttpContext.Current.Session("BranchId"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "select nullif(GridColumnName,'') as GridColumnName From LedgerGroupMaster Where CompanyID='" & GBLCompanyID & "' and LedgerGroupID='" & masterID & "' and IFNULL(IsDeletedTransaction,0)<>1 "
        Else
            str = "select nullif(GridColumnName,'') as GridColumnName From LedgerGroupMaster Where CompanyID='" & GBLCompanyID & "' and LedgerGroupID='" & masterID & "' and isnull(IsDeletedTransaction,0)<>1 "
        End If

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)

        Return js.Serialize(data.Message)

    End Function


    ''----------------------------Open Master  Save Data  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SaveData(ByVal CostingDataLedgerMaster As Object, ByVal CostingDataLedgerDetailMaster As Object, ByVal MasterName As String, ByVal ActiveLedger As String, ByVal LedgerGroupID As String, ByVal LedgerRefCode As String) As String

        Dim dt As New DataTable
        Dim KeyField, LedgerID As String
        Dim AddColName, AddColValue, TableName As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try
            If DuplicateLedgerGroupValidate(LedgerGroupID, CostingDataLedgerDetailMaster) = True Then
                Return "Duplicate data found"
            End If

            Dim dtLedgerCode As New DataTable
            Dim MaxLedgerID As Long
            Dim LedgerCodestr2, LedgerCodePrefix, LedgerCode As String
            If DBType = "MYSQL" Then
                LedgerCodestr2 = "select nullif(LedgerGroupPrefix,'') as LedgerGroupPrefix from  LedgerGroupMaster Where  CompanyID='" & GBLCompanyID & "' And LedgerGroupID='" & LedgerGroupID & "' and ifnull(IsDeletedTransaction,0)<>1"
            Else
                LedgerCodestr2 = "select nullif(LedgerGroupPrefix,'') as LedgerGroupPrefix from  LedgerGroupMaster Where  CompanyID='" & GBLCompanyID & "' And LedgerGroupID='" & LedgerGroupID & "' and isnull(IsDeletedTransaction,0)<>1"
            End If
            db.FillDataTable(dtLedgerCode, LedgerCodestr2)
            LedgerCodePrefix = dtLedgerCode.Rows(0)(0)

            LedgerCode = db.GeneratePrefixedNo("LedgerMaster", LedgerCodePrefix, "MaxLedgerNo", MaxLedgerID, "", " Where LedgerGroupID=" & LedgerGroupID & " And LedgerCodeprefix='" & LedgerCodePrefix & "' And  CompanyID=" & GBLCompanyID & " And IsDeletedTransaction=0")
            If db.CheckAuthories("LedgerMaster.aspx", GBLUserID, GBLCompanyID, "CanSave", LedgerCode) = False Then Return "You are not authorized to save"

            If db.GetColumnValue("CanSave", "UserSubModuleAuthentication", " UserID=" & GBLUserID & " And LedgerGroupID=" & LedgerGroupID & " And CompanyID=" & GBLCompanyID) = False Then Return "You are not authorized to save..!"

            str = "Select top(1) Nullif(LedgerRefCode,'') as LedgerRefCode from LedgerMaster where LedgerRefCode = '" & LedgerRefCode & "' And CompanyID = '" & GBLCompanyID & "'And Isnull(IsDeletedTransaction,0) = 0"
            db.FillDataTable(dt, str)
            If dt.Rows.Count > 0 AndAlso Not IsDBNull(dt.Rows(0)(0)) Then
                Return "Ledger Ref. Code already exists."
            End If
            TableName = "LedgerMaster"
            AddColName = "ModifiedDate,CreatedDate,UserID,CompanyID,FYear,CreatedBy,ModifiedBy,LedgerCode,LedgerCodeprefix,MaxLedgerNo"
            If DBType = "MYSQL" Then
                AddColValue = "Now(),Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & LedgerCode & "','" & LedgerCodePrefix & "'," & MaxLedgerID
            Else
                AddColValue = "GetDate(),GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & LedgerCode & "','" & LedgerCodePrefix & "'," & MaxLedgerID
            End If
            Dim IsClientGroup As Boolean = False
            Dim sql As String = "SELECT LedgerGroupNameID FROM LedgerGroupMaster WHERE LedgerGroupID=" & LedgerGroupID & " AND CompanyID=" & GBLCompanyID
            Dim dtLG As New DataTable
            db.FillDataTable(dtLG, sql)
            If dtLG.Rows.Count > 0 Then
                If Convert.ToInt32(dtLG.Rows(0)("LedgerGroupNameID")) = 24 Then
                    IsClientGroup = True
                End If
            End If
            If IsClientGroup = True Then
                AddColName &= ",IsClientApproval,IsLead,IsClient"
                AddColValue &= ",1,1,1"
            End If
            LedgerID = db.InsertDatatableToDatabase(CostingDataLedgerMaster, TableName, AddColName, AddColValue)

            If IsNumeric(LedgerID) = False Then

                Return "fail" & LedgerID
            End If

            TableName = "LedgerMasterDetails"
            AddColName = "ModifiedDate,CreatedDate,UserID,CompanyID,LedgerID,FYear,CreatedBy,ModifiedBy"
            If DBType = "MYSQL" Then
                AddColValue = "Now(),Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & LedgerID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "'"
            Else
                AddColValue = "GetDate(),GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & LedgerID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "'"
            End If
            str = db.InsertDatatableToDatabase(CostingDataLedgerDetailMaster, TableName, AddColName, AddColValue)
            If IsNumeric(str) = False Then

                Return "fail" & str
            End If
            If DBType = "MYSQL" Then
                str = "Insert into LedgerMasterDetails (ModifiedDate,CreatedDate,UserID,CompanyID,LedgerID,FYear,CreatedBy,ModifiedBy,FieldValue,ParentFieldValue,ParentFieldName,FieldName,LedgerGroupID) values(Now(),Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & LedgerID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & ActiveLedger & "','" & ActiveLedger & "','ISLedgerActive','ISLedgerActive','" & LedgerGroupID & "')"
            Else
                str = "Insert into LedgerMasterDetails (ModifiedDate,CreatedDate,UserID,CompanyID,LedgerID,FYear,CreatedBy,ModifiedBy,FieldValue,ParentFieldValue,ParentFieldName,FieldName,LedgerGroupID) values(GetDate(),GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & LedgerID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & ActiveLedger & "','" & ActiveLedger & "','ISLedgerActive','ISLedgerActive','" & LedgerGroupID & "')"
            End If
            db.ExecuteNonSQLQuery(str)

            ''Create And update mailing addresss string
            '' Now shifted in stored procdure on 12-11-20 by pKp
            'db.ExecuteNonSQLQuery("Update LedgerMasterDetails Set FieldValue= LMS.Address1+','+Case When ISNULL(LMS.Address2,'')='' Then '' Else LMS.Address2+',' End + CHAR(13)+CHAR(10) +Case When ISNULL(LMS.Address3,'')='' Then '' Else LMS.Address3+',' End +LMS.City+Case When ISNULL(LMS.Pincode,'')='' Then '' Else '-'+LMS.Pincode+',' End + CHAR(13)+CHAR(10) +Case When ISNULL(LMS.[District] ,'')='' Then '' Else 'Dist./Province -'+LMS.[District] +',' End  + LMS.[State] +' - '+ LMS.Country From LedgerMasterDetails As LMD Inner Join LedgerMaster As LM On LM.LedgerID=LMD.LedgerID And LM.CompanyID=" & GBLCompanyID & " Inner Join LedgerMasterData As LMS On LMS.LedgerID=LMD.LedgerID And LMS.LedgerGroupID=LMD.LedgerGroupID Where LMD.FieldName='MailingAddress' And LM.LedgerID=" & LedgerID & " ")
            If DBType = "MYSQL" Then
                db.ExecuteNonSQLQuery("CALL UpdateLedgerMasterValues( " & GBLCompanyID & "," & LedgerID & ");")
            Else
                db.ExecuteNonSQLQuery("EXEC UpdateLedgerMasterValues " & GBLCompanyID & "," & LedgerID)
            End If
            KeyField = "Success"


        Catch ex As Exception
            KeyField = "fail"
        End Try

        Return KeyField
    End Function
    ''----------------------------Close Master  Save Data  ------------------------------------------

    ''----------------------------Open Master  Update Data  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function UpdateData(ByVal CostingDataLedgerMaster As Object, ByVal CostingDataLedgerDetailMaster As Object, ByVal MasterName As String, ByVal LedgerID As String, ByVal UnderGroupID As String, ByVal ActiveLedger As String, ByVal LedgerRefCode As String) As String

        Dim dt As New DataTable
        Dim KeyField, str2 As String
        Dim AddColName, wherecndtn, TableName As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If db.IsDeletable("IsLocked", "LedgerMaster", "Where IsLocked=1 And LedgerID= " & LedgerID & " And CompanyID = " & GBLCompanyID & " ") = False Then
            KeyField = "fail"
            Return KeyField
            Exit Function
        End If
        If db.CheckAuthories("LedgerMaster.aspx", GBLUserID, GBLCompanyID, "CanEdit", LedgerID) = False Then Return "You are not authorized to update"

        If db.GetColumnValue("CanEdit", "UserSubModuleAuthentication", " UserID=" & GBLUserID & " And LedgerGroupID=" & UnderGroupID & " And CompanyID=" & GBLCompanyID) = False Then Return "You are not authorized to update..!"

        str = "Select top(1) Nullif(LedgerRefCode,'') as LedgerRefCode from LedgerMaster where LedgerRefCode = '" & LedgerRefCode & "' And LedgerID <> '" & LedgerID & "' And CompanyID = '" & GBLCompanyID & "'And Isnull(IsDeletedTransaction,0) = 0"
        db.FillDataTable(dt, str)
        If dt.Rows.Count > 0 AndAlso Not IsDBNull(dt.Rows(0)(0)) Then
            Return "Ledger Ref. Code already exists."
        End If
        Try

            TableName = "LedgerMaster"
            If DBType = "MYSQL" Then
                AddColName = "ModifiedDate=Now(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "'"
            Else
                AddColName = "ModifiedDate=GetDate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "'"
            End If
            wherecndtn = "CompanyID=" & GBLCompanyID & " And LedgerID=" & LedgerID & " And LedgerGroupID=" & UnderGroupID & ""
            db.UpdateDatatableToDatabase(CostingDataLedgerMaster, TableName, AddColName, 0, wherecndtn)

            Dim SomeSpcelCaseColName, SomeSpcelCaseColValue As String
            TableName = "LedgerMasterDetails"
            If DBType = "MYSQL" Then
                AddColName = "ModifiedDate=Now(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "'"
            Else
                AddColName = "ModifiedDate=GetDate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "'"
            End If
            wherecndtn = "CompanyID=" & GBLCompanyID & " And LedgerID=" & LedgerID & " And LedgerGroupID=" & UnderGroupID & ""

            SomeSpcelCaseColName = "ModifiedDate,CreatedDate,UserID,CompanyID,LedgerID,FYear,CreatedBy,ModifiedBy"
            If DBType = "MYSQL" Then
                SomeSpcelCaseColValue = "Now(),Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & LedgerID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "'"
            Else
                SomeSpcelCaseColValue = "GetDate(),GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & LedgerID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "'"
            End If

            Dim UniqueId, strUniqColName, strUniqColValue As String
            UniqueId = ""
            ConvertObjectToDatatableNEW(CostingDataLedgerDetailMaster, dt)

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

                str2 = ""
                If DBType = "MYSQL" Then
                    str2 = "Select * From " & TableName & " Where " & UniqueId & " and ifnull(IsDeletedTransaction,0)<>1"
                Else
                    str2 = "Select * From " & TableName & " Where " & UniqueId & " and isnull(IsDeletedTransaction,0)<>1"
                End If
                Dim dtExistData As New DataTable
                db.FillDataTable(dtExistData, str2)
                Dim k As Integer = dtExistData.Rows.Count
                If k < 1 Then
                    Dim DTExistCol As New DataTable
                    FillDataTableNEW(DTExistCol, str2)

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

            str2 = ""
            If DBType = "MYSQL" Then
                str2 = "Select nullif(ParentFieldValue,'') as ParentFieldValue From LedgerMasterDetails Where ParentFieldName='ISLedgerActive' and FieldName='ISLedgerActive' and LedgerID='" & LedgerID & "'  and LedgerGroupID='" & UnderGroupID & "' and CompanyID=" & GBLCompanyID & " and ifnull(IsDeletedTransaction,0)<>1"
            Else
                str2 = "Select nullif(ParentFieldValue,'') as ParentFieldValue From LedgerMasterDetails Where ParentFieldName='ISLedgerActive' and FieldName='ISLedgerActive' and LedgerID='" & LedgerID & "'  and LedgerGroupID='" & UnderGroupID & "' and CompanyID=" & GBLCompanyID & " and isnull(IsDeletedTransaction,0)<>1"
            End If
            Dim dtexist As New DataTable
            db.FillDataTable(dtexist, str2)
            Dim x As Integer = dtexist.Rows.Count
            If x = 0 Then
                If DBType = "MYSQL" Then
                    str = ""
                    str = "insert into LedgerMasterDetails (ModifiedDate,CreatedDate,UserID,CompanyID,LedgerID,FYear,CreatedBy,ModifiedBy,FieldValue,ParentFieldValue,ParentFieldName,FieldName,LedgerGroupID) values(Now(),Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & LedgerID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','True','True','ISLedgerActive','ISLedgerActive','" & UnderGroupID & "')"
                    db.ExecuteNonSQLQuery(str)

                    str = ""
                    str = "insert into LedgerMaster (ModifiedDate,CreatedDate,UserID,CompanyID,LedgerID,FYear,CreatedBy,ModifiedBy,ISLedgerActive,LedgerGroupID) values(Now(),Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & LedgerID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','True','" & UnderGroupID & "')"
                    db.ExecuteNonSQLQuery(str)
                Else
                    str = ""
                    str = "insert into LedgerMasterDetails (ModifiedDate,CreatedDate,UserID,CompanyID,LedgerID,FYear,CreatedBy,ModifiedBy,FieldValue,ParentFieldValue,ParentFieldName,FieldName,LedgerGroupID) values(GetDate(),GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & LedgerID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','True','True','ISLedgerActive','ISLedgerActive','" & UnderGroupID & "')"
                    db.ExecuteNonSQLQuery(str)

                    str = ""
                    str = "insert into LedgerMaster (ModifiedDate,CreatedDate,UserID,CompanyID,LedgerID,FYear,CreatedBy,ModifiedBy,ISLedgerActive,LedgerGroupID) values(GetDate(),GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & LedgerID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','True','" & UnderGroupID & "')"
                    db.ExecuteNonSQLQuery(str)
                End If
            Else
                Dim ActiveLedgerUpdate As String
                Dim ActiveLedgerUpdateMaster As String
                If DBType = "MYSQL" Then
                    ActiveLedgerUpdate = "Update LedgerMasterDetails Set ModifiedDate=Now(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "',FieldValue='" & ActiveLedger & "',ParentFieldValue='" & ActiveLedger & "'  Where ParentFieldName='ISLedgerActive' and FieldName='ISLedgerActive' and LedgerID='" & LedgerID & "'  and LedgerGroupID='" & UnderGroupID & "' and CompanyID=" & GBLCompanyID & ""
                    db.ExecuteNonSQLQuery(ActiveLedgerUpdate)

                    ActiveLedgerUpdateMaster = "Update LedgerMaster Set ModifiedDate=Now(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "',ISLedgerActive='" & ActiveLedger & "'  Where  LedgerID='" & LedgerID & "'  and LedgerGroupID='" & UnderGroupID & "' and CompanyID=" & GBLCompanyID & ""
                    db.ExecuteNonSQLQuery(ActiveLedgerUpdateMaster)
                Else
                    ActiveLedgerUpdate = "Update LedgerMasterDetails Set ModifiedDate=GetDate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "',FieldValue='" & ActiveLedger & "',ParentFieldValue='" & ActiveLedger & "'  Where ParentFieldName='ISLedgerActive' and FieldName='ISLedgerActive' and LedgerID='" & LedgerID & "'  and LedgerGroupID='" & UnderGroupID & "' and CompanyID=" & GBLCompanyID & ""
                    db.ExecuteNonSQLQuery(ActiveLedgerUpdate)

                    ActiveLedgerUpdateMaster = "Update LedgerMaster Set ModifiedDate=GetDate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "',ISLedgerActive='" & ActiveLedger & "'  Where  LedgerID='" & LedgerID & "'  and LedgerGroupID='" & UnderGroupID & "' and CompanyID=" & GBLCompanyID & ""
                    db.ExecuteNonSQLQuery(ActiveLedgerUpdateMaster)
                End If

            End If

            ''Update all fields from details to main table for time being On 12-11-20
            If DBType = "MYSQL" Then
                db.ExecuteNonSQLQuery("CALL UpdateLedgerMasterValues( " & GBLCompanyID & "," & LedgerID & ");")
            Else
                db.ExecuteNonSQLQuery("EXEC UpdateLedgerMasterValues " & GBLCompanyID & "," & LedgerID)
            End If
            'db.UpdateDatatableToDatabase(CostingDataLedgerDetailMaster, TableName, AddColName, 1, wherecndtn, SomeSpcelCaseColName, SomeSpcelCaseColValue)

            KeyField = "Success"

        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function
    ''----------------------------Close Master  Update Data  ------------------------------------------

    Public Sub FillDataTableNEW(ByRef DataTableObj As DataTable, ByVal SqlSelectQuery As String, Optional ByVal SqlStoredProcedure As String = "")
        Try
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            If DBType = "MYSQL" Then
                Dim con1 As New MySqlConnection
                con1 = db.OpenDataBaseMYSQL()

                Dim cmd As MySqlCommand
                If Trim(SqlSelectQuery) = "" Then
                    cmd = New MySqlCommand(SqlStoredProcedure, con1) With {
                        .CommandType = CommandType.StoredProcedure
                    }
                Else
                    cmd = New MySqlCommand(SqlSelectQuery, con1)
                End If
                MYDA = New MySqlDataAdapter(cmd)
                MYDA.Fill(DataTableObj)
                con1.Close()
            Else
                Dim con As New SqlConnection
                con = db.OpenDataBase()

                Dim cmd As SqlCommand
                If Trim(SqlSelectQuery) = "" Then
                    cmd = New SqlCommand(SqlStoredProcedure, con) With {
                        .CommandType = CommandType.StoredProcedure
                    }
                Else
                    cmd = New SqlCommand(SqlSelectQuery, con)
                End If
                DA = New SqlDataAdapter(cmd)
                DA.Fill(DataTableObj)
                con.Close()
            End If

        Catch ex As Exception
            MsgBox(ex.Message)
        End Try
    End Sub

    ''----------------------------Open Delete  Save Data  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function DeleteData(ByVal txtGetGridRow As String, ByVal MasterName As String, ByVal UnderGroupID As String) As String

        Dim KeyField As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLUserName = Convert.ToString(HttpContext.Current.Session("UserName"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try

            If db.CheckAuthories("LedgerMaster.aspx", GBLUserID, GBLCompanyID, "CanDelete") = False Then Return "You are not authorized to delete"

            If db.GetColumnValue("CanDelete", "UserSubModuleAuthentication", " UserID=" & GBLUserID & " And LedgerGroupID=" & UnderGroupID & " And CompanyID=" & GBLCompanyID) = False Then Return "You are not authorized to delete..!"

            If db.IsDeletable("IsLocked", "LedgerMaster", "Where IsLocked=1 And LedgerID= " & txtGetGridRow & " And CompanyID = " & GBLCompanyID & " ") = False Then
                KeyField = "fail"
                Return KeyField
                Exit Function
            End If

            'Dim distblName, str3 As String
            'Dim s As String = "ConcernPersonMaster,ClientMachineCostSettings,EmployeeMachineAllocation,ItemPurchaseOrderTaxes,ItemTransactionMain,JobBooking,SupplierWisePurchaseSetting"
            'Dim list As String() = s.Split(",")
            'For i = 0 To list.Length - 1
            '    distblName = ""
            '    distblName = list(i)

            '    Dim dtNew As New DataTable()
            '    str3 = ""
            '    str3 = "select isnull(LedgerID,0) LedgerID from " & distblName & " Where CompanyID='" & GBLCompanyID & "' and LedgerID=" & txtGetGridRow & " and isnull(IsDeletedTransaction,0)<>1"
            '    db.FillDataTable(dtNew, str3)
            '    Dim E As Integer = dtNew.Rows.Count
            '    If E > 0 Then
            '        KeyField = "Exist"
            '        Return KeyField
            '    End If
            'Next

            str = ""
            If DBType = "MYSQL" Then
                str = "Update LedgerMasterDetails Set DeletedBy='" & GBLUserID & "',DeletedDate=Now(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & txtGetGridRow & "' And LedgerGroupID='" & UnderGroupID & "' "
                db.ExecuteNonSQLQuery(str)

                str = ""
                str = "Update LedgerMaster Set DeletedBy='" & GBLUserID & "',DeletedDate=Now(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & txtGetGridRow & "' And LedgerGroupID='" & UnderGroupID & "'  "
                db.ExecuteNonSQLQuery(str)
            Else
                str = "Update LedgerMasterDetails Set DeletedBy='" & GBLUserID & "',DeletedDate=GetDate(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & txtGetGridRow & "' And LedgerGroupID='" & UnderGroupID & "' "
                db.ExecuteNonSQLQuery(str)

                str = ""
                str = "Update LedgerMaster Set DeletedBy='" & GBLUserID & "',DeletedDate=GetDate(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & txtGetGridRow & "' And LedgerGroupID='" & UnderGroupID & "'  "
                db.ExecuteNonSQLQuery(str)
            End If

            'db.ExecuteNonSQLQuery("Delete from LedgerMasterDetails WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & txtGetGridRow & "' And LedgerGroupID='" & UnderGroupID & "' ")
            'db.ExecuteNonSQLQuery("Delete from LedgerMaster WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & txtGetGridRow & "' And LedgerGroupID='" & UnderGroupID & "' ")

            KeyField = "Success"


        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function


    '-----------------------------------CheckPermission------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function CheckPermission(ByVal LedgerID As String) As String
        Dim KeyField As String = ""
        Try

            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            Dim distblName As String = "", str3 As String = ""
            Dim s As String = "ConcernPersonMaster,ClientMachineCostSettings,EmployeeMachineAllocation,ItemPurchaseOrderTaxes,ItemTransactionMain,JobBooking,SupplierWisePurchaseSetting,JobOrderBooking"
            Dim list As String() = s.Split(",")
            For i = 0 To list.Length - 1
                distblName = ""
                distblName = list(i)

                Dim dtNew As New DataTable()
                str3 = ""
                If DBType = "MYSQL" Then
                    str3 = "select IFNULL(LedgerID,0) LedgerID from " & distblName & " Where CompanyID='" & GBLCompanyID & "' and LedgerID=" & LedgerID & " and IFNULL(IsDeletedTransaction,0)<>1"
                Else
                    str3 = "select isnull(LedgerID,0) LedgerID from " & distblName & " Where CompanyID='" & GBLCompanyID & "' and LedgerID=" & LedgerID & " and isnull(IsDeletedTransaction,0)<>1"
                End If
                db.FillDataTable(dtNew, str3)
                Dim E As Integer = dtNew.Rows.Count
                If E > 0 Then
                    KeyField = "Exist"
                    Return KeyField
                End If
            Next

        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function


    '-----------------------------------Get MasterGridLoadedData (Edit)------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function MasterGridLoadedData(ByVal masterID As String, ByVal Ledgerid As String) As String
        Dim dt As New DataTable

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
        Dim selQ As String
        If DBType = "MYSQL" Then
            selQ = "CALL SelectedRowLedger(  '',"
            str = selQ & GBLCompanyID & "," & masterID & "," & Ledgerid & ");"
        Else
            selQ = "Execute SelectedRowLedger  '',"
            str = selQ & GBLCompanyID & "," & masterID & "," & Ledgerid
        End If
        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)

        Return js.Serialize(data.Message)

    End Function

    '-----------------------------------Get Drill down Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function DrillDownMasterGrid(ByVal masterID As String, ByVal TabID As String, ByVal LedgerID As Integer) As String
        Dim str2, Qery As String
        Dim dt As New DataTable

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str2 = "Select SelectQuery From LedgerMasterDrilDown Where IFNULL(SelectQuery,'')<>'' And IsDeletedTransaction=0 And CompanyID='" & GBLCompanyID & "' And LedgerGroupID='" & masterID & "' and TabName='" & TabID & "' and IFNULL(IsDeletedTransaction,0)<>1"
        Else
            str2 = "Select SelectQuery From LedgerMasterDrilDown Where IsNull(SelectQuery,'')<>'' And IsDeletedTransaction=0 And CompanyID='" & GBLCompanyID & "' And LedgerGroupID='" & masterID & "' and TabName='" & TabID & "' and isnull(IsDeletedTransaction,0)<>1"
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
                    If Qery.StartsWith("Call") Then
                        Qery = Qery & " '' " & "," & GBLCompanyID & "," & masterID & ");"
                    Else
                        Qery = Qery.Replace("@CompanyID", GBLCompanyID)
                        Qery = Qery.Replace("@LedgerGroupID", masterID)
                        Qery = Qery.Replace("@LedgerID", LedgerID)
                    End If
                Else
                    If Qery.StartsWith("Exec") Then
                        Qery = Qery & " '' " & "," & GBLCompanyID & "," & masterID
                    Else
                        Qery = Qery.Replace("@CompanyID", GBLCompanyID)
                        Qery = Qery.Replace("@LedgerGroupID", masterID)
                        Qery = Qery.Replace("@LedgerID", LedgerID)
                    End If
                End If

                db.FillDataTable(dataTable, Qery)
                data.Message = ConvertDataTableTojSonString(dataTable)
            Catch ex As Exception
                Return ex.Message
            End Try

        End If
        js.MaxJsonLength = 2147483647
        Return js.Serialize(data.Message)

    End Function

    '-----------------------------------Get Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function Master(ByVal masterID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLUserName = Convert.ToString(HttpContext.Current.Session("UserName"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        GBLBranchID = Convert.ToString(HttpContext.Current.Session("BranchId"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "SELECT  nullif(LedgerGroupFieldID,'') as LedgerGroupFieldID,nullif(LedgerGroupID,'') as LedgerGroupID,nullif(FieldName,'') as FieldName,nullif(FieldDataType,'') as FieldDataType,nullif(FieldDescription,'') as FieldDescription,nullif(IsDisplay,'') as IsDisplay,nullif(IsCalculated,'') as IsCalculated,nullif(FieldFormula,'') as FieldFormula,nullif(FieldTabIndex,'') as FieldTabIndex,nullif(FieldDrawSequence,'') as FieldDrawSequence,nullif(FieldDefaultValue,'') as FieldDefaultValue,nullif(CompanyID,'') as CompanyID,nullif(UserID,'') as UserID,Convert(date_format(IfNULL(ModifiedDate,CURRENT_TIMESTAMP),'%d-%b-%Y'),char(30)) As ModifiedDate,nullif(FYear,'') as FYear,nullif(IsActive,'') as IsActive,nullif(IsDeleted,'') as IsDeleted,nullif(FieldDisplayName,'') as FieldDisplayName,nullif(FieldType,'') as FieldType,nullif(SelectBoxQueryDB,'') as SelectBoxQueryDB,nullif(SelectBoxDefault,'') as SelectBoxDefault,nullif(ControllValidation,'') as ControllValidation,nullif(FieldFormulaString,'') as FieldFormulaString,nullif(IsRequiredFieldValidator,'') as IsRequiredFieldValidator FROM LedgerGroupFieldMaster Where CompanyID = '" & GBLCompanyID & "' and LedgerGroupID='" & masterID & "' and IFNULL(IsDeletedTransaction,0)<>1 Order By FieldDrawSequence"
        Else
            str = "SELECT  nullif(LedgerGroupFieldID,'') as LedgerGroupFieldID,nullif(LedgerGroupID,'') as LedgerGroupID,nullif(FieldName,'') as FieldName,nullif(FieldDataType,'') as FieldDataType,nullif(FieldDescription,'') as FieldDescription,nullif(IsDisplay,'') as IsDisplay,nullif(IsCalculated,'') as IsCalculated,nullif(FieldFormula,'') as FieldFormula,nullif(FieldTabIndex,'') as FieldTabIndex,nullif(FieldDrawSequence,'') as FieldDrawSequence,nullif(FieldDefaultValue,'') as FieldDefaultValue,nullif(CompanyID,'') as CompanyID,nullif(UserID,'') as UserID,nullif(ModifiedDate,'') as ModifiedDate,nullif(FYear,'') as FYear,nullif(IsActive,'') as IsActive,nullif(IsDeleted,'') as IsDeleted,nullif(FieldDisplayName,'') as FieldDisplayName,nullif(FieldType,'') as FieldType,nullif(SelectBoxQueryDB,'') as SelectBoxQueryDB,nullif(SelectBoxDefault,'') as SelectBoxDefault,nullif(ControllValidation,'') as ControllValidation,NULLIF (ControllValidationByKey, '') AS ControllValidationByKey, nullif(FieldFormulaString,'') as FieldFormulaString,nullif(IsRequiredFieldValidator,'') as IsRequiredFieldValidator FROM LedgerGroupFieldMaster Where CompanyID = '" & GBLCompanyID & "' and LedgerGroupID='" & masterID & "' and isnull(IsDeletedTransaction,0)<>1 Order By FieldDrawSequence "
        End If
        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Get Dynamic SelectBoxLoad------------------------------------------

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SelectBoxLoad(ByVal Qery As String, ByVal selID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"
        Dim dt As New DataTable()
        Dim i As Integer
        Dim QS, SI As String

        Dim ds As New DataSet()

        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
            GBLUserName = Convert.ToString(HttpContext.Current.Session("UserName"))
            GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
            GBLBranchID = Convert.ToString(HttpContext.Current.Session("BranchId"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            Dim NewQuery As String() = Qery.Split("?")
            Dim NewSelID As String() = selID.Split("?")



            For i = 0 To NewQuery.Length - 1
                dt = New DataTable()
                QS = ""
                QS = NewQuery(i)

                SI = ""
                SI = NewSelID(i)


                Dim QSQery, str3 As String
                Dim dtNew As New DataTable()
                str3 = ""
                If DBType = "MYSQL" Then
                    str3 = "Select nullif(SelectboxQueryDB,'') as SelectboxQueryDB From LedgerGroupFieldMaster Where CompanyID='" & GBLCompanyID & "' and LedgerGroupFieldID=" & QS & " and IFNULL(IsDeletedTransaction,0)<>1"
                Else
                    str3 = "Select nullif(SelectboxQueryDB,'') as SelectboxQueryDB From LedgerGroupFieldMaster Where CompanyID='" & GBLCompanyID & "' and LedgerGroupFieldID=" & QS & " and isnull(IsDeletedTransaction,0)<>1"
                End If

                db.FillDataTable(dtNew, str3)
                If IsDBNull(dtNew.Rows(0)(0)) = True Then
                    Return js.Serialize("")
                Else
                    QSQery = dtNew.Rows(0)(0)
                    QSQery = Replace(QSQery, "#", "'")
                End If



                If QSQery = "" Then
                    Return js.Serialize("")
                Else
                    str = ""
                    str = QSQery
                End If



                db.FillDataTable(dt, str)
                dt.NewRow()
                If dt.Columns.Count = 2 Then
                    If dt.Rows.Count > 0 Then
                        dt.Rows.Add(dt.Rows(0)(dt.Columns(0).ColumnName), SI)
                    Else
                        dt.Rows.Add(0, SI)
                    End If
                ElseIf dt.Columns.Count = 1 Then
                    dt.Rows.Add(SI)
                Else
                    dt.Columns.Add(SI, GetType(String))
                    dt.Rows.Add(SI)
                End If

                ds.Tables.Add(dt)
                data.Message = DataSetToJSONWithJavaScriptSerializer(ds)
                'Context.Response.Clear()
                'Context.Response.Write(data.Message)

            Next
            Return js.Serialize(data.Message)

        Catch ex As Exception
            Return ex.Message
        End Try

    End Function

    '-----------------------------------Get Ledger Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function ConvertLedgerToConsignee(ByVal LedID As Integer) As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try
            Dim DTLedgerCode, DTConsignee As New DataTable
            Dim MaxLedgerID As Long
            Dim LedgerCodestr2, LedgerCodePrefix, LedgerCode, LedgerGroupID, NewLedgerID As String
            If DBType = "MYSQL" Then
                LedgerCodestr2 = "Select nullif(LedgerGroupPrefix,'') As Prefix,LedgerGroupID from  LedgerGroupMaster Where IFNULL(IsDeletedTransaction,0)=0 And CompanyID=" & GBLCompanyID & " And LedgerGroupID=(Select LedgerGroupID From LedgerGroupMaster Where LedgerGroupNameID=44 And CompanyID=" & GBLCompanyID & ") And IFNULL(IsDeletedTransaction,0)=0"
            Else
                LedgerCodestr2 = "Select nullif(LedgerGroupPrefix,'') As Prefix,LedgerGroupID from  LedgerGroupMaster Where Isnull(IsDeletedTransaction,0)=0 And CompanyID='" & GBLCompanyID & "' And LedgerGroupID=(Select LedgerGroupID From LedgerGroupMaster Where LedgerGroupNameID=44 And CompanyID=" & GBLCompanyID & ") And Isnull(IsDeletedTransaction,0)=0"
            End If
            db.FillDataTable(DTLedgerCode, LedgerCodestr2)
            If DTLedgerCode.Rows.Count > 0 Then
                LedgerCodePrefix = DTLedgerCode.Rows(0)("Prefix")
                LedgerGroupID = DTLedgerCode.Rows(0)("LedgerGroupID")

                'str = "Select LedgerID From LedgerMaster Where LedgerName =(Select LedgerName From LedgerMaster Where LedgerID=" & LedID & " And CompanyID=" & GBLCompanyID & " And Isnull(IsDeletedTransaction,0)<>1) And LedgerGroupID=" & LedgerGroupID & " And CompanyID=" & GBLCompanyID
                str = "Select LedgerID,LedgerName From LedgerMaster Where LedgerGroupID=(Select LedgerGroupID From LedgerGroupMaster Where LedgerGroupNameID=24 And CompanyID=" & GBLCompanyID & ")  And CompanyID=" & GBLCompanyID & " And IsDeletedTransaction=0 And LedgerName Not In (Select Distinct LedgerName From LedgerMaster Where IsDeletedTransaction=0 And LedgerGroupID=" & LedgerGroupID & " And CompanyID=" & GBLCompanyID & ")"
                db.FillDataTable(DTConsignee, str)
                If DTConsignee.Rows.Count > 0 Then
                    If DBType = "MYSQL" Then
                        Dim con As New MySqlConnection
                        con = db.OpenDataBaseMYSQL()
                        Dim cmd As New MySqlCommand()

                        For i = 0 To DTConsignee.Rows.Count - 1
                            LedID = DTConsignee.Rows(i)("LedgerID")

                            LedgerCode = db.GeneratePrefixedNo("LedgerMaster", LedgerCodePrefix, "MaxLedgerNo", MaxLedgerID, "", " Where LedgerCodeprefix='" & LedgerCodePrefix & "' And  CompanyID=" & GBLCompanyID & " And ifnull(IsDeletedTransaction,0)=0")

                            Using updateTransaction As New Transactions.TransactionScope
                                str = "Insert Into LedgerMaster(LedgerCode, MaxLedgerNo, LedgerCodePrefix, LedgerName, LedgerDescription, LedgerUnitID, LedgerType, LedgerGroupID, ISLedgerActive, CompanyID, UserID, CreatedDate, IsBlocked, FYear, IsLocked, CreatedBy)" &
                                                    " SELECT '" & LedgerCode & "', " & MaxLedgerID & ", '" & LedgerCodePrefix & "', LedgerName, Replace(LedgerDescription,'Client:','Consignee:'), LedgerUnitID, 'Consignee', " & LedgerGroupID & ", IsLedgerActive, CompanyID, " & GBLUserID & ", NOW(), IsBlocked,FYear, IsLocked, " & GBLUserID & " FROM LedgerMaster As LM Where LM.LedgerID=" & LedID & " And LM.CompanyID=" & GBLCompanyID & "; Select LAST_INSERT_ID();"

                                cmd = New MySqlCommand(str, con)
                                NewLedgerID = cmd.ExecuteScalar()

                                If IsNumeric(NewLedgerID) = False Then
                                    con.Close()
                                    updateTransaction.Dispose()
                                    Return NewLedgerID & LedID
                                End If

                                Dim DtDetails As New DataTable
                                str = "SELECT ParentLedgerID, ParentFieldName, ParentFieldValue," & NewLedgerID & " As LedgerID, FieldID, FieldName, FieldValue, SequenceNo," & LedgerGroupID & " As LedgerGroupID," & GBLCompanyID & " As CompanyID," & GBLUserID & " As UserID, NOW() As CreatedDate,'" & GBLFYear & "' As FYear FROM LedgerMasterDetails Where FieldName IN(Select Distinct FieldName From LedgerGroupFieldMaster Where LedgerGroupID=" & LedgerGroupID & ") And (LedgerID = " & LedID & ") And CompanyID=" & GBLCompanyID
                                db.FillDataTable(DtDetails, str)
                                str = db.InsertSecondaryDataJobCard(DtDetails, "LedgerMasterDetails", "CreatedBy", GBLUserID, "", "", "")
                                If str <> "200" Then
                                    con.Close()
                                    updateTransaction.Dispose()
                                    Return str & LedID
                                End If

                                str = "Insert into LedgerMasterDetails (CreatedDate,UserID,CompanyID,LedgerID,FYear,CreatedBy,ModifiedBy,FieldValue,ParentFieldValue,ParentFieldName,FieldName,LedgerGroupID,SequenceNo) " &
                                    " values(NOW(),'" & GBLUserID & "','" & GBLCompanyID & "','" & NewLedgerID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & LedID & "','" & LedID & "','RefClientID','RefClientID','" & LedgerGroupID & "',20)"
                                db.ExecuteNonSQLQuery(str)

                                db.ExecuteNonSQLQuery("CALL UpdateLedgerMasterValues( " & GBLCompanyID & "," & NewLedgerID & ");")

                                updateTransaction.Complete()
                            End Using
                        Next
                        con.Close()
                    Else
                        Dim con As New SqlConnection
                        con = db.OpenDataBase()
                        Dim cmd As New SqlCommand()

                        For i = 0 To DTConsignee.Rows.Count - 1
                            LedID = DTConsignee.Rows(i)("LedgerID")

                            LedgerCode = db.GeneratePrefixedNo("LedgerMaster", LedgerCodePrefix, "MaxLedgerNo", MaxLedgerID, "", " Where LedgerCodeprefix='" & LedgerCodePrefix & "' And  CompanyID=" & GBLCompanyID & " And isnull(IsDeletedTransaction,0)=0")

                            Using updateTransaction As New Transactions.TransactionScope
                                str = "Insert Into LedgerMaster(LedgerCode, MaxLedgerNo, LedgerCodePrefix, LedgerName, LedgerDescription, LedgerUnitID, LedgerType, LedgerGroupID, ISLedgerActive, CompanyID, UserID, CreatedDate, IsBlocked, FYear, IsLocked, CreatedBy)" &
                                                    " SELECT '" & LedgerCode & "', " & MaxLedgerID & ", '" & LedgerCodePrefix & "', LedgerName, Replace(LedgerDescription,'Client:','Consignee:'), LedgerUnitID, 'Consignee', " & LedgerGroupID & ", IsLedgerActive, CompanyID, " & GBLUserID & ", GETDATE(), IsBlocked,FYear, IsLocked, " & GBLUserID & " FROM LedgerMaster As LM Where LM.LedgerID=" & LedID & " And LM.CompanyID=" & GBLCompanyID & "; Select SCOPE_IDENTITY();"

                                cmd = New SqlCommand(str, con)
                                NewLedgerID = cmd.ExecuteScalar()

                                If IsNumeric(NewLedgerID) = False Then
                                    con.Close()
                                    updateTransaction.Dispose()
                                    Return NewLedgerID & LedID
                                End If

                                Dim DtDetails As New DataTable
                                str = "SELECT ParentLedgerID, ParentFieldName, ParentFieldValue," & NewLedgerID & " As LedgerID, FieldID, FieldName, FieldValue, SequenceNo," & LedgerGroupID & " As LedgerGroupID," & GBLCompanyID & " As CompanyID," & GBLUserID & " As UserID, Getdate() As CreatedDate,'" & GBLFYear & "' As FYear FROM LedgerMasterDetails Where FieldName IN(Select Distinct FieldName From LedgerGroupFieldMaster Where LedgerGroupID=" & LedgerGroupID & ") And (LedgerID = " & LedID & ") And CompanyID=" & GBLCompanyID
                                db.FillDataTable(DtDetails, str)
                                str = db.InsertSecondaryDataJobCard(DtDetails, "LedgerMasterDetails", "CreatedBy", GBLUserID, "", "", "")
                                If str <> "200" Then
                                    con.Close()
                                    updateTransaction.Dispose()
                                    Return str & LedID
                                End If

                                str = "Insert into LedgerMasterDetails (CreatedDate,UserID,CompanyID,LedgerID,FYear,CreatedBy,ModifiedBy,FieldValue,ParentFieldValue,ParentFieldName,FieldName,LedgerGroupID,SequenceNo) " &
                                    " values(Getdate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & NewLedgerID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & LedID & "','" & LedID & "','RefClientID','RefClientID','" & LedgerGroupID & "',20)"
                                db.ExecuteNonSQLQuery(str)

                                db.ExecuteNonSQLQuery("EXEC UpdateLedgerMasterValues " & GBLCompanyID & "," & NewLedgerID)

                                updateTransaction.Complete()
                            End Using
                        Next
                        con.Close()
                    End If
                    Return "Success"
                Else
                    Return "Duplicate consignee found"
                End If

            Else
                Return "No any consignee group found"
            End If

        Catch ex As Exception
            Return ex.Message
        End Try
    End Function

    '-----------------------------------Get Ledger Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetLedgerName(ByVal TabelID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
        ' str = "select nullif(LedgerID,'') as LedgerID,nullif(FieldValue,'') as FieldValue from LedgerMasterDetails where CompanyID='" & GBLCompanyID & "'  And FieldName='LedgerName' And LedgerGroupID='" & TabelID & "' and isnull(IsDeletedTransaction,0)<>1 "
        If DBType = "MYSQL" Then
            str = "CALL GetFilteredLedgerMasterData( '','" & GBLCompanyID & "','" & TabelID & "',' And LedgerID In (Select Distinct LedgerID From LedgerMasterDetails Where FieldName=''ISLedgerActive'' And FieldValue=''True'')');"
        Else
            str = "execute [GetFilteredLedgerMasterData] '','" & GBLCompanyID & "','" & TabelID & "',' And LedgerID In (Select Distinct LedgerID From LedgerMasterDetails Where FieldName=''ISLedgerActive'' And FieldValue=''True'')'"
        End If

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        js.MaxJsonLength = 2147483647
        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Get Ledger Designation------------------------------------------
    '<WebMethod(EnableSession:=True)>
    '<ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    'Public Function GetConcernPersonNameDesignation() As String
    '    Context.Response.Clear()
    '    Context.Response.ContentType = "application/json"

    '    GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))

    '    str = "select distinct nullif(Designation,'') as Designation from ConcernPersonMaster where isnull(IsDeletedTransaction,0)<>1"

    '    db.FillDataTable(dataTable, str)
    '    data.Message = ConvertDataTableTojSonString(dataTable)
    '    Return js.Serialize(data.Message)
    'End Function

    '-----------------------------------Get Concern Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetExistCocrnPerson() As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
        If DBType = "MYSQL" Then
            str = "select distinct ConcernPersonID,nullif(LedgerID,'') as LedgerID,nullif(Name,'') as Name,nullif(Address1,'') as Address1,nullif(Address2,'') as Address2,nullif(Mobile,'') as Mobile,nullif(Email,'') as Email,nullif(Designation,'') as Designation ,nullif(IsPrimaryConcernPerson,'') as IsPrimaryConcernPerson from ConcernPersonMaster where CompanyID='" & GBLCompanyID & "' And IFNULL(IsDeletedTransaction,0)<>1"
        Else
            str = "select distinct ConcernPersonID,nullif(LedgerID,'') as LedgerID,nullif(Name,'') as Name,nullif(Address1,'') as Address1,nullif(Address2,'') as Address2,nullif(Mobile,'') as Mobile,nullif(Email,'') as Email,nullif(Designation,'') as Designation ,nullif(IsPrimaryConcernPerson,'') as IsPrimaryConcernPerson from ConcernPersonMaster where CompanyID='" & GBLCompanyID & "' And isnull(IsDeletedTransaction,0)<>1"
        End If

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    ''----------------------------Open ConcernPersonMaster Delete Data  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function DeleteConcernPersonData(ByVal LedgerID As String) As String

        Dim KeyField As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLUserName = Convert.ToString(HttpContext.Current.Session("UserName"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
        Try
            str = ""
            If DBType = "MYSQL" Then
                str = "Update ConcernPersonMaster Set DeletedBy='" & GBLUserID & "',DeletedDate=NOW(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & LedgerID & "'"
            Else
                str = "Update ConcernPersonMaster Set DeletedBy='" & GBLUserID & "',DeletedDate=GetDate(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & LedgerID & "'"
            End If
            db.ExecuteNonSQLQuery(str)
            KeyField = "Success"
        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function

    ''----------------------------Open ConcernPerson  Save/Update Data  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SaveConcernPersonData(ByVal CostingDataSlab As Object, ByVal CostingDataSlabUpdate As Object, ByVal LedgerID As String) As String

        Dim dt As New DataTable
        Dim KeyField As String
        Dim AddColName, wherecndtn, TableName, AddColValue As String
        AddColName = ""

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try

            TableName = "ConcernPersonMaster"
            AddColName = "ModifiedDate,CreatedDate,UserID,CompanyID,FYear,CreatedBy,ModifiedBy,LedgerID"
            If DBType = "MYSQL" Then
                AddColValue = "Now(),Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & LedgerID & "'"
            Else
                AddColValue = "GetDate(),GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & LedgerID & "'"
            End If
            db.InsertDatatableToDatabase(CostingDataSlab, TableName, AddColName, AddColValue)

            TableName = "ConcernPersonMaster"
            If DBType = "MYSQL" Then
                AddColName = "ModifiedDate=Now(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "'"
            Else
                AddColName = "ModifiedDate=GetDate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy='" & GBLUserID & "'"
            End If
            wherecndtn = "LedgerID=" & LedgerID & " and CompanyID=" & GBLCompanyID & ""
            db.UpdateDatatableToDatabase(CostingDataSlabUpdate, TableName, AddColName, 1, wherecndtn)

            KeyField = "Success"

        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function

    ''----------------------------Open ConcernPerson  Delete From GridClick  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function DeleteConcernPersonDataGridRow(ByVal ConcernPersonID As String, ByVal LedgerID As String) As String

        Dim dt As New DataTable
        Dim KeyField As String
        Dim RevisionNo As Long = 0

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))

        Try

            db.ExecuteNonSQLQuery("Delete from ConcernPersonMaster WHERE CompanyID='" & GBLCompanyID & "' and ConcernPersonID='" & ConcernPersonID & "' And LedgerID='" & LedgerID & "' ")

            KeyField = "Success"
        Catch ex As Exception
            KeyField = "Not match"
        End Try
        Return KeyField

    End Function

    '-----------------------------------Get Employee Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetOperatorName() As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "Select IFNULL(L.LedgerID,0) As LedgerID,nullif(L.LedgerName,'') As LedgerName From LedgerMaster As L Inner Join LedgerMasterDetails As LD On L.LedgerID=LD.LedgerID And L.CompanyID=LD.CompanyID Where LD.FieldName='Designation' And Upper(LD.FieldValue)='OPERATOR' And L.CompanyID='" & GBLCompanyID & "' And IFNULL(L.IsDeletedTransaction,0)<>1"
        Else
            str = "Select Isnull(L.LedgerID,0) As LedgerID,nullif(L.LedgerName,'') As LedgerName From LedgerMaster As L Inner Join LedgerMasterDetails As LD On L.LedgerID=LD.LedgerID And L.CompanyID=LD.CompanyID Where LD.FieldName='Designation' And Upper(LD.FieldValue)='OPERATOR' And L.CompanyID='" & GBLCompanyID & "' And Isnull(L.IsDeletedTransaction,0)<>1"
        End If

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Get Employee Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetEmployeeName(ByVal TabelID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
        'str = "select nullif(LedgerID,'') as LedgerID,nullif(FieldValue,'') as FieldValue from LedgerMasterDetails where CompanyID='" & GBLCompanyID & "'  And FieldName='EmployeeName' And LedgerGroupID='" & TabelID & "' and isnull(IsDeletedTransaction,0)<>1"

        If DBType = "MYSQL" Then
            str = "select nullif(LedgerID,'') as LedgerID,nullif(LedgerName,'') as LedgerName from LedgerMaster where CompanyID='" & GBLCompanyID & "'  And LedgerGroupID='" & TabelID & "' and IFNULL(IsDeletedTransaction,0)<>1"
        Else
            str = "select nullif(LedgerID,'') as LedgerID,nullif(LedgerName,'') as LedgerName from LedgerMaster where CompanyID='" & GBLCompanyID & "' And LedgerGroupID='" & TabelID & "' and isnull(IsDeletedTransaction,0)<>1"
        End If

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    ''----------------------------Open EmpMachineAllocation  Save Data  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SaveEmpMachineAllocation(ByVal CostingDataMachinAllocation As Object, ByVal EmployeID As String, ByVal GridRow As String) As String

        Dim KeyField, maxValue As String
        Dim AddColName, AddColValue, TableName As String
        AddColName = ""
        AddColValue = ""

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLUserName = Convert.ToString(HttpContext.Current.Session("UserName"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))

        Try

            db.ExecuteNonSQLQuery("Delete from EmployeeMachineAllocation WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & EmployeID & "' and isnull(IsDeletedTransaction,0)<>1")

            If GridRow <> "" Then
                maxValue = db.GenerateMaxVoucherNo("EmployeeMachineAllocation", "EmployeeMachineAllocationID", " CompanyID='" & GBLCompanyID & "' And Isnull(IsDeletedTransaction,0)<>1")

                TableName = "EmployeeMachineAllocation"
                AddColName = "ModifiedDate,CreatedDate,UserID,CompanyID,FYear,CreatedBy,ModifiedBy,MachineIDString,EmployeeMachineAllocationID"
                AddColValue = "GetDate(),GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & GridRow & "','" & maxValue & "'"
                db.InsertDatatableToDatabase(CostingDataMachinAllocation, TableName, AddColName, AddColValue)
            End If

            KeyField = "Success"
        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField
    End Function
    ''----------------------------Close EmpMachineAllocation  Save Data  ------------------------------------------
    '-----------------------------------Get MachineID String------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function ExistMachineID(ByVal EmployeeID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "select nullif(MachineIDString,'') as MachineIDString from EmployeeMachineAllocation where CompanyID='" & GBLCompanyID & "' and LedgerID='" + EmployeeID + "' And IFNULL(IsDeletedTransaction,0)<>1 limit 1"
        Else
            str = "select top(1) nullif(MachineIDString,'') as MachineIDString from EmployeeMachineAllocation where CompanyID='" & GBLCompanyID & "' and LedgerID='" + EmployeeID + "' And isnull(IsDeletedTransaction,0)<>1"
        End If

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    ''----------------------------Open EmployeeMachineAllocation  Delete From GridClick  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function DeleteEmpMacineAllo(ByVal LedgerID As String) As String

        Dim dt As New DataTable
        Dim KeyField As String
        Dim RevisionNo As Long = 0

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try
            If DBType = "MYSQL" Then
                str = "Update EmployeeMachineAllocation Set ModifiedBy='" & GBLUserID & "',DeletedBy='" & GBLUserID & "',DeletedDate=Now(),ModifiedDate=Now(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & LedgerID & "'"
            Else
                str = "Update EmployeeMachineAllocation Set ModifiedBy='" & GBLUserID & "',DeletedBy='" & GBLUserID & "',DeletedDate=GetDate(),ModifiedDate=GetDate(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & LedgerID & "'"
            End If
            db.ExecuteNonSQLQuery(str)

            KeyField = "Success"
        Catch ex As Exception
            KeyField = "Not match"
        End Try
        Return KeyField

    End Function

    '-----------------------------------Get FieldNameName (SaveAs)------------------------------------------
    Private Function DuplicateLedgerGroupValidate(ByVal TabelID As String, ByVal tblObj As Object) As Boolean
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"
        Dim str2, ColValue As String
        Dim dtExist As New DataTable
        Dim dt As New DataTable
        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            str2 = ""
            If DBType = "MYSQL" Then
                str2 = "Select nullif(SaveAsString,'') as SaveAsString From LedgerGroupMaster Where CompanyID='" & GBLCompanyID & "' and LedgerGroupID='" & TabelID & "' and IFNULL(IsDeletedTransaction,0)<>1"
            Else
                str2 = "Select nullif(SaveAsString,'') as SaveAsString From LedgerGroupMaster Where CompanyID='" & GBLCompanyID & "' and LedgerGroupID='" & TabelID & "' and Isnull(IsDeletedTransaction,0)<>1"
            End If
            db.FillDataTable(dtExist, str2)
            Dim E As Integer = dtExist.Rows.Count
            If E > 0 Then
                If IsDBNull(dtExist.Rows(0)(0)) = True Then
                    Return False
                Else
                    Dim GetColumn As String
                    GetColumn = dtExist.Rows(0)(0)
                    '  GetColumn = "LedgerName, MailingName"
                    db.ConvertObjectToDatatable(tblObj, dt)
                    ColValue = ""
                    For i As Integer = 0 To dt.Rows.Count - 1
                        If GetColumn.Contains(dt.Rows(i)("FieldName")) Then
                            If ColValue = "" Then
                                If DBType = "MYSQL" Then
                                    ColValue = "And IFNULL(IsDeletedTransaction,0)<>1 And LedgerGroupID In(Select Distinct LedgerGroupID From LedgerMasterDetails Where FieldName=''" & dt.Rows(i)("FieldName") & "'' And FieldValue=''" & dt.Rows(i)("FieldValue") & "'')"
                                Else
                                    ColValue = "And Isnull(IsDeletedTransaction,0)<>1 And LedgerGroupID In(Select Distinct LedgerGroupID From LedgerMasterDetails Where FieldName=''" & dt.Rows(i)("FieldName") & "'' And FieldValue=''" & dt.Rows(i)("FieldValue") & "'')"
                                End If
                            Else
                                ColValue = ColValue & " And LedgerGroupID In(Select Distinct LedgerGroupID From LedgerMasterDetails Where FieldName=''" & dt.Rows(i)("FieldName") & "'' And FieldValue=''" & dt.Rows(i)("FieldValue") & "'')"
                            End If
                        End If
                    Next
                    If DBType = "MYSQL" Then
                        str2 = "CALL GetFilteredLedgerMasterData( 'LedgerMasterDetails'," & GBLCompanyID & "," & TabelID & ",'" & ColValue & "');"
                    Else
                        str2 = "Exec GetFilteredLedgerMasterData 'LedgerMasterDetails'," & GBLCompanyID & "," & TabelID & ",'" & ColValue & "'"
                    End If
                    dtExist.Clear()
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




    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SessionTimeOut() As Integer
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"
        HttpContext.Current.Session("Reset") = True
        Session("Reset") = True
        Dim timeout As Integer = GetSessionTimeout()
        HttpContext.Current.Session.Timeout = timeout / 1000 / 60 ''added by pKp extends session timeout
        Return timeout
    End Function

    Private Shared Function GetSessionTimeout() As Integer
        Dim config As Configuration = WebConfigurationManager.OpenWebConfiguration("~/Web.Config")
        Dim section As SessionStateSection = CType(config.GetSection("system.web/sessionState"), SessionStateSection)
        'Return Convert.ToInt32(section.Timeout.TotalMinutes * 1000 * 60)
        Dim timeout As Integer = CInt(section.Timeout.TotalMinutes) * 1000 * 60
        Return timeout

    End Function

    '-----------------------------------Get LedgerGroupNameID------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetLedgerGroupNameID(ByVal MID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))

        str = "select LedgerGroupNameID from LedgerGroupMaster where LedgerGroupID='" & MID & "'  And COmpanyID='" & GBLCompanyID & "' "

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function



    '-----------------------------------Get Supplier Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetSupplierName(ByVal LedgerGrNID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "Select IFNULL(LedgerID,0) AS LedgerID,Nullif(LedgerName,'') AS LedgerName From LedgerMaster Where CompanyID='" & GBLCompanyID & "'  AND IFNULL(IsDeletedTransaction,0)<>1 And LedgerGroupID In(Select Distinct LedgerGroupID From LedgerGroupMaster Where COmpanyID='" & GBLCompanyID & "'  AND LedgerGroupNameID ='" & LedgerGrNID & "') Order By Nullif(LedgerName,'')"
        Else
            str = "Select Isnull(LedgerID,0) AS LedgerID,Nullif(LedgerName,'') AS LedgerName From LedgerMaster Where CompanyID='" & GBLCompanyID & "' AND Isnull(IsDeletedTransaction,0)<>1 " &
                " And LedgerGroupID In(Select Distinct LedgerGroupID From LedgerGroupMaster Where COmpanyID='" & GBLCompanyID & "' AND LedgerGroupNameID ='" & LedgerGrNID & "') Order By Nullif(LedgerName,'')"
        End If

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Get Item Group Details------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GroupGrid() As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "Select IFNULL(ItemGroupID,0) AS ItemGroupID,Nullif(ItemGroupName,'') AS ItemGroupName From ItemGroupMaster Where CompanyID='" & GBLCompanyID & "' AND IFNULL(IsDeletedTransaction,0)<>1 Order By Nullif(ItemGroupName,'')"
        Else
            str = "Select Isnull(ItemGroupID,0) AS ItemGroupID,Nullif(ItemGroupName,'') AS ItemGroupName From ItemGroupMaster Where CompanyID='" & GBLCompanyID & "' AND Isnull(IsDeletedTransaction,0)<>1 Order By Nullif(ItemGroupName,'')"
        End If

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Get Item Group Details------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SpareGroupGrid() As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))

        str = "Select Distinct SparePartGroup from SparePartMaster Where CompanyID=" & GBLCompanyID & " AND IsDeletedTransaction=0 Order By SparePartGroup"

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function ToolGroupGrid() As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))

        str = "Select Isnull(ToolGroupID,0) AS ToolGroupID,Nullif(ToolGroupName,'') AS ToolGroupName From ToolGroupMaster  Where CompanyID='" & GBLCompanyID & "' AND Isnull(IsDeletedTransaction,0)<>1 Order By Nullif(ToolGroupName,'') "

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Get MachineID String------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function ExistGroupID(ByVal SupplierID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "select nullif(GroupAllocationIDString,'') as GroupAllocationIDString from SupplierItemGroupAllocation where CompanyID='" & GBLCompanyID & "'  and LedgerID='" + SupplierID + "' And IFNULL(IsDeletedTransaction,0)<>1 limit 1"
        Else
            str = "select top(1) nullif(GroupAllocationIDString,'') as GroupAllocationIDString from SupplierItemGroupAllocation where CompanyID='" & GBLCompanyID & "' and LedgerID='" & SupplierID & "' And isnull(IsDeletedTransaction,0)<>1"
        End If

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function ExistToolGroupID(ByVal SupplierID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        str = "select top(1) nullif(GroupAllocationIDString,'') as GroupAllocationIDString from SupplierToolGroupAllocation where CompanyID='" & GBLCompanyID & "' and LedgerID='" & SupplierID & "' And isnull(IsDeletedTransaction,0)<>1"

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    ''----------------------------Open SupplierWiseGroupAllocation  Save Data  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SaveGroupAllocation(ByVal CostingDataGroupAllocation As Object, ByVal SuppID As String, ByVal GridRow As String, ByVal ToolfinalString As String, ByVal ObjSparePartAllocation As Object, ByVal CostingDataToolGroupAllocation As Object) As String

        Dim dt As New DataTable
        Dim KeyField, maxValue As String
        Dim AddColName, AddColValue, TableName As String
        AddColName = ""
        AddColValue = ""

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try
            If DBType = "MYSQL" Then
                db.ExecuteNonSQLQuery("Delete from SupplierItemGroupAllocation WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & SuppID & "' and IFNULL(IsDeletedTransaction,0)<>1")
                db.ExecuteNonSQLQuery("Delete from SupplierSpareGroupAllocation WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & SuppID & "' and IFNULL(IsDeletedTransaction,0)<>1")
            Else
                db.ExecuteNonSQLQuery("Delete from SupplierItemGroupAllocation WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & SuppID & "' and isnull(IsDeletedTransaction,0)<>1")
                db.ExecuteNonSQLQuery("Delete from SupplierSpareGroupAllocation WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & SuppID & "' and isnull(IsDeletedTransaction,0)<>1")
                db.ExecuteNonSQLQuery("Delete from SupplierToolGroupAllocation WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & SuppID & "' and isnull(IsDeletedTransaction,0)<>1")
            End If

            If GridRow <> "" Then
                Dim dtExist As New DataTable
                TableName = "SupplierItemGroupAllocation"
                maxValue = db.GenerateMaxVoucherNo(TableName, "SupplierItemGroupAllocationID", " CompanyID=" & GBLCompanyID & " And Isnull(IsDeletedTransaction,0)=0")

                AddColName = "ModifiedDate,CreatedDate,UserID,CompanyID,FYear,CreatedBy,ModifiedBy,GroupAllocationIDString,SupplierItemGroupAllocationID"
                If DBType = "MYSQL" Then
                    AddColValue = "Now(),Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & GridRow & "','" & maxValue & "'"
                Else
                    AddColValue = "GetDate(),GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & GridRow & "','" & maxValue & "'"
                End If
                str = db.InsertDatatableToDatabase(CostingDataGroupAllocation, TableName, AddColName, AddColValue)
                If IsNumeric(str) = False Then
                    Return "Error in SupplierItemGroupAllocation details: " & str
                End If
            End If

            TableName = "SupplierSpareGroupAllocation"
            maxValue = db.GenerateMaxVoucherNo(TableName, "SupplierSpareGroupAllocationID", " CompanyID=" & GBLCompanyID & " And IsDeletedTransaction=0")
            AddColName = "SupplierSpareGroupAllocationID,ModifiedDate,CreatedDate,UserID,CompanyID,FYear,CreatedBy,ModifiedBy"
            If DBType = "MYSQL" Then
                AddColValue = "" & maxValue & ",Now(),Now(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "'"
            Else
                AddColValue = "" & maxValue & ",GetDate(),GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "'"
            End If
            str = db.InsertDatatableToDatabase(ObjSparePartAllocation, TableName, AddColName, AddColValue)
            If IsNumeric(str) = False Then
                Return "Error in SupplierSpareGroupAllocation details: " & str
            End If

            TableName = "SupplierToolGroupAllocation"
            maxValue = db.GenerateMaxVoucherNo(TableName, "SupplierToolGroupAllocationID", " CompanyID=" & GBLCompanyID & " And Isnull(IsDeletedTransaction,0)=0")
            AddColName = "ModifiedDate,CreatedDate,UserID,CompanyID,FYear,CreatedBy,ModifiedBy,GroupAllocationIDString,SupplierToolGroupAllocationID"
            AddColValue = "GetDate(),GetDate(),'" & GBLUserID & "','" & GBLCompanyID & "','" & GBLFYear & "','" & GBLUserID & "','" & GBLUserID & "','" & ToolfinalString & "','" & maxValue & "'"
            str = db.InsertDatatableToDatabase(CostingDataToolGroupAllocation, TableName, AddColName, AddColValue)
            If IsNumeric(str) = False Then
                Return "Error in SupplierToolGroupAllocation details: " & str
            End If

            KeyField = "Success"

        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function

    ''----------------------------Open GroupAllocation  Delete From GridClick  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function DeleteGroupAllo(ByVal LedgerID As String) As String

        Dim KeyField As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try
            If DBType = "MYSQL" Then
                str = "Update SupplierItemGroupAllocation Set DeletedBy='" & GBLUserID & "',DeletedDate=Now(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & LedgerID & "'"
            Else
                str = "Update SupplierItemGroupAllocation Set DeletedBy='" & GBLUserID & "',DeletedDate=GetDate(),IsDeletedTransaction=1  WHERE CompanyID='" & GBLCompanyID & "' and LedgerID='" & LedgerID & "'"
            End If
            db.ExecuteNonSQLQuery(str)

            KeyField = "Success"
        Catch ex As Exception
            KeyField = "Not match"
        End Try
        Return KeyField
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function ExistSparesGroupID(ByVal SupplierID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "Select STUFF((SELECT DISTINCT ','+(c.SparePartGroup) FROM [dbo].[SupplierSpareGroupAllocation] c Where c.CompanyID=" & GBLCompanyID & " and c.LedgerID=" + SupplierID + " And c.IsDeletedTransaction=0 FOR XML PATH(''), TYPE ).value('.', 'nvarchar(max)'), 1, 1, '') As IDString;"
        Else
            str = "Select STUFF((SELECT DISTINCT ','+(c.SparePartGroup) FROM [dbo].[SupplierSpareGroupAllocation] c Where c.CompanyID=" & GBLCompanyID & " and c.LedgerID=" + SupplierID + " And c.IsDeletedTransaction=0 FOR XML PATH(''), TYPE ).value('.', 'nvarchar(max)'), 1, 1, '') As IDString;"
        End If

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Async Function ModuleWiseIntegration(ByVal LedgerCode As String) As Threading.Tasks.Task(Of String)
        Dim apiintegrationrequired = Convert.ToString(HttpContext.Current.Session("APIIntegrationRequired"))
        Dim Response As New IntegrationResponse()
        If apiintegrationrequired.ToLower() = "true" Then
            'Dim integrationResult As String = Await CallIntegrationAPIBasic(VoucherNo, "DeliveryNote", "ChallanDetail.aspx", "Create")
            'Return integrationResult
            Dim DocumentNo As String, DocumentType As String, ModuleName As String, ActionType As String
            DocumentNo = LedgerCode
            DocumentType = "LedgerMaster"
            ModuleName = "LedgerMaster.aspx"
            ActionType = "Create"
            Try
                Dim CompanyId = Convert.ToInt32(HttpContext.Current.Session("CompanyId"))
                Dim Dt_CompanyDetails As New DataTable
                db.FillDataTable(Dt_CompanyDetails, "SELECT APIIntegrationRequired, IndusAPIBaseUrl, ApiBasicAuthUserName, ApiBasicAuthPassword, IntegrationType FROM CompanyMaster WHERE CompanyID = " & CompanyId)
                If Dt_CompanyDetails.Rows.Count = 0 Then
                    Response.Message = "Something went wrong: Company details not found"
                    Return Response.ToString()
                ElseIf Convert.ToInt32(Dt_CompanyDetails.Rows(0)("APIIntegrationRequired")) = 0 Then
                    Response.Success = False
                    Response.Message = "Integration not required..!"
                    Return Response.ToString()
                End If

                ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 Or SecurityProtocolType.Tls13

                Using httpClient As New HttpClient()
                    httpClient.Timeout = TimeSpan.FromSeconds(30)

                    Dim UserName As String = Dt_CompanyDetails.Rows(0)("ApiBasicAuthUserName").ToString()
                    Dim Password As String = Dt_CompanyDetails.Rows(0)("ApiBasicAuthPassword").ToString()
                    Dim credentials As String = Convert.ToBase64String(Encoding.UTF8.GetBytes(UserName & ":" & Password))

                    Dim apiUrl As String = Dt_CompanyDetails.Rows(0)("IndusAPIBaseUrl") & "/api/Post/Transaction/ClientApi"

                    Dim jsonContent As String = "{" &
                                        """MainData"":{" &
                                        """DocumentNo"":""" & DocumentNo & """," &
                                        """DocumentType"":""" & DocumentType & """," &
                                        """ModuleName"":""" & ModuleName & """," &
                                        """ActionType"":""" & ActionType & """," &
                                        """IntegrationType"":""" & Dt_CompanyDetails.Rows(0)("IntegrationType") & """}}"

                    Dim request As New HttpRequestMessage(HttpMethod.Post, apiUrl)
                    request.Headers.Authorization = New System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials)
                    request.Content = New StringContent(jsonContent, Encoding.UTF8, "application/json")
                    request.Headers.UserAgent.ParseAdd("Mozilla/5.0")
                    Dim response1 As HttpResponseMessage = Await httpClient.SendAsync(request).ConfigureAwait(False)
                    Response.HttpStatusCode = CInt(response1.StatusCode)

                    If response1.IsSuccessStatusCode Then
                        Dim responseData As String = Await response1.Content.ReadAsStringAsync().ConfigureAwait(False)
                        Return responseData
                    Else
                        Return "Error: " & response1.StatusCode.ToString()
                    End If
                End Using
            Catch ex As WebException
                Return "WebException: " & ex.Message
            Catch ex As Exception
                Return "Exception: " & ex.Message
            End Try
        Else
            Return "Integration Not Required"
        End If
    End Function

    '---------------Close Master code---------------------------------

    Public Class HelloWorldData
        Public Message As [String]
    End Class


End Class