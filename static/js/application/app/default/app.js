function Application() {
    var self = this;
    // Get makesense api instanse.
    this.API = MkSAPIBuilder.GetInstance();
    // Default handler
    this.API.OnUnexpectedDataArrived = function (packet) {
        console.log(packet);
    }
    this.API.ModulesLoadedCallback = function () {
        self.NodeLoaded();
    }
    this.EventMapper = {};
    this.Adaptor = new Pidaptor(this.API);
    this.Terminal = new Piterm(this.API);

    this.SelectedMenu = null;
    window.ApplicationModules.Modal = new MksBasicModal("GLOBAL");
    window.ApplicationModules.Error = new MksBasicModal("ERROR");

    this.IsConnected    = false;
    this.PLCList        = [];

    return this;
}
Application.prototype.RegisterEventHandler = function(name, callback, scope) {
    this.EventMapper[name] = { 
        callback: callback,
        scope: scope
    };
}
Application.prototype.UnregisterEventHandler = function(name) {
    delete this.EventMapper[name];
}
Application.prototype.Publish = function(name, data) {
    var handler  = this.EventMapper[name];
    if (handler !== undefined && handler !== null) {
        handler.callback(data, handler.scope);
    }
}
Application.prototype.Connect = function(ip, port, callback) {
    var self = this;
    console.log("Connect Application");
    // Python will emit messages
    self.API.OnNodeChangeCallback = self.OnChangeEvent.bind(self);
    this.API.ConnectLocalWS(ip, port, function() {
        console.log("Connected to local websocket");

        // Module area
        self.API.AppendModule("ModuleInformationView");
        self.API.GetModules();

        callback();
    });
}
Application.prototype.NodeLoaded = function () {
    console.log("Modules Loaded");

    window.ApplicationModules.ModuleInformationView = new ModuleInformationView();
    window.ApplicationModules.ModuleInformationView.SetHostingID("id_application_plc_view_module");
    window.ApplicationModules.ModuleInformationView.SetObjectDOMName("window.ApplicationModules.ModuleInformationView");
    window.ApplicationModules.ModuleInformationView.Build(null, function(module) {
        module.Hide();
    });
    this.SelectedMenu = window.ApplicationModules.ModuleInformationView;
    this.ActivateMenuSelectionTitle(document.getElementById("id_m_app_plc_info"));
}
Application.prototype.OnChangeEvent = function(packet) {
    var event = packet.payload.event;
    var data = packet.payload.data;
    this.Publish(event, data);
}
Application.prototype.ShowInfoWindow = function (header, content) {
    window.ApplicationModules.Error.Remove();
    window.ApplicationModules.Error.SetTitle(header);
    window.ApplicationModules.Error.SetContent(content);
    window.ApplicationModules.Error.SetFooter(`<button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Close</button>`);
    window.ApplicationModules.Error.Build("sm");
    window.ApplicationModules.Error.Show();
}
Application.prototype.HideInfoWindow = function (header, content) {
    window.ApplicationModules.Error.Hide();
}

// USER CODE
Application.prototype.UI_UpdatePLCListTable = function(list) {
    var attleast_one_connected = false;
    var data = [];
    var table = new MksBasicTable();
    table.SetSchema(["", "", "", "", ""]);
    for (key in list) {
        var plc = list[key];
        row = [];
        row.push(`<h6 class="my-0"><a href="#" onclick="app.ConnectDevice_OnClick('`+plc.ams_net_id+`');">`+plc.ams_net_id+`</a></h6>`);
        row.push(`<div></div>`);
        if (plc.is_connected == false) {
            row.push(`<span style="color: green;cursor: pointer; width: 16px; height: 16px;" onclick="app.ConnectDevice_OnClick('`+plc.ams_net_id+`');" data-feather="log-in"></span>`);
        } else {
            row.push(`<span style="color: orange;cursor: pointer; width: 16px; height: 16px;" onclick="app.DisconnectDevice_OnClick('`+plc.ams_net_id+`');" data-feather="log-out"></span>`);
        }

        if (plc.in_db == true) {
            row.push(`<span style="color: red;cursor: pointer; width: 16px; height: 16px;" onclick="app.DeletePLCFromDB_OnClick('`+plc.ams_net_id+`');" data-feather="trash-2"></span>`);
        } else {
            row.push(`<span style="color: green;cursor: pointer;width: 16px; height: 16px;" onclick="app.AppendPLC('`+plc.ams_net_id+`');" data-feather="file-plus"></span>`);
        }
        row.push(`<span style="color: gray;width: 16px; height: 16px;" id="" onclick="id_m_app_plc_list_table_item_`+plc.ams_net_id+`" data-feather="rss"></span>`);

        connected = `<span style="color: green;">Connected</span>`
        if (plc.is_connected == false) {
            connected = `<span style="color: red;">Disconnected</span>`
        } else {
            attleast_one_connected = true;
        }
        row.push(`<div style="text-align: right; margin-right:10%">`+connected+`</div>`);
        data.push(row);
    }
    table.ShowRowNumber(true);
    table.ShowHeader(false);
    table.SetData(data);
    table.Build(document.getElementById("id_m_app_plc_list_table"));
    feather.replace();

    this.IsConnected = attleast_one_connected;
}

