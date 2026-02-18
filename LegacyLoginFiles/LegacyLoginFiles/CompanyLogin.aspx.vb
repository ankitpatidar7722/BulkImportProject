Imports System.Data
Imports Connection
Imports Microsoft.VisualBasic.ApplicationServices
Partial Class CompanyLogin
    Inherits System.Web.UI.Page
    Dim db As New DBConnection_CompanyLogin
    Dim db_Con As New DBConnection

    Private Sub BtnLogin_Click(sender As Object, e As EventArgs) Handles BtnLogin.Click
        Dim user As String = Request.Form("inputEmail")
        Dim pass As String = Request.Form("inputPassword")
        If Trim(user) = "" Then
            ' MsgBox("Please enter user name")
            Exit Sub
        End If
        If Trim(pass) = "" Then
            ' MsgBox("Please enter password name")
            'Exit Sub
        End If
        Dim AppName As String = System.Configuration.ConfigurationManager.AppSettings("AppName")
        If AppName Is Nothing Then
            AppName = "estimoprime"
            'AppName = "estimo"
        End If
        Dim Version As String = "New"
        Dim str As String = ""
        Dim dt As New DataTable

        Try
            'str = "Select CompanyUserID, Password,Conn_String FROM Indus_Company_Authentication_For_Web_Modules As LT  Where LT.User_Name='" & Trim(user) & "'  And Isnull(LT.Password,'')='" & db.ChangePassword(Trim(pass)) & "' "
            str = "Select CompanyUserID, Password,Conn_String,CompanyName,ISNULL(ApplicationBaseURL,'') as ApplicationBaseURL FROM Indus_Company_Authentication_For_Web_Modules As LT  Where LT.CompanyUserID='" & Trim(user) & "'  And Isnull(LT.Password,'')='" & Trim(pass) & "' AND Isnull(NULLIF(LT.ApplicationName,''),'estimoprime')='" & AppName & "'"

            db.FillDataTable(dt, str)
            If dt.Rows.Count > 0 Then
                Session("CompanyUserID") = dt.Rows(0)("CompanyUserID").ToString
                Session("Conn_String") = dt.Rows(0)("Conn_String").ToString
                Session("CompanyName") = dt.Rows(0)("CompanyName").ToString
                Session("CompanyPassword") = dt.Rows(0)("Password").ToString
                Session("Version") = Version

                System.Configuration.ConfigurationManager.AppSettings("CompanyName") = Session("CompanyName")
                Dim nameCookie1 As HttpCookie = Request.Cookies("StrgSessionState")
                If nameCookie1 IsNot Nothing Then
                    If nameCookie1.Item("CompanyName").ToString() <> Session("CompanyName") Then
                        Response.Cache.SetExpires(Date.UtcNow.AddSeconds(-1))
                        Response.Cache.SetCacheability(HttpCacheability.NoCache)
                        Response.Cache.SetNoStore()

                        'Set the Expiry date.
                        Dim nameCookie As New HttpCookie("StrgSessionState") With {
                            .Expires = DateAndTime.Now.AddDays(-1)
                        }
                        'Add the Cookie to Browser.
                        Response.Cookies.Add(nameCookie)
                    End If
                End If
                'Dim AppSOSUrl = dt.Rows(0)("ApplicationBaseURL").ToString
                Dim AppSOSUrl = ""
                If AppSOSUrl = "" Then
                    Response.Redirect("Login.aspx")
                Else
                    Response.Redirect(AppSOSUrl + "?cuid=" + db_Con.EncryptString(user) + ",auth=" + db_Con.EncryptString(pass) + ",app=" + db_Con.EncryptString(AppName))
                End If
                Exit Sub
            Else
                ClientScript.RegisterStartupScript(Page.[GetType](), "validation", "<script language='javascript'>alert('You have entered incorrect company userid or password.')</script>")
            End If
        Catch ex As Exception
            'ClientScript.RegisterStartupScript(Page.[GetType](), "validation", "<script language='javascript'>alert(" & ex.Message & ")</script>")
            ClientScript.RegisterStartupScript(Page.[GetType](), "validation", "<script language='javascript'>alert('This is my error.')</script>")

        End Try
    End Sub
    Protected Sub Page_Load(sender As Object, e As EventArgs) Handles Me.Load
        Dim DT As New DataTable
        Dim DefaultPage As String = ""
        DefaultPage = System.Configuration.ConfigurationManager.AppSettings("LoginPage")

        Dim Str = "Select LogoutPage From CompanyMaster"
        db.FillDataTable(DT, Str)

        ' Check if the action is logout
        If Request.QueryString("action") = "logout" Then
            Session.Clear()
            Session.Abandon()
            Session.RemoveAll()
            Response.Redirect("CompanyLogin.aspx")
        ElseIf Not IsPostBack AndAlso Session("CompanyUserID") Is Nothing AndAlso DT.Rows.Count > 0 AndAlso DT.Rows(0)("LogoutPage") = "CompanyLogin.aspx" Then
            ' Redirect to CompanyLogin.aspx if CompanyUserID is not in session
            'Response.Redirect("CompanyLogin.aspx")
        ElseIf Not IsPostBack AndAlso Session("CompanyUserID") Is Nothing AndAlso DT.Rows.Count = 0 Then
            If DefaultPage <> "CompanyLogin.aspx" Then
                Response.Redirect(DefaultPage)
            End If
        ElseIf Not Session("CompanyUserID") Is Nothing Then
            If Not Session("UserID") Is Nothing Then
                Dim UserId As String = Convert.ToString(Session("UserID"))
                If UserId = "" Then
                    ReadCookie()
                End If
                Response.Redirect("Home.aspx")
            Else
                Dim UserId As String = Convert.ToString(Session("UserID"))
                If UserId = "" Then
                    ReadCookie()

                End If
            End If
        End If
    End Sub
    Protected Sub ReadCookie()
        'Fetch the Cookie using its Key.
        Dim nameCookie As HttpCookie = Request.Cookies("StrgSessionState")
        Dim DT As New DataTable
        Dim DefaultPage As String = ""
        DefaultPage = System.Configuration.ConfigurationManager.AppSettings("LoginPage")
        'If Cookie exists fetch its value.
        Try
            If nameCookie IsNot Nothing Then
                Session("UserName") = nameCookie.Item("UserName").ToString()
                Session("CompanyID") = nameCookie.Item("CompanyID").ToString()
                Session("CompanyID") = nameCookie.Item("CompanyID").ToString()
                Session("UserID") = nameCookie.Item("UserID").ToString()
                Session("FYear") = nameCookie.Item("FYear").ToString()
                Session("Version") = nameCookie.Item("Version").ToString()
                Session("CompanyName") = nameCookie.Item("CompanyName").ToString()
                Session("ReportFYear") = nameCookie.Item("ReportFYear").ToString()
                Session("SessionID") = nameCookie.Item("SessionID").ToString()
                Session("BranchID") = nameCookie.Item("BranchID").ToString()
                Session("IsGstApplicable") = nameCookie.Item("IsGstApplicable")
                Session("IsVatApplicable") = nameCookie.Item("IsVatApplicable")
                Session("DefaultTaxLedgerTypeName") = nameCookie.Item("DefaultTaxLedgerTypeName")
                Session("IsEinvoiceApplicable") = nameCookie.Item("IsEinvoiceApplicable")
                Session("CurrencyHeadName") = nameCookie.Item("CurrencyHeadName")
                Session("CurrencyChildName") = nameCookie.Item("CurrencyChildName")
                Session("CurrencyCode") = nameCookie.Item("CurrencyCode")
                Session("CurrencySymboliconRef") = nameCookie.Item("CurrencySymboliconRef")
                Session("TaxApplicableBranchWise") = nameCookie.Values("TaxApplicableBranchWise")
                Session("EstimationRoundOffDecimalPlace") = nameCookie.Values("EstimationRoundOffDecimalPlace")
                Session("PurchaseRoundOffDecimalPlace") = nameCookie.Values("PurchaseRoundOffDecimalPlace")
                Session("InvoiceRoundOffDecimalPlace") = nameCookie.Values("InvoiceRoundOffDecimalPlace")
                Session("CostEstimationMethodType") = nameCookie.Values("CostEstimationMethodType")
                Session("DBType") = nameCookie.Values("DBType")
            Else
                Dim Str = "Select LogoutPage From CompanyMaster"
                db.FillDataTable(DT, Str)

                If Not IsPostBack AndAlso Session("CompanyUserID") Is Nothing AndAlso DT.Rows.Count > 0 AndAlso DT.Rows(0)("LogoutPage") = "CompanyLogin.aspx" Then
                    ' Redirect to CompanyLogin.aspx if CompanyUserID is not in session
                    'Response.Redirect("CompanyLogin.aspx")
                ElseIf Not IsPostBack AndAlso Session("CompanyUserID") Is Nothing AndAlso DT.Rows.Count > 0 AndAlso DT.Rows(0)("LogoutPage") = "Login.aspx" Then
                    Response.Redirect("Login.aspx")
                ElseIf Not IsPostBack AndAlso Session("CompanyUserID") Is Nothing AndAlso DT.Rows.Count = 0 Then
                    If DefaultPage <> "CompanyLogin.aspx" Then
                        Response.Redirect(DefaultPage)
                    End If
                End If

                'Response.Redirect("Login.aspx")
            End If
        Catch ex As Exception
            Response.Redirect(DefaultPage)
        End Try
    End Sub
End Class
