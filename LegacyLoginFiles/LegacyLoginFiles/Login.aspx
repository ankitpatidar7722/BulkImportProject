<%@ Page Language="VB" AutoEventWireup="false" CodeFile="Login.aspx.vb" Inherits="Login" Async="true" %>

<!DOCTYPE html>

<html>

<head>
    <meta charset="UTF-8">
    <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">

    <title>Sign In | Indus Analytics</title>

    <link href="plugins/bootstrap/css/bootstrap.css" rel="stylesheet">
    <!-- Jquery Core Js -->
    <script src="../../plugins/jquery/jquery.min.js"></script>

    <!-- Bootstrap Core Js -->
    <script src="plugins/bootstrap/js/bootstrap.js"></script>

    <!-- Select Plugin Js -->
    <script src="plugins/bootstrap-select/js/bootstrap-select.js"></script>

    <!-- Favicon-->
    <%--    <link rel="icon" href="../../images/Indus logo.ico" type="image/x-icon">--%>

    <!-- font-awesome.css -->
    <%--    <link href="plugins/font-awesome/css/font-awesome.css" rel="stylesheet" />--%>
    <!-- Bootstrap Core Css -->
    <%--    <link href="../../plugins/bootstrap/css/bootstrap.css" rel="stylesheet">--%>

    <!-- Waves Effect Css -->
    <%--    <link href="../../plugins/node-waves/waves.css" rel="stylesheet" />--%>

    <!-- Animation Css -->
    <%--    <link href="../../plugins/animate-css/animate.css" rel="stylesheet" />--%>

    <!-- Custom Css -->
    <%--   <link href="../../css/style.css" rel="stylesheet">--%>

    <!-- Jquery Core Js -->
    <script src="../../plugins/jquery/jquery.min.js"></script>

    <!-- Bootstrap Core Js -->
    <%--    <script src="../../plugins/bootstrap/js/bootstrap.js"></script>--%>

    <!-- Waves Effect Plugin Js -->
    <%--    <script src="../../plugins/node-waves/waves.js"></script>--%>

    <!-- Validation Plugin Js -->
    <script src="../../plugins/jquery-validation/jquery.validate.js"></script>

    <!-- Custom Js -->
    <%--<script src="../../js/admin.js"></script>--%>
    <script src="../../js/pages/examples/sign-in.js"></script>

    <%-- DevExpress Control Grid --%>
    <link type="text/css" href="CustomCSS/dx.common.css" rel="stylesheet" />
    <link type="text/css" href="CustomCSS/dx.light.css" rel="stylesheet" />
    <%--Use for Export data --%>
    <script src="js/jszip.js"></script>
    <script src="js/dx.all.19.2.3.js"></script>
    <%-- DevExpress Control Grid --%>

    <%--<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- jQuery (Required for Bootstrap 4/5 Modals) -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <!-- Bootstrap CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <!-- jQuery -->
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

    <!-- jQuery Validate Plugin Include Karo -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery-validate/1.19.5/jquery.validate.min.js"></script>--%>

    <style>
        .otp-box {
            position: fixed;
            top: 2%; /* 10% from the top */
            left: 50%;
            transform: translateX(-50%); /* Horizontally center karega */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 400px;
            padding: 20px;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
        }

        .otp-content {
            display: flex;
            flex-direction: column;
            width: 100%;
            gap: 10px;
        }

            .otp-content input {
                width: 100%;
                padding: 10px;
            }

            .otp-content button {
                width: 100%;
            }

        .close-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            cursor: pointer;
            font-size: 20px;
            font-weight: bold;
        }

        body {
            font-family: 'Poppins', sans-serif;
            background: linear-gradient(to right, #e0f7fa, #80deea); /* Light teal gradient */
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            animation: fadeIn 1s ease-in-out; /* Fade-in effect */
        }

        @keyframes fadeIn {
            from {
                opacity: 0;
            }

            to {
                opacity: 1;
            }
        }

        .ImgLogo1 {
            display: block;
            width: 50%;
            /*            margin-bottom: 20px;*/
            transition: transform 0.3s ease;
        }

        .ImgLogo2 {
            display: none;
            width: 300px;
            /*            margin-bottom: 20px;*/
            transition: transform 0.3s ease;
        }

        .ImgLogo1:hover {
            transform: scale(1.1); /* Slight scale on hover */
        }

        .ImgLogo2:hover {
            transform: scale(1.1); /* Slight scale on hover */
        }

        .login-container {
            background: white;
            border-radius: 20px;
            padding: 40px 50px;
            max-width: 400px;
            width: 100%;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
            text-align: center;
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

            .login-container:hover {
                transform: translateY(-5px);
                box-shadow: 0 20px 40px rgba(0, 128, 128, 0.3); /* Teal shadow */
            }

        h2 {
            color: #008080; /* Teal color */
            /*font-size: 2rem;*/
            margin-bottom: 20px;
            letter-spacing: 1px;
        }

        .input-field {
            width: 100%;
            padding: 15px;
            margin: 15px 0;
            border: 2px solid rgba(0, 128, 128, 0.3);
            border-radius: 25px;
            background: rgba(0, 128, 128, 0.05);
            color: #2F4F4F; /* Dark slate text */
            outline: none;
            /*font-size: 1rem;*/
            transition: border 0.3s ease, box-shadow 0.3s ease;
        }

            .input-field:focus {
                border-color: #FF6F61; /* Light coral when focused */
                box-shadow: 0 0 10px rgba(255, 111, 97, 0.5);
            }

        .login-btn {
            width: 100%;
            padding: 15px;
            border: none;
            border-radius: 25px;
            background: linear-gradient(45deg, #008080, #00bcd4); /* Teal gradient background */
            /*font-size: 1.2rem;*/
            font-weight: 600;
            color: white;
            cursor: pointer;
            margin-top: 20px;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
        }

            .login-btn::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                height: 100%;
                width: 100%;
                background: rgba(255, 111, 97, 0.2); /* Light coral overlay */
                transform: scale(0);
                transition: transform 0.3s ease;
                border-radius: 25px;
                z-index: 0;
            }

            .login-btn:hover::after {
                transform: scale(1);
            }

            .login-btn:hover {
                background: linear-gradient(45deg, #FF6F61, #FF8A65); /* Change to light coral gradient on hover */
                box-shadow: 0 10px 20px rgba(255, 111, 97, 0.5);
                color: white; /* Maintain text color on hover */
            }

        .links {
            margin-top: 20px;
            font-size: 14px;
            color: #2F4F4F;
        }

            .links a {
                color: #FF6F61;
                text-decoration: none;
                transition: color 0.3s ease;
            }

                .links a:hover {
                    color: #008080; /* Hover effect back to teal */
                }

        /*.logo {
            width: 50%;
            margin-bottom: 20px;
            transition: transform 0.3s ease;
        }*/

        /*.logo:hover {
                transform: scale(1.1);*/ /* Slight scale on hover */
        /*}*/



        @media (max-width: 768px) {
            .ImgLogo1 {
                display: none;
            }

            .ImgLogo2 {
                display: block;
                width: 300px;
            }

            .login-container {
                padding: 40px;
            }

            /*.logo {
                width: 50%;
            }*/

            h2 {
                font-size: 2rem;
            }
        }

        @media (max-width: 480px) {
            .ImgLogo1 {
                display: none;
            }

            .ImgLogo2 {
                display: block;
                width: 300px;
            }

            .login-container {
                width: 90%;
                padding: 30px;
            }

            .input-field, .login-btn {
                font-size: 1rem;
            }

            /*.logo {
                width: 120%;
            }*/

            h2 {
                font-size: 2rem;
            }
        }
    </style>
</head>

<body>
    <%--    <img src="CompanyLogo/<%=System.Configuration.ConfigurationManager.AppSettings("CompanyName")%>.png" alt="Company Logo" class="logo ImgLogo1" />--%>
    <img src="images/White new logo1.png" alt="Company Logo" class="logo ImgLogo1" />
    <div class="login-container">
        <%--        <img src="CompanyLogo/<%=System.Configuration.ConfigurationManager.AppSettings("CompanyName")%>.png" alt="Company Logo" class="logo ImgLogo2" />--%>
        <img src="images/White new logo1.png" alt="Company Logo" class="logo ImgLogo2" />
        <!-- Placeholder Logo -->
        <h2>User Login</h2>
        <form id="form1" runat="server">
            <select name="cars" id="SelFYearList" class="input-field" onchange="SetSelectedText(SelFYearList)">
                <option value="F Year">F Year</option>
                <option value="2022-2023">2022-2023</option>
                <option value="2023-2024">2023-2024</option>
                <option value="2024-2025">2024-2025</option>
                <option value="2025-2026">2025-2026</option>
                <option value="2026-2027">2026-2027</option>
            </select>
            <input type="hidden" id="txtfyear" runat="server" class="input-field" name="txtfyear" placeholder="txtfyear">

            <%--<input type="text" runat="server" id="txt_user" class="input-field" placeholder="Username" required="required" />--%>
            <input type="text" id="txt_user" runat="server" class="input-field" name="username" placeholder="Username" required autofocus>
            <%--<input type="password" runat="server" id="txt_password" class="input-field" placeholder="Password" required="required" />--%>
            <input type="password" id="txt_password" runat="server" class="input-field" name="password" placeholder="Password">
            <%--            <button type="submit" class="login-btn">Login</button>--%>
            <asp:Button ID="btnlogin" runat="server" class="login-btn" Text="Sign in" />
        </form>
        <div class="links">
            <%--<a href="#">Forgot Password?</a> | <a href="#">Sign Up</a>--%>
        </div>
    </div>

    <%-- <div class="login-box">
        <div class="logo">
            <a href="javascript:void(0);"><b><%=System.Configuration.ConfigurationManager.AppSettings("CompanyName")%></b></a>
        </div>
        <div class="card">
            <div class="body">
                <form id="form1" runat="server">
                    <div class="msg">Sign in to start your session</div>
                    <div class="input-group">
                        <span class="input-group-addon">
                            <i class="fa fa-user" style="margin-top:45px"></i>
                        </span>

                        <select name="cars" id="SelFYearList" class="form-control" style="border: 1px solid black; margin-bottom: 15px" onchange="SetSelectedText(SelFYearList)">
                            <option value="F Year">F Year</option>
                            <option value="2022-2023">2022-2023</option>
                            <option value="2023-2024">2023-2024</option>
                            <option value="2024-2025">2024-2025</option>
                            <option value="2025-2026">2025-2026</option>
                            <option value="2026-2027">2026-2027</option>
                        </select>

                        <input type="hidden" id="txtfyear" runat="server" class="form-control" name="txtfyear" placeholder="txtfyear">

                        <div class="form-line">
                            <input type="text" id="txt_user" runat="server" class="form-control" name="username" placeholder="Username" required autofocus onfocus="startSpeechRecognition()">
                        </div>
                    </div>
                    <div class="input-group">
                        <span class="input-group-addon">
                            <i class="fa fa-lock"></i>
                        </span>
                        <div class="form-line">
                            <input type="password" id="txt_password" runat="server" class="form-control" name="password" placeholder="Password" onfocus="startSpeechRecognition()">
                        </div>
                    </div>

                    <div class="row">
                        <div class="col-xs-8 p-t-5">
                            <input type="checkbox" runat="server" id="rememberme" name="rememberme" class="filled-in chk-col-pink">
                            <label for="rememberme">Remember Me</label>
                        </div>
                        <div class="col-xs-4">
                            <asp:Button ID="btnlogin" runat="server" class="btn btn-block bg-pink waves-effect" Text="Sign in" />
                        </div>
                    </div>
                    <div class="row m-t-15 m-b--20">
                        <div class="col-xs-6">
                            <a href="#">Register Now!</a>
                        </div>
                        <div class="col-xs-6 align-right">
                            <a href="#">Forgot Password?</a>
                        </div>
                    </div>
                </form>
            </div>
        </div>
        <div class="logo">
            <small>@Indus Analytics</small>
        </div>
    </div>--%>

    <%--<div class="modal fade" id="otpModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="otpModalLabel" aria-hidden="true">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                   <h6 class="modal-title"><asp:Literal ID="litOtpModalLabel" runat="server"></asp:Literal></h6>

                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <input id="txtOtp" class="form-control" placeholder="Enter OTP" type="text" />
                    <span id="otpError" style="color: red; display: none;"></span>

                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" id="BtnSubmit">Submit</button>
                </div>
            </div>
        </div>
    </div>--%>

    <div class="otp-box otp-alert" id="otpAlertBox" style="display: none; width: 400px;" aria-hidden="true">
        <span class="close-btn" onclick="closeOtpAlert()">&times;</span>

        <h4 id="otpTitle">
            <asp:Literal ID="litOtpModalLabel" runat="server"></asp:Literal>
        </h4>

        <div class="otp-content">
            <input id="txtOtp" class="form-control" placeholder="Enter OTP" type="text" />
            <button type="button" class="btn btn-primary" id="BtnSubmit">Submit</button>
        </div>
    </div>

    <%--<div class="modal fade" id="otpModal" role="dialog" tabindex="-1" aria-labelledby="otpModalLabel" aria-hidden="true" style="margin-left: 0px;">
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                    <h4 class="modal-title" id="otpModalLabel">
                        <asp:Literal ID="litOtpModalLabel" runat="server"></asp:Literal>
                    </h4>
                </div>
                <div class="modal-body">
                    <input id="txtOtp" class="form-control" placeholder="Enter OTP" type="text" />
                    <span id="otpError" style="color: red; display: none;"></span>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" id="BtnSubmit">Submit</button>
                </div>
            </div>
        </div>
    </div>--%>

    <script type="text/javascript">
        function SetSelectedText(ddl) {
            var selectedText = ddl.options[ddl.selectedIndex].innerHTML;
            document.getElementById("txtfyear").value = selectedText;
        }
    </script>
    <script type="text/javascript">
        function SetSelectedText(ddl) {
            var selectedText = ddl.options[ddl.selectedIndex].innerHTML;
            document.getElementById("txtfyear").value = selectedText;
        }

        function showOtpAlert() {
            let otpBox = document.getElementById("otpAlertBox");

            otpBox.style.display = "flex";
        }

        function closeOtpAlert() {
            let otpBox = document.getElementById("otpAlertBox");
            otpBox.style.display = "none";
        }
    </script>

    <script type="text/javascript">

        //$.ajax({
        //    type: "POST",
        //    crossDomain: true,
        //    async: false,
        //    url: "http://localhost:57214/token",
        //    data: { grant_type: "password", username: "Selvi RM", password: "" },
        //    contentType: "application/x-www-form-urlencoded",
        //}).done(function (results) {
        //    localStorage.setItem("token", results.access_token);
        //});


        window.onload = function () {
            document.getElementById("txt_user").focus();
            if (localStorage) {
                localStorage.removeItem('activeID');
                localStorage.removeItem('activeName');
            }
        };

        //window.onbeforeunload = function () {            
        //    return '';
        //};

        function preventBack() {
            window.history.forward();
        }
        setTimeout("preventBack()", 0);
        window.onunload = function () { null };

    </script>
    <script src="CustomJS/Login.js"></script>
</body>
</html>
