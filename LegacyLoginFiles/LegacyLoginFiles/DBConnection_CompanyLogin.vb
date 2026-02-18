Imports Microsoft.VisualBasic
Imports System.Data
Imports System.Data.SqlClient
Imports System.Configuration
Imports Newtonsoft.Json
Imports System.Web.UI.Page

Imports System.Web.Script.Serialization
Imports Connection

Public Class DBConnection_CompanyLogin
    Public Db As New SqlConnection
    Public IndexName As String
    Private DA As SqlDataAdapter
    Dim str As String
    'Dim constr As String = ConfigurationManager.ConnectionStrings("constr").ConnectionString
    ' Dim con As New SqlConnection(constr)        
    Dim dt As New DataTable
    Dim flagID As Boolean
    Dim UniqueId As String
    Dim GblCompanyName As String
    Public Property ClientScript As Object

#Region "Constructor"

    Public Sub New()

    End Sub

    Public Sub New(ByVal ConnectionOpen As Boolean)
        OpenDataBase()
        Db.Open()
    End Sub

#End Region

#Region "Method"

    Public Function OpenDataBase() As SqlConnection
        Dim i As Integer = 0
        Dim constring As String

        ''constring = "Data Source = 13.232.228.188,1232;Initial Catalog=Indus;Persist Security Info=True;User ID=INDUS;Password=@3ZfO&#$313IU#!"
        constring = "Data Source = 13.200.122.70,1433;Initial Catalog=Indus;Persist Security Info=True;User ID=INDUS;Password=Param@99811"

        Try
            Db = New SqlConnection
            Db.ConnectionString = constring

            'Db.ConnectionString = ConfigurationManager.ConnectionStrings.Item("PrintXP5ConnectionString1").ConnectionString
