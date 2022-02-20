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
        self.API.GetModules();

        callback();
    });
}
Application.prototype.NodeLoaded = function () {
    console.log("Modules Loaded");
}
Application.prototype.OnChangeEvent = function(packet) {
    var event = packet.payload.event;
    var data = packet.payload.data;
    this.Publish(event, data);
}
// ASYNC REGISTERED HANDLERS
Application.prototype.UndefinedHandler = function(data, scope) {
    console.log(data);
}

var app = new Application();

app.RegisterEventHandler("undefined", app.UndefinedHandler, app);
app.Connect(global_ip, global_port, function() {});

feather.replace();