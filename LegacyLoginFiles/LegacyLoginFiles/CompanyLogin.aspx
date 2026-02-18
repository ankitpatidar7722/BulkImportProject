<%@ Page Language="VB" AutoEventWireup="false" CodeFile="CompanyLogin.aspx.vb" Inherits="CompanyLogin" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">

    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="ie=edge" />
       
    <%--    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css" integrity="sha384-Gn5384xqQ1aoWXA+058RXPxPg6fy4IWvTNh0E263XmFcJlSAwiGgFAW/dAiS6JXm" crossorigin="anonymous" />
    --%>

    <title>Company Login</title>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/js/bootstrap.min.js" integrity="sha384-JZR6Spejh4U02d8jOt6vLEHfe/JQGiRRSQQxSfFWpi1MquVdAyjUar5+76PVCmYl" crossorigin="anonymous"></script>

    <%--    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.0/css/bootstrap.min.css" />--%>
    <script src="https://ajax.googleapis.com/ajax/libs/jquery/3.4.1/jquery.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.4.0/js/bootstrap.min.js"></script>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.2/jszip.min.js"></script>
    <%--    <link href="https://fonts.googleapis.com/css?family=Cinzel&display=swap" rel="stylesheet" />--%>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap" rel="stylesheet" /> 

    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
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
            font-size: 2rem;
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
            font-size: 1rem;
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
            font-size: 1.2rem;
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



    <script type="text/javascript">
        //window.onload = function () {
        //    document.getElementById("username").focus();
        //    if (localStorage) {
        //        localStorage.removeItem('activeID');
        //        localStorage.removeItem('activeName');
        //    }
        //};
        function preventBack() {
            window.history.forward();
        }
        setTimeout("preventBack()", 0);
        window.onunload = function () { null };
    </script>
</head>

<body>
    <%--<div class="container-fluid">
        <div class="row main-content text-center" style="background-color: #008080">
            <div class="col-12 col-xs-12 col-sm-12 col-md-12 col-lg-12 text-center company__info">
                <span class="company__logo">
                    <h2><span class="fa fa-android"></span></h2>
                </span>

                <img src="images/White new logo.png" alt="Logo" class="logo" />
            </div>
            <div class="col-12 col-xs-12 col-sm-12 col-md-12 col-lg-12 login_form ">
                <div class="container-fluid">
                    <div>
                        <h2 style="margin-top: 30px;">Welcome</h2>
                    </div>
                    <div class="">
                        <form runat="server" control="" class="form-group">
                            <div class="col-12 col-xs-12 col-sm-12 col-md-12 col-lg-12">
                                <asp:TextBox runat="server" ID="inputEmail" class="form__input" placeholder="Company User ID" required="" autofocus=""></asp:TextBox>
                                <span class="span" id="pemail"></span>
                            </div>
                            <div class="col-12 col-xs-12 col-sm-12 col-md-12 col-lg-12">
                                <asp:TextBox runat="server" ID="inputPassword" class="form__input" placeholder="Enter Password" autofocus="" TextMode="Password"></asp:TextBox>
                            </div>
                            <div class="col-12 col-xs-12 col-sm-12 col-md-12 col-lg-12">
                                <input type="checkbox" name="remember_me" id="remember_me" class="" />
                                <label for="remember_me">Remember Me!</label>
                            </div>
                            <div class="col-12 col-xs-12 col-sm-12 col-md-12 col-lg-12">
                                <asp:Button runat="server" Text="Login" ID="BtnLogin" class="btn" />
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>--%>

    <img src="images/White new logo1.png" alt="Company Logo" class="logo ImgLogo1" />
    <div class="login-container">
        <img src="images/White new logo1.png" alt="Company Logo" class="logo ImgLogo2" />
        <!-- Placeholder Logo -->
        <h2>Welcome</h2>
        <form id="form1" runat="server">
            <%--<input type="text" runat="server" id="txt_user" class="input-field" placeholder="Username" required="required" />--%>
            <asp:TextBox runat="server" ID="inputEmail" class="input-field" placeholder="Company Name" required="" autofocus=""></asp:TextBox>
            <%--<input type="password" runat="server" id="txt_password" class="input-field" placeholder="Password" required="required" />--%>
            <asp:TextBox runat="server" ID="inputPassword" class="input-field" placeholder="Password" autofocus="" TextMode="Password"></asp:TextBox>
            <%--            <button type="submit" class="login-btn">Login</button>--%>
            <asp:Button runat="server" Text="Login" ID="BtnLogin" class="login-btn" />
        </form>
        <div class="links">
            <%--<a href="#">Forgot Password?</a> | <a href="#">Sign Up</a>--%>
        </div>
    </div>

    <%--<script src="login.js"></script>--%>
</body>

</html>
