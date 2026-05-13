<%@ Page Title="" Language="VB" MasterPageFile="~/MasterPage_Main.master" AutoEventWireup="false" CodeFile="Keyline.aspx.vb" Inherits="KeyLine" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">

    <script src="https://bundle.run/blob-stream@0.1.3"></script>
    <script src="https://cdn.jsdelivr.net/npm/pdfkit@0.10.0/js/pdfkit.standalone.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/svg-to-pdfkit@0.1.8/source.js"></script>
    <!-- Auto width -->
</asp:Content>

<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <style>
        .custom-modal {
            width: 50vw;
            height: 50vh;
            position: fixed;
            top: 10%;
            left: 50%;
            transform: translate(-50%, -50%);
            background-color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
            overflow: hidden;
        }

        .modal-content {
            height: 100%;
            width: 100%;
            padding: 20px;
        }


        #fileButtonContainer {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-top: 10px;
            flex-wrap: wrap;
        }

        #fileInput {
            flex: 1;
            max-width: 350px;
            padding: 5px;
            border: 1px solid #ced4da;
            border-radius: 5px;
        }

        button {
            padding: 12px;
            border-radius: 8px;
            font-size: 14px;
            transition: all 0.2s ease-in-out;
            border: none;
        }

        .btn {
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        }

            .btn:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
                cursor: pointer;
            }

        #container {
            display: flex;
            justify-content: center;
            align-items: flex-start;
            margin-top: 10px;
            flex-wrap: wrap;
            gap: 15px;
        }

        #svgContainer {
            width: 100%;
            height: 300px;
            border: 2px solid #ddd;
            border-radius: 8px;
            background-color: #fafafa;
            padding: 10px;
            display: none;
        }

        #output {
            margin-top: 20px;
            font-family: 'Roboto', sans-serif;
            white-space: pre-wrap;
            background-color: #fafafa;
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 15px;
            color: #333;
        }



        .column-box {
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 10px;
            background-color: #f8f9fa;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
            margin-bottom: 20px;
        }

        @media (max-width: 768px) {
            #fileButtonContainer {
                flex-direction: column;
                align-items: stretch;
            }

            #fileInput, #BtnDraw {
                width: 100%;
                margin-bottom: 5px;
            }

            #container {
                flex-direction: column;
            }

            canvas {
                height: 300px;
            }
        }

        @media (max-width: 480px) {
            canvas {
                height: 200px;
            }
        }
        /* Container for both left and right sections */
        .custom-container {
            display: flex; /* Use flexbox for horizontal layout */
            width: 100%;
            padding: 0px;
            height: 60vh; /* Full viewport height */
        }

        /* Left side with grids */
        .custom-left-side {
            width: 66.66%; /* 2/3 of the screen width */
            padding: 0px;
            height: 65vh;
            overflow: hidden; /* Allows scrolling if content overflows */
            background-color: #f0f0f0; /* Optional background color */
        }

        /* Right side with SVG and zoom buttons */
        .custom-right-side {
            width: 33.33%; /* 1/3 of the screen width */
            padding: 0px;
            background-color: #fff; /* Optional background color */
            position: relative; /* For positioning the zoom buttons */
        }

        /* SVG wrapper */
        .custom-svg-wrapper {
            width: 100%;
            height: 500px; /* Fixed height for the SVG container */
            overflow: hidden; /* Prevents overflow outside the container */
            display: flex;
            padding: 0px;
            justify-content: center;
            align-items: center;
            position: relative; /* To position the zoom buttons */
        }

        /* Scrollable SVG area */
        .custom-scrollable-svg {
            width: 100%;
            height: 100%;
            padding: 0px;
            overflow: auto; /* Enables scrolling for the SVG */
        }

        .custom-horizontal-line {
            width: 100%;
            height: 2px; /* Thickness of the line */
            background-color: #000; /* Color of the line */
            margin: 20px 0; /* Space above and below the line */
        }

        #zoom-in, #zoom-out {
            float: right;
            margin: 10px;
            padding: 10px;
            font-size: 16px;
            cursor: pointer;
        }
        .custom-success-notify {
    background-color: rgba(0, 128, 0, 0.7); /* Semi-transparent green */
    color: white; /* Text color */
    border: 1px solid #006600; /* Border color */
    border-radius: 5px; /* Rounded corners */
    padding: 10px; /* Padding for content */
    font-family: Arial, sans-serif;
}

