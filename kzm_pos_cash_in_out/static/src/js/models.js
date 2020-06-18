odoo.define('kzm_pos_cash_in_out.models', function (require) {
    "use strict";


    var models = require('point_of_sale.models');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;
    var utils = require('web.utils');

    var round_pr = utils.round_precision;
    var QWeb = core.qweb;

    var _super_Order = models.Order.prototype;
    models.Order = models.Order.extend({
        initialize: function(attributes,options){
            var res = _super_Order.initialize.apply(this, arguments);
            $("div#order_return").removeClass('selected-menu');
            return this;
        },
         set_money_inout_details: function(money_inout_details){
            this.money_inout_details = money_inout_details;
        },
        get_money_inout_details: function(){
            return this.money_inout_details;
        },
        set_cash_register: function(result){
            this.result = result;
        },
        get_cash_register: function(){
            return this.result;
        },
        set_statement_cashier: function(user_id){
            this.user_id = user_id;
        },
        get_statement_cashier: function(){
            return this.user_id;
        }
    });




    });