odoo.define('kzm_pos_detail.models', function (require) {
    "use strict";

    var models = require('point_of_sale.models');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var _t = core._t;
    var utils = require('web.utils');

    var round_pr = utils.round_precision;
    var QWeb = core.qweb;

    var _super_orderline = models.Orderline.prototype;
    models.Orderline = models.Orderline.extend({
        initialize: function(attr,options){
            _super_orderline.initialize.call(this, attr, options);

            this.child_line_id = false;

        },

         set_promotion: function(promotion) {
            this.set('promotion', promotion);
        },
        get_promotion: function() {
            return this.get('promotion');
        },

        set_child_line_id: function(child_line_id){
            this.child_line_id = child_line_id;
        },
        get_child_line_id: function(){
            return this.child_line_id;
        },
         set_buy_x_get_dis_y: function(product_ids){
            this.product_ids = product_ids;
        },
        get_buy_x_get_dis_y: function(){
            return this.product_ids;
        },
         get_quantity_discount: function(){
            return this.quantity_discount;
        },
        set_discount_amt_rule: function(discount_amt_rule){
            this.discount_amt_rule = discount_amt_rule;
        },
        get_discount_amt_rule: function(){
            return this.discount_amt_rule;
        },
        set_discount_amt: function(discount_amt){
            this.discount_amt = discount_amt;
        },
        get_discount_amt: function(){
            return this.discount_amt;
        },
        get_discount_amt_str: function(){
            return this.pos.chrome.format_currency(this.discount_amt);
        },
        set_multi_prods_line_id: function(multi_prods_line_id){
            this.multi_prods_line_id = multi_prods_line_id;
        },
        get_multi_prods_line_id: function(){
            return this.multi_prods_line_id;
        },
        set_is_rule_applied: function(is_rule_applied){
            this.is_rule_applied = is_rule_applied;
        },
        get_is_rule_applied: function(){
            return this.is_rule_applied;
        },
        set_combinational_product_rule: function(combinational_product_rule){
            this.combinational_product_rule = combinational_product_rule;
        },
        get_combinational_product_rule: function(){
            return this.combinational_product_rule;
        },
        set_multi_prod_categ_rule: function(multi_prod_categ_rule){
            this.multi_prod_categ_rule = multi_prod_categ_rule;
        },
        get_multi_prod_categ_rule: function(){
            return this.multi_prod_categ_rule;
        },

    });



});