.custom-error-notify {
    background-color: rgba(255, 0, 0, 0.7); /* Semi-transparent red */
    color: white; /* Text color */
    border: 1px solid #b30000; /* Border color */
    border-radius: 5px; /* Rounded corners */
    padding: 10px; /* Padding for content */
    font-family: Arial, sans-serif;
}

    </style>

    <div class="container-fluid px-3">
        <div class="row">
            <!-- First Row: File Input, Content Type/Name, and Grain -->
            <div class="col-md-8 mb-3 column-box">
                <div class="row">
                    <div class="col-md-4 mb-2">
                        <label for="fileInput" class="form-label font-12">File Input</label>
                        <input type="file" id="fileInput" accept=".svg" class="form-control">
                    </div>
                    <div class="col-md-4 mb-2">
                        <label for="TxtContentType" class="form-label font-12">Content Type/Name</label>
                        <div id="TxtContentType" class="form-control bg-light"></div>
                    </div>
                    <div class="col-md-4 mb-2">
                        <label for="Grain" class="form-label font-12">Grain</label>
                        <div id="Grain" class="form-control bg-light"></div>
                    </div>
                </div>
                <div class="row">
                    <div class="col-md-4 mb-2">
                        <label for="UpsType" class="form-label font-12">Ups Type</label>
                        <div id="UpsType" class="form-control bg-light"></div>
                    </div>
                    <div class="col-md-4 mb-2">
                        <label for="SheetSize" class="form-label font-12">Sheet Size</label>
                        <div id="SheetSize" class="form-control bg-light"></div>
                    </div>
                    <div class="col-md-4 mb-2">
                        <label for="Grain" class="form-label font-12">Shape Type</label>
                        <div id="ShapeName" class="form-control bg-light"></div>
                    </div>
                    <div class="col-md-4 mb-2">
                        <label for="AddInXForUps" class="form-label font-12">AddInXForUps</label>
                        <input id="AddInXForUps" type="text" class="forTextBox" />
                    </div>
                    <div class="col-md-4 mb-2">
                        <label for="AddInYForUps" class="form-label font-12">AddInYForUps</label>
                        <input id="AddInYForUps" type="text" class="forTextBox" />
                    </div>
                    <div class="col-md-8">
                        <div class="d-grid gap-2">
                            <button type="button" id="BtnDraw" class="btn btn-success">Draw SVG</button>
                            <button type="button" id="BtnLoadData" class="btn btn-primary">Load Data</button>
                            <%--<button type="button" id="BtnDrawFromData" class="btn btn-success">Draw From Data</button>--%>
                            <button type="button" id="BtnDownload" class="btn btn-secondary">Download</button>
                            <button type="button" id="BtnShowSVG" class="btn btn-success">Show SVG</button>
                            <button type="button" id="Save_Coordinates" class="btn btn-primary" onclick="SaveCoordinates()">Save Coordinates</button>
                            <button type="button" id="BtnCoordinatesDelete" class="btn btn-danger">Delete Coordinates</button>
                            <button type="button" id="Load" class="btn btn-primary" onclick="LoadShapeWiseData()">Add Shape</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Second Column: Formulas, Save, and Delete -->

            <div class="col-md-4 column-box">
                <label for="Formulas" class="form-label font-12">Formulas</label>
                <div id="Formulas" class="form-control bg-light mb-3"></div>


                <div class="d-grid gap-2">
                    <button type="button" id="BtnFormulaSave" class="btn btn-success">Save Formula</button>
                    <button type="button" id="BtnFormulaDelete" class="btn btn-danger">Delete Formula</button>
                </div>
            </div>



        </div>
        <div class="d-grid gap-3">
            <button type="button" id="BtnAddButton" class="btn btn-success">Add Planning</button>
            <button type="button" id="BtnLoadPlanning" class="btn btn-secondary">Load Planning</button>
            <button type="button" id="BtnSavePlanning" class="btn btn-primary">Save Planning</button>
            <button type="button" id="BtnDeletePlanning" class="btn btn-danger">Delete Planning</button>
            <button type="button" id="BtnShowDrawnSVG" class="btn btn-secondary" style="float: right">Show Drawn SVG</button>
        </div>
        <div class="custom-horizontal-line"></div>

        <div class="custom-container">
            <!-- Left side with two grids -->
            <div class="custom-left-side">

                <div id="KeylineGrid" class="mt-4"></div>
            </div>

            <!-- Right side with the SVG and zoom buttons -->
            <div class="custom-right-side">
                <!-- Zoom buttons -->
                <button id="zoom-in">+</button>
                <button id="zoom-out">-</button>
                <div id="svg-container" class="custom-svg-wrapper">
                    <div class="custom-scrollable-svg">
                        <svg id="mysvg">
                            <g id="svg-group" transform="scale(1)">
                                <line x1="10" y1="10" x2="300" y2="10" stroke="black" />
                                <path d="M10 10 H 300 V 300 H 10 Z" stroke="black" stroke-width=".1" fill="transparent" />
                            </g>
                        </svg>
                    </div>
                </div>


            </div>
        </div>
        <div class="custom-horizontal-line"></div>

        <div id="SheetPlanningGrid" class="mt-4"></div>






        <%--<div id="output"></div>--%>
        <%--<div id="svgContainer" hidden></div>--%>
        <div class="modal fade" id="largemodal" tabindex="-1" role="dialog">
            <div class="modal-dialog custom-modal" role="document" style="max-width: 80%; height: 80%;">
                <div class="modal-content" style="height: 100%;">
                    <div class="DialogBoxCustom" style="float: left; border-top-left-radius: 4px; border-top-right-radius: 4px;">
                        <strong>Detailed SVG</strong>
                        <a href="javascript:void(0);" class="iconRightDbox btn-danger" data-dismiss="modal">
                            <span data-dismiss="modal" style="font-weight: 900; margin-right: 8px">X</span>
                        </a>
                    </div>
                    <div class="modal-body" style="overflow-y: auto; height: calc(100% - 50px);">
                        <div id="popContenerContentJobt" style="display: block; padding-top: 0px; padding-left: 0px;">
                            <div id="FieldCntainerRowJob" class="rowcontents clearfix" style="padding-top: 0px; padding-left: 0px">
                                <div class="tab-content" style="margin-bottom: 0em">
                                    <div role="tabpanel" class="tab-pane animated fadeInRight active" id="ReqGridJob">
                                        <div class="col-lg-12 col-md-12 col-sm-12 col-xs-12">
                                            <!-- Your SVG container -->
                                            <svg id="mysvg"
                                                style="background-color: white; width: 100%; height: 100%;"
                                                viewBox="0 0 500 500"
                                                preserveAspectRatio="xMidYMid meet">
                                                <g transform="scale(3.7795275591)">
                                                    <line />
                                                    <path d="" stroke="black" stroke-width=".1" fill="transparent" />
                                                    <text id="txt" x="5" y="100" style="font-size: 5px"></text>
                                                </g>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <script src="CustomJS/KeyLine.js?<%=System.Configuration.ConfigurationManager.AppSettings("Version")%>"></script>
</asp:Content>

