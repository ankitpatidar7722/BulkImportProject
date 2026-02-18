Imports System.Data
Imports System.Data.SqlClient
Imports System.IO
Imports System.Net
Imports System.Net.Mail
Imports System.Net.NetworkInformation
Imports System.Threading.Tasks
Imports System.Web.Script.Serialization
Imports Connection
Imports Connection.DBConnection
Imports Microsoft.Reporting.WebForms
Imports Org.BouncyCastle.Crypto

Partial Class Login
    Inherits System.Web.UI.Page

    ReadOnly db As New DBConnection
    ReadOnly db_Con As New DBConnection_CompanyLogin

    Private Sub btnlogin_Click(sender As Object, e As EventArgs) Handles btnlogin.Click

        Dim user As String = Request.Form("txt_user")
        Dim pass As String = Request.Form("txt_password")
        Dim SelFYear As String = Request.Form("txtfyear")

        Dim DBType As String = ""

        ' Validate inputs
        If Trim(user) = "" Then
            ClientScript.RegisterStartupScript(Page.[GetType](), "validation", "<script language='javascript'>alert('Please enter user name')</script>")
            Exit Sub
        End If

        If Trim(pass) = "" Then
            'ClientScript.RegisterStartupScript(Page.[GetType](), "validation", "<script language='javascript'>alert('Please enter password')</script>")
            'Exit Sub
        End If

        Dim Version As String = "New"
        Dim str As String = ""
        Dim str1 As String = ""
        Dim dt As New DataTable
        Dim dt1 As New DataTable
        Dim UUIDDatatable As New DataTable
        Dim LastLoginDT As New DataTable
        Dim UUID As String = ""
        Dim UnderUserID As String = ""

        Try
            DBType = System.Configuration.ConfigurationManager.AppSettings("DBTYPE")
            If IIf(IsDBNull(DBType), "", DBType) = "" Then DBType = "MSSQL"

            ' STEP 1: Validate Username and Password
            If Version = "New" Then
                If DBType = "MYSQL" Then
                    str = "SELECT UA.UserID, UA.UserName, UA.Password, UA.UnderUserID, UA.FYear, UA.CompanyID, UA.BranchID, UA.IsAdmin,CCM.CompanyName, CCM.APIBaseURL, CCM.APIAuthenticationURL, CCM.APIIntegrationRequired, (SELECT ModuleName FROM UserModuleAuthentication WHERE UserID=UA.UserID AND CompanyID=UA.CompanyID AND IFNULL(CanView,0)=1 AND IFNULL(IsHomePage,0)=1 LIMIT 1) AS HomePage, IFNULL(CCM.IsGstApplicable,1) AS IsGstApplicable, IFNULL(CCM.IsVatApplicable,0) AS IsVatApplicable, IFNULL(CCM.DefaultTaxLedgerTypeName,'GST') AS DefaultTaxLedgerTypeName, IFNULL(CCM.IsEinvoiceApplicable,0) AS IsEinvoiceApplicable, NULLIF(CCM.CurrencyHeadName,'') AS CurrencyHeadName, NULLIF(CCM.CurrencyChildName,'') AS CurrencyChildName, NULLIF(CCM.CurrencyCode,'') AS CurrencyCode, NULLIF(CCM.CurrencySymboliconRef,'') AS CurrencySymboliconRef, CCM.TaxApplicableBranchWise, CCM.EstimationRoundOffDecimalPlace, CCM.PurchaseRoundOffDecimalPlace, CCM.InvoiceRoundOffDecimalPlace, CCM.CostEstimationMethodType, IFNULL(CCM.OTPVerificationFeatureEnabled,0) AS OTPVerificationFeatureEnabled " &
                      "FROM UserMaster AS UA INNER JOIN CompanyMaster AS CCM ON CCM.CompanyID=UA.CompanyID WHERE IFNULL(UA.IsBlocked,0)=0 AND IFNULL(UA.Password,'')='" & db.ChangePassword(Trim(pass)) & "' AND UA.UserName='" & Trim(user) & "'"
                Else
                    str = "SELECT UA.UserID, UA.UserName, UA.Password, UA.UnderUserID, UA.FYear, UA.CompanyID, UA.BranchID, UA.IsAdmin, CCM.CompanyName, CCM.APIBaseURL, CCM.APIAuthenticationURL, CCM.APIIntegrationRequired, (SELECT TOP 1 ModuleName FROM UserModuleAuthentication WHERE UserID=UA.UserID And CompanyID=UA.CompanyID And ISNULL(CanView,0)=1 And ISNULL(IsHomePage,0)=1) AS HomePage, ISNULL(CCM.IsGstApplicable, 1) As IsGstApplicable, ISNULL(CCM.IsVatApplicable, 0) As IsVatApplicable, ISNULL(CCM.DefaultTaxLedgerTypeName,'GST') AS DefaultTaxLedgerTypeName, ISNULL(CCM.IsEinvoiceApplicable, 0) As IsEinvoiceApplicable, NULLIF(CCM.CurrencyHeadName,'') AS CurrencyHeadName, NULLIF(CCM.CurrencyChildName,'') AS CurrencyChildName, NULLIF(CCM.CurrencyCode,'') AS CurrencyCode, NULLIF(CCM.CurrencySymboliconRef,'') AS CurrencySymboliconRef, CCM.TaxApplicableBranchWise, CCM.EstimationRoundOffDecimalPlace,CCM.PurchaseRoundOffDecimalPlace, CCM.InvoiceRoundOffDecimalPlace,CCM.CostEstimationMethodType,ISNULL(CCM.OTPVerificationFeatureEnabled, 0) AS OTPVerificationFeatureEnabled " &
                          " From UserMaster AS UA INNER JOIN CompanyMaster AS CCM ON UA.CompanyID=CCM.CompanyID WHERE ISNULL(UA.IsBlocked,0)=0 AND ISNULL(UA.IsDeletedUser,0)=0 AND UA.UserName='" & Trim(user) & "'"
                End If
            Else
                str = "SELECT * FROM User_Master AS UM WHERE ISNULL(UM.Is_Blocked,0)=0 AND UM.User_Name='" & Trim(user) & "' AND ISNULL(UM.Password,'')='" & db.ChangePassword(Trim(pass)) & "'"
            End If

            db.FillDataTable(dt, str)

            If db.dbConnectionError.Trim() <> "" Then
                ClientScript.RegisterStartupScript(Page.[GetType](), "validation", "<script language='javascript'>alert('Database Connection Error: " & db.dbConnectionError.Replace("'", "\'") & "')</script>")
                Exit Sub
            End If

            ' STEP 2: Check if User Exists
            If dt.Rows.Count = 0 Then
                ClientScript.RegisterStartupScript(Page.[GetType](), "validation", "<script language='javascript'>alert('Invalid username or password.')</script>")
                Exit Sub
            End If

            ' STEP 3: Verify Password (for MSSQL without password in query)
            If DBType <> "MYSQL" Then
                Dim dbPassword As String = IIf(IsDBNull(dt.Rows(0)("Password")), "", dt.Rows(0)("Password").ToString())
                If dbPassword <> db.ChangePassword(Trim(pass)) Then
                    ClientScript.RegisterStartupScript(Page.[GetType](), "validation", "<script language='javascript'>alert('Invalid username or password.')</script>")
                    Exit Sub
                End If
            End If

            ' Get User and Company Details
            Dim UserID As Integer = Convert.ToInt32(dt.Rows(0)("UserID"))
            Dim CompanyID As Integer = Convert.ToInt32(dt.Rows(0)("CompanyID"))
            Dim BranchID As Integer = Convert.ToInt32(dt.Rows(0)("BranchID"))
            UnderUserID = IIf(IsDBNull(dt.Rows(0)("UnderUserID")), "0", dt.Rows(0)("UnderUserID").ToString())

            ' STEP 4: Get or Generate UUID (Device Identifier)
            If Request.Cookies("UUID_Cookie") IsNot Nothing Then
                UUID = Request.Cookies("UUID_Cookie").Value
            Else
                UUID = GenerateUUID()
                Dim uuidCookie As New HttpCookie("UUID_Cookie")
                uuidCookie.Value = UUID
                uuidCookie.Expires = DateTime.Now.AddDays(365) ' 1 year expiry
                Response.Cookies.Add(uuidCookie)
            End If

            ' STEP 5: Get Current Login Information
            Dim currentIP As String = GetClientIP()
            Dim currentLocation As String = GetUserLocation(currentIP)
            Dim currentURL As String = Request.Url.AbsoluteUri

            ' STEP 6: Check OTP Verification Feature
            Dim OTPVerificationEnabled As Boolean = Convert.ToBoolean(IIf(IsDBNull(dt.Rows(0)("OTPVerificationFeatureEnabled")), False, dt.Rows(0)("OTPVerificationFeatureEnabled")))

            If OTPVerificationEnabled Then
                ' Get Device Registration Details
                Dim getDeviceQuery As String = "SELECT DeviceID, UUID, UserValid, RegisteredDate FROM CompanyRegisteredDevices WHERE UUID = '" & UUID.Replace("'", "''") & "' AND UserID = " & UserID & " AND CompanyID = " & CompanyID & " AND ISNULL(IsDeletedTransaction, 0) = 0"
                db.FillDataTable(UUIDDatatable, getDeviceQuery)

                ' Get Last Login Information
                Dim getLastLoginQuery As String = "SELECT TOP 1 SessionID, MachineID, ISNULL(UserLocation,'') as UserLocation, Narration, LogInTime FROM UserLoginInfo WHERE UserID = " & UserID & " AND CompanyID = " & CompanyID & " ORDER BY SessionID DESC"
                db.FillDataTable(LastLoginDT, getLastLoginQuery)

                ' STEP 7: Determine if OTP is Required

                Dim needsOTP As Boolean = False

                ' STEP 7.1: Fetch Company Static IP
                Dim dtStaticIP As New DataTable()
                db.FillDataTable(dtStaticIP, "SELECT ISNULL(CompanyStaticIP,'') AS CompanyStaticIP FROM CompanyMaster WHERE CompanyID = " & CompanyID)

                Dim CompanyStaticIP As String = ""
                If dtStaticIP.Rows.Count > 0 Then
                    CompanyStaticIP = dtStaticIP.Rows(0)("CompanyStaticIP").ToString().Trim()
                End If

                ' STEP 7.2: If Current IP Matches Company Static IP => Skip OTP
                If CompanyStaticIP <> "" AndAlso currentIP = CompanyStaticIP Then
                    needsOTP = False
                Else
                    ' Device record exists?
                    If UUIDDatatable.Rows.Count > 0 Then
                        Dim isDeviceValid As Boolean = Convert.ToBoolean(IIf(IsDBNull(UUIDDatatable.Rows(0)("UserValid")), False, UUIDDatatable.Rows(0)("UserValid")))

                        If Not isDeviceValid Then
                            ' Device not validated → OTP Required
                            needsOTP = True
                        Else
                            ' Device is validated → Check Environment Change
                            If LastLoginDT.Rows.Count > 0 Then
                                Dim lastIP As String = IIf(IsDBNull(LastLoginDT.Rows(0)("MachineID")), "", LastLoginDT.Rows(0)("MachineID").ToString().Trim())
                                Dim lastUserLocationName As String = IIf(IsDBNull(LastLoginDT.Rows(0)("UserLocation")), "", LastLoginDT.Rows(0)("UserLocation").ToString().Trim())
                                Dim lastURL As String = IIf(IsDBNull(LastLoginDT.Rows(0)("Narration")), "", LastLoginDT.Rows(0)("Narration").ToString().Trim())

                                ' STEP 7.3: If any change detected → OTP Required
                                If lastIP <> currentIP OrElse lastUserLocationName <> currentLocation OrElse lastURL <> currentURL Then
                                    needsOTP = True
                                Else
                                    needsOTP = False
                                End If
                            Else
                                ' First-time login → OTP Required
                                needsOTP = True
                            End If
                        End If
                    Else
                        ' New Device → OTP Required
                        needsOTP = True
                    End If
                End If




                ' STEP 8: Generate and Send OTP if Required
                If needsOTP Then
                    Dim otp As String = GenerateOTP()

                    If UUIDDatatable.Rows.Count > 0 Then
                        ' Update existing device record
                        Dim updateDeviceQuery As String = "UPDATE CompanyRegisteredDevices SET OTP = '" & otp.Replace("'", "''") & "', RegisteredDate = GETDATE(), UserValid = 0, ModifiedBy = " & UserID & ", ModifiedDate = GETDATE() WHERE UUID = '" & UUID.Replace("'", "''") & "' And UserID = " & UserID & " AND CompanyID = " & CompanyID
                        db.ExecuteNonSQLQuery(updateDeviceQuery)
                    Else
                        ' Insert new device record
                        Dim insertDeviceQuery As String = "INSERT INTO CompanyRegisteredDevices (UUID, RegisteredDate, OTP, UserValid, CompanyID, BranchID, UserID, FYear, IsLocked, CreatedBy, CreatedDate, IsDeletedTransaction) VALUES (" &
                        "'" & UUID.Replace("'", "''") & "', GETDATE(), '" & otp.Replace("'", "''") & "', 0, " & CompanyID & ", " & BranchID & ", " & UserID & ", '" & IIf(Trim(SelFYear) = "F Year" Or Trim(SelFYear) = "", dt.Rows(0)("FYear").ToString(), SelFYear).Replace("'", "''") & "', 0, " & UserID & ", GETDATE(), 0)"
                        db.ExecuteNonSQLQuery(insertDeviceQuery)
                    End If

                    ' Send OTP via Email

                    SendOTPEmail(CompanyID, UserID, otp, currentIP, currentLocation)

                    ClientScript.RegisterStartupScript(Page.[GetType](), "validation", "<script language='javascript'>alert('OTP has been sent to your registered email. Please verify to continue.');</script>")
                    Exit Sub
                End If
            End If

            ' STEP 9: OTP Not Required or Already Validated - Proceed with Login

            ' Get Subscription Details
            str1 = "SELECT NULLIF(SSM.ClientCode,'') AS ClientCode, NULLIF(SSM.ClientName,'') AS ClientName, NULLIF(SSM.ClientAddress,'') AS ClientAddress, NULLIF(SSM.MessageforClient,'') AS MessageforClient, NULLIF(SSM.StatusDescription,'') AS StatusDescription, SSM.CompanyID,ISNULL(SSD.SubscriptionMainID, 0) As SubscriptionMainID, Replace(Convert(VARCHAR(13), SSD.startDate, 106), ' ', '-') AS startDate, Replace(Convert(VARCHAR(13), SSD.renewDate, 106), ' ', '-') AS renewDate " &
                   " FROM SubscriptionStatusMain AS SSM INNER JOIN SubscriptionStatusDetails AS SSD ON SSM.CompanyID = SSD.CompanyID AND ISNULL(SSD.IsDeletedTransaction, 0) = 0 WHERE SSM.CompanyID = " & CompanyID
            db.FillDataTable2(dt1, str1)

            ' STEP 10: Set Session Variables
            Session("UserID") = UserID
            Session("UserName") = dt.Rows(0)("UserName").ToString()
            Session("IsValid") = True

            If Trim(SelFYear) = "F Year" Or Trim(SelFYear) = "" Then
                Session("FYear") = dt.Rows(0)("FYear").ToString()
                Session("ReportFYear") = dt.Rows(0)("FYear").ToString()
            Else
                Session("FYear") = SelFYear
                Session("ReportFYear") = SelFYear
            End If

            Session("IsAdmin") = dt.Rows(0)("IsAdmin").ToString()
            Session("CompanyID") = CompanyID
            Session("APIIntegrationRequired") = IIf(IsDBNull(dt.Rows(0)("APIIntegrationRequired")), "False", dt.Rows(0)("APIIntegrationRequired")).ToString()
            Session("CompanyName") = dt.Rows(0)("CompanyName").ToString()
            Session("BranchID") = BranchID
            Session("IsGstApplicable") = IIf(IsDBNull(dt.Rows(0)("IsGstApplicable")), "True", dt.Rows(0)("IsGstApplicable")).ToString()
            Session("IsVatApplicable") = IIf(IsDBNull(dt.Rows(0)("IsVatApplicable")), "False", dt.Rows(0)("IsVatApplicable")).ToString()
            Session("DefaultTaxLedgerTypeName") = IIf(IsDBNull(dt.Rows(0)("DefaultTaxLedgerTypeName")), "GST", dt.Rows(0)("DefaultTaxLedgerTypeName")).ToString()
            Session("IsEinvoiceApplicable") = IIf(IsDBNull(dt.Rows(0)("IsEinvoiceApplicable")), "False", dt.Rows(0)("IsEinvoiceApplicable")).ToString()
            Session("CurrencyHeadName") = IIf(IsDBNull(dt.Rows(0)("CurrencyHeadName")), "Rupee", dt.Rows(0)("CurrencyHeadName")).ToString()
            Session("CurrencyChildName") = IIf(IsDBNull(dt.Rows(0)("CurrencyChildName")), "Paisa", dt.Rows(0)("CurrencyChildName")).ToString()
            Session("CurrencyCode") = IIf(IsDBNull(dt.Rows(0)("CurrencyCode")), "INR", dt.Rows(0)("CurrencyCode")).ToString()
            Session("CurrencySymboliconRef") = IIf(IsDBNull(dt.Rows(0)("CurrencySymboliconRef")), "", dt.Rows(0)("CurrencySymboliconRef")).ToString()
            Session("TaxApplicableBranchWise") = IIf(IsDBNull(dt.Rows(0)("TaxApplicableBranchWise")), "False", dt.Rows(0)("TaxApplicableBranchWise")).ToString()
            Session("EstimationRoundOffDecimalPlace") = IIf(IsDBNull(dt.Rows(0)("EstimationRoundOffDecimalPlace")), "2", dt.Rows(0)("EstimationRoundOffDecimalPlace")).ToString()
            Session("PurchaseRoundOffDecimalPlace") = IIf(IsDBNull(dt.Rows(0)("PurchaseRoundOffDecimalPlace")), "2", dt.Rows(0)("PurchaseRoundOffDecimalPlace")).ToString()
            Session("InvoiceRoundOffDecimalPlace") = IIf(IsDBNull(dt.Rows(0)("InvoiceRoundOffDecimalPlace")), "2", dt.Rows(0)("InvoiceRoundOffDecimalPlace")).ToString()
            Session("CostEstimationMethodType") = IIf(IsDBNull(dt.Rows(0)("CostEstimationMethodType")), "Material+Process", dt.Rows(0)("CostEstimationMethodType")).ToString()
            Session("DBType") = DBType
            Session("Version") = Version

            System.Configuration.ConfigurationManager.AppSettings("CompanyName") = Session("CompanyName")
            System.Configuration.ConfigurationManager.AppSettings("FYear") = Session("FYear")

            ' STEP 11: Insert Login Information
            Dim insertLoginQuery As String = "INSERT INTO UserLoginInfo (MachineID,UserLocation, UserID, CompanyID, Narration, LogInTime, IsSessionExpired, BranchID, ProductionUnitID) VALUES (" &
            "'" & currentIP.Replace("'", "''") & "', '" & currentLocation.Replace("'", "''") & "', " & UserID & ", " & CompanyID & ", '" & currentURL.Replace("'", "''") & "', GETDATE(),0, " & BranchID & ", 0)"
            db.ExecuteNonSQLQuery(insertLoginQuery)

            ' Get the SessionID
            Session("SessionID") = db.GetColumnValue("MAX(SessionID)", "UserLoginInfo", "UserID=" & UserID & " AND CompanyID=" & CompanyID)

            ' STEP 12: Write Cookie
            WriteCookie()

            ' STEP 13: Determine Home Page
            Dim formURL As String = IIf(IsDBNull(dt.Rows(0)("HomePage")), "", dt.Rows(0)("HomePage").ToString())
            If formURL = "" Then formURL = "Home.aspx"

            ' STEP 14: Update Indus Company Authentication (if applicable)
            Try
                Dim constring As String = "Data Source=13.200.122.70,1433;Initial Catalog=Indus;Persist Security Info=True;User ID=INDUS;Password=Param@99811"
                Using conn As New SqlClient.SqlConnection(constring)
                    conn.Open()
                    Dim query As String = "UPDATE Indus_Company_Authentication_For_Web_Modules SET LastLoginDateTime = GETDATE() WHERE CompanyUserID = @CompanyUserID"
                    Using cmd As New SqlClient.SqlCommand(query, conn)
                        cmd.Parameters.AddWithValue("@CompanyUserID", Session("CompanyName"))
                        cmd.ExecuteNonQuery()
                    End Using
                End Using
            Catch ex As Exception
                ' Log error but continue with login
                ' You can add logging here if needed
            End Try

            ' STEP 15: Redirect to Home Page
            Response.Redirect(formURL, False)
            Context.ApplicationInstance.CompleteRequest()

        Catch ex As Exception
            ClientScript.RegisterStartupScript(Page.[GetType](), "validation", "<script language='javascript'>alert('Error: " & ex.Message.Replace("'", "\'") & "')</script>")
        End Try
    End Sub

    Private Function GetUserLocation(ByVal ip As String) As String
        Try
            Dim url As String = "https://ipinfo.io/" & ip & "/json"
            Dim request As WebRequest = WebRequest.Create(url)
            request.Timeout = 3000
            Dim response As WebResponse = request.GetResponse()

            Using reader As New StreamReader(response.GetResponseStream())
                Dim json As String = reader.ReadToEnd()

                Dim serializer As New JavaScriptSerializer()
                Dim result = serializer.Deserialize(Of Dictionary(Of String, Object))(json)

                Dim city As String = If(result.ContainsKey("city"), result("city").ToString(), "")
                Dim region As String = If(result.ContainsKey("region"), result("region").ToString(), "")
                Dim country As String = If(result.ContainsKey("country"), result("country").ToString(), "")

                Return city & ", " & region & ", " & country
            End Using

        Catch ex As Exception
            Return "Unknown"
        End Try
    End Function


    Private Function GetClientIP() As String
        Dim ip As String = HttpContext.Current.Request.ServerVariables("HTTP_X_FORWARDED_FOR")

        If Not String.IsNullOrEmpty(ip) Then
            Dim parts = ip.Split(","c)
            If parts.Length > 0 Then
                Return parts(0).Trim()
            End If
        End If

        ip = HttpContext.Current.Request.ServerVariables("REMOTE_ADDR")
        If String.IsNullOrEmpty(ip) Then
            ip = HttpContext.Current.Request.UserHostAddress
        End If

        Return ip
    End Function


    Function GenerateOTP() As String
        Dim rand As New Random()
        Return rand.Next(100000, 999999).ToString()
    End Function
    Public Function GenerateUUID() As String
        Return Guid.NewGuid().ToString()
    End Function

    Public Sub SendOTPEmail(CompanyID As Integer, UserID As Integer, otp As String, currentIP As String, currentLocation As String)
        ' Fetch Company Email (Receiver)
        Dim dtCompany As New DataTable()
        db.FillDataTable(dtCompany, "SELECT CompanyName, ISNULL(Email,'') AS Email FROM CompanyMaster WHERE CompanyID = " & CompanyID)

        If dtCompany.Rows.Count = 0 Then
            ClientScript.RegisterStartupScript(Page.GetType(), "alert",
    "<script>alert('Company record not found.');</script>")
            Exit Sub
        End If

        Dim companyEmail As String = dtCompany.Rows(0)("Email").ToString().Trim()
        Dim companyName As String = dtCompany.Rows(0)("CompanyName").ToString().Trim()

        If companyEmail = "" Then
            ClientScript.RegisterStartupScript(Page.GetType(), "alert",
    "<script>alert('Company Email is missing. Please update Email in Company Master.');</script>")
            Exit Sub
        End If

        ' Fetch User SMTP Config (Sender)
        Dim dtUser As New DataTable()
        db.FillDataTable(dtUser, "SELECT ISNULL(UserName,'') AS UserName, ISNULL(EmailID,'') AS EmailID, ISNULL(smtpUserPassword,'') AS smtpUserPassword, ISNULL(smtpServer,'') AS smtpServer, ISNULL(smtpServerPort,0) AS smtpServerPort, ISNULL(smtpUseSSL,0) AS smtpUseSSL FROM UserMaster WHERE UserID = " & UserID)

        If dtUser.Rows.Count = 0 Then
            ClientScript.RegisterStartupScript(Page.GetType(), "alert",
    "<script>alert('SMTP user details not found. Please configure Email settings in User Master.');</script>")
            Exit Sub
        End If

        Dim UserName As String = dtUser.Rows(0)("UserName").ToString().Trim()
        Dim fromEmail As String = dtUser.Rows(0)("EmailID").ToString().Trim()
        Dim fromPassword As String = dtUser.Rows(0)("smtpUserPassword").ToString().Trim()
        Dim smtpServer As String = dtUser.Rows(0)("smtpServer").ToString().Trim()
        Dim smtpPort As Integer = Convert.ToInt32(dtUser.Rows(0)("smtpServerPort"))
        Dim smtpSSL As Boolean = Convert.ToBoolean(dtUser.Rows(0)("smtpUseSSL"))

        ' Validate SMTP Settings
        If fromEmail = "" Or fromPassword = "" Or smtpServer = "" Or smtpPort = 0 Then
            ClientScript.RegisterStartupScript(Page.GetType(), "alert",
    "<script>alert('SMTP configuration is incomplete. Please update EmailID, Password, Server, and Port in User Master.');</script>")
            Exit Sub
        End If

        If Not IsValidEmail(companyEmail) Then
            ClientScript.RegisterStartupScript(Page.GetType(), "alert",
    "<script>alert('Company Email is not in a valid format: " & companyEmail & "');</script>")
            Exit Sub
        End If

        If Not IsValidEmail(fromEmail) Then
            ClientScript.RegisterStartupScript(Page.GetType(), "alert",
    "<script>alert('SMTP sender Email is not valid: " & fromEmail & "');</script>")
            Exit Sub
        End If

        ' Use HTML numeric character references for emoji to avoid source encoding issues
        Dim lockEmoji As String = "&#x1F512;"   ' 🔐
        Dim warnEmoji As String = "&#x26A0;&#xFE0F;" ' ⚠️

        Dim mailBody As String =
        "<html>" &
        "<body style=""font-family:Segoe UI,Arial,sans-serif; background:#f5f6fa; padding:20px;"">" &
        "<div style=""max-width:600px; margin:auto; background:white; padding:25px; border-radius:10px; box-shadow:0 0 10px rgba(0,0,0,0.1);"">" &
        "<h2 style=""margin-top:0; color:#2d3436;"">" & lockEmoji & " Security Alert: Login Verification Required</h2>" &
        "<p style=""font-size:14px; color:#2d3436;"">Dear " & System.Web.HttpUtility.HtmlEncode(companyName) & " Admin,</p>" &
        "<p style=""font-size:14px; color:#2d3436;"">A new login attempt has been detected for your ERP account from an <b>unregistered device or network</b>. To ensure security, this device requires your approval.</p>" &
        "<p style=""font-size:14px; margin-bottom:12px;""><b>Please review the login details below:</b></p>" &
        "<div style=""border:1px solid #dcdde1; padding:15px; border-radius:8px; background:#f1f2f6;"">" &
        "<h3 style=""margin:0 0 10px 0; color:#0984e3;"">" & lockEmoji & " Login Request Details</h3>" &
        "<p style=""margin:5px 0; font-size:14px;""><b>User:</b> " & System.Web.HttpUtility.HtmlEncode(UserName) & "</p>" &
        "<p style=""margin:5px 0; font-size:14px;""><b>Verification Code (OTP):</b> " & System.Web.HttpUtility.HtmlEncode(otp) & "</p>" &
        "<p style=""margin:5px 0; font-size:14px;""><b>IP Address:</b> " & System.Web.HttpUtility.HtmlEncode(currentIP) & "</p>" &
        "<p style=""margin:5px 0; font-size:14px;""><b>Current Location:</b> " & System.Web.HttpUtility.HtmlEncode(currentLocation) & "</p>" &
        "</div><br/>" &
        "<div style=""border-left:4px solid #e17055; padding-left:15px;"">" &
        "<h3 style=""color:#d63031; margin-top:0;"">" & warnEmoji & " Important Security Notes</h3>" &
        "<p style=""font-size:14px; margin:6px 0;"">• Do <b>NOT</b> share this verification code with anyone.</p>" &
        "<p style=""font-size:14px; margin:6px 0;"">• Approve this login attempt only if you recognize and authorize the user.</p>" &
        "<p style=""font-size:14px; margin:6px 0;"">• If this login attempt is suspicious, we recommend taking immediate action and updating account security.</p>" &
        "</div><br/>" &
        "<p style=""font-size:14px; color:#2d3436;"">Regards,<br/><b>IndusAnalytics Security Team</b></p>" &
        "</div>" &
        "</body></html>"

        Try
            Dim smtp As New SmtpClient(smtpServer, smtpPort)
            smtp.Credentials = New NetworkCredential(fromEmail, fromPassword)
            smtp.EnableSsl = smtpSSL

            Dim mail As New MailMessage()
            mail.From = New MailAddress(fromEmail)
            mail.To.Add(companyEmail)

            ' Ensure UTF-8 encoding headers (so recipients render unicode correctly)
            mail.Subject = "Login OTP Verification"
            mail.SubjectEncoding = System.Text.Encoding.UTF8
            mail.BodyEncoding = System.Text.Encoding.UTF8
            mail.IsBodyHtml = True

            ' Create alternate view explicitly with UTF-8 and HTML content type
            mail.AlternateViews.Clear()
            Dim av As System.Net.Mail.AlternateView = System.Net.Mail.AlternateView.CreateAlternateViewFromString(mailBody, System.Text.Encoding.UTF8, System.Net.Mime.MediaTypeNames.Text.Html)
            mail.AlternateViews.Add(av)

            smtp.Send(mail)

            litOtpModalLabel.Text = "OTP sent to: " & System.Web.HttpUtility.HtmlEncode(companyEmail) & "<br>From: " & System.Web.HttpUtility.HtmlEncode(fromEmail)
            ScriptManager.RegisterStartupScript(Me, Me.GetType(), "ShowOTPAlert", "$(document).ready(function(){ $('#otpAlertBox').css('display','flex'); });", True)

        Catch ex As Exception
            ClientScript.RegisterStartupScript(Page.GetType(), "alert",
    "<script>alert('Mail sending failed: " & ex.Message.Replace("'", "") & "');</script>")
        End Try
    End Sub

    Private Function IsValidEmail(email As String) As Boolean
        Try
            Dim addr = New System.Net.Mail.MailAddress(email)
            Return addr.Address = email
        Catch
            Return False
        End Try
    End Function


    Private Sub form1_Load(sender As Object, e As EventArgs) Handles Me.Load
        Dim rawQuery As String = Request.QueryString("cuid")

        Dim cuid As String = ""
        Dim auth As String = ""
        Dim app As String = ""

        If Not String.IsNullOrEmpty(rawQuery) Then
            Dim parts As String() = rawQuery.Split(","c)
            For Each part As String In parts
                If part.StartsWith("auth=") Then
                    auth = db.DecryptString(part.Substring(5))
                ElseIf part.StartsWith("app=") Then
                    app = db.DecryptString(part.Substring(4))
                Else
                    cuid = db.DecryptString(part)
                End If
            Next
        End If
        If Not String.IsNullOrEmpty(cuid) AndAlso Not String.IsNullOrEmpty(auth) AndAlso Not String.IsNullOrEmpty(app) Then
            AuthenticateAndInitializeSession(cuid, auth, app)
            Exit Sub
        End If

        Dim DT As New DataTable
        Dim DefaultPage As String = ""
        DefaultPage = System.Configuration.ConfigurationManager.AppSettings("LoginPage")

        Dim Str = "Select LogoutPage From CompanyMaster"
        db.FillDataTable(DT, Str)

        ' Check if the action is logout
        If Request.QueryString("action") = "logout" Then
            ' Expire the session cookie
            Dim nameCookie As New HttpCookie("StrgSessionState") With {
            .Expires = DateAndTime.Now.AddDays(-1)
        }
            ' Add the Cookie to Browser
            Response.Cookies.Add(nameCookie)

            ' Clear and abandon the session
            Session.Clear()
            Session.Abandon()
            Session.RemoveAll()

            ' Redirect to login page
            Response.Redirect("Login.aspx")

        ElseIf Not IsPostBack AndAlso Session("CompanyUserID") Is Nothing AndAlso DT.Rows.Count > 0 AndAlso DT.Rows(0)("LogoutPage") = "CompanyLogin.aspx" Then
            ' Redirect to CompanyLogin.aspx if CompanyUserID is not in session
            Response.Redirect("CompanyLogin.aspx")
        ElseIf Not IsPostBack AndAlso Session("CompanyUserID") Is Nothing AndAlso DT.Rows.Count = 0 Then
            If DefaultPage <> "Login.aspx" Then
                Response.Redirect(DefaultPage)
            End If
        ElseIf Not Session("CompanyUserID") Is Nothing Then
            If Not Session("UserID") Is Nothing AndAlso Session("IsValid") = True Then
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


    Protected Sub WriteCookie()

        'Create a Cookie with a suitable Key.
        Dim nameCookie As New HttpCookie("StrgSessionState")
        nameCookie.SameSite = SameSiteMode.Strict
        'Set the Cookie value.
        nameCookie.Values("IsAdmin") = Session("IsAdmin").ToString()
        nameCookie.Values("APIIntegrationRequired") = Session("APIIntegrationRequired").ToString()
        nameCookie.Values("UserName") = Session("UserName").ToString()
        nameCookie.Values("CompanyID") = Session("CompanyID").ToString()
        nameCookie.Values("UserID") = Session("UserID").ToString()
        nameCookie.Values("FYear") = Session("FYear").ToString()
        nameCookie.Values("Version") = Session("Version").ToString()
        nameCookie.Values("ReportFYear") = Session("ReportFYear").ToString()
        nameCookie.Values("CompanyName") = Session("CompanyName").ToString()
        nameCookie.Values("SessionID") = Session("SessionID").ToString()
        nameCookie.Values("BranchID") = Session("BranchID").ToString()
        nameCookie.Values("IsGstApplicable") = Session("IsGstApplicable").ToString()
        nameCookie.Values("IsVatApplicable") = Session("IsVatApplicable").ToString()
        nameCookie.Values("DefaultTaxLedgerTypeName") = Session("DefaultTaxLedgerTypeName").ToString()
        nameCookie.Values("IsEinvoiceApplicable") = Session("IsEinvoiceApplicable").ToString()
        nameCookie.Values("CurrencyHeadName") = Session("CurrencyHeadName").ToString()
        nameCookie.Values("CurrencyChildName") = Session("CurrencyChildName").ToString()
        nameCookie.Values("CurrencyCode") = Session("CurrencyCode").ToString()
        nameCookie.Values("CurrencySymboliconRef") = Session("CurrencySymboliconRef").ToString()
        nameCookie.Values("TaxApplicableBranchWise") = Session("TaxApplicableBranchWise").ToString()
        nameCookie.Values("EstimationRoundOffDecimalPlace") = Session("EstimationRoundOffDecimalPlace").ToString()
        nameCookie.Values("PurchaseRoundOffDecimalPlace") = Session("PurchaseRoundOffDecimalPlace").ToString()
        nameCookie.Values("InvoiceRoundOffDecimalPlace") = Session("InvoiceRoundOffDecimalPlace").ToString()
        nameCookie.Values("CostEstimationMethodType") = Session("CostEstimationMethodType").ToString()
        nameCookie.Values("DBType") = Session("DBType").ToString()
        nameCookie.Values("IsValid") = Session("IsValid")


        ''nameCookie.Values("Token") = Session("token").ToString()

        'Set the Expiry date.
        nameCookie.Expires = DateTime.MaxValue

        'Add the Cookie to Browser.
        Response.Cookies.Add(nameCookie)
    End Sub

    Public Function ValidateLoginAPI(url As String, username As String, password As String) As String

        Dim response As String

        'Dim URL = "http://192.168.0.19:88/"
        'Dim URI As Uri = New Uri(requestUri)
        Dim request = WebRequest.Create(url)
        request.Method = "POST"
        Dim postData As String
        postData = "grant_type=password&username=" & username & "&password=" & password
        Dim encoding = New ASCIIEncoding()
        Dim byteArray = encoding.GetBytes(postData)
        request.ContentType = "application/x-www-form-urlencoded"
        request.ContentLength = byteArray.Length
        Dim dataStream As Stream = request.GetRequestStream()
        dataStream.Write(byteArray, 0, byteArray.Length)
        Dim webresponse As HttpWebResponse = TryCast(request.GetResponse, HttpWebResponse)

        Try
            Using responseStream = webresponse.GetResponseStream()
                Using reader As New StreamReader(responseStream)
                    response = reader.ReadToEnd()
                    Session("token") = Replace(Replace(response.Split(",")(0).ToString(), "{""access_token"":", ""), """", "")
                End Using
            End Using
        Catch ex As Exception
            Return ex.Message
        End Try

        Return response

    End Function

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
                Session("IsValid") = nameCookie.Values("IsValid")
            Else
                Dim Str = "Select LogoutPage From CompanyMaster"
                db.FillDataTable(DT, Str)

                If Not IsPostBack AndAlso Session("CompanyUserID") Is Nothing AndAlso DT.Rows.Count > 0 AndAlso DT.Rows(0)("LogoutPage") = "CompanyLogin.aspx" Then
                    ' Redirect to CompanyLogin.aspx if CompanyUserID is not in session
                    Response.Redirect("CompanyLogin.aspx")
                ElseIf Not IsPostBack AndAlso Session("CompanyUserID") Is Nothing AndAlso DT.Rows.Count > 0 AndAlso DT.Rows(0)("LogoutPage") = "Login.aspx" Then
                    'Response.Redirect("Login.aspx")
                ElseIf Not IsPostBack AndAlso Session("CompanyUserID") Is Nothing AndAlso DT.Rows.Count = 0 Then
                    If DefaultPage <> "Login.aspx" Then
                        Response.Redirect(DefaultPage)
                    End If
                End If

                'Response.Redirect("Login.aspx")
            End If
        Catch ex As Exception
            Response.Redirect(DefaultPage)
        End Try
    End Sub
    Protected Sub AuthenticateAndInitializeSession(user As String, pass As String, AppName As String)
        Dim dt As New DataTable()
        Dim Version As String = "New"

        Dim str As String = "SELECT CompanyUserID, Password, Conn_String, CompanyName, ISNULL(ApplicationBaseURL,'') AS ApplicationBaseURL " &
                        "FROM Indus_Company_Authentication_For_Web_Modules AS LT " &
                        "WHERE LT.CompanyUserID = '" & Trim(user) & "' " &
                        "AND ISNULL(LT.Password, '') = '" & Trim(pass) & "' " &
                        "AND ISNULL(NULLIF(LT.ApplicationName, ''), 'estimoprime') = '" & AppName & "'"

        db_Con.FillDataTable(dt, str)

        If dt.Rows.Count > 0 Then
            Dim row = dt.Rows(0)
            Session("CompanyUserID") = row("CompanyUserID").ToString()
            Session("Conn_String") = row("Conn_String").ToString()
            Session("CompanyName") = row("CompanyName").ToString()
            Session("Version") = Version

            Try
                System.Configuration.ConfigurationManager.AppSettings("CompanyName") = Session("CompanyName").ToString()
            Catch ex As Exception
            End Try

            Dim nameCookie1 As HttpCookie = Request.Cookies("StrgSessionState")
            If nameCookie1 IsNot Nothing Then
                If nameCookie1.Item("CompanyName") <> Session("CompanyName").ToString() Then
                    Response.Cache.SetExpires(Date.UtcNow.AddSeconds(-1))
                    Response.Cache.SetCacheability(HttpCacheability.NoCache)
                    Response.Cache.SetNoStore()

                    Dim nameCookie As New HttpCookie("StrgSessionState") With {
                    .Expires = DateTime.Now.AddDays(-1)
                }
                    Response.Cookies.Add(nameCookie)
                End If
            End If
        End If
    End Sub

End Class