m:
            If i = 1 Then
                Db = New SqlConnection
                Db.ConnectionString = constring
            End If
            Db.Open()
            Return Db

        Catch ex As Exception

            If i = 0 Then
                i = i + 1
                If Db.State = ConnectionState.Open Then
                    Db.Close()
                End If
                GoTo m
            Else
                If Db.State = ConnectionState.Open Then
                    Db.Close()
                End If
            End If
            Return Db
        End Try
    End Function

    Public Sub GetCompName(ByVal CompanyName As String)
        Try
            GblCompanyName = CompanyName
        Catch ex As Exception
            ' MsgBox(ex.Message)
        End Try
    End Sub

    Public Sub FillDataTable(ByRef DataTableObj As DataTable, ByVal SqlSelectQuery As String, Optional ByVal SqlStoredProcedure As String = "")
        Try
            'GblCompanyName = Convert.ToString(HttpContext.Current.Session("CompanyName"))
            'GetCompName(GblCompanyName)
            Db = OpenDataBase()
            If Db.State = ConnectionState.Closed Then
                Db.Open()
            End If
            Dim cmd As SqlCommand
            If Trim(SqlSelectQuery) = "" Then
                cmd = New SqlCommand(SqlStoredProcedure, Db)
                cmd.CommandType = CommandType.StoredProcedure
            Else
                cmd = New SqlCommand(SqlSelectQuery, Db)
            End If
            DA = New SqlDataAdapter(cmd)
            DA.Fill(DataTableObj)
            Db.Close()
        Catch ex As Exception
            'MsgBox(ex.Message)
        End Try
    End Sub
    '==========================================IsDeletable===========================================================================
    Public Function IsDeletable(ByVal FieldName As String, ByVal TableName As String, Optional SearchCondition As String = "") As Boolean
        Try
            'Dim constr As String = ConfigurationManager.ConnectionStrings("constr").ConnectionString
            'Dim con As New SqlConnection(constr)
            Dim dt As New DataTable
            str = "SELECT " & FieldName & " FROM " & TableName & " " & SearchCondition
            FillDataTable(dt, str)
            If dt.Rows.Count = 0 Then
                IsDeletable = True
            Else
                IsDeletable = False
            End If
        Catch ex As Exception
            Return ex.Message
        End Try
        Return IsDeletable
    End Function

    Public Sub FillDataSet(ByRef DataSetObj As DataSet, ByVal SqlSelectQuery As String, Optional ByVal SqlStoredProcedure As String = "")
        Try
            Db = OpenDataBase()
            If Db.State = ConnectionState.Closed Then
                Db.Open()
            End If
            Dim cmd As New SqlCommand
            If Trim(SqlSelectQuery) = "" Then
                cmd.CommandText = SqlStoredProcedure
                cmd.CommandType = CommandType.StoredProcedure
            Else
                cmd = New SqlCommand(SqlSelectQuery, Db)
            End If

            DA = New SqlDataAdapter(cmd)
            DA.Fill(DataSetObj)
            Db.Close()
        Catch ex As Exception
            '   MsgBox(ex.Message)
        End Try
    End Sub

    Public Sub FillDataReader(ByRef DataSetObj As SqlDataReader, ByVal SqlSelectQuery As String, Optional ByVal SqlStoredProcedure As String = "")
        Try
            Db = OpenDataBase()
            If Db.State = ConnectionState.Closed Then
                Db.Open()
            End If
            Dim cmd As New SqlCommand
            If Trim(SqlSelectQuery) = "" Then
                cmd.CommandText = SqlStoredProcedure
                cmd.CommandType = CommandType.StoredProcedure
            Else
                cmd = New SqlCommand(SqlSelectQuery, Db)
            End If

            DataSetObj = cmd.ExecuteReader()

            Db.Close()
        Catch ex As Exception
            ' MsgBox(ex.Message)
        End Try
    End Sub

    Public Sub FillCombo(ByRef DropDownListName As DropDownList, ByVal TableName As String, ByVal FieldName As String, Optional ByVal KeyFieldName As String = "", Optional ByVal SearchCondition As String = "")
        Try
            If Trim(SearchCondition) = "" Then
                SearchCondition = "  Where ISNULL(" & FieldName & ",'')<>'' "
            Else
                SearchCondition = SearchCondition + "  and ISNULL(" & FieldName & ",'')<>'' "
            End If

            Dim Sql As String = ""
            If Trim(TableName) <> "" And Trim(FieldName) <> "" Then
                If Trim(KeyFieldName) = "" Then
                    Sql = "SELECT DISTINCT  " + FieldName + "  FROM  " + TableName + "  "
                Else
                    Sql = "SELECT DISTINCT  " + KeyFieldName + "," + FieldName + "  FROM  " + TableName + "  " + SearchCondition
                End If
                Dim dt As New DataTable
                FillDataTable(dt, Sql)
                DropDownListName.DataSource = dt
                DropDownListName.DataTextField = FieldName
                If Trim(KeyFieldName) <> "" Then
                    DropDownListName.DataValueField = KeyFieldName
                End If
                DropDownListName.DataBind()
                DropDownListName.Items.Insert(0, "--Select--")
            End If
        Catch ex As Exception
            ' MsgBox(ex.Message)
        End Try
    End Sub

    Public Function InsertBulkData(ByVal JsonObject As Object, ByVal TableName As String, ByVal AddColName As String, ByVal AddColValue As String) As String

        Try

            ConvertObjectToDatatable(JsonObject, dt)
            Dim spliteid = AddColName.Split(",")
            For Each spid In spliteid
                dt.Columns.Add(spid)
            Next

            Dim spliteidvalue = AddColValue.Split(",")
            For spidval = 0 To spliteidvalue.Length - 1
                'Set the Default Value.
                dt.Columns(spliteid(spidval)).DefaultValue = spliteid(spidval)
            Next

            Db = OpenDataBase()
            If Db.State = ConnectionState.Closed Then
                Db.Open()
            End If
            'dt.Columns.AddRange(New DataColumn(2) {New DataColumn("Id", GetType(Integer)),
            '                    New DataColumn("Name", GetType(String)),
            '                    New DataColumn("Country", GetType(String))})

            'For Each row As GridViewRow In dt.Rows
            '    If TryCast(row.FindControl("CheckBox1"), CheckBox).Checked Then
            '        Dim id As Integer = Integer.Parse(row.Cells(1).Text)
            '        Dim name As String = row.Cells(2).Text
            '        Dim country As String = row.Cells(3).Text
            '        dt.Rows.Add(id, name, country)
            '    End If
            'Next

            For Each column In dt.Columns
                'If column.ColumnName = "BookingID" Then
                '    ' dt.Rows(0)(column) = AddColValue
                'ElseIf column.ColumnName = "BookingNo" Then

                '                    Else
                If column.ColumnName = "Id" Then
                    dt.Columns.Remove(column)
                    Exit For
                End If
            Next

            If dt.Rows.Count > 0 Then
                'Dim consString As String = ConfigurationManager.ConnectionStrings("constr").ConnectionString
                'Using con As New SqlConnection(consString)
                Using sqlBulkCopy As New SqlBulkCopy(Db)
                    'Set the database table name
                    sqlBulkCopy.DestinationTableName = TableName

                    '[OPTIONAL]: Map the DataTable columns with that of the database table
                    'sqlBulkCopy.ColumnMappings.Add("Id", "CustomerId")
                    'sqlBulkCopy.ColumnMappings.Add("Name", "Name")
                    'sqlBulkCopy.ColumnMappings.Add("Country", "Country")
                    'Db.Open()
                    sqlBulkCopy.WriteToServer(dt)
                    Db.Close()
                End Using
                'End Using
            End If

            Return "Success"
        Catch ex As Exception
            Return ex.Message
        End Try
    End Function

    Public Function InsertDatatableToDatabase(ByVal JsonObject As Object, ByVal TableName As String, ByVal AddColName As String, ByVal AddColValue As String, ByRef con As SqlConnection, ByRef objTrans As SqlTransaction, Optional ByVal VoucherType As String = "", Optional ByVal TransactionID As String = "") As String

        'Db = OpenDataBase()
        'If Db.State = ConnectionState.Closed Then
        '    Db.Open()
        'End If
        Db = con
        Dim KeyReturn As String = ""
        Dim ColName As String = ""
        Dim TransID As String = ""
        Dim ColValue As String
        Dim dt As New DataTable
        ConvertObjectToDatatable(JsonObject, dt)

        Try
            ColName = ""
            For Each column In dt.Columns
                If column.ColumnName <> "Id" Then ''''indexed db Id not for store
                    If ColName = "" Then
                        ColName = column.ColumnName
                    Else
                        ColName = ColName & "," & column.ColumnName
                    End If
                End If
            Next

            For i As Integer = 0 To dt.Rows.Count - 1
                ColValue = ""
                For Each column In dt.Columns
                    If column.ColumnName <> "Id" Then
                        'If column.dataType.Name = "String" Then
                        '    If ColValue = "" Then
                        '        ColValue = "'" & dt.Rows(i)(column.ColumnName) & "'"
                        '    Else
                        '        ColValue = ColValue & "," & "'" & Replace(dt.Rows(i)(column.ColumnName), "'", "") & "'"
                        '    End If
                        'Else
                        If VoucherType = "Receipt Note" Then
                            If column.ColumnName = "TransID" Then
                                TransID = "" & dt.Rows(i)(column.ColumnName) & ""
                            End If
                        End If
                        If column.ColumnName = "BatchNo" And VoucherType = "Receipt Note" Then
                            If ColValue = "" Then
                                ColValue = "'" & TransactionID & dt.Rows(i)(column.ColumnName) & "_" & TransID & "'"
                            Else
                                ColValue = ColValue & "," & "'" & TransactionID & dt.Rows(i)(column.ColumnName) & "_" & TransID & "'"
                            End If
                        Else
                            If column.ColumnName = "ParentTransactionID" Then
                                If dt.Rows(i)(column.ColumnName) <= 0 Then
                                    dt.Rows(i)(column.ColumnName) = TransactionID
                                End If
                            End If
                            If ColValue = "" Then
                                ColValue = "'" & dt.Rows(i)(column.ColumnName) & "'"
                            Else
                                ColValue = ColValue & "," & "'" & dt.Rows(i)(column.ColumnName) & "'"
                            End If
                        End If

                        'End If
                    End If
                Next
                If AddColName = "" Then
                    str = "Insert Into " & TableName & "( " & ColName & ") Values( " & ColValue & ")"
                Else
                    str = "Insert Into " & TableName & "( " & ColName & "," & AddColName & ") Values(" & ColValue & "," & AddColValue & ")"
                End If

                str = str & "SELECT SCOPE_IDENTITY();"
                Dim cmd = New SqlCommand(str, Db)
                cmd.Transaction = objTrans
                '' cmd.ExecuteNonQuery()
                KeyReturn = cmd.ExecuteScalar()
            Next
            '  Db.Close()
            dt = Nothing
            Return KeyReturn
        Catch ex As Exception
            KeyReturn = ex.Message
        End Try
        Return KeyReturn
    End Function

    Private Sub ExecuteSqlTransaction(ByVal connectionString As String)
        Using connection As New SqlConnection(connectionString)
            connection.Open()

            Dim command As SqlCommand = connection.CreateCommand()
            Dim transaction As SqlTransaction

            ' Start a local transaction
            transaction = connection.BeginTransaction("SampleTransaction")

            ' Must assign both transaction object and connection
            ' to Command object for a pending local transaction.
            command.Connection = connection
            command.Transaction = transaction

            Try
                command.CommandText =
              "Insert into Region (RegionID, RegionDescription) VALUES (100, 'Description')"
                command.ExecuteNonQuery()
                command.CommandText =
              "Insert into Region (RegionID, RegionDescription) VALUES (101, 'Description')"

                command.ExecuteNonQuery()

                ' Attempt to commit the transaction.
                transaction.Commit()
                Console.WriteLine("Both records are written to database.")

            Catch ex As Exception
                Console.WriteLine("Commit Exception Type: {0}", ex.GetType())
                Console.WriteLine("  Message: {0}", ex.Message)

                ' Attempt to roll back the transaction.
                Try
                    transaction.Rollback()

                Catch ex2 As Exception
                    ' This catch block will handle any errors that may have occurred
                    ' on the server that would cause the rollback to fail, such as
                    ' a closed connection.
                    Console.WriteLine("Rollback Exception Type: {0}", ex2.GetType())
                    Console.WriteLine("  Message: {0}", ex2.Message)
                End Try
            End Try
        End Using
    End Sub

    ''' <summary>
    ''' ''Save Booking operations data contents wise
    ''' </summary>
    ''' <param name="PObject">Operation data</param>
    ''' <param name="STableName">secondary table name</param>
    ''' <param name="AddColName">extra columns</param>
    ''' <param name="AddColValue">extra columns value</param>
    ''' <returns></returns>
    Public Function AddToDatabaseOperation(ByVal PObject As Object, ByVal STableName As String, ByVal AddColName As String, ByVal AddColValue As String) As String

        Dim KeyField As String
        Dim ColName As String = ""
        Dim ColValue As String
        Dim dts As New DataTable
        Dim WherCol As String = ""

        ConvertObjectToDatatable(PObject, dts)

        Try
            Db = OpenDataBase()
            If Db.State = ConnectionState.Closed Then
                Db.Open()
            End If

            ColName = ""
            For Each column In dts.Columns
                If column.ColumnName <> "Id" Then
                    If ColName = "" Then
                        ColName = column.ColumnName
                    Else
                        ColName = ColName & "," & column.ColumnName
                    End If
                End If
            Next
            For i As Integer = 0 To dts.Rows.Count - 1
                ColValue = ""
                For Each column In dts.Columns
                    If column.ColumnName <> "Id" Then
                        If ColValue = "" Then
                            ColValue = "'" & dts.Rows(i)(column.ColumnName) & "'"
                        Else
                            ColValue = ColValue & "," & "'" & dts.Rows(i)(column.ColumnName) & "'"
                        End If
                    End If
                    If column.ColumnName = "PlanContQty" Or column.ColumnName = "PlanContentType" Or column.ColumnName = "PlanContName" Then
                        If WherCol = "" Then
                            WherCol = "Where " & "" & column.ColumnName & "='" & dts.Rows(i)(column.ColumnName) & "' And "
                        Else
                            WherCol = WherCol & "" & column.ColumnName & "='" & dts.Rows(i)(column.ColumnName) & "' And "
                        End If
                    End If
                Next
                WherCol = WherCol.Remove(WherCol.Length - 4, 4)
                str = "Insert Into " & STableName & "( " & ColName & "," & AddColName & ",ContentsId) " &
                        "Select " & ColValue & "," & AddColValue & ",(Select Max(JobContentsID) From JobBookingContents " & WherCol & ");"
                Dim cmd = New SqlCommand(str, Db)
                cmd.ExecuteNonQuery()
                WherCol = ""
            Next
            Db.Close()
            dts = Nothing
            KeyField = "200"

        Catch ex As Exception
            KeyField = ex.Message
        End Try
        Return KeyField
    End Function

    Public Function UpdateDatatableToDatabase(ByVal JsonObject As Object, ByVal TableName As String, ByVal AddColName As String, ByVal Pvalue As Integer, ByRef con As SqlConnection, ByRef objTrans As SqlTransaction, Optional ByVal wherecndtn As String = "") As String
        Dim KeyField As String = ""

        Try
            UniqueId = ""
            ConvertObjectToDatatable(JsonObject, dt)

            'Db = OpenDataBase()
            'If Db.State = ConnectionState.Closed Then
            '    Db.Open()
            'End If
            Db = con
            Dim Cnt As Integer = 1

            For i As Integer = 0 To dt.Rows.Count - 1
                str = ""
                UniqueId = ""
                Cnt = 1
                For Each column In dt.Columns
                    If Cnt <= Pvalue Then
                        UniqueId = UniqueId & column.ColumnName & " ='" & dt.Rows(i)(column.ColumnName) & "' And "
                        Cnt = Cnt + 1
                    Else
                        str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
                    End If
                Next
                str = Left(str, Len(str) - 1)
                If UniqueId <> "" Then UniqueId = Left(UniqueId, Len(UniqueId) - 4)
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

                str = "Update " & TableName & " Set " & str & " Where " & UniqueId

                Dim cmd As New SqlCommand(str, Db)
                cmd.CommandType = CommandType.Text
                cmd.Transaction = objTrans
                cmd.ExecuteNonQuery()
            Next
            'Db.Close()
            KeyField = "Success"

            'Dim query = From iex In dt.AsEnumerable()
            '            Join idb In dt.AsEnumerable()
            '                On iex("FieldName") Equals idb("FieldName") And iex("FieldValue") Equals idb("FieldValue")
            '            Select iex

        Catch ex As Exception
            Return ex.Message
        End Try
        Return KeyField
    End Function

    'Public Function UpdateDatatableToDatabase(ByVal JsonObject As Object, ByVal TableName As String, ByVal AddColName As String) As String

    '    UniqueId = ""
    '    ConvertObjectToDatatable(JsonObject, dt)

    '    Db = OpenDataBase()
    '    If Db.State = ConnectionState.Closed Then
    '        Db.Open()
    '    End If

    '    Try
    '        For i As Integer = 0 To dt.Rows.Count - 1
    '            str = ""
    '            flagID = False
    '            For Each column In dt.Columns
    '                If flagID = False Then
    '                    UniqueId = column.ColumnName & " ='" & dt.Rows(0)(column.ColumnName) & "'"
    '                    flagID = True
    '                Else
    '                    str = str & column.ColumnName & "='" & dt.Rows(0)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
    '                End If
    '            Next
    '            str = Left(str, Len(str) - 1)
    '            str = "Update " & TableName & " Set " & str & " Where " & UniqueId

    '            Dim cmd As New SqlCommand(str, Db)
    '            cmd.CommandType = CommandType.Text
    '            cmd.ExecuteNonQuery()
    '        Next
    '        ' con.Close()
    '        KeyField = "Success"
    '    Catch ex As Exception
    '        KeyField = ex.Message
    '    End Try
    '    Return KeyField
    'End Function

    'Delete row

    Public Function ExecuteNonSQLQuery(ByVal QueryStr As String) As String
        Dim ReMsg As String
        Dim con As New SqlConnection
        Try
            con = OpenDataBase()
            If con.State = ConnectionState.Closed Then
                con.Open()
            End If

            Dim cmd As New SqlCommand(QueryStr, con)
            cmd.CommandType = CommandType.Text

            cmd.ExecuteNonQuery()
            con.Close()
            ReMsg = "Success"
        Catch ex As Exception
            ReMsg = ex.Message
        End Try
        Return ReMsg
    End Function

    Public Function ConvertDataSetsTojSonString(ByVal dataset As DataSet) As String
        Dim jsSerializer As JavaScriptSerializer = New JavaScriptSerializer()
        Dim ssvalue As Dictionary(Of String, Object) = New Dictionary(Of String, Object)()
        jsSerializer.MaxJsonLength = 2147483647

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

    'Public Function UpdateDatatableToDatabase(ByVal JsonObject As Object, ByVal TableName As String, ByRef CompanyId As Integer) As String
    '    Dim compid As String
    '    If CompanyId = Nothing Then
    '        compid = ""
    '    Else
    '        compid = " And CompanyId = " & CompanyId & ""
    '    End If
    '    UniqueId = ""
    '    ConvertObjectToDatatable(JsonObject, dt)
    '    Db = OpenDataBase()
    '    If Db.State = ConnectionState.Closed Then
    '        Db.Open()
    '    End If
    '    Try
    '        For i As Integer = 0 To dt.Rows.Count - 1
    '            str = ""
    '            flagID = False
    '            For Each column In dt.Columns
    '                If flagID = False Then
    '                    UniqueId = column.ColumnName & " ='" & dt.Rows(i)(column.ColumnName) & "'"
    '                    flagID = True
    '                Else
    '                    str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
    '                End If
    '            Next
    '            str = Left(str, Len(str) - 1)
    '            str = "Update " & TableName & " Set " & str & " Where " & UniqueId & compid

    '            Dim cmd = New SqlCommand(str, Db)
    '            cmd.ExecuteNonQuery()
    '        Next
    '        Db.Close()
    '    Catch ex As Exception
    '        Return ex.Message
    '    End Try
    '    Return "Sucess"
    'End Function

    Public Function GeneratePrefixedNo(ByVal TableName As String, ByVal Prefix As String, ByVal MaxFieldName As String, ByRef MaxNoVariable As Integer, ByVal GblYear As String, Optional ByVal SearchCondition As String = "") As String
        Dim dt As New DataTable()
        Dim st As String
        Dim i As Integer
        Dim GblCodesize As Integer
        GblCodesize = 5
        st = ""
        FillDataTable(dt, "Select isnull(MAX(isnull(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition)
        If dt.Rows.Count > 0 Then
            For i = 1 To GblCodesize - dt.Rows(0)(0).ToString().Length()
                st = Trim(st) & 0
            Next
            MaxNoVariable = dt.Rows(0)(0)
            st = Trim(st) & dt.Rows(0)(0) & "_" & Val(Right(GblYear, 7)) & "_" & Val(Right(GblYear, 2))
            GeneratePrefixedNo = Trim(Prefix) & st
        Else
            MaxNoVariable = 1
            GeneratePrefixedNo = Trim(Prefix) & "00001" & "_" & Val(Right(GblYear, 7)) & "_" & Val(Right(GblYear, 2))
        End If
        Return GeneratePrefixedNo
    End Function

    ''************************ Logic Convert Object To DataTable *** Using Newtonsoft *******************************
    Public Function ConvertObjectToDatatable(ByVal jsonObject As Object, ByRef datatable As DataTable) As DataTable
        Try
            Dim st As String = JsonConvert.SerializeObject(jsonObject)
            datatable = JsonConvert.DeserializeObject(Of DataTable)(st)

        Catch ex As Exception
            str = ex.Message
        End Try
        Return datatable
    End Function

    Public Function ConvertDataTableTojSonString(ByVal dataTable As DataTable) As String
        Dim serializer As New System.Web.Script.Serialization.JavaScriptSerializer()

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

    Public Function GenerateMaxVoucherNo(ByVal TableName As String, ByVal fieldname As String, Optional ByVal SearchCondition As String = "") As Long
        On Error Resume Next
        Dim dt As New DataTable()
        Dim Sql As String = ""
        Sql = "Select Isnull(MAX(" & fieldname & "),0)  From " & TableName & " " & SearchCondition
        FillDataTable(dt, Sql)
        If dt.Rows.Count > 0 Then
            GenerateMaxVoucherNo = IIf(IsDBNull(dt.Rows(0)(0)), 0, dt.Rows(0)(0)) + 1
        Else
            GenerateMaxVoucherNo = 1
        End If
        Return GenerateMaxVoucherNo
    End Function

    Public Function GenerateProductionCode(ByVal TableName As String, ByVal MaxFieldName As String, ByRef MaxNoVariable As Long, Optional SearchCondition As String = "") As String
        On Error Resume Next
        Dim dt As New DataTable()
        Dim Sql As String = ""
        Sql = "Select isnull(MAX(isnull(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition
        FillDataTable(dt, Sql)
        If dt.Rows.Count > 0 Then
            GenerateProductionCode = IIf(IsDBNull(dt.Rows(0)(0)), 1, dt.Rows(0)(0))
        Else
            GenerateProductionCode = 1
        End If
        Return GenerateProductionCode
    End Function

    Public Function ChangePassword(ByVal s As String) As String
        Dim i As Long = 0
        Dim p As String = "", k As String = ""
        Dim X As Long = 0
        For i = 1 To Len(s)
            k = Mid(s, i, 1)
            If IsNumeric(k) Then
                p = p & (Val(k) + 7)
            Else
                p = p & (Asc(k) + 7)
            End If
        Next
        s = ""
        X = 1
        For i = 1 To Len(p)
            k = Mid(p, X, 4)
            If k <> "" Then
                s = s & (Val(k) * 7)
                X = X + 4
            End If
        Next
        Return s
    End Function



    Public Function RoundFix(ByVal Num As Double) As Long    'Round off number to Upper side forcely '
        'like num = 6.50  to num 6.99 then num = 7 and like num = 6.01  to num 6.49 then num = 6
        On Error Resume Next
        Dim returnValue As Long
        Dim s As String, t As String
        Dim pos As Integer
        t = CStr(Num)
        pos = InStr(1, t, ".")
        If pos = 0 Then
            returnValue = CLng(Num)
        Else
            s = Left(t, pos - 1)
            returnValue = CLng(s)
        End If
        Return returnValue
    End Function

    Public Sub FillDDL(ByVal query As String, ByVal ddl As DropDownList, ByVal DM As String, ByVal VM As String)
        Dim da As New SqlDataAdapter("SELECT isnull(MachineId, 0) AS MachineId, nullif(MachineName, '') AS MachineName FROM MachineMaster", Db)
        Dim dt As New DataTable()
        da.Fill(dt)
        ddl.DataSource = dt
        ddl.DataTextField = DM
        ddl.DataValueField = "MachineName"

        ddl.DataBind()
        ddl.Items.Insert(0, "--Select--")
    End Sub

    Public Sub SaveBranchSettingMaster(ByVal ItemID As Long, ByVal ItemName As String, ByVal MasterName As String, ByVal BranchID As Long, ByVal BranchName As String)
        Dim MasterDataID As Integer
        Dim dt As New DataTable()
        Dim db As New DBConnection()
        db.FillDataTable(dt, "Select * FROM MasterData Where MasterDataName Like('" & MasterName & "')")
        If dt.Rows.Count >= 0 Then
            MasterName = IIf((dt.Rows(0)("MasterDataName")), "", dt.Rows(0)("MasterDataName"))
            MasterDataID = IIf((dt.Rows(0)("MasterDataID")), "", dt.Rows(0)("MasterDataID"))
        Else
            Exit Sub
        End If

        'db.FillDataTable(dt, "Select * FROM BranchSettingMaster Where MasterName ='" & MasterName & "' And SelectItemID=" & ItemID & "  And BranchID=" & BranchID & "")
        'If dt.Rows.Count = 0 Then
        '    Exit Sub
        'End If
        Dim cmd As New SqlCommand()
        db.OpenDataBase()
        cmd.Connection = db.OpenDataBase()
        cmd.CommandText = "BranchSettingMasterModification"
        cmd.CommandType = CommandType.StoredProcedure
        cmd.Parameters.AddWithValue("@Ind", 1)
        cmd.Parameters.AddWithValue("@BranchSettingID", 0)
        cmd.Parameters.AddWithValue("@SelectItemID", ItemID)
        cmd.Parameters.AddWithValue("@SelectItem", ItemName)
        cmd.Parameters.AddWithValue("@BranchID", BranchID)
        cmd.Parameters.AddWithValue("@BranchName", BranchName)
        cmd.Parameters.AddWithValue("@MasterName", MasterName)
        cmd.Parameters.AddWithValue("@CompanyID", 1)
        cmd.Parameters.AddWithValue("@MasterDataID", MasterDataID)
        cmd.ExecuteNonQuery()

    End Sub


    Public Function GenerateMaxEnquiryNo(ByVal TableName As String, ByVal MaxFieldName As String, ByRef MaxNoVariable As Integer) As String
        Dim dt As New DataTable()
        Dim st As String
        Dim i As Integer
        Dim GblCodesize As Integer
        GblCodesize = 4
        st = ""
        FillDataTable(dt, "Select isnull(MAX(isnull(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName)
        If dt.Rows.Count > 0 Then
            For i = 1 To GblCodesize - dt.Rows(0)(0).ToString().Length()
                st = Trim(st) & 0
            Next
            MaxNoVariable = dt.Rows(0)(0)
            st = Trim(st)
            GenerateMaxEnquiryNo = st & dt.Rows(0)(0)
        Else
            MaxNoVariable = 1
            GenerateMaxEnquiryNo = "0001"
        End If
        Return GenerateMaxEnquiryNo
    End Function


    Public Function GenerateMaxComplainNo(ByVal TableName As String, ByVal MaxFieldName As String, ByRef MaxNoVariable As Integer, ByVal GblYear As String, Optional ByVal SearchCondition As String = "") As String
        Dim dt As New DataTable()
        Dim st As String
        Dim i As Integer
        Dim GblCodesize As Integer
        GblCodesize = 4
        st = ""
        FillDataTable(dt, "Select isnull(MAX(isnull(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition)
        If dt.Rows.Count > 0 Then
            For i = 1 To GblCodesize - dt.Rows(0)(0).ToString().Length()
                st = Trim(st) & 0
            Next
            MaxNoVariable = dt.Rows(0)(0)
            st = GblYear & "-" & Trim(st) & dt.Rows(0)(0)
            GenerateMaxComplainNo = st
        Else
            MaxNoVariable = 1
            GenerateMaxComplainNo = GblYear & "-" & "0001"
        End If
        Return GenerateMaxComplainNo
    End Function

    ''' <summary>
    ''' Pivot Tables column into row and rows into column
    ''' </summary>
    ''' <param name="ConDt">Table which is converted</param>
    ''' <returns>Returns Converted datatable</returns>
    Public Function PivotTable(ByVal ConDt As DataTable) As DataTable

        'If TryCast(sender, Button).CommandArgument = "1" Then

        Dim dt2 As New DataTable()
        For i As Integer = 0 To ConDt.Rows.Count
            dt2.Columns.Add()
            'dt2.Columns(i).ColumnName = ConDt.Rows(i)(0)
        Next
        For i As Integer = 0 To ConDt.Columns.Count - 1
            dt2.Rows.Add()
            dt2.Rows(i)(0) = ConDt.Columns(i).ColumnName
        Next
        For i As Integer = 1 To ConDt.Columns.Count - 1
            For j As Integer = 0 To ConDt.Rows.Count - 1
                dt2.Rows(i)(j + 1) = ConDt.Rows(j)(i)
            Next
        Next
        Dim GridView1 As GridView = BindGrid(dt2, True)
        ' Else
        'BindGrid(dt, False)
        'End If
        Return GridView1.DataSource
    End Function

    Private Function BindGrid(dt As DataTable, rotate As Boolean) As GridView
        Dim GridView1 As New GridView
        GridView1.ShowHeader = Not rotate
        GridView1.DataSource = dt
        GridView1.DataBind()
        If rotate Then
            For Each row As GridViewRow In GridView1.Rows
                row.Cells(0).CssClass = "header"
            Next
        End If
        Return GridView1
    End Function


    Public Function ReadNumber(ByVal Number As String) As String
        Dim s As String
        Dim S1 As String
        Dim S2 As String
        If IsNumeric(Number) = False Then
            ReadNumber = "Not a valid number"
            Exit Function
        End If

        If Val(Number) > 1.0E+16 Then
            ReadNumber = "Sorry! To long number"
            Exit Function
        End If
        s = FormatNumber(Number, 2, vbFalse, vbFalse, vbFalse)
        S1 = Trim(Mid(s, 1, IIf(InStr(1, s, ".") = 0, Len(s), InStr(1, s, ".") - 1)))
        S2 = Trim(Mid(s, IIf(InStr(1, s, ".") = 0, Len(s) + 1, InStr(1, s, ".") + 1), Len(s)))
        If Val(S2) > 0 Then
            ReadNumber = StrConv(BeforeDecimal(Val(S1)), vbProperCase) + " and " + StrConv(BeforeDecimal(Val(S2)), vbProperCase)
        Else
            ReadNumber = StrConv(BeforeDecimal(Val(S1)), vbProperCase) '+ BeforeDecimal(Val(S2)) + " paisa"
        End If
    End Function

    Public Function BeforeDecimal(ByVal Num As Double) As String
        Dim s As String
        s = ""
        While Num <> 0
            If Num >= 1 And Num <= 20 Then
                s = s & ReadDigit(Num)
                Num = 0
            ElseIf Num > 20 And Num < 100 Then
                s = s & ReadDigit2(Left(Num, 1))
                Num = Right(Num, 1)
            ElseIf Num >= 100 And Num < 1000 Then
                If Left(Num, 1) = "1" Then
                    s = s & ReadDigit(Left(Num, 1)) & " hundred"
                Else
                    s = s & ReadDigit(Left(Num, 1)) & " hundred"
                End If
                Num = Right(Num, 2)
            ElseIf Num >= 1000 And Num < 10000 Then
                If Left(Num, 1) = "1" Then
                    s = s & ReadDigit(Left(Num, 1)) & " thousand"
                Else
                    s = s & ReadDigit(Left(Num, 1)) & " thousand"
                End If
                Num = Right(Num, 3)
            ElseIf Num >= 10000 And Num < 20000 Then
                s = s & ReadDigit(Left(Num, 2)) & " thousand"
                Num = Right(Num, 3)
            ElseIf Num >= 20000 And Num < 100000 Then
                s = s & ReadDigit2(Left(Num, 1)) & " " & ReadDigit(Mid(Num, 2, 1)) & " thousand"
                Num = Right(Num, 3)
            ElseIf Num >= 100000 And Num < 1000000 Then
                If Left(Num, 1) = "1" Then
                    s = s & ReadDigit(Left(Num, 1)) & " lakh"
                Else
                    s = s & ReadDigit(Left(Num, 1)) & " lakhs"
                End If
                Num = Right(Num, 5)
            ElseIf Num >= 1000000 And Num < 2000000 Then
                s = s & ReadDigit(Left(Num, 2)) & " lakhs"
                Num = Right(Num, 5)
            ElseIf Num >= 2000000 And Num < 10000000 Then
                s = s & ReadDigit2(Left(Num, 1)) & " " & ReadDigit(Mid(Num, 2, 1)) & " lakhs"
                Num = Right(Num, 5)
            ElseIf Num >= 10000000 And Num < 100000000 Then
                If Left(Num, 1) = "1" Then
                    s = s & ReadDigit(Left(Num, 1)) & " crore"
                Else
                    s = s & ReadDigit(Left(Num, 1)) & " crores"
                End If
                Num = Right(Num, 7)
            ElseIf Num >= 100000000 And Num < 200000000 Then
                s = s & ReadDigit(Left(Num, 2)) & " crores"
                Num = Right(Num, 7)
            ElseIf Num >= 200000000 And Num < 1000000000 Then
                s = s & ReadDigit2(Left(Num, 1)) & " " & ReadDigit(Mid(Num, 2, 1)) & " crores"
                Num = Right(Num, 7)
            ElseIf Num >= 1000000000 Then
                If Left(Num, 1) = "1" Then
                    s = s & BeforeDecimal(Mid(Num, 1, Len(str(Num)) - 8)) & " crore"
                Else
                    s = s & BeforeDecimal(Mid(Num, 1, Len(str(Num)) - 8)) & " crores"
                End If
                Num = Mid(Num, Len(str(Num)) - 7, Len(str(Num)))
            End If
            s = s & " "
        End While
        BeforeDecimal = s
    End Function

    Public Function ReadDigit(ByVal Digit As Double) As String
        Select Case Digit
                'Case 0
                '   ReadDigit = "zero"
            Case 1
                ReadDigit = "one"
            Case 2
                ReadDigit = "two"
            Case 3
                ReadDigit = "three"
            Case 4
                ReadDigit = "four"
            Case 5
                ReadDigit = "five"
            Case 6
                ReadDigit = "six"
            Case 7
                ReadDigit = "seven"
            Case 8
                ReadDigit = "eight"
            Case 9
                ReadDigit = "nine"
            Case 10
                ReadDigit = "ten"
            Case 11
                ReadDigit = "eleven"
            Case 12
                ReadDigit = "twelve"
            Case 13
                ReadDigit = "thirteen"
            Case 14
                ReadDigit = "fourteen"
            Case 15
                ReadDigit = "fifteen"
            Case 16
                ReadDigit = "sixteen"
            Case 17
                ReadDigit = "seventeen"
            Case 18
                ReadDigit = "eighteen"
            Case 19
                ReadDigit = "nineteen"
            Case 20
                ReadDigit = "twenty"
        End Select
        Return "Success"
    End Function

    Public Function ReadDigit2(ByVal Digit As Double) As String
        Select Case Digit
            Case 2
                ReadDigit2 = "twenty"
            Case 3
                ReadDigit2 = "thirty"
            Case 4
                ReadDigit2 = "forty"
            Case 5
                ReadDigit2 = "fifty"
            Case 6
                ReadDigit2 = "sixty"
            Case 7
                ReadDigit2 = "seventy"
            Case 8
                ReadDigit2 = "eighty"
            Case 9
                ReadDigit2 = "ninety"
        End Select
        Return "Success"
    End Function

    Public Function GenerateMaxTransaction(ByVal TableName As String, ByVal MaxFieldName As String) As Long

        Try
            str = ""
            str = "Select Max(isnull(" & MaxFieldName & ", 0)) + 1 as TransactionID from " & TableName & ""
            FillDataTable(dt, str)
            str = ""
            If dt.Rows.Count > 0 Then
                Dim MaxID As String = dt.Rows(0)(0).ToString
                If MaxID = "" Then
                    GenerateMaxTransaction = 1
                Else
                    GenerateMaxTransaction = dt.Rows(0)(0).ToString
                End If
            Else
                GenerateMaxTransaction = 1
            End If

        Catch ex As Exception
            Return ex.Message
        End Try
    End Function


#Region "Code For Visual studio 2010 or 2012"

#End Region

#End Region
End Class
