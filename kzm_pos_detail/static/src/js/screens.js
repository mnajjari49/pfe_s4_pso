odoo.define('kzm_pos_detail.screens', function (require) {
    "use strict";

    var screens = require('point_of_sale.screens');
    var gui = require('point_of_sale.gui');
    var models = require('point_of_sale.models');
    var rpc = require('web.rpc');
    var core = require('web.core');
    var PosBaseWidget = require('point_of_sale.BaseWidget');

    var QWeb = core.qweb;
    var _t = core._t;


     screens.OrderWidget.include({
        init: function(parent, options) {
            var self = this;
            this._super(parent,options);
        },

        update_summary: function(){
            var self = this;
            var order = self.pos.get_order();
            self._super();
            if (!order.get_orderlines().length) {
                $('.cart-num').text(0);
                return
            }else{
                var qty = 0;
                order.get_orderlines().map(function(line){
                    if(($.inArray(line.product.id) == -1)){
                        qty += line.get_quantity();
                    }
                });
                $('.cart-num').text(qty);
            }
        },
        render_orderline: function(orderline){
            var el_node = this._super(orderline);
            var self = this;

            var el_remove_icon = el_node.querySelector('.remove_line');
            if(el_remove_icon){
                el_remove_icon.addEventListener('click', (function() {
                    var order = self.pos.get_order();
                    var lines = order.get_orderlines();
                    if(orderline && orderline.get_delivery_charges_flag()){
                        lines.map(function(line){
                            line.set_deliver_info(false);
                        });
                        order.set_is_delivery(false);
                    }
                    order.remove_orderline(orderline);
                    order.remove_promotion();
                }.bind(this)));
            }
            var oe_del = el_node.querySelector('.oe_del');
            if(oe_del){
                oe_del.addEventListener('click', (function() {
                    if(!confirm(_t("You want to unassign lot/serial number(s) ?"))){
                        return;
                    }
                    var pack_lot_lines = orderline.pack_lot_lines;
                    var len = pack_lot_lines.length;
                    var cids = [];
                    for(var i=0; i<len; i++){
                        var lot_line = pack_lot_lines.models[i];
                        cids.push(lot_line.cid);
                    }
                    for(var j in cids){
                        var lot_model = pack_lot_lines.get({cid: cids[j]});
                        lot_model.remove();
                    }
                    self.renderElement();
                }.bind(this)));
            }
            $(".order-scroller").scrollTop($('.order-scroller .order').height());
            return el_node
        },
            set_value: function(val) {
            var self = this;
            var order = this.pos.get_order();
            var lines = order.get_orderlines();
            this.numpad_state = this.numpad_state;
            var mode = this.numpad_state.get('mode');
            var selected_line = order.get_selected_orderline();
            if (selected_line && selected_line.get_quantity() < 0 && selected_line.attributes.backorder
                    && (val != '' || val != 'remove')) {
                return //Disable numpad for return items except remove
            }


            if(selected_line){
                if(selected_line.get_child_line_id()){
                    var child_line = order.get_orderline(selected_line.get_child_line_id());
                    lines.map(function(line){
                        if(line.get_child_line_id() == selected_line.get_child_line_id()){
                            line.set_child_line_id(false);
                            line.set_is_rule_applied(false);
                        }
                    });
                    if(child_line){
                        selected_line.set_child_line_id(false);
                        selected_line.set_is_rule_applied(false);
                        order.remove_orderline(child_line);
                    }
                    self._super(val);
                }else if(selected_line.get_buy_x_get_dis_y()){
                    self._super(val);
                    if(selected_line.get_quantity() < 1){
                        _.each(lines, function(line){
                            if(line && line.get_buy_x_get_y_child_item()){
//								order.remove_orderline(line);
                                line.set_discount(0);
                                line.set_buy_x_get_y_child_item({});
                                line.set_is_rule_applied(false);
                                line.set_promotion_data(false);
                                self.pos.chrome.screens.products.order_widget.rerender_orderline(line);
                            }
                        });
                    }
                }else if(selected_line.get_quantity_discount()){
                    selected_line.set_quantity_discount({});
                    selected_line.set_discount(0);
                    selected_line.set_promotion_data(false);
                    selected_line.set_is_rule_applied(false);
                    self._super(val);
                }else if(selected_line.get_discount_amt()){
                    selected_line.set_discount_amt_rule(false);
                    selected_line.set_discount_amt(0);
                    selected_line.set_promotion_data(false);
                    selected_line.set_unit_price(selected_line.product.price);
                    selected_line.set_is_rule_applied(false);
                    self._super(val);
                }
                else if(selected_line.get_multi_prods_line_id()){
                    var multi_prod_id = selected_line.get_multi_prods_line_id() || false;
                    if(multi_prod_id){
                        _.each(lines, function(_line){
                            if(_line && _line.get_multi_prods_line_id() == multi_prod_id){
                                _line.set_discount(0);
                                _line.set_is_rule_applied(false);
                                _line.set_promotion_data(false);
                                _line.set_combinational_product_rule(false);
                                self.pos.chrome.screens.products.order_widget.rerender_orderline(_line);
                            }
                        });
                    }
                    self._super(val);
                }else if(selected_line.get_multi_prod_categ_rule()){
                    selected_line.set_discount(0);
                    selected_line.set_is_rule_applied(false);
                    selected_line.set_multi_prod_categ_rule(false);
                    self._super(val);
                }
                else{
                    if(!selected_line.get_promotion()){
                        if(this.pos.config.enable_operation_restrict){
                            if (order.get_selected_orderline()) {
                                var mode = this.numpad_state.get('mode');
                                var cashier = this.pos.get_cashier() || false;
                                if( mode === 'quantity'){
                                    order.get_selected_orderline().set_quantity(val);
                                }else if( mode === 'discount'){
                                    if(cashier && cashier.can_give_discount){
                                        if(val <= cashier.discount_limit || cashier.discount_limit < 1){
                                            order.get_selected_orderline().set_discount(val);
                                            if(val == ''){
                                                this.numpad_state.change_mode = true
                                            }
                                        } else {
                                            if(cashier.based_on == 'barcode'){
                                                this.gui.show_popup('ManagerAuthenticationPopup', { val: val });
                                            }
                                            else{
                                                var user_detail = {} ,password = [];
                                                 _.each(self.pos.users, function(value) {
                                                    user_detail[value.id] = value;
                                                    password.push(value.pos_security_pin)
                                                });

                                                var res = self.gui.authentication_pin(password).then(function(){
                                                    self.pos.get_order().get_selected_orderline().set_discount(val);
                                                    self.gui.close_popup();
                                                });
                                            }
                                        }
                                    } else {
                                        self.pos.db.notification('danger',_t('You don\'t have access to give discount.'));
                                    }
                                } else if( mode === 'price'){
                                    order.get_selected_orderline().set_unit_price(val);
                                    order.get_selected_orderline().price_manually_set = true;
                                }
                            }
                        } else {
                            this._super(val)
                        }
                    }
                }
            }

        },        renderElement: function() {
            this._super();
            var self = this;
        },
        click_line: function(orderline, event) {
            this._super(orderline, event);

        },
    });
    });