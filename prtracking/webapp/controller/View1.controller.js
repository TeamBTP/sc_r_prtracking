sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    'sap/ui/core/Fragment',
    'sap/ui/model/Filter',
    'sap/ui/model/FilterOperator',
    "scr/prtracking/utils/Formatter",
    "sap/m/MessageBox",
    "sap/ui/table/library",
    "sap/ui/export/Spreadsheet",
    "sap/ui/model/Sorter",
    "sap/ui/table/TablePersoController",
    'sap/ui/Device',
    'sap/ui/core/library',
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, JSONModel, Fragment, Filter, FilterOperator, Formatter, MessageBox, library, Spreadsheet, Sorter, TablePersoController, Device, coreLibrary) {
        "use strict";
        var ValueState = coreLibrary.ValueState;
        var SortOrder = library.SortOrder;
        return Controller.extend("scr.prtracking.controller.View1", {
            Formatter: Formatter,
            onInit: function () {
                this.statusCode = 0;
                // this.getOwnerComponent().getRouter().getRoute("RouteView1").attachPatternMatched(this.selectionChange(true), this);
                sap.ui.getCore().getConfiguration().setLanguage("EN");
                this.getUserInfo();
                this._mViewSettingsDialogs = {};
                //Array de dialogs, aqui se guardaran todos los dialogs que usaremos para no tener que crearlos cada vez que se llamen
                this.Dialogs = {}
                //Aqui se guardara el dialog que se este usando en ese momento en la App
                this.Dialog;
                this.filters = {};
                this.orderFilters = [];
                this.flagValUser = false;
                this._oTPC = new TablePersoController({
                    table: this.byId("idTablePR")
                });
                this.oLoaderData = new sap.m.BusyDialog({
                    showCancelButton: false,
                    title: this._get_i18n("dialog_loading")
                });
                this.oLoaderApp = new sap.m.BusyDialog({
                    showCancelButton: false,
                    title: this._get_i18n("dialog_loading_data")
                });
                this.userConnected = "usuarioDefecto"
                this.plantCompany = {};
                this.BUKRS = "";
                this.WERKS = "";
                this.EKORG = "";
                this.LGORT = "";
                this.EKGRP = "";
                this.oPRSelect = "";
                let toDay = new Date();
                let firstDayMonth = new Date(toDay.getFullYear(), toDay.getMonth() - 1, toDay.getDate());
                let lastDayMonth = new Date(toDay.getFullYear(), toDay.getMonth() + 1, toDay.getDate());
                this.firstDayMonth = this._formatDate(firstDayMonth);
                this.lastDayMonth = this._formatDate(lastDayMonth);
                let oFilters = {
                    deliveryDateFrom: this.firstDayMonth,
                    deliveryDateTo: this.lastDayMonth,
                }
                let oModel = new JSONModel(oFilters);
                this.getOwnerComponent().setModel(oModel, "filterModel");
                let oInfo = {
                    countPR: 0,
                    countPRVisible: 0,
                    countAttachment: 0
                }
                oModel = new JSONModel(oInfo);
                this.getOwnerComponent().setModel(oModel, "infoModel");
                this.loaderModels()
                let sFragmentId = this.getView().createId("idFragmentFilterBar");
                let oCBCompanyCode = sap.ui.core.Fragment.byId(sFragmentId, "idCBCompanyCode");
                oCBCompanyCode.setFilterFunction(function (sTerm, oItem) {
                    return oItem.getText().match(new RegExp(sTerm, "i")) || oItem.getKey().match(new RegExp(sTerm, "i"));
                });
                let oCBPlant = sap.ui.core.Fragment.byId(sFragmentId, "idCBPlant");
                oCBPlant.setFilterFunction(function (sTerm, oItem) {
                    return oItem.getText().match(new RegExp(sTerm, "i")) || oItem.getKey().match(new RegExp(sTerm, "i"));
                });
                // let oCBPurchOrg = sap.ui.core.Fragment.byId(sFragmentId, "idCBPurchOrg");
                // oCBPurchOrg.setFilterFunction(function (sTerm, oItem) {
                //     return oItem.getText().match(new RegExp(sTerm, "i")) || oItem.getKey().match(new RegExp(sTerm, "i"));
                // });
                let oCBStoLocation = sap.ui.core.Fragment.byId(sFragmentId, "idCBStoLocation");
                oCBStoLocation.setFilterFunction(function (sTerm, oItem) {
                    return oItem.getText().match(new RegExp(sTerm, "i")) || oItem.getKey().match(new RegExp(sTerm, "i"));
                });

                this.tempData = [];
                this.aPRsSelected = [];
                this.getOwnerComponent().getModel("infoModel").setProperty("/EX_ORIGEN", this.byId("idSData").getState());
                let oCBRequestType = sap.ui.core.Fragment.byId(sFragmentId, "idCBRequestType");
                oCBRequestType.setSelectedKeys(["COMMENT", "OTHER"]);

            },
            //--------------------------------->FUNCIONES COMUNES<----------------------------------

            //Funcion para obtener el texto en el idioma que se requiere
            _get_i18n: function (key) {
                var oController = this;
                return oController.getOwnerComponent().getModel("i18n").getResourceBundle().getText(key);
            },
            _formatDate: function (date) {
                var d = new Date(date),
                    month = '' + (d.getMonth() + 1),
                    day = '' + d.getDate(),
                    year = d.getFullYear();

                if (month.length < 2)
                    month = '0' + month;
                if (day.length < 2)
                    day = '0' + day;

                return [year, month, day].join('');
            },
            changeLanguage: function (oEvent) {
                if (oEvent.getSource().getProperty("state")) {
                    sap.ui.getCore().getConfiguration().setLanguage("EN");
                } else {
                    sap.ui.getCore().getConfiguration().setLanguage("ES");
                }
            },
            getUserInfo: async function () {
                let that = this;
                await fetch("/myext")
                    .then(res => res.json()).then(data => {
                        let oModeluser = new JSONModel(data);
                        let email = oModeluser.oData.decodedJWTToken.email;
                        that.userConnected = email;
                        let initials = email.split(".")[0].substring(0, 1).toUpperCase() + email.split(".")[1].substring(0, 1).toUpperCase();
                        console.log(email)
                        that.getFiltersDefault()
                        oModeluser = new JSONModel({
                            email: that.userConnected,
                            initials: initials
                        });
                        that.getOwnerComponent().setModel(oModeluser, "modelUser")
                    }).catch(err => {
                        that.userConnected = "Default User"
                        let oModeluser = new JSONModel({
                            email: that.userConnected,
                            initials: "DU"
                        });
                        that.getOwnerComponent().setModel(oModeluser, "modelUser")
                        that.getFiltersDefault();
                        console.log(err)
                    });
            },
            showEmail: function (oEvent) {
                let oView = this.getView();
                var oButton = oEvent.getSource();
                // create popover
                if (!this._pPopoverEmail) {
                    this._pPopoverEmail = Fragment.load({
                        id: oView.getId(),
                        name: "scr.prtracking.fragments.emailText",
                        controller: this
                    }).then(function (oPopover) {
                        oView.addDependent(oPopover);
                        return oPopover;
                    });
                }
                this._pPopoverEmail.then(function (oPopover) {
                    oPopover.openBy(oButton);
                });
            },
            showComment: function (oEvent) {
                let oView = this.getView();
                var oButton = oEvent.getSource();
                this.commentPRPath = oEvent.getSource().getParent().getBindingContext("purchReqModel").getPath();
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(this.commentPRPath);
                let oModel = new JSONModel(oPR);
                this.getOwnerComponent().getModel("infoModel").setProperty("/BANFNComment", oPR["EX_BANFN"] + " - " + oPR["EX_BNFPO"]);
                this.getOwnerComponent().setModel(oModel, "commentPR");
                // create popover
                if (!this._pPopoverComment) {
                    this._pPopoverComment = Fragment.load({
                        id: oView.getId(),
                        name: "scr.prtracking.fragments.comment",
                        controller: this
                    }).then(function (oPopover) {
                        oView.addDependent(oPopover);
                        return oPopover;
                    });
                }
                this._pPopoverComment.then(function (oPopover) {
                    oPopover.openBy(oButton);
                });
            },
            showRequestMoreInfo: function (oEvent) {
                let oView = this.getView();
                var oButton = oEvent.getSource();
                this.requestPRPath = oEvent.getSource().getParent().getBindingContext("purchReqModel").getPath();
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(this.requestPRPath);
                let oModel = new JSONModel(oPR);
                this.getOwnerComponent().getModel("infoModel").setProperty("/BANFNRequest", oPR["EX_BANFN"] + " - " + oPR["EX_BNFPO"]);
                this.getOwnerComponent().setModel(oModel, "requestMIPR");
                // create popover
                if (!this._pPopoverRequestMI) {
                    this._pPopoverRequestMI = Fragment.load({
                        id: oView.getId(),
                        name: "scr.prtracking.fragments.requestMoreInfo",
                        controller: this
                    }).then(function (oPopover) {
                        oView.addDependent(oPopover);
                        return oPopover;
                    });
                }
                this._pPopoverRequestMI.then(function (oPopover) {
                    oPopover.openBy(oButton);
                });
            },
            //Funcion que crea los dialogos, se le debe entregar el nombre del dialogo, el id y su respectiva ruta
            _createDialogs: function (sDialogFragmentName, id, route) {
                //Variable que contendra el dialogo que creemos
                var oDialog;
                //Dialogs fue definido anteriormente el cual es un arreglo de dialogos, obtenemos el dialogo en base al nombre que nos entregaron como parametro
                oDialog = this.Dialogs[sDialogFragmentName];
                //Si NO existe , crea un nuevo dialogo
                if (!oDialog) {
                    oDialog = sap.ui.xmlfragment(this.getView().getId(), route, this);
                    this.getView().addDependent(oDialog);
                    this.Dialogs[sDialogFragmentName] = oDialog;
                }
                //y en caso de existir solo se le asigna a la variable creada para contener el dialog que se este usando actualmente
                this.Dialog = oDialog;
                return oDialog;
            },
            //Funcion que cierra el dialog que actualmente se encuentre usando
            closeDialog: function () {
                this.Dialog.close()
            },
            _buildDialog: function (_title, _state, _text) {
                var oController = this;
                var dialog = new sap.m.Dialog({
                    title: _title,
                    type: 'Message',
                    state: _state,
                    content: new sap.m.Text({
                        text: _text
                    }),
                    beginButton: new sap.m.Button({
                        text: oController._get_i18n("accept"),
                        press: function () {
                            dialog.close();
                        }
                    }),
                    afterClose: function () {
                        // oController.reiniciarFormulario();
                        dialog.destroy();
                    }
                });
                return dialog;
            },
            _buildDialogFinish: function (_title, _state, _text) {
                var oController = this;
                var dialog = new sap.m.Dialog({
                    title: _title,
                    type: 'Message',
                    state: _state,
                    content: new sap.m.Text({
                        text: _text
                    }),
                    beginButton: new sap.m.Button({
                        text: oController._get_i18n("accept"),
                        press: function () {
                            dialog.close();
                        }
                    }),
                    afterClose: function () {
                        // oController.reiniciarFormulario();
                        dialog.destroy();
                        let tabs = oController.byId(Constants.ids.mainView.iconTabBar);
                        let count = 0;
                        tabs.getItems().forEach(tab => {
                            if (count % 2 == 0) {
                                tab.setEnabled(false);
                            }
                            count++;
                        });
                        location.reload();

                    }
                });
                return dialog;
            },
            loaderModels: async function () {
                this.oLoaderData.open();
                let pSState = this.byId("idSData").getState();
                this.clearFilters();
                let flagMetadata = true;
                if (pSState) {
                    flagMetadata = this.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV").oMetadata.bFailed
                } else {
                    flagMetadata = this.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV").oMetadata.bFailed
                }
                let oModel = new JSONModel();
                this.getOwnerComponent().setModel(oModel, "purchReqModel");
                this.getOwnerComponent().getModel("infoModel").setProperty("/countPR", 0);
                this.getOwnerComponent().getModel("infoModel").setProperty("/countPRVisible", 0);
                if (!flagMetadata) {
                    let sFragmentId = this.getView().createId("idFragmentFilterBar");
                    let oFilterBar = sap.ui.core.Fragment.byId(sFragmentId, "idFilterBar");
                    oFilterBar.setBlocked(false);
                    // await this.getPurchGroup(pSState);
                    // let oCAgent = this.byId("idCAgent");
                    // let oCRequirementUrgency = this.byId("idCRequirementUrgency");
                    if (pSState) {
                        // oCAgent.setVisible(false);
                        // let oIAgent = sap.ui.core.Fragment.byId(sFragmentId, "idFGIAgent");
                        // oIAgent.setVisibleInFilterBar(false);
                        // oCRequirementUrgency.setVisible(true);
                        // this.byId("idTabFilterReturned").setVisible(true);
                    } else {
                        // oCAgent.setVisible(true);
                        // let oIAgent = sap.ui.core.Fragment.byId(sFragmentId, "idFGIAgent");
                        // oIAgent.setVisibleInFilterBar(true);
                        // oCRequirementUrgency.setVisible(false);
                        // this.byId("idTabFilterReturned").setVisible(false);
                    }
                    await this.getCompanyCode(pSState);
                    // await this.getItemCategory(pSState);
                    // await this.getAccAsignment(pSState);
                    // await this.getDocType(pSState);
                    // await this.getServices(pSState);
                    // await this.getTest();
                    await this.getFiltersCap("REQUEST_TYPE");
                    // await this.getFiltersCap("REQUEST_STATUS");
                    await this.getFiltersCap("GENERAL_PARAMETERS");
                    this.getOwnerComponent().getModel("infoModel").setProperty("/EX_ORIGEN", this.byId("idSData").getState());
                    // let response = await this.getPurchGroupDefault(pSState);
                    // if (response == "s") {
                    //     await this.getPurchReq(pSState);
                    // }
                    this.applyFreezeTable();
                } else {
                    let sFragmentId = this.getView().createId("idFragmentFilterBar");
                    let oFilterBar = sap.ui.core.Fragment.byId(sFragmentId, "idFilterBar");
                    oFilterBar.setBlocked(true);
                }
                this.oLoaderData.close();
            },
            RequestSAPPOSTPromise: function (Model, service, oData) {
                if (this.statusCode != 401) {
                    return new Promise(function (resolve, reject) {

                        Model.setUseBatch(false);
                        Model.create(service, oData, {
                            async: true,
                            success: function (oRespon, response) {
                                resolve(oRespon);
                            },
                            error: function (oError) {
                                reject(oError);
                            }
                        })
                    })
                } else {
                    return "E"
                }
            },
            postAttachmentServ: async function (json, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_ATTACH_POSet";
                var filters = []
                var oData = json;
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPPOSTPromise(model, service, oData);
                    } else {
                        data = await oController.RequestSAPPOSTPromise(model2, service, oData);
                    }
                    if (data == "E") {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    }
                    oController.oLoaderData.close();
                    return data;
                } catch (e) {
                    oController.oLoaderData.close();
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                    return data;
                }
            },
            requestCAP: function (Url, oData, request) {
                let oController = this;
                var oModel = new sap.ui.model.json.JSONModel();
                if (this.statusCode != 401) {
                    return new Promise(function (resolve, reject) {
                        oModel.loadData(Url, JSON.stringify(oData), true, request, false, true, {
                            "content-type": "application/json;odata.metadata=minimal",
                            "content-type": "application/json;IEEE754Compatible=true"
                        });
                        oModel.attachRequestCompleted(function () {
                            let data = oModel.getData();
                            resolve(data)
                        });
                        oModel.attachRequestFailed(function () {
                            let xhr = oModel.getData();
                            resolve(data);
                        });
                    })
                } else {
                    return false
                }

            },

            RequestSAPGETPromise: function (Model, filters, service, oData) {
                if (this.statusCode != 401) {
                    return new Promise(function (resolve, reject) {
                        Model.setUseBatch(false);
                        Model.read(service, {
                            filters: [filters],
                            async: false,
                            success: function (oRespon, response) {
                                resolve(oRespon.results);
                            },
                            error: function (oError) {
                                reject(oError);
                            }
                        })

                    })
                } else {
                    return "E"
                }
            },

            getCompanyCode: async function (state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_COMPANY_CODESet";
                var service2 = "/ZSC_WS_COMPANY_CODESet";
                var filters = []
                var oData = {};
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service2, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok
                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "companyCodeModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                } catch (e) {
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getPlant: async function (IN_BUKRS, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_PLANTSet";
                var filters = [
                    new sap.ui.model.Filter("IN_BUKRS", sap.ui.model.FilterOperator.EQ, IN_BUKRS),
                ]
                var oData = {};
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok

                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "plantModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                } catch (e) {
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },

            getPurchOrg: async function (IN_BUKRS, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_PURCH_ORGSet";
                var filters = [
                    new sap.ui.model.Filter("IN_BUKRS", sap.ui.model.FilterOperator.EQ, IN_BUKRS),
                ]
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok


                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "purchOrgModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                } catch (e) {
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getItemCategory: async function (state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_ITEM_CATEGORY_REPSet";
                var filters = []
                var oData = {};
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok


                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "itemCategoryModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                } catch (e) {
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getAccAsignment: async function (state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_ACC_ASIGNMENTSet";
                var filters = []
                var oData = {};
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok


                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "accAsignmentModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                } catch (e) {
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getDocType: async function (state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_DOC_TYPESet";
                var filters = []
                var oData = {};
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok


                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "docTypeModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                } catch (e) {
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getStoLocation: async function (IN_WERKS, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_STO_LOCATIONSet";
                var filters = [
                    new sap.ui.model.Filter("IN_WERKS", sap.ui.model.FilterOperator.EQ, IN_WERKS),
                ]
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok


                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "stoLocationModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                    oController.oLoaderData.close();
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getPurchGroup: async function (state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_PURCH_GROUPSet";
                var filters = []
                var oData = {};
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok

                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "purchGroupModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                } catch (e) {
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getVendor: async function (IN_EKORG, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_VENDORSet";
                var filters = [
                    new sap.ui.model.Filter("IN_EKORG", sap.ui.model.FilterOperator.EQ, IN_EKORG),
                ]
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok
                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "vendorModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                    oController.oLoaderData.close();
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getTest: async function () {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var service = "/ZSC_WS_TESTSet";
                var filters = []
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    console.log(data);
                    if (data.length != 0) {
                        //Response Ok
                        let decodedPdfContent = atob(data[0].EX_BASE64);
                        let byteArray = new Uint8Array(decodedPdfContent.length)
                        for (let i = 0; i < decodedPdfContent.length; i++) {
                            byteArray[i] = decodedPdfContent.charCodeAt(i);
                        }
                        let extensionType = "pdf"
                        let title = "test" + "." + extensionType
                        if (extensionType == "pdf") {
                            let type = 'application/pdf'
                        } else if (extensionType == "xls") {
                            let type = 'application/vnd.ms-excel'
                        } else if (extensionType == "csv") {
                            let type = 'text/csv'
                        } else if (extensionType == "txt") {
                            let type = 'text/plain;charset=utf-8'
                        } else if (extensionType == "doc") {
                            let type = 'application/msword'
                        }
                        let blob = new Blob([byteArray.buffer], {
                            //data:application/msword;base64
                            //en la siguiente linea si es un Word tu escribes “msword”, si es un pdf entonces “pdf” y excel vnd.ms-excel
                            type: 'application/' + extensionType
                        });
                        if (window.navigator.msSaveOrOpenBlob) {
                            window.navigator.msSaveBlob(blob, title);
                        } else {
                            let elem = window.document.createElement('a');
                            elem.href = window.URL.createObjectURL(blob);
                            elem.download = title;
                            document.body.appendChild(elem);
                            elem.click();
                            document.body.removeChild(elem);
                        }
                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "testModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                    oController.oLoaderData.close();
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getMaterials: async function (IN_WERKS, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_MATERIALSSet";
                var filters = [
                    new sap.ui.model.Filter("IN_WERKS", sap.ui.model.FilterOperator.EQ, IN_WERKS),
                    new sap.ui.model.Filter("IN_STORAGE_LOCATION", sap.ui.model.FilterOperator.EQ, ""),
                ];
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok

                        data.forEach(element => {
                            if (element["EX_MAKTX"] == "") {
                                element["EX_MAKTX"] = "N/A"
                            }

                        });
                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "materialsModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                    oController.oLoaderData.close();
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getServices: async function (state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_SERVICESSet";
                var filters = [];
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok

                        data.forEach(element => {
                            if (element["EX_ASKTX"] == "") {
                                element["EX_ASKTX"] = "N/A"
                            }
                        });

                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "servicesModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                    oController.oLoaderData.close();
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getAcquisitionType: async function (IN_BUKRS, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_ACQUISITIONSet";
                var filters = [
                    new sap.ui.model.Filter("IN_BUKRS", sap.ui.model.FilterOperator.EQ, IN_BUKRS),
                ];
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok
                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "acquisitionTypeModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                    oController.oLoaderData.close();
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getHeaderNote: async function (IN_BANFN, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_HEADER_NOTESet";
                var filters = [
                    new sap.ui.model.Filter("IN_BANFN", sap.ui.model.FilterOperator.EQ, IN_BANFN.toString()),
                ];
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok
                        let msg = ""
                        data.forEach(text => {
                            msg = msg + text.EX_TDLINE + "\n";
                        });
                        data.msg = msg;
                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "headerNoteModel");
                        oController.oLoaderData.close();
                        return "s";

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                        oController.oLoaderData.close();
                        return "e";
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                        oController.oLoaderData.close();
                        return "e";
                    }
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getDeliveryNote: async function (IN_BANFN, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_DELIVERY_TEXTSet";
                var filters = [
                    new sap.ui.model.Filter("IN_BANFN", sap.ui.model.FilterOperator.EQ, IN_BANFN.toString()),
                ];
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok
                        let msg = ""
                        data.forEach(text => {
                            msg = msg + text.EX_TDLINE + "\n";
                        });
                        data.msg = msg;
                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "deliveryNoteModel");
                        oController.oLoaderData.close();
                        return "s";

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                        oController.oLoaderData.close();
                        return "e";
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                        oController.oLoaderData.close();
                        return "e";
                    }
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getItemText: async function (IN_BANFN, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_ITEM_TEXTSet";
                var filters = [
                    new sap.ui.model.Filter("IN_BANFN", sap.ui.model.FilterOperator.EQ, IN_BANFN.toString()),
                ];
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok
                        let msg = ""
                        data.forEach(text => {
                            msg = msg + text.EX_TDLINE + "\n";
                        });
                        data.msg = msg;
                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "itemTextModel");
                        oController.oLoaderData.close();
                        return "s";

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                        oController.oLoaderData.close();
                        return "e";
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                        oController.oLoaderData.close();
                        return "e";
                    }
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getPRServices: async function (IN_BANFN, IN_BNFPO, IN_WAERS, EX_SUB_PACKNO, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZS_WS_PR_SERVICESSet";
                var filters = [
                    new sap.ui.model.Filter("IN_BANFN", sap.ui.model.FilterOperator.EQ, IN_BANFN),
                    new sap.ui.model.Filter("IN_BNFPO", sap.ui.model.FilterOperator.EQ, IN_BNFPO),
                    new sap.ui.model.Filter("IN_WAERS", sap.ui.model.FilterOperator.EQ, IN_WAERS),
                ];
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok
                        let temp = [];
                        data.forEach(service => {
                            if (service["EX_PCKG_NO"] == EX_SUB_PACKNO) {
                                temp.push(service);
                            }
                        });

                        let oModel = new JSONModel(temp);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "prServicesModel");
                        oController.getOwnerComponent().getModel("infoModel").setProperty("/countPRServices", temp.length);
                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                    oController.oLoaderData.close();
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getPRSource: async function (IN_MATNR, IN_MATKL, IN_WERKS, IN_LFDAT, IN_MENGE, IN_MEINS, IN_PSTYP, IN_KNTTP, IN_EKORG, IN_WAERS, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_PR_VENDORSet";
                var filters = [
                    new sap.ui.model.Filter("IN_MATNR", sap.ui.model.FilterOperator.EQ, IN_MATNR.trim()),
                    new sap.ui.model.Filter("IN_MATKL", sap.ui.model.FilterOperator.EQ, IN_MATKL.trim()),
                    new sap.ui.model.Filter("IN_WERKS", sap.ui.model.FilterOperator.EQ, IN_WERKS.trim()),
                    new sap.ui.model.Filter("IN_LFDAT", sap.ui.model.FilterOperator.EQ, IN_LFDAT.trim()),
                    new sap.ui.model.Filter("IN_MENGE", sap.ui.model.FilterOperator.EQ, IN_MENGE.trim()),
                    new sap.ui.model.Filter("IN_MEINS", sap.ui.model.FilterOperator.EQ, IN_MEINS.trim()),
                    new sap.ui.model.Filter("IN_PSTYP", sap.ui.model.FilterOperator.EQ, IN_PSTYP.trim()),
                    new sap.ui.model.Filter("IN_KNTTP", sap.ui.model.FilterOperator.EQ, IN_KNTTP.trim()),
                    new sap.ui.model.Filter("IN_EKORG", sap.ui.model.FilterOperator.EQ, IN_EKORG.trim()),
                    new sap.ui.model.Filter("IN_WAERS", sap.ui.model.FilterOperator.EQ, IN_WAERS.trim()),
                ];
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok

                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "prSourceModel");
                        oController.getOwnerComponent().getModel("infoModel").setProperty("/countPRSource", data.length);
                        oController.oLoaderData.close();
                        return "s";
                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        oController.oLoaderData.close();
                        return "e";
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                        oController.oLoaderData.close();
                        return "e";
                    }
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            assignVendor: async function (source, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_ASSIGN_VENDORSet";
                var filters = [
                    new sap.ui.model.Filter("IN_BANFN", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_BANFN"].trim()),
                    new sap.ui.model.Filter("IN_BNFPO", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_BNFPO"].trim()),
                    new sap.ui.model.Filter("IN_EKGRP", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_EKGRP"].trim()),
                    new sap.ui.model.Filter("IN_TXZ01", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_TXZ01"].trim()),
                    new sap.ui.model.Filter("IN_LGORT", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_LGORT"].trim()),
                    new sap.ui.model.Filter("IN_MATKL", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_MATKL"].trim()),
                    new sap.ui.model.Filter("IN_MENGE", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_MENGE"].trim()),
                    new sap.ui.model.Filter("IN_MEINS", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_MEINS"].trim()),
                    new sap.ui.model.Filter("IN_LPEIN", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_LPEIN"].trim()),
                    new sap.ui.model.Filter("IN_LFDAT", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_LFDAT"].trim()),
                    new sap.ui.model.Filter("IN_FRGDT", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_FRGDT"].trim()),
                    new sap.ui.model.Filter("IN_PREIS", sap.ui.model.FilterOperator.EQ, source["EX_NETPR"].trim()),
                    new sap.ui.model.Filter("IN_PEINH", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_PEINH"].trim()),
                    new sap.ui.model.Filter("IN_VRTKZ", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_VRTKZ"].trim()),
                    new sap.ui.model.Filter("IN_TWRKZ", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_TWRKZ"].trim()),
                    new sap.ui.model.Filter("IN_WEPOS", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_WEPOS"].trim()),
                    new sap.ui.model.Filter("IN_WEUNB", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_WEUNB"].trim()),
                    new sap.ui.model.Filter("IN_REPOS", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_REPOS"].trim()),
                    new sap.ui.model.Filter("IN_LIFNR", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_LIFNR"].trim()),
                    new sap.ui.model.Filter("IN_BWTAR", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_BWTAR"].trim()),
                    new sap.ui.model.Filter("IN_FIXED_VEND", sap.ui.model.FilterOperator.EQ, source["EX_FIXED_VEND"].trim()),
                    new sap.ui.model.Filter("IN_PURCH_ORG", sap.ui.model.FilterOperator.EQ, source["EX_PURCH_ORG"].trim()),
                    new sap.ui.model.Filter("IN_AGREEMENT", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_KONNR"].trim()),
                    new sap.ui.model.Filter("IN_INFNR", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_INFNR"].trim()),
                    new sap.ui.model.Filter("IN_KTPNR", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_KTPNR"].trim()),
                    new sap.ui.model.Filter("IN_AGMT_ITEM", sap.ui.model.FilterOperator.EQ, source["EX_AGMT_ITEM"].trim()),
                    new sap.ui.model.Filter("IN_INFO_REC", sap.ui.model.FilterOperator.EQ, source["EX_INFO_REC"].trim()),
                    new sap.ui.model.Filter("IN_WAERS", sap.ui.model.FilterOperator.EQ, source["EX_WAERS"].trim()),
                    new sap.ui.model.Filter("IN_PREIS_OLD", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_PREIS"].trim()),
                    new sap.ui.model.Filter("IN_EKORG", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_EKORG"].trim()),
                    new sap.ui.model.Filter("IN_WEBAZ", sap.ui.model.FilterOperator.EQ, this.oPRSelect["EX_WEBAZ"].trim()),
                ];
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok
                        let that = this;
                        setTimeout(async function () {
                            await that.getDataPR();
                            that.closeDialog();
                        }, 5000);
                        oController._buildDialog(oController._get_i18n("dialog_success"), "Success", data[0]["EX_MESSAGE"]).open();
                        // let oModel = new JSONModel(data);
                        // oModel.setSizeLimit(100000);
                        // oController.getOwnerComponent().setModel(oModel, "prSourceModel");
                        // oController.getOwnerComponent().getModel("infoModel").setProperty("/countPRSource", data.length);
                        // oController.oLoaderData.close();
                        return "s";
                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        let msg = data[0].EX_DSC_EJECUCION;
                        data.forEach(error => {
                            msg = msg + "\n - " + data[0].EX_MESSAGE;
                        });
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", msg).open();

                        oController.oLoaderData.close();
                        return "e";
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                        oController.oLoaderData.close();
                        return "e";
                    }
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getPurchReq: async function (state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_ED_PURCH_REQSet";
                let IN_DAYS_OVERDUE = this.getOwnerComponent().getModel("GENERAL_PARAMETERSModel").getData().filter(function (parameter) {
                    return parameter.name == "DAYS_OVERDUE";
                })[0].value;
                let sFragmentId = this.getView().createId("idFragmentFilterBar");
                // let oCBPurchGroup = sap.ui.core.Fragment.byId(sFragmentId, "idCBPurchGroup");
                let oCBVendor = sap.ui.core.Fragment.byId(sFragmentId, "idCBVendor");
                let oCBMaterial = sap.ui.core.Fragment.byId(sFragmentId, "idCBMaterial");
                // let oCBRequestStatus = sap.ui.core.Fragment.byId(sFragmentId, "idCBRequestStatus");
                let oCBRequestType = sap.ui.core.Fragment.byId(sFragmentId, "idCBRequestType");
                let IN_REQ_TYPE = ""
                oCBRequestType.getSelectedKeys().forEach(key => {
                    IN_REQ_TYPE = IN_REQ_TYPE + key + ",";
                });
                IN_REQ_TYPE = IN_REQ_TYPE.substring(0, IN_REQ_TYPE.length - 1);
                let oDPDeliDateFrom = sap.ui.core.Fragment.byId(sFragmentId, "idDPDeliDateFrom");
                let oDPDeliDateTo = sap.ui.core.Fragment.byId(sFragmentId, "idDPDeliDateTo");
                // let oRSFilterValueFrom = sap.ui.core.Fragment.byId(sFragmentId, "idRSFilterValueFrom");
                // let oRSFilterValueTo = sap.ui.core.Fragment.byId(sFragmentId, "idRSFilterValueTo");
                // let oCBItemCategory = sap.ui.core.Fragment.byId(sFragmentId, "idCBItemCategory");
                // let oCBAccountAssignment = sap.ui.core.Fragment.byId(sFragmentId, "idCBAccountAssignment");
                // let oCBDocumentType = sap.ui.core.Fragment.byId(sFragmentId, "idCBDocumentType");
                let oCBPurchRequisitions = sap.ui.core.Fragment.byId(sFragmentId, "idCBPurchRequisitions");
                let oIManufac = sap.ui.core.Fragment.byId(sFragmentId, "idIManufac");
                let oCBVendorFixed = sap.ui.core.Fragment.byId(sFragmentId, "idCBVendorFixed");
                let oCBDeletionIndicator = sap.ui.core.Fragment.byId(sFragmentId, "idCBDeletionIndicator");
                let oIOutlineAgreement = sap.ui.core.Fragment.byId(sFragmentId, "idIOutlineAgreement");
                let oIRequisitioner = sap.ui.core.Fragment.byId(sFragmentId, "idIRequisitioner");
                let oCBCostCenter = sap.ui.core.Fragment.byId(sFragmentId, "idCBCostCenter");
                let oCBGLAccount = sap.ui.core.Fragment.byId(sFragmentId, "idCBGLAccount");
                let oCBWBSElement = sap.ui.core.Fragment.byId(sFragmentId, "idCBWBSElement");
                let oIOrderNumber = sap.ui.core.Fragment.byId(sFragmentId, "idIOrderNumber");
                let oIPONumber = sap.ui.core.Fragment.byId(sFragmentId, "idIPONumber");
                let oIStatusApproval = sap.ui.core.Fragment.byId(sFragmentId, "idIStatusApproval");
                let oCBPOStatus = sap.ui.core.Fragment.byId(sFragmentId, "idCBPOStatus");
                let oCBGRVStatus = sap.ui.core.Fragment.byId(sFragmentId, "idCBGRVStatus");
                let oISESNumber = sap.ui.core.Fragment.byId(sFragmentId, "idISESNumber");
                let oCBSESApprovalStatus = sap.ui.core.Fragment.byId(sFragmentId, "idCBSESApprovalStatus");
                let oCBInvoicedStatus = sap.ui.core.Fragment.byId(sFragmentId, "idCBInvoicedStatus");
                let oICreatedBy = sap.ui.core.Fragment.byId(sFragmentId, "idICreatedBy");

                // let oCBAcquisitionType = sap.ui.core.Fragment.byId(sFragmentId, "idCBAcquisitionType");
                // let oIAgent = sap.ui.core.Fragment.byId(sFragmentId, "idIAgent");
                if (state) {
                    var filters = [
                        new sap.ui.model.Filter("IN_BUKRS", sap.ui.model.FilterOperator.EQ, this.BUKRS),
                        new sap.ui.model.Filter("IN_WERKS", sap.ui.model.FilterOperator.EQ, this.WERKS),
                        new sap.ui.model.Filter("IN_LGORT", sap.ui.model.FilterOperator.EQ, this.LGORT),
                        // new sap.ui.model.Filter("IN_EKORG", sap.ui.model.FilterOperator.EQ, this.EKORG),
                        // new sap.ui.model.Filter("IN_EKGRP", sap.ui.model.FilterOperator.EQ, this.EKGRP),
                        new sap.ui.model.Filter("IN_LIFNR", sap.ui.model.FilterOperator.EQ, oCBVendor.getSelectedKey()),
                        new sap.ui.model.Filter("IN_FLIEF", sap.ui.model.FilterOperator.EQ, oCBVendorFixed.getSelectedKey()),
                        new sap.ui.model.Filter("IN_MATNR", sap.ui.model.FilterOperator.EQ, oCBMaterial.getSelectedKey()),
                        // new sap.ui.model.Filter("IN_STATUS", sap.ui.model.FilterOperator.EQ, oCBRequestStatus.getSelectedKey()),
                        new sap.ui.model.Filter("IN_REQ_TYPE", sap.ui.model.FilterOperator.EQ, IN_REQ_TYPE),
                        new sap.ui.model.Filter("IN_DEL_DATE_FROM", sap.ui.model.FilterOperator.EQ, oDPDeliDateFrom.getValue()),
                        new sap.ui.model.Filter("IN_DEL_DATE_TO", sap.ui.model.FilterOperator.EQ, oDPDeliDateTo.getValue()),
                        // new sap.ui.model.Filter("IN_FIL_VALUE_FROM", sap.ui.model.FilterOperator.EQ, oRSFilterValueFrom.getValue()),
                        // new sap.ui.model.Filter("IN_FIL_VALUE_TO", sap.ui.model.FilterOperator.EQ, oRSFilterValueTo.getValue()),
                        // new sap.ui.model.Filter("IN_EPSTP", sap.ui.model.FilterOperator.EQ, oCBItemCategory.getSelectedKey()),
                        // new sap.ui.model.Filter("IN_KNTTP", sap.ui.model.FilterOperator.EQ, oCBAccountAssignment.getSelectedKey()),
                        // new sap.ui.model.Filter("IN_BSART", sap.ui.model.FilterOperator.EQ, oCBDocumentType.getSelectedKey()),
                        new sap.ui.model.Filter("IN_BANFN", sap.ui.model.FilterOperator.EQ, oCBPurchRequisitions.getValue()),
                        new sap.ui.model.Filter("IN_REQUISITIONER", sap.ui.model.FilterOperator.EQ, oIRequisitioner.getValue()),
                        new sap.ui.model.Filter("IN_MANUFACTURING", sap.ui.model.FilterOperator.EQ, oIManufac.getValue()),
                        new sap.ui.model.Filter("IN_ASNUM", sap.ui.model.FilterOperator.EQ, ""),
                        new sap.ui.model.Filter("IN_SUPPLIER_PART", sap.ui.model.FilterOperator.EQ, ""),
                        new sap.ui.model.Filter("IN_OUTLINE_AGREEMENT", sap.ui.model.FilterOperator.EQ, oIOutlineAgreement.getValue()),
                        new sap.ui.model.Filter("IN_DAYS_OVERDUE", sap.ui.model.FilterOperator.EQ, IN_DAYS_OVERDUE),
                        new sap.ui.model.Filter("IN_KOSTL", sap.ui.model.FilterOperator.EQ, oCBCostCenter.getSelectedKey()),
                        new sap.ui.model.Filter("IN_SAKNR", sap.ui.model.FilterOperator.EQ, oCBGLAccount.getSelectedKey()),
                        new sap.ui.model.Filter("IN_POSID", sap.ui.model.FilterOperator.EQ, oCBWBSElement.getSelectedKey()),
                        new sap.ui.model.Filter("IN_AUFNR", sap.ui.model.FilterOperator.EQ, oIOrderNumber.getSelectedKey()),
                        new sap.ui.model.Filter("IN_EBELN", sap.ui.model.FilterOperator.EQ, oIPONumber.getValue()),
                        new sap.ui.model.Filter("IN_FRGZU", sap.ui.model.FilterOperator.EQ, oIStatusApproval.getSelectedKey()),
                        new sap.ui.model.Filter("IN_PO_STATUS", sap.ui.model.FilterOperator.EQ, oCBPOStatus.getSelectedKey()),
                        new sap.ui.model.Filter("IN_GRV_STATUS", sap.ui.model.FilterOperator.EQ, oCBGRVStatus.getSelectedKey()),
                        new sap.ui.model.Filter("IN_SES_NUMBER", sap.ui.model.FilterOperator.EQ, oISESNumber.getValue()),
                        new sap.ui.model.Filter("IN_SES_APPROVAL_STATUS", sap.ui.model.FilterOperator.EQ, oCBSESApprovalStatus.getSelectedKey()),
                        new sap.ui.model.Filter("IN_INVOICE_STATUS", sap.ui.model.FilterOperator.EQ, oCBInvoicedStatus.getSelectedKey()),
                        new sap.ui.model.Filter("IN_ERNAM", sap.ui.model.FilterOperator.EQ, oICreatedBy.getValue()),
                        // new sap.ui.model.Filter("IN_ZZACQTYP", sap.ui.model.FilterOperator.EQ, oCBAcquisitionType.getSelectedKey()),
                    ]
                } else {
                    var filters = [
                        new sap.ui.model.Filter("IN_BUKRS", sap.ui.model.FilterOperator.EQ, this.BUKRS),
                        new sap.ui.model.Filter("IN_WERKS", sap.ui.model.FilterOperator.EQ, this.WERKS),
                        new sap.ui.model.Filter("IN_LGORT", sap.ui.model.FilterOperator.EQ, this.LGORT),
                        // new sap.ui.model.Filter("IN_EKORG", sap.ui.model.FilterOperator.EQ, this.EKORG),
                        // new sap.ui.model.Filter("IN_EKGRP", sap.ui.model.FilterOperator.EQ, this.EKGRP),
                        new sap.ui.model.Filter("IN_LIFNR", sap.ui.model.FilterOperator.EQ, oCBVendor.getSelectedKey()),
                        new sap.ui.model.Filter("IN_MATNR", sap.ui.model.FilterOperator.EQ, oCBMaterial.getSelectedKey()),
                        // new sap.ui.model.Filter("IN_STATUS", sap.ui.model.FilterOperator.EQ, oCBRequestStatus.getSelectedKey()),
                        new sap.ui.model.Filter("IN_REQ_TYPE", sap.ui.model.FilterOperator.EQ, IN_REQ_TYPE),
                        new sap.ui.model.Filter("IN_DEL_DATE_FROM", sap.ui.model.FilterOperator.EQ, oDPDeliDateFrom.getValue()),
                        new sap.ui.model.Filter("IN_DEL_DATE_TO", sap.ui.model.FilterOperator.EQ, oDPDeliDateTo.getValue()),
                        // new sap.ui.model.Filter("IN_FIL_VALUE_FROM", sap.ui.model.FilterOperator.EQ, oRSFilterValueFrom.getValue()),
                        // new sap.ui.model.Filter("IN_FIL_VALUE_TO", sap.ui.model.FilterOperator.EQ, oRSFilterValueTo.getValue()),
                        // new sap.ui.model.Filter("IN_EPSTP", sap.ui.model.FilterOperator.EQ, oCBItemCategory.getSelectedKey()),
                        // new sap.ui.model.Filter("IN_KNTTP", sap.ui.model.FilterOperator.EQ, oCBAccountAssignment.getSelectedKey()),
                        // new sap.ui.model.Filter("IN_BSART", sap.ui.model.FilterOperator.EQ, oCBDocumentType.getSelectedKey()),
                        new sap.ui.model.Filter("IN_BANFN", sap.ui.model.FilterOperator.EQ, oCBPurchRequisitions.getValue()),
                        new sap.ui.model.Filter("IN_REQUISITIONER", sap.ui.model.FilterOperator.EQ, oIRequisitioner.getValue()),
                        new sap.ui.model.Filter("IN_MANUFACTURING", sap.ui.model.FilterOperator.EQ, oIManufac.getValue()),
                        new sap.ui.model.Filter("IN_ASNUM", sap.ui.model.FilterOperator.EQ, ""),
                        new sap.ui.model.Filter("IN_SUPPLIER_PART", sap.ui.model.FilterOperator.EQ, ""),
                        new sap.ui.model.Filter("IN_OUTLINE_AGREEMENT", sap.ui.model.FilterOperator.EQ, oIOutlineAgreement.getValue()),
                        new sap.ui.model.Filter("IN_DAYS_OVERDUE", sap.ui.model.FilterOperator.EQ, IN_DAYS_OVERDUE),
                        new sap.ui.model.Filter("IN_FLIEF", sap.ui.model.FilterOperator.EQ, oCBVendorFixed.getSelectedKey()),
                        new sap.ui.model.Filter("IN_KOSTL", sap.ui.model.FilterOperator.EQ, oCBCostCenter.getSelectedKey()),
                        new sap.ui.model.Filter("IN_SAKNR", sap.ui.model.FilterOperator.EQ, oCBGLAccount.getSelectedKey()),
                        new sap.ui.model.Filter("IN_POSID", sap.ui.model.FilterOperator.EQ, oCBWBSElement.getSelectedKey()),
                        new sap.ui.model.Filter("IN_AUFNR", sap.ui.model.FilterOperator.EQ, oIOrderNumber.getSelectedKey()),
                        new sap.ui.model.Filter("IN_EBELN", sap.ui.model.FilterOperator.EQ, oIPONumber.getValue()),
                        new sap.ui.model.Filter("IN_FRGZU", sap.ui.model.FilterOperator.EQ, oIStatusApproval.getSelectedKey()),
                        new sap.ui.model.Filter("IN_PO_STATUS", sap.ui.model.FilterOperator.EQ, oCBPOStatus.getSelectedKey()),
                        new sap.ui.model.Filter("IN_GRV_STATUS", sap.ui.model.FilterOperator.EQ, oCBGRVStatus.getSelectedKey()),
                        new sap.ui.model.Filter("IN_SES_NUMBER", sap.ui.model.FilterOperator.EQ, oISESNumber.getValue()),
                        new sap.ui.model.Filter("IN_SES_APPROVAL_STATUS", sap.ui.model.FilterOperator.EQ, oCBSESApprovalStatus.getSelectedKey()),
                        new sap.ui.model.Filter("IN_INVOICE_STATUS", sap.ui.model.FilterOperator.EQ, oCBInvoicedStatus.getSelectedKey()),
                        new sap.ui.model.Filter("IN_ERNAM", sap.ui.model.FilterOperator.EQ, oICreatedBy.getValue()),
                        // new sap.ui.model.Filter("IN_ZZACQTYP", sap.ui.model.FilterOperator.EQ, oCBAcquisitionType.getSelectedKey()),
                        // new sap.ui.model.Filter("IN_OBJID", sap.ui.model.FilterOperator.EQ, oIAgent.getValue()),
                    ]
                }

                var oData = {};
                try {
                    oController.oLoaderData.open();
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok
                        data.forEach(oPR => {
                            delete oPR["__metadata"];
                            for (const key in oPR) {
                                if (oPR.hasOwnProperty(key)) {
                                    oPR[key] = oPR[key].trim();
                                }
                            }
                        });
                        let dataReturned = await this.checkReturnedPR();
                        let dataComments = await this.getCommentsPRs();
                        let dataRejected = await this.checkRejectedPR();
                        let oPREmergency = [];
                        let oPROther = [];
                        let oPRUrgent = [];
                        let oPRComment = [];
                        let oPRDeleted = [];
                        let oPRNotDeleted = [];


                        data.forEach(oPR => {
                            let returnedFlag = dataReturned.filter(function (pr) {
                                return pr.BANFN == oPR.EX_BANFN &&
                                    pr.BNFPO == oPR.EX_BNFPO;
                            });
                            let commentFlag = dataComments.filter(function (pr) {
                                return pr.BANFN == oPR.EX_BANFN &&
                                    pr.BNFPO == oPR.EX_BNFPO;
                            });
                            let rejectedFlag = dataRejected.filter(function (pr) {
                                return pr.BANFN == oPR.EX_BANFN &&
                                    pr.BNFPO == oPR.EX_BNFPO;
                            });
                            if (returnedFlag.length > 0) {
                                oPR.RETURNED = returnedFlag[0].RETURNED
                                oPR.RETURNED_COMMENT = returnedFlag[0].RETURNED_COMMENT
                                oPR.USER = returnedFlag[0].USER
                                oPR.DATE = returnedFlag[0].DATE
                                oPR.TIME = returnedFlag[0].TIME
                            }
                            if (commentFlag.length > 0) {
                                oPR.COMMENT = commentFlag
                                oPR.statusComment = "Warning"
                            }
                            if (rejectedFlag.length > 0) {
                                oPR.REJECTED = rejectedFlag[0].REJECTED
                                oPR.COMMENT_REJECTED = rejectedFlag[0].REJECTED_COMMENT
                                oPR.USER = rejectedFlag[0].USER
                                oPR.DATE = rejectedFlag[0].DATE
                                oPR.TIME = rejectedFlag[0].TIME
                            }

                            //PR STATUS 
                            let approvedStates = oPR["EX_FRGZU"].length;
                            let flagStatus = true;
                            let flagVisible = true;
                            let flagPending = true;
                            let flagPendingUse = true;
                            oPR["resetFlag"] = false;
                            oPR["isApproval"] = true;
                            let countApproval = 0;
                            for (let index = 1; index < 9; index++) {
                                const element = oPR["EX_REL_CODE_" + index.toString()];
                                if (approvedStates > 0 && index - 1 < approvedStates) {
                                    oPR["status" + index.toString()] = "Success";
                                    oPR["iconStatus" + + index.toString()] = "sap-icon://sys-enter-2";
                                    oPR["REL_USE_RESET"] = index;
                                    oPR["resetFlag"] = true;
                                    flagPending = false;
                                } else {
                                    if (flagVisible) {
                                        if (oPR["EX_BANPR"] == "08") {
                                            if (flagStatus) {
                                                oPR["status" + index.toString()] = "Error";
                                                oPR["iconStatus" + + index.toString()] = "sap-icon://error"
                                                flagStatus = false;
                                                flagPending = false
                                                flagPendingUse = false;
                                                oPR["REL_USE"] = index;
                                            } else {
                                                oPR["status" + index.toString()] = "None";
                                            }
                                        } else {
                                            if (oPR["REL_USE"] == undefined) {
                                                oPR["REL_USE"] = index;
                                            }
                                            if (flagPendingUse) {
                                                flagPending = true;
                                            }
                                            oPR["status" + index.toString()] = "None";
                                        }
                                    } else {
                                        if (oPR["status" + index.toString()] == undefined) {
                                            oPR["status" + index.toString()] = "None";
                                            if (oPR["REL_USE"] == undefined) {
                                                oPR["REL_USE"] = index;
                                            }
                                        }
                                    }
                                }
                                if (element != "") {
                                    oPR["visibleTable"] = true;
                                    countApproval = countApproval + 1
                                    if (flagPending) {
                                        oPR["isPending"] = true;
                                        oPR["status" + index.toString()] = "Warning";
                                        oPR["iconStatus" + + index.toString()] = "sap-icon://alert"
                                        flagPendingUse = false;
                                        flagPending = false;
                                    }
                                    oPR["status_visible" + index.toString()] = true;
                                    oPR["code" + index.toString()] = oPR["EX_REL_CODE_" + index.toString()];
                                    oPR["descrip" + index.toString()] = oPR["EX_REL_CD_TX" + index.toString()];
                                    oPR["user" + index.toString()] = oPR["EX_USER_" + index.toString()];
                                    oPR["mail" + index.toString()] = oPR["EX_MAIL_" + index.toString()];
                                } else {
                                    if (index == 1) {
                                        flagVisible = false;
                                        oPR["status_visible8"] = false;
                                        oPR["isApproval"] = false;
                                    }
                                    if (flagVisible) {
                                        if (index < 9) {
                                            oPR["status_visible" + (index - 1).toString()] = false;
                                            oPR["status_visible8"] = true;
                                            oPR["status_visible" + (index).toString()] = false;
                                            oPR["status8"] = oPR["status" + (index - 1).toString()];
                                            oPR["code8"] = oPR["EX_REL_CODE_" + (index - 1).toString()];
                                            oPR["descrip8"] = oPR["EX_REL_CD_TX" + (index - 1).toString()];
                                            oPR["user8"] = oPR["EX_USER_" + (index - 1).toString()];
                                            oPR["mail8"] = oPR["EX_MAIL_" + (index - 1).toString()];
                                            oPR["iconStatus8"] = oPR["iconStatus" + (index - 1).toString()];
                                        }
                                        flagVisible = false;
                                    } else {
                                        if (index != 8) {
                                            oPR["status_visible" + (index).toString()] = false;
                                        }
                                    }
                                }
                            }
                            if (countApproval == approvedStates) {
                                oPR["isApproval"] = false;
                            }
                            //STATUS SES
                            let approveCount = 0;
                            let nevelStatus = 0;
                            let flagRejectedPending = true;
                            for (let index = 1; index < 9; index++) {
                                if (oPR["EX_REL_CODE_" + index.toString() + "_SES_APR"] != "" && oPR["EX_REL_CODE_" + index.toString() + "_SES_APR"] != undefined) {
                                    approveCount++;
                                    oPR["statusSES" + (index).toString()] = "Success";
                                } else {
                                    if (flagRejectedPending) {
                                        if (oPR["EX_SES_REJECTED"] == "X") {
                                            oPR["statusSES" + (index).toString()] = "Error";
                                        } else {
                                            oPR["statusSES" + (index).toString()] = "Warning";
                                        }
                                        oPR["REL_USE_SES"] = index;
                                        flagRejectedPending = false;
                                    }
                                }
                                if (oPR["EX_REL_CODE_" + index.toString() + "_SES"] != "" && oPR["EX_REL_CODE_" + index.toString() + "_SES"] != undefined) {
                                    nevelStatus++;
                                    oPR["statusSES_visible" + (index).toString()] = true;
                                    oPR["codeSES" + index.toString()] = oPR["EX_REL_CODE_" + index.toString() + "_SES"];
                                    oPR["userSES" + index.toString()] = oPR["EX_USER_" + index.toString() + "_SES"];
                                    oPR["mailSES" + index.toString()] = oPR["EX_MAIL_" + index.toString() + "_SES"];
                                    if (nevelStatus != 1) {
                                        oPR["visibleSeparetor" + (index - 1).toString()] = true;
                                    } else {
                                        oPR["visibleSeparetor" + (index).toString()] = false;
                                    }
                                } else {
                                    oPR["statusSES_visible" + (index).toString()] = false;
                                }
                            }
                            if (approveCount != nevelStatus != 0) {
                                console.log(approveCount)
                                console.log(nevelStatus)
                            }
                            // //Validity Start And ENd
                            // if (PO["EX_KDATB"] == "00000000") {
                            //     PO["EX_KDATB"] = "";
                            // }
                            // if (PO["EX_KDATE"] == "00000000") {
                            //     PO["EX_KDATE"] = "";
                            // }
                            //Expediting Status
                            if (oPR["EX_EBTYP"] == "ZZ") {
                                oPR["statusES"] = "None";
                                oPR["iconStatusES"] = "sap-icon://performance";
                                oPR["activeES"] = true;
                            }
                            //GRV STATUS
                            if (parseFloat(oPR["EX_WEMNG_PO"].trim()) == 0) {

                            } else if (parseFloat(oPR["EX_WEMNG_PO"].trim()) > 0 && parseFloat(oPR["EX_WEMNG_PO"].trim()) < parseFloat(oPR["EX_MENGE_GRV"].trim())) {
                                oPR["statusGRV"] = "Warning";
                                oPR["iconGRV"] = "sap-icon://busy";
                                oPR["tooltipGRVStatus"] = "Partially Received";
                            } else if (parseFloat(oPR["EX_WEMNG_PO"].trim()) == parseFloat(oPR["EX_MENGE_GRV"].trim())) {
                                oPR["statusGRV"] = "Success";
                                oPR["iconGRV"] = "sap-icon://circle-task-2";
                                oPR["tooltipGRVStatus"] = "Received in Full";
                            }
                            //INVOICE RECEIVED STATUS
                            if (parseFloat(oPR["EX_WRBTR"].trim()) == "0") {

                            } else if (parseFloat(oPR["EX_WRBTR"].trim()) < parseFloat(oPR["EX_NETWR"].trim())) {
                                oPR["statusInvoiceReceived"] = "Warning";
                                oPR["iconInvoiceReceived"] = "sap-icon://busy"; 
                                oPR["tooltipInvoice"] = "Partially Received";
                            } else if (parseFloat(oPR["EX_WRBTR"].trim()) == parseFloat(oPR["EX_NETWR"].trim())) {
                                oPR["statusInvoiceReceived"] = "Success";
                                oPR["iconInvoiceReceived"] = "sap-icon://circle-task-2";
                                oPR["tooltipInvoice"] = "Received in Full";
                            }
                            //INDICATOR                            
                            if (oPR["EX_ZZAPCIND"].trim() == "Q") {
                                oPR.indicator = "RFQ";
                            } else if (oPR["EX_ZZAPCIND"].trim() == "X") {
                                oPR.indicator = "eCat";
                            } else if (oPR["EX_ZZPPAIND"].trim() == "X") {
                                oPR.indicator = "PPA";
                            }
                            //OUTLINE AGREEMENT
                            if (oPR["EX_KONNR"].trim() != "") {
                                oPR.outlineAgreement = true;
                            } else {
                                oPR.outlineAgreement = false;
                            }
                            //STATUS
                            oPR["EX_STATUS"].trim().split(",").forEach(status => {
                                switch (status) {
                                    // case "A":
                                    //     oPR.approved = status;
                                    //     break;
                                    case "O":
                                        oPR.overdue = status;
                                        break;
                                    case "U":
                                        oPR.updated = status;
                                        break;
                                }
                            });
                            //Fixed vendor / SourceSupply
                            if (oPR["EX_FLIEF"].trim() != "") {
                                oPR.buttonVisible = false;
                                oPR.checkVisible = true;
                            } else {
                                oPR.buttonVisible = true;
                                oPR.checkVisible = false;
                            }
                            if (state) {
                                if (oPR["RETURNED"] == "X") {
                                    oPR.returned = "R";
                                    if (oPR["EX_UPDATE"] == "X") {
                                        let dateUpdate = new Date(oPR["EX_UPD_DATE"].substring(0, 4), parseInt(oPR["EX_UPD_DATE"].substring(4, 6)) - 1, oPR["EX_UPD_DATE"].substring(6, 8), oPR["EX_UTIME"].substring(0, 2), oPR["EX_UTIME"].substring(2, 4), oPR["EX_UTIME"].substring(4, 6))
                                        let dateReturn = new Date(oPR["DATE"].substring(0, 4), parseInt(oPR["DATE"].substring(5, 7)) - 1, oPR["DATE"].substring(8, 10), oPR["TIME"].substring(0, 2), oPR["TIME"].substring(3, 5));
                                        if (dateUpdate > dateReturn) {
                                            oPR["returnedState"] = "Success";
                                        } else {
                                            oPR["returnedState"] = "Warning";
                                        }
                                    } else {
                                        oPR["returnedState"] = "Warning";
                                    }
                                }
                            } else {
                                if (oPR["EX_RETURN"] == "X") {
                                    oPR.returned = "R";
                                    if (oPR["EX_UPDATE"] == "X") {
                                        let dateUpdate = new Date(oPR["EX_UPD_DATE"].substring(0, 4), parseInt(oPR["EX_UPD_DATE"].substring(4, 6)) - 1, oPR["EX_UPD_DATE"].substring(6, 8), oPR["EX_UTIME"].substring(0, 2), oPR["EX_UTIME"].substring(2, 4), oPR["EX_UTIME"].substring(4, 6));
                                        let dateReturn = new Date(oPR["EX_RETURN_DATE"].substring(0, 4), parseInt(oPR["EX_RETURN_DATE"].substring(4, 6)) - 1, oPR["EX_RETURN_DATE"].substring(6, 8), oPR["EX_RETURN_TIME"].substring(0, 2), oPR["EX_RETURN_TIME"].substring(2, 4), oPR["EX_RETURN_TIME"].substring(4, 6));
                                        if (dateUpdate > dateReturn) {
                                            oPR["returnedState"] = "Success";
                                        } else {
                                            oPR["returnedState"] = "Warning";
                                        }
                                    } else {
                                        oPR["returnedState"] = "Warning";
                                    }
                                }
                            }

                            //item category
                            if (oPR["EX_PSTYP"].trim() == "9") {
                                oPR.iconICVisible = true;
                                oPR.textICVisible = false;
                                oPR.iconIC2Visible = false;
                            } else if (oPR["EX_PSTYP"].trim() == "2") {
                                oPR.iconICVisible = false;
                                oPR.textICVisible = false;
                                oPR.iconIC2Visible = true;
                            } else {
                                oPR.iconICVisible = false;
                                oPR.textICVisible = true;
                                oPR.iconIC2Visible = false;
                                if (oPR["EX_PSTYP"].trim() == "0") {
                                    oPR["EX_PSTYP"] = "";
                                }
                            }
                            //AcquisitionType
                            if (oPR["EX_ZZACQTYP"].trim() == "0 -") {
                                oPR["EX_ZZACQTYP"] = ""
                            }
                            //total Value
                            oPR.totalValue = parseFloat(oPR["EX_PREIS"].trim()) * parseFloat(oPR["EX_MENGE"].trim());
                            // //Request Status
                            // if (oPR["EX_FRGKZ"].trim() == "") {
                            //     if (oPR["EX_EBELN"].trim() == "" && (oPR["EX_ZZAPCIND"].trim() == "" || oPR["EX_ZZAPCIND"].trim() != "Q")) {
                            //         oPR
                            //     }
                            // }
                            //PO STATUS
                            if (state) {
                                if (["I", "L", "M", "R", "S"].includes(oPR["EX_FRGKE_PO"].trim())) {
                                    oPR.poStatus = "PO Approved";
                                    // oPOApproved.push(PO);
                                }
                            } else {
                                if (["R", "A", "E"].includes(oPR["EX_FRGKE_PO"].trim())) {
                                    oPR.poStatus = "PO Approved";
                                    // oPOApproved.push(PO);
                                }
                            }
                            if (oPR["EX_LABNR_PO"] == "Accepted") {
                                if (oPR.poStatus != undefined) {
                                    oPR.poStatus = oPR.poStatus + ", PO Issued";
                                } else {
                                    oPR.poStatus = "PO Issued";
                                }
                                // oPOIssued.push(PO);
                            }
                            if (oPR["EX_LOEKZ_PO"] == "S") {
                                if (oPR.poStatus != undefined) {
                                    oPR.poStatus = oPR.poStatus + ", PO Locked";
                                } else {
                                    oPR.poStatus = "PO Locked";
                                }
                                // oPOLocked.push(PO);
                            }
                            if (oPR["EX_LOEKZ_PO"] == "L") {
                                if (oPR.poStatus != undefined) {
                                    oPR.poStatus = PO.poStatus + ", PO Deleted";
                                } else {
                                    oPR.poStatus = "PO Deleted";
                                }
                                // oPODeleted.push(PO);
                            }
                            if (parseFloat(oPR["EX_WEMNG_PO"].trim()) > 0 && parseFloat(oPR["EX_WEMNG_PO"].trim()) < parseFloat(oPR["EX_MENGE_PO"].trim())) {
                                if (oPR.poStatus != undefined) {
                                    oPR.poStatus = oPR.poStatus + ", PO Partially Received";
                                } else {
                                    oPR.poStatus = "PO Partially Received";
                                }
                                // oPOPartiallyReceived.push(PO);
                            }
                            if (parseFloat(oPR["EX_WEMNG_PO"].trim()) == parseFloat(oPR["EX_MENGE_PO"].trim())) {
                                if (oPR.poStatus != undefined) {
                                    oPR.poStatus = oPR.poStatus + ", PO Full Received";
                                } else {
                                    oPR.poStatus = "PO Full Received";
                                }
                                // oPOFullReceived.push(PO);
                            }
                            if (oPR["EX_EREKZ_PO"] == "X") {
                                if (oPR.poStatus != undefined) {
                                    oPR.poStatus = oPR.poStatus + ", PO Fully Paid";
                                } else {
                                    oPR.poStatus = "PO Fully Paid";
                                }
                                // oPOFullyPaid.push(PO);
                            }
                            if (oPR["EX_MEMORY_PO"] == "X") {
                                if (oPR.poStatus != undefined) {
                                    oPR.poStatus = oPR.poStatus + ", PO Drafts";
                                } else {
                                    oPR.poStatus = "PO Drafts";
                                }
                                // oPODrafts.push(PO);
                            }
                            if (oPR.EX_PROCSTAT_PO == "03" && oPR["EX_LOEKZ_PO"] != "X") {
                                oPR.poStatus = "PO Created"
                                // oPOCreated.push(PO);
                            }
                            //Request Type
                            if (state) {
                                if (oPR["EX_ZZREQURG"].trim() == "99") {
                                    oPR.reqType = "Emergency";
                                    oPREmergency.push(oPR);
                                } else if (oPR["EX_ZZREQURG"].trim() == "97") {
                                    oPR.reqType = "Breakdown";
                                    oPRUrgent.push(oPR);
                                } else if (oPR.COMMENT != undefined) {
                                    oPR.reqType = "Comment";
                                    oPRComment.push(oPR);
                                } else {
                                    oPR.reqType = "Other";
                                    oPROther.push(oPR);
                                }
                            } else {
                                if (oPR["EX_ZZREQURG"].trim() == "001") {
                                    oPR.reqType = "Emergency";
                                    oPREmergency.push(oPR);
                                }
                                //  else if (oPR["EX_ZZREQURG"].trim() == "97") {
                                //     oPR.reqType = "Urgent";
                                //     oPRUrgent.push(oPR);
                                // } 
                                else if (oPR.COMMENT != undefined) {
                                    oPR.reqType = "Comment";
                                    oPRComment.push(oPR);
                                }
                                else {
                                    oPR.reqType = "Other";
                                    oPROther.push(oPR);
                                }
                            }
                            //Deletion Indicator
                            if (oPR["EX_LOEKZ"] == "X") {
                                oPRDeleted.push(oPR);
                            } else {
                                oPRNotDeleted.push(oPR);
                            }
                        });
                        //Request Type
                        let flagReqType = true;
                        if (IN_REQ_TYPE == "") {
                            flagReqType = false;
                        }
                        let dataReqType = [];
                        if (flagReqType) {
                            IN_REQ_TYPE = IN_REQ_TYPE.split(",");
                            IN_REQ_TYPE.forEach(reqType => {
                                switch (reqType) {
                                    case "EMERGENCY":
                                        dataReqType = dataReqType.concat(oPREmergency);
                                        break;
                                    case "URGENT":
                                        dataReqType = dataReqType.concat(oPRUrgent);
                                        break;
                                    case "OTHER":
                                        dataReqType = dataReqType.concat(oPROther);
                                        break;
                                    case "COMMENT":
                                        dataReqType = dataReqType.concat(oPRComment);
                                    default:
                                        break;
                                }
                            });
                        }

                        //deletion Indicator
                        let flagDeletion = true;
                        if (oCBDeletionIndicator.getSelectedKey() == "") {
                            flagDeletion = false;
                        }
                        let dataDeletion = [];
                        if (flagDeletion) {
                            if (oCBDeletionIndicator.getSelectedKey() == "X") {
                                dataDeletion = dataDeletion.concat(oPRDeleted);
                            } else if (oCBDeletionIndicator.getSelectedKey() == "E") {
                                dataDeletion = dataDeletion.concat(oPRNotDeleted);
                            }
                        }
                        let newData = [];
                        if (dataReqType.length == 0 && dataDeletion.length == 0 && !flagReqType) {
                            newData = data;
                        } else if (dataReqType.length == 0 && !flagReqType) {
                            newData = dataDeletion;
                        } else if (dataDeletion.length == 0) {
                            newData = dataReqType;
                        } else {
                            newData = dataReqType.filter(function (e) {
                                return dataDeletion.indexOf(e) != -1
                            });
                        }
                        // if (oIAgent.getValue() != "") {
                        //     newData = newData.filter(function(PR) {
                        //         return PR["EX_OBJID"] == oIAgent.getValue()
                        //     });
                        // }
                        this.dataBack = newData;
                        if (newData.length == 0) {
                            oController._buildDialog(oController._get_i18n("dialog_information"), "Information", "There´s no Purchase Requisition for the selected parameters.  ").open();
                            oController.oLoaderData.close()
                        }
                        let oModel = new JSONModel(newData);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "purchReqModel");
                        oController.getOwnerComponent().getModel("infoModel").setProperty("/countPR", newData.length);
                        if (newData.length > 10) {
                            oController.getOwnerComponent().getModel("infoModel").setProperty("/countPRVisible", 10);
                        } else {
                            oController.getOwnerComponent().getModel("infoModel").setProperty("/countPRVisible", newData.length);
                        }
                        this.filterStatus();

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        let oModel = new JSONModel();
                        oController.getOwnerComponent().setModel(oModel, "purchReqModel");
                        oController.getOwnerComponent().getModel("infoModel").setProperty("/countPR", 0);
                        oController.getOwnerComponent().getModel("infoModel").setProperty("/countPRVisible", 0);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getDataPR: async function () {
                this.oLoaderData.open();
                let flag = this.validateFilterBar();
                if (flag) {
                    let pSState = this.byId("idSData").getState();
                    await this.getPurchReq(pSState);
                    await this.byId("idTablePR").getBinding().refresh(true);
                    this.byId("idTablePR").clearSelection();
                }
                this.oLoaderData.close();
            },
            update: function () {
                console.log("update");
                this.oLoaderData.close();
            },
            validateFilterBar: function () {
                let sFragmentId = this.getView().createId("idFragmentFilterBar");
                let oCBCompanyCode = sap.ui.core.Fragment.byId(sFragmentId, "idCBCompanyCode");
                let oCBCompanyCodeLength = oCBCompanyCode.getSelectedKeys().length;
                let oCBPlant = sap.ui.core.Fragment.byId(sFragmentId, "idCBPlant");
                let oCBPlantLength = oCBPlant.getSelectedKeys().length;
                let oFGIDeliDateFrom = sap.ui.core.Fragment.byId(sFragmentId, "idFGIDeliDateFrom");
                let oFGIPuchRequi = sap.ui.core.Fragment.byId(sFragmentId, "idFGIPuchRequi");
                let msg = "";
                if (oCBCompanyCodeLength == 0) {
                    msg = msg + "- You must select a Company Code\n";
                }
                if (oCBPlantLength == 0) {
                    msg = msg + "- You must select a Plant\n";
                }
                if (oFGIDeliDateFrom.getMandatory()) {
                    let oDeliDateFrom = sap.ui.core.Fragment.byId(sFragmentId, "idDPDeliDateFrom");
                    let oDeliDateTo = sap.ui.core.Fragment.byId(sFragmentId, "idDPDeliDateTo");
                    if (oDeliDateFrom.getValue() == "") {
                        msg = msg + "- You must select a Delivery Date From\n";
                    } else if (oDeliDateTo.getValue() == "") {
                        msg = msg + "- You must select a Delivery Date To\n";
                    }
                } else if (oFGIPuchRequi.getMandatory()) {
                    let oCBPurchRequisitions = sap.ui.core.Fragment.byId(sFragmentId, "idCBPurchRequisitions");
                    if (oCBPurchRequisitions.getValue() == "") {
                        msg = msg + "- You must select a Purchase Requisitions or Delivery Date\n";
                    }
                }
                if (msg.length > 0) {
                    MessageBox.error(msg);
                    return false;
                } else {
                    return true;
                }
            },
            changeDate: function () {
                let sFragmentId = this.getView().createId("idFragmentFilterBar");
                let oDeliDateFrom = sap.ui.core.Fragment.byId(sFragmentId, "idDPDeliDateFrom");
                let oDeliDateTo = sap.ui.core.Fragment.byId(sFragmentId, "idDPDeliDateTo");
                if (oDeliDateFrom.getValue() == "" && oDeliDateTo.getValue() == "") {
                    sap.ui.core.Fragment.byId(sFragmentId, "idFGIDeliDateFrom").setMandatory(false);
                    sap.ui.core.Fragment.byId(sFragmentId, "idFGIDeliDateTo").setMandatory(false);
                    sap.ui.core.Fragment.byId(sFragmentId, "idFGIPuchRequi").setMandatory(true);
                    sap.ui.core.Fragment.byId(sFragmentId, "idFGIPuchRequi").setVisibleInFilterBar(true);
                } else {
                    sap.ui.core.Fragment.byId(sFragmentId, "idFGIDeliDateFrom").setMandatory(true);
                    sap.ui.core.Fragment.byId(sFragmentId, "idFGIDeliDateTo").setMandatory(true);
                    sap.ui.core.Fragment.byId(sFragmentId, "idFGIDeliDateFrom").setVisibleInFilterBar(true);
                    sap.ui.core.Fragment.byId(sFragmentId, "idFGIDeliDateTo").setVisibleInFilterBar(true);
                    sap.ui.core.Fragment.byId(sFragmentId, "idFGIPuchRequi").setMandatory(false);
                }
            },
            getAttachment: async function (IN_BANFN, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_ATTACHMENTSet";
                var filters = [
                    new sap.ui.model.Filter("IN_BANFN", sap.ui.model.FilterOperator.EQ, IN_BANFN),
                ];
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok

                        data.BANFN = IN_BANFN;
                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "attachmentModel");
                        oController.getOwnerComponent().getModel("infoModel").setProperty("/countAttachment", data.length);
                    } else if (data[0].EX_RESULTADO_EJECUCION == "I") {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", data[0].EX_DSC_EJECUCION).open();
                        let oModel = new JSONModel();
                        oController.getOwnerComponent().setModel(oModel, "attachmentModel");
                        oController.getOwnerComponent().getModel("infoModel").setProperty("/countAttachment", 0);
                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                    oController.oLoaderData.close();
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getAttachmentSES: async function (IN_LBLNI, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_ED_ATTACH_SESSet";
                var filters = [
                    new sap.ui.model.Filter("IN_LBLNI", sap.ui.model.FilterOperator.EQ, IN_LBLNI),
                ];
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok

                        data.BANFN = IN_LBLNI;
                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "attachmentModel");
                        oController.getOwnerComponent().getModel("infoModel").setProperty("/countAttachment", data.length);
                    } else if (data[0].EX_RESULTADO_EJECUCION == "I") {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", data[0].EX_DSC_EJECUCION).open();
                        let oModel = new JSONModel();
                        oController.getOwnerComponent().setModel(oModel, "attachmentModel");
                        oController.getOwnerComponent().getModel("infoModel").setProperty("/countAttachment", 0);
                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                    oController.oLoaderData.close();
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getAttachmentBase64: async function (IN_LOIO_ID, fileName, extensionType, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_ATTACH_DOWNLOADSet";
                var filters = [
                    new sap.ui.model.Filter("IN_LOIO_ID", sap.ui.model.FilterOperator.EQ, IN_LOIO_ID),
                ];
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok
                        let decodedPdfContent = atob(data[0].EX_BASE_64);
                        let byteArray = new Uint8Array(decodedPdfContent.length)
                        for (let i = 0; i < decodedPdfContent.length; i++) {
                            byteArray[i] = decodedPdfContent.charCodeAt(i);
                        }
                        let title = fileName + "." + extensionType
                        if (extensionType == "pdf") {
                            let type = 'application/pdf'
                        } else if (extensionType == "xls") {
                            let type = 'application/vnd.ms-excel'
                        } else if (extensionType == "csv") {
                            let type = 'text/csv'
                        } else if (extensionType == "txt") {
                            let type = 'text/plain;charset=utf-8'
                        } else if (extensionType == "doc") {
                            let type = 'application/msword'
                        }
                        let blob = new Blob([byteArray.buffer], {
                            //data:application/msword;base64
                            //en la siguiente linea si es un Word tu escribes “msword”, si es un pdf entonces “pdf” y excel vnd.ms-excel
                            type: 'application/' + extensionType
                        });
                        if (window.navigator.msSaveOrOpenBlob) {
                            window.navigator.msSaveBlob(blob, title);
                        } else {
                            let elem = window.document.createElement('a');
                            elem.href = window.URL.createObjectURL(blob);
                            elem.download = title;
                            document.body.appendChild(elem);
                            elem.click();
                            document.body.removeChild(elem);
                        }
                        // let oModel = new JSONModel(data);
                        // oModel.setSizeLimit(100000);
                        // oController.getOwnerComponent().setModel(oModel, "attachmentModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                    oController.oLoaderData.close();
                } catch (e) {
                    //Response Error
                    oController.oLoaderData.close();
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            changeCompanyCode: async function () {
                this.oLoaderApp.open();
                let BUKRS = "";
                let sFragmentId = this.getView().createId("idFragmentFilterBar");
                let oCBPlant = sap.ui.core.Fragment.byId(sFragmentId, "idCBPlant");
                let oCBCompanyCode = sap.ui.core.Fragment.byId(sFragmentId, "idCBCompanyCode");
                oCBPlant.setSelectedItems();
                this.changePlant();
                // let oCBPurchOrg = sap.ui.core.Fragment.byId(sFragmentId, "idCBPurchOrg");
                // oCBPurchOrg.setSelectedItems();
                // this.changePurchOrg();
                let oDPDeliDateFrom = sap.ui.core.Fragment.byId(sFragmentId, "idDPDeliDateFrom");
                let oDPDeliDateTo = sap.ui.core.Fragment.byId(sFragmentId, "idDPDeliDateTo");
                // let oRSFilterValueFrom = sap.ui.core.Fragment.byId(sFragmentId, "idRSFilterValueFrom");
                // let oRSFilterValueTo = sap.ui.core.Fragment.byId(sFragmentId, "idRSFilterValueTo");
                let oCBPurchRequisitions = sap.ui.core.Fragment.byId(sFragmentId, "idCBPurchRequisitions");
                // let oCBPurchGroup = sap.ui.core.Fragment.byId(sFragmentId, "idCBPurchGroup");
                // let oCBAcquisitionType = sap.ui.core.Fragment.byId(sFragmentId, "idCBAcquisitionType");
                let oIOutlineAgreement = sap.ui.core.Fragment.byId(sFragmentId, "idIOutlineAgreement");
                let oIRequisitioner = sap.ui.core.Fragment.byId(sFragmentId, "idIRequisitioner");
                let oCBDeletionIndicator = sap.ui.core.Fragment.byId(sFragmentId, "idCBDeletionIndicator");
                // let oIPPADescrip = sap.ui.core.Fragment.byId(sFragmentId, "idIPPADescrip");
                let oCBRequestType = sap.ui.core.Fragment.byId(sFragmentId, "idCBRequestType");
                // let oCBRequestStatus = sap.ui.core.Fragment.byId(sFragmentId, "idCBRequestStatus");
                let oIManufac = sap.ui.core.Fragment.byId(sFragmentId, "idIManufac");
                let oCBDocumentType = sap.ui.core.Fragment.byId(sFragmentId, "idCBDocumentType");
                // let oCBAccountAssignment = sap.ui.core.Fragment.byId(sFragmentId, "idCBAccountAssignment");
                // let oCBItemCategory = sap.ui.core.Fragment.byId(sFragmentId, "idCBItemCategory");
                let oCBCostCenter = sap.ui.core.Fragment.byId(sFragmentId, "idCBCostCenter");
                let oCBWBSElement = sap.ui.core.Fragment.byId(sFragmentId, "idCBWBSElement");
                let oCBGLAccount = sap.ui.core.Fragment.byId(sFragmentId, "idCBGLAccount");
                let oIPONumber = sap.ui.core.Fragment.byId(sFragmentId, "idIPONumber");
                let oIStatusApproval = sap.ui.core.Fragment.byId(sFragmentId, "idIStatusApproval");
                let oCBPOStatus = sap.ui.core.Fragment.byId(sFragmentId, "idCBPOStatus");
                let oCBGRVStatus = sap.ui.core.Fragment.byId(sFragmentId, "idCBGRVStatus");
                let oISESNumber = sap.ui.core.Fragment.byId(sFragmentId, "idISESNumber");
                let oCBSESApprovalStatus = sap.ui.core.Fragment.byId(sFragmentId, "idCBSESApprovalStatus");
                let oCBInvoicedStatus = sap.ui.core.Fragment.byId(sFragmentId, "idCBInvoicedStatus");
                // let oCBItemDescription = sap.ui.core.Fragment.byId(sFragmentId, "idCBItemDescription");
                let oICreatedBy = sap.ui.core.Fragment.byId(sFragmentId, "idICreatedBy");
                let pSState = this.byId("idSData").getState();
                if (oCBCompanyCode.getSelectedItems().length != 0) {
                    oCBCompanyCode.getSelectedItems().forEach(item => {
                        BUKRS = BUKRS + item.getKey() + ",";
                    });
                    oCBPlant.setEnabled(true);
                    // oCBPurchOrg.setEnabled(true);
                    this.BUKRS = BUKRS.substring(0, BUKRS.length - 1);
                    await this.getPlant(this.BUKRS, pSState);
                    // oCBPurchOrg.setEnabled(true);
                    // this.getPurchOrg(this.BUKRS, pSState);
                    // this.getAcquisitionType(this.BUKRS, pSState);
                    await this.getCostCenter(this.BUKRS, pSState);
                    await this.getWBSElement(this.BUKRS, pSState);
                    await this.getGLAccount(this.BUKRS, pSState);
                    oDPDeliDateFrom.setEnabled(true);
                    oDPDeliDateTo.setEnabled(true);
                    // oRSFilterValueFrom.setEnabled(true);
                    // oRSFilterValueTo.setEnabled(true);
                    oCBPurchRequisitions.setEnabled(true);
                    // oCBPurchGroup.setEnabled(true);
                    // oCBAcquisitionType.setEnabled(true);
                    oIOutlineAgreement.setEnabled(true);
                    oIRequisitioner.setEnabled(true);
                    oCBDeletionIndicator.setEnabled(true);
                    // oIPPADescrip.setEnabled(true);
                    oCBRequestType.setEnabled(true);
                    // oCBRequestStatus.setEnabled(true);
                    oIManufac.setEnabled(true);
                    // oCBDocumentType.setEnabled(true);
                    // oCBAccountAssignment.setEnabled(true);
                    // oCBItemCategory.setEnabled(true);
                    oCBCostCenter.setEnabled(true);
                    oCBWBSElement.setEnabled(true);
                    oCBGLAccount.setEnabled(true);
                    oIPONumber.setEnabled(true);
                    oIStatusApproval.setEnabled(true);
                    oCBPOStatus.setEnabled(true);
                    oCBGRVStatus.setEnabled(true);
                    oISESNumber.setEnabled(true);
                    oCBSESApprovalStatus.setEnabled(true);
                    oCBInvoicedStatus.setEnabled(true);
                    // oCBItemDescription.setEnabled(true);
                    oICreatedBy.setEnabled(true);
                } else {
                    let oModel = new JSONModel();
                    this.getOwnerComponent().setModel(oModel, "plantModel");
                    this.getOwnerComponent().setModel(oModel, "costCenterModel");
                    this.getOwnerComponent().setModel(oModel, "wbsElementModel");
                    this.getOwnerComponent().setModel(oModel, "GLAccountModel");
                    // this.getOwnerComponent().setModel(oModel, "purchOrgModel");
                    // this.getOwnerComponent().setModel(oModel, "purchGroupModel");
                    // this.getOwnerComponent().setModel(oModel, "acquisitionTypeModel");
                    oCBPlant.setEnabled(false);
                    // oCBPurchGroup.setEnabled(false);
                    oDPDeliDateFrom.setEnabled(false);
                    oDPDeliDateTo.setEnabled(false);
                    // oRSFilterValueFrom.setEnabled(false);
                    // oRSFilterValueTo.setEnabled(false);
                    oCBPurchRequisitions.setEnabled(false);
                    // oCBPurchOrg.setEnabled(false);
                    // oCBAcquisitionType.setEnabled(false);
                    oIOutlineAgreement.setEnabled(false);
                    oIRequisitioner.setEnabled(false);
                    oCBDeletionIndicator.setEnabled(false);
                    // oIPPADescrip.setEnabled(false);
                    oCBRequestType.setEnabled(false);
                    // oCBRequestStatus.setEnabled(false);
                    oIManufac.setEnabled(false);
                    oCBCostCenter.setEnabled(false);
                    oCBWBSElement.setEnabled(false);
                    oCBGLAccount.setEnabled(false);
                    oIPONumber.setEnabled(false);
                    oIStatusApproval.setEnabled(false);
                    oCBPOStatus.setEnabled(false);
                    oCBGRVStatus.setEnabled(false);
                    oISESNumber.setEnabled(false);
                    oCBSESApprovalStatus.setEnabled(false);
                    oCBInvoicedStatus.setEnabled(false);
                    // oCBItemDescription.setEnabled(false);
                    oICreatedBy.setEnabled(false);
                    // oCBDocumentType.setEnabled(false);
                    // oCBAccountAssignment.setEnabled(false);
                    // oCBItemCategory.setEnabled(false);
                    this.BUKRS = "";
                }
                this.oLoaderApp.close();
            },
            changePlant: async function () {
                let WERKS = "";
                let sFragmentId = this.getView().createId("idFragmentFilterBar");
                let oCBStoLocation = sap.ui.core.Fragment.byId(sFragmentId, "idCBStoLocation");
                oCBStoLocation.setSelectedItems();
                this.changeStoLocation();
                let oCBMaterial = sap.ui.core.Fragment.byId(sFragmentId, "idCBMaterial");
                oCBMaterial.setValue();
                let oIOrderNumber = sap.ui.core.Fragment.byId(sFragmentId, "idIOrderNumber");
                oIOrderNumber.setValue();
                oIOrderNumber.setSelectedKey();
                let oCBPlant = sap.ui.core.Fragment.byId(sFragmentId, "idCBPlant");
                let pSState = this.byId("idSData").getState();
                if (oCBPlant.getSelectedItems().length != 0) {
                    oCBPlant.getSelectedItems().forEach(item => {
                        WERKS = WERKS + item.getKey() + ",";
                    });
                    oCBStoLocation.setEnabled(true);
                    await this.getStoLocation(WERKS.substring(0, WERKS.length - 1), pSState);
                    oCBMaterial.setEnabled(true);
                    await this.getMaterials(WERKS.substring(0, WERKS.length - 1), pSState);
                    oIOrderNumber.setEnabled(true);
                    await this.getOrderNumber(WERKS.substring(0, WERKS.length - 1), pSState);
                    this.WERKS = WERKS.substring(0, WERKS.length - 1);
                } else {
                    let oModel = new JSONModel();
                    this.getOwnerComponent().setModel(oModel, "stoLocationModel");
                    this.getOwnerComponent().setModel(oModel, "materialsModel");
                    this.getOwnerComponent().setModel(oModel, "orderNumberModel");
                    oCBMaterial.setEnabled(false);
                    oIOrderNumber.setEnabled(false);
                    oCBStoLocation.setEnabled(false);
                    this.WERKS = "";
                }

            },
            // changePurchOrg: function () {
            //     let EKORG = "";
            //     let sFragmentId = this.getView().createId("idFragmentFilterBar");
            //     let oCBVendor = sap.ui.core.Fragment.byId(sFragmentId, "idCBVendor");
            //     oCBVendor.setValue();
            //     let oCBPurchOrg = sap.ui.core.Fragment.byId(sFragmentId, "idCBPurchOrg");
            //     let oCBVendorFixed = sap.ui.core.Fragment.byId(sFragmentId, "idCBVendorFixed");
            //     let pSState = this.byId("idSData").getState();
            //     if (oCBPurchOrg.getSelectedItems().length != 0) {
            //         oCBPurchOrg.getSelectedItems().forEach(item => {
            //             EKORG = EKORG + item.getKey() + ",";
            //         });
            //         oCBVendor.setEnabled(true);
            //         oCBVendorFixed.setEnabled(true);
            //         this.getVendor(EKORG.substring(0, EKORG.length - 1), pSState);
            //         this.EKORG = EKORG.substring(0, EKORG.length - 1);
            //     } else {
            //         let oModel = new JSONModel();
            //         this.getOwnerComponent().setModel(oModel, "vendorModel");
            //         oCBVendor.setEnabled(false);
            //         oCBVendorFixed.setEnabled(false);
            //         this.EKORG = "";
            //     }

            // },
            changeStoLocation: function () {
                let sFragmentId = this.getView().createId("idFragmentFilterBar");
                let oCBStoLocation = sap.ui.core.Fragment.byId(sFragmentId, "idCBStoLocation");
                let LGORT = "";
                if (oCBStoLocation.getSelectedItems().length != 0) {
                    oCBStoLocation.getSelectedItems().forEach(item => {
                        LGORT = LGORT + item.getKey() + ",";
                    });
                    // this.getView().byId("idCBMaterial").setEnabled(true);
                    // this.getMaterials(this.WERKS, "");
                    this.LGORT = LGORT.substring(0, LGORT.length - 1);
                } else {
                    let oModel = new JSONModel();
                    // this.getOwnerComponent().setModel(oModel, "materialsModel");
                    // this.getView().byId("idCBMaterial").setEnabled(false);
                    this.LGORT = "";
                }
            },
            // changePurchGroup: function () {
            //     let sFragmentId = this.getView().createId("idFragmentFilterBar");
            //     let oCBPurchGroup = sap.ui.core.Fragment.byId(sFragmentId, "idCBPurchGroup");
            //     let EKGRP = "";
            //     if (oCBPurchGroup.getSelectedItems().length != 0) {
            //         oCBPurchGroup.getSelectedItems().forEach(item => {
            //             EKGRP = EKGRP + item.getKey() + ",";
            //         });
            //         // this.getView().byId("idCBMaterial").setEnabled(true);
            //         // this.getMaterials(this.WERKS, "");
            //         this.EKGRP = EKGRP.substring(0, EKGRP.length - 1);
            //     } else {
            //         let oModel = new JSONModel();
            //         // this.getOwnerComponent().setModel(oModel, "materialsModel");
            //         // this.getView().byId("idCBMaterial").setEnabled(false);
            //         this.EKGRP = "";
            //     }
            // },
            getGLAccount: async function (IN_BURKS, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_GL_ACCOUNTSet";
                var filters = [
                    new sap.ui.model.Filter("IN_BUKRS", sap.ui.model.FilterOperator.EQ, IN_BURKS),
                ]
                var oData = {};
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok
                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "GLAccountModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                } catch (e) {
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getCostCenter: async function (IN_BUKRS, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZS_WS_COST_CENTERSet";
                var filters = [
                    new sap.ui.model.Filter("IN_BUKRS", sap.ui.model.FilterOperator.EQ, IN_BUKRS),
                ]
                var oData = {};
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok


                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "costCenterModel");

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                        return "e";
                    }
                } catch (e) {
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getOrderNumber: async function (IN_WERKS, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_ORDER_NUMBERSet";
                var filters = [
                    new sap.ui.model.Filter("IN_WERKS", sap.ui.model.FilterOperator.EQ, IN_WERKS),
                ];
                var oData = {};
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok

                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(400000);
                        oController.getOwnerComponent().setModel(oModel, "orderNumberModel");
                        return "s";
                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                        return "e";
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                        return "e";
                    }
                } catch (e) {
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getWBSElement: async function (IN_BUKRS, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_WBS_ELEMENTSet";
                var filters = [
                    new sap.ui.model.Filter("IN_BUKRS", sap.ui.model.FilterOperator.EQ, IN_BUKRS),
                ];
                var oData = {};
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok

                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "wbsElementModel");
                        return "s";
                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        console.log(data[0].EX_DSC_EJECUCION);
                        return "e";
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                        return "e";
                    }
                } catch (e) {
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            showOrderNumber: function (oEvent) {
                let sFragmentId = this.getView().createId("idFragmentFilterBar");
                sap.ui.core.Fragment.byId(sFragmentId, "idIOrderNumber").setSelectedKey();
                var oView = this.getView();
                this._sInputId = oEvent.getSource().getId();
                // create value help dialog
                if (!this._pValueHelpDialogOrderNumber) {
                    this._pValueHelpDialogOrderNumber = Fragment.load({
                        id: oView.getId(),
                        name: "scr.prtracking.fragments.orderNumberFilter",
                        controller: this
                    }).then(function (oValueHelpDialog) {
                        oView.addDependent(oValueHelpDialog);
                        return oValueHelpDialog;
                    });
                }
                // open value help dialog
                this._pValueHelpDialogOrderNumber.then(function (oValueHelpDialog) {
                    oValueHelpDialog.open();
                });
            },
            searchOrderNumber: function (oEvent) {
                var sValue = oEvent.getParameter("value");

                var oFilter = new Filter({
                    filters: [
                        new Filter("EX_KTEXT", FilterOperator.Contains, sValue),
                        new Filter("EX_AUFNR", FilterOperator.Contains, sValue)
                    ],
                    and: false
                })
                oEvent.getSource().getBinding("items").filter([oFilter]);
            },
            closeOrderNumberFilter: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedItem");
                let title = oEvent.getSource().getTitle();
                if (oSelectedItem) {
                    var productInput = this.byId(this._sInputId);
                    productInput.setSelectedKey(oSelectedItem.getDescription());
                    productInput.setValue(oSelectedItem.getDescription());
                }
                oEvent.getSource().getBinding("items").filter([]);
            },
            getFiltersCap: async function (parameter) {
                var URL = "sc/parameters/getParametersPR";
                var oData = {
                    name: parameter
                };
                let response = await this.requestCAP(URL, oData, 'POST');
                if (response.EX_RESULT == "S") {
                    if (Object.entries(response.EX_DATA).length === 0) {
                        this._buildDialog(this._get_i18n("dialog_error"), "Error", this._get_i18n("dialog_msg_3") + " " + parameter).open();
                    } else {

                        let oModel = new JSONModel(response.EX_DATA);
                        this.getOwnerComponent().setModel(oModel, parameter + "Model");
                    }
                } else {
                    this._buildDialog(this._get_i18n("dialog_error"), "Error", this._get_i18n("dialog_msg_2") + " /sc/parameter/getParametersPR " + this._get_i18n("dialog_msg_2_1")).open();
                }

            },
            postReturnedPR: async function (PRs) {
                var URL = "sc/pr/returnedPR";
                var oData = {
                    PR: PRs
                };
                let that = this;
                MessageBox.confirm(this._get_i18n("dialog_msg_5") + " " + PRs.length + " PRs?", {
                    onClose: async function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            let response = await that.requestCAP(URL, oData, 'POST');
                            if (response.EX_RESULT == "S") {
                                await that.getDataPR();
                                that._buildDialog(that._get_i18n("dialog_success"), "Success", that._get_i18n("dialog_msg_6")).open();
                            } else if (!response) {
                                that._buildDialog(that._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                            } else {
                                that._buildDialog(that._get_i18n("dialog_error"), "Error", that._get_i18n(response.EX_MESSAGE)).open();
                            }

                        }
                    }
                });


            },
            checkRejectedPR: async function () {
                var URL = "sc/pr/getRejectedPRs";
                var oData = {
                    WERKS: this.WERKS.split(","),
                    BUKRS: this.BUKRS.split(",")
                };
                let response = await this.requestCAP(URL, oData, 'POST');
                if (response.EX_RESULT == "S") {
                    return response.EX_DATA;
                } else if (!response) {
                    this._buildDialog(this._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                } else {
                    this._buildDialog(this._get_i18n("dialog_error"), "Error", this._get_i18n("dialog_msg_2") + " sc/pr/getPOs " + this._get_i18n("dialog_msg_2_1")).open();
                }

            },
            checkReturnedPR: async function () {
                var URL = "sc/pr/getPRs";
                var oData = {
                    WERKS: this.WERKS.split(","),
                    BUKRS: this.BUKRS.split(",")
                };
                let response = await this.requestCAP(URL, oData, 'POST');
                if (response.EX_RESULT == "S") {
                    return response.EX_DATA;
                } else if (!response) {
                    this._buildDialog(this._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                } else {
                    this._buildDialog(this._get_i18n("dialog_error"), "Error", this._get_i18n("dialog_msg_2") + " /sc/parameter/getParametersPR " + this._get_i18n("dialog_msg_2_1")).open();
                }

            },
            getCommentsPRs: async function () {
                var URL = "sc/pr/getCommentsPRs";
                var oData = {
                    WERKS: this.WERKS.split(","),
                    BUKRS: this.BUKRS.split(",")
                };
                let response = await this.requestCAP(URL, oData, 'POST');
                if (response.EX_RESULT == "S") {
                    return response.EX_DATA;
                } else if (!response) {
                    this._buildDialog(this._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                } else {
                    this._buildDialog(this._get_i18n("dialog_error"), "Error", this._get_i18n("dialog_msg_2") + " /sc/parameter/getParametersPR " + this._get_i18n("dialog_msg_2_1")).open();
                }

            },
            posFiltersDefault: async function (data) {
                var URL = "sc/pr/setFilters";
                let response = await this.requestCAP(URL, data, 'POST');
                if (response.EX_RESULT == "S") {
                    if (response.EX_MESSAGE !== "llamada_satisfactoria") {
                        this._buildDialog(this._get_i18n("dialog_error"), "Error", this._get_i18n("dialog_msg_3") + " setFilters").open();
                    } else {

                        return response.EX_DATA;
                    }
                } else if (!response) {
                    this._buildDialog(this._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    return false;
                } else {
                    this._buildDialog(this._get_i18n("dialog_error"), "Error", this._get_i18n("dialog_msg_2") + " /sc/parameter/getParametersPR " + this._get_i18n("dialog_msg_2_1")).open();
                    return false;
                }

            },
            getFiltersDefault: async function () {
                var URL = "sc/pr/getFilters";
                var oData = {
                    mail: this.userConnected,
                    appCode: "1"
                };
                let response = await this.requestCAP(URL, oData, 'POST');
                if (response.EX_RESULT == "S") {
                    if (response.EX_DATA.filters.length > 0) {
                        let sFragmentId = this.getView().createId("idFragmentFilterBar");
                        let oFilterBar = sap.ui.core.Fragment.byId(sFragmentId, "idFilterBar");
                        let filters = oFilterBar.getFilterGroupItems();
                        filters.forEach(filter => {
                            var newArray = response.EX_DATA.filters.filter(function (filter2) {
                                return filter2.name == filter.getName();
                            });
                            if (newArray.length != 0) {
                                filter.setVisibleInFilterBar(true);
                            } else {
                                filter.setVisibleInFilterBar(false);
                            }
                        });
                    }
                } else if (response.EX_RESULT == "E") {
                    // this._buildDialog(this._get_i18n("dialog_error"), "Error", this._get_i18n(response.EX_MESSAGE)).open();
                    console.log(response.EX_MESSAGE);
                } else if (!response) {
                    this._buildDialog(this._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                } else {
                    this._buildDialog(this._get_i18n("dialog_error"), "Error", this._get_i18n("dialog_msg_2") + " /sc/parameter/getParametersPR " + this._get_i18n("dialog_msg_2_1")).open();
                }

                let sFragmentId = this.getView().createId("idFragmentFilterBar");
                sap.ui.core.Fragment.byId(sFragmentId, "idFGIDeliDateFrom").setVisibleInFilterBar(true);;
                sap.ui.core.Fragment.byId(sFragmentId, "idFGIDeliDateTo").setVisibleInFilterBar(true);;
                this.byId("expandablePanel").setExpandable(false);

            },
            // handleValueHelp: function (oEvent) {
            //     var oView = this.getView();
            //     this._sInputId = oEvent.getSource().getId();

            //     // create value help dialog
            //     if (!this._pValueHelpDialog) {
            //         this._pValueHelpDialog = Fragment.load({
            //             id: oView.getId(),
            //             name: "scr.prtracking.fragments.vendorFilter",
            //             controller: this
            //         }).then(function (oValueHelpDialog) {
            //             oView.addDependent(oValueHelpDialog);
            //             return oValueHelpDialog;
            //         });
            //     }
            //     // open value help dialog
            //     this._pValueHelpDialog.then(function (oValueHelpDialog) {
            //         oValueHelpDialog.open();
            //     });
            // },
            showVendor: function (oEvent) {
                var oView = this.getView();
                this._sInputId = oEvent.getSource().getId();

                // create value help dialog
                if (!this._pValueHelpDialogVendor) {
                    this._pValueHelpDialogVendor = Fragment.load({
                        id: oView.getId(),
                        name: "scr.prtracking.fragments.vendorFilter",
                        controller: this
                    }).then(function (oValueHelpDialog) {
                        oView.addDependent(oValueHelpDialog);
                        return oValueHelpDialog;
                    });
                }
                // open value help dialog
                this._pValueHelpDialogVendor.then(function (oValueHelpDialog) {
                    oValueHelpDialog.open();
                });
            },
            showMaterial: function (oEvent) {
                var oView = this.getView();
                this._sInputId = oEvent.getSource().getId();

                // create value help dialog
                if (!this._pValueHelpDialogMaterial) {
                    this._pValueHelpDialogMaterial = Fragment.load({
                        id: oView.getId(),
                        name: "scr.prtracking.fragments.materialFilter",
                        controller: this
                    }).then(function (oValueHelpDialog) {
                        oView.addDependent(oValueHelpDialog);
                        return oValueHelpDialog;
                    });
                }
                // open value help dialog
                this._pValueHelpDialogMaterial.then(function (oValueHelpDialog) {
                    oValueHelpDialog.open();
                });
            },
            showServices: function (oEvent) {
                var oView = this.getView();
                this._sInputId = oEvent.getSource().getId();

                // create value help dialog
                if (!this._pValueHelpDialogServices) {
                    this._pValueHelpDialogServices = Fragment.load({
                        id: oView.getId(),
                        name: "scr.prtracking.fragments.servicesFilter",
                        controller: this
                    }).then(function (oValueHelpDialog) {
                        oView.addDependent(oValueHelpDialog);
                        return oValueHelpDialog;
                    });
                }
                // open value help dialog
                this._pValueHelpDialogServices.then(function (oValueHelpDialog) {
                    oValueHelpDialog.open();
                });
            },
            showHeaderNote: async function (oEvent) {
                let oModel = new JSONModel();
                this.getOwnerComponent().setModel(oModel, "headerNoteModel");
                var oButton = oEvent.getSource(),
                    oView = this.getView();
                let sPath = oEvent.getSource().getParent().getBindingContext("purchReqModel").getPath();
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(sPath);
                let pSState = this.byId("idSData").getState();
                let response = await this.getHeaderNote(oPR.EX_BANFN, pSState);
                if (response == "s") {
                    // create popover
                    if (!this._pPopoverHeaderNote) {
                        this._pPopoverHeaderNote = Fragment.load({
                            id: oView.getId(),
                            name: "scr.prtracking.fragments.headerNote",
                            controller: this
                        }).then(function (oPopover) {
                            oView.addDependent(oPopover);
                            return oPopover;
                        });
                    }
                    this._pPopoverHeaderNote.then(function (oPopover) {
                        oPopover.openBy(oButton);
                    });
                }
            },
            showDeliveryNote: async function (oEvent) {
                let oModel = new JSONModel();
                this.getOwnerComponent().setModel(oModel, "deliveryNoteModel");
                var oButton = oEvent.getSource(),
                    oView = this.getView();
                let sPath = oEvent.getSource().getParent().getBindingContext("purchReqModel").getPath();
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(sPath);
                let pSState = this.byId("idSData").getState();
                let response = await this.getDeliveryNote(oPR.EX_BANFN + oPR.EX_BNFPO, pSState);
                if (response == "s") {
                    // create popover
                    if (!this._pPopoverDeliveryNote) {
                        this._pPopoverDeliveryNote = Fragment.load({
                            id: oView.getId(),
                            name: "scr.prtracking.fragments.deliveryNote",
                            controller: this
                        }).then(function (oPopover) {
                            oView.addDependent(oPopover);
                            return oPopover;
                        });
                    }
                    this._pPopoverDeliveryNote.then(function (oPopover) {
                        oPopover.openBy(oButton);
                    });
                }
            },
            showItemText: async function (oEvent) {
                let oModel = new JSONModel();
                this.getOwnerComponent().setModel(oModel, "itemTextModel");
                var oButton = oEvent.getSource(),
                    oView = this.getView();
                let sPath = oEvent.getSource().getParent().getBindingContext("purchReqModel").getPath();
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(sPath);
                let pSState = this.byId("idSData").getState();
                let response = await this.getItemText(oPR.EX_BANFN + oPR.EX_BNFPO, pSState);
                if (response == "s") {
                    // create popover
                    if (!this._pPopoverItemText) {
                        this._pPopoverItemText = Fragment.load({
                            id: oView.getId(),
                            name: "scr.prtracking.fragments.itemText",
                            controller: this
                        }).then(function (oPopover) {
                            oView.addDependent(oPopover);
                            return oPopover;
                        });
                    }
                    this._pPopoverItemText.then(function (oPopover) {
                        oPopover.openBy(oButton);
                    });
                }
            },
            closeDialog2: function () {
                this.vendorDialog.close();
            },
            _handleValueHelpSearch: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                var oFilter = new Filter({
                    filters: [
                        new Filter("EX_NAME1", FilterOperator.Contains, sValue),
                        new Filter("EX_LIFNR", FilterOperator.Contains, sValue)
                    ],
                    and: false
                })
                oEvent.getSource().getBinding("items").filter([oFilter]);
            },
            searchMaterial: function (oEvent) {
                var sValue = oEvent.getParameter("value");

                var oFilter = new Filter({
                    filters: [
                        new Filter("EX_MAKTX", FilterOperator.Contains, sValue),
                        new Filter("EX_MATNR", FilterOperator.Contains, sValue)
                    ],
                    and: false
                })
                oEvent.getSource().getBinding("items").filter([oFilter]);
            },
            searchServices: function (oEvent) {
                var sValue = oEvent.getParameter("value");
                var oFilter = new Filter({
                    filters: [
                        new Filter("EX_ASNUM", FilterOperator.Contains, sValue),
                        new Filter("EX_ASKTX", FilterOperator.Contains, sValue)
                    ],
                    and: false
                })
                oEvent.getSource().getBinding("items").filter([oFilter]);
            },

            _handleValueHelpClose: function (oEvent) {
                var oSelectedItem = oEvent.getParameter("selectedItem");
                let title = oEvent.getSource().getTitle();
                if (oSelectedItem) {
                    var productInput = this.byId(this._sInputId);
                    productInput.setValue(oSelectedItem.getTitle());
                    productInput.setSelectedKey(oSelectedItem.getDescription());
                }
                oEvent.getSource().getBinding("items").filter([]);
            },
            showAttachment: async function (oEvent) {
                let sPath = oEvent.getSource().getParent().getBindingContext("purchReqModel").getPath();
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(sPath);
                let pSState = this.byId("idSData").getState();
                await this.getAttachment(oPR.EX_BANFN, pSState);
                let countAttachment = this.getOwnerComponent().getModel("infoModel").getProperty("/countAttachment");
                if (countAttachment > 0) {
                    this.createAttachmentDialog();
                }
            },
            showAttachmentSES: async function (oEvent) {
                let sPath = oEvent.getSource().getParent().getBindingContext("purchReqModel").getPath();
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(sPath);
                let pSState = this.byId("idSData").getState();
                await this.getAttachmentSES(oPR.EX_SES_NUMBER, pSState);
                let countAttachment = this.getOwnerComponent().getModel("infoModel").getProperty("/countAttachment");
                if (countAttachment > 0) {
                    this.createAttachmentDialog();
                }
            },
            createAttachmentDialog: function () {
                //Llamamos a la funcion que creara el dialogo y nos lo retornara y asi podremos abrirlo
                this._createDialogs("DialogAttachment", "idDialogAttachment", "scr.prtracking.fragments.attachmentDialog").open();
            },
            showPRServices: async function (oEvent) {
                let sPath = oEvent.getSource().getParent().getBindingContext("purchReqModel").getPath();
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(sPath);
                let pSState = this.byId("idSData").getState();
                await this.getPRServices(oPR.EX_BANFN, oPR.EX_BNFPO, oPR.EX_WAERS, oPR["EX_SUB_PACKNO"], pSState);
                if (this.getOwnerComponent().getModel("prServicesModel").getData().length == 0) {
                    this._buildDialog(this._get_i18n("dialog_information"), "Information", "There are no services").open();
                } else {
                    this.getOwnerComponent().getModel("infoModel").setProperty("/itemNumber", oPR.EX_BNFPO);
                    this.getOwnerComponent().getModel("infoModel").setProperty("/materialNumber", oPR.EX_MATNR);
                    this.getOwnerComponent().getModel("infoModel").setProperty("/shortText", oPR.EX_TXZ01);
                    this.createPRServicesDialog();
                }

            },
            showPRSource: async function (oEvent) {
                let sPath = oEvent.getSource().getParent().getBindingContext("purchReqModel").getPath();
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(sPath);
                let pSState = this.byId("idSData").getState();
                let response = await this.getPRSource(oPR.EX_MATNR, oPR.EX_MATKL, oPR.EX_WERKS, oPR.EX_LFDAT, oPR.EX_MENGE, oPR.EX_MEINS, oPR.EX_PSTYP, oPR.EX_KNTTP, oPR.EX_EKORG, oPR.EX_WAERS, pSState);
                if (response == "s") {
                    this.oPRSelect = oPR;
                    this.getOwnerComponent().getModel("infoModel").setProperty("/itemNumber", oPR.EX_BNFPO);
                    this.getOwnerComponent().getModel("infoModel").setProperty("/materialNumber", oPR.EX_MATNR);
                    this.getOwnerComponent().getModel("infoModel").setProperty("/shortText", oPR.EX_TXZ01);
                    this.createPRSourceDialog();
                }
            },
            createPRServicesDialog: function () {
                //Llamamos a la funcion que creara el dialogo y nos lo retornara y asi podremos abrirlo
                this._createDialogs("DialogPRServices", "idDialogPRServices", "scr.prtracking.fragments.PRServices").open();
            },
            createPRSourceDialog: function () {
                //Llamamos a la funcion que creara el dialogo y nos lo retornara y asi podremos abrirlo
                this._createDialogs("DialogPRSource", "idDialogPRSource", "scr.prtracking.fragments.PRSource").open();
            },
            downloadAttachment: function (oEvent) {
                let sPath = oEvent.getSource().getParent().getBindingContext("attachmentModel").getPath();
                let oAttachment = this.getOwnerComponent().getModel("attachmentModel").getProperty(sPath);
                let pSState = this.byId("idSData").getState();
                this.getAttachmentBase64(oAttachment.EX_LOIO_ID.trim(), oAttachment.EX_DESCRIPT.trim(), oAttachment.EX_DOCUCLASS.trim(), pSState);
            },
            selectVendor: async function () {
                let pSState = this.byId("idSData").getState();
                let oTableSource = this.getView().byId("idTableSource");
                let index = oTableSource.getSelectedIndex();
                if (index != -1) {
                    let sPath = oTableSource.getRows()[index].getBindingContext("prSourceModel").getPath();
                    let source = this.getOwnerComponent().getModel("prSourceModel").getProperty(sPath);
                    let response = await this.assignVendor(source, pSState);
                    if (response == "s") {

                    }
                }
            },
            selectIconTabFilter: async function (oEvent) {
                let key = oEvent.getParameter("key");
                let response = "";
                switch (key) {
                    case "Returned":
                        let indices = this.byId("idTablePR").getSelectedIndices();
                        if (indices.length == 1) {
                            let oPR = this.byId("idTablePR").getBinding().oList[indices[0]];
                            if (oPR["RETURNED"] == "X") {
                                await this.returnedPR();
                            } else {
                                this.getOwnerComponent().getModel("infoModel").setProperty("/commentReturned", "");
                                this._createDialogs("DialogReturned", "idDialogReturned", "scr.prtracking.fragments.returned").open();
                            }
                        } else {
                            this._buildDialog(this._get_i18n("dialog_error"), "Error", "You must select just one PR").open();
                        }
                        break;
                    case "createPo":
                        response = this.selectionChange(true);
                        if (response) {
                            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                            this.getOwnerComponent().getModel("infoModel").setProperty("/EX_ORIGEN", this.byId("idSData").getState());
                            oRouter.navTo("RouteView2");
                        }
                        break;
                    case "createRfq":
                        response = this.selectionChange(false);
                        if (response) {
                            var oRouter = sap.ui.core.UIComponent.getRouterFor(this);
                            this.getOwnerComponent().getModel("infoModel").setProperty("/EX_ORIGEN", this.byId("idSData").getState());
                            oRouter.navTo("RouteView3");
                        }
                        break;
                    default:
                        break;
                }
            },
            returnedPR: async function () {
                let aPR = []
                let indices = this.byId("idTablePR").getSelectedIndices();
                let that = this;
                indices.forEach(indice => {
                    let oPR = this.byId("idTablePR").getBinding().oList[indice];
                    let json = {
                        BUKRS: oPR.EX_BUKRS,
                        WERKS: oPR.EX_WERKS,
                        BANFN: oPR.EX_BANFN,
                        BNFPO: oPR.EX_BNFPO,
                        SOURCE_SYSTEM: oPR.EX_ORIGEN,
                        USER: that.userConnected,
                        RETURNED: "X",
                        RETURNED_COMMENT: this.getOwnerComponent().getModel("infoModel").getProperty("/commentReturned")
                    }
                    aPR.push(json);
                });
                await this.postReturnedPR(aPR);
                this.closeDialog()
            },
            showReasonReturned: function (oEvent) {
                let path = oEvent.getSource().getBindingContext("purchReqModel").getPath();
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(path);
                let pSState = this.byId("idSData").getState();
                if (pSState) {
                    this.getOwnerComponent().getModel("infoModel").setProperty("/commentReturned", oPR["RETURNED_COMMENT"]);
                } else {
                    this.getOwnerComponent().getModel("infoModel").setProperty("/commentReturned", oPR["EX_RETURN_REASON"]);
                }
                var oButton = oEvent.getSource(),
                    oView = this.getView();
                if (!this._pPopover) {
                    this._pPopover = Fragment.load({
                        id: oView.getId(),
                        name: "scr.prtracking.fragments.reasonReturned",
                        controller: this
                    }).then(function (oPopover) {
                        oView.addDependent(oPopover);
                        return oPopover;
                    });
                }
                this._pPopover.then(function (oPopover) {
                    oPopover.openBy(oButton);
                });
            },
            handleLiveChange: function (oEvent) {
                var oTextArea = oEvent.getSource(),
                    iValueLength = oTextArea.getValue().length,
                    iMaxLength = oTextArea.getMaxLength(),
                    sState = iValueLength > iMaxLength ? ValueState.Warning : ValueState.None;

                oTextArea.setValueState(sState);
            },
            filterStatus: function () {
                // let statusA = this.byId("idChBA").getSelected();
                let statusPR = this.byId("idChPR").getSelected();
                let statusSES = this.byId("idChSES").getSelected();
                let statusPO = this.byId("idChPO").getSelected();
                let statusApprovalMe = this.byId("idChApprovalMe").getSelected();
                let statusApprovalOthers = this.byId("idChApprovalOthers").getSelected();
                let statusR = this.byId("idChBR").getSelected();
                let statusRejected = this.byId("idChRejected").getSelected();
                if (!statusPR && !statusSES && !statusPO && !statusApprovalMe && !statusApprovalOthers && !statusR && !statusRejected) {
                    this.byId("idTablePR").mBindingInfos.rows.binding.iLength = this.dataBack.length;
                    this.getOwnerComponent().getModel("purchReqModel").setData(this.dataBack);
                    this.getOwnerComponent().getModel("infoModel").setProperty("/countPR", this.dataBack.length);
                    if (this.dataBack.length > 10) {
                        this.getOwnerComponent().getModel("infoModel").setProperty("/countPRVisible", 10);
                    } else {
                        this.getOwnerComponent().getModel("infoModel").setProperty("/countPRVisible", this.dataBack.length);
                    }
                } else {
                    let data = this.byId("idTablePR").getBinding().oList;
                    let oPRsNew = [];
                    let oPRsNew2 = [];
                    this.dataBack.forEach(oPR => {
                        // if (statusA) {
                        //     if (!(oPR.approved == undefined)) {
                        //         oPRsNew.push(oPR);
                        //     }
                        // }
                        if (statusPR) {
                            if (oPR.EX_EBELN == "" && oPR.EX_SES_NUMBER == "") {
                                oPRsNew.push(oPR);
                            }
                        }
                        if (statusSES) {
                            if (oPR.EX_SES_NUMBER != "") {
                                oPRsNew.push(oPR);
                            }
                        }
                        if (statusPO) {
                            if (oPR.EX_EBELN != "") {
                                oPRsNew.push(oPR);
                            }
                        }
                        // if (statusU) {
                        //     if (!(oPR.updated == undefined)) {
                        //         oPRsNew.push(oPR);
                        //     }
                        // }
                        // if (statusR) {
                        //     if (!(oPR.returned == undefined)) {
                        //         oPRsNew.push(oPR);
                        //     }
                        // }
                        //
                        if (statusApprovalMe) {
                            if (oPR["EX_FRGZU"].length > 0) {
                                for (let index = 1; index <= oPR["EX_FRGZU"].length; index++) {
                                    if (oPR["status" + index.toString()] == "Success") {
                                        if (this.userConnected.toUpperCase() == oPR["EX_MAIL_" + index.toString()].toUpperCase()) {
                                            oPRsNew2.push(oPR);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        if (statusApprovalOthers) {
                            if (oPR["EX_FRGZU"].length > 0) {
                                for (let index = 1; index <= oPR["EX_FRGZU"].length; index++) {
                                    if (oPR["status" + index.toString()] == "Success") {
                                        if (this.userConnected.toUpperCase() != oPR["EX_MAIL_" + index.toString()].toUpperCase()) {
                                            oPRsNew2.push(oPR);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        if (statusR) {
                            if (!(oPR.returned == undefined)) {
                                oPRsNew2.push(oPR);
                            }
                        }
                        if (statusRejected) {
                            if ((oPR.EX_BANPR).trim() == "08") {
                                oPRsNew2.push(oPR);
                            }
                        }

                    });
                    oPRsNew = [...new Set(oPRsNew)];
                    oPRsNew2 = [...new Set(oPRsNew2)];
                    let oPRs = [];
                    oPRsNew2.forEach(oPR => {
                        if (oPRsNew.indexOf(oPR) != -1) {
                            oPRs.push(oPR);
                        }
                    });
                    if (!statusPR && !statusPO && !statusSES) {
                        oPRs = oPRsNew2;
                    } else if (!statusApprovalMe && !statusApprovalOthers && !statusR && !statusRejected) {
                        oPRs = oPRsNew;
                    }
                    this.byId("idTablePR").mBindingInfos.rows.binding.iLength = oPRs.length;
                    this.getOwnerComponent().getModel("purchReqModel").setData(oPRs);
                    this.getOwnerComponent().getModel("infoModel").setProperty("/countPR", oPRs.length);
                    if (oPRs.length > 10) {
                        this.getOwnerComponent().getModel("infoModel").setProperty("/countPRVisible", 10);
                    } else {
                        this.getOwnerComponent().getModel("infoModel").setProperty("/countPRVisible", oPRs.length);
                    }
                    if (oPRs.length == 0 && this.dataBack.length != 0) {
                        this._buildDialog(this._get_i18n("dialog_information"), "Information", "There´s no Purchase Requisition for the selected filters.  ").open();
                    }
                }

            },
            // sortTable: function (oEvent) {
            //     var oView = this.getView();
            //     var oTable = oView.byId("idTablePR");
            //     // oTable.sort(oView.byId("idColumnCC"), SortOrder.Ascending, true);
            //     oTable.sort(oView.byId("idColumnDD"), SortOrder.Ascending, true);
            // },
            // clearAllSortings: function (oEvent) {
            //     var oTable = this.byId("idTablePR");
            //     oTable.getBinding().sort(null);
            //     this.resetSortingState();
            // },
            // resetSortingState: function () {
            //     var oTable = this.byId("idTablePR");
            //     var aColumns = oTable.getColumns();
            //     for (var i = 0; i < aColumns.length; i++) {
            //         aColumns[i].setSorted(false);
            //     }
            // },
            onDataExport: function (oEvent) {
                var oExport = new Export({
                    // Type that will be used to generate the content. Own ExportType's can be created to support other formats
                    exportType: new ExportTypeCSV({
                        separatorChar: ";"
                    }),

                    // Pass in the model created above
                    models: this.getOwnerComponent().getModel("purchReqModel"),

                    // binding information for the rows aggregation
                    rows: {
                        path: "/"
                    },

                    // column definitions with column name and binding info for the content

                    columns: [{
                        name: this._get_i18n("companyCode"),
                        template: {
                            content: "{EX_BUKRS}"
                        }
                    }, {
                        name: this._get_i18n("plant"),
                        template: {
                            content: "{EX_WERKS}"
                        }
                    }, {
                        name: this._get_i18n("deliveryDate"),
                        template: {
                            content: "{path: 'purchReqModel>EX_LFDAT', formatter: '.Formatter.formatDate'}"
                        }
                    }, {
                        name: this._get_i18n("daysSinceRelease"),
                        template: {
                            content: "{EX_DAYSREL}"
                        }
                    },
                    {
                        name: this._get_i18n("purchaseRequisition"),
                        template: {
                            content: "{EX_BANFN}"
                        }
                    },
                    {
                        name: this._get_i18n("item"),
                        template: {
                            content: "{EX_BNFPO}"
                        }
                    },
                    {
                        name: this._get_i18n("itemDescription"),
                        template: {
                            content: "{EX_TXZ01}"
                        }
                    },
                    {
                        name: this._get_i18n("materialGroup"),
                        template: {
                            content: "{EX_MATKL}"
                        }
                    },
                    {
                        name: this._get_i18n("fixedVendor"),
                        template: {
                            content: "{EX_FLIEF}"
                        }
                    },
                    {
                        name: this._get_i18n("desiredVendor"),
                        template: {
                            content: "{EX_LIFNR}"
                        }
                    },
                    {
                        name: this._get_i18n("outlineAgreement"),
                        template: {
                            content: "{outlineAgreement}"
                        }
                    }, {
                        name: this._get_i18n("purchasingGroup"),
                        template: {
                            content: "{EX_EKGRP}"
                        }
                    }, {
                        name: this._get_i18n("currency"),
                        template: {
                            content: "{EX_WAERS}"
                        }
                    }, {
                        name: this._get_i18n("value"),
                        template: {
                            content: "{EX_RLWRT}"
                        }
                    },
                    {
                        name: this._get_i18n("status"),
                        template: {
                            content: "{overdue},{updated},{returned}"
                        }
                    },
                    {
                        name: this._get_i18n("indicator"),
                        template: {
                            content: "{indicator}"
                        }
                    },
                    {
                        name: this._get_i18n("PPAStatusDescription"),
                        template: {
                            content: "{}"
                        }
                    },
                    {
                        name: this._get_i18n("attachment"),
                        template: {
                            content: "{EX_ATTACH}"
                        }
                    },
                    {
                        name: this._get_i18n("comments"),
                        template: {
                            content: "{}"
                        }
                    },
                    {
                        name: this._get_i18n("creationDate"),
                        template: {
                            content: "{path: 'purchReqModel>EX_BADAT', formatter: '.Formatter.formatDate'}"
                        }
                    },
                    {
                        name: this._get_i18n("changeDate"),
                        template: {
                            content: "{path: 'purchReqModel>EX_ERDAT', formatter: '.Formatter.formatDate'}"
                        }
                    },
                    {
                        name: this._get_i18n("documentType"),
                        template: {
                            content: "{EX_BSART}"
                        }
                    },
                    {
                        name: this._get_i18n("deletionIndicator"),
                        template: {
                            content: "{EX_LOEKZ}"
                        }
                    },
                    {
                        name: this._get_i18n("creationIndicator"),
                        template: {
                            content: "{EX_ESTKZ}"
                        }
                    }, {
                        name: this._get_i18n("releaseIndicator"),
                        template: {
                            content: "{EX_FRGKZ}"
                        }
                    }, {
                        name: this._get_i18n("releaseState"),
                        template: {
                            content: "{EX_FRGZU}"
                        }
                    }, {
                        name: this._get_i18n("requisitioner"),
                        template: {
                            content: "{EX_AFNAM}"
                        }
                    }, {
                        name: this._get_i18n("materialNumber"),
                        template: {
                            content: "{EX_MATNR}"
                        }
                    }, {
                        name: this._get_i18n("storageLocation"),
                        template: {
                            content: "{EX_LGORT}"
                        }
                    }, {
                        name: this._get_i18n("reqTrackingNumber"),
                        template: {
                            content: "{EX_BEDNR}"
                        }
                    }, {
                        name: this._get_i18n("supplyingPlant"),
                        template: {
                            content: "{EX_RESWK}"
                        }
                    }, {
                        name: this._get_i18n("quantityRequested"),
                        template: {
                            content: "{EX_MENGE}"
                        }
                    }, {
                        name: this._get_i18n("unitMeasure"),
                        template: {
                            content: "{EX_MEINS}"
                        }
                    }, {
                        name: this._get_i18n("releaseDate"),
                        template: {
                            content: "{path: 'purchReqModel>EX_FRGDT', formatter: '.Formatter.formatDate'}"
                        }
                    }, {
                        name: this._get_i18n("valuationPrice"),
                        template: {
                            content: "{EX_PREIS}"
                        }
                    }, {
                        name: this._get_i18n("priceUnit"),
                        template: {
                            content: "{EX_PEINH}"
                        }
                    }, {
                        name: this._get_i18n("itemCategory"),
                        template: {
                            content: "{EX_PSTYP}"
                        }
                    }, {
                        name: this._get_i18n("acctAssignmentCat"),
                        template: {
                            content: "{EX_KNTTP}"
                        }
                    }, {
                        name: this._get_i18n("purchOrganization"),
                        template: {
                            content: "{EX_EKORG}"
                        }
                    }, {
                        name: this._get_i18n("princAgreementItem"),
                        template: {
                            content: "{EX_KTPNR}"
                        }
                    }, {
                        name: this._get_i18n("purchasingInfoRec"),
                        template: {
                            content: "{EX_INFNR}"
                        }
                    }, {
                        name: this._get_i18n("purchaseOrder"),
                        template: {
                            content: "{EX_EBELN}"
                        }
                    }, {
                        name: this._get_i18n("purchaseOrderItem"),
                        template: {
                            content: "{EX_EBELP}"
                        }
                    }, {
                        name: this._get_i18n("manufacturer"),
                        template: {
                            content: "{EX_EMNFR}"
                        }
                    }, {
                        name: this._get_i18n("MRPArea"),
                        template: {
                            content: "{EX_BERID}"
                        }
                    }, {
                        name: this._get_i18n("requirementUrgency"),
                        template: {
                            content: "{EX_PRIO_URG}"
                        }
                    }, {
                        name: this._get_i18n("requirementPriority"),
                        template: {
                            content: "{EX_PRIO_REQ}"
                        }
                    }, {
                        name: this._get_i18n("singleSourceMotivator"),
                        template: {
                            content: "{EX_ZZMOTIV}"
                        }
                    }, {
                        name: this._get_i18n("orderPriority"),
                        template: {
                            content: "{}"
                        }
                    },
                    {
                        name: this._get_i18n("goodRecipient"),
                        template: {
                            content: "{EX_WEMPF}"
                        }
                    },
                    {
                        name: this._get_i18n("GLAccountNumber"),
                        template: {
                            content: "{EX_SAKTO}"
                        }
                    },
                    {
                        name: this._get_i18n("costCenter"),
                        template: {
                            content: "{EX_KOSTL}"
                        }
                    },
                    {
                        name: this._get_i18n("orderNumber"),
                        template: {
                            content: "{EX_AUFNR}"
                        }
                    },
                    {
                        name: this._get_i18n("unloadingPoint"),
                        template: {
                            content: "{EX_ABLAD}"
                        }
                    },
                    {
                        name: this._get_i18n("activityNumber"),
                        template: {
                            content: "{EX_SRVPOS}"
                        }
                    }, {
                        name: this._get_i18n("shortText"),
                        template: {
                            content: "{EX_KTEXT1}"
                        }
                    }, {
                        name: this._get_i18n("quantitySign"),
                        template: {
                            content: "{EX_MENGE_SERV}"
                        }
                    }, {
                        name: this._get_i18n("baseUnitMeasure"),
                        template: {
                            content: "{EX_MEINS_SERV}"
                        }
                    }, {
                        name: this._get_i18n("grossPrice"),
                        template: {
                            content: "{EX_TBTWR}"
                        }
                    }, {
                        name: this._get_i18n("asset"),
                        template: {
                            content: "{EX_ANLN1}"
                        }
                    }, {
                        name: this._get_i18n("profitCenter"),
                        template: {
                            content: "{EX_PRCTR}"
                        }
                    }, {
                        name: this._get_i18n("WBSElement"),
                        template: {
                            content: "{EX_PS_PSP_PNR}"
                        }
                    },

                    ]
                });

                // download exported file
                oExport.saveFile().catch(function (oError) {
                    MessageBox.error("Error when downloading data. Browser might not be supported!\n\n" + oError);
                }).then(function () {
                    oExport.destroy();
                });
            },
            exportWorksheet: function () {
                var oController = this;
                var oTable_ = this.byId("idTablePR"); //Aqui pone tu tabla!!!
                var list = Object.keys(oTable_.getModel("purchReqModel").getData()[0]);
                var aColumns = [];
                oTable_.getColumns().forEach(column => {
                    if (column.getTemplate().mBindingInfos.text != undefined) {
                        aColumns.push({
                            label: column.getLabel().getText(),
                            property: column.getTemplate().mBindingInfos.text.parts[0].path
                        });
                    }
                });
                // for (var index in list) {
                //     if (list[index].substring(0, 3) == "EX_" && list[index] != "EX_RESULTADO_EJECUCION" && list[index] != "EX_DSC_EJECUCION") {
                //         aColumns.push({
                //             label: oController._get_i18n(list[index]),
                //             property: list[index]
                //         });
                //     }
                // }

                var data = oTable_.getModel("purchReqModel").getData();
                var array = [];
                for (var index in data) {
                    if (typeof data[index] == "object") {
                        if (data[index].KEY) {
                            data[index] = data[index].KEY
                        }
                    } else {
                        data[index] = data[index]
                    }
                }
                for (var index in data) {
                    array.push(data[index]);
                }

                var mSettings = {
                    workbook: {
                        columns: aColumns
                    },
                    dataSource: array,
                    fileName: "Template.xlsx"
                };
                var oSpreadsheet = new Spreadsheet(mSettings);
                oSpreadsheet.build();
            },
            handleSortButtonPressed: function () {
                this._createDialogs("SortDialog", "", "scr.prtracking.fragments.SortDialog").open();
            },
            handleSortDialogConfirm: function (oEvent) {
                var oController = this;
                var oTable = this.byId("idTablePR"),
                    mParams = oEvent.getParameters(),
                    oBinding = oTable.getBinding("rows"),
                    sPath,
                    bDescending,
                    aSorters = [];

                sPath = mParams.sortItem.getKey();
                bDescending = mParams.sortDescending;
                aSorters.push(new Sorter(sPath, bDescending));

                // apply the selected sort and group settings
                oBinding.sort(aSorters);
            },
            onPersoButtonPressed: function () {
                this._oTPC.openDialog();
            },
            onExit: function () {
                var oController = this;
                if (oController._oTPC) {
                    oController._oTPC.destroy();
                }
            },
            setFiltersDefault: function () {
                let sFragmentId = this.getView().createId("idFragmentFilterBar");
                let oFilterBar = sap.ui.core.Fragment.byId(sFragmentId, "idFilterBar");
                let filters = oFilterBar.getFilterGroupItems();
                let json = {
                    user: {
                        mail: this.userConnected
                    },
                    filters: [],
                    appCode: "1"
                }
                filters.forEach(filter => {
                    if (filter.getVisibleInFilterBar() == true) {
                        json.filters.push(filter.getName());
                    }
                });
                let filtersDefaultResut = this.posFiltersDefault(json);
                if (filtersDefaultResut != false) {
                    MessageBox.success(this._get_i18n("dialog_msg_7"));
                }
            },
            onChange: function (oEvent) { // When the user selects a file
                this.lastSelectedFile = oEvent.getParameter("files")[0];
            },

            onConfirm: function () { // When the user presses the upload button
                this.uploadFile(this.lastSelectedFile);
            },

            uploadFile: function (file) {
                var that = this;

                var fileName = file.name.split(".")[0];
                var fileType = file.name.split(".")[1];
                var notificationNumber = this.byId("idNotifNumber").getValue();

                var reader = new FileReader();

                reader.onload = function (e) {
                    var raw = e.target.result;
                    var hexString = that.convertBinaryToHex(raw).toUpperCase();
                    var fileAsJsonString = that.createJsonObjectForFileInfo(fileName, fileType, notificationNumber, hexString);
                    let pSState = this.byId("idSData").getState();
                    that.postAttachmentServ(fileAsJsonString, pSState);
                };

                reader.onerror = function () {
                    sap.m.MessageToast.show("error");
                };
                reader.readAsArrayBuffer(file);
            },
            createJsonObjectForFileInfo: function (fileName, fileType, notificationNumber, hexString) {
                return {
                    EX_RESULTADO_EJECUCION: "",
                    EX_DSC_EJECUCION: "",
                    IN_NAME: fileName,
                    IN_TYPE: fileType,
                    IN_QMNUM: notificationNumber,
                    IN_HEXCONT: hexString
                };
            },
            convertBinaryToHex: function (buffer) {
                return Array.prototype.map.call(new Uint8Array(buffer), x => ('00' + x.toString(16)).slice(-2)).join('');
            },
            handleGroupButtonPressed: function () {
                this.getViewSettingsDialog("scr.prtracking.fragments.GroupDialog")
                    .then(function (oViewSettingsDialog) {
                        oViewSettingsDialog.open();
                    });
            },
            getViewSettingsDialog: function (sDialogFragmentName) {
                var pDialog = this._mViewSettingsDialogs[sDialogFragmentName];

                if (!pDialog) {
                    pDialog = Fragment.load({
                        id: this.getView().getId(),
                        name: sDialogFragmentName,
                        controller: this
                    }).then(function (oDialog) {
                        if (Device.system.desktop) {
                            oDialog.addStyleClass("sapUiSizeCompact");
                        }
                        return oDialog;
                    });
                    this._mViewSettingsDialogs[sDialogFragmentName] = pDialog;
                }
                return pDialog;
            },
            handleGroupDialogConfirm: function (oEvent) {
                var oTable = this.byId("idTablePR"),
                    mParams = oEvent.getParameters(),
                    oBinding = oTable.getBinding("rows"),
                    sPath,
                    bDescending,
                    vGroup,
                    aGroups = [];

                if (mParams.groupItem) {
                    sPath = mParams.groupItem.getKey();
                    oTable.getColumns().forEach(column => {
                        if (sPath == column.getSortProperty()) {
                            oTable.setGroupBy(column.getId())
                        }
                    });
                    this.byId("idChBSoSD").setEnabled(false);
                    this.byId("idChBSSM").setEnabled(false);
                    this.byId("idChBSI").setEnabled(false);
                    this.byId("idChBWO").setEnabled(false);
                    this.byId("idChBPPA").setEnabled(false);
                    this.byId("idChBSoSO").setEnabled(false);
                    this.byId("idChBO").setEnabled(false);
                    this.byId("idChBU").setEnabled(false);
                    this.byId("idChBR").setEnabled(false);
                    this.byId("idBSettings").setEnabled(false);
                    this.byId("idBSort").setEnabled(false);

                } else {
                    oTable.setGroupBy("")
                    this.byId("idChBSoSD").setEnabled(true);
                    this.byId("idChBSSM").setEnabled(true);
                    this.byId("idChBSI").setEnabled(true);
                    this.byId("idChBWO").setEnabled(true);
                    this.byId("idChBPPA").setEnabled(true);
                    this.byId("idChBA").setEnabled(true);
                    this.byId("idChBO").setEnabled(true);
                    this.byId("idChBU").setEnabled(true);
                    this.byId("idChBR").setEnabled(true);
                    this.byId("idBSettings").setEnabled(true);
                    this.byId("idBSort").setEnabled(true);
                }
            },
            selectionChange: function (flagFixedVendor) {

                let aIndices = this.byId("idTablePR").getSelectedIndices();
                if (aIndices.length != 0) {
                    let aPRs = []
                    let msg = [];
                    let flag = true;
                    let vendors = [""];
                    let purchOrg = [""];
                    aIndices.forEach(indice => {
                        let oPRsSelected = this.getOwnerComponent().getModel("purchReqModel").getProperty("/" + indice);
                        if (vendors.length != 1 && purchOrg.length != 1) {
                            if (vendors.indexOf(oPRsSelected["EX_FLIEF"]) != -1) {
                                let index = msg.indexOf("- You must select PRs with the same Fixed Vendor");
                                if (index != -1 && oPRsSelected["EX_FLIEF"] != "") {
                                    msg.splice(index, 1);
                                }
                            } else {
                                flag = false;
                                if (msg.indexOf("- You must select PRs with the same Fixed Vendor") == -1) {
                                    msg.push("- You must select PRs with the same Fixed Vendor");
                                }
                            }
                            if (purchOrg.indexOf(oPRsSelected["EX_EKORG"]) != -1) {
                                let index = msg.indexOf("- You must select PRs with the same Purchasing Organisation");
                                if (index != -1 && oPRsSelected["EX_EKORG"] != "") {
                                    msg.splice(index, 1);
                                }
                            } else {
                                flag = false;
                                if (msg.indexOf("- You must select PRs with the same Purchasing Organisation") == -1) {
                                    msg.push("- You must select PRs with the same Purchasing Organisation");
                                }
                            }
                            if (aPRs.length != 0) {
                                if (aPRs[0]["EX_BUKRS"] != oPRsSelected["EX_BUKRS"]) {
                                    flag = false;
                                    if (msg.indexOf("- You must select PRs with the same Company Code") == -1) {
                                        msg.push("- You must select PRs with the same Company Code");
                                    }
                                }
                                if (aPRs[0]["EX_EKGRP"] != oPRsSelected["EX_EKGRP"]) {
                                    flag = false;
                                    if (msg.indexOf("- You must select PRs with the same Purchasing Group") == -1) {
                                        msg.push("- You must select PRs with the same Purchasing Group");
                                    }
                                }
                                if (flag) {
                                    aPRs.push(oPRsSelected);
                                }
                            } else {
                                aPRs.push(oPRsSelected);
                            }
                        } else {
                            if (vendors.length == 1) {
                                // if (flagFixedVendor) {
                                if (oPRsSelected["EX_FLIEF"] != "") {
                                    vendors.push(oPRsSelected["EX_FLIEF"]);
                                    flag = true;
                                    // let index = msg.indexOf("- You must select at least one PR with Fixed Vendor");
                                    // if (index != -1){ 
                                    //     msg.splice(index, 1);
                                    // }
                                } // else {
                                //     if (msg.indexOf("- You must select at least one PR with Fixed Vendor") == -1) {
                                //         msg.push("- You must select at least one PR with Fixed Vendor");
                                //     }
                                //     flag = false;
                                // }
                                // } else {
                                //     vendors.push(flagFixedVendor);
                                // }

                            }
                            if (purchOrg.length == 1) {
                                if (oPRsSelected["EX_EKORG"] != "") {
                                    purchOrg.push(oPRsSelected["EX_EKORG"]);
                                    flag = true;
                                    let index = msg.indexOf("- You must select at least one PR with Purchasing Organisation");
                                    if (index != -1) {
                                        msg.splice(index, 1);
                                    }
                                } else {
                                    if (msg.indexOf("- You must select at least one PR with Purchasing Organisation") == -1) {
                                        msg.push("- You must select at least one PR with Purchasing Organisation");
                                    }
                                    flag = false;
                                }
                            }
                            if (aPRs.length != 0) {
                                if (aPRs[0]["EX_BUKRS"] != oPRsSelected["EX_BUKRS"]) {
                                    flag = false;
                                    if (msg.indexOf("- You must select PRs with the same Company Code") == -1) {
                                        msg.push("- You must select PRs with the same Company Code");
                                    }
                                }
                                if (aPRs[0]["EX_EKGRP"] != oPRsSelected["EX_EKGRP"]) {
                                    flag = false;
                                    if (msg.indexOf("- You must select PRs with the same Purchasing Group") == -1) {
                                        msg.push("- You must select PRs with the same Purchasing Group");
                                    }
                                }
                                if (flag) {
                                    aPRs.push(oPRsSelected);
                                }
                            } else {
                                aPRs.push(oPRsSelected);
                            }
                        }

                    });
                    let filterFixedVendor = aPRs.filter(function (oPR) {
                        return oPR["EX_FLIEF"] != "";
                    });
                    if (filterFixedVendor.length == 0) {
                        let filterDesiredVendor = aPRs.filter(function (oPR) {
                            return oPR["EX_LIFNR"] != "";
                        });
                        if (filterDesiredVendor.length > 0) {
                            let vendorAnt = "new"
                            filterDesiredVendor.forEach(oPR => {
                                if (vendorAnt == "new") {
                                    vendorAnt = oPR["EX_LIFNR"];
                                } else {
                                    if (vendorAnt != oPR["EX_LIFNR"]) {
                                        msg.push("- You must select PRs with the same Desired Vendor");
                                    }
                                }
                            });
                        }
                    }
                    if (msg.length == 0) {
                        // this.byId("idTabFilterCreatePO").setEnabled(true);
                        // this.byId("idTabFilterCreateRFQ").setEnabled(true);
                        let oModel = new JSONModel(aPRs);
                        this.getOwnerComponent().setModel(oModel, "prsModel");
                        let oModel2 = new JSONModel(aPRs);
                        this.getOwnerComponent().setModel(oModel2, "rfqItemModel");
                        return true;
                    } else {
                        MessageBox.error(msg.join("\n"));
                        return false;
                        // this.byId("idTabFilterCreatePO").setEnabled(false);
                        // this.byId("idTabFilterCreateRFQ").setEnabled(false);
                    }
                } else {
                    return false;
                    // this.byId("idTabFilterCreatePO").setEnabled(false);
                    // this.byId("idTabFilterCreateRFQ").setEnabled(false);
                }
            },
            clearFilters: function () {
                let sFragmentId = this.getView().createId("idFragmentFilterBar");
                sap.ui.core.Fragment.byId(sFragmentId, "idCBCompanyCode").setSelectedKeys();
                this.changeCompanyCode();
                sap.ui.core.Fragment.byId(sFragmentId, "idCBPlant").setSelectedKeys();
                this.changePlant();
                // sap.ui.core.Fragment.byId(sFragmentId, "idCBPurchGroup").setSelectedKeys();
                // sap.ui.core.Fragment.byId(sFragmentId, "idCBPurchOrg").setSelectedKeys();
                // this.changePurchOrg();
                // this.changePurchGroup();
                sap.ui.core.Fragment.byId(sFragmentId, "idCBRequestType").setSelectedKeys(["COMMENT", "OTHER"]);
                // sap.ui.core.Fragment.byId(sFragmentId, "idCBRequestStatus").setSelectedKey("OPEN PR (APPROVED)");
                // sap.ui.core.Fragment.byId(sFragmentId, "idIPPADescrip").setValue("");
                sap.ui.core.Fragment.byId(sFragmentId, "idCBPurchRequisitions").setValue("");
                // sap.ui.core.Fragment.byId(sFragmentId, "idRSFilterValueFrom").setValue("");
                // sap.ui.core.Fragment.byId(sFragmentId, "idRSFilterValueTo").setValue("");
                sap.ui.core.Fragment.byId(sFragmentId, "idDPDeliDateFrom").setValue(this.firstDayMonth);
                sap.ui.core.Fragment.byId(sFragmentId, "idDPDeliDateTo").setValue(this.lastDayMonth);
                this.changeDate();
                sap.ui.core.Fragment.byId(sFragmentId, "idCBVendorFixed").setSelectedKey();
                sap.ui.core.Fragment.byId(sFragmentId, "idCBVendor").setSelectedKey();
                sap.ui.core.Fragment.byId(sFragmentId, "idCBMaterial").setSelectedKey();
                sap.ui.core.Fragment.byId(sFragmentId, "idIManufac").setValue("");
                sap.ui.core.Fragment.byId(sFragmentId, "idCBStoLocation").setSelectedKeys();
                this.changeStoLocation();
                // sap.ui.core.Fragment.byId(sFragmentId, "idCBDocumentType").setSelectedKey();
                // sap.ui.core.Fragment.byId(sFragmentId, "idCBAccountAssignment").setSelectedKey();
                // sap.ui.core.Fragment.byId(sFragmentId, "idCBItemCategory").setSelectedKey();
                sap.ui.core.Fragment.byId(sFragmentId, "idIOutlineAgreement").setValue("");
                sap.ui.core.Fragment.byId(sFragmentId, "idIRequisitioner").setValue("");
                sap.ui.core.Fragment.byId(sFragmentId, "idCBDeletionIndicator").setSelectedKey("E");
                sap.ui.core.Fragment.byId(sFragmentId, "idCBCostCenter").setSelectedKey();
                sap.ui.core.Fragment.byId(sFragmentId, "idCBWBSElement").setSelectedKey();
                sap.ui.core.Fragment.byId(sFragmentId, "idIOrderNumber").setSelectedKey();
                sap.ui.core.Fragment.byId(sFragmentId, "idCBGLAccount").setSelectedKey();
                sap.ui.core.Fragment.byId(sFragmentId, "idIPONumber").setValue("");
                sap.ui.core.Fragment.byId(sFragmentId, "idIStatusApproval").setSelectedKey("");
                sap.ui.core.Fragment.byId(sFragmentId, "idCBPOStatus").setSelectedKey("");
                sap.ui.core.Fragment.byId(sFragmentId, "idCBGRVStatus").setSelectedKey("");
                sap.ui.core.Fragment.byId(sFragmentId, "idISESNumber").setValue("");
                sap.ui.core.Fragment.byId(sFragmentId, "idCBSESApprovalStatus").setSelectedKey("");
                sap.ui.core.Fragment.byId(sFragmentId, "idCBInvoicedStatus").setSelectedKey("");
                // sap.ui.core.Fragment.byId(sFragmentId, "idCBItemDescription").setValue("");
                sap.ui.core.Fragment.byId(sFragmentId, "idICreatedBy").setValue("");
                // sap.ui.core.Fragment.byId(sFragmentId, "idCBAcquisitionType").setSelectedKey();

            },
            applyFreezeTable: function () {
                var oView = this.getView(),
                    oTable = oView.byId("idTablePR"),
                    sColumnCount = oView.byId("inputColumn").getValue() || 0,
                    iColumnCount = parseInt(sColumnCount),
                    iTotalColumnCount = oTable.getColumns().length;

                // Fixed column count exceeds the total column count
                if (iColumnCount > iTotalColumnCount) {
                    iColumnCount = iTotalColumnCount;
                    oView.byId("inputColumn").setValue(iTotalColumnCount);
                    MessageToast.show("Fixed column count exceeds the total column count. Value in column count input got updated.");
                }
                oTable.setFixedColumnCount(iColumnCount);
            },
            adjustTable: function (oEvent) {
                let sValue = oEvent.getParameters().value;
                let filterProperty = oEvent.getParameters().column.getFilterProperty();
                let flag = true;
                if (sValue == "") {
                    delete this.filters[filterProperty];
                    let index = this.orderFilters.indexOf(filterProperty);
                    this.orderFilters.splice(index, 1);
                    flag = false;
                } else {
                    this.orderFilters.push(filterProperty);
                    this.filters[filterProperty] = sValue;
                }
                if (flag) {
                    let oData = this.getOwnerComponent().getModel("purchReqModel").getData();
                    let filters = oData.filter(function (oPR) {
                        return oPR[filterProperty].toUpperCase().includes(sValue.toUpperCase());
                    });
                    this.getOwnerComponent().getModel("purchReqModel").setData(filters);
                    this.getOwnerComponent().getModel("infoModel").setProperty("/countPR", filters.length);
                    if (filters.length > 10) {
                        this.getOwnerComponent().getModel("infoModel").setProperty("/countPRVisible", 10);
                    } else {
                        this.getOwnerComponent().getModel("infoModel").setProperty("/countPRVisible", filters.length);
                    }
                } else {
                    this.getOwnerComponent().getModel("purchReqModel").setData(this.dataBack);
                    this.getOwnerComponent().getModel("infoModel").setProperty("/countPR", this.dataBack.length);
                    if (this.dataBack.length > 10) {
                        this.getOwnerComponent().getModel("infoModel").setProperty("/countPRVisible", 10);
                    } else {
                        this.getOwnerComponent().getModel("infoModel").setProperty("/countPRVisible", this.dataBack.length);
                    }
                    if (Object.keys(this.filters).length != 0) {
                        for (var key in this.filters) {
                            if (this.filters.hasOwnProperty(key)) {
                                const value = this.filters[key];
                                let oData = this.getOwnerComponent().getModel("purchReqModel").getData();
                                let filters = oData.filter(function (oPR) {
                                    return oPR[key].toUpperCase().includes(value.toUpperCase());
                                });
                                this.getOwnerComponent().getModel("purchReqModel").setData(filters);
                                this.getOwnerComponent().getModel("infoModel").setProperty("/countPR", filters.length);
                                if (filters.length > 10) {
                                    this.getOwnerComponent().getModel("infoModel").setProperty("/countPRVisible", 10);
                                } else {
                                    this.getOwnerComponent().getModel("infoModel").setProperty("/countPRVisible", filters.length);
                                }
                            }
                        }
                    }
                }
            },
            // getPurchGroupDefault: async function (state) {
            //     var oController = this;
            //     var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
            //     var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
            //     var service = "/ZSC_WS_VAL_PURCH_GROUPSet";
            //     var filters = [
            //         new sap.ui.model.Filter("IN_EMAIL", sap.ui.model.FilterOperator.EQ, this.userConnected),
            //     ];
            //     var oData = {};
            //     oController.oLoaderData.open();
            //     try {
            //         let data = "";
            //         if (state) {
            //             data = await oController.RequestSAPGETPromise(model, filters, service, oData);
            //         } else {
            //             data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
            //         }
            //         if (data[0].EX_RESULTADO_EJECUCION == "S") {
            //             //Response Ok

            //             // let oModel = new JSONModel(data);
            //             // oModel.setSizeLimit(100000);
            //             // oController.getOwnerComponent().setModel(oModel, "prSourceModel");
            //             // oController.getOwnerComponent().getModel("infoModel").setProperty("/countPRSource", data.length);
            //             if (state) {
            //                 let purchGroupDefault = [];
            //                 data.forEach(purchGroup => {
            //                     purchGroupDefault.push(purchGroup["EX_EKGRP"].trim());
            //                 });
            //                 let sFragmentId = this.getView().createId("idFragmentFilterBar");
            //                 let oCBPurchGroup = sap.ui.core.Fragment.byId(sFragmentId, "idCBPurchGroup");
            //                 oCBPurchGroup.setSelectedKeys(purchGroupDefault);
            //                 this.changePurchGroup();
            //             } else {
            //                 let sFragmentId = this.getView().createId("idFragmentFilterBar");
            //                 let oIAgent = sap.ui.core.Fragment.byId(sFragmentId, "idIAgent");
            //                 oIAgent.setValue(data[0]["EX_EKGRP"].trim());
            //             }
            //             oController.oLoaderData.close();
            //             return "s";
            //         } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
            //             // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
            //             console.log(data[0].EX_DSC_EJECUCION)
            //             oController.oLoaderData.close();
            //             return "e";
            //         } else if (data == "E") {
            //             return "e"
            //             // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
            //         } else {
            //             oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
            //             oController.oLoaderData.close();
            //             return "e";
            //         }
            //     } catch (e) {
            //         //Response Error
            //         oController.oLoaderData.close();
            //         console.log(e.statusCode)
            //         if (e.statusCode == 401) {
            //             this.statusCode = 401;
            //             oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
            //         } else {
            //             oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
            //         }
            //         return "e"
            //     }
            // },
            createAddCommentDialog: function () {
                //Llamamos a la funcion que creara el dialogo y nos lo retornara y asi podremos abrirlo
                this._createDialogs("DialogAddComment", "idDialogAddComment", "scr.prtracking.fragments.addComment").open();
            },
            createEditCommentDialog: function () {
                //Llamamos a la funcion que creara el dialogo y nos lo retornara y asi podremos abrirlo
                this._createDialogs("DialogEditComment", "idDialogEditComment", "scr.prtracking.fragments.editComment").open();
            },
            addComment: async function () {
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(this.commentPRPath);
                let that = this;
                let json = {
                    BUKRS: oPR.EX_BUKRS,
                    WERKS: oPR.EX_WERKS,
                    BANFN: oPR.EX_BANFN,
                    BNFPO: oPR.EX_BNFPO,
                    SOURCE_SYSTEM: oPR.EX_ORIGEN,
                    user: that.userConnected,
                    body: this.getOwnerComponent().getModel("infoModel").getProperty("/commentPR"),
                }
                await this.postCommentPR(json);
            },
            editComment: async function () {
                // let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(this.commentPRPath);
                // let that = this;
                let json = {
                    ID: this.getOwnerComponent().getModel("infoModel").getProperty("/idComment"),
                    body: this.getOwnerComponent().getModel("infoModel").getProperty("/editCommentPR"),
                }
                await this.postEditCommentPR(json);
            },
            showEditComment: function (oEvent) {
                let oComment = this.getOwnerComponent().getModel("purchReqModel").getProperty(this.commentPRPath + oEvent.getSource().getParent().getBindingContext("commentPR").getPath());
                // let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(this.commentPRPath);
                let comment = oEvent.getSource().getParent().getText();
                let sender = oEvent.getSource().getParent().getSender();
                let date = oEvent.getSource().getParent().getTimestamp();
                this.getOwnerComponent().getModel("infoModel").setProperty("/editCommentPR", comment);
                this.getOwnerComponent().getModel("infoModel").setProperty("/idComment", oComment.ID);
                this.createEditCommentDialog();
            },
            showDeleteComment: async function (oEvent) {
                // let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(this.commentPRPath);
                let oComment = this.getOwnerComponent().getModel("purchReqModel").getProperty(this.commentPRPath + oEvent.getSource().getParent().getBindingContext("commentPR").getPath());
                let that = this;
                let json = {
                    ID: oComment.ID,
                }
                var URL = "sc/pr/deleteCommentPR";
                var oData = json;
                MessageBox.confirm(this._get_i18n("dialog_msg_12"), {
                    onClose: async function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            let response = await that.requestCAP(URL, oData, 'POST');
                            if (response.EX_RESULT == "S") {
                                await that.getDataPR();
                                that._buildDialog(that._get_i18n("dialog_success"), "Success", that._get_i18n("dialog_msg_13")).open();
                                // that.closeDialog()
                            } else if (!response) {
                                that._buildDialog(that._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                            } else {
                                that._buildDialog(that._get_i18n("dialog_error"), "Error", that._get_i18n(response.EX_MESSAGE)).open();
                            }

                        }
                    }
                });
            },
            postCommentPR: async function (commentJson) {
                var URL = "sc/pr/addCommentPR";
                var oData = commentJson;
                let that = this;
                MessageBox.confirm(this._get_i18n("dialog_msg_8"), {
                    onClose: async function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            let response = await that.requestCAP(URL, oData, 'POST');
                            if (response.EX_RESULT == "S") {
                                await that.getDataPR();
                                that._buildDialog(that._get_i18n("dialog_success"), "Success", that._get_i18n("dialog_msg_11")).open();
                                that.getOwnerComponent().getModel("infoModel").setProperty("/commentPR", ""),
                                    that.closeDialog()
                            } else if (!response) {
                                that._buildDialog(that._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                            } else {
                                that._buildDialog(that._get_i18n("dialog_error"), "Error", that._get_i18n(response.EX_MESSAGE)).open();
                            }

                        }
                    }
                });


            },
            postEditCommentPR: async function (commentJson) {
                var URL = "sc/pr/updateCommentPR";
                var oData = commentJson;
                let that = this;
                MessageBox.confirm(this._get_i18n("dialog_msg_9"), {
                    onClose: async function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            let response = await that.requestCAP(URL, oData, 'POST');
                            if (response.EX_RESULT == "S") {
                                await that.getDataPR();
                                that._buildDialog(that._get_i18n("dialog_success"), "Success", that._get_i18n("dialog_msg_10")).open();
                                that.getOwnerComponent().getModel("infoModel").setProperty("/editCommentPR", ""),
                                    that.closeDialog()
                            } else if (!response) {
                                that._buildDialog(that._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                            } else {
                                that._buildDialog(that._get_i18n("dialog_error"), "Error", that._get_i18n(response.EX_MESSAGE)).open();
                            }

                        }
                    }
                });


            },
            itemPress: function (oEvent) {
                var oItem = oEvent.getSource(),
                    aCustomData = oItem.getCustomData(),
                    cod = aCustomData[0].getValue(),
                    descrip = aCustomData[1].getValue(),
                    user = aCustomData[2].getValue(),
                    mail = aCustomData[3].getValue(),
                    reason = aCustomData[4].getValue();
                if (oItem.getState() == "Error") {
                    var oPopover = new sap.m.Popover({
                        contentWidth: "300px",
                        placement: "Top",
                        title: this.getTitleByState(oItem),
                        content: [
                            new sap.m.HBox({
                                items: [
                                    // new sap.ui.core.Icon({
                                    //     src: sIcon,
                                    //     color: this._getColorByState(oItem)
                                    // }).addStyleClass("sapUiSmallMarginBegin sapUiSmallMarginEnd"),
                                    new sap.m.FlexBox({
                                        width: "100%",
                                        renderType: "Bare",
                                        direction: "Column",
                                        alignItems: "Center",
                                        justifyContent: "Center",
                                        items: [new sap.m.Title({
                                            level: sap.ui.core.TitleLevel.H1,
                                            text: cod + " - " + descrip
                                        }), new sap.m.Text({
                                            text: user + " - " + mail + "\n"
                                        }).addStyleClass("sapUiSmallMarginBottom sapUiSmallMarginTop"), new sap.m.Title({
                                            level: sap.ui.core.TitleLevel.H1,
                                            text: "Rejection Reason"
                                        }), new sap.m.Text({
                                            text: reason
                                        }).addStyleClass("sapUiSmallMarginBottom sapUiSmallMarginTop"),
                                            // new sap.m.Text({
                                            //     text: sDescription
                                            // })
                                        ]
                                    })
                                ]
                            }).addStyleClass("sapUiTinyMargin")
                        ],
                        footer: [
                            new sap.m.Toolbar({
                                content: [
                                    new sap.m.ToolbarSpacer(),
                                    new sap.m.Button({
                                        text: "Close",
                                        press: function () {
                                            oPopover.close();
                                        }
                                    })]
                            })
                        ]
                    });
                } else {
                    var oPopover = new sap.m.Popover({
                        contentWidth: "300px",
                        placement: "Top",
                        title: this.getTitleByState(oItem),
                        content: [
                            new sap.m.HBox({
                                items: [
                                    // new sap.ui.core.Icon({
                                    //     src: sIcon,
                                    //     color: this._getColorByState(oItem)
                                    // }).addStyleClass("sapUiSmallMarginBegin sapUiSmallMarginEnd"),
                                    new sap.m.FlexBox({
                                        width: "100%",
                                        renderType: "Bare",
                                        direction: "Column",
                                        alignItems: "Center",
                                        justifyContent: "Center",
                                        items: [new sap.m.Title({
                                            level: sap.ui.core.TitleLevel.H1,
                                            text: cod + " - " + descrip
                                        }), new sap.m.Text({
                                            text: user + " - " + mail + "\n"
                                        }).addStyleClass("sapUiSmallMarginBottom sapUiSmallMarginTop")
                                            // new sap.m.Text({
                                            //     text: sDescription
                                            // })
                                        ]
                                    })
                                ]
                            }).addStyleClass("sapUiTinyMargin")
                        ],
                        footer: [
                            new sap.m.Toolbar({
                                content: [
                                    new sap.m.ToolbarSpacer(),
                                    new sap.m.Button({
                                        text: "Close",
                                        press: function () {
                                            oPopover.close();
                                        }
                                    })]
                            })
                        ]
                    });
                }


                oPopover.openBy(oEvent.getParameter("item"));
            },
            itemPressSES: function (oEvent) {
                var oItem = oEvent.getSource(),
                    aCustomData = oItem.getCustomData(),
                    cod = aCustomData[0].getValue(),
                    descrip = aCustomData[1].getValue(),
                    user = aCustomData[2].getValue(),
                    mail = aCustomData[3].getValue(),
                    reason = aCustomData[4].getValue();

                var oPopover = new sap.m.Popover({
                    contentWidth: "300px",
                    placement: "Top",
                    title: this.getTitleByState(oItem),
                    content: [
                        new sap.m.HBox({
                            items: [
                                // new sap.ui.core.Icon({
                                //     src: sIcon,
                                //     color: this._getColorByState(oItem)
                                // }).addStyleClass("sapUiSmallMarginBegin sapUiSmallMarginEnd"),
                                new sap.m.FlexBox({
                                    width: "100%",
                                    renderType: "Bare",
                                    direction: "Column",
                                    alignItems: "Center",
                                    justifyContent: "Center",
                                    items: [new sap.m.Title({
                                        level: sap.ui.core.TitleLevel.H1,
                                        text: cod
                                    }), new sap.m.Text({
                                        text: user + " - " + mail + "\n"
                                    }).addStyleClass("sapUiSmallMarginBottom sapUiSmallMarginTop"), new sap.m.Title({
                                        level: sap.ui.core.TitleLevel.H1,
                                        text: "Rejection Reason"
                                    }), new sap.m.Text({
                                        text: reason
                                    }).addStyleClass("sapUiSmallMarginBottom sapUiSmallMarginTop"),
                                        // new sap.m.Text({
                                        //     text: sDescription
                                        // })
                                    ]
                                })
                            ]
                        }).addStyleClass("sapUiTinyMargin")
                    ],
                    footer: [
                        new sap.m.Toolbar({
                            content: [
                                new sap.m.ToolbarSpacer(),
                                new sap.m.Button({
                                    text: "Close",
                                    press: function () {
                                        oPopover.close();
                                    }
                                })]
                        })
                    ]
                });

                oPopover.openBy(oEvent.getParameter("item"));
            },
            getTitleByState: function (oItem) {
                switch (oItem.getState()) {
                    case "Error": return "Rejected";
                    case "Warning": return "Pending";
                    case "None": return "Pending";
                    case "Success": return "Approved";
                }
            },
            showExpediteText: async function (oEvent) {
                let oModel = new JSONModel();
                this.getOwnerComponent().setModel(oModel, "expediteTextModel");
                var oButton = oEvent.getSource(),
                    oView = this.getView();
                let sPath = oEvent.getSource().getParent().getBindingContext("purchReqModel").getPath();
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(sPath);
                let pSState = this.byId("idSData").getState();
                let response = await this.getExpediteText(oPR.EX_EBELN, oPR.EX_EBELP, pSState);
                if (response == "s") {
                    // create popover
                    if (!this._pPopoverExpedite) {
                        this._pPopoverExpedite = Fragment.load({
                            id: oView.getId(),
                            name: "scr.prtracking.fragments.expediteText",
                            controller: this
                        }).then(function (oPopover) {
                            oView.addDependent(oPopover);
                            return oPopover;
                        });
                    }
                    this._pPopoverExpedite.then(function (oPopover) {
                        oPopover.openBy(oButton);
                    });
                }
            },
            getExpediteText: async function (IN_EBELN, IN_EBELP, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_PO_EXPEDITINGSet";
                var filters = [
                    new sap.ui.model.Filter("IN_EBELN", sap.ui.model.FilterOperator.EQ, IN_EBELN),
                    new sap.ui.model.Filter("IN_EBELP", sap.ui.model.FilterOperator.EQ, IN_EBELP),
                ];
                var oData = {};
                oController.oLoaderData.open();
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok
                        let msg = ""
                        data.forEach(text => {
                            msg = msg + text.EX_EXPEDITE_TEXT + "\n";
                        });
                        data.msg = msg;
                        let oModel = new JSONModel(data);
                        oModel.setSizeLimit(100000);
                        oController.getOwnerComponent().setModel(oModel, "expeditingModel");
                        oController.oLoaderData.close();
                        return "s";

                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        oController.oLoaderData.close();
                        return "e";
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                        oController.oLoaderData.close();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                        oController.oLoaderData.close();
                        return "e";
                    }
                } catch (e) {
                    oController.oLoaderData.close();
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            showApproveReject: function (oEvent) {
                oEvent.getSource().getParent().getItems()[0].setVisible(false)
                oEvent.getSource().getParent().getItems()[1].setVisible(true);
                oEvent.getSource().getParent().getItems()[2].setVisible(true);
                oEvent.getSource().getParent().getItems()[3].setVisible(true);
            },
            hideApproveReject: function (oEvent) {
                oEvent.getSource().getParent().getItems()[0].setVisible(true)
                oEvent.getSource().getParent().getItems()[1].setVisible(false);
                oEvent.getSource().getParent().getItems()[2].setVisible(false);
                oEvent.getSource().getParent().getItems()[3].setVisible(false);
            },
            getValUser: async function (IN_EMAIL, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_VAL_USERSet";
                var filters = [
                    new sap.ui.model.Filter("IN_EMAIL", sap.ui.model.FilterOperator.EQ, IN_EMAIL),
                ];
                var oData = {};
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok
                        this.IN_USR_SAP = data[0]["EX_USR_SAP"];
                        this.flagValUser = true;
                        return "s";
                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        // this.byId("idBApprovePO").setEnabled(false);
                        // this.byId("idBRejectPO").setEnabled(false);
                        // this.byId("idBResetApprovePO").setEnabled(false);
                        // oController._buildDialog(oController._get_i18n("dialog_information"), "Information", data[0].EX_DSC_EJECUCION).open();
                        return "e";
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        // this.byId("idBApprovePO").setEnabled(false);
                        // this.byId("idBRejectPO").setEnabled(false);
                        // this.byId("idBResetApprovePO").setEnabled(false);
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                        return "e"
                    }
                } catch (e) {
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            getPRApprovalReject: async function (IN_BANFN, IN_BNFPO, IN_REL_CODE, IN_APPROVE, IN_REJECT, IN_RESET, IN_USR_SAP, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_ED_APR_REJ_PRSet";
                var filters = [
                    new sap.ui.model.Filter("IN_BANFN", sap.ui.model.FilterOperator.EQ, IN_BANFN),
                    new sap.ui.model.Filter("IN_BNFPO", sap.ui.model.FilterOperator.EQ, IN_BNFPO),
                    new sap.ui.model.Filter("IN_REL_CODE", sap.ui.model.FilterOperator.EQ, IN_REL_CODE),
                    new sap.ui.model.Filter("IN_APPROVE", sap.ui.model.FilterOperator.EQ, IN_APPROVE),
                    new sap.ui.model.Filter("IN_REJECT", sap.ui.model.FilterOperator.EQ, IN_REJECT),
                    new sap.ui.model.Filter("IN_RESET", sap.ui.model.FilterOperator.EQ, IN_RESET),
                    new sap.ui.model.Filter("IN_USR_SAP", sap.ui.model.FilterOperator.EQ, IN_USR_SAP),
                ];
                var oData = {};
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok

                        return data;
                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        let msg = "";
                        data.forEach(error => {
                            msg = msg + "- " + error.EX_DSC_EJECUCION + "\n";
                        });
                        oController._buildDialog(oController._get_i18n("dialog_information"), "Error", msg).open();
                        return data;
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                        return data;
                    }
                } catch (e) {
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            approvePO: async function (oEvent) {
                let pSState = this.getOwnerComponent().getModel("infoModel").getProperty("/EX_ORIGEN");
                this.oLoaderData.open();
                let sPath = oEvent.getSource().getParent().getParent().getBindingContext("purchReqModel").getPath()
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(sPath);
                let indexPO = oPR["REL_USE"];
                if (oPR["EX_USER_" + indexPO.toString()] == this.IN_USR_SAP && this.IN_USR_SAP != "") {
                    let response = await this.getPRApprovalReject(oPR["EX_BANFN"], oPR["EX_BNFPO"], oPR["EX_REL_CODE_" + indexPO.toString()], "X", "", "", this.IN_USR_SAP, pSState);
                    if (response[0].EX_RESULTADO_EJECUCION == "S") {
                        let that = this;
                        MessageBox.information("- " + response[0]["EX_MESSAGE"], {
                            onClose: async function (sAction) {
                                that.oLoaderData.open();
                                setTimeout(async function () {
                                    await that.getDataPR();
                                    that.oLoaderData.close();
                                    // that.getOwnerComponent().getModel("infoModel").setProperty("/Refresh", true);
                                }, 5000);

                            }
                        });
                    }
                } else {
                    MessageBox.information("You are not the designated user to approve this PR");
                    this.oLoaderData.close();
                }
            },
            rejectPO: async function (oEvent) {
                let pSState = this.getOwnerComponent().getModel("infoModel").getProperty("/EX_ORIGEN");
                this.oLoaderData.open();
                let sPath = oEvent.getSource().getParent().getParent().getBindingContext("purchReqModel").getPath()
                this.sPathRejected = sPath;
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(sPath);
                let indexPO = oPR["REL_USE"];
                if (oPR["EX_USER_" + indexPO.toString()] == this.IN_USR_SAP && this.IN_USR_SAP != "") {
                    if (oPR["REJECTED"] == "X") {
                        await this.rejectedPO();
                    } else {
                        this.getOwnerComponent().getModel("infoModel").setProperty("/commentRejected", "");
                        this._createDialogs("DialogRejected", "idDialogRejected", "scr.prtracking.fragments.rejected").open();
                    }
                    this.oLoaderData.close();
                } else {
                    MessageBox.information("You are not the designated user to approve this PR");
                    this.oLoaderData.close();
                }
            },
            rejectedPO: async function () {
                let aPO = []
                let sPath = this.sPathRejected;
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(sPath);
                let json = {
                    BUKRS: oPR.EX_BUKRS,
                    WERKS: oPR.EX_WERKS,
                    BANFN: oPR.EX_BANFN,
                    BNFPO: oPR.EX_BNFPO,
                    SOURCE_SYSTEM: oPR.EX_ORIGEN,
                    USER: this.userConnected,
                    REJECTED: "X",
                    REJECTED_COMMENT: this.getOwnerComponent().getModel("infoModel").getProperty("/commentRejected")
                }
                aPO.push(json);
                await this.postRejectedPO(aPO, oPR);
                this.closeDialog()
            },
            postRejectedPO: async function (PRs, oPR) {
                var URL = "sc/pr/rejectedPR";
                var oData = {
                    PR: PRs
                };
                let that = this;
                that.oLoaderData.open();
                MessageBox.confirm(this._get_i18n("dialog_msg_5") + "?", {
                    onClose: async function (sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            let pSState = that.getOwnerComponent().getModel("infoModel").getProperty("/EX_ORIGEN");
                            let indexPO = oPR["REL_USE"];
                            let response = await that.getPRApprovalReject(oPR["EX_BANFN"], oPR["EX_BNFPO"], oPR["EX_REL_CODE_" + indexPO.toString()], "", "X", "", this.IN_USR_SAP, pSState);
                            if (response[0].EX_RESULTADO_EJECUCION == "S") {
                                MessageBox.information("- " + response[0]["EX_MESSAGE"], {
                                    onClose: async function (sAction) {
                                        setTimeout(async function () {
                                            // await that.getPO(oPR, pSState);
                                            that.oLoaderData.close();
                                            // that.getOwnerComponent().getModel("infoModel").setProperty("/Refresh", true);
                                            let response = await that.requestCAP(URL, oData, 'POST');
                                            console.log(response);
                                            if (response.value.EX_RESULT == "S") {
                                                await that.getDataPR();
                                                // await that.getDataPR();
                                                that._buildDialog(that._get_i18n("dialog_success"), "Success", that._get_i18n("dialog_msg_6")).open();
                                            } else if (!response) {
                                                that._buildDialog(that._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                                            } else {
                                                that._buildDialog(that._get_i18n("dialog_error"), "Error", that._get_i18n(response.value.EX_MESSAGE)).open();
                                            }
                                        }, 5000);
                                    }
                                });
                            } else {
                                that.oLoaderData.close();
                            }
                        }
                        else {
                            that.oLoaderData.close();
                        }
                    }
                });
            },
            handleLiveChange: function (oEvent) {
                var oTextArea = oEvent.getSource(),
                    iValueLength = oTextArea.getValue().length,
                    iMaxLength = oTextArea.getMaxLength(),
                    sState = iValueLength > iMaxLength ? ValueState.Warning : ValueState.None;

                oTextArea.setValueState(sState);
            },
            getPRApprovalRejectSES: async function (IN_LBLNI, IN_REL_CODE, IN_APPROVE, IN_REJECT, IN_USR_SAP, state) {
                var oController = this;
                var model = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_SRV");
                var model2 = oController.getOwnerComponent().getModel("MODEL_ZSC_WORKSPACE_PLATINUM_SRV");
                var service = "/ZSC_WS_ED_APR_REJ_SESSEt";
                var filters = [
                    new sap.ui.model.Filter("IN_LBLNI", sap.ui.model.FilterOperator.EQ, IN_LBLNI),
                    new sap.ui.model.Filter("IN_REL_CODE", sap.ui.model.FilterOperator.EQ, IN_REL_CODE),
                    new sap.ui.model.Filter("IN_APPROVE", sap.ui.model.FilterOperator.EQ, IN_APPROVE),
                    new sap.ui.model.Filter("IN_REJECT", sap.ui.model.FilterOperator.EQ, IN_REJECT),
                    new sap.ui.model.Filter("IN_USR_SAP", sap.ui.model.FilterOperator.EQ, IN_USR_SAP),
                ];
                var oData = {};
                try {
                    let data = "";
                    if (state) {
                        data = await oController.RequestSAPGETPromise(model, filters, service, oData);
                    } else {
                        data = await oController.RequestSAPGETPromise(model2, filters, service, oData);
                    }
                    if (data[0].EX_RESULTADO_EJECUCION == "S") {
                        //Response Ok

                        return data;
                    } else if (data[0].EX_RESULTADO_EJECUCION == "E") {
                        let msg = "";
                        data.forEach(error => {
                            msg = msg + "- " + error.EX_DSC_EJECUCION + "\n";
                        });
                        oController._buildDialog(oController._get_i18n("dialog_information"), "Error", msg).open();
                        return data;
                    } else if (data == "E") {
                        // oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                        return data;
                    }
                } catch (e) {
                    //Response Error
                    console.log(e.statusCode)
                    if (e.statusCode == 401) {
                        this.statusCode = 401;
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", "Due to inactivity, your session signed out. Please refresh the page").open();
                    } else {
                        oController._buildDialog(oController._get_i18n("dialog_error"), "Error", oController._get_i18n("dialog_msg_1") + service).open();
                    }
                }
            },
            approvePRSES: async function (oEvent) {
                let pSState = this.getOwnerComponent().getModel("infoModel").getProperty("/EX_ORIGEN");
                this.oLoaderData.open();
                let sPath = oEvent.getSource().getParent().getParent().getBindingContext("purchReqModel").getPath()
                let oPR = this.getOwnerComponent().getModel("purchReqModel").getProperty(sPath);
                let indexPO = oPR["REL_USE_SES"];
                if (oPR["EX_USER_" + indexPO.toString()] == this.IN_USR_SAP && this.IN_USR_SAP != "") {
                    let response = await this.getPRApprovalRejectSES(oPR["EX_LBLNI"], oPR["EX_REL_CODE_" + indexPO.toString() + "_SES"], "X", "", this.IN_USR_SAP, pSState);
                    if (response[0].EX_RESULTADO_EJECUCION == "S") {
                        let that = this;
                        MessageBox.information("- " + response[0]["EX_MESSAGE"], {
                            onClose: async function (sAction) {
                                that.oLoaderData.open();
                                setTimeout(async function () {
                                    await that.getDataPR();
                                    that.oLoaderData.close();
                                    // that.getOwnerComponent().getModel("infoModel").setProperty("/Refresh", true);
                                }, 5000);

                            }
                        });
                    }
                } else {
                    MessageBox.information("You are not the designated user to approve this PR");
                    this.oLoaderData.close();
                }
            },
        });
    });