Application.prototype.DisconnectDevice_OnClick = function(ams_net_id) {
    this.Adaptor.DisconnectPLC(ams_net_id, function(data, error) {
        app.SelectedMenu.SelectedView();
        app.Adaptor.GetAvailablePLC(function(data, error) {
            app.IsConnected = false;
            // app.PLCList = data.payload.plc;
            app.UpdatePLCList(data.payload.plc);
            app.UI_UpdatePLCListTable(app.PLCList);
            window.ApplicationModules.ModuleInformationView.ClearData();
            window.ApplicationModules.ModuleInformationView.Hide();
        });
    });
}

Application.prototype.ConnectDevice_OnClick = function(ams_net_id) {
    var plc = app.GetPLCFromList(ams_net_id);
    if (plc == null) {
        return;
    }

    if (plc.in_db == false) {
        app.ShowInfoWindow("Info", "Cannot connect to PLC. <br>First add it to the database.");
        return;
    }

    if (app.IsConnected == true) {
        app.ShowInfoWindow("Info", "Already connected to PLC. <br>Please disconnect and try again.");
        return;
    }

    this.Adaptor.ConnectPLC(ams_net_id, function(data, error) {
        if (data.payload.status == true) {
            // app.SelectedMenu.SelectedView();
            app.Adaptor.GetAvailablePLC(function(data, error) {
                app.IsConnected = true;
                app.UpdatePLCList(data.payload.plc);
                app.UI_UpdatePLCListTable(app.PLCList);
                window.ApplicationModules.ModuleInformationView.GetAvailableSymbols();
                window.ApplicationModules.ModuleInformationView.Show();
            });
        } else {
            app.ShowInfoWindow("Info", "Cannot connect PLC. <br>Please check PLC power or network cable.");
        }
    });
}

Application.prototype.DeletePLCFromDB = function(ams_net_id) {
    app.Adaptor.DeletePLCFromDB(ams_net_id, function(data, error) {
        app.RemoveFromPLCList(ams_net_id);
        window.ApplicationModules.Modal.Hide();
        app.Adaptor.GetAvailablePLC(function(data, error) {
            app.UpdatePLCList(data.payload.plc);
            app.UI_UpdatePLCListTable(app.PLCList);
        });
    });
}

Application.prototype.DeletePLCFromDB_OnClick = function(ams_net_id) {
    var plc = app.GetPLCFromList(ams_net_id);
    if (plc.is_connected == true) {
        app.ShowInfoWindow("Info", "Cannot delete PLC. <br>Please disconnect from PLC service.");
        return;
    }
    var content = `
        <div class="row">
            <div class="col-xl-12" style="text-align: center">
                <h6>Delete PLC `+ams_net_id+`</h6>
                <h6>Are you sure?</h6>
            </div>
        </div>
    `;
    window.ApplicationModules.Modal.Remove();
    window.ApplicationModules.Modal.SetTitle("Delete PLC");
    window.ApplicationModules.Modal.SetContent(content);
    window.ApplicationModules.Modal.SetFooter(`<button type="button" class="btn btn-success btn-sm" onclick="app.DeletePLCFromDB('`+ams_net_id+`');">Yes</button><button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">No</button>`);
    window.ApplicationModules.Modal.Build("sm");
    window.ApplicationModules.Modal.Show();    
}

