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

' To allow this Web Service to be called from script, using ASP.NET AJAX, uncomment the following line.
<System.Web.Script.Services.ScriptService()>
<WebService(Namespace:="http://tempuri.org/")>
<WebServiceBinding(ConformsTo:=WsiProfiles.BasicProfile1_1)>
<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()>
Public Class WebService_ContentSVGKeyLine
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
    '<WebMethod()> _
    Public Function HelloWorld() As String
        Return "Hello World"
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SaveSVGCoordinates(ByVal SvgCoordinates As Object, ByVal ContantName As String, ByVal grain As String, ByVal selUpType As String) As String

        Dim dt As New DataTable
        Dim KeyField, LedgerID As String
        Dim AddColName As String = "", AddColValue As String = "", TableName As String

        TableName = "ContentWiseKeylineCoordinates"
        str = "Delete from ContentWiseKeylineCoordinates where ContentType = '" & ContantName & "' and Grain = '" & grain & "' and UpsType = '" & selUpType & "'"
        db.ExecuteNonSQLQuery(str)

        Try
            TableName = "ContentWiseKeylineCoordinates"

            LedgerID = db.InsertDatatableToDatabase(SvgCoordinates, TableName, AddColName, AddColValue)

            If IsNumeric(LedgerID) = False Then

                Return "fail" & LedgerID
            End If

            KeyField = "Success"


        Catch ex As Exception
            KeyField = "fail"
        End Try

        Return KeyField
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SavePlanning(ByVal Planning As Object, ByVal contentName As String) As String

        Dim dt As New DataTable
        Dim KeyField, ID As String
        Dim AddColName As String = "", AddColValue As String = "", TableName As String


        TableName = "ContentWiseKeylineSheetPlanning"
        str = "Delete from ContentWiseKeylineSheetPlanning where ContentType = '" & contentName & "'"
        db.ExecuteNonSQLQuery(str)

        Try
            TableName = "ContentWiseKeylineSheetPlanning"
            ID = db.InsertDatatableToDatabase(Planning, TableName, AddColName, AddColValue)

            If IsNumeric(ID) = False Then

                Return "fail" & ID
            End If

            KeyField = "Success"


        Catch ex As Exception
            KeyField = "fail"
        End Try

        Return KeyField
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function SaveFormula(ByVal FormulaArr As Object, ByVal EditFlag As String, ByVal FormulaID As String) As String

        Dim dt As New DataTable
        Dim KeyField, str As String
        Dim AddColName As String = "", AddColValue As String = "", TableName As String

        Try
            TableName = "ContentWiseKeylineCoordinatesFormula"

            If EditFlag = True Then
                Dim wherecndtn = "ID=" & FormulaID & " "
                str = db.UpdateDatatableToDatabase(FormulaArr, TableName, AddColName, 0, wherecndtn)

                If str <> "Success" Then
                    Return "Error in Main: " & str
                End If
            Else
                str = db.InsertDatatableToDatabase(FormulaArr, TableName, AddColName, AddColValue)
                If IsNumeric(str) = False Then

                    Return "fail" & str
                End If
            End If
            KeyField = "Success"
        Catch ex As Exception
            KeyField = "fail"
        End Try

        Return KeyField
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function DeleteFormula(ByVal FormulaID As String) As String

        Dim dt As New DataTable
        Dim KeyField, str As String
        Dim TableName As String

        Try
            TableName = "ContentWiseKeylineCoordinatesFormula"
            str = "Delete from ContentWiseKeylineCoordinatesFormula where ID = " & FormulaID & " "
            db.ExecuteNonSQLQuery(str)

            KeyField = "Success"
        Catch ex As Exception
            KeyField = "fail"
        End Try

        Return KeyField
    End Function



    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function DeleteCoordinates(ByVal ContantName As String, ByVal grain As String, ByVal UpsType As String) As String

        Dim dt As New DataTable
        Dim KeyField, str As String
        Dim TableName As String = ""

        Try
            TableName = "ContentWiseKeylineCoordinates"
            str = "Delete from ContentWiseKeylineCoordinates where ContentType = '" & ContantName & "' and Grain = '" & grain & "' and UpsType = '" & UpsType & "'"
            db.ExecuteNonSQLQuery(str)

            KeyField = "Success"
        Catch ex As Exception
            KeyField = "fail"
        End Try

        Return KeyField
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function DeletePlanning(ByVal ContantName As String) As String

        Dim dt As New DataTable
        Dim KeyField, str As String

        Try
            'TableName = "ContentWiseKeylineCoordinates"
            str = "Delete from ContentWiseKeylineSheetPlanning where ContentType = '" & ContantName & "' "
            db.ExecuteNonSQLQuery(str)

            KeyField = "Success"
        Catch ex As Exception
            KeyField = "fail"
        End Try

        Return KeyField
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function CallDataForKeyline(ByVal ContentType As String, ByVal grain As String, ByVal UpsType As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        str = "Select UpsType, CoordinateID, Nullif(ShapeType,'') as ShapeType, nullif(ShapeName,'') as ShapeName , AddInX1, AddInY1, AddInX2, AddInY2,AddInXForUps,AddInYForUps, nullif(LineType,'') as LineType, nullif(LineStyles,'') as LineStyles , nullif(SheetSize,'') as SheetSize From ContentWiseKeylineCoordinates Where ContentType = '" & ContentType & "' and Grain = '" & grain & "' and UpsType = '" & UpsType & "' Order by CoordinateID"
        db.FillDataTable(dataTable, str)


        'If grain = "Across Grain" Then
        '    If dataTable.Rows.Count <= 0 Then
        '        str = "Select CoordinateID, Nullif(ShapeType,'') as ShapeType, nullif(ShapeName,'') as ShapeName ,AddInY1 as AddInX1,   AddInX1 as AddInY1, AddInY2 as AddInX2, AddInX2 as AddInY2,AddInYForUps as AddInXForUps,AddInXForUps as AddInYForUps, nullif(LineType,'') as LineType, nullif(LineStyles,'') as LineStyles , nullif(SheetSize,'') as SheetSize From ContentWiseKeylineCoordinates Where ContentType = '" & ContentType & "' and Grain = 'With Grain' and UpsType = '" & UpsType & "' Order by CoordinateID"
        '        db.FillDataTable(dataTable, str)
        '    End If
        'End If


        data.Message = db.ConvertDataTableTojSonString(dataTable)
        js.MaxJsonLength = 2147483647
        Return js.Serialize(data.Message)
    End Function


    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function CallData(ByVal ContentType As String, ByVal grain As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        str = "Select UpsType,CoordinateID, Nullif(ShapeType,'') as ShapeType, nullif(ShapeName,'') as ShapeName , AddInX1, AddInY1, AddInX2, AddInY2,AddInXForUps,AddInYForUps, nullif(LineType,'') as LineType, nullif(LineStyles,'') as LineStyles , nullif(SheetSize,'') as SheetSize From ContentWiseKeylineCoordinates Where ContentType = '" & ContentType & "' and Grain = '" & grain & "' Order by CoordinateID"
        db.FillDataTable(dataTable, str)


        If grain = "Across Grain" Then
            If dataTable.Rows.Count <= 0 Then
                str = "Select UpsType,CoordinateID, Nullif(ShapeType,'') as ShapeType, nullif(ShapeName,'') as ShapeName ,AddInY1 as AddInX1,   AddInX1 as AddInY1, AddInY2 as AddInX2, AddInX2 as AddInY2,AddInYForUps as AddInXForUps,AddInXForUps as AddInYForUps, nullif(LineType,'') as LineType, nullif(LineStyles,'') as LineStyles , nullif(SheetSize,'') as SheetSize From ContentWiseKeylineCoordinates Where ContentType = '" & ContentType & "' and Grain = 'With Grain' Order by CoordinateID"
                db.FillDataTable(dataTable, str)
            End If
        End If


        data.Message = db.ConvertDataTableTojSonString(dataTable)
        js.MaxJsonLength = 2147483647
        Return js.Serialize(data.Message)
    End Function


    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function LoadShapeWiseData(ByVal ContentType As String, ByVal grain As String, ByVal UpsType As String, ByVal ShapeName As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        str = "Select CoordinateID, Nullif(ShapeType,'') as ShapeType, nullif(ShapeName,'') as ShapeName , AddInX1, AddInY1, AddInX2, AddInY2,AddInXForUps,AddInYForUps, nullif(LineType,'') as LineType, nullif(LineStyles,'') as LineStyles , nullif(SheetSize,'') as SheetSize From ContentWiseKeylineCoordinates Where ContentType = '" & ContentType & "' and Grain = '" & grain & "' and UpsType = '" & UpsType & "' and ShapeName = '" & ShapeName & "' Order by CoordinateID"
        db.FillDataTable(dataTable, str)

        data.Message = db.ConvertDataTableTojSonString(dataTable)
        js.MaxJsonLength = 2147483647
        Return js.Serialize(data.Message)
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function GetShapeNames(ByVal ContentType As String, ByVal grain As String, ByVal UpsType As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        str = "Select DISTINCT ShapeName From ContentWiseKeylineCoordinates Where ContentType = '" & ContentType & "' and Grain = '" & grain & "' and UpsType = '" & UpsType & "' Order by ShapeName"
        db.FillDataTable(dataTable, str)

        data.Message = db.ConvertDataTableTojSonString(dataTable)
        js.MaxJsonLength = 2147483647
        Return js.Serialize(data.Message)
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function callPlanningData(ByVal ContentType As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        str = "Select FormulaID, ContentType, Grain, UpsType, SheetSize, Formula From ContentWiseKeylineSheetPlanning Where ContentType = '" & ContentType & "' Order by FormulaID"

        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
        js.MaxJsonLength = 2147483647
        Return js.Serialize(data.Message)
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function CallContent() As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        str = "Select Distinct ContentName From ContentWiseKeylineContentName"

        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
        js.MaxJsonLength = 2147483647
        Return js.Serialize(data.Message)
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function CallFormula() As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        str = "Select ID, Formula From ContentWiseKeylineCoordinatesFormula"

        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
        js.MaxJsonLength = 2147483647
        Return js.Serialize(data.Message)
    End Function


    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function CallFormulaX1(ByVal ContentType As String, ByVal grain As String, ByVal UpsType As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        str = "Select DISTINCT AddinX1 From ContentWiseKeylineCoordinates  Where ContentType = '" & ContentType & "' and Grain = '" & grain & "' and UpsType = '" & UpsType & "'"

        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
        js.MaxJsonLength = 2147483647
        Return js.Serialize(data.Message)
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function CallFormulaY1(ByVal ContentType As String, ByVal grain As String, ByVal UpsType As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        str = "Select DISTINCT AddinY1 From ContentWiseKeylineCoordinates  Where ContentType = '" & ContentType & "' and Grain = '" & grain & "' and UpsType = '" & UpsType & "'"

        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
        js.MaxJsonLength = 2147483647
        Return js.Serialize(data.Message)
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function CallFormulaX2(ByVal ContentType As String, ByVal grain As String, ByVal UpsType As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        str = "Select DISTINCT AddinX2 From ContentWiseKeylineCoordinates  Where ContentType = '" & ContentType & "' and Grain = '" & grain & "' and UpsType = '" & UpsType & "'"

        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
        js.MaxJsonLength = 2147483647
        Return js.Serialize(data.Message)
    End Function

    <WebMethod(EnableSession:=True)>
    <ScriptMethod(ResponseFormat:=ResponseFormat.Json)>
    Public Function CallFormulaY2(ByVal ContentType As String, ByVal grain As String, ByVal UpsType As String) As String
        Context.Response.Clear()
        Context.Response.ContentType = "application/json"

        str = "Select DISTINCT AddinY2 From ContentWiseKeylineCoordinates  Where ContentType = '" & ContentType & "' and Grain = '" & grain & "' and UpsType = '" & UpsType & "'"

        db.FillDataTable(dataTable, str)
        data.Message = db.ConvertDataTableTojSonString(dataTable)
        js.MaxJsonLength = 2147483647
        Return js.Serialize(data.Message)
    End Function

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

    Public Class HelloWorldData
        Public Message As [String]
    End Class
End Class