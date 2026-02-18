Imports Microsoft.VisualBasic
Imports System.Data
Imports System.Data.SqlClient
Imports System.Configuration
Imports Newtonsoft.Json
Imports System.Web.Script.Serialization
Imports MySql.Data.MySqlClient
Imports QRCoder
Imports System.Drawing
Imports System.IO
Imports System.Net
Imports System.Net.Http
Imports System.Threading.Tasks
Imports System.Web.UI.WebControls
Imports System
Imports Newtonsoft.Json.Linq
Imports System.Windows
Imports Google.Protobuf.WellKnownTypes
Imports System.Security.Cryptography

Namespace Connection

    Public Class DBConnection

        Public Db As New SqlConnection
        Public MyDb As New MySqlConnection
        Public IndexName As String
        Private DA As SqlDataAdapter
        Private MyDA As MySqlDataAdapter
        Dim str As String
        ''Dim constr As String = ConfigurationManager.ConnectionStrings("constr").ConnectionString
        ''Dim con As New SqlConnection(constr)
        Dim dt As New DataTable
        Dim flagID As Boolean
        Dim UniqueId As String
        Dim GblCompanyName As String
        Dim DBType As String = ""
        Dim GBLCompanyID As String = ""
        Public dbConnectionError As String = ""
        'Private Shared ReadOnly Key As Byte() = Encoding.UTF8.GetBytes("9fxB7wYoJ6KD3E5pRQZha8T0r2NSclXq")
        'Private Shared ReadOnly IV As Byte() = Encoding.UTF8.GetBytes("Df7Gh2Kl5Np8Rs1T")

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
            Dim constring As String = "", Dynamic_ConnString As String = ""

            Dynamic_ConnString = Convert.ToString(HttpContext.Current.Session("conn_string"))

            ''constring = Dynamic_ConnString

            constring = "Data Source =DESKTOP-SHTQT7C\SQLEXPRESS;Initial Catalog=IndusDemo;Persist Security Info=True;User ID=Priyanshus;Password=Param@99811"   '' Pioneer
            '' constring = "Data Source = VIVEK_DELL\INDAS;Initial Catalog=IndusEnterprise;Persist Security Info=True;User ID=Indus;Password=Param@99811"
            '' constring = "Data Source = BABLU-PC\INDUS;Initial Catalog=IndusEnterprise;Persist Security Info=True;User ID=Indus;Password=Param@99811"
            '' constring = "Data Source = CLASSIC-ERP\INDUS;Initial Catalog=IndusEnterprise;Persist Security Info=True;User ID=Indus;Password=Param@99811"
            '' constring = "Data Source = 192.168.10.4\INDUS;Initial Catalog=IndusEnterprise;Persist Security Info=True;User ID=Indus;Password=Param@99811"
            '' constring = "Data Source = 34.0.66.198\INDUS;Initial Catalog=IndusEnterprise;Persist Security Info=True;User ID=Indus;Password=Param@99811"
            '' constring = "Data Source = MINESH\INDUS22;Initial Catalog=IndusEnterpriseGitaPress;Persist Security Info=True;User ID=Indus;Password=Param@99811"
            '' constring = "Data Source = 34.0.66.198,1534\\INDUS;Initial Catalog=IndusEnterprise;Persist Security Info=True;User ID=Indus;Password=Param@99811"
            '' constring = "Data Source = 103.189.88.160\\INDUS,1534;Initial Catalog=IndusEnterpriseDemo;Persist Security Info=True;User ID=Indus;Password=Param@99811"
            '' constring = "Data Source = 43.205.155.159,1433;Initial Catalog=IndusEnterprisePragatiLabel;Persist Security Info=True;User ID=Indus;Password=Param@99811"
            '' constring = "Data Source = VIVEK_DELL\INDAS;Initial Catalog=IndusEnterpriseSelJegat;Persist Security Info=True;User ID=Indus;Password=Param@99811"
            '' constring = "Data Source = MINESH\INDUS22;Initial Catalog=IndusEnterpriseDemo;Persist Security Info=True;User ID=Indus;Password=Param@99811"
            ''constring = "Data Source =DESKTOP-NV3BS8L\INDUS;Initial Catalog=IndusEnterprise;Persist Security Info=True;User ID=Indus;Password=Param@99811"

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
                dbConnectionError = ""
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
                dbConnectionError = ex.Message
                Return Db
            End Try
        End Function

        Public Function OpenDataBase1() As SqlConnection

            Dim i As Integer = 0
            Dim constring As String = ""

            constring = "Data Source =13.200.122.70,1433;Initial Catalog=IndusOffice;Persist Security Info=True;User ID=Indus;Password=Param@99811;Connection Timeout=10"

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

        Public Function OpenDataBaseMYSQL() As MySqlConnection
            Dim i As Integer = 0
            Dim constring As String = ""

            'constring = "Data Source=192.168.1.34;port=3306;Initial Catalog=indusenterprisesel;User Id=indus;password=Param@99811"

            Try
                MyDb = New MySqlConnection
                MyDb.ConnectionString = constring