Application.prototype.AppendPLC = function(ams_net_id) {
    app.Adaptor.AppendPLCToDB(ams_net_id, function(data, error) {
        app.Adaptor.GetAvailablePLC(function(data, error) {
            window.ApplicationModules.Modal.Hide();
            app.UpdatePLCList(data.payload.plc);
            app.UI_UpdatePLCListTable(app.PLCList);
        });
    });
}

Application.prototype.AppendNewPLC = function() {
    ams_net_id = document.getElementById("id_m_application_ams_net_id_value").value;
    app.AppendPLC(ams_net_id);
}

Application.prototype.AppendNewPLC_OnClick = function() {
    var content = `
        <div class="row">
            <div class="col-xl-12" style="text-align: center">
            <input type="text" class="form-control" id="id_m_application_ams_net_id_value" placeholder="192.168.101.10.1.1">
            </div>
        </div>
    `;
    window.ApplicationModules.Modal.Remove();
    window.ApplicationModules.Modal.SetTitle("Append new PLC");
    window.ApplicationModules.Modal.SetContent(content);
    window.ApplicationModules.Modal.SetFooter(`<button type="button" class="btn btn-success btn-sm" onclick="app.AppendNewPLC();">Yes</button><button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">No</button>`);
    window.ApplicationModules.Modal.Build("sm");
    window.ApplicationModules.Modal.Show();    
}

Application.prototype.SearchForPLC = function() {
    objects = document.querySelectorAll(`[id^="id_m_information_view_ip_checkbox_"]`);
    interfaces = [];
    for (key in objects) {
        var checkbox_ = objects[key];
        if (checkbox_.checked == true) {
            ip = checkbox_.id.replace("id_m_information_view_ip_checkbox_","")
            network = ip.split(".")
            interfaces.push(network[0]+"."+network[1]+"."+network[2]);
        }
    }

    if (interfaces.length > 0) {
        app.Adaptor.SerachForPLC(interfaces, function(data, error) {
            new_plcs = []
            for (idx in data.payload.plcs) {
                var plc_search = data.payload.plcs[idx];
                var is_exist = false;
                for (key in app.PLCList) {
                    var plc = app.PLCList[key];
                    if (plc.ams_net_id == plc_search.ams_net_id) {
                        is_exist = true;
                        break;
                    }
                }

                if (is_exist == false) {
                    plc_search.is_connected = false;
                    new_plcs.push(plc_search);
                }
            }
            app.UpdatePLCList(new_plcs);
            app.UI_UpdatePLCListTable(app.PLCList);
            window.ApplicationModules.Modal.Hide();
        });
    }
}

Application.prototype.SearchForPLC_OnClick = function() {
    app.Adaptor.GetNetworkInterfaces(function(data, error) {
        var content = `
            <div class="row">
                <div class="col-xl-12">
                    <strong></strong><h6 class="mb-3">Network Interfaces</h6></strong>
                    <div class="mb-3">
                        <div id="id_m_application_network_interface_list"></div>
                    </div>
                </div>
            </div>
        `;
        window.ApplicationModules.Modal.Remove();
        window.ApplicationModules.Modal.SetTitle("Serach");
        window.ApplicationModules.Modal.SetContent(content);
        window.ApplicationModules.Modal.SetFooter(`<button type="button" class="btn btn-success btn-sm" onclick="app.SearchForPLC();">Search</button><button type="button" class="btn btn-secondary btn-sm" data-dismiss="modal">Close</button>`);
        window.ApplicationModules.Modal.Build("sm");
        window.ApplicationModules.Modal.Show();

        var inrefaces = data.payload.inrefaces;
        var data = [];
        var table = new MksBasicTable();
        table.SetSchema(["", "", ""]);
        for (key in inrefaces) {
            var interface = inrefaces[key];
            row = [];
            row.push(`  <div class="custom-control custom-checkbox">
                            <input type="checkbox" class="custom-control-input" id="id_m_information_view_ip_checkbox_`+interface.ip+`">
                            <label class="custom-control-label" for="id_m_information_view_ip_checkbox_`+interface.ip+`"></label>
                        </div>`);
            row.push(`<h6 class="my-0"><a href="#" onclick="">`+interface.ip+`</a></h6>`);
            data.push(row);
        }
        table.ShowRowNumber(true);
        table.ShowHeader(false);
        table.SetData(data);
        table.Build(document.getElementById("id_m_application_network_interface_list"));
    });
}

