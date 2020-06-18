odoo.define('kzm_pos_bag.models', function (require) {
    "use strict";
    var models = require('point_of_sale.models');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;
    var utils = require('web.utils');

    var round_pr = utils.round_precision;
    var QWeb = core.qweb;
    models.load_fields("res.users", ['access_bag_charges']);
    models.load_fields("product.product", ['is_packaging']);

    var posmodel_super = models.PosModel.prototype;
    models.PosModel = models.PosModel.extend({
        initialize: function(session, attributes) {
            var self = this;
            this.product_list = [];
            posmodel_super.initialize.call(this, session, attributes);
        },
    });


    var _super_orderline = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
        initialize: function(attr,options){
            _super_orderline.initialize.call(this, attr, options);
            this.bag_color = false;
            this.is_bag = false;

        },

        set_bag_color: function(bag_color) {
            this.bag_color = bag_color;
        },
        get_bag_color: function() {
            return this.get('bag_color');
        },
        set_is_bag: function(is_bag){
            this.is_bag = is_bag;
        },
        get_is_bag: function(){
            return this.is_bag;
        },



});
});