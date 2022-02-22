function TemplateModuleView() {
    var self = this;

    // Modules basic
    this.HTML 	                    = "";
    this.HostingID                  = "";
    this.GraphModule                = null;
    this.DOMName                    = "";
    // Objects section
    this.HostingObject              = null;
    this.ComponentObject            = null;

    return this;
}

TemplateModuleView.prototype.SetObjectDOMName = function(name) {
    this.DOMName = name;
}

TemplateModuleView.prototype.SetHostingID = function(id) {
    this.HostingID = id;
}

TemplateModuleView.prototype.Build = function(data, callback) {
    var self = this;

	 app.API.GetModuleUI("TemplateModuleView.html", function(html) {
        // Get HTML content
        self.HTML = html.replace("[ID]", self.HostingID);
        // Each UI module have encapsulated conent in component object (DIV)
        self.ComponentObject = document.getElementById("id_m_component_view_"+this.HostingID);
        // Apply HTML to DOM
        self.HostingObject = document.getElementById(self.HostingID);
        if (self.HostingObject !== undefined && self.HostingObject != null) {
            self.HostingObject.innerHTML = self.HTML;
        }
        // Call callback
        if (callback !== undefined && callback != null) {
            callback(self);
        }
    });
}

TemplateModuleView.prototype.Clean = function() {
}

TemplateModuleView.prototype.Hide = function() {
    this.ComponentObject.classList.add("d-none")
}

TemplateModuleView.prototype.Show = function() {
    this.ComponentObject.classList.remove("d-none")
}