m:
                If i = 1 Then
                    MyDb = New MySqlConnection
                    MyDb.ConnectionString = constring
                End If
                MyDb.Open()
                Return MyDb
            Catch ex As Exception
                If i = 0 Then
                    i = i + 1
                    If MyDb.State = ConnectionState.Open Then
                        MyDb.Close()
                    End If
                    GoTo m
                Else
                    If MyDb.State = ConnectionState.Open Then
                        MyDb.Close()
                    End If
                End If
                Return MyDb
            End Try
        End Function
        Public Sub GetCompName(ByVal CompanyName As String)
            Try
                GblCompanyName = CompanyName
            Catch ex As Exception
                ' MsgBox(ex.Message)
            End Try
        End Sub

        Public Function UpdateDatatableToDatabase1(ByVal JsonObject As Object, ByVal TableName As String, ByVal AddColName As String, ByVal Pvalue As Integer, ByRef con As SqlConnection, Optional ByVal wherecndtn As String = "") As String
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
                    cmd.CommandTimeout = 600
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

        Public Function InsertDatatableToDatabase_Pro(ByVal JsonObject As Object, ByVal TableName As String, ByVal AddColName As String, ByVal AddColValue As String, ByRef con As SqlConnection, ByRef objTrans As SqlTransaction, Optional ByVal VoucherType As String = "", Optional ByVal TransactionID As String = "") As String

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
            ConvertObjectToDatatablePro(JsonObject, dt)

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
                    '' cmd.CommandTimeout = 300
                    cmd.Transaction = objTrans
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

        Public Function InsertDatatableToDatabase1_Pro(ByVal JsonObject As Object, ByVal TableName As String, ByVal AddColName As String, ByVal AddColValue As String, ByRef con As SqlConnection, Optional ByVal VoucherType As String = "", Optional ByVal TransactionID As String = "") As String

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

            ConvertObjectToDatatablePro(JsonObject, dt)

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
                    cmd.CommandTimeout = 600
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

        Public Function InsertDatatableToDatabase1(ByVal JsonObject As Object, ByVal TableName As String, ByVal AddColName As String, ByVal AddColValue As String, ByRef con As SqlConnection, Optional ByVal VoucherType As String = "", Optional ByVal TransactionID As String = "") As String

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
                    cmd.CommandTimeout = 600
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

        Public Sub FillDataTable(ByRef DataTableObj As DataTable, ByVal SqlSelectQuery As String, Optional ByVal SqlStoredProcedure As String = "")
            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"
            If DBType = "MYSQL" Then
                Try

                    'GblCompanyName = Convert.ToString(HttpContext.Current.Session("CompanyName"))
                    'GetCompName(GblCompanyName)

                    MyDb = OpenDataBaseMYSQL()
                    If MyDb.State = ConnectionState.Closed Then
                        MyDb.Open()
                    End If
                    Dim cmd As MySqlCommand
                    If Trim(SqlSelectQuery) = "" Then
                        cmd = New MySqlCommand(SqlStoredProcedure, MyDb)
                        cmd.CommandType = CommandType.StoredProcedure
                    Else
                        'SqlSelectQuery = SqlSelectQuery.Replace("ISNULL", "IFNULL").Replace("Isnull", "IFNULL").Replace("isnull", "IFNULL")
                        'SqlSelectQuery = SqlSelectQuery.Replace("GETDATE()", "NOW()").Replace("getdate()", "NOW()").Replace("GetDate()", "NOW()").Replace("Getdate()", "NOW()")
                        cmd = New MySqlCommand(SqlSelectQuery, MyDb)
                    End If
                    cmd.CommandTimeout = 300
                    MyDA = New MySqlDataAdapter(cmd)
                    MyDA.Fill(DataTableObj)
                    MyDb.Close()
                Catch ex As Exception
                    'MsgBox(ex.Message)
                    If MyDb.State = ConnectionState.Open Then
                        MyDb.Close()
                    End If
                End Try
            Else
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
                    cmd.CommandTimeout = 300

                    DA = New SqlDataAdapter(cmd)
                    DA.Fill(DataTableObj)
                    Db.Close()
                Catch ex As Exception
                    'MsgBox(ex.Message)
                    If Db.State = ConnectionState.Open Then
                        Db.Close()
                    End If
                End Try
            End If

        End Sub

        Public Sub FillDataTable2(ByRef DataTableObj As DataTable, ByVal SqlSelectQuery As String, Optional ByVal SqlStoredProcedure As String = "")
            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"
            If DBType = "MYSQL" Then
                Try

                    'GblCompanyName = Convert.ToString(HttpContext.Current.Session("CompanyName"))
                    'GetCompName(GblCompanyName)

                    MyDb = OpenDataBaseMYSQL()
                    If MyDb.State = ConnectionState.Closed Then
                        MyDb.Open()
                    End If
                    Dim cmd As MySqlCommand
                    If Trim(SqlSelectQuery) = "" Then
                        cmd = New MySqlCommand(SqlStoredProcedure, MyDb)
                        cmd.CommandType = CommandType.StoredProcedure
                    Else
                        'SqlSelectQuery = SqlSelectQuery.Replace("ISNULL", "IFNULL").Replace("Isnull", "IFNULL").Replace("isnull", "IFNULL")
                        'SqlSelectQuery = SqlSelectQuery.Replace("GETDATE()", "NOW()").Replace("getdate()", "NOW()").Replace("GetDate()", "NOW()").Replace("Getdate()", "NOW()")
                        cmd = New MySqlCommand(SqlSelectQuery, MyDb)
                    End If
                    cmd.CommandTimeout = 300
                    MyDA = New MySqlDataAdapter(cmd)
                    MyDA.Fill(DataTableObj)
                    MyDb.Close()
                Catch ex As Exception
                    'MsgBox(ex.Message)
                    If MyDb.State = ConnectionState.Open Then
                        MyDb.Close()
                    End If
                End Try
            Else
                Try

                    'GblCompanyName = Convert.ToString(HttpContext.Current.Session("CompanyName"))
                    'GetCompName(GblCompanyName)

                    Db = OpenDataBase1()
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
                    cmd.CommandTimeout = 300

                    DA = New SqlDataAdapter(cmd)
                    DA.Fill(DataTableObj)
                    Db.Close()
                Catch ex As Exception
                    'MsgBox(ex.Message)
                    If Db.State = ConnectionState.Open Then
                        Db.Close()
                    End If
                End Try
            End If

        End Sub

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
            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"
            Try
                If DBType = "MYSQL" Then
                    MyDb = OpenDataBaseMYSQL()
                    If MyDb.State = ConnectionState.Closed Then
                        MyDb.Open()
                    End If
                    Dim cmd As New MySqlCommand
                    If Trim(SqlSelectQuery) = "" Then
                        cmd.CommandText = SqlStoredProcedure
                        cmd.CommandType = CommandType.StoredProcedure
                    Else
                        cmd = New MySqlCommand(SqlSelectQuery, MyDb)
                    End If

                    MyDA = New MySqlDataAdapter(cmd)
                    MyDA.Fill(DataSetObj)
                    MyDb.Close()
                Else
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

                End If
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
            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"

            Try
                If DBType = "MYSQL" Then
                    If Trim(SearchCondition) = "" Then
                        SearchCondition = "  Where IFNULL(" & FieldName & ",'')<>'' "
                    Else
                        SearchCondition = SearchCondition + "  and IFNULL(" & FieldName & ",'')<>'' "
                    End If
                Else
                    If Trim(SearchCondition) = "" Then
                        SearchCondition = "  Where ISNULL(" & FieldName & ",'')<>'' "
                    Else
                        SearchCondition = SearchCondition + "  and ISNULL(" & FieldName & ",'')<>'' "
                    End If
                End If

                Dim Sql As String = ""
                If Trim(TableName) <> "" And Trim(FieldName) <> "" Then
                    If Trim(KeyFieldName) = "" Then
                        Sql = "SELECT DISTINCT  " + FieldName + "  FROM  " + TableName + "  " + SearchCondition
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

        Public Function InsertDatatableToDatabase(ByVal JsonObject As Object, ByVal TableName As String, ByVal AddColName As String, ByVal AddColValue As String, Optional ByVal VoucherType As String = "", Optional ByVal TransactionID As String = "") As String
            '  Dim constr As String = ConfigurationManager.ConnectionStrings("constr").ConnectionString
            '  Dim con As New SqlConnection(constr)
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
            Dim KeyReturn As String = 0
            Dim ColName As String = ""
            Dim TransID As String = ""
            Dim ColValue As String
            Dim dt As New DataTable
            Try
                If DBType = "MYSQL" Then
                    MyDb = OpenDataBaseMYSQL()
                    If MyDb.State = ConnectionState.Closed Then
                        MyDb.Open()
                    End If

                    ConvertObjectToDatatableNew(JsonObject, dt, str)
                    If str <> "Success" Then
                        Return str
                    End If
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
                            str = "Insert Into " & TableName & "( " & ColName & ") Values( " & ColValue & ");"
                        Else
                            str = "Insert Into " & TableName & "( " & ColName & "," & AddColName & ") Values(" & ColValue & "," & AddColValue & ");"
                        End If

                        str = str & "SELECT LAST_INSERT_ID();"
                        Dim cmd = New MySqlCommand(str, MyDb)
                        cmd.CommandTimeout = MyDb.ConnectionTimeout
                        ''cmd.ExecuteNonQuery()
                        KeyReturn = cmd.ExecuteScalar()
                    Next
                    MyDb.Close()
                Else
                    Db = OpenDataBase()
                    If Db.State = ConnectionState.Closed Then
                        Db.Open()
                    End If

                    ConvertObjectToDatatableNew(JsonObject, dt, str)
                    If str <> "Success" Then
                        Return str
                    End If
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
                                            dt.Rows(i)(column.ColumnName) = Val(TransactionID)
                                        End If
                                    End If
                                    If ColValue = "" Then
                                        If IsNumeric(IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName))) Then
                                            If dt.Rows(i)(column.ColumnName).ToString().Contains(",") Then
                                                ColValue = "'" & dt.Rows(i)(column.ColumnName) & "'"
                                            Else
                                                ColValue = "" & Val(dt.Rows(i)(column.ColumnName)) & ""
                                            End If
                                        Else
                                            ColValue = "'" & dt.Rows(i)(column.ColumnName) & "'"
                                        End If
                                    Else
                                        If IsNumeric(IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName))) Then
                                            If IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName)).ToString().Contains(",") Then
                                                ColValue = ColValue & "," & "'" & dt.Rows(i)(column.ColumnName) & "'"
                                            Else
                                                'If column.ColumnName = "UserWiseOperatorsIDStr" Then
                                                '    ColValue = ColValue & "," & "'" & dt.Rows(i)(column.ColumnName) & "'"
                                                'Else
                                                Dim decimalValue As Decimal = Convert.ToDecimal(dt.Rows(i)(column.ColumnName))
                                                Dim value1 As Object
                                                If decimalValue = Math.Truncate(decimalValue) Then
                                                    value1 = Convert.ToInt64(decimalValue)
                                                Else
                                                    value1 = decimalValue
                                                End If

                                                'ColValue = ColValue & "," & "" & Val(dt.Rows(i)(column.ColumnName)) & ""
                                                ColValue = ColValue & "," & "" & value1 & ""
                                            End If
                                        Else
                                            ColValue = ColValue & "," & "'" & dt.Rows(i)(column.ColumnName) & "'"
                                        End If

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
                        cmd.CommandTimeout = 300 ''Db.ConnectionTimeout
                        ''cmd.ExecuteNonQuery()
                        KeyReturn = cmd.ExecuteScalar()
                    Next
                    Db.Close()
                End If
                dt = Nothing
                Return KeyReturn
            Catch ex As Exception
                If DBType = "MYSQL" Then
                    If MyDb.State = ConnectionState.Open Then
                        MyDb.Close()
                    End If
                Else
                    If Db.State = ConnectionState.Open Then
                        Db.Close()
                    End If
                End If
                KeyReturn = ex.Message
            End Try
            Return KeyReturn
        End Function

        Private Sub ExecuteSqlTransaction(ByVal connectionString As String)
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
            If DBType = "MYSQL" Then
                Using connection As New MySqlConnection(connectionString)
                    connection.Open()

                    Dim command As MySqlCommand = connection.CreateCommand()
                    Dim transaction As MySqlTransaction

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
            Else
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
            End If
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
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
            Dim KeyField As String
            Dim ColName As String = ""
            Dim ColValue As String
            Dim dts As New DataTable
            Dim WherCol As String = ""

            ConvertObjectToDatatable(PObject, dts)

            If STableName = "JobBookingCorrugation" Then
                If dts.Columns.Contains("ItemCode") Then
                    dts.Columns.Remove("ItemCode")
                End If
            End If


            Try
                If DBType = "MYSQL" Then
                    MyDb = OpenDataBaseMYSQL()
                    If MyDb.State = ConnectionState.Closed Then
                        MyDb.Open()
                    End If
                Else
                    Db = OpenDataBase()
                    If Db.State = ConnectionState.Closed Then
                        Db.Open()
                    End If
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

                    If DBType = "MYSQL" Then
                        Dim cmd = New MySqlCommand(str, MyDb)
                        cmd.ExecuteNonQuery()
                    Else
                        Dim cmd = New SqlCommand(str, Db)
                        cmd.ExecuteNonQuery()
                    End If
                    WherCol = ""
                Next
                If DBType = "MYSQL" Then
                    MyDb.Close()
                Else
                    Db.Close()
                End If
                dts = Nothing
                KeyField = "200"

            Catch ex As Exception
                KeyField = ex.Message
            End Try
            Return KeyField
        End Function

        ''' <summary>
        ''' Insert Job card and product master content id in process and forms 
        ''' </summary>
        ''' <param name="Dts">Save Data Table</param>
        ''' <param name="STableName">Table in which data is insert</param>
        ''' <param name="AddColName">Extra column name</param>
        ''' <param name="AddColValue">Extra column name's value</param>
        ''' <param name="PTableName">Primary table name from which identity column is fetch</param>
        ''' <param name="STableColumn">Secondary table column name in which primary key value is insert</param>
        ''' <param name="PTblMaxColumn">Primary table identity key name</param>
        ''' <returns></returns>
        Public Function InsertSecondaryDataJobCard(ByVal Dts As DataTable, ByVal STableName As String, ByVal AddColName As String, ByVal AddColValue As String, ByVal PTableName As String, ByVal STableColumn As String, ByVal PTblMaxColumn As String, Optional ByVal WhereCndtn As String = "") As String
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
            Dim KeyField As String
            Dim ColName As String = ""
            Dim ColValue As String
            Dim WherCol As String = ""
            Dim numValue As String = ""
            Try
                If STableName = "ProductMasterCorrugation" Or STableName = "JobBookingJobCardCorrugation" Then
                    If Dts.Columns.Contains("ItemCode") Then
                        Dts.Columns.Remove("ItemCode")
                    End If
                End If
                If DBType = "MYSQL" Then
                    MyDb = OpenDataBaseMYSQL()
                    If MyDb.State = ConnectionState.Closed Then
                        MyDb.Open()
                    End If
                Else
                    Db = OpenDataBase()
                    If Db.State = ConnectionState.Closed Then
                        Db.Open()
                    End If
                End If
                ColName = ""
                For Each column In Dts.Columns
                    If STableName.ToUpper() <> "ITEMTRANSACTIONDETAIL" Then
                        If column.ColumnName <> "Id" Then
                            If ColName = "" Then
                                ColName = column.ColumnName
                            Else
                                ColName = ColName & "," & column.ColumnName
                            End If
                        End If
                    Else
                        If column.ColumnName <> "Id" And column.ColumnName <> "PlanContQty" And column.ColumnName <> "PlanContentType" And column.ColumnName <> "PlanContName" Then
                            If ColName = "" Then
                                ColName = column.ColumnName
                            Else
                                ColName = ColName & "," & column.ColumnName
                            End If
                        End If
                    End If
                Next
                For i As Integer = 0 To Dts.Rows.Count - 1
                    ColValue = ""
                    For Each column In Dts.Columns
                        'If IsNumeric(IIf(IsDBNull(Dts.Rows(i)(column.ColumnName)), "", Dts.Rows(i)(column.ColumnName))) Then
                        '    If Dts.Rows(i)(column.ColumnName).ToString().Contains(",") Then
                        '        numValue = Dts.Rows(i)(column.ColumnName).ToString()
                        '    Else
                        '        Dim decimalValue As Decimal = Convert.ToDecimal(Dts.Rows(i)(column.ColumnName))
                        '        Dim value1 As Object
                        '        If decimalValue = Math.Truncate(decimalValue) Then
                        '            value1 = Convert.ToInt64(decimalValue)
                        '        Else
                        '            value1 = decimalValue
                        '        End If
                        '        numValue = value1
                        '    End If
                        'Else
                        '    numValue = IIf(IsDBNull(Dts.Rows(i)(column.ColumnName)), "", Dts.Rows(i)(column.ColumnName))
                        'End If
                        If IIf(IsDBNull(Dts.Rows(i)(column.ColumnName)), "", Dts.Rows(i)(column.ColumnName)).ToString() = "True" Or IIf(IsDBNull(Dts.Rows(i)(column.ColumnName)), "", Dts.Rows(i)(column.ColumnName)).ToString() = "true" Then
                            numValue = "1"
                        ElseIf IIf(IsDBNull(Dts.Rows(i)(column.ColumnName)), "", Dts.Rows(i)(column.ColumnName)).ToString() = "False" Or IIf(IsDBNull(Dts.Rows(i)(column.ColumnName)), "", Dts.Rows(i)(column.ColumnName)).ToString() = "false" Then
                            numValue = "0"
                        Else
                            If IsNumeric(IIf(IsDBNull(Dts.Rows(i)(column.ColumnName)), "", Dts.Rows(i)(column.ColumnName))) Then
                                If Dts.Rows(i)(column.ColumnName).ToString().Contains(",") Then
                                    numValue = Dts.Rows(i)(column.ColumnName).ToString()
                                Else
                                    ' Handle scientific notation and regular numbers
                                    Dim rawValue = Dts.Rows(i)(column.ColumnName).ToString()
                                    If rawValue.Contains("E") OrElse rawValue.Contains("e") Then
                                        ' Parse scientific notation to decimal
                                        Dim d As Decimal = Decimal.Parse(rawValue, System.Globalization.NumberStyles.Float)
                                        If d = Math.Truncate(d) Then
                                            numValue = Convert.ToInt64(d).ToString()
                                        Else
                                            numValue = d.ToString("0.################") ' Adjust decimal places as needed
                                        End If
                                    Else
                                        Dim decimalValue As Decimal = Convert.ToDecimal(rawValue)
                                        If decimalValue = Math.Truncate(decimalValue) Then
                                            numValue = Convert.ToInt64(decimalValue).ToString()
                                        Else
                                            numValue = decimalValue.ToString()
                                        End If
                                    End If
                                End If
                            Else
                                'numValue = IIf(IsDBNull(Dts.Rows(i)(column.ColumnName)), "", Dts.Rows(i)(column.ColumnName))
                                Dim val = Convert.ToString(Dts.Rows(i)(column.ColumnName)).Trim()
                                numValue = If({"", "undefined", "null"}.Contains(val.ToLower()), "", val.Replace("'", "''"))
                            End If

                            'End If
                        End If

                        'If STableName.ToUpper() <> "ITEMTRANSACTIONDETAIL" Then
                        '    If column.ColumnName <> "Id" Then
                        '        If ColValue = "" Then
                        '            ColValue = "'" & Dts.Rows(i)(column.ColumnName) & "'"
                        '        Else
                        '            ColValue = ColValue & "," & "'" & Dts.Rows(i)(column.ColumnName) & "'"
                        '        End If
                        '    End If
                        'Else
                        '    If column.ColumnName <> "Id" And column.ColumnName <> "PlanContQty" And column.ColumnName <> "PlanContentType" And column.ColumnName <> "PlanContName" Then
                        '        If ColValue = "" Then
                        '            ColValue = "'" & Dts.Rows(i)(column.ColumnName) & "'"
                        '        Else
                        '            ColValue = ColValue & "," & "'" & Dts.Rows(i)(column.ColumnName) & "'"
                        '        End If
                        '    End If
                        'End If
                        'If column.ColumnName = "PlanContQty" Or column.ColumnName = "PlanContentType" Or column.ColumnName = "PlanContName" Then
                        '    If WherCol = "" Then
                        '        WherCol = "Where " & "" & column.ColumnName & "='" & Dts.Rows(i)(column.ColumnName) & "' And "
                        '    Else
                        '        WherCol = WherCol & "" & column.ColumnName & "='" & Dts.Rows(i)(column.ColumnName) & "' And "
                        '    End If
                        'End If
                        If STableName.ToUpper() <> "ITEMTRANSACTIONDETAIL" Then
                            If column.ColumnName <> "Id" Then
                                If ColValue = "" Then
                                    ColValue = "'" & numValue & "'"
                                Else
                                    ColValue = ColValue & "," & "'" & numValue & "'"
                                End If
                            End If
                        Else
                            If column.ColumnName <> "Id" And column.ColumnName <> "PlanContQty" And column.ColumnName <> "PlanContentType" And column.ColumnName <> "PlanContName" Then
                                If ColValue = "" Then
                                    ColValue = "'" & numValue & "'"
                                Else
                                    ColValue = ColValue & "," & "'" & numValue & "'"
                                End If
                            End If
                        End If
                        If column.ColumnName = "PlanContQty" Or column.ColumnName = "PlanContentType" Or column.ColumnName = "PlanContName" Then
                            If WherCol = "" Then
                                WherCol = "Where " & "" & column.ColumnName & "='" & numValue & "' And "
                            Else
                                WherCol = WherCol & "" & column.ColumnName & "='" & numValue & "' And "
                            End If
                        End If
                    Next
                    If STableColumn <> "" Then
                        If WherCol <> "" And WherCol <> Nothing Then WherCol = WherCol & " ISNULL(IsDeletedTransaction,0)=0 " & WhereCndtn '.Remove(WherCol.Length - 4, 4)
                        str = "Insert Into " & STableName & "( " & ColName & "," & AddColName & "," & STableColumn & ") " &
                "Select " & ColValue & "," & AddColValue & ",(Select Max(" & PTblMaxColumn & ") From " & PTableName & " " & WherCol & ");"
                    Else
                        str = "Insert Into " & STableName & "( " & ColName & "," & AddColName & ") " &
                "Select " & ColValue & "," & AddColValue & ";"
                    End If
                    If DBType = "MYSQL" Then
                        Dim cmd = New MySqlCommand(str, MyDb)
                        cmd.ExecuteNonQuery()
                    Else
                        Dim cmd = New SqlCommand(str, Db)
                        cmd.ExecuteNonQuery()
                    End If
                    WherCol = ""
                Next
                If DBType = "MYSQL" Then
                    MyDb.Close()
                Else
                    Db.Close()
                End If
                Dts = Nothing
                KeyField = "200"
            Catch ex As Exception
                If DBType = "MYSQL" Then
                    If MyDb.State = ConnectionState.Open Then
                        MyDb.Close()
                    End If
                Else
                    If Db.State = ConnectionState.Open Then
                        Db.Close()
                    End If
                End If
                KeyField = ex.Message
            End Try
            Return KeyField
        End Function

        ''' <summary>
        ''' Insert Job card and product master content id in process and forms 
        ''' </summary>
        ''' <param name="Dts">Save Data Table</param>
        ''' <param name="STableName">Table in which data is insert</param>
        ''' <param name="AddColName">Extra column name</param>
        ''' <param name="AddColValue">Extra column name's value</param>
        ''' <param name="PTableName">Primary table name from which identity column is fetch</param>
        ''' <param name="STableColumn">Secondary table column name in which primary key value is insert</param>
        ''' <param name="PTblMaxColumn">Primary table identity key name</param>
        ''' <returns></returns>
        Public Function InsertSecondaryDataToTable(ByVal Dts As DataTable, ByVal STableName As String, ByVal AddColName As String, ByVal AddColValue As String, ByVal PTableName As String, ByVal STableColumn As String, ByVal PTblMaxColumn As String, Optional ByVal WhereCndtn As String = "", Optional ByVal WhereCndtnColumns As String() = Nothing, Optional ByVal excludeinsertColumns As String() = Nothing) As String
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
            Dim KeyField As String
            Dim ColName As String = ""
            Dim ColValue As String
            Dim WherCol As String = ""
            Dim X As Integer
            Dim flag As Boolean = False
            Try
                If DBType = "MYSQL" Then
                    MyDb = OpenDataBaseMYSQL()
                    If MyDb.State = ConnectionState.Closed Then
                        MyDb.Open()
                    End If
                Else
                    Db = OpenDataBase()
                    If Db.State = ConnectionState.Closed Then
                        Db.Open()
                    End If
                End If
                ColName = ""
                For Each column In Dts.Columns
                    If STableName.ToUpper() <> "ITEMTRANSACTIONDETAIL" Then
                        'If column.ColumnName <> "Id" Then
                        '    If ColName = "" Then
                        '        ColName = column.ColumnName
                        '    Else
                        '        ColName = ColName & "," & column.ColumnName
                        '    End If
                        'End If
                        flag = False
                        For X = 0 To excludeinsertColumns.Length - 1
                            If column.ColumnName.ToString().ToUpper() = excludeinsertColumns(X).ToString().ToUpper() Then
                                flag = True
                            End If
                        Next
                        If flag = False Then
                            If ColName = "" Then
                                ColName = column.ColumnName
                            Else
                                ColName = ColName & "," & column.ColumnName
                            End If
                        End If
                    Else
                        If column.ColumnName <> "Id" And column.ColumnName <> "PlanContQty" And column.ColumnName <> "PlanContentType" And column.ColumnName <> "PlanContName" Then
                            If ColName = "" Then
                                ColName = column.ColumnName
                            Else
                                ColName = ColName & "," & column.ColumnName
                            End If
                        End If
                    End If

                Next
                For i As Integer = 0 To Dts.Rows.Count - 1
                    ColValue = ""
                    For Each column In Dts.Columns
                        If STableName.ToUpper() <> "ITEMTRANSACTIONDETAIL" Then
                            'If column.ColumnName <> "Id" Then
                            '    If ColValue = "" Then
                            '        ColValue = "'" & Dts.Rows(i)(column.ColumnName) & "'"
                            '    Else
                            '        ColValue = ColValue & "," & "'" & Dts.Rows(i)(column.ColumnName) & "'"
                            '    End If

                            'End If
                            flag = False
                            For X = 0 To excludeinsertColumns.Length - 1
                                If column.ColumnName.ToString().ToUpper() = excludeinsertColumns(X).ToString().ToUpper() Then
                                    flag = True
                                End If
                            Next
                            If flag = False Then
                                If ColValue = "" Then
                                    ColValue = "'" & Dts.Rows(i)(column.ColumnName) & "'"
                                Else
                                    ColValue = ColValue & "," & "'" & Dts.Rows(i)(column.ColumnName) & "'"
                                End If
                            End If
                        Else
                            If column.ColumnName <> "Id" And column.ColumnName <> "PlanContQty" And column.ColumnName <> "PlanContentType" And column.ColumnName <> "PlanContName" Then
                                If ColValue = "" Then
                                    ColValue = "'" & Dts.Rows(i)(column.ColumnName) & "'"
                                Else
                                    ColValue = ColValue & "," & "'" & Dts.Rows(i)(column.ColumnName) & "'"
                                End If

                            End If
                        End If
                        For X = 0 To WhereCndtnColumns.Length - 1
                            If column.ColumnName.ToString().ToUpper() = WhereCndtnColumns(X).ToString().ToUpper() Then
                                If WherCol = "" Then
                                    WherCol = "Where " & "" & column.ColumnName & "='" & Dts.Rows(i)(column.ColumnName) & "' And "
                                Else
                                    WherCol = WherCol & "" & column.ColumnName & "='" & Dts.Rows(i)(column.ColumnName) & "' And "
                                End If
                            End If
                        Next
                        'If column.ColumnName = "PlanContQty" Or column.ColumnName = "PlanContentType" Or column.ColumnName = "PlanContName" Then
                        '    If WherCol = "" Then
                        '        WherCol = "Where " & "" & column.ColumnName & "='" & Dts.Rows(i)(column.ColumnName) & "' And "
                        '    Else
                        '        WherCol = WherCol & "" & column.ColumnName & "='" & Dts.Rows(i)(column.ColumnName) & "' And "
                        '    End If
                        'End If
                    Next

                    If STableColumn <> "" Then
                        If WherCol <> "" And WherCol <> Nothing Then WherCol = WherCol & " IsDeletedTransaction=0 " & WhereCndtn '.Remove(WherCol.Length - 4, 4)
                        str = "Insert Into " & STableName & "( " & ColName & "," & AddColName & "," & STableColumn & ") " &
                        "Select " & ColValue & "," & AddColValue & ",(Select Max(" & PTblMaxColumn & ") From " & PTableName & " " & WherCol & ");"
                    Else
                        str = "Insert Into " & STableName & "( " & ColName & "," & AddColName & ") " &
                        "Select " & ColValue & "," & AddColValue & ";"
                    End If

                    If DBType = "MYSQL" Then
                        Dim cmd = New MySqlCommand(str, MyDb)
                        cmd.ExecuteNonQuery()
                    Else
                        Dim cmd = New SqlCommand(str, Db)
                        cmd.ExecuteNonQuery()
                    End If
                    WherCol = ""
                Next
                If DBType = "MYSQL" Then
                    MyDb.Close()
                Else
                    Db.Close()
                End If
                Dts = Nothing
                KeyField = "200"

            Catch ex As Exception
                If DBType = "MYSQL" Then
                    If MyDb.State = ConnectionState.Open Then
                        MyDb.Close()
                    End If
                Else
                    If Db.State = ConnectionState.Open Then
                        Db.Close()
                    End If
                End If
                KeyField = ex.Message
            End Try
            Return KeyField
        End Function

        Public Function UpdateContentsDatatableToDatabase(ByVal JsonObject As Object, ByVal TableName As String, ByVal AddColName As String, Optional ByVal Pvalue As String = "", Optional ByVal wherecndtn As String = "") As String
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
            Dim KeyField As String = ""

            Try
                If DBType = "MYSQL" Then
                    MyDb = OpenDataBaseMYSQL()
                    If MyDb.State = ConnectionState.Closed Then
                        MyDb.Open()
                    End If
                Else
                    Db = OpenDataBase()
                    If Db.State = ConnectionState.Closed Then
                        Db.Open()
                    End If
                End If
                UniqueId = ""
                dt = New DataTable()

                'ConvertObjectToDatatable(JsonObject, dt, str)
                ConvertObjectToDatatableNew(JsonObject, dt, str)

                If str <> "Success" Then
                    Return str
                End If
                For i As Integer = 0 To dt.Rows.Count - 1
                    str = ""
                    UniqueId = ""

                    For Each column In dt.Columns
                        If Pvalue <> "" Then
                            If Pvalue.Contains(column.ColumnName) Then
                                Dim value2 As Object
                                'UniqueId = UniqueId & column.ColumnName & " ='" & dt.Rows(i)(column.ColumnName) & "' And "
                                If IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName)).ToString() = "True" Or IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName)).ToString() = "true" Then
                                    UniqueId = UniqueId & column.ColumnName & " ='1' And "
                                ElseIf IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName)).ToString() = "False" Or IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName)).ToString() = "false" Then
                                    UniqueId = UniqueId & column.ColumnName & " ='0' And "
                                Else
                                    If IsNumeric(IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName))) Then
                                        If dt.Rows(i)(column.ColumnName).ToString().Contains(",") Then
                                            value2 = dt.Rows(i)(column.ColumnName).ToString()
                                        Else
                                            Dim decimalValue2 As Decimal = Convert.ToDecimal(dt.Rows(i)(column.ColumnName))
                                            If decimalValue2 = Math.Truncate(decimalValue2) Then
                                                value2 = Convert.ToInt64(decimalValue2)
                                            Else
                                                value2 = decimalValue2
                                            End If
                                        End If
                                        UniqueId = UniqueId & column.ColumnName & " ='" & value2 & "' And "
                                    Else
                                        UniqueId = UniqueId & column.ColumnName & " ='" & dt.Rows(i)(column.ColumnName) & "' And "
                                    End If
                                End If
                            Else
                                If column.ColumnName <> "Id" Then
                                    'str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
                                    If IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName)).ToString() = "True" Or IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName)).ToString() = "true" Then
                                        str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
                                    ElseIf IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName)).ToString() = "False" Or IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName)).ToString() = "false" Then
                                        str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
                                    Else
                                        If IsNumeric(IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName))) Then
                                            Dim value1 As Object
                                            If dt.Rows(i)(column.ColumnName).ToString().Contains(",") Then
                                                value1 = dt.Rows(i)(column.ColumnName).ToString()
                                            Else
                                                Dim decimalValue1 As Decimal = Convert.ToDecimal(dt.Rows(i)(column.ColumnName))

                                                If decimalValue1 = Math.Truncate(decimalValue1) Then
                                                    value1 = Convert.ToInt64(decimalValue1)
                                                Else
                                                    value1 = decimalValue1
                                                End If
                                            End If
                                            str = str & column.ColumnName & "='" & value1 & "',"  ' Console.WriteLine(column.ColumnName)
                                        Else
                                            str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
                                        End If
                                    End If

                                End If
                            End If
                        Else
                            If column.ColumnName <> "Id" Then
                                'str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
                                If IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName)).ToString() = "True" Or IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName)).ToString() = "true" Then
                                    str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
                                ElseIf IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName)).ToString() = "False" Or IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName)).ToString() = "false" Then
                                    str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
                                Else
                                    If IsNumeric(IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName))) Then
                                        Dim value3 As Object
                                        If dt.Rows(i)(column.ColumnName).ToString().Contains(",") Then
                                            value3 = dt.Rows(i)(column.ColumnName).ToString()
                                        Else
                                            Dim decimalValue3 As Decimal = Convert.ToDecimal(dt.Rows(i)(column.ColumnName))
                                            If decimalValue3 = Math.Truncate(decimalValue3) Then
                                                value3 = Convert.ToInt64(decimalValue3)
                                            Else
                                                value3 = decimalValue3
                                            End If
                                        End If
                                        str = str & column.ColumnName & "='" & value3 & "',"  ' Console.WriteLine(column.ColumnName)
                                    Else
                                        str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
                                    End If
                                End If


                            End If
                        End If
                    Next
                    If str <> "" Then
                        str = Left(str, Len(str) - 1)
                    End If
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

                    If DBType = "MYSQL" Then
                        Dim cmd As New MySqlCommand(str, MyDb)
                        cmd.CommandType = CommandType.Text
                        cmd.ExecuteNonQuery()
                    Else
                        Dim cmd As New SqlCommand(str, Db)
                        cmd.CommandType = CommandType.Text
                        cmd.ExecuteNonQuery()
                    End If
                Next
                If DBType = "MYSQL" Then
                    MyDb.Close()
                Else
                    Db.Close()
                End If

                KeyField = "Success"

                'Dim query = From iex In dt.AsEnumerable()
                '            Join idb In dt.AsEnumerable()
                '                On iex("FieldName") Equals idb("FieldName") And iex("FieldValue") Equals idb("FieldValue")
                '            Select iex

            Catch ex As Exception
                If DBType = "MYSQL" Then
                    If MyDb.State = ConnectionState.Open Then
                        MyDb.Close()
                    End If
                Else
                    If Db.State = ConnectionState.Open Then
                        Db.Close()
                    End If
                End If
                Return ex.Message
            End Try
            Return KeyField
        End Function

        Public Function UpdateDatatableToDatabase(ByVal JsonObject As Object, ByVal TableName As String, ByVal AddColName As String, ByVal Pvalue As Integer, Optional ByVal wherecndtn As String = "") As String
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
            Dim KeyField As String = ""

            Try
                UniqueId = ""
                dt = New DataTable()

                'ConvertObjectToDatatable(JsonObject, dt, str)
                ConvertObjectToDatatableNew(JsonObject, dt, str)

                ' Assuming dt is your DataTable
                Dim columnToMove As DataColumn = dt.Columns("ProductMasterContentsID")
                Dim columnIndex As Integer = dt.Columns.IndexOf(columnToMove)

                ' If the column exists and it's not already the first column
                If columnIndex > 0 Then
                    ' Store the column values temporarily
                    Dim values(dt.Rows.Count - 1) As Object
                    For i As Integer = 0 To dt.Rows.Count - 1
                        values(i) = dt.Rows(i)(columnToMove)
                    Next

                    ' Remove the column
                    dt.Columns.Remove(columnToMove)

                    ' Add the column at the beginning
                    dt.Columns.Add(columnToMove)
                    dt.Columns(columnToMove.ColumnName).SetOrdinal(0)

                    ' Set the values for the moved column
                    For i As Integer = 0 To dt.Rows.Count - 1
                        dt.Rows(i)(columnToMove) = values(i)
                    Next
                End If

                If str <> "Success" Then
                    Return str
                End If
                If DBType = "MYSQL" Then
                    MyDb = OpenDataBaseMYSQL()
                    If MyDb.State = ConnectionState.Closed Then
                        MyDb.Open()
                    End If
                Else
                    Db = OpenDataBase()
                    If Db.State = ConnectionState.Closed Then
                        Db.Open()
                    End If
                End If
                Dim Cnt As Integer = 1

                For i As Integer = 0 To dt.Rows.Count - 1
                    str = ""
                    UniqueId = ""
                    Cnt = 1
                    For Each column In dt.Columns
                        If Cnt <= Pvalue Then
                            'UniqueId = UniqueId & column.ColumnName & " ='" & dt.Rows(i)(column.ColumnName) & "' And "

                            If IsNumeric(IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName))) Then
                                If dt.Rows(i)(column.ColumnName).ToString().Contains(",") Then
                                    UniqueId = UniqueId & column.ColumnName & " ='" & dt.Rows(i)(column.ColumnName).ToString() & "' And "
                                Else
                                    Dim decimalValue1 As Decimal = Convert.ToDecimal(dt.Rows(i)(column.ColumnName))
                                    Dim value2 As Object
                                    If decimalValue1 = Math.Truncate(decimalValue1) Then
                                        value2 = Convert.ToInt64(decimalValue1)
                                    Else
                                        value2 = decimalValue1
                                    End If
                                    UniqueId = UniqueId & column.ColumnName & " ='" & value2 & "' And "
                                End If
                            Else
                                UniqueId = UniqueId & column.ColumnName & " ='" & dt.Rows(i)(column.ColumnName) & "' And "
                            End If

                            Cnt = Cnt + 1
                        Else
                            If column.ColumnName <> "Id" Then
                                'str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
                                If IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName)).ToString().Contains(",") Then
                                    str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName).ToString() & "',"
                                ElseIf IsNumeric(IIf(IsDBNull(dt.Rows(i)(column.ColumnName)), "", dt.Rows(i)(column.ColumnName))) Then
                                    Dim value1 As Object
                                    'If column.ColumnName = "UserWiseOperatorsIDStr" Then
                                    '    value1 = dt.Rows(i)(column.ColumnName)
                                    'Else
                                    Dim decimalValue As Decimal = Convert.ToDecimal(dt.Rows(i)(column.ColumnName))
                                    If decimalValue = Math.Truncate(decimalValue) Then
                                        value1 = Convert.ToInt64(decimalValue)
                                    Else
                                        value1 = decimalValue
                                    End If
                                    'End If

                                    str = str & column.ColumnName & "='" & value1 & "',"  ' Console.WriteLine(column.ColumnName)
                                Else
                                    str = str & column.ColumnName & "='" & dt.Rows(i)(column.ColumnName) & "',"  ' Console.WriteLine(column.ColumnName)
                                End If
                            End If
                        End If
                    Next
                    If str <> "" Then
                        str = Left(str, Len(str) - 1)
                    End If
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

                    If DBType = "MYSQL" Then
                        Dim cmd As New MySqlCommand(str, MyDb)
                        cmd.CommandType = CommandType.Text
                        cmd.ExecuteNonQuery()
                    Else
                        Dim cmd As New SqlCommand(str, Db)
                        cmd.CommandType = CommandType.Text
                        cmd.ExecuteNonQuery()
                    End If
                Next
                If DBType = "MYSQL" Then
                    MyDb.Close()
                Else
                    Db.Close()
                End If
                KeyField = "Success"

                'Dim query = From iex In dt.AsEnumerable()
                '            Join idb In dt.AsEnumerable()
                '                On iex("FieldName") Equals idb("FieldName") And iex("FieldValue") Equals idb("FieldValue")
                '            Select iex

            Catch ex As Exception
                If DBType = "MYSQL" Then
                    If MyDb.State = ConnectionState.Open Then
                        MyDb.Close()
                    End If
                Else
                    If Db.State = ConnectionState.Open Then
                        Db.Close()
                    End If
                End If
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
            Dim ReMsg As String = ""
            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"
            If DBType = "MYSQL" Then
                Try
                    MyDb = OpenDataBaseMYSQL()
                    If MyDb.State = ConnectionState.Closed Then
                        MyDb.Open()
                    End If

                    Dim cmd As New MySqlCommand(QueryStr, MyDb) With {
                    .CommandType = CommandType.Text,
                    .CommandTimeout = 0
                }
                    cmd.ExecuteNonQuery()
                    cmd = Nothing
                    MyDb.Close()
                    ReMsg = "Success"
                Catch ex As Exception
                    ReMsg = ex.Message
                    MyDb.Close()
                End Try
            Else
                Try
                    Db = OpenDataBase()
                    If Db.State = ConnectionState.Closed Then
                        Db.Open()
                    End If

                    Dim cmd As New SqlCommand(QueryStr, Db) With {
                        .CommandType = CommandType.Text,
                        .CommandTimeout = 0
                    }
                    cmd.ExecuteNonQuery()
                    cmd = Nothing
                    Db.Close()
                    ReMsg = "Success"
                Catch ex As Exception
                    ReMsg = ex.Message
                    Db.Close()
                End Try
            End If
            Return ReMsg
        End Function

        Public Function ConvertDataSetsTojSonString(ByVal dataset As DataSet) As String
            Dim jsSerializer As JavaScriptSerializer = New JavaScriptSerializer()
            Dim ssvalue As Dictionary(Of String, Object) = New Dictionary(Of String, Object)()
            jsSerializer.MaxJsonLength = 2147483647
            Try

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
            Catch ex As Exception
                Return "Error: " & ex.Message
            End Try
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

        Public Function GenerateInvoiceNo(ByVal TableName As String, ByVal Prefix As String, ByVal MaxFieldName As String, ByRef MaxNoVariable As Integer, ByVal FYear As String, ByVal VouchID As String, Optional ByVal SearchCondition As String = "") As String
            Dim dt As New DataTable()
            Dim st As String
            Dim GblCodesize As Integer
            GblCodesize = 5
            Dim suffix As String = ""
            Dim VoucherNumberingMethodType As String = ""
            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            Dim FYearFlag As String = GetColumnValue("Isnull(MultipleFYearNotRequired,0)", "CompanyMaster", " CompanyID=" & GBLCompanyID & " ")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"
            st = ""
            suffix = GetColumnValue("PostFix", "VoucherMaster", " CompanyID=" & GBLCompanyID & " AND VoucherID=" & VouchID & " AND Isnull(IsDeletedTransaction,0)=0")
            If DBType = "MYSQL" Then
                FillDataTable(dt, "Select IFNULL(MAX(IFNULL(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition)
            Else
                FillDataTable(dt, "Select isnull(MAX(isnull(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition)
            End If
            If VouchID = "0" Or VouchID = "" Then
                VoucherNumberingMethodType = GetColumnValue("Isnull(VoucherNumberingMethodType,'')", "VoucherMaster", " VoucherID=-3 AND CompanyID=" & GBLCompanyID & " AND Isnull(IsDeletedTransaction,0)=0")
            Else
                VoucherNumberingMethodType = GetColumnValue("Isnull(VoucherNumberingMethodType,'')", "VoucherMaster", " VoucherID=" & VouchID & " AND CompanyID=" & GBLCompanyID & " AND Isnull(IsDeletedTransaction,0)=0")
            End If


            If VoucherNumberingMethodType.Trim() = "" Then
                VoucherNumberingMethodType = "DefaultNumberingMethod"
            End If
            Select Case VoucherNumberingMethodType
                Case "DefaultNumberingMethod"
                    If dt.Rows.Count > 0 Then
                        'For i = 1 To GblCodesize - dt.Rows(0)(0).ToString().Length()
                        '    st = Trim(st) & 0
                        'Next
                        MaxNoVariable = dt.Rows(0)(0)
                        If FYear <> "" Then
                            If FYearFlag = True Then
                                st = Trim(st) & dt.Rows(0)(0) & "/" & Right(Left(FYear, 4), 2)
                            Else
                                st = Trim(st) & dt.Rows(0)(0) & "/" & Val(Right(FYear, 7)) & "-" & Val(Right(FYear, 2))
                            End If

                        Else
                            st = Trim(st) & dt.Rows(0)(0)
                        End If
                        GenerateInvoiceNo = Trim(Prefix) & st
                    Else
                        MaxNoVariable = 1
                        If FYear <> "" Then
                            If FYearFlag = True Then
                                GenerateInvoiceNo = Trim(Prefix) & "00001" & "/" & Right(Left(FYear, 4), 2)
                            Else
                                GenerateInvoiceNo = Trim(Prefix) & "00001" & "/" & Val(Right(FYear, 7)) & "-" & Val(Right(FYear, 2))
                            End If
                        Else
                            GenerateInvoiceNo = Trim(Prefix) & "00001"
                        End If
                    End If
                    If suffix.Trim() <> "" Then GenerateInvoiceNo = GenerateInvoiceNo & "" & suffix
                Case "VoucherNumberingMethod2"
                    If dt.Rows.Count > 0 Then
                        MaxNoVariable = dt.Rows(0)(0)
                        If FYear <> "" Then
                            If FYearFlag = True Then
                                st = Trim(st) & Right(Left(FYear, 4), 2) & "/" & dt.Rows(0)(0)
                            Else
                                st = Trim(st) & Val(Right(FYear, 7)) & "-" & Val(Right(FYear, 2)) & "/" & dt.Rows(0)(0)
                            End If
                        Else
                            st = Trim(st) & dt.Rows(0)(0)
                        End If
                        GenerateInvoiceNo = Trim(Prefix) & st
                    Else
                        MaxNoVariable = 1
                        If FYear <> "" Then
                            If FYearFlag = True Then
                                GenerateInvoiceNo = IIf(Trim(Prefix) = "", "", Trim(Prefix) & "/") & Right(Left(FYear, 4), 2) & "/00001"
                            Else
                                GenerateInvoiceNo = IIf(Trim(Prefix) = "", "", Trim(Prefix) & "/") & Val(Right(FYear, 7)) & "-" & Val(Right(FYear, 2)) & "/00001"
                            End If
                        Else
                            GenerateInvoiceNo = IIf(Trim(Prefix) = "", "", Trim(Prefix) & "/") & "00001"
                        End If
                    End If
                    If suffix.Trim() <> "" Then GenerateInvoiceNo = GenerateInvoiceNo & "/" & suffix
                Case "VoucherNumberingMethod3"
                    If dt.Rows.Count > 0 Then
                        Dim nextNo As Integer = Convert.ToInt32(dt.Rows(0)(0))
                        MaxNoVariable = nextNo
                        ' Convert number into 5-digit padded format -> 1 -> 00001
                        Dim nextNoStr As String = nextNo.ToString().PadLeft(5, "0"c)
                        If FYear <> "" Then
                            ' FYear = "2025-26" -> 25-26
                            Dim fy As String = Val(Right(FYear, 7)) & "-" & Val(Right(FYear, 2))
                            st = nextNoStr & "/" & fy
                        Else
                            st = nextNoStr
                        End If
                        GenerateInvoiceNo = Trim(Prefix) & st
                    Else
                        MaxNoVariable = 1
                        GenerateInvoiceNo = Trim(Prefix) & "00001/" & Val(Right(FYear, 7)) & "-" & Val(Right(FYear, 2))
                    End If
                Case Else
                    If dt.Rows.Count > 0 Then
                        'For i = 1 To GblCodesize - dt.Rows(0)(0).ToString().Length()
                        '    st = Trim(st) & 0
                        'Next
                        MaxNoVariable = dt.Rows(0)(0)
                        If FYear <> "" Then
                            If FYearFlag = True Then
                                st = Trim(st) & dt.Rows(0)(0) & "/" & Right(Left(FYear, 4), 2)
                            Else
                                st = Trim(st) & dt.Rows(0)(0) & "/" & Val(Right(FYear, 7)) & "-" & Val(Right(FYear, 2))
                            End If
                        Else
                            st = Trim(st) & dt.Rows(0)(0)
                        End If
                        GenerateInvoiceNo = Trim(Prefix) & st
                    Else
                        MaxNoVariable = 1
                        If FYear <> "" Then
                            If FYearFlag = True Then
                                GenerateInvoiceNo = Trim(Prefix) & "00001" & "/" & Right(Left(FYear, 4), 2)
                            Else
                                GenerateInvoiceNo = Trim(Prefix) & "00001" & "/" & Val(Right(FYear, 7)) & "-" & Val(Right(FYear, 2))
                            End If
                        Else
                            GenerateInvoiceNo = Trim(Prefix) & "00001"
                        End If
                    End If
                    If suffix.Trim() <> "" Then GenerateInvoiceNo = GenerateInvoiceNo & "" & suffix
            End Select

            'If dt.Rows.Count > 0 Then
            '    'For i = 1 To GblCodesize - dt.Rows(0)(0).ToString().Length()
            '    '    st = Trim(st) & 0
            '    'Next
            '    MaxNoVariable = dt.Rows(0)(0)
            '    If FYear <> "" Then
            '        st = Trim(st) & dt.Rows(0)(0) & "/" & Val(Right(FYear, 7)) & "-" & Val(Right(FYear, 2))
            '    Else
            '        st = Trim(st) & dt.Rows(0)(0)
            '    End If
            '    GenerateInvoiceNo = Trim(Prefix) & st
            'Else
            '    MaxNoVariable = 1
            '    If FYear <> "" Then
            '        GenerateInvoiceNo = Trim(Prefix) & "00001" & "/" & Val(Right(FYear, 7)) & "-" & Val(Right(FYear, 2))
            '    Else
            '        GenerateInvoiceNo = Trim(Prefix) & "00001"
            '    End If
            'End If
            'If suffix.Trim() <> "" Then GenerateInvoiceNo = GenerateInvoiceNo & "" & suffix

            Return GenerateInvoiceNo
        End Function

        Public Function GeneratePrefixedNoSelJegat(ByVal TableName As String, ByVal Prefix As String, ByVal MaxFieldName As String, ByRef MaxNoVariable As Integer, ByVal FYear As String, Optional ByVal SearchCondition As String = "") As String
            Dim dt As New DataTable()
            Dim st As String = ""
            Dim i As Integer
            Dim GblCodesize As Integer
            GblCodesize = 5
            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            Dim FYearFlag As String = GetColumnValue("Isnull(MultipleFYearNotRequired,0)", "CompanyMaster", " CompanyID=" & GBLCompanyID & " ")
            If DBType = "MYSQL" Then
                FillDataTable(dt, "Select IFNULL(MAX(IFNULL(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition)
            Else
                FillDataTable(dt, "Select isnull(MAX(isnull(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition)
            End If
            If dt.Rows.Count > 0 Then
                For i = 1 To GblCodesize - dt.Rows(0)(0).ToString().Length()
                    st = Trim(st) & 0
                Next
                MaxNoVariable = dt.Rows(0)(0)
                If FYear <> "" Then
                    If FYearFlag = True Then
                        st = Trim(st) & dt.Rows(0)(0) & "/" & Right(Left(FYear, 4), 2)
                    Else
                        st = Trim(st) & dt.Rows(0)(0) & "/" & Val(Right(FYear, 7)) & "-" & Val(Right(FYear, 2))
                    End If
                Else
                    st = Trim(st) & dt.Rows(0)(0)
                End If
                GeneratePrefixedNoSelJegat = Trim(Prefix) & st
            Else
                MaxNoVariable = 1
                If FYear <> "" Then
                    If FYearFlag = True Then
                        GeneratePrefixedNoSelJegat = Trim(Prefix) & "00001" & "/" & Right(Left(FYear, 4), 2)
                    Else
                        GeneratePrefixedNoSelJegat = Trim(Prefix) & "00001" & "/" & Val(Right(FYear, 7)) & "/" & Val(Right(FYear, 2))
                    End If
                Else
                    GeneratePrefixedNoSelJegat = Trim(Prefix) & "00001"
                End If
            End If
            Return GeneratePrefixedNoSelJegat
        End Function


        Public Function GeneratePrefixedNo(ByVal TableName As String, ByVal Prefix As String, ByVal MaxFieldName As String, ByRef MaxNoVariable As Integer, ByVal FYear As String, Optional ByVal SearchCondition As String = "") As String
            Dim dt As New DataTable()
            Dim st As String = ""
            Dim i As Integer
            Dim GblCodesize As Integer
            GblCodesize = 5
            Dim VoucherType = ""
            If TableName = "InvoiceTransactionMain" And Prefix = "CN" Then
                VoucherType = "/"
            Else
                VoucherType = "_"
            End If

            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            Dim FYearFlag As String = GetColumnValue("Isnull(MultipleFYearNotRequired,0)", "CompanyMaster", " CompanyID=" & GBLCompanyID & " ")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"
            If DBType = "MYSQL" Then
                FillDataTable(dt, "Select IFNULL(MAX(IFNULL(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition)
            Else
                FillDataTable(dt, "Select isnull(MAX(isnull(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition)
            End If
            If dt.Rows.Count > 0 Then
                For i = 1 To GblCodesize - dt.Rows(0)(0).ToString().Length()
                    st = Trim(st) & 0
                Next
                MaxNoVariable = dt.Rows(0)(0)
                If FYear <> "" Then
                    If FYearFlag = True Then
                        st = Trim(st) & dt.Rows(0)(0) & VoucherType & Right(Left(FYear, 4), 2)
                    Else
                        st = Trim(st) & dt.Rows(0)(0) & VoucherType & Val(Right(FYear, 7)) & "_" & Val(Right(FYear, 2))
                    End If
                Else
                    st = Trim(st) & dt.Rows(0)(0)
                End If
                GeneratePrefixedNo = Trim(Prefix) & st
            Else
                MaxNoVariable = 1
                If FYear <> "" Then
                    If FYearFlag = True Then
                        GeneratePrefixedNo = Trim(Prefix) & "00001" & VoucherType & Right(Left(FYear, 4), 2)
                    Else
                        GeneratePrefixedNo = Trim(Prefix) & "00001" & VoucherType & Val(Right(FYear, 7)) & "_" & Val(Right(FYear, 2))
                    End If
                Else
                    GeneratePrefixedNo = Trim(Prefix) & "00001"
                End If
            End If
            Return GeneratePrefixedNo
        End Function

        Public Function GeneratePrefixedNoUsingSeparator(ByVal TableName As String, ByVal Prefix As String, ByVal MaxFieldName As String, ByRef MaxNoVariable As Integer, ByVal FYear As String, ByVal SeparateCharacter As String, Optional ByVal SearchCondition As String = "") As String
            Dim dt As New DataTable()
            Dim st As String = ""
            Dim i As Integer
            Dim GblCodesize As Integer
            GblCodesize = 5
            Dim VoucherType = ""
            If TableName = "InvoiceTransactionMain" And Prefix = "CN" Then
                VoucherType = "/"
            Else
                VoucherType = "_"
            End If
            If SeparateCharacter = "" Then
                SeparateCharacter = VoucherType
            End If
            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            GBLCompanyID = Convert.ToString(HttpContext.Current.Session("CompanyID"))
            Dim FYearFlag As String = GetColumnValue("Isnull(MultipleFYearNotRequired,0)", "CompanyMaster", " CompanyID=" & GBLCompanyID & " ")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"
            If DBType = "MYSQL" Then
                FillDataTable(dt, "Select IFNULL(MAX(IFNULL(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition)
            Else
                FillDataTable(dt, "Select isnull(MAX(isnull(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition)
            End If
            If dt.Rows.Count > 0 Then
                For i = 1 To GblCodesize - dt.Rows(0)(0).ToString().Length()
                    st = Trim(st) & 0
                Next
                MaxNoVariable = dt.Rows(0)(0)
                If FYear <> "" Then
                    If FYearFlag = True Then
                        st = Trim(st) & dt.Rows(0)(0) & SeparateCharacter & Right(Left(FYear, 4), 2)
                    Else
                        st = Trim(st) & dt.Rows(0)(0) & SeparateCharacter & Val(Right(FYear, 7)) & IIf(SeparateCharacter = "/", "-", "_") & Val(Right(FYear, 2))
                    End If
                Else
                    st = Trim(st) & dt.Rows(0)(0)
                End If
                GeneratePrefixedNoUsingSeparator = Trim(Prefix) & st
            Else
                MaxNoVariable = 1
                If FYear <> "" Then
                    If FYearFlag = True Then
                        GeneratePrefixedNoUsingSeparator = Trim(Prefix) & "00001" & SeparateCharacter & Right(Left(FYear, 4), 2)
                    Else
                        GeneratePrefixedNoUsingSeparator = Trim(Prefix) & "00001" & SeparateCharacter & Val(Right(FYear, 7)) & IIf(SeparateCharacter = "/", "-", "_") & Val(Right(FYear, 2))
                    End If
                Else
                    GeneratePrefixedNoUsingSeparator = Trim(Prefix) & "00001"
                End If
            End If
            Return GeneratePrefixedNoUsingSeparator
        End Function

        Public Function GeneratePrefixedNoWithoutFYear(ByVal TableName As String, ByVal Prefix As String, ByVal MaxFieldName As String, ByRef MaxNoVariable As Integer, Optional ByVal SearchCondition As String = "") As String
            Dim dt As New DataTable()
            Dim st As String = ""
            Dim i As Integer
            Dim GblCodesize As Integer
            GblCodesize = 5
            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"
            If DBType = "MYSQL" Then
                FillDataTable(dt, "Select IFNULL(MAX(IFNULL(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition)
            Else
                FillDataTable(dt, "Select isnull(MAX(isnull(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition)
            End If
            If dt.Rows.Count > 0 Then
                For i = 1 To GblCodesize - dt.Rows(0)(0).ToString().Length()
                    st = Trim(st) & 0
                Next
                MaxNoVariable = dt.Rows(0)(0)

                st = Trim(st) & dt.Rows(0)(0)

                GeneratePrefixedNoWithoutFYear = Trim(Prefix) & st
            Else
                MaxNoVariable = 1
                GeneratePrefixedNoWithoutFYear = Trim(Prefix) & "00001"

            End If
            Return GeneratePrefixedNoWithoutFYear
        End Function

        ''************************ Logic Convert Object To DataTable *** Using Newtonsoft *******************************
        Public Function ConvertObjectToDatatableOld(ByVal jsonObject As Object, ByRef datatable As DataTable, Optional ByRef ErrMsg As String = "") As DataTable
            Try
                Dim st As String = JsonConvert.SerializeObject(jsonObject)

                Dim parsedJson As JToken = JToken.Parse(st)

                If parsedJson.Type = JTokenType.Object Then
                    ' If it is a JSON object, wrap it in an array
                    Dim jsonArray As String = "[" & st & "]"
                    datatable = JsonConvert.DeserializeObject(Of DataTable)(jsonArray)
                ElseIf parsedJson.Type = JTokenType.Array Then
                    ' If it is a JSON array, deserialize it directly
                    datatable = JsonConvert.DeserializeObject(Of DataTable)(st)
                Else
                    ErrMsg = "The JSON string is neither an object nor an array."
                    Return Nothing
                End If

                'datatable = JsonConvert.DeserializeObject(Of DataTable)(st)
                ErrMsg = "Success"
            Catch ex As Exception
                ErrMsg = ex.Message
            End Try
            Return datatable
        End Function

        Public Function ConvertObjectToDatatable(ByVal jsonObject As Object, ByRef datatable As DataTable, Optional ByRef ErrMsg As String = "") As DataTable
            Try
                Dim st As String = JsonConvert.SerializeObject(jsonObject)
                Dim parsedJson As JToken = JToken.Parse(st)

                ' Call a recursive function to convert all numbers to strings
                If parsedJson.Type = JTokenType.Array Then
                    For Each obj As JObject In parsedJson
                        ConvertNumbersToStrings(obj)
                    Next
                ElseIf parsedJson.Type = JTokenType.Object Then
                    ConvertNumbersToStrings(parsedJson)
                    Dim jsonArray As String = "[" & parsedJson.ToString() & "]"
                    datatable = JsonConvert.DeserializeObject(Of DataTable)(jsonArray)
                    ErrMsg = "Success"
                    Return datatable
                Else
                    ErrMsg = "The JSON string is neither an object nor an array."
                    Return Nothing
                End If

                datatable = JsonConvert.DeserializeObject(Of DataTable)(parsedJson.ToString())
                ErrMsg = "Success"

            Catch ex As Exception
                ErrMsg = ex.Message
            End Try
            Return datatable
        End Function

        ' This is the new recursive helper function
        Private Sub ConvertNumbersToStrings(ByVal token As JToken)
            If token.Type = JTokenType.Object Then
                ' Recurse into object properties
                For Each prop As JProperty In DirectCast(token, JObject).Properties()
                    ConvertNumbersToStrings(prop.Value)
                Next
            ElseIf token.Type = JTokenType.Array Then
                ' Recurse into array elements
                For Each item As JToken In DirectCast(token, JArray)
                    ConvertNumbersToStrings(item)
                Next
            ElseIf token.Type = JTokenType.Integer OrElse token.Type = JTokenType.Float Then
                ' If it's a number, convert it to a string
                DirectCast(token.Parent, JProperty).Value = token.ToString()
            End If
        End Sub

        Public Function ConvertDatatableToObject(ByVal datatable As DataTable, ByRef jsonObject As Object, Optional ByRef ErrMsg As String = "") As Object
            Try
                Dim jsonString As String = JsonConvert.SerializeObject(datatable)

                jsonObject = JsonConvert.DeserializeObject(Of Object)(jsonString)

                ErrMsg = "Success"
            Catch ex As Exception
                ErrMsg = ex.Message
                Return Nothing
            End Try
            Return Nothing
        End Function

        Public Function ConvertObjectToDatatableNew(ByVal jsonObject As Object, ByRef datatable As DataTable, Optional ByRef ErrMsg As String = "") As DataTable
            Try
                ' Step 1: Iterate through the jsonObject and format numeric values
                Dim formattedObject As New List(Of Dictionary(Of String, String))
                Dim st As String
                If TypeOf jsonObject Is DataTable = False Then
                    For Each row As Dictionary(Of String, Object) In jsonObject
                        Dim formattedRow As New Dictionary(Of String, String)
                        For Each kvp As KeyValuePair(Of String, Object) In row
                            If kvp.Value Is Nothing Then
                                formattedRow(kvp.Key) = ""
                            ElseIf TypeOf kvp.Value Is Integer OrElse TypeOf kvp.Value Is Double Then
                                formattedRow(kvp.Key) = Convert.ToDouble(kvp.Value).ToString("F2")
                            Else
                                formattedRow(kvp.Key) = kvp.Value.ToString()
                            End If
                        Next
                        formattedObject.Add(formattedRow)
                    Next
                    st = JsonConvert.SerializeObject(formattedObject)

                    ' Step 3: Deserialize the JSON back to a DataTable
                    datatable = JsonConvert.DeserializeObject(Of DataTable)(st)
                Else
                    st = JsonConvert.SerializeObject(jsonObject)

                    ' Step 3: Deserialize the JSON back to a DataTable
                    datatable = JsonConvert.DeserializeObject(Of DataTable)(st)
                End If

                ' Step 2: Serialize the formatted object to JSON


                ErrMsg = "Success"
            Catch ex As Exception
                ErrMsg = ex.Message
            End Try
            Return datatable
        End Function

        Public Function ConvertObjectToDatatablePro(ByVal jsonObject As Object, ByRef datatable As DataTable) As DataTable
            Try
                Dim st As String = JsonConvert.SerializeObject(jsonObject)
                If st.Length > 2 And st.IndexOf("[") <> 0 Then
                    st = "[" & st & "]"
                End If
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
            serializer.MaxJsonLength = 2147483647
            Return serializer.Serialize(tableRows)
        End Function

        Public Function GenerateMaxVoucherNo(ByVal TableName As String, ByVal fieldname As String, Optional ByVal SearchCondition As String = "") As Long
            On Error Resume Next
            Dim dt As New DataTable()
            Dim Sql As String = ""
            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"
            If DBType = "MYSQL" Then
                Sql = "Select IFNULL(MAX(IFNULL(" & fieldname & ",0)),0) From " & TableName & " " & SearchCondition
            Else
                Sql = "Select Isnull(MAX(Isnull(" & fieldname & ",0)),0) From " & TableName & " " & SearchCondition
            End If

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
            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"
            If DBType = "MYSQL" Then
                Sql = "Select IFNULL(MAX(IFNULL(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition
            Else
                Sql = "Select isnull(MAX(isnull(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition
            End If
            FillDataTable(dt, Sql)
            If dt.Rows.Count > 0 Then
                GenerateProductionCode = IIf(IsDBNull(dt.Rows(0)(0)), 1, dt.Rows(0)(0))
            Else
                GenerateProductionCode = 1
            End If
            Return GenerateProductionCode
        End Function

        ''' <summary>
        ''' Check user permissions
        ''' </summary>
        ''' <param name="ModuleName">module page name</param>
        ''' <param name="UserId">User Id</param>
        ''' <param name="CompanyId">Company ID</param>
        ''' <param name="ActionType">CanSave,CanEdit,CanDelete</param>
        ''' <returns>False not allowed OR true allowed</returns>
        Public Function CheckAuthories(ByVal ModuleName As String, ByVal UserId As Integer, ByVal CompanyId As Integer, ByVal ActionType As String, Optional ByVal TransactionDetails As String = "", Optional ByVal TransactionUpdateRemark As String = "") As Boolean
            Try
                Dim DT As New DataTable
                Dim ModuleID As Integer
                DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
                If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"
                If DBType = "MYSQL" Then
                    str = "Select IFNULL(" & ActionType & ",'False') As Action,MM.ModuleID,MM.ModuleDisplayName From UserModuleAuthentication As A Inner Join ModuleMaster As MM On MM.ModuleID=A.ModuleID And MM.CompanyID=A.CompanyID Where IFNULL(A.IsDeletedTransaction,0)=0 And A.UserID=" & UserId & " And MM.ModuleName='" & ModuleName & "' And A.CompanyID=" & CompanyId
                Else
                    str = "Select Isnull(" & ActionType & ",'False') As Action,MM.ModuleID,MM.ModuleDisplayName From UserModuleAuthentication As A Inner Join ModuleMaster As MM On MM.ModuleID=A.ModuleID And MM.CompanyID=A.CompanyID Where Isnull(A.IsDeletedTransaction,0)=0 And A.UserID=" & UserId & " And MM.ModuleName='" & ModuleName & "' And A.CompanyID=" & CompanyId
                End If
                FillDataTable(DT, str)
                If DT.Rows.Count > 0 Then
                    If DT.Rows(0)("Action") = False Then
                        Return False
                    End If
                    ModuleID = DT.Rows(0)("ModuleID")
                Else
                    Return False
                End If

                Select Case ActionType
                    Case "CanSave"
                        str = "New Added : "
                    Case "CanEdit"
                        str = "Edited : "
                    Case "CanCancel"
                        str = "Cancelled : "
                    Case "CanDelete"
                        str = "Deleted : "
                    Case "CanPrint"
                        str = "Printed : "
                    Case "CanExport"
                        str = "Exported : "
                    Case "CanView"
                        str = DT.Rows(0)("ModuleDisplayName") & " Viewed"
                    Case Else
                        str = ""
                End Select
                If str.Contains("Edited") Or str.Contains("Deleted") Then
                    If Trim(TransactionUpdateRemark) = "" Then TransactionUpdateRemark = TransactionDetails
                    str += TransactionUpdateRemark
                Else
                    str += TransactionDetails
                End If
                Dim IsNumberTrans As Long = 0
                If IsNumeric(TransactionDetails) = True Then
                    IsNumberTrans = TransactionDetails
                End If
                If DBType = "MYSQL" Then
                    ExecuteNonSQLQuery("Insert Into UserTransactionLogs( ModuleID, ModuleName, Details, RecordID, RecordName, ActionType, UserID, CompanyID, CreatedDate) Values(" & ModuleID & ",'" & ModuleName & "','" & str & "'," & IsNumberTrans & ",'" & TransactionDetails & "','" & ActionType & "'," & UserId & "," & CompanyId & ",Now())")
                Else
                    ExecuteNonSQLQuery("Insert Into UserTransactionLogs( ModuleID, ModuleName, Details, RecordID, RecordName, ActionType, UserID, CompanyID, CreatedDate) Values(" & ModuleID & ",'" & ModuleName & "','" & str & "'," & IsNumberTrans & ",'" & TransactionDetails & "','" & ActionType & "'," & UserId & "," & CompanyId & ",Getdate())")
                End If
                Return True
            Catch ex As Exception
                Return False
            End Try
        End Function


        Public Function GetColumnValue(ByVal ColumnName As String, ByVal TableName As String, ByVal WhereCndtn As String, Optional ByVal OrderBy As String = "") As String
            Try
                Dim DT As New DataTable
                If OrderBy = "" Then OrderBy = ColumnName
                str = "Select Distinct " & ColumnName & " From " & TableName & " Where " & WhereCndtn & " Order By " & OrderBy
                FillDataTable(DT, str)
                If DT.Rows.Count > 0 Then
                    Return DT.Rows(0)(0)
                End If
                Return ""
            Catch ex As Exception
                Return "Error: " & ex.Message
            End Try
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
            Dim da As New SqlDataAdapter(query, Db)
            Dim dt As New DataTable()
            da.Fill(dt)
            ddl.DataSource = dt
            ddl.DataTextField = DM
            ddl.DataValueField = VM

            ddl.DataBind()
            ddl.Items.Insert(0, "--Select--")
        End Sub

        Public Sub SaveBranchSettingMaster(ByVal ItemID As Long, ByVal ItemName As String, ByVal MasterName As String, ByVal BranchID As Long, ByVal BranchName As String)
            DBType = Convert.ToString(HttpContext.Current.Session("DBType"))
            Dim MasterDataID As Integer
            Dim dt As New DataTable()
            Dim db As New DBConnection()
            db.FillDataTable(dt, "Select * FROM MasterData Where MasterDataName like('" & MasterName & "')")
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
            If DBType = "MYSQL" Then
                Dim cmd As New MySqlCommand()
                db.OpenDataBaseMYSQL()
                cmd.Connection = db.OpenDataBaseMYSQL()

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
            Else
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
            End If

        End Sub


        Public Function GenerateMaxEnquiryNo(ByVal TableName As String, ByVal MaxFieldName As String, ByRef MaxNoVariable As Integer) As String
            Dim dt As New DataTable()
            Dim st As String
            Dim i As Integer
            Dim GblCodesize As Integer
            GblCodesize = 4
            st = ""
            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"
            If DBType = "MYSQL" Then
                FillDataTable(dt, "Select IFNULL(MAX(IFNULL(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName)
            Else
                FillDataTable(dt, "Select isnull(MAX(isnull(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName)
            End If
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
            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"
            If DBType = "MYSQL" Then
                FillDataTable(dt, "Select IFNULL(MAX(IFNULL(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition)
            Else
                FillDataTable(dt, "Select isnull(MAX(isnull(" & MaxFieldName & " ,0)),0) + 1  From  " & TableName & "  " & SearchCondition)
            End If

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

        Public Sub PrePostFYear(ByVal CurrentFYear As String, ByRef PreFYear As String, ByRef PostFYear As String)
            On Error Resume Next
            Dim x_Position As Long
            Dim PreYear, LYear As Long

            x_Position = InStr(1, CurrentFYear, "-", vbTextCompare)
            PreYear = Val(Mid(CurrentFYear, 1, x_Position - 1))
            LYear = Val(Mid(CurrentFYear, x_Position + 1, Len(CurrentFYear)))
            PreFYear = PreYear - 1 & "-" & LYear - 1
            PostFYear = PreYear + 1 & "-" & LYear + 1
        End Sub

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


        Public Function ReadNumber(ByVal Number As String, ByVal CurrencyHeadName As String, ByVal CurrencyChildName As String, ByVal CurrencyCode As String) As String
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
            'S1 = Trim(Mid(s, 1, IIf(InStr(1, s, ".") = 0, Len(s), InStr(1, s, ".") - 1)))
            'S2 = Trim(Mid(s, IIf(InStr(1, s, ".") = 0, Len(s) + 1, InStr(1, s, ".") + 1), Len(s)))
            If InStr(s, ".") > 0 Then
                S1 = Left(s, InStr(s, ".") - 1)
                S2 = Mid(s, InStr(s, ".") + 1)
            Else
                S1 = s
                S2 = "0"
            End If

            If Val(S2) > 0 Then
                If CurrencyCode = "INR" Then
                    ReadNumber = StrConv(BeforeDecimal(Val(S1)), vbProperCase) + "Rupee and " + StrConv(BeforeDecimal(Val(S2)), vbProperCase) + " Paisa only"
                Else
                    ReadNumber = StrConv(BeforeDecimal(Val(S1)), vbProperCase) + " " + CurrencyHeadName + " and " + StrConv(BeforeDecimal(Val(S2)), vbProperCase) + " " + CurrencyChildName
                End If

            Else
                If CurrencyCode = "INR" Then
                    ReadNumber = StrConv(BeforeDecimal(Val(S1)), vbProperCase) + " Rupee only" '+ BeforeDecimal(Val(S2)) + " paisa"
                Else
                    ReadNumber = StrConv(BeforeDecimal(Val(S1)), vbProperCase) + " " + CurrencyHeadName '+ BeforeDecimal(Val(S2)) + " paisa"
                End If

            End If
        End Function

        'Public Function BeforeDecimal(ByVal Num As Double) As String
        '    Dim s As String = ""
        '    While Num <> 0
        '        If Num >= 1 And Num <= 20 Then
        '            s = s & ReadDigit(Num)
        '            Num = 0
        '        ElseIf Num > 20 And Num < 100 Then
        '            s = s & ReadDigit2(Left(Num, 1))
        '            Num = Right(Num, 1)
        '        ElseIf Num >= 100 And Num < 1000 Then
        '            If Left(Num, 1) = "1" Then
        '                s = s & ReadDigit(Left(Num, 1)) & " hundred"
        '            Else
        '                s = s & ReadDigit(Left(Num, 1)) & " hundred"
        '            End If
        '            Num = Right(Num, 2)
        '        ElseIf Num >= 1000 And Num < 10000 Then
        '            If Left(Num, 1) = "1" Then
        '                s = s & ReadDigit(Left(Num, 1)) & " thousand"
        '            Else
        '                s = s & ReadDigit(Left(Num, 1)) & " thousand"
        '            End If
        '            Num = Right(Num, 3)
        '        ElseIf Num >= 10000 And Num < 20000 Then
        '            s = s & ReadDigit(Left(Num, 2)) & " thousand"
        '            Num = Right(Num, 3)
        '        ElseIf Num >= 20000 And Num < 100000 Then
        '            s = s & ReadDigit2(Left(Num, 1)) & " " & ReadDigit(Mid(Num, 2, 1)) & " thousand"
        '            Num = Right(Num, 3)
        '        ElseIf Num >= 100000 And Num < 1000000 Then
        '            If Left(Num, 1) = "1" Then
        '                s = s & ReadDigit(Left(Num, 1)) & " lakh"
        '            Else
        '                s = s & ReadDigit(Left(Num, 1)) & " lakhs"
        '            End If
        '            Num = Right(Num, 5)
        '        ElseIf Num >= 1000000 And Num < 2000000 Then
        '            s = s & ReadDigit(Left(Num, 2)) & " lakhs"
        '            Num = Right(Num, 5)
        '        ElseIf Num >= 2000000 And Num < 10000000 Then
        '            s = s & ReadDigit2(Left(Num, 1)) & " " & ReadDigit(Mid(Num, 2, 1)) & " lakhs"
        '            Num = Right(Num, 5)
        '        ElseIf Num >= 10000000 And Num < 100000000 Then
        '            If Left(Num, 1) = "1" Then
        '                s = s & ReadDigit(Left(Num, 1)) & " crore"
        '            Else
        '                s = s & ReadDigit(Left(Num, 1)) & " crores"
        '            End If
        '            Num = Right(Num, 7)
        '        ElseIf Num >= 100000000 And Num < 200000000 Then
        '            s = s & ReadDigit(Left(Num, 2)) & " crores"
        '            Num = Right(Num, 7)
        '        ElseIf Num >= 200000000 And Num < 1000000000 Then
        '            s = s & ReadDigit2(Left(Num, 1)) & " " & ReadDigit(Mid(Num, 2, 1)) & " crores"
        '            Num = Right(Num, 7)
        '        ElseIf Num >= 1000000000 Then
        '            If Left(Num, 1) = "1" Then
        '                s = s & BeforeDecimal(Mid(Num, 1, Len(str(Num)) - 8)) & " crore"
        '            Else
        '                s = s & BeforeDecimal(Mid(Num, 1, Len(str(Num)) - 8)) & " crores"
        '            End If
        '            Num = Mid(Num, Len(str(Num)) - 7, Len(str(Num)))
        '        End If
        '        s = s & " "
        '    End While
        '    BeforeDecimal = s
        'End Function

        Public Function BeforeDecimal(ByVal Num As Double) As String

            If Num = 0 Then Return "zero"

            Dim n As Long = CLng(Math.Truncate(Num))
            Dim s As String = ""

            If n >= 10000000 Then
                s &= BeforeDecimal(n \ 10000000) & " crore "
                n = n Mod 10000000
            End If

            If n >= 100000 Then
                s &= BeforeDecimal(n \ 100000) & " lakh "
                n = n Mod 100000
            End If

            If n >= 1000 Then
                s &= BeforeDecimal(n \ 1000) & " thousand "
                n = n Mod 1000
            End If

            If n >= 100 Then
                s &= ReadDigit(n \ 100) & " hundred "
                n = n Mod 100
            End If

            If n > 0 Then
                If n <= 20 Then
                    s &= ReadDigit(n)
                Else
                    s &= ReadDigit2(n \ 10) & " " & ReadDigit(n Mod 10)
                End If
            End If

            Return Trim(s)
        End Function

        Public Function ReadDigit(ByVal Digit As Double) As String
            ReadDigit = ""
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
            Return ReadDigit
        End Function

        Public Function ReadDigit2(ByVal Digit As Double) As String
            ReadDigit2 = ""
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
            Return ReadDigit2
        End Function



        Public Function getLastVoucherDate(ByVal tableName As String, ByVal dateFieldName As String, ByVal whereCondition As String) As String
            Dim strQuery As String = ""
            Dim dt As New DataTable()
            strQuery = "Select Max(" & dateFieldName & ") AS " & dateFieldName & " From " & tableName & " " & IIf(Trim(whereCondition) = "", "", " Where " & whereCondition)

            FillDataTable(dt, strQuery)
            If dt.Rows.Count > 0 Then
                getLastVoucherDate = IIf(IsDBNull(dt.Rows(0)(dateFieldName)), Now(), dt.Rows(0)(dateFieldName))
            Else
                getLastVoucherDate = Now()
            End If
        End Function

        Public Function DeleteData(ByVal TableName As String, ByVal SearchCondition As String) As String
            Try
                Dim str As String

                Db = OpenDataBase()
                If Db.State = ConnectionState.Closed Then
                    Db.Open()
                End If

                Dim cmd As SqlCommand

                If SearchCondition <> "" Then
                    str = "DELETE FROM " & TableName & " " & SearchCondition
                    cmd = New SqlCommand(str, Db)
                    cmd.ExecuteNonQuery()
                    str = "Deleted"
                Else
                    str = "Not Deleted"
                End If

                Db.Close()

            Catch ex As Exception
                Return ex.Message
            End Try
            Return str
        End Function

        Public Function GenerateQrCode(code As String) As Byte()
            Dim qrGenerator As New QRCodeGenerator
            Dim qRCodeData As QRCodeData = qrGenerator.CreateQrCode(code, QRCodeGenerator.ECCLevel.Q)
            Dim qrCode As QRCode = New QRCode(qRCodeData)
            Dim imgBarCode As New System.Web.UI.WebControls.Image With {
                .Height = 150,
                .Width = 150
            }
            Using bitMap As Bitmap = qrCode.GetGraphic(20)
                Using ms As New IO.MemoryStream()
                    bitMap.Save(ms, System.Drawing.Imaging.ImageFormat.Png)
                    Dim byteImage As Byte() = ms.ToArray()
                    Return byteImage
                End Using
            End Using
        End Function

        Public Async Function CallIntegrationEmailAPI(ByVal MailsDataTable As DataTable) As Task(Of IntegrationResponse)
            Dim response As New IntegrationResponse()
            Dim CompanyId = Convert.ToInt32(HttpContext.Current.Session("CompanyId"))
            Dim GBLUserID = Convert.ToString(HttpContext.Current.Session("UserId"))
            Dim Dt_CompanyDetails As New DataTable
            FillDataTable(Dt_CompanyDetails, "Select IndusMailAPIBaseUrl,ApiBasicAuthUserName,ApiBasicAuthPassword from CompanyMaster Where CompanyID = " & CompanyId)
            Dim apiUrl As String = Dt_CompanyDetails.Rows(0)("IndusMailAPIBaseUrl") & "/api/Send/Email"
            Dim jsonContent As String = "[{" &
                    """To"": """ & MailsDataTable.Rows(0)("ToEmail") & """," &
                    """CCEmails"": """ & MailsDataTable.Rows(0)("CCEmail") & """," &
                    """BCCEmails"": """ & MailsDataTable.Rows(0)("BCCEmail") & """," &
                    """Subject"": """ & MailsDataTable.Rows(0)("SubjectEmail") & """," &
                    """BodyText"": """ & MailsDataTable.Rows(0)("BodyTextEmail") & """," &
                    """AttachmentPath"": """ & MailsDataTable.Rows(0)("AttachmentPathEmail") & """," &
                    """UserID"": """ & GBLUserID & """" &
                "}]"
            Try
                Using httpClient As New HttpClient()
                    Dim request As New HttpRequestMessage(HttpMethod.Post, apiUrl)
                    Dim apiClientID As String = Dt_CompanyDetails.Rows(0)("ApiBasicAuthUserName")
                    Dim apiClientSecretID As String = Dt_CompanyDetails.Rows(0)("ApiBasicAuthPassword")
                    Dim credentials As String = Convert.ToBase64String(Encoding.ASCII.GetBytes(apiClientID & ":" & apiClientSecretID))
                    request.Headers.Authorization = New System.Net.Http.Headers.AuthenticationHeaderValue("Basic", credentials)
                    request.Content = New StringContent(jsonContent, Encoding.UTF8, "application/json")
                    Dim response1 As HttpResponseMessage = Await httpClient.SendAsync(request)
                    response.HttpStatusCode = CInt(response1.StatusCode)
                    If response1.IsSuccessStatusCode Then
                        Dim responseData As String = Await response1.Content.ReadAsStringAsync()
                        response.Success = True
                        response.Message = "Success"
                        response.Data = responseData
                    Else
                        response.Success = False
                        response.Message = "Error: " & response1.StatusCode.ToString()
                    End If
                End Using
            Catch ex As WebException
                Dim webResponse As HttpWebResponse = CType(ex.Response, HttpWebResponse)
                If webResponse IsNot Nothing Then
                    response.Message = "HTTP Status Code: " & CInt(webResponse.StatusCode) & ", " & webResponse.StatusDescription
                    Using reader As New StreamReader(webResponse.GetResponseStream())
                        Dim responseBody As String = reader.ReadToEnd()
                        response.Message &= ", Response Body: " & responseBody
                    End Using
                Else
                    response.Message = ex.Message
                End If
                response.Success = False
            Catch ex As Exception
                response.Message = ex.Message
                response.Success = False
            End Try
            Return response
        End Function

        Public Async Function CallIntegrationAPI(ByVal DocumentNo As String, ByVal DocumentType As String, ByVal ModuleName As String, ByVal ActionType As String) As Task(Of IntegrationResponse)
            Dim response As New IntegrationResponse()

            Dim CompanyId = Convert.ToInt32(HttpContext.Current.Session("CompanyId"))
            Dim Dt_CompanyDetails As New DataTable
            FillDataTable(Dt_CompanyDetails, "Select IndusAPIAuthToken,APIIntegrationRequired,IndusAPIBaseUrl,IndusAPIBaseUrl + IndusTokenAuthAPI as TokenUrl,ApiClientID,ApiClientSecretID from CompanyMaster Where CompanyID = " & CompanyId)

            If Dt_CompanyDetails.Rows.Count = 0 Then
                response.Message = "Something went wrong"
                Return response
            Else
                If Dt_CompanyDetails.Rows(0)("APIIntegrationRequired") = 0 Then
                    response.Success = False
                    response.Message = "Integration not required..!"
                    Return response
                ElseIf Dt_CompanyDetails.Rows(0)("IndusAPIAuthToken") = "" Then
                    Dim url As String = Dt_CompanyDetails.Rows(0)("TokenUrl")
                    Dim ApiClientID As String = Dt_CompanyDetails.Rows(0)("ApiClientID")
                    Dim ApiClientSecretID As String = Dt_CompanyDetails.Rows(0)("ApiClientSecretID")

                    Dt_CompanyDetails.Rows(0)("IndusAPIAuthToken") = GenerateToken(url, ApiClientID, ApiClientSecretID)
                End If
            End If

            Dim apiUrl As String = Dt_CompanyDetails.Rows(0)("IndusAPIBaseUrl") + "/api/Post/Transaction/ClientApi"

            Dim jsonContent As String = "{" &
     """MainData"":{" &
     """DocumentNo"":""" & DocumentNo & """," &
     """DocumentType"":""" & DocumentType & """," &
     """ModuleName"":""" & ModuleName & """," &
     """ActionType"":""" & ActionType & """}}"
            Try
                Using httpClient As New HttpClient()
                    Dim request As New HttpRequestMessage(HttpMethod.Post, apiUrl)
                    request.Headers.Authorization = New System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", Dt_CompanyDetails.Rows(0)("IndusAPIAuthToken"))
                    request.Content = New StringContent(jsonContent, Encoding.UTF8, "application/json")
                    Dim response1 As HttpResponseMessage = Await httpClient.SendAsync(request)
                    response.HttpStatusCode = CInt(response1.StatusCode)
                    If response1.IsSuccessStatusCode Then
                        Dim responseData As String = Await response1.Content.ReadAsStringAsync()
                        response.Success = True
                        response.Message = "Success"
                        response.Data = responseData ' Assign the deserialized data here
                    Else
                        response.Success = False
                        response.Message = "Error: " & response1.StatusCode.ToString()
                    End If
                End Using
            Catch ex As WebException
                Dim webResponse As HttpWebResponse = CType(ex.Response, HttpWebResponse)
                If webResponse IsNot Nothing Then
                    response.Message = "HTTP Status Code: " & CInt(webResponse.StatusCode) & ", " & webResponse.StatusDescription
                    ' Read and include the response body
                    Using reader As New StreamReader(webResponse.GetResponseStream())
                        Dim responseBody As String = reader.ReadToEnd()
                        response.Message &= ", Response Body: " & responseBody
                    End Using
                Else
                    response.Message = ex.Message
                End If
                response.Success = False
            Catch ex As Exception
                response.Message = ex.Message
                response.Success = False
            End Try

            Return response
        End Function

        Public Function GenerateToken(url As String, username As String, password As String) As String
            Dim response As String = ""
            Dim CompanyId = Convert.ToInt32(HttpContext.Current.Session("CompanyId"))
            Try
                Dim request As WebRequest = WebRequest.Create(url)
                request.Method = "POST"
                Dim postData As String = "grant_type=password&username=" + Uri.EscapeDataString(username) + "&password=" + Uri.EscapeDataString(password)
                Dim byteArray As Byte() = Encoding.ASCII.GetBytes(postData)
                request.ContentType = "application/x-www-form-urlencoded"
                request.ContentLength = byteArray.Length

                Using dataStream As Stream = request.GetRequestStream()
                    dataStream.Write(byteArray, 0, byteArray.Length)
                End Using

                Using webResponse As HttpWebResponse = CType(request.GetResponse(), HttpWebResponse)
                    Using responseStream As Stream = webResponse.GetResponseStream()
                        Using reader As New StreamReader(responseStream)
                            response = reader.ReadToEnd()

                            Dim data = JsonConvert.DeserializeObject(Of DataObject)(response)
                            Dim accessToken As String = data.access_token
                            Dim str As String = "Update CompanyMaster set IndusAPIAuthToken = '" & accessToken & "' Where CompanyID = " & CompanyId
                            ExecuteNonSQLQuery(str)
                            Return accessToken
                        End Using
                    End Using
                End Using

            Catch ex As WebException
                Dim webResponse As HttpWebResponse = CType(ex.Response, HttpWebResponse)
                If webResponse IsNot Nothing Then
                    response = "HTTP Status Code: " + CInt(webResponse.StatusCode).ToString() + ", " + webResponse.StatusDescription
                    ' Read and include the response body
                    Using reader As New StreamReader(webResponse.GetResponseStream())
                        Dim responseBody As String = reader.ReadToEnd()
                        response += ", Response Body: " + responseBody
                    End Using
                Else
                    response = ex.Message
                End If

            Catch ex As Exception
                response = ex.Message
            End Try

            Return response
        End Function

        Public Function ValidUserAuthentication(ModuleName As String, ByVal username As String, ByVal password As String) As Boolean
            Dim KeyField As Boolean = False
            Dim UserID As String = ""
            Dim ModuleID As String = ""
            Dim AddColName As String = "", AddColValue As String = "", TableName As String = ""
            Dim dt As New DataTable
            Dim TransactionLogsID As String = ""
            AddColName = ""
            AddColValue = ""
            Dim CompanyId = Convert.ToInt32(HttpContext.Current.Session("CompanyId"))
            UserID = Convert.ToInt32(HttpContext.Current.Session("UserID"))
            Dim DBType = Convert.ToString(HttpContext.Current.Session("DBType"))


            If DBType = "MYSQL" Then
                str = " select UserID,UserName from UserMaster  where UserName ='" & Trim(username) & "'  and Password ='" & ChangePassword(Trim(password)) & "' AND CompanyID=" & CompanyId & ""
            Else
                str = " select UserID,UserName from UserMaster  where UserName ='" & Trim(username) & "'  and Password ='" & ChangePassword(Trim(password)) & "' AND CompanyID=" & CompanyId & ""
            End If

            FillDataTable(dt, str)
            If dt.Rows.Count <= 0 Then
                KeyField = False
            Else
                If Val(UserID) = Val(IIf(IsDBNull(dt.Rows(0)("UserID")), "0", dt.Rows(0)("UserID").ToString())) Then
                    'str = "select distinct ModuleID from ModuleMaster where ModuleName = '" & ModuleName & "' and Isnull(IsDeletedTransaction,0)<>1 AND CompanyID=" & CompanyId & ""
                    'FillDataTable(dt, str)
                    'ModuleID = dt.Rows(0)("ModuleID").ToString()
                    'TableName = "usertransactionlogs"
                    'AddColName = "CreatedDate,UserID,CompanyID,ModuleID,Details"
                    'AddColValue = "GetDate(),'" & UserID & "','" & CompanyId & "','" & ModuleID & "','" & Details & "'"
                    'TransactionLogsID = InsertDatatableToDatabase(Arr, TableName, AddColName, AddColValue)
                    'If IsNumeric(TransactionLogsID) = False Then
                    '    Return "Error :" & TransactionLogsID
                    'End If
                    KeyField = True
                Else
                    KeyField = False
                End If
            End If
            Return KeyField
        End Function
        Public Sub checkDynamicTransactionApprovalRequirement(ByVal companyID As String, ByVal ModuleName As String, ByRef IsApprovalRequired As Boolean, ByRef IsVoucherItemApproved As String, ByRef ApprovalByUserID As Long, ByRef ModuleID As Long, ByRef DisplayModuleName As String)
            Dim str1 As String = ""
            Dim dtCheck As New DataTable
            Dim dtUser As New DataTable
            Dim userID As String = "0"
            str1 = "Select Top 1 UserID From UserMaster Where CompanyID= " & companyID & " AND Isnull(IsDeletedUser,0)=0 AND isnull(IsAdmin,0)=1 Order By UserID"
            FillDataTable(dtUser, str1)
            If dtUser.Rows.Count > 0 Then
                userID = IIf(IsDBNull(dtUser.Rows(0)("UserID")), "0", dtUser.Rows(0)("UserID"))
            Else
                userID = "0"
            End If
            dtUser.Dispose()
            If Trim(ModuleName) > "" Then
                str1 = "Select UFS.UserFormsApprovalTransactionID,UFS.ModuleID,MM.ModuleDisplayName + ' (' + MM.ModuleHeadName + ')' As ModuleName,UFS.ApprovalBy,UFS.ActionType,UFS.CompanyID,UFS.ModifyDate,UFS.ApprovalType from UserFormsApprovalSetting As UFS Inner Join ModuleMaster As MM On MM.ModuleID = UFS.ModuleID And MM.CompanyID = UFS.CompanyID And ISNULL(MM.IsLocked,0)=0 and ISNULL(MM.IsDeletedTransaction,0)=0 Where Isnull(MM.ModuleID,0)<>0 AND MM.ModuleName ='" & Trim(ModuleName) & "' And MM.CompanyID = '" & companyID & "'"
                FillDataTable(dtCheck, str1)
                If dtCheck.Rows.Count > 0 Then
                    'ByRef ModuleID As Long, ByRef DisplayModuleName As string
                    IsApprovalRequired = True
                    IsVoucherItemApproved = "0"
                    ApprovalByUserID = 0
                    ModuleID = IIf(IsDBNull(dtCheck.Rows(0)("ModuleID")), 0, dtCheck.Rows(0)("ModuleID"))
                    DisplayModuleName = IIf(IsDBNull(dtCheck.Rows(0)("ModuleName")), 0, dtCheck.Rows(0)("ModuleName"))
                Else
                    IsApprovalRequired = False
                    IsVoucherItemApproved = "1"
                    ApprovalByUserID = Val(userID)
                End If
                dtCheck.Dispose()
            Else
                IsApprovalRequired = False
                IsVoucherItemApproved = "1"
                ApprovalByUserID = Val(userID)
            End If

        End Sub

        Private Shared ReadOnly Key As Byte() = Encoding.UTF8.GetBytes("9fxB7wYoJ6KD3E5pRQZha8T0r2NSclXq")
        Private Shared ReadOnly IV As Byte() = Encoding.UTF8.GetBytes("Df7Gh2Kl5Np8Rs1T")

        Public Function EncryptString(inputString As String) As String
            Using aesAlg As Aes = Aes.Create()
                aesAlg.Key = Key
                aesAlg.IV = IV
                Dim encryptor As ICryptoTransform = aesAlg.CreateEncryptor(aesAlg.Key, aesAlg.IV)
                Dim inputData As Byte() = Encoding.UTF8.GetBytes(inputString)
                Using msEncrypt As New MemoryStream()
                    Using csEncrypt As New CryptoStream(msEncrypt, encryptor, CryptoStreamMode.Write)
                        csEncrypt.Write(inputData, 0, inputData.Length)
                        csEncrypt.FlushFinalBlock()
                        Dim encryptedBytes As Byte() = msEncrypt.ToArray()
                        Return Convert.ToBase64String(encryptedBytes)
                    End Using
                End Using
            End Using
        End Function
        Public Function DecryptString(encryptedString As String) As String
            encryptedString = CleanBase64String(encryptedString.Replace("'", ""))
            Dim encryptedBytes As Byte() = Convert.FromBase64String(encryptedString)
            Using aesAlg As Aes = Aes.Create()
                aesAlg.Key = Key
                aesAlg.IV = IV
                Dim decryptor As ICryptoTransform = aesAlg.CreateDecryptor(aesAlg.Key, aesAlg.IV)
                Using msDecrypt As New MemoryStream(encryptedBytes)
                    Using csDecrypt As New CryptoStream(msDecrypt, decryptor, CryptoStreamMode.Read)
                        Using originalMemory As New MemoryStream()
                            csDecrypt.CopyTo(originalMemory)
                            Dim decryptedBytes As Byte() = originalMemory.ToArray()
                            Return Encoding.UTF8.GetString(decryptedBytes)
                        End Using
                    End Using
                End Using
            End Using
        End Function

        Private Shared Function CleanBase64String(base64 As String) As String
            base64 = base64.Trim().Replace(" "c, "+"c).Replace(ControlChars.Lf, "+"c).Replace(ControlChars.Cr, "+"c)
            Dim padding As Integer = 4 - (base64.Length Mod 4)
            If padding < 4 Then
                base64 &= New String("="c, padding)
            End If
            Return base64
        End Function

        Public Function ConvertObjectToJsonString(ByVal obj As Object) As String
            Dim serializer As New JavaScriptSerializer()
            Return serializer.Serialize(obj)
        End Function

        Public Class DataObject
            Public Property access_token As String
            Public Property token_type As String
            Public Property expires_in As Int64
        End Class
        Public Class IntegrationResponse
            Public Property Success As Boolean
            Public Property Message As String
            Public Property Data As Object
            Public Property HttpStatusCode As Integer
        End Class
        Public Function chkIntegrationStatus(tblname As String, refFieldName As String, FieldValue As String) As Boolean
            Dim dt As New DataTable
            str = "Select " & refFieldName & " From " & tblname & " Where " & refFieldName & " = '" & FieldValue & "' And ISNULL(IsDeletedTransaction,0) = 0 And ISNULL(IsIntegrated,0) = 1"
            FillDataTable(dt, str)
            If dt.Rows.Count > 0 Then
                Return True
            End If
            Return False
        End Function

#Region "Code For Visual studio 2010 or 2012"


        ' '' '' ''Public Sub FillChart(ByRef Chart As Chart, ByVal ChartType As SeriesChartType, ByVal SqlSelectQuery As String, Optional ByVal SqlStoredProcedure As String = "")
        ' '' '' ''    Try
        ' '' '' ''        Dim dt As New DataTable
        ' '' '' ''        FillDataTable(dt, SqlSelectQuery, SqlStoredProcedure)
        ' '' '' ''        Chart.DataSource = dt
        ' '' '' ''        Chart.Series(0).XValueMember = dt.Columns(1).ColumnName
        ' '' '' ''        Chart.Series(0).YValueMembers = dt.Columns(0).ColumnName
        ' '' '' ''        Chart.Series(1).XValueMember = dt.Columns(2).ColumnName
        ' '' '' ''        Chart.Series(1).YValueMembers = dt.Columns(0).ColumnName
        ' '' '' ''        Chart.Series(0).ChartType = ChartType

        ' '' '' ''        Chart.BackColor = Color.Gray
        ' '' '' ''        Chart.BackSecondaryColor = Color.WhiteSmoke
        ' '' '' ''        Chart.BackGradientStyle = GradientStyle.DiagonalRight
        ' '' '' ''        Chart.BorderlineDashStyle = ChartDashStyle.Solid
        ' '' '' ''        Chart.BorderSkin.SkinStyle = BorderSkinStyle.Emboss
        ' '' '' ''        Chart.BorderlineColor = Color.Gray

        ' '' '' ''        ' format the chart area
        ' '' '' ''        Chart.ChartAreas(0).BackColor = Color.Wheat
        ' '' '' ''        ' add and format the title
        ' '' '' ''        Chart.Titles.Add("Table Bound Chart")
        ' '' '' ''        Chart.Titles(0).Font = New Font("Utopia", 16)


        ' '' '' ''    Catch ex As Exception
        ' '' '' ''        MsgBox(ex.Message)
        ' '' '' ''    End Try
        ' '' '' ''End Sub

        ' Install-Package Newtonsoft.Json -Version 9.0.1
#End Region

#End Region
    End Class

End Namespace