Application.prototype.AppendToPLCList = function(plc) {
    app.PLCList.push(plc);
}

Application.prototype.RemoveFromPLCList = function(ams_net_id) {
    var index = -1;
    for (idx in app.PLCList) {
        var plc = app.PLCList[idx];
        if (ams_net_id == plc.ams_net_id) {
            index = idx;
            break;
        }
    }

    if (index != -1) {
        app.PLCList.splice(index, 1); 
    }
}

Application.prototype.UpdatePLCValuesList = function(plc) {
    for (idx in app.PLCList) {
        var plc_c = app.PLCList[idx];
        if (plc_c.ams_net_id == plc.ams_net_id) {
            plc_c.is_connected = plc.is_connected;
            plc_c.in_db = plc.in_db;
            break;
        }
    }
}

Application.prototype.GetPLCFromList = function(ams_net_id) {
    for (idx in app.PLCList) {
        var plc_c = app.PLCList[idx];
        if (plc_c.ams_net_id == ams_net_id) {
            return plc_c;
        }
    }

    return null;
}

Application.prototype.ExistInPLCList = function(ams_net_id) {
    var exist_ = false;
    for (idx in app.PLCList) {
        var plc_c = app.PLCList[idx];
        if (plc_c.ams_net_id == ams_net_id) {
            exist_ = true;
            break;
        }
    }

    return exist_;
}

Application.prototype.UpdatePLCList = function(plcs) {
    for (idx in plcs) {
        var plc = plcs[idx];
        is_exist = app.ExistInPLCList(plc.ams_net_id);
        if (is_exist == false) {
            app.AppendToPLCList(plc);
        } else {
            app.UpdatePLCValuesList(plc)
        }
    }
}

// ASYNC REGISTERED HANDLERS
Application.prototype.PLCConnectedHandler = function(data, scope) {
    app.Adaptor.GetAvailablePLC(function(data, error) {
        app.UpdatePLCList(data.payload.plc);
        app.UI_UpdatePLCListTable(app.PLCList);
    });
}

Application.prototype.PLCDisconnectedHandler = function(data, scope) {
    app.Adaptor.GetAvailablePLC(function(data, error) {
        app.UpdatePLCList(data.payload.plc);
        app.UI_UpdatePLCListTable(app.PLCList);
    });
}

Application.prototype.PLCDataHandler = function(data, scope) {
    window.ApplicationModules.ModuleInformationView.UpdateSymbolsData(data.symbols);
}

Application.prototype.ActivateMenuSelectionTitle = function(obj) {
    document.getElementById("id_m_app_plc_info").classList.remove("active");
    document.getElementById("id_m_app_plc_settings").classList.remove("active");
    obj.classList.add("active");
}

Application.prototype.MenuSelection_OnClick = function(obj, selected_menu_object) {
    if (this.SelectedMenu == selected_menu_object) {
        return;
    }

    if (this.SelectedMenu !== null && this.SelectedMenu !== undefined) {
        this.SelectedMenu.Clean();
    }

    selected_menu_object.Build(null, function(module) {});
    this.SelectedMenu = selected_menu_object;
    this.ActivateMenuSelectionTitle(obj);
}

var app = new Application();
app.RegisterEventHandler("plc_disconnected", app.PLCDisconnectedHandler, app);
app.RegisterEventHandler("plc_connected", app.PLCConnectedHandler, app);
app.RegisterEventHandler("plc_data", app.PLCDataHandler, app);
app.Connect(global_ip, global_port, function() {
    app.Adaptor.GetAvailablePLC(function(data, error) {
        // app.PLCList = data.payload.plc;
        app.UpdatePLCList(data.payload.plc);
        app.UI_UpdatePLCListTable(app.PLCList);
    });
});

feather.replace();