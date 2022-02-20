function Piterm(api) {
    var self = this;
    this.API = api;

    return this;
}
Piterm.prototype.Echo = function(sensor_id) {
    this.API.SendCustomCommand("echo", {
        "async": true
    }, null);
}