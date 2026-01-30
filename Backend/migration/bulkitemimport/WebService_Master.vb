Imports System.Web
Imports System.Web.Services
Imports System.Web.Services.Protocols
Imports System.Data
Imports System.Data.SqlClient
Imports System.Web.Script.Services
Imports System.Web.Script.Serialization
Imports Connection
Imports Newtonsoft.Json
Imports MySql.Data.MySqlClient
Imports System.Activities.Expressions
Imports System.IO


' To allow this Web Service to be called from script, using ASP.NET AJAX, uncomment the following line.
<System.Web.Script.Services.ScriptService()>
<WebService(Namespace:="http://tempuri.org/")>
<WebServiceBinding(ConformsTo:=WsiProfiles.BasicProfile1_1)>
<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Public Class WebService_Master
    Inherits System.Web.Services.WebService

    Private DA As SqlDataAdapter
    Private MyDA As MySqlDataAdapter
    Dim db As New DBConnection
    Dim js As New JavaScriptSerializer()
    Dim data As New HelloWorldData()
    Dim dataTable As New DataTable()
    Dim str As String

    Dim GBLUserID As String
    Dim GBLUserName As String
    Dim GBLBranchID As String
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


    Public Function DataSetToJSONWithJavaScriptSerializer(ByVal dataset As DataSet) As String
        Dim jsSerializer As JavaScriptSerializer = New JavaScriptSerializer()
        Dim ssvalue As Dictionary(Of String, Object) = New Dictionary(Of String, Object)()

        For Each table As DataTable In dataset.Tables
            Dim parentRow As List(Of Dictionary(Of String, Object)) = New List(Of Dictionary(Of String, Object))()
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
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "SELECT Distinct IGM.ItemGroupID,IGM.ItemGroupName  FROM ItemGroupMaster As IGM Inner Join UserSubModuleAuthentication As UMA On UMA.ItemGroupID=IGM.ItemGroupID And UMA.CompanyID=IGM.CompanyID And UMA.CanView=1 Where IGM.IsDeletedTransaction=0 And IGM.CompanyID = " & GBLCompanyID & " And UMA.UserID=" & GBLUserID & " Order By IGM.ItemGroupID"
        Else
            str = "SELECT Distinct IGM.ItemGroupID,IGM.ItemGroupName  FROM ItemGroupMaster As IGM Inner Join UserSubModuleAuthentication As UMA On UMA.ItemGroupID=IGM.ItemGroupID And UMA.CompanyID=IGM.CompanyID And UMA.CanView=1 Where IGM.IsDeletedTransaction=0 And IGM.CompanyID = " & GBLCompanyID & " And UMA.UserID=" & GBLUserID & " Order By IGM.ItemGroupID"
        End If
        'str = "SELECT  nullif(ItemGroupID,'') as ItemGroupID,nullif(ItemGroupName,'') as ItemGroupName FROM ItemGroupMaster Where CompanyID = " & GBLCompanyID & " and isnull(IsDeletedTransaction,0)<>1  Order By ItemGroupID "
        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
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
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str2 = "Select nullif(SelectQuery,'') as SelectQuery From ItemGroupMaster Where CompanyID=" & GBLCompanyID & "  and ItemGroupID='" & masterID & "' and IFNULL(IsDeletedTransaction,0)<>1"
        Else
            str2 = "Select nullif(SelectQuery,'') as SelectQuery From ItemGroupMaster Where CompanyID=" & GBLCompanyID & " and ItemGroupID='" & masterID & "' and isnull(IsDeletedTransaction,0)<>1"
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
        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "SELECT  nullif(GridColumnHide,'') as GridColumnHide,nullif(TabName,'') as TabName,nullif(ItemNameFormula,'') as ItemNameFormula,nullif(ItemDescriptionFormula,'') as ItemDescriptionFormula FROM ItemGroupMaster Where CompanyID = " & GBLCompanyID & "  and ItemGroupID= '" & masterID & "' and IFNULL(IsDeletedTransaction,0)<>1"
        Else
            str = "SELECT  nullif(GridColumnHide,'') as GridColumnHide,nullif(TabName,'') as TabName,nullif(ItemNameFormula,'') as ItemNameFormula,nullif(ItemDescriptionFormula,'') as ItemDescriptionFormula FROM ItemGroupMaster Where CompanyID = " & GBLCompanyID & "  and ItemGroupID= '" & masterID & "' and isnull(IsDeletedTransaction,0)<>1"
        End If
        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function


    '-----------------------------------Get Grid Column Name------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function MasterGridColumn(ByVal masterID As String) As String
        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "select nullif(GridColumnName,'') as GridColumnName From ItemGroupMaster Where CompanyID=" & GBLCompanyID & " and ItemGroupID='" & masterID & "' and IFNULL(IsDeletedTransaction,0)<>1"
        Else
            str = "select nullif(GridColumnName,'') as GridColumnName From ItemGroupMaster Where CompanyID=" & GBLCompanyID & " and ItemGroupID='" & masterID & "' and isnull(IsDeletedTransaction,0)<>1 "
        End If
        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)

        Return js.Serialize(data.Message)

    End Function

    ''----------------------------Open Master  Save Data  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SaveData(ByVal CostingDataItemMaster As Object, ByVal CostingDataItemDetailMaster As Object, ByVal MasterName As String, ByVal ItemGroupID As String, ByVal ActiveItem As String, ByVal StockRefCode As String) As String

        Dim dt As New DataTable
        Dim KeyField As String
        Dim ItemID As String
        Dim AddColName, AddColValue, TableName As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try
            If DuplicateItemGroupValidate(ItemGroupID, CostingDataItemDetailMaster) = True Then
                Return "Duplicate data found"
            End If

            If db.CheckAuthories("Masters.aspx", GBLUserID, GBLCompanyID, "CanSave") = False Then Return "You are not authorized to save"
            If db.GetColumnValue("CanSave", "UserSubModuleAuthentication", " UserID=" & GBLUserID & " And ItemGroupID=" & ItemGroupID & " And CompanyID=" & GBLCompanyID) = False Then Return "You are not authorized to save..!"

            str = "Select Nullif(StockRefCode,'') as StockRefCode from ItemMaster where StockRefCode = '" & StockRefCode & "' And ItemGroupID=" & ItemGroupID & " And CompanyID = '" & GBLCompanyID & "'And IsDeletedTransaction = 0"
            db.FillDataTable(dt, str)
            If dt.Rows.Count > 0 AndAlso Not IsDBNull(dt.Rows(0)(0)) Then
                Return "Stock Ref. Code already exists."
            End If

            Dim dtItemCode As New DataTable
            Dim MaxItemID As Long
            Dim ItemCodestr2, ItemCodePrefix, ItemCode As String

            If CostingDataItemMaster(0)("ItemGroupID") = 1 Then
                CostingDataItemMaster(0)("ItemSubGroupID") = -1
            ElseIf CostingDataItemMaster(0)("ItemGroupID") = 2 Then
                CostingDataItemMaster(0)("ItemSubGroupID") = -2
            End If

            If DBType = "MYSQL" Then
                ItemCodestr2 = "Select nullif(ItemGroupPrefix,'') as ItemGroupPrefix from  ItemGroupMaster Where  CompanyID=" & GBLCompanyID & " And ItemGroupID=" & ItemGroupID & " and IFNULL(IsDeletedTransaction,0)<>1"
            Else
                ItemCodestr2 = "Select nullif(ItemGroupPrefix,'') as ItemGroupPrefix from  ItemGroupMaster Where  CompanyID=" & GBLCompanyID & " And ItemGroupID=" & ItemGroupID & " and isnull(IsDeletedTransaction,0)<>1"
            End If
            db.FillDataTable(dtItemCode, ItemCodestr2)
            ItemCodePrefix = dtItemCode.Rows(0)(0)

            ItemCode = db.GeneratePrefixedNo("ItemMaster", ItemCodePrefix, "MaxItemNo", MaxItemID, "", " Where ItemCodeprefix='" & ItemCodePrefix & "' And  CompanyID=" & GBLCompanyID & " And Isnull(IsDeletedTransaction,0)=0 ")

            TableName = "ItemMaster"
            AddColName = "CreatedDate,UserID,CompanyID,FYear,CreatedBy,ItemCode,ItemCodePrefix,MaxItemNo"
            If DBType = "MYSQL" Then
                AddColValue = "Now()," & GBLUserID & "," & GBLCompanyID & ",'" & GBLFYear & "'," & GBLUserID & ",'" & ItemCode & "','" & ItemCodePrefix & "'," & MaxItemID & ""
            Else
                AddColValue = "Getdate()," & GBLUserID & "," & GBLCompanyID & ",'" & GBLFYear & "'," & GBLUserID & ",'" & ItemCode & "','" & ItemCodePrefix & "'," & MaxItemID & ""
            End If
            ItemID = db.InsertDatatableToDatabase(CostingDataItemMaster, TableName, AddColName, AddColValue)

            If IsNumeric(ItemID) = False Then
                Return "fail " & ItemID
            End If

            If ItemID = "" Then Return "Error in main " & ItemID
            TableName = "ItemMasterDetails"
            AddColName = "CreatedDate,UserID,CompanyID,ItemID,FYear,CreatedBy,ModifiedBy"
            If DBType = "MYSQL" Then
                AddColValue = "Now()," & GBLUserID & "," & GBLCompanyID & "," & ItemID & ",'" & GBLFYear & "'," & GBLUserID & "," & GBLUserID
            Else
                AddColValue = "Getdate()," & GBLUserID & "," & GBLCompanyID & "," & ItemID & ",'" & GBLFYear & "'," & GBLUserID & "," & GBLUserID
            End If
            db.InsertDatatableToDatabase(CostingDataItemDetailMaster, TableName, AddColName, AddColValue)

            If DBType = "MYSQL" Then
                str = "Insert into ItemMasterDetails (ModifiedDate,CreatedDate,UserID,CompanyID,ItemID,FYear,CreatedBy,ModifiedBy,FieldValue,ParentFieldValue,ParentFieldName,FieldName,ItemGroupID) values(Now(),Now()," & GBLUserID & "," & GBLCompanyID & "," & ItemID & ",'" & GBLFYear & "'," & GBLUserID & "," & GBLUserID & ",'" & ActiveItem & "','" & ActiveItem & "','ISItemActive','ISItemActive','" & ItemGroupID & "')"

                db.ExecuteNonSQLQuery(str)

                db.ExecuteNonSQLQuery("CALL UpdateItemMasterValues( " & GBLCompanyID & ", " & ItemID & ");") '' To save common fields from Details to main table
            Else
                str = "Insert into ItemMasterDetails (ModifiedDate,CreatedDate,UserID,CompanyID,ItemID,FYear,CreatedBy,ModifiedBy,FieldValue,ParentFieldValue,ParentFieldName,FieldName,ItemGroupID) values(Getdate(),Getdate()," & GBLUserID & "," & GBLCompanyID & "," & ItemID & ",'" & GBLFYear & "'," & GBLUserID & "," & GBLUserID & ",'" & ActiveItem & "','" & ActiveItem & "','ISItemActive','ISItemActive','" & ItemGroupID & "')"

                db.ExecuteNonSQLQuery(str)

                db.ExecuteNonSQLQuery("EXEC [UpdateItemMasterValues] " & GBLCompanyID & ", " & ItemID) '' To save common fields from Details to main table
            End If

            KeyField = "Success"

        Catch ex As Exception
            KeyField = "fail " & ex.Message
        End Try
        Return KeyField

    End Function
    ''----------------------------Close Master  Save Data  ------------------------------------------

    ''----------------------------Open Master  Update Data  ------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function UpdateData(ByVal CostingDataItemMaster As Object, ByVal CostingDataItemDetailMaster As Object, ByVal MasterName As String, ByVal ItemID As String, ByVal UnderGroupID As String, ByVal ActiveItem As String, ByVal StockRefCode As String) As String

        Dim dt As New DataTable
        Dim KeyField, str2 As String
        Dim AddColName, wherecndtn, TableName As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If db.CheckAuthories("Masters.aspx", GBLUserID, GBLCompanyID, "CanEdit") = False Then Return "You are not authorized to update"
        If db.GetColumnValue("CanEdit", "UserSubModuleAuthentication", " UserID=" & GBLUserID & " And ItemGroupID=" & UnderGroupID & " And CompanyID=" & GBLCompanyID) = False Then Return "You are not authorized to update..!"

        str = "Select Nullif(StockRefCode,'') as StockRefCode from ItemMaster where StockRefCode = '" & StockRefCode & "' And ItemID <> '" & ItemID & "' And ItemGroupID=" & UnderGroupID & " And CompanyID = '" & GBLCompanyID & "'And IsDeletedTransaction = 0"
        db.FillDataTable(dt, str)
        If dt.Rows.Count > 0 AndAlso Not IsDBNull(dt.Rows(0)(0)) Then
            Return "Stock Ref. Code already exists."
        End If

        Try
            If DBType = "MYSQL" Then
                Dim con As New MySqlConnection
                con = db.OpenDataBaseMYSQL()

                TableName = "ItemMaster"
                AddColName = "ModifiedDate=NOW(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy=" & GBLUserID
                wherecndtn = "CompanyID=" & GBLCompanyID & " And ItemID=" & ItemID & " And ItemGroupID=" & UnderGroupID & ""
                db.UpdateDatatableToDatabase(CostingDataItemMaster, TableName, AddColName, 0, wherecndtn)

                Dim SomeSpcelCaseColName, SomeSpcelCaseColValue As String
                TableName = "ItemMasterDetails"
                AddColName = "ModifiedDate=NOW(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy=" & GBLUserID
                wherecndtn = "CompanyID=" & GBLCompanyID & " And ItemID=" & ItemID & " And ItemGroupID=" & UnderGroupID & ""

                SomeSpcelCaseColName = "ModifiedDate,CreatedDate,UserID,CompanyID,ItemID,FYear,CreatedBy,ModifiedBy"
                SomeSpcelCaseColValue = "NOW(),NOW()," & GBLUserID & "," & GBLCompanyID & "," & ItemID & ",'" & GBLFYear & "'," & GBLUserID & "," & GBLUserID

                Dim UniqueId, strUniqColName, strUniqColValue As String
                UniqueId = ""
                'ConvertObjectToDatatableNEW(CostingDataItemDetailMaster, dt)
                db.ConvertObjectToDatatableNew(CostingDataItemDetailMaster, dt)

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
                    str2 = "Select * From " & TableName & " Where " & UniqueId & " and ifnull(IsDeletedTransaction,0)<>1"
                    Dim dtExistData As New DataTable
                    db.FillDataTable(dtExistData, str2)
                    Dim k As Integer = dtExistData.Rows.Count
                    If k < 1 Then
                        Dim DTExistCol As New DataTable
                        FillDataTableNEW(DTExistCol, str2)

                        For Each column In dt.Columns
                            Dim row As DataRow = DTExistCol.Select(column.ColumnName & " = '" & dt.Rows(i)(column.ColumnName) & "'").FirstOrDefault()
                            If row Is Nothing Then
                                Dim CompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
                                Dim UserID = Convert.ToString(HttpContext.Current.Session("UserID"))
                                Dim strInsert As String
                                strInsert = "Insert into " & TableName & " (" & strUniqColName & SomeSpcelCaseColName & ") Values(" & strUniqColValue & SomeSpcelCaseColValue & ")"

                                If con.State = ConnectionState.Closed Then
                                    con.Open()
                                End If
                                Dim cmd1 As New MySqlCommand(strInsert, con)
                                cmd1.CommandType = CommandType.Text
                                cmd1.ExecuteNonQuery()

                                Exit For
                            End If
                        Next


                    End If


                    Dim strUpdate As String
                    strUpdate = "Update " & TableName & " Set " & str & " Where " & UniqueId

                    If con.State = ConnectionState.Closed Then
                        con.Open()
                    End If
                    Dim cmd As New MySqlCommand(strUpdate, con)
                    cmd.CommandType = CommandType.Text
                    cmd.ExecuteNonQuery()

                Next

                str2 = ""
                str2 = "Select nullif(ParentFieldValue,'') as ParentFieldValue From ItemMasterDetails Where ParentFieldName='ISItemActive' and FieldName='ISItemActive' and ItemID=" & ItemID & "  and ItemGroupID='" & UnderGroupID & "' and CompanyID=" & GBLCompanyID & " and ifnull(IsDeletedTransaction,0)<>1"
                Dim dtexist As New DataTable
                db.FillDataTable(dtexist, str2)
                Dim x As Integer = dtexist.Rows.Count
                If x = 0 Then
                    str = ""
                    str = "insert into ItemMasterDetails (ModifiedDate,CreatedDate,UserID,CompanyID,ItemID,FYear,CreatedBy,ModifiedBy,FieldValue,ParentFieldValue,ParentFieldName,FieldName,ItemGroupID) values(Now(),Now()," & GBLUserID & "," & GBLCompanyID & "," & ItemID & ",'" & GBLFYear & "'," & GBLUserID & "," & GBLUserID & ",'True','True','ISItemActive','ISItemActive','" & UnderGroupID & "')"
                    Dim cmd = New MySqlCommand(str, con)
                    cmd.ExecuteNonQuery()

                    str = ""
                    str = "insert into ItemMaster (ModifiedDate,CreatedDate,UserID,CompanyID,ItemID,FYear,CreatedBy,ModifiedBy,ISItemActive,ItemGroupID) values(Now(),Now()," & GBLUserID & "," & GBLCompanyID & "," & ItemID & ",'" & GBLFYear & "'," & GBLUserID & "," & GBLUserID & ",'True','" & UnderGroupID & "')"
                    Dim cmd1 = New MySqlCommand(str, con)
                    cmd1.ExecuteNonQuery()

                Else
                    Dim ActiveItemUpdate As String
                    ActiveItemUpdate = "Update ItemMasterDetails Set ModifiedDate=Now(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy=" & GBLUserID & ",FieldValue='" & ActiveItem & "',ParentFieldValue='" & ActiveItem & "'  Where ParentFieldName='ISItemActive' and FieldName='ISItemActive' and ItemID=" & ItemID & "  and ItemGroupID='" & UnderGroupID & "' and CompanyID=" & GBLCompanyID & ""

                    If con.State = ConnectionState.Closed Then
                        con.Open()
                    End If
                    Dim cmdA As New MySqlCommand(ActiveItemUpdate, con)
                    cmdA.CommandType = CommandType.Text
                    cmdA.ExecuteNonQuery()

                    Dim ActiveItemUpdateMaster As String
                    ActiveItemUpdateMaster = "Update ItemMaster Set ModifiedDate=Now(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy=" & GBLUserID & ",ISItemActive='" & ActiveItem & "'  Where ItemID=" & ItemID & "  and ItemGroupID='" & UnderGroupID & "' and CompanyID=" & GBLCompanyID & ""

                    If con.State = ConnectionState.Closed Then
                        con.Open()
                    End If
                    Dim cmdMaster As New MySqlCommand(ActiveItemUpdateMaster, con)
                    cmdMaster.CommandType = CommandType.Text
                    cmdMaster.ExecuteNonQuery()
                End If

                con.Close()

                'db.UpdateDatatableToDatabase(CostingDataItemDetailMaster, TableName, AddColName, 1, wherecndtn, SomeSpcelCaseColName, SomeSpcelCaseColValue)
                db.ExecuteNonSQLQuery("CALL UpdateItemMasterValues( " & GBLCompanyID & ", " & ItemID & ");") '' To save common fields from Details to main table
            Else
                Dim con As New SqlConnection
                con = db.OpenDataBase()

                TableName = "ItemMaster"
                AddColName = "ModifiedDate=Getdate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy=" & GBLUserID
                wherecndtn = "CompanyID=" & GBLCompanyID & " And ItemID=" & ItemID & " And ItemGroupID=" & UnderGroupID & ""
                db.UpdateDatatableToDatabase(CostingDataItemMaster, TableName, AddColName, 0, wherecndtn)

                Dim SomeSpcelCaseColName, SomeSpcelCaseColValue As String
                TableName = "ItemMasterDetails"
                AddColName = "ModifiedDate=Getdate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy=" & GBLUserID
                wherecndtn = "CompanyID=" & GBLCompanyID & " And ItemID=" & ItemID & " And ItemGroupID=" & UnderGroupID & ""

                SomeSpcelCaseColName = "ModifiedDate,CreatedDate,UserID,CompanyID,ItemID,FYear,CreatedBy,ModifiedBy"
                SomeSpcelCaseColValue = "Getdate(),Getdate()," & GBLUserID & "," & GBLCompanyID & "," & ItemID & ",'" & GBLFYear & "'," & GBLUserID & "," & GBLUserID

                Dim UniqueId, strUniqColName, strUniqColValue As String
                UniqueId = ""
                'ConvertObjectToDatatableNEW(CostingDataItemDetailMaster, dt)
                db.ConvertObjectToDatatableNew(CostingDataItemDetailMaster, dt)

                Dim Cnt As Integer = 1
                Dim Pvalue As Integer

                For i As Integer = 0 To dt.Rows.Count - 1
                    str = ""
                    UniqueId = ""
                    strUniqColName = ""
                    strUniqColValue = ""
                    Cnt = 1
                    Pvalue = 1
                    'For Each column In dt.Columns
                    '    strUniqColName = strUniqColName & column.ColumnName & ","
                    '    strUniqColValue = strUniqColValue & "'" & dt.Rows(i)(column.ColumnName) & "',"

                    '    If Cnt <= Pvalue Then
                    '        UniqueId = UniqueId & column.ColumnName & " ='" & dt.Rows(i)(column.ColumnName) & "' And "
                    '        Cnt = Cnt + 1
                    '    Else
                    '        str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
                    '    End If
                    'Next
                    For Each column In dt.Columns
                        Dim val As String = dt.Rows(i)(column.ColumnName).ToString().Trim()

                        If val Like "#*.00" Then
                            Dim parts() As String = val.Split("."c)
                            If parts.Length = 2 AndAlso parts(1) = "00" Then
                                val = parts(0)
                            End If
                        End If


                        strUniqColName = strUniqColName & column.ColumnName & ","
                        strUniqColValue = strUniqColValue & "'" & val & "',"

                        If Cnt <= Pvalue Then
                            UniqueId = UniqueId & column.ColumnName & " ='" & val & "' And "
                            Cnt += 1
                        Else
                            str = str & column.ColumnName & "='" & val & "',"
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
                    str2 = "Select * From " & TableName & " Where " & UniqueId & " and isnull(IsDeletedTransaction,0)<>1"
                    Dim dtExistData As New DataTable
                    db.FillDataTable(dtExistData, str2)
                    Dim k As Integer = dtExistData.Rows.Count
                    If k < 1 Then
                        Dim DTExistCol As New DataTable
                        FillDataTableNEW(DTExistCol, str2)

                        For Each column In dt.Columns
                            Dim row As DataRow = DTExistCol.Select(column.ColumnName & " = '" & dt.Rows(i)(column.ColumnName) & "'").FirstOrDefault()
                            If row Is Nothing Then
                                Dim CompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
                                Dim UserID = Convert.ToString(HttpContext.Current.Session("UserID"))
                                Dim strInsert As String
                                'strUniqColValue = strUniqColValue.Replace(".00", "")
                                strInsert = "Insert into " & TableName & " (" & strUniqColName & SomeSpcelCaseColName & ") Values(" & strUniqColValue & SomeSpcelCaseColValue & ")"

                                If con.State = ConnectionState.Closed Then
                                    con.Open()
                                End If
                                Dim cmd1 As New SqlCommand(strInsert, con)
                                cmd1.CommandType = CommandType.Text
                                cmd1.ExecuteNonQuery()

                                Exit For
                            End If
                        Next


                    End If


                    Dim strUpdate As String
                    'str = str.Replace(".00", "")
                    strUpdate = "Update " & TableName & " Set " & str & " Where " & UniqueId

                    If con.State = ConnectionState.Closed Then
                        con.Open()
                    End If
                    Dim cmd As New SqlCommand(strUpdate, con)
                    cmd.CommandType = CommandType.Text
                    cmd.ExecuteNonQuery()

                Next

                str2 = ""
                str2 = "Select nullif(ParentFieldValue,'') as ParentFieldValue From ItemMasterDetails Where ParentFieldName='ISItemActive' and FieldName='ISItemActive' and ItemID=" & ItemID & "  and ItemGroupID='" & UnderGroupID & "' and CompanyID=" & GBLCompanyID & " and isnull(IsDeletedTransaction,0)<>1"
                Dim dtexist As New DataTable
                db.FillDataTable(dtexist, str2)
                Dim x As Integer = dtexist.Rows.Count
                If x = 0 Then
                    str = ""
                    str = "insert into ItemMasterDetails (ModifiedDate,CreatedDate,UserID,CompanyID,ItemID,FYear,CreatedBy,ModifiedBy,FieldValue,ParentFieldValue,ParentFieldName,FieldName,ItemGroupID) values(Getdate(),Getdate()," & GBLUserID & "," & GBLCompanyID & "," & ItemID & ",'" & GBLFYear & "'," & GBLUserID & "," & GBLUserID & ",'True','True','ISItemActive','ISItemActive','" & UnderGroupID & "')"
                    Dim cmd = New SqlCommand(str, con)
                    cmd.ExecuteNonQuery()

                    str = ""
                    str = "insert into ItemMaster (ModifiedDate,CreatedDate,UserID,CompanyID,ItemID,FYear,CreatedBy,ModifiedBy,ISItemActive,ItemGroupID) values(Getdate(),Getdate()," & GBLUserID & "," & GBLCompanyID & "," & ItemID & ",'" & GBLFYear & "'," & GBLUserID & "," & GBLUserID & ",'True','" & UnderGroupID & "')"
                    Dim cmd1 = New SqlCommand(str, con)
                    cmd1.ExecuteNonQuery()

                Else
                    Dim ActiveItemUpdate As String
                    ActiveItemUpdate = "Update ItemMasterDetails Set ModifiedDate=Getdate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy=" & GBLUserID & ",FieldValue='" & ActiveItem & "',ParentFieldValue='" & ActiveItem & "'  Where ParentFieldName='ISItemActive' and FieldName='ISItemActive' and ItemID=" & ItemID & "  and ItemGroupID='" & UnderGroupID & "' and CompanyID=" & GBLCompanyID & ""

                    If con.State = ConnectionState.Closed Then
                        con.Open()
                    End If
                    Dim cmdA As New SqlCommand(ActiveItemUpdate, con)
                    cmdA.CommandType = CommandType.Text
                    cmdA.ExecuteNonQuery()

                    Dim ActiveItemUpdateMaster As String
                    ActiveItemUpdateMaster = "Update ItemMaster Set ModifiedDate=Getdate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy=" & GBLUserID & ",ISItemActive='" & ActiveItem & "'  Where ItemID=" & ItemID & "  and ItemGroupID='" & UnderGroupID & "' and CompanyID=" & GBLCompanyID & ""

                    If con.State = ConnectionState.Closed Then
                        con.Open()
                    End If
                    Dim cmdMaster As New SqlCommand(ActiveItemUpdateMaster, con)
                    cmdMaster.CommandType = CommandType.Text
                    cmdMaster.ExecuteNonQuery()
                End If

                con.Close()

                'db.UpdateDatatableToDatabase(CostingDataItemDetailMaster, TableName, AddColName, 1, wherecndtn, SomeSpcelCaseColName, SomeSpcelCaseColValue)
                db.ExecuteNonSQLQuery("EXEC [UpdateItemMasterValues] " & GBLCompanyID & ", " & ItemID) '' To save common fields from Details to main table
            End If

            KeyField = "Success"


        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function
    ''----------------------------Close Master  Update Data  ------------------------------------------

    Public Sub FillDataTableNEW(ByRef DataTableObj As DataTable, ByVal SqlSelectQuery As String, Optional ByVal SqlStoredProcedure As String = "")
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try
            If DBType = "MYSQL" Then
                Dim con As New MySqlConnection
                con = db.OpenDataBaseMYSQL()

                Dim cmd As MySqlCommand
                If Trim(SqlSelectQuery) = "" Then
                    cmd = New MySqlCommand(SqlStoredProcedure, con)
                    cmd.CommandType = CommandType.StoredProcedure
                Else
                    cmd = New MySqlCommand(SqlSelectQuery, con)
                End If
                MyDA = New MySqlDataAdapter(cmd)
                MyDA.Fill(DataTableObj)
                con.Close()
            Else
                Dim con As New SqlConnection
                con = db.OpenDataBase()

                Dim cmd As SqlCommand
                If Trim(SqlSelectQuery) = "" Then
                    cmd = New SqlCommand(SqlStoredProcedure, con)
                    cmd.CommandType = CommandType.StoredProcedure
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
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try
            If db.CheckAuthories("Masters.aspx", GBLUserID, GBLCompanyID, "CanDelete") = False Then Return "You are not authorized to delete"
            If db.GetColumnValue("CanDelete", "UserSubModuleAuthentication", " UserID=" & GBLUserID & " And ItemGroupID=" & UnderGroupID & " And CompanyID=" & GBLCompanyID) = False Then Return "You are not authorized to delete..!"

            If DBType = "MYSQL" Then
                str = "Update ItemMasterDetails Set DeletedBy=" & GBLUserID & ",DeletedDate=Now() ,IsDeletedTransaction=1  WHERE CompanyID=" & GBLCompanyID & " and ItemID=" & txtGetGridRow & " And ItemGroupID=" & UnderGroupID & ";"
                str += "Update ItemMaster Set DeletedBy=" & GBLUserID & ",DeletedDate=Now() ,IsDeletedTransaction=1  WHERE CompanyID=" & GBLCompanyID & " and ItemID=" & txtGetGridRow & " And ItemGroupID=" & UnderGroupID
            Else
                str = "Update ItemMasterDetails Set DeletedBy=" & GBLUserID & ",DeletedDate=Getdate() ,IsDeletedTransaction=1  WHERE CompanyID=" & GBLCompanyID & " and ItemID=" & txtGetGridRow & " And ItemGroupID=" & UnderGroupID & ";"
                str += "Update ItemMaster Set DeletedBy=" & GBLUserID & ",DeletedDate=Getdate() ,IsDeletedTransaction=1  WHERE CompanyID=" & GBLCompanyID & " and ItemID=" & txtGetGridRow & " And ItemGroupID=" & UnderGroupID
            End If
            KeyField = db.ExecuteNonSQLQuery(str)

        Catch ex As Exception
            KeyField = "fail " & ex.Message
        End Try
        Return KeyField
    End Function


    '-----------------------------------CheckPermission------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function CheckPermission(ByVal TransactionID As String) As String
        Dim KeyField As String = ""
        Try
            'Dim con As New SqlConnection
            'con = db.OpenDataBase()

            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            Dim dtExist As New DataTable
            Dim dtExist1 As New DataTable
            Dim dtExist2 As New DataTable
            Dim SxistStr As String

            Dim D1 As String = ""
            Dim D2 As String = ""
            Dim D3 As String = ""

            SxistStr = ""
            If DBType = "MYSQL" Then
                SxistStr = "select IFNULL(ItemID,0) as ItemID from ItemTransactionDetail where CompanyID=" & GBLCompanyID & " and  ItemID= '" & TransactionID & "' and IFNULL(IsDeletedTransaction,0)<>1"
            Else
                SxistStr = "select Top 1 Isnull(ITD.ItemID,0) as ItemID  From ItemTransactionMain AS ITM INNER JOIN ItemTransactionDetail AS ITD ON ITM.TransactionID=ITD.TransactionID Where ITM.CompanyID=" & GBLCompanyID & " And ITM.VoucherID<>-8 And  ITD.ItemID= '" & TransactionID & "' and isnull(ITM.IsDeletedTransaction,0)<>1"
            End If
            db.FillDataTable(dtExist, SxistStr)
            Dim E As Integer = dtExist.Rows.Count
            If E > 0 Then
                D1 = dtExist.Rows(0)(0)
            End If
            SxistStr = ""
            If DBType = "MYSQL" Then
                SxistStr = "Select  * From ItemTransactionDetail Where IFNULL(IsDeletedTransaction, 0) = 0 And IFNULL(QCApprovalNo,'')<>'' AND TransactionID=" & TransactionID & "  AND (IFNULL(ApprovedQuantity,0)>0 OR  IFNULL(RejectedQuantity,0)>0)"
            Else
                SxistStr = "Select  * From ItemTransactionDetail Where Isnull(IsDeletedTransaction, 0) = 0 And isnull(QCApprovalNo,'')<>'' AND TransactionID=" & TransactionID & "  AND (Isnull(ApprovedQuantity,0)>0 OR  Isnull(RejectedQuantity,0)>0)"
            End If
            db.FillDataTable(dtExist1, SxistStr)
            Dim F As Integer = dtExist1.Rows.Count
            If F > 0 Then
                D2 = dtExist1.Rows(0)(0)
            End If

            'If D1 <> "" Or D2 <> "" Then
            '    KeyField = "Exist"
            'End If

            If DBType = "MYSQL" Then
                SxistStr = "select TOP 1 ISNULL(PaperID,0) as PaperID from JobBookingJobCardContents where CompanyID=" & GBLCompanyID & " and  PaperID= '" & TransactionID & "' and IFNULL(IsDeletedTransaction,0)<>1"
            Else
                SxistStr = "select TOP 1 ISNULL(PaperID,0) as PaperID from JobBookingJobCardContents where CompanyID=" & GBLCompanyID & " and  PaperID = '" & TransactionID & "' and ISNULL(IsDeletedTransaction,0)<>1"
            End If
            db.FillDataTable(dtExist2, SxistStr)
            Dim G As Integer = dtExist2.Rows.Count
            If G > 0 Then
                D3 = dtExist2.Rows(0)(0)
            End If

            If D1 <> "" Or D2 <> "" Or D3 <> "" Then
                KeyField = "Exist"
            End If

            'con.Close()
            KeyField = KeyField

        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function


    '-----------------------------------Get MasterGridLoadedData (Edit)------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function MasterGridLoadedData(ByVal masterID As String, ByVal Itemid As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"
        Dim dt As New DataTable


        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLUserName = Convert.ToString(HttpContext.Current.Session("UserName"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        GBLBranchID = Convert.ToString(HttpContext.Current.Session("BranchId"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
        Dim selQ As String
        If DBType = "MYSQL" Then
            selQ = "CALL SelectedRow(  '',"
            str = selQ & GBLCompanyID & "," & masterID & "," & Itemid & ");"
        Else
            selQ = "execute SelectedRow  '',"
            str = selQ & GBLCompanyID & "," & masterID & "," & Itemid
        End If
        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)

        Return js.Serialize(data.Message)

    End Function

    '-----------------------------------Get Drill down Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function DrillDownMasterGrid(ByVal masterID As String, ByVal TabID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"
        Dim str2, Qery As String
        Dim dt As New DataTable


        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLUserName = Convert.ToString(HttpContext.Current.Session("UserName"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        GBLBranchID = Convert.ToString(HttpContext.Current.Session("BranchId"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        str2 = ""
        If DBType = "MYSQL" Then
            str2 = "Select nullif(SelectQuery,'') as SelectQuery From DrilDown Where CompanyID=" & GBLCompanyID & " and ItemGroupID='" & masterID & "' and TabName='" & TabID & "' and IFNULL(IsDeletedTransaction,0)<>1"
        Else
            str2 = "Select nullif(SelectQuery,'') as SelectQuery From DrilDown Where CompanyID=" & GBLCompanyID & " and ItemGroupID='" & masterID & "' and TabName='" & TabID & "' and isnull(IsDeletedTransaction,0)<>1"
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
                data.Message = ConvertDataTableTojSonString(dataTable)
            Catch ex As Exception
                Return ex.Message
            End Try

        End If
        Return js.Serialize(data.Message)

    End Function

    '-----------------------------------Get Master------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function Master(ByVal masterID As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "SELECT Distinct nullif(ItemGroupFieldID,'') as ItemGroupFieldID,nullif(ItemGroupID,'') as ItemGroupID,nullif(FieldName,'') as FieldName,nullif(FieldDataType,'') as FieldDataType,nullif(FieldDescription,'') as FieldDescription,nullif(IsDisplay,'') as IsDisplay,nullif(IsCalculated,'') as IsCalculated,nullif(FieldFormula,'') as FieldFormula,nullif(FieldTabIndex,'') as FieldTabIndex,nullif(FieldDrawSequence,'') as FieldDrawSequence,nullif(FieldDefaultValue,'') as FieldDefaultValue,nullif(CompanyID,'') as CompanyID,nullif(UserID,'') as UserID,IFNULL(ModifiedDate,'') as ModifiedDate,nullif(FYear,'') as FYear,nullif(IsActive,'') as IsActive,nullif(IsDeleted,'') as IsDeleted,nullif(FieldDisplayName,'') as FieldDisplayName,nullif(FieldType,'') as FieldType,nullif(SelectBoxQueryDB,'') as SelectBoxQueryDB,nullif(SelectBoxDefault,'') as SelectBoxDefault,nullif(ControllValidation,'') as ControllValidation,nullif(FieldFormulaString,'') as FieldFormulaString,nullif(IsRequiredFieldValidator,'') as IsRequiredFieldValidator,nullif(UnitMeasurement,'') as UnitMeasurement " &
                  " FROM ItemGroupFieldMaster Where CompanyID = " & GBLCompanyID & " and ItemGroupID='" & masterID & "' and IFNULL(IsDeletedTransaction,0)<>1 Order By FieldDrawSequence"
        Else
            str = "SELECT Distinct nullif(ItemGroupFieldID,'') as ItemGroupFieldID,nullif(ItemGroupID,'') as ItemGroupID,nullif(FieldName,'') as FieldName,nullif(FieldDataType,'') as FieldDataType,nullif(FieldDescription,'') as FieldDescription,nullif(IsDisplay,'') as IsDisplay,nullif(IsCalculated,'') as IsCalculated,nullif(FieldFormula,'') as FieldFormula,nullif(FieldTabIndex,'') as FieldTabIndex,nullif(FieldDrawSequence,'') as FieldDrawSequence,nullif(FieldDefaultValue,'') as FieldDefaultValue,nullif(CompanyID,'') as CompanyID,nullif(UserID,'') as UserID,nullif(ModifiedDate,'') as ModifiedDate,nullif(FYear,'') as FYear,nullif(IsActive,'') as IsActive,nullif(IsDeleted,'') as IsDeleted,nullif(FieldDisplayName,'') as FieldDisplayName,nullif(FieldType,'') as FieldType,nullif(SelectBoxQueryDB,'') as SelectBoxQueryDB,nullif(SelectBoxDefault,'') as SelectBoxDefault,nullif(ControllValidation,'') as ControllValidation,nullif(FieldFormulaString,'') as FieldFormulaString,nullif(IsRequiredFieldValidator,'') as IsRequiredFieldValidator,nullif(UnitMeasurement,'') as UnitMeasurement,IsLocked,Isnull(MinimumValue,0) AS MinimumValue,Isnull(MaximumValue,0) AS MaximumValue " &
                  " FROM ItemGroupFieldMaster Where CompanyID = " & GBLCompanyID & " and ItemGroupID='" & masterID & "' and isnull(IsDeletedTransaction,0)<>1 Order By FieldDrawSequence "
        End If
        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
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
                'str3 = "Select nullif(replace(SelectboxQueryDB,'#',''''),'') as SelectboxQueryDB From ItemGroupFieldMaster Where CompanyID=" & GBLCompanyID & " and ItemGroupFieldID=" & QS & " and isnull(IsDeletedTransaction,0)<>1"
                If DBType = "MYSQL" Then
                    str3 = "Select nullif(SelectboxQueryDB,'') as SelectboxQueryDB From ItemGroupFieldMaster Where CompanyID=" & GBLCompanyID & " and ItemGroupFieldID=" & QS & " and IFNULL(IsDeletedTransaction,0)<>1"
                Else
                    str3 = "Select nullif(SelectboxQueryDB,'') as SelectboxQueryDB From ItemGroupFieldMaster Where CompanyID=" & GBLCompanyID & " and ItemGroupFieldID=" & QS & " and isnull(IsDeletedTransaction,0)<>1"
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
                    If DBType = "MYSQL" Then
                        If QSQery.ToUpper().Contains("CALL ") Then
                            str = QSQery & ");"
                        Else
                            str = QSQery
                        End If
                    Else
                        str = QSQery
                    End If
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

    '-----------------------------------Get FieldNameName (SaveAs)------------------------------------------
    Private Function DuplicateItemGroupValidate(ByVal TabelID As String, ByVal tblObj As Object) As Boolean
        Dim str2, ColValue As String
        Dim dtExist As New DataTable
        Dim dt As New DataTable
        Try
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            If DBType = "MYSQL" Then
                str2 = "Select nullif(SaveAsString,'') as SaveAsString From ItemGroupMaster Where CompanyID=" & GBLCompanyID & " and ItemGroupID='" & TabelID & "' and IFNULL(IsDeletedTransaction,0)<>1"
            Else
                str2 = "Select nullif(SaveAsString,'') as SaveAsString From ItemGroupMaster Where CompanyID=" & GBLCompanyID & " and ItemGroupID='" & TabelID & "' and Isnull(IsDeletedTransaction,0)<>1"
            End If
            db.FillDataTable(dtExist, str2)
            If dtExist.Rows.Count > 0 Then
                If IsDBNull(dtExist.Rows(0)(0)) = True Then
                    Return False
                Else
                    Dim GetColumn As String
                    GetColumn = dtExist.Rows(0)(0)
                    '  GetColumn = "LedgerName, MailingName"
                    db.ConvertObjectToDatatable(tblObj, dt)
                    ColValue = ""
                    Dim BrakCount = ""
                    For i As Integer = 0 To dt.Rows.Count - 1
                        If GetColumn.Contains(dt.Rows(i)("FieldName")) Then
                            If ColValue = "" Then
                                If DBType = "MYSQL" Then
                                    ColValue = " And IFNULL(IsDeletedTransaction,0)<>1 And ItemID In(Select Distinct ItemID From ItemMasterDetails Where FieldName='" & dt.Rows(i)("FieldName") & "' And FieldValue='" & dt.Rows(i)("FieldValue") & "'"
                                Else
                                    ColValue = " And Isnull(IsDeletedTransaction,0)<>1 And ItemID In(Select Distinct ItemID From ItemMasterDetails Where FieldName='" & dt.Rows(i)("FieldName") & "' And FieldValue='" & dt.Rows(i)("FieldValue") & "'"
                                End If
                                BrakCount = " )"
                            Else
                                ColValue = ColValue & " And ItemID In(Select Distinct ItemID From ItemMasterDetails Where FieldName='" & dt.Rows(i)("FieldName") & "' And FieldValue='" & dt.Rows(i)("FieldValue") & "'"
                                BrakCount = BrakCount & ")"
                            End If
                        End If
                    Next
                    str2 = "Select Distinct ItemID From ItemMasterDetails Where CompanyID=" & GBLCompanyID & " And ItemGroupID=" & TabelID & ColValue & BrakCount
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

        str = "Select distinct ItemSubGroupID,ItemSubGroupDisplayName from ItemSubGroupMaster Where CompanyID=" & GBLCompanyID & ""
        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Get GroupName Grid------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetGroup() As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "Select distinct ISGM.ItemSubGroupUniqueID,ISGM.ItemSubGroupID,ISGM.ItemSubGroupDisplayName,ISGM.UnderSubGroupID,ISGM.ItemSubGroupName,ISGM.ItemSubGroupLevel ,(select ItemSubGroupDisplayName from ItemSubGroupMaster where ItemSubGroupID=ISGM.UnderSubGroupID and CompanyID=ISGM.CompanyID limit 1) as GroupName from ItemSubGroupMaster  as ISGM  where CompanyID=" & GBLCompanyID & " and IFNULL(IsDeletedTransaction,0)<>1"
        Else
            str = "Select distinct ISGM.ItemSubGroupUniqueID,ISGM.ItemSubGroupID,ISGM.ItemSubGroupDisplayName,ISGM.UnderSubGroupID,ISGM.ItemSubGroupName,ISGM.ItemSubGroupLevel ,(select top 1 ItemSubGroupDisplayName from ItemSubGroupMaster where ItemSubGroupID=ISGM.UnderSubGroupID and CompanyID=ISGM.CompanyID) as GroupName from ItemSubGroupMaster  as ISGM  where CompanyID=" & GBLCompanyID & " and Isnull(IsDeletedTransaction,0)<>1"
        End If
        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
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
        'GBLUserName = Convert.ToString(HttpContext.Current.Session("UserName"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))


        Try
            'Dim con As New SqlConnection
            'con = db.OpenDataBase()

            Dim dtExist As New DataTable
            Dim ItemSubGroupID As Integer
            '' and  UnderSubGroupID = '" & UnderGroupID & "'
            str2 = ""
            If DBType = "MYSQL" Then
                str2 = "select distinct nullif(ItemSubGroupName,'') as ItemSubGroupName From ItemSubGroupMaster where CompanyID=" & GBLCompanyID & " and ItemSubGroupName= '" & GroupName & "' and IFNULL(IsDeletedTransaction,0)<>1"
            Else
                str2 = "select distinct nullif(ItemSubGroupName,'') as ItemSubGroupName " &
                "from ItemSubGroupMaster where CompanyID=" & GBLCompanyID & " and ItemSubGroupName= '" & GroupName & "' " &
                "and isnull(IsDeletedTransaction,0)<>1"
            End If
            db.FillDataTable(dtExist, str2)
            Dim E As Integer = dtExist.Rows.Count
            If E > 0 Then
                KeyField = "Exist"
            Else

                Dim dt1 As New DataTable
                str2 = ""
                If DBType = "MYSQL" Then
                    str2 = "Select IFNULL(max(ItemSubGroupID),0) + 1 As ItemSubGroupID From ItemSubGroupMaster Where  CompanyID=" & GBLCompanyID & " and IFNULL(IsDeletedTransaction,0)<>1"
                Else
                    str2 = "Select isnull(max(ItemSubGroupID),0) + 1 As ItemSubGroupID From ItemSubGroupMaster Where  CompanyID=" & GBLCompanyID & " and Isnull(IsDeletedTransaction,0)<>1"
                End If
                db.FillDataTable(dt1, str2)
                Dim i As Integer = dt1.Rows.Count
                If i > 0 Then
                    ItemSubGroupID = dt1.Rows(0)(0)
                End If

                Dim dt2 As New DataTable
                str2 = ""
                If DBType = "MYSQL" Then
                    str2 = "Select IFNULL(ItemSubGroupLevel,0) ItemSubGroupLevel From ItemSubGroupMaster Where ItemSubGroupID = '" & UnderGroupID & "' And CompanyID=" & GBLCompanyID & " and IFNULL(IsDeletedTransaction,0)<>1"
                Else
                    str2 = "Select isnull(ItemSubGroupLevel,0) ItemSubGroupLevel From ItemSubGroupMaster Where ItemSubGroupID = '" & UnderGroupID & "' And CompanyID=" & GBLCompanyID & " and Isnull(IsDeletedTransaction,0)<>1"
                End If
                db.FillDataTable(dt2, str2)
                Dim k As Integer = dt2.Rows.Count
                GroupLevel = k + 1

                TableName = "ItemSubGroupMaster"
                AddColName = ""
                AddColValue = ""
                AddColName = "ModifiedDate,CreatedDate,UserID,CompanyID,ItemSubGroupID,FYear,CreatedBy,ModifiedBy,ItemSubGroupLevel"
                If DBType = "MYSQL" Then
                    AddColValue = "Now(),Now()," & GBLUserID & "," & GBLCompanyID & ",'" & ItemSubGroupID & "','" & GBLFYear & "'," & GBLUserID & "," & GBLUserID & ",'" & GroupLevel & "'"
                Else
                    AddColValue = "Getdate(),Getdate()," & GBLUserID & "," & GBLCompanyID & ",'" & ItemSubGroupID & "','" & GBLFYear & "'," & GBLUserID & "," & GBLUserID & ",'" & GroupLevel & "'"
                End If
                db.InsertDatatableToDatabase(CostingDataGroupMaster, TableName, AddColName, AddColValue)

                'con.Close()
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
    Public Function UpdatGroupData(ByVal CostingDataGroupMaster As Object, ByVal ItemSubGroupUniqueID As String, ByVal ItemSubGroupLevel As String, ByVal GroupName As String) As String

        Dim dt As New DataTable
        Dim KeyField, str2 As String
        Dim AddColName, wherecndtn, TableName As String
        AddColName = ""

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLUserName = Convert.ToString(HttpContext.Current.Session("UserName"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        GBLBranchID = Convert.ToString(HttpContext.Current.Session("BranchId"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        Try
            'Dim con As New SqlConnection
            'con = db.OpenDataBase()
            Dim dtExist As New DataTable

            str2 = ""
            If DBType = "MYSQL" Then
                str2 = "select distinct nullif(ItemSubGroupName,'') as ItemSubGroupName from ItemSubGroupMaster where CompanyID=" & GBLCompanyID & " and ItemSubGroupName= '" & GroupName & "' AND ItemSubGroupUniqueID<>" & ItemSubGroupUniqueID & " and IFNULL(IsDeletedTransaction,0)<>1"
            Else
                str2 = "select distinct nullif(ItemSubGroupName,'') as ItemSubGroupName " &
                "from ItemSubGroupMaster where CompanyID=" & GBLCompanyID & " and ItemSubGroupName= '" & GroupName & "' AND ItemSubGroupUniqueID<>" & ItemSubGroupUniqueID & " " &
                "and isnull(IsDeletedTransaction,0)<>1"
            End If
            db.FillDataTable(dtExist, str2)
            Dim E As Integer = dtExist.Rows.Count
            If E > 0 Then
                KeyField = "Exist"
            Else

                TableName = "ItemSubGroupMaster"
                AddColName = ""
                wherecndtn = ""
                If DBType = "MYSQL" Then
                    AddColName = "ModifiedDate=Now(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy=" & GBLUserID & ",ItemSubGroupLevel='" & ItemSubGroupLevel & "'"
                Else
                    AddColName = "ModifiedDate=Getdate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy=" & GBLUserID & ",ItemSubGroupLevel='" & ItemSubGroupLevel & "'"
                End If
                wherecndtn = "CompanyID=" & GBLCompanyID & " And ItemSubGroupUniqueID=" & ItemSubGroupUniqueID & " "
                db.UpdateDatatableToDatabase(CostingDataGroupMaster, TableName, AddColName, 0, wherecndtn)

                'con.Close()
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
    Public Function DeleteGroupMasterData(ByVal ItemSubGroupUniqueID As String) As String

        Dim dt As New DataTable
        Dim KeyField As String
        Dim RevisionNo As Long = 0
        Dim AddColName, AddColValue As String

        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        GBLUserName = Convert.ToString(HttpContext.Current.Session("UserName"))
        GBLFYear = Convert.ToString(HttpContext.Current.Session("FYear"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        AddColName = ""
        AddColValue = ""

        Try

            str = ""
            If DBType = "MYSQL" Then
                Dim con As New MySqlConnection
                con = db.OpenDataBaseMYSQL()

                str = "Update ItemSubGroupMaster Set ModifiedBy=" & GBLUserID & ",DeletedBy=" & GBLUserID & ",DeletedDate=Now(),ModifiedDate=Now(),IsDeletedTransaction=1  WHERE CompanyID=" & GBLCompanyID & " and ItemSubGroupUniqueID='" & ItemSubGroupUniqueID & "'"

                Dim cmd As New MySqlCommand(str, con)
                cmd.CommandType = CommandType.Text
                cmd.Connection = con
                cmd.ExecuteNonQuery()

                con.Close()

            Else
                Dim con As New SqlConnection
                con = db.OpenDataBase()

                str = "Update ItemSubGroupMaster Set ModifiedBy=" & GBLUserID & ",DeletedBy=" & GBLUserID & ",DeletedDate=Getdate(),ModifiedDate=Getdate(),IsDeletedTransaction=1  WHERE CompanyID=" & GBLCompanyID & " and ItemSubGroupUniqueID='" & ItemSubGroupUniqueID & "'"

                Dim cmd As New SqlCommand(str, con)
                cmd.CommandType = CommandType.Text
                cmd.Connection = con
                cmd.ExecuteNonQuery()

                con.Close()
            End If

            KeyField = "Success"


        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function

    '---------------Close Master code---------------------------------

    '-----------------------------------Get Item Type------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetItem() As String
        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "Select ItemGroupID,ItemGroupName from ItemGroupMaster where CompanyID = " & GBLCompanyID & " And ISNULL(IsDeleted,0)=0"
        Else
            str = "Select ItemGroupID,ItemGroupName from ItemGroupMaster where CompanyID = " & GBLCompanyID & " And ISNULL(IsDeleted,0)=0"
        End If

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Get Ledger Type------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetLedger() As String
        GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        GBLUserID = Convert.ToString(HttpContext.Current.Session("UserID"))
        DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

        If DBType = "MYSQL" Then
            str = "Select LedgerGroupID,LedgerGroupName from LedgerGroupMaster where CompanyID = " & GBLCompanyID & " And ISNULL(IsDeleted,0)=0"
        Else
            str = "Select LedgerGroupID,LedgerGroupName from LedgerGroupMaster where CompanyID = " & GBLCompanyID & " And ISNULL(IsDeleted,0)=0"
        End If

        db.FillDataTable(dataTable, str)
        data.Message = ConvertDataTableTojSonString(dataTable)
        Return js.Serialize(data.Message)
    End Function

    '-----------------------------------Check Permission For Updated Data------------------------------------------
    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function CheckPermissionforUpdate(ByVal ItemID As String) As String
        Dim KeyField As String = ""
        Try

            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))

            'JobBookingContent
            If db.IsDeletable("paperID", "JobBookingContents", "Where IsDeletedTransaction=0 And paperID=" & ItemID) = False Then
                Return "Exist"
            End If

            'JobBookingJobCardContents
            If db.IsDeletable("paperID", "JobBookingJobCardContents", "Where IsDeletedTransaction=0 And paperID=" & ItemID) = False Then
                Return "Exist"
            End If

            'ProductMasterContents
            If db.IsDeletable("paperID", "ProductMasterContents", "Where IsDeletedTransaction=0 And paperID=" & ItemID) = False Then
                Return "Exist"
            End If

            'ItemTransactionDetail
            If db.IsDeletable("ITD.ItemID", "ItemTransactionDetail AS ITM INNER JOIN ItemTransactionDetail AS ITD ON ITM.TransactionID=ITD.TransactionID", " Where Isnull(ITM.IsDeletedTransaction,0)=0 AND ITM.VoucherID<>-8 And ITD.ItemID=" & ItemID) = False Then
                Return "Exist"
            End If
            KeyField = "Success"

        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function

    '<WebMethod(EnableSession:=True)>
    '<ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    'Public Function UpdateUserData(ByVal ItemName As Object, ByVal ItemID As String, ByVal StockRefCode As String) As String
    '    Dim GBLCompanyID As String = Convert.ToString(HttpContext.Current.Session("CompanyID"))
    '    Dim GBLUserID As String = Convert.ToString(HttpContext.Current.Session("UserID"))
    '    Dim DBType As String = Convert.ToString(HttpContext.Current.Session("DBType"))
    '    Dim FYear As String = Convert.ToString(HttpContext.Current.Session("FYear"))
    '    Dim KeyField, wherecndtn, TableName, AddColName As String
    '    Dim dt As New DataTable

    '    'Dim str As String
    '    'Dim con As New SqlConnection
    '    'con = db.OpenDataBase()
    '    'str = "UPDATE ItemMaster SET ItemName = '" & ItemName & "' WHERE ItemID = '" & ItemID & "'"
    '    'KeyField = db.ExecuteNonSQLQuery(str)

    '    str = "Select Nullif(StockRefCode,'') as StockRefCode from ItemMaster where StockRefCode = '" & StockRefCode & "' And ItemID <> '" & ItemID & "' And CompanyID = '" & GBLCompanyID & "'And IsDeletedTransaction = 0"
    '    db.FillDataTable(dt, str)
    '    If dt.Rows.Count > 0 AndAlso Not IsDBNull(dt.Rows(0)(0)) Then
    '        Return "Stock Ref. Code already exists."
    '    End If
    '    Try
    '        TableName = "ItemMaster"
    '        AddColName = "ModifiedDate=Getdate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy=" & GBLUserID & " "
    '        wherecndtn = " CompanyID='" & GBLCompanyID & "' And ItemID='" & ItemID & "' "
    '        KeyField = db.UpdateDatatableToDatabase(ItemName, TableName, AddColName, 0, wherecndtn)
    '        If KeyField <> "Success" Then
    '            Return KeyField
    '        End If

    '        'str = "UPDATE ItemMasterDetails SET ParentFieldValue =  '" & ModifiedItemName & "',FieldValue = '" & ModifiedItemName & "' WHERE ItemID = '" & ItemID & "' AND ParentFieldName = 'Quality'"
    '        'KeyField = db.ExecuteNonSQLQuery(str)
    '        'If KeyField <> "Success" Then
    '        '    Return KeyField
    '        'End If


    '        str = " Update ItemMasterDetails set ParentFieldValue = (Select PurchaseRate from ItemMaster where ItemID='" & ItemID & "'),FieldValue=(Select PurchaseRate from ItemMaster where ItemID='" & ItemID & "')  Where ItemID='" & ItemID & "' And  ParentFieldName = 'PurchaseRate'"
    '        KeyField = db.ExecuteNonSQLQuery(str)
    '        If KeyField <> "Success" Then
    '            Return KeyField
    '        End If



    '        str = " Update ItemMasterDetails set ParentFieldValue = (Select EstimationRate from ItemMaster where ItemID='" & ItemID & "'),FieldValue=(Select EstimationRate from ItemMaster where ItemID='" & ItemID & "')  Where ItemID='" & ItemID & "' And  ParentFieldName = 'EstimationRate'"
    '        KeyField = db.ExecuteNonSQLQuery(str)
    '        If KeyField <> "Success" Then
    '            Return KeyField
    '        End If

    '        str = " Update ItemMasterDetails Set ParentFieldValue = (Select Top 1 ProductHSNID from ItemMaster where ItemID='" & ItemID & "'),FieldValue=(Select Top 1 ProductHSNID from ItemMaster where ItemID='" & ItemID & "')  Where ItemID='" & ItemID & "' And  ParentFieldName = 'ProductHSNID'"
    '        KeyField = db.ExecuteNonSQLQuery(str)
    '        If KeyField <> "Success" Then
    '            Return KeyField
    '        End If

    '        str = " Update ItemMasterDetails Set ParentFieldValue = (Select Top 1 MinimumStockQty from ItemMaster where ItemID='" & ItemID & "'),FieldValue=(Select Top 1 MinimumStockQty from ItemMaster where ItemID='" & ItemID & "')  Where ItemID='" & ItemID & "' And  ParentFieldName = 'MinimumStockQty'"
    '        KeyField = db.ExecuteNonSQLQuery(str)
    '        If KeyField <> "Success" Then
    '            Return KeyField
    '        End If

    '        str = " Update ItemMasterDetails Set ParentFieldValue = (Select Top 1 StockRefCode from ItemMaster where ItemID='" & ItemID & "'),FieldValue=(Select Top 1 StockRefCode from ItemMaster where ItemID='" & ItemID & "')  Where ItemID='" & ItemID & "' And  ParentFieldName = 'StockRefCode'"
    '        KeyField = db.ExecuteNonSQLQuery(str)
    '        If KeyField <> "Success" Then
    '            Return KeyField
    '        End If
    '        str = " Update ItemMasterDetails Set ParentFieldValue = (Select Top 1 PurchaseOrderQuantity from ItemMaster where ItemID='" & ItemID & "'),FieldValue=(Select Top 1 PurchaseOrderQuantity from ItemMaster where ItemID='" & ItemID & "')  Where ItemID='" & ItemID & "' And  ParentFieldName = 'PurchaseOrderQuantity'"
    '        KeyField = db.ExecuteNonSQLQuery(str)
    '        If KeyField <> "Success" Then
    '            Return KeyField
    '        End If

    '    Catch ex As Exception
    '        KeyField = "fail"
    '    End Try
    '    Return KeyField

    'End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function UpdateUserData(ByVal ItemName As Object, ByVal ItemID As String, ByVal StockRefCode As String) As String
        Dim GBLCompanyID As String = Convert.ToString(HttpContext.Current.Session("CompanyID"))
        Dim GBLUserID As String = Convert.ToString(HttpContext.Current.Session("UserID"))
        Dim DBType As String = Convert.ToString(HttpContext.Current.Session("DBType"))
        Dim FYear As String = Convert.ToString(HttpContext.Current.Session("FYear"))
        Dim KeyField, wherecndtn, TableName, AddColName As String
        Dim dt As New DataTable
        Dim dt3 As New DataTable


        str = "Select Nullif(StockRefCode,'') as StockRefCode from ItemMaster where StockRefCode = '" & StockRefCode & "' And ItemID <> '" & ItemID & "' And CompanyID = '" & GBLCompanyID & "'And IsDeletedTransaction = 0"
        db.FillDataTable(dt, str)
        If dt.Rows.Count > 0 AndAlso Not IsDBNull(dt.Rows(0)(0)) Then
            Return "Stock Ref. Code already exists."
        End If
        Try
            TableName = "ItemMaster"
            AddColName = "ModifiedDate=Getdate(),UserID=" & GBLUserID & ",CompanyID=" & GBLCompanyID & ",ModifiedBy=" & GBLUserID & " "
            wherecndtn = " CompanyID='" & GBLCompanyID & "' And ItemID='" & ItemID & "' "
            KeyField = db.UpdateDatatableToDatabase(ItemName, TableName, AddColName, 0, wherecndtn)
            If KeyField <> "Success" Then
                Return KeyField
            End If

            Dim ParentFields As String() = {"PurchaseRate", "EstimationRate", "ProductHSNID", "MinimumStockQty", "StockRefCode", "PurchaseOrderQuantity", "ProductHSNName"}

            Dim dtFieldValue As New DataTable
            Dim fieldValue As String
            ' Get ProductHSNID from ItemName object
            Dim productHSNIDValue As String = ""

            Try
                db.ConvertObjectToDatatable(ItemName, dt3)

                If dt3.Rows.Count > 0 Then

                    For i = 0 To dt3.Rows.Count - 1
                        productHSNIDValue = dt3.Rows(i)("ProductHSNID")
                    Next
                End If
            Catch ex As Exception
                productHSNIDValue = ""
            End Try

            For Each fieldName As String In ParentFields
                dtFieldValue = New DataTable()
                Dim itemGroupID As String = "0"

                If fieldName = "ProductHSNName" Then
                    fieldValue = productHSNIDValue  ' Send ProductHSNID value for ProductHSNName
                Else
                    ' Get value from ItemMaster
                    str = "SELECT TOP 1 [" & fieldName & "], ItemGroupID FROM ItemMaster WHERE ItemID = '" & ItemID & "'"
                    db.FillDataTable(dtFieldValue, str)
                    fieldValue = If(dtFieldValue.Rows.Count > 0 AndAlso Not IsDBNull(dtFieldValue.Rows(0)(fieldName)), Convert.ToString(dtFieldValue.Rows(0)(fieldName)), "")
                    itemGroupID = If(dtFieldValue.Rows.Count > 0 AndAlso Not IsDBNull(dtFieldValue.Rows(0)("ItemGroupID")), Convert.ToString(dtFieldValue.Rows(0)("ItemGroupID")), "0")
                End If

                ' Check if record exists
                Dim dtExists As New DataTable
                str = "SELECT 1 FROM ItemMasterDetails WHERE ItemID = '" & ItemID & "' AND ParentFieldName = '" & fieldName & "'"
                db.FillDataTable(dtExists, str)

                If dtExists.Rows.Count > 0 Then
                    ' Update
                    str = "UPDATE ItemMasterDetails SET " &
              "ParentFieldValue = '" & fieldValue.Replace("'", "''") & "', " &
              "FieldValue = '" & fieldValue.Replace("'", "''") & "', " &
              "FieldName = '" & fieldName & "', " &
              "ModifiedBy = '" & GBLUserID & "', " &
              "ModifiedDate = GETDATE() " &
              "WHERE ItemID = '" & ItemID & "' AND ParentFieldName = '" & fieldName & "'"
                Else
                    ' Insert
                    str = "INSERT INTO ItemMasterDetails (" &
              "ParentItemID, ParentFieldName, ParentFieldValue, ItemID, FieldID, FieldName, FieldValue, SequenceNo, " &
              "ItemGroupID, CompanyID, UserID, IsDeleted, IsBlocked, FYear, IsLocked, CreatedBy, CreatedDate, " &
              "ModifiedBy, ModifiedDate, DeletedBy, DeletedDate, IsActive, IsDeletedTransaction, ExItemID, ProductionUnitID) " &
              "VALUES (0, '" & fieldName & "', '" & fieldValue.Replace("'", "''") & "', '" & ItemID & "', 0, '" & fieldName & "', '" & fieldValue.Replace("'", "''") & "', 0, " &
              "'" & itemGroupID & "', '" & GBLCompanyID & "', '" & GBLUserID & "', 0, 0, '" & FYear & "', 0, '" & GBLUserID & "', GETDATE(), " &
              "NULL, NULL, 0, NULL, 0, 0, 0, 0)"
                End If

                KeyField = db.ExecuteNonSQLQuery(str)
                If KeyField <> "Success" Then
                    Return KeyField
                End If
            Next


        Catch ex As Exception
            KeyField = "fail"
        End Try
        Return KeyField

    End Function

    Public Class HelloWorldData
        Public Message As [String]
    End Class

End Class